import { useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import TerrainScene from './components/TerrainScene';
import TaskPanel from './components/TaskPanel';
import TaskIntroModal from './components/TaskIntroModal';
import AzimuthRangePanel from './components/AzimuthRangePanel';
import MiniMap from './components/MiniMap';
import Onboarding from './components/Onboarding';
import GuidedBar from './components/GuidedBar';
import NavMenu from './components/NavMenu';
import ViewMenu from './components/ViewMenu';
import RadialMenu from './components/RadialMenu';
import { EYE_HEIGHT, getHeight } from './utils/terrainHeight';
import { SPAWN } from './playerPose';
import { useSimStore } from './store';
import { UI } from './i18n';

const START_Y = getHeight(SPAWN.x, SPAWN.z) + EYE_HEIGHT;

export default function App() {
  const lang = useSimStore((s) => s.lang);
  const t = UI[lang];
  const started = useSimStore((s) => s.started);
  const mode = useSimStore((s) => s.mode);
  const setMode = useSimStore((s) => s.setMode);

  const [locked, setLocked] = useState(false);
  const [taskIntroOpen, setTaskIntroOpen] = useState(true);

  // Pointer-lock state (for the crosshair + "click to enter" prompt).
  useEffect(() => {
    const onChange = () => setLocked(!!document.pointerLockElement);
    document.addEventListener('pointerlockchange', onChange);
    return () => document.removeEventListener('pointerlockchange', onChange);
  }, []);

  // Drive document direction + language for RTL (Hebrew) support.
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = t.dir;
  }, [lang, t.dir]);

  return (
    <div className="app">
      <Canvas
        shadows
        dpr={[1, 2]}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        camera={{ position: [SPAWN.x, START_Y, SPAWN.z], fov: 72, near: 0.1, far: 600 }}
        onCreated={({ gl }) => {
          gl.toneMappingExposure = 1.08;
        }}
      >
        <TerrainScene />
      </Canvas>

      <div className="vignette" />

      {started && mode === 'free' && locked && (
        <div className="crosshair">
          <span className="ring" />
        </div>
      )}

      {!started && <Onboarding />}

      {started && mode === 'free' && !locked && (
        <div className="start-prompt">
          <div className="card">
            <div className="big">{t.enterPrompt}</div>
            <div className="small">{t.enterHint}</div>
          </div>
        </div>
      )}

      {started && (
        <div className="overlay">
          <div className="menu-cluster">
            <NavMenu />
            <ViewMenu />
          </div>

          <RadialMenu />

          <div className="col col-task">
            <TaskPanel />
            <AzimuthRangePanel />
          </div>

          <div className="col col-map">
            <MiniMap />
          </div>

          {mode === 'guided' && <GuidedBar />}

          {taskIntroOpen && (
            <TaskIntroModal onClose={() => setTaskIntroOpen(false)} />
          )}

          {mode === 'demo' && (
            <div className="demo-badge panel">
              <span className="rec-dot" aria-hidden="true" />
              {t.demoBadge}
              <button type="button" className="ghost-btn" onClick={() => setMode('free')}>
                {t.exitDemo}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
