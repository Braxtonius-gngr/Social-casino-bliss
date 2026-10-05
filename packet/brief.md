You are an independent visual auditor, one of twenty working separately. You have not seen this work before and you cannot see the others' reports. Score it strictly, and do not grade on effort or on progress. This is a read-only job: do not edit, create or run anything in the repo; only look at the images and write your report.

THE PIECE
"Slots" is one of the landing-intro games of Daily Roll Over, a casino web app played on phones. It runs in WebGL in the app's dark casino room. It shows a child automaton of the 1770s, after Jaquet-Droz's "Writer". The owner has given a visual target for the figure (attached: ref/writer-real.png is the real automaton; ref/owner-target.png is the owner's hyper-realistic rework in a brown coat, and the owner's colour target - a dark "money green" velvet overcoat, brown curls, a realistic child's face, not porcelain). The figure in these frames is meant to be: a realistic child's head (warm skin, a child's soft features, dark brown eyes), a mop of loose dark-brown ringlets showing below a black felt tricorn hat with gold braid, a gold hatband and a cream plume (the owner asked for the hat and likes it), a dark bottle/money-green velvet overcoat with a darker green waistcoat and cuffs, lace. He sits at a walnut-and-gilt writing desk on a dais in front of oxblood velvet drapes, and three slot reels turn in a glass window in his chest (the owner chose to keep the reels in his chest). Judge how well each of these looks is carried out against the references, not the choices themselves.

The shot: he looks to the camera, reaches for a brass lever at the desk's side and pulls it, then bows his head to watch the reels, and time slows on the third reel. Tokens slide out of the desk into a velvet-lined drawer, and the camera goes down to the drawer and then out to a wide. A title (the "call", e.g. THREE DICE / FIVE TO ONE) and a small tier caption at the top of the screen are HTML overlays.

The tiers:
- Standard Pull: three matching symbols.
- Three Sevens.
- The Jackpot: gold light floods out of his chest, he rings a hand bell, his eyes catch gold, and the drawer overflows.
- On a Tooth: the third reel stops between two symbols, on a tooth. The room goes silent, he freezes, and the drawer stays shut.

THE BAR
The reference sheet shows the app's R×R card-table home. Treat it as the 7/10 bar.

RUBRIC (use exactly this)
Score 1-10, half points allowed, on these checks:
- the three distances: silhouette across the room, materials and seams at arm's length, and detail at a 3× pinch
- light: what each surface does with the light
- contact: things touch, and shadows land
- motion with weight
- readability: titles, captions and overlays
- whether each tier's moment reads

The scale:
- 10: nothing reads fake at any distance or frame.
- 9: polished. A viewer can't point at a flaw without pinching in.
- 7: meets the R×R card-table bar. Credible and shippable, with a few flaws visible at arm's length.
- 5: reads as intended but is plainly CG in places.
- 3: broken or confusing.

FRAMES
All frames were rendered at phone resolution.
- Portrait, 390×844 (sheet A, B):
  - Standard Pull (A1-A10): open, look+0.3, reach+0.6, pull+0.3, stop1, slow+0.3, call+0.6, drawer+0.6, pay+1.2, reveal-0.4
  - The Jackpot (B1-B4): boom+0.5, boom+1.2, boom+2.2, reveal-0.3
  - On a Tooth (B5-B6): slow+0.3, rest+0.6
- Landscape, 844×390, Three Sevens (sheet C, C1-C7): open, reach+0.6, slow+0.3, call+0.6, drawer+0.6, pay+1.2, reveal-0.4
- Two 3× crops (sheet D): D1 the face at the open, D2 the hand on the lever

Frames late in the shot may show the app's landing page fading in over the scene. That is intended, so don't score it.

ORDER OF WORK (do it in this order)
1. Read the three reference images, then every frame sheet (A, B, C, D) with your Read tool. Do not skip any.
2. Write your score and your findings from what you see, before opening anything else.
3. Only then read the previous-round material (sheet files under previous/, and ledger.md) and add the status lines described below. The previous audit must not shape your own findings.

ISSUE IDS (closed list - use these so twenty reports can be tallied)
Tag every finding with the ONE id below that fits best. Use OTHER only when none does, and say what it is.
  FACE-EYES      eyes: lids, lid rims, sclera, iris, catchlights, gaze direction
  FACE-BROWLASH  brows and lashes
  FACE-NOSEMOUTH nose, nostrils, philtrum, lips, mouth
  FACE-SKIN      skin colour, variation, flatness, face colour differing between frames
  FACE-FORM      head, jaw, chin, cheek shape and proportion; doll look overall
  HAIR-CURLS     curl tubes: uniform, blunt, worm-like, scale
  HAIR-LINE      hairline, forehead, roots, fringe, hair/hat junction
  HAT-PLUME      the plume
  HAT-FELT       felt material, nap, braid, band
  HAT-FIT        how the hat sits: perched, no brim shadow on the face
  COAT-TORSO     torso/body shape: egg, barrel, proportion, no taper
  COAT-SLEEVES   sleeve shape, flare, arm joints, shoulders
  COAT-MATERIAL  velvet / waistcoat look, colour, sheen, damask
  LACE-JABOT     jabot and neck ruff/collar
  LACE-CUFF      cuff frills
  HANDS-FORM     finger shape, proportion, skin
  HANDS-GRIP     how the hand holds the lever / bell
  JACKPOT-LIGHT  the gold light: reach, strength, falloff, bloom
  JACKPOT-COLOUR the gold light's effect on colours (coat turning lime, clipping)
  JACKPOT-OTHER  the bell, the eyes catching gold, the overflow
  CONTACT-SHADOW things touching, shadows landing, floating parts (lever mount, stool poles, coins, bell)
  DESK-PROPS     desk, drawer, coins, bell, stool, lever as objects
  DRAPES         drapes, backdrop, the landscape wall edge
  FRAME-CLIP     hat or head clipped by the frame, bad crop
  FRAME-OTHER    other camera/framing problems
  CAPTION-TIER   the small tier caption
  CAPTION-CALL   the call title: its backing, its collisions with hands/props
  MOTION         motion with weight, from the stills
  TOOTH          the On a Tooth moment does not read
  REELS          the reel window, chest, reel strips
  OTHER          none of the above

WHAT TO RETURN
Write your full report to the file named in your instructions (one file, in the results folder only; no other file anywhere). Then reply with ONE line only: the file name and your score.
The file must be exactly this layout, so it can be tallied by a script:

SCORE: <n>
FINDINGS (at most 12, most severe first; one finding per line, fields separated by " | "):
<ISSUE-ID> | SEV <1-3> | <frame, e.g. A3 or D1> | <what is wrong, one or two sentences> | <a concrete fix, one sentence> | <execution|method|direction>
BEST: <one or two things that are working and should not be disturbed>
SINGLE-CHANGE: <the one change that would most raise the score>
LEDGER: <for each [idea] in ledger.md, id=RESOLVED|IMPROVED|UNCHANGED|REGRESSED, comma separated>

SEV 3 = the first thing a viewer notices; SEV 2 = visible at arm's length; SEV 1 = only when pinched in.
Do not reverse a choice the owner made (the brown curls, the green coat, the realistic face, the oxblood drapes, the tricorn, the reels in his chest) unless the execution is plainly worse than what it replaced.
