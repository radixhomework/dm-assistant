import { describe, expect, it } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import { renderWithProviders } from "../testing/render.js";
import { useSlugAutoFill } from "../slug.js";
import { SlugTitleFields } from "./slug-fields.js";

function Harness() {
  const fields = useSlugAutoFill();
  return <SlugTitleFields fields={fields} />;
}

describe("SlugTitleFields", () => {
  it("pre-fills the slug while the title is typed", () => {
    renderWithProviders(<Harness />);
    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Silver City" } });
    expect((screen.getByLabelText("Slug") as HTMLInputElement).value).toBe("silver-city");
  });
});
