#!/bin/bash
# PreToolUse (Bash) guard for Etsy writes. Fail closed.
# Any Bash command that runs a script under etsy/ (or sends a write to openapi.etsy.com) is a
# potential write unless the script is on the read-only allowlist. Naming a script as an argument to
# cat/grep/sed/git etc. is not running it (EXEC_PL below); ambiguous positions count. Writes require:
#   1. Live-Changes-Log.md modified in the last 30 min (row written BEFORE the call)
#   2. node etsy/edit-cap.mjs <ids> exits 0 (rolling 7-day cap of 3 distinct listings);
#      with no ids in the command, the window must have headroom (< 3 listings).
# Exit 2 blocks; stderr is shown to Claude. Read-only scripts and non-Etsy commands pass.
# Test: bash tests/test_etsy_write_guard_hook.sh  (--classify prints read|write, no enforcement)
set -u
LOG="/Users/mbrew/Documents/Brew-Vault/00-Core/Live-Changes-Log.md"
ROOT="${CLAUDE_PROJECT_DIR:-/Users/mbrew/Developer/carnivore-weekly}"
CLASSIFY=0; [ "${1:-}" = "--classify" ] && CLASSIFY=1
CAPCHECK=0; [ "${1:-}" = "--cap-check" ] && CAPCHECK=1
CMD=$(jq -r '.tool_input.command // ""' 2>/dev/null)
[ -z "$CMD" ] && { [ "$CLASSIFY" = 1 ] && echo read; exit 0; }
# Does the command touch Etsy at all?
if ! echo "$CMD" | grep -qiE '(^|[^a-z])etsy/[A-Za-z0-9._-]+\.mjs|cd +[^;&|]*etsy[^;&|]*[;&|]+.*\.mjs|openapi\.etsy\.com'; then
  [ "$CLASSIFY" = 1 ] && echo read; exit 0
fi
# Read-only allowlist (basenames). Anything else under etsy/ is treated as a write.
RO='^(edit-cap|edit-cap\.test|dump-listing|fetch-listings|sales-summary|etsy-snapshot|recent-reviews|audit-[a-z-]+|verify-[a-z-]+|taxonomy-[a-z-]+|chart-swap-preflight|count-files|convert-food-lists|build-carnivore-red-chart|poll-replicate|screenshot-landscape|etsy-oauth|token)\.mjs$'
WRITE=0

# Which .mjs files does the command RUN? A bare mention used to count, so `cat etsy/etsy-guard.mjs`
# and `git add etsy/update-listings.mjs` were blocked as writes (2026-09-11, ISSUE-080). The command
# is cut into simple commands on ; && || & | newline ( ) $( <( and backticks; heredoc bodies belong
# to the command that opened them. A mention is ignored only when its command word is on the
# non-executing list below AND nothing downstream in its pipeline runs code AND, if the command
# uses subshells or substitution, no command anywhere in it runs code. Everything else counts,
# including env prefixes (FOO=1 node), wrappers (time, env, xargs) and unknown words, so an
# ambiguous invocation stays a write. Prints basenames. If perl fails, every mention counts.
read -r -d '' EXEC_PL <<'PL'
local $/; my $cmd = <STDIN>; $cmd = '' unless defined $cmd;
$cmd =~ s/\\\n/ /g;
my %NOEXEC = map { $_ => 1 } qw(cat head tail less more wc grep egrep fgrep rg sed diff cmp ls stat file git cp mv echo printf sort uniq cut tr nl shasum md5 cd pwd true test [);
my $SEP = qr/\|\||&&|\|&|(?<![<>&])&(?![&>])|;;?|\||\$\(|[<>]\(|[()`]/;
my $HD = qr/(?<!<)<<-?\s*(['"]?)([A-Za-z_][\w.-]*)\1/;
my (@segs, @openers, @tags); my ($pipe, $nested) = (0, 0);
my $seg = { text => '', pipe => 0 };
my $close = sub {
  my ($sep) = @_; push @segs, $seg;
  if ($sep =~ /^\$\(|^[<>]\(|^[()`]$/) { $nested = 1 } elsif ($sep !~ /^\|&?$/) { $pipe++ }
  $seg = { text => '', pipe => $pipe };
};
my @lines = split /\n/, $cmd, -1; my $i = 0;
while ($i < @lines) {
  my $line = $lines[$i++]; @openers = (); @tags = ();
  while ($line =~ /\G((?:(?!$SEP).)*)($SEP)?/gcs) {
    my ($t, $s) = ($1, $2); $seg->{text} .= $t;
    while ($t =~ /$HD/g) { push @openers, $seg; push @tags, $2 }
    last unless defined $s;
    $close->($s);
  }
  $close->("\n") unless $line =~ /(?:\|&?|&&)\s*$/;   # a trailing | or && continues onto the next line
  for my $k (0 .. $#tags) {   # heredoc bodies attach to their opener; unterminated = parse as commands
    my ($found) = grep { $lines[$_] =~ /^\s*\Q$tags[$k]\E\s*$/ } $i .. $#lines;
    last unless defined $found;
    $openers[$k]{body} .= join("\n", @lines[$i .. $found - 1]) . "\n";
    $i = $found + 1;
  }
}
push @segs, $seg;
my $noexec = sub {
  my ($t) = @_;
  return 1 if $t =~ /^[\s"'\\]*$/;   # stray quote or blank left by the split: no command
  my ($w) = $t =~ /^\s*(\S+)/;
  return 0 unless $NOEXEC{$w};
  return 0 if $w eq 'git' && $t =~ /(?:^|\s)(?:-c|-x|-O|--exec|--extcmd|--open-files-in-pager|--upload-pack|--receive-pack|--config-env)(?:[\s=]|$)|\b(?:bisect|filter-branch|submodule|difftool|mergetool)\b/;
  return 0 if $w eq 'rg' && $t =~ /--pre\b/;
  return 0 if $w eq 'sort' && $t =~ /--compress-program/;
  return 1;
};
my (%pipe_ok, %out); my $all_ok = 1;
for my $s (@segs) {
  $s->{ok} = $noexec->($s->{text});
  $pipe_ok{$s->{pipe}} = 1 unless exists $pipe_ok{$s->{pipe}};
  unless ($s->{ok}) { $pipe_ok{$s->{pipe}} = 0; $all_ok = 0 }
}
for my $s (@segs) {
  next if $s->{ok} && $pipe_ok{$s->{pipe}} && (!$nested || $all_ok);
  $out{$_} = 1 for ($s->{text} . "\n" . ($s->{body} // '')) =~ /[A-Za-z0-9._-]+\.mjs/g;
}
print "$_\n" for sort keys %out;
PL
SCRIPTS=$(printf '%s' "$CMD" | perl -e "$EXEC_PL") || SCRIPTS=$(echo "$CMD" | grep -oE '[A-Za-z0-9._-]+\.mjs' | sort -u)

# HTTP write to openapi.etsy.com? Methods are matched only in a method context, never as a bare
# substring: the old `grep -i 'PATCH|POST|PUT|DELETE'` blocked read-only `node --input-type=module`
# because "input" contains "put" (2026-09-11). Exit 0 = write, 1 = read-only, anything else
# (perl missing or crashed) = write, so detection itself fails closed.
read -r -d '' HTTP_WRITE_PL <<'PL'
local $/; $_ = <STDIN>;
exit 1 unless /openapi\.etsy\.com/i;
my $safe = qr/(?:GET|HEAD|OPTIONS)(?![\w-])/i;
# 1. Uppercase method as a standalone word, case-sensitive: -X PUT, method:'PATCH', http DELETE url
exit 0 if /(?<![\w-])(?:PATCH|POST|PUT|DELETE)(?![\w-])/;
# 2. curl/wget method flags with any value that is not GET/HEAD: -X put, -sXPATCH, --request "$M"
exit 0 if /(?:^|\s)(?:-[A-Za-z]*X|--request|--method)(?:\s*+=\s*+|\s++)?+(?![\x27"]?+$safe)[^\s=]/m;
# 3. A method key whose value is not a literal GET/HEAD, including lowercase and variables
exit 0 if /\bmethod[\x27"]?+\s*+(?::|=(?!=))\s*+(?![\x27"`]?+$safe)\S/;
# 4. requests.request("DELETE", ...) / requests.request(m, ...)
exit 0 if /\brequests?\.request\(\s*+(?![\x27"]?+$safe)/;
# 5. Client helpers: requests.post(, axios.put(, session.delete(
exit 0 if /\.(?:post|put|patch|delete|del)\s*\(/;
# 6. Body or upload flags imply a write: curl -d/-sSd/-F/-T/--data*/--json/--form, wget --post-*
exit 0 if /(?:^|\s)(?:-[A-Za-z]*[dFT]|--data(?:-[a-z]+)?|--json|--form(?:-string)?|--upload-file|--(?:post|body)-(?:data|file))(?=[\s=@\x27"]|$)/m;
# 7. urllib Request(url, data=...) sends a POST
exit 0 if /\bRequest\([^)]*\bdata\s*=/;
exit 1;
PL
printf '%s' "$CMD" | perl -e "$HTTP_WRITE_PL"; RC=$?
[ "$RC" -ne 1 ] && WRITE=1
for s in $SCRIPTS; do echo "$s" | grep -qE "$RO" || WRITE=1; done
if [ "$CLASSIFY" = 1 ]; then [ "$WRITE" = 1 ] && echo write || echo read; exit 0; fi
if [ "$WRITE" = 0 ]; then [ "$CAPCHECK" = 1 ] && echo allow; exit 0; fi
# 1. write-first. Skipped under --cap-check, which reports on the CAP branch alone and never
# enforces, so the suite does not have to age or touch the real vault log to test the cap.
if [ "$CAPCHECK" = 0 ]; then
if [ ! -f "$LOG" ]; then echo "BLOCKED: Live Changes Log missing at $LOG. Fail closed; no Etsy write." >&2; exit 2; fi
AGE=$(( $(date +%s) - $(stat -f %m "$LOG") ))
if [ "$AGE" -gt 1800 ]; then
  echo "BLOCKED: Etsy write attempted but the Live Changes Log was last modified ${AGE}s ago. Write the row FIRST (date, listing id, what/why), then retry. Scripts: $SCRIPTS" >&2; exit 2
fi
fi
# 2. cap
# CLAUDE.md: a Live Changes Log row tagged [cap-exempt <deck>] dated TODAY lifts the cap, and
# etsy/etsy-guard.mjs already honours it in process. This hook did not, so the documented escape
# hatch was unreachable from a Bash call (found 2026-09-12). It now honours the same exemption.
# Recognition is delegated entirely to edit-cap.mjs, which prints
#   EXEMPT <YYYY-MM-DD> deck <hex>: "<row>" not counted
# for each row its own [cap-exempt <6+ hex>] regex accepts. This script never parses the log and
# never reimplements that regex, so a malformed row simply produces no EXEMPT line and stays
# blocked. The date must equal today, matching etsy-guard.mjs's `e.date === w.today`.
# This lifts the CAP only. The write-first rule above is NOT lifted: the row must still be written
# before the call, which is the control that makes the exemption auditable in the first place.
cap_exempt_today() { # $1 = edit-cap output
  echo "$1" | grep -qE "^[[:space:]]*EXEMPT[[:space:]]+$(date +%F)[[:space:]]+deck[[:space:]]+[0-9a-fA-F]{6,}:"
}
IDS=$(echo "$CMD" | grep -oE '\b[0-9]{6,}\b' | sort -u | tr '\n' ' ')
if [ -n "$IDS" ]; then
  OUT=$(cd "$ROOT" && node etsy/edit-cap.mjs $IDS 2>&1); RC=$?
  if [ $RC -ne 0 ] && ! cap_exempt_today "$OUT"; then
    [ "$CAPCHECK" = 1 ] && { echo block; exit 0; }
    echo "BLOCKED by Etsy edit cap: $OUT" >&2; exit 2
  fi
else
  OUT=$(cd "$ROOT" && node etsy/edit-cap.mjs 2>&1) || {
    [ "$CAPCHECK" = 1 ] && { echo block; exit 0; }
    echo "BLOCKED: edit-cap.mjs failed (fail closed): $OUT" >&2; exit 2; }
  N=$(echo "$OUT" | sed -nE 's/^Listings edited in window: ([0-9]+).*/\1/p'); N=${N:-0}
  if [ "$N" -ge 3 ] && ! cap_exempt_today "$OUT"; then
    [ "$CAPCHECK" = 1 ] && { echo block; exit 0; }
    echo "BLOCKED: $N distinct listings already edited in the 7-day window and no listing id found in the command. Brew's word or wait for the window." >&2; exit 2
  fi
fi
[ "$CAPCHECK" = 1 ] && { echo allow; exit 0; }
exit 0
