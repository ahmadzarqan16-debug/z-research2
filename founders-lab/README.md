# Founders Lab Live V4 — Classroom deployment (GitHub + Vercel only)

Source path: `founders-lab/`. Do not change the unrelated repository root files.

## Roles and privacy
19 numbered founder slots (01–19) and one lecturer/investor session. Founders join with a room code, group number and their group PIN. The first person to claim a slot chooses its PIN. The lecturer logs in with the separately created lecturer PIN.

Every request is authenticated with an HMAC signed, expiring, role-scoped session. A founder's state request is always server-side scoped to their own group. The instructor is allowed to retrieve a group by exact ID and sees aggregate overview of all registered groups. There are **no public team-list or leaderboard APIs for founders**.

## Gameplay
The founder avatar moves with WASD, arrow keys, or click-to-walk. Employees wander in the virtual office and work on tasks. The 12-month (extendable) deterministic seeded simulation supports hiring, firing, 4 work weeks, product sprints, campaigns, financial accounting, funding requests, term sheets, market shocks, pressure directives, and reflection journals.

Financial amounts in the engine are **million Indonesian Rupiah**, not real money.

## Data persistence
Production uses **Vercel Blob private storage** connected to this Vercel project. Each action is written as a unique append-only event object. Events are replayed to compute company state. There are no mutable SQLite files in Vercel Functions. This approach is adequate for a classroom pilot, not an indefinitely scalable event database: heavy repeated event lists incur Blob reads, and simultaneous operations still need further concurrency testing.

Environment variables:
- `SETUP_KEY`: secret lecturer classroom provisioning passphrase
- `SESSION_SECRET`: long random secret for signing sessions
- `BLOB_READ_WRITE_TOKEN`: injected by Vercel when Blob store is connected, or OIDC credentials

Create a classroom via the **Create Class** tab using the setup key. Record the classroom code and lecturer PIN privately. Give only the classroom code to students. Each team privately chooses a PIN on first join.

## Local dev on Mac
```bash
cd founders-lab
npm install
npm test
npm run dev
open http://localhost:3000
```
Local development stores unencrypted non-production simulation data in `.local-state` (gitignored). The local-only setup key is `local-development-key`. Do not use it in deployed production.

## Deployment
Deploy from GitHub folder `founders-lab` to Vercel with framework **Other**, Node.js 22+; set project root directory to `founders-lab`. Connect a **Private Vercel Blob store** to this project and set the two environment secrets above. No additional software or third-party applications are required for students.

## Classroom validation
Test login across all 19 slots; verify group 01 cannot request group 02 state, teacher can inspect both; verify avatars walk with WASD, projects advance, payroll postings, funding dilution, pause of manual instructor progression, and survival across browser refresh.

## Limitations
Interactive 2.5D animated office, not physics-based 3D. Realtime updates use adaptive browser polling (16 seconds), not a cross-instance websocket service. No separate student identities within each group. Group PIN is shared among members of the same team, and lecturer PIN must remain private. Always conduct classroom acceptance tests before assessed use.
