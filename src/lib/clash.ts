import { isMap, isSeq, LineCounter, parseDocument } from "yaml";
import { HttpError } from "./http";
import type { ClashStats } from "./store";

export const MAX_CONTENT_BYTES = 20 * 1024 * 1024;
export const MAX_NAME_LENGTH = 64;

export function normalizeName(raw: string): string {
  const name = raw.replace(/[\u0000-\u001f\u007f]/g, "").trim();
  if (!name) throw new HttpError(400, "请填写订阅名称");
  if (name.length > MAX_NAME_LENGTH) throw new HttpError(400, `名称不能超过 ${MAX_NAME_LENGTH} 个字符`);
  return name;
}

/**
 * 校验内容是合法的 YAML 映射，并统计节点/策略组/规则数量。
 * 只做结构层面的检查，不解析每个节点的字段，避免误伤各种 Clash 分支的扩展写法。
 */
export function analyzeClashConfig(raw: string): { content: string; stats: ClashStats } {
  const content = raw.replace(/^﻿/, "");
  if (!content.trim()) throw new HttpError(400, "配置内容为空");
  if (Buffer.byteLength(content) > MAX_CONTENT_BYTES) throw new HttpError(413, "配置文件不能超过 20 MB");

  const lineCounter = new LineCounter();
  const doc = parseDocument(content, { lineCounter, uniqueKeys: false, prettyErrors: true });
  if (doc.errors.length > 0) {
    const error = doc.errors[0];
    const pos = error.linePos?.[0];
    const where = pos ? `（第 ${pos.line} 行第 ${pos.col} 列）` : "";
    const message = error.message.split("\n")[0].replace(/ at line \d+, column \d+:?$/, "");
    throw new HttpError(400, `YAML 格式错误${where}：${message}`);
  }

  const root = doc.contents;
  if (!isMap(root)) {
    throw new HttpError(400, "这不像 Clash 配置：顶层应该是 key: value 形式的 YAML（如果是 base64 订阅，请先转换成 Clash 格式）");
  }

  const count = (key: string) => {
    const node = root.get(key, true);
    return isSeq(node) || isMap(node) ? node.items.length : 0;
  };

  return {
    content,
    stats: {
      proxies: count("proxies"),
      groups: count("proxy-groups"),
      rules: count("rules"),
      providers: count("proxy-providers"),
    },
  };
}
