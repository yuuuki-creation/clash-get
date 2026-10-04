import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

/**
 * 极简文件存储：data/db.json 保存账号和订阅元数据，data/subs/<id>.yaml 保存订阅原文。
 * 全部使用同步 IO，单进程内天然串行，不会出现并发写坏文件的问题。
 */

export interface User {
  username: string;
  passwordHash: string;
  /** 修改密码时自增，用来让旧会话全部失效 */
  sessionVersion: number;
  createdAt: string;
}

export interface ClashStats {
  proxies: number;
  groups: number;
  rules: number;
  providers: number;
}

export interface Subscription {
  id: string;
  name: string;
  token: string;
  size: number;
  stats: ClashStats;
  createdAt: string;
  updatedAt: string;
  lastFetchedAt: string | null;
  lastFetchedBy: string | null;
  fetchCount: number;
}

export interface Settings {
  /** 订阅链接使用的地址，比如 https://sub.example.com；null 表示跟随浏览器当前地址 */
  publicUrl: string | null;
}

interface Database {
  version: 1;
  sessionSecret: string;
  user: User | null;
  settings?: Settings;
  subscriptions: Subscription[];
}

const DATA_DIR = path.resolve(
  /*turbopackIgnore: true*/ process.env.DATA_DIR || path.join(/*turbopackIgnore: true*/ process.cwd(), "data"),
);
const DB_FILE = path.join(DATA_DIR, "db.json");
const SUBS_DIR = path.join(DATA_DIR, "subs");
const ID_PATTERN = /^[a-f0-9]{16}$/;

function writeFileAtomic(file: string, content: string) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${crypto.randomBytes(6).toString("hex")}.tmp`;
  fs.writeFileSync(tmp, content, { mode: 0o600 });
  fs.renameSync(tmp, file);
}

function load(): Database {
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, "utf8")) as Database;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
    return { version: 1, sessionSecret: "", user: null, subscriptions: [] };
  }
}

function save(db: Database) {
  writeFileAtomic(DB_FILE, JSON.stringify(db, null, 2));
}

function contentPath(id: string) {
  if (!ID_PATTERN.test(id)) throw new Error(`Invalid subscription id: ${id}`);
  return path.join(SUBS_DIR, `${id}.yaml`);
}

function newToken() {
  return crypto.randomBytes(24).toString("base64url");
}

// ---------- 账号 ----------

export function getUser(): User | null {
  return load().user;
}

export function getSessionSecret(): string {
  return process.env.SESSION_SECRET || load().sessionSecret;
}

/** 仅在还没有账号时创建，返回 false 表示已经有人注册过了 */
export function createUser(username: string, passwordHash: string): User | null {
  const db = load();
  if (db.user) return null;
  db.user = { username, passwordHash, sessionVersion: 1, createdAt: new Date().toISOString() };
  if (!db.sessionSecret) db.sessionSecret = crypto.randomBytes(32).toString("base64url");
  save(db);
  return db.user;
}

export function updatePassword(passwordHash: string): User {
  const db = load();
  if (!db.user) throw new Error("No user");
  db.user.passwordHash = passwordHash;
  db.user.sessionVersion += 1;
  save(db);
  return db.user;
}

// ---------- 设置 ----------

export function getSettings(): Settings {
  return { publicUrl: null, ...load().settings };
}

export function updateSettings(patch: Partial<Settings>): Settings {
  const db = load();
  db.settings = { publicUrl: null, ...db.settings, ...patch };
  save(db);
  return db.settings;
}

// ---------- 订阅 ----------

export function listSubscriptions(): Subscription[] {
  return load().subscriptions;
}

export function getSubscription(id: string): Subscription | null {
  return load().subscriptions.find((s) => s.id === id) ?? null;
}

export function getSubscriptionByToken(token: string): Subscription | null {
  return load().subscriptions.find((s) => s.token === token) ?? null;
}

export function readContent(id: string): string {
  return fs.readFileSync(contentPath(id), "utf8");
}

export function createSubscription(name: string, content: string, stats: ClashStats): Subscription {
  const db = load();
  const now = new Date().toISOString();
  let id: string;
  do id = crypto.randomBytes(8).toString("hex");
  while (db.subscriptions.some((s) => s.id === id));

  const sub: Subscription = {
    id,
    name,
    token: newToken(),
    size: Buffer.byteLength(content),
    stats,
    createdAt: now,
    updatedAt: now,
    lastFetchedAt: null,
    lastFetchedBy: null,
    fetchCount: 0,
  };
  writeFileAtomic(contentPath(id), content);
  db.subscriptions.unshift(sub);
  save(db);
  return sub;
}

export function updateSubscription(
  id: string,
  name: string,
  content: string,
  stats: ClashStats,
): Subscription | null {
  const db = load();
  const sub = db.subscriptions.find((s) => s.id === id);
  if (!sub) return null;
  writeFileAtomic(contentPath(id), content);
  sub.name = name;
  sub.size = Buffer.byteLength(content);
  sub.stats = stats;
  sub.updatedAt = new Date().toISOString();
  save(db);
  return sub;
}

export function deleteSubscription(id: string): boolean {
  const db = load();
  const index = db.subscriptions.findIndex((s) => s.id === id);
  if (index === -1) return false;
  db.subscriptions.splice(index, 1);
  save(db);
  fs.rmSync(contentPath(id), { force: true });
  return true;
}

export function resetToken(id: string): Subscription | null {
  const db = load();
  const sub = db.subscriptions.find((s) => s.id === id);
  if (!sub) return null;
  sub.token = newToken();
  save(db);
  return sub;
}

export function recordFetch(id: string, userAgent: string | null) {
  const db = load();
  const sub = db.subscriptions.find((s) => s.id === id);
  if (!sub) return;
  sub.lastFetchedAt = new Date().toISOString();
  sub.lastFetchedBy = userAgent ? userAgent.slice(0, 200) : null;
  sub.fetchCount += 1;
  save(db);
}
