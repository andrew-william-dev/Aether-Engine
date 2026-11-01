# Changelog

All notable changes to the Aether Engine project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **2D Math Foundation (`packages/engine-core`)**:
  - `MathUtils`: `degToRad`, `radToDeg`, `clamp`, `lerp`, `approxEquals`, `normalizeAngle` utilities plus `EPSILON`, `DEG_TO_RAD`, `RAD_TO_DEG` constants.
  - `Vector2` (extended): `fromAngle`, directional statics (`up`, `down`, `left`, `right`), `multiply`, `divide`, `negate`, `cross`, `distance`, `distanceSquared`, `angle`, `angleTo`, `rotate`, `perpendicular`, `lerp`, `toArray`, `fromArray`.
  - `Matrix3`: 3×3 affine matrix (column-major `Float32Array`), factory statics (`translation`, `rotation`, `scaling`, `orthographic`), `multiply`, `premultiply`, `setTRS`, `translate`, `rotate`, `scale`, `determinant`, `invert`, `transformPoint`, `transformVector`, `toFloat32Array`.
  - `Transform2D`: position/rotation/scale/pivot with dirty-flag caching, parent-child hierarchy, `getLocalMatrix`, `getWorldMatrix`, `transformPoint`, `inverseTransformPoint`, `isLocalDirty`, `isWorldDirty`, `isDirty`, `addChild`, `removeChild`.
- **Input System (`packages/engine-core`)**:
  - Platform-independent `InputManager` tracking keyboard and mouse button states: down (held), pressed (just pressed this frame), released (just released this frame), and up.
  - Mouse position, per-frame movement delta, and wheel delta tracking.
  - Pluggable `InputAdapter` interface and `DomInputAdapter` translating browser DOM `KeyboardEvent`, `MouseEvent`, and `WheelEvent` into platform-agnostic engine events.
  - Element-relative mouse coordinate mapping via `getBoundingClientRect()`.
  - Automatic frame transition cleanup at the end of each game loop tick (`loop.onPostTick()`).
  - Safe reset on pause, stop, dispose, and window blur to prevent stuck keys.
  - Full typing support with `Keys` constant and `MouseButton` enum.
- **Engine Lifecycle (`packages/engine-core`)**:
  - Full lifecycle state machine: `init()`, `start()`, `pause()`, `resume()`, `stop()`, and `dispose()`.
  - Disposed state protection preventing invalid lifecycle transitions.
  - Safe idempotent initialization and disposal.
- **Game Loop (`packages/engine-core`)**:
  - Decoupled `GameLoop` orchestrating update and render callback phases.
  - Pluggable frame scheduler architecture (`FrameScheduler`, `AutoFrameScheduler`, `ManualFrameScheduler`).
  - High-resolution delta time calculation with max delta time clamping (`maxDeltaTime`) to avoid frame spikes.
  - Duplicate loop protection ensuring only one frame loop can run concurrently.
  - Frame cancellation upon stopping, pausing, or disposing.
- **Editor Integration (`apps/editor`)**:
  - Live frame metrics in status bar (State, Frame count, Delta time ms, FPS).
  - Interactive "Step Frame" debugging button.
  - Attached `DomInputAdapter` to engine input runtime.
  - Live input diagnostics in the editor viewport showing active mouse coordinates and currently held keys in real-time.
  - Live `Transform2D` hierarchy diagnostic in viewport showing parent rotation and child world position.
- **WebGL2 Renderer Foundation (`packages/renderer`)**:
  - `WebGLContext`: safe WebGL2 canvas wrapper with viewport resizing, context-loss hooks, and color clearing.
  - `ShaderProgram`: compiled/linked GLSL program wrapper with attribute and uniform caching.
  - `Camera2D`: orthographic view-projection matrix generation for world-to-screen transforms.
  - `Texture2D` and `TextureLoader`: GPU texture creation and image uploads for sprite assets.
  - `SpriteBatch`: CPU-side quad batching system with a shared VAO/VBO/IBO and draw-call aggregation.
  - Package-level exports via `@aether/renderer` and workspace integration into the editor application.
- **Interactive Renderer Preview (`apps/editor`)**:
  - Uses bundled Kenney New Platformer Pack (CC0) assets for a green adventurer with idle/walk animation, a sky backdrop, grass terrain, and gold coins.
  - Adds keyboard-controlled horizontal movement, jumping, gravity, platform/ground landing, and coin collection to the live WebGL2 viewport.
  - Adds a compact asset subset and its CC0 license to the editor source so Vite includes every texture in production builds.
  - Corrects sprite UV orientation for top-left-origin images and camera center mapping; adds world/screen conversion tests for viewport dimensions and zoom.
- **Testing**:
  - Expanded test suite to 53 unit tests across 7 test files (engine lifecycle, game loop, input, math utilities, Vector2, Matrix3, Transform2D).

## [0.1.0] - 2026-11-01

### Added
- **Monorepo Structure**: Set up npm workspaces with `apps/*` and `packages/*`.
- **Engine Core Package (`packages/engine-core`)**:
  - Independent TypeScript package with zero UI/rendering dependencies.
  - Basic 2D math foundation (`Vector2`).
  - Core engine lifecycle management (`Engine`, `EngineConfig`, `EngineState`).
  - Unit tests covering math operations and state transitions with Vitest.
- **Editor App (`apps/editor`)**:
  - React 18 + Vite desktop-ready editor application shell.
  - Workspace link consuming `@aether/engine-core`.
  - Dark mode layout with top navigation, scene hierarchy, inspector placeholder, and status bar.
- **Tooling & Configuration**:
  - Root strict TypeScript configuration (`tsconfig.base.json`).
  - Vitest test runner configuration across workspaces (`vitest.config.ts`).
  - Node.js version pinning via `.node-version` and `.nvmrc` (`26.13.0`).
  - `.gitignore` covering build outputs, test coverage, and IDE files.
  - Root documentation (`README.md`, `CHANGELOG.md`, `AGENTS.md`).
