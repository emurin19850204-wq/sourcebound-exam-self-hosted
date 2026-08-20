import "dotenv/config";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { createHash, randomBytes } from "node:crypto";
import path from "node:path";

export const SELFHOST = {
  appName: process.env.APP_NAME ?? "SourceBound Exam",
  jwtSecret: process.env.JWT_SECRET ?? "change-me-in-production",
  databaseUrl: process.env.DATABASE_URL ?? "",
  storageDriver: process.env.STORAGE_DRIVER ?? "local",
  storageDir: process.env.STORAGE_DIR ?? "./data/uploads",
  s3Endpoint: process.env.S3_ENDPOINT,
  s3Region: process.env.S3_REGION ?? "us-east-1",
  s3Bucket: process.env.S3_BUCKET ?? "sourcebound-exam",
  s3AccessKeyId: process.env.S3_ACCESS_KEY_ID,
  s3SecretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
  publicBaseUrl: process.env.PUBLIC_BASE_URL ?? "",
  llmBaseUrl: (process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1").replace(/\/$/, ""),
  llmApiKey: process.env.OPENAI_API_KEY ?? "",
  llmModel: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
};

export async function invokeLLM(params: Record<string, unknown>) {
  if (!SELFHOST.llmApiKey) throw new Error("OPENAI_API_KEY is not configured");
  const response = await fetch(`${SELFHOST.llmBaseUrl}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${SELFHOST.llmApiKey}` },
    body: JSON.stringify({ ...params, model: SELFHOST.llmModel }),
  });
  if (!response.ok) throw new Error(`LLM request failed (${response.status})`);
  return response.json() as Promise<any>;
}

function safeKey(key: string) { return key.replace(/[^a-zA-Z0-9._/-]/g, "_").replace(/^\/+/, ""); }
export async function storagePut(relKey: string, data: Buffer | Uint8Array | string, contentType = "application/octet-stream") {
  const key = `${safeKey(relKey)}-${createHash("sha256").update(data).digest("hex").slice(0, 12)}`;
  if (SELFHOST.storageDriver === "s3") {
    if (!SELFHOST.s3AccessKeyId || !SELFHOST.s3SecretAccessKey) throw new Error("S3 credentials are not configured");
    const client = new S3Client({ region: SELFHOST.s3Region, endpoint: SELFHOST.s3Endpoint, forcePathStyle: Boolean(SELFHOST.s3Endpoint), credentials: { accessKeyId: SELFHOST.s3AccessKeyId, secretAccessKey: SELFHOST.s3SecretAccessKey } });
    await client.send(new PutObjectCommand({ Bucket: SELFHOST.s3Bucket, Key: key, Body: data, ContentType: contentType }));
    const url = SELFHOST.s3Endpoint ? `${SELFHOST.s3Endpoint.replace(/\/$/, "")}/${SELFHOST.s3Bucket}/${encodeURIComponent(key)}` : `https://${SELFHOST.s3Bucket}.s3.${SELFHOST.s3Region}.amazonaws.com/${encodeURIComponent(key)}`;
    return { key, url, contentType };
  }
  const filePath = path.resolve(SELFHOST.storageDir, key);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, data);
  return { key, url: `${SELFHOST.publicBaseUrl}/uploads/${encodeURIComponent(key)}`, contentType };
}
export async function storageGet(relKey: string) {
  const key = safeKey(relKey);
  return { key, url: `${SELFHOST.publicBaseUrl}/uploads/${encodeURIComponent(key)}` };
}
export async function storageRead(key: string) { return readFile(path.resolve(SELFHOST.storageDir, safeKey(key))); }
export function createOpaqueToken() { return randomBytes(32).toString("base64url"); }
