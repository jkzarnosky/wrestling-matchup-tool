import { describe, expect, it } from "vitest";
import { signSessionToken, verifySessionToken } from "../../lib/session-cookie";

describe("session cookie signing", () => {
  it("round-trips a signed token", () => {
    const signed = signSessionToken("some-session-id");
    expect(verifySessionToken(signed)).toBe("some-session-id");
  });

  it("rejects a tampered signature", () => {
    const signed = signSessionToken("some-session-id");
    const [id, sig] = signed.split(".");
    const tamperedSig = sig.slice(0, -1) + (sig.at(-1) === "a" ? "b" : "a");
    expect(verifySessionToken(`${id}.${tamperedSig}`)).toBeNull();
  });

  it("rejects a tampered session id", () => {
    const signed = signSessionToken("some-session-id");
    const [, sig] = signed.split(".");
    expect(verifySessionToken(`different-id.${sig}`)).toBeNull();
  });

  it("rejects a malformed cookie value", () => {
    expect(verifySessionToken("not-a-valid-cookie")).toBeNull();
  });
});
