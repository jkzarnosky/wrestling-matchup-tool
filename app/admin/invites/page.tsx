import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { InvitesManager } from "./InvitesManager";

export default async function AdminInvitesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "admin") {
    return (
      <main>
        <h1>Forbidden</h1>
        <p>Only Admins can invite users.</p>
      </main>
    );
  }

  return (
    <main>
      <h1>Invites</h1>
      <InvitesManager />
    </main>
  );
}
