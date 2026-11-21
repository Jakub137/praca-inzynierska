import { act, fireEvent, render, screen, within } from "@testing-library/react";
import type { ReactElement } from "react";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { GoalsView } from "@/components/goals/GoalsView";
import type {
  SavingsGoalsState,
  UseSavingsGoalsResult,
} from "@/hooks/useSavingsGoals";
import { ApiError } from "@/lib/api/errors";
import { installDialogStub } from "@/test-utils/dialog";
import {
  ACTIVE_GOAL,
  OVERDUE_GOAL,
  TEST_GOALS,
  TEST_TODAY,
} from "@/test-utils/goals";
import type {
  DepositToGoalRequest,
  SavingsGoalRequest,
  SavingsGoalResponse,
} from "@/types/api";

const useSavingsGoalsMock = vi.hoisted(() =>
  vi.fn<() => UseSavingsGoalsResult>(),
);
const createSavingsGoalMock = vi.hoisted(() =>
  vi.fn<
    (token: string, request: SavingsGoalRequest) => Promise<SavingsGoalResponse>
  >(),
);
const depositToSavingsGoalMock = vi.hoisted(() =>
  vi.fn<
    (
      token: string,
      goalId: number,
      request: DepositToGoalRequest,
    ) => Promise<SavingsGoalResponse>
  >(),
);
const readSessionTokenMock = vi.hoisted(() =>
  vi.fn<() => string | undefined>(),
);
const showToastMock = vi.hoisted(() => vi.fn<(message: string) => void>());

vi.mock("@/hooks/useSavingsGoals", () => ({
  useSavingsGoals: useSavingsGoalsMock,
}));
vi.mock("@/lib/api/goals", () => ({
  createSavingsGoal: createSavingsGoalMock,
  depositToSavingsGoal: depositToSavingsGoalMock,
}));
vi.mock("@/lib/auth/session", () => ({
  readSessionToken: readSessionTokenMock,
}));
vi.mock("@/hooks/useToast", () => ({
  useToast: () => ({ showToast: showToastMock }),
}));

function renderView(state: SavingsGoalsState, retry: () => void = vi.fn()) {
  useSavingsGoalsMock.mockReturnValue({ state, retry });
  return render(<GoalsView />);
}

function showState(
  rerender: (ui: ReactElement) => void,
  state: SavingsGoalsState,
  retry: () => void,
) {
  useSavingsGoalsMock.mockReturnValue({ state, retry });
  rerender(<GoalsView />);
}

const READY: SavingsGoalsState = {
  status: "ready",
  goals: TEST_GOALS,
  today: TEST_TODAY,
};
const EMPTY: SavingsGoalsState = {
  status: "ready",
  goals: [],
  today: TEST_TODAY,
};

describe("GoalsView", () => {
  beforeEach(() => {
    useSavingsGoalsMock.mockReset();
  });

  it("renders nothing while the user is not authenticated", () => {
    const { container } = renderView({ status: "idle" });

    expect(container.innerHTML).toBe("");
  });

  it("shows the loading skeleton", () => {
    renderView({ status: "loading" });

    expect(screen.getByRole("status").textContent).toBe("Ładowanie celów");
  });

  it("shows an error with a retry button", () => {
    const retry = vi.fn();
    renderView({ status: "error" }, retry);

    expect(screen.getByRole("alert").textContent).toBe(
      "Nie udało się wczytać celów.",
    );
    fireEvent.click(screen.getByRole("button", { name: "Spróbuj ponownie" }));

    expect(retry).toHaveBeenCalledTimes(1);
  });

  it("shows a text message instead of an empty grid", () => {
    renderView(EMPTY);

    expect(
      screen.getByRole("heading", { name: "Brak celów oszczędnościowych" }),
    ).toBeTruthy();
    expect(screen.queryAllByRole("listitem")).toHaveLength(0);
  });

  it("renders one card per goal in the order of the API", () => {
    renderView(READY);

    expect(screen.getAllByRole("listitem")).toHaveLength(4);
    expect(
      screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent),
    ).toEqual([
      "Wakacje we Włoszech",
      "Nowy laptop",
      "Rower",
      "Poduszka finansowa",
    ]);
  });

  it("gives every card the date read by the hook", () => {
    renderView(READY);

    expect(screen.getByText(/Termin minął/)).toBeTruthy();
    expect(screen.getByText(/Termin w ciągu miesiąca/)).toBeTruthy();
  });
});

describe("GoalsView dialogs", () => {
  const NAME = "Nazwa celu *";
  const TARGET_AMOUNT = "Kwota docelowa (PLN) *";
  const DATE = "Termin realizacji celu *";
  const DEPOSIT_AMOUNT = "Kwota wpłaty (PLN) *";
  const TOTAL_TOO_LARGE =
    "Suma wpłat na ten cel nie może przekroczyć 9 999 999 999,99. Wpisz mniejszą kwotę.";

  beforeAll(installDialogStub);

  beforeEach(() => {
    useSavingsGoalsMock.mockReset();
    createSavingsGoalMock.mockReset();
    depositToSavingsGoalMock.mockReset();
    readSessionTokenMock.mockReset();
    showToastMock.mockReset();
    readSessionTokenMock.mockReturnValue("token");
    // Only Date is faked: the view reads "today" when the dialog opens (2026-11-21 in Warsaw).
    vi.useFakeTimers({
      toFake: ["Date"],
      now: new Date("2026-11-21T10:00:00Z"),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function openNewGoal() {
    fireEvent.click(screen.getAllByRole("button", { name: "+ Nowy cel" })[0]);
  }

  function openDeposit(goalName: string) {
    fireEvent.click(
      screen.getByRole("button", { name: `Wpłać kwotę: ${goalName}` }),
    );
  }

  function fill(label: string, value: string) {
    fireEvent.change(screen.getByLabelText(label), { target: { value } });
  }

  async function click(name: string) {
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name }));
    });
  }

  async function fillAndSaveGoal() {
    fill(NAME, "Wakacje");
    fill(TARGET_AMOUNT, "6000");
    fill(DATE, "2027-07-21");
    await click("Zapisz cel");
  }

  it.each<SavingsGoalsState>([
    { status: "loading" },
    { status: "error" },
    READY,
    EMPTY,
  ])(
    "shows the new-goal button in every state except idle (case %#)",
    (state) => {
      renderView(state);

      expect(
        screen.getAllByRole("button", { name: "+ Nowy cel" })[0],
      ).toBeTruthy();
    },
  );

  it("shows the new-goal button in the empty state as well as in the header", () => {
    renderView(EMPTY);

    expect(screen.getAllByRole("button", { name: "+ Nowy cel" })).toHaveLength(
      2,
    );
  });

  it("puts a deposit button named after the goal on every card, also a completed one", () => {
    renderView(READY);

    for (const goal of TEST_GOALS) {
      expect(
        screen.getByRole("button", { name: `Wpłać kwotę: ${goal.name}` }),
      ).toBeTruthy();
    }
  });

  it("opens the new-goal dialog with dates from the day after today", () => {
    renderView(READY);

    openNewGoal();

    const dialog = screen.getByRole("dialog", { name: "Nowy cel" });
    expect(dialog).toBeTruthy();
    expect(screen.getByLabelText(DATE).getAttribute("min")).toBe("2026-11-22");
  });

  it("saves a new goal, reloads, shows the toast and keeps the focus on the add button", async () => {
    createSavingsGoalMock.mockResolvedValue(ACTIVE_GOAL);
    const retry = vi.fn();
    renderView(READY, retry);

    openNewGoal();
    await fillAndSaveGoal();

    expect(createSavingsGoalMock).toHaveBeenCalledWith("token", {
      name: "Wakacje",
      targetAmount: 6000,
      targetDate: "2027-07-21",
    });
    expect(retry).toHaveBeenCalledTimes(1);
    expect(showToastMock).toHaveBeenCalledWith("Dodano cel");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(
      screen.getAllByRole("button", { name: "+ Nowy cel" })[0],
    );
  });

  it("returns the focus to the header add button after a goal saved from the empty state", async () => {
    createSavingsGoalMock.mockResolvedValue(ACTIVE_GOAL);
    const retry = vi.fn();
    const { rerender } = renderView(EMPTY, retry);

    // The second button is the one of the empty state; it disappears when the goals reload.
    fireEvent.click(screen.getAllByRole("button", { name: "+ Nowy cel" })[1]);
    await fillAndSaveGoal();

    showState(rerender, { status: "loading" }, retry);
    showState(rerender, READY, retry);

    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "+ Nowy cel" }),
    );
  });

  it("keeps the dialog, the typed values and the data when saving a goal fails", async () => {
    createSavingsGoalMock.mockRejectedValue(
      new ApiError(500, { status: 500, detail: "Błąd serwera." }),
    );
    const retry = vi.fn();
    renderView(READY, retry);

    openNewGoal();
    await fillAndSaveGoal();

    expect(screen.getByRole("alert").textContent).toBe("Błąd serwera.");
    expect(screen.getByRole("dialog", { name: "Nowy cel" })).toBeTruthy();
    expect((screen.getByLabelText(NAME) as HTMLInputElement).value).toBe(
      "Wakacje",
    );
    expect(retry).not.toHaveBeenCalled();
    expect(showToastMock).not.toHaveBeenCalled();
  });

  it("shows the date message of the server under the date field", async () => {
    const message =
      "Termin celu musi być w przyszłości. Wybierz datę późniejszą niż dzisiejsza.";
    createSavingsGoalMock.mockRejectedValue(
      new ApiError(400, {
        status: 400,
        fieldErrors: [{ field: "targetDate", message }],
      }),
    );
    renderView(READY);

    openNewGoal();
    await fillAndSaveGoal();

    expect(screen.getByRole("alert").textContent).toBe(message);
    expect(document.activeElement).toBe(screen.getByLabelText(DATE));
  });

  it("opens the deposit dialog of the chosen goal", () => {
    renderView(READY);

    openDeposit("Nowy laptop");

    const dialog = screen.getByRole("dialog", {
      name: "Wpłata na cel: Nowy laptop",
    });
    expect(within(dialog).getByLabelText(DEPOSIT_AMOUNT)).toBeTruthy();
  });

  it("deposits to that goal, reloads and shows the toast", async () => {
    depositToSavingsGoalMock.mockResolvedValue(OVERDUE_GOAL);
    const retry = vi.fn();
    renderView(READY, retry);

    openDeposit("Nowy laptop");
    fill(DEPOSIT_AMOUNT, "250,5");
    await click("Wpłać");

    expect(depositToSavingsGoalMock).toHaveBeenCalledWith("token", 2, {
      amount: 250.5,
    });
    expect(retry).toHaveBeenCalledTimes(1);
    expect(showToastMock).toHaveBeenCalledWith("Wpłacono na cel");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("returns the focus to the deposit button of the same card once the goals are back", async () => {
    depositToSavingsGoalMock.mockResolvedValue(OVERDUE_GOAL);
    const retry = vi.fn();
    const { rerender } = renderView(READY, retry);

    openDeposit("Nowy laptop");
    fill(DEPOSIT_AMOUNT, "250");
    await click("Wpłać");

    // The reload replaces the cards by the skeleton, and the focused button goes with them.
    showState(rerender, { status: "loading" }, retry);
    expect(document.activeElement).toBe(document.body);

    showState(rerender, READY, retry);
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Wpłać kwotę: Nowy laptop" }),
    );
  });

  it("moves the focus to the add button when the card is gone after the reload", async () => {
    depositToSavingsGoalMock.mockResolvedValue(OVERDUE_GOAL);
    const retry = vi.fn();
    const { rerender } = renderView(READY, retry);

    openDeposit("Nowy laptop");
    fill(DEPOSIT_AMOUNT, "250");
    await click("Wpłać");

    showState(rerender, { status: "loading" }, retry);
    showState(
      rerender,
      {
        status: "ready",
        goals: TEST_GOALS.filter((goal) => goal.id !== OVERDUE_GOAL.id),
        today: TEST_TODAY,
      },
      retry,
    );

    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "+ Nowy cel" }),
    );
  });

  it("moves the focus to the add button when the reload fails", async () => {
    depositToSavingsGoalMock.mockResolvedValue(OVERDUE_GOAL);
    const retry = vi.fn();
    const { rerender } = renderView(READY, retry);

    openDeposit("Nowy laptop");
    fill(DEPOSIT_AMOUNT, "250");
    await click("Wpłać");

    showState(rerender, { status: "loading" }, retry);
    showState(rerender, { status: "error" }, retry);

    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "+ Nowy cel" }),
    );
  });

  it("allows a deposit on a completed goal", async () => {
    depositToSavingsGoalMock.mockResolvedValue(OVERDUE_GOAL);
    renderView(READY);

    openDeposit("Poduszka finansowa");
    fill(DEPOSIT_AMOUNT, "100");
    await click("Wpłać");

    expect(depositToSavingsGoalMock).toHaveBeenCalledWith("token", 4, {
      amount: 100,
    });
  });

  it("shows the message about the total above the limit under the amount and keeps the dialog", async () => {
    depositToSavingsGoalMock.mockRejectedValue(
      new ApiError(400, {
        status: 400,
        fieldErrors: [{ field: "amount", message: TOTAL_TOO_LARGE }],
      }),
    );
    const retry = vi.fn();
    renderView(READY, retry);

    openDeposit("Wakacje we Włoszech");
    fill(DEPOSIT_AMOUNT, "9999999999,99");
    await click("Wpłać");

    expect(screen.getByRole("alert").textContent).toBe(TOTAL_TOO_LARGE);
    expect(
      screen.getByRole("dialog", {
        name: "Wpłata na cel: Wakacje we Włoszech",
      }),
    ).toBeTruthy();
    expect(retry).not.toHaveBeenCalled();
    expect(showToastMock).not.toHaveBeenCalled();
  });

  it("returns the focus to the deposit button on Anuluj", () => {
    renderView(READY);

    openDeposit("Rower");
    fireEvent.click(screen.getByRole("button", { name: "Anuluj" }));

    expect(depositToSavingsGoalMock).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Wpłać kwotę: Rower" }),
    );
  });
});
