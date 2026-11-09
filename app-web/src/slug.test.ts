import { describe, expect, it } from "vitest";
import { renderHook } from "@testing-library/react";
import { act } from "react";
import { slugify, useSlugAutoFill } from "./slug.js";

describe("slugify", () => {
  it("folds diacritics and lowercases", () => {
    expect(slugify("École de Magie")).toBe("ecole-de-magie");
    expect(slugify("Forêt ancienne")).toBe("foret-ancienne");
  });

  it("collapses non-alphanumeric runs and trims hyphens", () => {
    expect(slugify("  La Cité -- d'Or!  ")).toBe("la-cite-d-or");
    expect(slugify("---")).toBe("");
  });
});

describe("useSlugAutoFill", () => {
  it("pre-fills the slug from the title", () => {
    const { result } = renderHook(() => useSlugAutoFill());
    act(() => result.current.onTitleChange("Tour de Garde"));
    expect(result.current.title).toBe("Tour de Garde");
    expect(result.current.slug).toBe("tour-de-garde");
  });

  it("pauses auto-fill after a manual slug edit", () => {
    const { result } = renderHook(() => useSlugAutoFill());
    act(() => result.current.onTitleChange("Tour de Garde"));
    act(() => result.current.onSlugChange("ma-tour"));
    act(() => result.current.onTitleChange("Tour de Garde II"));
    expect(result.current.slug).toBe("ma-tour");
  });

  it("clears both fields on reset", () => {
    const { result } = renderHook(() => useSlugAutoFill());
    act(() => result.current.onTitleChange("Tour de Garde"));
    act(() => result.current.reset());
    expect(result.current.title).toBe("");
    expect(result.current.slug).toBe("");
  });

  it("resumes auto-fill when the slug is edited back to the derived form", () => {
    const { result } = renderHook(() => useSlugAutoFill());
    act(() => result.current.onTitleChange("Tour de Garde"));
    act(() => result.current.onSlugChange("tour-de-garde"));
    act(() => result.current.onTitleChange("Tour de Garde II"));
    expect(result.current.slug).toBe("tour-de-garde-ii");
  });
});
