# Security Audit Report

**Date:** January 2026  
**Project:** ReelRelay (ATN Social Publisher)  
**Auditor:** Automated Security Review

---

## Summary

| Category | Status | Notes |
|----------|--------|-------|
| Secrets Management | ✅ Pass | `.env` files properly gitignored |
| API Authentication | ✅ Pass | All routes check `getUser()` |
| Database Security (RLS) | ✅ Pass | Comprehensive RLS policies |
| Input Validation | ✅ Pass | Zod schemas on all endpoints |
| Dependency Vulnerabilities | ⚠️ Action Needed | 6 vulnerabilities found |
| Token Encryption | ⚠️ Action Needed | TODO in code - not yet implemented |
| XSS Protection | ✅ Pass | No `dangerouslySetInnerHTML` usage |
| CSRF Protection | ✅ Pass | Supabase handles via cookies |

---

## Critical Issues

### 1. Dependency Vulnerabilities (HIGH PRIORITY)

**Run this command to fix:**

```bash
npm audit fix --force
```

Or update these packages manually in `package.json`:

```json
{
  "next": "^14.2.35",
  "@supabase/ssr": "^0.8.0",
  "eslint-config-next": "^14.2.35"
}
```

**Vulnerabilities found:**
- `next@14.1.0` has 13 CVEs including SSRF, cache poisoning, and DoS vulnerabilities
- `@supabase/ssr` depends on vulnerable `cookie` package
- `glob` has command injection vulnerability (dev dependency)

---

### 2. Token Encryption Not Implemented (MEDIUM PRIORITY)

**File:** `app/api/connect/[platform]/callback/route.ts`

The OAuth tokens are stored in plain text:

```typescript
// Line 120 and 141
token_encrypted: page.access_token, // TODO: In production, encrypt this
```

**Required Action:** Implement token encryption before production.

Create `lib/encryption.ts`:

```typescript
import sodium from 'libsodium-wrappers';

let isReady = false;

async function ensureReady() {
  if (!isReady) {
    await sodium.ready;
    isReady = true;
  }
}

export async function encryptToken(token: string): Promise<string> {
  await ensureReady();
  
  const key = process.env.TOKEN_ENCRYPTION_KEY;
  if (!key) throw new Error('TOKEN_ENCRYPTION_KEY not configured');
  
  const keyBytes = sodium.from_base64(key);
  const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);
  const encrypted = sodium.crypto_secretbox_easy(
    sodium.from_string(token),
    nonce,
    keyBytes
  );
  
  // Combine nonce + ciphertext
  const combined = new Uint8Array(nonce.length + encrypted.length);
  combined.set(nonce);
  combined.set(encrypted, nonce.length);
  
  return sodium.to_base64(combined);
}

export async function decryptToken(encryptedData: string): Promise<string> {
  await ensureReady();
  
  const key = process.env.TOKEN_ENCRYPTION_KEY;
  if (!key) throw new Error('TOKEN_ENCRYPTION_KEY not configured');
  
  const keyBytes = sodium.from_base64(key);
  const combined = sodium.from_base64(encryptedData);
  
  const nonce = combined.slice(0, sodium.crypto_secretbox_NONCEBYTES);
  const ciphertext = combined.slice(sodium.crypto_secretbox_NONCEBYTES);
  
  const decrypted = sodium.crypto_secretbox_open_easy(ciphertext, nonce, keyBytes);
  return sodium.to_string(decrypted);
}
```

---

## Passed Checks

### 1. Secrets Management ✅

**`.gitignore` properly excludes:**
- `.env`, `.env.local`, `.env.*.local`
- `mcp.json`
- `*.secret`, `*.key`

**Verified:** No hardcoded API keys found in source code.

### 2. API Route Authentication ✅

All API routes properly authenticate:

```typescript
const { data: { user }, error: userError } = await supabase.auth.getUser();
if (userError || !user) {
  return jsonWithCookies(response, { error: 'Unauthorized' }, { status: 401 });
}
```

### 3. Row Level Security (RLS) ✅

All tables have RLS enabled:
- `connected_accounts` - Service role only (blocks direct client access)
- `oauth_states` - Service role only
- `assets`, `posts` - User can only access their own
- `caption_sets`, `platform_posts` - Access through post ownership
- `job_events` - Read-only through ownership chain

### 4. Input Validation ✅

All API endpoints use Zod schemas:
- `PresignSchema` for asset uploads
- `CreateDraftSchema` for post creation
- `GenerateCaptionsSchema` for caption generation

### 5. XSS Protection ✅

No usage of `dangerouslySetInnerHTML` found. React's default escaping is used.

### 6. Middleware Protection ✅

`/app/*` routes are protected and redirect to `/login` if not authenticated.

---

## Recommendations

### Before Production:

1. **Update dependencies** (critical):
   ```bash
   npm audit fix --force
   npm install next@latest @supabase/ssr@latest
   ```

2. **Implement token encryption** (see above)

3. **Generate encryption key**:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```
   Add result to `TOKEN_ENCRYPTION_KEY` in production env vars.

4. **Set secure cookie options** in Supabase dashboard:
   - Enable "Secure" flag
   - Set "SameSite" to "Lax" or "Strict"

5. **Enable Supabase Auth email confirmation** for production

6. **Add rate limiting** to API routes (consider using Vercel's rate limiting or a library like `@vercel/edge-rate-limit`)

### Environment Variables Checklist:

Make sure these are set in production (Vercel):

- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY` (keep secret!)
- [ ] `META_APP_ID`
- [ ] `META_APP_SECRET` (keep secret!)
- [ ] `OPENAI_API_KEY` (keep secret!)
- [ ] `TOKEN_ENCRYPTION_KEY` (keep secret!)
- [ ] `R2_ACCOUNT_ID`
- [ ] `R2_ACCESS_KEY_ID`
- [ ] `R2_SECRET_ACCESS_KEY` (keep secret!)
- [ ] `R2_BUCKET_NAME`
- [ ] `R2_PUBLIC_URL`
- [ ] `REDIS_URL` or `UPSTASH_REDIS_URL`
- [ ] `NEXT_PUBLIC_APP_URL` (set to production URL)

---

## Files to Never Commit

Ensure these are in `.gitignore` (verified ✅):

```
.env
.env.local
.env.*.local
mcp.json
*.secret
*.key
```

---

## Conclusion

The codebase has good security fundamentals. Before pushing to production:

1. **Run `npm audit fix --force`** to patch vulnerabilities
2. **Implement token encryption** for OAuth tokens
3. **Verify all environment variables** are set in production

The application follows best practices for:
- Authentication/Authorization
- Input validation
- Database access control (RLS)
- Secret management
