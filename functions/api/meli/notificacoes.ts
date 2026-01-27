export const onRequestPost: PagesFunction = async (ctx) => {
  const req = ctx.request;

  // Webhook tem que responder rápido (200 OK) pra evitar retry do ML
  let body: unknown = null;
  try {
    body = await req.json();
  } catch {
    body = { raw: await req.text() };
  }

  // Log pra debug no Cloudflare (Workers/Pages logs)
  console.log("ML webhook:", {
    url: req.url,
    headers: Object.fromEntries(req.headers),
    body,
  });

  return new Response("ok", { status: 200 });
};
