# Daftar Tugas: Simulator Papan Instalasi Kelistrikan

Acuan: `../SPEC.md`, `plan.md`. Verifikasi umum setiap tugas: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build` lolos.

---

## Fase 1 — Fondasi

### - [x] T1: Kerangka proyek (selesai 2026-11-10, belum di-commit)
**Deskripsi:** Membuat proyek Vite + React + TypeScript strict dengan Vitest, Playwright, ESLint, Prettier, dan struktur folder sesuai spec.
**Catatan:** `@vitejs/plugin-react` dikunci ke versi 5 karena versi terbaru mensyaratkan Vite 8. Playwright memakai Microsoft Edge yang terpasang. Folder `src/core`, `src/sim`, dst. dibuat saat tugas pertamanya dikerjakan.
**Kriteria terima:**
- [x] Semua perintah di bagian Commands spec berjalan tanpa galat
- [x] Halaman kosong berjudul aplikasi tampil dalam bahasa Indonesia
- [x] `git init` dilakukan; `.gitignore` mengecualikan `node_modules` dan `dist`
**Verifikasi:** verifikasi umum; `npm run dev` menampilkan halaman
**Ketergantungan:** tidak ada
**Berkas:** `package.json`, `vite.config.ts`, `tsconfig.json`, `eslint.config.js`, `src/main.tsx`, `src/App.tsx`
**Ukuran:** M

### - [x] T2: Model data dan katalog awal (selesai 2026-11-10, belum di-commit)
**Deskripsi:** Tipe proyek (dua papan, komponen, terminal, kabel), katalog untuk sumber 1 fasa, MCB 1 kutub, saklar tunggal, dan lampu, serta serialisasi JSON berversi.
**Catatan:** Posisi saklar/MCB (status komponen) belum ikut disimpan di berkas; diputuskan di T4 bersama mesin simulasi. Nilai listrik (impedansi) tidak ada di katalog, melainkan di perilaku `sim`.
**Kriteria terima:**
- [x] Proyek bisa diserialisasi lalu dibaca kembali dengan hasil identik
- [x] Berkas dengan versi tak dikenal atau bentuk rusak ditolak dengan pesan yang jelas
- [x] Tiap definisi katalog menyatakan terminal, ukuran, dan papan yang diizinkan
**Verifikasi:** `npm test -- src/core`
**Ketergantungan:** T1
**Berkas:** `src/core/types.ts`, `src/core/serialize.ts`, `src/core/catalog/*.ts`, tesnya
**Ukuran:** M

### - [x] T3: Solver analisis simpul (selesai 2026-11-10, belum di-commit)
**Deskripsi:** Aritmetika bilangan kompleks dan penyelesai sistem linear untuk jaringan impedansi dengan sumber tegangan fasor.
**Catatan:** Sumber dimodelkan sebagai simpul bertegangan tetap (termasuk acuan 0 V), bukan sumber tegangan di antara dua simpul bebas; ini cukup untuk sumber PLN yang netralnya dibumikan dan membuat solver lebih sederhana. Tegangan antar-fasa yang dihasilkan 398,4 V (230 × √3), di dalam toleransi ± 2 V spec.
**Kriteria terima:**
- [x] Pembagi tegangan dua resistor menghasilkan nilai teoretis (galat < 0,1%)
- [x] Sumber tiga fasa menghasilkan 230 V fasa-netral dan 400 V antar-fasa
- [x] Jaringan dengan simpul mengambang dan dengan hubung singkat tetap terselesaikan tanpa NaN
**Verifikasi:** `npm test -- src/sim/solver`
**Ketergantungan:** T1
**Berkas:** `src/sim/solver/complex.ts`, `src/sim/solver/nodal.ts`, tesnya
**Ukuran:** M

### - [x] T4: Penyusun jaringan dan putaran stabil (selesai 2026-11-10, belum di-commit)
**Deskripsi:** Mengubah proyek + status komponen menjadi jaringan untuk solver, menjalankan perilaku komponen, dan mengulang sampai status stabil.
**Catatan:** Posisi saklar dan tuas MCB tidak disimpan di berkas; saat berkas dibuka semua komponen mulai dari keadaan awal (saklar terbuka, MCB naik). Nilai acuan: lampu 60 W, MCB 10 A dengan trip seketika pada 5 × arus nominal, kabel 10 mΩ, kontak 1 mΩ (`src/sim/constants.ts`). MCB sudah trip saat hubung singkat; pesan ke pengguna menyusul di T8. Hubung singkat tanpa MCB di jalurnya belum ditangani (tidak ada yang memutus) — masuk T8.
**Kriteria terima:**
- [x] Berkas acuan `lampu-tunggal.json`: lampu bertegangan 230 V saat saklar tertutup, 0 V saat terbuka
- [x] Dua lampu seri masing-masing bertegangan 115 V
- [x] Rangkaian yang tidak pernah stabil berhenti pada batas iterasi dengan hasil "berosilasi"
**Verifikasi:** `npm test -- src/sim`
**Ketergantungan:** T2, T3
**Berkas:** `src/sim/network.ts`, `src/sim/simulate.ts`, `src/sim/behaviors/{switch,lamp,mcb}.ts`, `tests/fixtures/lampu-tunggal.json`
**Ukuran:** M

### Checkpoint A
- [x] Verifikasi umum lolos; cakupan `src/sim` dan `src/core` ≥ 90% (98%)
- [x] Rangkaian lampu disimulasikan benar dari berkas JSON

---

## Fase 2 — Irisan penerangan

### - [x] T5: Papan dan palet (selesai 2026-11-10, belum di-commit)
**Deskripsi:** Papan SVG bergrid dengan geser/zoom, palet berkelompok, dan drag and drop komponen.
**Catatan:** Logika sunting (tambah, pindah, putar, hapus) ada di `src/core/edit.ts` sebagai fungsi murni agar undo/redo di T9 mudah. Selain diseret, komponen bisa ditaruh dengan klik di palet (jatuh di tengah tampilan). Pintasan: R putar, Delete hapus, Esc lepas pilihan. Komponen boleh bertumpuk; belum ada pencegahan. Seret-pindah diverifikasi di browser, belum punya tes otomatis (menyusul di e2e T20).
**Kriteria terima:**
- [x] Komponen diseret dari palet ke papan dan mengunci ke grid
- [x] Komponen di papan bisa dipindah, diputar 90°, dan dihapus
- [x] Papan bisa digeser dan di-zoom tanpa menggeser posisi relatif komponen
**Verifikasi:** tes komponen palet/papan; coba di `npm run dev`
**Ketergantungan:** T2
**Berkas:** `src/editor/store.ts`, `src/editor/Board.tsx`, `src/editor/Palette.tsx`, `src/editor/ComponentView.tsx`
**Ukuran:** M

### - [x] T6: Pengkabelan (selesai 2026-11-10, belum di-commit)
**Deskripsi:** Membuat kabel dengan klik terminal asal lalu tujuan, titik belok, pilihan warna, pilih dan hapus.
**Catatan:** Kabel digambar lurus antar-titik; belokan dibuat pengguna (klik papan saat menarik kabel, atau seret pegangan tengah pada kabel terpilih; klik dua kali titik belok untuk menghapus). Kabel baru sengaja tidak otomatis terpilih, agar memilih warna untuk kabel berikutnya tidak mengubah kabel yang baru dipasang. Kabel ganda antara dua terminal yang sama ditolak. Seret titik belok diverifikasi lewat tes penyisipan, belum lewat seret sungguhan (e2e T20).
**Kriteria terima:**
- [x] Kabel terbentuk antara dua terminal dan mengikuti komponen yang dipindah
- [x] Warna default tersedia sesuai PUIL 2011 dan bisa diganti per kabel
- [x] Menghapus komponen ikut menghapus kabel yang menempel padanya
**Verifikasi:** tes komponen pengkabelan; coba di browser
**Ketergantungan:** T5
**Berkas:** `src/editor/WireLayer.tsx`, `src/editor/wiring.ts`, `src/editor/store.ts`
**Ukuran:** M

### - [x] T7: Beri tegangan
**Deskripsi:** Tombol "Beri tegangan"/"Matikan" yang menjalankan simulasi dan menampilkan hasilnya di papan.
**Kriteria terima:**
- [x] Saat bertegangan, saklar dan tuas MCB bisa diklik; lampu menyala sesuai tegangannya (redup bila seri)
- [x] Kabel bertegangan ditandai
- [x] Papan tidak bisa diubah selama bertegangan
**Verifikasi:** tes komponen; di browser merangkai sumber → MCB → saklar → lampu dan menyalakannya
**Ketergantungan:** T4, T6
**Berkas:** `src/editor/simView.ts`, `src/editor/store.ts`, `src/editor/Board.tsx`, `src/editor/Toolbar.tsx`, `src/editor/ComponentView.tsx`, `src/editor/WireLayer.tsx`, `src/editor/Palette.tsx`
**Ukuran:** M
**Catatan (selesai 2026-11-11, belum di-commit):** keadaan simulasi disimpan di store (`sim`, `simStates`), bukan hook terpisah; pembantu tampilan ada di `simView.ts`. Posisi saklar/MCB diingat saat tegangan dimatikan. Kabel ditandai bertegangan bila salah satu ujungnya > 50 V terhadap tanah. Kecerahan lampu = (V/230)²; di bawah 80% disebut redup. 154 tes lolos.

### - [x] T8: Hubung singkat dan komponen penerangan lengkap
**Deskripsi:** MCB trip saat hubung singkat dengan pesan penyebab; menambah saklar seri, saklar tukar, dan stop kontak.
**Kriteria terima:**
- [x] L disambung langsung ke N: MCB hulu trip dan pesan muncul; MCB bisa dinaikkan lagi setelah gangguan dilepas
- [x] Dua saklar tukar mengendalikan satu lampu dari dua tempat
- [x] Saklar seri mengendalikan dua lampu secara terpisah
**Verifikasi:** `npm test -- src/sim` dengan berkas acuan `saklar-tukar.json`, `hubung-singkat.json`
**Ketergantungan:** T7
**Berkas:** `src/core/catalog/{twoGangSwitch,twoWaySwitch,socket}.ts`, `src/sim/behaviors/mcb.ts`, `src/ui/Notice.tsx`, berkas acuan
**Ukuran:** M
**Catatan (selesai 2026-11-11, belum di-commit):** tipe baru `switch2gang`, `switch2way`, `socket`; stop kontak tanpa beban (tidak ada jalur arus). `SimResult.trips` mencatat MCB yang trip beserta arusnya; pesan disusun `faultNotice` di `src/editor/simView.ts` dan tampil lewat `src/ui/Notice.tsx`. Tambahan di luar kriteria: peringatan "hubung singkat tanpa pengaman" bila arus kabel ≥ 50 A dan tidak ada MCB yang memutus. Berkas acuan tambahan `saklar-seri.json`. 190 tes lolos.

### Checkpoint B
- [x] Kriteria sukses 1, 2, dan hubung singkat pada 6 terpenuhi di browser
- [x] Ditinjau pengguna sebelum lanjut (pengguna melanjutkan ke T9 pada 2026-11-11)

---

## Fase 3 — Simpan

### - [x] T9: Undo/redo, simpan otomatis, ekspor/impor
**Deskripsi:** Riwayat perubahan papan, simpan otomatis ke browser, ekspor/impor berkas `.json`, dan "Kosongkan papan" dengan konfirmasi.
**Kriteria terima:**
- [x] Undo/redo memulihkan penambahan, pemindahan, dan penghapusan komponen serta kabel
- [x] Papan tetap ada setelah halaman dimuat ulang
- [x] Ekspor lalu impor menghasilkan papan dan hasil simulasi identik; berkas rusak ditolak dengan pesan
**Verifikasi:** tes unit riwayat; tes komponen impor/ekspor
**Ketergantungan:** T8
**Berkas:** `src/editor/history.ts`, `src/editor/persistence.ts`, `src/editor/Toolbar.tsx`, `src/ui/ConfirmDialog.tsx`
**Ukuran:** M
**Catatan (selesai 2026-11-11, belum di-commit):** riwayat 100 langkah di store (`history`, fungsi murni di `history.ts`); satu seretan = satu langkah (`beginDrag`/`endDrag`); tindakan tanpa perubahan tidak dicatat. Simpan otomatis ke `localStorage` kunci `sim-instalasi-listrik:papan`, dimulai di `main.tsx`. Impor dan Kosongkan bisa diurungkan. Posisi saklar/MCB, tampilan (geser/zoom), dan riwayat tidak ikut tersimpan. Pada lebar 1280 px toolbar turun ke baris kedua. 213 tes lolos.

---

## Fase 4 — Dua papan

### - [x] T10: Dua papan dan panel X1
**Deskripsi:** Tab "Instalasi" dan "Dalam Panel", komponen panel listrik dengan terminal blok X1, penggabungan kedua papan dalam simulasi, palet tersaring per papan, dan panel setelan komponen.
**Kriteria terima:**
- [x] Kabel ke X1:n di satu papan tersambung secara listrik dengan X1:n di papan lain
- [x] Palet hanya menampilkan komponen yang diizinkan di papan aktif; klik dua kali panel membuka Dalam Panel
- [x] Jumlah dan label terminal X1 bisa disetel saat rangkaian mati
**Verifikasi:** `npm test -- src/sim` dengan berkas acuan lampu yang dipisah ke dua papan; coba di browser
**Ketergantungan:** T8
**Berkas:** `src/core/catalog/panel.ts`, `src/sim/network.ts`, `src/editor/BoardTabs.tsx`, `src/editor/SettingsPanel.tsx`, `src/editor/Palette.tsx`
**Ukuran:** M
**Catatan (selesai 2026-11-11, belum di-commit):** tipe baru `panel` (papan Instalasi) dan `terminalBlock` (papan Dalam Panel, dipasang/dihapus otomatis bersama panel, tidak ada di palet). Jumlah dan label X1 disimpan di `settings.x1Labels` pada kedua komponen dan selalu disamakan (`setX1Labels`); bawaan 8 terminal, batas 2-24, label maksimum 6 huruf. Bentuk komponen kini lewat `shapeOf(component)` di `src/core/geometry.ts`. Di `buildNetwork`, X1 bernomor sama adalah satu simpul. Format berkas tetap versi 1 (kolom `settings` opsional). Satu panel saja. Berkas acuan `lampu-dua-papan.json`. 261 tes lolos.

---

## Fase 5 — Kontrol motor

### - [x] T11: Sumber 3 fasa, kontaktor, tombol, lampu indikator
**Deskripsi:** Menambah sumber 3 fasa, MCB 3 kutub, kontaktor dengan kontak utama dan bantu, push button NO/NC, lampu indikator, dan setelan tegangan kumparan.
**Kriteria terima:**
- [x] Rangkaian pengunci: START menarik kontaktor dan tetap menarik setelah dilepas; STOP melepasnya
- [x] Kontaktor 230 V yang diberi 400 V ditandai terbakar; kontaktor 400 V yang diberi 230 V tidak menarik
- [x] Push button kembali ke posisi semula saat dilepas
**Verifikasi:** `npm test -- src/sim/behaviors`; berkas acuan `pengunci.json`
**Ketergantungan:** T10
**Berkas:** `src/core/catalog/{source3ph,mcb3p,contactor,pushButton,pilotLamp}.ts`, `src/sim/behaviors/contactor.ts`
**Ukuran:** M
**Catatan (selesai 2026-11-11, belum di-commit):** tipe baru `source3ph`, `mcb3p`, `contactor`, `pushButtonNO` (3-4), `pushButtonNC` (1-2), `pilotLamp` (X1-X2). Perilaku kini menerima setelan komponen (`elements(state, settings)`, `next(state, reading, settings)`). Kumparan: 8 VA, menarik pada >= 80% tegangan kerja, terbakar di atas 120%; tanpa histeresis. `SimResult.burns` mencatat kumparan yang terbakar; diganti lewat panel setelan. Push button ditekan selama ditahan (penunjuk atau Spasi/Enter); Shift+klik menguncinya. Mematikan tegangan melepas tombol dan menjatuhkan kontaktor. Tes perilaku di `src/sim/behaviors/control.test.ts`; berkas acuan `pengunci.json`. 320 tes lolos.

### - [x] T12: Motor tiga fasa
**Deskripsi:** Motor 6 terminal sebagai tiga belitan, dengan penentuan putar, arah, dan dengung, serta animasi putaran.
**Kriteria terima:**
- [x] Berkas acuan `dol.json`: motor berputar saat START, 400 V ± 3 V antar-fasa di terminal motor
- [x] Menukar dua fasa membalik arah putar
- [x] Kehilangan satu fasa: motor mendengung dan tidak berputar
**Verifikasi:** `npm test -- src/sim`; coba DOL di browser pada dua papan
**Ketergantungan:** T11
**Berkas:** `src/core/catalog/motor.ts`, `src/sim/behaviors/motor.ts`, `src/editor/MotorView.tsx`, `tests/fixtures/dol.json`
**Ukuran:** M
**Catatan (selesai 2026-11-11, belum di-commit):** motor = tiga belitan 87 ohm, pf 0,82 (setara ~4 kW, belitan 400 V). Putar/arah/dengung dari komponen simetris tegangan belitan: berputar bila urutan dominan >= 150 V dan urutan lawan <= 30%; kanan (`cw`) untuk L1-L2-L3 di U1-V1-W1. Kotak terminal U1 V1 W1 / W2 U2 V2. Arus start tidak dimodelkan (impedansi tetap). Keputusan pengguna 2026-11-11: toleransi tegangan antar-fasa di terminal motor dilonggarkan dari ± 2 V menjadi ± 3 V (SPEC kriteria 3 dan 5), karena sumber 230 V fasa-netral memberi 398,4 V antar-fasa dan terbaca 397,8 V di motor. Berkas acuan `dol.json`.

### - [x] T13: TOR dan waktu simulasi
**Deskripsi:** Detak waktu simulasi, TOR dengan kontak 95-96/97-98 yang trip setelah arus lebih bertahan, serta setelan arus MCB dan TOR.
**Kriteria terima:**
- [x] Motor kehilangan satu fasa: TOR trip setelah waktu tunda dan memutus rangkaian kontrol
- [x] TOR bisa di-reset setelah trip
- [x] Arus nominal MCB dan arus setelan TOR bisa diubah saat rangkaian mati
**Verifikasi:** `npm test -- src/sim` dengan waktu tiruan
**Ketergantungan:** T12
**Berkas:** `src/core/catalog/overloadRelay.ts`, `src/sim/behaviors/overloadRelay.ts`, `src/sim/clock.ts`, `src/editor/useSimulation.ts`
**Ukuran:** M
**Catatan (selesai 2026-11-11, belum di-commit):** tipe baru `overloadRelay` (Dalam Panel). Waktu simulasi: `advance(project, result, detik)` di `src/sim/clock.ts`, dipanggil tiap 0,2 s oleh `useSimulationClock` selama bertegangan; perilaku bergantung waktu memakai `tick`. TOR: memanas di atas 110% setelan dengan waktu trip 20 s / (I/Iset)^2; peka kehilangan fasa (trip 3 s bila satu fasa < 50% fasa terbesar); mendingin dalam 10 s; jalur utama tidak diputus, 95-96 membuka dan 97-98 menutup. Karena belitan motor berimpedansi tetap, arus saat kehilangan fasa justru lebih kecil dari arus normal, sehingga trip pada kasus itu datang dari kepekaan kehilangan fasa, bukan dari arus lebih. Setelan: `mcbAmps` (1-32 A, trip seketika 5x) dan `torAmps` (0,5-32 A, bawaan 8 A). Berkas acuan `dol-tor.json`. 375 tes lolos.

### - [x] T14: Timer dan star-delta
**Deskripsi:** Timer on-delay dengan kontak 15-16-18 dan setelan waktu; berkas acuan forward-reverse dan star-delta.
**Kriteria terima:**
- [x] `star-delta.json`: 230 V per belitan saat bintang, 400 V ± 3 V setelah waktu timer; arus saluran bintang sepertiga segitiga (± 5%)
- [x] `forward-reverse.json`: arah berlawanan pada kontaktor kedua; dengan interlock kedua kontaktor tak pernah menarik bersamaan
- [x] Tanpa interlock dan kedua tombol ditekan: hubung singkat antar-fasa, MCB trip
**Verifikasi:** `npm test -- src/sim`
**Ketergantungan:** T12, T13
**Berkas:** `src/core/catalog/timer.ts`, `src/sim/behaviors/timer.ts`, `tests/fixtures/{star-delta,forward-reverse}.json`
**Ukuran:** M
**Catatan (selesai 2026-11-11, belum di-commit):** tipe baru `timer` (Dalam Panel; A1-A2, 15-16 NC, 15-18 NO). Setelan `timerSeconds` (1-60 s, bawaan 5 s) dan `coilVolts`. Timer menghitung lewat `tick` selama kumparan >= 80% tegangan kerjanya dan kembali ke awal begitu tegangan hilang; kumparan timer tidak dimodelkan terbakar. Berkas acuan `star-delta.json` (k1 utama, k2 bintang, k3 segitiga, t1 timer; X1 10 terminal) dan `forward-reverse.json` (k1 maju, k2 mundur), keduanya dengan kabel siku. Tes "tanpa interlock" menjembatani kontak 21-22 kedua kontaktor. Keterbatasan: semua komponen memperbarui keadaan serentak tiap putaran, jadi dua kumparan yang mendapat tegangan pada saat yang persis sama (mis. dua tombol arah dikunci lalu STOP dilepas) menarik bersamaan walau ada interlock listrik. 407 tes lolos.

### Checkpoint C
- [ ] Kriteria sukses 3, 4, 5, 6, 8, 11, 12 terpenuhi
- [ ] Ditinjau pengguna: keterbacaan kabel pada star-delta dan kejelasan sambungan X1

---

## Fase 6 — Alat ukur

### - [x] T15: Multimeter
**Deskripsi:** Multimeter dengan dua probe yang diseret ke terminal, mode V AC dan kontinuitas/Ω.
**Kriteria terima:**
- [x] V AC menampilkan tegangan antar-probe sesuai hasil simulasi
- [x] Kontinuitas/Ω bekerja saat rangkaian mati; saat bertegangan menampilkan peringatan, bukan angka
- [x] X1 bernomor sama di kedua papan terbaca sama
**Verifikasi:** `npm test -- src/instruments`; tes komponen
**Ketergantungan:** T7 (lengkap setelah T10)
**Berkas:** `src/instruments/multimeter.ts`, `src/instruments/Multimeter.tsx`, `src/sim/continuity.ts`
**Ukuran:** M
**Catatan (selesai 2026-11-11, belum di-commit; dicoba di browser bersama T16):** logika ukur ada di `src/instruments/meterReading.ts` (bukan `multimeter.ts`, karena bentrok huruf besar-kecil dengan `Multimeter.tsx` di Windows). `resistanceBetween` di `src/sim/continuity.ts`: sumber dianggap terbuka, tiap elemen dipakai bagian resistifnya (arus searah), putus bila >= 1 MOhm; tersambung bila < 50 Ohm. Multimeter dibuka dari kelompok Alat Ukur di palet, tidak ikut tersimpan di berkas. Probe: klik lalu klik terminal, seret ke terminal, atau Enter; Esc batal; probe boleh menempel di papan berbeda. 442 tes lolos.

### - [x] T16: Tang ampere
**Deskripsi:** Tang ampere yang dijepitkan ke satu kabel dan menampilkan arusnya.
**Kriteria terima:**
- [x] Arus kabel tampil sesuai hasil simulasi; 0 A saat rangkaian mati
- [x] Pada `star-delta.json` bacaan bintang sepertiga bacaan segitiga (± 5%)
**Verifikasi:** `npm test -- src/instruments`
**Ketergantungan:** T14, T15
**Berkas:** `src/instruments/clampMeter.ts`, `src/instruments/ClampMeter.tsx`
**Ukuran:** S
**Catatan (selesai 2026-11-11, belum di-commit):** logika di `src/instruments/clampReading.ts` (bukan `clampMeter.ts`, alasan sama dengan T15); panel dan gambar rahang di `ClampMeter.tsx`. Menampilkan besar arus efektif kabel (2 desimal), 0 A saat mati. Dijepitkan dengan klik tombol lalu klik kabel, seret ke kabel, atau Enter; Esc batal. Kedua alat ukur ditumpuk di kanan-bawah papan. Di browser pada `star-delta.json`, kabel i2: bintang 2,64 A, segitiga 7,92 A; multimeter U1-U2: 229,8 V lalu 397,9 V. 460 tes lolos.

### - [x] T17: Tespen
**Deskripsi:** Tespen yang disentuhkan ke satu terminal.
**Kriteria terima:**
- [x] Menyala di terminal fasa bertegangan; mati di netral, PE, dan saat rangkaian mati
**Verifikasi:** `npm test -- src/instruments`
**Ketergantungan:** T15
**Berkas:** `src/instruments/tester.ts`, `src/instruments/Tester.tsx`
**Ukuran:** S
**Catatan (selesai 2026-11-11, belum di-commit):** logika di `src/instruments/testerReading.ts`, panel dan gambar di `Tester.tsx`. Menyala bila tegangan terminal terhadap acuan 0 V > 50 V. Cara membawa alat (klik lalu klik sasaran, seret, Enter, Esc) disatukan di `usePicking.ts` dan dipakai ketiga alat ukur; hanya satu alat dibawa pada satu waktu. Dicoba di browser pada `lampu-tunggal.json`: padam saat mati, menyala di L dan setelah MCB, padam di N. Tiga panel alat ukur yang dibuka bersamaan memakan hampir seluruh tinggi papan pada layar pendek; perapian diusulkan ikut T18. 473 tes lolos.

---

## Fase 7 — Perampungan

### - [x] T18: Gambar piktorial
**Deskripsi:** Mengganti gambar sederhana tiap komponen dengan gambar SVG menyerupai alat aslinya, termasuk keadaan (tuas MCB, kontaktor menarik, lampu menyala, kumparan terbakar).
**Kriteria terima:**
- [x] Setiap komponen di tabel F1 punya gambar piktorial dengan label terminal terbaca pada zoom 100%
- [x] Setiap keadaan komponen terbedakan secara visual
- [x] Letak terminal tidak berubah, sehingga berkas simpan lama tetap terbuka benar
**Verifikasi:** tinjauan visual pengguna; semua tes berkas acuan tetap lolos
**Ketergantungan:** T14, T17
**Berkas:** `src/editor/art/*.tsx` (dikerjakan per kelompok komponen, ≤ 5 berkas per sesi)
**Ukuran:** L — dipecah per kelompok: proteksi, penerangan, kontrol, beban/sumber/panel, alat ukur
**Kemajuan (selesai 2026-11-11, belum di-commit; menunggu tinjauan visual pengguna):**
- [x] Kerangka: `src/editor/art/` (`artOf`, `artTransform`); `ComponentView` memakai gambar bila ada, selain itu kotak berlabel. Gambar digambar tidak diputar lalu diputar sepadan dengan `rotatePoint`; letak terminal tetap dari katalog.
- [x] Proteksi: MCB 1 kutub, MCB 3 kutub (tuas atas/tengah/bawah, jendela ON merah / OFF hijau / TRIP jingga, tulisan C<arus>), TOR (tombol setelan arus, RESET, jendela NORMAL / PANAS n% / TRIP).
- [x] Penerangan: saklar tunggal dan seri (tuas jungkit, separuh bawah hijau "ON"), saklar tukar (separuh biru 1/2 dan lengan kontak putus-putus), stop kontak berpembumian, lampu pijar pada fiting (nyala sebanding daya). Rotasi 90/180/270 dilihat di browser: gambar dan terminal sejajar.
- [x] Kontrol: kontaktor (tanda tiap kontak lurus/miring, kumparan, jendela ON hijau / OFF abu / TERBAKAR merah, tulisan tegangan kumparan), push button (hijau NO, merah NC, mengecil berbingkai kuning saat ditekan), lampu indikator (lensa menyala), timer (tombol putar waktu, layar hitungan, klem 16/18 yang tersambung berwarna kuning). Dilihat di browser pada `star-delta.json` bertegangan.
- [x] Beban/sumber/panel: motor (rumah bersirip, papan terminal atas-bawah, rotor dari `MotorView`), sumber 1 fasa dan 3 fasa (lambang AC, tegangan), panel listrik (pintu, tanda bahaya listrik, petunjuk "Klik 2x untuk membuka", klem X1), terminal blok X1 (blok pada rel). Semua jenis komponen kini punya gambar; kode kotak berlabel lama di `ComponentView` dibuang.
- [x] Perapian: petunjuk keadaan dipindah dari toolbar ke samping tab papan (`StatusLine.tsx`, satu baris, terpotong dengan elipsis), sehingga tinggi kepala aplikasi tetap 47 px saat tegangan diberikan; jarak toolbar dirapatkan sehingga satu baris pada 1280 px (sisa 88 px). Panel alat ukur berjajar di tepi bawah papan: tiga panel setinggi 234 px, sebelumnya sekitar 450 px.
- Catatan: kabel digambar di atas badan komponen, jadi kabel lurus yang melintasi komponen menutupi gambarnya (terlihat pada `dol-tor.json`).

### - [x] T19: Kinerja
**Deskripsi:** Mengukur dan memperbaiki kinerja pada papan besar.
**Kriteria terima:**
- [ ] Papan 40 komponen/120 kabel: menyeret ≥ 50 fps
- [x] Hasil simulasi muncul ≤ 100 ms setelah saklar dioperasikan
**Verifikasi:** tes tolok ukur solver; pengukuran di panel Performance browser
**Ketergantungan:** T18
**Berkas:** `tests/fixtures/papan-besar.json`, `src/sim/simulate.bench.ts`, berkas yang perlu dioptimalkan
**Ukuran:** S
**Catatan (selesai 2026-11-11, belum di-commit):** `papan-besar.json` = lima starter DOL dengan TOR dan lampu indikator, 40 komponen dan 142 kabel. Solver tidak perlu diubah: tolok ukur (`npm run bench`) memberi sekitar 3 ms untuk memberi tegangan dan 10 ms untuk menekan START motor kelima; `src/sim/performance.test.ts` menjaga tiap hitungan di bawah 100 ms. Di browser (build dev) menekan tombol sampai tergambar: median 34 ms, terburuk 51 ms. Seret: papan dipecah menjadi bagian ber-memo (`BoardParts.tsx`, `WireView`) dengan penangan beridentitas tetap, sehingga hanya komponen yang diseret dan kabelnya yang digambar ulang; biaya skrip+tata letak per gerakan di papan Dalam Panel (33 komponen termasuk X1, 108 kabel) turun dari median 34,8 ms menjadi 6,4 ms (p95 22,9 ms), papan Instalasi 4,2 ms. Kriteria ">= 50 fps" belum dicentang: panel Browser berjalan di latar belakang sehingga frame per detik tidak bisa diukur langsung; yang diukur adalah biaya per gerakan, di bawah 16,7 ms pada median. Perlu dipastikan di panel Performance browser pada laptop lab. 476 tes lolos.

### - [ ] T20: Tes end-to-end dan GitHub Pages
**Deskripsi:** Skenario Playwright untuk alur utama dan alur kerja pemasangan ke GitHub Pages.
**Kriteria terima:**
- [x] Skenario e2e: merangkai lampu dari papan kosong, memberi tegangan, mengukur 230 V; memuat `dol.json` dan menjalankan motor
- [ ] Push ke `main` memasang aplikasi ke Pages tanpa langkah manual
- [ ] Aplikasi terbuka dari tautan Pages dan berfungsi penuh
**Verifikasi:** `npm run e2e`; membuka tautan Pages
**Ketergantungan:** T19; nama repositori dan izin push dari pengguna
**Berkas:** `e2e/*.spec.ts`, `.github/workflows/deploy.yml`, `vite.config.ts`, `README.md`
**Ukuran:** M

### Checkpoint D
- [ ] Seluruh 12 kriteria sukses di spec terpenuhi
- [ ] Aplikasi terbuka dari tautan GitHub Pages
**Kemajuan (2026-11-11, belum di-commit):** enam skenario Playwright lolos (`npm run e2e`): merangkai lampu dan stop kontak dari papan kosong lalu mengukur 230 V dan memuat ulang halaman; hubung singkat -> MCB trip; menyeret komponen dengan tetikus; memuat `dol.json`, START, 400 V, STOP; berkas bukan papan ditolak; halaman terbuka. Tes e2e menemukan cacat dari T18: kelas CSS `art` pada kotak badan komponen ikut terkena `.art { pointer-events: none }`, sehingga komponen tidak bisa diklik atau diseret dengan tetikus sungguhan; diperbaiki dengan mengganti kelasnya menjadi `frame`. `.github/workflows/deploy.yml` dan `README.md` sudah ditulis tetapi belum pernah dijalankan: repositori belum ada, tidak ada push. Sisa: nama akun/repositori dan izin push dari pengguna; menyetel sumber Pages ke "GitHub Actions"; membuka tautan Pages.
