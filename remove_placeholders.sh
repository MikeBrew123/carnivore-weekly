#!/bin/bash
# Remove placeholder blog post HTML files

cd /Users/mbrew/Developer/carnivore-weekly/public/blog

echo "Removing 11 placeholder blog post files..."

rm -f 2026-01-27-beginners-blueprint-30-days.html
rm -f 2026-01-27-coffee-carnivore-practical-answer.html
rm -f 2026-01-28-carnivore-didnt-fix-everything.html
rm -f 2026-01-29-medical-establishment-backlash.html
rm -f 2026-01-30-organ-meats-for-skeptics.html
rm -f 2026-01-30-real-two-week-results.html
rm -f 2026-01-31-meal-timing-carnivore.html
rm -f 2026-02-01-building-social-support.html
rm -f 2026-02-02-community-pulse-january.html
rm -f 2026-02-03-carnivore-workout-fuel.html
rm -f 2026-02-03-traveling-carnivore.html

echo "✅ Placeholder files removed"
ls -1 *.html | wc -l | xargs echo "Remaining blog posts:"
