"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAccessToken } from "@/lib/auth/use-access-token";
import type { Application } from "@/lib/types";

type ApiApplication = Omit<Application, "candidateId" | "appliedAt"> & {
  candidateUserId: string;
  createdAt: number;
};

function authorizationHeaders(accessToken?: string) {
  const headers: Record<string, string> = {};
  if (accessToken) {
    headers.authorization = `Bearer ${accessToken}`;
  }
  return headers;
}

function toApplication(application: ApiApplication): Application {
  return {
    id: application.id,
    jobId: application.jobId,
    candidateId: application.candidateUserId,
    status: application.status,
    message: application.message,
    matchScore: application.matchScore,
    riskScore: application.riskScore,
    appliedAt: application.createdAt,
    updatedAt: application.updatedAt,
  };
}

async function readApplicationsResponse(response: Response) {
  if (!response.ok) {
    throw new Error("Applications request failed.");
  }
  const body = (await response.json()) as {
    applications?: ApiApplication[];
    application?: ApiApplication;
  };
  if (body.applications) {
    return body.applications.map(toApplication);
  }
  if (body.application) {
    return toApplication(body.application);
  }
  throw new Error("Applications response was invalid.");
}

export function useMyApplications() {
  const getAccessToken = useAccessToken();
  return useQuery({
    queryKey: ["applications", "candidate"],
    queryFn: async () => {
      const accessToken = await getAccessToken();
      const response = await fetch("/api/candidate/applications", {
        headers: authorizationHeaders(accessToken),
      });
      return (await readApplicationsResponse(response)) as Application[];
    },
  });
}

export function useApplyJob() {
  const queryClient = useQueryClient();
  const getAccessToken = useAccessToken();
  return useMutation({
    mutationFn: async ({
      jobId,
      message,
      stakeAmount,
    }: {
      jobId: string;
      message: string;
      stakeAmount?: number;
    }) => {
      const accessToken = await getAccessToken();
      const response = await fetch(`/api/candidate/applications/${jobId}`, {
        method: "POST",
        headers: {
          ...authorizationHeaders(accessToken),
          "content-type": "application/json",
        },
        body: JSON.stringify({ message, stakeAmount }),
      });
      return (await readApplicationsResponse(response)) as Application;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["applications"] });
    },
  });
}
