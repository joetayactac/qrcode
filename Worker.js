/**
 * QR // GEN — image endpoint
 *
 * Deploy this as a Cloudflare Worker. Once live, it gives you a real
 * image-returning URL (not an HTML page) that works directly inside
 * AppSheet's CONCATENATE() formula for an Image-type virtual column.
 *
 * Example once deployed:
 *   https://qrcode.<your-subdomain>.workers.dev/qrcode
 *     ?data=https://example.com
 *     &size=300x300
 *     &color=000000
 *     &bgcolor=ffffff
 *     &ecc=L
 *     &qzone=1
 */

export default {
  async fetch(request) {
    const url = new URL(request.url);

    // Only respond on /qrcode — everything else 404s
    if (url.pathname !== "/qrcode") {
      return new Response("Not found. Use /qrcode?data=...", { status: 404 });
    }

    const params = url.searchParams;
    const data = params.get("data") || "";

    if (!data) {
      return new Response("Missing required parameter: data", { status: 400 });
    }

    // Read + validate incoming params, fall back to sane defaults
    const size = /^\d{2,4}x\d{2,4}$/.test(params.get("size") || "")
      ? params.get("size")
      : "300x300";

    const color = /^[0-9a-fA-F]{6}$/.test(params.get("color") || "")
      ? params.get("color")
      : "000000";

    const bgcolor = /^[0-9a-fA-F]{6}$/.test(params.get("bgcolor") || "")
      ? params.get("bgcolor")
      : "ffffff";

    const ecc = ["L", "M", "Q", "H"].includes((params.get("ecc") || "").toUpperCase())
      ? params.get("ecc").toUpperCase()
      : "L";

    const qzone = /^\d{1,2}$/.test(params.get("qzone") || "")
      ? params.get("qzone")
      : "1";

    // Build the upstream request to the QR image generator
    const upstream = new URL("https://api.qrserver.com/v1/create-qr-code/");
    upstream.searchParams.set("data", data);
    upstream.searchParams.set("size", size);
    upstream.searchParams.set("color", color);
    upstream.searchParams.set("bgcolor", bgcolor);
    upstream.searchParams.set("ecc", ecc);
    upstream.searchParams.set("qzone", qzone);

    const upstreamResponse = await fetch(upstream.toString());

    if (!upstreamResponse.ok) {
      return new Response("QR generation failed upstream.", { status: 502 });
    }

    // Stream the real image bytes straight back — this is what makes it
    // work as an Image-type virtual column in AppSheet.
    return new Response(upstreamResponse.body, {
      status: 200,
      headers: {
        "Content-Type": upstreamResponse.headers.get("Content-Type") || "image/png",
        "Cache-Control": "public, max-age=86400",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }
};
