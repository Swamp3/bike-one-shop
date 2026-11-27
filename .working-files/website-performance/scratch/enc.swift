// usage: swift enc.swift in.mp4 out.mp4 width height kbps start dur [h264|hevc]
import AVFoundation
let a = CommandLine.arguments
let inURL = URL(fileURLWithPath: a[1]), outURL = URL(fileURLWithPath: a[2])
let w = Int(a[3])!, h = Int(a[4])!, kbps = Int(a[5])!, start = Double(a[6])!, dur = Double(a[7])!
let codec: AVVideoCodecType = (a.count > 8 && a[8] == "hevc") ? .hevc : .h264
try? FileManager.default.removeItem(at: outURL)
let asset = AVURLAsset(url: inURL)
let sem = DispatchSemaphore(value: 0)
Task {
  let track = try await asset.loadTracks(withMediaType: .video)[0]
  let reader = try AVAssetReader(asset: asset)
  reader.timeRange = CMTimeRange(start: CMTime(seconds: start, preferredTimescale: 600), duration: CMTime(seconds: dur, preferredTimescale: 600))
  let ro = AVAssetReaderTrackOutput(track: track, outputSettings: [kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_420YpCbCr8BiPlanarVideoRange])
  print(reader.canAdd(ro)); reader.add(ro)
  let writer = try AVAssetWriter(outputURL: outURL, fileType: .mp4)
  var comp: [String: Any] = [AVVideoAverageBitRateKey: kbps * 1000, AVVideoMaxKeyFrameIntervalKey: 60, AVVideoExpectedSourceFrameRateKey: 25]
  if codec == .h264 { comp[AVVideoProfileLevelKey] = AVVideoProfileLevelH264HighAutoLevel }
  let wi = AVAssetWriterInput(mediaType: .video, outputSettings: [AVVideoCodecKey: codec, AVVideoWidthKey: w, AVVideoHeightKey: h, AVVideoScalingModeKey: AVVideoScalingModeResizeAspectFill, AVVideoCompressionPropertiesKey: comp])
  wi.expectsMediaDataInRealTime = false
  wi.transform = .identity
  writer.add(wi)
  writer.shouldOptimizeForNetworkUse = true
  if !reader.startReading() { print("reader fail", reader.error as Any); exit(2) }
  if !writer.startWriting() { print("writer fail", writer.error as Any); exit(3) }
  writer.startSession(atSourceTime: .zero)
  let q = DispatchQueue(label: "enc")
  var first: CMTime? = nil
  wi.requestMediaDataWhenReady(on: q) {
    withExtendedLifetime(reader) {}
    while wi.isReadyForMoreMediaData {
      if let s = ro.copyNextSampleBuffer() {
        if first == nil { first = CMSampleBufferGetPresentationTimeStamp(s) }
        var t = CMSampleBufferGetPresentationTimeStamp(s) - first!
        var info = CMSampleTimingInfo(duration: CMSampleBufferGetDuration(s), presentationTimeStamp: t, decodeTimeStamp: .invalid)
        var out: CMSampleBuffer?
        CMSampleBufferCreateCopyWithNewTiming(allocator: nil, sampleBuffer: s, sampleTimingEntryCount: 1, sampleTimingArray: &info, sampleBufferOut: &out)
        _ = t; t = .zero
        wi.append(out ?? s)
      } else { wi.markAsFinished(); writer.finishWriting { withExtendedLifetime(writer) {}; sem.signal() }; return }
    }
  }
}
sem.wait()
