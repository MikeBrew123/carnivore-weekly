import io, os
p = os.environ['MED']; s = io.open(p, encoding='utf-8').read()
old = "'> Where it gives numbers (calories, protein, electrolytes, lab ranges), treat them',"
new = "'> Where it gives numbers \u2014 calories, protein, electrolytes, lab ranges \u2014 treat them',"
assert s.count(old) == 1, 'anchor'
io.open(p, 'w', encoding='utf-8').write(s.replace(old, new))
