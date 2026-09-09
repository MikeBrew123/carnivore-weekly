import io, os
p = os.environ['MED']; s = io.open(p, encoding='utf-8').read()
old = "'> It does not know your kidney function and it is not a target set for you. Take the',"
new = "'> it does not know your kidney function and it is not a target set for you. Take the',"
assert s.count(old) == 1, 'anchor'
io.open(p, 'w', encoding='utf-8').write(s.replace(old, new))
