#!/usr/bin/env python3

import os
import json
from pathlib import Path

dist_path = Path(__file__).parent / 'dist' / 'assets'

js_files = []
css_files = []

if dist_path.exists():
    for file in sorted(dist_path.iterdir()):
        if file.is_file():
            size = file.stat().st_size
            if file.suffix == '.js':
                js_files.append({'name': file.name, 'size': size})
            elif file.suffix == '.css':
                css_files.append({'name': file.name, 'size': size})

js_files.sort(key=lambda x: x['size'], reverse=True)
css_files.sort(key=lambda x: x['size'], reverse=True)

total_js = sum(f['size'] for f in js_files)
total_css = sum(f['size'] for f in css_files)

metrics = {
    'totalJsBytes': total_js,
    'totalCssBytes': total_css,
    'totalJsKb': round(total_js / 1024, 2),
    'totalCssKb': round(total_css / 1024, 2),
    'jsFileCount': len(js_files),
    'cssFileCount': len(css_files),
    'top5Js': [{'name': f['name'], 'bytes': f['size'], 'kb': round(f['size'] / 1024, 2)} for f in js_files[:5]],
    'top5Css': [{'name': f['name'], 'bytes': f['size'], 'kb': round(f['size'] / 1024, 2)} for f in css_files[:5]],
    'allJs': js_files,
    'allCss': css_files
}

print(json.dumps(metrics, indent=2))
