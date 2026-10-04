"use client";

import { ArrowRightFromSquare, FileText, Gear, Key, Plus } from "@gravity-ui/icons";
import { Button, Card, Tooltip, toast } from "@heroui/react";
import { useEffect, useState } from "react";
import { api, subscriptionUrl } from "@/lib/client";
import type { Settings, Subscription } from "@/lib/store";
import { ConfirmDialog } from "./confirm-dialog";
import { Logo } from "./logo";
import { PasswordModal } from "./password-modal";
import { QrModal } from "./qr-modal";
import { SettingsModal } from "./settings-modal";
import { SubscriptionCard } from "./subscription-card";
import { SubscriptionEditor } from "./subscription-editor";
import { ThemeToggle } from "./theme-toggle";

type PendingAction = { kind: "delete" | "reset"; subscription: Subscription };

export function Dashboard({
  username,
  initialSettings,
  initialSubscriptions,
}: {
  username: string;
  initialSettings: Settings;
  initialSubscriptions: Subscription[];
}) {
  const [subscriptions, setSubscriptions] = useState(initialSubscriptions);
  const [settings, setSettings] = useState(initialSettings);
  const [origin, setOrigin] = useState("");
  // 挂载前为空，卡片里的时间也靠它判断是否已挂载，避免服务端和浏览器时区不同导致水合不一致
  const baseUrl = origin ? settings.publicUrl || origin : "";

  // 弹窗的目标在关闭后保留，避免退出动画期间内容闪空
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Subscription | null>(null);
  const [qrOpen, setQrOpen] = useState(false);
  const [qrTarget, setQrTarget] = useState<Subscription | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    setOrigin(window.location.origin);

    // 切回页面时刷新一下列表，拉取次数之类的统计会跟着更新
    const refresh = () =>
      api<{ subscriptions: Subscription[] }>("/api/subscriptions")
        .then((data) => setSubscriptions(data.subscriptions))
        .catch(() => {});
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, []);

  function upsert(subscription: Subscription) {
    setSubscriptions((prev) =>
      prev.some((s) => s.id === subscription.id)
        ? prev.map((s) => (s.id === subscription.id ? subscription : s))
        : [subscription, ...prev],
    );
  }

  function openEditor(subscription: Subscription | null) {
    setEditing(subscription);
    setEditorOpen(true);
  }

  function ask(kind: PendingAction["kind"], subscription: Subscription) {
    setPending({ kind, subscription });
    setConfirmOpen(true);
  }

  async function runPending() {
    if (!pending) return;
    const { kind, subscription } = pending;
    if (kind === "delete") {
      await api(`/api/subscriptions/${subscription.id}`, { method: "DELETE" });
      setSubscriptions((prev) => prev.filter((s) => s.id !== subscription.id));
      toast.success(`已删除「${subscription.name}」`);
    } else {
      const data = await api<{ subscription: Subscription }>(`/api/subscriptions/${subscription.id}/token`, {
        method: "POST",
      });
      upsert(data.subscription);
      toast.success("已生成新链接，旧链接已失效");
    }
  }

  async function logout() {
    await api("/api/auth/logout", { method: "POST" }).catch(() => {});
    window.location.href = "/login";
  }

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-10 border-b border-separator bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-4xl items-center gap-3 px-4">
          <Logo />
          <div className="flex flex-col leading-tight">
            <span className="font-semibold">Clash Get</span>
            <span className="text-xs text-muted">订阅托管</span>
          </div>
          <div className="ms-auto flex items-center gap-1">
            <span className="me-2 hidden text-sm text-muted sm:inline">{username}</span>
            <ThemeToggle />
            <Tooltip delay={300}>
              <Button isIconOnly aria-label="订阅链接地址" size="sm" variant="ghost" onPress={() => setSettingsOpen(true)}>
                <Gear />
              </Button>
              <Tooltip.Content>订阅链接地址</Tooltip.Content>
            </Tooltip>
            <Tooltip delay={300}>
              <Button isIconOnly aria-label="修改密码" size="sm" variant="ghost" onPress={() => setPasswordOpen(true)}>
                <Key />
              </Button>
              <Tooltip.Content>修改密码</Tooltip.Content>
            </Tooltip>
            <Tooltip delay={300}>
              <Button isIconOnly aria-label="退出登录" size="sm" variant="ghost" onPress={logout}>
                <ArrowRightFromSquare />
              </Button>
              <Tooltip.Content>退出登录</Tooltip.Content>
            </Tooltip>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">我的订阅</h1>
            <p className="mt-1 text-sm text-muted">
              链接地址：
              <span className="font-mono text-foreground">{baseUrl || "…"}</span>
              {origin && !settings.publicUrl && "（跟随当前访问地址）"}
              <button
                className="ms-2 cursor-pointer text-accent hover:underline"
                type="button"
                onClick={() => setSettingsOpen(true)}
              >
                修改
              </button>
            </p>
          </div>
          <Button onPress={() => openEditor(null)}>
            <Plus />
            新建订阅
          </Button>
        </div>

        {subscriptions.length === 0 ? (
          <Card className="items-center gap-4 px-6 py-16 text-center">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-default">
              <FileText className="size-6 text-muted" />
            </div>
            <div>
              <p className="font-medium">还没有订阅</p>
              <p className="mt-1 text-sm text-muted">新建一个订阅，粘贴或上传 Clash 配置文件，就能得到订阅链接</p>
            </div>
            <Button onPress={() => openEditor(null)}>
              <Plus />
              新建订阅
            </Button>
          </Card>
        ) : (
          <div className="flex flex-col gap-4">
            {subscriptions.map((subscription) => (
              <SubscriptionCard
                key={subscription.id}
                baseUrl={baseUrl}
                subscription={subscription}
                onDelete={() => ask("delete", subscription)}
                onEdit={() => openEditor(subscription)}
                onResetToken={() => ask("reset", subscription)}
                onShowQr={() => {
                  setQrTarget(subscription);
                  setQrOpen(true);
                }}
              />
            ))}
          </div>
        )}
      </main>

      <SubscriptionEditor
        editing={editing}
        isOpen={editorOpen}
        onOpenChange={setEditorOpen}
        onSaved={(subscription, isNew) => {
          upsert(subscription);
          toast.success(isNew ? "订阅已创建" : "订阅已保存");
        }}
      />

      <QrModal
        isOpen={qrOpen}
        name={qrTarget?.name ?? ""}
        url={qrTarget && baseUrl ? subscriptionUrl(baseUrl, qrTarget.token) : ""}
        onOpenChange={setQrOpen}
      />

      <ConfirmDialog
        confirmLabel={pending?.kind === "delete" ? "删除" : "重置链接"}
        description={
          pending?.kind === "delete"
            ? `「${pending.subscription.name}」会被永久删除，已导入这个订阅的 Clash 客户端将无法再更新。`
            : `会为「${pending?.subscription.name ?? ""}」生成一个新链接，旧链接立即失效，需要在 Clash 里重新导入。`
        }
        isOpen={confirmOpen}
        status={pending?.kind === "delete" ? "danger" : "warning"}
        title={pending?.kind === "delete" ? "删除订阅？" : "重置订阅链接？"}
        onConfirm={runPending}
        onOpenChange={setConfirmOpen}
      />

      <PasswordModal isOpen={passwordOpen} onOpenChange={setPasswordOpen} />

      <SettingsModal
        isOpen={settingsOpen}
        origin={origin}
        settings={settings}
        onOpenChange={setSettingsOpen}
        onSaved={setSettings}
      />
    </div>
  );
}
