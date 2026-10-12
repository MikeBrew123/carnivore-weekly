#!/usr/bin/env python3
"""Build the "gift a report" pages for Carnivore Weekly, KetoDial and PescoDial.

One generator, three brands. Copy comes from api/gift-copy.js (Sarah, 2026-10-11),
the same file the worker uses for the card and email, so the page and the card can
never say different things.

Outputs:
  public/gift/index.html, public/gift/redeem/index.html                 (CW, standalone)
  ketodial/public/gift/index.html, ketodial/public/gift/redeem/index.html  (KD, standalone)
  pescodial/templates/pages/gift.html, gift-redeem.html                   (PD, extends base.html;
                                                                           run generate_pd_site.py after)

Run: python3 scripts/build_gift_pages.py
"""
import html
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
API = "https://carnivore-report-api-production.iambrew.workers.dev"

BRANDS = {
    "cw": {
        "name": "Carnivore Weekly",
        "origin": "https://carnivoreweekly.com",
        "calc": "/calculator.html?coupon=",
        "redeem_hint": "Your code will already be filled in at the payment step. Press Apply next to it and the price drops to $0.",
        "ga": "G-NR4JVKW2JV",
        "fonts": "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&family=Merriweather:ital,wght@0,400;0,700;1,400&display=swap",
        "head": "'Playfair Display', Georgia, serif",
        "body": "Merriweather, Georgia, serif",
        "note": "Merriweather, Georgia, serif",
        "bg": "#F2F0E6", "paper": "#fffdf7", "ink": "#1a120b", "soft": "#5c4433",
        "accent": "#8b4513", "accent_ink": "#ffffff", "rule": "#d4a574", "line": "#e4dccb",
        "body_size": "17px", "leading": "1.7",
    },
    "kd": {
        "name": "KetoDial",
        "origin": "https://ketodial.com",
        "calc": "/?gift=",
        "redeem_hint": "When you've answered the questions, press Get my gift reports. There's nothing to pay.",
        "ga": "G-0Y79FB48EG",
        "fonts": "https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700;800&family=Newsreader:ital,opsz,wght@0,16..72,400;1,16..72,400&display=swap",
        "head": "'Hanken Grotesk', -apple-system, 'Segoe UI', sans-serif",
        "body": "'Hanken Grotesk', -apple-system, 'Segoe UI', sans-serif",
        "note": "Newsreader, Georgia, serif",
        "bg": "#f1f5f9", "paper": "#ffffff", "ink": "#0f172a", "soft": "#475569",
        "accent": "#0b1620", "accent_ink": "#ffffff", "rule": "#38bdf8", "line": "#e2e8f0",
        "body_size": "17px", "leading": "1.6",
    },
    "pd": {
        "name": "PescoDial",
        "origin": "https://www.pescodial.com",
        "calc": "/calculator/?coupon=",
        "redeem_hint": "Your code will already be filled in at the end, so your plan comes to $0.",
        "ga": None,  # base.html carries PescoDial's analytics
        "fonts": None,  # site.css loads Source Serif 4 and Atkinson Hyperlegible
        "head": "'Source Serif 4', Georgia, serif",
        "body": "'Atkinson Hyperlegible', -apple-system, 'Segoe UI', sans-serif",
        "note": "'Source Serif 4', Georgia, serif",
        "bg": "#f7f0e3", "paper": "#fffbf4", "ink": "#1f2328", "soft": "#4a4f57",
        "accent": "#b04f2c", "accent_ink": "#ffffff", "rule": "#1d3a57", "line": "#d8ccb6",
        "body_size": "18px", "leading": "1.65",
    },
}


def load_copy():
    src = (ROOT / "api/gift-copy.js").read_text()
    body = src[src.index("export default") + len("export default"):].strip().rstrip(";")
    return json.loads(body)


e = html.escape


def js(v):
    return json.dumps(v, ensure_ascii=False).replace("</", "<\\/")


def css(b):
    return f"""
.gift-page{{--g-bg:{b['bg']};--g-paper:{b['paper']};--g-ink:{b['ink']};--g-soft:{b['soft']};--g-accent:{b['accent']};
  --g-accent-ink:{b['accent_ink']};--g-rule:{b['rule']};--g-line:{b['line']};--g-head:{b['head']};--g-body:{b['body']};--g-note:{b['note']};
  background:var(--g-bg);color:var(--g-ink);font-family:var(--g-body);font-size:{b['body_size']};line-height:{b['leading']};}}
.gift-page *{{box-sizing:border-box}}
.gift-page a{{color:var(--g-accent)}}
.g-top{{max-width:1080px;margin:0 auto;padding:18px 20px}}
.g-top a{{font-family:var(--g-head);font-weight:700;font-size:20px;color:var(--g-ink);text-decoration:none}}
.g-wrap{{max-width:1080px;margin:0 auto;padding:12px 20px 72px}}
.g-hero{{display:grid;gap:28px;grid-template-columns:1fr;grid-template-areas:"head" "preview" "form";padding:12px 0 40px}}
@media (min-width:900px){{.g-hero{{grid-template-columns:minmax(0,1.05fr) minmax(0,.95fr);grid-template-areas:"head preview" "form preview";column-gap:56px;row-gap:22px;align-items:start}}
  .g-preview{{position:sticky;top:24px}}}}
.g-head{{grid-area:head}}.g-preview{{grid-area:preview}}.g-formwrap{{grid-area:form}}
.g-head h1{{font-family:var(--g-head);font-weight:800;font-size:clamp(34px,5.4vw,54px);line-height:1.08;letter-spacing:-.01em;margin:0 0 16px;max-width:15ch;text-wrap:balance}}
.g-sub{{margin:0;max-width:34em;color:var(--g-soft)}}
.g-form{{display:grid;gap:16px;max-width:520px}}
.g-pair{{display:grid;gap:16px}}
@media (min-width:560px){{.g-pair{{grid-template-columns:1fr 1fr}}}}
.g-field label{{display:block;font-weight:700;font-size:15px;margin:0 0 6px}}
.g-field input,.g-field textarea{{width:100%;font:inherit;font-size:17px;color:var(--g-ink);background:var(--g-paper);border:1.5px solid var(--g-line);border-radius:10px;padding:12px 14px}}
.g-field textarea{{min-height:104px;resize:vertical;font-family:var(--g-note);font-style:italic;line-height:1.55}}
.g-field input:focus-visible,.g-field textarea:focus-visible,.g-btn:focus-visible,.g-faq summary:focus-visible{{outline:3px solid var(--g-rule);outline-offset:2px}}
.g-help{{display:flex;justify-content:space-between;gap:12px;font-size:14px;color:var(--g-soft);margin-top:6px}}
.gift-page .g-btn,.gift-page a.g-btn{{appearance:none;border:0;cursor:pointer;font-family:var(--g-body);font-weight:700;font-size:18px;background:var(--g-accent);color:var(--g-accent-ink);border-radius:10px;padding:16px 24px;width:100%}}
.gift-page .g-btn[disabled]{{opacity:.6;cursor:progress}}
.g-price{{margin:2px 0 0;font-size:15px;color:var(--g-soft)}}
.g-err{{margin:0;min-height:1.2em;color:#a1271b;font-weight:700;font-size:15px}}
.g-fine{{margin:6px 0 0;font-size:14px;color:var(--g-soft);max-width:520px}}
.g-preview-cap{{font-size:14px;color:var(--g-soft);margin:0 0 10px}}
.g-card{{background:var(--g-paper);border:1px solid var(--g-line);border-radius:16px;overflow:hidden;box-shadow:0 18px 40px -24px rgba(40,25,10,.45);transform:rotate(-1.2deg);transition:transform .4s ease}}
.g-card:hover{{transform:rotate(0)}}
@media (prefers-reduced-motion:reduce){{.g-card{{transform:none;transition:none}}}}
.g-card-band{{height:10px;background:var(--g-accent)}}
.g-card-in{{padding:26px 28px 28px}}
.g-card-from-site{{font-size:13px;color:var(--g-soft);margin:0 0 8px}}
.g-card h2{{font-family:var(--g-head);font-size:27px;line-height:1.2;margin:0 0 6px}}
.g-card-from{{margin:0 0 14px;color:var(--g-soft);font-size:15px}}
.g-card-note{{font-family:var(--g-note);font-style:italic;font-size:17px;line-height:1.55;border-left:3px solid var(--g-rule);padding:2px 0 2px 14px;margin:0 0 14px;white-space:pre-line;overflow-wrap:anywhere}}
.g-card-note:empty{{display:none}}
.g-card-body{{font-size:15px;line-height:1.6;margin:0 0 18px}}
.g-card-code{{display:inline-block;border:2px dashed var(--g-rule);border-radius:10px;padding:10px 18px;font-family:'Courier New',monospace;font-weight:700;font-size:20px;letter-spacing:3px}}
.g-card-code-cap{{font-size:13px;color:var(--g-soft);margin:6px 0 0}}
.g-section{{border-top:1px solid var(--g-line);padding:40px 0 8px;display:grid;gap:12px}}
@media (min-width:900px){{.g-section{{grid-template-columns:280px minmax(0,1fr);column-gap:56px}}}}
.g-section h2{{font-family:var(--g-head);font-size:28px;line-height:1.2;margin:0}}
.g-list{{margin:0;padding:0 0 0 1.2em;max-width:36em}}
.g-list li{{margin:0 0 10px;padding-left:4px}}
.g-steps{{margin:0;padding:0;list-style:none;counter-reset:s;max-width:36em}}
.g-steps li{{counter-increment:s;position:relative;padding:0 0 18px 52px}}
.g-steps li::before{{content:counter(s);position:absolute;left:0;top:-2px;width:36px;height:36px;border-radius:50%;border:2px solid var(--g-rule);display:grid;place-items:center;font-family:var(--g-head);font-weight:700}}
.g-faq{{max-width:40em}}
.g-faq details{{border-bottom:1px solid var(--g-line);padding:14px 0}}
.g-faq summary{{cursor:pointer;font-weight:700}}
.g-faq p{{margin:10px 0 0}}
.g-thanks{{max-width:640px;margin:16px auto 40px;background:var(--g-paper);border:1px solid var(--g-line);border-radius:16px;padding:32px 28px}}
.g-thanks .g-thanks-h{{font-family:var(--g-head);font-size:clamp(30px,4.6vw,44px);line-height:1.1;margin:0 0 14px}}
.gift-page .g-thanks a.g-btn{{display:inline-block;width:auto;text-decoration:none;margin-top:8px}}
.g-note-sm{{font-size:15px;color:var(--g-soft)}}
.g-redeem{{max-width:620px;margin:8px auto 56px;text-align:center}}
.g-redeem h1{{font-family:var(--g-head);font-weight:800;font-size:clamp(32px,5vw,48px);line-height:1.1;margin:8px 0 14px;text-wrap:balance}}
.g-redeem .g-sub{{margin:0 auto 26px}}
.g-redeem form{{display:grid;gap:12px;max-width:380px;margin:0 auto;text-align:left}}
.g-redeem input{{text-transform:uppercase;font-family:'Courier New',monospace;font-weight:700;letter-spacing:3px;text-align:center;font-size:22px}}
.g-foot{{max-width:1080px;margin:0 auto;padding:24px 20px 40px;font-size:14px;color:var(--g-soft)}}
[hidden]{{display:none !important}}
"""


def card_preview(site, c):
    b = BRANDS[site]
    card = c["card"]
    return f"""<aside class="g-preview" aria-label="Preview of the gift card">
      <p class="g-preview-cap">This is the card they'll get. It fills in as you type.</p>
      <div class="g-card">
        <div class="g-card-band"></div>
        <div class="g-card-in">
          <p class="g-card-from-site">A gift from {e(b['name'])}</p>
          <h2 id="pvTitle">{e(card['title_no_name'])}</h2>
          <p class="g-card-from" id="pvFrom" hidden></p>
          <p class="g-card-note" id="pvNote"></p>
          <p class="g-card-body">{e(card['body'])}</p>
          <span class="g-card-code">{site.upper()}-&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;</span>
          <p class="g-card-code-cap">Their own code, made when you check out</p>
        </div>
      </div>
    </aside>"""


def gift_main(site, c):
    l = c["landing"]
    f = l["form_labels"]
    s = c["success_page"]
    get = "".join(f"<li>{e(x)}</li>" for x in l["what_they_get"])
    how = "".join(f"<li>{e(x)}</li>" for x in l["how_it_works"])
    faq = "".join(f"<details><summary>{e(q['q'])}</summary><p>{e(q['a'])}</p></details>" for q in l["faq"])
    return f"""<div class="gift-page" id="giftPage">
  <div class="g-wrap">
    <section class="g-thanks" id="thanks" hidden aria-live="polite">
      <h2 class="g-thanks-h">{e(s['headline'])}</h2>
      <p>{e(s['body'])}</p>
      <p class="g-note-sm" id="thanksStatus">Getting your card ready…</p>
      <a class="g-btn" id="thanksCard" href="#" hidden>Open the printable card</a>
    </section>

    <section class="g-hero" id="hero">
      <div class="g-head">
        <h1>{e(l['headline'])}</h1>
        <p class="g-sub">{e(l['subhead'])}</p>
      </div>
      {card_preview(site, c)}
      <div class="g-formwrap">
        <form class="g-form" id="giftForm" novalidate>
          <div class="g-pair">
            <div class="g-field"><label for="gBuyer">{e(f['your_name'])}</label><input id="gBuyer" name="buyer_name" autocomplete="name" maxlength="60" required></div>
            <div class="g-field"><label for="gRecipient">{e(f['their_first_name'])}</label><input id="gRecipient" name="recipient_name" autocomplete="off" maxlength="60" required></div>
          </div>
          <div class="g-field"><label for="gEmail">{e(f['your_email'])}</label><input id="gEmail" name="buyer_email" type="email" autocomplete="email" required></div>
          <div class="g-field"><label for="gNote">{e(f['note'])}</label>
            <textarea id="gNote" name="note" maxlength="280" placeholder="{e(f['note_placeholder'])}" aria-describedby="gNoteHelp"></textarea>
            <div class="g-help" id="gNoteHelp"><span>{e(f['note_help'])}</span><span id="gCount">0/280</span></div>
          </div>
          <p class="g-err" id="gErr" role="alert"></p>
          <button class="g-btn" id="gBtn" type="submit">{e(l['button'])}</button>
          <p class="g-price">{e(l['price_line'])}</p>
        </form>
        <p class="g-fine">{e(l['fine_print'])}</p>
      </div>
    </section>

    <section class="g-section" id="what"><h2>What they get</h2><ul class="g-list">{get}</ul></section>
    <section class="g-section"><h2>How it works</h2><ol class="g-steps">{how}</ol></section>
    <section class="g-section"><h2>Questions</h2><div class="g-faq">{faq}</div></section>
  </div>
</div>
<script>
(function(){{
  var API={js(API)}, SITE={js(site)}, CARD={js(c['card'])};
  var $=function(id){{return document.getElementById(id);}};
  function track(n,p){{try{{if(window.gtag)gtag('event',n,p||{{}});}}catch(e){{}}}}
  function fill(t,v){{return t.replace(/\\{{(\\w+)\\}}/g,function(_,k){{return v[k]||'';}});}}
  var buyer=$('gBuyer'), rec=$('gRecipient'), note=$('gNote');
  function preview(){{
    var r=rec.value.trim(), b=buyer.value.trim();
    $('pvTitle').textContent = r ? fill(CARD.title,{{recipient_name:r}}) : CARD.title_no_name;
    $('pvFrom').hidden=!b; $('pvFrom').textContent = b ? fill(CARD.line_from,{{buyer_name:b}}) : '';
    $('pvNote').textContent = note.value.trim();
    $('gCount').textContent = note.value.length+'/280';
  }}
  [buyer,rec,note].forEach(function(el){{el.addEventListener('input',preview);}});
  preview();

  var params=new URLSearchParams(location.search);
  if(params.get('cancelled')) $('gErr').textContent='Checkout was closed. Nothing was charged.';

  $('giftForm').addEventListener('submit',function(ev){{
    ev.preventDefault();
    var err=$('gErr'); err.textContent='';
    var email=$('gEmail').value.trim();
    if(!buyer.value.trim()){{err.textContent='Please add your name. It goes on the card.';buyer.focus();return;}}
    if(!rec.value.trim()){{err.textContent='Please add their first name. The card is addressed to them.';rec.focus();return;}}
    if(!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)){{err.textContent='Please check your email address. We need it to send you the card.';$('gEmail').focus();return;}}
    var btn=$('gBtn'); btn.disabled=true; var label=btn.textContent; btn.textContent='Opening secure checkout…';
    track('gift_begin_checkout',{{site:SITE}});
    fetch(API+'/gift/checkout',{{method:'POST',headers:{{'Content-Type':'application/json'}},
      body:JSON.stringify({{site:SITE,buyer_name:buyer.value,buyer_email:email,recipient_name:rec.value,note:note.value}})}})
      .then(function(r){{return r.json().then(function(j){{return {{ok:r.ok,j:j}};}});}})
      .then(function(res){{
        if(res.ok&&res.j.url){{location.assign(res.j.url);return;}}
        err.textContent=(res.j&&res.j.message)||'We could not open checkout. Please try again in a minute.';
        btn.disabled=false; btn.textContent=label;
      }})
      .catch(function(){{err.textContent='We could not reach checkout. Check your connection and try again.';btn.disabled=false;btn.textContent=label;}});
  }});

  var cs=params.get('cs');
  if(params.get('bought')&&cs){{
    $('hero').hidden=true; $('thanks').hidden=false;
    try{{ if(!sessionStorage.getItem('giftTracked:'+cs)){{ sessionStorage.setItem('giftTracked:'+cs,'1'); track('gift_purchase',{{site:SITE}}); }} }}catch(e){{}}
    var tries=0;
    (function poll(){{
      fetch(API+'/gift/status?cs='+encodeURIComponent(cs)).then(function(r){{return r.json();}}).then(function(j){{
        if(j&&j.ready){{
          $('thanksStatus').textContent = j.emailed ? "We\u2019ve sent it to "+j.buyer_email+". If that address is not quite right, your card and code are here:" : 'Your card is ready and the email is on its way. You can print it now:';
          var a=$('thanksCard'); a.href=j.card_url; a.hidden=false; return;
        }}
        if(++tries<20) setTimeout(poll,3000);
        else $('thanksStatus').textContent="Your payment went through. The card email can take a few minutes. If it hasn\u2019t arrived within an hour, reply to any of our emails and we\u2019ll send it.";
      }}).catch(function(){{ if(++tries<20) setTimeout(poll,4000); }});
    }})();
  }}
}})();
</script>"""


def redeem_main(site, c):
    r = c["redeem_page"]
    b = BRANDS[site]
    return f"""<div class="gift-page">
  <div class="g-wrap">
    <section class="g-redeem">
      <h1>{e(r['headline'])}</h1>
      <p class="g-sub">{e(r['subhead'])}</p>
      <form id="redeemForm" novalidate>
        <div class="g-field"><label for="rCode">{e(r['code_label'])}</label>
          <input id="rCode" name="code" autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="14" placeholder="{site.upper()}-XXXXXXXX" required></div>
        <p class="g-err" id="rErr" role="alert"></p>
        <button class="g-btn" id="rBtn" type="submit">{e(r['button'])}</button>
      </form>
      <p class="g-note-sm" style="margin-top:16px">{e(b['redeem_hint'])}</p>
      <p class="g-note-sm" style="margin-top:22px">Want to give one too? <a href="/gift/">Give a plan</a>.</p>
    </section>
  </div>
</div>
<script>
(function(){{
  var API={js(API)}, SITE={js(site)}, CALC={js(b['calc'])};
  var box=document.getElementById('rCode'), err=document.getElementById('rErr'), btn=document.getElementById('rBtn');
  var q=new URLSearchParams(location.search).get('code'); if(q) box.value=q.toUpperCase();
  document.getElementById('redeemForm').addEventListener('submit',function(ev){{
    ev.preventDefault(); err.textContent='';
    var code=box.value.trim().toUpperCase();
    if(!code){{err.textContent='Enter the code from your gift card.';box.focus();return;}}
    btn.disabled=true;
    fetch(API+'/gift/check',{{method:'POST',headers:{{'Content-Type':'application/json'}},body:JSON.stringify({{code:code,site:SITE}})}})
      .then(function(r){{return r.json().then(function(j){{return {{ok:r.ok,j:j}};}});}})
      .then(function(res){{
        if(res.ok&&res.j.ok){{
          try{{if(window.gtag)gtag('event','gift_redeem_start',{{site:SITE}});}}catch(e){{}}
          location.assign(CALC+encodeURIComponent(res.j.code)); return;
        }}
        err.textContent=(res.j&&res.j.message)||{js(r['error_invalid'])}; btn.disabled=false; box.focus();
      }})
      .catch(function(){{err.textContent='We could not check that code just now. Please try again in a minute.';btn.disabled=false;}});
  }});
}})();
</script>"""


def standalone(site, title, desc, main, path, noindex):
    b = BRANDS[site]
    ga = (f"""<script async src="https://www.googletagmanager.com/gtag/js?id={b['ga']}"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){{dataLayer.push(arguments);}}gtag('js',new Date());gtag('config','{b['ga']}');</script>""")
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{e(title)}</title>
<meta name="description" content="{e(desc)}">
<link rel="canonical" href="{b['origin']}{path}">
{'<meta name="robots" content="noindex, nofollow">' if noindex else ''}
<meta property="og:title" content="{e(title)}">
<meta property="og:description" content="{e(desc)}">
<meta property="og:url" content="{b['origin']}{path}">
<meta property="og:type" content="website">
<link rel="icon" href="/favicon.ico">
{ga}
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="{b['fonts']}" rel="stylesheet">
<style>html,body{{margin:0;background:{b['bg']}}}{css(b)}</style>
</head>
<body>
<div class="gift-page"><header class="g-top"><a href="/">{e(b['name'])}</a></header></div>
{main}
<div class="gift-page"><footer class="g-foot">{e(b['name'])}. The plan is general information, not medical advice.</footer></div>
</body>
</html>
"""


def pd_template(title, desc, main, noindex):
    return f"""{{% extends "base.html" %}}
{{% block title %}}{e(title)}{{% endblock %}}
{{% block description %}}{e(desc)}{{% endblock %}}
{{% block head %}}{'<meta name="robots" content="noindex, nofollow">' if noindex else ''}<style>{css(BRANDS['pd'])}</style>{{% endblock %}}
{{% block main %}}
{{% raw %}}
{main}
{{% endraw %}}
{{% endblock %}}
"""


def main():
    copy = load_copy()
    out = []
    for site in ("cw", "kd", "pd"):
        c = copy[site]
        l = c["landing"]
        g_title = f"{l['headline']} | {BRANDS[site]['name']}"
        g_desc = l["subhead"]
        r_title = f"Use your gift code | {BRANDS[site]['name']}"
        r_desc = c["redeem_page"]["subhead"]
        if site == "pd":
            files = {
                ROOT / "pescodial/templates/pages/gift.html": pd_template(g_title, g_desc, gift_main(site, c), False),
                ROOT / "pescodial/templates/pages/gift-redeem.html": pd_template(r_title, r_desc, redeem_main(site, c), True),
            }
        else:
            base = ROOT / ("public" if site == "cw" else "ketodial/public")
            files = {
                base / "gift/index.html": standalone(site, g_title, g_desc, gift_main(site, c), "/gift/", False),
                base / "gift/redeem/index.html": standalone(site, r_title, r_desc, redeem_main(site, c), "/gift/redeem/", True),
            }
        for p, text in files.items():
            if "—" in re.sub(r"<script.*?</script>", "", text, flags=re.S):
                raise SystemExit(f"em-dash in {p}")
            p.parent.mkdir(parents=True, exist_ok=True)
            p.write_text(text)
            out.append(str(p.relative_to(ROOT)))
    print("\n".join(out))


if __name__ == "__main__":
    main()
