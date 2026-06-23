import { useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { listen } from "@tauri-apps/api/event";
import "./App.css";
import { FloatingAnnotationEditor } from "./components/FloatingAnnotationEditor";
import { FloatingSearchBar } from "./components/FloatingSearchBar";
import { PdfViewer } from "./components/PdfViewer";
import { Sidebar } from "./components/Sidebar";
import { Toolbar } from "./components/Toolbar";
import { displayNameFromPath, sha256Bytes } from "./lib/pdf";
import {
  loadAnnotations,
  loadMarkdownDocument,
  openPdfPath,
  readPdfFile,
  saveAnnotations,
  saveMarkdownDocument,
} from "./lib/tauri";
import type {
  ActiveSelection,
  Annotation,
  LoadedPdf,
  MarkdownSaveState,
  SearchResult,
  SidebarTab,
} from "./types";

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

type SearchPosition = {
  node: Text;
  offset: number;
  synthetic?: boolean;
};

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function normalizedSearchQuery(query: string): string {
  return query.trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

function textNodesIn(element: HTMLElement): Text[] {
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  let currentNode = walker.nextNode();

  while (currentNode) {
    nodes.push(currentNode as Text);
    currentNode = walker.nextNode();
  }

  return nodes;
}

function appendSearchCharacter(
  text: string,
  positions: SearchPosition[],
  character: string,
  position: SearchPosition,
) {
  const isWhitespace = /\s/.test(character);
  const lastCharacter = text[text.length - 1];

  if (isWhitespace) {
    if (lastCharacter && lastCharacter !== " ") {
      positions.push(position);
      return `${text} `;
    }

    return text;
  }

  positions.push(position);
  return `${text}${character.toLocaleLowerCase()}`;
}

function selectNthTextLayerMatch(
  pageElement: HTMLElement,
  query: string,
  occurrenceIndex: number,
): Range | null {
  const textLayer = pageElement.querySelector<HTMLElement>(
    ".react-pdf__Page__textContent, .textLayer",
  );

  if (!textLayer) {
    return null;
  }

  const nodes = textNodesIn(textLayer);
  let haystack = "";
  const positions: SearchPosition[] = [];

  for (const node of nodes) {
    const nodeText = node.textContent || "";

    if (!nodeText) {
      continue;
    }

    if (haystack && haystack[haystack.length - 1] !== " " && !/^\s/.test(nodeText)) {
      positions.push({ node, offset: 0, synthetic: true });
      haystack += " ";
    }

    for (let offset = 0; offset < nodeText.length; offset += 1) {
      haystack = appendSearchCharacter(haystack, positions, nodeText[offset], {
        node,
        offset,
      });
    }
  }

  const needle = normalizedSearchQuery(query);
  if (!needle) {
    return null;
  }

  let currentIndex = haystack.indexOf(needle);
  let currentOccurrence = 0;

  while (currentIndex !== -1 && currentOccurrence < occurrenceIndex) {
    currentOccurrence += 1;
    currentIndex = haystack.indexOf(needle, currentIndex + needle.length);
  }

  if (currentIndex === -1) {
    return null;
  }

  let startPosition = positions[currentIndex];
  let endPosition = positions[currentIndex + needle.length - 1];

  for (let index = currentIndex; startPosition?.synthetic; index += 1) {
    startPosition = positions[index + 1];
  }

  for (
    let index = currentIndex + needle.length - 1;
    endPosition?.synthetic;
    index -= 1
  ) {
    endPosition = positions[index - 1];
  }

  if (!startPosition || !endPosition) {
    return null;
  }

  const range = document.createRange();
  range.setStart(startPosition.node, startPosition.offset);
  range.setEnd(endPosition.node, endPosition.offset + 1);

  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);

  return range;
}

function App() {
  const [activePdf, setActivePdf] = useState<LoadedPdf | null>(null);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [activeSelection, setActiveSelection] = useState<ActiveSelection | null>(null);
  const [editorMode, setEditorMode] = useState<"button" | "editor">("button");
  const [error, setError] = useState<string | null>(null);
  const [focusedPageNumber, setFocusedPageNumber] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [markdownDraft, setMarkdownDraft] = useState("");
  const [markdownError, setMarkdownError] = useState<string | null>(null);
  const [markdownSaveState, setMarkdownSaveState] =
    useState<MarkdownSaveState>("idle");
  const [markdownText, setMarkdownText] = useState("");
  const [pageCount, setPageCount] = useState(0);
  const [pdfDocument, setPdfDocument] = useState<PDFDocumentProxy | null>(null);
  const [scale, setScale] = useState(1);
  const [searchActiveIndex, setSearchActiveIndex] = useState(0);
  const [searchBarOpen, setSearchBarOpen] = useState(false);
  const [searchedQuery, setSearchedQuery] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>("annotations");
  const activePdfIdRef = useRef<string | null>(null);
  const openTokenRef = useRef("");
  const pageRefs = useRef(new Map<number, HTMLDivElement>());
  const searchTokenRef = useRef("");
  const viewerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    activePdfIdRef.current = activePdf?.id ?? null;
  }, [activePdf?.id]);

  async function persistAnnotations(pdfId: string, nextAnnotations: Annotation[]) {
    try {
      await saveAnnotations(pdfId, nextAnnotations);
    } catch (saveError) {
      setError(
        `Annotations were kept in memory but could not be saved: ${errorMessage(saveError)}`,
      );
    }
  }

  async function persistMarkdownDocument(pdfId: string, markdown: string) {
    if (activePdfIdRef.current !== pdfId) {
      return;
    }

    setMarkdownSaveState("saving");
    setMarkdownError(null);

    try {
      await saveMarkdownDocument(pdfId, markdown);
      if (activePdfIdRef.current !== pdfId) {
        return;
      }

      setMarkdownText(markdown);
      setMarkdownSaveState("saved");
    } catch (saveError) {
      if (activePdfIdRef.current !== pdfId) {
        return;
      }

      setMarkdownSaveState("error");
      setMarkdownError(errorMessage(saveError));
    }
  }

  async function hydratePdfIdentity(
    openToken: string,
    bytes: Uint8Array,
    sourcePath: string,
  ) {
    try {
      const id = await sha256Bytes(bytes);
      const [annotationsResult, markdownResult] = await Promise.allSettled([
        loadAnnotations(id),
        loadMarkdownDocument(id),
      ]);

      if (openTokenRef.current !== openToken) {
        return;
      }

      setActivePdf((currentPdf) => {
        if (!currentPdf || currentPdf.sourcePath !== sourcePath) {
          return currentPdf;
        }

        return { ...currentPdf, id };
      });

      if (annotationsResult.status === "fulfilled") {
        setAnnotations(annotationsResult.value);
      } else {
        setError(
          `PDF opened, but annotations could not be loaded: ${errorMessage(annotationsResult.reason)}`,
        );
      }

      if (markdownResult.status === "fulfilled") {
        setMarkdownText(markdownResult.value);
        setMarkdownDraft(markdownResult.value);
        setMarkdownSaveState("saved");
        setMarkdownError(null);
      } else {
        setMarkdownText("");
        setMarkdownDraft("");
        setMarkdownSaveState("error");
        setMarkdownError(errorMessage(markdownResult.reason));
      }
    } catch (identityError) {
      if (openTokenRef.current === openToken) {
        setError(`PDF opened, but document storage could not be prepared: ${errorMessage(identityError)}`);
        setMarkdownSaveState("error");
        setMarkdownError(errorMessage(identityError));
      }
    }
  }

  async function handleOpenPdf() {
    setIsLoading(true);
    setError(null);

    try {
      const path = await openPdfPath();
      if (!path) {
        return;
      }

      const bytes = await readPdfFile(path);
      const openToken = crypto.randomUUID();

      openTokenRef.current = openToken;
      activePdfIdRef.current = null;
      pageRefs.current.clear();
      setActivePdf({
        id: null,
        bytes,
        fileName: displayNameFromPath(path),
        sourcePath: path,
      });
      setAnnotations([]);
      setActiveSelection(null);
      setEditorMode("button");
      setFocusedPageNumber(null);
      setMarkdownDraft("");
      setMarkdownError(null);
      setMarkdownSaveState("loading");
      setMarkdownText("");
      setPageCount(0);
      setPdfDocument(null);
      setScale(1);
      setSearchActiveIndex(0);
      setSearchBarOpen(false);
      setSearchedQuery("");
      setSearchQuery("");
      setSearchResults([]);
      void hydratePdfIdentity(openToken, bytes, path);
    } catch (openError) {
      setError(errorMessage(openError));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    const unlistenPromise = listen("open-pdf-requested", () => {
      void handleOpenPdf();
    });

    return () => {
      void unlistenPromise.then((unlisten) => unlisten());
    };
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLocaleLowerCase() === "f") {
        event.preventDefault();
        setSearchBarOpen(true);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    const pdfId = activePdf?.id;

    if (!pdfId || markdownDraft === markdownText) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void persistMarkdownDocument(pdfId, markdownDraft);
    }, 600);

    return () => window.clearTimeout(timeoutId);
  }, [activePdf?.id, markdownDraft, markdownText]);

  function handleSelectionChange(selection: ActiveSelection | null) {
    if (!selection) {
      setActiveSelection(null);
      setEditorMode("button");
      return;
    }

    setActiveSelection(selection);
    setEditorMode("button");
    setError(null);
  }

  async function handleSaveAnnotation(comment: string) {
    if (!activePdf || !activeSelection) {
      return;
    }

    if (!activePdf.id) {
      setError("Annotation storage is still being prepared. Try saving again in a moment.");
      return;
    }

    const timestamp = new Date().toISOString();
    const nextAnnotation: Annotation = {
      id: crypto.randomUUID(),
      pdf_id: activePdf.id,
      file_name: activePdf.fileName,
      source_path: activePdf.sourcePath,
      page_number: activeSelection.pageNumber,
      selected_text: activeSelection.text,
      comment,
      created_at: timestamp,
      updated_at: timestamp,
    };
    const nextAnnotations = [...annotations, nextAnnotation];

    setAnnotations(nextAnnotations);
    setActiveSelection(null);
    setEditorMode("button");
    window.getSelection()?.removeAllRanges();
    await persistAnnotations(activePdf.id, nextAnnotations);
  }

  async function handleDeleteAnnotation(annotationId: string) {
    if (!activePdf?.id) {
      return;
    }

    const nextAnnotations = annotations.filter(
      (annotation) => annotation.id !== annotationId,
    );

    setAnnotations(nextAnnotations);
    await persistAnnotations(activePdf.id, nextAnnotations);
  }

  function handleSelectAnnotation(annotation: Annotation) {
    setFocusedPageNumber(annotation.page_number);
    pageRefs.current.get(annotation.page_number)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  function handleDocumentLoad(document: PDFDocumentProxy) {
    setPdfDocument(document);
    setPageCount(document.numPages);
  }

  async function waitForPageElement(pageNumber: number): Promise<HTMLElement | null> {
    for (let attempt = 0; attempt < 28; attempt += 1) {
      const pageElement = pageRefs.current.get(pageNumber);
      const textLayer = pageElement?.querySelector(".react-pdf__Page__textContent, .textLayer");

      if (pageElement && textLayer) {
        return pageElement;
      }

      await delay(75);
    }

    return pageRefs.current.get(pageNumber) ?? null;
  }

  async function jumpToSearchResult(nextIndex: number, results = searchResults) {
    const result = results[nextIndex];
    if (!result) {
      return;
    }

    setSearchActiveIndex(nextIndex);
    setFocusedPageNumber(result.pageNumber);
    setActiveSelection(null);

    await delay(0);
    pageRefs.current.get(result.pageNumber)?.scrollIntoView({
      behavior: "auto",
      block: "center",
    });

    const pageElement = await waitForPageElement(result.pageNumber);
    if (!pageElement) {
      return;
    }

    const range = selectNthTextLayerMatch(pageElement, searchQuery, result.matchIndex);
    if (!range) {
      return;
    }

    const rect = range.getBoundingClientRect();
    const selectedText = window.getSelection()?.toString().trim();

    if (selectedText && rect.width > 0 && rect.height > 0) {
      setActiveSelection({
        text: selectedText,
        pageNumber: result.pageNumber,
        rect,
      });
    }
  }

  async function runSearch(direction: "next" | "previous" = "next") {
    const query = searchQuery.trim();

    if (!query || !pdfDocument) {
      setFocusedPageNumber(null);
      setSearchActiveIndex(0);
      setSearchedQuery("");
      setSearchResults([]);
      return;
    }

    const searchToken = crypto.randomUUID();
    const normalizedQuery = normalizedSearchQuery(query);

    searchTokenRef.current = searchToken;
    setIsSearching(true);
    setError(null);

    try {
      const nextResults: SearchResult[] = [];

      for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber += 1) {
        const page = await pdfDocument.getPage(pageNumber);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item) => ("str" in item ? item.str : ""))
          .join(" ")
          .replace(/\s+/g, " ")
          .trim();
        const normalizedPageText = pageText.toLocaleLowerCase();
        let matchIndex = normalizedPageText.indexOf(normalizedQuery);
        let matchNumber = 0;

        while (matchIndex !== -1) {
          const snippetStart = Math.max(0, matchIndex - 48);
          const snippetEnd = Math.min(pageText.length, matchIndex + query.length + 64);

          nextResults.push({
            pageNumber,
            matchIndex: matchNumber,
            snippet: pageText.slice(snippetStart, snippetEnd),
          });

          matchNumber += 1;
          matchIndex = normalizedPageText.indexOf(
            normalizedQuery,
            matchIndex + normalizedQuery.length,
          );
        }
      }

      if (searchTokenRef.current !== searchToken) {
        return;
      }

      setSearchResults(nextResults);
      setSearchedQuery(normalizedQuery);
      if (nextResults.length > 0) {
        void jumpToSearchResult(direction === "previous" ? nextResults.length - 1 : 0, nextResults);
      } else {
        setSearchActiveIndex(0);
        setFocusedPageNumber(null);
      }
    } catch (searchError) {
      if (searchTokenRef.current === searchToken) {
        setError(`Search failed: ${errorMessage(searchError)}`);
      }
    } finally {
      if (searchTokenRef.current === searchToken) {
        setIsSearching(false);
      }
    }
  }

  function handleSearchQueryChange(query: string) {
    setSearchQuery(query);
    setSearchedQuery("");
    setSearchActiveIndex(0);
    setSearchResults([]);

    if (query.trim()) {
      return;
    }

    window.getSelection()?.removeAllRanges();
    setFocusedPageNumber(null);
    setActiveSelection(null);
  }

  function handleNextSearchResult() {
    if (searchResults.length === 0) {
      return;
    }

    void jumpToSearchResult((searchActiveIndex + 1) % searchResults.length);
  }

  function handlePreviousSearchResult() {
    if (searchResults.length === 0) {
      return;
    }

    void jumpToSearchResult(
      (searchActiveIndex - 1 + searchResults.length) % searchResults.length,
    );
  }

  function handleSearchSubmit(direction: "next" | "previous") {
    const normalizedQuery = normalizedSearchQuery(searchQuery);
    const canNavigateExistingResults =
      normalizedQuery && normalizedQuery === searchedQuery && searchResults.length > 0;

    if (canNavigateExistingResults) {
      if (direction === "previous") {
        handlePreviousSearchResult();
      } else {
        handleNextSearchResult();
      }
      return;
    }

    void runSearch(direction);
  }

  function handleMarkdownDraftChange(nextDraft: string) {
    setMarkdownDraft(nextDraft);
    if (markdownSaveState !== "error") {
      setMarkdownSaveState("idle");
      setMarkdownError(null);
    }
  }

  function handleZoomIn() {
    setActiveSelection(null);
    setScale((currentScale) => Math.min(2.25, Number((currentScale + 0.15).toFixed(2))));
  }

  function handleZoomOut() {
    setActiveSelection(null);
    setScale((currentScale) => Math.max(0.65, Number((currentScale - 0.15).toFixed(2))));
  }

  function handleResetZoom() {
    setActiveSelection(null);
    setScale(1);
  }

  return (
    <main className="app-shell">
      <Toolbar
        fileName={activePdf?.fileName ?? null}
        onResetZoom={handleResetZoom}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        pageCount={pageCount}
        scale={scale}
      />

      <div className="workspace">
        <PdfViewer
          activePdf={activePdf}
          error={error}
          focusedPageNumber={focusedPageNumber}
          isLoading={isLoading}
          onDocumentError={setError}
          onDocumentLoad={handleDocumentLoad}
          onOpenPdf={handleOpenPdf}
          onSelectionChange={handleSelectionChange}
          pageCount={pageCount}
          pageRefs={pageRefs}
          scale={scale}
          viewerRef={viewerRef}
        />
        {activePdf ? (
          <Sidebar
            activeTab={sidebarTab}
            annotations={annotations}
            collapsed={sidebarCollapsed}
            hasPdf={Boolean(activePdf)}
            isMarkdownStorageReady={Boolean(activePdf.id)}
            markdownDraft={markdownDraft}
            markdownError={markdownError}
            markdownHasChanges={markdownDraft !== markdownText}
            markdownSaveState={markdownSaveState}
            onChangeMarkdownDraft={handleMarkdownDraftChange}
            onCollapse={() => setSidebarCollapsed(true)}
            onDeleteAnnotation={handleDeleteAnnotation}
            onExpandTab={(tab) => {
              setSidebarTab(tab);
              setSidebarCollapsed(false);
            }}
            onSelectAnnotation={handleSelectAnnotation}
            onSelectTab={setSidebarTab}
          />
        ) : null}
      </div>

      {activeSelection && (
        <FloatingAnnotationEditor
          mode={editorMode}
          onBeginEdit={() => setEditorMode("editor")}
          onCancel={() => {
            setActiveSelection(null);
            setEditorMode("button");
            window.getSelection()?.removeAllRanges();
          }}
          onSave={handleSaveAnnotation}
          selection={activeSelection}
          viewerElement={viewerRef.current}
        />
      )}

      <FloatingSearchBar
        activeIndex={searchActiveIndex}
        isSearching={isSearching}
        isVisible={searchBarOpen}
        onChangeQuery={handleSearchQueryChange}
        onClose={() => {
          setSearchBarOpen(false);
          window.getSelection()?.removeAllRanges();
          setActiveSelection(null);
        }}
        onNext={handleNextSearchResult}
        onPrevious={handlePreviousSearchResult}
        onSubmit={handleSearchSubmit}
        query={searchQuery}
        resultCount={searchResults.length}
      />
    </main>
  );
}

export default App;
