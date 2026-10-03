const { withMainApplication } = require("expo/config-plugins");

// SDK 58's host factory defaults to the prebuilt React library's release flag.
module.exports = function withSdk58AndroidDebug(config) {
  return withMainApplication(config, (result) => {
    const original = "context = applicationContext,";
    const replacement = `${original}\n      useDevSupport = BuildConfig.DEBUG,`;
    if (!result.modResults.contents.includes("useDevSupport = BuildConfig.DEBUG")) {
      if (!result.modResults.contents.includes(original)) {
        throw new Error(
          "The Expo Android host template changed; review its developer support flag.",
        );
      }
      result.modResults.contents = result.modResults.contents.replace(original, replacement);
    }
    return result;
  });
};
