# Changelog

All notable changes to the Aether Engine project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
