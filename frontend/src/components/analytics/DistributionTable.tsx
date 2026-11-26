import { formatPln, formatShare } from "@/lib/format/money";
import type { CategoryShareResponse } from "@/types/api";

type DistributionTableProps = {
  categories: readonly CategoryShareResponse[];
};

// Text alternative of the chart, visible only to screen readers.
// The wrapper is hidden, because a table ignores the 1px size of "sr-only".
export function DistributionTable({ categories }: DistributionTableProps) {
  return (
    <div className="sr-only">
      <table>
        <caption>Udział kategorii w wydatkach</caption>
        <thead>
          <tr>
            <th scope="col">Kategoria</th>
            <th scope="col">Kwota</th>
            <th scope="col">Udział</th>
          </tr>
        </thead>
        <tbody>
          {categories.map((category) => (
            <tr key={category.categoryId}>
              <th scope="row">{category.categoryName}</th>
              <td>{formatPln(category.amount)}</td>
              <td>{formatShare(category.percentage)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
