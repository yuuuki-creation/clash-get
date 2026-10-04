"use client";

import { Alert, Button, Card, FieldError, Form, Input, Label, Spinner, TextField } from "@heroui/react";
import { type FormEvent, useState } from "react";
import { api, errorMessage } from "@/lib/client";
import { Logo } from "./logo";
import { ThemeToggle } from "./theme-toggle";

export function AuthForm({ mode }: { mode: "setup" | "login" }) {
  const isSetup = mode === "setup";
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isSetup && password !== confirm) {
      setError("两次输入的密码不一致");
      return;
    }
    setPending(true);
    setError(null);
    try {
      await api(`/api/auth/${mode}`, { method: "POST", body: { username, password } });
      window.location.href = "/";
    } catch (err) {
      setError(errorMessage(err));
      setPending(false);
    }
  }

  return (
    <main className="relative flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="absolute end-4 top-4">
        <ThemeToggle />
      </div>
      <Card className="w-full max-w-sm p-6">
        <Card.Header className="items-center gap-3 text-center">
          <Logo size="lg" />
          <div className="flex flex-col gap-1">
            <Card.Title className="text-xl">{isSetup ? "创建管理员账号" : "登录 Clash Get"}</Card.Title>
            <Card.Description>
              {isSetup ? "首次使用，请设置用户名和密码。创建后将不再开放注册。" : "使用你的账号密码登录"}
            </Card.Description>
          </div>
        </Card.Header>
        <Card.Content className="pt-2">
          <Form className="flex flex-col gap-4" onSubmit={onSubmit}>
            <TextField isRequired fullWidth autoFocus name="username" value={username} onChange={setUsername}>
              <Label>用户名</Label>
              <Input autoComplete="username" placeholder="admin" />
              <FieldError />
            </TextField>
            <TextField
              isRequired
              fullWidth
              minLength={isSetup ? 8 : undefined}
              name="password"
              type="password"
              value={password}
              onChange={setPassword}
            >
              <Label>密码</Label>
              <Input
                autoComplete={isSetup ? "new-password" : "current-password"}
                placeholder={isSetup ? "至少 8 位" : "输入密码"}
              />
              <FieldError />
            </TextField>
            {isSetup && (
              <TextField isRequired fullWidth name="confirm" type="password" value={confirm} onChange={setConfirm}>
                <Label>确认密码</Label>
                <Input autoComplete="new-password" placeholder="再输入一次" />
                <FieldError />
              </TextField>
            )}

            {error && (
              <Alert status="danger">
                <Alert.Indicator />
                <Alert.Content>
                  <Alert.Description>{error}</Alert.Description>
                </Alert.Content>
              </Alert>
            )}

            <Button fullWidth className="mt-1" isPending={pending} type="submit">
              {({ isPending }) => (
                <>
                  {isPending && <Spinner color="current" size="sm" />}
                  {isSetup ? "创建并登录" : "登录"}
                </>
              )}
            </Button>
          </Form>
        </Card.Content>
      </Card>
    </main>
  );
}
