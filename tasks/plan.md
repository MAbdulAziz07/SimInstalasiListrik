# Rencana Implementasi: Simulator Papan Instalasi Kelistrikan

Status: DISETUJUI pengguna pada 2026-11-10. Acuan: `../SPEC.md` (disetujui 2026-11-10). Daftar tugas rinci: `todo.md`.

## Ringkasan

Aplikasi dibangun sebagai irisan vertikal: tiap fase menghasilkan sesuatu yang bisa dicoba di browser. Irisan pertama adalah rangkaian paling sederhana (sumber → MCB → saklar → lampu) dari mesin simulasi sampai antarmuka. Setelah itu berturut-turut: simpan/muat, dua papan kerja, kontrol motor, alat ukur, lalu perampungan dan pemasangan ke GitHub Pages.

Lingkungan sudah diperiksa: Node 22.17, npm 11.4, git 2.38 tersedia. Folder proyek baru berisi `SPEC.md` saja.

## Keputusan Arsitektur

- **Solver lebih dulu.** Analisis simpul bilangan kompleks adalah bagian paling berisiko, jadi dibangun dan diuji pada tugas ke-3, sebelum ada antarmuka. Bila pendekatan ini gagal, kegagalannya terlihat dini.
- **`core` dan `sim` TypeScript murni.** Seluruh perilaku listrik diuji dengan Vitest tanpa browser. Antarmuka hanya menampilkan hasil `sim`.
- **Katalog + perilaku per komponen.** Menambah komponen berarti menambah satu definisi katalog dan satu berkas perilaku; solver tidak disentuh. Ini membuat fase kontrol motor berupa penambahan, bukan perombakan.
- **Dua papan sejak model data.** Tipe proyek memuat dua papan sejak tugas ke-2 (papan Dalam Panel kosong dulu), sehingga format berkas simpan tidak berubah saat fitur dua papan muncul di fase 4.
- **Rangkaian acuan sebagai berkas JSON.** Tiap rangkaian pada kriteria sukses punya berkas di `tests/fixtures` yang dipakai tes simulasi dan tes end-to-end.
- **Gambar piktorial belakangan.** Fase awal memakai gambar sederhana (kotak berlabel dengan terminal). Gambar menyerupai alat asli dikerjakan dalam satu tugas khusus di fase 7, setelah ukuran dan letak terminal tiap komponen stabil.

## Graf Ketergantungan

```
T1 kerangka proyek
 └─ T2 core (tipe, katalog awal, serialisasi)
     ├─ T3 solver ─ T4 jaringan + putaran stabil ─┐
     └─ T5 papan + palet ─ T6 pengkabelan ────────┴─ T7 beri tegangan
                                                      └─ T8 hubung singkat + penerangan lengkap
                                                          ├─ T9 simpan/muat/undo
                                                          └─ T10 dua papan + panel X1
                                                              └─ T11 kontaktor + tombol
                                                                  └─ T12 motor
                                                                      ├─ T13 TOR + waktu
                                                                      └─ T14 timer + star-delta
 T7 ─ T15 multimeter ─ T16 tang ampere, T17 tespen
 semua ─ T18 gambar piktorial ─ T19 kinerja ─ T20 e2e + GitHub Pages
```

T3–T4 (simulasi) dan T5–T6 (editor) saling bebas dan bisa dikerjakan paralel.

## Daftar Tugas

### Fase 1 — Fondasi
- [x] T1: Kerangka proyek
- [x] T2: Model data dan katalog awal
- [x] T3: Solver analisis simpul
- [x] T4: Penyusun jaringan dan putaran stabil

### Checkpoint A
- [x] Rangkaian lampu dari berkas JSON menghasilkan 230 V di lampu, tanpa antarmuka

### Fase 2 — Irisan penerangan
- [x] T5: Papan dan palet
- [x] T6: Pengkabelan
- [x] T7: Beri tegangan
- [x] T8: Hubung singkat dan komponen penerangan lengkap

### Checkpoint B
- [x] Kriteria sukses 1, 2, dan bagian hubung singkat dari 6 terpenuhi di browser — ditinjau pengguna

### Fase 3 — Simpan
- [x] T9: Undo/redo, simpan otomatis, ekspor/impor

### Fase 4 — Dua papan
- [x] T10: Dua papan dan panel X1

### Fase 5 — Kontrol motor
- [x] T11: Sumber 3 fasa, kontaktor, tombol, lampu indikator
- [x] T12: Motor tiga fasa
- [x] T13: TOR dan waktu simulasi
- [x] T14: Timer dan star-delta

### Checkpoint C
- [ ] Kriteria sukses 3, 4, 5, 6, 8, 11, 12 terpenuhi — ditinjau pengguna

### Fase 6 — Alat ukur
- [x] T15: Multimeter
- [x] T16: Tang ampere
- [x] T17: Tespen

### Fase 7 — Perampungan
- [x] T18: Gambar piktorial
- [x] T19: Kinerja
- [x] T20: Tes end-to-end dan GitHub Pages

### Checkpoint D
- [ ] Seluruh 12 kriteria sukses terpenuhi; aplikasi terbuka dari tautan Pages

## Risiko dan Mitigasi

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Solver tidak stabil pada simpul mengambang atau hubung singkat (matriks singular, angka tak wajar) | Tinggi | Dibangun di T3 dengan tes khusus kasus itu; konduktansi bocor ke tanah dan resistansi kabel kecil menjaga matriks tetap terselesaikan |
| Rangkaian berosilasi (kontaktor memutus kumparannya sendiri) membuat putaran tak berhenti | Sedang | Batas iterasi di T4; bila terlampaui simulasi berhenti dengan pesan |
| Model motor terlalu sederhana sehingga angka star-delta tidak cocok dengan kriteria (arus sepertiga) | Sedang | Belitan dimodelkan sebagai tiga impedansi tetap; rasio sepertiga adalah sifat rangkaian itu sendiri dan diuji di T12/T14 |
| Kabel menumpuk dan sulit dibaca pada rangkaian star-delta | Sedang | Titik belok dan warna kabel di T6; sorot kabel saat disentuh; dinilai ulang di Checkpoint C |
| Sambungan X1 dua papan membingungkan peserta | Sedang | Label terminal, klik dua kali panel untuk masuk; ditinjau pengguna di Checkpoint C |
| Gambar piktorial memakan waktu lama | Sedang | Dipisah ke T18; aplikasi sudah berfungsi penuh sebelum itu |
| Kinerja turun pada 40 komponen/120 kabel | Rendah | Simulasi hanya dihitung ulang saat ada perubahan atau detak waktu; diukur di T19 |

## Pertanyaan Terbuka

1. **Repositori GitHub.** Nama akun dan repositori dibutuhkan paling lambat di T20. Tidak ada push sebelum Anda mengizinkan.
2. **Git lokal.** T1 menjalankan `git init` di folder proyek. Apakah saya boleh membuat commit lokal di akhir tiap tugas, atau Anda ingin meninjau dulu sebelum tiap commit?
