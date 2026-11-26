import type { CategoryDistributionResponse } from "@/types/api";

export const TEST_DISTRIBUTION: CategoryDistributionResponse = {
  dateFrom: "2026-09-01",
  dateTo: "2026-11-30",
  totalExpenses: 7450.5,
  categories: [
    {
      categoryId: 3,
      categoryName: "Rachunki",
      amount: 4000,
      percentage: 53.69,
    },
    {
      categoryId: 1,
      categoryName: "Artykuły spożywcze",
      amount: 3420.5,
      percentage: 45.91,
    },
    { categoryId: 12, categoryName: "Hobby", amount: 30, percentage: 0.4 },
  ],
};

export const EMPTY_DISTRIBUTION: CategoryDistributionResponse = {
  dateFrom: "2026-09-01",
  dateTo: "2026-11-30",
  totalExpenses: 0,
  categories: [],
};
