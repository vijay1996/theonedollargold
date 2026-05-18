import fs from 'fs';
import path from 'path';

function findFiles(dir: string, fileList: string[] = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const stat = fs.statSync(path.join(dir, file));
    if (stat.isDirectory()) {
      findFiles(path.join(dir, file), fileList);
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      fileList.push(path.join(dir, file));
    }
  }
  return fileList;
}

const files = findFiles('./src');
for (const file of files) {
  let content = fs.readFileSync(file, 'utf-8');
  if (content.includes('React.') && !content.includes('import React') && !content.includes('import * as React')) {
    content = `import React from 'react';\n` + content;
    fs.writeFileSync(file, content);
  }
}
console.log('done');
