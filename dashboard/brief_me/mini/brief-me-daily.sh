#!/bin/zsh
# Brief Me overnight run on the Mac mini. Opt-in: does nothing unless ~/.brief-me/daily.on exists.
#   brief-me-daily.sh home   05:00 Pacific; runs on days no trip contains
#   brief-me-daily.sh trip   07:30 Pacific; runs on trip days, after the 8:00 Mexico City recap
#   brief-me-daily.sh on|off|status   the switch
# Source of truth: carnivore-weekly/dashboard/brief_me/mini/. Installed to ~/bin by install.sh.
export PATH=$HOME/.local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin
export TZ=America/Vancouver
W=$HOME/Developer/carnivore-weekly/.claude/worktrees/briefme-runner
PY=$HOME/.brief-me/venv/bin/python
LOG=$HOME/Library/Logs/aihub/brief-me-daily.log
slot=$1
case $slot in
  on|off|status) exec $PY $W/dashboard/briefme.py daily $slot ;;
  home|trip) ;;
  *) echo "usage: $0 home|trip|on|off|status"; exit 2 ;;
esac
[[ -f $HOME/.brief-me/daily.on ]] || exit 0
mkdir -p ${LOG:h}
say() { echo "$(date "+%F %T") [$slot] $*" >> $LOG; }

# Track main once Brief Me has merged there, the PR branch until then.
git -C $W fetch -q origin main feat/brief-me-daily 2>>$LOG
ref=origin/feat/brief-me-daily
git -C $W cat-file -e origin/main:dashboard/brief_me/trip.py 2>/dev/null && ref=origin/main
git -C $W checkout -q --detach $ref || { ~/bin/notify.sh "Brief Me: could not check out $ref on the Mini."; exit 1; }

today=$(date +%F)
# Trip day? Ask the ledger; if it is unreachable, fall back to the cached trip windows.
is_trip=$(cd $W/dashboard && $PY -c "
import json, sys
from brief_me import trip
from pathlib import Path
try:
    print(1 if trip.load_trip('$today')['trip'] else 0)
except Exception:
    w = json.loads((Path.home() / '.brief-me/trip-windows.json').read_text() or '[]')
    print(1 if any(x['starts_on'][:10] <= '$today' <= x['ends_on'][:10] for x in w) else 0)
" 2>>$LOG)
if [[ $slot == home && $is_trip == 1 ]] || [[ $slot == trip && $is_trip != 1 ]]; then
  say "skip (trip day: ${is_trip:-unknown})"; exit 0
fi
# One daily episode per day, whatever else ran.
if [[ -f $HOME/.brief-me/daily-$today ]]; then
  say "already published today"; exit 0
fi

say "start ($ref $(git -C $W rev-parse --short HEAD), trip=$is_trip)"
~/bin/claude-task.sh brief-me-daily $W 45 || { say "claude-task failed"; exit 1; }

# Send the link only if today's episode really published.
msg=$($PY - <<PYEOF 2>>$LOG
import json
from pathlib import Path
home = Path.home() / '.brief-me'
rows = [json.loads(l) for l in (home / 'history.jsonl').read_text().splitlines() if l.strip()]
r = rows[-1] if rows else {}
if not r.get('stamp', '').startswith('$today'):
    raise SystemExit(1)
sc = json.loads((home / 'episodes' / r['stamp'] / 'script.json').read_text())
kind = {'card': 'Quiet day, one card', 'short': 'Short brief', 'full': 'Full brief'}.get(r.get('tier'), 'Brief')
print(f"{kind}: {sc.get('headline', '')}\nhttp://100.117.74.5:8087/brief/latest/")
PYEOF
)
if [[ -n $msg ]]; then
  ~/bin/notify.sh "☀️ $msg"; touch $HOME/.brief-me/daily-$today; say "sent"
else
  ~/bin/janitor-alert.sh "Brief Me did not publish today" "claude-task exited 0 but no $today episode is in ~/.brief-me/history.jsonl. Log: $LOG"
  say "no episode"; exit 1
fi
