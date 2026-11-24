# Video vertikal Cakrawala (Remotion)

Sumber untuk `hasil/video.mp4` (1080×1920, 30 fps, 24 detik).

```bash
npm install
npm run render   # buat audio dengan kode, lalu render ke ../video.mp4
npx remotion studio src/index.ts   # pratinjau dan edit
```

- `src/timeline.json`: satu-satunya sumber waktu. Frame adegan dan frame tiap teks mendarat
  dipakai oleh animasi **dan** oleh `scripts/buat-audio.mjs`, jadi efek suara selalu jatuh
  tepat saat teks mendarat. Ubah angka di sini, lalu render ulang.
- `scripts/buat-audio.mjs`: backsound hangat (pad D mayor + kotak musik) dan efek suara
  (langkah kaki, buku terbuka, halaman dibalik, nada mendarat, kilau, pop tombol), semua
  disintesis dengan kode menjadi `public/audio.wav`.
- `src/Video.tsx`: lima adegan (hook, kebutuhan, program, cara donasi, ajakan + logo).
- Font Archivo, Instrument Serif, dan Inter disimpan lokal di `public/fonts/`.

**Status draf:** daftar program dan masalah yang disebut masih `[ASUMSI]` di brand kit.
Konfirmasi dulu sebelum video tayang publik. Saluran donasi memakai "link di bio".
