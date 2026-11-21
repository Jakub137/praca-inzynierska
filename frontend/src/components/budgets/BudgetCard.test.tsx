import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BudgetCard } from "@/components/budgets/BudgetCard";
import {
  EXCEEDED_USAGE,
  NORMAL_USAGE,
  WARNING_USAGE,
} from "@/test-utils/budgets";

// formatPln groups thousands with a non-breaking space; an escape survives copying the plan.
const NBSP = " ";

const CASES = [
  {
    name: "NORMAL",
    usage: NORMAL_USAGE,
    summary: `1${NBSP}140,00 zł / 1${NBSP}500,00 zł (76%)`,
    label: "W normie",
    valueText: `1${NBSP}140,00 zł z 1${NBSP}500,00 zł, 76%, w normie`,
    fillClass: "bg-brand",
  },
  {
    name: "WARNING",
    usage: WARNING_USAGE,
    summary: `996,00 zł / 1${NBSP}000,00 zł (99%)`,
    label: "Zbliżasz się do limitu",
    valueText: `996,00 zł z 1${NBSP}000,00 zł, 99%, ostrzeżenie`,
    fillClass: "bg-warning",
  },
  {
    name: "EXCEEDED",
    usage: EXCEEDED_USAGE,
    summary: "921,00 zł / 500,00 zł (184%)",
    label: "Przekroczono limit",
    valueText: "921,00 zł z 500,00 zł, 184%, limit przekroczony",
    fillClass: "bg-danger",
  },
];

describe("BudgetCard", () => {
  it("shows the category name as a heading with the full name in the title", () => {
    render(<BudgetCard usage={NORMAL_USAGE} />);

    const heading = screen.getByRole("heading", {
      level: 2,
      name: "Artykuły spożywcze",
    });
    expect(heading.getAttribute("title")).toBe("Artykuły spożywcze");
  });

  it.each(CASES)(
    "shows spent, limit and the truncated percentage for $name",
    ({ usage, summary }) => {
      render(<BudgetCard usage={usage} />);

      expect(screen.getByRole("article").textContent).toContain(summary);
    },
  );

  it.each(CASES)(
    "shows the status as text for $name, not only as a colour",
    ({ usage, label }) => {
      render(<BudgetCard usage={usage} />);

      expect(screen.getByText(label)).toBeTruthy();
    },
  );

  it.each(CASES)(
    "describes the progress bar with amounts and status for $name",
    ({ usage, valueText }) => {
      render(<BudgetCard usage={usage} />);

      const bar = screen.getByRole("progressbar", {
        name: `Wykorzystanie limitu: ${usage.categoryName}`,
      });
      expect(bar.getAttribute("aria-valuetext")).toBe(valueText);
    },
  );

  it.each(CASES)(
    "colours the progress bar for $name with $fillClass",
    ({ usage, fillClass }) => {
      render(<BudgetCard usage={usage} />);

      const bar = screen.getByRole("progressbar");
      expect(bar.firstElementChild?.className).toContain(fillClass);
    },
  );

  it("has no edit button without a handler", () => {
    render(<BudgetCard usage={NORMAL_USAGE} />);

    expect(screen.queryByRole("button")).toBeNull();
  });

  it("names the edit button after the category and marks it for the focus restore", () => {
    render(<BudgetCard usage={WARNING_USAGE} onEdit={vi.fn()} />);

    const button = screen.getByRole("button", {
      name: "Edytuj limit: Rozrywka",
    });
    expect(button.textContent).toBe("Edytuj limit");
    expect(button.getAttribute("data-edit-for")).toBe("2");
    expect(button.getAttribute("type")).toBe("button");
  });

  it("passes the usage and the clicked button to the handler", () => {
    const onEdit = vi.fn();
    render(<BudgetCard usage={WARNING_USAGE} onEdit={onEdit} />);

    const button = screen.getByRole("button", {
      name: "Edytuj limit: Rozrywka",
    });
    fireEvent.click(button);

    expect(onEdit).toHaveBeenCalledWith(WARNING_USAGE, button);
  });
});
