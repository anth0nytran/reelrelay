# Cloudflare R2 Setup Instructions

## Step-by-Step Guide to Get R2 Credentials

### 1. Login & Navigate to R2
- Go to https://dash.cloudflare.com
- Select your account
- Click **R2** in the left sidebar

### 2. Get Your Account ID
- Look at the top right of the R2 dashboard
- Find your **Account ID** (format: `a1b2c3d4e5f6g7h8...`)
- Copy this value → This is `R2_ACCOUNT_ID`

### 3. Create a Bucket
- Click **Create bucket**
- Name it: `atn-social-assets` (or your preferred name)
- Click **Create bucket**
- Copy the bucket name → This is `R2_BUCKET_NAME`

### 4. Create API Token
- In R2 dashboard, click **Manage R2 API Tokens**
- Click **Create API token**
- **Token name**: `ATN Social Publisher` (or any name)
- **Permissions**: Select **Object Read & Write**
- **Buckets**: 
  - Select **Specific bucket**
  - Choose your bucket from the dropdown
- **TTL**: Leave blank (no expiration) or set a date
- Click **Create API Token**

### 5. Copy Your Credentials
You'll see two values (⚠️ **COPY IMMEDIATELY** - secret shown only once):
- **Access Key ID** → This is `R2_ACCESS_KEY_ID`
- **Secret Access Key** → This is `R2_SECRET_ACCESS_KEY`

### 6. (Optional) Setup Public URL
If you need public access to uploaded files:

**Option A: Use Default Public URL**
- Format: `https://[bucket-name].[account-id].r2.cloudflarestorage.com`
- Example: `https://atn-social-assets.a1b2c3d4e5f6.r2.cloudflarestorage.com`

**Option B: Custom Domain**
- Go to your bucket → **Settings** tab
- Scroll to **Public Access**
- Enable **Public bucket access**
- Add a custom domain (if you have one)
- Use your custom domain → This is `R2_PUBLIC_URL`

### 7. Add to `.env.local`

Create or update `.env.local` in your project root:

```env
# Cloudflare R2 (S3-compatible)
R2_ACCOUNT_ID=your-account-id-here
R2_ACCESS_KEY_ID=your-access-key-id-here
R2_SECRET_ACCESS_KEY=your-secret-access-key-here
R2_BUCKET_NAME=atn-social-assets
R2_PUBLIC_URL=https://your-bucket-name.your-account-id.r2.cloudflarestorage.com
```

### Troubleshooting

**Q: I can't see the Account ID**
- Look at the top right corner of the R2 dashboard
- It's displayed next to your account email/name

**Q: API token creation failed**
- Make sure you have R2 enabled (free tier includes 10GB storage)
- Check that you selected the correct bucket

**Q: Files aren't uploading**
- Verify all credentials are correct (no extra spaces)
- Check bucket name matches exactly
- Ensure API token has **Object Read & Write** permissions

**Q: Files aren't publicly accessible**
- Enable **Public bucket access** in bucket settings
- Make sure `R2_PUBLIC_URL` is set correctly
- For private files, the app uses presigned URLs automatically

### Security Best Practices

1. **Never commit** `.env.local` to git (it's in `.gitignore`)
2. **Rotate tokens** periodically
3. **Use specific bucket permissions** (not "All buckets")
4. **Set TTL** on tokens for production use

### Testing

After adding credentials, test upload:
1. Start dev server: `npm run dev`
2. Go to `/app/posts/new`
3. Upload a test video
4. Check your R2 bucket in Cloudflare dashboard to verify file appears

