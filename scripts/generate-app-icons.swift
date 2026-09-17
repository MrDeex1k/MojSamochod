import AppKit
import Foundation

// Run from the repository root with: swift scripts/generate-app-icons.swift
// Artwork is kept flat; Icon Composer supplies the platform glass and lighting.
let root = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
let output = root.appendingPathComponent("apps/mobile/assets/app-icons")
let bundle = output.appendingPathComponent("Car.icon")
let assets = bundle.appendingPathComponent("Assets")
try FileManager.default.createDirectory(at: assets, withIntermediateDirectories: true)

struct Shape {
    var path = CGMutablePath()
    var svg = ""
    mutating func move(_ x: Double, _ y: Double) {
        path.move(to: CGPoint(x: x, y: y)); svg += "M\(x) \(y) "
    }
    mutating func line(_ x: Double, _ y: Double) {
        path.addLine(to: CGPoint(x: x, y: y)); svg += "L\(x) \(y) "
    }
    mutating func curve(_ x1: Double, _ y1: Double, _ x2: Double, _ y2: Double, _ x: Double, _ y: Double) {
        path.addCurve(to: CGPoint(x: x, y: y), control1: CGPoint(x: x1, y: y1), control2: CGPoint(x: x2, y: y2))
        svg += "C\(x1) \(y1) \(x2) \(y2) \(x) \(y) "
    }
    mutating func close() { path.closeSubpath(); svg += "Z " }
}

func roundedRect(_ x: Double, _ y: Double, _ w: Double, _ h: Double, _ r: Double) -> Shape {
    var s = Shape()
    s.move(x + r, y); s.line(x + w - r, y)
    s.curve(x + w, y, x + w, y, x + w, y + r)
    s.line(x + w, y + h - r); s.curve(x + w, y + h, x + w, y + h, x + w - r, y + h)
    s.line(x + r, y + h); s.curve(x, y + h, x, y + h, x, y + h - r)
    s.line(x, y + r); s.curve(x, y, x, y, x + r, y); s.close()
    return s
}

var body = Shape()
body.move(254, 460); body.line(300, 326)
body.curve(312, 290, 342, 274, 379, 274)
body.line(645, 274); body.curve(682, 274, 712, 290, 724, 326)
body.line(770, 460); body.curve(800, 475, 816, 498, 816, 536)
body.line(816, 656); body.curve(816, 692, 796, 712, 760, 712)
body.line(264, 712); body.curve(228, 712, 208, 692, 208, 656)
body.line(208, 536); body.curve(208, 498, 224, 475, 254, 460); body.close()
// The windshield is a cutout, keeping the silhouette legible in clear and tinted modes.
body.move(317, 452); body.line(354, 344)
body.curve(357, 334, 365, 330, 380, 330); body.line(644, 330)
body.curve(659, 330, 667, 334, 670, 344); body.line(707, 452); body.close()

let wheels = [roundedRect(254, 664, 86, 102, 26), roundedRect(684, 664, 86, 102, 26)]
let mirrors = [roundedRect(172, 433, 94, 45, 20), roundedRect(758, 433, 94, 45, 20)]
let lights = [roundedRect(276, 531, 116, 48, 24), roundedRect(632, 531, 116, 48, 24)]
let grille = roundedRect(388, 624, 248, 22, 11)
let accent = roundedRect(471, 531, 82, 48, 24)
let shell = wheels + mirrors + [body]
let details = lights + [grille]

func svg(_ shapes: [Shape], color: String) -> String {
    let paths = shapes.map { "<path d=\"\($0.svg)\" fill=\"\(color)\" fill-rule=\"evenodd\"/>" }.joined(separator: "\n")
    return "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"1024\" height=\"1024\" viewBox=\"0 0 1024 1024\">\n\(paths)\n</svg>\n"
}
try svg(shell, color: "#07383D").write(to: assets.appendingPathComponent("car-body.svg"), atomically: true, encoding: .utf8)
try svg(details, color: "#F5EBD0").write(to: assets.appendingPathComponent("car-details.svg"), atomically: true, encoding: .utf8)
try svg([accent], color: "#F28E54").write(to: assets.appendingPathComponent("car-accent.svg"), atomically: true, encoding: .utf8)

func color(_ hex: UInt32) -> CGColor {
    CGColor(srgbRed: Double((hex >> 16) & 255) / 255, green: Double((hex >> 8) & 255) / 255, blue: Double(hex & 255) / 255, alpha: 1)
}
func render(_ filename: String, background: UInt32?, bodyColor: UInt32, detailColor: UInt32, adaptive: Bool = false) throws {
    let ctx = CGContext(data: nil, width: 1024, height: 1024, bitsPerComponent: 8, bytesPerRow: 0,
                        space: CGColorSpace(name: CGColorSpace.sRGB)!, bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
    if let background { ctx.setFillColor(color(background)); ctx.fill(CGRect(x: 0, y: 0, width: 1024, height: 1024)) }
    ctx.translateBy(x: 0, y: 1024); ctx.scaleBy(x: 1, y: -1)
    if adaptive { ctx.translateBy(x: 512, y: 512); ctx.scaleBy(x: 0.78, y: 0.78); ctx.translateBy(x: -512, y: -512) }
    for (shapes, fill) in [(shell, bodyColor), (details, detailColor), ([accent], UInt32(0xF28E54))] {
        ctx.setFillColor(color(fill))
        for shape in shapes { ctx.addPath(shape.path); ctx.drawPath(using: .eoFill) }
    }
    let rep = NSBitmapImageRep(cgImage: ctx.makeImage()!)
    try rep.representation(using: .png, properties: [:])!.write(to: output.appendingPathComponent(filename))
}
try render("icon-light.png", background: 0xF5EBD0, bodyColor: 0x07383D, detailColor: 0xF5EBD0)
try render("icon-dark.png", background: 0x07383D, bodyColor: 0xF5EBD0, detailColor: 0x07383D)
try render("android-foreground.png", background: nil, bodyColor: 0xF5EBD0, detailColor: 0x07383D, adaptive: true)
print("Generated SVG layers and 1024px PNG assets in \(output.path)")
