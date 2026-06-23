import { ChevronDown, ChevronUp, Search, X } from "lucide-react";
import { useEffect, useRef } from "react";

type FloatingSearchBarProps = {
  activeIndex: number;
  isSearching: boolean;
  isVisible: boolean;
  query: string;
  resultCount: number;
  onChangeQuery: (query: string) => void;
  onClose: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onSubmit: (direction: "next" | "previous") => void;
};

export function FloatingSearchBar({
  activeIndex,
  isSearching,
  isVisible,
  query,
  resultCount,
  onChangeQuery,
  onClose,
  onNext,
  onPrevious,
  onSubmit,
}: FloatingSearchBarProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const hasResults = resultCount > 0;

  useEffect(() => {
    if (isVisible) {
      window.setTimeout(() => inputRef.current?.select(), 0);
    }
  }, [isVisible]);

  if (!isVisible) {
    return null;
  }

  return (
    <form
      className="floating-search"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit("next");
      }}
    >
      <Search aria-hidden="true" size={16} />
      <input
        aria-label="Search PDF"
        onChange={(event) => onChangeQuery(event.currentTarget.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            onClose();
            return;
          }

          if (event.key === "Enter" && event.shiftKey) {
            event.preventDefault();
            onSubmit("previous");
          }
        }}
        placeholder="Search PDF"
        ref={inputRef}
        value={query}
      />
      <span className="floating-search__count">
        {isSearching
          ? "..."
          : hasResults
            ? `${activeIndex + 1}/${resultCount}`
            : query.trim()
              ? "0"
              : ""}
      </span>
      <button
        className="icon-button icon-button--small"
        disabled={!hasResults}
        onClick={onPrevious}
        title="Previous result"
        type="button"
      >
        <ChevronUp aria-hidden="true" size={16} />
      </button>
      <button
        className="icon-button icon-button--small"
        disabled={!hasResults}
        onClick={onNext}
        title="Next result"
        type="button"
      >
        <ChevronDown aria-hidden="true" size={16} />
      </button>
      <button
        className="icon-button icon-button--small"
        onClick={onClose}
        title="Close search"
        type="button"
      >
        <X aria-hidden="true" size={15} />
      </button>
    </form>
  );
}
