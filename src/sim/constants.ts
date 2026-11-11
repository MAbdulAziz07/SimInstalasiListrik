// Nilai tipikal untuk pembelajaran, bukan data pabrikan.

/** Tegangan fasa-netral sumber (volt). */
export const NOMINAL_VOLTS = 230;

/** Resistansi satu potong kabel (ohm). */
export const WIRE_OHMS = 0.01;

/** Resistansi kontak tertutup pada saklar, MCB, dan sejenisnya (ohm). */
export const CONTACT_OHMS = 0.001;

/** Daya lampu pada tegangan nominal (watt). */
export const LAMP_WATTS = 60;

/** Daya lampu indikator pada tegangan nominal (watt). */
export const PILOT_LAMP_WATTS = 2;

/** Daya semu kumparan kontaktor pada tegangan kerjanya (VA) dan faktor dayanya. */
export const COIL_VA = 8;
export const COIL_POWER_FACTOR = 0.3;

/** Kumparan menarik pada tegangan minimal sebesar bagian ini dari tegangan kerjanya. */
export const COIL_PICKUP_RATIO = 0.8;

/** Kumparan terbakar pada tegangan di atas kelipatan ini dari tegangan kerjanya. */
export const COIL_BURN_RATIO = 1.2;

/**
 * Impedansi satu belitan motor (ohm) dan faktor dayanya. Setara motor sekitar 4 kW yang
 * belitannya untuk 400 V: arus saluran kira-kira 8 A dalam hubungan segitiga.
 */
export const MOTOR_WINDING_OHMS = 87;
export const MOTOR_POWER_FACTOR = 0.82;

/** Tegangan belitan (volt) di bawah ini dianggap tidak bertegangan. */
export const MOTOR_IDLE_VOLTS = 30;

/** Motor berputar bila komponen urutan fasa yang dominan minimal sebesar ini per belitan (volt). */
export const MOTOR_RUN_VOLTS = 150;

/** Motor berputar bila urutan fasa lawannya paling banyak sebesar bagian ini dari yang dominan. */
export const MOTOR_MAX_UNBALANCE = 0.3;

/** Arus nominal MCB bawaan (ampere); bisa disetel per MCB. */
export const MCB_NOMINAL_AMPS = 10;

/** TOR mulai memanas pada arus di atas kelipatan ini dari arus setelannya. */
export const TOR_PICKUP_RATIO = 1.1;

/** Waktu trip TOR (detik) pada arus tepat sebesar setelan dikalikan akar nilai ini. */
export const TOR_OVERLOAD_SECONDS = 20;

/** TOR peka kehilangan fasa: trip setelah sekian detik bila satu fasa jauh lebih kecil. */
export const TOR_PHASE_LOSS_SECONDS = 3;

/** Satu fasa dianggap hilang bila arusnya di bawah bagian ini dari fasa terbesar. */
export const TOR_PHASE_LOSS_RATIO = 0.5;

/** Ketidakseimbangan baru dinilai bila fasa terbesar minimal sebesar bagian ini dari setelan. */
export const TOR_MIN_LOAD_RATIO = 0.2;

/** Waktu (detik) bimetal mendingin dari panas penuh. */
export const TOR_COOL_SECONDS = 10;

/** MCB trip seketika pada arus sebesar kelipatan ini dari arus nominalnya. */
export const MCB_INSTANT_TRIP_FACTOR = 5;

/** Arus (ampere) yang membuat MCB trip seketika; juga batas arus yang disebut hubung singkat. */
export const SHORT_CIRCUIT_AMPS = MCB_NOMINAL_AMPS * MCB_INSTANT_TRIP_FACTOR;
