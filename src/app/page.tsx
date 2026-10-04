import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Dashboard } from "@/components/dashboard";
import { getSessionUser } from "@/lib/auth";
import { getUser, listSubscriptions } from "@/lib/store";

export default async function HomePage() {
  await connection();
  if (!getUser()) redirect("/setup");
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return <Dashboard username={user.username} initialSubscriptions={listSubscriptions()} />;
}
