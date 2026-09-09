import io, os
p = os.environ['API']; s = io.open(p, encoding='utf-8').read()
old = "        quoted.push(lines[i].replace(/^>[ \\t]?/, ''));"
new = "        quoted.push(lines[i]);"
assert s.count(old) == 1, 'anchor'
io.open(p, 'w', encoding='utf-8').write(s.replace(old, new))
