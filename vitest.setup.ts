try {
  process.loadEnvFile(".env.local");
} catch {
  // .env.local doesn't exist (e.g. in CI) -- that's fine, fall back below.
}

// Tests only need *a* secret to exercise HMAC sign/verify round-trips, never the real one.
process.env.SESSION_SECRET ??= "test-only-session-secret-not-for-production";
