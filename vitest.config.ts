import { defineConfig } from 'vitest/config';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['packages/**/*.{test,spec}.ts', 'apps/**/*.{test,spec}.{ts,tsx}'],
  },
  resolve: {
    alias: {
      '@aether/engine-core': path.resolve(__dirname, 'packages/engine-core/src/index.ts'),
    },
  },
});
