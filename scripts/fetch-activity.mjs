#!/usr/bin/env node

/**
 * scripts/fetch-activity.mjs
 * Fetches 365 days of activity for GitHub, LeetCode, and Instagram in Asia/Kolkata timezone.
 * Resilient: each source fails independently, preserving previous data.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");

// CONFIG
const CONFIG = {
  githubUser: "shwetankrai12",
  leetcodeUser: "shwetankrai12",
  timeZone: "Asia/Kolkata",
  daysCount: 365,
};

// Paths
const ACTIVITY_PATH = path.join(ROOT_DIR, "data", "activity.json");
const PUBLIC_ACTIVITY_PATH = path.join(ROOT_DIR, "public", "data", "activity.json");
const MANUAL_IG_PATH = path.join(ROOT_DIR, "data", "instagram-manual.json");
const TOKEN_META_PATH = path.join(ROOT_DIR, "data", ".ig_token_meta.json");

/**
 * Returns YYYY-MM-DD string for a given Date in Asia/Kolkata
 */
function getISTDateString(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: CONFIG.timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/**
 * Converts Unix timestamp (seconds) to YYYY-MM-DD in Asia/Kolkata
 */
function unixSecToISTDate(timestampSec) {
  return getISTDateString(new Date(Number(timestampSec) * 1000));
}

/**
 * Converts ISO 8601 string to YYYY-MM-DD in Asia/Kolkata
 */
function isoToISTDate(isoString) {
  return getISTDateString(new Date(isoString));
}

/**
 * Builds list of last 365 days (YYYY-MM-DD) ending today in IST
 */
function getLast365Days() {
  const days = [];
  const now = new Date();
  for (let i = CONFIG.daysCount - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    days.push(getISTDateString(d));
  }
  return [...new Set(days)].slice(-CONFIG.daysCount);
}

/**
 * Load existing activity.json if present
 */
function loadExistingActivity() {
  try {
    if (fs.existsSync(ACTIVITY_PATH)) {
      const raw = fs.readFileSync(ACTIVITY_PATH, "utf-8");
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn("[WARN] Could not parse existing activity.json, starting fresh:", err.message);
  }
  return { updated: null, days: {} };
}

/**
 * Fetch GitHub contributions
 */
async function fetchGitHub() {
  console.log(`[1/3] Fetching GitHub contributions for ${CONFIG.githubUser}...`);
  const url = `https://github-contributions-api.jogruber.de/v4/${CONFIG.githubUser}?y=last`;
  const res = await fetch(url, { headers: { "User-Agent": "shwetdaily-activity-sync/1.0" } });
  if (!res.ok) throw new Error(`GitHub API HTTP ${res.status}: ${res.statusText}`);
  const json = await res.json();

  const ghMap = {};
  if (Array.isArray(json.contributions)) {
    for (const item of json.contributions) {
      if (item && item.date) {
        ghMap[item.date] = item.count || 0;
      }
    }
  }
  return ghMap;
}

/**
 * Fetch LeetCode submissions calendar
 */
async function fetchLeetCode() {
  console.log(`[2/3] Fetching LeetCode submissions for ${CONFIG.leetcodeUser}...`);
  const lcMap = {};
  const currentYear = new Date().getFullYear();
  const years = [currentYear, currentYear - 1];

  const query = `query matchedUser($username: String!, $year: Int) {
    matchedUser(username: $username) {
      userCalendar(year: $year) {
        submissionCalendar
      }
    }
  }`;

  for (const year of years) {
    try {
      const res = await fetch("https://leetcode.com/graphql", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
        body: JSON.stringify({
          query,
          variables: { username: CONFIG.leetcodeUser, year },
        }),
      });

      if (!res.ok) {
        console.warn(`[WARN] LeetCode GraphQL HTTP ${res.status} for year ${year}`);
        continue;
      }

      const json = await res.json();
      const calendarStr = json?.data?.matchedUser?.userCalendar?.submissionCalendar;
      if (calendarStr) {
        const parsed = JSON.parse(calendarStr);
        for (const [timestampSec, count] of Object.entries(parsed)) {
          const istDate = unixSecToISTDate(timestampSec);
          lcMap[istDate] = (lcMap[istDate] || 0) + Number(count || 0);
        }
      }
    } catch (err) {
      console.warn(`[WARN] Failed to fetch LeetCode for year ${year}:`, err.message);
    }
  }

  return lcMap;
}

/**
 * Check and refresh Instagram access token if needed (~45 days)
 */
async function maybeRefreshToken(token) {
  let tokenAgeDays = 0;
  let meta = {};
  try {
    if (fs.existsSync(TOKEN_META_PATH)) {
      meta = JSON.parse(fs.readFileSync(TOKEN_META_PATH, "utf-8"));
      if (meta.lastRefreshed) {
        const ageMs = Date.now() - new Date(meta.lastRefreshed).getTime();
        tokenAgeDays = ageMs / (1000 * 60 * 60 * 24);
      }
    }
  } catch (e) {
    // ignore
  }

  // Refresh if older than 45 days or unrecorded
  if (tokenAgeDays > 45) {
    console.log(`[Instagram] Token is ~${Math.round(tokenAgeDays)} days old. Attempting refresh...`);
    try {
      const refreshUrl = `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${token}`;
      const res = await fetch(refreshUrl);
      if (res.ok) {
        const data = await res.json();
        console.log("[Instagram] Token refreshed successfully! Expires in:", data.expires_in, "seconds");
        fs.writeFileSync(
          TOKEN_META_PATH,
          JSON.stringify({ lastRefreshed: new Date().toISOString() }, null, 2)
        );
      } else {
        const errText = await res.text();
        console.warn(`[WARNING: INSTAGRAM TOKEN REFRESH FAILED] HTTP ${res.status}: ${errText}`);
      }
    } catch (err) {
      console.warn(`[WARNING: INSTAGRAM TOKEN REFRESH FAILED] Network error: ${err.message}`);
    }
  }
}

/**
 * Fetch Instagram posts
 */
async function fetchInstagram() {
  console.log("[3/3] Checking Instagram posts...");
  const igMap = {};
  const token = process.env.IG_ACCESS_TOKEN?.trim();

  if (token) {
    try {
      await maybeRefreshToken(token);

      const cutoffMs = Date.now() - 365 * 24 * 60 * 60 * 1000;
      let nextUrl = `https://graph.instagram.com/me/media?fields=id,timestamp,media_type&limit=100&access_token=${token}`;
      let pageCount = 0;

      while (nextUrl && pageCount < 10) {
        pageCount++;
        const res = await fetch(nextUrl);
        if (!res.ok) {
          const body = await res.text();
          throw new Error(`Graph API HTTP ${res.status}: ${body}`);
        }
        const json = await res.json();
        const mediaList = json.data || [];

        let hitCutoff = false;
        for (const item of mediaList) {
          if (!item.timestamp) continue;
          const itemTime = new Date(item.timestamp).getTime();
          if (itemTime < cutoffMs) {
            hitCutoff = true;
            break;
          }
          const istDate = isoToISTDate(item.timestamp);
          igMap[istDate] = (igMap[istDate] || 0) + 1;
        }

        if (hitCutoff || !json.paging?.next) break;
        nextUrl = json.paging.next;
      }

      console.log(`[Instagram] Fetched ${Object.keys(igMap).length} active post dates from Graph API.`);
      return igMap;
    } catch (err) {
      console.warn("[WARN] Instagram Graph API fetch failed, falling back to manual dates:", err.message);
    }
  } else {
    console.log("[Instagram] No IG_ACCESS_TOKEN provided. Reading data/instagram-manual.json...");
  }

  // Fallback to manual file
  try {
    if (fs.existsSync(MANUAL_IG_PATH)) {
      const manual = JSON.parse(fs.readFileSync(MANUAL_IG_PATH, "utf-8"));
      if (Array.isArray(manual.dates)) {
        for (const d of manual.dates) {
          if (typeof d === "string") {
            igMap[d] = (igMap[d] || 0) + 1;
          }
        }
      }
      console.log(`[Instagram] Loaded ${Object.keys(igMap).length} post dates from manual fallback.`);
    }
  } catch (err) {
    console.warn("[WARN] Could not read manual Instagram dates:", err.message);
  }

  return igMap;
}

/**
 * Main execution
 */
async function main() {
  const existing = loadExistingActivity();
  const existingDays = existing.days || {};

  // Fetch each source independently
  let ghData = null;
  let lcData = null;
  let igData = null;

  try {
    ghData = await fetchGitHub();
  } catch (err) {
    console.error("[ERROR] GitHub fetch failed:", err.message);
  }

  try {
    lcData = await fetchLeetCode();
  } catch (err) {
    console.error("[ERROR] LeetCode fetch failed:", err.message);
  }

  try {
    igData = await fetchInstagram();
  } catch (err) {
    console.error("[ERROR] Instagram fetch failed:", err.message);
  }

  const all365Days = getLast365Days();
  const mergedDays = {};

  let totalGH = 0;
  let totalLC = 0;
  let totalIG = 0;

  for (const date of all365Days) {
    const prev = existingDays[date] || {};

    const gh = ghData !== null ? (ghData[date] ?? 0) : (prev.gh ?? 0);
    const lc = lcData !== null ? (lcData[date] ?? 0) : (prev.lc ?? 0);
    const ig = igData !== null ? (igData[date] ?? 0) : (prev.ig ?? 0);

    totalGH += gh;
    totalLC += lc;
    totalIG += ig;

    mergedDays[date] = { gh, lc, ig };
  }

  const output = {
    updated: new Date().toISOString(),
    days: mergedDays,
  };

  // Ensure directories exist
  fs.mkdirSync(path.dirname(ACTIVITY_PATH), { recursive: true });
  fs.mkdirSync(path.dirname(PUBLIC_ACTIVITY_PATH), { recursive: true });

  const jsonStr = JSON.stringify(output, null, 2);
  fs.writeFileSync(ACTIVITY_PATH, jsonStr, "utf-8");
  fs.writeFileSync(PUBLIC_ACTIVITY_PATH, jsonStr, "utf-8");

  console.log(`\n=== Activity Sync Summary ===`);
  console.log(`Days processed: ${all365Days.length} (${all365Days[0]} to ${all365Days[all365Days.length - 1]})`);
  console.log(`GitHub commits: ${totalGH}`);
  console.log(`LeetCode submissions: ${totalLC}`);
  console.log(`Instagram posts: ${totalIG}`);
  console.log(`Written to: ${ACTIVITY_PATH} and ${PUBLIC_ACTIVITY_PATH}`);
}

main().catch((err) => {
  console.error("Fatal error during activity sync:", err);
  process.exit(1);
});
