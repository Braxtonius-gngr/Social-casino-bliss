---
name: "audit-makes-perfect"
description: "Raise a Daily Roll Over build's audit score by feeding review findings back into dro-skin-builder, retrying until a fresh audit gives 9/10 or progress caps out. Use when the user says \"audit makes perfect\"."
---

# Audit makes perfect

Turn audit feedback into lasting improvements to **dro-skin-builder** (call it
B). Each improvement starts as an [idea] tried on the audited piece, is proven
by auditing again, and only then goes back into B. When [ideas] stop raising
the score, improve this skill's own method (call it A) and try again. Stop at
the target score or when progress caps out, then show the whole workflow and
every [idea].

**Vocabulary.** A considered change is an **[idea]**. An [idea] is one change
tried against one finding. It has an id (I1, I2, ...), the finding ids it
answers, the general logic it rests on, and a status: *proposed*, *tried*,
*partial*, *reverted* or *passed to builder*. When an [idea] proves itself on the
piece, this skill **passes it back to B** as general logic, so the next piece
starts with it already built in. B only ever gains ideas that worked.

Defaults (the user may override any of them when invoking):
- target: **9/10**
- cap: **2** rounds in a row of [ideas] for A itself without a rise
- a rise: at least **+0.5** over the best score so far (fresh auditors vary
  by about that much, so less is noise; a 20-auditor mean that rose +0.17
  on a spread of four 5s fell back to a unanimous 4.5 the next round)
- auditors: **one** fresh auditor per round; a **panel of three** only for
  the plateau check and the final audit (below). Wider panels only when the
  owner asks for one by name.
- budget: **8** rounds, then stop as if capped

## 0. Set up

1. **Name the piece** being improved (e.g. the slots landing game), its repo,
   branch and PR, and read the repo's AGENTS.md. Read B's and A's current
   SKILL.md (the synced copies under `~/.claude/skills/`).
2. **Working drafts.** Skills are only saved when the user approves a review
   card, so the loop never edits the installed skills. Copy both SKILL.md
   files into the Project as drafts with `project_write`:
   - `claude/skill-drafts/dro-skin-builder.md`
   - `claude/skill-drafts/audit-makes-perfect.md`

   If drafts from an earlier run exist, ask whether to continue from them or
   start fresh. From here on, **the drafts are the live instructions**: rework
   the piece by following the B draft, and run the loop by following the A
   draft (re-read it at the start of every round).
3. **Run log and ideas ledger.** Start `claude/skill-drafts/run-log.md`. Each
   round gets the score, the top findings, and its [ideas] (below). The
   machine copy of the ledger is the lab's idea bank (`lab/ideas.json`,
   section 1b), read before every round; keep the readable
   **ideas ledger** as one table in the log, one row per [idea]:
   `id | round | finding ids | the idea | status | evidence`. Evidence is the
   auditors' verdict tally (resolved / improved / unchanged / regressed) and
   the finding's weight per auditor and SEV-3 share, before and after. A
   status changes in place; the row is never deleted, so reverted ideas stay
   on record and aren't tried twice.
4. **Fix the frame set** once, and render exactly the same frames for every
   plateau check and the final so scores compare (rounds between them render
   only their targets, section 1b). Use phone portrait 390×844 and landscape 844×390, and
   cover the open, every key beat, every tier's deciding moment, the payout,
   the wide, and two 3× crops. Write the list into the run log.
5. **Task list.** One task per round and one for the report, so the user can
   follow along.

## 1. The audit (fixed every round)

- **A fresh auditor each round.** Spawn a new subagent that has not seen the
  work or any earlier audit. Never reuse one; reused auditors drift lenient.
- **What it gets:** the rubric below (verbatim), this round's contact sheets,
  the previous round's sheets and score as an anchor, and the reference
  frames of the R×R card table (the 7/10 bar). From round 2 on, it also gets
  the previous round's [ideas]: what each did and which finding it answered.
  - It reads them only after its own findings are written, so they can't
    shape what it sees.
  - It rates each [idea] resolved, improved, unchanged or regressed against
    the previous round's frames, before scoring.
  - It doesn't reverse a choice the previous round made in answer to a
    finding (e.g. a catchlight in place of a recolour) unless the result is
    worse. Fresh auditors otherwise ask for opposite fixes and the loop
    chases noise.
- **One auditor, except at the plateau check and the final.** One fresh
  auditor is the round's read. Judge the round by its **ledger verdicts and
  the per-finding SEV**, not by the mean alone: one auditor's score is
  quantised to half points, so the finding tags are the signal and the score
  is the tie-break. For the **plateau check** (rule 6) and the **final audit**
  (section 3), run a **panel of three** fresh auditors at once, same packet,
  blind to each other; read the majority ledger verdict and the median score.
  Twenty-auditor waves (up to 20 at once; the platform loses subagents past
  that) are an owner's call, for a ranked cut of findings only; eleven such
  waves on one piece showed the mean sitting at the mode and the extra eyes
  adding spread, not information.
  - Findings use a **closed list of issue ids** (one per surface or defect
    family, plus OTHER), so a script can tally them (`lab/tally.py`). A
    finding's weight is the sum of its SEV over the panel; its SEV-3 share is
    how many put it first.
  - **Reading a tally.** Each auditor lists at most 12 findings, so the total
    weight per auditor stays roughly constant: when a finding is fixed it
    hands its slot to the next one, and a neighbour's weight can rise with no
    change to the neighbour. Judge an [idea] by the ledger verdict, by whether
    its finding left the list, and by its SEV-3 share, not by a raw weight
    alone. The mean holds level while the same number of SEV-3 findings
    remain, even as they change. A fall in the *count* of SEV-3s is not
    enough: when SEV-3s per auditor fell by a third with the face still SEV 3
    for 19 of 20, the mean did not move. Expect the step when the finding
    every auditor names first goes (ask each for its single biggest change,
    and read the majority).
  - **Form holds the score; paint moves its own cluster.** Over nine rounds
    on one piece, shader and material passes cleared their clusters (skin
    SEV-3 14 to 3, coat 13 to 0) and the mean never left 4.5 to 4.85. The
    findings that held it were form: head shape, hair as flat cards, a lathe
    torso. When the top SEV-3s are form ids (FACE-FORM, HAIR-CURLS,
    COAT-TORSO), the round's [ideas] must change geometry; a shading [idea]
    aimed at a form finding is logged as *proposed* and skipped.
- **Rubric.** Score 1-10, half points allowed, on set-baseline-intensive's
  checks: three distances (silhouette, arm's length, 3× pinch), light,
  contact, motion with weight, plus readability (titles, captions, overlays)
  and whether each tier's moment reads.
  - **10:** nothing reads fake at any distance or frame.
  - **9:** polished. A viewer can't point at a flaw without pinching in.
  - **7:** meets the R×R card-table bar. Credible and shippable, with a few
    flaws visible at arm's length.
  - **5:** reads as intended but is plainly CG in places.
  - **3:** broken or confusing.
- **What it returns:** one score, then findings most severe first. Each
  finding gives the frame, what's wrong, a concrete fix, and a tag:
  - **execution:** fixable in the piece
  - **method:** a gap in how the build was done or checked
  - **direction:** needs the owner's taste or a reference

## 1b. The efficient round (one auditor, targeted frames)

Between the baseline and the plateau check, a round costs one targeted
render, one pre-screen and one auditor. The tooling is in the lab branch
(`lab/README.md`); the order is fixed:

1. **Ask the bank before proposing.** Every [idea] has a *route*: geometry,
   material, light, camera, overlay or motion. Run the form gate and the
   dead-end check (`ideas.py check <route> <clusters>`) before writing the
   [idea] down:
   - a **form** finding (clusters.json kind `form`: head, hair, torso,
     sleeves, hands, props) takes a geometry route only. A paint, shading or
     light [idea] aimed at a form finding is refused: nine rounds of them
     read "improved" and left every form finding at SEV 3.
   - a route already *reverted*, *no-effect* or *regressed* on that cluster is
     not retried as a variant; the next [idea] changes the construction.
   Then `ideas.py add` logs it as *proposed*. The bank (`lab/ideas.json`)
   outlives the piece: the next piece's builder reads it before its first
   round, so a dead end costs one piece one round, not every piece one round.
2. **Render the target only.** `render-targets.sh <out> CLUSTER...` renders
   the frames that show the clusters being worked (two to five shots, two to
   three minutes) instead of the full set (twenty-five shots, ten minutes).
   The full frame set is rendered only for the plateau check and the final.
3. **Pre-screen before spending an auditor.** `prescreen.py <prev> <cur>
   CLUSTER...` prints, per cluster crop, the metric it is tagged with and the
   direction an improving round should move it (skin: spread up and median
   steady; hair: edge density down; torso: silhouette width down; jackpot:
   green share held), plus the whole-frame change. Two reads:
   - the targeted crop did not move, or moved against its direction: rework
     within the same [idea] before any auditor;
   - an untargeted frame moved more than the targeted crop: find out why
     (a shared material, a reshuffled random stream) before any auditor.
4. **One auditor, paired.** `pair.py make` builds blind left/right pairs of
   the previous and current crop per cluster, in a random order whose key
   sits outside the packet. Look at each pair image yourself before the
   auditor does: if the crop does not plainly contain what the [idea]
   changed, fix the cluster's box in `clusters.json` and rebuild the pairs
   (a torso crop that began below the shoulders made a shoulder round
   unjudgeable). The auditor (brief: `lab/brief-single.md`)
   answers the pairs first (LEFT, RIGHT or SAME; the KIND of difference,
   form, material, light or none; and why), then writes findings on the
   current frames, then one **TARGET** line: whether the
   piece is closer to the owner's target than last round, and in what one
   respect it most falls short. A paired "which is closer" is a far finer
   instrument than a 1 to 10 score quantised to half points, and the TARGET
   line shows direction drift a round earlier than the score does.
5. **Decode and record.** `pair.py decode <key> <report> <route>` turns the
   answers into PREV-BETTER, CUR-BETTER or SAME per cluster and flags a
   CUR-BETTER whose kind is not the [idea]'s route (a geometry [idea] praised
   for its sheen has not moved its finding); `ideas.py set` records the
   status with the auditor's words (the panel path uses `ideas.py verdict`
   on the LEDGER lines). Decide the [idea] by section 2 rule
   5 with CUR-BETTER counting as improved and PREV-BETTER as regressed. A
   regressed [idea] is reverted before the next render.
6. **The score is for the plateau check and the final.** A single auditor's
   score is recorded but does not decide a round; the pairs and the bank do.
   Three kept rounds with no PREV-BETTER and no cluster leaving the SEV-3
   list trigger the plateau check (rule 6), which runs the full frame set and
   a panel of three.

## 2. The loop

**Round 0, baseline.** Render the frame set as the piece stands, audit it,
and record S0. If S0 already meets the target, stop and report.

**Direction first.** If a `direction` finding ranks in the top two, or the
same one comes back in two audits, stop and ask the owner before the next
round, with the references that would settle it. Rounds spent working round
a missing decision don't move the score.

**Each round after that:**

1. **Choose 1-3 [ideas]** that would have prevented the top findings.
   - **Depth over breadth.** Rank findings by how many frames they appear
     in, times their severity. Aim the round's [ideas] at the top one or two,
     and rework them until they are gone, not merely improved. A round that
     answers eight findings shallowly moves the score less than one that
     removes the worst. A round that worked twelve small findings at once
     (slots r19) read +0.17 and fell back to the mode the next round. (The owner may widen the round, e.g. to the top cut of
     a panel; then take the ones that cut names.)
   - **A blocker that survives gets a new route, not a repeat.** If the same
     finding is still on top after an [idea], the next [idea] changes the means
     (a different construction, not more of the same). Read the ledger first:
     a *reverted* row is not tried again, and a *partial* row continues by its
     next route. Routes that plateaued on the slots piece and are not retried
     as variants: hair as alpha strand cards (three variants, I23, I29, I39:
     hair SEV-3 17 to 9 to 17 to 12, no score effect; the next route is tube
     ringlets with roots and occlusion), and tuning a lathe torso's profile
     (I22, I25, I27: still "an egg" for 17 of 20; the next route is a
     shoulder line and a coat opening as their own geometry).
   - **Match the route to the kind of defect.** Read the auditors' own words
     for what is wrong: proportion (long, narrow, small, too big), detail (no
     nostrils, flat), material or light. A route of another kind does not move
     the finding: a face described as "long, narrow, tiny-featured" kept its
     SEV-3 after a round that added nostrils, lips and skin paint (all 20 rated
     it improved), and the paint raised a new finding (round blush read as
     porcelain).
   - Write the [idea] as general logic first (a rule, a check, a reordered
     step), then the piece-specific change that carries it out.
   - Each [idea] names the findings it answers and its expected effect.
2. **Log each [idea] in the ideas ledger** as *proposed*.
3. **Try them on the piece** and commit to its branch. Follow the B draft
   where it already has a step for the work; where it doesn't, the [idea] is
   the step (a finding that needs a fix B doesn't call for is a gap in B).
   Mark them *tried*. Leave `direction` findings for the report.
4. **Pre-check before the audit.** Render the frames the targeted findings
   name, plus a 3× crop of each. Put them side by side with the same frames
   from the previous round and judge each one honestly:
   - Is the finding gone?
   - Has anything nearby regressed?

   Before the audit, also put the **whole frame set** side by side with the
   previous round's. Zoom 2× on every surface whose shader or geometry
   changed this round, in every frame it appears in, not just the targeted
   ones. A new material or a new fold shows its artifacts (banding, facets,
   a grazing-angle colour shift) in frames nobody was looking at.

   If either answer is no, keep reworking (still within the same [ideas])
   before spending a full render and audit. Then re-render the frame set,
   audit with a fresh auditor (or a panel), and record Sr.
5. **Decide each [idea], then the round.**
   An [idea] is **successful** when both hold:
   - the auditors' ledger rates it resolved or improved for at least 60% of
     them, and regressed for no more than 15%
   - its finding really left: it dropped off the list, or its weight per
     auditor fell by a third or more with no rise in its SEV-3 share

   Then, for each [idea]:
   - **Successful: pass it back to B.** Write it into the B draft as a rule or
     step in B's own voice, in the section where the next builder needs it,
     with no names or numbers that fit only this piece. Tag it
     `[idea I<n>, <piece> r<round>]`. Set its status to *passed to builder*
     with the B section.
   - **Partial** (rated improved, but its finding is still on the list at
     much the same weight): keep it in the piece, don't pass it, and write the
     **next route** in its row. The finding is next round's target.
   - **Mixed** (improved for 30 to 55%, regressed for none): keep it in the
     piece and don't pass it. Eleven such ideas in one round were safe and
     cheap and raised nothing; they are not a route to the step.
   - **No effect, or regressed:** revert it in the piece **in the same round,
     before the next audit**, set *reverted*, and keep the evidence. A
     regressed idea is never carried into the next round's base.

   Then the round, by its score Sr:
   - **Sr ≥ target:** done. Go to the report.
   - **Sr rose** (+0.5 or more over the best so far): keep the round and reset
     the cap count.
   - **No rise, but it got better:** keep the round when two things hold:
     - the auditors' ledger shows real gains (more [ideas] resolved or
       improved than regressed)
     - nothing regressed considerably, meaning no new finding at the top of
       the list and no tier moment that read before and doesn't now

     Keep the piece's rework, fold small regressions into the next round's
     targets, and leave the cap count where it is. A score that lags a visible
     improvement is often auditor noise, and throwing the gain away loses
     ground the next round must win again.
   - **No rise and no real gain** (or a considerable regression): revert this
     round's [ideas] in the piece to its best-scoring commit (nothing is passed
     to B).
     1. Choose 1-3 [ideas] for A itself: this skill's own method, aimed at
        why the round's [ideas] didn't move the score. For example: how
        findings are read and grouped, how [ideas] are chosen, how big a rework
        is, the frame set, the auditor's brief (never the rubric's scale, so
        scores stay comparable).
     2. Log them and add 1 to the cap count.
     3. If the cap count reaches the cap, the run is **capped**. Go to the
        report.
     4. Otherwise retry the round under the amended A draft.
6. **Plateau:** if the score holds level through three kept rounds in a row
   while their ledgers show real gains, run the **plateau check**: one round
   that works every finding the last read raised (asking the owner where a
   finding needs direction), then a **panel of three**. If the median rises
   by the rise threshold, keep the round's non-regressed [ideas] and go on;
   if not, the rubric's half points can't see what is left without a bigger
   change. Stop and report as capped, with the ledger's evidence, the
   direction questions, and the **single change the auditors name** (on the
   slots piece, 20 of 20 named the head: a sculpted realistic face and real
   ringlet hair), rather than spend the budget.
7. **Budget:** at 8 rounds, stop and report as capped.

## 3. Stop and report

At the target or capped, run the **final audit** as a panel of three fresh
auditors on the piece as it stands (the kept rounds, regressed [ideas]
reverted), then stop and show the user:

1. **The workflow:**
   - a chart of the score per round
   - a short table of rounds: score, each [idea] in a line, its status
     (passed to builder, partial, reverted) and the finding it answered
   - the ideas ledger: what went back to B, what is partial and its next
     route, what was reverted
   - before and after contact sheets (round 0 against the best round)
2. **If capped:**
   - what the auditor still flags and why the method couldn't move it
   - the `direction` findings, with the visual or effect-styling references
     that would settle them, asked as a question
3. **The [ideas] that went back, as review cards:** call `propose_skills` once with up to
   two improvements, the full final B draft (target `dro-skin-builder`) and
   the full final A draft (target `audit-makes-perfect`). Skip either one if
   it has no kept [ideas]. Saving them is the user's call.
4. **The piece:** where its branch and PR stand, with key frames from the
   best round.

## Guardrails

- Never edit the synced skill files on disk. Drafts only; the user saves
  through the review cards.
- At most 3 [ideas] per skill per round unless the owner widens it, each
  traceable to an audit finding. Only a successful [idea] reaches B; B gets no
  unproven rules.
- Keep the piece's own PR workflow: B's ship steps still apply after the
  loop (checks, smoke tests on source and dist, attribution, rebase past
  main).
- Keep updates short: a line per round (score, what changed, kept or
  reverted). The report at the end is the full account.