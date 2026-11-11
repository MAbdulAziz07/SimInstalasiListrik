# Simulator Instalasi Listrik

Aplikasi web untuk berlatih instalasi kelistrikan pada papan virtual: memilih peralatan dari
palet, menaruhnya di papan, menyambung terminal dengan kabel, lalu memberi tegangan untuk melihat
rangkaian bekerja dan mengukurnya dengan multimeter, tang ampere, dan tespen.

Cakupan: instalasi penerangan, instalasi panel (MCB, kontaktor, TOR, timer), dan instalasi motor
tiga fasa (DOL, forward-reverse, star-delta) pada dua papan kerja, Instalasi dan Dalam Panel,
yang bertemu di terminal blok X1.

> Simulator ini alat bantu belajar. Ia tidak menggantikan prosedur K3, alat pelindung diri, atau
> pengukuran dan pengujian pada instalasi sungguhan. Nilai komponennya tipikal, bukan data pabrikan.

## Menjalankan

Butuh Node.js 22 atau lebih baru.

```bash
npm install
npm run dev
```

## Perintah

| Perintah | Kegunaan |
|---|---|
| `npm run dev` | Server pengembangan |
| `npm run build` | Periksa tipe lalu bangun ke `dist/` |
| `npm test` | Tes unit dan komponen (Vitest) |
| `npm run e2e` | Tes end-to-end (Playwright, memakai Microsoft Edge yang terpasang) |
| `npm run bench` | Tolok ukur mesin simulasi |
| `npm run lint` | ESLint |
| `npm run typecheck` | Pemeriksaan tipe TypeScript |

## Berkas acuan

Contoh rangkaian ada di `tests/fixtures/` dan bisa dibuka lewat tombol Impor, antara lain
`lampu-tunggal.json`, `saklar-tukar.json`, `dol-tor.json`, `forward-reverse.json`, dan
`star-delta.json`.

## Susunan kode

- `src/core` — jenis data, katalog komponen, simpan/muat (TypeScript murni)
- `src/sim` — mesin simulasi: analisis simpul fasor dan perilaku komponen (TypeScript murni)
- `src/editor` — papan, palet, kabel, dan gambar komponen (React)
- `src/instruments` — multimeter, tang ampere, tespen
- `SPEC.md`, `tasks/` — spesifikasi dan rencana kerja

## Pemasangan

`.github/workflows/deploy.yml` membangun aplikasi dan memasangnya ke GitHub Pages setiap ada push
ke `main`. Agar berjalan, sumber Pages pada repositori perlu disetel ke "GitHub Actions".
