import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { AccountClient } from "./client";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return <AccountClient user={session.user} />;
}
