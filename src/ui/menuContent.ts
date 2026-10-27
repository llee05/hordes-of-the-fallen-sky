import { normalizeVisualSettings, type VisualSettings } from '../shared/visualSettings';
import { expeditionMetricsContent } from './expeditionMetricsContent';
import { STARTING_TRADITIONS, startingTradition } from '../game/data/clan';
import { areaIntel } from './areaContent';
import { BUILDINGS, FORMATIONS, REGIONS } from '../game/data/clan';
import { PATRONS } from '../game/data/patrons';
import { GAME } from '../game/config';
import { RESEARCH_BY_ID } from '../game/data/research';
import { assignedWorkers, canMigrate, clanDoctrine, riderCount } from '../game/state/clan';
import type { RunState } from '../game/types';
import { campIllustration, clanMark } from './artwork';
import { heading, footer } from './panelContent';
import { khanRecords } from './legacyContent';
import { storyRecords } from './storyContent';
import { arrivalLocation, currentLocation, locationAtChapter } from '../game/state/journey';
import { AUDIO_CHANNELS, normalizeAudioMix, type AudioMix } from '../shared/audioSettings';

export type JournalTab = 'journey' | 'clan' | 'traditions' | 'story';

export { buildingMenu } from './campModel';

export { routeMenu } from './migrationContent';

export function journalMenu(run: RunState, tab: JournalTab): string {
  const clan = run.clan;
  const region = currentLocation(run);
  const description = [region.description, region.context].filter(Boolean).join(' ');
  let content: string;
  if (tab === 'journey') {
    content = `<div class="journal-chapter"><span class="eyebrow">PASTURE ${clan.region + 1} OF 4</span><h3>${region.name}</h3><p>${description}</p>${areaIntel(region.id)}<div class="journey-map" aria-label="Journey progress">${REGIONS.map((r, i) => `<div class="journey-stop ${i === clan.region ? 'current' : i < clan.region ? 'passed' : ''}"><span>${clanMark(i === 3 ? 'mountain' : i === 1 ? 'river' : i === 2 ? 'sanctuary' : 'ger')}</span><div><strong>${locationAtChapter(run, i).name}</strong><small>${i < clan.region ? 'CROSSED' : i === clan.region ? 'YOUR CLAN IS HERE' : r.event.toUpperCase()}</small></div></div>`).join('')}</div><div class="journal-callout">${clan.stage === 'migration' ? `The caravan is on the road to ${arrivalLocation(run).name}. Ride with your people until the crossing is done.` : clan.stage === 'final' ? 'Hold on until the mountain passage opens. If your people live, the clan has won.' : 'The grass thins as the calamity grows. You choose when to pack up and go.'}</div>${canMigrate(run) ? '<button class="primary-button" data-action="routes">Choose a migration route <span>→</span></button>' : ''}</div>`;
  } else if (tab === 'clan') {
    content = `<div class="journal-chapter"><span class="eyebrow">YOUR LIVING CIVILIZATION</span><h3>${clanDoctrine(run)}</h3><p class="journal-callout">Starting tradition: <strong>${startingTradition(run.startingTradition).title}</strong>. ${startingTradition(run.startingTradition).role}</p><div class="clan-facts"><div><strong>${clan.population}</strong><span>People</span></div><div><strong>${riderCount(run)}</strong><span>Mounted riders</span></div><div><strong>${assignedWorkers(run)} / ${clan.population}</strong><span>Assigned workers</span></div><div><strong>${clan.herd}</strong><span>Livestock</span></div></div>${khanRecords(run)}${expeditionMetricsContent(run)}<p class="formation-detail"><strong>${FORMATIONS[clan.formation].title}</strong><br>${FORMATIONS[clan.formation].description}</p><div class="clan-buildings">${BUILDINGS.map(
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
    )}</div>${clan.stage !== 'migration' ? '<button class="primary-button" data-action="build">Develop the camp <span>↗</span></button>' : '<p class="journal-callout">Buildings wait until you unpack at the next pasture.</p>'}</div>`;
  } else if (tab === 'story') {
    content = storyRecords(run);
  } else {
    const entries = Object.entries(run.upgrades).filter(([, rank]) => rank > 0);
    content = `<div class="journal-chapter"><span class="eyebrow">WHAT YOUR PEOPLE HAVE LEARNED</span><h3>Patron traditions</h3><div class="traditions-list">${
      entries.length
        ? entries
            .map(([id, stacks]) => {
              const upgrade = RESEARCH_BY_ID.get(id);
              if (!upgrade) return '';
              const patrons =
                upgrade.patronIds
                  .map((patronId) => PATRONS.find((entry) => entry.id === patronId)!.name)
                  .join(' + ') || 'General research';
              return `<article class="tradition-entry"><span>${clanMark(`research:${id}`)}</span><div><h4>${patrons} · ${upgrade.title} <small>RANK ${stacks}</small></h4><p>${upgrade.description}</p></div></article>`;
            })
            .join('')
        : '<p class="journal-callout">Collect the shards fallen enemies drop. They become knowledge points for the tech tree.</p>'
    }</div><button class="primary-button" data-action="research">Open tech tree · ${run.pendingUpgrades} knowledge points <span>→</span></button></div>`;
  }
  return `<section class="game-panel journal-dialog">${heading('THE CLAN CHRONICLE', 'A people on the move.')}<div class="journal-tabs" role="tablist" aria-label="Chronicle sections">${(['journey', 'clan', 'traditions', 'story'] as const).map((entry) => `<button role="tab" id="tab-${entry}" aria-selected="${entry === tab}" aria-controls="journal-page" tabindex="${entry === tab ? 0 : -1}" data-tab="${entry}">${entry === 'journey' ? 'The journey' : entry === 'clan' ? 'Your clan' : entry === 'story' ? 'Our story' : 'Traditions'}</button>`).join('')}</div><div class="panel-body" id="journal-page" role="tabpanel" aria-labelledby="tab-${tab}">${content}</div>${footer()}</section>`;
}

export function settingsMenu(
  muted: boolean,
  fullscreen: boolean,
  settings?: AudioMix,
  visual?: VisualSettings,
): string {
  const mix = normalizeAudioMix(settings);
  const visuals = normalizeVisualSettings(visual);
  const labels = { music: 'Music', ambience: 'Ambience', combat: 'Combat', ui: 'Interface' };
  return `<section class="game-panel utility-panel">${heading('MAKE YOURSELF AT HOME', 'Settings')}<div class="panel-body"><div class="setting-row"><div><h3>Sound</h3><p>Recorded bowstrings, horses, leather, timber, and open air.</p></div><button class="setting-button" data-action="sound" aria-label="${muted ? 'Unmute sound' : 'Mute sound'}" aria-pressed="${!muted}">${muted ? 'Muted' : 'Enabled'}</button></div><div class="setting-row"><div><h3>Projectile contrast</h3><p>Enemy projectiles turn bright amber and look larger. Hit areas stay the same.</p></div><button class="setting-button" data-visual-setting="projectileContrast" aria-label="Projectile contrast" aria-pressed="${visuals.projectileContrast === 'high'}">${visuals.projectileContrast === 'high' ? 'High' : 'Standard'}</button></div><div class="setting-row"><div><h3>Effect density</h3><p>Thins dust, impact motes, defeat fades and shake. Attacks and danger warnings always show.</p></div><button class="setting-button" data-visual-setting="effectDensity" aria-label="Effect density">${visuals.effectDensity}</button></div><div class="audio-mix-controls" aria-label="Audio mix">${AUDIO_CHANNELS.map((channel) => `<label><span>${labels[channel]} <output data-audio-value="${channel}">${Math.round(mix[channel] * 100)}%</output></span><input type="range" min="0" max="100" step="1" value="${Math.round(mix[channel] * 100)}" data-audio-channel="${channel}" data-focus-key="audio-${channel}" aria-label="${labels[channel]} volume"/>${channel === 'music' ? '<small>Score not yet recorded.</small>' : ''}</label>`).join('')}</div><details class="audio-reference-controls"><summary>Listen to the sound palette</summary><div>${[
    ['shoot', 'Bow'],
    ['impact', 'Impact'],
    ['spell', 'Spirit'],
    ['ui', 'Parchment'],
    ['wind', 'Steppe wind'],
  ]
    .map(
      ([id, label]) =>
        `<button class="secondary-button" data-audio-reference="${id}" data-focus-key="reference-${id}">${label}</button>`,
    )
    .join(
      '',
    )}</div></details><div class="setting-row"><div><h3>Display</h3><p>F11 or Alt+Enter to toggle fullscreen.</p></div><button class="setting-button" data-action="fullscreen" aria-label="${fullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}" aria-pressed="${fullscreen}">${fullscreen ? 'Fullscreen' : 'Windowed'}</button></div><p class="settings-note">Sound, mix, terrain and combat visuals are remembered as you change them.</p></div>${footer('Back')}</section>`;
}

export function helpMenu(guidance = true): string {
  const controls = [
    ['WASD / ARROWS', 'Ride', 'LEFT STICK'],
    ['SPACE', 'Gallop', 'A'],
    ['B', 'Develop camp', 'X'],
    ['T', 'Patron tech tree', 'LB'],
    ['M', 'Pack & migrate', 'Y'],
    ['F', 'Change formation', 'RB'],
    ['1 / 2', 'Choose the next Khan', 'LEFT / RIGHT'],
    ['TAB / J', 'Clan chronicle', 'VIEW'],
    ['+ / − / WHEEL', 'Zoom in / out', 'RT / LT'],
    ['0', 'Reset zoom', 'RIGHT STICK CLICK'],
    ['ESC', 'Pause / back', 'START / B'],
  ];
  return `<section class="game-panel help-panel">${heading('A SMALL CLAN. AN ENDLESS STEPPE.', 'How to play')}<div class="panel-body"><p class="journal-callout">Tips follow you through the first crossing and never stop the fight. <button class="secondary-button" data-action="guidance" aria-pressed="${guidance}">${guidance ? 'Hide guidance' : 'Show guidance'}</button></p><div class="help-loop"><article><span class="help-step">${clanMark('ger')}<b>01</b></span><h3>Build</h3><p>Raise gers, train riders, lay in supplies. The people you build are your army.</p></article><article><span class="help-step">${clanMark('bow')}<b>02</b></span><h3>Defend</h3><p>Keep moving to dodge; attacks fire on their own. Ride without stopping to charge a stronger, piercing volley, and gallop through packs to clear space. Spirit shards become knowledge points: press T to spend them on traditions.</p></article><article><span class="help-step">${clanMark('banner')}<b>03</b></span><h3>Migrate</h3><p>Routes open after 45 seconds; pack up before the pasture fails. Then hold a ford, break a ridge ambush, or bring households into the moving caravan.</p></article></div><p class="journal-callout">Two acts carry the clan across four regions. Camp conversations pause the world for a choice; Escape or controller B moves on without one. Past scenes wait in the chronicle’s Our story tab, and Camp scenes can be turned off at the title.</p><div class="control-table"><div class="control-table-heading"><span>KEYBOARD</span><span>ACTION</span><span>CONTROLLER</span></div>${controls.map(([key, action, pad]) => `<div><kbd>${key}</kbd><span>${action}</span><kbd>${pad}</kbd></div>`).join('')}</div><p class="journal-callout">When the Khan falls, the clan takes ${GAME.khan.successionDelay} seconds to choose another while its defenses fight on. The new Khan rides out from the camp or caravan at full health. You may pick the outrider (+5% riding speed) or the hearthguard (8% less Khan damage) with 1 / 2, controller left / right, or the HUD; the trait lasts that generation. Menus pause the countdown.</p><p class="journal-callout">Keep your people fed and their resolve above zero. Reach the sacred mountain and hold the passage for three minutes to save the clan.</p><p class="journal-callout">Every place has its own creatures and terrain rule; check them in destination previews or the chronicle’s Journey page. Woodland and reed stalkers hide in cover. Frost, silt, stone and wind attacks are marked first, giving you time to move. Defeat or pin casters to stop unreleased spells.</p><p class="journal-callout">Watch the camp-pressure arrow and marked attackers. Optional supplies, loose herds, households and enemy gatherings pay well; escorts must reach camp. A crossing with no casualties restores four extra resolve.</p><p class="settings-note">Touch preview: drag the battlefield to ride; tap the command dock to act.</p></div>${footer('Back')}</section>`;
}

export function startingTraditionMenu(run: RunState): string {
  return `<section class="game-panel starting-traditions">${heading('EIGHT SURVIVORS. ONE BLUE BANNER.', 'Choose a starting tradition')}<div class="panel-body"><p class="panel-intro">Decide how the households make ready. Whichever you pick, every patron and every camp facility stays open to you.</p><div class="starting-tradition-grid" role="group" aria-label="Starting clan traditions">${STARTING_TRADITIONS.map(
    (entry) => {
      const { balance: b } = startingTradition(entry.id);
      const perks = [
        b.riders ? `+${b.riders} starting rider` : '',
        b.protection < 1 ? `${Math.round((1 - b.protection) * 100)}% less clan damage` : '',
        b.speed > 1 ? `Riding speed +${Math.round((b.speed - 1) * 100)}%` : '',
        b.pickup > 1 ? `Shard reach +${Math.round((b.pickup - 1) * 100)}%` : '',
        b.mobility > 1 ? `Caravan mobility +${Math.round((b.mobility - 1) * 100)}%` : '',
      ].filter(Boolean);
      return `<button class="starting-tradition-card" data-starting-tradition="${entry.id}" aria-pressed="${(run.startingTradition ?? 'shared-hearth') === entry.id}" data-focus-key="starting-${entry.id}"><span aria-hidden="true">${clanMark(entry.icon)}</span><h3>${entry.title}</h3><p>${entry.description}</p><strong>${1 + b.riders} rider${b.riders ? 's' : ''} · ${b.food} food · ${b.materials} materials</strong><p class="tradition-perks">${perks.join(' · ') || 'No special edge; an even start.'}</p><small>${entry.role}</small></button>`;
    },
  ).join(
    '',
  )}</div><p class="journal-callout">Every tradition sets out with eight people and three horses. The choice holds for the whole expedition, through migration and succession, and its supplies come once, at the start.</p></div><footer class="panel-footer"><button class="secondary-button" data-action="back">Back to title</button><button class="primary-button" data-action="begin" data-primary>Begin expedition <span>→</span></button></footer></section>`;
}
