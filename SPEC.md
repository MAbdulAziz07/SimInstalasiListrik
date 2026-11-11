# Spec: Simulator Papan Instalasi Kelistrikan

Status: DISETUJUI pengguna pada 2026-11-10. Rencana: `tasks/plan.md`, daftar tugas: `tasks/todo.md`.

## Objective

Aplikasi web tempat peserta pelatihan berlatih instalasi kelistrikan pada papan (board) virtual: memilih peralatan, menaruhnya di papan dengan drag and drop, menyambung terminal dengan kabel, lalu memberi tegangan untuk melihat rangkaian bekerja dan mengukurnya dengan alat ukur virtual.

**Pengguna:** peserta pelatihan (guru/siswa SMK bidang kelistrikan dan pendingin) dan widyaiswara yang mendemonstrasikan rangkaian di kelas.

**Mengapa:** peserta bisa mencoba dan salah merangkai tanpa risiko sengatan, tanpa merusak komponen, dan tanpa menunggu giliran papan praktik fisik.

**Lingkup instalasi yang harus bisa dirangkai di versi 1:**

| Jenis | Rangkaian yang harus bisa dibuat dan bekerja |
|---|---|
| Penerangan | MCB → saklar tunggal/seri/tukar → lampu; stop kontak |
| Panel kontrol | MCB → kontaktor → motor, dengan push button dan lampu indikator |
| Motor tiga fasa | Peserta menaruh motor di papan dan menyambungkannya ke keluaran panel; rangkaian DOL (start langsung), forward-reverse, star-delta |

**Keputusan yang sudah diambil pengguna:**

- Platform: aplikasi web mandiri, dibuka lewat browser.
- Simulasi hidup dengan alat ukur virtual.
- Mode: papan bebas saja. Tidak ada job sheet, penilaian, akun, atau panel gambar rangkaian acuan.
- Komponen digambar piktorial, menyerupai alat aslinya, dengan label terminal yang terbaca.
- Dipasang di GitHub (GitHub Pages) dan dibuka lewat tautan.
- Dua papan kerja: "Instalasi" (keseluruhan) dan "Dalam Panel" (internal panel).
- Tegangan kumparan 230 V atau 400 V AC; tidak ada 24 V.

### Fitur

**F1 — Palet peralatan.** Panel samping berisi komponen, dikelompokkan: Sumber, Panel, Proteksi, Penerangan, Kontrol, Beban, Alat Ukur. Palet hanya menampilkan komponen yang boleh dipasang di papan yang sedang dibuka (kolom "Papan").

| Kelompok | Komponen (terminal) | Papan |
|---|---|---|
| Sumber | Sumber 1 fasa 230 V (L, N, PE); sumber 3 fasa 400/230 V 50 Hz (L1, L2, L3, N, PE) | Instalasi |
| Panel | Panel listrik (terminal blok X1, jumlah terminal bisa disetel) | Instalasi |
| Proteksi | MCB 1 kutub; MCB 3 kutub | Keduanya |
| Proteksi | TOR / thermal overload relay (utama 3 kutub, 95-96 NC, 97-98 NO) | Dalam Panel |
| Penerangan | Saklar tunggal; saklar seri; saklar tukar; stop kontak (L, N, PE); fitting + lampu | Instalasi |
| Kontrol | Kontaktor (A1-A2, utama 1-2/3-4/5-6, bantu 13-14 NO, 21-22 NC); timer on-delay (A1-A2, 15-16-18) | Dalam Panel |
| Kontrol | Push button NO; push button NC; lampu indikator | Keduanya |
| Beban | Motor induksi 3 fasa 6 terminal (U1, V1, W1, U2, V2, W2) | Instalasi |
| Alat ukur | Multimeter (V AC, kontinuitas/Ω); tang ampere; tespen | Keduanya |

**F2 — Dua papan kerja.** Aplikasi punya dua papan yang dipilih lewat tab:

- **Instalasi** — gambaran keseluruhan: sumber, panel listrik sebagai satu kotak, motor, lampu, saklar, stop kontak, dan kabel di antaranya.
- **Dalam Panel** — isi panel: MCB, kontaktor, TOR, timer, push button, lampu indikator, dan pengawatan di antaranya.

Kedua papan dihubungkan oleh **terminal blok X1**. Di papan Instalasi terminal itu tampak pada kotak panel; di papan Dalam Panel terminal yang sama tampak sebagai deretan terminal blok. Kabel yang disambung ke X1:3 di satu papan tersambung secara listrik dengan X1:3 di papan lain. Tiap terminal bisa diberi label (mis. L1, U1). Klik dua kali kotak panel di papan Instalasi membuka papan Dalam Panel.

Versi 1 mendukung satu panel. Simulasi berjalan atas kedua papan sekaligus sebagai satu rangkaian; status bertegangan berlaku untuk keduanya. Instalasi penerangan sederhana bisa dirangkai seluruhnya di papan Instalasi tanpa panel.

Di tiap papan, komponen diseret dari palet, bisa dipindah, diputar 90°, dan dihapus. Posisi mengunci ke grid. Papan bisa digeser dan di-zoom.

**F3 — Pengkabelan.** Klik terminal asal lalu terminal tujuan untuk membuat kabel. Kabel bisa diberi titik belok, dipilih, dan dihapus. Warna kabel dipilih pengguna; pilihan default mengikuti PUIL 2011 (L1 cokelat, L2 hitam, L3 abu-abu, N biru, PE hijau-kuning). Satu terminal boleh menerima lebih dari satu kabel. Aplikasi tidak memaksa warna yang benar.

**F4 — Simulasi hidup.** Tombol "Beri tegangan" / "Matikan". Saat bertegangan:

- Saklar, push button, dan tuas MCB bisa diklik untuk dioperasikan.
- Lampu menyala sesuai tegangannya (redup bila terpasang seri).
- Kumparan kontaktor yang bertegangan menarik kontak utama dan bantu; timer mengubah kontak setelah waktu setelannya.
- Motor berputar bila ketiga fasa masuk dengan hubungan belitan yang sah; arah putar mengikuti urutan fasa; motor mendengung dan tidak berputar bila kehilangan satu fasa.
- Hubung singkat membuat MCB hulu trip dan muncul pesan penyebabnya. Arus lebih yang berlangsung lama membuat TOR trip.
- Kabel yang bertegangan ditandai secara visual.
- Papan tidak bisa diubah (tambah/hapus komponen dan kabel) selama bertegangan.

**F5 — Alat ukur.**

- Multimeter: dua probe diseret ke terminal. Mode V AC menampilkan tegangan antar-probe. Mode kontinuitas/Ω hanya bekerja saat rangkaian mati; bila dipakai saat bertegangan muncul peringatan.
- Tang ampere: dijepitkan ke satu kabel, menampilkan arus AC kabel itu. Arus start motor dalam hubungan bintang terbaca kira-kira sepertiga arus start segitiga.
- Tespen: disentuhkan ke satu terminal, menyala bila terminal bertegangan terhadap tanah.

**F7 — Setelan komponen.** Memilih komponen di papan membuka panel setelan (hanya saat rangkaian mati):

- Kontaktor dan timer: tegangan kumparan 230 V AC atau 400 V AC (default 230 V AC). Kumparan yang diberi tegangan jauh di bawah nilainya tidak menarik; yang diberi tegangan jauh di atas nilainya rusak dan ditandai terbakar sampai diganti.
- Timer: waktu tunda.
- MCB: arus nominal. TOR: arus setelan.
- Panel listrik: jumlah terminal X1 dan label tiap terminal.

**F6 — Simpan dan muat.** Papan tersimpan otomatis di browser. Papan bisa diekspor ke berkas `.json` dan diimpor kembali. Ada undo/redo dan tombol "Kosongkan papan" dengan konfirmasi.

### Di luar lingkup versi 1

Job sheet dan penilaian otomatis; akun, login, dan server; rekap nilai; layar sentuh/HP; perhitungan penampang kabel dan rugi tegangan; motor 1 fasa; ELCB/RCCB; PLC dan inverter; tampilan 3D.

## Tech Stack

- TypeScript 5 (strict), React 19, Vite 7 — aplikasi satu halaman, hasil build statis, tanpa backend.
- Hosting: GitHub Pages. Build memakai jalur relatif (`base: './'`) dan dipasang otomatis oleh GitHub Actions setiap ada perubahan di cabang `main`.
- Papan digambar dengan SVG (tanpa pustaka kanvas tambahan).
- Zustand untuk state papan; undo/redo sebagai riwayat snapshot.
- Vitest + Testing Library untuk unit/komponen; Playwright untuk end-to-end.
- ESLint + Prettier.
- Target: Chrome dan Edge versi terbaru di laptop/PC, layar minimal 1366×768, mouse dan keyboard.
- Antarmuka berbahasa Indonesia.

Versi pasti dikunci di `package.json` saat proyek dibuat.

## Arsitektur

Empat modul di dalam satu aplikasi. Panah ketergantungan satu arah; `core` dan `sim` tidak mengenal React.

| Modul | Tanggung jawab | Bergantung pada |
|---|---|---|
| `core` | Tipe data proyek (dua papan, komponen, terminal, kabel, terminal blok penghubung), katalog komponen, serialisasi JSON | — |
| `sim` | Mesin simulasi: dari papan + status saklar menjadi tegangan, arus, dan status tiap komponen | `core` |
| `editor` | Palet, papan SVG, drag and drop, pengkabelan, undo/redo, simpan/muat | `core` |
| `instruments` | Multimeter, tang ampere, dan tespen; membaca hasil `sim` | `core`, `sim` |

Urutan bangun: `core` → `sim` dan `editor` (paralel) → `instruments`.

### Model simulasi

Simulasi bukan sekadar pencocokan sambungan, karena multimeter harus menampilkan angka yang masuk akal.

0. **Penggabungan papan.** Kedua papan digabung menjadi satu jaringan; terminal X1 bernomor sama di kedua papan adalah satu simpul.
1. **Jaringan.** Tiap kabel dan tiap kontak tertutup menjadi resistansi sangat kecil; tiap beban (lampu, kumparan, belitan motor) menjadi impedansi; tiap sumber menjadi sumber tegangan fasor (L1 0°, L2 −120°, L3 +120°, 230 V ke netral).
2. **Penyelesaian.** Analisis simpul (nodal) dengan bilangan kompleks menghasilkan tegangan tiap terminal dan arus tiap cabang. Simpul mengambang diberi konduktansi bocor kecil ke tanah agar matriks selalu terselesaikan.
3. **Perilaku komponen.** Dari hasil itu tiap komponen menentukan status barunya: kumparan menarik di atas ambang tegangan, MCB trip seketika di atas arus hubung singkat, TOR trip setelah arus lebih bertahan, timer menghitung, motor menentukan putar/arah/dengung.
4. **Putaran.** Langkah 1–3 diulang sampai status stabil, lalu diulang lagi tiap detak waktu (untuk timer dan TOR) dan tiap kali pengguna mengoperasikan sesuatu. Bila status tidak stabil setelah batas iterasi (rangkaian berosilasi), simulasi berhenti dan memberi pesan.

Nilai impedansi adalah nilai tipikal untuk pembelajaran, bukan data pabrikan.

## Commands

```
Dev:        npm run dev
Build:      npm run build
Pratinjau:  npm run preview
Test:       npm test
Coverage:   npm test -- --coverage
E2E:        npm run e2e
Lint:       npm run lint
Typecheck:  npm run typecheck
Format:     npm run format
```

Pemasangan ke GitHub Pages dijalankan oleh `.github/workflows/deploy.yml` saat ada push ke `main`; tidak ada perintah deploy manual.

## Project Structure

```
SimInstalasiListrik/
  SPEC.md
  .github/workflows/deploy.yml  → build + pasang ke GitHub Pages
  src/
    core/           → tipe papan, katalog komponen, serialisasi
      catalog/      → satu berkas definisi per komponen
    sim/            → mesin simulasi (TypeScript murni)
      solver/       → analisis simpul bilangan kompleks
      behaviors/    → perilaku per komponen (kontaktor, MCB, TOR, timer, motor)
    editor/         → palet, papan SVG, kabel, undo/redo, simpan/muat
    instruments/    → multimeter, tang ampere, tespen
    ui/             → komponen antarmuka umum (tombol, dialog, toolbar)
    App.tsx
    main.tsx
  tests/
    fixtures/       → papan contoh .json (penerangan, DOL, forward-reverse, star-delta)
  e2e/              → skenario Playwright
  public/
```

Tes unit berada di samping berkas sumbernya (`*.test.ts`).

## Code Style

- Nama kode (variabel, fungsi, tipe, berkas) berbahasa Inggris; semua teks yang tampil ke pengguna berbahasa Indonesia.
- Komponen React fungsi + hooks; berkas komponen `PascalCase.tsx`, lainnya `camelCase.ts`.
- `core` dan `sim` berisi fungsi murni tanpa efek samping dan tanpa impor React/DOM.
- Tanpa `any`; status komponen dimodelkan sebagai union terdiskriminasi.
- Menambah komponen baru = menambah satu definisi katalog + satu perilaku, tanpa mengubah mesin simulasi.

```ts
// src/core/catalog/contactor.ts
export const contactor: ComponentDef = {
  type: 'contactor',
  label: 'Kontaktor',
  group: 'control',
  size: { w: 4, h: 6 },
  terminals: [
    { id: 'A1', x: 0, y: 0 }, { id: 'A2', x: 3, y: 0 },
    { id: '1', x: 0, y: 1 },  { id: '2', x: 0, y: 5 },
    { id: '3', x: 1, y: 1 },  { id: '4', x: 1, y: 5 },
    { id: '5', x: 2, y: 1 },  { id: '6', x: 2, y: 5 },
    { id: '13', x: 3, y: 1 }, { id: '14', x: 3, y: 5 },
    { id: '21', x: 4, y: 1 }, { id: '22', x: 4, y: 5 },
  ],
  boards: ['panel'],
  settings: { coilVolts: { options: [230, 400], default: 230 } },
  initialState: { kind: 'contactor', pulledIn: false, burnt: false },
};

// src/sim/behaviors/contactor.ts
const PULL_IN_RATIO = 0.85;
const DROP_OUT_RATIO = 0.5;
const BURN_RATIO = 1.5;

export function nextContactorState(
  state: ContactorState,
  coilVolts: number,
  ratedVolts: number,
): ContactorState {
  if (state.burnt) return state;
  const ratio = coilVolts / ratedVolts;
  if (ratio >= BURN_RATIO) return { ...state, pulledIn: false, burnt: true };
  if (!state.pulledIn && ratio >= PULL_IN_RATIO) return { ...state, pulledIn: true };
  if (state.pulledIn && ratio < DROP_OUT_RATIO) return { ...state, pulledIn: false };
  return state;
}
```

## Testing Strategy

| Tingkat | Alat | Yang diuji |
|---|---|---|
| Unit | Vitest | `sim` (solver, tiap perilaku komponen), serialisasi `core`, logika undo/redo |
| Rangkaian acuan | Vitest + `tests/fixtures` | Papan lengkap dimuat dari JSON, dijalankan, hasilnya dibandingkan dengan yang diharapkan |
| Komponen | Testing Library | Palet, pembuatan kabel, tampilan multimeter |
| End-to-end | Playwright | Menyeret komponen, mengabel, memberi tegangan, mengukur |

- Mesin simulasi dikembangkan test-first; cakupan `src/sim` dan `src/core` minimal 90%.
- Tiap rangkaian acuan punya tes untuk keadaan benar dan minimal satu keadaan salah (mis. hubung singkat, kehilangan satu fasa, interlock dilepas).

## Boundaries

**Always**
- Jalankan `npm run typecheck`, `npm run lint`, dan `npm test` sebelum menyatakan suatu tugas selesai.
- Tulis tes perilaku lebih dulu untuk setiap perubahan di `src/sim`.
- Jaga `core` dan `sim` bebas dari React dan DOM.
- Naikkan nomor versi format berkas `.json` bila bentuknya berubah, dan tetap bisa membuka berkas versi lama.

**Ask first**
- Menambah dependensi baru di luar daftar Tech Stack.
- Menambah komponen atau jenis rangkaian di luar tabel F1.
- Mengubah model simulasi (mis. menyederhanakan solver) atau mengubah nilai tegangan/impedansi acuan.
- Menambah backend, akun, penilaian, atau apa pun dari daftar "di luar lingkup".
- Mengubah atau menyentuh proyek `WebTPTU`.
- Membuat repositori GitHub, melakukan push, atau mengubah setelan Pages.

**Never**
- Mengirim data pengguna ke layanan luar; aplikasi berjalan sepenuhnya di browser.
- Menghapus atau melemahkan tes yang gagal agar lolos.
- Menyebut simulasi ini sebagai pengganti prosedur K3 atau pengujian instalasi nyata.

## Success Criteria

1. **Penerangan.** Dari papan kosong, pengguna merangkai sumber 1 fasa → MCB → saklar tunggal → lampu dan satu stop kontak. Setelah diberi tegangan, lampu menyala saat saklar ditutup dan mati saat dibuka; multimeter membaca 230 V ± 1 V di stop kontak.
2. **Saklar tukar.** Dua saklar tukar mengendalikan satu lampu dari dua tempat: setiap perubahan salah satu saklar membalik keadaan lampu.
3. **DOL.** Tekan START: kontaktor menarik, mengunci sendiri lewat 13-14, motor berputar. Tekan STOP: motor berhenti. Multimeter membaca 400 V ± 3 V antar-fasa di terminal motor saat berjalan.
4. **Forward-reverse.** Motor berputar ke arah berlawanan pada kontaktor kedua. Dengan interlock terpasang, kedua kontaktor tidak pernah menarik bersamaan. Tanpa interlock dan kedua tombol ditekan, terjadi hubung singkat antar-fasa dan MCB trip.
5. **Star-delta.** Motor start dalam hubungan bintang (230 V ± 2 V per belitan) lalu berpindah ke segitiga (400 V ± 3 V per belitan) setelah waktu setelan timer. Tang ampere di kabel suplai membaca arus bintang sebesar sepertiga arus segitiga (± 5%).
6. **Gangguan.** Menyambung L langsung ke N membuat MCB trip dalam ≤ 1 detik disertai pesan. Melepas satu fasa ke motor membuat motor mendengung, tidak berputar, dan TOR trip.
7. **Alat ukur.** Tespen menyala di terminal fasa dan mati di netral. Mode kontinuitas saat bertegangan menampilkan peringatan, bukan angka.
8. **Simpan/muat.** Papan yang diekspor lalu diimpor kembali menghasilkan papan dan hasil simulasi yang identik. Papan tetap ada setelah halaman dimuat ulang.
9. **Kinerja.** Papan berisi 40 komponen dan 120 kabel: menyeret komponen tetap mulus (≥ 50 fps) dan hasil simulasi muncul ≤ 100 ms setelah saklar dioperasikan, di laptop lab kelas menengah.
10. **Terpasang.** Push ke `main` memasang aplikasi ke GitHub Pages tanpa langkah manual; aplikasi terbuka dari tautan Pages di Chrome/Edge dan berfungsi penuh, termasuk simpan otomatis dan ekspor/impor.
11. **Tegangan kumparan.** Kontaktor 230 V yang disambung antar-fasa (400 V) ditandai terbakar; kontaktor 400 V yang diberi 230 V tidak menarik.
12. **Dua papan.** Rangkaian DOL dirangkai terpisah: sumber 3 fasa, kotak panel, dan motor di papan Instalasi; MCB, kontaktor, TOR, dan tombol di papan Dalam Panel; keduanya bertemu di X1. Motor berputar saat START ditekan. Melepas satu kabel X1 di salah satu papan memutus sambungan itu di kedua papan. Multimeter membaca tegangan yang sama pada X1 bernomor sama di kedua papan.

## Open Questions

Pertanyaan awal sudah dijawab pengguna (2026-11-10) dan masuk ke spec; lokasi proyek `D:\Claude\SimInstalasiListrik` sudah disetujui. Yang tersisa:

1. **Repositori GitHub.** Nama akun dan nama repositori belum ditentukan. GitHub Pages pada akun gratis mensyaratkan repositori publik.
2. **Penghubung dua papan.** Spec mengasumsikan kedua papan bertemu di terminal blok X1. Push button dan lampu indikator boleh dipasang di kedua papan; kontaktor, TOR, dan timer hanya di Dalam Panel; sumber, motor, dan peralatan penerangan hanya di Instalasi.
3. **Satu panel.** Versi 1 hanya mendukung satu panel (satu papan Dalam Panel).
