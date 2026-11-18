#!/usr/bin/env python3
# Sau khi gộp nhánh (merge) mà số ?v lệch nhau: đưa mọi chỗ import cùng một file về số ?v lớn nhất đang có.  Dùng: python3 tools/syncv.py
import re, os, subprocess
files = [f for f in subprocess.run(['git', 'ls-files', '-co', '--exclude-standard'], capture_output=True, text=True).stdout.split('\n') if f.endswith(('.js', '.html', '.css', '.mjs')) and not f.startswith(('server/', 'tools/')) and os.path.exists(f)]
pat = re.compile(r'([\w./-]+\.(?:js|css|svg|png|jpg|webmanifest))\?v=(\d+)')
path = lambda f, ref: os.path.normpath(ref.lstrip('/') if ref.startswith('/') else os.path.join(os.path.dirname(f), ref))
mx = {}
for f in files:
    for m in pat.finditer(open(f).read()): mx[path(f, m.group(1))] = max(mx.get(path(f, m.group(1)), 0), int(m.group(2)))
n = 0
for f in files:
    s = open(f).read()
    def rep(m):
        global n
        v = mx[path(f, m.group(1))]
        if v != int(m.group(2)): n += 1
        return f'{m.group(1)}?v={v}'
    s2 = pat.sub(rep, s)
    if s2 != s: open(f, 'w').write(s2)
print('đồng bộ', n, 'chỗ ?v lệch')
