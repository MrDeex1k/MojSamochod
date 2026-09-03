// Fail loudly if the local facade starts loading remote token registration as a side effect.
jest.mock("expo-notifications/build/DevicePushTokenAutoRegistration.fx", () => {
  throw new Error("Remote registration loaded");
});
jest.mock("expo-notifications/build/TokenEmitter", () => {
  throw new Error("Push token emitter loaded");
});

it("loads local APIs without executing push-token registration", () => {
  const local = jest.requireActual<typeof import("./local-notifications-api")>(
    "./local-notifications-api",
  );
  expect(local.scheduleNotificationAsync).toEqual(expect.any(Function));
  expect(local.getPermissionsAsync).toEqual(expect.any(Function));
  expect(local.setNotificationHandler).toEqual(expect.any(Function));
  expect(local.getAllScheduledNotificationsAsync).toEqual(expect.any(Function));
  expect(local.cancelScheduledNotificationAsync).toEqual(expect.any(Function));
});
