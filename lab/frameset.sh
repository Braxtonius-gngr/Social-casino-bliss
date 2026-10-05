#!/bin/bash
# The fixed frame set for audit-makes-perfect. Usage: frameset.sh <outdir>
cd "$(dirname "$0")"
O="$1"; mkdir -p "$O"
run() { timeout 590 node lab.js "$1" > "$O/$2.log" 2>&1; }
run '{"game":"slots","tier":"standard","seed":11,"times":[0,"look+0.3","reach+0.6","pull+0.3","stop1","slow+0.3","call+0.6","drawer+0.6","pay+1.2","reveal-0.4"],"out":"'$O'/std","evals":["JSON.stringify(window.rollIntroPlan.moments.scan())"]}' std &
run '{"game":"slots","tier":"vault","seed":5,"times":["boom+0.5","boom+1.2","boom+2.2","reveal-0.3"],"out":"'$O'/vault"}' vault &
wait
run '{"game":"slots","tier":"edge","seed":9,"times":["slow+0.3","rest+0.6"],"out":"'$O'/edge"}' edge &
run '{"game":"slots","tier":"hardways","seed":2,"w":844,"h":390,"times":[0,"reach+0.6","slow+0.3","call+0.6","drawer+0.6","pay+1.2","reveal-0.4"],"out":"'$O'/wide"}' wide &
wait
run '{"game":"slots","tier":"standard","seed":11,"dpr":3,"times":[0,"pull+0.3"],"out":"'$O'/crop"}' crop
echo done > "$O/DONE"
