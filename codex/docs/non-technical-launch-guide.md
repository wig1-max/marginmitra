# MarginMitra Launch Guide (No Coding Background, Android-First)

This is a hands-on checklist for a non-technical founder.

If you follow this top-to-bottom, you will get:
1) backend API live on the internet
2) Android app build (`.aab`)
3) Play Console internal testing release

---

## 0) Current strategy (recommended)

- Launch Android first.
- Keep iOS for later after India validation.

---

## 1) What is already done (from your status)

You confirmed:
- Firebase setup is done.
- Play Console account + app creation is done.

Great — now only 2 hard parts remain:
- **Step 3:** deploy production API
- **Step 4:** create/upload Android release build

---

## 2) One-time software on your laptop

Install once:

1. Node.js 22 LTS
2. pnpm (`npm i -g pnpm`)
3. EAS CLI (`npm i -g eas-cli`)
4. Git

Quick check commands:

```bash
node -v
pnpm -v
eas --version
git --version
```

---

## 3) Deploy API to Railway (simplest beginner path)

> Why Railway: easiest UI + env var management + quick deploy.

### 3.1 Create Railway project

1. Go to https://railway.app
2. Sign in with GitHub.
3. Click **New Project** → **Deploy from GitHub Repo**.
4. Select this repo.
5. Set **Root Directory** to `/codex/apps/api` (this is what Railway UI usually allows in this repo).
6. In Build settings, use:
   - Install: `npm install`
   - Build: `npx tsc -p ../../packages/shared/tsconfig.json && npm run build`
   - Start: `npm run start`

(These commands avoid pnpm/workspace issues in Railway.)

### 3.2 Add required API variables in Railway

In Railway project → Variables, add:

- `PORT=4000`
- `APP_JWT_SECRET=<generate long random string>`
- `ALLOW_REVIEWER_BYPASS=false`
- `FIREBASE_SERVICE_ACCOUNT_JSON=<paste full firebase service account JSON in one line>`

Generate `APP_JWT_SECRET` locally:

```bash
openssl rand -base64 48
```

### 3.3 Redeploy and copy public API URL

1. Click Deploy / Redeploy.
2. Wait until deployment is green.
3. Copy service public URL (example `https://marginmitra-api-production.up.railway.app`).
4. Final API base URL you will use in mobile:

`https://<your-railway-domain>/api`

### 3.4 Verify backend is alive

Open this in browser:

`https://<your-railway-domain>/api`

Even if it returns 404/"Cannot GET", it proves server is reachable.

---

## 4) Build Android app bundle (`.aab`) with EAS

This repo now includes EAS build config at `apps/mobile/eas.json`.

### 4.1 Put Firebase Android file in correct place

Take your Firebase `google-services.json` and place it here:

`codex/apps/mobile/google-services.json`

(Do not rename.)

### 4.2 Set mobile env to production API

Create local file:

`codex/apps/mobile/.env`

Add:

```env
EXPO_PUBLIC_API_BASE_URL=https://<your-railway-domain>/api
```

### 4.3 Login and configure EAS (first time)

From `codex/apps/mobile` run:

```bash
eas login
eas build:configure
```

When asked about Android keystore, choose:
- **Let EAS manage credentials** (recommended)

### 4.4 Trigger production Android build

From `codex/apps/mobile` run:

```bash
eas build -p android --profile production
```

This uploads code and starts cloud build.

### 4.5 Download AAB

When build finishes:
1. open EAS build URL shown in terminal
2. download `.aab`

---

## 5) Upload AAB to Play Console internal testing

1. Play Console → your app
2. Left menu: **Testing** → **Internal testing**
3. Create new release
4. Upload `.aab`
5. Add release notes (short)
6. Save → Review → Start rollout to internal testing
7. Add tester emails in internal testers list

Done: testers can install and test real flow.

---

## 6) Hard safety checks before public launch

- [ ] `ALLOW_REVIEWER_BYPASS=false` in production API env
- [ ] App uses production API URL (https)
- [ ] Firebase test phone numbers are not used as real auth policy
- [ ] No secret files committed (`google-services.json`, service account JSON)
- [ ] Internal testers completed at least 1 full upload and review flow

---

## 7) Exact copy-paste command block (most important)

After placing `google-services.json` and creating `.env`:

```bash
cd codex/apps/mobile
eas login
eas build:configure
eas build -p android --profile production
```

---

## 8) If anything fails, send me these 3 things

1. Full terminal error text
2. Screenshot of failing step
3. Which step number failed from this doc

I will debug it line-by-line with you.
