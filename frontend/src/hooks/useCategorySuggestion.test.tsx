import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useCategorySuggestion } from "@/hooks/useCategorySuggestion";
import { SUGGESTION_DEBOUNCE_MS } from "@/lib/transactions/categorySuggestion";
import { TEST_CATEGORIES } from "@/test-utils/categories";
import {
  AI_ENTERTAINMENT,
  AI_GROCERIES,
  KEYWORD_GROCERIES,
  NO_SUGGESTION,
} from "@/test-utils/categorySuggestion";
import type {
  CategorySuggestionResponse,
  SuggestCategoryRequest,
} from "@/types/api";

const suggestCategoryMock = vi.hoisted(() =>
  vi.fn<
    (
      token: string,
      request: SuggestCategoryRequest,
    ) => Promise<CategorySuggestionResponse>
  >(),
);
const readSessionTokenMock = vi.hoisted(() =>
  vi.fn<() => string | undefined>(),
);

vi.mock("@/lib/api/ai", () => ({ suggestCategory: suggestCategoryMock }));
vi.mock("@/lib/auth/session", () => ({
  readSessionToken: readSessionTokenMock,
}));

type Options = Parameters<typeof useCategorySuggestion>[0];

const BASE_OPTIONS: Omit<Options, "onSuggested"> = {
  enabled: true,
  description: "",
  amount: "",
  type: "EXPENSE",
  categoryId: "",
  categories: TEST_CATEGORIES,
};

type Deferred<T> = {
  readonly promise: Promise<T>;
  readonly resolve: (value: T) => void;
};

// An answer that the test settles by hand, to control the order of the answers.
function createDeferred<T>(): Deferred<T> {
  let resolve: (value: T) => void = () => undefined;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

function renderSuggestion(overrides: Partial<Options> = {}) {
  const onSuggested = vi.fn<(categoryId: string) => void>();
  let props: Options = { ...BASE_OPTIONS, onSuggested, ...overrides };
  const view = renderHook(
    (options: Options) => useCategorySuggestion(options),
    {
      initialProps: props,
    },
  );

  function update(changes: Partial<Options>) {
    props = { ...props, ...changes };
    view.rerender(props);
  }

  return { result: view.result, unmount: view.unmount, onSuggested, update };
}

async function advance(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

describe("useCategorySuggestion", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    suggestCategoryMock.mockReset();
    readSessionTokenMock.mockReset();
    readSessionTokenMock.mockReturnValue("token");
    suggestCategoryMock.mockResolvedValue(AI_GROCERIES);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("waits for the debounce delay before asking", async () => {
    const { update } = renderSuggestion();

    update({ description: "Biedronka zakupy" });
    await advance(SUGGESTION_DEBOUNCE_MS - 1);

    expect(suggestCategoryMock).not.toHaveBeenCalled();

    await advance(1);

    expect(suggestCategoryMock).toHaveBeenCalledTimes(1);
    expect(suggestCategoryMock).toHaveBeenCalledWith("token", {
      description: "Biedronka zakupy",
      type: "EXPENSE",
    });
  });

  it("restarts the delay on every edit", async () => {
    const { update } = renderSuggestion();

    update({ description: "Bied" });
    await advance(300);
    update({ description: "Biedronka" });
    await advance(300);

    expect(suggestCategoryMock).not.toHaveBeenCalled();

    await advance(SUGGESTION_DEBOUNCE_MS - 300);

    expect(suggestCategoryMock).toHaveBeenCalledTimes(1);
    expect(suggestCategoryMock).toHaveBeenCalledWith("token", {
      description: "Biedronka",
      type: "EXPENSE",
    });
  });

  it("does not ask for a description shorter than three characters", async () => {
    const { update } = renderSuggestion();

    update({ description: "  ab " });
    await advance(SUGGESTION_DEBOUNCE_MS);

    expect(suggestCategoryMock).not.toHaveBeenCalled();
  });

  it("does not ask when disabled", async () => {
    const { update } = renderSuggestion({ enabled: false });

    update({ description: "Biedronka zakupy" });
    await advance(SUGGESTION_DEBOUNCE_MS);

    expect(suggestCategoryMock).not.toHaveBeenCalled();
  });

  it("does not ask without a session token", async () => {
    readSessionTokenMock.mockReturnValue(undefined);
    const { update } = renderSuggestion();

    update({ description: "Biedronka zakupy" });
    await advance(SUGGESTION_DEBOUNCE_MS);

    expect(suggestCategoryMock).not.toHaveBeenCalled();
  });

  it("sends a valid amount as a number", async () => {
    const { update } = renderSuggestion();

    update({ description: "Biedronka", amount: "184,50" });
    await advance(SUGGESTION_DEBOUNCE_MS);

    expect(suggestCategoryMock).toHaveBeenCalledWith("token", {
      description: "Biedronka",
      amount: 184.5,
      type: "EXPENSE",
    });
  });

  it("leaves out an invalid amount", async () => {
    const { update } = renderSuggestion();

    update({ description: "Biedronka", amount: "abc" });
    await advance(SUGGESTION_DEBOUNCE_MS);

    expect(suggestCategoryMock).toHaveBeenCalledWith("token", {
      description: "Biedronka",
      type: "EXPENSE",
    });
  });

  it("sends the type of the form", async () => {
    const { update } = renderSuggestion({ type: "INCOME" });

    update({ description: "Premia roczna" });
    await advance(SUGGESTION_DEBOUNCE_MS);

    expect(suggestCategoryMock).toHaveBeenCalledWith("token", {
      description: "Premia roczna",
      type: "INCOME",
    });
  });

  it("selects the category of an AI suggestion", async () => {
    const { result, update, onSuggested } = renderSuggestion();

    update({ description: "Biedronka zakupy" });
    await advance(SUGGESTION_DEBOUNCE_MS);

    expect(onSuggested).toHaveBeenCalledTimes(1);
    expect(onSuggested).toHaveBeenCalledWith("1");

    update({ categoryId: "1" });

    expect(result.current.current).toEqual({
      description: "Biedronka zakupy",
      type: "EXPENSE",
      categoryId: 1,
      aiConfidence: 94,
    });
  });

  it("selects the category of a keyword suggestion without a confidence", async () => {
    suggestCategoryMock.mockResolvedValue(KEYWORD_GROCERIES);
    const { result, update, onSuggested } = renderSuggestion();

    update({ description: "Biedronka zakupy" });
    await advance(SUGGESTION_DEBOUNCE_MS);
    update({ categoryId: "1" });

    expect(onSuggested).toHaveBeenCalledWith("1");
    expect(result.current.current?.aiConfidence).toBeNull();
  });

  it("does nothing when there is no suggestion", async () => {
    suggestCategoryMock.mockResolvedValue(NO_SUGGESTION);
    const { result, update, onSuggested } = renderSuggestion();

    update({ description: "xyz abc" });
    await advance(SUGGESTION_DEBOUNCE_MS);

    expect(suggestCategoryMock).toHaveBeenCalledTimes(1);
    expect(onSuggested).not.toHaveBeenCalled();
    expect(result.current.current).toBeNull();
  });

  it("ignores a category that is not on the list", async () => {
    suggestCategoryMock.mockResolvedValue({ ...AI_GROCERIES, categoryId: 99 });
    const { update, onSuggested } = renderSuggestion();

    update({ description: "Biedronka zakupy" });
    await advance(SUGGESTION_DEBOUNCE_MS);

    expect(onSuggested).not.toHaveBeenCalled();
  });

  it("ignores a category of another type than asked", async () => {
    suggestCategoryMock.mockResolvedValue({ ...AI_GROCERIES, categoryId: 9 });
    const { update, onSuggested } = renderSuggestion();

    update({ description: "Biedronka zakupy" });
    await advance(SUGGESTION_DEBOUNCE_MS);

    expect(onSuggested).not.toHaveBeenCalled();
  });

  it("does nothing when the request fails", async () => {
    suggestCategoryMock.mockRejectedValue(new Error("Network down"));
    const { result, update, onSuggested } = renderSuggestion();

    update({ description: "Biedronka zakupy" });
    await advance(SUGGESTION_DEBOUNCE_MS);

    expect(suggestCategoryMock).toHaveBeenCalledTimes(1);
    expect(onSuggested).not.toHaveBeenCalled();
    expect(result.current.current).toBeNull();
  });

  it("keeps a pending answer when only the amount changes", async () => {
    const answer = createDeferred<CategorySuggestionResponse>();
    suggestCategoryMock.mockReturnValue(answer.promise);
    const { update, onSuggested } = renderSuggestion();

    update({ description: "Biedronka zakupy" });
    await advance(SUGGESTION_DEBOUNCE_MS);
    update({ amount: "10" });
    await act(async () => {
      answer.resolve(AI_GROCERIES);
    });

    expect(suggestCategoryMock).toHaveBeenCalledTimes(1);
    expect(onSuggested).toHaveBeenCalledWith("1");
  });

  it("ignores an answer that arrives after a newer request", async () => {
    const first = createDeferred<CategorySuggestionResponse>();
    const second = createDeferred<CategorySuggestionResponse>();
    suggestCategoryMock
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    const { update, onSuggested } = renderSuggestion();

    update({ description: "Biedronka" });
    await advance(SUGGESTION_DEBOUNCE_MS);
    update({ description: "Kino Helios" });
    await advance(SUGGESTION_DEBOUNCE_MS);
    await act(async () => {
      second.resolve(AI_ENTERTAINMENT);
      first.resolve(AI_GROCERIES);
    });

    expect(onSuggested).toHaveBeenCalledTimes(1);
    expect(onSuggested).toHaveBeenCalledWith("2");
  });

  it("ignores an answer that arrives after unmount", async () => {
    const answer = createDeferred<CategorySuggestionResponse>();
    suggestCategoryMock.mockReturnValue(answer.promise);
    const { update, unmount, onSuggested } = renderSuggestion();

    update({ description: "Biedronka zakupy" });
    await advance(SUGGESTION_DEBOUNCE_MS);
    unmount();
    await act(async () => {
      answer.resolve(AI_GROCERIES);
    });

    expect(onSuggested).not.toHaveBeenCalled();
  });

  it("stops asking after a manual choice", async () => {
    const { result, update } = renderSuggestion();

    act(() => result.current.markManualChoice());
    update({ description: "Biedronka zakupy" });
    await advance(SUGGESTION_DEBOUNCE_MS);

    expect(suggestCategoryMock).not.toHaveBeenCalled();
  });

  it("ignores an answer that arrives after a manual choice", async () => {
    const answer = createDeferred<CategorySuggestionResponse>();
    suggestCategoryMock.mockReturnValue(answer.promise);
    const { result, update, onSuggested } = renderSuggestion();

    update({ description: "Biedronka zakupy" });
    await advance(SUGGESTION_DEBOUNCE_MS);
    act(() => result.current.markManualChoice());
    await act(async () => {
      answer.resolve(AI_GROCERIES);
    });

    expect(onSuggested).not.toHaveBeenCalled();
    expect(result.current.current).toBeNull();
  });

  it("drops the suggestion when the description changes", async () => {
    const { result, update } = renderSuggestion();

    update({ description: "Biedronka zakupy" });
    await advance(SUGGESTION_DEBOUNCE_MS);
    update({ categoryId: "1" });

    expect(result.current.current).not.toBeNull();

    update({ description: "Biedronka zakupy na weekend" });

    expect(result.current.current).toBeNull();
  });

  it("drops the suggestion when another category is chosen", async () => {
    const { result, update } = renderSuggestion();

    update({ description: "Biedronka zakupy" });
    await advance(SUGGESTION_DEBOUNCE_MS);
    update({ categoryId: "1" });

    expect(result.current.current).not.toBeNull();

    update({ categoryId: "2" });

    expect(result.current.current).toBeNull();
  });
});
