import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CategoryIcon } from "@/components/icons/CategoryIcon";

// Every icon name used by V2_1__seed_default_categories.sql.
const MIGRATION_SLUGS = [
  "shopping-cart",
  "film",
  "receipt",
  "car",
  "heart-pulse",
  "utensils",
  "shirt",
  "ellipsis",
  "wallet",
  "gift",
  "plus-circle",
];

function renderIcon(name?: string | null) {
  const { container } = render(<CategoryIcon name={name} />);
  const svg = container.querySelector("svg");
  if (svg === null) {
    throw new Error("CategoryIcon did not render an svg");
  }
  return svg;
}

describe("CategoryIcon", () => {
  it.each(MIGRATION_SLUGS)("renders its own icon for %s", (slug) => {
    const svg = renderIcon(slug);

    expect(svg.getAttribute("data-icon")).toBe(slug);
    expect(svg.children.length).toBeGreaterThan(0);
  });

  it("draws a different shape for every slug", () => {
    const shapes = new Set(
      MIGRATION_SLUGS.map((slug) => renderIcon(slug).innerHTML),
    );

    expect(shapes.size).toBe(MIGRATION_SLUGS.length);
  });

  it.each<string | null | undefined>([
    null,
    undefined,
    "",
    "unknown-icon",
    "constructor",
  ])("falls back to the ellipsis icon for %s", (name) => {
    const svg = renderIcon(name);

    expect(svg.getAttribute("data-icon")).toBe("ellipsis");
    expect(svg.innerHTML).toBe(renderIcon("ellipsis").innerHTML);
  });

  it("is decorative, sized by default and accepts className", () => {
    const { container } = render(
      <CategoryIcon name="car" className="size-4 text-muted" />,
    );
    const svg = container.querySelector("svg");

    expect(svg?.getAttribute("aria-hidden")).toBe("true");
    expect(svg?.getAttribute("width")).toBe("1em");
    expect(svg?.getAttribute("viewBox")).toBe("0 0 24 24");
    expect(svg?.getAttribute("stroke")).toBe("currentColor");
    expect(svg?.getAttribute("class")).toBe("size-4 text-muted");
  });
});
