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

jest.mock("@expo/ui", () => {
  const React = require("react");
  const { View, Text, Pressable } = require("react-native");
  const Picker = ({ selectedValue, onValueChange, children }) =>
    React.createElement(
      View,
      null,
      React.Children.map(children, (child) =>
        React.createElement(
          Pressable,
          {
            accessibilityRole: "button",
            accessibilityState: { selected: child.props.value === selectedValue },
            onPress: () => onValueChange(child.props.value),
          },
          React.createElement(Text, null, child.props.label),
        ),
      ),
    );
  Picker.Item = () => null;
  return {
    Host: View,
    Picker,
    Switch: ({ label, value, disabled, onValueChange }) =>
      React.createElement(Pressable, {
        accessibilityLabel: label,
        accessibilityRole: "switch",
        accessibilityState: { checked: value, disabled },
        disabled,
        onValueChange,
        onPress: () => onValueChange(!value),
      }),
  };
});
jest.mock("@expo/ui/community/segmented-control", () => {
  const React = require("react");
  const { View, Text, Pressable } = require("react-native");
  return {
    __esModule: true,
    default: ({ values, selectedIndex, onChange }) =>
      React.createElement(
        View,
        null,
        values.map((label, index) =>
          React.createElement(
            Pressable,
            {
              key: label,
              accessibilityRole: "button",
              accessibilityState: { selected: index === selectedIndex },
              onPress: () => onChange({ nativeEvent: { selectedSegmentIndex: index } }),
            },
            React.createElement(Text, null, label),
          ),
        ),
      ),
  };
});

jest.mock("@expo/ui/swift-ui", () => {
  const React = require("react");
  const { View, Text, Pressable } = require("react-native");
  const Close = React.createContext(() => {});
  return {
    Menu: ({ label, modifiers, children }) => {
      const [open, setOpen] = React.useState(false);
      const disabled = modifiers?.some((item) => item.$type === "disabled" && item.disabled);
      return React.createElement(
        View,
        null,
        React.createElement(
          Pressable,
          {
            accessibilityRole: "button",
            accessibilityState: { disabled },
            disabled,
            onPress: () => setOpen(true),
          },
          React.createElement(Text, null, label),
        ),
        open && React.createElement(Close.Provider, { value: () => setOpen(false) }, children),
      );
    },
    Button: ({ label, onPress }) => {
      const close = React.useContext(Close);
      return React.createElement(
        Pressable,
        {
          accessibilityRole: "button",
          onPress: () => {
            close();
            onPress();
          },
        },
        React.createElement(Text, null, label),
      );
    },
  };
});
