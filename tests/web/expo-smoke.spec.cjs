const { expect, test } = require("@playwright/test");

// The development shell is rendered by Expo Router. Native storage and picker flows
// are verified by the mobile tests and native QA.
test.use({ javaScriptEnabled: false });

for (const path of ["/", "/vehicle/documents"]) {
  test(`serves the Expo Web shell and its JavaScript bundle at ${path}`, async ({ page }) => {
    const document = await page.goto(path, { waitUntil: "domcontentloaded" });
    expect(document?.status()).toBe(200);
    expect(document?.headers()["content-type"]).toContain("text/html");

    const entry = page.locator('script[src*=".bundle?platform=web"]');
    await expect(entry.first()).toHaveAttribute("src", /\.bundle\?/);
    const bundleURL = new URL(await entry.first().getAttribute("src"), page.url());
    const bundle = await page.request.get(bundleURL.href);
    await expect(bundle).toBeOK();
    expect(bundle.headers()["content-type"]).toContain("javascript");
    expect(await bundle.text()).toContain("expo-router");
  });
}
