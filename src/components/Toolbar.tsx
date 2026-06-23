import { RotateCcw, ZoomIn, ZoomOut } from "lucide-react";

type ToolbarProps = {
  fileName: string | null;
  pageCount: number;
  scale: number;
  onResetZoom: () => void;
  onZoomOut: () => void;
  onZoomIn: () => void;
};

export function Toolbar({
  fileName,
  pageCount,
  scale,
  onResetZoom,
  onZoomIn,
  onZoomOut,
}: ToolbarProps) {
  const hasPdf = Boolean(fileName);

  return (
    <header className="toolbar">
      <div className="toolbar__primary">
        <div className="file-summary" title={fileName || undefined}>
          <span className="file-summary__name">{fileName || "No PDF open"}</span>
          <span className="file-summary__meta">
            {pageCount > 0
              ? `${pageCount} page${pageCount === 1 ? "" : "s"}`
              : "File > Open PDF"}
          </span>
        </div>
      </div>

      {hasPdf ? (
        <div className="toolbar__tools">
          <div className="toolbar__zoom" aria-label="Zoom controls">
            <button
              className="icon-button"
              onClick={onZoomOut}
              title="Zoom out"
              type="button"
            >
              <ZoomOut aria-hidden="true" size={17} />
            </button>
            <button
              className="zoom-readout"
              onClick={onResetZoom}
              title="Reset zoom"
              type="button"
            >
              <RotateCcw aria-hidden="true" size={14} />
              {Math.round(scale * 100)}%
            </button>
            <button
              className="icon-button"
              onClick={onZoomIn}
              title="Zoom in"
              type="button"
            >
              <ZoomIn aria-hidden="true" size={17} />
            </button>
          </div>
        </div>
      ) : null}
    </header>
  );
}
