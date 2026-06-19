"use client";

import Link from "next/link";
import { MapPin } from "lucide-react";
import type { Job } from "@/lib/types";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { RiskScoreBadge } from "@/components/trust/scores";
import { JobStatusBadge } from "@/components/jobs/job-status-badge";
import { formatToken, initials } from "@/lib/format";

export function JobCard({ job, href }: { job: Job; href: string }) {
  return (
    <div className="group relative flex flex-col rounded-2xl border border-border bg-card p-4 transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-md focus-within:ring-2 focus-within:ring-ring sm:p-5">
      <Link href={href} className="absolute inset-0 z-0 rounded-2xl" aria-label={`View ${job.title}`}>
        <span className="sr-only">{job.title}</span>
      </Link>

      <div className="flex items-start gap-3">
        <Avatar className="size-10">
          <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
            {initials(job.companyName)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold leading-tight">{job.title}</p>
          <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
            <span className="truncate">{job.companyName}</span>
            <span aria-hidden="true">·</span>
            <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">{job.remote ? "Remote" : job.location}</span>
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {job.skillsRequired.slice(0, 4).map((skill) => (
          <span
            key={skill}
            className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground"
          >
            {skill}
          </span>
        ))}
        {job.skillsRequired.length > 4 && (
          <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            +{job.skillsRequired.length - 4}
          </span>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <RiskScoreBadge level={job.riskLevel} />
        {job.status !== "ACTIVE" && <JobStatusBadge status={job.status} />}
        <span className="ml-auto font-mono text-xs tabular-nums text-muted-foreground">
          Stake {formatToken(job.stakeAmount, job.stakeToken)}
        </span>
      </div>
    </div>
  );
}
