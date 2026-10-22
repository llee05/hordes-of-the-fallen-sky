import { BUILDINGS, FORMATIONS, REGIONS, ROUTES } from '../game/data/clan';
import { UPGRADES } from '../game/data/upgrades';
import {
  assignedWorkers,
  buildingBlocker,
  buildingCost,
  canMigrate,
  clanDoctrine,
  riderCount,
} from '../game/state/clan';
import type { RunState } from '../game/types';
import {
  BUILDING_MARKS,
  TRADITION_MARKS,
  campIllustration,
  clanMark,
  routeIllustration,
} from './artwork';
import { heading, footer } from './panelContent';
import { storyRecords } from './storyContent';

export type JournalTab = 'journey' | 'clan' | 'traditions' | 'story';

export function buildingMenu(run: RunState): string {
  return `<section class="game-panel planning-dialog">${heading('THE ENCAMPMENT', 'Build a people.', true, 'ger')}<div class="panel-body"><p class="panel-intro">Assign your families. Every structure travels with you.</p><div class="building-grid">${BUILDINGS.map(
    (b) => {
      const level = run.clan.buildings[b.id];
      const blocker = buildingBlocker(run, b.id);
      const cost = buildingCost(run, b.id);
      return `<article class="building-card ${level ? 'is-built' : ''}"><div class="building-portrait">${campIllustration(b.id)}</div><div class="building-heading"><span class="building-icon">${clanMark(BUILDING_MARKS[b.id])}</span><h3>${b.title}</h3><small>${level ? (level === 2 ? 'DEVELOPED' : 'BUILT') : `${b.workers} WORKERS`}</small></div><p>${b.description}</p>${level === 2 ? `<div class="built-path">◇ ${b.paths[run.clan.paths[b.id]!]!.title}<p>${b.paths[run.clan.paths[b.id]!]!.description}</p></div>` : `<span class="building-cost">${cost.materials} MATERIALS${cost.spirit ? ` · ${cost.spirit} SPIRIT` : ''}</span>${level ? b.paths.map((path, index) => `<button class="path-button" data-building="${b.id}" data-path="${index}" ${blocker ? 'disabled' : ''}><strong>${path.title} ↗</strong><span>${path.description}</span></button>`).join('') : `<button class="path-button" data-building="${b.id}" ${blocker ? 'disabled' : ''}><strong>Establish ${b.title.toLowerCase()} ↗</strong></button>`}${blocker ? `<small class="blocker">${blocker}</small>` : ''}`}</article>`;
    },
  ).join('')}</div></div>${footer()}</section>`;
}

export function routeMenu(run: RunState): string {
  return `<section class="game-panel route-dialog">${heading(`CAMP ${run.clan.region + 1} / THE ROAD EAST`, 'Where the grass still grows.', true, 'banner')}<div class="panel-body"><p class="panel-intro">Pack the gers. Protect the moving caravan. Rewards await at the far end.</p><div class="route-map"><span>${REGIONS[run.clan.region]!.short}</span><i>◇ ─ ─ ─ → ◇</i><span>${REGIONS[run.clan.region + 1]!.short}</span></div><div class="upgrade-cards">${ROUTES.map((r) => `<button class="upgrade-card route-card" data-route="${r.id}">${routeIllustration(r.id)}<span class="upgrade-subtitle">${r.subtitle}</span><h3>${r.title}</h3><p>${r.description}</p><span class="card-bottom">PACK & DEPART <span>→</span></span></button>`).join('')}</div></div>${footer('Stay a little longer')}</section>`;
}

export function journalMenu(run: RunState, tab: JournalTab): string {
  const clan = run.clan;
  const region = REGIONS[clan.region]!;
  let content: string;
  if (tab === 'journey') {
    content = `<div class="journal-chapter"><span class="eyebrow">PASTURE ${clan.region + 1} OF 4</span><h3>${region.name}</h3><p>${region.description}</p><div class="journey-map" aria-label="Journey progress">${REGIONS.map((r, i) => `<div class="journey-stop ${i === clan.region ? 'current' : i < clan.region ? 'passed' : ''}"><span>${clanMark(i === 3 ? 'mountain' : i === 1 ? 'river' : i === 2 ? 'sanctuary' : 'ger')}</span><div><strong>${r.name}</strong><small>${i < clan.region ? 'CROSSED' : i === clan.region ? 'YOUR CLAN IS HERE' : r.event.toUpperCase()}</small></div></div>`).join('')}</div><div class="journal-callout">${clan.stage === 'migration' ? 'The caravan is moving east. Stay alongside your people until the crossing is complete.' : clan.stage === 'final' ? 'Protect the clan until the mountain passage opens. Saving your people is the victory condition.' : 'Pasture runs out and the calamity grows. Choose when to pack up and leave.'}</div>${canMigrate(run) ? '<button class="primary-button" data-action="routes">Choose a migration route <span>→</span></button>' : ''}</div>`;
  } else if (tab === 'clan') {
    content = `<div class="journal-chapter"><span class="eyebrow">YOUR LIVING CIVILIZATION</span><h3>${clanDoctrine(run)}</h3><div class="clan-facts"><div><strong>${clan.population}</strong><span>People</span></div><div><strong>${riderCount(run)}</strong><span>Mounted riders</span></div><div><strong>${assignedWorkers(run)} / ${clan.population}</strong><span>Assigned workers</span></div><div><strong>${clan.herd}</strong><span>Livestock</span></div></div><p class="formation-detail"><strong>${FORMATIONS[clan.formation].title}</strong><br>${FORMATIONS[clan.formation].description}</p><div class="clan-buildings">${BUILDINGS.map((b) => `<div class="clan-building"><span class="clan-building-art">${campIllustration(b.id)}</span><div><strong>${b.title}</strong><p>${clan.buildings[b.id] === 2 ? b.paths[clan.paths[b.id]!]!.title : clan.buildings[b.id] ? 'Established' : 'Not yet established'}</p></div></div>`).join('')}</div>${clan.stage !== 'migration' ? '<button class="primary-button" data-action="build">Develop the camp <span>↗</span></button>' : '<p class="journal-callout">Unpack at the next pasture to develop your buildings.</p>'}</div>`;
  } else if (tab === 'story') {
    content = storyRecords(run);
  } else {
    const entries = Object.entries(run.upgrades);
    content = `<div class="journal-chapter"><span class="eyebrow">WHAT YOUR PEOPLE HAVE LEARNED</span><h3>Clan traditions</h3><div class="traditions-list">${
      entries.length
        ? entries
            .map(([id, stacks]) => {
              const upgrade = UPGRADES.find((entry) => entry.id === id)!;
              return `<article class="tradition-entry"><span>${clanMark(TRADITION_MARKS[upgrade.id] ?? 'spirit')}</span><div><h4>${upgrade.title} <small>RANK ${stacks}</small></h4><p>${upgrade.description}</p></div></article>`;
            })
            .join('')
        : '<p class="journal-callout">Gather spirit shards from fallen enemies to earn knowledge points, then spend them in the tech tree.</p>'
    }</div><button class="primary-button" data-action="research">Open tech tree · ${run.pendingUpgrades} knowledge points <span>→</span></button></div>`;
  }
  return `<section class="game-panel journal-dialog">${heading('THE CLAN CHRONICLE', 'A people on the move.')}<div class="journal-tabs" role="tablist" aria-label="Chronicle sections">${(['journey', 'clan', 'traditions', 'story'] as const).map((entry) => `<button role="tab" id="tab-${entry}" aria-selected="${entry === tab}" aria-controls="journal-page" tabindex="${entry === tab ? 0 : -1}" data-tab="${entry}">${entry === 'journey' ? 'The journey' : entry === 'clan' ? 'Your clan' : entry === 'story' ? 'Our story' : 'Traditions'}</button>`).join('')}</div><div class="panel-body" id="journal-page" role="tabpanel" aria-labelledby="tab-${tab}">${content}</div>${footer()}</section>`;
}

export function settingsMenu(muted: boolean, fullscreen: boolean): string {
  return `<section class="game-panel utility-panel">${heading('MAKE YOURSELF AT HOME', 'Settings')}<div class="panel-body"><div class="setting-row"><div><h3>Sound</h3><p>The sounds of the steppe and the mounted host.</p></div><button class="setting-button" data-action="sound" aria-label="${muted ? 'Unmute sound' : 'Mute sound'}" aria-pressed="${!muted}">${muted ? 'Muted' : 'Enabled'}</button></div><div class="setting-row"><div><h3>Display</h3><p>F11 or Alt+Enter to toggle fullscreen.</p></div><button class="setting-button" data-action="fullscreen" aria-label="${fullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}" aria-pressed="${fullscreen}">${fullscreen ? 'Fullscreen' : 'Windowed'}</button></div><p class="settings-note">Sound preference is saved automatically.</p></div>${footer('Back')}</section>`;
}

export function helpMenu(): string {
  const controls = [
    ['WASD / ARROWS', 'Ride', 'LEFT STICK'],
    ['SPACE', 'Gallop', 'A'],
    ['B', 'Develop camp', 'X'],
    ['T', 'Tradition tech tree', 'LB'],
    ['M', 'Pack & migrate', 'Y'],
    ['F', 'Change formation', 'RB'],
    ['TAB / J', 'Clan chronicle', 'VIEW'],
    ['ESC', 'Pause / back', 'START / B'],
  ];
  return `<section class="game-panel help-panel">${heading('A SMALL CLAN. AN ENDLESS STEPPE.', 'How to play')}<div class="panel-body"><div class="help-loop"><article><span class="help-step">${clanMark('ger')}<b>01</b></span><h3>Build</h3><p>Raise gers, train riders, and gather supplies. Your civilization is your fighting force.</p></article><article><span class="help-step">${clanMark('bow')}<b>02</b></span><h3>Defend</h3><p>Ride to dodge. Attacks fire automatically. Collect spirit shards for knowledge points. Open the tech tree with T to learn traditions.</p></article><article><span class="help-step">${clanMark('banner')}<b>03</b></span><h3>Migrate</h3><p>After 45 seconds, new routes open. Pack up before the pasture dies and protect the moving caravan.</p></article></div><p class="journal-callout">Two acts carry the clan across four regions. Camp conversations pause the world and offer a choice; Escape or controller B continues without choosing. Read past scenes in the chronicle’s Our story tab. Turn Camp scenes off at the title for uninterrupted combat.</p><div class="control-table"><div class="control-table-heading"><span>KEYBOARD</span><span>ACTION</span><span>CONTROLLER</span></div>${controls.map(([key, action, pad]) => `<div><kbd>${key}</kbd><span>${action}</span><kbd>${pad}</kbd></div>`).join('')}</div><p class="journal-callout">Keep your people fed and their resolve above zero. Reach the sacred mountain and hold the passage for three minutes to save the clan.</p><p class="settings-note">Touch preview: drag the battlefield to ride; tap the command dock to act.</p></div>${footer('Back')}</section>`;
}
