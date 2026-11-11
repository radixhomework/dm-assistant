import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { buildExtensions } from "./extensions.js";

const toolButton =
  "rounded-md border border-border px-2 py-0.5 text-sm text-ink transition-colors duration-200 hover:bg-surface";

function ToolButton({
  editor,
  active,
  label,
  title,
  action,
}: {
  readonly editor: Editor;
  readonly active: boolean;
  readonly label: string;
  readonly title: string;
  readonly action: () => void;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={active ? false : !editor.can().chain().focus().run()}
      onClick={action}
      className={
        active
          ? "rounded-md bg-primary px-2 py-0.5 text-sm text-background transition-colors duration-200"
          : toolButton
      }
    >
      {label}
    </button>
  );
}

/**
 * The mounted prose editor: the shared buildExtensions() configuration
 * under a toolbar. Bodies load as markdown and emit markdown on every
 * change through the same parse → serialize contract the round-trip
 * suite gates.
 *
 * Toolbar rows: classic formatting first, the highlight blocks (attention,
 * mechanics) on their own row. readonly=true drops the toolbar entirely —
 * used by the record reading view.
 */
export function ProseEditor({
  markdown,
  onChange,
  readonly = false,
}: {
  readonly markdown: string;
  readonly onChange?: (markdown: string) => void;
  readonly readonly?: boolean;
}) {
  const { t } = useTranslation();
  // Re-render the toolbar on every transaction so active states follow.
  const [renderTick, setRenderTick] = useState(0);
  const editor = useEditor({
    extensions: buildExtensions(),
    content: markdown,
    contentType: "markdown",
    editable: !readonly,
    onUpdate: ({ editor: current }) => onChange?.(current.getMarkdown()),
  });

  useEffect(() => {
    editor?.setEditable(!readonly);
  }, [editor, readonly]);

  useEffect(() => {
    if (!editor) return;
    const rerender = () => setRenderTick((value) => value + 1);
    editor.on("transaction", rerender);
    return () => {
      editor.off("transaction", rerender);
    };
  }, [editor]);

  // Reading mode: a mention click opens the referenced record in a new
  // tab. In edit mode the click belongs to the node (selection/deletion),
  // so the handler stays readonly-only.
  useEffect(() => {
    if (!editor) return;
    const dom = editor.view.dom;
    const onClick = (event: MouseEvent) => {
      if (editor.isEditable) return;
      const mention = (event.target as HTMLElement).closest('[data-type="mention"]') as HTMLElement | null;
      const slug = mention?.dataset.id;
      if (slug) window.open(`/records/${slug}`, "_blank", "noopener");
    };
    dom.addEventListener("click", onClick);
    return () => dom.removeEventListener("click", onClick);
  }, [editor]);

  if (!editor) return null;

  const cmd = () => editor.chain().focus();

  return (
    <div className="flex flex-col gap-2">
      {!readonly && (
        <>
          <div
            data-revision={renderTick}
            className="flex flex-wrap items-center gap-1"
            role="toolbar"
            aria-label={t("editor.toolbar")}
          >
            <ToolButton editor={editor} active={editor.isActive("bold")} label="B" title={t("editor.bold")} action={() => cmd().toggleBold().run()} />
            <ToolButton editor={editor} active={editor.isActive("italic")} label="I" title={t("editor.italic")} action={() => cmd().toggleItalic().run()} />
            <ToolButton editor={editor} active={editor.isActive("strike")} label="S" title={t("editor.strike")} action={() => cmd().toggleStrike().run()} />
            <ToolButton editor={editor} active={editor.isActive("heading", { level: 2 })} label="H2" title={t("editor.heading2")} action={() => cmd().toggleHeading({ level: 2 }).run()} />
            <ToolButton editor={editor} active={editor.isActive("heading", { level: 3 })} label="H3" title={t("editor.heading3")} action={() => cmd().toggleHeading({ level: 3 }).run()} />
            <ToolButton editor={editor} active={editor.isActive("heading", { level: 4 })} label="H4" title={t("editor.heading4")} action={() => cmd().toggleHeading({ level: 4 }).run()} />
            <ToolButton editor={editor} active={editor.isActive("code")} label={"< >"} title={t("editor.inlineCode")} action={() => cmd().toggleCode().run()} />
            <ToolButton editor={editor} active={editor.isActive("codeBlock")} label={"{" + "}"} title={t("editor.codeBlock")} action={() => cmd().toggleCodeBlock().run()} />
            <ToolButton editor={editor} active={editor.isActive("blockquote")} label="❝" title={t("editor.quote")} action={() => cmd().toggleBlockquote().run()} />
            <ToolButton editor={editor} active={editor.isActive("bulletList")} label="•—" title={t("editor.bulletList")} action={() => cmd().toggleBulletList().run()} />
            <ToolButton editor={editor} active={editor.isActive("orderedList")} label="1." title={t("editor.orderedList")} action={() => cmd().toggleOrderedList().run()} />
            <ToolButton editor={editor} active={editor.isActive("link")} label="🔗" title={t("editor.link")} action={() => {
              const previous = editor.getAttributes("link").href as string | undefined;
              const href = window.prompt(t("editor.linkPrompt"), previous ?? "https://");
              if (href === null) return;
              if (href === "") { cmd().unsetLink().run(); return; }
              cmd().setLink({ href }).run();
            }} />
            <ToolButton editor={editor} active={false} label="🖼" title={t("editor.image")} action={() => {
              const src = window.prompt(t("editor.imagePrompt"));
              if (src) cmd().setImage({ src }).run();
            }} />
          </div>
          <div
            className="flex flex-wrap items-center gap-1"
            role="toolbar"
            aria-label={t("editor.highlightToolbar")}
          >
            <ToolButton editor={editor} active={editor.isActive("attention")} label={t("editor.attention")} title={t("editor.attention")} action={() => cmd().insertContent({ type: "attention", content: [{ type: "paragraph" }] }).run()} />
            <ToolButton editor={editor} active={editor.isActive("mechanics")} label={t("editor.mechanics")} title={t("editor.mechanics")} action={() => cmd().insertContent({ type: "mechanics", content: [{ type: "paragraph" }] }).run()} />
          </div>
        </>
      )}
      <EditorContent
        editor={editor}
        className="prose-editor rounded-md border border-border bg-background px-3 py-2"
      />
    </div>
  );
}
