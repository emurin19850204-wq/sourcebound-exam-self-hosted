import { afterEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const originalEnv = { ...process.env };
afterEach(() => { process.env = { ...originalEnv }; vi.resetModules(); vi.restoreAllMocks(); });

describe("self-host storage adapters", () => {
  it("stores files locally when STORAGE_DRIVER=local", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "sourcebound-storage-"));
    process.env.STORAGE_DRIVER = "local";
    process.env.STORAGE_DIR = dir;
    process.env.PUBLIC_BASE_URL = "http://localhost:3000";
    const { storagePut } = await import("./selfhost/adapters");
    const result = await storagePut("materials/sample.txt", "source-bound", "text/plain");
    expect(result.url).toContain("/uploads/");
    expect(await readFile(path.join(dir, result.key), "utf8")).toBe("source-bound");
  });

  it("sends an object to an S3-compatible endpoint when STORAGE_DRIVER=s3", async () => {
    let sent = false;
    vi.doMock("@aws-sdk/client-s3", () => ({
      S3Client: class { async send() { sent = true; } },
      PutObjectCommand: class { constructor(public input: unknown) {} },
    }));
    process.env.STORAGE_DRIVER = "s3";
    process.env.S3_ENDPOINT = "http://minio:9000";
    process.env.S3_ACCESS_KEY_ID = "access";
    process.env.S3_SECRET_ACCESS_KEY = "secret";
    process.env.S3_BUCKET = "exam";
    const { storagePut } = await import("./selfhost/adapters");
    const result = await storagePut("materials/sample.txt", Buffer.from("source-bound"), "text/plain");
    expect(sent).toBe(true);
    expect(result.url).toContain("http://minio:9000/exam/");
  });
});
