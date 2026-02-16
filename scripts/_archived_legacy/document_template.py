#!/usr/bin/env python3
"""
Template Structure Documentation Generator

Automatically parses index_template.html and generates TEMPLATE_STRUCTURE.md
documenting all sections, CSS classes, JavaScript functions, and their dependencies.

Usage:
    python3 scripts/document_template.py
"""

import os
import re
from datetime import datetime
import subprocess


def get_git_commit():
    """Get current git commit hash."""
    try:
        result = subprocess.run(
            ["git", "rev-parse", "--short", "HEAD"],
            cwd=os.path.dirname(os.path.dirname(__file__)),
            capture_output=True,
            text=True
        )
        return result.stdout.strip()
    except:
        return "unknown"


def read_template(template_path):
    """Read the template file."""
    with open(template_path, 'r', encoding='utf-8') as f:
        return f.read()


def parse_sections(content):
    """Extract section boundaries from HTML comments or structure."""
    sections = []
    lines = content.split('\n')

    # Look for <!-- SECTION: --> markers (more flexible pattern)
    section_pattern = r'<!--\s*SECTION:\s*([^|]+?)(?:\s*\||\s*-->)'
    for i, line in enumerate(lines, 1):
        if re.search(section_pattern, line):
            match = re.search(section_pattern, line)
            if match:
                name = match.group(1).strip()
                sections.append({
                    'name': name,
                    'start': i,
                    'end': None,  # Will be determined later
                    'deps': '',
                    'type': 'marked'
                })

    # Now detect <section class="section"> blocks for any not yet covered
    for i, line in enumerate(lines, 1):
        if '<section class="section">' in line:
            # Check if this position is near a marked section
            found = False
            for section in sections:
                if abs(section['start'] - i) <= 2:
                    # Already marked
                    found = True
                    break

            if not found:
                # Find the closing </section>
                for j in range(i, len(lines)):
                    if '</section>' in lines[j]:
                        # Extract heading if present
                        heading = ''
                        for k in range(i, min(j, i + 5)):
                            if '<h2>' in lines[k]:
                                heading_match = re.search(r'<h2>(.*?)</h2>', lines[k])
                                if heading_match:
                                    heading = heading_match.group(1).strip()
                                    break
                        sections.append({
                            'name': heading or f'Section at line {i}',
                            'start': i,
                            'end': j + 1,
                            'deps': '',
                            'type': 'detected'
                        })
                        break

    # Set end lines for marked sections by finding the next major element
    for i, section in enumerate(sections):
        if section['end'] is None:
            # Find the next section or major delimiter
            if i + 1 < len(sections):
                section['end'] = sections[i + 1]['start']
            else:
                section['end'] = len(lines)

    return sorted(sections, key=lambda s: s['start'])


def parse_css(content):
    """Extract CSS classes/IDs from <style> block."""
    css_defs = {'classes': {}, 'ids': {}}

    # Find <style> block
    style_match = re.search(r'<style[^>]*>(.*?)</style>', content, re.DOTALL)
    if not style_match:
        return css_defs

    style_content = style_match.group(1)

    # Extract all class definitions
    class_pattern = r'\.([a-zA-Z0-9_-]+)\s*(?:\[|{)'
    for match in re.finditer(class_pattern, style_content):
        class_name = match.group(1)
        if class_name not in css_defs['classes']:
            css_defs['classes'][class_name] = {'line': None, 'used_in': []}

    # Extract all ID definitions
    id_pattern = r'#([a-zA-Z0-9_-]+)\s*(?:\[|{)'
    for match in re.finditer(id_pattern, style_content):
        id_name = match.group(1)
        if id_name not in css_defs['ids']:
            css_defs['ids'][id_name] = {'line': None, 'used_in': []}

    return css_defs


def parse_javascript(content):
    """Extract function definitions and DOM selectors."""
    js_funcs = {}

    # Extract function definitions
    func_pattern = r'function\s+(\w+)\s*\('
    for match in re.finditer(func_pattern, content):
        func_name = match.group(1)
        js_funcs[func_name] = {
            'selectors': [],
            'events': [],
            'description': ''
        }

    # Extract querySelector/getElementById calls
    selector_patterns = [
        r'querySelector\([\'"]([^\'"]+)[\'"]\)',
        r'getElementById\([\'"]([^\'"]+)[\'"]\)',
        r'querySelectorAll\([\'"]([^\'"]+)[\'"]\)'
    ]

    for pattern in selector_patterns:
        for match in re.finditer(pattern, content):
            selector = match.group(1)
            # Add to all functions (simplified - ideally we'd track which function)
            for func in js_funcs:
                if selector not in js_funcs[func]['selectors']:
                    js_funcs[func]['selectors'].append(selector)

    return js_funcs


def parse_template_vars(content):
    """Extract Jinja2 variables."""
    vars_used = {}

    # Find all {{ variable }}
    var_pattern = r'{{\s*(\w+)(?:\s*\||\s*}})'
    for match in re.finditer(var_pattern, content):
        var_name = match.group(1)
        if var_name not in vars_used:
            vars_used[var_name] = {'count': 0, 'lines': []}
        vars_used[var_name]['count'] += 1

    # Find all {% for ... in variable %}
    loop_pattern = r'{%\s*for\s+\w+\s+in\s+(\w+)\s*%}'
    for match in re.finditer(loop_pattern, content):
        var_name = match.group(1)
        if var_name not in vars_used:
            vars_used[var_name] = {'count': 0, 'lines': []}
        vars_used[var_name]['count'] += 1

    return vars_used


def find_section_dependencies(sections, content, css_defs, js_funcs):
    """Map which CSS/JS/variables each section uses."""
    dependencies = {}
    lines = content.split('\n')

    for section in sections:
        section_lines = lines[section['start']-1:section['end']]
        section_text = '\n'.join(section_lines)

        # Find CSS classes used
        css_used = set()
        for class_name in css_defs['classes']:
            if f'.{class_name}' in section_text or f'class="{class_name}' in section_text or f"class='{class_name}" in section_text:
                css_used.add(class_name)

        # Find IDs used
        ids_used = set()
        for id_name in css_defs['ids']:
            if f'#{id_name}' in section_text or f'id="{id_name}"' in section_text:
                ids_used.add(id_name)

        # Find JavaScript references
        js_used = set()
        for func_name in js_funcs:
            if func_name in section_text:
                js_used.add(func_name)

        dependencies[section['name']] = {
            'css_classes': sorted(list(css_used)),
            'css_ids': sorted(list(ids_used)),
            'js_functions': sorted(list(js_used))
        }

    return dependencies


def generate_markdown(sections, css_defs, js_funcs, template_vars, dependencies, git_hash):
    """Generate TEMPLATE_STRUCTURE.md content."""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    md = f"""# index_template.html Structure Map

**Last Updated:** {timestamp}
**Template Version:** {git_hash}

> This document is auto-generated. Do not edit manually.
> Regenerate by running: `python3 scripts/document_template.py`

---

## Section Overview

| Section | Lines | CSS Classes | IDs | JS Functions |
|---------|-------|-------------|-----|--------------|
"""

    for section in sections:
        section_name = section['name']
        deps = dependencies.get(section_name, {})
        css_classes = ', '.join(deps.get('css_classes', [])[:3])  # Limit to 3 for readability
        if len(deps.get('css_classes', [])) > 3:
            css_classes += f" +{len(deps.get('css_classes', [])) - 3}"
        css_ids = ', '.join(deps.get('css_ids', []))
        js_funcs_str = ', '.join(deps.get('js_functions', []))

        md += f"| {section_name} | {section['start']}-{section['end']} | {css_classes or 'none'} | {css_ids or 'none'} | {js_funcs_str or 'none'} |\n"

    md += "\n---\n\n## CSS Classes Used\n\n"
    for class_name in sorted(css_defs['classes'].keys()):
        sections_using = [s['name'] for s in sections if class_name in dependencies.get(s['name'], {}).get('css_classes', [])]
        if sections_using:
            md += f"- **`.{class_name}`** — Used in: {', '.join(sections_using[:2])}"
            if len(sections_using) > 2:
                md += f" +{len(sections_using)-2} more"
            md += "\n"

    md += "\n---\n\n## CSS IDs Used\n\n"
    for id_name in sorted(css_defs['ids'].keys()):
        sections_using = [s['name'] for s in sections if id_name in dependencies.get(s['name'], {}).get('css_ids', [])]
        if sections_using:
            md += f"- **`#{id_name}`** — Used in: {', '.join(sections_using)}\n"

    md += "\n---\n\n## JavaScript Functions\n\n"
    for func_name in sorted(js_funcs.keys()):
        selectors = js_funcs[func_name]['selectors'][:2]  # Limit to 2
        md += f"- **`{func_name}()`** — Targets: {', '.join(selectors) if selectors else 'N/A'}\n"

    md += "\n---\n\n## Template Variables\n\n"
    for var_name in sorted(template_vars.keys()):
        count = template_vars[var_name]['count']
        md += f"- **`{var_name}`** — Used {count} time(s)\n"

    md += "\n---\n\n## Critical Dependencies\n\n"
    md += "**Shared CSS Classes (Edit with Caution):**\n"
    for class_name in sorted(css_defs['classes'].keys()):
        sections_using = [s['name'] for s in sections if class_name in dependencies.get(s['name'], {}).get('css_classes', [])]
        if len(sections_using) > 1:
            md += f"- `.{class_name}` → {', '.join(sections_using)}\n"

    md += "\n**Safe Editing Checklist:**\n"
    md += "Before editing a section:\n"
    md += "- [ ] Check TEMPLATE_STRUCTURE.md to see which CSS classes are shared\n"
    md += "- [ ] Verify no JS functions target this section's unique IDs\n"
    md += "- [ ] Confirm all template variables used exist in the data\n"
    md += "- [ ] Test the page after changes to verify visual consistency\n"

    return md


def main():
    """Main entry point."""
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_dir = os.path.dirname(script_dir)
    template_path = os.path.join(project_dir, 'templates', 'index_template.html')
    output_path = os.path.join(project_dir, 'TEMPLATE_STRUCTURE.md')

    if not os.path.exists(template_path):
        print(f"❌ Template not found: {template_path}")
        return 1

    print("📝 Parsing template structure...")
    content = read_template(template_path)

    print("   Extracting sections...")
    sections = parse_sections(content)

    print("   Extracting CSS...")
    css_defs = parse_css(content)

    print("   Extracting JavaScript...")
    js_funcs = parse_javascript(content)

    print("   Extracting template variables...")
    template_vars = parse_template_vars(content)

    print("   Finding dependencies...")
    dependencies = find_section_dependencies(sections, content, css_defs, js_funcs)

    print("   Generating documentation...")
    git_hash = get_git_commit()
    markdown = generate_markdown(sections, css_defs, js_funcs, template_vars, dependencies, git_hash)

    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(markdown)

    print(f"✅ Documentation generated: {output_path}")
    print(f"   • {len(sections)} sections documented")
    print(f"   • {len(css_defs['classes'])} CSS classes found")
    print(f"   • {len(css_defs['ids'])} IDs found")
    print(f"   • {len(js_funcs)} JavaScript functions found")
    print(f"   • {len(template_vars)} template variables found")

    return 0


if __name__ == '__main__':
    exit(main())
