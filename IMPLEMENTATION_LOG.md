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

### 4. Status & Verification
- **Unit Tests**: 18 / 18 tests passing across 3 test files.
- **TypeScript Typecheck**: 0 errors across all workspaces.
- **Production Build**: Both packages compile cleanly with zero errors.
- **Git State**: Clean working tree committed to `main` branch.

---

## [2026-11-01] — Milestone 1 (Continued): Platform-Independent Input System

### 1. Vision & Scope
Implement an input subsystem inside `packages/engine-core` that:
- Supports keyboard and mouse state tracking (down/held, pressed this frame, released this frame, up).
- Tracks mouse position, relative movement deltas, and wheel scrolling.
- Maintains zero DOM dependencies in `engine-core` while providing an adapter bridge (`DomInputAdapter`) for browser/editor environments.
- Automatically synchronizes frame transitions with `GameLoop` and clears inputs safely on reset or window blur.

---

### 2. Features & Deliverables Added

- **Input Types & Constants (`packages/engine-core/src/input/types.ts`)**:
  - `Keys`: Standard key code constants (`KeyW`, `Space`, `ArrowUp`, etc.) matching `KeyboardEvent.code`.
  - `MouseButton` enum: `Left` (0), `Middle` (1), `Right` (2), `Back` (3), `Forward` (4).
  - `InputEventReceiver`: Interface implemented by `InputManager` to receive external raw events.
  - `InputAdapter`: Interface for platform-specific event bridges.

- **Input Manager (`packages/engine-core/src/input/input-manager.ts`)**:
  - Independent state tracking for held keys, keys pressed this frame, and keys released this frame.
  - Mouse button tracking (down, pressed, released, up).
  - Mouse position vector, frame movement delta vector, and wheel delta vector.
  - `endFrame()`: Clears frame-local transitions (`pressedKeys`, `releasedKeys`, mouse deltas).
  - `reset()`: Completely clears all held and transition states to prevent stuck inputs.

- **DOM Input Adapter (`packages/engine-core/src/input/dom-adapter.ts`)**:
  - Attaches to standard DOM event targets (`window`, `document`, or specific `<canvas>`).
  - Converts browser `keydown`, `keyup`, `mousedown`, `mouseup`, `mousemove`, and `wheel` events to engine events.
  - Automatically translates mouse client coordinates to element-relative canvas coordinates via `getBoundingClientRect()`.
  - Automatically resets input state on window `blur` (e.g. user Alt-Tabs or focuses another application).

- **GameLoop Post-Tick Hook (`packages/engine-core/src/core/loop.ts`)**:
  - Added `onPostTick(callback)` to `GameLoop`.
  - Dispatched at the conclusion of both `tick()` and `step()`, allowing `Engine` to automatically call `input.endFrame()` after all updates and renders complete.

- **Engine Integration (`packages/engine-core/src/core/engine.ts`)**:
  - Added `engine.input: InputManager`.
  - Automatically calls `input.reset()` on `pause()`, `stop()`, and `dispose()`.

- **Editor Integration (`apps/editor/src/App.tsx`)**:
  - Attached `DomInputAdapter` to the engine.
  - Added live input diagnostics in the central editor viewport, displaying mouse coordinates and currently held key badges in real-time.

- **Unit Tests (`packages/engine-core/tests/input.test.ts`)**:
  - Added 9 unit tests (total 27 tests).
  - Tested:
    1. Key state transitions across multiple frames (down, pressed, released, up).
    2. Rapid single-frame key tap preservation (both pressed and released in same frame).
    3. OS key repeat suppression while key is held down.
    4. Mouse button states (down, pressed, released).
    5. Mouse coordinates, frame movement deltas, and wheel scrolling.
    6. Safe reset on `reset()`.
    7. `DomInputAdapter` event mapping and coordinate translation with mock DOM target.
    8. Engine loop frame transition cleanup and pause/stop reset.

---

### 3. Issues Encountered & How They Were Resolved

#### Issue 1: Key Repeat Flooding "Just Pressed" State
- **Symptom**: In OS keyboard settings, holding down a key fires repeated `keydown` events every few milliseconds. If unchecked, this would cause `isKeyPressed` to trigger repeatedly as if the user was spamming the key.
- **Root Cause**: `feedKeyDown` was invoked repeatedly by the browser for a key that was already down.
- **Resolution**: In `InputManager.feedKeyDown`, check `if (!this._heldKeys.has(key))`. The key is only added to `_pressedKeys` if it was not already held down.

#### Issue 2: Stuck Keys on Application Blur / Tab Switching
- **Symptom**: If a player holds `KeyW` and presses `Alt-Tab` to switch windows, the browser never delivers the `keyup` event, leaving the character walking forever.
- **Root Cause**: The `keyup` event is dropped when the window loses focus.
- **Resolution**: Added a `window.onblur` listener inside `DomInputAdapter` that invokes `receiver.reset()`, clearing all held keys and mouse buttons when the window loses focus.

#### Issue 3: Viewport Offset Coordinates
- **Symptom**: When embedding a game canvas in an editor with sidebars, `e.clientX` / `e.clientY` gives window-relative coordinates rather than canvas-relative coordinates.
- **Root Cause**: Browser mouse events are reported relative to the browser viewport.
- **Resolution**: In `DomInputAdapter`, if the target provides `getBoundingClientRect()`, the adapter subtracts `rect.left` and `rect.top` to provide precise local coordinates `(0, 0)` at the canvas top-left.

---

### 4. Current Status & Verification
- **Unit Tests**: 27 / 27 tests passing across 4 test files.
- **TypeScript Typecheck**: 0 errors across all workspaces.
- **Production Build**: Both `@aether/editor` and `@aether/engine-core` compile cleanly.
- **Git State**: Ready to commit.

---

## [2026-11-01] — Milestone 2: 2D Math Foundation & Transform System

### 1. Vision & Scope
Build the complete pure-math foundation that every subsequent engine system (renderer, scene graph, physics) will depend upon:
- **`MathUtils`**: Common numeric utilities and constants (clamping, lerp, angle conversion, epsilon comparison).
- **`Vector2`** (extended): A complete 2D vector with static factories, geometric operations, and immutable transformation methods.
- **`Matrix3`**: A column-major 3×3 affine transformation matrix stored as `Float32Array` for direct WebGL uniform upload.
- **`Transform2D`**: A scene-graph node encapsulating position, rotation, scale, and pivot with a dirty-flag caching system for parent-child world matrix propagation.

All four modules are strictly unit-tested and are free of any DOM, React, or platform-specific imports.

---

### 2. Features & Deliverables Added

- **`packages/engine-core/src/math/math-utils.ts`**:
  - Constants: `EPSILON`, `DEG_TO_RAD`, `RAD_TO_DEG`.
  - Functions: `degToRad`, `radToDeg`, `clamp`, `lerp`, `approxEquals`, `normalizeAngle`.

- **`packages/engine-core/src/math/vector2.ts`** (extended):
  - Directional statics: `Vector2.up`, `Vector2.down`, `Vector2.left`, `Vector2.right`, `Vector2.fromAngle(radians)`.
  - Immutable chaining operations: `multiply`, `divide`, `negate`, `rotate`, `lerp`, `perpendicular`.
  - Geometric utilities: `cross`, `distance`, `distanceSquared`, `angle`, `angleTo`.
  - Serialization: `toArray`, `fromArray`.

- **`packages/engine-core/src/math/matrix3.ts`**:
  - Internal layout: column-major `Float32Array(9)` matching WebGL2 `uniform mat3` memory layout.
  - Factory statics: `Matrix3.translation`, `Matrix3.rotation`, `Matrix3.scaling`, `Matrix3.orthographic`.
  - Mutation methods: `translate`, `rotate`, `scale`, `setTRS`.
  - Algebra: `multiply`, `premultiply`, `determinant`, `invert`.
  - Application: `transformPoint(v)`, `transformVector(v)`.
  - Export: `toFloat32Array()`.

- **`packages/engine-core/src/math/transform2d.ts`**:
  - Properties: `position: Vector2`, `rotation: number` (radians), `scale: Vector2`, `pivot: Vector2`.
  - Dirty-flag caching: `_isLocalDirty` / `_isWorldDirty` flags cleared by `getLocalMatrix()` / `getWorldMatrix()`.
  - Parent-child linking: `setParent`, `addChild`, `removeChild`, `children` array.
  - Dirty propagation: any mutation on a parent marks all descendants' `_isWorldDirty = true`.
  - World-space utilities: `transformPoint(localPoint)`, `inverseTransformPoint(worldPoint)`.
  - Inspection: `isLocalDirty`, `isWorldDirty`, `isDirty` (union of both flags).

- **`packages/engine-core/src/math/index.ts`**: Exports all 4 math modules.

- **`apps/editor/src/App.tsx`** (updated): Added live `Transform2D` hierarchy diagnostic in the editor viewport — a `parentTransform` rotating per frame with a `childTransform` parented at local offset `(50, 0)`, displaying real-time world position.

- **`packages/engine-core/tests/`**: 4 new test files, 26 new tests:
  - `math-utils.test.ts`: 6 tests for utilities and constants.
  - `vector2.test.ts`: Extended with 8 tests for new geometric methods.
  - `matrix3.test.ts`: 7 tests for column-major layout, TRS composition, inversion, and transforms.
  - `transform2d.test.ts`: 5 tests for hierarchy propagation, dirty flags, and world-space transforms.

---

### 3. Issues Encountered & How They Were Resolved

#### Issue 1: `setTRS` — Undefined `radians` Variable
- **Symptom**: TypeScript compiled successfully but `Matrix3.setTRS` produced incorrect rotation matrices at runtime because `Math.sin` and `Math.cos` received `undefined`.
- **Root Cause**: A copy-paste error in `matrix3.ts` — the line `const s = Math.sin(radians)` used a variable named `radians` that was never declared in that scope. The actual parameter was named `rotation`.
- **Resolution**: Changed both lines to `Math.sin(rotation)` and `Math.cos(rotation)` to match the parameter name.
- **Lesson**: TypeScript's strict mode catches type errors but not incorrect identifier names that happen to exist in a different scope (or `undefined` globals in non-strict JS contexts). Tests for specific numeric output are essential for math code — a type system alone is not sufficient.

#### Issue 2: `isDirty` Still True After `getLocalMatrix()` in Tests
- **Symptom**: A test called `transform.getLocalMatrix()` and then asserted `transform.isDirty === false`. The assertion failed because `isDirty` was still `true`.
- **Root Cause**: `isDirty` was defined as `_isLocalDirty || _isWorldDirty`. Calling `getLocalMatrix()` clears `_isLocalDirty` but leaves `_isWorldDirty = true` (since the world matrix was never recomputed). The test assumed `isDirty` would fully be false after computing the local matrix alone.
- **Resolution**: Split the single `isDirty` getter into two separate getters — `isLocalDirty` and `isWorldDirty` — and kept `isDirty` as their union. Updated the test to assert `isLocalDirty === false` after `getLocalMatrix()`, then call `getWorldMatrix()` and assert `isDirty === false` after both.
- **Lesson**: Fine-grained observability properties (separate local vs. world dirty flags) make testing and debugging significantly easier than combined union flags. When a property has composite sub-conditions, expose each individually.

---

### 4. Current Status & Verification
- **Unit Tests**: 53 / 53 tests passing across 7 test files.
- **TypeScript Typecheck**: 0 errors across all workspaces.
- **Production Build**: Both `@aether/editor` and `@aether/engine-core` compile cleanly with zero warnings.
- **Git State**: Committed to `main` branch.

---

## [2026-11-01] — Bug Fix: Parent Rotation Display Overflow in Editor

### 1. Vision & Scope
Correct the live **Parent Rotation** readout in the editor viewport so it cycles cleanly between `0°` and `359°` instead of accumulating unbounded values like `2547°`.

---

### 2. Files Changed

- **`apps/editor/src/App.tsx`**: Applied display-only degree normalization to the Parent Rotation readout.

---

### 3. Issues Encountered & How They Were Resolved

#### Issue 1: Rotation Display Climbing Past 360°
- **Symptom**: The Parent Rotation value in the editor viewport kept climbing indefinitely (e.g. `2547°`) instead of wrapping around after `359°`.
- **Root Cause**: `Transform2D.rotate(dt * 1.5)` is called every frame, continuously accumulating radians into `parentTransform.rotation`. The underlying value is intentionally unbounded — rotation math works correctly with any radian value. However, the display conversion (`rotation * 180 / Math.PI`) had no wrapping applied, so the degree value climbed forever.
- **Resolution**: Applied a display-only modulo wrap directly in the JSX expression:
  ```tsx
  // Before
  {(parentTransform.rotation * 180 / Math.PI).toFixed(0)}°

  // After
  {((((parentTransform.rotation * 180 / Math.PI) % 360) + 360) % 360).toFixed(0)}°
  ```
  The formula `((deg % 360) + 360) % 360` correctly handles both positive overflow and negative accumulated values, always yielding a result in `[0, 360)`.
- **Lesson**: The `Transform2D` rotation property intentionally stores an unbounded radian accumulator — normalizing it on every mutation would add cost and could break future interpolation logic. Always normalize rotation **at the display or sampling boundary**, not at the storage layer.

---

### 4. Current Status & Verification
- **Unit Tests**: 53 / 53 tests passing across 7 test files (no new tests required — display-only change).
- **TypeScript Typecheck**: 0 errors across all workspaces.
- **Production Build**: Both packages compile cleanly.
- **Git State**: Pending commit.

---

## [2026-11-01] — Milestone 3: WebGL2 Batch Renderer Foundation

### 1. Vision & Scope
Create the first renderer package for Aether Engine, establishing the GPU boundary for future sprite, particle, and UI rendering workflows:
- **`WebGLContext`**: safe canvas wrapper with viewport resizing and context-loss safeguards.
- **`ShaderProgram`**: typed GLSL compiler/linker with attribute and uniform caching.
- **`Camera2D`**: orthographic camera generating a view-projection matrix for world-to-screen transforms.
- **`Texture2D` / `TextureLoader`**: texture creation and asynchronous image uploads.
- **`SpriteBatch`**: batched sprite rendering using a single shared VAO/VBO/IBO and CPU-side quad accumulation.
- **Public package exports** enabling editor tooling and downstream engine consumers to import `@aether/renderer` cleanly.

---

### 2. Features & Deliverables Added

- **`packages/renderer/src/gl/WebGLContext.ts`**:
  - Wraps `WebGL2RenderingContext` with explicit defaults (`alpha: false`, `depth: false`, `stencil: false`, `antialias: false`).
  - Provides `resize()`, `clear()`, and `onContextLost()` hooks for renderer lifecycle upkeep.
  - Enforces `WebGL2` availability and sets a standard alpha-blending mode suitable for 2D sprites.

- **`packages/renderer/src/gl/ShaderProgram.ts`**:
  - Compiles vertex and fragment shaders with detailed error reporting.
  - Links and validates the compiled program.
  - Caches attribute and uniform locations to avoid repeated GPU lookups.
  - Provides typed `setUniformMatrix3fv()` and `setUniform1i()` helpers for render uniforms.

- **`packages/renderer/src/camera/Camera2D.ts`**:
  - Generates an orthographic projection combined with camera translation and zoom.
  - Supports `worldToScreen()` and `screenToWorld()` conversions using the lazily rebuilt view-projection matrix.

- **`packages/renderer/src/texture/Texture2D.ts`**:
  - Stores the OpenGL texture handle and dimensions.
  - Includes a `createWhite()` factory for solid-color quads without requiring an external texture asset.

- **`packages/renderer/src/texture/TextureLoader.ts`**:
  - Loads images asynchronously into GPU textures using `Image` and `texImage2D`.
  - Configures filtering and wrap modes via optional parameters.

- **`packages/renderer/src/batch/SpriteBatch.ts`**:
  - Preallocates a large `Float32Array` vertex buffer and static index buffer for quads.
  - Accumulates up to `MAX_QUADS` per batch and flushes grouped draws per texture.
  - Transforms quad corners by a `Matrix3` world transform and uploads the data to the GPU.
  - Handles draw-call reduction and enables a single `drawElements()` call per texture batch.

- **`packages/renderer/src/index.ts`**:
  - Re-exports the renderer surface so downstream code can use `@aether/renderer` as a complete package rather than deep-importing individual modules.

- **`apps/editor/package.json`**:
  - Adds the workspace `@aether/renderer` dependency so the editor can consume the new rendering package alongside the engine core.

---

### 3. Issues Encountered & How They Were Resolved

#### Issue 1: `@aether/renderer` Was Not Package-Consumable
- **Symptom**: The renderer package built its individual modules, but there was no root `src/index.ts` file, so `dist/index.js` was never generated and imports such as `@aether/renderer` failed at runtime.
- **Root Cause**: The package manifest points at `./dist/index.js`, but the renderer source tree had no entrypoint that exported the public API.
- **Resolution**: Added `packages/renderer/src/index.ts` and re-exported all public renderer classes, shader constants, and texture helpers. This restored the package surface and aligned the package manifest with the emitted build output.

#### Issue 2: Vite Tooling Was Split Across Workspace Root and App Folder
- **Symptom**: After installing workspace dependencies, `vite build` failed with a TypeScript error about incompatible `vite` plugin types coming from two different installs of Vite (`node_modules/vite` vs `apps/editor/node_modules/vite`).
- **Root Cause**: `vite` and `@vitejs/plugin-react` were present in both the monorepo root and the editor workspace, creating a duplicate dependency graph and conflicting TypeScript definitions.
- **Resolution**: Centralized the Vite toolchain in the monorepo root and removed the duplicate workspace-local copies from `apps/editor/package.json`. Re-running `npm install` and `npm run build` resolved the incompatibility.

---

### 4. Current Status & Verification
- **Unit Tests**: 53 / 53 tests passing across 7 files.
- **TypeScript Typecheck**: 0 errors across all workspaces.
- **Production Build**: All workspaces compile successfully, including the newly exported `@aether/renderer` package.
- **Git State**: Ready for the next milestone: scene graph + entity hierarchy integration.

---

## [2026-11-01] — Interactive Renderer Preview Using the Supplied Asset Pack

### 1. Vision & Scope
Make the renderer verifiable in the editor with real artwork and basic playable behavior, using the asset pack supplied in the repository rather than synthetic demo rectangles:
- Load a small, licensed asset subset into WebGL textures.
- Render a composed platformer scene through `Camera2D` and `SpriteBatch`.
- Add keyboard movement, jumping, landing, animated movement frames, and collectible feedback.
- Ensure texture assets are included in both development and production builds.

### 2. Features & Deliverables Added
- **Editor preview (`apps/editor/src/App.tsx`)**:
  - Loads Kenney’s green character idle and walk frames, a solid-sky backdrop, grass terrain, and gold coin assets into GPU textures.
  - Draws the sky, tiled ground, raised platform, coins, and character in ordered sprite batches.
  - Supports A/D and left/right movement, Space/W/Up jumping, gravity, landing on the ground and raised platform, and coin collection.
  - Shows movement instructions, texture load state, player position, held keys, and coin count in the viewport and inspector.
  - Resizes the camera with the canvas and releases observer, input, and GPU resources when the editor unmounts.
- **Bundled asset subset (`apps/editor/src/assets/kenney/`)**:
  - Includes only the seven selected SVG files used by the preview plus the pack’s CC0 license.
  - Retains the full user-provided pack in the repository’s top-level `assets/platformer_assets/` folder without requiring the whole pack in the editor bundle.
- **Renderer (`packages/renderer/src/batch/SpriteBatch.ts`, `packages/renderer/src/camera/Camera2D.ts`)**:
  - Corrects sprite UV orientation to render top-left-origin image assets upright.
  - Makes camera screen/world conversions use top-left-origin pixel coordinates and centers camera position in the viewport.
- **Tests and usage docs**:
  - Adds three `Camera2D` tests for camera center, zoomed round-tripping, and viewport resize.
  - Documents preview controls in the README and changes the changelog.

### 3. Issues Encountered & How They Were Resolved

#### Issue 1: Art-Pack Files Outside the Editor Were Not Bundled for Production
- **Symptom**: Vite emitted the character files but not art referenced from the repository-level `assets/platformer_assets/` directory, which made those URLs dependent on the dev server’s filesystem access.
- **Root Cause**: Those files were outside the editor source module graph, so Vite did not treat them as production assets.
- **Resolution**: Copied only the seven used SVG assets and CC0 license into `apps/editor/src/assets/kenney/` and referenced them through `new URL(..., import.meta.url)`. The build now emits hashed asset files.

#### Issue 2: Sprites and Tiles Were Vertically Inverted
- **Symptom**: The grass tiles appeared upside down and the hills occupied the top of the scene.
- **Root Cause**: SpriteBatch mapped local top vertices to the wrong side of DOM-loaded textures even though world Y and source images both use a top-left origin.
- **Resolution**: Corrected the quad UVs so the top-left world corner samples the source image’s top-left, and validated the result in the editor browser preview.

#### Issue 3: Hills Background Did Not Fit the Editor Viewport
- **Symptom**: The hills artwork stretched awkwardly in the tall editor viewport and competed with the foreground.
- **Root Cause**: A decorative landscape asset was scaled to fill a viewport with a different aspect ratio.
- **Resolution**: Replaced it with the pack’s solid-sky background, keeping the platform and terrain assets as the foreground.

#### Issue 4: Camera Pixel Conversion Did Not Match the Rendered Viewport
- **Symptom**: Camera world/screen helper methods returned normalized device coordinates rather than screen pixels, and camera position was applied relative to the wrong viewport anchor.
- **Root Cause**: The helpers passed pixel coordinates directly to a matrix that maps world positions to NDC, and the view transform applied a center-and-back translation not reflected in the intended camera semantics.
- **Resolution**: Convert between top-left-origin viewport pixels and NDC at the camera boundary, use a camera-centered view transform, and add tests covering center mapping, zoom, round-trip conversion, and resize.

### 4. Current Status & Verification
- **Unit Tests**: 56 / 56 tests passing across 8 files.
- **TypeScript Typecheck**: 0 errors across all workspaces.
- **Production Build**: All workspaces compile; Vite bundles the selected SVGs, emitting larger assets as hashed files and inlining smaller ones.
- **Browser Preview**: Verified on the editor at `http://localhost:3000`; supplied artwork loads and the viewport renders via WebGL2.
