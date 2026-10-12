#!/bin/zsh
# Daily READ-ONLY Etsy snapshot on the Mac mini (04:40 Pacific), so the Command
# Center that Brief Me builds at 05:00 has a fresh Etsy row even while the laptop
# (whose etsy-daily-snapshot task runs at 03:00) is asleep or travelling.
# Runs etsy/etsy-snapshot.mjs only: GETs, no listing writes, so the Etsy edit cap
# and write guard are not in play. The token is the shared Supabase row; the
# 100-minute gap from the laptop's run keeps the two refreshes from racing.
# Output: ~/Developer/carnivore-weekly/reports/etsy-snapshots/snapshots.jsonl
# (the runner worktree's reports/etsy-snapshots is a symlink to it).
# Source of truth: carnivore-weekly/scripts/mini/. Install: copy to ~/bin, load
# scripts/mini/com.minibrew.etsy-snapshot-daily.plist.
export PATH=/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin
export TZ=America/Vancouver
W=$HOME/Developer/carnivore-weekly/.claude/worktrees/briefme-runner
OUT=$HOME/Developer/carnivore-weekly/reports/etsy-snapshots/snapshots.jsonl
LOG=$HOME/Library/Logs/aihub/etsy-snapshot-daily.log
mkdir -p ${LOG:h}
say() { echo "$(date "+%F %T") $*" >> $LOG; }

# etsy-snapshot.mjs stamps rows with the UTC date; one row per UTC day.
today_utc=$(TZ=UTC date +%F)
if [[ -f $OUT ]] && tail -1 $OUT | grep -q "\"date\":\"$today_utc\""; then
  say "skip: row for $today_utc already present"; exit 0
fi
if out=$(cd $W/etsy && node etsy-snapshot.mjs 2>&1); then
  say "ok: ${out//$'\n'/ | }"
else
  say "FAILED: ${out//$'\n'/ | }"
  ~/bin/notify.sh "Etsy snapshot on the Mini failed, so today's Brief Me has stale Etsy numbers. Log: ~/Library/Logs/aihub/etsy-snapshot-daily.log"
  exit 1
fi
