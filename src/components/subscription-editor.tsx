"use client";

import { ArrowUpFromLine } from "@gravity-ui/icons";
import {
  Alert,
  Button,
  Description,
  Input,
  Label,
  Modal,
  Spinner,
  TextArea,
  TextField,
  toast,
} from "@heroui/react";
import { type ChangeEvent, type DragEvent, useEffect, useMemo, useRef, useState } from "react";
import { api, errorMessage, formatBytes } from "@/lib/client";
import type { Subscription } from "@/lib/store";

const MAX_FILE_BYTES = 20 * 1024 * 1024;

interface Props {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  /** null 表示新建 */
  editing: Subscription | null;
  onSaved: (subscription: Subscription, isNew: boolean) => void;
}

export function SubscriptionEditor({ isOpen, onOpenChange, editing, onSaved }: Props) {
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const editingId = editing?.id;

  // 错误提示在弹窗内容的最底部，出错时把内容区滚到底，免得被忽略
  useEffect(() => {
    const body = errorRef.current?.closest<HTMLElement>('[data-slot="modal-body"]');
    body?.scrollTo({ top: body.scrollHeight, behavior: "smooth" });
  }, [error]);

  // 每次打开都重置表单，编辑时拉取订阅原文
  useEffect(() => {
    if (!isOpen) return;
    setName(editing?.name ?? "");
    setContent("");
    setError(null);
    setSaving(false);
    if (!editingId) return;

    let cancelled = false;
    setLoading(true);
    api<{ content: string }>(`/api/subscriptions/${editingId}`)
      .then((data) => !cancelled && setContent(data.content))
      .catch((err) => !cancelled && setError(errorMessage(err)))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [isOpen, editingId]);

  const summary = useMemo(() => {
    if (!content) return "支持直接粘贴，也可以把 .yaml 文件拖到上面的输入框";
    const lines = content.split("\n").length;
    return `${lines.toLocaleString()} 行 · ${formatBytes(new TextEncoder().encode(content).length)}`;
  }, [content]);

  async function loadFile(file: File) {
    if (file.size > MAX_FILE_BYTES) {
      setError("文件不能超过 20 MB");
      return;
    }
    try {
      setContent(await file.text());
      setError(null);
      if (!name.trim()) setName(file.name.replace(/\.(ya?ml|txt|conf)$/i, "").slice(0, 64));
      toast.success(`已读取 ${file.name}`);
    } catch (err) {
      setError(`读取文件失败：${errorMessage(err)}`);
    }
  }

  function onFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) void loadFile(file);
  }

  function onDragOver(e: DragEvent) {
    if (!e.dataTransfer.types.includes("Files")) return;
    e.preventDefault();
    setDragging(true);
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) void loadFile(file);
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const body = { name, content };
      const { subscription } = editingId
        ? await api<{ subscription: Subscription }>(`/api/subscriptions/${editingId}`, { method: "PUT", body })
        : await api<{ subscription: Subscription }>("/api/subscriptions", { method: "POST", body });
      onSaved(subscription, !editingId);
      onOpenChange(false);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal.Backdrop isDismissable={false} isOpen={isOpen} onOpenChange={onOpenChange}>
      <Modal.Container scroll="inside" size="lg">
        <Modal.Dialog className="max-w-3xl">
          <Modal.CloseTrigger aria-label="关闭" />
          <Modal.Header>
            <Modal.Heading>{editingId ? "编辑订阅" : "新建订阅"}</Modal.Heading>
            <p className="mt-1 text-sm text-muted">粘贴 Clash 配置内容，或上传 .yaml 文件</p>
          </Modal.Header>

          <Modal.Body className="flex flex-col gap-5 p-1">
            <TextField fullWidth isRequired maxLength={64} name="name" value={name} onChange={setName}>
              <Label>名称</Label>
              <Input placeholder="例如：主力机场" />
            </TextField>

            <TextField fullWidth isRequired name="content" value={content} onChange={setContent}>
              <div className="flex items-end justify-between gap-2">
                <Label>配置内容</Label>
                <Button size="sm" variant="secondary" onPress={() => fileInput.current?.click()}>
                  <ArrowUpFromLine />
                  上传文件
                </Button>
              </div>
              <div
                className="relative"
                onDragLeave={() => setDragging(false)}
                onDragOver={onDragOver}
                onDrop={onDrop}
              >
                <TextArea
                  fullWidth
                  className="h-[42vh] min-h-56 resize-y font-mono text-xs leading-relaxed"
                  placeholder={"mixed-port: 7890\nproxies:\n  - name: ...\nproxy-groups:\n  - ...\nrules:\n  - ..."}
                  spellCheck={false}
                  wrap="off"
                />
                {loading && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-surface/70">
                    <Spinner />
                  </div>
                )}
                {dragging && (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-xl border-2 border-dashed border-accent bg-accent/10 text-sm font-medium text-accent">
                    松开以读取文件
                  </div>
                )}
              </div>
              <Description>{summary}</Description>
            </TextField>

            <input
              ref={fileInput}
              hidden
              accept=".yaml,.yml,.txt,.conf,text/yaml,text/plain"
              type="file"
              onChange={onFileChange}
            />

            {error && (
              <div ref={errorRef}>
                <Alert status="danger">
                  <Alert.Indicator />
                  <Alert.Content>
                    <Alert.Title>保存失败</Alert.Title>
                    <Alert.Description className="break-all">{error}</Alert.Description>
                  </Alert.Content>
                </Alert>
              </div>
            )}
          </Modal.Body>

          <Modal.Footer>
            <Button isDisabled={saving} slot="close" variant="secondary">
              取消
            </Button>
            <Button isDisabled={loading} isPending={saving} onPress={save}>
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
