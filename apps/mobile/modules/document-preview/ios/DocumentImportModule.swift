import ExpoModulesCore
import UniformTypeIdentifiers
import UIKit

private let bookmarkPrefix = "document-bookmark:"

public class DocumentImportModule: Module {
  @MainActor private var selection: DocumentSelection?

  public func definition() -> ModuleDefinition {
    Name("DocumentImport")

    AsyncFunction("pick") { (limit: Int, promise: Promise) in
      MainActor.assumeIsolated {
        guard self.selection == nil, let host = self.appContext?.utilities?.currentViewController() else {
          promise.reject("ERR_DOCUMENT_PICKER", "Document picker is unavailable")
          return
        }
        let picker = UIDocumentPickerViewController(forOpeningContentTypes: [.pdf, .jpeg, .png], asCopy: false)
        let selection = DocumentSelection(limit: limit, promise: promise) { self.selection = nil }
        self.selection = selection
        picker.delegate = selection
        picker.modalPresentationStyle = .pageSheet
        picker.presentationController?.delegate = selection
        host.present(picker, animated: true)
      }
    }.runOnQueue(.main)

    AsyncFunction("copyToStaging") { (token: String, destination: URL, limit: Int) -> Bool in
      guard token.hasPrefix(bookmarkPrefix),
        let bookmark = Data(base64Encoded: String(token.dropFirst(bookmarkPrefix.count))),
        destination.isFileURL, limit > 0 else { throw ImportError.invalidSource }
      let root = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
        .appendingPathComponent("managed-objects/staging")
      guard (try? destination.resourceValues(forKeys: [.isSymbolicLinkKey]).isSymbolicLink) != true,
        destination.deletingLastPathComponent().standardizedFileURL.resolvingSymlinksInPath().path == root.standardizedFileURL.resolvingSymlinksInPath().path else { throw ImportError.invalidSource }
      var stale = false
      let source = try URL(resolvingBookmarkData: bookmark, options: [], relativeTo: nil, bookmarkDataIsStale: &stale)
      let scoped = source.startAccessingSecurityScopedResource()
      defer { if scoped { source.stopAccessingSecurityScopedResource() } }

      var coordinationError: NSError?
      var result: Result<Bool, Error>?
      NSFileCoordinator().coordinate(readingItemAt: source, options: [], error: &coordinationError) { url in
        result = Result { try copyBounded(url, to: destination, limit: limit) }
      }
      if let coordinationError { throw coordinationError }
      guard let result else { throw ImportError.invalidSource }
      return try result.get()
    }
  }
}

private enum ImportError: Error { case invalidSource }

private func copyBounded(_ source: URL, to destination: URL, limit: Int) throws -> Bool {
  let input = try FileHandle(forReadingFrom: source)
  defer { try? input.close() }
  try Data().write(to: destination)
  var completed = false
  defer {
    if !completed { try? FileManager.default.removeItem(at: destination) }
  }
  let output = try FileHandle(forWritingTo: destination)
  defer { if !completed { try? output.close() } }
  var total = 0
  while let bytes = try input.read(upToCount: min(65535, limit - total) + 1), !bytes.isEmpty {
    if bytes.count > limit - total { return false }
    total += bytes.count
    try output.write(contentsOf: bytes)
  }
  guard total > 0 else { return false }
  try output.close()
  completed = true
  return true
}

@MainActor private final class DocumentSelection: NSObject, UIDocumentPickerDelegate, UIAdaptivePresentationControllerDelegate {
  let limit: Int
  let promise: Promise
  let finish: () -> Void
  init(limit: Int, promise: Promise, finish: @escaping () -> Void) {
    self.limit = limit
    self.promise = promise
    self.finish = finish
  }
  func documentPickerWasCancelled(_ controller: UIDocumentPickerViewController) { cancel() }
  func presentationControllerDidDismiss(_ presentationController: UIPresentationController) { cancel() }
  private func cancel() {
    promise.resolve(["kind": "cancelled"])
    finish()
  }
  func documentPicker(_ controller: UIDocumentPickerViewController, didPickDocumentsAt urls: [URL]) {
    defer { finish() }
    guard let url = urls.first else { promise.resolve(["kind": "cancelled"]); return }
    let scoped = url.startAccessingSecurityScopedResource()
    defer { if scoped { url.stopAccessingSecurityScopedResource() } }
    do {
      let values = try? url.resourceValues(forKeys: [.contentTypeKey, .fileSizeKey])
      guard let mime = (values?.contentType ?? UTType(filenameExtension: url.pathExtension))?.preferredMIMEType,
        ["application/pdf", "image/jpeg", "image/png"].contains(mime) else {
        promise.resolve(["kind": "unsupported"]); return
      }
      if let size = values?.fileSize, size == 0 || size > limit {
        promise.resolve(["kind": "invalid-size"]); return
      }
      let bookmark = try url.bookmarkData(options: [], includingResourceValuesForKeys: nil, relativeTo: nil)
      promise.resolve(["kind": "selected", "document": ["mimeType": mime, "name": url.lastPathComponent, "uri": bookmarkPrefix + bookmark.base64EncodedString()]] as [String: Any])
    } catch {
      promise.reject("ERR_DOCUMENT_PICKER", error.localizedDescription)
    }
  }
}
