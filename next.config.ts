import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // `next dev` otherwise auto-writes a generic "read node_modules/next/dist/docs/ before coding"
  // block into CLAUDE.md on every run when it detects an AI coding agent, re-adding it any time
  // it's missing. In practice that value is already covered by reading this codebase's own
  // established patterns and, when something is genuinely unfamiliar, the installed source/docs
  // directly -- so the generic reminder wasn't preventing anything, while the recurring rewrite
  // of a hand-maintained instructions file was real, avoidable noise. See DECISIONS.md.
  agentRules: false,
};

export default nextConfig;
