const PANE_MIN_WIDTH = 320;
const WORKSPACE_GUTTERS = 48;

export function fitsWorkspaceList(width: number, height: number, fontScale: number) {
  return height >= 500 && width >= WORKSPACE_GUTTERS + 2 * PANE_MIN_WIDTH * Math.max(1, fontScale);
}
