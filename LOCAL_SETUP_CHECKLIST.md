# 🚀 Local Testing Setup Checklist

Complete guide to get the app running locally for testing.

---

## ✅ **PREREQUISITES** (Must Have)

### 1. **Node.js & Package Manager**
- [ ] **Node.js 18+** installed
  - Check: `node --version` (should be 18.0.0 or higher)
  - Download: https://nodejs.org/

- [ ] **pnpm** installed
  - Install: `npm install -g pnpm`
  - Check: `pnpm --version`
  - ⚠️ Project uses `pnpm`, not `npm` (see `package.json`)

### 2. **Install Dependencies**
```bash
cd c:\Users\antho\Desktop\smma_auto
pnpm install
```

---

## 🗄️ **DATABASE SETUP** (Required)

### Option A: Supabase Cloud (Easiest for Testing)
1. [ ] **Create Supabase Project**
   - Go to https://supabase.com/dashboard
   - Click "New Project"
   - Note your project URL and keys

2. [ ] **Run Migrations**
   - Go to SQL Editor in Supabase Dashboard
   - Run `supabase/migrations/001_initial_schema.sql`
   - Run `supabase/migrations/002_rls_policies.sql`

3. [ ] **Get Credentials**
   - Settings → API
   - Copy:
     - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
     - `anon/public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`

### Option B: Supabase Local (Advanced)
```bash
# Install Supabase CLI
npm install -g supabase

# Start local Supabase
supabase start

# Apply migrations
supabase db push
```

---

## 🔴 **REDIS SETUP** (Required for Queue/Worker)

### Option A: Docker (Recommended)
```bash
# Start Redis in Docker
docker run -d --name redis -p 6379:6379 redis:alpine

# Verify it's running
docker ps
```

### Option B: Local Install
- **Windows**: Use WSL or install from https://redis.io/download
- **macOS**: `brew install redis` then `brew services start redis`
- **Linux**: `sudo apt install redis-server` then `sudo systemctl start redis`

### Option C: Upstash Cloud (No Local Setup)
1. Go to https://upstash.com/
2. Create Redis database
3. Copy the REST URL → Use as `REDIS_URL`

---

## 📦 **CLOUDFLARE R2 SETUP** (Required for Uploads)

1. [ ] **Create R2 Account**
   - Go to https://dash.cloudflare.com
   - Enable R2 (free tier: 10GB storage)

2. [ ] **Create Bucket**
   - Name: `atn-social-assets` (or your choice)
   - Note the bucket name

3. [ ] **Get Account ID**
   - Found in top-right of R2 dashboard
   - Copy → `R2_ACCOUNT_ID`

4. [ ] **Create API Token**
   - R2 → Manage R2 API Tokens → Create API Token
   - Permissions: Object Read & Write
   - Select your bucket
   - Copy:
     - Access Key ID → `R2_ACCESS_KEY_ID`
     - Secret Access Key → `R2_SECRET_ACCESS_KEY` ⚠️ (shown once only)

5. [ ] **Setup Public URL** (Optional but recommended)
   - Bucket → Settings → Public Access
   - Enable "Public bucket access"
   - Use format: `https://[bucket-name].[account-id].r2.cloudflarestorage.com`

See `CLOUDFLARE_R2_SETUP.md` for detailed instructions.

---

## 🤖 **OPENAI API KEY** (Required for Caption Generation)

1. [ ] **Get OpenAI API Key**
   - Go to https://platform.openai.com/api-keys
   - Create new secret key
   - Copy → `OPENAI_API_KEY`
   - ⚠️ Starts with `sk-`

2. [ ] **Add Credits** (if needed)
   - Ensure account has credits
   - GPT-4o-mini is used (cheaper than GPT-4)

**Note**: Without this, caption generation will use mock data (limited functionality).

---

## 📱 **META APP SETUP** (Required for Instagram/Facebook Publishing)

### For Basic Testing (OAuth Only)
1. [ ] **Create Meta App**
   - Go to https://developers.facebook.com/
   - My Apps → Create App → Type: **Business**
   - Note App ID and App Secret

2. [ ] **Add Products**
   - Add "Facebook Login"
   - Add "Instagram Graph API"

3. [ ] **Configure OAuth**
   - Facebook Login → Settings
   - Valid OAuth Redirect URIs:
     ```
     http://localhost:3000/api/connect/facebook/callback
     ```
   - Add test users (App Roles → Roles)

4. [ ] **Get Credentials**
   - Settings → Basic
   - App ID → `META_APP_ID`
   - App Secret → `META_APP_SECRET` (click "Show")

**Note**: For actual publishing, you need:
- Instagram Business/Creator account
- Linked to a Facebook Page
- App Review completed (for production)

---

## 🔐 **TOKEN ENCRYPTION KEY** (Required)

1. [ ] **Generate Encryption Key**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

2. [ ] **Copy the output** → `TOKEN_ENCRYPTION_KEY`

This encrypts OAuth tokens at rest in the database.

---

## 📝 **ENVIRONMENT VARIABLES** (Create `.env.local`)

1. [ ] **Create `.env.local` file** in project root:
```bash
# Copy from example
cp env.example .env.local
```

2. [ ] **Fill in all values:**

```env
# ✅ REQUIRED - Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# ✅ REQUIRED - Redis
REDIS_URL=redis://localhost:6379
# OR use Upstash:
# REDIS_URL=rediss://default:password@upstash-redis.com:6379

# ✅ REQUIRED - Cloudflare R2
R2_ACCOUNT_ID=your-account-id
R2_ACCESS_KEY_ID=your-access-key
R2_SECRET_ACCESS_KEY=your-secret-key
R2_BUCKET_NAME=atn-social-assets
R2_PUBLIC_URL=https://your-bucket.your-account-id.r2.cloudflarestorage.com

# ✅ REQUIRED - OpenAI
OPENAI_API_KEY=sk-...

# ✅ REQUIRED - Token Encryption
TOKEN_ENCRYPTION_KEY=your-generated-base64-key-here

# ✅ REQUIRED - App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# ⚠️ REQUIRED for Instagram/Facebook - Meta
META_APP_ID=your-meta-app-id
META_APP_SECRET=your-meta-app-secret
```

---

## 🚀 **START THE APPLICATION**

### Terminal 1: Web App
```bash
pnpm dev
```
- App runs at: http://localhost:3000

### Terminal 2: Worker (Required for Publishing)
```bash
pnpm worker
```
- Handles scheduled posts and publishing jobs

---

## 🧪 **TESTING CHECKLIST**

### 1. **Basic App Access**
- [ ] Open http://localhost:3000
- [ ] Landing page loads
- [ ] Can navigate to `/login`
- [ ] Can create account / sign in

### 2. **Core Functionality** (Requires All Services)
- [ ] Upload video (needs R2)
- [ ] Generate captions (needs OpenAI)
- [ ] Connect Instagram/Facebook (needs Meta App)
- [ ] Schedule post (needs Redis + Worker running)
- [ ] View queue (needs Redis)

### 3. **Minimal Testing** (Some Features May Not Work)
You can test the UI without all services, but:
- ❌ **No upload** without R2
- ❌ **No captions** without OpenAI (uses mock)
- ❌ **No connections** without Meta App
- ❌ **No scheduling** without Redis/Worker

---

## 🐛 **TROUBLESHOOTING**

### "Module not found" errors
```bash
# Reinstall dependencies
rm -rf node_modules
pnpm install
```

### "Supabase connection failed"
- Check `.env.local` has correct URL and keys
- Verify Supabase project is active
- Check migrations were applied

### "Redis connection failed"
- Check Redis is running: `docker ps` or `redis-cli ping`
- Verify `REDIS_URL` in `.env.local`
- Default: `redis://localhost:6379`

### "R2 upload failed"
- Verify all R2 credentials in `.env.local`
- Check bucket name matches exactly
- Ensure bucket allows public access (or use signed URLs)

### "Caption generation failed"
- Check OpenAI API key is valid
- Ensure account has credits
- App will fallback to mock captions if key missing

### "OAuth redirect error"
- Verify `META_APP_ID` and `META_APP_SECRET` are correct
- Check redirect URI matches exactly: `http://localhost:3000/api/connect/facebook/callback`
- Ensure test user is added to Meta App

### Port 3000 already in use
```bash
# Kill process on port 3000 (Windows)
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Or use different port
PORT=3001 pnpm dev
```

---

## 📋 **QUICK START SUMMARY**

```bash
# 1. Install dependencies
pnpm install

# 2. Create .env.local (fill all values)
cp env.example .env.local
# Edit .env.local with your credentials

# 3. Start Redis (if using Docker)
docker run -d --name redis -p 6379:6379 redis:alpine

# 4. Run migrations in Supabase Dashboard SQL Editor
# - Run 001_initial_schema.sql
# - Run 002_rls_policies.sql

# 5. Start app (Terminal 1)
pnpm dev

# 6. Start worker (Terminal 2)
pnpm worker

# 7. Open browser
# http://localhost:3000
```

---

## 🎯 **MINIMUM VIABLE TEST**

To test the UI without all integrations:

**Required:**
- ✅ Supabase (for auth & database)
- ✅ Redis (for queue)
- ✅ `.env.local` file (even with placeholder values)

**Optional (App will work with limitations):**
- ⚠️ R2 → Uploads will fail, but UI works
- ⚠️ OpenAI → Mock captions will be used
- ⚠️ Meta App → Can't connect accounts, but connection page loads

---

## 📚 **Additional Resources**

- **Supabase Docs**: https://supabase.com/docs
- **Cloudflare R2 Docs**: https://developers.cloudflare.com/r2/
- **Meta Developer Docs**: https://developers.facebook.com/docs/
- **OpenAI Docs**: https://platform.openai.com/docs

---

## ✅ **FINAL CHECKLIST**

Before testing, ensure:

- [ ] Node.js 18+ installed
- [ ] pnpm installed
- [ ] Dependencies installed (`pnpm install`)
- [ ] `.env.local` created with all values
- [ ] Supabase project created and migrations run
- [ ] Redis running (local or Upstash)
- [ ] All credentials collected:
  - [ ] Supabase URL & keys
  - [ ] R2 credentials
  - [ ] OpenAI API key
  - [ ] Meta App ID & Secret
  - [ ] Token encryption key generated
- [ ] Web app started (`pnpm dev`)
- [ ] Worker started (`pnpm worker`)

**Ready to test!** 🎉

