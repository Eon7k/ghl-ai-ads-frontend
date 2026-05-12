/** Resize/compress for API upload (Vercel body limits, DB size). */
export async function fileToUploadableDataUrl(file: File, maxDim = 1600, quality = 0.88): Promise<string> {
  try {
    const bmp = await createImageBitmap(file);
    let nw = bmp.width;
    let nh = bmp.height;
    if (nw > maxDim || nh > maxDim) {
      if (nw >= nh) {
        nh = Math.round((nh * maxDim) / nw);
        nw = maxDim;
      } else {
        nw = Math.round((nw * maxDim) / nh);
        nh = maxDim;
      }
    }
    const canvas = document.createElement("canvas");
    canvas.width = nw;
    canvas.height = nh;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not read image");
    ctx.drawImage(bmp, 0, 0, nw, nh);
    bmp.close();
    return canvas.toDataURL("image/jpeg", quality);
  } catch {
    return await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = () => reject(new Error("Could not read file"));
      r.readAsDataURL(file);
    });
  }
}

export function isHeicFile(file: File): boolean {
  return (
    file.type === "image/heic" ||
    file.type === "image/heif" ||
    /\.heic$/i.test(file.name)
  );
}

export function isLikelyImageFile(file: File): boolean {
  return file.type.startsWith("image/") || /\.(jpe?g|png|gif|webp)$/i.test(file.name);
}

/** ~40MiB cap; large videos should use api.setVariantCreativeFile / creatives.uploadFile when NEXT_PUBLIC_BACKEND_URL is set. */
const MAX_UPLOAD_VIDEO_BYTES = 40 * 1024 * 1024;

export function isLikelyVideoFile(file: File): boolean {
  return file.type.startsWith("video/") || /\.(mp4|mov|m4v|webm)$/i.test(file.name);
}

/** Reads video as a data URL (no re-encoding). Keeps payloads under typical JSON/proxy limits. */
export async function fileToUploadableVideoDataUrl(
  file: File,
  maxBytes = MAX_UPLOAD_VIDEO_BYTES
): Promise<string> {
  if (file.size > maxBytes) {
    const mb = (file.size / (1024 * 1024)).toFixed(1);
    const cap = Math.round(maxBytes / (1024 * 1024));
    throw new Error(
      `This file is about ${mb}MB. The upload limit is ${cap}MB (file size, not duration)—use a compressed export or 720p, or shorten the clip.`
    );
  }
  return await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(new Error("Could not read video file"));
    r.readAsDataURL(file);
  });
}
