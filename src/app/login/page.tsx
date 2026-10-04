import { redirect } from "next/navigation";
import { connection } from "next/server";
import { AuthForm } from "@/components/auth-form";
import { getSessionUser } from "@/lib/auth";
import { getUser } from "@/lib/store";

export default async function LoginPage() {
  await connection();
  if (!getUser()) redirect("/setup");
  if (await getSessionUser()) redirect("/");
  return <AuthForm mode="login" />;
}
