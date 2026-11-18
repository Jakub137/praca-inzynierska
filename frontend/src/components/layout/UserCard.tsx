"use client";

import { useAuth } from "@/hooks/useAuth";
import type { AuthStatus } from "@/lib/auth/authContext";
import { FOCUS_RING } from "@/lib/focusRing";
import { getFullName, getInitials } from "@/lib/format/userName";
import type { AuthUserResponse } from "@/types/api";

type ProfileSummaryProps = {
  status: AuthStatus;
  user: AuthUserResponse | undefined;
};

function ProfileSummary({ status, user }: ProfileSummaryProps) {
  if (user !== undefined) {
    const fullName = getFullName(user.firstName, user.lastName);

    return (
      <div className="flex min-h-11 items-center gap-3 px-3">
        <span
          aria-hidden="true"
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand/10 text-sm font-semibold text-ink"
        >
          {getInitials(user.firstName, user.lastName)}
        </span>
        <span
          title={fullName}
          className="truncate text-sm font-medium text-ink"
        >
          {fullName}
        </span>
      </div>
    );
  }
  if (status === "loading") {
    return (
      <div
        aria-hidden="true"
        className="h-11 animate-pulse rounded-lg bg-line"
      />
    );
  }
  return null;
}

export function UserCard() {
  const { status, user, logout } = useAuth();

  return (
    <div className="flex flex-col gap-2 border-t border-line pt-4">
      <ProfileSummary status={status} user={user} />
      <button
        type="button"
        onClick={logout}
        className={`min-h-11 rounded-lg px-3 text-left text-sm font-medium text-danger hover:underline ${FOCUS_RING}`}
      >
        Wyloguj się
      </button>
    </div>
  );
}
