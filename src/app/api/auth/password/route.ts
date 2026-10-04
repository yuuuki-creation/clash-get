import { hashPassword, requireUser, startSession, validateCredentials, verifyPassword } from "@/lib/auth";
import { asString, HttpError, readJson, route } from "@/lib/http";
import { updatePassword } from "@/lib/store";

export const POST = route(async (req) => {
  const user = await requireUser();
  const body = await readJson<{ currentPassword: string; newPassword: string }>(req);
  const currentPassword = asString(body.currentPassword);
  const newPassword = asString(body.newPassword);

  if (!(await verifyPassword(currentPassword, user.passwordHash))) {
    throw new HttpError(400, "当前密码不正确");
  }
  validateCredentials(user.username, newPassword);

  // sessionVersion 自增后其它设备的登录会失效，当前浏览器重新签发会话
  const updated = updatePassword(await hashPassword(newPassword));
  await startSession(req, updated);
  return Response.json({ ok: true });
});
