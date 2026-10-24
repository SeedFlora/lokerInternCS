# lokerInternCS

Papan lowongan magang statis berbahasa Indonesia. Daftar menggabungkan arsip postingan dan riset sumber publik; setiap entri memiliki tautan sumber untuk pemeriksaan lebih lanjut.

Website publik: https://seedflora.github.io/lokerInternCS/

## Menjalankan lokal

Jalankan server HTTP dari folder proyek, misalnya dengan Python:

```powershell
python -m http.server 8080
```

Buka `http://localhost:8080`. Gunakan server HTTP agar browser dapat mengambil `data/jobs.json`.

## Memperbarui lowongan

1. Edit `data/jobs.json`. Pertahankan struktur objek `updatedAt`, `coverage`, dan `jobs`.
2. Isi tanggal dengan format `YYYY-MM-DD`; gunakan `null` untuk tanggal yang tidak diketahui.
3. Berikan `id` yang unik dan stabil pada setiap lowongan agar simpanan pengunjung tetap bekerja.
4. Pisahkan `postedDate` (tanggal publikasi sumber), `sharedDate` (tanggal dibagikan), dan `checkedDate` (tanggal peninjauan). Tanggal peninjauan tidak dipakai untuk mengklaim tanggal publikasi baru.
5. Gunakan `provenance` berupa `Arsip postingan` atau `Riset web`. Isi `sourceType` sesuai sumber, misalnya `Instagram`, `LinkedIn`, `Karier perusahaan`, atau `Web`.
6. Ringkas informasi yang benar-benar tersedia. Masukkan persyaratan di `requirements` dan catatan keterbatasan di `notes`. Gunakan `status: "Perlu cek sumber"` jika ketersediaan belum terkonfirmasi.
7. Periksa tautan `sourceUrl` dan `applyUrl`, lalu perbarui `updatedAt` setelah meninjau perubahan.
8. Uji melalui server lokal, commit perubahan, dan push ke cabang `main`.

### Batas kurasi IT dan unggahan gabungan

- Publikasikan posisi yang ruang lingkup teknisnya terkonfirmasi: software, QA, data/AI, cloud, jaringan, sistem, keamanan, IT audit, atau embedded. Nama perusahaan teknologi maupun kata “data” saja tidak cukup untuk menjadikan posisi bisnis/administrasi sebagai lowongan IT.
- `company` selalu berisi perusahaan pemberi kerja. Simpan akun Instagram atau kurator pada `sourcePublisher`, terpisah dari `sourceType` dan `sourceUrl`.
- Urai carousel yang memuat beberapa perusahaan/posisi menjadi kartu sesuai perusahaan dan posisi IT yang terbaca. Satu `sourceUrl` boleh dipakai beberapa posisi yang berbeda; jangan menganggap URL unggahan sama sebagai duplikat pekerjaan.
- Untuk posisi yang sama dari beberapa penerbit, pertahankan satu ID dan simpan bukti lain di `additionalSources`, berisi `sourceUrl`, `sourcePublisher`, `label`, serta `postedDate`/`sharedDate` jika diketahui. Detail dan kalender ikut menampilkan sumber pendamping.
- Jangan menerbitkan kartu kurator atau perusahaan yang belum diketahui. Simpan data yang belum terurai dan posisi non-IT di luar folder publik untuk pemeriksaan berikutnya.
- Filter `companies.json` dan pemetaan profil agar matriks hanya berisi perusahaan dengan posisi IT dalam daftar. Jangan mewariskan alasan tier khusus peran non-IT kepada peran IT yang berbeda.

Jangan sertakan nama anggota, isi percakapan pribadi, tautan undangan grup, atau data pribadi dari WhatsApp. Publikasikan hanya informasi lowongan yang memang tersedia untuk umum. Jangan unggah berkas dengan nama yang mengandung kata terlarang dalam preferensi pengguna.

## GitHub Pages

Repositori tujuan: `SeedFlora/lokerInternCS`.

Pada **Settings → Pages → Build and deployment**, pilih **Deploy from a branch**, cabang **main**, dan folder **/(root)**, lalu simpan. Berkas `.nojekyll` memastikan berkas statis disajikan langsung. Website tidak membutuhkan proses build atau dependensi npm.

## Perilaku website

- Pencarian mencakup posisi, perusahaan, bidang, lokasi, ringkasan, dan persyaratan.
- Filter berdasarkan bidang, jenis informasi, sumber, koleksi riset, arsip, atau simpanan. Jenis informasi mengikuti label pada data, sehingga kumpulan lowongan atau panduan dapat dipisahkan dari posisi magang.
- Urutan tanggal kurasi / sumber memakai tanggal publikasi jika diketahui, lalu tanggal dibagikan, lalu tanggal peninjauan. Kartu menyebut jenis tanggal yang digunakan dengan jelas.
- Tombol simpan menggunakan `localStorage` pada browser pengunjung. Jika penyimpanan tidak tersedia, simpanan berlaku selama sesi halaman.
- Detail posisi terbuka dalam dialog yang dapat ditutup dengan tombol atau Escape. Tautan eksternal terbuka di tab baru.
- Informasi di JSON ditampilkan sebagai teks; sumber dibatasi pada HTTP/HTTPS. Tautan melamar juga mendukung `mailto:` untuk alamat email rekrutmen tanpa parameter tambahan. Tombol ini membuka aplikasi email pengunjung dan tidak mengirim pesan secara otomatis.

Tampilan memakai font sistem sebagai cadangan jika Google Fonts tidak dapat dimuat. Website tidak menyertakan analitik atau layanan backend.

## Tier perusahaan, ulasan, dan tema

- `data/companies.json` memetakan identitas perusahaan ke setiap `jobId`, menyimpan aset logo, alasan rekomendasi, perkiraan seleksi, tips, dan tautan sumber. Kanal informasi serta program yang bukan pemberi kerja tidak diperingkat sebagai perusahaan.
- Matriks terinspirasi dari [Prydwen](https://www.prydwen.gg/zenless/tier-list). T0 (S) berarti prioritas tinggi untuk kecocokan CS; T1 (A) pilihan bagus; T2 (B) bergantung tujuan/posisi. Kolom menunjukkan perkiraan seleksi. Tier merupakan pendapat kurasi, bukan rating resmi atau ukuran peluang diterima.
- Tier dapat bersifat sementara jika hanya uraian posisi yang tersedia; nyatakan keyakinan rendah dan bagian yang belum diketahui. Jangan menjadikan brand, negara, atau ketiadaan ulasan sebagai bukti kualitas perusahaan maupun tingkat persaingan. Bedakan tuntutan kompetensi teknis dari bukti tahapan seleksi, dan pisahkan tier belajar dari status lowongan yang sedang terbuka/ditutup.
- Bedakan panduan resmi, pengalaman kandidat/pekerja, dan saran kurasi. Tulis keterbatasan jabatan, negara, tahun, dan sampel ulasan. Jangan mengisi ulasan atau persentase kelulusan jika bukti tidak ada. `sourceIds` pada tips merujuk ke `sources` profil yang sama.
- Logo disimpan lokal di `assets/companies/`, dengan asal aset pada metadata profil. Ikon netral dipakai untuk identitas sumber yang belum terverifikasi. Jangan membuat logo merek palsu.
- `company-guide.js` merender tier, profil, dan sumber; `theme.js` serta `themes.css` menyediakan tema terang/gelap. Pilihan disimpan dalam browser dan mengikuti preferensi sistem sampai pengunjung memilih sendiri.
- Perubahan data dapat diperiksa lewat server lokal, kemudian commit dan push `main` untuk publikasi GitHub Pages.

## Kalender posting dan pendaftaran

- `calendar.js` dan `calendar.css` menampilkan kalender bulanan, agenda tanggal pilihan, pencarian perusahaan/posisi, serta filter posting dan pendaftaran. Klik entri untuk membuka detail lowongan yang sama dengan kartu daftar.
- Kalender memakai `postedDate` untuk publikasi dan `sharedDate` untuk tanggal dibagikan, dengan label berbeda. `checkedDate` tidak menjadi acara posting.
- `applicationStartDate` adalah tanggal pembukaan pendaftaran dan `deadline` tanggal penutupannya, dalam format `YYYY-MM-DD`. Gunakan `null` atau abaikan field jika tidak diketahui. Jangan memakai periode pelaksanaan magang sebagai periode apply.
- Rentang pendaftaran hanya ditampilkan jika kedua ujung tanggal tersedia. Tenggat tanpa tanggal mulai tetap ditampilkan sebagai tenggat, tanpa menganggap pendaftaran sudah dibuka. Rentang ini mengikuti sumber dan tidak menjamin posisi masih menerima lamaran.
- Tambahkan `applicationDateSource: { "url": "https://…", "label": "Nama sumber tanggal" }` untuk bukti tanggal. `deadlineTime`, misalnya `"23:59 WIB"`, mempertahankan jam penutupan yang dinyatakan sumber; jangan mengarang jam jika tidak ada.
- Tanggal kalender dan penanda hari ini menggunakan WIB (`Asia/Jakarta`). Agenda tetap menyertakan entri yang tenggatnya telah lewat agar arsip postingan dapat ditinjau.

Ilustrasi hero bertema Dialyn dibuat melalui built-in ImageGen berdasarkan referensi pengguna. Aset terpilih: `assets/dialyn-hero-v2.webp`; prompt lengkap ada di `assets/dialyn-v2-prompt.md`. Arah visual situs terinspirasi dari [Aajob karya Akash Das](https://www.behance.net/gallery/104398677/Aajob-Job-finding-landing-page/modules/599826963).
