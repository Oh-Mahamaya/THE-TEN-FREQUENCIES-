# Publishing Report — GitHub → Cloudflare → Razorpay → Facebook Ads → WhatsApp

This is the full path from "code in a folder" to "taking real payments and delivering the book via email and WhatsApp, tracked from Facebook ads." Follow it in order — later steps depend on earlier ones.

---

## Part 1 — GitHub

1. Unzip this repo somewhere on your computer.
2. Create a new repository on [github.com](https://github.com/new) — private is fine, it doesn't need to be public.
3. In a terminal, inside the unzipped folder:
   ```bash
   git init
   git add .
   git commit -m "Initial launch build"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<your-repo>.git
   git push -u origin main
   ```
4. Confirm the files show up on GitHub — you should see `index.html`, `functions/`, `assets/`, `audio-assets/`, `README.md`.

## Part 2 — Cloudflare Pages

1. [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages → Create → Pages → Connect to Git**.
2. Select the repo you just pushed.
3. Build settings: **Framework preset: None. Build command: (leave empty). Build output directory: /**. There's no build step — it's static files plus Functions.
4. Deploy. You'll get a `https://<something>.pages.dev` URL immediately — this already works for testing before you own a custom domain.
5. **Custom domain**: Pages project → **Custom domains** → add your domain (must already be using Cloudflare for DNS, or Cloudflare will guide you to switch nameservers).

At this point the site is live but the buy buttons will error out — nothing's configured yet. That's expected; continue below.

## Part 3 — Razorpay

1. Sign up / log in at [razorpay.com](https://razorpay.com).
2. **Settings → API Keys → Generate Test Key** first — build and test the whole flow before ever touching live keys.
3. **Settings → Webhooks → Add New Webhook**:
   - URL: `https://<your-site>/api/webhook`
   - Active events: `payment.captured`
   - Save — copy the **Webhook Secret** shown (different from your API secret).
4. Test purchases with [Razorpay's test cards](https://razorpay.com/docs/payments/payments/test-card-upi-details/) — nothing is actually charged in test mode.
5. Once everything works end-to-end in test mode: complete Razorpay's KYC (needed for live payments), generate **live** API keys, and repeat step 3 for a **second, live-mode webhook**. Test and live are entirely separate credentials and webhooks.

## Part 4 — File storage, email, WhatsApp community (as before)

Covered in the main README's "Payments, file delivery & WhatsApp" section — Workers KV namespace + upload your PDFs via Wrangler, Resend account for email, WhatsApp Community invite link. Do that section now if you haven't.

## Part 5 — Environment variables

Cloudflare Pages project → **Settings → Environment variables**. Set every one of these for **both Production and Preview**:

| Variable | Where it comes from |
|---|---|
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | Razorpay API Keys (test first, live later) |
| `RAZORPAY_WEBHOOK_SECRET` | The webhook you created in Part 3 |
| `DOWNLOAD_SIGNING_SECRET` | Any long random string (`openssl rand -hex 32`) |
| `RESEND_API_KEY` / `FROM_EMAIL` | Resend account |
| `WHATSAPP_COMMUNITY_LINK` | Your WhatsApp Community invite link |
| `SITE_URL` | Your live domain, e.g. `https://tenfrequencies.com` |
| `META_PIXEL_ID` / `META_CAPI_ACCESS_TOKEN` | See Part 6 below |

Mark secrets (keys, tokens) as **encrypted** in the Cloudflare dashboard, not plain text.

---

## Part 6 — Facebook / Instagram ads

**How the connection actually works:** an ad doesn't "connect" to a checkout directly — it just links to your landing page URL. Everything after that (browsing, clicking buy, paying) happens on your site. What actually needs setting up is *tracking*, so Meta knows which ad led to which purchase.

1. **Meta Pixel**: you already have the base pixel code in `index.html` — find `YOUR_PIXEL_ID` (in the `<head>`) and replace it with your real Pixel ID from **Meta Events Manager**. The `Purchase` event already fires automatically when checkout succeeds.
2. **Conversions API (server-side)** — this is the reliability layer. Client-side pixels get blocked by iOS privacy settings, ad blockers, and simply don't fire if someone closes the tab right after paying. The webhook now sends the same `Purchase` event server-side, which doesn't have any of those problems. To turn it on:
   - **Events Manager → your Pixel → Settings → Conversions API → Generate Access Token**.
   - Set `META_PIXEL_ID` (same ID as the client-side pixel) and `META_CAPI_ACCESS_TOKEN` in Cloudflare.
   - That's it — `webhook.js` already calls it.
3. **Ad account structure** (a sensible starting point, not the only valid one):
   - One campaign, objective **Sales** (conversion-optimized).
   - Link every ad to your landing page URL with UTM parameters so you can tell campaigns apart later even outside Meta's own reporting, e.g. `https://tenfrequencies.com/?utm_source=facebook&utm_campaign=launch1`.
   - Let it optimize for `Purchase` once you have Conversions API live — Meta's algorithm needs real purchase signal to target well, and CAPI is what keeps that signal accurate.
4. **Ad copy reminder** (from earlier in this project): Meta's automated review is sensitive about religious/spiritual content categorization. Lead ad copy with the story and the physics/psychology angle, not "learn ancient Tantra secrets" — safer against rejection and honestly a better hook anyway.

## Part 7 — WhatsApp direct delivery: deferred for launch

Decided against this for now — it's real friction (Meta Business verification, a message template that needs approval before it can be used) for a channel that isn't needed to start taking payments. Email delivery (Part 4) covers the actual purchase; the WhatsApp Community invite link is still shown on the success screen and in the email, so buyers who want it can join with one tap — that part needed no API at all and is already live.

If this becomes worth building later, the honest comparison of paths (raw Meta Cloud API vs. a business solution provider like AiSensy/Interakt/Wati vs. staying email-only) is worth revisiting then, not now — the code for direct per-purchase WhatsApp delivery isn't in this repo, so there's nothing half-built sitting around to confuse a future pass at it.

---

## Part 8 — Full end-to-end test before spending a rupee on ads

Do a real test purchase, in this order, before going live:

1. Razorpay in **test mode**, real email address.
2. Confirm: instant download link appears on-screen.
3. Confirm: email arrives with the download link.
4. Confirm: the downloaded file actually opens and is the right language.
5. Check Cloudflare Pages Functions logs for any errors from the two `Promise.allSettled` deliveries in `webhook.js` (email + Meta Conversions API).
6. Only after all of that passes clean — switch to live Razorpay keys, do **one real ₹249 purchase yourself**, then go live on ads.
