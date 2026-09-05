import { requireOptionalNativeModule } from "expo";

export type RenderedPage = Readonly<{ uri: string; pageCount: number; text: string }>;
export default requireOptionalNativeModule<{
  renderPage(uri: string, pageIndex: number): Promise<RenderedPage>;
}>("DocumentPreview");
