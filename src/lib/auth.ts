import crypto from "node:crypto";
import { cookies } from "next/headers";
import { HttpError } from "./http";
import { getSessionSecret, getUser, type User } from "./store";

const COOKIE_NAME = "cg_session";
const SESSION_MAX_AGE = 30 * 24 * 60 * 60;
const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 64 };

// ---------- 密码 ----------

function scrypt(password: string, salt: Buffer, params = SCRYPT): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    crypto.scrypt(
      password,
      salt,
      params.keylen,
      { N: params.N, r: params.r, p: params.p, maxmem: 64 * 1024 * 1024 },
      (err, key) => (err ? reject(err) : resolve(key)),
    );
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16);
  const hash = await scrypt(password, salt);
  const { N, r, p } = SCRYPT;
  return `scrypt$${N}$${r}$${p}$${salt.toString("base64url")}$${hash.toString("base64url")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algo, N, r, p, salt, hash] = stored.split("$");
  if (algo !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "base64url");
  const actual = await scrypt(password, Buffer.from(salt, "base64url"), {
    N: Number(N),
    r: Number(r),
    p: Number(p),
    keylen: expected.length,
  });
  return crypto.timingSafeEqual(actual, expected);
}

export function validateCredentials(username: string, password: string) {
  if (!username || username.length > 32 || /\s/.test(username)) {
    throw new HttpError(400, "用户名需要 1-32 个字符，且不能包含空格");
  }
  if (password.length < 8 || password.length > 128) {
    throw new HttpError(400, "密码至少 8 位");
  }
}

// ---------- 会话 ----------

interface SessionPayload {
  u: string;
  v: number;
  e: number;
}

function sign(payload: string) {
  return crypto.createHmac("sha256", getSessionSecret()).update(payload).digest("base64url");
}

export async function getSessionUser(): Promise<User | null> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  const user = getUser();
  if (!user) return null;

  const expected = Buffer.from(sign(payload));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) return null;

  let data: SessionPayload;
  try {
    data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (data.u !== user.username || data.v !== user.sessionVersion) return null;
  if (data.e < Math.floor(Date.now() / 1000)) return null;
  return user;
}

export async function requireUser(): Promise<User> {
  const user = await getSessionUser();
  if (!user) throw new HttpError(401, "未登录或登录已过期");
  return user;
}

function isHttps(req: Request) {
  const forwarded = req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  if (forwarded) return forwarded === "https";
  return new URL(req.url).protocol === "https:";
}

export async function startSession(req: Request, user: User) {
  const payload: SessionPayload = {
    u: user.username,
    v: user.sessionVersion,
    e: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE,
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  (await cookies()).set(COOKIE_NAME, `${encoded}.${sign(encoded)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: isHttps(req),
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function endSession() {
  (await cookies()).delete(COOKIE_NAME);
}

// ---------- 登录限流 ----------

const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_FAILURES = 10;
const failures = new Map<string, { count: number; resetAt: number }>();

/**
 * 优先用反代设置的 X-Real-IP；X-Forwarded-For 取最后一跳，
 * 因为第一项可以被客户端伪造（nginx 的 $proxy_add_x_forwarded_for 是追加）。
 */
export function clientIp(req: Request) {
  return (
    req.headers.get("x-real-ip")?.trim() ||
    req.headers.get("x-forwarded-for")?.split(",").pop()?.trim() ||
    "unknown"
  );
}

export function assertNotRateLimited(ip: string) {
  const entry = failures.get(ip);
  if (entry && entry.resetAt > Date.now() && entry.count >= LOGIN_MAX_FAILURES) {
    const minutes = Math.ceil((entry.resetAt - Date.now()) / 60000);
    throw new HttpError(429, `失败次数过多，请 ${minutes} 分钟后再试`);
  }
}

export function recordLoginFailure(ip: string) {
  const now = Date.now();
  if (failures.size > 1000) {
    for (const [key, value] of failures) if (value.resetAt <= now) failures.delete(key);
  }
  const entry = failures.get(ip);
  if (!entry || entry.resetAt <= now) {
    failures.set(ip, { count: 1, resetAt: now + LOGIN_WINDOW_MS });
  } else {
    entry.count += 1;
  }
}

export function clearLoginFailures(ip: string) {
  failures.delete(ip);
}
