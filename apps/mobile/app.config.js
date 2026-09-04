module.exports = ({ config }) => {
  if (process.env.MOJE_AUTO_NATIVE_QA !== "1") return config;

  // Local native acceptance builds keep storage and permissions separate from production builds.
  return {
    ...config,
    ios: { ...config.ios, bundleIdentifier: "dev.mojeauto.qa" },
    android: { ...config.android, package: "dev.mojeauto.qa" },
  };
};
