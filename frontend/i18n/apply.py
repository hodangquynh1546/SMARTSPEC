#!/usr/bin/env python3
"""Áp bộ dịch vi*.py vào các file .vue (chỉ chuỗi hiển thị: chữ trong template, thuộc tính mô tả, toast/confirm/alert).
Idempotent: chuỗi đã dịch không còn khớp khoá tiếng Anh. Chạy lại sau khi bổ sung vi*.py. Từ khoá nghiệp vụ (enum như 'High')
không bị đụng vì chỉ thay trong ngữ cảnh hiển thị."""
import re, sys, pathlib, importlib, glob, os
HERE = pathlib.Path(__file__).parent
sys.path.insert(0, str(HERE))
D = {}
for f in sorted(glob.glob(str(HERE / 'vi*.py'))):
    m = importlib.import_module(pathlib.Path(f).stem)
    for n in dir(m):
        if n.startswith('VI') and isinstance(getattr(m, n), dict):
            D.update(getattr(m, n))
norm = lambda s: re.sub(r'\s+', ' ', s.strip())
ATTR = re.compile(r'(\b(?:placeholder|title|aria-label|label|alt|description|subtitle|confirm-text|cancel-text)=")([^"]+)(")')
CALL = re.compile(r'((?:toast\.(?:success|error|info|warning)|confirm|alert)\(\s*)([`\'"])((?:(?!\2).)+)\2', re.S)
TOK = re.compile(r'(<(?:[^>"\']|"[^"]*"|\'[^\']*\')*>|\{\{.*?\}\})', re.S)

def tr_text(seg):
    core = norm(seg)
    if core in D and re.search(r'[A-Za-z]', core):
        lead = seg[:len(seg) - len(seg.lstrip())]; trail = seg[len(seg.rstrip()):]
        return lead + D[core] + trail
    return seg

def do_template(t):
    parts = TOK.split(t)
    out = []
    for i, p in enumerate(parts):
        if i % 2 == 0:
            out.append(tr_text(p))
        elif p.startswith('<'):
            out.append(ATTR.sub(lambda m: m.group(1) + (D.get(norm(m.group(2)), m.group(2))) + m.group(3), p))
        else:
            out.append(p)
    return ''.join(out)

def do_calls(s):
    def f(m):
        txt = m.group(3); k = norm(txt)
        if k in D:
            v = D[k]
            q = m.group(2)
            if q != '`' and ('${' in v): q = '`'
            v = v.replace('\\', '\\\\')
            if q in "'\"" : v = v.replace(q, '\\' + q)
            return m.group(1) + q + v + q
        return m.group(0)
    return CALL.sub(f, s)

RISKY = {'High','Medium','Low','Passed','Failed','Pending','All','None','Success','Active','Critical','Blocked','Skipped','User','System','Admin','Error','Warning','Info','Resolved','Rejected','Approved','Timeout','Done','Date','Name','Type','Status','Role','Email','Key','Unique','Other','Version','Table','Actor','Source','Target','Order','Level','Language','Content','Provider','Member','Owner','Editor','Viewer','Activity','Sequence','Project','Projects','Template','Create','Update','Backup','Memory','Disk','Performance','Security','Integration','Unit','Functional','Include','Extend','Start','End','Merge','Fork','Join','Object','Decision','Guard','Sync','Async','Reply','Loop','Binary','String','Numeric','Boolean'}
LIT = re.compile(r"(['\"`])((?:[^'\"`\n$\\]|\\.){0,100})\1")
LABEL = re.compile(r"(\b(?:label|text|title|placeholder|description|tooltip|hint|subtitle)\s*:\s*)(['\"`])([^'\"`\n$\\]{2,100})\2")
SKIP = re.compile(r"===|!==|\bcase\b|includes\(|console\.|^\s*//|\.type\b|\bkey\s*:|\bvalue\s*:|\bid\s*:|\.status\b|\.priority\b|\.role\b")
def q(v, qc):
    v = v.replace('\\', '\\\\')
    if qc in "'\"": v = v.replace(qc, '\\' + qc)
    return v
def do_literals(text, in_template):
    out = []
    for line in text.split('\n'):
        if re.search(r"console\.|^\s*//", line):
            out.append(line); continue
        def lab(m):
            k = norm(m.group(3))
            return m.group(1) + m.group(2) + q(D[k], m.group(2)) + m.group(2) if k in D else m.group(0)
        line = LABEL.sub(lab, line) if not re.search(r"===|!==", line.split('label')[0] if 'label' in line else '') else line
        def lit(m):
            k = norm(m.group(2))
            before = line[:m.start()]; after = line[m.end():]
            if re.search(r"(===|!==|==|!=|\bcase|includes\(|indexOf\(|\[|\bkey\s*:|\bvalue\s*:|\bid\s*:|\btype\s*:)\s*$", before) or re.match(r"\s*(===|!==|==|!=|\]|:\s*[^,}]*\b(?:type|id)\b)", after):
                return m.group(0)
            if k not in D or not re.search(r'[A-Za-z]{3,}', k): return m.group(0)
            if k in RISKY and k != 'Unknown': return m.group(0)
            if in_template and m.group(1) == '"': return m.group(0)
            if ' ' not in k and not k[:1].isupper(): return m.group(0)
            qc = m.group(1)
            if qc != '`' and '${' in D[k]: return m.group(0)
            return qc + q(D[k], qc) + qc
        line = LIT.sub(lit, line)
        out.append(line)
    return '\n'.join(out)

changed = 0
for p in pathlib.Path(HERE.parent / 'src').rglob('*.vue'):
    s = p.read_text()
    new = s
    m = re.search(r'<template>.*</template>', new, re.S)
    if m:
        t = do_literals(do_template(m.group(0)), True)
        new = new[:m.start()] + t + new[m.end():]
        # script: chỉ phần <script>
    sm = re.search(r'<script[^>]*>.*?</script>', new, re.S)
    if sm:
        new = new[:sm.start()] + do_literals(sm.group(0), False) + new[sm.end():]
    new = do_calls(new)
    if new != s:
        p.write_text(new); changed += 1
print('translated files:', changed, 'dict size:', len(D))
