/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  rootDir: "./",
  testMatch: ["<rootDir>/tests/**/*.test.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  setupFiles: ["<rootDir>/tests/setupEnv.ts"],
  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/server.ts",
    "!src/lib/prisma.ts",
    "!src/types/**",
    "!src/jobs/**",
  ],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "text-summary", "html"],
  transform: {
    "^.+\\.ts$": [
      "ts-jest",
      {
        tsconfig: {
          module: "CommonJS",
          target: "ES2022",
          esModuleInterop: true,
          strict: true,
          ignoreDeprecations: "6.0",
          paths: { "@/*": ["./src/*"] },
        },
        diagnostics: { ignoreCodes: [5107] },
      },
    ],
  },
};
