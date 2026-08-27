import { AcceptInviteForm } from "./AcceptInviteForm";

export default async function AcceptInvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  return (
    <main>
      <h1>Set up your account</h1>
      <AcceptInviteForm token={token} />
    </main>
  );
}
