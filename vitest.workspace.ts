import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  {
    test: {
      name: 'shared',
      root: './packages/shared',
      include: ['tests/**/*.test.ts'],
    },
  },
  {
    test: {
      name: 'server',
      root: './packages/server',
      include: ['tests/**/*.test.ts'],
    },
  },
  {
    test: {
      name: 'dashboard',
      root: './packages/dashboard',
      include: ['tests/unit/**/*.test.{ts,tsx}'],
      environment: 'jsdom',
    },
  },
]);
