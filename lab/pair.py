# Paired A/B packet: pair.py make <prev-dir> <cur-dir> <packet-dir> <key-file> CLUSTER [CLUSTER...]
#                    pair.py decode <key-file> <report.md>
# make: for every frame of every cluster, one image with prev and cur side by side in a RANDOM left/right
# order, labelled P1, P2, ... and the cluster name only. The order is written to <key-file>, which must sit
# OUTSIDE the packet dir so the auditor cannot read it. decode: reads the auditor's "P<n>: LEFT|RIGHT|SAME | <why>"
# lines and reports which side was the current round, so the verdict is prev-vs-cur in the auditor's blind.
import sys, os, json, random
from PIL import Image, ImageDraw
from frames import find, crop
here = os.path.dirname(os.path.abspath(__file__))
C = json.load(open(os.path.join(here, 'clusters.json')))
def label(im, t):
    g = ImageDraw.Draw(im); g.rectangle((0, 0, 8 + 7 * len(t), 18), fill=(0, 0, 0)); g.text((4, 3), t, fill=(255, 255, 0)); return im
if sys.argv[1] == 'make':
    prev, cur, out, keyf, want = sys.argv[2], sys.argv[3], sys.argv[4], sys.argv[5], sys.argv[6:]
    os.makedirs(out, exist_ok=True); rng = random.Random(int.from_bytes(os.urandom(4), 'big')); key = []; n = 0
    for c in want:
        for tier, t, dpr, w, h, box in C[c]['frames']:
            a, b = find(prev, tier, t, dpr, w, h), find(cur, tier, t, dpr, w, h)
            if not a or not b: print(f'skip {c} {tier} {t}: frame missing'); continue
            A, B = crop(Image.open(a).convert('RGB'), box, dpr), crop(Image.open(b).convert('RGB'), box, dpr)
            cur_left = rng.random() < 0.5; L, R = (B, A) if cur_left else (A, B); n += 1
            W, H = L.width + R.width + 24, max(L.height, R.height) + 24
            s = Image.new('RGB', (W, H), (20, 20, 20)); s.paste(L, (0, 24)); s.paste(R, (L.width + 24, 24))
            label(s, f'P{n} {c}  LEFT'); g = ImageDraw.Draw(s); g.rectangle((L.width + 24, 0, L.width + 80, 18), fill=(0, 0, 0)); g.text((L.width + 28, 3), 'RIGHT', fill=(255, 255, 0))
            s.save(os.path.join(out, f'P{n:02d}-{c}.png'))
            key.append({'pair': f'P{n}', 'cluster': c, 'frame': [tier, t, dpr], 'cur': 'LEFT' if cur_left else 'RIGHT'})
    json.dump(key, open(keyf, 'w'), indent=1); print(f'{n} pairs -> {out}; key -> {keyf}')
else:
    key = {k['pair']: k for k in json.load(open(sys.argv[2]))}; rep = open(sys.argv[3]).read()
    import re, collections; tally = collections.defaultdict(collections.Counter)
    for p, side, why in re.findall(r'^(P\d+)[ \t]*:[ \t]*(LEFT|RIGHT|SAME)[ \t]*\|?[ \t]*(.*)$', rep, re.M):
        if p not in key: continue
        k = key[p]; v = 'SAME' if side == 'SAME' else ('CUR-BETTER' if side == k['cur'] else 'PREV-BETTER')
        tally[k['cluster']][v] += 1; print(f'{p} {k["cluster"]:14} {v:11} {why[:90]}')
    print('\nper cluster:'); [print(f'  {c:14}', dict(t)) for c, t in tally.items()]
