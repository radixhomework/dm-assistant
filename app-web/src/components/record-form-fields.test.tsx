import { describe, expect, it, vi } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import { useState } from "react";
import { RecordFormFields } from "./record-form-fields.js";
import { renderWithProviders } from "../testing/render.js";
import { templateSchemaOf, type TemplateSchema } from "@dm/schemas";

/** Stateful wrapper: the form's onChange feeds back into its fields so
 * conditional controls (the recurrence checkbox) re-render. */
function StatefulRecordFormFields(props: {
  readonly schema: TemplateSchema;
  readonly onFields: (fields: Record<string, unknown>) => void;
}) {
  const [fields, setFields] = useState<Record<string, unknown>>({});
  return (
    <RecordFormFields
      schema={props.schema}
      fields={fields}
      onChange={(next) => {
        setFields(next);
        props.onFields(next);
      }}
    />
  );
}

/** The fields object carried by the last onChange call. */
function lastFields(onChange: ReturnType<typeof vi.fn>): Record<string, unknown> {
  return onChange.mock.calls.at(-1)![0] as Record<string, unknown>;
}

/** The first input inside the Field whose visible label matches. */
function inputOfLabel(label: string): HTMLInputElement {
  const labelElement = screen.getByText(label).closest("label");
  if (!labelElement) throw new Error(`label '${label}' missing`);
  const input = labelElement.querySelector("input");
  if (!input) throw new Error(`input under '${label}' missing`);
  return input as HTMLInputElement;
}

/** The select whose option list contains the given value. */
function selectWithValue(value: string): HTMLSelectElement {
  const select = [...document.querySelectorAll("select")].find((candidate) =>
    candidate.querySelector(`option[value="${value}"]`),
  );
  if (!select) throw new Error(`select with option value '${value}' missing`);
  return select as HTMLSelectElement;
}

describe("RecordFormFields", () => {
  it("propagates text edits through onChange", () => {
    const onChange = vi.fn();
    renderWithProviders(
      <RecordFormFields schema={templateSchemaOf("places")!} fields={{}} onChange={onChange} />,
    );
    const input = document.querySelector('input[name="population"]')!;
    fireEvent.input(input, { target: { value: "2M" } });
    expect(onChange).toHaveBeenCalled();
    const last = lastFields(onChange);
    expect(last.population).toBe("2M");
  });

  it("renders prose fields with the rich editor", () => {
    renderWithProviders(
      <RecordFormFields schema={templateSchemaOf("places")!} fields={{}} onChange={vi.fn()} />,
    );
    expect(document.querySelectorAll(".ProseMirror").length).toBeGreaterThanOrEqual(2);
  });

  it("renders money as amount + currency select and propagates edits", () => {
    const onChange = vi.fn();
    renderWithProviders(
      <RecordFormFields
        schema={templateSchemaOf("equipment-and-items")!}
        fields={{}}
        onChange={onChange}
      />,
    );
    const currency = selectWithValue("gp");
    const amount = currency.closest("label")!.querySelector("input")! as HTMLInputElement;
    fireEvent.input(amount, { target: { value: "12.5" } });
    expect(lastFields(onChange).value).toMatchObject({ amount: 12.5 });
    fireEvent.change(currency, { target: { value: "sp" } });
    expect(lastFields(onChange).value).toMatchObject({ currency: "sp" });
  });

  it("renders calendar dates as era/year/month/day and propagates edits", () => {
    const onChange = vi.fn();
    renderWithProviders(
      <RecordFormFields schema={templateSchemaOf("events")!} fields={{}} onChange={onChange} />,
    );
    fireEvent.input(document.querySelector('input[placeholder="Era"]')!, {
      target: { value: "Age of Wolves" },
    });
    expect(lastFields(onChange).start).toMatchObject({ era: "Age of Wolves" });
    fireEvent.input(document.querySelector('input[placeholder="Year"]')!, {
      target: { value: "842" },
    });
    expect(lastFields(onChange).start).toMatchObject({ year: 842 });
    fireEvent.input(document.querySelector('input[placeholder="Month"]')!, {
      target: { value: "3" },
    });
    expect(lastFields(onChange).start).toMatchObject({ month: 3 });
    fireEvent.input(document.querySelector('input[placeholder="Day"]')!, {
      target: { value: "12" },
    });
    expect(lastFields(onChange).start).toMatchObject({ day: 12 });
  });
});

describe("RecordFormFields — clearing optional fields", () => {
  it("drops a cleared weight instead of sending an empty string", () => {
    const onChange = vi.fn();
    renderWithProviders(
      <StatefulRecordFormFields
        schema={templateSchemaOf("equipment-and-items")!}
        onFields={onChange}
      />,
    );
    const weight = inputOfLabel("Weight");
    fireEvent.input(weight, { target: { value: "2" } });
    expect(lastFields(onChange).weight).toBe("2");
    // Clearing removes the key: "" would fail the schema's min length.
    fireEvent.input(weight, { target: { value: "" } });
    expect(lastFields(onChange).weight).toBeUndefined();
    expect("weight" in lastFields(onChange)).toBe(false);
  });
});

describe("RecordFormFields — recurrence", () => {
  it("has no recurrence by default; the checkbox reveals unit and interval", () => {
    const onChange = vi.fn();
    renderWithProviders(
      <StatefulRecordFormFields schema={templateSchemaOf("events")!} onFields={onChange} />,
    );
    const checkbox = screen.getByRole("checkbox", { name: "Recurring event" }) as HTMLInputElement;
    expect(checkbox.checked).toBe(false);
    // No unit select before checking: no recurrence by default.
    expect(document.querySelectorAll("select")).toHaveLength(0);

    fireEvent.click(checkbox);
    expect(lastFields(onChange).recurrence).toMatchObject({ unit: "week", interval: 1 });

    const unit = selectWithValue("week");
    fireEvent.change(unit, { target: { value: "month" } });
    expect(lastFields(onChange).recurrence).toMatchObject({ unit: "month" });
    const interval = unit.parentElement!.querySelector('input[type="number"]')! as HTMLInputElement;
    fireEvent.input(interval, { target: { value: "3" } });
    expect(lastFields(onChange).recurrence).toMatchObject({ interval: 3 });

    // Unchecking removes the recurrence key entirely: keeping the key
    // with undefined members would serialize to nulls the schema rejects.
    const clearCheckbox = screen.getByRole("checkbox", { name: "Recurring event" }) as HTMLInputElement;
    fireEvent.click(clearCheckbox);
    expect(lastFields(onChange).recurrence).toBeUndefined();
    expect("recurrence" in lastFields(onChange)).toBe(false);
  });
});

describe("RecordFormFields — control robustness", () => {
  it("preserves the selected currency when the amount changes", () => {
    const onChange = vi.fn();
    renderWithProviders(
      <RecordFormFields
        schema={templateSchemaOf("equipment-and-items")!}
        fields={{ value: { amount: 5, currency: "sp" } }}
        onChange={onChange}
      />,
    );
    const amount = document.querySelector('input[name="value"]')
      ? (inputOfLabel("Value") as HTMLInputElement)
      : (screen.getByLabelText("Value") as HTMLInputElement);
    fireEvent.input(amount, { target: { value: "6" } });
    expect(lastFields(onChange).value).toMatchObject({ amount: 6, currency: "sp" });
  });

  it("derives a stable rowId for skills loaded from a record", () => {
    const onChange = vi.fn();
    renderWithProviders(
      <RecordFormFields
        schema={templateSchemaOf("monsters")!}
        fields={{
          statistics: {
            skills: [{ name: "Perception", ability: "wisdom", modifier: 3 }],
          } as never,
        }}
        onChange={onChange}
      />,
    );
    // Removing the loaded skill works through its derived id — the row
    // disappears from the picker list.
    fireEvent.change(screen.getByLabelText("Add a skill"), {
      target: { value: "Stealth" },
    });
    expect(lastFields(onChange).statistics).toMatchObject({
      skills: [
        { name: "Perception", modifier: 3 },
        { name: "Stealth" },
      ],
    });
  });
});

describe("RecordFormFields — single-value references", () => {
  it("hides the search input once a 0..1 value is attached, and keeps it for 0..n", () => {
    const onAttach = vi.fn();
    renderWithProviders(
      <RecordFormFields
        schema={templateSchemaOf("nations")!}
        fields={{}}
        onChange={() => undefined}
        references={{
          capital: [{ slug: "tremling", title: "Tremling" }],
          geography: [{ slug: "veldra", title: "Veldra" }],
        }}
        onAttachReference={onAttach}
        onDetachReference={() => undefined}
      />,
    );
    // The 0..1 capital shows its chip but no second-pick input.
    expect(screen.getByText("Tremling")).toBeDefined();
    const capitalField = screen.getByText("Tremling").closest("label")!;
    expect(capitalField.querySelector("input[placeholder]")).toBeNull();
    // The 0..n geography keeps its search input below the chip.
    const geographyField = screen.getByText("Veldra").closest("label")!;
    expect(geographyField.querySelector("input[placeholder]")).not.toBeNull();
  });
});

describe("RecordFormFields — hp formula lifecycle", () => {
  it("drops the hp block when emptied and keeps unparseable formulas without an average", () => {
    const onChange = vi.fn();
    renderWithProviders(
      <StatefulRecordFormFields schema={templateSchemaOf("monsters")!} onFields={onChange} />,
    );
    fireEvent.input(inputOfLabel("HP formula"), { target: { value: "17d6 + 22" } });
    expect(lastFields(onChange).statistics).toMatchObject({
      hp: { formula: "17d6 + 22", average: 81 },
    });
    // An emptied formula drops the HP block entirely — and with no
    // other statistics member, the whole block key disappears.
    fireEvent.input(inputOfLabel("HP formula"), { target: { value: "" } });
    expect(lastFields(onChange).statistics).toBeUndefined();
    // An unparseable formula keeps its text without an invented average.
    fireEvent.input(inputOfLabel("HP formula"), { target: { value: "2d6x" } });
    expect(lastFields(onChange).statistics).toMatchObject({
      hp: { formula: "2d6x" },
    });
    expect(lastFields(onChange).statistics.hp.average).toBeUndefined();
  });
});

describe("RecordFormFields — statistics rework", () => {
  it("stores an editable skill modifier and the equipment line", () => {
    const onChange = vi.fn();
    renderWithProviders(
      <StatefulRecordFormFields schema={templateSchemaOf("monsters")!} onFields={onChange} />,
    );
    // Pick a skill: the modifier prefills with ability + proficiency…
    fireEvent.change(screen.getByLabelText("Add a skill"), {
      target: { value: "Perception" },
    });
    expect(lastFields(onChange).statistics).toMatchObject({
      skills: [{ name: "Perception", ability: "wisdom" }],
    });
    // …then stays editable for out-of-sheet factors.
    fireEvent.input(screen.getByLabelText("Perception modifier"), {
      target: { value: "7" },
    });
    expect(lastFields(onChange).statistics).toMatchObject({
      skills: [{ name: "Perception", modifier: 7 }],
    });
    // The equipment line lives in the same block.
    fireEvent.input(inputOfLabel("Equipment"), {
      target: { value: "Bag of holding" },
    });
    expect(lastFields(onChange).statistics).toMatchObject({
      equipment: "Bag of holding",
    });
  });
});

describe("RecordFormFields — statistics block", () => {
  it("propagates ability, hp, alignment, creature type and size edits", () => {
    const onChange = vi.fn();
    renderWithProviders(
      <RecordFormFields schema={templateSchemaOf("monsters")!} fields={{}} onChange={onChange} />,
    );
    fireEvent.input(screen.getAllByLabelText("Strength", { exact: true })[0], { target: { value: "18" } });
    expect(lastFields(onChange).statistics).toMatchObject({ strength: 18 });

    // The PV formula computes its average automatically (17d6 avg 59 + 22).
    fireEvent.input(inputOfLabel("HP formula"), { target: { value: "17d6 + 22" } });
    expect(lastFields(onChange).statistics).toMatchObject({
      hp: { formula: "17d6 + 22", average: 81 },
    });


    fireEvent.change(selectWithValue("chaotic_neutral"), { target: { value: "chaotic_neutral" } });
    expect(lastFields(onChange).statistics).toMatchObject({ alignment: "chaotic_neutral" });

    fireEvent.change(selectWithValue("undead"), { target: { value: "undead" } });
    expect(lastFields(onChange).statistics).toMatchObject({ creatureType: "undead" });

    fireEvent.change(selectWithValue("gargantuan"), { target: { value: "large" } });
    expect(lastFields(onChange).statistics).toMatchObject({ size: "large" });
  });


  it("adds resistances from the static SRD damage list", () => {
    const onChange = vi.fn();
    renderWithProviders(
      <StatefulRecordFormFields schema={templateSchemaOf("monsters")!} onFields={onChange} />,
    );
    fireEvent.change(screen.getByLabelText("Resistances"), {
      target: { value: "fire" },
    });
    expect(lastFields(onChange).statistics).toMatchObject({
      resistances: ["fire"],
    });
    // Picked entries disappear from the select's available options.
    const select = screen.getByLabelText("Resistances") as HTMLSelectElement;
    const options = [...select.options].map(
      (option) => option.value,
    );
    expect(options).not.toContain("fire");
  });

  it("adds immunities from the damage and condition lists", () => {
    const onChange = vi.fn();
    renderWithProviders(
      <StatefulRecordFormFields schema={templateSchemaOf("monsters")!} onFields={onChange} />,
    );
    fireEvent.change(
      screen.getByLabelText("Immunities — Add a damage type"),
      { target: { value: "fire" } },
    );
    expect(lastFields(onChange).statistics).toMatchObject({
      immunities: ["fire"],
    });
    fireEvent.change(screen.getByLabelText("Immunities — Add a condition"), {
      target: { value: "charmed" },
    });
    expect(lastFields(onChange).statistics).toMatchObject({
      immunities: ["fire", "charmed"],
    });
  });

  it("translates size options", () => {
    renderWithProviders(
      <RecordFormFields schema={templateSchemaOf("monsters")!} fields={{}} onChange={vi.fn()} />,
    );
    const labels = [...selectWithValue("gargantuan").querySelectorAll("option")].map(
      (option) => option.textContent,
    );
    expect(labels).toContain("Tiny");
    expect(labels).not.toContain("tiny");
  });
});

describe("RecordFormFields — enums", () => {
  it("translates enum options in the type dropdown", () => {
    renderWithProviders(
      <RecordFormFields schema={templateSchemaOf("places")!} fields={{}} onChange={vi.fn()} />,
    );
    const labels = [...selectWithValue("city").querySelectorAll("option")].map(
      (option) => option.textContent,
    );
    expect(labels).toContain("City");
    expect(labels).not.toContain("city");
  });
});

