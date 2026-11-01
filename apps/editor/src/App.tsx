import React, { useState, useEffect } from 'react';
import { DomInputAdapter, ENGINE_NAME, ENGINE_VERSION, Engine, Transform2D, Vector2 } from '@aether/engine-core';

export const App: React.FC = () => {
  const [engine] = useState(() => new Engine({ name: 'Aether Editor Runtime' }));
  const [engineState, setEngineState] = useState(engine.state);
  const [frameCount, setFrameCount] = useState(0);
  const [deltaTime, setDeltaTime] = useState(0);
  const [fps, setFps] = useState(0);
  const [heldKeys, setHeldKeys] = useState<string[]>([]);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [sampleVector] = useState(() => new Vector2(100, 200));

  // Transform hierarchy demo instances
  const [parentTransform] = useState(() => new Transform2D({ position: new Vector2(0, 0) }));
  const [childTransform] = useState(() => {
    const child = new Transform2D({ position: new Vector2(50, 0) });
    parentTransform.addChild(child);
    return child;
  });
  const [childWorldPos, setChildWorldPos] = useState({ x: '50.0', y: '0.0' });

  useEffect(() => {
    if (engine.state === 'uninitialized' || engine.state === 'stopped') {
      engine.init();
    }
    setEngineState(engine.state);

    // Attach DOM input adapter to feed user keystrokes and mouse movements to the engine
    const adapter = new DomInputAdapter();
    adapter.attach(engine.input);

    // Update editor stats on each frame tick
    const unsub = engine.onUpdate((dt) => {
      setFrameCount(engine.frameCount);
      setDeltaTime(dt);
      setFps(engine.fps);
      setHeldKeys(engine.input.getHeldKeys());
      setMousePos({ x: Math.round(engine.input.mouseX), y: Math.round(engine.input.mouseY) });

      // Rotate parent transform to demonstrate matrix propagation in real-time
      parentTransform.rotate(dt * 1.5);
      const worldPos = childTransform.transformPoint(Vector2.zero());
      setChildWorldPos({ x: worldPos.x.toFixed(1), y: worldPos.y.toFixed(1) });
    });

    return () => {
      unsub();
      adapter.detach();
      if (engine.state === 'running') {
        engine.pause();
      }
    };
  }, [engine, parentTransform, childTransform]);

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
                marginBottom: '12px',
              }}
            >
              Engine-Core Test Vector: ({sampleVector.x}, {sampleVector.y})
            </div>

            {/* Live Input Diagnostic Box */}
            <div
              style={{
                padding: '12px',
                backgroundColor: 'var(--bg-tertiary)',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                textAlign: 'left',
                fontSize: '12px',
              }}
            >
              <div style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>
                Input System Diagnostics (Active):
              </div>
              <div style={{ color: 'var(--text-muted)', marginBottom: '4px' }}>
                Mouse Position: <span style={{ color: 'var(--text-main)', fontFamily: 'monospace' }}>({mousePos.x}, {mousePos.y})</span>
              </div>
              <div style={{ color: 'var(--text-muted)' }}>
                Held Keys:{' '}
                {heldKeys.length > 0 ? (
                  heldKeys.map((k) => (
                    <span
                      key={k}
                      style={{
                        padding: '2px 6px',
                        backgroundColor: 'var(--accent-color)',
                        color: '#fff',
                        borderRadius: '3px',
                        marginRight: '4px',
                        fontFamily: 'monospace',
                        fontSize: '11px',
                      }}
                    >
                      {k}
                    </span>
                  ))
                ) : (
                  <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>None (press any key)</span>
                )}
              </div>
            </div>

            {/* Live Transform Hierarchy Diagnostic Box */}
            <div
              style={{
                marginTop: '12px',
                padding: '12px',
                backgroundColor: 'var(--bg-tertiary)',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                textAlign: 'left',
                fontSize: '12px',
              }}
            >
              <div style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>
                Transform2D Hierarchy & Matrix3 (Active):
              </div>
              <div style={{ color: 'var(--text-muted)', marginBottom: '4px' }}>
                Parent Rotation: <span style={{ color: 'var(--text-main)', fontFamily: 'monospace' }}>{(parentTransform.rotation * 180 / Math.PI).toFixed(0)}°</span>
              </div>
              <div style={{ color: 'var(--text-muted)' }}>
                Orbiting Child World Pos: <span style={{ color: 'var(--text-main)', fontFamily: 'monospace' }}>({childWorldPos.x}, {childWorldPos.y})</span>
              </div>
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
