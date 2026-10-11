#!/bin/zsh
# Install or refresh the Brief Me daily run on the Mac mini. Run on the Mini:
#   zsh ~/Developer/carnivore-weekly/.claude/worktrees/briefme-runner/dashboard/brief_me/mini/install.sh
# Leaves the run OFF unless it is already on; turn it on with `~/bin/brief-me-daily.sh on`.
set -e
D=${0:A:h}
install -m 755 $D/brief-me-daily.sh ~/bin/brief-me-daily.sh
mkdir -p ~/.claude/scheduled-tasks/brief-me-daily && cp $D/SKILL.md ~/.claude/scheduled-tasks/brief-me-daily/SKILL.md
for slot in home trip; do
  label=com.minibrew.brief-me-daily.$slot
  [[ $slot == home ]] && hour=5 min=0 || hour=7 min=30
  cat > ~/Library/LaunchAgents/$label.plist <<PL
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>$label</string>
  <key>ProgramArguments</key><array><string>$HOME/bin/brief-me-daily.sh</string><string>$slot</string></array>
  <key>StartCalendarInterval</key><dict><key>Hour</key><integer>$hour</integer><key>Minute</key><integer>$min</integer></dict>
  <key>StandardOutPath</key><string>$HOME/Library/Logs/aihub/launchd-brief-me-daily.log</string>
  <key>StandardErrorPath</key><string>$HOME/Library/Logs/aihub/launchd-brief-me-daily.log</string>
</dict></plist>
PL
  launchctl bootout gui/$(id -u)/$label 2>/dev/null || true
  launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/$label.plist
done
echo "Installed. $(~/bin/brief-me-daily.sh status)"
