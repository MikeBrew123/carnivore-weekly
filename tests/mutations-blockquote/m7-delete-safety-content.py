import io, os
p = os.environ['MED']; s = io.open(p, encoding='utf-8').read()
old = "    '> **Take this report to your doctor or pharmacist before you start, and let them',"
assert s.count(old) == 1, 'anchor'
io.open(p, 'w', encoding='utf-8').write(s.replace(old, "    '',"))
