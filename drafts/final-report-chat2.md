# Slots intro — audit chat 2, final report (v119, commit 783b58f)

## Score history (20 blind auditors unless noted)
| build | mean | weight | SEV-3 | note |
|---|---|---|---|---|
| v111 | 4.80 | | | start of chat 2 |
| v112 | 4.78 | | | face proportion (I15) |
| v113 | 4.62 | | | face skin (I16) |
| v114 | 4.85 | | | skin shader + tone lock (I17) — best |
| v115 | 4.45 | | | whole-face pass (I18) |
| v116 | 4.55 | | | tail wave 1 (I19–I22) |
| v117 | 4.50 | 513 | 47 | tail wave 2 (I23–I26); 5-auditor read 4.60 |
| v118 | 4.67 | 509 | 50 | plateau test (I27–I38); 4 fives, 16 at 4.5 |
| v119 | 4.50 | 514 | 53 | final: I29 hair reverted; 20 of 20 at 4.5 |

## Verdict
The piece sits on a 4.5 plateau. The v118 rise to 4.67 did not survive the
final read: the final panel was unanimous at 4.5 with zero spread. Finding
weight and SEV-3 count never moved across the last three 20-auditor rounds.

## What held (keep)
- I27 body narrowed 12% (75% improved); I31 drapes (95%); I35 tooth framing (95%); I38 tier caption (100% resolved)
- I17 skin shader / tone lock (skin SEV-3 14 → 3 at the time)
- I19+I26 coat material (SEV-3 13 → ~0 by r20)
- Mixed but not regressed, kept: I28 velvet pile, I30 lever mount, I32 hat seat, I33 pull weight, I34 jackpot light, I36 hands, I37 eyes/cheeks

## What was dropped
- I29 rounded hair cards: 10 regressed / 10 unchanged / 0 improved → reverted in v119. The revert read mixed (I39: 10 improved, 8 unchanged, 2 regressed) and hair SEV-3 fell 17 → 12, but the score did not move.

## The wall (every auditor's SINGLE-CHANGE, 20 of 20)
Replace the head: a sculpted realistic child's face (planes, lid geometry, subsurface skin with colour variation) and real ringlet hair (tube or layered strands with a lit side and roots). 3 of 20 add the torso: shouldered, tapering, coat opening over a waistcoat.

Remaining SEV-3 clusters at v119: COAT-TORSO 17, FACE-FORM 15, HAIR-CURLS 12, FACE-SKIN 4, FACE-EYES 3.

## Lessons for the skill drafts (audit-makes-perfect / dro-skin-builder)
1. Shader and material passes move SEV-3 on their own cluster (skin, coat) but not the score; the score is held by *form* (head, hair, torso). Form needs geometry, not paint or shading tricks.
2. Card-based hair plateaus. Three rounds (I23, I29, I39) of strand-card variants moved hair SEV-3 17 → 9 → 17 → 12 with no score effect. The remaining ask is tube ringlets with roots and occlusion.
3. Lathe torsos read as eggs regardless of profile tuning (I22, I25, I27). A shoulder line and a coat opening need separate geometry.
4. A 5-auditor read is noisy by ±0.1–0.2; a 20-auditor read with a spread (v118) can still regress to the mode next round. Treat a rise under 0.25 as noise.
5. Mixed ideas (30–55% improved, 0 regressed) are safe to keep and cheap; they do not raise the score.
6. Working every small finding in one round (v118, 12 ideas) raised the mean 0.17 once and did not hold; the next rise needs one of the three form rebuilds.

## State
- Branch claude/adoring-cerf-6dakad (PR #168, draft) and claude/slots-afro-hair both at 783b58f, build almanac-v119, CI green, Cloudflare preview deployed.
- Lab: packets r12–r20 and results in this session's scratchpad; tooling and Round-11 drafts on claude/audit-lab.
