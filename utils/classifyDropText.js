/**
 * Drop text classifier - sorts a pasted block (a Discord message, an email
 * body) into real codes, in-app claims, or purchase-required packs, instead
 * of just pulling out links like parseDrops() in index.html does. Shared
 * between the main app's Drop Inbox (personal, local-only) and the Freebies
 * admin page (admin/freebies.html) - both hand a raw paste to the same
 * classifyDropText(), so the parsing/filtering logic can't drift between
 * the two the way copy-pasted code eventually does.
 *
 * Deliberately has no dependency on any app-global besides cleanDropUrl()
 * (loaded as its own shared script, same pattern) - id generation is
 * injected via opts.idFactory instead of assuming a global uid(), since the
 * two pages that use this define that differently (or not at all).
 */

const CLASSIFY_PURCHASE_PATTERNS = [
  /\bwith\s+(?:any\s+)?purchase\b/i,
  /\bwhen\s+you\s+buy\b/i,
  /\bdeposit\s+of\b/i,
  /\bpurchase\s+package\b/i,
  /\bin\s+our\s+store\b/i,
  /\bdiscounted\s+pack\b/i,
  /\bupgraded\s+purchase\b/i,
  /\bpack\s*boost\b/i,
  // Real marketing copy usually skips the word "purchase" entirely and
  // just states a price next to the offer ("$4.99", "$10.99 GC
  // package") - a literal-phrase-only filter misses most of these.
  /\$\s?\d+(?:\.\d{2})?\s*(?:GC\s*)?(?:package|pack|bundle|recharge|boost)?/i
];
const CLASSIFY_ZERO_PURCHASE_MARKERS = [
  /\bzero\s+purchase\s+required\b/i,
  /\bno\s+purchase\s+necessary\b/i,
  /\bfree\s+spins?\s+waiting\b/i,
  /\bfree\s+gift\s+drop\b/i,
  /\bbonus\s+drop\s+code\b/i,
  /\bjust\s+for\s+registering\b/i,
  /\bno\s+purchase\b/i
];
// Engagement/retention spam - referral nudges, streak reminders, "we
// miss you" copy - none of which is an actual offer to classify.
const CLASSIFY_SPAM_PATTERNS = [
  /\bassemble\s+your\s+squad\b/i,
  /\bturn\s+friends\s+into\s+rewards\b/i,
  /\bbring\s+your\s+crew\b/i,
  /\bshare\s+the\s+fun\s+with\s+your\s+friends\b/i,
  /\bstill\s+hungry\b/i,
  /\bwe\s+miss\s+you\b/i,
  /\bcome\s+back\b/i,
  /\bgame\s+of\s+the\s+week\b/i,
  /\bonline\s+in\s+your\s+state\b/i
];
// Tokens shaped like a code but never actually one - without this, GC/
// SC/ET/TBD and similar abbreviations get pulled in as false positives.
const CLASSIFY_CODE_STOPWORDS = new Set([
  'GC', 'SC', 'USD', 'ET', 'EST', 'PST', 'PDT', 'KYC', 'VIP', 'FAQ', 'TBD',
  'AMOE', 'TOS', 'RTP', 'CRM'
]);
// ESP/marketing-automation domains whose links ARE the tracking token
// (Exponea, Bloomreach/customer.io-style redirects, affiliate routers) -
// there's no "clean" version; stripping query params does nothing.
const CLASSIFY_TRACKING_DOMAINS = [
  /exponea\.com$/i, /route\.app$/i, /routy\.app$/i, /bonuses\.email$/i,
  /track\.customer\.io$/i, /^email\./i, /^tracking-/i, /\.page\.link$/i,
  // Numbered click-tracking subdomains (IBM Watson/Silverpop/Alterian-
  // style ESPs, e.g. url9888.sweeplasvegas.com/ls/click?...) - the
  // brand's real domain is the suffix, but this subdomain is the ESP's
  // one-time redirect layer in front of it, not a page worth publishing.
  /^url\d*\./i
];
// Account-linking params (distinct from plain utm_* marketing tracking,
// already handled by cleanDropUrl): if present the link is scoped to
// whoever received it and fails for anyone else, even on the
// platform's own domain (e.g. crowncoinscasino.com/?fuid=...,
// mcluck.com/?xnpe_tifc=... - Bloomreach's per-recipient token).
const CLASSIFY_ACCOUNT_PARAMS = new Set([
  'fuid', 'uid', 'token', 'pid', 'player_message', 'aa', 'hash', 'xnpe_tifc', 'xnpe_cmp', 'mcp_token'
]);

function domainOf(u) {
  try { return new URL(u).hostname.toLowerCase().replace(/^(www\.|m\.|wap\.|play\.|fun\.|game\.|app\.)/, ''); }
  catch (e) { return null; }
}
function rootOf(host) {
  if (!host) return null;
  const p = host.split('.');
  return p.length >= 2 ? p.slice(-2).join('.') : host;
}

function classifyIsCodeShaped(tok) {
  return /^[A-Z0-9]{4,12}$/.test(tok) && /[A-Z]/.test(tok) && !CLASSIFY_CODE_STOPWORDS.has(tok);
}

// A real code is written in caps in the source text (PULSE20, WB250) -
// surrounding prose words a greedy list-match sweeps up ("active",
// "now") are not, so checking the ORIGINAL casing (not a post-hoc
// .toUpperCase()) is what filters them back out. The separator after
// "code"/"codes" is colon, whitespace, OR a dash - real Discord copy
// uses all three ("Code: X", "code X", "Code-\nX" on its own line).
function classifyExtractCodes(text) {
  const codes = new Set();
  const triggerRe = /\b(?:promo\s+)?codes?\b[:\-\s]+((?:[A-Za-z0-9]{4,12}[\s,]+)*[A-Za-z0-9]{4,12})/gi;
  let m;
  while ((m = triggerRe.exec(text))) {
    m[1].split(/[\s,]+/).forEach((tok) => { if (classifyIsCodeShaped(tok)) codes.add(tok); });
  }
  return Array.from(codes);
}

// Beyond a fixed list of known ESP param names (which will always be
// one step behind whatever the next marketing platform calls its
// token), catch account-tied links by SHAPE: a query value that looks
// like a JWT (base64 JSON always starts "eyJ") or is just a long
// opaque base64url/hex blob is essentially never something meant to be
// shared - it's a signed, per-recipient token either way.
function classifyLooksLikeToken(value) {
  if (!value) return false;
  if (value.startsWith('eyJ')) return true;
  return value.length >= 24 && /^[A-Za-z0-9_-]+$/.test(value) && /[0-9]/.test(value) && /[A-Za-z]/.test(value);
}

function classifyHasAccountParam(url) {
  try {
    const u = new URL(url);
    for (const [key, value] of u.searchParams.entries()) {
      if (CLASSIFY_ACCOUNT_PARAMS.has(key.toLowerCase()) || classifyLooksLikeToken(value)) return true;
    }
  } catch (e) {}
  return false;
}

// Clean domain+path (safe to publish) vs. an account-tied tracking
// redirect (root domain + "check your account" only, since the link
// itself won't work for anyone but the original recipient).
function classifyLink(url) {
  const host = domainOf(url);
  if (!host) return null;
  if (CLASSIFY_TRACKING_DOMAINS.some((re) => re.test(host)) || classifyHasAccountParam(url)) {
    return { type: 'tracking', root: rootOf(host), url: null };
  }
  let clean = url;
  try { clean = cleanDropUrl(url); } catch (e) {}
  return { type: 'clean', root: rootOf(host), url: clean };
}

// Explicit timestamp > explicit relative duration > a vague-but-present
// temporal phrase (treated as end of today) > the flat 24h default -
// real marketing copy uses all four, not just the two extremes.
function classifyParseTTL(text, referenceDate) {
  const ref = referenceDate || new Date();
  const absMatch = text.match(/\b(\d{4}-\d{2}-\d{2}(?:[ T]\d{1,2}:\d{2})?)\s*(ET|EST|EDT|PT|PST|PDT|UTC)?\b/);
  if (absMatch) return { type: 'timestamp', raw: absMatch[0], expiresAt: null };
  const relMatch = text.match(/\b(\d{1,3})\s*(hour|hr|day)s?\b/i);
  if (relMatch) {
    const n = parseInt(relMatch[1], 10);
    const unitMs = /day/i.test(relMatch[2]) ? 86400000 : 3600000;
    return { type: 'relative', raw: relMatch[0], expiresAt: ref.getTime() + n * unitMs };
  }
  const vagueMatch = text.match(/\b(tonight|midnight|weekend promo|this weekend|today|end of day)\b/i);
  if (vagueMatch) {
    const eod = new Date(ref);
    eod.setHours(23, 59, 59, 999);
    return { type: 'vague', raw: vagueMatch[0], expiresAt: eod.getTime() };
  }
  return { type: 'default', raw: null, expiresAt: ref.getTime() + 24 * 3600000 };
}

function classifyExtractTerms(text) {
  const terms = [];
  const pt = text.match(/(\d+)x\s*(?:playthrough|rollover|wagering)/i);
  if (pt) terms.push(pt[0]);
  const cap = text.match(/(?:max(?:imum)?\s*(?:cashout|redeem|win)|capped\s+at)\D{0,5}\$?\d+(?:\.\d{2})?/i);
  if (cap) terms.push(cap[0]);
  return terms.length ? terms.join(' | ') : null;
}

function classifyIsSpam(text) {
  return CLASSIFY_SPAM_PATTERNS.some((re) => re.test(text));
}

function classifyHasPurchaseIndicator(text) {
  return CLASSIFY_PURCHASE_PATTERNS.some((re) => re.test(text));
}

// Splits a pasted dump into candidate offer segments. Two very
// different shapes of paste need two different splitters:
//
// - A Discord scrollback copy: blank lines are NOT a reliable message
//   boundary (an embed's own link line often runs straight into the
//   NEXT person's message with no blank line at all - confirmed
//   against a real paste, where blank-line splitting glued each
//   message's link onto whoever posted after them instead of the
//   message that actually posted it). The one boundary Discord's copy
//   format always emits is the "[H:MM AM/PM]" timestamp prefix on each
//   message, so when the text has at least one of those, split right
//   before each one instead - that keeps a message's own trailing
//   link/"Image" artifact correctly attached to IT, not the next
//   message, since everything up to the next timestamp stays together.
// - Anything else (an email body, pasted sheet rows) has no such
//   marker, so fall back to the original blank-line/sentence split -
//   this is what correctly separates Lavish Luck's purchase-tied
//   headline from its genuine free-registration bonus in one email.
function classifySplitSegments(text) {
  const hasDiscordTimestamps = /\[\d{1,2}:\d{2}\s*(?:AM|PM)\]/i.test(text);
  const chunks = hasDiscordTimestamps
    ? text.split(/(?=\[\d{1,2}:\d{2}\s*(?:AM|PM)\])/i)
    : text.split(/\n\s*\n|(?<=[.!?])\s{2,}/);
  return chunks.map((s) => s.trim()).filter((s) => s.length > 8);
}

function extractDropLinks(text) {
  return (text.match(/https?:\/\/[^\s<>"')\]]+/gi) || []).map((u) => u.replace(/[.,;]+$/, ''));
}

// opts.idFactory: how each offer gets its id - defaults to the same
// 'id_xxxxxxxxx' shape the rest of this app's uid() produces, but a caller
// can pass its own (or the actual uid()) to keep ids consistent with
// whatever else it stores alongside them.
function classifyDropText(rawText, opts) {
  opts = opts || {};
  const ref = opts.referenceDate || new Date();
  const makeId = opts.idFactory || (() => 'id_' + Math.random().toString(36).slice(2, 11));
  const segments = classifySplitSegments(rawText).filter((s) => !classifyIsSpam(s));
  const offers = [];
  segments.forEach((seg) => {
    if (!/free|bonus|spin|SC\b|GC\b|code|claim|gift|drop/i.test(seg)) return;
    const links = extractDropLinks(seg);
    const codes = classifyExtractCodes(seg);
    const purchaseTied = classifyHasPurchaseIndicator(seg) &&
      !CLASSIFY_ZERO_PURCHASE_MARKERS.some((re) => re.test(seg));
    let bucket;
    if (purchaseTied) bucket = 'C_purchase';
    else if (codes.length) bucket = 'A_code';
    else bucket = 'B_claim';
    const linkInfo = links.map(classifyLink).filter(Boolean)[0] || null;
    offers.push({
      id: makeId(), bucket, codes, link: linkInfo, ttl: classifyParseTTL(seg, ref),
      terms: classifyExtractTerms(seg), snippet: seg.slice(0, 200)
    });
  });
  return offers;
}
