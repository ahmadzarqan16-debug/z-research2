# Hidayatullah Medan — Portal Pendidikan & Pra-Pendaftaran (Prototype)

Prototype desain situs multi-jenjang, nonresmi. **Belum merupakan kanal PPDB sah dan tidak menerima atau menyimpan pendaftaran**. Struktur jenjang TK, SD, MTs, MA bersumber dari berita resmi Hidayatullah 9 Juli 2026; untuk MTs/MA juga tersedia catatan sekolah pemerintah. STIQ Ash-Shiddiq disebut terpisah sebagai pendidikan tinggi terkait, bukan jalur PPDB sekolah.

## Fitur
- Landing page responsif, ilustrasi SVG gaya 3D original, animasi ringan CSS.
- Halaman jenjang TK, SD, MTs, MA dan informasi STIQ terpisah.
- Halaman kegiatan berbasis peristiwa yang dipublikasikan secara terbuka.
- Panduan pra-pendaftaran bertahap; data hanya ada dalam memori tab browser. Formulir **tidak mengirimkan data** ke mana pun. Tombol salin/cetak ringkasan tersedia.
- FAQ, lokasi, sumber data, pernyataan privasi, banner verifikasi.

## Menjalankan
Situs statis tanpa dependency: jalankan `python3 -m http.server 8080` di direktori ini lalu kunjungi `http://localhost:8080`. Pada Vercel pilih Framework Preset **Other** (static root).

## Sebelum situs resmi diluncurkan
1. Persetujuan tertulis penggunaan identitas, materi, domain dan visual oleh Yayasan.
2. Validasi nama legal tiap unit, NPSN untuk TK/SD, alamat, nomor PPDB, brosur, biaya, syarat, jadwal/kuota, asrama, pilihan program, dokumentasi berizin.
3. Integrasi database aman, autentikasi panitia, audit akses, retensi data, notifikasi, perlindungan data pribadi dan pengamanan aplikasi.
4. Pengujian keamanan dan aksesibilitas, pengesahan kebijakan privasi, penggantian ilustrasi dengan dokumentasi nyata berizin jika diperlukan.
5. Hapus `noindex` setelah persetujuan untuk publikasi resmi dan ganti placeholder pra-pendaftaran.

## Sumber publik
- https://hidayatullah.or.id/sambut-tahun-ajaran-baru-2026-2027-pondok-pesantren-hidayatullah-medan-gelar-pelatihan-metode-al-hidayah/
- https://hidayatullah.or.id/indeks-berita/page/32/ (indeks memuat berita rencana kurikulum)
- https://hidayatullah.or.id/pesantren-hidayatullah-medan-jajaki-kerja-sama-penguatan-digital-marketing-dan-kemandirian-ekonomi-bersama-binus-university-medan/
- https://referensi.data.kemendikdasmen.go.id/pendidikan/npsn/10264274
- https://referensi.data.kemendikdasmen.go.id/pendidikan/npsn/10264740
- Knowledge base proyek: Konsep HATI AI.txt (15 Nov 2026).

**Catatan visual:** Seluruh adegan siswa/gedung merupakan ilustrasi orisinal bergaya 3D dan bukan foto dokumentasi kejadian atau potret santri Hidayatullah.

## PPDB GitHub encrypted pilot (November 2026)

The source contains a **functional conditional-registration backend** and school admin dashboard at `/admin.html`. This is **not yet an operational admissions service** until authorized school staff configure secrets and approve data processing. The public form stays in simulation mode if backend configuration is incomplete; API POST returns 503.

### Architecture
- Public registration: `/` → `#ppdb`; secure serverless API: `/api/ppdb` on Vercel.
- **Storage: a separate private GitHub repository** (NOT this public source repository). Each registration: `registrations/<UUID>.json` containing an AES-256-GCM ciphertext. Only the server decrypts it; no token or encryption key goes to client code.
- School admin: `/admin.html`, password-derived scrypt verification, HMAC-signed eight-hour HttpOnly cookies; scoped to TK / SD / MTs / MA or explicit `all` role. Filter, update status, and export escaped CSV.
- Encryption secrets and GitHub token are stored **only as Vercel encrypted Production environment variables**. `.env.example` is illustrative and intentionally not valid.
- At boot, API refuses registration if any required configuration is missing. Before write and admin list/update, API checks that GitHub reports target repository **private=true**.

### Activation instructions (authorized operator only)
1. Obtain written institutional permission and publish a privacy notice, retention/deletion schedule, access-control policy, and official PPDB rules. Verify academic unit identity, fees, dates, and contact details before promotion as an official PPDB system.
2. Create a **new private GitHub repository** for PPDB data, distinct from the public source code repository. Do not put any applicant personal data into public GitHub repositories, GitHub Issues, or GitHub Actions logs.
3. Grant a fine-grained GitHub Personal Access Token permission only to the dedicated private repository, **Contents: Read and write**, no other repo access. Store it **only in the Vercel project's Production environment settings** as `GITHUB_PPDB_TOKEN`. Never submit it into the form, chat, source code or shared screenshots.
4. Set `GITHUB_PPDB_REPO` to `owner/private-ppdb-repository`.
5. Generate a random 32-byte AES encryption key using a secure locally executed command, for example `node -p "require('node:crypto').randomBytes(32).toString('base64')"`; set it as `PPDB_ENCRYPTION_KEY` in Vercel. Back it up in a protected secret manager; loss of this key makes stored registrations unrecoverable.
6. Generate a separate high-entropy session secret, at least 32 characters, as `PPDB_SESSION_SECRET`.
7. Create one or more school admins with a unique password of **at least 16 characters** per user. Run `node scripts/create-admin-hash.js 'a-long-random-password'` locally (avoid putting passwords in shell history; adapt the script to use secure input for production) to produce `scrypt$salt$hash`. Supply `PPDB_ADMIN_USERS_JSON` as a JSON array of objects, e.g. `[{"username":"school-admin","level":"mts","passwordHash":"scrypt$..."}]`. The `all` role is optional and should be tightly controlled. Protect credentials with a second factor or identity provider before wider release.
8. Redeploy, verify `GET /api/ppdb?action=health` shows `configured:true`, test with non-personal dummy registrations and with each school admin, including attempts to cross access levels. Have institution confirm authorization before enabling public intake.

### Important limitations and controls
- GitHub **is not a relational database**: no transactions/query indexes, concurrent writes to a record may conflict, and reading dashboards requires GitHub API requests per encrypted record. Current listing is limited to fewer than 1,000 records. This design is **a small pilot**, not recommended for high-volume live enrollment.
- Encrypting records protects contents in GitHub, but repository commit history remains; deleting a file does not fully erase data from history or backups. Therefore **do not claim full erasure compliance** without a documented Git history/key management and backup retention policy.
- API provides basic session authentication, but does not yet implement distributed brute-force rate limiting, 2FA, audit-log retention, file attachments, consent receipt logging, contact verification, payment gateway, or institutional data-subject request workflows. These should be added before an officially sanctioned launch.
- Do not use identifiable applicant data in testing. Source website remains marked prototype/nonofficial and `noindex` until permission is granted.
