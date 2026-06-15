"use client";

import * as React from "react";
import { PageHeader } from "@/components/shared/page-header";
import { CandidateCvUpload } from "@/components/profile/candidate-cv-upload";
import { CandidateProfileForm } from "@/components/profile/candidate-profile-form";
import type { CandidateProfile } from "@/lib/types";

export default function CandidateProfilePage() {
  const [draft, setDraft] = React.useState<CandidateProfile | null>(null);

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4 sm:p-6">
      <PageHeader
        title="Candidate profile"
        description="Keep this up to date for better AI match scores."
      />
      <CandidateCvUpload onDraft={setDraft} />
      <div className="rounded-2xl border border-border bg-card p-6">
        <CandidateProfileForm draft={draft} />
      </div>
    </div>
  );
}
