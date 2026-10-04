/** 浏览器端工具函数 */

export async function api<T = unknown>(
  url: string,
  options: { method?: string; body?: unknown } = {},
): Promise<T> {
  const res = await fetch(url, {
    method: options.method ?? "GET",
    headers: options.body === undefined ? undefined : { "Content-Type": "application/json" },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    cache: "no-store",
  });

  let data: unknown = null;
  try {
    data = await res.json();
  } catch {}

  if (res.status === 401 && !url.startsWith("/api/auth/")) {
    window.location.href = "/login";
  }
  if (!res.ok) {
    const message = (data as { error?: string } | null)?.error;
    throw new Error(message || `请求失败（HTTP ${res.status}）`);
  }
  return data as T;
}

export function errorMessage(err: unknown) {
  return err instanceof Error ? err.message : String(err);
}

/** navigator.clipboard 只在 HTTPS / localhost 下可用，其它情况退回 execCommand */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {}

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  try {
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    textarea.remove();
  }
}

export function subscriptionUrl(baseUrl: string, token: string) {
  return `${baseUrl}/sub/${token}`;
}

export function clashImportUrl(url: string, name: string) {
  return `clash://install-config?url=${encodeURIComponent(url)}&name=${encodeURIComponent(name)}`;
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

const relativeFormat = new Intl.RelativeTimeFormat("zh-CN", { numeric: "auto" });
const dateFormat = new Intl.DateTimeFormat("zh-CN", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatDate(iso: string) {
  return dateFormat.format(new Date(iso));
}

export function formatRelative(iso: string) {
  const seconds = Math.round((new Date(iso).getTime() - Date.now()) / 1000);
  const abs = Math.abs(seconds);
  if (abs < 45) return "刚刚";
  if (abs < 3600) return relativeFormat.format(Math.round(seconds / 60), "minute");
  if (abs < 86400) return relativeFormat.format(Math.round(seconds / 3600), "hour");
  if (abs < 86400 * 30) return relativeFormat.format(Math.round(seconds / 86400), "day");
  return formatDate(iso);
}

/** 从 User-Agent 里提取客户端名称，比如 "clash-verge/v2.4.2" */
export function shortUserAgent(ua: string | null) {
  if (!ua) return null;
  return ua.split(" ")[0].slice(0, 40);
}
