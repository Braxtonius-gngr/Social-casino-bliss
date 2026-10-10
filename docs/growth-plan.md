# Growth and revenue plan

Written 2026-10-10. Organic first, 8-12 channels, automated where the
channel allows it. Paid ads wait until the numbers below say which channel
turns visitors into players.

## Where things stand

Last 30 days:

| Measure | Number | Source |
|---|---|---|
| Unique visitors | 3,430 | Cloudflare (crawlers and bots included) |
| People who opened the app | 92 | `app_events`, `app_open` |
| Tracked a platform / started a Daily Run | 14 / 11 | `app_events` |
| Turned on push / started checkout | 2 / 2 | `app_events` |
| Active Pro subscriptions | 1 | `user_subscriptions` |
| Platform links followed | 1,570 (1,315 through house referral links) | `link_hits` |
| Visits with a `?src=` tag | 2 (1 share, 1 seo-hub); 92 direct | `app_events` |
| Platforms with a house referral link | 79 of 138 | `platform_links` |

Traffic grew from zero around Sep 22 to roughly 200-500 visitors a day, but
few of those visitors open the app, and the tagged channels bring almost no
one yet. Some link follows are probably your own daily runs. The gap isn't
how many sites you post on. It's three things: getting visitors to open the
app, having referral links on the platforms people actually click, and
giving people a reason to pay for Pro.

## Revenue, in order of payoff

1. **Referral links at the top of the list.** These 11 S and A tier
   platforms have no house link, so their clicks earn nothing:
   - S tier: Zula, Sportzino, Dogg House, Sheesh Casino
   - A tier: MyPrize, Funz Casino, LuckyLand Casino, Moozi, Hush Casino,
     WOW Vegas, Yay Casino

   They're the platforms the tier list and the weekly posts point to. Join
   each one's referral or affiliate program, then put the link in that
   platform's `url` in `data/catalog.json`. Merging to `main` publishes it,
   and the database spots that it's a referral link. Do the B tier next:
   Shuffle, Spin Pals, Cashoomo, Global Poker, Modo.
2. **Pro subscriptions** ($4.99/month, $49.90/year). Checkout is ready
   ([STRIPE_INTEGRATION_TODO.md](STRIPE_INTEGRATION_TODO.md)), but Pro
   mostly sells to people who share lists. A Pro member's own referral link
   is used when friends open platforms from their shared list. Pitch it to
   the people who run sweeps Discords and groups: "Share your list, your
   link gets used." Test what else Pro should include before changing the
   price (roadmap DR-04).
3. **Not on the table:** ranking platforms for money, or promising earnings.
   The tier list is only worth anything because it can't be bought
   (roadmap, *Residual limitations*).

## Channels

| # | Channel | How | Automated | `?src=` |
|---|---|---|---|---|
| 1 | Google and Bing search | The 138 platform pages and tier list are already built and in the sitemap. Submit `https://dailyrollover.com/platforms/sitemap.xml` in Google Search Console and Bing Webmaster Tools. | Already (build:seo) | `seo`, `seo-hub` |
| 2 | Reddit | The weekly tier-list post. Pick 2-3 sweeps subreddits, read each one's self-promotion rule, and answer questions there between posts. | No, on purpose: subreddits remove automated self-promotion | `reddit` |
| 3 | Discord | Your own server's announcements channel, plus helping out in the big sweeps servers | Yes (Postiz) | `discord` |
| 4 | X | Short weekly post: the biggest tier moves and one link | Yes | `x` |
| 5 | Bluesky | Same as X | Yes | `bluesky` |
| 6 | Threads | Same as X | Yes | `threads` |
| 7 | Facebook | A Page gets the long post. Groups stay manual, since Meta doesn't let apps post to them | Page yes, groups no | `facebook` |
| 8 | Telegram | A channel for the long post | Yes | `telegram` |
| 9 | Mastodon | Optional; small audience | Yes | `mastodon` |
| 10 | TikTok / YouTube Shorts / Instagram Reels | 20-30 second screen recordings: "this site went A to S this week", or one Daily Run timed start to finish. Videos need filming, so they're next. | Later (Postiz can upload once a clip exists) | `tiktok`, `youtube`, `instagram` |

Each channel's link carries its own `?src=`, so the "Where new users come
from" query in [analytics-queries.sql](analytics-queries.sql) shows which
channels bring players, not just clicks.

## Automation (built)

Every Monday the **Weekly social posts** workflow:

1. reads the week's tier changes from the catalogue's git history;
2. writes one post per channel, within each channel's character limit;
3. sends them to Postiz as drafts you approve from the Postiz app (or
   publishes them automatically once `SOCIAL_AUTOPUBLISH` is `true`);
4. puts the Reddit and Discord versions in the run's summary to paste by
   hand.

Setup: README, *Weekly social posts*. Postiz can be self-hosted for free
or used as a paid hosted service; check postiz.com for current plans.

## Keeping the accounts alive

- Each post carries "18+" and, in the long ones, "not available in every
  state". A growing number of states restrict sweepstakes casinos.
- Posts link to dailyrollover.com, never straight to a casino. When a post
  ever does link to a referral link, say so ("referral link").
- No earnings language. "Days of free dailies to cash-out" is a measurement,
  not a promise.
- Write each channel's post for that channel (the script does this). Don't
  paste the same text into many Reddit or Facebook groups.
- New accounts: post by hand for a week or two, then turn on automation.

## Paid ads, later

Once a few weeks of `?src=` data show which channel turns visitors into
players, test a small budget there. Expect review: Meta, Google and TikTok
treat sweepstakes casinos as gambling-adjacent and often require permission
or certification first. Read the network's current policy before spending.
Anything that links to casinos needs an age gate and state targeting.

## First 30 days

| Week | Do |
|---|---|
| 1 | Add the 11 S/A referral links. Submit the sitemap to Google and Bing. Create the accounts (X, Bluesky, Threads, Facebook Page, Telegram channel, Discord server). |
| 2 | Connect them in Postiz and set the secret and variables. Run the workflow by hand; approve the drafts. Post the Reddit draft by hand. |
| 3 | If the drafts read right, set `SOCIAL_AUTOPUBLISH` to `true`. Record and post the first two short videos by hand. |
| 4 | Run the "Where new users come from" query. Keep the channels that bring app opens; drop the rest. Decide whether any channel earns an ad test. |

## What "working" looks like by day 30

- Of the people who see dailyrollover.com, more open the app than the
  current 92 of 3,430.
- At least one tagged source (not `direct`) brings 10 or more app opens.
- All S and A tier platforms carry a house referral link.
- Pro: a first subscriber who isn't you.
