import {
  FileText,
  MessageSquareText,
  PanelRightClose,
  PanelRightOpen,
} from "lucide-react";
import { AnnotationSidebar } from "./AnnotationSidebar";
import { MarkdownDocumentTab } from "./MarkdownDocumentTab";
import type { Annotation, MarkdownSaveState, SidebarTab } from "../types";

type SidebarProps = {
  activeTab: SidebarTab;
  annotations: Annotation[];
  collapsed: boolean;
  markdownDraft: string;
  markdownError: string | null;
  markdownSaveState: MarkdownSaveState;
  hasPdf: boolean;
  isMarkdownStorageReady: boolean;
  markdownHasChanges: boolean;
  onChangeMarkdownDraft: (draft: string) => void;
  onCollapse: () => void;
  onDeleteAnnotation: (annotationId: string) => void;
  onExpandTab: (tab: SidebarTab) => void;
  onSelectAnnotation: (annotation: Annotation) => void;
  onSelectTab: (tab: SidebarTab) => void;
};

export function Sidebar({
  activeTab,
  annotations,
  collapsed,
  markdownDraft,
  markdownError,
  markdownSaveState,
  hasPdf,
  isMarkdownStorageReady,
  markdownHasChanges,
  onChangeMarkdownDraft,
  onCollapse,
  onDeleteAnnotation,
  onExpandTab,
  onSelectAnnotation,
  onSelectTab,
}: SidebarProps) {
  if (collapsed) {
    return (
      <aside className="sidebar sidebar--collapsed" aria-label="Sidebar">
        <div className="sidebar-rail">
          <button
            aria-label="Open annotations"
            className="rail-button"
            onClick={() => onExpandTab("annotations")}
            title="Annotations"
            type="button"
          >
            <MessageSquareText aria-hidden="true" size={18} />
          </button>
          <button
            aria-label="Open markdown"
            className="rail-button"
            onClick={() => onExpandTab("markdown")}
            title="Markdown"
            type="button"
          >
            <FileText aria-hidden="true" size={18} />
          </button>
          <button
            aria-label="Expand sidebar"
            className="rail-button rail-button--bottom"
            onClick={() => onExpandTab(activeTab)}
            title="Expand sidebar"
            type="button"
          >
            <PanelRightOpen aria-hidden="true" size={18} />
          </button>
        </div>
      </aside>
    );
  }

  return (
    <aside className="sidebar" aria-label="Sidebar">
      <div className="sidebar__topbar">
        <div className="sidebar-tabs" role="tablist" aria-label="Sidebar tabs">
          <button
            aria-selected={activeTab === "annotations"}
            className={
              activeTab === "annotations"
                ? "sidebar-tab sidebar-tab--active"
                : "sidebar-tab"
            }
            onClick={() => onSelectTab("annotations")}
            role="tab"
            type="button"
          >
            <MessageSquareText aria-hidden="true" size={16} />
            Annotations
          </button>
          <button
            aria-selected={activeTab === "markdown"}
            className={
              activeTab === "markdown" ? "sidebar-tab sidebar-tab--active" : "sidebar-tab"
            }
            onClick={() => onSelectTab("markdown")}
            role="tab"
            type="button"
          >
            <FileText aria-hidden="true" size={16} />
            Markdown
          </button>
        </div>
        <button
          aria-label="Collapse sidebar"
          className="icon-button icon-button--small"
          onClick={onCollapse}
          title="Collapse sidebar"
          type="button"
        >
          <PanelRightClose aria-hidden="true" size={16} />
        </button>
      </div>

      {activeTab === "annotations" ? (
        <AnnotationSidebar
          annotations={annotations}
          onDeleteAnnotation={onDeleteAnnotation}
          onSelectAnnotation={onSelectAnnotation}
        />
      ) : (
        <MarkdownDocumentTab
          draft={markdownDraft}
          error={markdownError}
          hasChanges={markdownHasChanges}
          hasPdf={hasPdf}
          isStorageReady={isMarkdownStorageReady}
          onChangeDraft={onChangeMarkdownDraft}
          saveState={markdownSaveState}
        />
      )}
    </aside>
  );
}
