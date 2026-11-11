import { ReactRenderer } from "@tiptap/react";
import type {
  SuggestionKeyDownProps,
  SuggestionOptions,
  SuggestionProps,
} from "@tiptap/suggestion";
import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../api/client.js";

type MentionCandidate = {
  slug: string;
  title: string;
  type: string;
};

type MentionListHandle = {
  onKeyDown: (event: KeyboardEvent) => boolean;
};

const MentionList = forwardRef<MentionListHandle, { readonly items: MentionCandidate[]; readonly command: (item: MentionCandidate) => void }>(
  function MentionList(props, ref) {
    const { t } = useTranslation();
    const [selectedIndex, setSelectedIndex] = useState(0);

    useEffect(() => {
      setSelectedIndex(0);
    }, [props.items]);

    useImperativeHandle(ref, () => ({
      onKeyDown: (event: KeyboardEvent) => {
        if (event.key === "ArrowUp") {
          setSelectedIndex((index) => (index + props.items.length - 1) % props.items.length);
          return true;
        }
        if (event.key === "ArrowDown") {
          setSelectedIndex((index) => (index + 1) % props.items.length);
          return true;
        }
        if (event.key === "Enter") {
          const item = props.items[selectedIndex];
          if (item) props.command(item);
          return true;
        }
        return false;
      },
    }));

    if (props.items.length === 0) {
      return (
        <div className="mention-list">
          <p className="text-muted">{t("editor.mentionNoResults")}</p>
        </div>
      );
    }

    return (
      <div className="mention-list">
        {props.items.map((item, index) => (
          <button
            key={item.slug}
            type="button"
            className={index === selectedIndex ? "mention-list-item selected" : "mention-list-item"}
            onClick={() => props.command(item)}
          >
            <span className="font-display">{item.title}</span>
            <span className="text-muted text-sm">{item.type}</span>
          </button>
        ))}
      </div>
    );
  },
);

/**
 * Suggestion config for the mention node (PRE-SPEC.md §6): items come
 * from the trigram autocomplete endpoint (GET /api/records?q=&type=),
 * the popup is a ReactRenderer-mounted MentionList positioned under the
 * caret, and the command inserts the mention node carrying the record's
 * slug. Keyboard: arrows navigate, Enter inserts, Escape dismisses.
 */
export const mentionSuggestion: Omit<SuggestionOptions<MentionCandidate>, "editor"> = {
  char: "@",
  items: async ({ query }) => {
    return api<MentionCandidate[]>(`/api/records?q=${encodeURIComponent(query)}`);
  },
  command: ({ editor, range, props }) => {
    editor
      .chain()
      .focus()
      .insertContentAt(range, [
        { type: "mention", attrs: { id: props.slug, label: props.title } },
        { type: "text", text: " " },
      ])
      .run();
  },
  render() {
    let renderer: ReactRenderer | null = null;

    const position = (clientRect: DOMRect | null | undefined) => {
      if (!renderer?.element || !clientRect) return;
      const element = renderer.element as HTMLElement;
      element.style.left = `${clientRect.left}px`;
      element.style.top = `${clientRect.bottom + 4}px`;
    };

    return {
      onBeforeStart: (props: SuggestionProps<MentionCandidate>) => {
        renderer = new ReactRenderer(MentionList, {
          props,
          editor: props.editor,
        });
        const element = renderer.element as HTMLElement;
        element.style.position = "absolute";
        document.body.appendChild(element);
        position(props.clientRect?.());
      },
      onBeforeUpdate: (props: SuggestionProps<MentionCandidate>) => {
        renderer?.updateProps(props);
      },
      onStart: (props: SuggestionProps<MentionCandidate>) => {
        position(props.clientRect?.());
      },
      onUpdate: (props: SuggestionProps<MentionCandidate>) => {
        position(props.clientRect?.());
      },
      onKeyDown: (props: SuggestionKeyDownProps) => {
        if (props.event.key === "Escape") {
          renderer?.destroy();
          renderer = null;
          return true;
        }
        const handle = renderer?.ref as MentionListHandle | undefined;
        return handle?.onKeyDown?.(props.event) ?? false;
      },
      onExit: () => {
        renderer?.destroy();
        renderer = null;
      },
    };
  },
};
