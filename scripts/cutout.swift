// ตัดพื้นหลังภาพสินค้าด้วย Vision ของ macOS (ไม่ต้องลงอะไรเพิ่ม) แล้ว crop ชิดตัวสินค้า
// ใช้: swift scripts/cutout.swift in.png out.png
// ข้อจำกัด: รูเล็ก ๆ ที่ล้อมด้วยตัวสินค้า (รูก๊อกบนซิงก์ รูท่อ) ยังเป็นสีพื้นเดิม — วางบนพื้นสีอ่อนจะไม่เห็น
import Vision
import CoreImage

let src = URL(fileURLWithPath: CommandLine.arguments[1])
let dst = URL(fileURLWithPath: CommandLine.arguments[2])
let handler = VNImageRequestHandler(url: src)
let request = VNGenerateForegroundInstanceMaskRequest()
try handler.perform([request])
guard let result = request.results?.first else { fputs("no foreground: \(src.path)\n", stderr); exit(1) }
let masked = try result.generateMaskedImage(ofInstances: result.allInstances, from: handler, croppedToInstancesExtent: true)
try CIContext().writePNGRepresentation(of: CIImage(cvPixelBuffer: masked), to: dst, format: .RGBA8, colorSpace: CGColorSpace(name: CGColorSpace.sRGB)!)
