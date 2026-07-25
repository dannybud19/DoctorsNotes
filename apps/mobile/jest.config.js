// Render tests via jest-expo + @testing-library/react-native. Tests live in __tests__/ (outside
// app/) so Expo Router never treats them as routes.
module.exports = {
  preset: "jest-expo",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  testMatch: ["<rootDir>/__tests__/**/*.test.tsx"],
  transformIgnorePatterns: [
    "node_modules/.pnpm/(?!(.*(react-native|@react-native|@react-native-community|expo|@expo|expo-router|expo-modules-core|react-native-web|react-native-safe-area-context|react-native-screens|@doctorsnotes)))",
  ],
};
