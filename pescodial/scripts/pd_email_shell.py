#!/usr/bin/env python3
"""PescoDial email shell: Brew's weekly-guide design (Claude Design, 2026-10-03).

One shell, two layouts:

  DRIP        header + scallop + one body section (Sarah's drip copy) + optional
              calculator box + footer. Used by pescodial/scripts/build_pd_drip.py.
  NEWSLETTER  the full weekly guide: intro, then optional question of the week,
              recipe (image only when a URL is supplied), shopping tip and
              calculator box. render_newsletter(issue) takes a dict; there is no
              default content. The design's sample issue lives only in
              tests/fixtures/pd_newsletter_sample.json.

Binding footer rules (docs/guides/email.md, Brew 2026-10-03):
  * Unsubscribe is the existing signed worker link, injected at send time from a
    merge tag: drip `{$unsubscribe}` (scripts/send_drip.py personalize), newsletter
    `{{unsubscribe_url}}` (scripts/send_newsletter.py personalize_html). There is no
    pescodial.com/unsubscribe or /preferences page, so neither is linked.
  * Postal address is the one CW and KD footers already carry (POSTAL_ADDRESS).
  * Links go to https://www.pescodial.com/ (www: the apex forward drops paths).
    The calculator box points at /#calc, which exists in templates/_calculator.html.

Usage, preview a newsletter from a JSON issue file:
    python3 pescodial/scripts/pd_email_shell.py issue.json > out.html
"""
import html
import json
import sys
from pathlib import Path

SITE = "https://www.pescodial.com/"
CALC_URL = SITE + "#calc"
POSTAL_ADDRESS = "1505 Spring Creek, Whistler, BC, Canada"
DRIP_UNSUBSCRIBE = "{$unsubscribe}"
NEWSLETTER_UNSUBSCRIBE = "{{unsubscribe_url}}"

NAVY, NAVY_DEEP, OLIVE, OLIVE_LIGHT, TERRA = "#1d3a57", "#132a40", "#56632a", "#c6cf91", "#b04f2c"
INK, MUTED, CREAM, PAPER, RULE = "#1f2328", "#4a4f55", "#f7f0e3", "#fffbf4", "#d8ccb6"
SANS = "Verdana,Arial,sans-serif"
SERIF = "Georgia,'Times New Roman',serif"
BODY_TD = (f"font-family:{SANS};font-size:18px;line-height:28px;"
           f"mso-line-height-rule:exactly;color:{INK};")
KICKER = (f"margin:0 0 8px;font-family:{SANS};font-size:14px;line-height:18px;font-weight:bold;"
          f"letter-spacing:1px;text-transform:uppercase;color:{OLIVE};")
H2 = (f"margin:0 0 14px;font-family:{SERIF};font-weight:bold;font-size:24px;"
      f"line-height:30px;color:{NAVY_DEEP};")
LINK = f"color:{NAVY};font-weight:bold;text-decoration:underline;"

attr = html.escape  # attribute values: quotes escaped


def e(text):
    """Text content: escape <, >, & but keep apostrophes readable."""
    return html.escape(text, quote=False)


def with_utm(url, utm):
    """Append the UTM query to pescodial.com links only, before any #fragment."""
    if not utm or "pescodial.com" not in url:
        return url
    base, frag = (url.split("#", 1) + [""])[:2]
    sep = "&" if "?" in base else "?"
    return f"{base}{sep}{utm}" + (f"#{frag}" if frag else "")


def _scallop():
    cell = (f'<td height="12" bgcolor="{NAVY}" style="background:{NAVY};border-radius:0 0 12px 12px;'
            f'font-size:0;line-height:0;">&nbsp;</td>')
    return f"""  <!-- SCALLOP EDGE (square tabs in Outlook, round elsewhere) -->
  <tr>
    <td style="padding:0;font-size:0;line-height:0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="table-layout:fixed;">
        <tr>
          {"".join(cell for _ in range(20))}
        </tr>
      </table>
    </td>
  </tr>"""


def divider():
    return (f'  <tr><td class="px" style="padding:32px 32px 0;"><table role="presentation" width="100%" '
            f'cellpadding="0" cellspacing="0" border="0"><tr><td height="1" bgcolor="{RULE}" '
            f'style="background:{RULE};font-size:0;line-height:0;">&nbsp;</td></tr></table></td></tr>')


def pill(label, url, size=18, pad="15px 28px"):
    return f"""<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:18px;">
        <tr>
          <td bgcolor="{TERRA}" style="background:{TERRA};border-radius:999px;">
            <a href="{attr(url)}" style="display:block;padding:{pad};font-family:{SANS};font-size:{size}px;line-height:22px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:999px;">{e(label)}</a>
          </td>
        </tr>
      </table>"""


def body_section(inner_html, padding="28px 32px 8px"):
    """A body cell holding pre-rendered HTML (paragraphs, lists)."""
    return f"""  <tr>
    <td class="px t-ink" style="padding:{padding};{BODY_TD}">
      {inner_html}
    </td>
  </tr>"""


def intro_section(h1, paragraphs, signoff="Sarah", greeting=None):
    """Newsletter intro. paragraphs are plain text; escaped here."""
    parts = [f'<h1 class="h1 t-sea" style="margin:0 0 14px;font-family:{SERIF};font-weight:normal;'
             f'font-size:34px;line-height:40px;color:{NAVY_DEEP};">{e(h1)}</h1>']
    if greeting:
        parts.append(f'<p style="margin:0 0 16px;">{e(greeting)}</p>')
    parts += [f'<p style="margin:0 0 12px;">{e(p)}</p>' for p in paragraphs]
    if signoff:
        parts.append(f'<p style="margin:12px 0 0;">{e(signoff)}</p>')
    return body_section("\n      ".join(parts))


def question_section(question, answer, link=None, link_label="Read the full answer", utm=None):
    btn = pill(link_label, with_utm(link, utm)) if link else ""
    return f"""  <!-- QUESTION OF THE WEEK -->
  <tr>
    <td class="px" style="padding:28px 32px 0;">
      <p class="t-olive" style="{KICKER}">Question of the week</p>
      <h2 class="t-sea" style="{H2}">{e(question)}</h2>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td class="bg-paper t-ink" bgcolor="{PAPER}" style="background:{PAPER};border:2px solid {OLIVE};border-radius:12px;padding:18px 20px;font-family:{SERIF};font-size:19px;line-height:29px;mso-line-height-rule:exactly;color:{INK};">
            <strong class="t-olive" style="font-family:{SANS};font-size:14px;color:{OLIVE};text-transform:uppercase;letter-spacing:1px;">Quick answer</strong><br>
            {e(answer)}
          </td>
        </tr>
      </table>
      {btn}
    </td>
  </tr>"""


def recipe_section(title, method, meta=None, image_url=None, image_alt="", link=None,
                   link_label="Get the full recipe", utm=None):
    """Recipe block. The photo renders only when an https image URL is supplied;
    there is never a placeholder box in a real send."""
    img = ""
    if image_url:
        if not image_url.startswith("https://"):
            raise ValueError("recipe image_url must be https")
        img = (f'<img src="{attr(image_url)}" width="536" alt="{attr(image_alt)}" '
               f'style="display:block;width:100%;max-width:536px;height:auto;border:0;border-radius:12px;margin:0 0 14px;">')
    meta_html = (f'<p class="t-muted" style="margin:0 0 10px;font-size:16px;line-height:24px;color:{MUTED};">'
                 f'{e(meta)}</p>') if meta else ""
    link_html = (f'<p style="margin:10px 0 0;"><a class="t-link" href="{attr(with_utm(link, utm))}" '
                 f'style="{LINK}">{e(link_label)}</a></p>') if link else ""
    return f"""  <!-- RECIPE -->
  <tr>
    <td class="px t-ink" style="padding:28px 32px 0;{BODY_TD}">
      <p class="t-olive" style="{KICKER}">This week's recipe</p>
      <h2 class="t-sea" style="{H2}">{e(title)}</h2>
      {img}
      {meta_html}
      <p style="margin:0;">{e(method)}</p>
      {link_html}
    </td>
  </tr>"""


def tip_section(title, text, kicker="Shopping tip"):
    return f"""  <!-- SHOPPING TIP -->
  <tr>
    <td class="px t-ink" style="padding:28px 32px 0;{BODY_TD}">
      <p class="t-olive" style="{KICKER}">{e(kicker)}</p>
      <h2 class="t-sea" style="{H2}margin-bottom:12px;">{e(title)}</h2>
      <p style="margin:0;">{e(text)}</p>
    </td>
  </tr>"""


def calculator_box(heading, text, button, utm=None, url=CALC_URL):
    text_html = f'<p style="margin:0 0 16px;color:{CREAM};">{e(text)}</p>' if text else ""
    return f"""  <!-- CALCULATOR -->
  <tr>
    <td class="px" style="padding:32px 32px 0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td bgcolor="{NAVY}" style="background:{NAVY};border-radius:14px;padding:22px 22px 24px;font-family:{SANS};font-size:18px;line-height:27px;mso-line-height-rule:exactly;color:{CREAM};">
            <p style="margin:0 0 6px;font-family:{SERIF};font-size:24px;line-height:30px;color:#ffffff;">{e(heading)}</p>
            {text_html}
            {pill(button, with_utm(url, utm), size=17, pad="14px 26px")}
          </td>
        </tr>
      </table>
    </td>
  </tr>"""


def footer(reason, unsubscribe):
    return f"""  <!-- FOOTER -->
  <tr>
    <td class="px t-muted" style="padding:32px 32px 8px;font-family:{SANS};font-size:15px;line-height:23px;mso-line-height-rule:exactly;color:{MUTED};">
      <p style="margin:0 0 12px;"><strong>General information, not medical advice.</strong> Talk to your doctor before changing how you eat, especially if you take medication.</p>
      <p style="margin:0 0 12px;">{e(reason)} <a class="t-link" href="{unsubscribe}" style="color:{NAVY};font-weight:bold;">Unsubscribe</a></p>
      <p style="margin:0;">PescoDial, a Banana Stand Media site<br>{e(POSTAL_ADDRESS)}</p>
    </td>
  </tr>"""


def render_email(*, title, preheader, header_label, header_sub, sections, footer_reason,
                 unsubscribe, utm=None, head_comment=""):
    """Wrap section rows (strings of <tr>...</tr>) in the header, scallop and footer."""
    home = with_utm(SITE, utm)
    return f"""{head_comment}<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>{e(title)}</title>
<!--[if mso]><style>table,td,p,a,h1,h2{{font-family:Georgia,serif !important;}}</style><![endif]-->
<style>
  body {{ margin:0; padding:0; -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }}
  a {{ color:{NAVY}; word-break:break-word; }}
  @media (max-width:620px) {{
    .px {{ padding-left:20px !important; padding-right:20px !important; }}
    .h1 {{ font-size:30px !important; line-height:36px !important; }}
  }}
  @media (prefers-color-scheme: dark) {{
    .bg-cream {{ background:#2a2620 !important; }}
    .bg-paper {{ background:#34302a !important; }}
    .t-ink {{ color:#f3ece0 !important; }}
    .t-muted {{ color:#d6cdbd !important; }}
    .t-sea {{ color:#c9daea !important; }}
    .t-olive {{ color:#c6cf91 !important; }}
    .t-link {{ color:#c9daea !important; }}
  }}
</style>
</head>
<body style="margin:0;padding:0;background:{CREAM};">
<div style="display:none;font-size:1px;color:{CREAM};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">{e(preheader)}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>

<table role="presentation" class="bg-cream" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="{CREAM}" style="background:{CREAM};">
<tr><td align="center" style="padding:24px 10px;">

<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">

  <!-- HEADER BAND -->
  <tr>
    <td bgcolor="{NAVY}" class="px" style="background:{NAVY};padding:22px 32px 18px;border-radius:14px 14px 0 0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="font-family:{SERIF};font-size:30px;line-height:34px;mso-line-height-rule:exactly;color:{CREAM};">
            <a href="{attr(home)}" style="color:{CREAM};text-decoration:none;">Pesco<span style="color:{OLIVE_LIGHT};">Dial</span></a>
          </td>
          <td align="right" style="font-family:{SANS};font-size:14px;line-height:20px;color:{OLIVE_LIGHT};font-weight:bold;">
            {e(header_label)}{f'<br><span style="color:{CREAM};font-weight:normal;">{e(header_sub)}</span>' if header_sub else ''}
          </td>
        </tr>
      </table>
    </td>
  </tr>
{_scallop()}

{chr(10).join(sections)}

{footer(footer_reason, unsubscribe)}

</table>
<!--[if mso]></td></tr></table><![endif]-->

</td></tr>
</table>
</body>
</html>
"""


def render_newsletter(issue, unsubscribe=NEWSLETTER_UNSUBSCRIBE):
    """Full weekly-guide layout. Required: title, preheader, date, intro{h1, paragraphs}.
    Optional sections: question, recipe, tip, calculator. Anything absent is omitted."""
    for k in ("title", "preheader", "date", "intro"):
        if not issue.get(k):
            raise ValueError(f"newsletter issue is missing {k!r}")
    utm = issue.get("utm", "utm_source=pd_newsletter&utm_medium=email&utm_campaign=weekly")
    intro = issue["intro"]
    rows = [intro_section(intro["h1"], intro.get("paragraphs", []),
                          signoff=intro.get("signoff", "Sarah"), greeting=intro.get("greeting"))]
    blocks = []
    if q := issue.get("question"):
        blocks.append(question_section(q["question"], q["answer"], q.get("link"),
                                       q.get("link_label", "Read the full answer"), utm))
    if r := issue.get("recipe"):
        blocks.append(recipe_section(r["title"], r["method"], r.get("meta"), r.get("image_url"),
                                     r.get("image_alt", ""), r.get("link"),
                                     r.get("link_label", "Get the full recipe"), utm))
    if t := issue.get("tip"):
        blocks.append(tip_section(t["title"], t["text"], t.get("kicker", "Shopping tip")))
    for i, b in enumerate(blocks):
        rows.append(b if i == 0 else divider() + "\n" + b)
    if c := issue.get("calculator"):
        rows.append(calculator_box(c["heading"], c.get("text"), c["button"], utm))
    return render_email(
        title=issue["title"], preheader=issue["preheader"],
        header_label=issue.get("header_label", "Weekly guide"), header_sub=issue["date"],
        sections=rows, unsubscribe=unsubscribe, utm=utm,
        footer_reason=issue.get("footer_reason", "You're getting this because you signed up at pescodial.com."),
    )


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit("usage: pd_email_shell.py issue.json > out.html")
    sys.stdout.write(render_newsletter(json.loads(Path(sys.argv[1]).read_text())))
