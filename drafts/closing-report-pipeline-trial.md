# Slots audit, chat 2: the pipeline trial (rounds 21 to 28), closing report

Build at the close: almanac-v141, branches claude/adoring-cerf-6dakad (PR #168, draft) and claude/slots-afro-hair, CI green, Cloudflare deployed.

## What the trial tested
The efficient round written into the audit skill: one auditor per round, targeted renders, a pixel pre-screen, blind paired crops, a form gate, and an idea bank. Eight rounds, one auditor each, against a 4.5 plateau that twenty-auditor panels had measured.

## Ideas and verdicts (one blind auditor, paired previous vs current)
| Id | Cluster | Idea | Verdict |
|---|---|---|---|
| I40 | torso | shoulder yoke, waist seam, rolled coat fronts | mixed, kept |
| I41 | torso | proud sleeve heads, hip flare, side seams | regressed (a wider, flatter shield), reverted |
| I42 | face form | brow ridge, orbital shelf, nose bridge, cheek plane, chin undercut | kept (2 to 0 on form) |
| I43 | eyes | eye openings 15% smaller | regressed (a flat pale disc), reverted |
| I44 | face form | lower-face outline profile | regressed (3 to 0), reverted |
| I45 | face form | light route: off-axis fill, lower value floor | regressed (carved, not child), reverted; the form gate's one exception, taken once |
| I46 | hair | alpha cards replaced by lobed tube ringlets | partial, kept (2 of 3 improved) |
| I47 | hair | rounder section; wide locks kept off the brow; slimmer fringe | partial, kept; slimming undone |

Kept at v141: I40, I42, I46, I47. Reverted: I41, I43, I44, I45.

## What the auditors kept saying
Every one of the eight single-auditor reads, like all twenty in the final panel, names the head: a sculpted realistic child's face and soft thick ringlet hair. Three face routes (I42, I44, I45) show that relief on a sphere plus a shader cannot get there: shown softly it reads as an egg, shown harder it reads as carved. The hair moved the single change for the first time (round 26), after a rebuild-class change (tubes for cards) that three card-variant rounds had not achieved.

## What the pipeline did well
- Cost: a round is one targeted render (two to five shots, four to eight minutes) and one auditor, about a quarter of a full round.
- The pre-screen caught a wrong crop box before any auditor was spent.
- Pairs with the kind-of-difference field separated geometry from shading, and decode flagged the mismatches.
- Keys were verified numerically against the pair images (every left half matches the build the key names).
- Looking at the frames before the audit caught every one of my own defects (a face root through the cheek, a bald forehead, a bare dome, a brow slab) at no auditor cost.

## What it taught the skill (all written to the audit-lab drafts)
1. One idea spans one cluster; a change touching two is two rows.
2. Form findings take geometry routes; one light route is allowed once geometry is in place and the auditor says the form does not show (it did not hold here).
3. Three routes and out: three routes on a cluster with at most one weak keep and an unchanged single change means the cluster needs a rebuild, not a variant.
4. Look at each pair image yourself before the auditor does.
5. Tube hair beats strand cards; a hat-height cap is set per region, not by one slope.
6. A regressed idea is reverted in its own round.
7. The pre-screen's crop-versus-whole comparison is how a wrong crop box shows itself.

## Open projects (outside the round cadence)
- The head: a sculpted child head mesh (sockets, zygomatic arch, jaw, chin as structure), then a skin pass that lets the key light model it.
- The ringlets: fewer, thicker, rounder tubes with rounded ends and a softer hair material.
- Cluster crop boxes in lab/clusters.json are set for this piece's camera; a new piece writes its own once at set-up.

## State
audit-lab branch: tooling (render-targets, prescreen, pair, ideas, clusters, frames), the idea bank with all 28+ rows, both skill drafts updated, the run log through round 27, this report. Saving the drafts to the installed skills is the owner's call through the review cards; nothing was written to the installed skills.
