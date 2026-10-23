import { BUILDINGS, FORMATIONS, REGIONS, ROUTES } from '../game/data/clan';
import { PATRONS } from '../game/data/patrons';
import { GAME } from '../game/config';
import { UPGRADES } from '../game/data/upgrades';
import { assignedWorkers, canMigrate, clanDoctrine, riderCount } from '../game/state/clan';
import type { RunState } from '../game/types';
import { campIllustration, clanMark, routeIllustration } from './artwork';
import { heading, footer } from './panelContent';
import { khanRecords } from './legacyContent';
import { storyRecords } from './storyContent';
import { crossingForecast } from '../game/state/economy';
import { formatTime } from '../game/state/run';

export type JournalTab = 'journey' | 'clan' | 'traditions' | 'story';

export { buildingMenu } from './campModel';

export function routeMenu(run: RunState): string {
  return `<section class="game-panel route-dialog">${heading(`CAMP ${run.clan.region + 1} / THE ROAD EAST`, 'Where the grass still grows.', true, 'banner')}<div class="panel-body"><p class="panel-intro">Pack the gers. Protect the moving caravan. Rewards await at the far end.</p><p class="forecast-note">Travel estimates use your current households, horses, and improvements. Losses can change them. Arrival supplies come after the crossing.</p><div class="route-map"><span>${REGIONS[run.clan.region]!.short}</span><i>◇ ─ ─ ─ → ◇</i><span>${REGIONS[run.clan.region + 1]!.short}</span></div><div class="upgrade-cards">${ROUTES.map(
    (r) => {
      const forecast = crossingForecast(run, r);
      return `<button class="upgrade-card route-card" data-route="${r.id}">${routeIllustration(r.id)}<span class="upgrade-subtitle">${r.subtitle}</span><h3>${r.title}</h3><p>${r.description}</p><span class="route-forecast"><span>Travel ~${formatTime(Math.ceil(forecast.duration))}</span><span>Food needed en route ~${forecast.foodNeeded.toFixed(1)}</span><span>Food after arrival ~${forecast.foodAfterArrival.toFixed(1)}</span>${forecast.shortfall > 0 ? `<strong class="forecast-shortfall">Food runs out before arrival · short ~${forecast.shortfall.toFixed(1)}</strong>` : '<span>Supplied for the crossing</span>'}</span><span class="card-bottom">PACK & DEPART <span>→</span></span></button>`;
    },
  ).join('')}</div></div>${footer('Stay a little longer')}</section>`;
}

export function journalMenu(run: RunState, tab: JournalTab): string {
  const clan = run.clan;
  const region = REGIONS[clan.region]!;
  let content: string;
  if (tab === 'journey') {
    content = `<div class="journal-chapter"><span class="eyebrow">PASTURE ${clan.region + 1} OF 4</span><h3>${region.name}</h3><p>${region.description}</p><div class="journey-map" aria-label="Journey progress">${REGIONS.map((r, i) => `<div class="journey-stop ${i === clan.region ? 'current' : i < clan.region ? 'passed' : ''}"><span>${clanMark(i === 3 ? 'mountain' : i === 1 ? 'river' : i === 2 ? 'sanctuary' : 'ger')}</span><div><strong>${r.name}</strong><small>${i < clan.region ? 'CROSSED' : i === clan.region ? 'YOUR CLAN IS HERE' : r.event.toUpperCase()}</small></div></div>`).join('')}</div><div class="journal-callout">${clan.stage === 'migration' ? 'The caravan is moving east. Stay alongside your people until the crossing is complete.' : clan.stage === 'final' ? 'Protect the clan until the mountain passage opens. Saving your people is the victory condition.' : 'Pasture runs out and the calamity grows. Choose when to pack up and leave.'}</div>${canMigrate(run) ? '<button class="primary-button" data-action="routes">Choose a migration route <span>→</span></button>' : ''}</div>`;
  } else if (tab === 'clan') {
    content = `<div class="journal-chapter"><span class="eyebrow">YOUR LIVING CIVILIZATION</span><h3>${clanDoctrine(run)}</h3><div class="clan-facts"><div><strong>${clan.population}</strong><span>People</span></div><div><strong>${riderCount(run)}</strong><span>Mounted riders</span></div><div><strong>${assignedWorkers(run)} / ${clan.population}</strong><span>Assigned workers</span></div><div><strong>${clan.herd}</strong><span>Livestock</span></div></div>${khanRecords(run)}<p class="formation-detail"><strong>${FORMATIONS[clan.formation].title}</strong><br>${FORMATIONS[clan.formation].description}</p><div class="clan-buildings">${BUILDINGS.map(
      (b) =>
        `<div class="clan-building"><span class="clan-building-art">${campIllustration(b.illustration ?? 'ger')}</span><div><strong>${b.title}</strong><p>${
          (clan.paths[b.id]?.length ?? 0) > 0
            ? b.paths
                .filter((path) => clan.paths[b.id]?.includes(path.id))
                .map((path) => path.title)
                .join(' · ')
            : clan.buildings[b.id]
              ? 'Established'
              : 'Not yet established'
        }</p></div></div>`,
    ).join(
      '',
    )}</div>${clan.stage !== 'migration' ? '<button class="primary-button" data-action="build">Develop the camp <span>↗</span></button>' : '<p class="journal-callout">Unpack at the next pasture to develop your buildings.</p>'}</div>`;
  } else if (tab === 'story') {
    content = storyRecords(run);
  } else {
    const entries = Object.entries(run.upgrades);
    content = `<div class="journal-chapter"><span class="eyebrow">WHAT YOUR PEOPLE HAVE LEARNED</span><h3>Patron traditions</h3><div class="traditions-list">${
      entries.length
        ? entries
            .map(([id, stacks]) => {
              const upgrade = UPGRADES.find((entry) => entry.id === id);
              if (!upgrade) return '';
              const patron = PATRONS.find((entry) => entry.id === upgrade.patron);
              return `<article class="tradition-entry"><span>${clanMark(patron?.symbol ?? 'spirit')}</span><div><h4>${patron?.name ?? ''} · ${upgrade.title} <small>RANK ${stacks}</small></h4><p>${upgrade.description}</p></div></article>`;
            })
            .join('')
        : '<p class="journal-callout">Gather spirit shards from fallen enemies to earn knowledge points, then spend them in the tech tree.</p>'
    }</div><button class="primary-button" data-action="research">Open tech tree · ${run.pendingUpgrades} knowledge points <span>→</span></button></div>`;
  }
  return `<section class="game-panel journal-dialog">${heading('THE CLAN CHRONICLE', 'A people on the move.')}<div class="journal-tabs" role="tablist" aria-label="Chronicle sections">${(['journey', 'clan', 'traditions', 'story'] as const).map((entry) => `<button role="tab" id="tab-${entry}" aria-selected="${entry === tab}" aria-controls="journal-page" tabindex="${entry === tab ? 0 : -1}" data-tab="${entry}">${entry === 'journey' ? 'The journey' : entry === 'clan' ? 'Your clan' : entry === 'story' ? 'Our story' : 'Traditions'}</button>`).join('')}</div><div class="panel-body" id="journal-page" role="tabpanel" aria-labelledby="tab-${tab}">${content}</div>${footer()}</section>`;
}

export function settingsMenu(muted: boolean, fullscreen: boolean): string {
  return `<section class="game-panel utility-panel">${heading('MAKE YOURSELF AT HOME', 'Settings')}<div class="panel-body"><div class="setting-row"><div><h3>Sound</h3><p>Hooves, bowstrings, camp timber, and clan horns.</p></div><button class="setting-button" data-action="sound" aria-label="${muted ? 'Unmute sound' : 'Mute sound'}" aria-pressed="${!muted}">${muted ? 'Muted' : 'Enabled'}</button></div><div class="setting-row"><div><h3>Display</h3><p>F11 or Alt+Enter to toggle fullscreen.</p></div><button class="setting-button" data-action="fullscreen" aria-label="${fullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}" aria-pressed="${fullscreen}">${fullscreen ? 'Fullscreen' : 'Windowed'}</button></div><p class="settings-note">Sound preference is saved automatically.</p></div>${footer('Back')}</section>`;
}

export function helpMenu(guidance = true): string {
  const controls = [
    ['WASD / ARROWS', 'Ride', 'LEFT STICK'],
    ['SPACE', 'Gallop', 'A'],
    ['B', 'Develop camp', 'X'],
    ['T', 'Patron tech tree', 'LB'],
    ['M', 'Pack & migrate', 'Y'],
    ['F', 'Change formation', 'RB'],
    ['TAB / J', 'Clan chronicle', 'VIEW'],
    ['+ / − / WHEEL', 'Zoom in / out', 'RT / LT'],
    ['0', 'Reset zoom', 'RIGHT STICK CLICK'],
    ['ESC', 'Pause / back', 'START / B'],
  ];
  return `<section class="game-panel help-panel">${heading('A SMALL CLAN. AN ENDLESS STEPPE.', 'How to play')}<div class="panel-body"><p class="journal-callout">Contextual tips guide your first crossing without pausing the battle. <button class="secondary-button" data-action="guidance" aria-pressed="${guidance}">${guidance ? 'Hide guidance' : 'Show guidance'}</button></p><div class="help-loop"><article><span class="help-step">${clanMark('ger')}<b>01</b></span><h3>Build</h3><p>Raise gers, train riders, and gather supplies. Your civilization is your fighting force.</p></article><article><span class="help-step">${clanMark('bow')}<b>02</b></span><h3>Defend</h3><p>Ride to dodge. Attacks fire automatically. Collect spirit shards for knowledge points. Open the tech tree with T to learn traditions.</p></article><article><span class="help-step">${clanMark('banner')}<b>03</b></span><h3>Migrate</h3><p>After 45 seconds, new routes open. Pack up before the pasture dies and protect the moving caravan.</p></article></div><p class="journal-callout">Two acts carry the clan across four regions. Camp conversations pause the world and offer a choice; Escape or controller B continues without choosing. Read past scenes in the chronicle’s Our story tab. Turn Camp scenes off at the title for uninterrupted combat.</p><div class="control-table"><div class="control-table-heading"><span>KEYBOARD</span><span>ACTION</span><span>CONTROLLER</span></div>${controls.map(([key, action, pad]) => `<div><kbd>${key}</kbd><span>${action}</span><kbd>${pad}</kbd></div>`).join('')}</div><p class="journal-callout">When the Khan falls, the clan spends ${GAME.khan.successionDelay} seconds choosing a new Khan while its defenses fight on. He returns at the current camp or caravan with full health. Menus pause the countdown.</p><p class="journal-callout">Keep your people fed and their resolve above zero. Reach the sacred mountain and hold the passage for three minutes to save the clan.</p><p class="settings-note">Touch preview: drag the battlefield to ride; tap the command dock to act.</p></div>${footer('Back')}</section>`;
}
