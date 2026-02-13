import { mkdir, writeFile } from 'node:fs/promises';
import pngToIco from 'png-to-ico';

const sourcePng = 'public/icons/icon-512x512.png';
const outputDir = 'build/icons';
const outputIco = `${outputDir}/icon.ico`;

await mkdir(outputDir, { recursive: true });
const icoBuffer = await pngToIco(sourcePng);
await writeFile(outputIco, icoBuffer);

console.log(`Electron icon generated: ${outputIco}`);
