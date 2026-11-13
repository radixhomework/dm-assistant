import { NodeViewWrapper } from "@tiptap/react";
import { useCalendarDefinition } from "../calendar/use-calendar.js";

/**
 * Reading/editing display of an inline calendar date node: the localized
 * form via the world calendar definition (named month, e.g. "12 M1 842")
 * when one exists, the canonical numeric form otherwise.
 */
export function DateView(props: Readonly<{ node: { attrs: Record<string, unknown> } }>) {
  const year = props.node.attrs.year as number | null;
  const month = props.node.attrs.month as number | null;
  const day = props.node.attrs.day as number | null;
  const { definition } = useCalendarDefinition();
  const monthName = definition && month ? definition.months[month - 1]?.name : undefined;
  const text =
    year === null || year === undefined
      ? ""
      : [day, monthName ?? month, year].filter(Boolean).join(" ");
  return (
    <NodeViewWrapper
      as="span"
      data-type="calendar-date"
      data-year={year ?? undefined}
      data-month={month ?? undefined}
      data-day={day ?? undefined}
      className="date-node"
    >
      {text}
    </NodeViewWrapper>
  );
}
