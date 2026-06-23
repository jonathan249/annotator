import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold,
  Code,
  Heading1,
  Heading2,
  Italic,
  List,
  ListOrdered,
  Quote,
  Strikethrough,
} from "lucide-react";
import { useEffect } from "react";
import type { MarkdownSaveState } from "../types";

type MarkdownDocumentTabProps = {
  draft: string;
  error: string | null;
  hasPdf: boolean;
  hasChanges: boolean;
  isStorageReady: boolean;
  saveState: MarkdownSaveState;
  onChangeDraft: (draft: string) => void;
};

function wordCountFromHtml(html: string): number {
  const text = html.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").trim();
  const words = text.match(/\S+/g);
  return words ? words.length : 0;
}

function statusLabel(saveState: MarkdownSaveState, hasChanges: boolean): string {
  if (saveState === "loading") {
    return "Preparing storage...";
  }

  if (saveState === "saving") {
    return "Saving...";
  }

  if (saveState === "error") {
    return "Save failed";
  }

  if (hasChanges) {
    return "Unsaved changes";
  }

  if (saveState === "saved") {
    return "Saved";
  }

  return "Idle";
}

export function MarkdownDocumentTab({
  draft,
  error,
  hasPdf,
  hasChanges,
  isStorageReady,
  saveState,
  onChangeDraft,
}: MarkdownDocumentTabProps) {
  const disabled = !hasPdf || !isStorageReady;
  const status = statusLabel(saveState, hasChanges);
  const editor = useEditor({
    editable: !disabled,
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: "Write notes for this PDF...",
      }),
    ],
    content: draft,
    immediatelyRender: false,
    onUpdate: ({ editor: updatedEditor }) => {
      onChangeDraft(updatedEditor.getHTML());
    },
  });

  useEffect(() => {
    editor?.setEditable(!disabled);
  }, [disabled, editor]);

  useEffect(() => {
    if (!editor || editor.getHTML() === draft) {
      return;
    }

    editor.commands.setContent(draft, { emitUpdate: false });
  }, [draft, editor]);

  return (
    <section className="markdown-tab" aria-label="Markdown document">
      {!hasPdf ? (
        <div className="sidebar__empty">Open a PDF to create a document.</div>
      ) : !isStorageReady ? (
        <div className="sidebar__empty">Preparing document storage...</div>
      ) : null}

      {error ? <div className="markdown-error">{error}</div> : null}

      <div className="tiptap-shell">
        <div className="tiptap-toolbar" aria-label="Formatting controls">
          <button
            className={editor?.isActive("bold") ? "tiptap-tool is-active" : "tiptap-tool"}
            disabled={disabled}
            onClick={() => editor?.chain().focus().toggleBold().run()}
            title="Bold"
            type="button"
          >
            <Bold aria-hidden="true" size={15} />
          </button>
          <button
            className={editor?.isActive("italic") ? "tiptap-tool is-active" : "tiptap-tool"}
            disabled={disabled}
            onClick={() => editor?.chain().focus().toggleItalic().run()}
            title="Italic"
            type="button"
          >
            <Italic aria-hidden="true" size={15} />
          </button>
          <button
            className={editor?.isActive("strike") ? "tiptap-tool is-active" : "tiptap-tool"}
            disabled={disabled}
            onClick={() => editor?.chain().focus().toggleStrike().run()}
            title="Strikethrough"
            type="button"
          >
            <Strikethrough aria-hidden="true" size={15} />
          </button>
          <button
            className={editor?.isActive("heading", { level: 1 }) ? "tiptap-tool is-active" : "tiptap-tool"}
            disabled={disabled}
            onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
            title="Heading 1"
            type="button"
          >
            <Heading1 aria-hidden="true" size={15} />
          </button>
          <button
            className={editor?.isActive("heading", { level: 2 }) ? "tiptap-tool is-active" : "tiptap-tool"}
            disabled={disabled}
            onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
            title="Heading 2"
            type="button"
          >
            <Heading2 aria-hidden="true" size={15} />
          </button>
          <button
            className={editor?.isActive("bulletList") ? "tiptap-tool is-active" : "tiptap-tool"}
            disabled={disabled}
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
            title="Bullet list"
            type="button"
          >
            <List aria-hidden="true" size={15} />
          </button>
          <button
            className={editor?.isActive("orderedList") ? "tiptap-tool is-active" : "tiptap-tool"}
            disabled={disabled}
            onClick={() => editor?.chain().focus().toggleOrderedList().run()}
            title="Ordered list"
            type="button"
          >
            <ListOrdered aria-hidden="true" size={15} />
          </button>
          <button
            className={editor?.isActive("blockquote") ? "tiptap-tool is-active" : "tiptap-tool"}
            disabled={disabled}
            onClick={() => editor?.chain().focus().toggleBlockquote().run()}
            title="Blockquote"
            type="button"
          >
            <Quote aria-hidden="true" size={15} />
          </button>
          <button
            className={editor?.isActive("codeBlock") ? "tiptap-tool is-active" : "tiptap-tool"}
            disabled={disabled}
            onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
            title="Code block"
            type="button"
          >
            <Code aria-hidden="true" size={15} />
          </button>
        </div>
        <EditorContent className="tiptap-editor" editor={editor} />
      </div>

      <div className="markdown-tab__footer">
        <span>{wordCountFromHtml(draft)} words</span>
        <span>Autosave</span>
      </div>
    </section>
  );
}
