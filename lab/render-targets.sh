#!/bin/bash
# Render only the frames that show the given clusters. Usage: render-targets.sh <outdir> CLUSTER [CLUSTER...]   (DRY=1 prints the lab.js calls)
# Frames come from clusters.json; shots are grouped per (tier, dpr, size) so each lab.js launch takes every time it needs.
# dpr-3 shots render alone; everything else one launch at a time (two in parallel raced before).
cd "$(dirname "$0")"; O="$1"; shift; mkdir -p "$O"
python3 - "$O" "$@" <<'PY' > "$O/plan.sh"
import json, sys
O = sys.argv[1]; want = sys.argv[2:]
C = json.load(open('clusters.json'))
groups = {}
for c in want:
    if c not in C: print(f'echo "unknown cluster {c}" >&2', file=sys.stderr); continue
    for tier, t, dpr, w, h, box in C[c]['frames']:
        k = (tier, dpr, w, h); groups.setdefault(k, [])
        if t not in groups[k]: groups[k].append(t)
seeds = {'standard': 11, 'vault': 5, 'edge': 9, 'hardways': 2}
for (tier, dpr, w, h), times in groups.items():
    name = f'{tier}-d{dpr}-{w}x{h}'
    arg = json.dumps({'game': 'slots', 'tier': tier, 'seed': seeds.get(tier, 7), 'dpr': dpr, 'w': w, 'h': h, 'times': times, 'out': f'{O}/{name}'})
    print(f"timeout 590 node lab.js '{arg}' > '{O}/{name}.log' 2>&1")
    # the time list is kept beside the shots so prescreen/pair can find a frame by (tier, time, dpr)
    print(f"echo '{json.dumps(times)}' > '{O}/{name}.times'")
PY
if [ -n "$DRY" ]; then cat "$O/plan.sh"; exit 0; fi
bash "$O/plan.sh"; echo done > "$O/DONE"
