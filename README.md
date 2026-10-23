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
- Informasi di JSON ditampilkan sebagai teks; URL dibatasi pada HTTP/HTTPS.

Tampilan memakai font sistem sebagai cadangan jika Google Fonts tidak dapat dimuat. Website tidak menyertakan analitik atau layanan backend.
