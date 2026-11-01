# Implementation Log — Aether Engine Journey

A detailed chronological record of architectural milestones, features added, issues encountered, root causes, and resolutions.

---

## [2026-11-01] — Milestone 1: Monorepo Foundation & Initial Project Setup

### 1. Vision & Scope
Establish an independent, beginner-friendly 2D game engine monorepo with:
- Pure TypeScript engine runtime core (`packages/engine-core`).
- React 18 + Vite visual editor interface (`apps/editor`).
- Unified strict TypeScript compilation and Vitest test suite.
- Strict boundaries: no external rendering or game engines (Phaser, Pixi, Three.js).

---

### 2. Features & Deliverables Added

- **Repository Tooling**:
  - Pinned Node.js version via `.node-version` and `.nvmrc` (`v26.13.0`).
  - Strict base TypeScript config (`tsconfig.base.json`) with `strict: true`, `noUncheckedIndexedAccess: true`, and `noImplicitOverride: true`.
  - Comprehensive `.gitignore` covering build outputs (`dist/`, `.vite/`), test coverage, and IDE artifacts.
  - Initial Git repository setup with local commit identity.

- **Workspace Infrastructure (`npm workspaces`)**:
  - Configured root `package.json` with `"workspaces": ["apps/*", "packages/*"]`.
  - Added centralized scripts: `npm run dev`, `npm run build`, `npm test`, `npm run test:watch`, and `npm run typecheck`.

- **Engine Core Package (`packages/engine-core`)**:
  - Independent headless TypeScript package with zero UI/DOM dependencies.
  - Initial 2D math module: `Vector2` with arithmetic, scalar multiplication, dot products, length squared, and normalization.
  - Engine lifecycle controller: `Engine`, `EngineConfig`, and `EngineState` (`uninitialized`, `initialized`, `running`, `paused`, `stopped`).
  - Unit test suite (`vector2.test.ts`, `engine.test.ts`) powered by Vitest.

- **Editor Application (`apps/editor`)**:
  - React 18 + Vite desktop-ready editor application shell.
  - Local workspace dependency linking directly to `@aether/engine-core`.
  - Dark-mode layout with top navigation, scene hierarchy panel, inspector panel, status bar, and viewport canvas placeholder.

- **Documentation**:
  - `README.md`: High-level vision, architecture diagram, getting started guide, and milestone roadmap.
  - `CHANGELOG.md`: Following Keep a Changelog and Semantic Versioning.
  - `AGENTS.md`: Architectural boundaries and contribution rules.

---

### 3. Issues Encountered & How They Were Resolved

#### Issue 1: Missing Tooling & Windows Execution Path
- **Symptom**: Commands like `node`, `npm`, and `git` were initially unrecognized in PowerShell.
- **Root Cause**: Node.js was installed via Fast Node Manager (`fnm`) under user AppData (`AppData\Roaming\fnm\aliases\default`) and Git was installed under `Program Files\Git\cmd`. The current shell session did not have these paths loaded into its session `PATH` variable.
- **Resolution**: Located the tool installations and prepended their binary directories to `$env:Path` for command execution.

#### Issue 2: Workspace Symlink Permissions on Windows (`EPERM: operation not permitted, symlink`)
- **Symptom**: Running `npm install` for the monorepo threw `EPERM: operation not permitted, symlink` when linking `packages/engine-core` to `node_modules/@aether/engine-core`.
- **Root Cause**: On Windows, creating directory symbolic links requires Developer Mode enabled or an elevated execution token. The sandboxed execution environment restricts reparse point creation.
- **Resolution**: Initialized the package dependencies and directory links in the standard system terminal context where directory junctions/symlinks are permitted.

#### Issue 3: TypeScript Type Resolution Across Unbuilt Workspaces (`Cannot find module '@aether/engine-core'`)
- **Symptom**: Running `npm run build` failed when `apps/editor` ran `tsc`, reporting `Cannot find module '@aether/engine-core' or its corresponding type declarations`.
- **Root Cause**: In `npm run build`, npm ran `@aether/editor build` before `@aether/engine-core build`. Because `packages/engine-core/dist` did not exist yet, TypeScript could not resolve the types via `./dist/index.d.ts`.
- **Resolution**:
  1. Configured `"baseUrl": "."` and `"paths": { "@aether/engine-core": ["packages/engine-core/src/index.ts"] }` in `tsconfig.base.json`.
  2. This allows TypeScript and Vite to resolve `@aether/engine-core` directly from source files in development and type-checking, removing the requirement to build the core package first.

#### Issue 4: React 18 Strict Mode Double Mounting (`Cannot initialize engine in state: initialized`)
- **Symptom**: Launching the editor in development threw:
  ```text
  Uncaught Error: Cannot initialize engine in state: initialized
      at Engine.init (engine.ts:33:13)
      at App.tsx:10:12
  ```
- **Root Cause**: React 18+ wraps components in `<React.StrictMode>`, which intentionally double-invokes effects (`useEffect`) during development (`mount` -> `unmount` -> `mount`) to detect missing cleanups. The first mount transitioned `engine.state` to `'initialized'`. The second invocation called `engine.init()` again on the same instance, triggering an unhandled exception.
- **Resolution**:
  1. Made `Engine.init()` idempotent in `packages/engine-core/src/core/engine.ts`: if the engine is already in the `'initialized'` state, subsequent `init()` calls safely no-op.
  2. Added an explicit `destroy()` method to clean up and transition to `'stopped'`.
  3. Guarded `useEffect` in `apps/editor/src/App.tsx` to only trigger `init()` if the engine is `'uninitialized'` or `'stopped'`.
  4. Added a unit test verifying safe idempotent initialization and destruction.

---

### 4. Status & Verification
- **Unit Tests**: 9 / 9 tests passing across 2 test files.
- **TypeScript Typecheck**: 0 errors across all workspaces.
- **Production Build**: Both `@aether/editor` and `@aether/engine-core` compile with zero warnings or errors.
- **Git State**: Clean working tree committed to `main` branch.

---

## [2026-11-01] — Milestone 1 (Continued): Engine Lifecycle & Game Loop

### 1. Vision & Scope
Implement a robust, platform-agnostic engine lifecycle state machine and game loop in `packages/engine-core`:
- Full lifecycle states (`uninitialized`, `initialized`, `running`, `paused`, `stopped`, `disposed`).
- Decoupled `GameLoop` with distinct update and render callback phases.
- Pluggable frame scheduler abstraction (`FrameScheduler`, `AutoFrameScheduler`, `ManualFrameScheduler`) enabling deterministic headless testing in Node without DOM or timers.
- Guard against concurrent loops and frame time spikes.

---

### 2. Features & Deliverables Added

- **Frame Scheduler Abstraction (`packages/engine-core/src/core/scheduler.ts`)**:
  - `FrameScheduler` interface defining `requestFrame`, `cancelFrame`, and `now`.
  - `AutoFrameScheduler`: Platform-agnostic scheduler using `requestAnimationFrame` if available in global scope, falling back to `setTimeout(1000/60)` in headless Node.js.
  - `ManualFrameScheduler`: Deterministic scheduler for unit tests. Allows tests to advance simulated time (`advance(ms)`, `advanceTo(ms)`) and flush queued frames synchronously.

- **Game Loop (`packages/engine-core/src/core/loop.ts`)**:
  - Tracks `deltaTime`, `totalTime`, `frameCount`, and smoothed `fps`.
  - Enforces `maxDeltaTime` clamping (default 0.25s) to prevent large jumps when backgrounded or debugging.
  - Dispatches to `onUpdate(deltaTime)` and `onRender(interpolation)` subscribers.
  - Returns unsubscribe functions for clean listener removal.
  - Proper frame cancellation upon stopping, pausing, or disposing.
  - Timing baseline reset (`resetTiming()`) on resume so paused time is not counted toward delta time.

- **Engine Lifecycle (`packages/engine-core/src/core/engine.ts`)**:
  - Lifecycle state machine: `init()`, `start()`, `pause()`, `resume()`, `stop()`, and `dispose()`.
  - Disposable protection: accessing lifecycle methods on a disposed engine throws descriptive errors.
  - Concurrency guard: multiple calls to `start()` do not spawn duplicate loops.
  - Manual stepping support (`step(manualDeltaTime)`) for frame-by-frame debugging or turn-based testing.

- **Editor UI Integration (`apps/editor/src/App.tsx`)**:
  - Subscribed to engine `onUpdate` to stream live metrics (State, Frame count, Delta time, FPS) in the status bar.
  - Added "Step Frame" button to step simulation frame-by-frame when paused.

- **Unit Tests (`packages/engine-core/tests/loop.test.ts`, `packages/engine-core/tests/engine.test.ts`)**:
  - Added 9 new unit tests (total 18 tests).
  - Tested deterministic frame progression, delta time clamping, duplicate loop prevention, cancellation on stop, and lifecycle error handling.

---

### 3. Issues Encountered & How They Were Resolved

#### Issue 1: Platform Coupling of `requestAnimationFrame` in Node Test Environment
- **Symptom**: Node.js does not have native `requestAnimationFrame` or `cancelAnimationFrame` in global scope.
- **Root Cause**: Hardcoding browser-specific window APIs inside `engine-core` breaks headless testing and violates the architectural boundary in `AGENTS.md`.
- **Resolution**: Introduced the `FrameScheduler` interface. `AutoFrameScheduler` automatically falls back to `setTimeout(..., 16)` and `performance.now()`, while `ManualFrameScheduler` allows unit tests to step frames with zero real-world delays.

#### Issue 2: Delta Time Jump After Resuming from Pause
- **Symptom**: Pausing the engine for 5 seconds and resuming caused the next frame's `deltaTime` to be measured as 5 seconds, resulting in erratic jumps.
- **Root Cause**: `lastTimestampMs` recorded before pausing was compared against current time after resuming.
- **Resolution**: Added `loop.resetTiming()` called during `engine.resume()`. This resets the baseline timestamp to the moment of resumption, ensuring `deltaTime` reflects only the active frame.

---

### 4. Current Status & Verification
- **Unit Tests**: 18 / 18 tests passing across 3 test files.
- **TypeScript Typecheck**: 0 errors across all workspaces.
- **Production Build**: Both packages compile cleanly with zero errors.
- **Git State**: Ready to commit.
