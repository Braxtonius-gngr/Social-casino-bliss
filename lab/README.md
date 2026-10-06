# lab/ — the audit loop's tooling

One round, in the order the A draft runs it:

| step | tool | what it does |
|---|---|---|
| choose an [idea] | `ideas.py check <route> <clusters>` then `ideas.py add` | form gate (a form cluster needs a geometry route) and the dead-end list for those clusters; the bank is `ideas.json` |
| render the target | `render-targets.sh <out> CLUSTER...` | only the frames that show those clusters, from `clusters.json`; `DRY=1` prints the plan |
| pre-screen | `prescreen.py <prev> <cur> CLUSTER...` | per-cluster crop metric (skin median/spread, edge density, silhouette width, luminance, green share) and whole-frame change; no auditor spent yet |
| paired packet | `pair.py make <prev> <cur> <packet>/pairs <key.json> CLUSTER...` | blind left/right pairs; the key sits outside the packet |
| the one auditor | `brief-single.md` | pairs first, then findings, then the TARGET line |
| read the report | `pair.py decode <key.json> <report.md>` | PREV-BETTER / CUR-BETTER / SAME per cluster |
| record | `ideas.py verdict <results-dir>` | writes the ledger verdicts into the bank and sets each idea's status |
| plateau check / final | `frameset-seq.sh <out>` → `sheets.py <out>` → three auditors → `tally.py <results>` | the full frame set and the closed-id tally |

`frames.py` finds a frame by (tier, time, dpr, size) in either kind of render dir. Renders run one lab.js at a time; a dpr-3 shot always alone.

`lab.js` finds playwright and the repo on its own (`/opt/node-tools` or `/opt/npm-tools`; `/home/user/Social-casino-bliss` or `/home/claude/social-casino-bliss`); set `LAB_PW` and `LAB_REPO` to override. Validated: a `render-targets.sh` shot is pixel-identical to the same frame from `frameset-seq.sh` (prescreen diff 0.0).
