import { render } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { AlertCircleIcon } from "@/components/icons/AlertCircleIcon";
import { BarChartIcon } from "@/components/icons/BarChartIcon";
import { CheckIcon } from "@/components/icons/CheckIcon";
import { ChevronDownIcon } from "@/components/icons/ChevronDownIcon";
import { CloseIcon } from "@/components/icons/CloseIcon";
import { HomeIcon } from "@/components/icons/HomeIcon";
import { EyeIcon } from "@/components/icons/EyeIcon";
import { EyeOffIcon } from "@/components/icons/EyeOffIcon";
import { LogoIcon } from "@/components/icons/LogoIcon";
import { MenuIcon } from "@/components/icons/MenuIcon";
import { PencilIcon } from "@/components/icons/PencilIcon";
import { RepeatIcon } from "@/components/icons/RepeatIcon";
import { SearchIcon } from "@/components/icons/SearchIcon";
import { SparkleIcon } from "@/components/icons/SparkleIcon";
import { TargetIcon } from "@/components/icons/TargetIcon";
import { TransferIcon } from "@/components/icons/TransferIcon";
import { TrashIcon } from "@/components/icons/TrashIcon";
import { WalletIcon } from "@/components/icons/WalletIcon";

const icons = {
  AlertCircleIcon,
  BarChartIcon,
  CheckIcon,
  ChevronDownIcon,
  CloseIcon,
  EyeIcon,
  EyeOffIcon,
  HomeIcon,
  LogoIcon,
  MenuIcon,
  PencilIcon,
  RepeatIcon,
  SearchIcon,
  SparkleIcon,
  TargetIcon,
  TransferIcon,
  TrashIcon,
  WalletIcon,
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
