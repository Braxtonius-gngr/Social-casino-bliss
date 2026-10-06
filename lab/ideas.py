# The idea bank: ideas.py add <id> <piece> <route> <clusters,comma> "<one-line idea>"
#                ideas.py verdict <results-dir> [piece]      (reads LEDGER lines, as tally.py does)
#                ideas.py list [--cluster X] [--status S]    ideas.py dead-ends    ideas.py check <route> <clusters,comma>
# ideas.json is the ledger every round reads before proposing: a *reverted* or *no-effect* row is a route not to
# retry as a variant, a *passed* row is already in the builder. check is the form gate: a form cluster (clusters.json
# kind=form) with a non-geometry route is refused with the evidence that paint never moved a form finding.
import sys, os, json, glob, re, collections
here = os.path.dirname(os.path.abspath(__file__)); F = os.path.join(here, 'ideas.json'); C = json.load(open(os.path.join(here, 'clusters.json')))
bank = json.load(open(F)) if os.path.exists(F) else []
def save(): json.dump(bank, open(F, 'w'), indent=1)
def status_of(v):
    n = sum(v.values()) or 1; gain = (v.get('RESOLVED', 0) + v.get('IMPROVED', 0)) / n; reg = v.get('REGRESSED', 0) / n
    if v.get('RESOLVED', 0) / n >= 0.6: return 'resolved'
    if gain >= 0.6 and reg <= 0.15: return 'success'
    if reg > 0.3: return 'regressed'
    if gain >= 0.3 and reg <= 0.15: return 'mixed'
    return 'no-effect'
cmd = sys.argv[1]
if cmd == 'check' or cmd == 'add':
    route, clusters = (sys.argv[2], sys.argv[3]) if cmd == 'check' else (sys.argv[4], sys.argv[5])
    bad = [c for c in clusters.split(',') if C.get(c, {}).get('kind') == 'form' and route != 'geometry']
    if bad: print(f'FORM GATE: {", ".join(bad)} are form findings and the route is "{route}". A form finding needs a geometry route; paint, shading and light passes on form findings read "improved" and left every one of them SEV 3 (slots r12-r20). Not added.' if cmd == 'add' else f'FORM GATE: {bad} need a geometry route.'); sys.exit(1 if cmd == 'add' else 0)
    dead = [r for r in bank if r['status'] in ('reverted', 'no-effect', 'regressed') and set(r['clusters']) & set(clusters.split(',')) and r['route'] == route]
    if dead: print('dead-end routes on these clusters, same route kind (do not retry as a variant):'); [print(f'  {r["id"]} {r["piece"]} {r["route"]:9} {r["status"]:9} {r["idea"][:90]}') for r in dead]
    if cmd == 'check': print('ok' if not dead else 'proceed only with a different construction'); sys.exit(0)
    bank.append({'id': sys.argv[2], 'piece': sys.argv[3], 'route': route, 'clusters': clusters.split(','), 'idea': sys.argv[6], 'status': 'proposed', 'verdict': {}}); save(); print('added', sys.argv[2])
elif cmd == 'verdict':
    res = sys.argv[2]; piece = sys.argv[3] if len(sys.argv) > 3 else None; led = collections.defaultdict(collections.Counter)
    for f in glob.glob(os.path.join(res, 'a*.md')):
        m = re.search(r'LEDGER:\s*(.*)', open(f).read())
        if m:
            for k, v in re.findall(r'(I\d+)\s*=\s*(RESOLVED|IMPROVED|UNCHANGED|REGRESSED)', m.group(1)): led[k][v] += 1
    for k, v in led.items():
        rows = [r for r in bank if r['id'] == k and (not piece or r['piece'] == piece)]
        if not rows: print(f'{k}: not in bank (add it first)'); continue
        r = rows[0]; r['verdict'] = dict(v); r['status'] = status_of(v); r['results'] = os.path.basename(res.rstrip('/')); print(f'{k:5} {r["status"]:10} {dict(v)}')
    save()
elif cmd == 'list':
    cl = sys.argv[sys.argv.index('--cluster') + 1] if '--cluster' in sys.argv else None; st = sys.argv[sys.argv.index('--status') + 1] if '--status' in sys.argv else None
    for r in bank:
        if (not cl or cl in r['clusters']) and (not st or r['status'] == st): print(f'{r["id"]:5} {r["piece"]:6} {r["route"]:9} {r["status"]:10} {",".join(r["clusters"]):28} {r["idea"][:80]}')
elif cmd == 'dead-ends':
    for r in bank:
        if r['status'] in ('reverted', 'no-effect', 'regressed'): print(f'{r["id"]:5} {r["route"]:9} {",".join(r["clusters"]):28} {r["idea"][:90]}')
