"use client";

import { Alert, Button, Description, Form, Input, Label, Modal, Spinner, TextField, toast } from "@heroui/react";
import { type FormEvent, useEffect, useState } from "react";
import { api, errorMessage } from "@/lib/client";
import type { Settings } from "@/lib/store";

interface Props {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  settings: Settings;
  /** 浏览器当前访问的地址，留空时会用它 */
  origin: string;
  onSaved: (settings: Settings) => void;
}

export function SettingsModal({ isOpen, onOpenChange, settings, origin, onSaved }: Props) {
  const [publicUrl, setPublicUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setPublicUrl(settings.publicUrl ?? "");
    setError(null);
  }, [isOpen, settings.publicUrl]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const data = await api<{ settings: Settings }>("/api/settings", {
        method: "PUT",
        body: { publicUrl },
      });
      onSaved(data.settings);
      toast.success(data.settings.publicUrl ? `订阅链接将使用 ${data.settings.publicUrl}` : "订阅链接将跟随当前访问地址");
      onOpenChange(false);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal.Backdrop isOpen={isOpen} onOpenChange={onOpenChange}>
      <Modal.Container size="md">
        <Modal.Dialog>
          <Modal.CloseTrigger aria-label="关闭" />
          <Modal.Header>
            <Modal.Heading>订阅链接地址</Modal.Heading>
            <p className="mt-1 text-sm text-muted">配置好反代后，在这里填你的域名，复制、二维码和一键导入都会用它</p>
          </Modal.Header>
          <Modal.Body className="p-1">
            <Form className="flex flex-col gap-4" id="settings-form" onSubmit={onSubmit}>
              <TextField fullWidth name="publicUrl" value={publicUrl} onChange={setPublicUrl}>
                <Label>地址</Label>
                <Input autoComplete="off" inputMode="url" placeholder="https://sub.example.com" spellCheck={false} />
                <Description>
                  只填域名会默认使用 https。留空则跟随当前访问面板的地址
                  {origin && <span className="font-mono">（{origin}）</span>}
                </Description>
              </TextField>
              {error && (
                <Alert status="danger">
                  <Alert.Indicator />
                  <Alert.Content>
                    <Alert.Description>{error}</Alert.Description>
                  </Alert.Content>
                </Alert>
              )}
            </Form>
          </Modal.Body>
          <Modal.Footer>
            <Button slot="close" variant="secondary">
              取消
            </Button>
            <Button form="settings-form" isPending={saving} type="submit">
              {({ isPending }) => (
                <>
                  {isPending && <Spinner color="current" size="sm" />}
                  保存
                </>
              )}
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
