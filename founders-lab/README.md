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

## Recovery & PIN Reset (11 November 2026)

If lecturer login fails or students report "Kelas tidak ditemukan":

1. Open https://founders-lab-classroom.vercel.app in a new tab and log out of an expired session.
2. On the login screen click **Forgot Class Code / Reset Lecturer PIN**.
3. Enter the lecturer setup key configured in Vercel Environment Variables (`SETUP_KEY`). The server lists preserved classrooms (class name and exact eight-character room code).
4. Select the correct class and set a new **lecturer PIN**. This revokes previously issued lecturer sessions without deleting any students' work.
5. Inside **Investor Control**, use **Copy Class Code** to share the exact room code with students.
6. If group PINs are also wrong, click **Reset All 19 Group PINs**, confirm by typing `RESET 19 PINS`, and save the downloaded private CSV. Distribute each PIN only to the corresponding numbered group. The reset revokes the previous founder sessions; startup data, employee tasks, finance events and journals remain unchanged.
7. Students select Founder, enter the same room code, select 01–19, and use their newly assigned group PINs.

Do not reset the 19 group PINs unless you intend to revoke old group access. Do not share `SETUP_KEY` or lecturer PIN with students. The setup key was previously disclosed in a support message; rotate it in Vercel project settings as soon as the lecturer has recovered access, then deploy again to apply the changed secret.

Class creation is now **write-and-verify**; the server does not return a new room code unless it can read the stored class metadata back. The health endpoint `GET /api/game?op=health` checks that private storage is readable without revealing class codes.

