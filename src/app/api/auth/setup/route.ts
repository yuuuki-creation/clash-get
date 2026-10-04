import { hashPassword, startSession, validateCredentials } from "@/lib/auth";
import { asString, HttpError, readJson, route } from "@/lib/http";
import { createUser, getUser } from "@/lib/store";

export const POST = route(async (req) => {
  if (getUser()) throw new HttpError(403, "账号已经创建过了，请直接登录");

  const body = await readJson<{ username: string; password: string }>(req);
  const username = asString(body.username).trim();
  const password = asString(body.password);
  validateCredentials(username, password);

  const user = createUser(username, await hashPassword(password));
  if (!user) throw new HttpError(403, "账号已经创建过了，请直接登录");

  await startSession(req, user);
  return Response.json({ ok: true });
});
