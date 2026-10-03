// swift-tools-version: 6.2
import PackageDescription

// Expo's autolinker supplies ExpoModulesCore and React's compile interfaces.
let package = Package(
  name: "DocumentPreview",
  platforms: [.iOS("16.4")],
  products: [.library(name: "DocumentPreview", targets: ["DocumentPreview"])],
  dependencies: [],
  targets: [
    .target(
      name: "DocumentPreview",
      path: "ios",
      linkerSettings: [.linkedFramework("PDFKit"), .linkedFramework("UIKit")]
    )
  ]
)
