import { useInstruments } from './store';

/** Kelompok Alat Ukur di palet: alat ukur dikeluarkan dan disimpan, bukan ditaruh di papan. */
export function InstrumentTray() {
  const meterOpen = useInstruments((s) => s.meterOpen);
  const toggleMeter = useInstruments((s) => s.toggleMeter);
  const clampOpen = useInstruments((s) => s.clampOpen);
  const toggleClamp = useInstruments((s) => s.toggleClamp);
  const testerOpen = useInstruments((s) => s.testerOpen);
  const toggleTester = useInstruments((s) => s.toggleTester);
  return (
    <section className="palette-group">
      <h2>Alat Ukur</h2>
      <ul>
        <li>
          <button
            type="button"
            className={meterOpen ? 'palette-item instrument active' : 'palette-item instrument'}
            aria-pressed={meterOpen}
            onClick={toggleMeter}
          >
            Multimeter
          </button>
        </li>
        <li>
          <button
            type="button"
            className={clampOpen ? 'palette-item instrument active' : 'palette-item instrument'}
            aria-pressed={clampOpen}
            onClick={toggleClamp}
          >
            Tang ampere
          </button>
        </li>
        <li>
          <button
            type="button"
            className={testerOpen ? 'palette-item instrument active' : 'palette-item instrument'}
            aria-pressed={testerOpen}
            onClick={toggleTester}
          >
            Tespen
          </button>
        </li>
      </ul>
    </section>
  );
}
