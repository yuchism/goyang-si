import Foundation
import AVFoundation
import CoreGraphics
import CoreText
import ImageIO

let args = CommandLine.arguments
guard args.count == 4 else {
    fputs("usage: make_reel closed.png open.png output.mp4\n", stderr)
    exit(2)
}

let closedURL = URL(fileURLWithPath: args[1])
let openURL = URL(fileURLWithPath: args[2])
let outputURL = URL(fileURLWithPath: args[3])

func loadImage(_ url: URL) -> CGImage {
    guard let source = CGImageSourceCreateWithURL(url as CFURL, nil),
          let image = CGImageSourceCreateImageAtIndex(source, 0, nil) else {
        fatalError("Could not load \(url.path)")
    }
    return image
}

let closedImage = loadImage(closedURL)
let openImage = loadImage(openURL)
let width = 1080
let height = 1920
let fps: Int32 = 30
let frameCount = 6 * Int(fps)

try? FileManager.default.removeItem(at: outputURL)
let writer = try AVAssetWriter(outputURL: outputURL, fileType: .mov)
let input = AVAssetWriterInput(
    mediaType: .video,
    outputSettings: [
        AVVideoCodecKey: AVVideoCodecType.proRes422,
        AVVideoWidthKey: width,
        AVVideoHeightKey: height
    ]
)
input.expectsMediaDataInRealTime = false
let adaptor = AVAssetWriterInputPixelBufferAdaptor(
    assetWriterInput: input,
    sourcePixelBufferAttributes: [
        kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA,
        kCVPixelBufferWidthKey as String: width,
        kCVPixelBufferHeightKey as String: height
    ]
)
guard writer.canAdd(input) else { fatalError("Cannot add video input") }
writer.add(input)
guard writer.startWriting() else { fatalError(writer.error?.localizedDescription ?? "Writer failed") }
writer.startSession(atSourceTime: .zero)

func smoothstep(_ x: Double) -> CGFloat {
    let v = max(0.0, min(1.0, x))
    return CGFloat(v * v * (3.0 - 2.0 * v))
}

func openAmount(at t: Double) -> CGFloat {
    if t < 1.55 { return 0 }
    if t < 1.92 { return smoothstep((t - 1.55) / 0.37) }
    if t < 3.45 { return 1 }
    if t < 3.82 { return 1 - smoothstep((t - 3.45) / 0.37) }
    return 0
}

let colorSpace = CGColorSpaceCreateDeviceRGB()
let background = CGColor(red: 0.72, green: 0.29, blue: 0.22, alpha: 1)
let cream = CGColor(red: 1.0, green: 0.90, blue: 0.72, alpha: 1)

for frame in 0..<frameCount {
    while !input.isReadyForMoreMediaData { Thread.sleep(forTimeInterval: 0.002) }
    guard let pool = adaptor.pixelBufferPool else { fatalError("No pixel buffer pool") }
    var maybeBuffer: CVPixelBuffer?
    guard CVPixelBufferPoolCreatePixelBuffer(nil, pool, &maybeBuffer) == kCVReturnSuccess,
          let buffer = maybeBuffer else { fatalError("Could not create pixel buffer") }

    CVPixelBufferLockBaseAddress(buffer, [])
    guard let base = CVPixelBufferGetBaseAddress(buffer),
          let context = CGContext(
            data: base,
            width: width,
            height: height,
            bitsPerComponent: 8,
            bytesPerRow: CVPixelBufferGetBytesPerRow(buffer),
            space: colorSpace,
            bitmapInfo: CGImageAlphaInfo.premultipliedFirst.rawValue | CGBitmapInfo.byteOrder32Little.rawValue
          ) else { fatalError("Could not create context") }

    context.setFillColor(background)
    context.fill(CGRect(x: 0, y: 0, width: width, height: height))

    let t = Double(frame) / Double(fps)
    let breath = 1.0 + 0.018 * sin(t * Double.pi * 0.72)
    let side = CGFloat(920.0 * breath)
    let imageRect = CGRect(
        x: (CGFloat(width) - side) / 2,
        y: (CGFloat(height) - side) / 2 + 45,
        width: side,
        height: side
    )

    context.saveGState()
    context.interpolationQuality = .high
    context.setAlpha(1)
    context.draw(closedImage, in: imageRect)
    let amount = openAmount(at: t)
    if amount > 0 {
        context.setAlpha(amount)
        context.draw(openImage, in: imageRect)
    }
    context.restoreGState()

    let text = "goyang.si" as CFString
    let font = CTFontCreateWithName("AvenirNext-DemiBold" as CFString, 46, nil)
    let attrs: [CFString: Any] = [
        kCTFontAttributeName: font,
        kCTForegroundColorAttributeName: cream
    ]
    let line = CTLineCreateWithAttributedString(CFAttributedStringCreate(nil, text, attrs as CFDictionary))
    let bounds = CTLineGetBoundsWithOptions(line, .useOpticalBounds)
    context.textPosition = CGPoint(x: (CGFloat(width) - bounds.width) / 2, y: 205)
    CTLineDraw(line, context)

    CVPixelBufferUnlockBaseAddress(buffer, [])
    let time = CMTime(value: Int64(frame), timescale: fps)
    guard adaptor.append(buffer, withPresentationTime: time) else {
        fatalError(writer.error?.localizedDescription ?? "Append failed")
    }
}

input.markAsFinished()
let semaphore = DispatchSemaphore(value: 0)
writer.finishWriting { semaphore.signal() }
semaphore.wait()
guard writer.status == .completed else {
    fatalError(writer.error?.localizedDescription ?? "Encoding failed")
}
print(outputURL.path)
