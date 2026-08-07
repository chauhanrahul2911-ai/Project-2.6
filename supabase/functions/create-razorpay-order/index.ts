// ============================================================
// 🧾 CREATE RAZORPAY ORDER — server-side, so auto-capture actually works.
// ============================================================
// Razorpay's dashboard "Automatic Capture" setting only applies to
// payments created through the Orders API — payments started the simple
// way (just amount+key, no order) don't reliably auto-capture, which is
// why payments were getting stuck at "Authorized" instead of "Captured"
// (and the webhook never fired, since it only listens for
// payment.captured).
//
// Creating an order needs the Razorpay Key SECRET — which must never be
// shipped to the browser — so this one small step has to happen on a
// server. The browser calls this function first, gets back an order_id,
// and only then opens Razorpay Checkout with that order_id attached.
//
// Unlike the webhook, this function DOES require the caller to be a
// logged-in user (deploy WITHOUT --no-verify-jwt) — see supabase/README.md.
// ============================================================

const RAZORPAY_KEY_ID = Deno.env.get("RAZORPAY_KEY_ID")!;
const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET")!;

// Standard CORS headers so the browser (a different origin — your GitHub
// Pages site) is allowed to call this function directly.
const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

Deno.serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
        // Browser preflight check — just acknowledge it, no real work here.
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        if (req.method !== "POST") {
            return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
        }

        const { amount, currency, supabaseUserId } = await req.json();
        if (!amount || !currency || !supabaseUserId) {
            return new Response(
                JSON.stringify({ error: "amount, currency, and supabaseUserId are required" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const basicAuth = btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`);
        const razorpayRes = await fetch("https://api.razorpay.com/v1/orders", {
            method: "POST",
            headers: {
                "Authorization": `Basic ${basicAuth}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                amount,
                currency,
                payment_capture: 1, // this is what actually guarantees auto-capture
                notes: { supabaseUserId } // carried through to the webhook payload later
            })
        });

        const orderData = await razorpayRes.json();
        if (!razorpayRes.ok) {
            console.error("Razorpay order creation failed:", orderData);
            return new Response(
                JSON.stringify({ error: "Razorpay rejected the order request", details: orderData }),
                { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        return new Response(
            JSON.stringify({ order_id: orderData.id }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    } catch (err) {
        console.error("Create order error:", err);
        return new Response(
            JSON.stringify({ error: "Internal error" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
