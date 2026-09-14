// Server-side Meta Conversions API. Fires the same Purchase event the
// client-side pixel fires, from the webhook (the authoritative point) —
// so attribution survives ad blockers, iOS ATT opt-outs, and closed tabs
// that never let the client-side pixel fire at all.
async function sha256Hex(text) {
  const enc = new TextEncoder();
  const digest = await crypto.subtle.digest("SHA-256", enc.encode(text.trim().toLowerCase()));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function sendMetaPurchaseEvent(env, { email, phone, value, currency = "INR" }) {
  if (!env.META_PIXEL_ID || !env.META_CAPI_ACCESS_TOKEN) {
    console.warn("Meta CAPI not configured — skipping server-side Purchase event");
    return;
  }

  const userData = {};
  if (email) userData.em = [await sha256Hex(email)];
  if (phone) userData.ph = [await sha256Hex(phone)];

  const payload = {
    data: [
      {
        event_name: "Purchase",
        event_time: Math.floor(Date.now() / 1000),
        action_source: "website",
        user_data: userData,
        custom_data: { value, currency },
      },
    ],
  };

  const url = `https://graph.facebook.com/v19.0/${env.META_PIXEL_ID}/events?access_token=${env.META_CAPI_ACCESS_TOKEN}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    console.error("Meta CAPI send failed:", await res.text());
  }
}
