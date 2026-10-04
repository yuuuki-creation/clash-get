export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/** 包一层统一错误处理：抛出 HttpError 会变成 { error } JSON 响应 */
export function route<C>(handler: (req: Request, ctx: C) => Promise<Response>) {
  return async (req: Request, ctx: C): Promise<Response> => {
    try {
      return await handler(req, ctx);
    } catch (err) {
      if (err instanceof HttpError) {
        return Response.json({ error: err.message }, { status: err.status });
      }
      console.error(err);
      return Response.json({ error: "服务器内部错误" }, { status: 500 });
    }
  };
}

export async function readJson<T>(req: Request, maxBytes = 1024 * 1024): Promise<Partial<T>> {
  const declared = Number(req.headers.get("content-length") || 0);
  if (declared > maxBytes) throw new HttpError(413, "内容太大");
  const text = await req.text();
  if (Buffer.byteLength(text) > maxBytes) throw new HttpError(413, "内容太大");
  try {
    const data = JSON.parse(text);
    if (data && typeof data === "object") return data;
  } catch {}
  throw new HttpError(400, "请求格式错误");
}

export function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}
