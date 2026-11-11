import { coilVoltsOf } from '../core/catalog/contactor';
import { mcbAmpsOf } from '../core/catalog/mcb';
import { torAmpsOf } from '../core/catalog/overloadRelay';
import { timerSecondsOf } from '../core/catalog/timer';
import { X1_LABEL_MAX, X1_MAX, X1_MIN, isX1Type, x1Labels } from '../core/catalog/panel';
import { findComponent } from '../core/edit';
import {
  COIL_VOLTS,
  MCB_AMPS,
  TIMER_SECONDS_MAX,
  TIMER_SECONDS_MIN,
  TOR_AMPS_MAX,
  TOR_AMPS_MIN,
  type McbAmps,
  type PlacedComponent,
} from '../core/types';
import { MCB_INSTANT_TRIP_FACTOR } from '../sim/constants';
import { useEditor } from './store';

/** Panel setelan komponen terpilih; hanya tampil saat rangkaian mati. */
export function SettingsPanel() {
  const selected = useEditor((s) =>
    s.selectedId && !s.sim ? findComponent(s.project, s.selectedId)?.component : undefined,
  );
  if (!selected) return null;
  if (isX1Type(selected.type)) return <X1Settings component={selected} />;
  if (selected.type === 'contactor') return <ContactorSettings component={selected} />;
  if (selected.type === 'mcb1p' || selected.type === 'mcb3p') {
    return <McbSettings component={selected} />;
  }
  if (selected.type === 'overloadRelay') return <TorSettings component={selected} />;
  if (selected.type === 'timer') return <TimerSettings component={selected} />;
  return null;
}

/** Pilihan tegangan kerja kumparan A1-A2 (kontaktor dan timer). */
function CoilChoice({ component }: { component: PlacedComponent }) {
  const { setCoilVolts } = useEditor.getState();
  const coilVolts = coilVoltsOf(component.settings);
  return (
    <fieldset className="settings-choice">
      <legend>Tegangan kumparan (A1-A2)</legend>
      {COIL_VOLTS.map((volts) => (
        <label key={volts}>
          <input
            type="radio"
            name="coil-volts"
            checked={coilVolts === volts}
            onChange={() => setCoilVolts(component.id, volts)}
          />
          {volts} V AC
        </label>
      ))}
    </fieldset>
  );
}

function TimerSettings({ component }: { component: PlacedComponent }) {
  const { updateSettings, beginDrag, endDrag } = useEditor.getState();
  return (
    <aside className="settings" aria-label="Setelan komponen">
      <h2>Timer on-delay</h2>
      <label className="settings-field">
        <span>Waktu tunda (detik)</span>
        <input
          type="number"
          min={TIMER_SECONDS_MIN}
          max={TIMER_SECONDS_MAX}
          step={1}
          value={timerSecondsOf(component.settings)}
          // Satu kali mengubah angka menjadi satu langkah riwayat.
          onFocus={beginDrag}
          onBlur={endDrag}
          onChange={(e) => {
            const seconds = Number(e.target.value);
            if (seconds >= TIMER_SECONDS_MIN && seconds <= TIMER_SECONDS_MAX) {
              updateSettings(component.id, { timerSeconds: seconds });
            }
          }}
        />
      </label>
      <CoilChoice component={component} />
      <p className="settings-hint">
        Timer mulai menghitung saat kumparan A1-A2 bertegangan. Setelah waktu tunda, kontak 15
        berpindah dari 16 ke 18. Bila tegangan kumparan hilang, timer kembali ke awal.
      </p>
    </aside>
  );
}

function McbSettings({ component }: { component: PlacedComponent }) {
  const { updateSettings } = useEditor.getState();
  const amps = mcbAmpsOf(component.settings);
  return (
    <aside className="settings" aria-label="Setelan komponen">
      <h2>MCB</h2>
      <label className="settings-field">
        <span>Arus nominal</span>
        <select
          value={amps}
          onChange={(e) =>
            updateSettings(component.id, { mcbAmps: Number(e.target.value) as McbAmps })
          }
        >
          {MCB_AMPS.map((option) => (
            <option key={option} value={option}>
              {option} A
            </option>
          ))}
        </select>
      </label>
      <p className="settings-hint">
        MCB trip seketika pada arus {MCB_INSTANT_TRIP_FACTOR} kali arus nominalnya (
        {amps * MCB_INSTANT_TRIP_FACTOR} A).
      </p>
    </aside>
  );
}

function TorSettings({ component }: { component: PlacedComponent }) {
  const { updateSettings, beginDrag, endDrag } = useEditor.getState();
  return (
    <aside className="settings" aria-label="Setelan komponen">
      <h2>TOR</h2>
      <label className="settings-field">
        <span>Arus setelan (A)</span>
        <input
          type="number"
          min={TOR_AMPS_MIN}
          max={TOR_AMPS_MAX}
          step={0.1}
          value={torAmpsOf(component.settings)}
          // Satu kali mengubah angka menjadi satu langkah riwayat.
          onFocus={beginDrag}
          onBlur={endDrag}
          onChange={(e) => {
            const amps = Number(e.target.value);
            if (amps >= TOR_AMPS_MIN && amps <= TOR_AMPS_MAX) {
              updateSettings(component.id, { torAmps: amps });
            }
          }}
        />
      </label>
      <p className="settings-hint">
        Setel sebesar arus nominal motor. TOR trip bila arus bertahan di atas setelan, atau bila
        satu fasa hilang. Kontak 95-96 dipasang seri dengan kumparan kontaktor.
      </p>
    </aside>
  );
}

function ContactorSettings({ component }: { component: PlacedComponent }) {
  const state = useEditor((s) => s.simStates[component.id]);
  const { replaceBurnt } = useEditor.getState();
  const burnt = state?.kind === 'contactor' && state.burnt;

  return (
    <aside className="settings" aria-label="Setelan komponen">
      <h2>Kontaktor</h2>
      <CoilChoice component={component} />
      <p className="settings-hint">
        Kumparan menarik pada tegangan kerjanya. Tegangan yang jauh lebih rendah tidak membuatnya
        menarik; tegangan yang jauh lebih tinggi membakarnya.
      </p>
      {burnt && (
        <div className="settings-burnt">
          <p>Kumparan kontaktor ini terbakar.</p>
          <button type="button" onClick={() => replaceBurnt(component.id)}>
            Ganti kontaktor
          </button>
        </div>
      )}
    </aside>
  );
}

function X1Settings({ component }: { component: PlacedComponent }) {
  const { setX1Count, setX1Label, beginDrag, endDrag } = useEditor.getState();
  const labels = x1Labels(component.settings);

  return (
    <aside className="settings" aria-label="Setelan komponen">
      <h2>Terminal blok X1</h2>
      <p className="settings-hint">
        Terminal bernomor sama di papan Instalasi dan Dalam Panel adalah satu titik sambung.
      </p>
      <div className="settings-count">
        <span id="x1-count-label">Jumlah terminal</span>
        <button
          type="button"
          aria-label="Kurangi terminal"
          disabled={labels.length <= X1_MIN}
          onClick={() => setX1Count(labels.length - 1)}
        >
          −
        </button>
        <output aria-labelledby="x1-count-label">{labels.length}</output>
        <button
          type="button"
          aria-label="Tambah terminal"
          disabled={labels.length >= X1_MAX}
          onClick={() => setX1Count(labels.length + 1)}
        >
          +
        </button>
      </div>
      <ol className="settings-labels">
        {labels.map((label, index) => (
          <li key={index}>
            <label>
              <span>X1:{index + 1}</span>
              <input
                type="text"
                value={label}
                maxLength={X1_LABEL_MAX}
                placeholder="label"
                aria-label={`Label X1:${index + 1}`}
                // Satu kali mengetik label menjadi satu langkah riwayat.
                onFocus={beginDrag}
                onBlur={endDrag}
                onChange={(e) => setX1Label(index, e.target.value)}
              />
            </label>
          </li>
        ))}
      </ol>
      <p className="settings-hint">
        Mengurangi jumlah terminal menghapus kabel pada terminal yang hilang.
      </p>
    </aside>
  );
}
