import { test } from "@e2e-dev/mobile";
import { expect } from "e2e";

test("keeps the first vehicle after a cold restart", async ({ app, platform, screen }) => {
  await app.clearState();

  // Tap the blank form gutter on iOS. Numeric keyboards may have no dismiss key.
  const gutter = { x: 8, y: 200 };

  await screen.getByTestId("first-vehicle-make").fill("Volvo");
  await screen.getByTestId("first-vehicle-model").fill("V60");
  if (platform === "ios") await screen.tapAt(gutter);

  const capacity = screen.getByTestId("vehicle-fuel-tank-capacity");
  await screen.scrollUntilVisible(capacity);
  await capacity.fill("50");
  if (platform === "ios") await screen.tapAt(gutter);

  const save = screen.getByTestId("first-vehicle-save");
  await screen.scrollUntilVisible(save);
  await save.tap();

  const vehicle = screen.getByText("Volvo V60");
  await expect(vehicle).toBeVisible();

  await app.restart();
  await expect(vehicle).toBeVisible();
});
