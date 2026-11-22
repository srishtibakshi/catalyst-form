# Fellowship application — setup

The form lives at `/fellowship` in this app (`catalyst-form-rho.vercel.app/fellowship`).
Each application is written to **two places**: a review Google Sheet and the
`fellowship_applications` table in Supabase. Either one holding it is enough for
the applicant to see "your application is in"; a failed write to the other is
logged with the application's reference so it can be reconciled.

Do steps 1–3 **before** the form goes to production. Until then, submissions fail
with a "could not save" message rather than disappearing.

---

## 1. Create the review Google Sheet (5 minutes)

1. Create a new Google Sheet in the Philanthropel Workspace, e.g.
   **"Fellowship applications"**. Keep it private to the review team.
2. **Extensions → Apps Script.** Delete the placeholder code and paste in the
   whole of `google-apps-script/fellowship-sheet.gs` from this repository. Save.
3. Make a shared secret — any long random string. In a terminal:
   ```bash
   openssl rand -hex 32
   ```
4. In the Apps Script editor: **Project Settings** (gear icon) → **Script
   properties** → **Add script property**.
   Name `FELLOWSHIP_SECRET`, value: the string from step 3. Save.
5. **Deploy → New deployment** → type **Web app**.
   - Execute as: **Me**
   - Who has access: **Anyone**
   
   Deploy, authorise when Google asks, and copy the **Web app URL**
   (it ends in `/exec`).

"Anyone" is required so the form's server can reach the script without a Google
login. The script refuses any request that does not carry the secret, and the
secret only ever exists in Script properties and Vercel — never in the browser.

The first application creates an **Applications** tab with a bold, frozen header
row. Reviewers work left to right: Submitted at, **Status** (starts as "New"),
then the answers. Change Status as you review.

## 2. Add the two values to Vercel

Vercel → **catalyst-form** → Settings → Environment Variables. Add both for
**Production** (and **Preview** too, if you want preview deployments to save):

| Name | Value |
| --- | --- |
| `FELLOWSHIP_SHEET_WEBHOOK_URL` | the Web app URL from step 1.5 |
| `FELLOWSHIP_SHEET_SECRET` | the same string as `FELLOWSHIP_SECRET` in step 1.4 |

## 3. Create the Supabase table

Supabase → the **same project as Catalyst** → SQL Editor → paste the whole of
`fellowship-schema.sql` → Run. It is safe to run twice.

Unlike the Catalyst table, this one has **no anonymous insert policy**: only the
form's server (with the service-role key Vercel already holds) can write to it.

## 4. Check it end to end

Once deployed, submit one test application at `/fellowship`, then confirm:

- a row appears in the **Applications** tab of the Sheet, and
- a row with the same **Reference** appears in `fellowship_applications`.

Delete both test rows afterwards.

If the row is missing from one of them, Vercel → catalyst-form → Logs, and search
for the reference: the log line says which store failed and why.

---

## 5. Email alerts for new submissions

Both forms (Fellowship and Catalyst intake) email the team when a submission
is saved. The Apps Script from step 1 sends them, from the Google account
that owns the script, so there is no mail service to set up.

To turn alerts on after updating the script:

1. Paste the current `google-apps-script/fellowship-sheet.gs` into the
   script editor (Extensions → Apps Script on the review sheet) and save.
2. Alerts go to anmol@philanthropel.com and srishti@philanthropel.com
   (`DEFAULT_RECIPIENTS` in the script). To change that without editing
   code: Project Settings → Script properties → add `NOTIFY_EMAILS`, a
   comma-separated list, which replaces the default.
3. Deploy → Manage deployments → edit (pencil) the existing web app →
   Version: **New version** → Deploy. Editing the existing deployment keeps
   the same `/exec` URL, so nothing changes in Vercel. Creating a *new*
   deployment would give a new URL instead.
4. Google asks to authorise the new "send email as you" permission.
   Approve it. Until it is approved, alerts fail quietly (submissions still
   save) and Vercel logs show `[alert] Not sent`.
5. Run in the editor once, or submit a test application, and check the inbox.

The Catalyst intake form uses the same `FELLOWSHIP_SHEET_WEBHOOK_URL` and
`FELLOWSHIP_SHEET_SECRET` values, so no new Vercel variables are needed.
Gmail allows about 100 alert emails a day from a personal account and 1,500
from Google Workspace.

## Changing the questions

Everything about a question lives in `lib/fellowship.ts`: its options, whether it
is required, which slide asks it, and its Sheet column. The page
(`app/fellowship/page.tsx`) renders it. `npm test` fails if a field is added
without a slide or a Sheet column.

When columns change, add a matching column to `fellowship-schema.sql` (and run the
`alter table` in Supabase). The Apps Script itself never needs editing, but it
writes rows **by position** and only writes the header row once, into an empty
tab. So when columns are added, removed or reordered, rename the old
**Applications** tab (e.g. "Applications — round 1"): the next application then
creates a fresh tab with the new headers, and old rows never sit under the wrong
column.

## Voice answers

The "Speak instead" button uses the existing `/api/voice-cleanup` route — Groq
Whisper transcribes, Claude tidies filler words. It needs `GROQ_API_KEY` and
`ANTHROPIC_API_KEY`, which production already has. Spoken answers are added to
anything already typed, never replacing it.
