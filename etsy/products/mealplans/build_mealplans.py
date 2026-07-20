#!/usr/bin/env python3
"""Meal-plan product builder.

Composes N-day meal plans from meal pools, computes every macro from
ingredients.json (no hand-written numbers anywhere), auto-scales portions on
calorie-target plans, and renders branded multi-page PDFs via Playwright.

Usage:
    python3 build_mealplans.py            # build all diets found in configs
    python3 build_mealplans.py carnivore  # build one
"""
import json
import math
import sys
from pathlib import Path

HERE = Path(__file__).parent
OUT_DIR = HERE.parent / "pdfs"
ING = json.loads((HERE / "ingredients.json").read_text())
PROSE = json.loads((HERE / "prose.json").read_text()) if (HERE / "prose.json").exists() else {}

# ---------- macro math ----------

def meal_macros(meal, scale=1.0):
    k = p = f = c = 0.0
    for it in meal["ingredients"]:
        ing = ING[it["id"]]
        grams = it["qty"] * ing.get("unit_g", 50) if "qty" in it else it["g"] * scale
        if "qty" in it:
            grams = it["qty"] * ing.get("unit_g", 50)  # unit items never scale
        k += ing["kcal"] * grams / 100
        p += ing["p"] * grams / 100
        f += ing["f"] * grams / 100
        c += ing["c"] * grams / 100
    return {"kcal": round(k), "p": round(p), "f": round(f), "c": round(c, 1)}


def validate_pool(pool):
    for m in pool:
        for it in m["ingredients"]:
            if it["id"] not in ING:
                raise SystemExit(f"Unknown ingredient '{it['id']}' in meal {m['id']}")
            if "qty" not in it and "g" not in it:
                raise SystemExit(f"Meal {m['id']}: ingredient {it['id']} needs g or qty")


# ---------- plan composition ----------

def compose(cfg, pool):
    slots = cfg["slots"]
    by_slot = {s: [m for m in pool if m["slot"] == s] for s in slots}
    for s, ms in by_slot.items():
        if not ms:
            raise SystemExit(f"{cfg['key']}: no meals for slot {s}")
    days = []
    for d in range(cfg["days"]):
        week = d // 7
        day = {"n": d + 1, "meals": {}}
        for si, s in enumerate(slots):
            ms = by_slot[s]
            day["meals"][s] = ms[(d + week * (si + 2)) % len(ms)]
        days.append(day)

    # per-day scale factors for calorie-target plans
    for day in days:
        total = sum(meal_macros(m)["kcal"] for m in day["meals"].values())
        if cfg.get("target_kcal"):
            factor = max(0.75, min(1.3, cfg["target_kcal"] / total))
        else:
            factor = 1.0
        day["scale"] = round(factor, 2)
        day["macros"] = {k: 0 for k in ("kcal", "p", "f")} | {"c": 0.0}
        for m in day["meals"].values():
            mm = meal_macros(m, day["scale"])
            for k in day["macros"]:
                day["macros"][k] += mm[k]
        day["macros"] = {k: (round(v, 1) if k == "c" else round(v)) for k, v in day["macros"].items()}
    return days


def grocery_by_week(cfg, days):
    weeks = []
    for w in range(math.ceil(cfg["days"] / 7)):
        agg = {}
        for day in days[w * 7:(w + 1) * 7]:
            for m in day["meals"].values():
                for it in m["ingredients"]:
                    ing = ING[it["id"]]
                    if it["id"] == "salt":
                        continue
                    if "qty" in it:
                        agg.setdefault(it["id"], [0, "unit"])[0] += it["qty"]
                    else:
                        agg.setdefault(it["id"], [0, "g"])[0] += it["g"] * day["scale"]
        rows = []
        for iid, (amt, unit) in agg.items():
            ing = ING[iid]
            if unit == "unit":
                disp = f"{int(round(amt))} eggs" if iid == "egg" else f"{int(round(amt))}"
            elif amt >= 1000:
                disp = f"{amt/1000:.1f} kg ({amt/453.6:.1f} lb)"
            else:
                disp = f"{int(round(amt/5)*5)} g"
            rows.append({"cat": ing["cat"], "name": ing["name"], "disp": disp})
        order = {"meat": 0, "seafood": 1, "eggs_dairy": 2, "produce": 3, "pantry": 4}
        rows.sort(key=lambda r: (order.get(r["cat"], 9), r["name"]))
        weeks.append(rows)
    return weeks


# ---------- themes ----------

CW = {"BG": "#faf5ec", "INK": "#2c1810", "SOFT": "#7a5c44", "ACCENT": "#a8341f",
      "LINE": "#c9ab8c", "HEADBG": "#2c1810", "HEADINK": "#f4e4d4", "LBLBG": "#f1e6d4",
      "HEAD_FONT": "'Libre Baskerville', Georgia, serif",
      "BODY_FONT": "'Source Sans 3', Helvetica, sans-serif",
      "BRAND": "Carnivore Weekly", "URL": "carnivoreweekly.com",
      "BONUS": "carnivoreweekly.com/bonus"}
KD = {"BG": "#f1f5f9", "INK": "#0f172a", "SOFT": "#475569", "ACCENT": "#0e9db8",
      "LINE": "#b9c8d4", "HEADBG": "#0b1620", "HEADINK": "#e2eef7", "LBLBG": "#e2e8f0",
      "HEAD_FONT": "'Inter', Helvetica, sans-serif",
      "BODY_FONT": "'Inter', Helvetica, sans-serif",
      "BRAND": "KetoDial", "URL": "ketodial.com", "BONUS": "ketodial.com/bonus.html"}
PESC = CW | {"ACCENT": "#1b6d80", "HEADBG": "#12333c", "LINE": "#9dbcc4", "LBLBG": "#e6efe9"}
MED = CW | {"ACCENT": "#5a7d2a", "HEADBG": "#2f3d1c", "LINE": "#b8c49a", "LBLBG": "#eef0e2"}

CONFIGS = {
    "carnivore": {"key": "carnivore", "file": "meals-carnivore.json", "pool": "carnivore",
                  "title": "30-Day Carnivore Meal Plan", "days": 30,
                  "slots": ["breakfast", "lunch", "dinner"], "target_kcal": None,
                  "theme": CW, "out": "carnivore-30-day-meal-plan.pdf"},
    "lion": {"key": "lion", "file": "meals-carnivore.json", "pool": "lion",
             "title": "Lion Diet 30-Day Protocol", "days": 30,
             "slots": ["meal", "meal2"], "target_kcal": None,
             "theme": CW, "out": "lion-diet-30-day-protocol.pdf", "lion_extra": True},
    "keto": {"key": "keto", "file": "meals-marcus.json", "pool": "keto",
             "title": "28-Day Keto Meal Plan", "subtitle_kcal": "1500 Calorie", "days": 28,
             "slots": ["breakfast", "lunch", "dinner", "snack"], "target_kcal": 1500,
             "theme": KD, "out": "keto-28-day-meal-plan-1500.pdf"},
    "lowcarb": {"key": "lowcarb", "file": "meals-marcus.json", "pool": "lowcarb+keto",
                "title": "28-Day Low Carb Meal Plan", "subtitle_kcal": "1500 Calorie", "days": 28,
                "slots": ["breakfast", "lunch", "dinner", "snack"], "target_kcal": 1500,
                "theme": KD, "out": "lowcarb-28-day-meal-plan-1500.pdf"},
    "pescatarian": {"key": "pescatarian", "file": "meals-marcus.json", "pool": "pescatarian",
                    "title": "30-Day Pescatarian Low-Carb Meal Plan", "days": 30,
                    "slots": ["breakfast", "lunch", "dinner"], "target_kcal": 1450,
                    "theme": PESC, "out": "pescatarian-30-day-meal-plan.pdf"},
    "mediterranean": {"key": "mediterranean", "file": "meals-marcus.json", "pool": "mediterranean",
                      "title": "7-Day Mediterranean Meal Plan", "days": 7,
                      "slots": ["breakfast", "lunch", "dinner", "snack"], "target_kcal": None,
                      "theme": MED, "out": "mediterranean-7-day-meal-plan.pdf"},
}


def load_pool(cfg):
    data = json.loads((HERE / cfg["file"]).read_text())
    if cfg["pool"] == "lowcarb+keto":
        pool = data["keto"] + data["lowcarb"]
    else:
        pool = data[cfg["pool"]]
    if cfg["key"] == "lion":
        # lion runs 2 meals/day from one pool; duplicate under second slot name
        pool = pool + [m | {"slot": "meal2"} for m in pool]
    validate_pool(pool)
    return pool


# ---------- rendering ----------

def esc(s):
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def page_css(t):
    return f"""
  @page {{ size: letter; margin: 0; }}
  * {{ margin:0; padding:0; box-sizing:border-box; }}
  body {{ -webkit-print-color-adjust:exact; print-color-adjust:exact;
    font-family:{t['BODY_FONT']}; background:{t['BG']}; color:{t['INK']}; }}
  .page {{ width:8.5in; height:11in; padding:0.55in 0.6in; page-break-after:always; position:relative; }}
  .page:last-child {{ page-break-after:auto; }}
  .kicker {{ color:{t['ACCENT']}; font-weight:700; letter-spacing:2.5px; font-size:10pt; text-transform:uppercase; }}
  h1 {{ font-family:{t['HEAD_FONT']}; font-size:30pt; line-height:1.12; margin:14px 0 10px; }}
  h2 {{ font-family:{t['HEAD_FONT']}; font-size:15pt; color:{t['ACCENT']}; margin:0 0 10px; }}
  p, li {{ font-size:10.5pt; line-height:1.62; color:{t['INK']}; }}
  .soft {{ color:{t['SOFT']}; }}
  .rule {{ border-bottom:3px solid {t['ACCENT']}; margin:14px 0 18px; }}
  table {{ width:100%; border-collapse:collapse; table-layout:fixed; }}
  th, td {{ border:1px solid {t['LINE']}; padding:5px 7px; font-size:8.6pt; vertical-align:top; text-align:left; }}
  th {{ background:{t['HEADBG']}; color:{t['HEADINK']}; font-size:8pt; letter-spacing:0.5px; }}
  td.day {{ background:{t['LBLBG']}; font-weight:700; width:0.62in; }}
  td .mname {{ font-weight:600; }}
  td.macros {{ width:1.02in; font-size:7.8pt; color:{t['SOFT']}; }}
  .gcat {{ font-weight:700; color:{t['ACCENT']}; text-transform:uppercase; font-size:8.5pt; letter-spacing:1px; margin:10px 0 4px; }}
  .gitem {{ font-size:9.5pt; padding:1.5px 0; border-bottom:1px dotted {t['LINE']}; display:flex; justify-content:space-between; }}
  .cols {{ column-count:2; column-gap:28px; }}
  .dir {{ break-inside:avoid; margin-bottom:9px; padding-bottom:7px; border-bottom:1px dotted {t['LINE']}; }}
  .dir .dn {{ font-weight:700; font-size:9.5pt; }}
  .dir .dm {{ font-size:8.2pt; color:{t['ACCENT']}; margin:1px 0; }}
  .dir .dd {{ font-size:8.8pt; color:{t['SOFT']}; }}
  .foot {{ position:absolute; bottom:0.4in; left:0.6in; right:0.6in; display:flex; justify-content:space-between;
    border-top:2px solid {t['LINE']}; padding-top:6px; font-size:8pt; color:{t['SOFT']}; }}
  .foot b {{ color:{t['ACCENT']}; }}
  ul.tick {{ list-style:none; margin:8px 0; }}
  ul.tick li {{ padding-left:20px; position:relative; margin-bottom:6px; }}
  ul.tick li::before {{ content:"✓"; position:absolute; left:0; color:{t['ACCENT']}; font-weight:700; }}
"""


def footer(t, extra=""):
    return f'<div class="foot"><b>{t["URL"]}</b><span>{extra or "Free 30-day tracker + starter emails at " + t["BONUS"]}</span></div>'


def render_html(cfg, days, groceries, pool):
    t = cfg["theme"]
    pr = PROSE.get(cfg["key"], {})
    sub = f' <span style="font-weight:400; font-size:20pt; color:{t["SOFT"]}">({cfg["subtitle_kcal"]})</span>' if cfg.get("subtitle_kcal") else ""
    tagline = esc(pr.get("tagline", ""))
    weeks = math.ceil(cfg["days"] / 7)
    avg = {k: round(sum(d["macros"][k] for d in days) / len(days)) for k in ("kcal", "p", "f", "c")}

    pages = []
    # cover
    inside = "".join(f"<li>{esc(x)}</li>" for x in pr.get("inside", [
        f"{cfg['days']} days of menus, every macro computed",
        "Weekly grocery lists, grouped the way stores are laid out",
        "A meal directory with method notes for every dish"]))
    pages.append(f"""<div class="page">
      <div style="margin-top:1.4in;"><div class="kicker">{t['BRAND']} — Printable Meal Plan</div>
      <h1 style="font-size:38pt;">{esc(cfg['title'])}{sub}</h1>
      <p class="soft" style="font-size:13pt;">{tagline}</p>
      <div class="rule"></div>
      <h2>What's inside</h2><ul class="tick">{inside}</ul>
      <p class="soft" style="margin-top:16px;">Average day across this plan: <b style="color:{t['INK']}">{avg['kcal']} kcal · {avg['p']}g protein · {avg['f']}g fat · {avg['c']}g net carbs</b></p>
      </div>{footer(t)}</div>""")

    # intro page
    tips = "".join(f"<li>{esc(x)}</li>" for x in pr.get("tips", []))
    pages.append(f"""<div class="page">
      <div class="kicker">Read this first</div><h1 style="font-size:22pt;">How this plan works</h1>
      <div class="rule"></div>
      <p>{esc(pr.get('intro', ''))}</p>
      <h2 style="margin-top:18px;">How to use it</h2>
      <p>{esc(pr.get('howto', ''))}</p>
      <h2 style="margin-top:18px;">Three tips from the field</h2>
      <ul class="tick">{tips}</ul>{footer(t)}</div>""")

    # week pages
    slot_labels = {"breakfast": "Breakfast", "lunch": "Lunch", "dinner": "Dinner",
                   "snack": "Snack", "meal": "Meal One", "meal2": "Meal Two"}
    for w in range(weeks):
        rows = ""
        for day in days[w * 7:(w + 1) * 7]:
            cells = "".join(
                f'<td><span class="mname">{esc(day["meals"][s]["name"])}</span></td>'
                for s in cfg["slots"])
            m = day["macros"]
            rows += (f'<tr><td class="day">Day {day["n"]}</td>{cells}'
                     f'<td class="macros">{m["kcal"]} kcal<br>P {m["p"]} · F {m["f"]}<br>NC {m["c"]}g</td></tr>')
        heads = "".join(f"<th>{slot_labels[s]}</th>" for s in cfg["slots"])
        pages.append(f"""<div class="page">
          <div class="kicker">{esc(cfg['title'])}</div><h1 style="font-size:20pt;">Week {w+1}</h1>
          <div class="rule"></div>
          <table><tr><th style="width:0.62in">DAY</th>{heads}<th style="width:1.02in">DAY MACROS</th></tr>{rows}</table>
          <p class="soft" style="margin-top:10px; font-size:8.5pt;">Macros are computed from the exact ingredient amounts in the Meal Directory. Swap any meal for another in the same column, same week, and you'll stay close.</p>
          {footer(t)}</div>""")

    # grocery pages (2 weeks per page)
    for gp in range(0, weeks, 2):
        cols = ""
        for w in range(gp, min(gp + 2, weeks)):
            items = ""
            last_cat = None
            for r in groceries[w]:
                if r["cat"] != last_cat:
                    cat_label = {"meat": "Meat", "seafood": "Seafood", "eggs_dairy": "Eggs & Dairy",
                                 "produce": "Produce", "pantry": "Pantry"}[r["cat"]]
                    items += f'<div class="gcat">{cat_label}</div>'
                    last_cat = r["cat"]
                items += f'<div class="gitem"><span>{esc(r["name"])}</span><b>{r["disp"]}</b></div>'
            cols += f'<div style="break-inside:avoid;"><h2>Week {w+1} grocery list</h2>{items}</div>'
        pages.append(f"""<div class="page">
          <div class="kicker">{esc(cfg['title'])}</div><h1 style="font-size:20pt;">Grocery lists</h1>
          <div class="rule"></div><div class="cols">{cols}</div>{footer(t)}</div>""")

    # meal directory
    seen, dirs = set(), ""
    for m in pool:
        if m["id"] in seen or m["slot"] == "meal2":
            continue
        seen.add(m["id"])
        mm = meal_macros(m)
        ings = ", ".join(
            (f'{it["qty"]} {ING[it["id"]]["name"].lower()}' if "qty" in it else f'{it["g"]}g {ING[it["id"]]["name"].lower()}')
            for it in m["ingredients"] if it["id"] != "salt")
        dirs += (f'<div class="dir"><div class="dn">{esc(m["name"])}</div>'
                 f'<div class="dm">{mm["kcal"]} kcal · P {mm["p"]}g · F {mm["f"]}g · NC {mm["c"]}g</div>'
                 f'<div class="dd">{esc(ings)}, salt. {esc(m["method"])}</div></div>')
    pages.append(f"""<div class="page">
      <div class="kicker">{esc(cfg['title'])}</div><h1 style="font-size:20pt;">Meal directory</h1>
      <div class="rule"></div><div class="cols">{dirs}</div>{footer(t)}</div>""")

    # lion extra: reintroduction + journal
    if cfg.get("lion_extra") and pr.get("reintro"):
        pages.append(f"""<div class="page">
          <div class="kicker">After the 30 days</div><h1 style="font-size:20pt;">The reintroduction plan</h1>
          <div class="rule"></div><p>{esc(pr['reintro'])}</p>
          <h2 style="margin-top:16px;">The order, one food at a time</h2>
          <table><tr><th>Step</th><th>Reintroduce</th><th>Watch window</th><th>What to note</th></tr>
          <tr><td>1</td><td>Egg yolks</td><td>3 days</td><td>Digestion, skin, joints, sleep, mood</td></tr>
          <tr><td>2</td><td>Butter or ghee</td><td>3 days</td><td>Same list, every day, honestly</td></tr>
          <tr><td>3</td><td>Other ruminant cuts and organs</td><td>3 days</td><td>Energy and digestion first</td></tr>
          <tr><td>4</td><td>Whole eggs</td><td>3 days</td><td>Whites are the more common trigger</td></tr>
          <tr><td>5</td><td>Hard cheeses, then cream</td><td>3 days each</td><td>Skin and sinuses tell on dairy</td></tr></table>
          <p class="soft" style="margin-top:10px;">One new food at a time. If symptoms return, drop the food, let things settle, and try the next one. Keep the journal below every single day.</p>
          {footer(t)}</div>""")

    body = "".join(pages)
    return f"""<!DOCTYPE html><html><head><meta charset="UTF-8">
<link href="https://fonts.googleapis.com/css2?family=Libre+Baskerville:wght@400;700&family=Source+Sans+3:wght@400;600;700&family=Inter:wght@400;600;800&display=swap" rel="stylesheet">
<style>{page_css(t)}</style></head><body>{body}</body></html>"""


def build(keys):
    from playwright.sync_api import sync_playwright
    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        page = browser.new_page()
        for key in keys:
            cfg = CONFIGS[key]
            pool = load_pool(cfg)
            days = compose(cfg, pool)
            groceries = grocery_by_week(cfg, days)
            html = render_html(cfg, days, groceries, pool)
            page.set_content(html, wait_until="networkidle")
            page.emulate_media(media="print")
            out = OUT_DIR / cfg["out"]
            page.pdf(path=str(out), width="8.5in", height="11in",
                     margin={"top": "0", "right": "0", "bottom": "0", "left": "0"},
                     print_background=True, scale=1.0)
            avg = round(sum(d["macros"]["kcal"] for d in days) / len(days))
            print(f"built {out.name}: {cfg['days']} days, avg {avg} kcal/day")
        browser.close()


if __name__ == "__main__":
    keys = sys.argv[1:] or [k for k in CONFIGS if (HERE / CONFIGS[k]["file"]).exists()]
    keys = [k for k in keys if (HERE / CONFIGS[k]["file"]).exists()]
    build(keys)
