import {
  assertNotRateLimited,
  clearLoginFailures,
  clientIp,
  recordLoginFailure,
  startSession,
  verifyPassword,
} from "@/lib/auth";
import { asString, HttpError, readJson, route } from "@/lib/http";
import { getUser } from "@/lib/store";

export const POST = route(async (req) => {
  const ip = clientIp(req);
  assertNotRateLimited(ip);

  const user = getUser();
  if (!user) throw new HttpError(400, "还没有创建账号");

  const body = await readJson<{ username: string; password: string }>(req);
  const username = asString(body.username).trim();
  const password = asString(body.password);

  const ok = username === user.username && (await verifyPassword(password, user.passwordHash));
  if (!ok) {
    recordLoginFailure(ip);
    throw new HttpError(401, "用户名或密码错误");
  }

  clearLoginFailures(ip);
  await startSession(req, user);
  return Response.json({ ok: true });
});
