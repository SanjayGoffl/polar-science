import path from "node:path";

export const UPLOAD_DIR = path.join(process.cwd(), "data", "uploads");
export const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
