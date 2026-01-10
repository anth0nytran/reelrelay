# ATN Social Publisher — Full-Stack PRD (Modular 5-Platform MVP + Scheduling)

## 1. Product Summary
**ATN Social Publisher** is a self-serve SaaS that allows users (starting with real estate) to connect multiple social accounts, upload a video once with context, generate **platform-specific** AI captions that comply with each platform’s constraints (character limits, hashtag guidance, tone), select/edit per platform, and **publish immediately or schedule** simultaneous posting. Users can view what has posted, what is scheduled, and a **queue** of upcoming jobs.

## 2. Goals
- Self-serve onboarding: **Signup → Connect Accounts → Upload Video + Context → AI Captions per Platform → Select → Schedule/Publish → Status + Queue**
- Modular architecture so adding platforms is **connector + rules config** with minimal refactor.
- Support **5 platforms** in the product design from day one:
  1) Instagram  
  2) Facebook  
  3) LinkedIn  
  4) TikTok  
  5) YouTube (Shorts-friendly)

**MVP publish scope:** implement **Instagram + Facebook** publishing end-to-end; include connector scaffolding and UI wiring for the other 3 platforms (connect state, rules, caption generation, queue/status), so adding them next is straightforward.

## 3. Non-Goals (MVP)
- Team workspaces / roles (MVP: “workspace = user”)
- Advanced analytics dashboard (beyond posted/scheduled/failure)
- In-app video editing/transcoding (metadata only)

## 4. Target Users
- **Real estate agent:** wants consistent posting with minimal friction.
- **Real estate media team:** publishes listing reels; wants standardized captions + scheduled distribution.

## 5. Required User Flow
1) **Signup/Login**
2) **Connect accounts**
   - Show 5 platforms with “Connect” buttons and connection status.
3) **Create post**
   - Drag-and-drop upload video.
   - Provide context fields:
     - Video topic/summary
     - Target audience
     - Goal/CTA
     - Tone/style (luxury, informative, hype, cinematic, witty)
     - Location (optional)
     - Brand voice notes (optional)
4) **Generate captions**
   - LLM outputs multiple options **per platform** (e.g., 3–7 each).
   - Enforce platform rules (character/hashtags) and store outputs.
5) **Select + edit**
   - Each platform has its own tab.
   - User selects one caption per platform (and can edit).
6) **Schedule or publish**
   - User chooses:
     - **Publish now**, or
     - **Schedule for later** (date/time + timezone)
   - System creates a schedule record and queues jobs appropriately.
7) **Queue + status**
   - User can view:
     - **Scheduled queue** (upcoming posts with run time)
     - **In-progress** (publishing)
     - **Posted** (with external links)
     - **Failed** (with retry option and error detail)

## 6. Functional Requirements

### 6.1 Account Connection
- Support connecting/disconnecting each platform.
- Store tokens **server-side only** (never expose tokens to client).
- Track token expiry and required scopes.
- Show “ready to publish” eligibility checks per platform.

**MVP requirement:** Instagram + Facebook connections fully implemented.

### 6.2 Upload + Assets
- Direct browser upload to object storage (R2/S3-compatible) via presigned URL.
- Store asset metadata (mime, size, duration if available).
- Provide a **platform-fetchable** URL for publishing (MVP can use public bucket or long-lived signed URL; document constraints).

### 6.3 Caption Generation (LLM)
- Input: `post_context` (topic, audience, CTA, tone, location, brand voice).
- Output: structured JSON with **platform-specific** arrays of options.
- Must apply platform rules:
  - character limit enforcement
  - hashtag count guidance
  - tone adjustments by platform
- Persist generated options and the user’s selected/final captions.

### 6.4 Scheduling (New Must-Have)
- User can schedule a post for a specific **date/time** and **timezone** (default to user timezone).
- User can:
  - view upcoming scheduled posts in a **Queue** tab
  - edit scheduled time before it runs (MVP: reschedule supported)
  - cancel a scheduled post (MVP: cancel supported)
- Scheduled posts must execute reliably:
  - If a worker is down, jobs should run once worker resumes (within reasonable delay).
  - Missed schedules should be executed immediately on recovery (with a “late” indicator).

**Implementation requirement (MVP):**
- Store schedule in DB and run a scheduler loop in the worker to enqueue due jobs (poll every 30–60 seconds).
- Alternatively, store BullMQ delayed jobs, but DB schedule + poller is required as the source-of-truth for UI queue.

### 6.5 Publishing + Status
- Publishing must be asynchronous via queue/worker (no synchronous publish in request/response).
- Create one job per platform.
- Persist per-platform post status and error details.
- Implement retries + idempotency to avoid duplicate posts.
- Persist publish timestamps:
  - `scheduled_for`
  - `started_at`
  - `published_at`

**MVP requirement:** implement IG + FB publish workflows end-to-end.

### 6.6 Platform Modularity (Must-Have)
- Each platform is implemented as a **connector** that conforms to a shared interface.
- Platform “rules” live in JSON configs, not hard-coded.
- UI renders platform tabs dynamically from a platform registry.
- Adding a platform should not require changes to the core composer/publish flow.

## 7. Non-Functional Requirements
- **Security**
  - Encrypt tokens at rest with a server-only key.
  - Never expose tokens to frontend.
  - Enforce tenant isolation (RLS or server-side authorization).
- **Reliability**
  - Queue-based publishing.
  - Clear retry policy and timeouts.
  - Scheduling execution guaranteed via DB schedule source-of-truth + worker poller.
- **Observability**
  - Job logs with correlation IDs.
  - Persist last error and attempt count.
- **Performance**
  - Upload and caption generation should not block worker throughput.

## 8. System Architecture (MVP)
- **Frontend:** Next.js 14 App Router + Tailwind
- **Backend:** Next.js Route Handlers (API) + Supabase Postgres
- **Storage:** Cloudflare R2 (S3-compatible)
- **Queue:** BullMQ + Redis (Upstash or local)
- **Worker:** Node/TS worker process (separate from Next.js web)
  - Includes:
    - BullMQ processors for publish jobs
    - A scheduler poller that finds due scheduled posts and enqueues jobs
- **LLM:** OpenAI API

## 9. Connector Architecture (Critical)
### 9.1 Platform Registry
A single registry drives:
- Connect buttons and statuses
- Caption tabs
- Publishing job creation
- Rules selection

Registry entries include:
- `id`, `displayName`
- `rulesConfigPath`
- `capabilities` (supportsVideo, supportsHashtags, requiresOAuth, etc.)
- `connector` reference

### 9.2 Connector Interface (Contract)
All platforms must implement:
- `getCapabilities()`
- `getRules()`
- `validateAsset(assetMeta): ValidationResult`
- OAuth methods (if applicable):
  - `getAuthUrl(state)`
  - `handleCallback(code, state)`
- Publish methods:
  - `publishVideo({assetUrl, caption, options}): PublishResult`
  - `getPublishStatus(externalId): StatusResult` (optional for polling)

### 9.3 MVP Connectors
- Fully implement: **Instagram, Facebook**
- Scaffold (typed stubs + rules + UI status): **LinkedIn, TikTok, YouTube**

## 10. Rules Engine (Platform Constraints)
Store JSON per platform in `/rules/*.json`, for example:
- `maxCaptionChars`
- `recommendedHashtagCount`
- `maxHashtags` (optional hard cap)
- `toneGuidance`
- `ctaPatterns`
- `disallowedPatterns` (optional)
- `videoConstraints` (optional)

Caption generation must:
- read rules for each platform
- produce options compliant with those rules
- hard-trim or regenerate if over limit

## 11. Data Model (Supabase/Postgres)

### 11.1 Tables
- `connected_accounts`
  - `id`, `user_id`, `platform`
  - `external_account_id` (page_id / ig_user_id / etc.)
  - `token_encrypted`, `token_expires_at`, `scopes`
  - `metadata` (jsonb)

- `assets`
  - `id`, `user_id`, `r2_key`, `public_url`
  - `mime`, `size_bytes`, `duration_seconds`, `width`, `height`

- `posts`
  - `id`, `user_id`, `asset_id`
  - `context` (jsonb)
  - `status` (draft|scheduled|queued|publishing|published|failed|canceled)
  - `scheduled_for` (timestamptz, nullable)
  - `timezone` (text, default user tz)
  - `created_at`, `updated_at`

- `caption_sets`
  - `id`, `post_id`, `generated_by_model`, `raw_output` (jsonb)

- `platform_posts`
  - `id`, `post_id`, `platform`
  - `caption_selected`, `caption_final`
  - `status` (scheduled|queued|publishing|published|failed|canceled)
  - `external_post_id`, `external_url`
  - `attempts`, `last_error`
  - `scheduled_for` (timestamptz, nullable)
  - `started_at` (timestamptz, nullable)
  - `published_at` (timestamptz, nullable)

- `oauth_states`
  - `id`, `user_id`, `platform`, `state`, `expires_at`

- `job_events` (optional)
  - `id`, `platform_post_id`, `event_type`, `payload`, `created_at`

### 11.2 Notes on Scheduling Data
- `posts.scheduled_for` is the canonical schedule time for the overall post.
- `platform_posts.scheduled_for` is copied from `posts.scheduled_for` at schedule time (allows per-platform overrides later if desired; MVP can keep them identical).

## 12. API Endpoints (MVP)

### 12.1 Connections
- `GET /api/connect/:platform/start`
- `GET /api/connect/:platform/callback`
- `GET /api/connect/list`
- `POST /api/connect/:platform/disconnect`

### 12.2 Assets
- `POST /api/assets/presign`
- `POST /api/assets/complete`

### 12.3 Posts (Draft + Captions + Scheduling + Publishing)
- `POST /api/posts/createDraft`
- `POST /api/posts/:id/generateCaptions`
- `POST /api/posts/:id/selectCaptions`
- `POST /api/posts/:id/schedule` (sets scheduled_for + timezone; sets status=scheduled)
- `POST /api/posts/:id/cancel` (sets status=canceled; cancels platform_posts and any enqueued jobs where feasible)
- `POST /api/posts/:id/publishNow` (sets scheduled_for=null; enqueues immediately)
- `GET /api/posts` (filters: all/scheduled/queued/published/failed)
- `GET /api/posts/:id`

### 12.4 Queue (Optional convenience API)
- `GET /api/queue` (returns scheduled + queued platform_posts grouped by scheduled_for)

## 13. UI Requirements
- `/login`
- `/app/connections`
  - All 5 platforms with connect cards
  - “Ready to publish” indicators
- `/app/posts`
  - Tabs/filters: **Queue (Scheduled)**, In Progress, Posted, Failed
- `/app/posts/new`
  - Wizard:
    1) Upload
    2) Context
    3) Captions per platform (tabs)
    4) Schedule/Publish (datetime picker + timezone)
- `/app/posts/[id]`
  - Post details + per-platform status + errors + external URLs
  - Actions: reschedule (if scheduled), cancel, retry failed platforms

## 14. Definition of Done (MVP Acceptance Criteria)

### A) End-to-End Journey
- User can sign up/log in.
- User can connect Meta:
  - Facebook Page selection + Instagram account detection/selection.
- User can upload video via drag/drop and create an `assets` record.
- User can generate captions and see separate options per platform.
- User can select/edit captions per platform.
- User can **publish now** or **schedule** a future time.
- User can view **Queue** (scheduled posts) and posted history.

### B) Scheduling + Queue
- Scheduling persists correctly (timezone-aware) and appears in Queue.
- Worker reliably picks up due scheduled posts and enqueues publish jobs.
- Users can reschedule or cancel before execution.
- Executed scheduled jobs transition statuses correctly:
  - scheduled → queued → publishing → published/failed

### C) Publishing
- Instagram and Facebook publish succeed for eligible accounts and valid media.
- Publishing is queued; worker updates DB status reliably.
- Idempotency prevents double-posting on retries.

### D) Modularity
- Platform registry drives UI (tabs, connect buttons, statuses).
- Rules configs exist for all 5 platforms.
- Connector interface exists and compiles for all 5 platforms.
- Adding a new platform requires:
  - 1 new rules JSON
  - 1 connector implementation
  - 1 registry entry
  - no changes to composer/scheduling/publish flow

### E) Security
- Tokens encrypted at rest.
- No tokens exposed to client.
- Tenant isolation enforced (RLS or server-side authorization).

### F) Quality / Delivery
- Type-safe (TypeScript) + Zod validation on all inputs.
- README includes setup steps (Supabase, Redis, R2, Meta app config).
- Lint/typecheck passes; include basic smoke checks or minimal tests where feasible.
