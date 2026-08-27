"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export function AcceptInviteForm({ token }: { token: string }) {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/invites/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, firstName, lastName }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Something went wrong.");
      }
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <label htmlFor="firstName">First name</label>
      <input id="firstName" required value={firstName} onChange={(event) => setFirstName(event.target.value)} />

      <label htmlFor="lastName">Last name</label>
      <input id="lastName" required value={lastName} onChange={(event) => setLastName(event.target.value)} />

      <button type="submit" disabled={submitting}>
        Finish setting up account
      </button>
      {error && <p role="alert">{error}</p>}
    </form>
  );
}
