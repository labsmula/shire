"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  type Application,
  type ApplicationStatus,
  type Job,
  type JobStatus,
  StakeStatus,
  StakeType,
} from "../lib/types";
import { computeMatch, computeRisk } from "../lib/ai";
import { talents } from "../lib/seed";
import {
  ALFAJORES_CHAIN_ID,
  ME_CANDIDATE_ID,
  ME_RECRUITER_ID,
} from "./constants";
import { initialData } from "./initial-data";
import { getRecruiterById } from "./selectors";
import type { JobDraft, ShireState } from "./types";
import { demoAddress, randomTx, uid } from "./utils";

export { ALFAJORES_CHAIN_ID, ME_CANDIDATE_ID, ME_RECRUITER_ID };
export type { JobDraft, ShireState };
export {
  candidateDisplay,
  getCandidateById,
  getRecruiterById,
} from "./selectors";

export const useShireStore = create<ShireState>()(
  persist(
    (set, get) => ({
      hydrated: false,

      address: null,
      chainId: ALFAJORES_CHAIN_ID,
      connecting: false,

      roleType: 0,
      registeredOnchain: false,
      profileVersion: 0,

      candidateProfile: null,
      recruiterProfile: null,

      ...initialData(),
      savedJobIds: [],

      activeRole: "candidate",

      connect: async () => {
        set({ connecting: true });
        await new Promise((r) => setTimeout(r, 600));
        set({ address: get().address ?? demoAddress(), connecting: false });
      },

      disconnect: () => set({ address: null }),

      setActiveRole: (role) => set({ activeRole: role }),

      registerUser: (roleType) =>
        set({
          roleType,
          registeredOnchain: true,
          profileVersion: get().profileVersion + 1,
          activeRole:
            roleType === 2 ? "recruiter" : roleType === 3 ? get().activeRole : "candidate",
        }),

      saveCandidateProfile: (p) =>
        set((s) => ({
          candidateProfile: p,
          registeredOnchain: true,
          roleType: s.roleType === 2 ? 3 : s.roleType === 0 ? 1 : s.roleType,
        })),

      saveRecruiterProfile: (p) =>
        set((s) => ({
          recruiterProfile: p,
          registeredOnchain: true,
          roleType: s.roleType === 1 ? 3 : s.roleType === 0 ? 2 : s.roleType,
        })),

      createJob: (draft) => {
        const recruiter = getRecruiterById(get(), ME_RECRUITER_ID);
        const base: Job = {
          id: uid("job"),
          recruiterId: ME_RECRUITER_ID,
          title: draft.title,
          description: draft.description,
          companyName: recruiter?.companyName ?? "Your company",
          location: draft.location,
          remote: draft.remote,
          salaryRange: draft.salaryRange,
          jobType: draft.jobType,
          experienceLevel: draft.experienceLevel,
          skillsRequired: draft.skillsRequired,
          status: "DRAFT",
          stakeAmount: 0,
          stakeToken: "cUSD",
          stakeStatus: StakeStatus.Cancelled,
          candidateStakeRequired: draft.candidateStakeRequired,
          candidateStakeAmount: draft.candidateStakeAmount,
          riskLevel: "UNKNOWN",
          riskScore: 0,
          createdAt: Date.now(),
          expiresAt: Date.now() + 30 * 86400000,
        };
        const risk = computeRisk(base, recruiter);
        const job = { ...base, riskLevel: risk.riskLevel, riskScore: risk.riskScore };
        set((s) => ({ jobs: [job, ...s.jobs] }));
        return job;
      },

      stakeForJob: (jobId, amount, token) => {
        const stakeId = uid("stk");
        const now = Date.now();
        const job = get().jobs.find((j) => j.id === jobId);

        // seed a couple of demo applicants so the recruiter view comes alive
        const demoApplicants: Application[] = job
          ? talents
              .map((t) => ({
                t,
                overlap: t.skills.filter((sk) =>
                  job.skillsRequired.map((x) => x.toLowerCase()).includes(sk.toLowerCase()),
                ).length,
              }))
              .sort((a, b) => b.overlap - a.overlap)
              .slice(0, 2)
              .map(({ t }, i) => ({
                id: uid("app"),
                jobId,
                candidateId: t.id,
                status: "APPLIED" as ApplicationStatus,
                message: "Excited about this role — staked and ready to talk.",
                matchScore: computeMatch(job, t).matchScore,
                riskScore: job.riskScore,
                appliedAt: now - i * 3600000,
                updatedAt: now - i * 3600000,
              }))
          : [];

        set((s) => ({
          stakes: [
            {
              id: stakeId,
              userId: ME_RECRUITER_ID,
              jobId,
              stakeType: StakeType.JobPost,
              amount,
              token,
              status: StakeStatus.Locked,
              txHash: randomTx(),
              createdAt: now,
              updatedAt: now,
            },
            ...s.stakes,
          ],
          jobs: s.jobs.map((j) =>
            j.id === jobId
              ? {
                  ...j,
                  stakeAmount: amount,
                  stakeToken: token,
                  stakeStatus: StakeStatus.Locked,
                  status: "ACTIVE" as JobStatus,
                }
              : j,
          ),
          applications: [...demoApplicants, ...s.applications],
        }));
        return stakeId;
      },

      applyToJob: (jobId, message, opts) => {
        const state = get();
        if (state.applications.some((a) => a.jobId === jobId && a.candidateId === ME_CANDIDATE_ID))
          return;
        const job = state.jobs.find((j) => j.id === jobId);
        if (!job) return;
        const match = computeMatch(job, state.candidateProfile);
        const now = Date.now();
        const appId = uid("app");
        let stakeId: string | undefined;
        const stakes = [...state.stakes];
        if (opts?.stakeAmount) {
          stakeId = uid("stk");
          stakes.unshift({
            id: stakeId,
            userId: ME_CANDIDATE_ID,
            jobId,
            applicationId: appId,
            stakeType: StakeType.Application,
            amount: opts.stakeAmount,
            token: opts.token ?? "cUSD",
            status: StakeStatus.Locked,
            txHash: randomTx(),
            createdAt: now,
            updatedAt: now,
          });
        }
        set({
          stakes,
          applications: [
            {
              id: appId,
              jobId,
              candidateId: ME_CANDIDATE_ID,
              status: "APPLIED",
              message,
              matchScore: match.matchScore,
              riskScore: job.riskScore,
              stakeId,
              appliedAt: now,
              updatedAt: now,
            },
            ...state.applications,
          ],
        });
      },

      withdrawApplication: (appId) =>
        set((s) => ({
          applications: s.applications.map((a) =>
            a.id === appId ? { ...a, status: "WITHDRAWN", updatedAt: Date.now() } : a,
          ),
        })),

      toggleSaveJob: (jobId) =>
        set((s) => ({
          savedJobIds: s.savedJobIds.includes(jobId)
            ? s.savedJobIds.filter((id) => id !== jobId)
            : [jobId, ...s.savedJobIds],
        })),

      updateApplicationStatus: (appId, status) =>
        set((s) => ({
          applications: s.applications.map((a) =>
            a.id === appId ? { ...a, status, updatedAt: Date.now() } : a,
          ),
        })),

      moderateJob: (jobId, action) =>
        set((s) => ({
          jobs: s.jobs.map((j) =>
            j.id === jobId
              ? {
                  ...j,
                  status:
                    action === "approve" ? "ACTIVE" : action === "close" ? "CLOSED" : "FLAGGED",
                }
              : j,
          ),
        })),

      refundStake: (stakeId) =>
        set((s) => ({
          stakes: s.stakes.map((st) =>
            st.id === stakeId
              ? { ...st, status: StakeStatus.Refunded, updatedAt: Date.now() }
              : st,
          ),
        })),

      slashStake: (stakeId, amount, reason) =>
        set((s) => ({
          stakes: s.stakes.map((st) =>
            st.id === stakeId
              ? { ...st, status: StakeStatus.Slashed, amount, reason, updatedAt: Date.now() }
              : st,
          ),
        })),

      resolveDispute: (id, decision, slash) =>
        set((s) => {
          const dispute = s.disputes.find((d) => d.id === id);
          const stakes = slash
            ? s.stakes.map((st) =>
                st.id === dispute?.stakeId
                  ? { ...st, status: StakeStatus.Slashed, reason: decision, updatedAt: Date.now() }
                  : st,
              )
            : s.stakes;
          return {
            stakes,
            disputes: s.disputes.map((d) =>
              d.id === id ? { ...d, status: "RESOLVED", adminDecision: decision } : d,
            ),
          };
        }),

      resetDemo: () =>
        set({
          ...initialData(),
          savedJobIds: [],
          address: null,
          roleType: 0,
          registeredOnchain: false,
          candidateProfile: null,
          recruiterProfile: null,
          activeRole: "candidate",
        }),
    }),
    {
      name: "shire-store-v1",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      onRehydrateStorage: () => (state) => {
        if (state) state.hydrated = true;
      },
    },
  ),
);

