import { hmacSHA256Hex, timingSafeEqual, buildDownloadToken } from "../_lib/crypto.js";
import { isValidTierLanguage } from "../_lib/config.js";

// Called by the browser right after the Razorpay Checkout popup succeeds.
// This gives the buyer an instant on-screen download link. The webhook
// (see webhook.js) is the authoritative confirmation and is what actually
// sends the email — this endpoint is for immediate gratification only,
// so a closed tab or a flaky connection here never loses the sale.
export async function onRequestPost({ request, env }) {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, tier, language } =
      await request.json();

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return json({ error: "Missing Razorpay fields" }, 400);
    }
    if (!isValidTierLanguage(tier, language)) {
      return json({ error: "Invalid tier or language" }, 400);
    }

    const expected = await hmacSHA256Hex(
      `${razorpay_order_id}|${razorpay_payment_id}`,
      env.RAZORPAY_KEY_SECRET
    );
    if (!timingSafeEqual(expected, razorpay_signature)) {
      return json({ error: "Signature verification failed" }, 400);
    }

    const { FILE_MAP, BUNDLE_EXTRAS_KEY } = await import("../_lib/config.js");
    const fileKey = FILE_MAP[tier][language];
    const token = await buildDownloadToken(env, fileKey);
    const downloadUrl = `/api/download?token=${token}`;

    const links = [{ label: "Download your ebook", url: downloadUrl }];

    if (tier === "bundle" && BUNDLE_EXTRAS_KEY[language]) {
      const extrasToken = await buildDownloadToken(env, BUNDLE_EXTRAS_KEY[language]);
      links.push({ label: "Download Founding Reader extras", url: `/api/download?token=${extrasToken}` });
    }

    return json({
      ok: true,
      downloadLinks: links,
      whatsappLink: env.WHATSAPP_COMMUNITY_LINK || null,
    });
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
