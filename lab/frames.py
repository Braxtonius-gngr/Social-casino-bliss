# Shared: find a rendered frame for (tier, time, dpr, w, h) in a render dir, whether it came from frameset-seq.sh (std-NN / vault-NN / edge-NN / wide-NN / crop-NN) or render-targets.sh (<tier>-d<dpr>-<w>x<h>-NN + .times).
import json, os, glob
FIXED = {('standard', 1, 390, 844): ('std', [0, 'look+0.3', 'reach+0.6', 'pull+0.3', 'stop1', 'slow+0.3', 'call+0.6', 'drawer+0.6', 'pay+1.2', 'reveal-0.4']),
         ('vault', 1, 390, 844): ('vault', ['boom+0.5', 'boom+1.2', 'boom+2.2', 'reveal-0.3']),
         ('edge', 1, 390, 844): ('edge', ['call+0.2', 'rest+0.6']),
         ('hardways', 1, 844, 390): ('wide', [0, 'reach+0.6', 'slow+0.3', 'call+0.6', 'drawer+0.6', 'pay+1.2', 'reveal-0.4']),
         ('standard', 3, 390, 844): ('crop', [0, 'pull+0.3'])}
def find(d, tier, t, dpr, w, h):
    name = f'{tier}-d{dpr}-{w}x{h}'
    tf = os.path.join(d, name + '.times')
    if os.path.exists(tf):
        times = json.load(open(tf))
        if t in times: return os.path.join(d, f'{name}-{times.index(t):02d}.png')
    k = (tier, dpr, w, h)
    if k in FIXED and t in FIXED[k][1]:
        p = os.path.join(d, f'{FIXED[k][0]}-{FIXED[k][1].index(t):02d}.png')
        if os.path.exists(p): return p
    return None
def crop(im, box, dpr):
    if not box: return im
    x0, y0, x1, y1 = [v * dpr for v in box]; return im.crop((x0, y0, x1, y1))
