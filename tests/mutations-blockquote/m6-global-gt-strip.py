import io, os
p = os.environ['API']; s = io.open(p, encoding='utf-8').read()
old = """function markdownToHTML(markdown) {
  return applyInlineFormatting(markdownToBlockHTML(markdown));
}"""
new = """function markdownToHTML(markdown) {
  return applyInlineFormatting(markdownToBlockHTML(markdown.replace(/^>[ \\t]?/gm, ''))).replace(/<blockquote[^>]*>|<\\/blockquote>/g, '');
}"""
assert s.count(old) == 1, 'anchor'
io.open(p, 'w', encoding='utf-8').write(s.replace(old, new))
