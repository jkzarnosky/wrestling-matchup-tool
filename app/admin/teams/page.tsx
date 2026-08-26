import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { TeamsManager } from "./TeamsManager";

export default async function AdminTeamsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "admin") {
    return (
      <main>
        <h1>Forbidden</h1>
        <p>Only Admins can manage teams.</p>
      </main>
    );
  }

  return (
    <main>
      <h1>Teams</h1>
      <TeamsManager />
    </main>
  );
}
