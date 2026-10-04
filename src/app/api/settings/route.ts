import { requireUser } from "@/lib/auth";
import { asString, HttpError, readJson, route } from "@/lib/http";
import { getSettings, updateSettings } from "@/lib/store";

/** 允许只填域名（默认 https），去掉末尾斜杠；不接受参数和锚点 */
function normalizePublicUrl(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;

  let url: URL;
  try {
    url = new URL(/^[a-z][a-z\d+.-]*:\/\//i.test(value) ? value : `https://${value}`);
  } catch {
    throw new HttpError(400, "不是有效的地址");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new HttpError(400, "只支持 http:// 或 https:// 开头的地址");
  }
  if (url.search || url.hash || url.username || url.password) {
    throw new HttpError(400, "地址里不能包含参数、锚点或账号信息");
  }
  return `${url.origin}${url.pathname.replace(/\/+$/, "")}`;
}

export const GET = route(async () => {
  await requireUser();
  return Response.json({ settings: getSettings() });
});

export const PUT = route(async (req) => {
  await requireUser();
  const body = await readJson<{ publicUrl: string | null }>(req);
  const settings = updateSettings({ publicUrl: normalizePublicUrl(asString(body.publicUrl)) });
  return Response.json({ settings });
});
