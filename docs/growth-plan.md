# Growth and revenue plan

Written 2026-10-10. Organic first, about 20 channels, automated where the
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

Every automated channel gets its own version of the post and its own
`?src=` tag (the channel's name), so the "Where new users come from" query
in [analytics-queries.sql](analytics-queries.sql) shows which channels bring
players, not just clicks.

**By hand, on purpose**

| Channel | How |
|---|---|
| Google and Bing search | The 138 platform pages and tier list are already built and in the sitemap. Submit `https://dailyrollover.com/platforms/sitemap.xml` in Google Search Console and Bing Webmaster Tools. Tag: `seo`, `seo-hub`. |
| Reddit | The weekly post (it's in each Monday run's summary). Pick 2-3 sweeps subreddits, read each one's self-promotion rule, and answer questions there between posts. Subreddits remove automated self-promotion. Tag: `reddit`. |
| Facebook groups | Meta doesn't let apps post to groups. Share the Page's post into the sweeps groups that allow it. |
| Short videos (TikTok, YouTube Shorts, Reels) | 20-30 second screen recordings: "this site went A to S this week", or one Daily Run timed start to finish. Postiz can schedule a clip once it's filmed. |

**Automated every Monday (21 channels)**

| Kind | Channels | What goes out |
|---|---|---|
| Feeds | X, Bluesky, Threads, Mastodon, Farcaster, Nostr | The biggest tier moves, one link, the card (Nostr: text only) |
| Pages and groups you run | Facebook Page, Discord server, LinkedIn Page, Tumblr, MeWe, Telegram channel | Every section, a few lines each, the card (Telegram: text only) |
| Communities | Lemmy, Whop, Skool | The long post, in the communities you name |
| Blog and email | Medium, WordPress, newsletter (Listmonk) | An article with headings and a link to each platform's page |
| Picture-first | Instagram, Pinterest, TikTok (photo post) | The card, with a short caption and hashtags. Links in Instagram and TikTok captions can't be tapped, so the caption says "link in bio": make each bio link `https://dailyrollover.com/platforms/index.html?src=instagram` (or `?src=tiktok`) so those visits are counted too. |

Turn channels on one at a time: a channel is skipped until it's in
`POSTIZ_CHANNELS`, so there's no harm in starting with five.

**The tier card.** Each Monday's run also draws the week's card: the
biggest moves as tier badges, in the site's colours. It's 1080x1350 for feeds
and 1080x1920 for TikTok. Posts with a picture usually travel further than
text-only ones, and Instagram, Pinterest and TikTok can't post without one.

## Automation (built)

Every Monday the **Weekly social posts** workflow:

1. reads the week's tier changes from the catalogue's git history;
2. writes one post per channel, within each channel's character limit;
3. draws the tier card;
4. sends everything to Postiz in one request, as drafts you approve from the
   Postiz app (or publishes automatically once `SOCIAL_AUTOPUBLISH` is
   `true`);
5. puts the Reddit and Discord versions in the run's summary to paste by
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
- Each network has its own gambling rules, so read them before connecting
  it. TikTok's are the strictest: its community guidelines restrict gambling
  promotion, so keep TikTok posts about the tier data, not about playing, and
  expect it to be the account most at risk. Lemmy, Whop and Skool communities
  have their own self-promotion rules, so post only where they allow it.
- Set Facebook, Instagram and other accounts to 18+ where the network offers
  an age setting.

## Paid ads, later

Once a few weeks of `?src=` data show which channel turns visitors into
players, test a small budget there. Expect review: Meta, Google and TikTok
treat sweepstakes casinos as gambling-adjacent and often require permission
or certification first. Read the network's current policy before spending.
Anything that links to casinos needs an age gate and state targeting.

## First 30 days

| Week | Do |
|---|---|
| 1 | Add the 11 S/A referral links. Submit the sitemap to Google and Bing. Create the first accounts: X, Bluesky, Threads, Facebook Page, Instagram, Discord server, Telegram channel. |
| 2 | Connect them in Postiz and set the secret and variables. Run the workflow by hand; check the drafts and the card. Post the Reddit draft by hand. |
| 3 | If the drafts read right, set `SOCIAL_AUTOPUBLISH` to `true`. Add the next batch: Pinterest, TikTok, Mastodon, Farcaster, Nostr, Tumblr, MeWe, LinkedIn Page. Record the first two short videos. |
| 4 | Add the long-form channels (Medium, WordPress blog, newsletter) and any Lemmy, Whop or Skool communities that allow it. Run the "Where new users come from" query. Keep the channels that bring app opens; drop the rest. Decide whether any channel earns an ad test. |

## What "working" looks like by day 30

- Of the people who see dailyrollover.com, more open the app than the
  current 92 of 3,430.
- At least one tagged source (not `direct`) brings 10 or more app opens.
- All S and A tier platforms carry a house referral link.
- Pro: a first subscriber who isn't you.
