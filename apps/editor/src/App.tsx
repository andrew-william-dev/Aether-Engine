import React, { useState, useEffect, useRef } from 'react';
import { DomInputAdapter, ENGINE_NAME, ENGINE_VERSION, Engine, Keys, Matrix3, Transform2D, Vector2 } from '@aether/engine-core';
import { Camera2D, SpriteBatch, Texture2D, TextureLoader, WebGLContext } from '@aether/renderer';

interface ViewportAssets {
  idle: Texture2D;
  walkA: Texture2D;
  walkB: Texture2D;
  sky: Texture2D;
  grassTop: Texture2D;
  grassCenter: Texture2D;
  coin: Texture2D;
}

async function loadViewportAssets(context: WebGLContext): Promise<ViewportAssets> {
  const loaded: Texture2D[] = [];
  const options = { minFilter: context.gl.LINEAR, magFilter: context.gl.LINEAR };

  try {
    const idle = await TextureLoader.load(
      context,
      new URL('./assets/kenney/characters/character_green_idle.svg', import.meta.url).href,
      options
    );
    loaded.push(idle);
    const walkA = await TextureLoader.load(
      context,
      new URL('./assets/kenney/characters/character_green_walk_a.svg', import.meta.url).href,
      options
    );
    loaded.push(walkA);
    const walkB = await TextureLoader.load(
      context,
      new URL('./assets/kenney/characters/character_green_walk_b.svg', import.meta.url).href,
      options
    );
    loaded.push(walkB);
    const sky = await TextureLoader.load(
      context,
      new URL('./assets/kenney/backgrounds/background_solid_sky.svg', import.meta.url).href,
      options
    );
    loaded.push(sky);
    const grassTop = await TextureLoader.load(
      context,
      new URL('./assets/kenney/tiles/terrain_grass_block_top.svg', import.meta.url).href,
      options
    );
    loaded.push(grassTop);
    const grassCenter = await TextureLoader.load(
      context,
      new URL('./assets/kenney/tiles/terrain_grass_block_center.svg', import.meta.url).href,
      options
    );
    loaded.push(grassCenter);
    const coin = await TextureLoader.load(
      context,
      new URL('./assets/kenney/tiles/coin_gold.svg', import.meta.url).href,
      options
    );
    loaded.push(coin);

    return { idle, walkA, walkB, sky, grassTop, grassCenter, coin };
  } catch (error) {
    for (const texture of loaded) {
      texture.dispose(context);
    }
    throw error;
  }
}

export const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [engine] = useState(() => new Engine({ name: 'Aether Editor Runtime' }));
  const [engineState, setEngineState] = useState(engine.state);
  const [frameCount, setFrameCount] = useState(0);
  const [deltaTime, setDeltaTime] = useState(0);
  const [fps, setFps] = useState(0);
  const [heldKeys, setHeldKeys] = useState<string[]>([]);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [spriteStatus, setSpriteStatus] = useState('Loading Kenney platformer assets...');
  const [heroPosition, setHeroPosition] = useState({ x: 0, y: 0 });
  const [collectedCoins, setCollectedCoins] = useState(0);

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

    const canvas = canvasRef.current;

    // Keep keyboard input global while reporting mouse coordinates relative to the viewport.
    const adapter = new DomInputAdapter({ target: canvas, keyboardTarget: window });
    adapter.attach(engine.input);

    let renderer: {
      context: WebGLContext;
      camera: Camera2D;
      batch: SpriteBatch;
      assets: ViewportAssets | null;
      viewWidth: number;
      viewHeight: number;
    } | null = null;
    let resizeRenderer: (() => void) | null = null;
    let resizeObserver: ResizeObserver | null = null;
    let isDisposed = false;
    const playerOffset = new Vector2();
    let facing = 1;
    let isMoving = false;
    let hasInitialPosition = false;
    let verticalVelocity = 0;
    let isGrounded = true;
    const collectedCoinIds = new Set<number>();
    const spriteWidth = 96;
    const spriteHeight = 96;

    if (canvas) {
      const context = new WebGLContext(canvas);
      const camera = new Camera2D(canvas.width || 800, canvas.height || 600);
      const batch = new SpriteBatch(context);
      renderer = { context, camera, batch, assets: null, viewWidth: 800, viewHeight: 600 };

      resizeRenderer = () => {
        const rect = canvas.getBoundingClientRect();
        const pixelRatio = window.devicePixelRatio || 1;
        const width = Math.max(1, Math.floor(rect.width * pixelRatio));
        const height = Math.max(1, Math.floor(rect.height * pixelRatio));

        canvas.width = width;
        canvas.height = height;
        context.resize(width, height);
        renderer!.viewWidth = Math.max(1, rect.width);
        renderer!.viewHeight = Math.max(1, rect.height);
        camera.setViewport(renderer!.viewWidth, renderer!.viewHeight);
        if (!hasInitialPosition) {
          playerOffset.y = renderer!.viewHeight / 2 - 96;
          hasInitialPosition = true;
        } else if (isGrounded) {
          playerOffset.y = renderer!.viewHeight / 2 - 96;
        }
      };

      resizeRenderer();
      window.addEventListener('resize', resizeRenderer);
      resizeObserver = new ResizeObserver(resizeRenderer);
      resizeObserver.observe(canvas);

      void loadViewportAssets(context).then((assets) => {
        if (isDisposed) {
          for (const texture of Object.values(assets)) {
            texture.dispose(context);
          }
          return;
        }

        renderer!.assets = assets;
        setSpriteStatus('Kenney platformer assets ready');
        engine.step();
      }).catch((error: unknown) => {
        if (!isDisposed) {
          setSpriteStatus(error instanceof Error ? error.message : 'Failed to load swordsman sprite');
        }
      });
    }

    // Update editor stats on each frame tick
    const unsub = engine.onUpdate((dt) => {
      setFrameCount(engine.frameCount);
      setDeltaTime(dt);
      setFps(engine.fps);
      setHeldKeys(engine.input.getHeldKeys());
      setMousePos({ x: Math.round(engine.input.mouseX), y: Math.round(engine.input.mouseY) });

      const input = engine.input;
      const horizontal = Number(input.isKeyDown(Keys.KeyD) || input.isKeyDown(Keys.ArrowRight))
        - Number(input.isKeyDown(Keys.KeyA) || input.isKeyDown(Keys.ArrowLeft));
      isMoving = horizontal !== 0;

      if (isMoving) {
        const speed = 240;
        playerOffset.x += horizontal * speed * dt;
        if (horizontal !== 0) {
          facing = horizontal > 0 ? 1 : -1;
        }
      }

      if (renderer) {
        const maxX = Math.max(0, renderer.viewWidth / 2 - spriteWidth / 2);
        playerOffset.x = Math.max(-maxX, Math.min(maxX, playerOffset.x));

        const groundY = renderer.viewHeight / 2 - 16;
        const groundTop = groundY - 32;
        const platformY = groundY - 112;
        const platformTop = platformY - 32;
        const overlapsPlatform = playerOffset.x + spriteWidth * 0.3 > -224
          && playerOffset.x - spriteWidth * 0.3 < -32;
        const feetBeforeUpdate = playerOffset.y + spriteHeight / 2;
        const standingOnPlatform = overlapsPlatform && Math.abs(feetBeforeUpdate - platformTop) < 1;
        const standingOnGround = Math.abs(feetBeforeUpdate - groundTop) < 1;

        if (isGrounded && !standingOnPlatform && !standingOnGround) {
          isGrounded = false;
        }

        const previousFeet = playerOffset.y + spriteHeight / 2;
        const jumpPressed =
          input.isKeyPressed(Keys.Space) ||
          input.isKeyPressed(Keys.KeyW) ||
          input.isKeyPressed(Keys.ArrowUp);

        if (jumpPressed && isGrounded) {
          verticalVelocity = -540;
          isGrounded = false;
        }

        if (!isGrounded) {
          verticalVelocity += 1100 * dt;
          playerOffset.y += verticalVelocity * dt;
        }

        const currentFeet = playerOffset.y + spriteHeight / 2;
        const landedOnPlatform = overlapsPlatform
          && verticalVelocity >= 0
          && previousFeet <= platformTop
          && currentFeet >= platformTop;
        const landedOnGround = verticalVelocity >= 0 && currentFeet >= groundTop;

        if (landedOnPlatform || landedOnGround) {
          const landingY = landedOnPlatform ? platformTop : groundTop;
          playerOffset.y = landingY - spriteHeight / 2;
          verticalVelocity = 0;
          isGrounded = true;
        }

        const coinY = groundY - 104;
        for (const [id, coinX] of [-160, 160].entries()) {
          if (
            !collectedCoinIds.has(id) &&
            Math.abs(playerOffset.x - coinX) < 38 &&
            Math.abs(playerOffset.y - coinY) < 65
          ) {
            collectedCoinIds.add(id);
            setCollectedCoins(collectedCoinIds.size);
          }
        }

        setHeroPosition({
          x: Math.round(playerOffset.x),
          y: Math.round(playerOffset.y),
        });
      }

      // Rotate parent transform to demonstrate matrix propagation in real-time
      parentTransform.rotate(dt * 1.5);
      const worldPos = childTransform.transformPoint(Vector2.zero());
      setChildWorldPos({ x: worldPos.x.toFixed(1), y: worldPos.y.toFixed(1) });
    });

    const unsubRender = engine.onRender(() => {
      if (!renderer) {
        return;
      }

      const { context, camera, batch, assets } = renderer;
      context.clear(0.08, 0.1, 0.16, 1);
      batch.begin(camera.getViewProjectionMatrix());

      const { viewWidth, viewHeight } = renderer;
      if (assets) {
        batch.drawSprite(assets.sky, Matrix3.identity().scale(viewWidth, viewHeight));

        const groundY = viewHeight / 2 - 16;
        const tileCount = Math.ceil(viewWidth / 64);
        for (let i = 0; i < tileCount; i++) {
          const x = -viewWidth / 2 + 32 + i * 64;
          batch.drawSprite(assets.grassTop, Matrix3.identity().translate(x, groundY).scale(64, 64));
        }
        for (let i = 0; i < tileCount; i++) {
          const x = -viewWidth / 2 + 32 + i * 64;
          batch.drawSprite(assets.grassCenter, Matrix3.identity().translate(x, groundY + 64).scale(64, 64));
        }

        const platformY = groundY - 112;
        for (const x of [-192, -128, -64]) {
          batch.drawSprite(assets.grassTop, Matrix3.identity().translate(x, platformY).scale(64, 64));
        }
        for (const x of [-192, -128, -64]) {
          batch.drawSprite(assets.grassCenter, Matrix3.identity().translate(x, platformY + 64).scale(64, 64));
        }

        for (const [id, x] of [-160, 160].entries()) {
          if (!collectedCoinIds.has(id)) {
            batch.drawSprite(assets.coin, Matrix3.identity().translate(x, groundY - 104).scale(48, 48));
          }
        }

        const walkingFrame = Math.floor(engine.totalTime * 8) % 2 === 0 ? assets.walkA : assets.walkB;
        const character = isMoving ? walkingFrame : assets.idle;
        const heroMatrix = Matrix3.identity()
          .translate(playerOffset.x, playerOffset.y)
          .scale(facing * spriteWidth, spriteHeight);
        batch.drawSprite(character, heroMatrix);
      }
      batch.end();
    });

    engine.step();

    return () => {
      isDisposed = true;
      unsub();
      unsubRender();
      adapter.detach();
      if (resizeRenderer) {
        window.removeEventListener('resize', resizeRenderer);
      }
      resizeObserver?.disconnect();
      if (renderer) {
        if (renderer.assets) {
          for (const texture of Object.values(renderer.assets)) {
            texture.dispose(renderer.context);
          }
        }
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
    canvasRef.current?.focus();
  };

  const handleStep = () => {
    engine.step();
    setEngineState(engine.state);
    setFrameCount(engine.frameCount);
    setDeltaTime(engine.deltaTime);
    setFps(engine.fps);
    canvasRef.current?.focus();
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
            <div style={{ color: 'var(--text-main)', marginBottom: '10px' }}>Scene root</div>
            <div style={{ padding: '7px 8px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '4px', marginBottom: '6px' }}>
              Green Adventurer
            </div>
            <div style={{ padding: '7px 8px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '4px' }}>
              Grass Platforms
            </div>
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
            tabIndex={0}
            aria-label="Platformer viewport. Use A and D or arrow keys to move, and Space, W, or Up Arrow to jump."
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
            Live WebGL2 Platformer Preview
          </div>

          <div
            style={{
              position: 'absolute',
              top: '58px',
              left: '16px',
              padding: '8px 12px',
              borderRadius: '8px',
              backgroundColor: 'rgba(15, 23, 42, 0.8)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-muted)',
              fontSize: '12px',
            }}
          >
            A/D or ←/→ to move · Space/W/↑ to jump · {spriteStatus}
          </div>

          <div
            style={{
              position: 'absolute',
              top: '116px',
              left: '16px',
              right: '16px',
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(180px, 1fr))',
              gap: '12px',
            }}
          >
            <div style={{ padding: '10px 12px', backgroundColor: 'rgba(15, 23, 42, 0.7)', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '12px' }}>
              <div style={{ color: 'var(--text-muted)', marginBottom: '4px' }}>Green Adventurer · Texture2D</div>
              <div style={{ color: 'var(--text-main)' }}>Position: ({heroPosition.x}, {heroPosition.y})</div>
                <div style={{ color: 'var(--text-main)' }}>Coins: {collectedCoins} / 2</div>
                <div style={{ color: 'var(--text-main)' }}>Mouse: ({mousePos.x}, {mousePos.y})</div>
                <div style={{ color: 'var(--text-main)' }}>Held keys: {heldKeys.length > 0 ? heldKeys.join(', ') : 'None'}</div>
            </div>
            <div style={{ padding: '10px 12px', backgroundColor: 'rgba(15, 23, 42, 0.7)', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '12px' }}>
              <div style={{ color: 'var(--text-muted)', marginBottom: '4px' }}>Transform2D diagnostic</div>
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
            <div style={{ color: 'var(--text-main)', fontWeight: 600, marginBottom: '12px' }}>Green Adventurer</div>
            <div style={{ marginBottom: '7px' }}>Renderer: WebGL2 SpriteBatch</div>
            <div style={{ marginBottom: '7px' }}>Texture: {spriteStatus}</div>
            <div>World position: ({heroPosition.x}, {heroPosition.y})</div>
            <div style={{ marginTop: '7px' }}>Coins: {collectedCoins} / 2</div>
            <div style={{ marginTop: '14px', fontSize: '11px' }}>Art: Kenney New Platformer Pack (CC0)</div>
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
