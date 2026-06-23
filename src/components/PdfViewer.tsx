import { AlertCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { MutableRefObject, RefObject } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { Document, Page } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import type { ActiveSelection, LoadedPdf } from "../types";

type PdfViewerProps = {
  activePdf: LoadedPdf | null;
  error: string | null;
  isLoading: boolean;
  focusedPageNumber: number | null;
  pageCount: number;
  pageRefs: MutableRefObject<Map<number, HTMLDivElement>>;
  scale: number;
  viewerRef: RefObject<HTMLDivElement | null>;
  onDocumentError: (message: string) => void;
  onDocumentLoad: (document: PDFDocumentProxy) => void;
  onOpenPdf: () => void;
  onSelectionChange: (selection: ActiveSelection | null) => void;
};

function nodeToElement(node: Node | null): Element | null {
  if (!node) {
    return null;
  }

  return node.nodeType === Node.ELEMENT_NODE ? (node as Element) : node.parentElement;
}

function selectionPageNumber(selection: Selection): number | null {
  const anchorPage = nodeToElement(selection.anchorNode)?.closest<HTMLElement>(
    "[data-page-number]",
  );
  const focusPage = nodeToElement(selection.focusNode)?.closest<HTMLElement>(
    "[data-page-number]",
  );
  const pageElement = anchorPage || focusPage;
  const pageNumber = Number(pageElement?.dataset.pageNumber);

  return Number.isFinite(pageNumber) && pageNumber > 0 ? pageNumber : null;
}

export function PdfViewer({
  activePdf,
  error,
  focusedPageNumber,
  isLoading,
  pageCount,
  pageRefs,
  scale,
  viewerRef,
  onDocumentError,
  onDocumentLoad,
  onOpenPdf,
  onSelectionChange,
}: PdfViewerProps) {
  const [renderedPageLimit, setRenderedPageLimit] = useState(0);
  const [extraRenderedPages, setExtraRenderedPages] = useState<Set<number>>(new Set());
  const pdfBytes = activePdf?.bytes;
  const documentFile = useMemo(
    () => (pdfBytes ? { data: pdfBytes } : null),
    [pdfBytes],
  );

  useEffect(() => {
    setRenderedPageLimit(pageCount > 0 ? Math.min(3, pageCount) : 0);
    setExtraRenderedPages(new Set());
  }, [activePdf?.sourcePath, pageCount]);

  useEffect(() => {
    if (pageCount === 0 || renderedPageLimit >= pageCount) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setRenderedPageLimit((currentLimit) => Math.min(pageCount, currentLimit + 3));
    }, renderedPageLimit <= 3 ? 120 : 220);

    return () => window.clearTimeout(timeoutId);
  }, [pageCount, renderedPageLimit]);

  useEffect(() => {
    if (!focusedPageNumber) {
      return;
    }

    setExtraRenderedPages((currentPages) => {
      if (currentPages.has(focusedPageNumber)) {
        return currentPages;
      }

      const nextPages = new Set(currentPages);
      nextPages.add(focusedPageNumber);
      return nextPages;
    });
  }, [focusedPageNumber]);

  function handleMouseUp() {
    window.setTimeout(() => {
      const selection = window.getSelection();
      const viewerElement = viewerRef.current;

      if (!selection || !viewerElement || selection.rangeCount === 0) {
        onSelectionChange(null);
        return;
      }

      const selectedText = selection.toString().trim();
      if (!selectedText) {
        onSelectionChange(null);
        return;
      }

      const range = selection.getRangeAt(0);
      if (!viewerElement.contains(range.commonAncestorContainer)) {
        onSelectionChange(null);
        return;
      }

      const pageNumber = selectionPageNumber(selection);
      const rect = range.getBoundingClientRect();

      if (!pageNumber || rect.width === 0 || rect.height === 0) {
        onSelectionChange(null);
        return;
      }

      onSelectionChange({
        text: selectedText,
        pageNumber,
        rect,
      });
    }, 0);
  }

  if (!activePdf) {
    return (
      <section className="viewer viewer--empty" ref={viewerRef}>
        <div className="empty-state">
          <button
            className="button button--primary button--large"
            disabled={isLoading}
            onClick={onOpenPdf}
            type="button"
          >
            Open PDF
          </button>
          {error ? (
            <p className="error-text">
              <AlertCircle aria-hidden="true" size={16} />
              {error}
            </p>
          ) : null}
        </div>
      </section>
    );
  }

  return (
    <section
      className="viewer"
      onMouseUp={handleMouseUp}
      onScroll={() => onSelectionChange(null)}
      ref={viewerRef}
    >
      {error ? (
        <div className="error-banner">
          <AlertCircle aria-hidden="true" size={16} />
          {error}
        </div>
      ) : null}

      <Document
        file={documentFile}
        loading={<div className="viewer__status">Loading PDF...</div>}
        onLoadError={(loadError) => onDocumentError(loadError.message)}
        onLoadSuccess={onDocumentLoad}
      >
        <div className="pdf-pages">
          {Array.from({ length: pageCount }, (_, index) => {
            const pageNumber = index + 1;
            const shouldRenderPage =
              pageNumber <= renderedPageLimit || extraRenderedPages.has(pageNumber);
            const isFocusedPage = focusedPageNumber === pageNumber;

            return (
              <div
                className={`pdf-page-shell${isFocusedPage ? " pdf-page-shell--focused" : ""}`}
                data-page-number={pageNumber}
                key={pageNumber}
                ref={(element) => {
                  if (element) {
                    pageRefs.current.set(pageNumber, element);
                  } else {
                    pageRefs.current.delete(pageNumber);
                  }
                }}
              >
                {shouldRenderPage ? (
                  <Page
                    loading={<div className="page-loading">Loading page {pageNumber}...</div>}
                    pageNumber={pageNumber}
                    renderAnnotationLayer={false}
                    renderTextLayer
                    scale={scale}
                  />
                ) : (
                  <div className="page-placeholder">Page {pageNumber}</div>
                )}
              </div>
            );
          })}
        </div>
      </Document>
    </section>
  );
}
