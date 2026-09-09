import io, os
p = os.environ['API']; s = io.open(p, encoding='utf-8').read()
old = """      html += '<blockquote class="safety-callout">\\n'
        + markdownToBlockHTML(quoted.join('\\n'), depth + 1)
        + '</blockquote>\\n';"""
new = """      html += '<blockquote class="safety-callout">\\n'
        + '<p>' + quoted.join('\\n') + '</p>\\n'
        + '</blockquote>\\n';"""
assert s.count(old) == 1, 'anchor'
io.open(p, 'w', encoding='utf-8').write(s.replace(old, new))
