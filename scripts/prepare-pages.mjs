import { copyFile, cp, mkdir, readdir, writeFile } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const outputDirectory = fileURLToPath(new URL('../dist/client/', import.meta.url));
const basePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? '').replace(/^\/+|\/+$/g, '');

if (basePath) {
  if (basePath.includes('..')) throw new Error('NEXT_PUBLIC_BASE_PATH must not contain path traversal segments.');

  const nestedAssetDirectory = join(outputDirectory, basePath);
  for (const entry of await readdir(nestedAssetDirectory, { withFileTypes: true })) {
    await cp(join(nestedAssetDirectory, entry.name), join(outputDirectory, entry.name), {
      recursive: true,
      force: true,
    });
  }
}

async function collectHtml(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await collectHtml(path));
    else if (entry.isFile() && entry.name.endsWith('.html') && entry.name !== 'index.html' && entry.name !== '404.html') files.push(path);
  }
  return files;
}

for (const source of await collectHtml(outputDirectory)) {
  const relativePath = relative(outputDirectory, source).replace(/\.html$/, '');
  const destination = join(outputDirectory, relativePath, 'index.html');
  await mkdir(dirname(destination), { recursive: true });
  await copyFile(source, destination);
}

await writeFile(join(outputDirectory, '.nojekyll'), '');
