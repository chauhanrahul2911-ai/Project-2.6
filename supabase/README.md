# Supabase Migration — one-time setup

This replaces Firebase entirely: Google login, the premium-status
database, and the payment webhook are now all on Supabase. No credit
card needed anywhere in this setup.

Since you're on mobile, we'll do the CLI parts (deploying the webhook)
using **GitHub Codespaces** — a free terminal that runs in your mobile
browser, with your repo already checked out. No app installs.

## 1. Create your Supabase project

1. Go to https://supabase.com → **Sign up** (use GitHub or Google, free,
   no card).
2. **New project** → pick a name, set a database password (save it
   somewhere safe), pick a region (closest to India if offered) → Create.
   Takes ~2 minutes to provision.

## 2. Get your API keys and fill in `js/supabase-config.js`

1. Once the project is ready: left sidebar → **Project Settings** (gear
   icon) → **Data API** → copy the **Project URL**.
2. Same settings area → **API Keys** → copy the **`anon` `public`** key
   (do NOT use the `service_role secret` one here — that one is only for
   the webhook, later).
3. Open `js/supabase-config.js` in your repo and paste both values in:
   ```js
   const SUPABASE_URL = "https://xxxxxxxx.supabase.co";
   const SUPABASE_ANON_KEY = "eyJ....";
   ```

## 3. Create the database table

1. Supabase Dashboard → left sidebar → **SQL Editor** → **New query**.
2. Open `supabase/schema.sql` from this repo, copy its entire contents,
   paste into the SQL Editor → **Run**.
3. Check it worked: **Table Editor** (left sidebar) → you should see a
   new `premium_status` table.

## 4. Enable Google Sign-In

This needs a Google OAuth app — a bit more manual than Firebase's
one-click toggle was, but only done once.

1. Supabase Dashboard → **Authentication** → **Providers** → click
   **Google** → toggle it **on**. Keep this page open, you'll need the
   "Callback URL (for OAuth)" it shows you (looks like
   `https://xxxxxxxx.supabase.co/auth/v1/callback`).
2. In a new tab: https://console.cloud.google.com → make sure you're in
   the same project you used for Firebase before (or any project) →
   **APIs & Services → Credentials → + Create Credentials → OAuth client
   ID**.
   - Application type: **Web application**
   - Authorized redirect URIs: paste the Callback URL from step 1
   - Create → it shows a **Client ID** and **Client Secret** → copy both
3. Back in the Supabase Google provider tab: paste the Client ID and
   Client Secret → **Save**.

## 5. Add your site's URL

Authentication → **URL Configuration**:
- **Site URL**: your GitHub Pages URL, e.g.
  `https://chauhanrahul2911-ai.github.io/Project-2.3/`
- **Redirect URLs**: add the same URL here too

(Without this, Google will redirect back to the wrong place after login.)

## 6. Deploy both functions (via GitHub Codespaces)

There are two small server-side functions now:
- `razorpay-webhook` — Razorpay calls this after a payment to confirm it
  (tamper-proof source of truth).
- `create-razorpay-order` — the browser calls this FIRST, right before
  opening the Razorpay popup, to create an "Order". This is what makes
  Razorpay's auto-capture actually work — without it, payments get stuck
  at "Authorized" and the webhook above never fires.

1. In mobile Chrome, go to your repo → green **Code** button →
   **Codespaces** tab → **Create codespace on main**. A terminal opens
   with your repo already checked out.

2. Install the Supabase CLI and log in:
   ```
   npm install -g supabase
   supabase login
   ```
   This prints a link — open it in a new tab, approve access. (If this
   fails with a "public_key too big" error, use
   `supabase login --token YOUR_TOKEN` instead, with a token generated at
   https://supabase.com/dashboard/account/tokens.)

3. Link the CLI to your project (find your project ref in Supabase
   Dashboard → Project Settings → General → "Reference ID"):
   ```
   supabase link --project-ref YOUR_PROJECT_REF
   ```

4. Get your Razorpay **Key Secret** (different from the Key ID already in
   `js/razorpay-config.js`) — Razorpay Dashboard → **Settings → Websites &
   API keys** → your key → reveal/copy the **Key Secret**. This one must
   NEVER go in any file in this repo — it only goes into Supabase's
   secret storage in the next step.

5. Get your Razorpay Webhook Secret — Razorpay Dashboard → **Settings →
   Webhooks → + Add New Webhook**. You'll need the deployed webhook URL
   from step 7 below, so either come back to finish this after step 7, or
   use a placeholder URL for now:
   - **Secret**: type any strong random password YOU make up (not from
     Razorpay) — save it, you need it next. Avoid `< > # & | ; $` and
     spaces in it — those have special meaning in a terminal and can get
     mangled when you paste the command in step 6. Letters, numbers, and
     `@ _ -` are safe.
   - **Active events**: check `payment.captured`
   - Save.

6. Store both secrets (this is safest done via the Supabase Dashboard
   instead of the terminal, since the terminal can mangle certain
   characters — Dashboard → **Edge Functions** → **Secrets** → add each
   one — OR via the CLI if your values don't contain the special
   characters mentioned above):
   ```
   supabase secrets set RAZORPAY_KEY_ID=paste_your_key_id_here
   supabase secrets set RAZORPAY_KEY_SECRET=paste_your_key_secret_here
   supabase secrets set RAZORPAY_WEBHOOK_SECRET=paste_your_webhook_secret_here
   ```

7. Deploy both functions:
   ```
   supabase functions deploy razorpay-webhook --no-verify-jwt
   supabase functions deploy create-razorpay-order
   ```
   (Notice `create-razorpay-order` does NOT get `--no-verify-jwt` — it
   should only ever be called by a logged-in user of your own app, so we
   keep Supabase's login check ON for this one. Only the webhook, which
   Razorpay itself calls, needs that check turned off.)

   The first deploy prints the webhook's live URL, something like:
   `https://xxxxxxxx.supabase.co/functions/v1/razorpay-webhook`
   **Copy this URL** → go back to the Razorpay webhook from step 5 and
   paste it as the Webhook URL (edit it if you used a placeholder).

8. Double-check Razorpay's own capture delay isn't also getting in the
   way: Razorpay Dashboard → **Settings → Payment Configuration →
   Payment Capture** → make sure it's **Automatic** with the shortest
   delay available. (With `create-razorpay-order` in place this mostly
   stops mattering, since we now explicitly request
   `payment_capture: 1` when creating every order — but it doesn't hurt
   to also have the dashboard set correctly.)

## 7. Test it

1. Open the site, log in with Google (you'll notice it's now a full page
   redirect to Google and back, not a popup — that's expected with
   Supabase).
2. Do a real test payment (test card: `4111 1111 1111 1111`, any future
   date, any CVV/OTP).
3. Razorpay Dashboard → **Transactions** → find the payment → its status
   should now say **Captured**, not stuck at "Authorized".
4. Supabase Dashboard → **Table Editor** → `premium_status` → you should
   see a row with your user id, `is_premium = true`, and a
   `last_payment_id`.
5. Supabase Dashboard → **Edge Functions** → `razorpay-webhook` → **Logs**
   → you should see the `Premium unlocked for user=...` line.

## Updating a function later

If you ever edit either function's `index.ts`, open a Codespace again and
redeploy that one:
```
supabase functions deploy razorpay-webhook --no-verify-jwt
supabase functions deploy create-razorpay-order
```
