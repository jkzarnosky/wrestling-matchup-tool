import { Resend } from "resend";

/** Sends the login code by email. Falls back to logging the code to the console when
 * RESEND_API_KEY isn't set, so local dev works without a real Resend account. */
export async function sendLoginCodeEmail(to: string, code: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.warn(`[dev email fallback] RESEND_API_KEY not set. Login code for ${to}: ${code}`);
    return;
  }

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from: "Wrestling Matchup Tool <onboarding@resend.dev>",
    to,
    subject: "Your login code",
    text: `Your login code is ${code}. It expires in 10 minutes and can only be used once.`,
  });

  if (error) {
    throw new Error(`Failed to send login code email: ${error.message}`);
  }
}
