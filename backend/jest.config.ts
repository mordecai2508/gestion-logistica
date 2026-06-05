import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  testEnvironmentOptions: {
    env: {
      NODE_ENV: 'test',
    },
  },
  setupFiles: ['<rootDir>/src/tests/setup.ts'],
};

export default config;
