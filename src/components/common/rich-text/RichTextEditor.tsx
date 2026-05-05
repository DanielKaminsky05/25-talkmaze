"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect } from "react";

interface RichTextEditorProps {
  title: string;
  content: string;
  onChange: (html: string) => void;
}

/**
 * RichTextEditor - Tiptap WYSIWYG editor used by coaches to write
 * per-lesson feedback.
 *
 * Stores output as HTML (bold + bullet lists supported).
 * Students see the saved HTML read-only via FeedbackDisplay.
 */
export default function RichTextEditor({
  title,
  content,
  onChange,
}: RichTextEditorProps) {
  const editor = useEditor({
    // Tiptap defaults to true, which causes SSR hydration mismatches
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        blockquote: false,
        code: false,
        horizontalRule: false,
      }),
    ],
    content,
    onUpdate({ editor }) {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: "min-h-[140px] p-4 focus:outline-none text-gray-800",
      },
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      // emitUpdate: false prevents onChange from firing and causing an infinite update loop
      editor.commands.setContent(content, { emitUpdate: false });
    }
  }, [content, editor]);

  return (
    <div className="rounded-xl overflow-hidden border border-gray-200 shadow-sm">
      <div
        className="px-5 py-3 flex items-center justify-between"
        style={{ backgroundColor: "#2B4257" }}
      >
        <span className="text-white font-semibold text-sm">{title}</span>
        <div className="flex items-center gap-1">
          <ToolbarButton
            onClick={() => editor?.chain().focus().toggleBold().run()}
            active={editor?.isActive("bold") ?? false}
            title="Bold"
          >
            <strong>B</strong>
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
            active={editor?.isActive("bulletList") ?? false}
            title="Bullet list"
          >
            &#8226;&#8212;
          </ToolbarButton>
        </div>
      </div>
      <EditorContent editor={editor} className="bg-white" />
    </div>
  );
}

interface ToolbarButtonProps {
  onClick: () => void;
  active: boolean;
  title: string;
  children: React.ReactNode;
}

function ToolbarButton({
  onClick,
  active,
  title,
  children,
}: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
        active ? "bg-white text-[#2B4257]" : "text-white/80 hover:bg-white/20"
      }`}
    >
      {children}
    </button>
  );
}
