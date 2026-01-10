# 🚀 Production Deployment Guide

## ⚠️ **IMPORTANT: You Need 2 Deployments**

This app has **two separate processes**:

1. **Web App** (Next.js) → ✅ **Vercel** (perfect fit)
2. **Worker Process** (background jobs) → ❌ **Vercel CANNOT run this** (needs separate hosting)

---

## ✅ **What Works on Vercel**

Vercel will handle:
- ✅ Next.js web application (all pages, API routes)
- ✅ User authentication (Supabase)
- ✅ File uploads (R2 presigned URLs)
- ✅ Caption generation (OpenAI API calls)
- ✅ OAuth connections (Meta/Facebook/Instagram)
- ✅ Creating drafts, scheduling posts
- ✅ Viewing posts, queue, connections

**Vercel Limitations:**
- ❌ Cannot run long-running processes (worker)
- ❌ Serverless functions timeout after 10-60 seconds (depending on plan)
- ❌ No persistent background tasks

---

## ❌ **What DOESN'T Work on Vercel**

The **worker process** (`pnpm worker`) needs to run separately because it:
- Runs a continuous scheduler loop (checks for due posts every 30 seconds)
- Processes BullMQ jobs for publishing
- Must stay alive 24/7

**Without the worker:**
- ❌ Scheduled posts won't execute automatically
- ❌ "Publish Now" will queue jobs but nothing will publish
- ❌ Queue status won't update
- ✅ Users can still create posts and schedule them (they just won't execute)

---

## 🎯 **Production Architecture**

```
┌─────────────────┐         ┌─────────────────┐
│   Vercel        │         │   Worker Host   │
│   (Next.js App) │         │   (Railway/etc) │
│                 │         │                 │
│  - UI/Pages     │         │  - Scheduler    │
│  - API Routes   │         │  - Job Processor│
│  - Auth         │         │  - Publishing   │
└────────┬────────┘         └────────┬────────┘
         │                           │
         └───────────┬───────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
  ┌─────▼──────┐          ┌──────▼──────┐
  │  Supabase  │          │    Redis    │
  │  (Database)│          │   (Queue)   │
  └────────────┘          └─────────────┘
```

---

## 📋 **Step 1: Deploy Web App to Vercel**

### Setup Instructions

1. **Connect Repository**
   - Push code to GitHub/GitLab/Bitbucket
   - Go to https://vercel.com
   - Import your repository

2. **Configure Build Settings**
   - Framework Preset: **Next.js**
   - Build Command: `pnpm build` (or `npm run build`)
   - Output Directory: `.next`
   - Install Command: `pnpm install`

3. **Add Environment Variables**
   In Vercel Dashboard → Project → Settings → Environment Variables, add:

   ```env
   # Supabase (REQUIRED)
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

   # Redis (REQUIRED - use Upstash)
   REDIS_URL=rediss://default:password@upstash-redis.com:6379

   # Cloudflare R2 (REQUIRED)
   R2_ACCOUNT_ID=your-account-id
   R2_ACCESS_KEY_ID=your-access-key
   R2_SECRET_ACCESS_KEY=your-secret-key
   R2_BUCKET_NAME=atn-social-assets
   R2_PUBLIC_URL=https://your-bucket.your-account-id.r2.cloudflarestorage.com

   # OpenAI (REQUIRED)
   OPENAI_API_KEY=sk-...

   # Meta App (REQUIRED for Instagram/Facebook)
   META_APP_ID=your-meta-app-id
   META_APP_SECRET=your-meta-app-secret

   # Token Encryption (REQUIRED)
   TOKEN_ENCRYPTION_KEY=your-generated-base64-key

   # App URL (REQUIRED - your Vercel domain)
   NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
   ```

4. **Update Meta App OAuth Redirect**
   - Go to Meta Developer Console
   - Update OAuth Redirect URI to: `https://your-app.vercel.app/api/connect/facebook/callback`
   - Add this for both development and production

5. **Deploy**
   - Click "Deploy"
   - Vercel will automatically deploy on every git push

---

## ⚙️ **Step 2: Deploy Worker Separately**

You need a service that runs **long-running processes**. Options:

### Option A: Railway (Recommended - Easy Setup)

1. **Create Account**
   - Go to https://railway.app
   - Sign up with GitHub

2. **Create New Project**
   - Click "New Project"
   - Select "Deploy from GitHub repo" or "Empty Project"

3. **Setup Worker Service**
   - Add a new service
   - Connect your GitHub repo
   - **Root Directory**: `/`
   - **Build Command**: `pnpm install`
   - **Start Command**: `pnpm worker:prod`

4. **Add Environment Variables**
   - Same as Vercel, plus:
   ```env
   NODE_ENV=production
   ```

5. **Configure Resource**
   - Set to "Always On" (prevent sleeping)
   - Minimum 512MB RAM recommended

**Cost**: ~$5-10/month for always-on service

---

### Option B: Render

1. **Create Web Service**
   - Go to https://render.com
   - Create new "Background Worker"

2. **Configure**
   - Connect GitHub repo
   - **Build Command**: `pnpm install`
   - **Start Command**: `pnpm worker:prod`
   - **Plan**: Free tier available (may sleep after inactivity)

3. **Add Environment Variables** (same as above)

**Cost**: Free tier available, paid plans for always-on

---

### Option C: Fly.io

1. **Install Fly CLI**
   ```bash
   curl -L https://fly.io/install.sh | sh
   ```

2. **Create Fly.toml for Worker**
   ```toml
   app = "atn-social-worker"
   primary_region = "iad"

   [build]

   [env]
   NODE_ENV = "production"

   [[services]]
     internal_port = 3001
     protocol = "tcp"
   ```

3. **Deploy**
   ```bash
   fly launch --no-deploy
   fly secrets set REDIS_URL=... (all env vars)
   fly deploy
   ```

**Cost**: Pay-as-you-go, ~$2-5/month for small apps

---

### Option D: DigitalOcean App Platform

1. **Create Worker Component**
   - Go to DigitalOcean → App Platform
   - Add "Worker" component
   - Set start command: `pnpm worker:prod`

2. **Configure** (similar to Railway)

**Cost**: ~$5/month minimum

---

### Option E: AWS EC2 / Lightsail (Advanced)

1. **Launch Instance**
   - Use Node.js AMI or Ubuntu with Node.js installed

2. **Setup**
   ```bash
   git clone your-repo
   cd smma_auto
   pnpm install
   ```

3. **Run with PM2** (process manager)
   ```bash
   npm install -g pm2
   pm2 start "pnpm worker:prod" --name worker
   pm2 save
   pm2 startup
   ```

**Cost**: ~$3.50/month (Lightsail) to $10+/month (EC2)

---

## 🔗 **Step 3: Setup Redis (Shared)**

Both Vercel and Worker need access to the same Redis instance.

### Use Upstash (Recommended)

1. **Create Database**
   - Go to https://upstash.com
   - Create Redis database
   - Choose region close to your services

2. **Get Connection String**
   - Copy the REST URL or Redis URL
   - Format: `rediss://default:password@host:6379`

3. **Add to Both**
   - Add `REDIS_URL` to Vercel environment variables
   - Add `REDIS_URL` to Worker environment variables

**Cost**: Free tier available, ~$0.20/100K commands

---

## ✅ **What Happens If You Only Deploy to Vercel?**

The app will **partially work**:

✅ **Works:**
- User can sign up/login
- Can upload videos
- Can generate captions
- Can connect accounts
- Can create and schedule posts
- Can view queue (will show scheduled items)

❌ **Doesn't Work:**
- Scheduled posts won't execute
- "Publish Now" won't actually publish
- Jobs will stay in "queued" status forever
- No background processing

**User Experience**: Users can create content but nothing will publish automatically.

---

## 🎯 **Recommended Production Setup**

### Minimal Cost (~$10-15/month)
- **Web App**: Vercel (Free tier or Pro $20/month)
- **Worker**: Railway (~$5/month)
- **Redis**: Upstash (Free tier)
- **Database**: Supabase (Free tier)
- **Storage**: Cloudflare R2 (Free tier: 10GB)
- **AI**: OpenAI (pay-per-use)

### Production Checklist

- [ ] Web app deployed to Vercel
- [ ] All environment variables set in Vercel
- [ ] Worker deployed to Railway/Render/Fly.io
- [ ] Same environment variables set in Worker
- [ ] Upstash Redis created and connected to both
- [ ] Meta App OAuth redirect updated to production URL
- [ ] R2 bucket configured with public access
- [ ] Supabase production database configured
- [ ] Domain configured (optional, Vercel provides free domain)
- [ ] SSL/HTTPS enabled (automatic on Vercel)

---

## 🔧 **Testing Production Deployment**

1. **Test Web App**
   - Visit your Vercel URL
   - Create account
   - Upload video
   - Generate captions
   - Schedule a post

2. **Check Worker**
   - View worker logs in Railway/Render dashboard
   - Should see scheduler polling messages
   - Check for errors

3. **Test Publishing**
   - Schedule a post for 1-2 minutes in future
   - Watch worker logs
   - Verify post status changes to "published"

---

## 🐛 **Common Production Issues**

### Worker Not Running
- Check worker logs for errors
- Verify all environment variables are set
- Ensure worker service is "always on" (not sleeping)

### Jobs Not Processing
- Verify Redis connection in both services
- Check Redis is accessible from worker
- Verify BullMQ is connecting correctly

### Scheduled Posts Not Executing
- Check worker is polling (view logs)
- Verify `scheduled_for` timestamps are correct
- Check database timezone settings

### OAuth Callbacks Failing
- Verify redirect URI matches exactly in Meta App
- Check `NEXT_PUBLIC_APP_URL` is set correctly
- Ensure HTTPS is used (not HTTP)

---

## 📊 **Monitoring**

### Vercel
- Built-in analytics and logs
- Monitor API route execution times
- Watch for function timeouts

### Worker
- Set up logging (Railway/Render provide logs)
- Monitor Redis connection
- Track job processing times
- Set up error alerts

### Recommended Tools
- **Sentry** - Error tracking
- **Logtail** - Log aggregation
- **Upstash Console** - Redis monitoring

---

## 🔐 **Security in Production**

1. **Environment Variables**
   - Never commit `.env.local` (already in `.gitignore`)
   - Use Vercel's environment variable dashboard
   - Rotate secrets regularly

2. **Database**
   - Use Supabase RLS policies (already in migrations)
   - Never expose service role key to client

3. **Tokens**
   - OAuth tokens encrypted at rest
   - Never logged or exposed in responses

4. **API Keys**
   - Restrict R2 bucket permissions
   - Use OpenAI API key restrictions
   - Enable Meta App security features

---

## 📝 **Summary**

✅ **Yes, Vercel works perfectly for the web app**
❌ **But you MUST deploy the worker separately**

**Quick Deploy:**
1. Deploy web app → Vercel (5 minutes)
2. Deploy worker → Railway (10 minutes)
3. Setup Redis → Upstash (5 minutes)
4. Configure env vars (10 minutes)

**Total setup time**: ~30 minutes

**Monthly cost**: ~$10-15 (depending on usage)

Need help with a specific deployment step? Let me know!

