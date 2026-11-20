# Integrations — what each API actually gives you
API details change often; **verify against current docs before building**. This reflects what is generally available for a creator/business's *own* accounts.

| Metric | TikTok | Instagram | Facebook Page | YouTube Shorts |
|---|---|---|---|---|
| Views | ✔ per video (Display API) | ✔ (`views`; older `impressions`/`plays` deprecated) | ✔ page/video views | ✔ Analytics API |
| Likes / comments | ✔ | ✔ | ✔ reactions/comments | ✔ |
| Shares | ✔ per video | ✔ | ✔ | ✔ (Analytics) |
| Saves | ✘ | ✔ | ✘ | ✘ |
| Followers gained | Total followers only → diff daily snapshots | ✔ follows/unfollows (account insights) | followers → diff snapshots | ✔ subscribersGained |
| Watch time | ✘ public API (Business API limited) | ✔ Reels watch time | ✔ video view time | ✔ estimatedMinutesWatched |
| Reach | ✘ | ✔ | ✔ | ✘ (views is the closest) |
| Best posting times | ✘ | ✔ `online_followers` | ✔ page fans online (limited) | ✘ — derive from your own post times vs views |
| History | Only what you snapshot | Many account insights ≈30 days lookback | Limited | Long (Analytics) |
| Access | App review, scopes `user.info.stats`, `video.list` | Meta App Review; `instagram_manage_insights`; Business/Creator account linked to a Page | Meta App Review; `pages_read_engagement`, `read_insights` | Google OAuth verification; `yt-analytics.readonly` |

**Key consequences**
1. **Snapshot daily.** Several platforms only expose short look-backs or totals. A nightly job stores per-day/per-post metrics so growth and history are yours.
2. **Some demo metrics won't be exact everywhere** (e.g. TikTok saves/watch time/reach). The portal should hide or label metrics a platform can't supply (`n/a`).
3. **Fastest route: an aggregator** such as Windsor.ai (TikTok Organic, Instagram, Facebook Pages, YouTube connectors, API/BigQuery export). It avoids running four app reviews, at a monthly cost. You can later replace it per-platform. Check their current field list/pricing.
4. Clients connect accounts via OAuth buttons (already in the UI at Admin → Client → Social accounts); tokens are stored server-side only.

## Audience & view-tracking depth (added to the demo)
| Feature in the app | What a real API gives | Notes |
|---|---|---|
| Age / gender / country / city | Instagram (Business, ≥100 followers), Facebook Page insights, YouTube Analytics | TikTok: only via Business/Studio data — not the public Display API |
| Traffic sources ("where views come from") | YouTube traffic sources; Instagram & Facebook views by source; TikTok in Studio only | Demo groups them into 6 buckets |
| Retention / avg watch % | YouTube (audience retention report), Instagram Reels avg watch time, Facebook video avg time watched | TikTok: not via public API |
| First-24h velocity | Snapshot each post every few hours and store history | Needs the Phase 2 `post_snapshots` job |
| Follower growth | Daily follower totals — snapshot them | Several platforms give totals only |
| Live pulse | No platform offers true real-time. Best case is near-real-time (polling every few minutes) | Demo pulse is simulated |
| Link clicks | Your own redirect + UTM tags (first-party) | Real unique-visitor tracking needs consent (POPIA/GDPR) |

**Privacy:** no platform reveals who individual viewers are; only aggregates. Do not promise client names of viewers. The only person-level tracking possible is on your own website/links, with consent.
