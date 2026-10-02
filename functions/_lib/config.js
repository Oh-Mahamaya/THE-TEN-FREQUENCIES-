// Central place to edit prices, which Workers KV key each language maps
// to, and the external physical-book retailer links. Touch this file,
// not the route handlers, when prices change or Book Two gets added.

// Digital ebook is the only thing sold through this site's checkout.
// The physical paperback is sold externally — see PHYSICAL_LINKS below,
// which the site just links out to, no checkout involved.
export const PRICES_PAISE = {
  ebook: 24900, // ₹249.00 — Razorpay amounts are in paise
};

// KV keys — upload your actual files to these exact keys (see
// PUBLISHING_GUIDE.md for the Wrangler upload command).
export const FILE_MAP = {
  ebook: {
    en: "book1/ebook-en.pdf",
    bn: "book1/ebook-bn.pdf",
    hi: "book1/ebook-hi.pdf",
  },
};

// Bonus audio (Prologue + Epilogue, mixed with the ambient bed) included
// free with every ebook purchase — sent as a second download link when
// present. Leave a language's entry as null until that language's audio
// is actually recorded, mixed, and uploaded to KV.
export const BONUS_AUDIO_KEY = {
  en: null,
  bn: null,
  hi: null,
};

// External physical-book retailers — no checkout on this site for these,
// just outbound links from the "prefer a physical copy" section.
export const PHYSICAL_LINKS = {
  amazon:
    "https://www.amazon.in/dp/B0HKXQGMNH/ref=sr_1_1?crid=3689UWZTNUVO2&dib=eyJ2IjoiMSJ9.Br0Ac50rJO28PgvT8K2v90k_wuskX2SmSv7P0h76UhHxZg7RykrAPqR9Pu1-x4BLD-owGZeZcvmliXWhqo7QwSowgsP4v8RNYyfAXn7jwk_AI5CjRNluKGz1MWJWmLhh1fhtP6X9kkjRDSQSGycFeRp20-MGyfDkRZwxdwzIO65MXOabYIWKre7FuHFVY4ODf_bhjEivS0via_3zIoLti6B3tlUODghb2Wt5O7TiwZE.FDHbdytq5z7Z2Vk0qEdUdkt2ls6snyUIt1limoPvNDI&dib_tag=se&keywords=Science+of+Death+and+Rebirth&qid=1790411836&sprefix=science+of+death+and+rebirth%2Caps%2C414&sr=8-1",
  flipkart:
    "https://www.flipkart.com/science-death-rebirth/p/itm96dc390efab68?pid=9798907229136&lid=LSTBOK9798907229136TVUFOJ&marketplace=FLIPKART&q=A+Science+of+Death+and+Rebirth&store=bks&srno=s_1_3&otracker=search&otracker1=search&fm=organic&iid=04951935-158a-4693-99b6-d62383ac7297.9798907229136.SEARCH&ppt=None&ppn=None&ssid=vozlnlfl4g0000001790637326082&qH=df5187a43b2354ac&ov_redirect=true",
};

export function isValidTierLanguage(tier, language) {
  return Boolean(FILE_MAP[tier] && FILE_MAP[tier][language]);
}
