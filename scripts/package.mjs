import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { packager } from '@electron/packager';

const option = (name, fallback) =>
  process.argv.find((arg) => arg.startsWith(`--${name}=`))?.split('=')[1] ?? fallback;
const platform = option('platform', process.platform);
const arch = option('arch', process.arch);
if (!['win32', 'linux', 'darwin'].includes(platform) || !['x64', 'arm64'].includes(arch))
  throw new Error('Supported targets: win32/linux/darwin, x64/arm64');
const root = process.cwd();
const metadata = JSON.parse(await readFile('package.json', 'utf8'));
// A clean staging directory guarantees source, credentials, tests, and dev dependencies never ship.
const staging = await mkdtemp(join(tmpdir(), 'gloam-package-'));
try {
  await cp('dist', join(staging, 'dist'), { recursive: true });
  await cp('dist-desktop', join(staging, 'dist-desktop'), { recursive: true });
  await mkdir(join(staging, 'build'));
  await cp('build/icon.png', join(staging, 'build/icon.png'));
  const notices = await Promise.all(
    [
      ['Phaser', 'node_modules/phaser/LICENSE.md'],
      ['DM Sans', 'node_modules/@fontsource/dm-sans/LICENSE'],
      ['IBM Plex Mono', 'node_modules/@fontsource/ibm-plex-mono/LICENSE'],
    ].map(async ([name, file]) => `${name}\n${await readFile(file, 'utf8')}`),
  );
  await writeFile(join(staging, 'THIRD_PARTY_NOTICES.txt'), notices.join('\n\n'));
  await writeFile(
    join(staging, 'package.json'),
    JSON.stringify(
      {
        name: metadata.name,
        productName: metadata.productName,
        version: metadata.version,
        description: metadata.description,
        type: 'module',
        main: metadata.main,
      },
      null,
      2,
    ),
  );
  const paths = await packager({
    dir: staging,
    name: 'HordesOfTheFallenSky',
    executableName: 'HordesOfTheFallenSky',
    platform,
    arch,
    out: resolve(root, 'release'),
    overwrite: true,
    asar: true,
    prune: false,
    download: { cacheRoot: process.env.electron_config_cache },
    electronVersion: JSON.parse(await readFile('node_modules/electron/package.json', 'utf8'))
      .version,
    appBundleId: 'games.gloam.game',
    ...(platform === 'win32' ? { icon: resolve(root, 'build/icon.ico') } : {}),
  });
  console.log(`Standalone game: ${paths.join(', ')}`);
  console.log('Upload the whole game directory to its Steam depot, not just the executable.');
} finally {
  await rm(staging, { recursive: true, force: true });
}
