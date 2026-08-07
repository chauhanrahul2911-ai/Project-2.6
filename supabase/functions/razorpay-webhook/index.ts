// ============================================================
// 🔔 RAZORPAY WEBHOOK — the real, tamper-proof source of truth.
// ============================================================
// Razorpay's OWN server calls this URL directly the moment a payment is
// captured — completely independent of the customer's browser. So even
// if the browser is closed the instant payment succeeds, this still runs
// and the database still gets updated. This is also the ONLY thing now
// allowed to write "is_premium" (see ../../schema.sql) — a user can no
// longer fake it from the browser console.
//
// See supabase/README.md for the full one-time deployment steps.
// ============================================================

import { createClient } from "npm:@supabase/supabase-js@2";

// Provided automatically by Supabase for every Edge Function — no setup needed.
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
// Set once via `supabase secrets set RAZORPAY_WEBHOOK_SECRET=...` (see README).
const RAZORPAY_WEBHOOK_SECRET = Deno.env.get("RAZORPAY_WEBHOOK_SECRET")!;

// Verifies the request really came from Razorpay by recomputing the HMAC
// signature over the EXACT raw request body and comparing it to the
// X-Razorpay-Signature header — a forged request without the shared
// secret can't produce a matching signature.
async function verifySignature(rawBody: string, signature: string, secret: string): Promise<boolean> {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
        "raw",
        enc.encode(secret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
    );
    const sigBuffer = await crypto.subtle.sign("HMAC", key, enc.encode(rawBody));
    const expected = Array.from(new Uint8Array(sigBuffer))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    return expected === signature;
}

Deno.serve(async (req: Request) => {
    try {
        if (req.method !== "POST") {
            return new Response("Method Not Allowed", { status: 405 });
        }

        const signature = req.headers.get("x-razorpay-signature");
        if (!signature) {
            return new Response("Missing signature", { status: 400 });
        }

        // Read the raw text FIRST — signature verification needs the exact
        // bytes Razorpay sent, not a re-serialized JSON.parse/stringify round
        // trip (which can differ and would make every check fail).
        const rawBody = await req.text();

        const valid = await verifySignature(rawBody, signature, RAZORPAY_WEBHOOK_SECRET);
        if (!valid) {
            console.error("Razorpay webhook: signature mismatch — rejecting request.");
            return new Response("Invalid signature", { status: 400 });
        }

        const payload = JSON.parse(rawBody);
        if (payload.event !== "payment.captured") {
            // Some other event type we don't act on — acknowledge with 200 so
            // Razorpay doesn't keep retrying it.
            return new Response("Ignored (not payment.captured)", { status: 200 });
        }

        const payment = payload.payload?.payment?.entity;
        const userId = payment?.notes?.supabaseUserId;

        if (!userId) {
            console.error("Razorpay webhook: payment.captured with no supabaseUserId in notes.", payment?.id);
            return new Response("Missing supabaseUserId in payment notes", { status: 400 });
        }

        // service_role key bypasses Row Level Security entirely — this is the
        // ONLY place in the whole system allowed to write is_premium.
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        const { error } = await supabase
            .from("premium_status")
            .upsert({
                user_id: userId,
                is_premium: true,
                last_payment_id: payment.id,
                updated_at: new Date().toISOString()
            });

        if (error) {
            console.error("Failed to write premium status:", error);
            return new Response("Database error", { status: 500 });
        }

        console.log(`Premium unlocked for user=${userId} via payment=${payment.id}`);
        return new Response("OK", { status: 200 });
    } catch (err) {
        console.error("Webhook error:", err);
        return new Response("Internal error", { status: 500 });
    }
});
