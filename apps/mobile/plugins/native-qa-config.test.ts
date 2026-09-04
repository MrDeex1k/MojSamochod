/** @jest-environment node */

import app from "../app.json";

const configure = require("../app.config");

describe("local native QA configuration", () => {
  const previous = process.env.MOJE_AUTO_NATIVE_QA;
  afterEach(() => {
    if (previous === undefined) delete process.env.MOJE_AUTO_NATIVE_QA;
    else process.env.MOJE_AUTO_NATIVE_QA = previous;
  });

  it("leaves normal Expo configuration untouched", () => {
    delete process.env.MOJE_AUTO_NATIVE_QA;
    expect(configure({ config: app.expo })).toBe(app.expo);
  });

  it("requires an explicit opt-in for the local QA identity", () => {
    process.env.MOJE_AUTO_NATIVE_QA = "0";
    expect(configure({ config: app.expo })).toBe(app.expo);
  });

  it("sets both native QA identifiers without mutating the source configuration", () => {
    process.env.MOJE_AUTO_NATIVE_QA = "1";
    const before = JSON.stringify(app.expo);
    const config = configure({ config: app.expo });
    expect(config.ios).toEqual({ ...app.expo.ios, bundleIdentifier: "dev.mojeauto.qa" });
    expect(config.android).toEqual({ ...app.expo.android, package: "dev.mojeauto.qa" });
    expect(JSON.stringify(app.expo)).toBe(before);
  });
});
