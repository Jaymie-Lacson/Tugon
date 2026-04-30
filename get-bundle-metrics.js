const fs = require('fs');
const path = require('path');

const distPath = path.join(process.cwd(), 'dist', 'assets');

const files = fs.readdirSync(distPath);
const jsFiles = [];
const cssFiles = [];

files.forEach(file => {
  const filePath = path.join(distPath, file);
  try {
    const stat = fs.statSync(filePath);
    const size = stat.size;

    if (file.endsWith('.js')) {
      jsFiles.push({ name: file, size });
    } else if (file.endsWith('.css')) {
      cssFiles.push({ name: file, size });
    }
  } catch (e) {}
});

jsFiles.sort((a, b) => b.size - a.size);
cssFiles.sort((a, b) => b.size - a.size);

const totalJs = jsFiles.reduce((a, f) => a + f.size, 0);
const totalCss = cssFiles.reduce((a, f) => a + f.size, 0);

console.log(JSON.stringify({
  totalJsBytes: totalJs,
  totalCssBytes: totalCss,
  totalJsKb: (totalJs / 1024).toFixed(2),
  totalCssKb: (totalCss / 1024).toFixed(2),
  jsFileCount: jsFiles.length,
  cssFileCount: cssFiles.length,
  top5Js: jsFiles.slice(0, 5).map(f => ({ name: f.name, bytes: f.size, kb: (f.size / 1024).toFixed(2) })),
  top5Css: cssFiles.slice(0, 5).map(f => ({ name: f.name, bytes: f.size, kb: (f.size / 1024).toFixed(2) })),
  allJs: jsFiles.map(f => ({ name: f.name, bytes: f.size })),
  allCss: cssFiles.map(f => ({ name: f.name, bytes: f.size }))
}, null, 2));
