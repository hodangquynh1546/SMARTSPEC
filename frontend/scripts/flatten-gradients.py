#!/usr/bin/env python3
"""Làm phẳng gradient trong <style> của .vue: giao diện theo WorkHub là phẳng, đen-trắng. Idempotent.
Giữ nguyên gradient có `transparent` (hiệu ứng shimmer/loading)."""
import re, sys, pathlib

def split_args(s):
    out, depth, cur = [], 0, ''
    for ch in s:
        if ch == '(':
            depth += 1
        elif ch == ')':
            depth -= 1
        if ch == ',' and depth == 0:
            out.append(cur.strip()); cur = ''
        else:
            cur += ch
    out.append(cur.strip())
    return out

WARM = ('#fef3c7', '#fde68a', '#fffbeb', '#fef9c3')
def color_of(arg):
    return re.sub(r'\s+\d+(\.\d+)?%$', '', arg.strip())

def flat(m):
    inner = m.group(1)
    args = split_args(inner)
    if args and re.match(r'^(\d+deg|to )', args[0]):
        args = args[1:]
    cols = [color_of(a) for a in args]
    if not cols or any('transparent' in c for c in cols):
        return m.group(0)
    if all(c in WARM for c in cols):
        return 'var(--warning-soft)'
    if any(c.startswith('rgba(26, 54, 93') or c.startswith('rgba(45, 74, 138') for c in cols):
        return 'rgba(10, 10, 10, 0.06)'
    if any(c.startswith('rgba(255, 255, 255') or c.startswith('rgba(248, 250, 252') for c in cols) and not any('var(' in c for c in cols):
        return 'var(--surface)'
    return cols[0]

PAT = re.compile(r'linear-gradient\(((?:[^()]|\([^()]*\))*)\)')
changed = 0
for p in pathlib.Path('src').rglob('*.vue'):
    s = p.read_text()
    a = s.find('<style')
    if a < 0:
        continue
    head, css = s[:a], s[a:]
    new = PAT.sub(flat, css)
    if new != css:
        p.write_text(head + new); changed += 1
print('flattened in', changed, 'files')
