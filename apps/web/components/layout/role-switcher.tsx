"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronsUpDown } from "lucide-react";
import type { AppRole } from "@/lib/types";
import { useShireStore } from "@/lib/store";
import { useAccessToken } from "@/lib/auth/use-access-token";
import { PRIVY_ENABLED } from "@/lib/auth/use-auth";
import {
  getActiveRoleState,
  roleDestination,
  switchableRoles,
  type ActiveRoleState,
} from "@/lib/role-client";
import { roleMeta } from "@/components/layout/app-nav";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export function RoleSwitcher({ current }: { current: AppRole }) {
  const router = useRouter();
  const accessToken = useAccessToken();
  const setActiveRole = useShireStore((s) => s.setActiveRole);
  const candidateProfile = useShireStore((s) => s.candidateProfile);
  const recruiterProfile = useShireStore((s) => s.recruiterProfile);
  const demoActiveRoles = React.useMemo<ActiveRoleState>(() => ({
    candidate: Boolean(candidateProfile),
    recruiter: Boolean(recruiterProfile),
  }), [candidateProfile, recruiterProfile]);
  const [privyActiveRoles, setPrivyActiveRoles] =
    React.useState<ActiveRoleState | null>(null);
  const loadingRoles = PRIVY_ENABLED && privyActiveRoles === null;
  const activeRoles = PRIVY_ENABLED
    ? privyActiveRoles ?? { candidate: false, recruiter: false }
    : demoActiveRoles;

  React.useEffect(() => {
    if (!PRIVY_ENABLED) {
      return;
    }

    let cancelled = false;
    async function loadRoles() {
      try {
        const token = await accessToken();
        const next = await getActiveRoleState(token);
        if (!cancelled) setPrivyActiveRoles(next);
      } catch {
        if (!cancelled) {
          setPrivyActiveRoles({ candidate: false, recruiter: false });
        }
      }
    }

    void loadRoles();
    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <span className="size-1.5 rounded-full bg-primary" aria-hidden="true" />
          {loadingRoles ? "Loading roles" : roleMeta[current].label}
          <ChevronsUpDown className="size-3.5 text-muted-foreground" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        <DropdownMenuLabel>Switch view</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {switchableRoles.map((role) => (
          <DropdownMenuItem
            key={role}
            disabled={loadingRoles}
            onClick={() => {
              if (loadingRoles) {
                return;
              }
              if (activeRoles[role]) {
                if (!PRIVY_ENABLED) {
                  setActiveRole(role);
                }
              }
              router.push(roleDestination(role, activeRoles));
            }}
          >
            <span className="flex-1">{roleMeta[role].label}</span>
            <Check className={cn("size-4", role === current ? "opacity-100" : "opacity-0")} />
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
