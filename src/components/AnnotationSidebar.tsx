import { Trash2 } from "lucide-react";
import type { Annotation } from "../types";

type AnnotationSidebarProps = {
  annotations: Annotation[];
  onDeleteAnnotation: (annotationId: string) => void;
  onSelectAnnotation: (annotation: Annotation) => void;
};

function formatTimestamp(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function AnnotationSidebar({
  annotations,
  onDeleteAnnotation,
  onSelectAnnotation,
}: AnnotationSidebarProps) {
  const sortedAnnotations = [...annotations].sort((first, second) => {
    if (first.page_number !== second.page_number) {
      return first.page_number - second.page_number;
    }

    return first.created_at.localeCompare(second.created_at);
  });

  return (
    <section className="annotation-tab" aria-label="Annotations">
      {sortedAnnotations.length === 0 ? (
        <div className="sidebar__empty">
          Select text in the PDF and add a comment.
        </div>
      ) : (
        <div className="annotation-list">
          {sortedAnnotations.map((annotation) => (
            <article
              className="annotation-card"
              key={annotation.id}
              onClick={() => onSelectAnnotation(annotation)}
            >
              <div className="annotation-card__header">
                <span>Page {annotation.page_number}</span>
                <button
                  className="icon-button icon-button--small"
                  onClick={(event) => {
                    event.stopPropagation();
                    onDeleteAnnotation(annotation.id);
                  }}
                  title="Delete annotation"
                  type="button"
                >
                  <Trash2 aria-hidden="true" size={15} />
                </button>
              </div>
              <p className="annotation-card__comment">{annotation.comment}</p>
              <blockquote className="annotation-card__quote">
                {annotation.selected_text}
              </blockquote>
              <time className="annotation-card__time">
                {formatTimestamp(annotation.updated_at)}
              </time>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
