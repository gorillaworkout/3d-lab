import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/server";
import type { SessionUser } from "@/lib/types";

export async function requirePageUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}
