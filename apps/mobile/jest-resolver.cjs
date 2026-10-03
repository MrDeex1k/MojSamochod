const resolveWorklets = require("react-native-worklets/jest/resolver");

module.exports = (request, options) => {
  // Reanimated's Jest implementation uses JSReanimated rather than native CSS handlers.
  if (options.basedir.includes("react-native-reanimated") && request === "./initializers") {
    options = {
      ...options,
      extensions: options.extensions?.filter((extension) => !extension.includes("native")),
    };
  }
  return resolveWorklets(request, options);
};
