# Pixel pre-screen before an auditor is spent: prescreen.py <prev-dir> <cur-dir> CLUSTER [CLUSTER...]
# For each cluster's frames (clusters.json) it crops prev and cur the same way and prints the metric the
# cluster is tagged with, plus the whole-frame change, so a round can see (a) whether the targeted pixels
# moved in the intended direction and (b) whether anything untargeted moved. Numbers only; the builder decides.
import sys, json, numpy as np
from PIL import Image
from frames import find, crop
C = json.load(open(__import__('os').path.join(__import__('os').path.dirname(__file__), 'clusters.json')))
prev, cur, want = sys.argv[1], sys.argv[2], sys.argv[3:] or [k for k in C if not k.startswith('_')]
def arr(p): return np.asarray(Image.open(p).convert('RGB')).astype(float)
def skin(a):
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    m = (r > 150) & (r > g + 15) & (g > b + 8) & (r < 255) & (g > 110) & (b > 80) & (b < g)
    px = a[m]
    if len(px) < 50: return 'skin: too few px'
    return f'skin px={len(px)} median={np.median(px, axis=0).astype(int).tolist()} spread={px.std(axis=0).mean():.1f}'
def edges(a):
    g = a.mean(axis=2); gx = np.abs(np.diff(g, axis=1)); gy = np.abs(np.diff(g, axis=0))
    dens = ((gx > 40).mean() + (gy > 40).mean()) / 2
    return f'edge-density={dens:.4f} (share of px with a hard step; jagged alpha cards score high)'
def silhouette(a):
    # width of the dark-or-coloured figure against the room: count columns whose darkest run differs from the backdrop
    g = a.mean(axis=2); bg = np.median(g[:, :10]); fig = (np.abs(g - bg) > 35).mean(axis=0) > 0.25
    return f'silhouette-width={int(fig.sum())} px of {a.shape[1]}'
def lum(a): return f'lum mean={a.mean():.1f} p95={np.percentile(a.mean(axis=2), 95):.1f}'
def hue(a):
    r, g, b = a[..., 0], a[..., 1], a[..., 2]; green = ((g > r + 10) & (g > b + 10)).mean(); yellow = ((r > 150) & (g > 150) & (b < 120)).mean()
    return f'green-share={green:.3f} yellow-share={yellow:.3f}'
M = {'skin': skin, 'edges': edges, 'silhouette': silhouette, 'lum': lum, 'hue': hue, 'diff': lambda a: ''}
for c in want:
    e = C[c]; print(f'\n== {c} ({e["kind"]}; metric {e["metric"]}{"; want " + e["want"] if "want" in e else ""})')
    for tier, t, dpr, w, h, box in e['frames']:
        a, b = find(prev, tier, t, dpr, w, h), find(cur, tier, t, dpr, w, h)
        if not a or not b: print(f'  {tier} {t} @{dpr}x: frame missing ({"prev" if not a else "cur"})'); continue
        A, B = arr(a), arr(b)
        if A.shape != B.shape: print(f'  {tier} {t} @{dpr}x: size differs {A.shape} vs {B.shape}'); continue
        whole = np.abs(A - B).mean()
        Ac, Bc = np.asarray(crop(Image.fromarray(A.astype('uint8')), box, dpr)).astype(float), np.asarray(crop(Image.fromarray(B.astype('uint8')), box, dpr)).astype(float)
        local = np.abs(Ac - Bc).mean()
        f = M[e['metric']]
        print(f'  {tier} {t} @{dpr}x  change: crop {local:.1f} / whole frame {whole:.1f} (mean abs RGB)')
        if e['metric'] != 'diff': print(f'    prev  {f(Ac)}\n    cur   {f(Bc)}')
