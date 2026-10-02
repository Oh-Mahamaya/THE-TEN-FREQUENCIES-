const LANG_NAMES = { en: "English", bn: "Bengali (বাংলা)", hi: "Hindi (हिन्दी)" };
const TIER_NAMES = { ebook: "Ebook" };

export async function sendDeliveryEmail(env, { toEmail, tier, language, downloadLinks }) {
  const langName = LANG_NAMES[language] || language;
  const tierName = TIER_NAMES[tier] || tier;
  const whatsappLink = env.WHATSAPP_COMMUNITY_LINK;

  const linksHtml = downloadLinks
    .map((l) => `<p><a href="${l.url}" style="color:#c81f10;">${l.label}</a></p>`)
    .join("\n");

  const html = `
    <div style="font-family:Georgia,serif; max-width:560px; margin:0 auto; color:#1a1a1a;">
      <h2 style="color:#8f130c;">A Science of Death and Rebirth</h2>
      <p>Thank you for getting the ${tierName} (${langName} edition).</p>
      <p>Your download${downloadLinks.length > 1 ? "s" : ""}:</p>
      ${linksHtml}
      <p style="font-size:13px; color:#666;">Link${downloadLinks.length > 1 ? "s expire" : " expires"} in 48 hours. If it stops working, just reply to this email.</p>
      ${
        whatsappLink
          ? `<p style="margin-top:24px;">Join the Ten Frequencies WhatsApp community for updates on the next book:</p>
             <p><a href="${whatsappLink}" style="color:#25D366; font-weight:bold;">Join on WhatsApp →</a></p>`
          : ""
      }
      <p style="margin-top:32px; font-size:12px; color:#999;">— Shiladitya Mallick</p>
    </div>
  `;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.FROM_EMAIL, // e.g. "Ten Frequencies <books@yourdomain.com>" — domain must be verified in Resend
      to: toEmail,
      subject: "Your copy of A Science of Death and Rebirth",
      html,
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Resend send failed: ${res.status} ${detail}`);
  }
}
