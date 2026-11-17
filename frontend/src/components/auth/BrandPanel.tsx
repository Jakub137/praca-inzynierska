import type { ComponentType } from "react";
import { BarChartIcon } from "@/components/icons/BarChartIcon";
import { SparkleIcon } from "@/components/icons/SparkleIcon";
import { TargetIcon } from "@/components/icons/TargetIcon";
import type { IconProps } from "@/components/icons/types";

type BrandFeature = {
  readonly title: string;
  readonly description: string;
  readonly Icon: ComponentType<IconProps>;
};

const BRAND_FEATURES: readonly BrandFeature[] = [
  {
    title: "Inteligentna analiza wydatków",
    description:
      "Zintegrowany asystent AI wspiera analizę i kategoryzację transakcji.",
    Icon: SparkleIcon,
  },
  {
    title: "Kontrola budżetu",
    description:
      "Monitoruj wydatki, kontroluj ustalone limity i sprawdzaj aktualny stan swojego budżetu.",
    Icon: BarChartIcon,
  },
  {
    title: "Cele oszczędnościowe",
    description:
      "Planuj oszczędności i śledź postępy w realizacji wyznaczonych celów.",
    Icon: TargetIcon,
  },
];

export function BrandPanel() {
  return (
    <aside className="flex w-full flex-col justify-center bg-brand bg-linear-to-br from-transparent to-ink/30 p-12 text-white">
      <div className="mx-auto w-full max-w-xl">
        <p className="text-4xl leading-tight font-semibold">
          Rozpocznij zarządzanie swoimi finansami z aplikacją Saldo
        </p>
        <p className="mt-4 text-lg">
          Monitoruj swoje wydatki, kontroluj budżet i realizuj założone cele
          oszczędnościowe.
        </p>
        <ul className="mt-10 space-y-4">
          {BRAND_FEATURES.map(({ title, description, Icon }) => (
            <li key={title} className="flex items-start gap-4">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-white/10">
                <Icon className="size-6" />
              </span>
              <div>
                <p className="font-semibold">{title}</p>
                <p className="mt-1 text-sm">{description}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
