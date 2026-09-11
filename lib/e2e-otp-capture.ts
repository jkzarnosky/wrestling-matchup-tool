import { appendFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const CAPTURE_FILE = "e2e/.artifacts/login-codes.log";

/** Test seam: when E2E_TEST_MODE=1, append each login code to a local file so the Playwright suite
 * can drive the real OTP login UI. A complete no-op otherwise -- gated on an explicit opt-in env
 * var that is never set in any real deployment, and even when it is, all it does is write a line to
 * a local file that means nothing outside a test run. */
export function captureLoginCodeForE2E(email: string, code: string): void {
  if (process.env.E2E_TEST_MODE !== "1") return;
  try {
    mkdirSync(dirname(CAPTURE_FILE), { recursive: true });
    appendFileSync(CAPTURE_FILE, `${new Date().toISOString()}\t${email}\t${code}\n`);
  } catch {
    // best-effort: a failure here must not break the login flow
  }
}
