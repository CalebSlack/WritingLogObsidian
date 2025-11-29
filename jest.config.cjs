module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    "^obsidian$": "<rootDir>/__tests__/__mocks__/obsidian.ts"
  },
  testMatch: [
    "**/__tests__/**/*.ts",
    "!**/__tests__/__mocks__/**/*.ts", // Exclude mock files from being treated as test suites
    "**/?(*.)+(spec|test).ts"
  ],
};