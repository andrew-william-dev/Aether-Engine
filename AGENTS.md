# AGENTS.md — Agent & Contributor Guidelines for Aether Engine

Welcome to the Aether Engine codebase. This document outlines the core architectural boundaries, coding conventions, and workflow rules that must be respected by both AI agents and human contributors.

---

## 1. Architectural Principles

1. **Separation of Concerns**:
   - `packages/engine-core`: **MUST NEVER** import React, DOM rendering libraries, or visual UI components. It is a headless, platform-agnostic 2D engine runtime.
   - `apps/editor`: Provides the user interface (React + Vite) and consumes `@aether/engine-core`.
   - `apps/desktop` (future): The Electron wrapper hosting the editor and handling native filesystem access.
2. **No Third-Party Game Engines**:
   - Do **NOT** install Phaser, Pixi.js, Three.js, Babylon.js, or similar high-level engine libraries. Aether Engine is an educational, custom-built engine designed to implement its own 2D WebGL2 pipeline and scene graph from first principles.
3. **Pure Math & Determinism**:
   - All math classes (`Vector2`, `Matrix3`, `Transform2D`) must be pure and accompanied by unit tests.

---

## 2. Monorepo & Dependency Rules

- Workspaces are managed using **npm workspaces**:
  - `packages/*` for shared engine libraries.
  - `apps/*` for runnable applications.
- In workspace `package.json` files, reference internal packages using `*` (e.g., `"@aether/engine-core": "*"`).
- Always run dependency installations from the repository root:
  ```bash
  npm install
  ```
- Do not mix package managers (do not use yarn or pnpm lockfiles; stick strictly to `npm`).

---

## 3. TypeScript & Code Standards

- **Strict Mode**: TypeScript strict mode is enabled in `tsconfig.base.json` (`strict: true`, `noUncheckedIndexedAccess: true`, `noImplicitOverride: true`).
- Avoid `any`. Use `unknown` with type narrowing or generic parameters where type flexibility is required.
- Maintain comprehensive JSDoc comments on public APIs, classes, and exported functions.
- Preserve existing comments and docstrings.

---

## 4. Testing Standards

- All new features in `engine-core` must have corresponding test suites in `tests/` using **Vitest**.
- Run `npm test` before declaring any task or milestone complete.
- Verify both positive and edge cases (e.g., divide-by-zero on zero vectors, state machine transitions).

---

## 5. Milestone Cadence

- Work strictly within the current milestone scope.
- Do not anticipate or pre-implement future milestones without explicit user request.
- Keep changes concise, clean, and well-documented in `CHANGELOG.md`.
