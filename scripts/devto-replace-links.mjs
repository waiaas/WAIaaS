#!/usr/bin/env node

/**
 * Dev.to Article Link Replacement Script
 *
 * Replaces GitHub repo links in Dev.to article bodies after the repo
 * transfer from minhoyoo-iotrust/WAIaaS to waiaas/WAIaaS. The site
 * (site/build.mjs) renders these articles at build time, so the old
 * links can only be fixed in the Dev.to posts themselves.
 *
 * Safety:
 * - Dry run by default: reports matching articles without updating.
 * - Writes original bodies of matching articles to a backup JSON file
 *   before any update (uploaded as a CI artifact by the workflow).
 * - Re-fetches each updated article to verify zero remaining matches.
 *
 * Usage:
 *   node scripts/devto-replace-links.mjs                        # dry run (public API, no key needed)
 *   DEVTO_API_KEY=... DRY_RUN=false node scripts/devto-replace-links.mjs
 */

import fs from 'node:fs';

const SEARCH = process.env.SEARCH || 'minhoyoo-iotrust/WAIaaS';
const REPLACE = process.env.REPLACE || 'waiaas/WAIaaS';
const IS_DRY_RUN = process.env.DRY_RUN !== 'false';
const API_KEY = process.env.DEVTO_API_KEY;
const DEVTO_USERNAME = 'walletguy';
const API_BASE = 'https://dev.to/api';
const BACKUP_PATH = 'devto-link-update-backup.json';
const PAGE_SIZE = 100;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function request(path, options = {}, attempt = 1) {
  const headers = { ...(options.headers || {}) };
  if (API_KEY) headers['api-key'] = API_KEY;
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (res.status === 429 && attempt <= 5) {
    const waitSec = Number(res.headers.get('retry-after')) || 30;
    console.log(`  Rate limited (429), retrying in ${waitSec}s...`);
    await sleep(waitSec * 1000);
    return request(path, options, attempt + 1);
  }
  if (!res.ok) {
    throw new Error(`${options.method || 'GET'} ${path} -> ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

/**
 * List all published articles. Uses the authenticated /articles/me
 * endpoint when a key is available (bypasses CDN cache, same as
 * site/build.mjs), otherwise falls back to the public listing.
 */
async function listArticles() {
  const all = [];
  for (let page = 1; ; page++) {
    const path = API_KEY
      ? `/articles/me?per_page=${PAGE_SIZE}&page=${page}&state=published`
      : `/articles?username=${DEVTO_USERNAME}&per_page=${PAGE_SIZE}&page=${page}`;
    const batch = await request(path);
    all.push(...batch);
    if (batch.length < PAGE_SIZE) break;
    await sleep(300);
  }
  return all;
}

async function main() {
  console.log(`Mode: ${IS_DRY_RUN ? 'DRY RUN' : 'LIVE UPDATE'} (${API_KEY ? 'authenticated' : 'public API'})`);
  console.log(`Replace: "${SEARCH}" -> "${REPLACE}"\n`);

  if (!IS_DRY_RUN && !API_KEY) {
    console.error('ERROR: DEVTO_API_KEY is required for live update.');
    process.exit(1);
  }

  const articles = await listArticles();
  console.log(`Listed ${articles.length} published articles\n`);

  // Scan bodies for matches (individual fetch returns body_markdown)
  const matched = [];
  for (const article of articles) {
    const full = await request(`/articles/${article.id}`);
    await sleep(300);
    const body = full.body_markdown || '';
    const count = body.split(SEARCH).length - 1;

    // Warn-only for fields this script does not touch
    for (const field of ['title', 'description', 'canonical_url']) {
      if ((full[field] || '').includes(SEARCH)) {
        console.log(`  WARN: "${SEARCH}" also found in ${field} of: ${full.title}`);
      }
    }

    if (count === 0) continue;
    matched.push({
      id: full.id,
      title: full.title,
      url: full.url,
      occurrences: count,
      original_body_markdown: body,
    });
    console.log(`  [${String(count).padStart(2)}x] ${full.title}`);
  }

  console.log(`\nMatched ${matched.length} of ${articles.length} articles (${matched.reduce((sum, m) => sum + m.occurrences, 0)} occurrences)`);

  if (matched.length === 0) {
    console.log('Nothing to update.');
    return;
  }

  fs.writeFileSync(BACKUP_PATH, JSON.stringify(matched, null, 2));
  console.log(`Backup written: ${BACKUP_PATH}`);

  if (IS_DRY_RUN) {
    console.log('\nDry run complete. Re-run with DRY_RUN=false to apply.');
    return;
  }

  console.log('\nUpdating articles...');
  const failed = [];
  for (const m of matched) {
    const newBody = m.original_body_markdown.replaceAll(SEARCH, REPLACE);
    try {
      await request(`/articles/${m.id}`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ article: { body_markdown: newBody } }),
      });
      console.log(`  updated: ${m.title}`);
    } catch (err) {
      failed.push(m);
      console.error(`  FAILED: ${m.title} - ${err.message}`);
    }
    await sleep(1000);
  }

  // Verify: re-fetch updated articles and confirm zero remaining matches
  console.log('\nVerifying...');
  let remaining = 0;
  for (const m of matched) {
    if (failed.includes(m)) continue;
    const full = await request(`/articles/${m.id}`);
    await sleep(300);
    const count = (full.body_markdown || '').split(SEARCH).length - 1;
    if (count > 0) {
      remaining += count;
      console.error(`  STILL PRESENT (${count}x): ${m.title}`);
    }
  }

  console.log(`\nDone: ${matched.length - failed.length} updated, ${failed.length} failed, ${remaining} occurrences remaining`);
  if (failed.length > 0 || remaining > 0) process.exit(1);
}

main().catch((err) => {
  console.error(`FATAL: ${err.message}`);
  process.exit(1);
});
