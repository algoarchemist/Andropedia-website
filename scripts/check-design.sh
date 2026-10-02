#!/usr/bin/env bash
# DSN-06 ban enforcement. Fails the build on any match in client source.
# Bans: pills (anything rounder than 4px), blurred shadows, gradients, glass, purple family, monospace.
cd "$(dirname "$0")/.." || exit 2
export LC_ALL=C.UTF-8

PATTERN='rounded-(full|lg|xl|2xl|3xl)|rounded-[a-z]{1,2}-(full|lg|xl|2xl|3xl)|rounded-(\[|pill)|pill|shadow-(sm|md|lg|xl|2xl|inner)|drop-shadow|backdrop-blur|bg-gradient|linear-gradient|radial-gradient|conic-gradient|font-mono|text-shadow|filter:\s*blur|box-shadow:\s*(?!none)|border-radius:\s*(?!(0|[0-4]px)\s*[;}])|purple|violet|fuchsia|glassmorphism|bento'

grep -rnP --include='*.ts' --include='*.tsx' --include='*.css' --include='*.html' "$PATTERN" client/src client/index.html
rc=$?

if [ "$rc" -eq 0 ]; then
  echo "Design ban violated (see PRD DSN-06)"
  exit 1
elif [ "$rc" -gt 1 ]; then
  echo "check-design: grep failed (exit $rc)"
  exit 2
fi
echo "check-design: ok"
