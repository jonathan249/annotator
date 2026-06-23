import { Check, MessageSquarePlus, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ActiveSelection } from "../types";

type FloatingAnnotationEditorProps = {
  mode: "button" | "editor";
  selection: ActiveSelection;
  viewerElement: HTMLDivElement | null;
  onBeginEdit: () => void;
  onCancel: () => void;
  onSave: (comment: string) => void;
};

type FloatingPosition = {
  left: number;
  top: number;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function FloatingAnnotationEditor({
  mode,
  selection,
  viewerElement,
  onBeginEdit,
  onCancel,
  onSave,
}: FloatingAnnotationEditorProps) {
  const [comment, setComment] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (mode === "editor") {
      textareaRef.current?.focus();
    }
  }, [mode]);

  useEffect(() => {
    setComment("");
  }, [selection.text, selection.pageNumber]);

  const position = useMemo<FloatingPosition>(() => {
    const fallback = {
      left: selection.rect.left,
      top: selection.rect.bottom + 8,
    };

    if (!viewerElement) {
      return fallback;
    }

    const viewerRect = viewerElement.getBoundingClientRect();
    const width = mode === "editor" ? 340 : 150;
    const height = mode === "editor" ? 204 : 44;

    return {
      left: clamp(selection.rect.left, viewerRect.left + 12, viewerRect.right - width - 12),
      top: clamp(selection.rect.bottom + 8, viewerRect.top + 12, viewerRect.bottom - height - 12),
    };
  }, [mode, selection.rect, viewerElement]);

  if (mode === "button") {
    return (
      <button
        className="floating-annotate-button"
        onMouseDown={(event) => event.preventDefault()}
        onClick={onBeginEdit}
        style={{ left: position.left, top: position.top }}
        type="button"
      >
        <MessageSquarePlus aria-hidden="true" size={16} />
        Annotate
      </button>
    );
  }

  const canSave = comment.trim().length > 0;

  return (
    <form
      className="floating-editor"
      onMouseDown={(event) => event.stopPropagation()}
      onSubmit={(event) => {
        event.preventDefault();
        if (canSave) {
          onSave(comment.trim());
        }
      }}
      style={{ left: position.left, top: position.top }}
    >
      <label className="floating-editor__label" htmlFor="annotation-comment">
        Comment
      </label>
      <textarea
        id="annotation-comment"
        onChange={(event) => setComment(event.currentTarget.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            onCancel();
          }

          if (event.key === "Enter" && (event.metaKey || event.ctrlKey) && canSave) {
            event.preventDefault();
            onSave(comment.trim());
          }
        }}
        placeholder="Write your comment..."
        ref={textareaRef}
        value={comment}
      />
      <div className="floating-editor__actions">
        <button className="button button--ghost" onClick={onCancel} type="button">
          <X aria-hidden="true" size={15} />
          Cancel
        </button>
        <button className="button button--primary" disabled={!canSave} type="submit">
          <Check aria-hidden="true" size={15} />
          Save
        </button>
      </div>
    </form>
  );
}
