import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { getCategories } from "@/lib/api/categories";
import { readSessionToken } from "@/lib/auth/session";
import type { CategoryResponse } from "@/types/api";

type FetchState =
  | { readonly status: "loading" }
  | {
      readonly status: "ready";
      readonly categories: readonly CategoryResponse[];
    }
  | { readonly status: "error" };

// "idle": the user is not authenticated yet (or anymore), so nothing is fetched.
export type CategoriesState = FetchState | { readonly status: "idle" };

const LOADING_STATE: FetchState = { status: "loading" };
const ERROR_STATE: FetchState = { status: "error" };
const IDLE_STATE: CategoriesState = { status: "idle" };

// Any failure becomes "error": callers fall back to an empty list instead of failing the page.
async function loadCategories(): Promise<FetchState> {
  const token = readSessionToken();
  if (token === undefined) {
    return ERROR_STATE;
  }
  try {
    const categories = await getCategories(token);
    return { status: "ready", categories };
  } catch {
    return ERROR_STATE;
  }
}

export function useCategories(): CategoriesState {
  const { status } = useAuth();
  const [state, setState] = useState<FetchState>(LOADING_STATE);

  useEffect(() => {
    if (status !== "authenticated") {
      return;
    }
    let isCancelled = false;
    void loadCategories().then((next) => {
      if (!isCancelled) {
        setState(next);
      }
    });
    return () => {
      isCancelled = true;
    };
  }, [status]);

  return status === "authenticated" ? state : IDLE_STATE;
}
