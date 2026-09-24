/**
 * Shrink a camera photo on the device before queuing it: field uplinks are slow and
 * metered, and IndexedDB space on phones is limited. Falls back to the original file.
 */
export async function compressImage(file: File, maxSide = 1600, quality = 0.8): Promise<{ blob: Blob; type: string }> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", quality));
    if (blob && blob.size < file.size) return { blob, type: "image/jpeg" };
  } catch {
    // Unsupported format or decode failure: keep the original.
  }
  return { blob: file, type: file.type || "image/jpeg" };
}
