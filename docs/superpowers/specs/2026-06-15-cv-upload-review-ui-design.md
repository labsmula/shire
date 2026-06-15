# CV Upload Review UI Design

## Goal

Let candidates upload a PDF or DOCX CV from onboarding or profile settings,
observe asynchronous processing status, review the generated profile draft, and
confirm it through the existing candidate profile form.

## User Flow

1. The candidate selects one PDF or DOCX file, maximum 5 MiB.
2. The browser posts the file to `POST /api/candidates/me/cv`.
3. The UI polls `GET /api/candidates/me/cv/jobs/{jobId}`.
4. Status is shown as queued, processing, retrying, completed, or failed.
5. On completion, the agent profile is mapped into the web candidate profile
   form.
6. The form is not saved automatically. The candidate can edit every field.
7. The existing save action becomes the explicit confirmation step.

## Placement

A shared `CandidateCvUpload` component appears above `CandidateProfileForm` in:

- `/candidate/profile`
- `/onboarding/candidate`

The upload component owns file selection, submission, polling, status display,
and retry UI. The parent owns the generated form draft so the same draft can be
passed into the profile form.

## Form Prefill

`CandidateProfileForm` accepts an optional `draft` prop and resets its
React Hook Form values when a new completed draft arrives.

The agent-to-web mapping is:

- `fullName` -> `displayName`
- `summary`, falling back to `headline` -> `bio`
- `skills` -> `skills`
- `preferredRoles` -> `roleTargets`
- inferred seniority from `headline` or preferred roles -> `experienceLevel`
- `portfolioUrl`, `githubUrl`, `linkedinUrl`, `location` -> corresponding fields
- salary min/max/currency -> `salaryExpectation`
- existing values remain for fields absent from the AI draft
- `languages`, `timezone`, `visibility`, and `xUrl` remain user-managed

The mapper guarantees values accepted by the existing candidate profile schema.

## Authentication

Demo mode needs no browser token and resolves to `me_candidate` in the web API.
When Privy is configured, the upload component obtains the current Privy access
token and sends it as a bearer token to both upload and polling routes.

## Status and Errors

- `queued`: waiting for a worker.
- `active`: extracting, generating, embedding, or persisting.
- `delayed`: temporary failure; show attempt count and next retry time.
- `completed`: populate the form and prompt the user to review.
- `failed`: show the stable backend error and allow another upload.

Polling runs every second and stops on completed, failed, component unmount, or
a new upload. Network polling failures are retried a bounded number of times
before the UI reports that status could not be retrieved.

## Testing

Unit tests cover:

- Agent profile to web form mapping.
- Seniority inference and preservation of existing user-managed fields.
- Upload response parsing and completed job parsing.
- Failed and delayed state normalization.

Component behavior is kept behind a small `cv-upload-client` module so network
and polling logic can be tested with the Node test runner without adding a
browser test framework.
