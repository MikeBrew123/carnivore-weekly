#!/usr/bin/env node
// Self-test for etsy/edit-cap.mjs. Reads a fixture in a temp dir, makes no Etsy
// call and never touches the real Live Changes Log. Run: node etsy/edit-cap.test.mjs
import { writeFileSync, mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { readWindow, assertEditCap } from './edit-cap.mjs';

const dir = mkdtempSync(path.join(tmpdir(), 'edit-cap-'));
const LOG = path.join(dir, 'fixture.md');
writeFileSync(LOG, `| Date | Where | What changed | Why | Undo |
|---|---|---|---|---|
| 2026-08-20 10:00 PDT | Etsy listing 4464217679 Carnivore Food List | tags | x | y |
| 2026-08-20 11:00 PDT | Etsy listing 4464217679 Carnivore Food List | second edit, same listing | x | y |
| 2026-08-19 09:00 PDT | Etsy listing 4495089980 Doctor Prep Kit | price | x | y |
| 2026-08-19 08:00 PDT | Etsy, 26 doubled listings 4464217699 4513518786 4516511462 | $3.99 reset [cap-exempt 12f2599a] | x | y |
| 2026-08-19 07:00 PDT | carnivoreweekly.com blog | site copy only, no shop involvement | x | y |
| 2026-08-18 07:00 PDT | Etsy listing 4550536874 | predates the cap, must not count | x | y |
| 2026-08-21 07:00 PDT | Etsy shop announcement, no listing id here | unattributed | x | y |
`);

const opts = { logPath: LOG };
let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS  ' : 'FAIL  ') + m); if (!c) fails++; };

const a = readWindow('2026-08-20', opts);
ok(a.floor === '2026-08-19', `floor honours the in-force date (got ${a.floor})`);
ok(!a.listings.has('4550536874'), 'row dated before the cap took force is not counted');
ok(a.listings.size === 2, `two rows on one listing count once (got ${a.listings.size})`);
ok(a.exemptions.length === 1 && a.exemptions[0].deck === '12f2599a', 'cap-exempt row excluded and reported');
ok(a.unattributed.length === 0, 'non-Etsy row ignored, future-dated row out of window');

let r = assertEditCap(['4550536874'], '2026-08-20', opts);
ok(r.total === 3, `third distinct listing allowed (total ${r.total})`);

let threw = false;
try { assertEditCap(['4550536874', '4545921306'], '2026-08-20', opts); } catch { threw = true; }
ok(threw, 'fourth distinct listing refused');

threw = false;
try { r = assertEditCap(['4464217679'], '2026-08-20', opts); } catch { threw = true; }
ok(!threw && r.total === 2, 're-editing a listing already logged this window costs nothing');

const d = readWindow('2026-08-21', opts);
ok(d.unattributed.length === 1, 'Etsy row naming no listing id is flagged');
threw = false;
try { assertEditCap(['4545921306'], '2026-08-21', opts); } catch { threw = true; }
ok(threw, 'unattributed row counts as one listing, so a fourth is refused');

threw = false;
try { readWindow('2026-08-20', { logPath: '/nope/missing.md' }); } catch (e) { threw = /do not edit/.test(e.message); }
ok(threw, 'a missing or unreadable log fails closed');

console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
