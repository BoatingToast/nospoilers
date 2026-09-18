// MediaRecorder WebM omits the duration. Add it to the EBML Info element so the
// downloaded movie has a finite runtime in players and Creator Studio.
type Element = { id: number; start: number; sizeStart: number; sizeLength: number; dataStart: number; end: number; unknown: boolean }

function readElement(bytes: Uint8Array, start: number): Element | null {
  if (start >= bytes.length) return null
  let idLength = 1
  while (idLength <= 4 && !(bytes[start] & (0x80 >> (idLength - 1)))) idLength++
  if (idLength > 4 || start + idLength >= bytes.length) return null
  let id = 0
  for (let i = 0; i < idLength; i++) id = id * 256 + bytes[start + i]
  const sizeStart = start + idLength
  let sizeLength = 1
  while (sizeLength <= 8 && !(bytes[sizeStart] & (0x80 >> (sizeLength - 1)))) sizeLength++
  if (sizeLength > 8 || sizeStart + sizeLength > bytes.length) return null
  let size = bytes[sizeStart] & ((0x80 >> (sizeLength - 1)) - 1)
  let unknown = size === ((0x80 >> (sizeLength - 1)) - 1)
  for (let i = 1; i < sizeLength; i++) { size = size * 256 + bytes[sizeStart + i]; unknown &&= bytes[sizeStart + i] === 255 }
  const dataStart = sizeStart + sizeLength
  return { id, start, sizeStart, sizeLength, dataStart, end: unknown ? bytes.length : dataStart + size, unknown }
}

function sizeBytes(size: number, length: number) {
  if (size >= 2 ** (length * 7) - 1) throw new Error('Video metadata is too large.')
  const bytes = new Uint8Array(length)
  for (let i = length - 1; i >= 0; i--) { bytes[i] = size % 256; size = Math.floor(size / 256) }
  bytes[0] |= 0x80 >> (length - 1)
  return bytes
}

export async function finalizeWebm(blob: Blob, seconds: number): Promise<Blob> {
  const bytes = new Uint8Array(await blob.arrayBuffer())
  let segment: Element | null = null
  for (let offset = 0; offset < bytes.length;) {
    const element = readElement(bytes, offset)
    if (!element || element.end <= offset) break
    if (element.id === 0x18538067) { segment = element; break }
    offset = element.end
  }
  if (!segment) throw new Error('The browser returned an invalid video recording.')
  let info: Element | null = null
  for (let offset = segment.dataStart; offset < segment.end;) {
    const element = readElement(bytes, offset)
    if (!element || element.end <= offset) break
    if (element.id === 0x1549a966) { info = element; break }
    offset = element.end
  }
  if (!info || info.unknown || info.end > bytes.length) throw new Error('The browser returned unreadable video metadata.')
  let scale = 1000000
  let duration: Element | null = null
  for (let offset = info.dataStart; offset < info.end;) {
    const element = readElement(bytes, offset)
    if (!element || element.end <= offset) break
    if (element.id === 0x2ad7b1) { scale = 0; for (let i = element.dataStart; i < element.end; i++) scale = scale * 256 + bytes[i] }
    if (element.id === 0x4489) duration = element
    offset = element.end
  }
  if (!scale) throw new Error('The recording has an invalid time scale.')
  if (duration) {
    const view = new DataView(bytes.buffer)
    if (duration.end - duration.dataStart === 4) view.setFloat32(duration.dataStart, seconds * 1e9 / scale)
    else if (duration.end - duration.dataStart === 8) view.setFloat64(duration.dataStart, seconds * 1e9 / scale)
    else throw new Error('The recording has an invalid duration field.')
    return new Blob([bytes], { type: blob.type })
  }
  const field = new Uint8Array(11)
  field.set([0x44, 0x89, 0x88])
  new DataView(field.buffer).setFloat64(3, seconds * 1e9 / scale)
  // Reserve a wider size field if adding Duration crosses the existing capacity.
  let width = info.sizeLength
  const infoSize = info.end - info.dataStart + field.length
  while (infoSize >= 2 ** (width * 7) - 1) width++
  const extra = field.length + width - info.sizeLength
  const output = new Uint8Array(bytes.length + extra)
  output.set(bytes.subarray(0, info.sizeStart))
  output.set(sizeBytes(infoSize, width), info.sizeStart)
  let offset = info.sizeStart + width
  output.set(bytes.subarray(info.dataStart, info.end), offset); offset += info.end - info.dataStart
  output.set(field, offset); offset += field.length
  output.set(bytes.subarray(info.end), offset)
  if (!segment.unknown) output.set(sizeBytes(segment.end - segment.dataStart + extra, segment.sizeLength), segment.sizeStart)
  return new Blob([output], { type: blob.type })
}
