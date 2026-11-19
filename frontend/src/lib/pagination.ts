export type PageItem = number | "ellipsis";

// Shows the first page, the last page and the current page with its neighbours.
// A gap of exactly one page is filled with that page: an ellipsis would hide a single number.
export function getPageItems(
  current: number,
  total: number,
): readonly PageItem[] {
  const pages = [...new Set([1, current - 1, current, current + 1, total])]
    .filter((pageNumber) => pageNumber >= 1 && pageNumber <= total)
    .sort((first, second) => first - second);
  const items: PageItem[] = [];
  pages.forEach((pageNumber, index) => {
    if (index > 0) {
      const gap = pageNumber - pages[index - 1];
      if (gap === 2) {
        items.push(pageNumber - 1);
      } else if (gap > 2) {
        items.push("ellipsis");
      }
    }
    items.push(pageNumber);
  });
  return items;
}
