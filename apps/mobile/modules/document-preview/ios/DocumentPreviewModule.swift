import ExpoModulesCore
import PDFKit
import UIKit

public class DocumentPreviewModule: Module {
  public func definition() -> ModuleDefinition {
    Name("DocumentPreview")

    AsyncFunction("renderPage") { (uri: String, pageIndex: Int) -> [String: Any] in
      let documents = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
      let root = documents.appendingPathComponent("managed-objects/objects").standardizedFileURL.resolvingSymlinksInPath()
      guard let source = URL(string: uri), source.isFileURL,
        source.standardizedFileURL.resolvingSymlinksInPath().path.hasPrefix(root.path + "/"),
        let document = PDFDocument(url: source), !document.isLocked,
        pageIndex >= 0, pageIndex < document.pageCount,
        let page = document.page(at: pageIndex)
      else { throw PreviewError.invalidDocument }

      let bounds = page.bounds(for: .mediaBox)
      guard bounds.width > 0, bounds.height > 0 else { throw PreviewError.invalidDocument }
      let ratio = min(1600 / bounds.width, 1600 / bounds.height)
      let image = page.thumbnail(of: CGSize(width: bounds.width * ratio, height: bounds.height * ratio), for: .mediaBox)
      guard let data = image.pngData() else { throw PreviewError.invalidDocument }
      let cache = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0].appendingPathComponent("document-previews")
      try FileManager.default.createDirectory(at: cache, withIntermediateDirectories: true)
      let output = cache.appendingPathComponent(UUID().uuidString + ".png")
      try data.write(to: output, options: .atomic)
      return ["uri": output.absoluteString, "pageCount": document.pageCount, "text": page.string ?? ""]
    }
  }
}

private enum PreviewError: Error {
  case invalidDocument
}
