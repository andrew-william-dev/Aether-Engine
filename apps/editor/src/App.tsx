import React, { useState, useEffect, useRef } from 'react';
import { DomInputAdapter, ENGINE_NAME, ENGINE_VERSION, Engine, Transform2D, Vector2 } from '@aether/engine-core';
import { Camera2D, SpriteBatch, WebGLContext } from '@aether/renderer';

export const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
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

    const canvas = canvasRef.current;
    let renderer: { context: WebGLContext; camera: Camera2D; batch: SpriteBatch } | null = null;
    let resizeRenderer: (() => void) | null = null;

    if (canvas) {
      const context = new WebGLContext(canvas);
      const camera = new Camera2D(canvas.width || 800, canvas.height || 600);
      const batch = new SpriteBatch(context);

      resizeRenderer = () => {
        const rect = canvas.getBoundingClientRect();
        const pixelRatio = window.devicePixelRatio || 1;
        const width = Math.max(1, Math.floor(rect.width * pixelRatio));
        const height = Math.max(1, Math.floor(rect.height * pixelRatio));

        canvas.width = width;
        canvas.height = height;
        context.resize(width, height);
        camera.setViewport(width, height);
      };

      resizeRenderer();
      window.addEventListener('resize', resizeRenderer);
      renderer = { context, camera, batch };
    }

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

    const unsubRender = engine.onRender(() => {
      if (!renderer) {
        return;
      }

      const { context, camera, batch } = renderer;
      context.clear(0.08, 0.1, 0.16, 1);
      batch.begin(camera.getViewProjectionMatrix());

      const t = engine.totalTime;
      batch.drawRect(-160 + Math.sin(t * 1.25) * 90, -90, 120, 120, [0.28, 0.58, 1.0, 1]);
      batch.drawRect(75 + Math.cos(t * 1.4) * 70, 20, 90, 90, [0.93, 0.45, 0.68, 1]);
      batch.drawRect(Math.sin(t * 0.8) * 180, -40, 80, 80, [0.42, 0.77, 0.52, 1]);
      batch.end();
    });

    return () => {
      unsub();
      unsubRender();
      adapter.detach();
      if (resizeRenderer) {
        window.removeEventListener('resize', resizeRenderer);
      }
      if (renderer) {
        renderer.batch.dispose(renderer.context);
      }
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
            backgroundColor: 'var(--bg-primary)',
            position: 'relative',
            minWidth: 0,
          }}
        >
          <canvas
            ref={canvasRef}
            style={{
              flex: 1,
              width: '100%',
              height: '100%',
              display: 'block',
              background: 'radial-gradient(circle at center, rgba(59, 130, 246, 0.18), rgba(5, 9, 18, 0.96) 38%)',
            }}
          />

          <div
            style={{
              position: 'absolute',
              top: '16px',
              left: '16px',
              padding: '8px 12px',
              borderRadius: '8px',
              backgroundColor: 'rgba(15, 23, 42, 0.8)',
              border: '1px solid rgba(148, 163, 184, 0.35)',
              color: 'var(--text-main)',
              fontSize: '12px',
              fontWeight: 600,
              letterSpacing: '0.5px',
              textTransform: 'uppercase',
            }}
          >
            Live WebGL2 Viewport
          </div>

          <div
            style={{
              position: 'absolute',
              bottom: '16px',
              left: '16px',
              right: '16px',
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(180px, 1fr))',
              gap: '12px',
            }}
          >
            <div style={{ padding: '10px 12px', backgroundColor: 'rgba(15, 23, 42, 0.7)', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '12px' }}>
              <div style={{ color: 'var(--text-muted)', marginBottom: '4px' }}>Input System Diagnostics</div>
              <div style={{ color: 'var(--text-main)' }}>Mouse: ({mousePos.x}, {mousePos.y})</div>
              <div style={{ color: 'var(--text-main)' }}>Held keys: {heldKeys.length > 0 ? heldKeys.join(', ') : 'None'}</div>
            </div>
            <div style={{ padding: '10px 12px', backgroundColor: 'rgba(15, 23, 42, 0.7)', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '12px' }}>
              <div style={{ color: 'var(--text-muted)', marginBottom: '4px' }}>Transform2D & Matrix3</div>
              <div style={{ color: 'var(--text-main)' }}>Parent Rotation: {((((parentTransform.rotation * 180 / Math.PI) % 360) + 360) % 360).toFixed(0)}°</div>
              <div style={{ color: 'var(--text-main)' }}>Child World Pos: ({childWorldPos.x}, {childWorldPos.y})</div>
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
