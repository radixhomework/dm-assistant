import { StatisticsBlock } from "./character-sheet.js";
import { ActionsBlock } from "./actions-block.js";
import {
  IllustrationBanner,
  ProseSections,
  ReferenceGroups,
} from "./sheet-parts.js";
import type { Entity } from "../types.js";
import type { Statistics } from "@dm/schemas";

/**
 * The bespoke sheet for "Monsters" (world → Bestiary), laid out like an
 * SRD stat block: the illustration as a banner, the statistics block,
 * the stat-adjacent references (languages, treasure types), the framed
 * Actions block (traits, actions, bonus actions, reactions, legendary
 * actions), then the two descriptions as headed frameless sections.
 */
export function MonsterSheet(props: { readonly record: Entity }) {
  const fields = (props.record.fields ?? {}) as {
    illustration?: string;
    statistics?: Statistics;
    traits?: string;
    actions?: string;
    bonus_actions?: string;
    reactions?: string;
    legendary_actions?: string;
    public_description?: string;
    private_description?: string;
  };
  const references = props.record.references ?? {};

  const referenceGroups: Array<readonly [string, string]> = [
    ["languages", "fields.languages"],
    ["treasure_types", "fields.treasure_types"],
  ];

  const proseBlocks: Array<readonly [string, string]> = [
    ["fields.public_description", fields.public_description ?? ""],
    ["fields.private_description", fields.private_description ?? ""],
  ];

  return (
    <div>
      <IllustrationBanner record={props.record} src={fields.illustration} />
      {fields.statistics !== undefined && (
        <StatisticsBlock statistics={fields.statistics} />
      )}
      <ReferenceGroups
        groups={referenceGroups}
        references={references}
        className="mt-4"
      />
      <ActionsBlock
        fields={{
          traits: fields.traits,
          actions: fields.actions,
          bonus_actions: fields.bonus_actions,
          reactions: fields.reactions,
          legendary_actions: fields.legendary_actions,
        }}
      />
      <ProseSections blocks={proseBlocks} />
    </div>
  );
}
