import { endSession } from "@/lib/auth";
import { route } from "@/lib/http";

export const POST = route(async () => {
  await endSession();
  return Response.json({ ok: true });
});
