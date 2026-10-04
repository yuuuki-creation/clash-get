"use client";

import { Alert, Button, FieldError, Form, Input, Label, Modal, Spinner, TextField, toast } from "@heroui/react";
import { type FormEvent, useEffect, useState } from "react";
import { api, errorMessage } from "@/lib/client";

interface Props {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PasswordModal({ isOpen, onOpenChange }: Props) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setCurrent("");
    setNext("");
    setConfirm("");
    setError(null);
  }, [isOpen]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (next !== confirm) {
      setError("两次输入的新密码不一致");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await api("/api/auth/password", {
        method: "POST",
        body: { currentPassword: current, newPassword: next },
      });
      toast.success("密码已修改，其它设备上的登录已失效");
      onOpenChange(false);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal.Backdrop isOpen={isOpen} onOpenChange={onOpenChange}>
      <Modal.Container size="sm">
        <Modal.Dialog>
          <Modal.CloseTrigger />
          <Modal.Header>
            <Modal.Heading>修改密码</Modal.Heading>
          </Modal.Header>
          <Modal.Body className="p-1">
            <Form className="flex flex-col gap-4" id="password-form" onSubmit={onSubmit}>
              <TextField fullWidth isRequired name="current" type="password" value={current} onChange={setCurrent}>
                <Label>当前密码</Label>
                <Input autoComplete="current-password" />
                <FieldError />
              </TextField>
              <TextField fullWidth isRequired minLength={8} name="next" type="password" value={next} onChange={setNext}>
                <Label>新密码</Label>
                <Input autoComplete="new-password" placeholder="至少 8 位" />
                <FieldError />
              </TextField>
              <TextField fullWidth isRequired name="confirm" type="password" value={confirm} onChange={setConfirm}>
                <Label>确认新密码</Label>
                <Input autoComplete="new-password" />
                <FieldError />
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
            <Button form="password-form" isPending={saving} type="submit">
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
