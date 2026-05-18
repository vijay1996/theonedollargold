import fs from 'fs';
import path from 'path';

const dir = './src/components/ui';
const files = fs.readdirSync(dir);
for (const file of files) {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf-8');
  content = content.replace(/@\/components/g, '@/src/components');
  content = content.replace(/@\/hooks/g, '@/src/hooks');
  fs.writeFileSync(filePath, content);
}
console.log('done');
