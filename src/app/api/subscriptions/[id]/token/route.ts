import { requireUser } from "@/lib/auth";
import { HttpError, route } from "@/lib/http";
import { resetToken } from "@/lib/store";

/** 重新生成订阅链接，旧链接立即失效 */
export const POST = route(async (_req, { params }: { params: Promise<{ id: string }> }) => {
  await requireUser();
  const { id } = await params;
  const subscription = resetToken(id);
  if (!subscription) throw new HttpError(404, "订阅不存在");
  return Response.json({ subscription });
});
