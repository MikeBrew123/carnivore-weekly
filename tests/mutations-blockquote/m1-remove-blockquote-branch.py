import io, os
p = os.environ['API']; s = io.open(p, encoding='utf-8').read()
old = "    else if (/^>/.test(line)) {"
new = "    else if (false && /^>/.test(line)) {"
assert s.count(old) == 1, 'anchor'
io.open(p, 'w', encoding='utf-8').write(s.replace(old, new))
