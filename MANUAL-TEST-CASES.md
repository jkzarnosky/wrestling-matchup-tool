# Manual End-to-End Test Cases

The Tier 4 (end-to-end) row in README.md's Testing section refers to this checklist — the flows worth
walking through by hand (or eventually automating with Playwright, see BACKLOG.md Parking Lot) because
they span multiple pages/requests in a way Tier 2/3 tests don't exercise.

Start from a clean baseline:

```bash
npm run demo:reset   # wipes teams/users/invites/sessions, reseeds 4 demo teams + your Admin
npm run dev
```

Login codes aren't emailed in local dev — they print to the terminal running `npm run dev`
(`[dev email fallback] ...`).

---

## 1. Login (email → code → session → logout)

1. Go to `/login`. Enter the seeded Admin's email. Submit.
2. Copy the 6-digit code from the terminal running `npm run dev`.
3. Enter it on the code screen. Submit.
4. **Expect:** redirected to `/`, now logged in (confirm via `/team` — should resolve to a team page, not `/login`).
5. Go back to `/login`, request another code, but submit the **wrong** 6 digits.
   **Expect:** "Invalid or expired code." — still on the code screen, not logged in.
6. Request a code 6 times in a row for the same email within a few minutes.
   **Expect:** the 6th request shows "Too many login codes requested — try again later." on the page (a `429`).
7. `POST /api/auth/logout` (no UI button yet — use the browser devtools console: `fetch('/api/auth/logout', {method:'POST'})`).
   **Expect:** subsequent visits to `/team` redirect to `/login` again.

## 2. Admin manages teams

1. Log in as Admin. Go to `/admin/teams`.
2. **Expect:** the 4 demo teams listed.
3. Add a team with a blank name. **Expect:** rejected with a validation error, not silently accepted.
4. Add a valid team (name + conference). **Expect:** appears in the list without a page reload.
5. Edit an existing team's name. **Expect:** updates in place.
6. Log out, try `GET`/`POST /api/teams` directly (devtools console) while logged out.
   **Expect:** `401`.

## 3. Admin invites a user → new user accepts

1. Log in as Admin. Go to `/admin/invites`.
2. Invite a new email as **Team Rep**, assigned to one of the demo teams.
3. **Expect:** appears in the list as "Pending."
4. Copy the invite link from the terminal (`[dev email fallback] Invite link for ...: http://localhost:3000/invite/<token>`).
5. Open that link in a **new incognito/private window** (so you're not logged in as Admin there).
6. Fill in first/last name, submit.
   **Expect:** redirected to `/`, now logged in as the new Team Rep — confirm `/team` shows *their* team, not the admin's view.
7. Back in the Admin window, refresh `/admin/invites`. **Expect:** that invite now shows "Accepted."
8. Try opening the same invite link again (still in the private window, now logged out — or a third window).
   **Expect:** "This invite link is invalid, already used, or expired."
9. As Admin, try inviting the *same* email you just used in step 2 again.
   **Expect:** rejected — "This email already has an account."
10. Invite a new email as **Admin** (no team). Accept it the same way as steps 5–6.
    **Expect:** logs in as an Admin, not scoped to any one team.

## 4. Team-scoping enforcement (the actual security-relevant part)

1. Log in as the Team Rep created in section 3. Note their team's `/team/<id>` URL.
2. Manually edit the URL to a **different** team's id (e.g. `/team/1` if you're team 2).
   **Expect:** "Forbidden" — not the other team's data, not a silent redirect.
3. Still as that Team Rep, try `POST /api/teams` (devtools console) with a valid body.
   **Expect:** `403` — Team Reps can't create teams, only Admins.
4. Log in as Admin again. Visit `/team` — **expect** a team selector dropdown that isn't present for
   the Team Rep. Switch teams via the dropdown — **expect** the URL and page content both update.

---

If any of these don't match "Expect," that's a real bug — file it as a GitHub issue before moving on,
don't just make a mental note.
