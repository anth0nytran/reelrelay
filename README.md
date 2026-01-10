# ATN Social Publisher

A self-serve SaaS web app for scheduling and publishing videos across multiple social platforms with AI-generated captions.

## Features

- **Multi-Platform Publishing**: Instagram, Facebook (fully implemented), LinkedIn, TikTok, YouTube (scaffolded)
- **AI Caption Generation**: Platform-specific captions using OpenAI with rule enforcement
- **Scheduling**: Schedule posts for future times with timezone support
- **Queue Management**: View, reschedule, and cancel scheduled posts
- **Modular Architecture**: Easy to add new platforms via registry + connector + rules

## Tech Stack

- **Frontend**: Next.js 14 App Router, TypeScript, Tailwind CSS
- **Auth & Database**: Supabase (Auth + Postgres)
- **Storage**: Cloudflare R2 (S3-compatible)
- **Queue**: BullMQ + Redis
- **Worker**: Separate Node.js process for publishing and scheduling
- **AI**: OpenAI API for caption generation

## Prerequisites

- Node.js 18+
- pnpm
- Supabase project (local or cloud)
- Redis (local or Upstash)
- Cloudflare R2 bucket
- Meta Developer App (for Instagram/Facebook)
- OpenAI API key

## Setup

### 1. Clone and Install

```bash
git clone <repo>
cd atn-social-publisher
pnpm install
```

### 2. Environment Variables

Copy `env.example` to `.env.local`:

```bash
cp env.example .env.local
```

Fill in all required values:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Redis
REDIS_URL=redis://localhost:6379

# Cloudflare R2
R2_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=your-access-key
R2_SECRET_ACCESS_KEY=your-secret-key
R2_BUCKET=atn-social-publisher
R2_PUBLIC_BASE_URL=https://your-public-bucket-domain.com

# Meta App
META_APP_ID=your-meta-app-id
META_APP_SECRET=your-meta-app-secret
META_REDIRECT_URI=http://localhost:3000/api/connect/facebook/callback

# OpenAI
OPENAI_API_KEY=sk-...

# Token Encryption (generate with: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")
TOKEN_ENCRYPTION_KEY=your-32-byte-base64-key

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Database Setup

Run the Supabase migrations:

```bash
# If using Supabase CLI with local development
supabase db push

# Or apply manually in Supabase Dashboard SQL Editor:
# 1. Run supabase/migrations/001_initial_schema.sql
# 2. Run supabase/migrations/002_rls_policies.sql
```

### 4. Meta App Configuration

1. Go to [Meta for Developers](https://developers.facebook.com/)
2. Create a new app (type: Business)
3. Add products: Facebook Login, Instagram Graph API
4. Configure OAuth:
   - Valid OAuth Redirect URIs: `http://localhost:3000/api/connect/facebook/callback`
   - Deauthorize Callback URL: (optional)
5. Request permissions:
   - `pages_show_list`
   - `pages_read_engagement`
   - `pages_manage_posts`
   - `pages_read_user_content`
   - `instagram_basic`
   - `instagram_content_publish`
   - `business_management`
6. Add test users in App Roles > Roles

**Important Notes:**
- Instagram publishing requires a **Professional account** (Business or Creator) linked to a Facebook Page
- For production, you need to complete App Review and submit for verification
- In development mode, only test users can use the app

### 5. R2 Bucket Configuration

1. Create an R2 bucket in Cloudflare
2. Enable public access or configure a custom domain
3. Create API credentials with read/write access
4. The `R2_PUBLIC_BASE_URL` must be accessible by Meta's servers for video fetching

**Security Note:** MVP uses a public bucket for simplicity. For production, consider:
- Signed URLs with expiration
- Custom domain with access controls
- CDN with authentication

## Running Locally

### Start Redis

```bash
# Using Docker
docker run -d -p 6379:6379 redis:alpine

# Or install locally
redis-server
```

### Start the Web App

```bash
pnpm dev
```

### Start the Worker (in a separate terminal)

```bash
pnpm worker
```

The app will be available at http://localhost:3000

## Architecture

### Scheduling System

The scheduling system uses the database as the **source of truth**:

1. When a user schedules a post:
   - `posts.status` is set to `scheduled`
   - `posts.scheduled_for` is set to the scheduled time
   - `platform_posts` are created with `status=scheduled`

2. The worker runs a **scheduler poller** every 30 seconds:
   - Queries for due scheduled posts (`scheduled_for <= NOW()`)
   - Uses `FOR UPDATE SKIP LOCKED` to prevent race conditions
   - Atomically marks posts as `queued` and enqueues BullMQ jobs

3. If a scheduled post is missed (worker downtime):
   - On recovery, the poller picks it up immediately
   - Posts are marked as "late" in job events for auditing

4. Users can:
   - View scheduled posts in the Queue page
   - Reschedule posts before execution
   - Cancel scheduled posts

### Platform Modularity

Adding a new platform requires:

1. Create `rules/newplatform.json` with platform constraints
2. Create `connectors/newplatform.ts` implementing the `Connector` interface
3. Add entry to `lib/platform/registry.ts`
4. (Optional) Add processor to `worker/processors/`

No changes needed to:
- Post creation/scheduling flow
- Caption generation (automatically includes new platform)
- UI (renders from registry)

### Token Security

- Tokens are encrypted at rest using libsodium secretbox
- `TOKEN_ENCRYPTION_KEY` is a 32-byte key, base64 encoded
- Tokens are never sent to the client
- Connected accounts are accessed via sanitized API responses

## API Routes

### Connections
- `GET /api/connect/:platform/start` - Start OAuth flow
- `GET /api/connect/:platform/callback` - OAuth callback
- `GET /api/connect/list` - List connected accounts (sanitized)
- `POST /api/connect/:platform/disconnect` - Disconnect account
- `POST /api/connect/facebook/selectPrimary` - Set primary FB page
- `POST /api/connect/instagram/selectPrimary` - Set primary IG account

### Assets
- `POST /api/assets/presign` - Get presigned upload URL
- `POST /api/assets/complete` - Complete upload

### Posts
- `POST /api/posts/createDraft` - Create draft post
- `POST /api/posts/:id/generateCaptions` - Generate AI captions
- `POST /api/posts/:id/selectCaptions` - Save caption selections
- `POST /api/posts/:id/schedule` - Schedule post
- `POST /api/posts/:id/reschedule` - Reschedule post
- `POST /api/posts/:id/cancel` - Cancel post
- `POST /api/posts/:id/publishNow` - Publish immediately
- `POST /api/posts/:id/retry` - Retry failed platforms
- `GET /api/posts` - List posts (with status filter)
- `GET /api/posts/:id` - Get post details
- `GET /api/queue` - Get scheduled/queued posts

## What's Implemented vs Scaffolded

### Fully Implemented (MVP)
- ✅ Instagram publishing (Reels via container flow)
- ✅ Facebook Page video publishing
- ✅ Meta OAuth with page/IG account discovery
- ✅ Video upload to R2
- ✅ AI caption generation with OpenAI
- ✅ Platform rules enforcement
- ✅ Scheduling with DB source-of-truth
- ✅ Queue UI with reschedule/cancel
- ✅ Worker with scheduler poller
- ✅ Token encryption at rest
- ✅ Idempotent publishing

### Scaffolded (Ready to Implement)
- ⏳ LinkedIn publishing (connector stub, rules, registry entry)
- ⏳ TikTok publishing (connector stub, rules, registry entry)
- ⏳ YouTube publishing (connector stub, rules, registry entry)

To implement a scaffolded platform:
1. Update the connector in `connectors/` with real OAuth and publish logic
2. Add the processor in `worker/processors/`
3. Update `lib/platform/registry.ts` to set `implemented: true`

## Development

```bash
# Type check
pnpm typecheck

# Lint
pnpm lint

# Run both web and worker
pnpm dev & pnpm worker
```

## Production Deployment

1. Deploy Next.js app (Vercel, Railway, etc.)
2. Deploy worker as a long-running process (Railway, Render, EC2, etc.)
3. Use managed Redis (Upstash recommended)
4. Use Supabase cloud
5. Configure production environment variables
6. Complete Meta App Review for production access

## License

MIT

