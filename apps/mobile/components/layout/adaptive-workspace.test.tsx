import { fitsWorkspaceList } from "./window-layout";

it.each([
  [687, 800, 1, false],
  [688, 800, 1, true],
  [920, 393, 1, false],
  [1000, 800, 1.6, false],
  [1100, 800, 1.6, true],
] as const)(
  "fits a companion list at %d × %d with text scale %d: %s",
  (width, height, scale, expected) => {
    expect(fitsWorkspaceList(width, height, scale)).toBe(expected);
  },
);
