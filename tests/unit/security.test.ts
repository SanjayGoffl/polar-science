import { describe, expect, it } from "vitest";
import { rateLimit } from "@/lib/rateLimit";
import { sniffImage } from "@/lib/uploads";

describe("sniffImage", () => {
  it("recognises JPEG, PNG and WebP by magic bytes", () => {
    expect(sniffImage(new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0]))).toBe("jpg");
    expect(sniffImage(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]))).toBe("png");
    const webp = new TextEncoder().encode("RIFF\0\0\0\0WEBPVP8 ");
    expect(sniffImage(webp)).toBe("webp");
  });

  it("rejects anything else, whatever the client claims", () => {
    expect(sniffImage(new TextEncoder().encode("<svg onload=alert(1)>"))).toBeNull();
    expect(sniffImage(new TextEncoder().encode("GIF89a"))).toBeNull();
    expect(sniffImage(new Uint8Array([]))).toBeNull();
  });
});

describe("rateLimit", () => {
  it("allows up to the limit within the window, then blocks with a retry hint", () => {
    const key = `t-${Math.random()}`;
    const t0 = 1_000_000;
    expect(rateLimit(key, 2, 1000, t0).ok).toBe(true);
    expect(rateLimit(key, 2, 1000, t0 + 10).ok).toBe(true);
    const blocked = rateLimit(key, 2, 1000, t0 + 20);
    expect(blocked.ok).toBe(false);
    expect(!blocked.ok && blocked.retryAfter).toBeGreaterThan(0);
    expect(rateLimit(key, 2, 1000, t0 + 1001).ok).toBe(true);
  });
});
