// Central place to edit prices, product tiers, and which R2 object each
// tier+language maps to. Touch this file, not the route handlers, when
// prices change or Book Two gets added.

export const PRICES_PAISE = {
  ebook: 24900,   // ₹249.00 — Razorpay amounts are in paise
  bundle: 59900,  // ₹599.00
};

// R2 object keys — upload your actual files to these paths in the bucket.
// Bundle currently ships the same ebook file plus a placeholder extras zip;
// swap BUNDLE_EXTRAS_KEY when the Founding Reader bonus content is ready.
export const FILE_MAP = {
  ebook: {
    en: "book1/ebook-en.pdf",
    bn: "book1/ebook-bn.pdf",
    hi: "book1/ebook-hi.pdf",
  },
  bundle: {
    en: "book1/ebook-en.pdf",
    bn: "book1/ebook-bn.pdf",
    hi: "book1/ebook-hi.pdf",
  },
};

// Founding Reader bonus content — sent as a second download link.
// Leave a key out (or set to null) until that language's bonus pack is ready.
export const BUNDLE_EXTRAS_KEY = {
  en: "book1/founding-reader-extras-en.zip",
  bn: null,
  hi: null,
};

export function isValidTierLanguage(tier, language) {
  return Boolean(FILE_MAP[tier] && FILE_MAP[tier][language]);
}
