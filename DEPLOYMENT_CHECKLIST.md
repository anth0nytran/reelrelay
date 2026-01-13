# Production Deployment Checklist

## Pre-Deployment Steps

### 1. Environment Variables (Required)

Configure all of these in your Vercel project settings:

#### Supabase
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

#### Cloudflare R2 (Video Storage)
```
R2_ACCOUNT_ID=your-account-id
R2_ACCESS_KEY_ID=your-access-key
R2_SECRET_ACCESS_KEY=your-secret-key
R2_BUCKET_NAME=atn-social-assets
R2_PUBLIC_URL=https://your-public-bucket-domain.com
```

**Important:** Configure CORS on your R2 bucket to allow your production domain.

#### Meta (Facebook/Instagram)
```
META_APP_ID=your-meta-app-id
META_APP_SECRET=your-meta-app-secret
```

**Important:** Add your production callback URLs in Meta Developer Console:
- `https://your-domain.com/api/connect/instagram/callback`
- `https://your-domain.com/api/connect/facebook/callback`

#### TikTok (Optional)
```
TIKTOK_CLIENT_KEY=your-tiktok-client-key
TIKTOK_CLIENT_SECRET=your-tiktok-client-secret
```

#### OpenAI (Caption Generation)
```
OPENAI_API_KEY=sk-...
USE_MOCK_CAPTIONS=false
```

#### Security
```
TOKEN_ENCRYPTION_KEY=your-32-byte-base64-key
```
Generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`

#### Stripe (Billing)
```
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID_MONTHLY=price_...
STRIPE_PRICE_ID_YEARLY=price_...
```

#### Application URL
```
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

### 2. Database Migrations

Run all migrations against your production Supabase:
```bash
supabase db push
```

Or apply migrations manually from `supabase/migrations/` folder.

### 3. Vercel Project Settings

1. **Framework Preset:** Next.js
2. **Build Command:** `npm run build` (default)
3. **Output Directory:** `.next` (default)
4. **Node.js Version:** 18.x or higher

### 4. Cron Jobs

Vercel automatically configures cron jobs from `vercel.json`:
- Scheduler runs every 5 minutes to process scheduled posts

If using external cron (e.g., cron-job.org):
- Set `SCHEDULER_SECRET` in Vercel env vars
- Configure cron to call: `GET https://your-domain.com/api/scheduler/run`
- Add header: `Authorization: Bearer your-scheduler-secret`

### 5. OAuth Callback URLs

Update callback URLs for each platform:

#### Meta (Facebook/Instagram)
1. Go to https://developers.facebook.com
2. Select your app
3. Go to Facebook Login > Settings
4. Add to Valid OAuth Redirect URIs:
   - `https://your-domain.com/api/connect/instagram/callback`
   - `https://your-domain.com/api/connect/facebook/callback`

#### TikTok
1. Go to https://developers.tiktok.com
2. Select your app
3. Update Redirect URI to:
   - `https://your-domain.com/api/connect/tiktok/callback`

### 6. Stripe Webhook

1. Go to https://dashboard.stripe.com/webhooks
2. Add endpoint: `https://your-domain.com/api/stripe/webhook`
3. Select events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Copy the webhook secret to `STRIPE_WEBHOOK_SECRET`

### 7. Cloudflare R2 CORS

Configure CORS in R2 bucket settings:
```json
[
  {
    "AllowedOrigins": ["https://your-domain.com"],
    "AllowedMethods": ["GET", "PUT", "HEAD"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3600
  }
]
```

## Post-Deployment Verification

1. **Authentication:** Test login/signup flow
2. **Social Connections:** Connect a test account for each platform
3. **Video Upload:** Upload a test video
4. **Caption Generation:** Generate captions for the video
5. **Publishing:** Publish to a test account
6. **Scheduling:** Schedule a post and verify it publishes
7. **Billing:** Test checkout flow with Stripe test card

## Monitoring

- Check Vercel logs for any runtime errors
- Monitor Supabase logs for database issues
- Set up alerts for failed cron jobs

## Rollback Plan

If issues occur:
1. Revert to previous deployment in Vercel dashboard
2. Check for database migration conflicts
3. Verify environment variables are correct
