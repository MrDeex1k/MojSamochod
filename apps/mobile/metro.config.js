const { getDefaultConfig } = require("expo/metro-config");
const { withNativewind } = require("nativewind/metro");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);
config.resolver.sourceExts.push("sql");
config.resolver.assetExts.push("wasm");

module.exports = withNativewind(config, {
  // Preserve platform theme roles for the Android Material palette provider.
  inlineVariables: {
    exclude: [
      "--theme-color-canvas",
      "--theme-color-surface",
      "--theme-color-surface-strong",
      "--theme-color-surface-muted",
      "--theme-color-text-primary",
      "--theme-color-text-secondary",
      "--theme-color-accent",
      "--theme-color-accent-pressed",
      "--theme-color-on-accent",
      "--theme-color-divider",
      "--theme-color-danger",
      "--theme-color-warning",
      "--theme-color-success",
      "--text-title",
      "--text-heading",
      "--text-label",
      "--text-title--line-height",
      "--text-heading--line-height",
      "--text-label--line-height",
      "--radius-panel",
      "--radius-control",
      "--radius-compact",
    ],
  },
});
