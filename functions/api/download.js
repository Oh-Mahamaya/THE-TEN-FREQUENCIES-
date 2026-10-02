import { verifyDownloadToken } from "../_lib/crypto.js";

// Requires a KV namespace bound to this Pages project as `BOOK_FILES`
// (Cloudflare dashboard → Pages project → Settings → Functions →
// KV namespace bindings). Upload files with Wrangler (see PUBLISHING_GUIDE.md),
// not the dashboard's small text-value editor — PDFs need the CLI.
export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  if (!token) return new Response("Missing token", { status: 400 });

  const result = await verifyDownloadToken(env, token);
  if (!result.valid) {
    const msg = result.reason === "expired" ? "This link has expired." : "Invalid download link.";
    return new Response(msg, { status: 403 });
  }

  const object = await env.BOOK_FILES.get(result.fileKey, { type: "stream" });
  if (!object) return new Response("File not found", { status: 404 });

  const filename = result.fileKey.split("/").pop();
  const headers = new Headers({
    "Content-Type": "application/pdf",
    "Content-Disposition": `attachment; filename="${filename}"`,
    "Cache-Control": "private, no-store",
  });

  return new Response(object, { headers });
}
