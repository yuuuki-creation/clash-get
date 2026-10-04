import { getSubscriptionByToken, readContent, recordFetch } from "@/lib/store";

/**
 * 公开的订阅地址，Clash 客户端直接拉取这里。
 * Content-Disposition 里的文件名会被 Clash Verge / Mihomo Party 等客户端用作配置名称。
 */
export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const subscription = getSubscriptionByToken(token);
  if (!subscription) {
    return new Response("Not Found", { status: 404, headers: { "Cache-Control": "no-store" } });
  }

  const content = readContent(subscription.id);
  recordFetch(subscription.id, req.headers.get("user-agent"));

  const filename = `${subscription.name}.yaml`;
  const asciiFilename = /^[\x20-\x7e]+$/.test(filename) ? filename.replace(/["\\]/g, "_") : "config.yaml";

  return new Response(content, {
    headers: {
      "Content-Type": "text/yaml; charset=utf-8",
      "Content-Disposition": `attachment; filename="${asciiFilename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Cache-Control": "no-store",
      "profile-update-interval": "24",
      "X-Robots-Tag": "noindex",
    },
  });
}
