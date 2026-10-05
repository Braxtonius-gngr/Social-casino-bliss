import re,glob,collections,sys,json
IDS="FACE-EYES FACE-BROWLASH FACE-NOSEMOUTH FACE-SKIN FACE-FORM HAIR-CURLS HAIR-LINE HAT-PLUME HAT-FELT HAT-FIT COAT-TORSO COAT-SLEEVES COAT-MATERIAL LACE-JABOT LACE-CUFF HANDS-FORM HANDS-GRIP JACKPOT-LIGHT JACKPOT-COLOUR JACKPOT-OTHER CONTACT-SHADOW DESK-PROPS DRAPES FRAME-CLIP FRAME-OTHER CAPTION-TIER CAPTION-CALL MOTION TOOTH REELS OTHER".split()
RES=sys.argv[1] if len(sys.argv)>1 else 'results-r11'
files=sorted(glob.glob(RES+'/a*.md'))
scores={};bad=[];per=collections.defaultdict(dict);texts=collections.defaultdict(list);led=collections.defaultdict(collections.Counter);singles=[]
for f in files:
    t=open(f).read(); a=f.split('/')[-1][:-3]
    m=re.search(r'SCORE:\s*([0-9.]+)',t)
    if not m: bad.append((a,'no score')); continue
    scores[a]=float(m.group(1)); n=0
    for line in t.splitlines():
        p=[x.strip() for x in line.split(' | ')]
        if len(p)>=4 and p[0] in IDS:
            sm=re.search(r'SEV\s*([123])',p[1])
            if not sm: bad.append((a,'sev: '+line[:60])); continue
            sev=int(sm.group(1)); n+=1
            per[p[0]][a]=max(per[p[0]].get(a,0),sev)
            texts[p[0]].append((a,sev,p[2],p[3],p[4] if len(p)>4 else ''))
    if n==0: bad.append((a,'no findings parsed'))
    m=re.search(r'SINGLE-CHANGE:\s*(.*)',t); singles.append((a,m.group(1) if m else ''))
    m=re.search(r'LEDGER:\s*(.*)',t)
    if m:
        for k,v in re.findall(r'(I\d+)\s*=\s*(RESOLVED|IMPROVED|UNCHANGED|REGRESSED)',m.group(1)): led[k][v]+=1
N=len(scores)
print(f'auditors parsed: {N}   mean {sum(scores.values())/max(N,1):.2f}   min {min(scores.values())} max {max(scores.values())}')
print('bad:',bad)
rows=[]
for i,d in per.items():
    rows.append((sum(d.values()),len(d),sum(1 for s in d.values() if s==3),i))
rows.sort(reverse=True)
tot=sum(r[0] for r in rows); cum=0
print(f'\n{"id":16}{"weight":>7}{"flagged":>8}{"sev3":>6}{"cum%":>7}')
for w,n,s3,i in rows:
    cum+=w; print(f'{i:16}{w:>7}{n:>8}{s3:>6}{100*cum/tot:>6.1f}%')
print('\nper-idea verdicts (N=%d):'%N)
order=['RESOLVED','IMPROVED','UNCHANGED','REGRESSED']
for k in sorted(led,key=lambda x:int(x[1:])):
    v=led[k]; n=sum(v.values()); gain=v['RESOLVED']+v['IMPROVED']
    verdict='SUCCESS' if gain/n>=0.6 and v['REGRESSED']/n<=0.15 else ('REGRESSED' if v['REGRESSED']/n>0.3 else 'NO-CHANGE/MIXED')
    print(f'{k:5}', ' '.join(f'{o[:4]}={v[o]:>2}' for o in order), f' n={n}  gain={100*gain/n:.0f}%  ->{verdict}')
json.dump({'rows':rows,'N':N,'scores':scores},open('tally-'+RES.strip('/').split('/')[-1]+'.json','w'))
