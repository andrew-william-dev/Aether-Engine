import React, { useState, useEffect } from 'react';
import { ENGINE_NAME, ENGINE_VERSION, Engine, Vector2 } from '@aether/engine-core';

export const App: React.FC = () => {
  const [engine] = useState(() => new Engine({ name: 'Aether Editor Runtime' }));
  const [engineState, setEngineState] = useState(engine.state);
  const [frameCount, setFrameCount] = useState(0);
  const [deltaTime, setDeltaTime] = useState(0);
  const [fps, setFps] = useState(0);
  const [sampleVector] = useState(() => new Vector2(100, 200));

  useEffect(() => {
    if (engine.state === 'uninitialized' || engine.state === 'stopped') {
      engine.init();
    }
    setEngineState(engine.state);

    // Update editor stats on each frame tick
    const unsub = engine.onUpdate((dt) => {
      setFrameCount(engine.frameCount);
      setDeltaTime(dt);
      setFps(engine.fps);
    });

    return () => {
      unsub();
      if (engine.state === 'running') {
        engine.pause();
      }
    };
  }, [engine]);

  const toggleRun = () => {
    if (engine.state === 'running') {
      engine.pause();
    } else {
      engine.start();
    }
    setEngineState(engine.state);
  };

  const handleStep = () => {
    engine.step();
    setEngineState(engine.state);
    setFrameCount(engine.frameCount);
    setDeltaTime(engine.deltaTime);
    setFps(engine.fps);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Top Navigation Bar */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          height: '48px',
          backgroundColor: 'var(--bg-secondary)',
          borderBottom: '1px solid var(--border-color)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontWeight: 700, fontSize: '16px', letterSpacing: '0.5px' }}>
            {ENGINE_NAME}
          </span>
          <span
            style={{
              fontSize: '12px',
              padding: '2px 8px',
              backgroundColor: 'var(--bg-tertiary)',
              borderRadius: '4px',
              color: 'var(--text-muted)',
            }}
          >
            v{ENGINE_VERSION}
          </span>
        </div>

        {/* Engine Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={toggleRun}
            style={{
              padding: '6px 14px',
              backgroundColor: engineState === 'running' ? '#ef4444' : 'var(--accent-color)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '13px',
            }}
          >
            {engineState === 'running' ? 'Pause' : 'Play'}
          </button>
          <button
            onClick={handleStep}
            disabled={engineState === 'running'}
            style={{
              padding: '6px 12px',
              backgroundColor: 'var(--bg-tertiary)',
              color: engineState === 'running' ? 'var(--text-muted)' : 'var(--text-main)',
              border: '1px solid var(--border-color)',
              borderRadius: '4px',
              cursor: engineState === 'running' ? 'not-allowed' : 'pointer',
              fontWeight: 500,
              fontSize: '13px',
              opacity: engineState === 'running' ? 0.5 : 1,
            }}
          >
            Step Frame
          </button>
          <span
            style={{
              fontSize: '12px',
              color: engineState === 'running' ? 'var(--success)' : 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              fontWeight: 600,
            }}
          >
            ● {engineState}
          </span>
        </div>

        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
          Workspace: Monorepo M1
        </div>
      </header>

      {/* Main Workspace Layout */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Left Panel: Hierarchy */}
        <aside
          style={{
            width: '240px',
            backgroundColor: 'var(--bg-secondary)',
            borderRight: '1px solid var(--border-color)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              padding: '10px 14px',
              fontSize: '12px',
              fontWeight: 600,
              borderBottom: '1px solid var(--border-color)',
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
            }}
          >
            Scene Hierarchy
          </div>
          <div style={{ padding: '14px', fontSize: '13px', color: 'var(--text-muted)' }}>
            Scene root (empty)
          </div>
        </aside>

        {/* Center: Viewport */}
        <main
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'var(--bg-primary)',
            position: 'relative',
          }}
        >
          <div
            style={{
              textAlign: 'center',
              padding: '32px',
              backgroundColor: 'var(--bg-secondary)',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              maxWidth: '460px',
            }}
          >
            <h2 style={{ fontSize: '18px', marginBottom: '8px' }}>Viewport Canvas Area</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Custom WebGL2 renderer will be integrated here in Milestone 2.
            </p>
            <div
              style={{
                fontSize: '12px',
                padding: '8px 12px',
                backgroundColor: 'var(--bg-tertiary)',
                borderRadius: '6px',
                display: 'inline-block',
                fontFamily: 'monospace',
              }}
            >
              Engine-Core Test Vector: ({sampleVector.x}, {sampleVector.y})
            </div>
          </div>
        </main>

        {/* Right Panel: Inspector */}
        <aside
          style={{
            width: '280px',
            backgroundColor: 'var(--bg-secondary)',
            borderLeft: '1px solid var(--border-color)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              padding: '10px 14px',
              fontSize: '12px',
              fontWeight: 600,
              borderBottom: '1px solid var(--border-color)',
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
            }}
          >
            Inspector
          </div>
          <div style={{ padding: '14px', fontSize: '13px', color: 'var(--text-muted)' }}>
            No object selected.
          </div>
        </aside>
      </div>

      {/* Bottom Status Bar */}
      <footer
        style={{
          height: '28px',
          backgroundColor: 'var(--bg-tertiary)',
          borderTop: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 12px',
          fontSize: '11px',
          color: 'var(--text-muted)',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', gap: '16px' }}>
          <span>State: <strong style={{ color: 'var(--text-main)' }}>{engineState}</strong></span>
          <span>Frames: <strong style={{ color: 'var(--text-main)' }}>{frameCount}</strong></span>
          <span>Delta: <strong style={{ color: 'var(--text-main)' }}>{(deltaTime * 1000).toFixed(1)} ms</strong></span>
          <span>FPS: <strong style={{ color: 'var(--text-main)' }}>{fps}</strong></span>
        </div>
        <span>Engine Core: Linked (@aether/engine-core)</span>
      </footer>
    </div>
  );
};
