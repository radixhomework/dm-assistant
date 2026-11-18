import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, screen } from "@testing-library/react";
import { DatePickerPanel } from "./date-picker.js";

const definition = {
  months: [
    { name: "Mersu", days: 30 },
    { name: "Iyaris", days: 28 },
  ],
  week: { days: 7 },
  dayNames: ["d1", "d2", "d3", "d4", "d5", "d6", "d7"],
  moon: { name: "Lune", cycleDays: 29 },
  currentYear: 842,
};

afterEach(cleanup);

describe("DatePickerPanel", () => {
  it("inserts a full date through the world definition", () => {
    const onInsert = vi.fn();
    renderWithPicker(onInsert);
    fireEvent.change(screen.getByLabelText("Month"), { target: { value: "2" } });
    // The day select caps at the selected month length (Iyaris 28).
    fireEvent.change(screen.getByLabelText("Day"), { target: { value: "27" } });
    fireEvent.click(screen.getByText("Insert"));
    expect(onInsert).toHaveBeenCalledWith({ year: 842, month: 2, day: 27 });
  });

  it("drops the day when switching to a shorter month that cannot hold it", () => {
    const onInsert = vi.fn();
    renderWithPicker(onInsert);
    fireEvent.change(screen.getByLabelText("Month"), { target: { value: "1" } });
    fireEvent.change(screen.getByLabelText("Day"), { target: { value: "30" } });
    // Switching to Iyaris (28 days) invalidates day 30.
    fireEvent.change(screen.getByLabelText("Month"), { target: { value: "2" } });
    fireEvent.click(screen.getByText("Insert"));
    expect(onInsert).toHaveBeenCalledWith({ year: 842, month: 2 });
  });

  it("rejects an empty, zero and fractional year", () => {
    const onInsert = vi.fn();
    // Without a definition the year starts empty; with one, the adopt
    // effect keeps the current year in the field.
    renderWithPicker(onInsert, undefined, null);
    const year = screen.getByLabelText("Year");
    fireEvent.click(screen.getByText("Insert"));
    expect(screen.getByText("The year is required.")).toBeDefined();
    fireEvent.change(year, { target: { value: "0" } });
    fireEvent.click(screen.getByText("Insert"));
    expect(screen.getByText("Year 0 does not exist.")).toBeDefined();
    fireEvent.change(year, { target: { value: "12.5" } });
    fireEvent.click(screen.getByText("Insert"));
    expect(screen.getByText("Year 0 does not exist.")).toBeDefined();
    expect(onInsert).not.toHaveBeenCalled();
  });

  it("falls back to generic months without a definition and closes", () => {
    const onInsert = vi.fn();
    const onClose = vi.fn();
    renderWithPicker(onInsert, onClose, null);
    const month = screen.getByLabelText("Month");
    expect([...month.querySelectorAll("option")]).toHaveLength(13);
    fireEvent.change(month, { target: { value: "12" } });
    fireEvent.change(screen.getByLabelText("Day"), { target: { value: "31" } });
    fireEvent.change(screen.getByLabelText("Year"), { target: { value: "-120" } });
    fireEvent.click(screen.getByText("Insert"));
    expect(onInsert).toHaveBeenCalledWith({ year: -120, month: 12, day: 31 });
    fireEvent.click(screen.getByText("Cancel"));
    expect(onClose).toHaveBeenCalled();
  });

  it("adopts the definition's current year once it arrives", () => {
    const onInsert = vi.fn();
    const { rerender } = renderPickerWith(null, onInsert);
    // The year starts empty without a definition.
    expect((screen.getByLabelText("Year") as HTMLInputElement).value).toBe("");
    rerender(<DatePickerPanel definition={definition} anchor={{ x: 10, y: 10 }} onInsert={onInsert} onClose={() => undefined} />);
    fireEvent.click(screen.getByText("Insert"));
    expect(onInsert).toHaveBeenCalledWith({ year: 842 });
  });
});

function renderPickerWith(definition: typeof definition | null, onInsert: (d: unknown) => void, onClose?: () => void) {
  return renderWithProviders(
    <DatePickerPanel
      definition={definition}
      anchor={{ x: 10, y: 10 }}
      onInsert={onInsert}
      onClose={onClose ?? (() => undefined)}
    />,
  );
}

function renderWithPicker(
  onInsert: (d: unknown) => void,
  onClose?: () => void,
  pickDefinition: typeof definition | null = definition,
) {
  return renderPickerWith(pickDefinition, onInsert, onClose);
}

import { renderWithProviders } from "../testing/render.js";
