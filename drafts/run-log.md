# Audit makes perfect: run log

**Piece:** the slots landing-intro game (`assets/intro3d/slots.mjs`), repo Braxtonius-gngr/Social-casino-bliss, branch `claude/intro-slots`, PR #155 (stacked on #152, blackjack).
**Started:** 2026-10-03.

**Settings** (the defaults):
- target: 9/10
- cap: 2
- a rise: +0.5 or more over the best score so far
- budget: 8 rounds

**Drafts:**
- `claude/skill-drafts/dro-skin-builder.md` (B)
- `claude/skill-drafts/audit-makes-perfect.md` (A)

## Frame set (fixed for every round)

**Portrait, 390×844, DPR 1:**
- **Standard Pull, seed 11:** open (0), look+0.3, reach+0.6, pull+0.3, stop1, slow+0.3, call+0.6, drawer+0.6, pay+1.2, reveal-0.4
- **The Jackpot, seed 5:** boom+0.5, boom+1.2, boom+2.2, reveal-0.3
- **On a Tooth, seed 9:** slow+0.3, rest+0.6

**Landscape, 844×390, DPR 1:**
- **Three Sevens, seed 2:** open (0), reach+0.6, slow+0.3, call+0.6, drawer+0.6, pay+1.2, reveal-0.4

**3× crops** (portrait rendered at DPR 3, then a third of the screen cropped):
- **C1:** the face at the open (Standard, seed 11, t=0)
- **C2:** the hand on the lever (Standard, seed 11, pull+0.3)

**Reference:** the R×R card-table home (the 7/10 bar), portrait, at fly 1.5 s, 3 s and 5 s, and at rest.

## Rounds

### Round 0: baseline
- **Commit:** b239e47
- **Frames:** `r0/`
- **Fresh auditor:** a10cfcb42e07d81f2
- **S0 = 5.5/10.** The 3× crops and the stricter fresh auditor put it below the earlier reviewer's 7.

Top findings:
1. **[execution]** The hand on the lever has no grip: a flat palm, straight fingers, no thumb visible, a white disc for a cuff, and the knob hidden (A3, A4, D2).
2. **[execution]** The payout isn't visible in the reveal: the drawer's inside is black, and the Jackpot's overflow and glow are gone by the reveal (A10, C7, B4).
3. **[execution]** The Jackpot is undersold: gold only as bloom on the bezel with no light on him or the desk, irises recoloured yellow, coins laid in a flat hex single layer and reading as plastic (B1-B3).
4. **[execution]** On a Tooth reads only when pinched in, and the dim turns the bisque tan (B5, B6).
5. **[method]** Too few frames to judge Tooth and the motion of the pull. Noted; the frame set stays fixed this run.
6. **[direction]** The hair reads as carved donuts. Real wig, or a deliberate carved and lacquered wig?
7. **[execution]** A woven crosshatch on the bisque at 3× (D1).
8. **[execution]** Overlays: the caption is lost on gilt, the title has weak contrast over the leather, and fingers cut into the title (C5, C6, A9).
9. **[execution]** The winning dice symbol is the faintest on the reel (A7, A9).
10. **[execution]** The cloth reads printed or paper: jabot, sleeves, waistcoat tiling, velvet.
11. **[execution]** Weak contact shadows under the shoes and the legs.
12. **[execution]** The room is a flat box.
13. **[execution]** Shadow acne or aliasing on the lever bracket at 3×.

### Round 1
Three changes to B:
- **B1.1, "Hands are hero parts" plus the pinch pass in verify.** Answers findings 1, 7 and 13. Build a carved hand with an opposed thumb and pose each grip for its object; take a DPR-3 crop of every contact and hero surface; tune the shadow bias. Expected: the grip reads, and the skin and brass lose their acne.
- **B1.2, "Payoffs are physical" plus the last-frame test.** Answers findings 2 and 3. A glow is a real light on its neighbours, a catchlight replaces recolouring, money has mass, and the outcome reads in the last frame. Expected: the Jackpot and the reveals carry the payout.
- **B1.3, the readability pass.** Answers findings 4, 8 and 9. Overlays get a backing over gilt or mid-tones, the deciding symbol is boldest, and a mood dim grades the light, not the materials. Expected: the captions, the win and On a Tooth all read.
- **Rework commits:** 7a2180c and edcc8a9, tagged `amp-r1-tried`.
- **Frames:** `r1/`
- **Fresh auditor:** a8ea50e4a3e66d753
- **S1 = 5.5/10. No rise.**
- The B1.1-B1.3 changes were **reverted** in the draft (kept as `r1-tried-dro-skin-builder.md`), and the piece was reset to b239e47.

What the auditor said:
- **Improved:** the coins, the die, the drawer lamp and the caption backing.
- **Still the worst:** the hand and cuff. The grip still reads as the palm on top, and the cuff now reads as an open torn shell.
- **The Jackpot:** it asked for gold eyes, which round 0's auditor had called "possessed".
- **Regressions:** a subtitle on his hair in landscape, and the drifting title axis.

Why it didn't move:
1. The fresh auditors asked for opposite fixes: catchlight against gold irises, and lace against a closed wrist. So the loop partly chased noise.
2. The round spread three changes over eight findings and removed none of them; the hand (finding 1 in both audits, in about 10 of 25 frames) was only improved.
3. Nothing checked for regressions before the full audit.

Changes to A (cap count: **1**):
- **A1.1:** the auditor gets the previous findings and what was done about each; it rates each as resolved, improved, unchanged or regressed, and doesn't reverse a choice made in answer to a finding unless the result is worse.
- **A1.2:** depth over breadth. Rank findings by frames × severity and aim at the top one or two until they are gone.
- **A1.3:** a pre-check before the audit. Render the targeted frames and 3× crops next to the previous round's, and keep reworking until each finding is gone with nothing regressed.

### Round 2 (under amended A)

**User direction (14:12):** "consider if there's any improvement without considerable depreciation, keeping the changes."
- **A2.1 (the user's change):** a round that improved findings without a considerable regression is kept even without a +0.5 rise, and the cap count is left alone.
- **Applied retroactively to round 1:** it improved the coins, the die, the drawer lamp and the caption backing; its regressions (the landscape subtitle, the title axis, the open cuff) were small or already being targeted. So round 1's B changes B1.1-B1.3 are restored in the draft, and its rework is restored on the piece (cherry-picked as a9c7712 and be59f17).
- The best kept state is now round 1 (5.5).

Round 2 targets (frames × severity):
1. The hand and cuff (findings 1 and 9 in round 1, in about 12 of 25 frames).
2. Contact (finding 4, in 6 frames).

Changes to B:
- **B2.1:** "Hands are hero parts" made deeper. A carved palm with the heel and the ball of the thumb, knuckles, nails, a little spread; the cuff closes on the wrist with nothing hollow and the lace outside; the grip posed and judged from the shot's own camera.
- **B2.2:** "Contact". Everything that rests casts and receives shadow, contact blobs where the shadow map is too soft, the widest frame checked so nothing floats.
- **Rework:** 5dc56eb and e5cb225 (on top of round 1's a9c7712 and be59f17).
- **Pre-check:** the grip and cuff were checked at 2× against round 1, which caught a zigzag lace edge (fixed with round lobes) and the resting hand sunk into the desk (fixed).
- **Frames:** `rd2/`
- **Fresh auditor:** a73028c9648746aec, given the ledger.
- **S2 = 5.5/10.**

Ledger of round 1's findings:
- **Improved:** the cuff, wrist and grip (1), contact (4), the resting hand (9).
- **Unchanged:** the other 11.
- **Regressed:** none.

**Decision: KEPT** under A2.1 (real gains, no considerable regression). The cap count stays at 1. B2.1 and B2.2 stay in the draft.

The auditor's new top findings:
1. At reach+0.6 the hand bunches, with the index finger sticking out.
2. The Jackpot's light never leaves his chest (B1, B2, B4).
3. On a Tooth reads only at about 4× zoom, and the dim turns his skin brown (B5, B6).
4. The contact shades read as discs or stickers, and the hand's shade looks like a hole.
5. The pull has no weight.

What would most raise the score: making the tier moments read without the title.

### Round 3
Targets (frames × severity, plus "what would most raise"): the tier moments, which are the Jackpot (B1, B2, B4) and On a Tooth (B5, B6).

Changes to B:
- **B3.1, the titles-off test.** Each tier must read from the scene with the overlays hidden. A jackpot's light is measured (the face, cloth and table sampled before and at the peak) and its catchlight reads at 1×. A near miss is framed to fill a third of the screen and held.
- **B3.2, a dim keeps the subject's value.** Drop the room and its fill, keep a cooler key on the subject, and check the skin's value before and after.

Also, under kept steps (B2.1, B2.2, B1.3):
- the reach hand closes progressively with no finger out of line
- softer, smaller contact shades, with the hand's shade under the palm and fingers
- the landscape call clear of his hair
- **Rework:** 205ce9e.
- **Frames:** `rd3/`
- **Fresh auditor:** a5a4b77617fc3d7c9.
- **S3 = 5.5/10.**

Ledger of round 2's findings:
- **Improved:** the Jackpot gold (measured 15-20 RGB levels brighter on his chin, sleeve, bell and blotter), On a Tooth (the stranded reel reads at 1× and his skin keeps its value), the contact shades, the landscape subtitle (in C4).
- **Unchanged:** the other 9.
- **Regressed:** none.

**Decision: KEPT** under A2.1. The cap count stays at 1.

The auditor's top finding is still the hands (in about two-thirds of the frames):
- the grip has no palm on the ball and no thumb
- the fingers are thin tubes
- the resting hand is a flat paddle

My own lapse: the reach fix was never re-checked at A3/A4 at 1× after its last change. A1.3's pre-check was skipped for that change, and the auditor flagged it as [method] finding 12.

Note: the score has held at 5.5 through three kept rounds, each with measured gains. Either the auditors anchor on the previous score, or the hands cap the score until they're fixed. The latter is the auditor's own claim ("what would most raise the score").

### Round 4
Target: the hands only, the top finding in rounds 0-3 by frames × severity.

Changes to B:
- **B4.1, a hand study first.** Before posing hands in the shot, render each hand alone from the shot's camera in every pose it takes (reach, grip, pull, rest). Hold them to a reference: finger thickness about a quarter to a third of the palm's width (short and plump for a child), the thumb as long as the palm and set at its side.
- **B4.2, the anatomy of a grip and a rest.**
  - **Grip:** the palm's centre over the object's top, the fingers wrapping under its widest point, the thumb on the side opposite them.
  - **Rest:** a relaxed curl that grows from index to little finger (15-35°), raised knuckles, the thumb alongside, the fingertips and the heel of the hand touching the surface.
- **Pre-check:** the contact scan found the resting fingertips 1.4 cm into the desk. It traced to a grasp bug: a joint set early left no room for the joints after it. Fixed (the grasp checks where each joint sets the next one down, and closes the finger as a whole when it must); the scan now reads 0.17.
- **Rework:** 164012e.
- **Frames:** `rd4/`
- **Fresh auditor:** a78003e2be1d1b9e1, told to place the score from the anchors before looking at the old number.
- **S4 = 5.5/10.**

Ledger of round 3's findings:
- **Improved:** the grip (1), the resting hand (2), contact (3), the Jackpot catchlight (4, one sub-point), the method check (12).
- **Unchanged:** the other 7.
- **Regressed:** none in the ledger. Two side effects were new:
  - the plump fingers read as "bead chains" (new finding F4, 4th on the list)
  - removing the shoe discs left the shoes with no shadow

**Decision: KEPT** under A2.1: five findings improved, and the new finding isn't at the top. The cap count stays at 1, and the side effects are folded into round 5's targets.

The auditor's verdict: the hero figure is "plainly CG at arm's length" (egg torso, tube sleeves, printed silk, carved-wood hair). That holds the piece in the 5-6 band whatever the hands do. What would most raise the score: a figure pass (tailored silk with folds and sheen, real shadows on small things), with the hair as a direction call for the owner.

### Round 5
Targets: F1, the figure's tailoring and materials; F3, real shadows on small things; F4, the bead-chain fingers (folded in as this round's own regression).

Changes to B:
- **B5.1, clothes are tailored.** Cloth folds where the body bends (elbow, armpit, waist) in the geometry or the normal map. The silhouette follows a tailor's pattern, not a primitive. A woven pattern reads as weave (low contrast, tone on tone), and silk gets a sheen that changes with the angle of view.
- **B5.2, real shadows on small things.** Hands, feet, coins and props cast real shadows, with the shadow map sized and biased for small objects. Contact shades only supplement a real shadow, and are never a disc standing alone where a shadow should fall.
- **Pre-check:** the open, reach, spin, rest and wide frames were compared with round 4's.
- **Rework:** 06055b4.
- **Frames:** `rd5/`
- **Fresh auditor:** a06ff0b8d02b6b881.
- **S5 = 5.5/10.**

Ledger of round 4's findings:
- **Improved:** F1 (folds, quieter damask, a waist, sheen), F2 (gold on his face and jabot, a visible catchlight), F3, F4, F6, F13.
- **Unchanged:** 7.
- **Regressed:** none, but this round's own sheen and folds brought a **new finding at the top of the list**:
  - N1: hard horizontal sheen bands on the waistcoat, triangular shards at the elbows, faceted shoulders
  - N3: a white-lilac grazing sheen

**Decision: REVERTED.** A new finding at the top is a considerable regression under A2.1:
- B5.1 and B5.2 are reverted in the draft (kept as `r5-tried-dro-skin-builder.md`)
- the piece is reset to 164012e, the round-4 state (round 5 tagged `amp-r5-tried`)

Why the method stopped moving the score: six audits in a row scored 5.5 while the ledgers showed 3-6 findings improved each round. Every auditor names the same ceiling: a figure that is "plainly CG at arm's length". Its biggest tell, the hair, is a direction call that every audit since round 0 has flagged, and the loop kept working round it. This round's figure pass also showed a gap: a new shader was checked on the targeted frames but not across the whole set, so its artifacts shipped.

Changes to A (cap count: **2**):
- **A5.1, direction first.** When a direction finding ranks in the top two or recurs across two audits, stop and ask the owner before the next round.
- **A5.2, the whole-set pre-check.** Compare all frames with the previous round's, and zoom 2× on every changed surface in every frame it appears in.
- **A5.3, the plateau rule.** A score level through three kept rounds whose ledgers show real gains means stop, report and ask for direction.

**Cap count 2 = cap. The run is CAPPED.** Report follows.

### Round 6: the owner's direction answers (after the cap)
**The owner's calls (19:52-19:54):**
- **Hair:** his reference photo, a doll with a soft copper-brown afro
- **2a:** the caption gives the odds alone where the call names the tier
- **3a:** every title gold
- **4b:** drapes in the room

**On the piece** (branch `claude/slots-afro-hair` off main, commit b8b379b, no PR):
- **The hair:** fur shells, 22 instanced shells over an opaque core casting the shadow, and a coil map of ringlets drawn as tubes. Fuller at the crown, rounded in toward the jaw, a fringe at the brow.
- **The drapes:** green velvet, hung full behind the dais on a gilt pole with rings, with a warm wash raking the folds.
- **Gold:** a `goldCall` hook in intro.mjs.
- **The caption:** odds-only, in intro.mjs.

**Frames:** `rd6/`
**Fresh auditor:** ad8c801fe9116bc5e
**S6 = 5.5/10.**

Ledger of round 4's findings:
- **Resolved:** F9 (readability)
- **Improved:** F11 (the room), F13 (the checks)
- **Unchanged:** the other 10, with F1's hair swapped but not yet better at arm's length

The auditor on the hair:
- **Across the room:** it carries the reference well, and its width against the face matches the photo.
- **At arm's length:** the colour is a flat orange where the photo is honey-tan, with no dark roots or frosted tips. The hairline is a hard mask edge, and a gap opens at the temple when the head turns (A2). The edge shows as stacked shell slices.
- **At 3x:** the coils read as a printed loop texture with moiré, and white pinholes show at the hairline.

What would most raise the score: rebuild the hair-to-face junction (a scalp cap that turns with the head, a feathered hairline, shadow on the forehead) and remove the shell slicing and moiré. Then make the Jackpot's gold light the face, the hair and the drapes.

### Round 7: the owner's new reference set (brown curls, money-green velvet, realistic child, oxblood drapes), then a hat
**The owner's calls (Oct 4):** from 10 reference images (the real Writer, a hyper-realistic rework, brown-coat ideas, a dark "money green" velvet coat). Answers: hair brown curls like the Writer; oxblood velvet drapes; face a realistic child, not porcelain; keep the reels in his chest.

**On the piece** (branch `claude/slots-afro-hair`, commits c202df9 and b35b8f2, pushed, no PR; build v105 then v106):
- **Hair:** the fur shells were abandoned (they read as a patterned wig). Rebuilt as real geometry: a scalp cap plus ~760 tapered spiral-tube ringlets merged into one mesh with root-to-tip vertex colours; a fringe at the brow; shortest at the nape.
- **Coat:** dark money-green velvet (pile normal map, sheen), darker cuffs, a darker quieter waistcoat.
- **Drapes:** oxblood.
- **Face:** warm painted skin with shade in the sockets and hollows, pores, deeper nose, lips and cheeks, a rounder shorter chin, brows lowered to a child's height with a soft mass under the strands, darker brown irises with lid shade, hand skin matched.
- **Hat (owner's idea, 13:20):** a black felt tricorn with gold braid and a cream plume, one `HAT` flag. Hair above the hat line is left out. Landscape close keys reframed.

**Frames:** `rd7` (pre-fix, black crown hole), `rd8`, `rd9` (final no-hat), `rd10` (with the hat).
**Fresh auditor (round 7, on rd8):** a4a4ac20f27769e60. **S7 = 5.5/10.**
- Improved: hair (shells, moire and pinholes gone), hair colour (resolved), the drapes (resolved; the best surface), the check method
- Unchanged: Jackpot light, contact, On a Tooth framing, the blotter, the band below the reels, caption backing
- Still flagged: hair "worms on a helmet" and too big; the face "a tinted doll"; the hands "mannequin parts"; the torso cut

The second pass (rd9) acted on the hair (denser, tighter, brown scalp, pointed tubes, no speckle), the face (smaller irises, softer lid rims, brows, lips, a narrower chin) and the waistcoat, with no new audit. **The hat version (rd10) was not audited: the owner asked for no auditor before they add instructions.**

**Method note for audit-makes-perfect:** the 3x crops only covered the face and hand, so the black crown hole and the nape dropouts were not caught until a full-set look. Add crown and nape crops, and a side-by-side with the owner's reference as a gate.

### Round 8: ten blind auditors at once, cluster, rework the top five (owner's idea, Oct 4)
**The owner's call (14:04):** "call 10 simultaneously running audits, compare the findings and rework the top 3-5". This replaced the earlier "don't call the auditor right away".

**The panel (on rd10, the tricorn build):** 10 fresh auditors, same brief, same packet, no sight of each other. Scores 5, 5, 5, 5, 4.5, 5, 5, 4.5, 5, 5. **Mean 4.9, range 4.5-5.** Round 7's single auditor gave 5.5 on a different build, so a lone auditor's number is good to about +/-0.5 at best; the panel spread itself is about +/-0.25. Every auditor put the room (drapes, desk, drawer, coins, reel window, hat silhouette and braid) at 6.5-7 and the figure at "plainly CG".

| # | Cluster | Flagged (of 10) | SEV 3 votes |
|---|---------|-----|-----|
| 1 | Face and eyes: doll, goggle-rim lids, flat sclera, hatch brows, dash lashes, smudge nose, face cream in some frames and bronze in others | 10 | 10 |
| 2 | Coat and torso: egg torso, sleeves flare like wings, velvet reads as satin, waistcoat grey-olive | 10 | 6 |
| 3 | Jackpot light trapped in a halo round the bezel | 10 | 4 |
| 4 | Hands: sausage fingers, paler than the face, perched on the lever, cuff a bottle cap | 10 | 2 |
| 5 | Lace: jabot a flat paper tongue, cuffs cupcake liners | 10 | 0 |
| 6-14 | Hair worms; hat plume sawtooth and smooth felt; captions; drape edge in landscape; hat clipped in portrait; On a Tooth does not read; contact AO; arm-only motion; eyes aimed at the camera | 4-10 | 0-1 |

Nine of ten named the face as the single change that would most raise the score. Findings converged strongly: the clustering took minutes because nearly every cluster had 9-10 votes.

**Top five (consensus x severity), reworked in `slots.mjs`:**
1. **Face and eyes:** smaller eyes; hair-stroke brows over a soft body; corner-shaded sclera; the lid shell skin-toned with a soft brown margin; short fine lashes; nostrils, nose volume and a philtrum; mottled skin; a brim shade on the forehead; lip gradients; a steadier fill light so the face is the same colour in every frame.
2. **Coat and torso:** a deep bottle-green waistcoat, clearly darker than the coat; velvet with a lower sheen and a grazing-angle sheen colour; a waist pinch, skirt folds and slimmer sleeves. *Not done:* narrowing the shoulders (the arm joints would detach from the coat, and SH.x drives the IK reach). The egg read in close-ups remains.
3. **Jackpot light:** a real gold flood (a point light stood 13 units off the chest plane) plus a gold wash on the drapes and desk, and the eye emissive. Tuned down once so the coat does not go lime.
4. **Hands:** the hand skin now shares the face's material; the bead knuckles are gone. The grip on the lever is unchanged.
5. **Lace:** a three-tier rippled jabot with a scalloped edge and eyelets; then a second, fine weave for the cuffs (18 small scallops, no eyelet holes, a calmer flare).

**Polish pass (rd12), after the first re-render (rd11):** the first render showed a thick black lash line, a brown nose smear, a spiky polka-dot cuff, and heavy sullen lids. Changes: lash length 0.4 to 0.28, the lid margin lighter, brows denser and darker, lid rest -0.2 to -0.27, face fill 16 to 34, the cuff lace split out as its own weave.

**Method notes for dro-skin-builder / audit-makes-perfect:**
- **A per-stroke canvas `ctx.filter` freezes a software-GL page.** 460 brow strokes with `blur(0.5px)` hung the lab for 8 minutes. Blur once on a layer, never per stroke.
- **Ten parallel auditors beat one for choosing what to fix** (the ranking is robust) **but not for proving a rise**: the noise (+/-0.25) is half the 0.5 rise threshold, so use the panel to pick the work and use the mean of a panel, not a single score, to claim a rise.
- **Do the tightest fix first and judge by the 3x crops:** two of the rd11 defects (black lash line, polka-dot cuff) were visible only at 3x, which is the distance the auditors scored the figure at.
- **A repeating texture needs its scale checked where it lands:** a six-lobe lace tile repeated twice round a small cuff became a crown; the same tile on the larger jabot read as lace. Pick the tile count from the size on screen.

**Not addressed this round (all SEV 2 or less):** hair "worms" and blunt tips, the plume sawtooth, the felt nap, the tiny tier caption and the title on the pale blotter, the grey drape edge in landscape, the hat cut by the frame in portrait close-ups, the On a Tooth moment, contact AO (lever mount, hand, bell, coins), arm-only motion, eyes aimed at the camera rather than the reels.

**Cuff, third pass (rd13):** the cuff frill kept a serrated look through two fixes. Shallower picot scallops did nothing; removing the alpha cut did nothing; the teeth came from the geometry (the hem's vertical fold ripple, which turns into points when the cone is seen near end-on). Cutting that ripple from 0.2 to 0.05 and keeping the radial folds gave a soft pleated frill. *Method note:* when a defect survives a texture change, test whether it is the geometry before the third texture tweak.

**Shipped:** commit 21a1927 on `claude/slots-afro-hair`, build v107, `npm run check` and 32/32 smoke tests on source and on dist. No PR open.

**Frames:** `rd11` (first re-render), `rd12` (after the polish pass), `rd13` (final, the shipped build). **rd13 has not been audited**: a fresh ten-auditor re-audit is offered to the owner, not started.



### Round 9: one hundred blind auditors, the top 88% by weighted vote (owner's call, Oct 4)
**The owner's call (17:43):** "Let's do a bunch of 100 and do the top 88% of changes, but then we can examine the remaining together to help with logic." Answers to my two questions: 100 auditors on the new build (rd13); the cut by weighted votes (the remaining ~12% to be examined together).

**The panel (on rd13, the shipped v107):** 100 fresh auditors, same brief and packet, no sight of each other. **Mean 4.82, range 4.5-5** (round 8's ten: 4.9). Every auditor's ledger marked R1-R5 IMPROVED, yet the score did not move: the two blockers were the ones round 8 left (the torso, the face's form), which 85 and 94 auditors rated SEV 3.
**Platform limit learned:** at most 20 subagents run at once, so a 100-panel goes in waves of 20 (the first 30-agent launch lost a31-a40 and had to be re-run).

| Weight | Votes | SEV 3 | Cluster |
|---|---|---|---|
| 285 | 100 | 85 | COAT-TORSO |
| 284 | 95 | 94 | FACE-FORM |
| 231 | 100 | 31 | TOOTH (On a Tooth does not read) |
| 221 | 97 | 27 | HAIR-CURLS |
| 196 | 98 | 0 | CAPTION-CALL |
| 168 | 84 | 0 | JACKPOT-COLOUR |
| 135 | 67 | 1 | FRAME-CLIP |
| 128 | 65 | 0 | HANDS-GRIP |
| 113 | 57 | 0 | HAT-PLUME |
| 111 | 56 | 0 | HAT-FIT |
| 110 | 56 | 0 | DRAPES |
| (plus COAT-MATERIAL, LACE-JABOT, CONTACT-SHADOW, FACE-SKIN) | | | 15 ids in all = the 88% |

**Batch B (torso, velvet, jabot, hand grip, contact):** the torso is two lathe profiles (`PROF`, `PROFC`: broad shoulders tapering to a waist) at a shallower `DEP`, so the window, reels, ribbons, braid, jabot and buttons all follow without moving `SH` (round 8 had left this undone because moving the shoulders would have detached the IK arm). Shoulder caps close the sleeves; the coat gets a vertex-colour fall-off to the hem and a sheen velvet; the waistcoat is a darker damask. The lever has a mount flange, hub and brass cap, a bigger ball (`LEVER.ball` 2.2) and `HOLD.out` 3.15 so the fingers wrap it. The jabot loop is looser with a sag.
**Batch A (face, hair, hat):** the lower face is shortened in the head's vertex pass (not in the painted face's uv space, so the marks stay aligned); the jaw is rounder; cheeks, chin and lips fuller; the nose smaller and softer; stronger blush, socket and inner-corner shade; the skin carries its own tone through an emissive of its own map (0.13). Hair: 380 fat tapered clumps (not 480 thin wires), a darker undercolour and a longer root fade, temple curls so the cheek's edge is never bare. The plume is a transparent card of single faded barbs; the felt has a faint nap; a stronger brim shade on the forehead; the brim is 6% smaller.
**Batch C (light, camera, captions):** the Jackpot's gold is warmer (0xffa050), lower on the cloth (205 from 300) with its own small lamp on his face (150) and a ray plane drawn as 13 broad shafts blurred once; the close keys are pulled back so the hat stays whole (open 36x28, window shots 50x28 in portrait); On a Tooth holds on him whole (face, window, shut drawer) with the tier caption arriving at silence + 0.25 instead of after the reveal; the call title is hidden through the drawer shots and returns as the lens pulls out; the drape turns the corner along the room's back wall.

**Method notes for dro-skin-builder / audit-makes-perfect:**
- **A blocker that survives a round must be re-tried by a different route, not dropped.** The torso was left in round 8 because the obvious fix (moving the shoulders) broke the arms; reshaping the profile instead made every dependent part follow for free.
- **When a defect does not move under the fix you expect, find what is actually drawing it.** The drape's grey edge did not change when the drape was made 64% wider: the room's own back wall (a shared plane at world z -420, in a game's room) was cutting across it. The cure was to carry the cloth round a corner along that wall. Hand a room's fixed geometry to a game through `room`, not a magic number.
- **Fatter is not the same as fewer.** The first fatter hair read as horns and poked through the hat; looser turns, a lower rooting limit and a blunter tip fixed it. Check a thickened strand against the thing it sits under.
- **A bump on a dark cloth is a dot grid at 0.5**, a nap at 0.12. Ship the low value.
- **A contact-sheet script that globs a directory will pick up its own outputs.** `vault-sheet.png` landed in the B sheet and mislabelled the On a Tooth frames; name derived files outside the glob.

**Shipped:** commit d1fa1a4 on `claude/slots-afro-hair`, build v108, `npm run check` and 32/32 smoke tests on source and dist. No PR open.
**Frames:** `rd14` (all three batches, before the drape corner and the Tooth framing fix), `rd15` (final, the shipped build). **rd15 has not been audited.**

**The remaining ~9% for the owner and me to go through together:** COAT-SLEEVES, CAPTION-TIER, JACKPOT-LIGHT, HANDS-FORM, LACE-CUFF, FACE-EYES, MOTION, HAT-FELT, JACKPOT-OTHER, HAIR-LINE.

**Glow decision (owner, Oct 4 evening):** the quieter Jackpot light (v108) read as no moment at all. Four variants were rendered at the same frame (v107; A quiet; C hot but on the coat; D aura, with the halo and rays starting outside the torso). The lab renders without bloom, so a real phone is brighter than any of them. **The owner chose v107's glow** ("107 looks good"): shipped as v110 (commit after 65ddc86), which restores the v107 glow plane and light colours and strengths verbatim and drops the separate face lamp. On the new torso and velvet it does not turn the coat lime.
**Method note:** when an auditor's fix reads as a loss of the moment, show the owner a labelled strength dial (before / quiet / hot / aura) at one frame rather than guess; the screenshots could not separate A from C at all, because the glow plane hugs the torso, so the useful variant was the one that moved the gold off the cloth, not the one that turned it up. Put a tunable's numbers in one object so a dial is a one-line change.

### Round 10: twenty blind auditors on v110, the first round run as [ideas] (owner's call, Oct 4)
**The owner's call (22:09):** "Lets do an audit of the new build first then the tail. I want these 'considered changes' to be called [ideas] a-m-p passes the idea back to the builder's when successful increasing the logic of the builder." From here a considered change is an **[idea]**, and a successful one is passed back to dro-skin-builder as general logic.

**The panel (on rd16, the shipped v110 = v108 plus v107's glow):** 20 fresh auditors in one wave, a new packet (`packet-r10`: the v110 sheets, the 4.82 sheets under `previous/`, the same refs and brief, and the round-9 changes written up as twelve [ideas] I1-I12). **Mean 4.78, range 4.5-5** (11 gave 5, 9 gave 4.5; round 9 was 4.82). Flat. One auditor (a08) disclosed opening the ledger a step before writing its report; its findings were already drafted, so it stays in.
Note: the first Jackpot render (`vault`) came back NOT READY because it ran at the same time as the standard render; it was re-run alone. Run the tiers one at a time when a tier reports NOT READY.

**What moved (weight per auditor, flagged %, SEV-3 %; round 9 -> round 10):**

| Finding | Round 9 | Round 10 |
|---|---|---|
| COAT-TORSO | 2.85, 100%, 85% | 1.70, 75%, 20% |
| FACE-FORM | 2.84, 95%, 94% | 3.00, 100%, 100% |
| HAIR-CURLS | 2.21, 97%, 27% | 2.95, 100%, 95% |
| TOOTH | 2.31, 100%, 31% | 2.00, 100%, 0% |
| CAPTION-CALL | 1.96, 98% | 0.05, 5% |
| FRAME-CLIP | 1.35, 67% | 0.35, 20% |
| HAT-PLUME | 1.13, 57% | gone |
| DRAPES | 1.10, 56% | gone |
| LACE-JABOT | 1.07, 54% | 0.05, 5% |
| HAT-FIT | 1.11, 56%, 0% | 2.00, 90%, 20% |
| COAT-MATERIAL | 0.97, 49% | 1.95, 95% |
| CONTACT-SHADOW | 0.94, 49% | 1.85, 95% |
| HANDS-GRIP | 1.28, 65% | 1.50, 75% |
| JACKPOT-COLOUR | 1.68, 84% | 1.00, 50% |

**Why the score did not move.** Total weight per auditor is the same (26.2 then 26.05) because each auditor lists at most 12 findings: a fixed finding hands its slot to the next. The SEV-3 count per auditor is also the same (about 2.4 then 2.55) but the two blockers changed (torso + face, then face + hair). **The score stays at 4.5-5 while two SEV-3 findings remain; it should step up only when they go.** Face (20 of 20 SEV 3) and hair (19 of 20) are now both the first thing every auditor notices, and 11 of 20 also call out the long thin neck under the head (not yet targeted).

**The ideas ledger (round 9's changes, rated by the 20):**

| Id | Finding | Idea | Auditors' verdict (res / imp / unch / reg) | Finding before -> after | Status |
|---|---|---|---|---|---|
| I1 | COAT-TORSO | Reshape the torso lathe profile, not the shoulder joint | 0 / 20 / 0 / 0 | 2.85 -> 1.70; SEV-3 85% -> 20% | **passed to builder** |
| I2 | FACE-FORM, -NOSEMOUTH, -SKIN | Shorter lower face, rounder jaw, fuller cheeks, smaller nose, own-tone skin | 0 / 20 / 0 / 0 | FACE-FORM 2.84 -> 3.00 (still 100% SEV 3); FACE-SKIN 1.04 -> 0.30 | partial |
| I3 | TOOTH | Hold on him whole, tier caption arrives with the silence | 0 / 20 / 0 / 0 | 2.31 -> 2.00; SEV-3 31% -> 0%; still flagged by all 20 | partial |
| I4 | HAIR-CURLS | Fewer, fatter, tapered clumps, temple curls | 0 / 19 / 1 / 0 | 2.21 -> 2.95; SEV-3 27% -> 95% | partial |
| I5 | CAPTION-CALL | Hide the call title through the drawer shots | 20 / 0 / 0 / 0 | 1.96 -> 0.05 | **passed to builder** |
| I6 | FRAME-CLIP | Pull the close keys back so the hat is whole | 9 / 11 / 0 / 0 | 1.35 -> 0.35 | **passed to builder** |
| I7 | HANDS-GRIP, CONTACT-SHADOW | Lever mount, hub, cap, bigger ball, fingers wrap | 0 / 20 / 0 / 0 | 1.28 -> 1.50; none SEV 3 | partial |
| I8 | HAT-PLUME | Plume as a card of single faded barbs | 4 / 16 / 0 / 0 | 1.13 -> 0 | **passed to builder** |
| I9 | HAT-FIT | Stronger brim shade, a smaller brim | 0 / 18 / 2 / 0 | 1.11 -> 2.00; SEV-3 0% -> 20% | partial |
| I10 | DRAPES | Run the drape along the room's back wall | 20 / 0 / 0 / 0 | 1.10 -> 0 | **passed to builder** |
| I11 | COAT-MATERIAL | Hem fall-off, sheen velvet, darker damask waistcoat | 0 / 13 / 5 / 2 | 0.97 -> 1.95 | partial |
| I12 | LACE-JABOT | Looser jabot loop with a sag | 0 / 20 / 0 / 0 | 1.07 -> 0.05 | **passed to builder** |

No idea was reverted. **Success test (new, in the A draft):** the auditors' verdict is resolved or improved for at least 60% with at most 15% regressed, AND the finding really left (dropped off the list, or weight per auditor down by a third with no rise in SEV-3 share). Six ideas pass; six are partial because the auditors rated them improved while the finding stayed on the list. **Reading the evidence:** a neighbour's weight can rise only because a slot opened (see the cap note above), so a partial idea is *not proven to have failed*, only not proven.

**Next routes for the partial ideas (from the auditors' own fixes, not yet tried):**
- I2 face: real nostril, philtrum and lip geometry (not painted marks); a shorter, thicker neck; a low-frequency skin map (cheek flush, warm nose and ears, cooler temples).
- I4 hair: the fatter route did not work (19 of 20 want finer, tapered, varied ringlets, darker under-layer, roots hidden, blunt cut ends gone). Next: a dark under-cap plus a finer layer of strand cards over it, clumped into locks.
- I9 hat: sink the crown onto the hair mass; cast a brim shadow on the forehead and curls.
- I11 coat: the sleeves read bright kelly with a plastic sheen; darken them to bottle green with a grazing velvet sheen.
- I7 grip: the hand still lies on top of the ball; pose the wrap from the hand study.
- I3 tooth: a larger off-row stop, a visible pawl, a cooler dim of the room, a distinct freeze pose.

**The tail, with round-10 numbers (weight per auditor, flagged %):** CAPTION-TIER 1.45 (80%), JACKPOT-LIGHT 1.20 (60%), COAT-SLEEVES 1.15 (50%; SEV 3 for 15%), JACKPOT-OTHER 0.50, FACE-EYES 0.40, HANDS-FORM 0.40, MOTION 0.30, LACE-CUFF 0.10, HAIR-LINE 0.10, HAT-FELT 0. New: DESK-PROPS 0.80 (the leather blotter reads flat mauve through the drawer frames), FRAME-OTHER 0.60. The Jackpot: the lime coat is back in 10 of 20 reports (v107's glow, kept by the owner's choice) and all 12 who flag the light say it stays on the chest. That is the owner's direction against the auditors' wish; see the Glow decision.

**Changes to the skills (this round):**
- A (audit-makes-perfect): (1) the [ideas] vocabulary and the ideas ledger; (2) the success test and the pass-back to B, with *partial* and *reverted* as the other outcomes, and "a blocker that survives gets a new route"; (3) the panel method (a wave of up to 20, the closed id list, weighted votes, and how to read a tally given the 12-finding cap).
- B (dro-skin-builder), six ideas passed back, three paragraphs: **Shape a body from its profile** (I1); **Thin organic parts are strands, not solids** (I8, I12; the thickening-check from I4); and in the verify list, **find what is actually drawing a defect** (I10) plus two readability bullets, hide a title through close shots (I5) and fit the whole subject including headwear (I6).

**Plateau note (A's rule):** rounds 8, 9 and 10 held level (4.9, 4.82, 4.78) while their ledgers showed real gains. By the plateau rule this is where the loop would stop and report; the owner has asked for the tail next, so it goes on.

**Frames:** `rd16` (v110, audited). Packet `packet-r10`, results `results-r10/a01-a20.md`, tally `tally-r10.py`.


### Round 11: twenty blind auditors on v111, "face and hair first" (owner's call, Oct 4)
**The owner's call:** asked how to take the tail, the owner answered **"Face and hair first"**. Both were the first thing every auditor named in round 10 (FACE-FORM SEV 3 for 20, HAIR-CURLS SEV 3 for 19), and both had been tried once and survived, so each got a new route.

**The panel (on rd20, v111 = f19408c):** 20 fresh auditors in one wave, packet `packet-r11` (the v111 sheets, the v110 sheets under `previous/`, the same refs and brief, and two [ideas] I13 and I14). **Mean 4.80, range 4.5-5** (12 gave 5, 8 gave 4.5; round 10 was 4.78). Flat again.

**Found and fixed before the audit (the pre-check step):** the first v111 render showed black specks floating on the forehead at 3x. I suspected the hair cap's dither and made its cells finer; nothing changed. What was drawing them was fringe locks aimed into the skin, so only their near-black roots showed. Fix: fringe locks grow outward from the skin, start a little inside the hair edge, and their root colour is a warm brown. This is the "find what is actually drawing a defect" rule again, and it is now in B as "a lock must clear the surface it grows from".

**What moved (weight per auditor, flagged %, SEV-3 %; round 10 -> round 11):**

| Finding | Round 10 | Round 11 |
|---|---|---|
| HAIR-CURLS | 2.95, 100%, 95% | 1.65, 80%, 5% |
| FACE-FORM | 3.00, 100%, 100% | 2.85, 95%, 95% |
| FACE-SKIN | 0.30, 15% | 1.10, 55%, 5% (up) |
| FACE-NOSEMOUTH | 0.35, 20% | 0.35, 15%, 5% |
| HAIR-LINE | 0.10, 5% | 0.60, 30% (up) |
| COAT-TORSO | 1.70, 75%, 20% | 1.90, 85%, 20% |
| HAT-FIT | 2.00, 90%, 20% | 1.85, 85%, 15% |
| COAT-MATERIAL | 1.95, 95%, 5% | 1.65, 80%, 5% |
| COAT-SLEEVES | 1.15, 50%, 15% | 1.00, 45%, 10% |
| TOOTH | 2.00, 100%, 0% | 2.00, 100%, 0% |
| CONTACT-SHADOW | 1.85, 95% | 1.80, 90% |
| JACKPOT-OTHER | 0.50, 25% | 1.40, 70% (up) |
| JACKPOT-COLOUR | 1.00, 50% | 0.25, 15% |

SEV-3 findings per auditor fell from 2.55 to 1.60 (face 19, torso 4, hat fit 3, sleeves 2, then one each of hair, material, skin, nose and mouth), yet the mean did not move. **19 of 20 auditors' "single biggest change" is the face** (the twentieth says the torso). So the count of SEV-3s is not what holds the score; the one every auditor names first is.

**The ideas ledger (round 11):**

| Id | Finding | Idea | Auditors' verdict (res / imp / unch / reg) | Finding before -> after | Status |
|---|---|---|---|---|---|
| I13 | HAIR-CURLS, HAIR-LINE | Each ringlet a lock of three fine strands wound together, each tapering to a closed point; darker brown; denser under-layer; a fringe that sweeps and grows outward from the hairline in warm brown | 0 / 20 / 0 / 0 | HAIR-CURLS 2.95 -> 1.65 (down 44%); SEV-3 95% -> 5% | **passed to builder** (B section 2, "Thin organic parts") |
| I14 | FACE-FORM, -NOSEMOUTH, -SKIN | Nose with pits, wings and creases; fuller lips, cheeks and chin; richer skin paint; a thicker neck; the head 0.6 lower | 0 / 20 / 0 / 0 | FACE-FORM 3.00 -> 2.85, SEV-3 100% -> 95%; FACE-SKIN 0.30 -> 1.10 | **partial**, with a side effect |
| I4 | HAIR-CURLS | (round 9's fat-tube route) | n/a | replaced by I13 | superseded by I13 |

I14 was rated improved by all 20 and still left the face as a SEV 3 for 19. **Why, from the auditors' own words:** they describe *proportion*, not missing detail: a long, narrow head, a long nose, a tiny pursed mouth, a narrow or pointed chin, and still "a long thin neck, a column" (11 of 20 in round 10, about half in round 11). The idea added detail (nostrils, lips, paint) and moved the proportions only a little. The skin paint also raised a new finding: the round rosy cheek patches read as porcelain (the owner ruled porcelain out), and the face colour drifts between frames, pale in A1 and rosier in A7 and B5/B6.

**Next route for I14 (not yet tried), a proportion pass:** a child's head is a big, rounder cranium over a short, small lower face, with the eyes near the middle of the head. So: shorten the nose-to-chin distance and widen the jaw and chin (the jaw taper is what makes it long and pointed); make the cheeks fuller at the sides, not only the front; set the neck short and wide enough to sit in the collar (no visible column; hide it under the chin and ruff); replace the round blush patches with one low-frequency warm flush; and keep the skin tone the same across frames (the warm key and the 0.13 emissive both tint it).

**Next routes for the other partial ideas** (unchanged, none tried this round): I9 hat (sink it onto the hair mass, brim shadow on the forehead); I11 coat sleeves (darker bottle green, a grazing velvet sheen); I7 grip; I3 tooth (it is still flagged by all 20; the auditors say the room does not go visibly silent or dim). Remaining hair note: most of the 16 who still flag the curls call them "uniform, one scale"; the next hair route is larger lock clumps of varied size (some wide ringlets among the fine ones), then the fringe as separate baby-hair strands at the roots.

**The tail, round-11 numbers (weight per auditor, flagged %):** TOOTH 2.00 (100%), HAT-FIT 1.85, CONTACT-SHADOW 1.80, CAPTION-TIER 1.40 (75%), JACKPOT-OTHER 1.40 (70%; the overflow is a tidy heap that never spills over the lip), JACKPOT-LIGHT 1.30, HANDS-GRIP 1.30, COAT-SLEEVES 1.00, DESK-PROPS 0.40, FRAME-OTHER 0.20, MOTION 0.40, FACE-EYES 0.40, HANDS-FORM 0.60. Not started; the owner wants to take it together.

**Changes to the skills (this round):**
- B (dro-skin-builder): I13 passed back, two bullets under "Thin organic parts are strands, not solids": hair and curls are locks of strands (with a dark under-layer), and a lock must clear the surface it grows from (aim it outward, start it inside the edge, no near-black root on skin). Tag `[ideas I8, I12, I13, slots r9-r11]`.
- A (audit-makes-perfect): two evidence notes. (1) Reading a tally: a fall in the count of SEV-3s is not enough; the step comes when the finding every auditor names first goes. (2) Under "a blocker that survives gets a new route": match the route to the kind of defect in the auditors' own words (proportion, detail, material, light).

**Plateau note (A's rule):** rounds 9, 10 and 11 held level (4.82, 4.78, 4.80) while their ledgers showed real gains, so by the plateau rule the loop would stop and report here. The score is held by one finding, the face's proportions, which every auditor names. The owner's plan (face and hair, then the tail together) goes on.

**Frames:** `rd20` (v111, audited; `rd18` was the first candidate with the forehead specks). Packet `packet-r11`, results `results-r11/a01-a20.md`, tally `tally-r11.py`. Commit f19408c on `claude/slots-afro-hair`; no PR open.

### Rounds 12-20: audit chat 2 (Oct 5-6), face first, then the tail, then the plateau test and the final

Scores (20 blind auditors unless noted): v112 4.78 (I15 face proportion, partial) · v113 4.62 (I16 skin, partial with a side effect) · v114 **4.85** (I17 skin shader and tone lock; skin SEV-3 14 -> 3) · v115 4.45 (I18 whole-face pass, unchanged) · v116 4.55 (I19-I22: coat near-pass, I20 no effect, I21 tooth partial, I22 torso no effect) · v117 4.50 (I23 hair as strand cards, strong partial, hair SEV-3 17 -> 9; I24 tooth partial; I25 torso no effect; I26 coat) · v117 five-auditor plateau read 4.60 · v118 4.67 (plateau test: I27-I38, every finding of the five-auditor read worked; owner's direction: realistic-face retry, body 12% narrower, lever on the desk rail, jackpot light reaching face and desk) · v119 **4.50, 20 of 20 at 4.5** (final: I29 reverted).

Plateau-test verdicts (N=20): I27 body narrowed 15/5/0 SUCCESS · I28 velvet pile 7/13/0 · I29 hair rounded 0/10/10 **REGRESSED, reverted** · I30 lever mount 6/14/0 · I31 drapes 11 resolved + 8 improved SUCCESS · I32 hat seat 7/13/0 · I33 pull weight 8/12/0 · I34 jackpot light 11/9/0 · I35 tooth framing 19/0/1 SUCCESS · I36 hands 5/15/0 · I37 eyes and cheeks 9/11/0 · I38 tier caption 20 resolved SUCCESS. Final-audit verdict on the revert (I39): 10/8/2, hair SEV-3 17 -> 12, score unmoved.

Weight and SEV-3 across the last three 20-auditor rounds: 513/47, 509/50, 514/53. The remaining SEV-3s at v119: COAT-TORSO 17, FACE-FORM 15, HAIR-CURLS 12, FACE-SKIN 4, FACE-EYES 3. Every one of the final 20 names the same single change: a sculpted realistic child's head with real ringlet hair; three add the torso.

**Passed to B:** I17 (skin value floor and shadow tint), I27 (a child's trunk is narrow; profile tuning has a floor), I31 (backdrop runs past every edge), I35 (a tight beat frames the whole mechanism), I38 (tier caption on a pill). **To A:** one auditor per round and a panel of three for the plateau check and the final (owner's call, Oct 6); form holds the score, paint moves its own cluster; dead-end routes (strand-card hair, lathe-profile tuning) not retried as variants; mixed ideas kept but never passed; regressed ideas reverted in the same round; a wide shallow round reads as a rise once and falls back.

**State:** `claude/adoring-cerf-6dakad` (PR #168, draft) and `claude/slots-afro-hair` at 783b58f, build almanac-v119, CI green. Lab packets r12-r20 and results in the session scratchpad; `lab/frameset-seq.sh` and `lab/sheets.py` updated here (B5 is `call+0.2`, the D1 crop box moved 7 px right for the narrower body).
