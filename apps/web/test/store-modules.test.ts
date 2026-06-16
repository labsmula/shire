import assert from "node:assert/strict";
import test from "node:test";

import {
  ME_CANDIDATE_ID,
  ME_RECRUITER_ID,
  candidateDisplay,
  getCandidateById,
  getRecruiterById,
  useShireStore,
} from "../store";
import { useShireStore as legacyUseShireStore } from "../lib/store";

test("store module exports the public Zustand store and selectors", () => {
  assert.equal(useShireStore, legacyUseShireStore);
  assert.equal(ME_CANDIDATE_ID, "me_candidate");
  assert.equal(ME_RECRUITER_ID, "rec_aperture");
  assert.equal(candidateDisplay(ME_CANDIDATE_ID, null), "You");
  assert.ok(getCandidateById("tal_sara"));
  assert.ok(getRecruiterById({ recruiterProfile: null }, "rec_aperture"));
});
