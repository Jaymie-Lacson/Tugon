const fs = require('fs');
const path = require('path');

const distPath = path.join(__dirname, 'dist', 'assets');

try {
  const files = fs.readdirSync(distPath);
  const jsFiles = [];
  const cssFiles = [];

  files.forEach(file => {
    const filePath = path.join(distPath, file);
    const stat = fs.statSync(filePath);
    const size = stat.size;

    if (file.endsWith('.js')) {
      jsFiles.push({ name: file, size });
    } else if (file.endsWith('.css')) {
      cssFiles.push({ name: file, size });
    }
  });

  // Sort by size descending
  jsFiles.sort((a, b) => b.size - a.size);
  cssFiles.sort((a, b) => b.size - a.size);

  // Calculate totals
  const totalJsSize = jsFiles.reduce((acc, f) => acc + f.size, 0);
  const totalCssSize = cssFiles.reduce((acc, f) => acc + f.size, 0);

  console.log('\n=== BUNDLE METRICS ===\n');
  console.log(`Total JS Size: ${totalJsSize} bytes (${(totalJsSize / 1024).toFixed(2)} KB)`);
  console.log(`Total CSS Size: ${totalCssSize} bytes (${(totalCssSize / 1024).toFixed(2)} KB)`);
  console.log(`\nJS Files Count: ${jsFiles.length}`);
  console.log(`CSS Files Count: ${cssFiles.length}`);

  console.log('\n=== TOP 5 LARGEST JS CHUNKS ===\n');
  jsFiles.slice(0, 5).forEach((f, i) => {
    console.log(`${i + 1}. ${f.name} - ${f.size} bytes (${(f.size / 1024).toFixed(2)} KB)`);
  });

  console.log('\n=== TOP 5 LARGEST CSS CHUNKS ===\n');
  cssFiles.slice(0, 5).forEach((f, i) => {
    console.log(`${i + 1}. ${f.name} - ${f.size} bytes (${(f.size / 1024).toFixed(2)} KB)`);
  });

  console.log('\n=== ALL JS FILES (sorted by size) ===\n');
  jsFiles.forEach(f => {
    console.log(`${f.name}|${f.size}`);
  });

  console.log('\n=== ALL CSS FILES (sorted by size) ===\n');
  cssFiles.forEach(f => {
    console.log(`${f.name}|${f.size}`);
  });

} catch (err) {
  console.error('Error:', err.message);
  process.exit(1);
}
