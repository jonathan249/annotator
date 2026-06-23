import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import type { Annotation } from "../types";

export async function openPdfPath(): Promise<string | null> {
  const selected = await open({
    multiple: false,
    directory: false,
    title: "Open PDF",
    filters: [{ name: "PDF", extensions: ["pdf"] }],
  });

  return typeof selected === "string" ? selected : null;
}

export async function readPdfFile(path: string): Promise<Uint8Array> {
  const response = await invoke<ArrayBuffer | number[] | Uint8Array>(
    "read_pdf_file",
    { path },
  );

  if (response instanceof ArrayBuffer) {
    return new Uint8Array(response);
  }

  if (response instanceof Uint8Array) {
    return response;
  }

  if (Array.isArray(response)) {
    return new Uint8Array(response);
  }

  throw new Error("Unexpected PDF data returned by Tauri.");
}

export function loadAnnotations(pdfId: string): Promise<Annotation[]> {
  return invoke<Annotation[]>("load_annotations", { pdfId });
}

export function saveAnnotations(
  pdfId: string,
  annotations: Annotation[],
): Promise<void> {
  return invoke("save_annotations", { pdfId, annotations });
}

export function loadMarkdownDocument(pdfId: string): Promise<string> {
  return invoke<string>("load_markdown_document", { pdfId });
}

export function saveMarkdownDocument(
  pdfId: string,
  markdown: string,
): Promise<void> {
  return invoke("save_markdown_document", { pdfId, markdown });
}
