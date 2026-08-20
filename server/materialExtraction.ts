import JSZip from "jszip";
import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";

export type ExtractedDocument = { text: string; pageCount: number };

function decodeXml(value: string) {
  return value.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">") .replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}

async function extractPptx(buffer: Buffer): Promise<ExtractedDocument> {
  const zip = await JSZip.loadAsync(buffer);
  const slideNames = Object.keys(zip.files).filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name)).sort();
  const pages: string[] = [];
  for (const name of slideNames) {
    const xml = await zip.files[name]!.async("text");
    const text = decodeXml(xml.replace(/<a:t[^>]*>/g, "").replace(/<\/a:t>/g, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
    pages.push(text);
  }
  return { text: pages.map((page, index) => `[スライド${index + 1}]\n${page}`).join("\n\n"), pageCount: Math.max(slideNames.length, 1) };
}

export async function extractDocument(buffer: Buffer, mimeType: string, fileName: string): Promise<ExtractedDocument> {
  if (mimeType === "application/pdf" || fileName.toLowerCase().endsWith(".pdf")) {
    const parser = new PDFParse({ data: buffer });
    const [textResult, infoResult] = await Promise.all([parser.getText(), parser.getInfo()]);
    await parser.destroy();
    return { text: textResult.text.trim(), pageCount: infoResult.total || 1 };
  }
  if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || fileName.toLowerCase().endsWith(".docx")) {
    const result = await mammoth.extractRawText({ buffer });
    return { text: result.value.trim(), pageCount: 1 };
  }
  if (mimeType === "application/vnd.openxmlformats-officedocument.presentationml.presentation" || fileName.toLowerCase().endsWith(".pptx")) {
    return extractPptx(buffer);
  }
  return { text: buffer.toString("utf8").replace(/\u0000/g, "").trim(), pageCount: 1 };
}
