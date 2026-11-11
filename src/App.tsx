import { Board } from './editor/Board';
import { BoardTabs } from './editor/BoardTabs';
import { Palette } from './editor/Palette';
import { SettingsPanel } from './editor/SettingsPanel';
import { Toolbar } from './editor/Toolbar';
import { useSimulationClock } from './editor/useSimulation';
import { ClampLayer, ClampMeter } from './instruments/ClampMeter';
import { InstrumentTray } from './instruments/InstrumentTray';
import { Multimeter } from './instruments/Multimeter';
import { ProbeLayer } from './instruments/ProbeLayer';
import { Tester, TesterLayer } from './instruments/Tester';
import { Notice } from './ui/Notice';

export function App() {
  useSimulationClock();
  return (
    <div className="app">
      <header className="app-header">
        <h1>Simulator Instalasi Listrik</h1>
        <Toolbar />
      </header>
      <Notice />
      <div className="app-body">
        <Palette>
          <InstrumentTray />
        </Palette>
        <main className="app-main">
          <BoardTabs />
          <Board
            overlay={
              <>
                <ClampLayer />
                <ProbeLayer />
                <TesterLayer />
              </>
            }
          />
          <div className="instruments">
            <Tester />
            <ClampMeter />
            <Multimeter />
          </div>
        </main>
        <SettingsPanel />
      </div>
    </div>
  );
}
