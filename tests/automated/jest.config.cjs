module.exports = {
  // Use ts-jest ESM preset so TS keeps ESM semantics
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  roots: ['<rootDir>/'],
  modulePaths: ['<rootDir>/../../src'],
  testMatch: [
    '**/integration/simple.test.ts'
  ],
  // Treat TS files as ESM and compile with ts-jest in ESM mode
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: {
          // Ensure ESM + import attributes support during test transforms
          module: 'nodenext',
          moduleResolution: 'nodenext',
          target: 'es2022',
          esModuleInterop: true,
          resolveJsonModule: true,
          isolatedModules: true,
          strict: true
        }
      }
    ]
  },
  // Map ESM-style .js imports in TS source back to TS during tests
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1'
  },
  collectCoverageFrom: [
    '../../src/**/*.ts',
    '!../../src/**/*.d.ts',
    '!../../src/index.ts'
  ],
  coverageDirectory: './coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },
  testTimeout: 30000,
  verbose: true
};
