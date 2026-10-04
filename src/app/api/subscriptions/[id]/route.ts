import { requireUser } from "@/lib/auth";
import { analyzeClashConfig, MAX_CONTENT_BYTES, normalizeName } from "@/lib/clash";
import { asString, HttpError, readJson, route } from "@/lib/http";
import { deleteSubscription, getSubscription, readContent, updateSubscription } from "@/lib/store";

type Context = { params: Promise<{ id: string }> };

export const GET = route(async (_req, { params }: Context) => {
  await requireUser();
  const { id } = await params;
  const subscription = getSubscription(id);
  if (!subscription) throw new HttpError(404, "订阅不存在");
  return Response.json({ subscription, content: readContent(id) });
});

export const PUT = route(async (req, { params }: Context) => {
  await requireUser();
  const { id } = await params;
  const body = await readJson<{ name: string; content: string }>(req, MAX_CONTENT_BYTES * 2);
  const name = normalizeName(asString(body.name));
  const { content, stats } = analyzeClashConfig(asString(body.content));
  const subscription = updateSubscription(id, name, content, stats);
  if (!subscription) throw new HttpError(404, "订阅不存在");
  return Response.json({ subscription });
});

export const DELETE = route(async (_req, { params }: Context) => {
  await requireUser();
  const { id } = await params;
  if (!deleteSubscription(id)) throw new HttpError(404, "订阅不存在");
  return Response.json({ ok: true });
});
