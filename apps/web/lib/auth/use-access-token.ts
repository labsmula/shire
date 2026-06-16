"use client";

import * as React from "react";
import { usePrivy } from "@privy-io/react-auth";

import { PRIVY_ENABLED } from "@/lib/auth/use-auth";

export function useDemoAccessToken(): () => Promise<string | undefined> {
  return React.useCallback(async () => undefined, []);
}

export function usePrivyAccessToken(): () => Promise<string | undefined> {
  const { ready, authenticated, getAccessToken } = usePrivy();

  return React.useCallback(async () => {
    if (!ready) {
      throw new Error("Authentication is still loading. Try again in a moment.");
    }
    if (!authenticated) {
      throw new Error("Sign in before continuing.");
    }

    const token = await getAccessToken();
    if (!token?.trim()) {
      throw new Error("Your session is unavailable. Sign in again.");
    }

    return token;
  }, [authenticated, getAccessToken, ready]);
}

export function useAccessToken(): () => Promise<string | undefined> {
  // eslint-disable-next-line react-hooks/rules-of-hooks -- PRIVY_ENABLED is constant per build.
  return PRIVY_ENABLED ? usePrivyAccessToken() : useDemoAccessToken();
}
