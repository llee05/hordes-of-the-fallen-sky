import { access, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const id = (name) => {
  const value = process.env[name];
  if (value && !/^[1-9]\d*$/.test(value))
    throw new Error(`${name} must be a positive numeric Steam ID`);
  return value;
};
const appId = id('STEAM_APP_ID');
const targets = [
  {
    id: id('STEAM_WINDOWS_DEPOT_ID'),
    folder: 'HordesOfTheFallenSky-win32-x64',
    executable: 'HordesOfTheFallenSky.exe',
  },
  {
    id: id('STEAM_LINUX_DEPOT_ID'),
    folder: 'HordesOfTheFallenSky-linux-x64',
    executable: 'HordesOfTheFallenSky',
  },
].filter((target) => target.id);
if (!appId || targets.length === 0)
  throw new Error(
    'Set STEAM_APP_ID and STEAM_WINDOWS_DEPOT_ID and/or STEAM_LINUX_DEPOT_ID. See steam/README.md.',
  );
if (new Set(targets.map((target) => target.id)).size !== targets.length)
  throw new Error('Each platform needs its own depot ID');
const quote = (value) => `"${String(value).replaceAll('\\', '/').replaceAll('"', '\\"')}"`;
// Validate all content before producing any upload configuration.
for (const target of targets) await access(resolve('release', target.folder, target.executable));
await mkdir('steam/generated', { recursive: true });
await mkdir('steam/output', { recursive: true });
for (const target of targets) {
  const depot = `"DepotBuildConfig"\n{\n  "DepotID" ${quote(target.id)}\n  "ContentRoot" ${quote(resolve('release', target.folder))}\n  "FileMapping"\n  {\n    "LocalPath" "*"\n    "DepotPath" "."\n    "Recursive" "1"\n  }\n  "FileExclusion" "*.pdb"\n}\n`;
  await writeFile(`steam/generated/depot_${target.id}.vdf`, depot);
}
const app = `"AppBuild"\n{\n  "AppID" ${quote(appId)}\n  "Desc" "Hordes of the Fallen Sky desktop build"\n  "BuildOutput" ${quote(resolve('steam/output'))}\n  "Preview" "1"\n  "Depots"\n  {\n${targets.map((target) => `    ${quote(target.id)} ${quote(`depot_${target.id}.vdf`)}`).join('\n')}\n  }\n}\n`;
await writeFile('steam/generated/app_build.vdf', app);
console.log(
  'Prepared steam/generated/app_build.vdf in Preview mode. Nothing has been uploaded or published.',
);
