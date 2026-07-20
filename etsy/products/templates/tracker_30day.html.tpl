<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Libre+Baskerville:wght@400;700&family=Source+Sans+3:wght@400;600;700&family=Inter:wght@400;600;800&display=swap" rel="stylesheet">
<style>
  @page { size: letter landscape; margin: 0; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
    font-family: {{BODY_FONT}};
    background: {{BG}};
    color: {{INK}};
    width: 11in; height: 8.5in;
    padding: 0.38in 0.45in 0.3in;
  }
  .head { display: flex; justify-content: space-between; align-items: baseline; border-bottom: 3px solid {{ACCENT}}; padding-bottom: 8px; }
  .brand { font-family: {{HEAD_FONT}}; font-weight: 700; font-size: 13pt; letter-spacing: 2px; color: {{ACCENT}}; text-transform: uppercase; }
  h1 { font-family: {{HEAD_FONT}}; font-size: 21pt; font-weight: 800; letter-spacing: 0.5px; }
  .tag { font-size: 9.5pt; color: {{SOFT}}; }
  .how { font-size: 8.5pt; color: {{SOFT}}; margin: 7px 0 10px; }
  .how strong { color: {{INK}}; }
  table { width: 100%; border-collapse: collapse; table-layout: fixed; margin-bottom: 12px; }
  th, td { border: 1px solid {{LINE}}; height: 0.245in; }
  th { background: {{HEADBG}}; color: {{HEADINK}}; font-size: 7.5pt; font-weight: 700; }
  th.lbl, td.lbl { width: 1.28in; text-align: left; padding-left: 6px; font-size: 7.6pt; font-weight: 600; background: {{LBLBG}}; color: {{INK}}; }
  td.lbl .sub { display: block; font-weight: 400; font-size: 6.6pt; color: {{SOFT}}; }
  th.ck { background: {{ACCENT}}; color: #fff; }
  .wk { font-family: {{HEAD_FONT}}; font-size: 10pt; font-weight: 700; color: {{ACCENT}}; margin: 2px 0 4px; letter-spacing: 1px; }
  .foot { display: flex; justify-content: space-between; align-items: center; border-top: 2px solid {{LINE}}; padding-top: 7px; }
  .foot .url { font-weight: 700; color: {{ACCENT}}; font-size: 9pt; }
  .foot .note { font-size: 8pt; color: {{SOFT}}; }
  .motto { text-align: center; font-family: {{HEAD_FONT}}; font-size: 9.5pt; font-weight: 700; letter-spacing: 1.5px; color: {{INK}}; margin: 2px 0 8px; text-transform: uppercase; }
</style>
</head>
<body>
  <div class="head">
    <div>
      <div class="brand">{{BRAND}}</div>
      <h1>{{TITLE}}</h1>
    </div>
    <div class="tag">{{TAGLINE}}</div>
  </div>
  <p class="how"><strong>How to use it:</strong> {{HOWTO}} Shaded days ({{CHECKIN_DAYS}}) are check-in days: look back at your notes and see what changed.</p>

  <div class="wk">DAYS 1&ndash;15</div>
  {{TABLE1}}

  <div class="wk">DAYS 16&ndash;30</div>
  {{TABLE2}}

  <div class="motto">{{MOTTO}}</div>
  <div class="foot">
    <span class="url">{{URL}}</span>
    <span class="note">{{FOOTNOTE}}</span>
  </div>
</body>
</html>
