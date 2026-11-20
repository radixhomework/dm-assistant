import { useTranslation } from "react-i18next";
import { ProseEditor } from "../editor/prose-editor.js";
import { TitleLinks } from "./record-sheet.js";
import type { Entity } from "../types.js";

/**
 * The shared building blocks of the bespoke reading sheets (records-
 * editor 9.x): every sheet composes the same pieces — the illustration
 * banner, label/value chips, labeled reference groups, and headed
 * frameless prose sections. Extracted once so the sheets stay declarative
 * and the Sonar duplication gate stays quiet.
 */

/** The record's illustration as a banner image, when it has one. */
export function IllustrationBanner(props: { readonly record: Entity; readonly src?: string }) {
  if (props.src === undefined || props.src === "") return null;
  return (
    <img
      src={props.src}
      alt={props.record.title}
      className="mb-4 max-h-64 w-full rounded-md border border-border object-cover"
    />
  );
}

/** A row of label/value chips (population, rarity, dates…). */
export function SheetChips(props: {
  readonly chips: Array<{ readonly label: string; readonly value: string }>;
}) {
  if (props.chips.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {props.chips.map((chip) => (
        <span
          key={chip.label}
          className="rounded-md border border-border bg-background px-2 py-1 text-sm"
        >
          <span className="text-muted">{chip.label} </span>
          <span className="text-ink">{chip.value}</span>
        </span>
      ))}
    </div>
  );
}

/** One labeled group of record links (one <dl> entry). */
function ReferenceGroup(props: { readonly label: string; readonly targets: Array<{ id: string; slug: string; title: string }> }) {
  return (
    <div className="record-read-field">
      <dt>{props.label}</dt>
      <dd>
        <TitleLinks targets={props.targets} />
      </dd>
    </div>
  );
}

/**
 * The labeled reference groups whose field carries at least one target,
 * rendered in declaration order — structural groups (origin, capital…)
 * and associative groups share this shape.
 */
export function ReferenceGroups(props: {
  readonly groups: Array<readonly [string, string]>;
  readonly references: Record<string, Array<{ id: string; slug: string; title: string }>>;
  readonly className?: string;
}) {
  const { t } = useTranslation();
  const filled = props.groups.filter(
    ([key]) => (props.references[key] ?? []).length > 0,
  );
  if (filled.length === 0) return null;
  return (
    <dl className={`record-read-fields ${props.className ?? ""}`}>
      {filled.map(([key, labelKey]) => (
        <ReferenceGroup
          key={key}
          label={t(labelKey)}
          targets={props.references[key] ?? []}
        />
      ))}
    </dl>
  );
}

/** A headed, frameless prose section (the reading-sheet prose shape). */
export function ProseSection(props: {
  readonly labelKey: string;
  readonly markdown: string;
}) {
  const { t } = useTranslation();
  return (
    <section className="mt-8">
      <h2 className="font-display text-2xl text-ink">{t(props.labelKey)}</h2>
      <div className="mt-2">
        <ProseEditor markdown={props.markdown} readonly frame={false} />
      </div>
    </section>
  );
}

/** The headed, frameless prose sections of a sheet, in order, skipping
 * the empty ones. */
export function ProseSections(props: {
  readonly blocks: Array<readonly [string, string]>;
}) {
  return (
    <>
      {props.blocks
        .filter(([, markdown]) => markdown !== "")
        .map(([labelKey, markdown]) => (
          <ProseSection key={labelKey} labelKey={labelKey} markdown={markdown} />
        ))}
    </>
  );
}

/** Collects a group list only when at least one group is filled — the
 * guards the sheets repeat around their structural sections. */
export function hasFilledGroups(
  groups: Array<readonly [string, string]>,
  references: Record<string, Array<{ id: string; slug: string; title: string }>>,
): boolean {
  return groups.some(([key]) => (references[key] ?? []).length > 0);
}
