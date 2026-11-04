import { materialKeyboardOptions } from "./material-keyboard-options";
it("preserves decimal entry and avoids autocorrect for monetary amounts", () => {
  expect(materialKeyboardOptions({ inputMode: "decimal" })).toMatchObject({
    keyboardType: "decimal",
    autoCorrectEnabled: false,
  });
});
it("preserves the requested next action and capitalization", () => {
  expect(
    materialKeyboardOptions({ returnKeyType: "next", autoCapitalize: "characters" }),
  ).toMatchObject({ imeAction: "next", capitalization: "characters" });
});
it("allows multiline notes without a keyboard done action", () => {
  expect(materialKeyboardOptions({ multiline: true })).toMatchObject({
    imeAction: "default",
    keyboardType: "text",
  });
});
