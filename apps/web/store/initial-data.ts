import {
  jobs as seedJobs,
  seedApplications,
  seedDisputes,
  seedStakes,
} from "../lib/seed";

export const initialData = () => ({
  jobs: seedJobs.map((job) => ({ ...job })),
  applications: seedApplications.map((application) => ({ ...application })),
  stakes: seedStakes.map((stake) => ({ ...stake })),
  disputes: seedDisputes.map((dispute) => ({ ...dispute })),
});
