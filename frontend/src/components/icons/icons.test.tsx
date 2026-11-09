import { render } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { CheckIcon } from "@/components/icons/CheckIcon";
import { ChevronDownIcon } from "@/components/icons/ChevronDownIcon";
import { EyeIcon } from "@/components/icons/EyeIcon";
import { LogoIcon } from "@/components/icons/LogoIcon";
import { PencilIcon } from "@/components/icons/PencilIcon";
import { SearchIcon } from "@/components/icons/SearchIcon";
import { TrashIcon } from "@/components/icons/TrashIcon";

const icons = {
  CheckIcon,
  ChevronDownIcon,
  EyeIcon,
  LogoIcon,
  PencilIcon,
  SearchIcon,
  TrashIcon,
};

describe.each(Object.entries(icons))("%s", (_name, Icon) => {
  test("is decorative, sized by default and accepts className", () => {
    const { container } = render(<Icon className="size-4 text-brand" />);
    const svg = container.querySelector("svg");

    expect(svg?.getAttribute("aria-hidden")).toBe("true");
    expect(svg?.getAttribute("width")).toBe("1em");
    expect(svg?.getAttribute("class")).toBe("size-4 text-brand");
  });
});
