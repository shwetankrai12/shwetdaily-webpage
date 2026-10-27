# shwetdaily-webpage

This is a personal portfolio and build journal for **Shwetank Rai** ([@shwetdaily](https://instagram.com/shwetdaily)).

---

## 3D Activity City & Automated Data Pipeline

The links section features a 3D isometric "activity city" rendered with Three.js (orthographic projection, instanced meshes per layer) representing the last 365 days of activity:
- **Green towers**: GitHub commits (`shwetankrai12`) — weight 1
- **Amber towers**: LeetCode problem submissions (`shwetankrai12`) — weight 2
- **Pink towers**: Instagram posts and reels (`@shwetdaily`) — weight 6
- **Crown/Beacon**: Pulsing pink beacon on today's building if an Instagram post was shared today (IST), or a faint dim ground marker if not.

### Data Architecture
The frontend exclusively reads static `data/activity.json` (and `public/data/activity.json`) cache-busted with the `updated` timestamp. No external tokens or live third-party APIs are ever queried on the client.

The GitHub Actions workflow (`.github/workflows/update-activity.yml`) runs hourly and on manual trigger (`workflow_dispatch`), executing `scripts/fetch-activity.mjs` to keep the city data synchronized.

---

## Instagram Graph API Setup Guide

To automate fetching Instagram posts into `data/activity.json`, configure the `IG_ACCESS_TOKEN` secret in your GitHub repository:

### Step 1: Convert Instagram Account to Professional (Creator or Business)
1. Open the Instagram app on your mobile device.
2. Go to your profile `Settings and privacy` -> `Account type and tools`.
3. Tap **Switch to professional account** and choose **Creator** (or **Business**).
4. Connect your Instagram account to a Facebook Page (create a basic Page if you do not have one yet).

### Step 2: Create a Meta Developer App
1. Go to the [Meta for Developers Portal](https://developers.facebook.com/).
2. Click **My Apps** -> **Create App**.
3. Select **Other** as the use case -> Next -> choose **Business** or **Consumer**.
4. Give your app a name (e.g. `Shwetdaily Activity City`) and click **Create App**.

### Step 3: Add Instagram Graph API
1. In your App Dashboard, find **Instagram Graph API** (or **Instagram Basic Display**) and click **Set Up**.
2. Under the Left Menu, expand **Tools** -> **Graph API Explorer**.
3. In Graph API Explorer:
   - Select your Meta App.
   - For Permissions, add: `instagram_basic`, `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`.
   - Click **Generate Access Token**.
   - Log in with your Facebook account and select your connected Instagram Business/Creator account.

### Step 4: Exchange for a Long-Lived Token (60-day token)
1. Make a GET request in Graph API Explorer (or your terminal) to exchange the short-lived token:
   ```bash
   GET https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id={YOUR_APP_ID}&client_secret={YOUR_APP_SECRET}&fb_exchange_token={SHORT_LIVED_TOKEN}
   ```
2. Or use the Instagram Graph API long-lived user token endpoint:
   ```bash
   GET https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret={YOUR_APP_SECRET}&access_token={SHORT_LIVED_TOKEN}
   ```
3. Copy the resulting long-lived `access_token`.
   *(Note: `scripts/fetch-activity.mjs` automatically calls `https://graph.instagram.com/refresh_access_token` when the token is older than ~45 days so it will continuously stay fresh without manual intervention!)*

### Step 5: Add `IG_ACCESS_TOKEN` in GitHub Secrets
1. In your GitHub repository, open **Settings** -> **Secrets and variables** -> **Actions**.
2. Click **New repository secret**.
3. Set the Name to:
   ```
   IG_ACCESS_TOKEN
   ```
4. Paste your long-lived token into the Secret value and click **Add secret**.

### Step 6: Manual Fallback Mode (No Meta App Required)
If you prefer not to set up a Meta developer token, the system seamlessly uses manual dates:
- Simply add your post dates in `data/instagram-manual.json`:
  ```json
  {
    "dates": [
      "2026-10-28",
      "2026-10-27",
      "2026-10-25"
    ]
  }
  ```
- Run `node scripts/fetch-activity.mjs` to rebuild the activity data anytime.

---

## Local Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the site with the 3D Activity City!
