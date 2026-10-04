import { requireUser } from "@/lib/auth";
import { analyzeClashConfig, MAX_CONTENT_BYTES, normalizeName } from "@/lib/clash";
import { asString, readJson, route } from "@/lib/http";
import { createSubscription, listSubscriptions } from "@/lib/store";

export const GET = route(async () => {
  await requireUser();
  return Response.json({ subscriptions: listSubscriptions() });
});

export const POST = route(async (req) => {
  await requireUser();
  const body = await readJson<{ name: string; content: string }>(req, MAX_CONTENT_BYTES * 2);
  const name = normalizeName(asString(body.name));
  const { content, stats } = analyzeClashConfig(asString(body.content));
  const subscription = createSubscription(name, content, stats);
  return Response.json({ subscription }, { status: 201 });
});
