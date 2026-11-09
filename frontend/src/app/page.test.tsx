import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import HomePage from "@/app/page";

test("renders the Saldo heading", () => {
  render(<HomePage />);

  expect(
    screen.getByRole("heading", { level: 1, name: "Saldo" }),
  ).toBeDefined();
});
