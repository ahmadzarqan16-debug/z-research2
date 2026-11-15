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

## Galeri, Blog, Newsletter, dan SEO (November 2026)

- Identitas: lambang organisasi Hidayatullah (Wikimedia Commons, lisensi dan atribusi melalui https://commons.wikimedia.org/wiki/File:Logo_hidayatullah.jpg). Penggunaan merek resmi tetap perlu persetujuan yayasan.
- Tiga foto kegiatan **asli** dikreditkan ke Hidayatullah.or.id dan Republika, dengan tahun **2013, 2019, 2022**; bukan foto peristiwa terkini. Foto diload langsung dari sumber pihak ketiga dan dapat memerlukan izin penggunaan ulang serta persetujuan santri/wali. Jika gagal dimuat, gambar ilustrasi akan dipakai dengan label.
- Fasilitas: video dokumentasi kampus Bandar Labuhan dari 2021 di https://www.youtube.com/watch?v=6A1nrS1xRQg; label jelas bahwa bukan dokumentasi fasilitas saat ini. Foto spesifik gedung dan fasilitas terkini tetap menunggu arsip foto Yayasan.
- Blog: tiga halaman HTML mandiri di `/berita/<slug>/`, metadata OG/canonical, JSON-LD `NewsArticle`, indeks `/berita/`, `feed.xml` RSS dan `sitemap.xml`.
- Newsletter: formulir persetujuan dan API `/api/newsletter` (pilot). **Hanya daftar minat, tidak mengirim email.** Pengumpulan email hanya aktif apabila `NEWSLETTER_ENABLED=true` dan repo GitHub PPDB privat dengan token serta kunci enkripsi telah dikonfigurasi. Pengiriman berita memerlukan layanan email terverifikasi dan persetujuan pengelola.
- **SEO belum diaktifkan**: robots `noindex` dan `robots.txt Disallow` tetap ada sampai Yayasan menyatakan website resmi, foto dan konten disetujui, PPDB aktif aman, dan DNS domain diarahkan. Newsletter tidak langsung menaikkan peringkat; artikel yang rutin, informatif, dan dapat diindeks merupakan fondasi SEO.
- Github Pages bisa meng-host front-end statis, tetapi tidak menjalankan `/api/ppdb` dan `/api/newsletter`. Perlu backend terpisah + origin/CORS, atau pengguna hanya melihat mode demo.
