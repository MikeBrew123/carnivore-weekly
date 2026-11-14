#!/usr/bin/env node
/**
 * tests/blog-first-question.test.mjs
 *
 * XR-18: the calculator's goal question (Fat Loss, Maintenance, Muscle Gain) near the top of
 * the posts listed in data/first_question_cta.json, and nowhere else.
 *
 * Run it:
 *     node tests/blog-first-question.test.mjs
 *
 * Reads built output, so run scripts/generate_blog_pages.py --site cw first.
 * An empty list is valid (test ended): then no post may carry the block.
 */
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const blogDir = join(root, 'public/blog')
const marker = 'class="first-question-cta"'
const blockEnd = 'Email required.</div></div>'

let failed = 0
const check = (ok, msg) => {
  if (!ok) {
    failed++
    console.error(`FAIL: ${msg}`)
  }
}

const posts = JSON.parse(readFileSync(join(root, 'data/first_question_cta.json'), 'utf8')).posts

for (const slug of posts) {
  const html = readFileSync(join(blogDir, `${slug}.html`), 'utf8')
  const start = html.indexOf(`<div ${marker}`)
  const end = html.indexOf(blockEnd, start)
  check(html.split(marker).length - 1 === 1, `${slug}: exactly one block`)
  check(start !== -1 && end !== -1, `${slug}: block is complete and says "Email required."`)
  if (start === -1 || end === -1) continue
  const block = html.slice(start, end + blockEnd.length)

  for (const goal of ['lose', 'maintain', 'gain']) {
    const href = `/calculator.html?goal=${goal}&amp;src=blog-q1-${slug}#calculator-start`
    check(block.includes(`href="${href}"`), `${slug}: ${goal} button links to the calculator with the answer`)
    check(block.includes(`answer:'${goal}'`), `${slug}: ${goal} button reports its click`)
  }
  check(!/[?&]sex=/.test(block), `${slug}: block no longer asks sex`)
  check(!/<p[\s>]/.test(block), `${slug}: block uses no <p>, so paragraph counts stay put`)
  check(!/30-day|meal plan|\u2014/i.test(block), `${slug}: block promises only what is free, no em dash`)
  const early = html.indexOf('early-calc-cta')
  check(early === -1 || early > start, `${slug}: block sits above the early calculator line`)
}

const listed = new Set(posts.map((slug) => `${slug}.html`))
for (const file of readdirSync(blogDir)) {
  if (!file.endsWith('.html') || listed.has(file)) continue
  check(!readFileSync(join(blogDir, file), 'utf8').includes(marker), `${file}: not listed, must not carry the block`)
}

const app = readFileSync(join(root, 'calculator2-demo/src/components/calculator/CalculatorApp.tsx'), 'utf8')
check(app.includes("params.get('goal')"), 'CalculatorApp reads ?goal=')
check(
  app.includes("goal === 'lose' || goal === 'maintain' || goal === 'gain'"),
  'CalculatorApp accepts only lose, maintain or gain',
)

const bundle = /assets\/calculator2\/assets\/(index-[\w-]+\.js)/.exec(readFileSync(join(root, 'public/calculator.html'), 'utf8'))
check(Boolean(bundle), 'calculator.html names a bundle')
if (bundle) {
  const js = readFileSync(join(root, 'public/assets/calculator2/assets', bundle[1]), 'utf8')
  check(js.includes('get("goal")'), `live bundle ${bundle[1]} reads ?goal=`)
}

if (failed) {
  console.error(`\n${failed} check(s) failed`)
  process.exit(1)
}
console.log(`OK: first-question block on ${posts.length} posts, absent elsewhere, calculator reads ?goal=`)
