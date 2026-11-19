import type { CategoryResponse } from "@/types/api";

export const TEST_CATEGORIES: readonly CategoryResponse[] = [
  {
    id: 1,
    name: "Artykuły spożywcze",
    icon: "shopping-cart",
    type: "EXPENSE",
    isDefault: true,
  },
  {
    id: 2,
    name: "Rozrywka",
    icon: "film",
    type: "EXPENSE",
    isDefault: true,
  },
  {
    id: 9,
    name: "Wynagrodzenie",
    icon: "wallet",
    type: "INCOME",
    isDefault: true,
  },
];
