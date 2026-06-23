export type Annotation = {
  id: string;
  pdf_id: string;
  file_name: string;
  source_path: string;
  page_number: number;
  selected_text: string;
  comment: string;
  created_at: string;
  updated_at: string;
};

export type ActiveSelection = {
  text: string;
  pageNumber: number;
  rect: DOMRect;
};

export type LoadedPdf = {
  id: string | null;
  bytes: Uint8Array;
  fileName: string;
  sourcePath: string;
};

export type SearchResult = {
  pageNumber: number;
  matchIndex: number;
  snippet: string;
};

export type SidebarTab = "annotations" | "markdown";

export type MarkdownSaveState = "idle" | "loading" | "saving" | "saved" | "error";
