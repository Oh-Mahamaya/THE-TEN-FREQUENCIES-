# The Ten Frequencies — Landing Page

Landing page for **The Ten Frequencies** book series by Shiladitya Mallick.
Currently live content is for **Book One — *A Science of Death and Rebirth: The First Frequency*** (Decoding Maa Kali Through Quantum Physics & Psychology). Built as the exclusive direct-sale page for the ebook (India-only, Razorpay) — the paperback is sold separately through Amazon and Flipkart, this site just links out to those listings rather than selling it directly. Books 2–10 will be added to this same page as they release.

**Status: front-end and copy are publish-ready.** No visible placeholders, wireframe notes, or "coming soon" banners remain on the page. What's left is entirely backend configuration — your own Razorpay/Workers KV/Resend credentials — see the checklist at the bottom.

---

## Structure

```
index.html                          — the whole page (HTML + CSS + JS, no build step)
assets/images/cover-front-en.jpg    — Book One cover art, English (cropped from the full wraparound cover)
assets/images/cover-front-bn.jpg    — Book One cover art, Bengali edition
assets/images/cover-front-hi.jpg    — Book One cover art, Hindi edition
assets/images/mahamaya-trishul-logo.png   — series mark, raster (used inline throughout the page)
assets/images/mahamaya-trishul-logo.svg   — series mark, vector source (edit this, re-export the PNG if it changes)

functions/api/create-order.js       — creates a Razorpay order (called when the buyer clicks Pay)
functions/api/verify-payment.js     — verifies the Razorpay signature, returns an instant download link
functions/api/webhook.js            — Razorpay webhook — the AUTHORITATIVE confirmation, sends the delivery email
functions/api/download.js           — serves the actual file from Workers KV given a valid signed token
functions/_lib/config.js            — prices, and which Workers KV key each tier+language maps to (edit here for Book Two)
functions/_lib/crypto.js            — Razorpay signature verification + signed download token helpers
functions/_lib/email.js             — builds and sends the delivery email via Resend
functions/_lib/meta-capi.js         — server-side Meta Purchase event (Conversions API)
```

These `functions/` files are **Cloudflare Pages Functions** — they deploy automatically alongside the static site, no separate server or hosting needed. Each file's path under `functions/` becomes its route (`functions/api/create-order.js` → `POST /api/create-order`).

## Preview locally

Just open `index.html` in a browser, or serve the folder so relative asset paths resolve cleanly:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Deploy (Cloudflare Pages)

1. Push this folder to a GitHub repo.
2. In Cloudflare Pages: **Create a project → Connect to Git → select this repo.**
3. Build settings: none needed — framework preset "None," build command empty, output directory `/` (root).
4. Deploy. Connect your custom domain under the project's **Custom domains** tab once it's live.

## Payments, file delivery & WhatsApp — full setup

The purchase flow is: buyer pays via Razorpay → server verifies it → buyer gets an instant download link on-screen → Razorpay's webhook (the reliable confirmation) triggers an email with the download link and the WhatsApp community invite.

**Reality check on WhatsApp:** there is no API to silently add someone's phone number to a WhatsApp Community — Meta blocks that to prevent spam. What this actually does is hand every buyer the community's invite link automatically (on the success screen and in the email) so joining is one tap. That's the ceiling of what "automatic" means here.

### 1. Razorpay
1. Create an account at [razorpay.com](https://razorpay.com) (or use your existing one) and finish KYC for live payments — test mode works immediately without it.
2. **Settings → API Keys** → generate a Key ID + Key Secret. Start with **test mode** keys.
3. **Settings → Webhooks → Add New Webhook**:
   - URL: `https://<your-site>/api/webhook` (your `*.pages.dev` URL works fine before you have a custom domain)
   - Active events: check **`payment.captured`**
   - Save — Razorpay shows you a **Webhook Secret**. Copy it; it's different from your API Key Secret.
4. Test with [Razorpay's test cards](https://razorpay.com/docs/payments/payments/test-card-upi-details/) before flipping to live keys.

### 2. Cloudflare Workers KV (file storage)
Same Cloudflare account as Pages — no new signup. Free tier: 1GB total storage, 100,000 reads/day, values up to 25MB (a 154-page PDF is nowhere close to that limit).

1. Cloudflare dashboard → **Workers & Pages → KV** → **Create a namespace**. Name it something like `sodr-books`.
2. Upload your PDFs into it with **Wrangler** (Cloudflare's CLI — the dashboard's built-in editor is meant for small text values, not binary files):
   ```bash
   npm install -g wrangler
   wrangler login
   wrangler kv:key put --namespace-id=<your-namespace-id> "book1/ebook-en.pdf" --path=./ebook-en.pdf
   wrangler kv:key put --namespace-id=<your-namespace-id> "book1/ebook-bn.pdf" --path=./ebook-bn.pdf
   wrangler kv:key put --namespace-id=<your-namespace-id> "book1/ebook-hi.pdf" --path=./ebook-hi.pdf
   ```
   The namespace ID is shown on the KV namespace's page in the dashboard. Keys must match `functions/_lib/config.js` exactly — edit that file if you want different paths.
3. **Pages project → Settings → Functions → KV namespace bindings** → add a binding: variable name `BOOK_FILES` → the namespace you just created. (Must be named `BOOK_FILES` — that's what `download.js` expects.)
4. Nothing here is public by default — `download.js` is the only thing that can read it, and only with a validly signed, unexpired token.

### 3. Resend (delivery email)
1. Create an account at [resend.com](https://resend.com) — generous free tier.
2. Verify a sending domain (or use their test domain while developing).
3. **API Keys** → create one.

### 4. WhatsApp Community
1. Create the Community in the WhatsApp app (**Communities → Create Community**) if you haven't already.
2. Get its invite link (**Community settings → Invite people → Share link**).
3. That's it — no API needed for this part, just the link.

### 5. Environment variables (Cloudflare Pages → Settings → Environment variables)

| Variable | Value |
|---|---|
| `RAZORPAY_KEY_ID` | from Razorpay API Keys |
| `RAZORPAY_KEY_SECRET` | from Razorpay API Keys — mark as **secret** |
| `RAZORPAY_WEBHOOK_SECRET` | from the webhook you created — mark as **secret** |
| `DOWNLOAD_SIGNING_SECRET` | any long random string you generate yourself (e.g. `openssl rand -hex 32`) — mark as **secret** |
| `RESEND_API_KEY` | from Resend — mark as **secret** |
| `FROM_EMAIL` | e.g. `Ten Frequencies <books@yourdomain.com>` (domain must be verified in Resend) |
| `WHATSAPP_COMMUNITY_LINK` | your community invite link |
| `SITE_URL` | your live URL, e.g. `https://tenfrequencies.com` (used in webhook-generated email links) |

Set these for both **Production** and **Preview** environments. Use Razorpay **test** keys everywhere until you've done a full end-to-end test purchase.

### 6. Meta Pixel
In `index.html`, find `YOUR_PIXEL_ID` (in the `<head>`, near the Facebook pixel snippet) and replace it with your actual Pixel ID before running any ads. The `Purchase` event already fires automatically from the checkout success handler.

### Known v1 limitation
`webhook.js` doesn't de-duplicate — if Razorpay retries a webhook delivery (it does this if your server doesn't respond fast enough, or on transient errors), a buyer could theoretically get the delivery email twice. Low-risk for a launch at your current scale; if that starts mattering, add a Cloudflare KV or D1 lookup keyed by `payment.id` before sending, and skip if already seen.

The entire page — not just the pricing card — switches between English, Bengali (বাংলা), and Hindi (हिन्दी). Two switchers control the same state and stay in sync:

- **Top bar** (`#top-lang-switcher`) — fixed at the top of the page, visible at all times while scrolling. This is the primary control.
- **In-page selector** — inside the "Choose your language" section, further down the page.

All translatable strings live in one `translations` object near the bottom of `index.html` (search for `const translations =`), keyed by `en` / `bn` / `hi`. Every translatable element in the HTML carries a `data-i18n="key"` attribute; `applyLanguage(lang)` re-renders all of them at once. To edit copy in any language, or add a fourth language later, that object is the only place to touch — the HTML markup doesn't need to change.

**Translation quality note:** the Bengali and Hindi text was drafted by AI, not by a native-speaking editor. Shiladitya reads Bengali natively — worth a pass before launch, especially on the Tantra-specific terms (Shava Sadhana, dīkṣā, etc.) where word choice matters. Hindi should get a native review too.

The goddess names in the "Series" wheel section (Kali, Tara, Tripura Sundari, etc.) are transliterated into Bengali/Hindi script — double-check these match how you'd want them spelled.

## Audio — bonus with every ebook

Two separate audio things live in this project — don't confuse them:

**1. The website welcome message (live now).** The hero's "Play Welcome Message" button plays a ~30-second intro hosted on Cloudinary (`welcome-audio` element in `index.html` — change the `src` there if you ever replace it). It's click-to-play only (browsers block autoplay with sound anyway), and the little frequency bars next to it only animate while the audio is actually playing.

**2. The bonus audio shipped with every ebook purchase (not built yet).** Author-narrated Author's Note, Prologue, and Epilogue — use the separate `sodr-narration-script.md` document for the exact cleaned text to feed into ElevenLabs. **Keep that script out of this repo:** everything in this folder is publicly served once deployed to Cloudflare Pages, and the script contains your book text. Package the audio as three separate tracks, not one merged file. This doesn't exist yet, but one real ingredient does:

**`audio-assets/ambient-bed-432hz.wav`** (and an `.mp3` preview) — an original ambient drone built as the sonic bed to record narration over. It's a root–fifth–octave chord (216 / 432 / 648 / 864 Hz) with each layer breathing at a slightly different slow rate, plus a touch of filtered warmth noise, normalized with headroom so a voice track sits cleanly on top. It loops seamlessly at 2 minutes (crossfaded seam) — loop it in your editor to cover narration of any length.

**How to actually produce the audio, once you're ready:**
1. Record narration dry (no ambience) in the quietest room you have — a closet full of clothes is a genuinely good vocal booth in a pinch.
2. Import both the narration and `ambient-bed-432hz.wav` into a free editor (Audacity, or GarageBand on Mac).
3. Loop/extend the ambient bed under the full narration length, then duck its volume under your voice — the bed should be felt, not heard, roughly -20 to -25 dB under narration.
4. Apply one fade-in and one fade-out to the *finished mix* (not the loop file itself) — a few seconds each, at the very start and end only.
5. Export as MP3, 192kbps is plenty for spoken word.

The bonus audio files aren't wired into checkout delivery yet — that's the next step once you have real narration recorded. Once it exists, set `BONUS_AUDIO_KEY` in `functions/_lib/config.js` per language and it'll start shipping automatically as a second download link alongside the ebook.

## Design notes

- Palette is sampled directly from the real cover art (blood red / black / ember — no navy, despite earlier drafts; the final cover has none).
- The trishul + third-eye mark (`mahamaya-trishul-logo.svg`) is an original design — trishul (ascetic/Shiva) fused with a third eye at its base (Mahamaya/Devi), framed by a yantra ring and mirrored "frequency" arcs. Shared brand mark, usable for the Oh MahaMaya YouTube channel too since both center on the same 10 Mahavidyas.
- The Ten Frequencies Wheel in the "Series" section is hand-built SVG (no source art existed for it) — swap for real series art when ready, same markup slot.
- The 4 interior-illustration placeholders (chapter glyph, cremation scene, spine, cymatics) are also original SVG line art standing in for the book's real interior illustrations — same instruction, swap when the real art's ready.
- Mobile-first pass is in: touch replaces hover for glow effects, ember-particle count is reduced on small screens, section padding tightens under 600px.

## Before this goes live behind ad spend

- [x] Placeholder copy replaced — the hook line, refund policy, and hero whisper line all now read as finished copy. **Two of these are still my best-guess text, not yours**: the hook quote ("There is a ritual for lying down with the dead...") stands in for your actual Prologue line, and the refund policy is a sensible default, not your stated policy — both are easy to edit via the `translations` object (see "Language switching" below) or, for the hook quote, search `hook_quote` in each of the three language blocks.
- [x] Welcome audio button is wired to a real Cloudinary-hosted MP3 and plays/pauses correctly
- [x] Checkout, payment verification, file delivery, and WhatsApp invite are built — see "Payments, file delivery & WhatsApp" above to actually configure the accounts and env vars; nothing works until those are filled in
- [ ] Do a full end-to-end test purchase with Razorpay **test** keys before touching live keys
- [ ] Replace `YOUR_PIXEL_ID` with your real Meta Pixel ID before any ad spend
- [ ] Add Open Graph / share meta tags (currently just a plain `<title>`)
- [ ] Confirm draft pricing (₹249) and refund policy
- [x] English, Bengali, and Hindi PDFs are all ready — language selector shows all three as available, and checkout now delivers the file matching whichever language is selected
