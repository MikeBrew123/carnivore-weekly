import io, os
p = os.environ['API']; s = io.open(p, encoding='utf-8').read()
old = "  html = html.replace(/\\*\\*((?:(?!\\*\\*|<\\/p>|<\\/h[1-6]>|<\\/li>|<\\/td>)[\\s\\S])*?)\\*\\*/g, '<strong>$1</strong>');\n"
assert s.count(old) == 1, 'anchor'
io.open(p, 'w', encoding='utf-8').write(s.replace(old, '', 1))
