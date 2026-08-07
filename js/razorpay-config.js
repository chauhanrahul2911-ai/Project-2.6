// ============================================================
// 💳 RAZORPAY CONFIG — REPLACE WITH YOUR OWN KEY
// ============================================================
// This is a "no backend" integration: the browser opens Razorpay's own
// checkout popup directly with your Key ID + amount, the user pays inside
// Razorpay's secure form (Razorpay hosts the card/UPI form — this app
// never sees or touches card numbers), and a `handler` callback fires
// only after Razorpay confirms success. That callback is what unlocks
// premium — same trust model as the rest of this app (client-side flag),
// just backed by a real payment now instead of a fake button.
// (There is no signature verification, since that needs a server with
// your Key Secret — which must NEVER go in this file or any browser code.)
//
// HOW TO GET YOUR OWN KEY (one-time setup):
//   1. Sign up at https://dashboard.razorpay.com/signup (free).
//   2. Your account starts in TEST MODE — perfect for trying the flow
//      with fake cards before real money is involved. Test card:
//      4111 1111 1111 1111, any future expiry, any CVV, any OTP.
//   3. Dashboard → Settings → API Keys → "Generate Test Key" → copy the
//      "Key Id" (looks like rzp_test_xxxxxxxxxxxx) → paste it below.
//   4. Test everything end-to-end with the fake card above.
//   5. When ready for REAL payments: complete KYC (Settings → Account &
//      Settings → your business/bank details — Razorpay needs this to
//      verify you before releasing real money to your bank account).
//      Once approved, switch the dashboard toggle to LIVE MODE, generate
//      a LIVE key (starts with rzp_live_...), and swap it in below.
// ============================================================

const RAZORPAY_KEY_ID = "rzp_test_TKAOsjJZ5WkRwY"; // e.g. "rzp_test_xxxxxxxxxxxx"

// Price shown in the paywall (₹149). Razorpay takes amount in PAISE
// (smallest unit), so ₹149 = 14900. Change this one line if the price
// ever changes — index.html's displayed "₹149" text would need updating too.
const PREMIUM_PRICE_INR = 25;
const PREMIUM_PRICE_PAISE = PREMIUM_PRICE_INR * 100;
