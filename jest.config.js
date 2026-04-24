module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src/__tests__'],
  testMatch: ['**/unit/**/*.test.ts', '**/integration/**/*.test.ts'],
  maxWorkers: 1,
  maxConcurrency: 1,
  testTimeout: 15 * 60 * 1000,
};
