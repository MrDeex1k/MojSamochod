const TABLET_MIN_WIDTH = 600;

export type WindowLayout =
  | "phone-landscape"
  | "phone-portrait"
  | "tablet-landscape"
  | "tablet-portrait";

export function resolveWindowLayout(width: number, height: number): WindowLayout {
  const isTablet = width >= TABLET_MIN_WIDTH && height >= 500;
  const isLandscape = width >= height;

  if (isTablet) {
    return isLandscape ? "tablet-landscape" : "tablet-portrait";
  }

  return isLandscape ? "phone-landscape" : "phone-portrait";
}
