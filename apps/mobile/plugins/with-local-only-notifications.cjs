const { withEntitlementsPlist } = require("expo/config-plugins");

// expo-notifications adds the APNs entitlement even when background remote notifications
// are disabled. This phase uses local notifications only and does not require APNs signing.
// Register BEFORE expo-notifications: entitlements mods unwind in reverse registration order.
module.exports = function withLocalOnlyNotifications(config) {
  return withEntitlementsPlist(config, (result) => {
    delete result.modResults["aps-environment"];
    return result;
  });
};
