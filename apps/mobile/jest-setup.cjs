jest.mock("react-native-worklets", () => require("react-native-worklets/src/mock"));
jest.mock("react-native-reanimated", () => {
  const actual = jest.requireActual("react-native-reanimated");
  const native = jest.requireActual("react-native");
  // React Native's test renderer has no native host instances for Reanimated's CSS wrapper.
  return {
    __esModule: true,
    ...actual,
    createAnimatedComponent: (Component) => Component,
    default: {
      ...actual.default,
      View: native.View,
      Text: native.Text,
      Image: native.Image,
      ScrollView: native.ScrollView,
      FlatList: native.FlatList,
      createAnimatedComponent: (Component) => Component,
    },
  };
});

require("react-native-reanimated").setUpTests();

jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);
