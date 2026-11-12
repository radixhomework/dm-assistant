import { describe, expect, it, vi } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import { RecordFormFields } from "./record-form-fields.js";
import { renderWithProviders } from "../testing/render.js";
import { templateSchemaOf } from "@dm/schemas";

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
    fireEvent.input(document.querySelector('input[placeholder="era"]')!, {
      target: { value: "Age of Wolves" },
    });
    expect(lastFields(onChange).start).toMatchObject({ era: "Age of Wolves" });
    fireEvent.input(document.querySelector('input[placeholder="year"]')!, {
      target: { value: "842" },
    });
    expect(lastFields(onChange).start).toMatchObject({ year: 842 });
    fireEvent.input(document.querySelector('input[placeholder="month"]')!, {
      target: { value: "3" },
    });
    expect(lastFields(onChange).start).toMatchObject({ month: 3 });
    fireEvent.input(document.querySelector('input[placeholder="day"]')!, {
      target: { value: "12" },
    });
    expect(lastFields(onChange).start).toMatchObject({ day: 12 });
  });
});

describe("RecordFormFields — recurrence", () => {
  it("renders unit select + interval and propagates edits", () => {
    const onChange = vi.fn();
    renderWithProviders(
      <RecordFormFields schema={templateSchemaOf("events")!} fields={{}} onChange={onChange} />,
    );
    const unit = selectWithValue("week");
    fireEvent.change(unit, { target: { value: "month" } });
    expect(lastFields(onChange).recurrence).toMatchObject({ unit: "month" });
    const interval = unit.closest("label")!.querySelector("input")! as HTMLInputElement;
    fireEvent.input(interval, { target: { value: "3" } });
    expect(lastFields(onChange).recurrence).toMatchObject({ interval: 3 });
  });
});

describe("RecordFormFields — statistics block", () => {
  it("propagates ability, hp, alignment, creature type and size edits", () => {
    const onChange = vi.fn();
    renderWithProviders(
      <RecordFormFields schema={templateSchemaOf("monsters")!} fields={{}} onChange={onChange} />,
    );
    fireEvent.input(inputOfLabel("Strength"), { target: { value: "18" } });
    expect(lastFields(onChange).statistics).toMatchObject({ strength: 18 });

    fireEvent.input(inputOfLabel("HP (average)"), { target: { value: "110" } });
    expect(lastFields(onChange).statistics).toMatchObject({ hp: { average: 110 } });

    fireEvent.input(inputOfLabel("HP formula"), { target: { value: "17d6 + 22" } });
    expect(lastFields(onChange).statistics).toMatchObject({ hp: { formula: "17d6 + 22" } });

    fireEvent.input(inputOfLabel("Alignment"), { target: { value: "chaotic neutral" } });
    expect(lastFields(onChange).statistics).toMatchObject({ alignment: "chaotic neutral" });

    fireEvent.input(inputOfLabel("Type"), { target: { value: "undead" } });
    expect(lastFields(onChange).statistics).toMatchObject({ creatureType: "undead" });

    fireEvent.change(selectWithValue("gargantuan"), { target: { value: "large" } });
    expect(lastFields(onChange).statistics).toMatchObject({ size: "large" });
  });

  it("shows the SRD ability modifier outside of editing", () => {
    renderWithProviders(
      <RecordFormFields
        schema={templateSchemaOf("monsters")!}
        fields={{ statistics: { strength: 18 } }}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByText("(+4)")).toBeDefined();
    // While the input is focused the modifier hides (no echo while typing).
    const strength = inputOfLabel("Strength");
    fireEvent.focus(strength);
    expect(screen.queryByText("(+4)")).toBeNull();
    fireEvent.blur(strength);
    expect(screen.getByText("(+4)")).toBeDefined();
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

