module.exports = ({ config }) => {
  if (process.env.MOJE_AUTO_NATIVE_QA !== "1") return config;

  // Local native acceptance builds only; store identifiers remain a separate release decision.
  return {
    ...config,
    ios: { ...config.ios, bundleIdentifier: "dev.mojeauto.qa" },
    android: { ...config.android, package: "dev.mojeauto.qa" },
  };
};
