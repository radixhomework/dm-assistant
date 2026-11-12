import { describe, expect, it, vi } from "vitest";
import { fireEvent } from "@testing-library/react";
import { RecordFormFields } from "./record-form-fields.js";
import { renderWithProviders } from "../testing/render.js";
import { templateSchemaOf } from "@dm/schemas";

describe("RecordFormFields", () => {
  it("propagates text edits through onChange", () => {
    const onChange = vi.fn();
    const schema = templateSchemaOf("places")!;
    renderWithProviders(
      <RecordFormFields schema={schema} fields={{}} onChange={onChange} />,
    );
    const input = document.querySelector('input[name="population"]')!;
    fireEvent.input(input, { target: { value: "2M" } });
    expect(onChange).toHaveBeenCalled();
    const last = onChange.mock.calls.at(-1)![0] as Record<string, unknown>;
    expect(last.population).toBe("2M");
  });

  it("renders prose fields with the rich editor", () => {
    renderWithProviders(
      <RecordFormFields schema={templateSchemaOf("places")!} fields={{}} onChange={vi.fn()} />,
    );
    expect(document.querySelectorAll(".ProseMirror").length).toBeGreaterThanOrEqual(2);
  });
});
