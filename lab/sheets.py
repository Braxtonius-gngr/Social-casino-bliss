# Contact sheets for a frame-set dir: sheets.py <dir>
import sys, glob
from PIL import Image, ImageDraw
d = sys.argv[1]
def label(im, t):
    g = ImageDraw.Draw(im); g.rectangle((0, 0, 8 + 7 * len(t), 18), fill=(0, 0, 0)); g.text((4, 3), t, fill=(255, 255, 0)); return im
def sheet(out, files, cols, names):
    ims = [label(Image.open(f).convert('RGB'), n) for f, n in zip(files, names)]
    w, h = ims[0].size; rows = (len(ims) + cols - 1) // cols
    s = Image.new('RGB', (cols * (w + 8), rows * (h + 8)), (20, 20, 20))
    for i, im in enumerate(ims): s.paste(im, ((i % cols) * (w + 8), (i // cols) * (h + 8)))
    s.save(out)
S = ['open', 'look+0.3', 'reach+0.6', 'pull+0.3', 'stop1', 'slow+0.3', 'call+0.6', 'drawer+0.6', 'pay+1.2', 'reveal-0.4']
sheet(f'{d}/A-standard.png', sorted(glob.glob(f'{d}/std-*.png')), 5, [f'A{i+1} {n}' for i, n in enumerate(S)])
V = ['boom+0.5', 'boom+1.2', 'boom+2.2', 'reveal-0.3']; E = ['call+0.2', 'rest+0.6']
sheet(f'{d}/B-jackpot-tooth.png', sorted(glob.glob(f'{d}/vault-*.png')) + sorted(glob.glob(f'{d}/edge-*.png')), 6, [f'B{i+1} jackpot {n}' for i, n in enumerate(V)] + [f'B{i+5} tooth {n}' for i, n in enumerate(E)])
W = ['open', 'reach+0.6', 'slow+0.3', 'call+0.6', 'drawer+0.6', 'pay+1.2', 'reveal-0.4']
sheet(f'{d}/C-landscape.png', sorted(glob.glob(f'{d}/wide-*.png')), 2, [f'C{i+1} sevens {n}' for i, n in enumerate(W)])
c0 = Image.open(f'{d}/crop-00.png').crop((122 * 3, 260 * 3, 252 * 3, 541 * 3))
c1 = Image.open(f'{d}/crop-01.png').crop((0, 245 * 3, 130 * 3, 526 * 3))
c0.save(f'{d}/_c1.png'); c1.save(f'{d}/_c2.png')
sheet(f'{d}/D-crops-3x.png', [f'{d}/_c1.png', f'{d}/_c2.png'], 2, ['D1 face 3x (open)', 'D2 hand on lever 3x (pull)'])
print('ok')
