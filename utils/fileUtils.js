import fs from 'fs';
import path from 'path';

export const readJSONFile = (filePath) => {
  try {
    const absolutePath = path.resolve(process.cwd(), filePath);
    const data = fs.readFileSync(absolutePath, 'utf8');
    return JSON.parse(data);
  } catch {
    console.log('No existing file found, starting fresh.');
    return {};
  }
};

export const writeJSONFile = (filePath, data) => {
  const absolutePath = path.resolve(process.cwd(), filePath);
  fs.writeFileSync(absolutePath, JSON.stringify(data, null, 2));
};
