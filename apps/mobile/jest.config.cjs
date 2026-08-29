module.exports = {
  clearMocks: true,
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  preset: "jest-expo",
  restoreMocks: true,
  testMatch: ["<rootDir>/**/*.test.{ts,tsx}"],
  transformIgnorePatterns: [
    "/node_modules/(?!(.store|react-native|@react-native|@react-native-community|expo|@expo|@expo-google-fonts|react-navigation|@react-navigation|@sentry/react-native|native-base|standard-navigation))",
    "/node_modules/react-native-reanimated/plugin/",
    "/node_modules/@react-native/babel-preset/",
  ],
  watchman: false,
};
