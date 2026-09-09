import io, os
p = os.environ['API']; s = io.open(p, encoding='utf-8').read()
old = "      if (inList && html.endsWith('</li>\\n')) {"
new = "      if (false && inList && html.endsWith('</li>\\n')) {"
assert s.count(old) == 1, 'anchor'
io.open(p, 'w', encoding='utf-8').write(s.replace(old, new))
