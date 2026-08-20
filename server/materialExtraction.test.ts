import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { extractDocument } from "./materialExtraction";

describe("material extraction", () => {
  it("extracts UTF-8 text and CSV content", async () => {
    const result = await extractDocument(Buffer.from("見出し\n重要,数値"), "text/csv", "notes.csv");
    expect(result.text).toContain("重要,数値");
    expect(result.pageCount).toBe(1);
  });

  it("extracts slide text and slide count from pptx XML", async () => {
    const zip = new JSZip();
    zip.file("ppt/slides/slide1.xml", "<p:sld><a:t>資料固有の判断条件</a:t></p:sld>");
    zip.file("ppt/slides/slide2.xml", "<p:sld><a:t>例外規定</a:t></p:sld>");
    const buffer = await zip.generateAsync({ type: "nodebuffer" });
    const result = await extractDocument(buffer, "application/vnd.openxmlformats-officedocument.presentationml.presentation", "training.pptx");
    expect(result.pageCount).toBe(2);
    expect(result.text).toContain("資料固有の判断条件");
    expect(result.text).toContain("例外規定");
  });
});
