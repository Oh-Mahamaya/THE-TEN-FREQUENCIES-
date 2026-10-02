import { hmacSHA256Hex, timingSafeEqual, buildDownloadToken } from "../_lib/crypto.js";
import { FILE_MAP, BONUS_AUDIO_KEY, PRICES_PAISE } from "../_lib/config.js";
import { sendDeliveryEmail } from "../_lib/email.js";
import { sendMetaPurchaseEvent } from "../_lib/meta-capi.js";

// Set this exact URL as the webhook endpoint in the Razorpay dashboard:
//   https://<your-domain>/api/webhook
// Subscribe to the "payment.captured" event. Use a DIFFERENT secret here
// than your API key secret — Razorpay generates a separate Webhook Secret
// when you create the webhook; that's RAZORPAY_WEBHOOK_SECRET below.
export async function onRequestPost({ request, env }) {
  const rawBody = await request.text();
  const signature = request.headers.get("X-Razorpay-Signature") || "";

  const expected = await hmacSHA256Hex(rawBody, env.RAZORPAY_WEBHOOK_SECRET);
  if (!timingSafeEqual(expected, signature)) {
    return new Response("Invalid signature", { status: 400 });
  }

  const payload = JSON.parse(rawBody);

  if (payload.event === "payment.captured") {
    const payment = payload.payload?.payment?.entity;
    const notes = payment?.notes || {};
    const { tier, language, email } = notes;

    if (tier && language && email && FILE_MAP[tier]?.[language]) {
      // NOTE (v1 limitation): there's no de-duplication store here (no D1/KV
      // wired up yet for dedup — the KV namespace in use is only for the
      // book files), so if Razorpay retries this webhook the buyer could
      // get a second email. Low-frequency risk for a launch, but worth a
      // KV dedup check on payment.id before going to real scale.
      const fileKey = FILE_MAP[tier][language];
      const token = await buildDownloadToken(env, fileKey);
      const primaryUrl = `${env.SITE_URL}/api/download?token=${token}`;
      const links = [{ label: "Download your ebook", url: primaryUrl }];

      if (BONUS_AUDIO_KEY[language]) {
        const audioToken = await buildDownloadToken(env, BONUS_AUDIO_KEY[language]);
        links.push({
          label: "Download bonus audio — Prologue & Epilogue",
          url: `${env.SITE_URL}/api/download?token=${audioToken}`,
        });
      }

      // Email delivery and the Meta Conversions API purchase event run
      // independently — one failing shouldn't block the other.
      const results = await Promise.allSettled([
        sendDeliveryEmail(env, { toEmail: email, tier, language, downloadLinks: links }),
        sendMetaPurchaseEvent(env, { email, value: (PRICES_PAISE[tier] || 0) / 100 }),
      ]);

      results.forEach((r, i) => {
        if (r.status === "rejected") {
          const names = ["email delivery", "Meta Conversions API"];
          // Check your Cloudflare Functions logs (wrangler tail / dashboard)
          // if a buyer reports a missing email.
          console.error(`${names[i]} failed:`, r.reason?.message || r.reason);
        }
      });
    }
  }

  return new Response("ok");
}
