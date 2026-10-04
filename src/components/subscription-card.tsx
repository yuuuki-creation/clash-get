"use client";

import {
  ArrowDownToSquare,
  ArrowRotateRight,
  Check,
  Copy,
  Link as LinkIcon,
  Pencil,
  QrCode,
  TrashBin,
} from "@gravity-ui/icons";
import { Button, buttonVariants, Card, Chip, Tooltip, toast } from "@heroui/react";
import { useState } from "react";
import {
  clashImportUrl,
  copyText,
  formatBytes,
  formatDate,
  formatRelative,
  shortUserAgent,
  subscriptionUrl,
} from "@/lib/client";
import type { Subscription } from "@/lib/store";

interface Props {
  subscription: Subscription;
  /** 浏览器地址栏的 origin，挂载前为空 */
  origin: string;
  onEdit: () => void;
  onShowQr: () => void;
  onResetToken: () => void;
  onDelete: () => void;
}

function IconAction(props: {
  label: string;
  onPress: () => void;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Tooltip delay={300}>
      <Button
        isIconOnly
        aria-label={props.label}
        className={props.danger ? "text-danger" : undefined}
        size="sm"
        variant="ghost"
        onPress={props.onPress}
      >
        {props.children}
      </Button>
      <Tooltip.Content>{props.label}</Tooltip.Content>
    </Tooltip>
  );
}

export function SubscriptionCard({ subscription: sub, origin, onEdit, onShowQr, onResetToken, onDelete }: Props) {
  const [copied, setCopied] = useState(false);
  const mounted = origin !== "";
  const url = mounted ? subscriptionUrl(origin, sub.token) : "";
  const { proxies, providers, groups, rules } = sub.stats;
  const client = shortUserAgent(sub.lastFetchedBy);

  async function copy() {
    if (await copyText(url)) {
      setCopied(true);
      toast.success("订阅链接已复制");
      setTimeout(() => setCopied(false), 1500);
    } else {
      toast.danger("复制失败，请手动选中链接复制");
    }
  }

  return (
    <Card className="gap-4 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Card.Title className="truncate text-base">{sub.name}</Card.Title>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Chip color={proxies + providers === 0 ? "warning" : "accent"} size="sm" variant="soft">
              {proxies} 个节点
            </Chip>
            {providers > 0 && (
              <Chip size="sm" variant="soft">
                {providers} 个节点集
              </Chip>
            )}
            <Chip size="sm" variant="soft">
              {groups} 个策略组
            </Chip>
            <Chip size="sm" variant="soft">
              {rules.toLocaleString()} 条规则
            </Chip>
            <Chip size="sm" variant="soft">
              {formatBytes(sub.size)}
            </Chip>
          </div>
        </div>
        <div className="-me-1.5 -mt-1 flex shrink-0">
          <IconAction label="二维码" onPress={onShowQr}>
            <QrCode />
          </IconAction>
          <IconAction label="编辑" onPress={onEdit}>
            <Pencil />
          </IconAction>
          <IconAction label="重置链接" onPress={onResetToken}>
            <ArrowRotateRight />
          </IconAction>
          <IconAction danger label="删除" onPress={onDelete}>
            <TrashBin />
          </IconAction>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl bg-default px-3 py-2">
          <LinkIcon aria-hidden className="size-4 shrink-0 text-muted" />
          <code className="min-w-0 flex-1 truncate font-mono text-xs select-all sm:text-sm" title={url}>
            {url || "…"}
          </code>
        </div>
        <div className="flex gap-2">
          <Button className="flex-1 sm:flex-none" isDisabled={!mounted} size="sm" onPress={copy}>
            {copied ? <Check /> : <Copy />}
            复制链接
          </Button>
          <a
            className={buttonVariants({ size: "sm", variant: "secondary", className: "flex-1 sm:flex-none" })}
            href={mounted ? clashImportUrl(url, sub.name) : undefined}
          >
            <ArrowDownToSquare />
            导入 Clash
          </a>
        </div>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        <span>更新于 {mounted ? formatDate(sub.updatedAt) : "…"}</span>
        <span>
          {sub.lastFetchedAt
            ? `最近拉取 ${mounted ? formatRelative(sub.lastFetchedAt) : "…"}${client ? `（${client}）` : ""} · 共 ${sub.fetchCount} 次`
            : "尚未被客户端拉取"}
        </span>
      </div>
    </Card>
  );
}
