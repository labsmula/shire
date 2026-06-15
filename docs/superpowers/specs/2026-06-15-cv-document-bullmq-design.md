# CV Document Ingestion and BullMQ Design

## Goal

Allow a candidate to upload a PDF or DOCX CV through the Shire web app, process it asynchronously through the existing agent CV pipeline, and expose durable job status backed by an external Redis instance.

## Scope

This feature adds:

- A web API proxy for candidate CV submission and status polling.
- An internal agent multipart endpoint for PDF and DOCX files.
- In-memory document text extraction before enqueueing.
- A BullMQ-backed queue and worker using `REDIS_URL`.
- Three job attempts with exponential backoff starting at five seconds.
- Retry classification so permanent input failures do not retry.
- Service-to-service authentication between the web app and agent.

This feature does not add:

- Storage of the original CV file.
- Legacy `.doc` support.
- A general-purpose file storage service.
- Database persistence for candidate-to-job ownership.
- A new candidate profile user interface.

## End-to-End Flow

1. The browser sends `multipart/form-data` containing one `file` to
   `POST /api/candidates/me/cv`.
2. The web API resolves the authenticated candidate identity. Production uses a
   verified Privy access token. Demo mode uses the existing `me_candidate`
   identity.
3. The web API creates an internal multipart request containing the resolved
   `candidateId` and file.
4. The web API sends the request to
   `POST {SHIRE_AGENT_INTERNAL_URL}/jobs/cv-document` with
   `Authorization: Bearer {SHIRE_AGENT_SERVICE_TOKEN}`.
5. The agent validates the service token, file size, declared MIME type, and
   file signature.
6. The agent extracts text from the file in memory. The source bytes are
   discarded after the request and are never written to Redis or local disk.
7. The agent sanitizes the extracted text and enqueues the existing `cv-parse`
   payload in BullMQ.
8. The BullMQ worker invokes the existing CV processor, LLM normalization,
   embedding, and candidate profile draft persistence.
9. The browser polls `GET /api/candidates/me/cv/jobs/:jobId`. The web API proxies
   the request to the authenticated internal agent status endpoint.
10. The completed response contains the existing structured candidate profile,
    embedding metadata, usage, and `llmInvoked: true`.

## Identity and Authorization

The browser must not choose the authoritative `candidateId`.

In production, the web API verifies the Privy bearer token server-side and
derives a stable candidate key from the verified user ID. In demo development,
where Privy is not configured, the route uses `me_candidate`.

The web API forwards its resolved candidate key to the agent. Agent document and
status routes require an exact bearer token match against
`SHIRE_AGENT_SERVICE_TOKEN`. The service token is server-only and must not use a
`NEXT_PUBLIC_` environment variable.

Job status responses include the candidate key in BullMQ job data. The agent
requires the web API to provide the expected candidate key when polling and
returns `404` when the job does not belong to that candidate. This avoids
leaking job existence across candidates.

## HTTP Contracts

### Web Upload

`POST /api/candidates/me/cv`

Request:

- Content type: `multipart/form-data`
- Field: `file`
- Authorization: Privy bearer token in production

Success response, HTTP `202`:

```json
{
  "jobId": "string",
  "status": "queued"
}
```

### Web Status

`GET /api/candidates/me/cv/jobs/:jobId`

Success response mirrors the normalized agent job response.

### Agent Upload

`POST /jobs/cv-document`

Request:

- Content type: `multipart/form-data`
- Fields: `candidateId`, `file`
- Authorization: internal service bearer token

Validation failures return HTTP `400` with a stable code:

- `CV_FILE_REQUIRED`
- `CV_FILE_TOO_LARGE`
- `CV_FILE_TYPE_UNSUPPORTED`
- `CV_FILE_SIGNATURE_INVALID`
- `CV_TEXT_EMPTY`
- `CV_TEXT_TOO_LARGE`

Authentication failures return HTTP `401`.

### Agent Status

`GET /jobs/:jobId?candidateId={candidateId}`

The route requires the service bearer token for BullMQ-backed runtime access.
It returns:

- HTTP `200` for known, owned jobs.
- HTTP `404` for unknown jobs or ownership mismatch.
- HTTP `503` when the queue backend is unavailable.

## Document Validation and Extraction

Accepted formats:

| Format | MIME type | Signature check | Extractor |
| --- | --- | --- | --- |
| PDF | `application/pdf` | Starts with `%PDF-` | `pdf-parse` |
| DOCX | `application/vnd.openxmlformats-officedocument.wordprocessingml.document` | ZIP signature and required DOCX entries | `mammoth` |

The maximum upload size is 5 MiB. Multer uses memory storage and enforces the
limit while reading the multipart request.

The extracted text passes through the existing CV text sanitizer. Empty text is
rejected. Sanitized text remains bounded by the existing `rawCv` limit of
100,000 characters.

## BullMQ Architecture

The runtime uses one queue named `shire-agent-jobs`. A BullMQ adapter owns:

- `Queue` for enqueue and lookup.
- `Worker` for processing.
- Redis connection options parsed from `REDIS_URL`.
- Mapping BullMQ states and metadata to the existing public job envelope.

The queue payload remains the existing typed `JobRequest`. Processors remain
independent of BullMQ and receive the existing job context.

The runtime no longer starts the custom polling `AgentWorker` when configured
for BullMQ. The in-memory queue and worker remain available only for isolated
unit tests.

Startup requires:

- `REDIS_URL`
- `SHIRE_AGENT_SERVICE_TOKEN`

The server fails fast with a clear configuration error when either is missing.
Tests may inject queue and authentication dependencies without Redis.

## Retry Policy

Every BullMQ job is configured with:

```ts
{
  attempts: 3,
  backoff: {
    type: "exponential",
    delay: 5_000
  },
  removeOnComplete: false,
  removeOnFail: false
}
```

This produces an initial run and up to two delayed retries, approximately five
and ten seconds after temporary failures.

Retryable errors include:

- HTTP `429`.
- HTTP `500` through `599`.
- Provider timeout.
- Connection reset, DNS, and transient network errors.
- Redis connection interruption handled by BullMQ.

Permanent failures throw BullMQ `UnrecoverableError`:

- Invalid or empty CV input.
- Schema-invalid job payload.
- Unsupported document format.
- Authentication or authorization failure.
- LLM response that remains schema-invalid after the existing model fallback
  and normalization attempts are exhausted.

The public state mapping is:

- BullMQ `waiting` or `prioritized` -> `queued`
- BullMQ `delayed` -> `delayed`
- BullMQ `active` -> `active`
- BullMQ `completed` -> `completed`
- BullMQ `failed` -> `failed`

The job response includes `attempts`, `maxAttempts`, and `nextRetryAt` when the
job is delayed.

## Configuration

Agent:

```env
REDIS_URL=rediss://user:password@redis.example.com:6379
SHIRE_AGENT_SERVICE_TOKEN=replace-with-a-long-random-secret
SHIRE_JOB_QUEUE_NAME=shire-agent-jobs
SHIRE_JOB_ATTEMPTS=3
SHIRE_JOB_BACKOFF_MS=5000
SHIRE_CV_MAX_FILE_BYTES=5242880
```

Web:

```env
SHIRE_AGENT_INTERNAL_URL=http://localhost:3010
SHIRE_AGENT_SERVICE_TOKEN=replace-with-the-same-secret
PRIVY_APP_ID=
PRIVY_APP_SECRET=
```

The existing `SHIRE_AGENT_CHAT_URL` remains unchanged for chat.

## Dependencies

Agent runtime dependencies:

- `bullmq`
- `ioredis`
- `multer`
- `pdf-parse`
- `mammoth`

Agent development dependency:

- `@types/multer`

Web runtime dependency:

- `@privy-io/server-auth`

## Testing Strategy

Unit tests cover:

- PDF and DOCX signature validation.
- MIME and size rejection.
- PDF and DOCX extractor dispatch.
- Empty and oversized extracted text.
- Retryable versus permanent error classification.
- BullMQ state-to-envelope mapping.
- Queue options for attempts and exponential backoff.
- Service token authentication.
- Candidate ownership checks.

HTTP tests cover:

- Agent multipart upload enqueueing.
- Agent upload validation errors.
- Agent status polling.
- Web upload proxy identity enforcement.
- Web status proxy ownership forwarding.

BullMQ adapter tests use injected BullMQ-compatible fakes and do not require a
live Redis server. A separate opt-in integration test uses `REDIS_URL` to verify
real delayed retry and completion behavior.

The existing live LLM test remains opt-in. Full verification runs agent tests,
web route tests, both workspace typechecks, and both workspace builds.

## Operational Notes

Redis is external and must use TLS when required by the provider. Queue and
worker connections are closed during server shutdown. Completed and failed jobs
are retained so polling remains possible; production retention limits can be
added when expected volume is known.

Logs include job ID, candidate ID, attempt number, state transition, extractor
type, extracted character count, and retry classification. Logs never include
raw CV text, file bytes, service tokens, or Redis credentials.
