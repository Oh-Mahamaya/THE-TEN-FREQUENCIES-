import { PRICES_PAISE, isValidTierLanguage } from "../_lib/config.js";

export async function onRequestPost({ request, env }) {
  try {
    const { tier, language, email } = await request.json();

    if (!PRICES_PAISE[tier] || !isValidTierLanguage(tier, language)) {
      return json({ error: "Invalid tier or language" }, 400);
    }
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      return json({ error: "Valid email required" }, 400);
    }

    const auth = btoa(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`);
    const res = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: PRICES_PAISE[tier],
        currency: "INR",
        receipt: `sodr_${tier}_${Date.now()}`,
        notes: { tier, language, email },
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      return json({ error: "Razorpay order creation failed", detail }, 502);
    }

    const order = await res.json();
    return json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: env.RAZORPAY_KEY_ID, // public key — safe to expose to the browser
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
