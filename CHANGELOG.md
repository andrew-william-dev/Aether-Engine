# Changelog

All notable changes to the Aether Engine project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
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
- **Testing**:
  - Expanded test suite to 18 unit tests covering deterministic loop scheduling, delta time clamping, pause/resume behavior, and lifecycle errors.

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
