import { Resend } from "resend";

async function send(to: string, subject: string, text: string, devFallbackMessage: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.warn(`[dev email fallback] RESEND_API_KEY not set. ${devFallbackMessage}`);
    return;
  }

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from: "Wrestling Matchup Tool <onboarding@resend.dev>",
    to,
    subject,
    text,
  });

  if (error) {
    throw new Error(`Failed to send email "${subject}" to ${to}: ${error.message}`);
  }
}

/** Sends the login code by email. Falls back to logging the code to the console when
 * RESEND_API_KEY isn't set, so local dev works without a real Resend account. */
export async function sendLoginCodeEmail(to: string, code: string): Promise<void> {
  await send(
    to,
    "Your login code",
    `Your login code is ${code}. It expires in 10 minutes and can only be used once.`,
    `Login code for ${to}: ${code}`
  );
}

/** Sends an invite link by email. Same dev fallback as sendLoginCodeEmail. */
export async function sendInviteEmail(to: string, inviteUrl: string): Promise<void> {
  await send(
    to,
    "You're invited to the Wrestling Matchup Tool",
    `You've been invited. Follow this link to set up your account: ${inviteUrl}`,
    `Invite link for ${to}: ${inviteUrl}`
  );
}
