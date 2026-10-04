import { redirect } from "next/navigation";
import { connection } from "next/server";
import { AuthForm } from "@/components/auth-form";
import { getUser } from "@/lib/store";

export default async function SetupPage() {
  await connection();
  if (getUser()) redirect("/login");
  return <AuthForm mode="setup" />;
}
