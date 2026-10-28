import { NOMADIC_BUILDINGS } from '../game/data/nomadicCamp';
import type { NomadicBuildingId } from '../shared/nomadicCamp.js';
import { normalizeVisualSettings } from '../shared/visualSettings';
import {
  dangerWarningsContent,
  eliteMarkersContent,
  majorLossMessage,
} from './combatReadabilityContent';
import { finalChapter, passageBonus, passageProgress } from '../game/state/finalStand';
import { expeditionMetricsContent } from './expeditionMetricsContent';
import { SUCCESSORS } from '../game/data/successors';
import { AREA_ENCOUNTERS } from '../game/data/areaEncounters';
import { AREA_ENEMIES } from '../game/data/enemies';
import { CROSSING_ENCOUNTERS } from '../game/data/crossings';
import { encounterPlan } from '../game/state/encounters';
import { FIELD_OBJECTIVES } from '../game/data/fieldObjectives';
import { GAME } from '../game/config';
import { saveMenu, type SaveConfirmation } from './saveContent';
import { isSaveSlot } from '../shared/expeditionSave';
import { clanMark } from './artwork';
import { UIMotion } from './Motion';
import { FORMATIONS, startingTradition } from '../game/data/clan';
import { arrivalLocation, availableDestinations, currentLocation } from '../game/state/journey';
import { INTRO_SLIDES, introImageUrl } from '../game/data/intro';
import { introMenu } from './introContent';
import { storyAct } from '../game/data/story';
import { storyMenu, epilogueMenu, storyLogMenu, defeatAccountContent } from './storyContent';
import type { ArenaScene } from '../game/scenes/ArenaScene';
import {
  assignedWorkers,
  availableFormations,
  burningTempest,
  canMigrate,
  clanDoctrine,
  riderCount,
} from '../game/state/clan';
import { currentReaction } from '../game/state/legacy';
import { COMPANIONS } from '../game/data/story';
import { currentGuidance, clanWarning } from '../game/state/guidance';
import { guidanceContent } from './guidanceContent';
import { economyForecast } from '../game/state/economy';
import { foodOutlook, FORECAST_NOTE, signedRate } from './economyContent';
import { formatTime } from '../game/state/run';
import { isKhanActive } from '../game/state/khan';
import type { BuildingId, HudSnapshot, RunPhase } from '../game/types';
import type { GamePlatform } from '../platform/GamePlatform';
import {
  buildingMenu,
  helpMenu,
  journalMenu,
  routeMenu,
  settingsMenu,
  startingTraditionMenu,
} from './menuContent';
import type { JournalTab } from './menuContent';
import { researchMenu } from './researchContent';
import { developerConsole, developerMenu } from './developerContent';
import type { TreeViewState } from './progressionTree';
import { AUDIO_CHANNELS, normalizeAudioMix, type AudioChannel } from '../shared/audioSettings';
import { AUDIO_REFERENCE_CUES, type SoundKind } from '../game/audio/soundPalette';

const emblem = `<span class="clan-seal">${clanMark('spirit')}</span>`;

export class GameUI {
  private saveConfirmation?: SaveConfirmation;
  readonly canvasParent: HTMLElement;
  private readonly overlay: HTMLElement;
  private readonly motion: UIMotion;
  private phase: RunPhase = 'ready';
  private fullscreen = false;
  private journalTab: JournalTab = 'journey';
  private treeViews = new Map<RunPhase, TreeViewState>();
  private campSelection: BuildingId = 'ger';
  private destinationSelection?: string;

  private treeView(phase = this.phase): TreeViewState {
    let view = this.treeViews.get(phase);
    if (!view) {
      view = { category: 'all', query: '' };
      this.treeViews.set(phase, view);
    }
    return view;
  }
  private lastSnapshot?: HudSnapshot;
  private guideId = '';
  private lastMessage = '';
  private lastReaction = 0;
  private developerRevision = -1;
  private commandHistoryOffset = 0;
  private commandHistoryDraft = '';
  private toastTimer?: number;

  constructor(
    private readonly root: HTMLElement,
    private readonly scene: ArenaScene,
    private readonly platform: GamePlatform,
  ) {
    // Warm the remaining local paintings without blocking the first chapter or Skip.
    for (const slide of INTRO_SLIDES) {
      const image = new Image();
      image.src = introImageUrl(slide.image);
    }
    root.dataset.phase = 'ready';
    root.innerHTML = `<main class="game-shell" aria-label="Hordes of the Fallen Sky game">
      <div class="arena-wrap" id="arena-wrap" tabindex="0" aria-label="Game arena. WASD to ride. Space to gallop. T for the tech tree. B to build. M to migrate. F for formation. Tab or J for the clan chronicle. Escape to pause. Plus and minus to zoom, zero to reset.">
        <div id="game-canvas"></div>
        <div class="screen-shade" aria-hidden="true"></div>
        <div class="game-hud" id="game-hud" inert>
          <section class="resource-hud hud-surface" aria-label="Clan resources">
            <div class="resource-row">${[
              ['population', clanMark('people'), 'People', '8'],
              ['herd', clanMark('horse'), 'Herd', '3'],
              ['food', clanMark('grain'), 'Food', '70'],
              ['materials', clanMark('materials'), 'Materials', '50'],
              ['spirit', clanMark('spirit'), 'Spirit', '0'],
            ]
              .map(
                ([id, icon, label, value]) =>
                  `<div class="resource" title="${label}"><span class="resource-icon" aria-hidden="true">${icon}</span><div><span>${label}</span><strong id="${id}">${value}</strong></div></div>`,
              )
              .join('')}</div>
            <div class="host-summary"><span id="doctrine">A people taking shape</span><span><b id="riders">1</b> RIDERS &nbsp; <b id="workers">0 / 8</b> WORKERS</span></div>
            <p class="economy-hud" title="${FORECAST_NOTE}"><span id="food-rate"></span><span id="food-outlook"></span></p>
          </section>
          <div class="expedition-clock"><strong id="timer">00:00</strong><span id="stage-label">ENCAMPMENT</span>${import.meta.env.DEV ? '<span id="developer-run" hidden>DEVELOPER RUN · F8</span>' : ''}</div>
          <nav class="hud-menu" aria-label="Game menus"><button id="journal" class="hud-menu-button" title="Clan chronicle (Tab / J)" aria-label="Open clan chronicle" aria-keyshortcuts="Tab J"><span>${clanMark('journal')}</span><kbd>TAB</kbd></button><button id="pause" class="hud-menu-button" aria-label="Pause" title="Pause (Escape)"><span>${clanMark('pause')}</span><kbd>ESC</kbd></button></nav>
          <section class="objective-hud hud-surface" aria-label="Current objective"><div class="objective-heading"><span id="region-count">01 / 04</span><strong id="location">GOLDEN PASTURE</strong><span id="camp-age">DAY 1</span></div><p class="act-heading" id="act-heading">ACT I · GATHER THE SCATTERED</p><p id="objective">Grow the camp. Keep your people alive.</p><div class="pressure-row"><span>PASTURE <b id="pasture">100%</b></span><span>CALAMITY <b id="threat">0%</b></span></div><div class="pressure-tracks"><div class="track pasture-track"><div id="pasture-fill"></div></div><div class="track threat-track"><div id="threat-fill"></div></div></div><div id="migration-progress" hidden><div class="meter-row"><span id="progress-label">Crossing</span><b id="crossing">0%</b></div><div class="track"><div id="crossing-fill"></div></div></div><p class="objective-hint" id="migration-hint">Routes open in 45s.</p><p id="camp-pressure" class="field-status" role="status"></p><p id="clan-losses" class="field-status"></p><p id="major-loss" class="major-loss" role="status" hidden></p><p id="encounter-status" class="field-status" role="status"></p><p id="field-objective" class="field-status"></p><p id="clan-warning" class="clan-warning" role="status" hidden></p></section>
          <aside id="field-guide" class="field-guide hud-surface" aria-label="Expedition guidance" hidden></aside>
          <div class="zoom-controls hud-surface" role="group" aria-label="Battlefield zoom"><button id="zoom-out" aria-label="Zoom out" aria-keyshortcuts="-" title="Zoom out (− / LT)">−</button><button id="zoom-reset" aria-label="Reset battlefield zoom to 100%" aria-keyshortcuts="0" title="Reset zoom (0 / Right stick click)"><span id="zoom-level">100%</span></button><button id="zoom-in" aria-label="Zoom in" aria-keyshortcuts="+" title="Zoom in (+ / RT)">+</button></div>
          <div id="danger-warnings" class="danger-warnings" aria-label="Offscreen danger warnings" role="list"></div><div id="elite-markers" class="elite-markers" aria-label="Elite and armoured enemies" role="list"></div><div id="clan-bearing" class="clan-bearing"></div><div id="synergy" class="synergy" hidden>ϟ THE BURNING TEMPEST</div>
          <div id="boss-bar" class="boss-bar" hidden><span id="boss-stage">THE SKYBREAKER</span><div class="track"><div id="boss-fill"></div></div></div>
          <aside id="successor-choice" class="successor-choice hud-surface" aria-label="Choose successor" hidden><strong>Who will carry the banner?</strong><p>The countdown runs on. Choosing is up to you.</p><div>${Object.entries(
            SUCCESSORS,
          )
            .map(
              ([id, s], i) =>
                `<button data-successor="${id}" aria-pressed="false"><span>${i + 1}. ${s.title}</span><small>${s.description}</small></button>`,
            )
            .join(
              '',
            )}</div><small id="successor-selection">1 / 2 · controller left / right</small></aside>
          <section class="vitals-hud hud-surface" aria-label="Khan and clan health"><div class="health-heading"><span id="khan-title">THE KHAN</span><b id="health">100 / 100</b></div><div class="track health-track"><div id="health-fill"></div></div><div id="khan-succession" class="khan-succession" role="status" hidden><strong>Choosing a new Khan</strong><span id="khan-succession-countdown"></span></div><div class="health-heading clan-health"><span>CLAN RESOLVE</span><b id="integrity">100%</b></div><div class="track resolve-track"><div id="integrity-fill"></div></div><div class="vital-stats"><span>BOW <b id="power">16</b></span><span id="momentum">MOMENTUM 0%</span></div></section>
          <section class="tradition-hud" aria-label="Run progression"><span>TRADITION <b id="level">01</b> <small>· <span id="blessing-count">0</span> LEARNED</small></span><div class="xp-track"><div id="xp-fill"></div></div><small><b id="kills">0</b> BANISHED</small><button id="research" class="research-button" aria-label="Open patron tech tree" aria-keyshortcuts="T">Tech tree <kbd>T</kbd><span id="research-points">0</span></button></section>
          <button id="dash" class="dash-button hud-surface" aria-label="Dash"><span class="dash-symbol">${clanMark('horse')}</span><div><strong>GALLOP</strong><small id="dash-label">SPACE / READY</small></div><span class="dash-charge" id="dash-charge"></span></button>
          <nav class="command-dock" aria-label="Clan commands"><button id="build" class="command-button" title="Develop camp (B)"><span class="command-icon">${clanMark('ger')}</span><span>Develop camp</span><kbd>B</kbd></button><button id="formation" class="command-button" title="Change formation (F)"><span class="command-icon">${clanMark('bow')}</span><span id="formation-name">Caravan guard</span><kbd>F</kbd></button><button id="migrate" class="command-button migrate-button" title="Pack & migrate (M)" disabled><span class="command-icon">${clanMark('banner')}</span><span>Pack & migrate</span><kbd>M</kbd></button></nav>
          <div class="chronicle-toast" id="chronicle-toast"><span aria-hidden="true">${clanMark('spirit')}</span><div><p id="clan-message"></p><p id="companion-reaction" class="companion-reaction" hidden></p></div></div>
        </div>
        <div id="overlay" class="overlay ready-screen" role="dialog" aria-modal="true" aria-labelledby="overlay-title" tabindex="-1"></div>
        <div id="menu-record" class="menu-record"><span>LONGEST JOURNEY</span><strong id="best">— — : — —</strong></div>
        <div id="save-alert" class="save-alert" role="alert" hidden>Progress could not be saved.</div>
        <p id="run-status" class="sr-only" role="status">THE SKY IS WAITING</p>
      </div>
    </main>`;
    this.canvasParent = this.get('game-canvas');
    this.overlay = this.get('overlay');
    this.motion = new UIMotion(root);
    this.get('pause').addEventListener('click', () => scene.togglePause());
    this.get('journal').addEventListener('click', () => scene.toggleJournal());
    this.get('dash').addEventListener('click', () => scene.dash());
    this.get('research').addEventListener('click', () => scene.openResearch());
    this.get('build').addEventListener('click', () => scene.openBuildings());
    this.get('migrate').addEventListener('click', () => scene.openRoutes());
    this.get('successor-choice').addEventListener('click', (event) => {
      const trait = (event.target as HTMLElement).closest<HTMLElement>('[data-successor]')?.dataset
        .successor;
      if (trait === 'outrider' || trait === 'hearthguard') scene.selectSuccessor(trait);
    });
    this.get('formation').addEventListener('click', () => scene.cycleFormation());
    this.get('zoom-out').addEventListener('click', () => scene.changeZoom(-1));
    this.get('zoom-in').addEventListener('click', () => scene.changeZoom(1));
    this.get('zoom-reset').addEventListener('click', () => scene.changeZoom(0));
    this.get('field-guide').addEventListener('click', (event) => {
      const action = (event.target as HTMLElement).closest<HTMLElement>('[data-guide-action]')
        ?.dataset.guideAction;
      if (action === 'hide') {
        scene.toggleGuidance();
        this.get('arena-wrap').focus();
      } else if (action === 'build') scene.openBuildings();
      else if (action === 'research') scene.openResearch();
      else if (action === 'formation') scene.cycleFormation();
      else if (action === 'migrate') scene.openRoutes();
    });
    this.overlay.addEventListener('click', (event) => this.handleMenuClick(event));
    this.overlay.addEventListener('keydown', (event) => this.handleMenuKey(event));
    this.overlay.addEventListener('input', (event) => {
      const input = event.target as HTMLInputElement;
      if (input.matches('[data-audio-channel]')) {
        const channel = input.dataset.audioChannel as AudioChannel;
        if (AUDIO_CHANNELS.includes(channel)) {
          this.scene.setAudioVolume(channel, Number(input.value) / 100);
          const output = this.overlay.querySelector<HTMLOutputElement>(
            `[data-audio-value="${channel}"]`,
          );
          if (output) output.value = `${input.value}%`;
        }
        return;
      }
      if (import.meta.env.DEV && input.matches('[data-developer-command-input]')) {
        this.commandHistoryOffset = 0;
        return;
      }
      if (!input.matches('[data-tree-search]') || !this.lastSnapshot) return;
      this.treeView().query = input.value;
      if (this.phase === 'building')
        Object.assign(this.treeView(), {
          campPopup: !!input.value.trim(),
          campTarget: 'search',
          recipes: false,
          expanded: false,
        });
      this.renderPhase(this.lastSnapshot);
    });
    if (import.meta.env.DEV)
      this.overlay.addEventListener('submit', (event) => {
        if (
          !(event.target instanceof HTMLFormElement) ||
          !event.target.matches('[data-developer-command-form]')
        )
          return;
        event.preventDefault();
        const input = event.target.querySelector<HTMLInputElement>(
          '[data-developer-command-input]',
        )!;
        const command = input.value;
        input.value = '';
        this.commandHistoryOffset = 0;
        this.scene.executeDeveloperCommand(command);
        input.focus({ preventScroll: true });
      });
    const updateFullscreen = (fullscreen: boolean): void => {
      this.fullscreen = fullscreen;
      this.updateSettingsControls();
    };
    document.addEventListener('fullscreenchange', () =>
      updateFullscreen(Boolean(document.fullscreenElement)),
    );
    if (platform.desktop) {
      platform.desktop.onFullscreenChanged(updateFullscreen);
      void platform.desktop.isFullscreen().then(updateFullscreen);
    }
    scene.connect({
      onHud: (snapshot) => this.update(snapshot),
      onPhase: (snapshot) => this.renderPhase(snapshot),
      onMenuInput: (action) => this.navigateMenu(action),
      onCampBack: () => this.closeCampPopup(),
      onSaveError: () => {
        this.get('save-alert').hidden = false;
      },
    });
  }

  private get(id: string): HTMLElement {
    return this.root.querySelector<HTMLElement>(`#${id}`)!;
  }
  private text(id: string, value: string | number): void {
    const element = this.get(id);
    if (element.textContent !== String(value)) element.textContent = String(value);
  }
  private number(id: string, value: number, label = String(value)): void {
    const element = this.get(id);
    const previous = Number.parseFloat(element.textContent ?? '');
    this.text(id, label);
    if (Number.isFinite(previous) && previous !== value) {
      this.motion.change(element, value > previous);
      if (value < previous && (id === 'health' || id === 'integrity'))
        this.motion.damage(this.get('health').closest<HTMLElement>('.vitals-hud')!);
    }
  }
  private meter(id: string, value: number): void {
    this.get(id).style.width = `${Math.max(0, Math.min(value, 100))}%`;
  }

  private update(snapshot: HudSnapshot): void {
    this.lastSnapshot = snapshot;
    if (import.meta.env.DEV) {
      this.get('developer-run').hidden = !snapshot.developerRun;
      this.text(
        'developer-run',
        snapshot.developerConsole?.invincible ? 'INVINCIBLE · F10' : 'DEVELOPER RUN · F8',
      );
      this.updateDeveloperConsole(snapshot);
    }
    this.text('zoom-level', `${Math.round(snapshot.zoom * 100)}%`);
    (this.get('zoom-out') as HTMLButtonElement).disabled =
      snapshot.run.phase !== 'playing' || snapshot.zoom <= snapshot.minZoom + 0.0001;
    (this.get('zoom-in') as HTMLButtonElement).disabled =
      snapshot.run.phase !== 'playing' || snapshot.zoom >= snapshot.maxZoom - 0.0001;
    (this.get('zoom-reset') as HTMLButtonElement).disabled = snapshot.run.phase !== 'playing';
    const { run, dashReady, dashCooldown, best, bossHealth, clanBearing } = snapshot;
    this.motion.setPlaying(run.phase === 'playing');
    const combatVisible = run.phase === 'playing';
    const warningMarkup = combatVisible
      ? dangerWarningsContent(snapshot.combatReadability?.warnings ?? [])
      : '';
    const eliteMarkup = combatVisible
      ? eliteMarkersContent(snapshot.combatReadability?.elites ?? [])
      : '';
    if (this.get('danger-warnings').innerHTML !== warningMarkup)
      this.get('danger-warnings').innerHTML = warningMarkup;
    if (this.get('elite-markers').innerHTML !== eliteMarkup)
      this.get('elite-markers').innerHTML = eliteMarkup;
    const majorLoss = majorLossMessage(run);
    this.get('major-loss').hidden = !majorLoss;
    this.text('major-loss', majorLoss);

    const clan = run.clan;
    const guide = currentGuidance(run);
    this.get('field-guide').hidden = !guide || (!isKhanActive(run) && this.root.clientWidth <= 600);
    if ((guide?.id ?? '') !== this.guideId) {
      this.guideId = guide?.id ?? '';
      this.get('field-guide').innerHTML = guide ? guidanceContent(guide) : '';
    }
    const forecast = economyForecast(run);
    this.text('food-rate', `Food net ${signedRate(forecast.foodNet)}`);
    this.text('food-outlook', foodOutlook(run, forecast));
    this.get('food-outlook').classList.toggle(
      'danger',
      forecast.foodSeconds !== undefined && forecast.foodSeconds <= GAME.clan.foodWarningSeconds,
    );
    const warning = clanWarning(run, forecast);
    this.text('clan-warning', warning);
    this.get('clan-warning').hidden = !warning;
    this.get('integrity-fill').classList.toggle('low', clan.integrity <= 35);
    this.get('pasture-fill').classList.toggle('low', clan.pasture <= 25);
    const khanActive = isKhanActive(run);
    this.text(
      'khan-title',
      run.khan.generation > 1 ? `THE KHAN · ${run.khan.generation}` : 'THE KHAN',
    );
    this.get('khan-succession').hidden = run.khan.successionRemaining <= 0;
    this.get('successor-choice').hidden = run.khan.successionRemaining <= 0;
    for (const button of this.get('successor-choice').querySelectorAll<HTMLButtonElement>(
      '[data-successor]',
    )) {
      button.disabled = run.phase !== 'playing' || !!run.khan.candidate;
      button.setAttribute('aria-pressed', String(run.khan.candidate === button.dataset.successor));
    }
    this.text(
      'successor-selection',
      run.khan.candidate
        ? `${SUCCESSORS[run.khan.candidate].title} chosen · takes up the expedition`
        : '1 / 2 · controller left / right',
    );
    this.text('camp-pressure', snapshot.campPressure ?? '');
    const last = run.safety.lastDamage,
      causes = {
        attack: 'Enemy attacks',
        starvation: 'Starvation',
        eruption: 'Ground eruption',
        seer: 'Seer strike',
        area: 'Local terrain or spell',
      };
    const recent = last && run.elapsed - last.at < 10;
    this.text(
      'clan-losses',
      `Losses: ${run.safety.combatLosses} combat · ${run.safety.starvationLosses} hunger${recent ? ` · ${causes[last.cause]}: −${last.amount.toFixed(1)} resolve${last.people ? ` (${last.people} people)` : ''}` : ''}`,
    );
    this.get('clan-losses').hidden =
      !recent && run.safety.combatLosses + run.safety.starvationLosses === 0;
    this.text(
      'khan-succession-countdown',
      `Returns ${clan.stage === 'migration' ? 'to the caravan' : 'at camp'} in ${Math.ceil(run.khan.successionRemaining)}s`,
    );
    this.get('khan-succession')
      .closest('.vitals-hud')!
      .classList.toggle('choosing-khan', !khanActive);
    const encounter = encounterPlan(run);
    const area = AREA_ENCOUNTERS[currentLocation(run).id];
    this.get('encounter-status').title = `${area.title}. ${area.rule} ${area.counter}`;
    this.get('location').title = `${area.title}: ${AREA_ENEMIES.filter(
      (e) => e.home === currentLocation(run).id,
    )
      .map((e) => e.title)
      .join(', ')}. The chronicle lists every local threat.`;
    const approach = {
      flanks: 'Alternating flanks',
      banks: 'Both banks',
      shelves: 'Ridge approaches',
      shelter: 'Outcrop approaches',
      crossfire: 'Crossfire approaches',
    }[area.pattern];
    this.text(
      'encounter-status',
      `${encounter.title}${['warning', 'assault', 'elite'].includes(encounter.phase) ? ` · ${approach}` : ''} · ${Math.ceil(encounter.remaining)}s`,
    );
    const crossing = run.clan.stage === 'migration' ? run.crossing : undefined;
    if (crossing) {
      const c = CROSSING_ENCOUNTERS[crossing.route];
      this.text(
        'encounter-status',
        `${c.title} · ${crossing.phase === 'waiting' ? 'Watch the approaches' : crossing.phase === 'warning' ? 'Attack approaching' : crossing.route === 'refuge' ? (crossing.escort?.joined ? 'Households secured' : crossing.escort?.lost ? 'Households scattered' : c.task) : `${crossing.defeated}/${c.guards} raiders defeated`} · ${c.reward}`,
      );
    }
    const objective = run.field.objective;
    const visibleObjective = !!objective && ['available', 'returning'].includes(objective.status);
    this.get('field-objective').hidden = !visibleObjective;
    if (visibleObjective)
      this.text(
        'field-objective',
        `Optional ${snapshot.fieldBearing ?? ''}: ${FIELD_OBJECTIVES[objective.kind].title} · ${objective.status === 'returning' ? 'Escort to camp' : FIELD_OBJECTIVES[objective.kind].instruction} ${FIELD_OBJECTIVES[objective.kind].reward}${objective.kind === 'gathering' ? ` · ${objective.defeated}/${GAME.field.guards}` : ''}`,
      );
    if (clan.stage === 'final') {
      const finale = run.finalStand;
      const chapter = ['Gather the households', 'Hold the approaches', 'Carry the living'][
        finalChapter(run)
      ];
      this.text(
        'boss-stage',
        `THE SKYBREAKER · ${chapter}${finale?.phase === 'warning' ? ' · ATTACK IN ' + finale.remaining.toFixed(1) + 's' : finale?.phase === 'recovery' ? ' · VULNERABLE +50%' : ''}`,
      );
      const pending = finale?.works.findIndex(
        (work, i) => !work.done && clan.stageTime >= GAME.finalStand.workUnlockAt[i]!,
      );
      if (pending !== undefined && pending >= 0) {
        const work = finale!.works[pending]!;
        this.text(
          'field-objective',
          `Optional: help work party ${pending + 1}. Stay by the marked workers, enemies clear, for ${GAME.finalStand.workSeconds}s (${work.progress.toFixed(1)}s). Each party opens the passage ${GAME.finalStand.workBonus}s sooner.`,
        );
        this.get('field-objective').hidden = false;
      }
    }
    const region = currentLocation(run);
    if (
      snapshot.saves?.message.includes('complete') ||
      snapshot.saves?.message === 'Expedition saved.'
    )
      this.get('save-alert').hidden = true;
    this.text('timer', formatTime(run.elapsed));
    this.text('level', run.level.toString().padStart(2, '0'));
    this.text('kills', run.kills);
    this.text('clan-bearing', clanBearing);
    this.number(
      'health',
      Math.ceil(run.health),
      `${Math.ceil(run.health)} / ${run.stats.maxHealth}`,
    );
    this.meter('health-fill', (run.health / run.stats.maxHealth) * 100);
    this.get('health-fill').classList.toggle('low', run.health < run.stats.maxHealth * 0.3);
    this.meter('xp-fill', (run.xp / run.nextLevelXp) * 100);
    this.meter('dash-charge', dashReady * 100);
    const dash = this.get('dash');
    const dashAvailable = khanActive && dashReady >= 1;
    (dash as HTMLButtonElement).disabled = run.phase !== 'playing' || !khanActive;
    if (dashAvailable && dash.dataset.ready === 'false')
      this.motion.notice(dash.querySelector<HTMLElement>('.dash-symbol')!);
    dash.dataset.ready = String(dashAvailable);
    this.text(
      'dash-label',
      !khanActive
        ? 'CHOOSING A KHAN'
        : dashReady >= 1
          ? 'SPACE / READY'
          : `RECHARGING ${((1 - dashReady) * dashCooldown).toFixed(1)}s`,
    );
    this.text('research-points', run.pendingUpgrades);
    this.get('research').classList.toggle('has-points', run.pendingUpgrades > 0);
    this.get('research').setAttribute(
      'aria-label',
      `Open patron tech tree, ${run.pendingUpgrades} knowledge points`,
    );
    this.text(
      'momentum',
      run.combat.ready
        ? 'CHARGED VOLLEY READY'
        : `MOMENTUM ${Math.round(clan.momentum * 100)}% · CHARGE ${Math.round((run.combat.rideSeconds / GAME.mounted.chargeSeconds) * 100)}%`,
    );
    for (const id of ['population', 'herd', 'food', 'materials', 'spirit'] as const)
      this.number(id, Math.floor(clan[id]));
    this.get('food').classList.toggle('danger', clan.food < 15);
    this.text('doctrine', clanDoctrine(run));
    this.text('riders', riderCount(run));
    this.text('workers', `${assignedWorkers(run)} / ${clan.population}`);
    this.text('power', Math.round(run.stats.damage));
    this.number(
      'integrity',
      Math.ceil(clan.integrity),
      `${Math.ceil(clan.integrity)}%${import.meta.env.DEV && snapshot.developerConsole?.clanInvincible ? ' · INVINCIBLE' : ''}`,
    );
    this.meter('integrity-fill', clan.integrity);
    this.text('pasture', `${Math.ceil(clan.pasture)}%`);
    this.meter('pasture-fill', clan.pasture);
    this.text('threat', `${Math.round(clan.threat)}%`);
    this.meter('threat-fill', clan.threat);
    this.text('location', region.short);
    const act = storyAct(clan.region);
    this.text('act-heading', `ACT ${act.number === 1 ? 'I' : 'II'} · ${act.title.toUpperCase()}`);
    this.text('region-count', `${String(clan.region + 1).padStart(2, '0')} / 04`);
    this.text(
      'camp-age',
      clan.stage === 'migration' ? 'ON THE MOVE' : `DAY ${1 + Math.floor(clan.stageTime / 30)}`,
    );
    this.text(
      'stage-label',
      clan.stage === 'migration'
        ? 'THE GREAT FLIGHT'
        : clan.stage === 'final'
          ? 'THE LAST STAND'
          : 'ENCAMPMENT',
    );
    this.text(
      'objective',
      clan.stage === 'migration'
        ? `Escort the caravan to ${arrivalLocation(run).name}.`
        : clan.stage === 'final'
          ? 'Guard the families clearing the mountain passage.'
          : 'Grow the camp. Keep your people alive.',
    );
    this.get('migration-progress').hidden = clan.stage === 'camp';
    const progress = clan.stage === 'final' ? passageProgress(run) : clan.migrationProgress;
    this.text('progress-label', clan.stage === 'final' ? 'Passage opens' : 'Crossing');
    this.text('crossing', `${Math.min(Math.round(progress * 100), 100)}%`);
    this.meter('crossing-fill', progress * 100);
    this.text(
      'migration-hint',
      clan.stage === 'migration'
        ? 'Guard the wagons on the road east.'
        : clan.stage === 'final'
          ? `${formatTime(Math.max(0, GAME.clan.finalDuration - clan.stageTime - passageBonus(run)))} until the passage opens.`
          : canMigrate(run)
            ? 'The roads are open. Pack up with M.'
            : `Routes open in ${Math.ceil(GAME.clan.minimumCamp - clan.stageTime)}s. Build up the camp with B.`,
    );
    if (this.get('formation-name').textContent !== FORMATIONS[clan.formation].title) {
      this.text('formation-name', FORMATIONS[clan.formation].title);
      this.motion.notice(this.get('formation').querySelector<HTMLElement>('.command-icon')!);
    }
    (this.get('build') as HTMLButtonElement).disabled =
      run.phase !== 'playing' || clan.stage === 'migration';
    const migrate = this.get('migrate') as HTMLButtonElement;
    const routeAvailable = canMigrate(run);
    if (routeAvailable && migrate.dataset.available === 'false')
      this.motion.notice(migrate.querySelector<HTMLElement>('.command-icon')!);
    migrate.dataset.available = String(routeAvailable);
    migrate.disabled = run.phase !== 'playing' || !routeAvailable;
    (this.get('formation') as HTMLButtonElement).disabled =
      run.phase !== 'playing' || availableFormations(run).length < 2;
    this.get('synergy').hidden = !burningTempest(run);
    this.get('boss-bar').hidden = bossHealth === undefined;
    if (bossHealth !== undefined) this.meter('boss-fill', bossHealth * 100);
    this.text(
      'blessing-count',
      Object.values(run.upgrades).reduce((sum, stacks) => sum + stacks, 0),
    );
    this.text('best', best > 0 ? formatTime(best) : '— — : — —');
    this.text('clan-message', clan.message);
    this.layoutGuidance();
    const reaction = currentReaction(run);
    this.get('companion-reaction').hidden = !reaction;
    this.text(
      'companion-reaction',
      reaction?.line ? `${COMPANIONS[reaction.line.speaker].name}: “${reaction.line.text}”` : '',
    );
    if (
      clan.message !== this.lastMessage ||
      (reaction && reaction.sequence !== this.lastReaction)
    ) {
      this.lastMessage = clan.message;
      if (reaction) this.lastReaction = reaction.sequence;
      this.showMessage();
    }
  }

  /** Narrow previews stack variable-height status text before guidance, leaving actions clear. */
  private layoutGuidance(): void {
    const guide = this.get('field-guide');
    if (this.root.clientWidth > 600) {
      this.get('successor-choice').style.removeProperty('top');
      this.get('successor-choice').style.removeProperty('bottom');
      guide.style.removeProperty('top');
      guide.style.removeProperty('max-height');
      guide.style.removeProperty('overflow-y');
      return;
    }
    const choice = this.get('successor-choice');
    if (!choice.hidden) {
      choice.style.top = `${this.get('objective').closest<HTMLElement>('.objective-hud')!.getBoundingClientRect().bottom + 12}px`;
      choice.style.bottom = 'auto';
    } else {
      choice.style.removeProperty('top');
      choice.style.removeProperty('bottom');
    }
    if (guide.hidden) return;
    const objective = this.get('objective').closest<HTMLElement>('.objective-hud')!;
    const top = Math.max(332, objective.getBoundingClientRect().bottom + 12);
    const bottom =
      Math.min(
        this.get('research').getBoundingClientRect().top,
        this.get('dash').getBoundingClientRect().top,
      ) - 12;
    guide.style.top = `${top}px`;
    guide.style.maxHeight = `${Math.max(48, bottom - top)}px`;
    guide.style.overflowY = 'auto';
  }

  private showMessage(): void {
    this.get('chronicle-toast').classList.add('visible');
    window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(
      () => this.get('chronicle-toast').classList.remove('visible'),
      7000,
    );
  }

  private updateDeveloperConsole(snapshot: HudSnapshot): void {
    if (!import.meta.env.DEV) return;
    const tools = snapshot.developerConsole;
    const output = this.overlay.querySelector<HTMLElement>('[data-developer-output]');
    if (!tools || !output || tools.revision === this.developerRevision) return;
    this.developerRevision = tools.revision;
    const ids = new Set(tools.log.map((entry) => String(entry.id)));
    for (const child of [...output.children])
      if (!ids.has((child as HTMLElement).dataset.consoleEntry!)) child.remove();
    const existing = new Set(
      [...output.children].map((child) => (child as HTMLElement).dataset.consoleEntry),
    );
    for (const entry of tools.log) {
      if (existing.has(String(entry.id))) continue;
      const line = document.createElement('p');
      line.dataset.consoleEntry = String(entry.id);
      line.dataset.kind = entry.kind;
      line.textContent = entry.kind === 'command' ? `> ${entry.text}` : entry.text;
      output.append(line);
    }
    output.scrollTop = output.scrollHeight;
    const toggle = this.overlay.querySelector<HTMLButtonElement>(
      '[data-action="developer-invincible"]',
    )!;
    toggle.textContent = `Khan invincibility: ${tools.invincible ? 'On' : 'Off'}`;
    toggle.setAttribute('aria-pressed', String(tools.invincible));
    toggle.disabled = !tools.canCheat;
    const clanToggle = this.overlay.querySelector<HTMLButtonElement>(
      '[data-action="developer-clan-invincible"]',
    )!;
    clanToggle.textContent = `Clan invincibility: ${tools.clanInvincible ? 'On' : 'Off'}`;
    clanToggle.setAttribute('aria-pressed', String(tools.clanInvincible));
    clanToggle.disabled = !tools.canCheat;
  }

  destroy(): void {
    window.clearTimeout(this.toastTimer);
    this.motion.destroy();
  }

  private renderPhase(snapshot: HudSnapshot): void {
    const { run } = snapshot;
    const preserveTree =
      run.phase === this.phase &&
      ['upgrade', 'building', 'route', 'saves', 'traditions'].includes(run.phase);
    const scroll = preserveTree
      ? this.overlay.querySelector(
          '.tree-scroll, .migration-scroll, .starting-traditions .panel-body',
        )?.scrollTop
      : undefined;
    const scrolls = preserveTree
      ? [...this.overlay.querySelectorAll<HTMLElement>('[data-scroll-key]')].map((el) => ({
          key: el.dataset.scrollKey,
          top: el.scrollTop,
          left: el.scrollLeft,
        }))
      : [];
    const disclosures = preserveTree
      ? [...this.overlay.querySelectorAll<HTMLDetailsElement>('details[data-disclosure-key]')].map(
          (el) => ({ key: el.dataset.disclosureKey, open: el.open }),
        )
      : [];
    const active = document.activeElement as HTMLElement | null;
    const focusKey = preserveTree ? active?.dataset.focusKey : undefined;
    const selection = active instanceof HTMLInputElement ? active.selectionStart : null;
    this.overlay.dataset.entry =
      run.phase !== this.phase || !this.overlay.firstElementChild ? 'phase' : 'content';
    if (run.phase !== this.phase) this.motion.cancel();
    if (
      run.phase === 'playing' &&
      this.phase !== 'playing' &&
      (this.phase === 'ready' || this.phase === 'intro' || currentReaction(run))
    )
      this.showMessage();
    this.phase = run.phase;
    this.root.dataset.phase = run.phase;
    this.get('game-hud').inert = run.phase !== 'playing';
    this.get('game-hud').setAttribute(
      'aria-hidden',
      String(
        [
          'intro',
          'ready',
          'settings',
          'help',
          'story',
          'epilogue',
          'story-log',
          'developer',
        ].includes(run.phase),
      ),
    );
    this.get('menu-record').hidden = !['ready', 'paused', 'dead', 'won'].includes(run.phase);
    // Transfer focus before hiding or removing the focused menu control.
    if (run.phase === 'playing') this.get('arena-wrap').focus({ preventScroll: true });
    this.overlay.hidden = run.phase === 'playing';
    this.overlay.className = `overlay ${run.phase === 'console' ? 'console-screen' : run.phase === 'building' ? 'planning camp-planning' : run.phase === 'intro' ? 'intro-screen' : run.phase === 'ready' ? 'ready-screen' : ['route', 'journal', 'upgrade', 'settings', 'help', 'story', 'epilogue', 'story-log', 'developer', 'saves', 'traditions'].includes(run.phase) ? 'planning' : 'pause-screen'}`;
    if (run.phase === 'intro') this.overlay.setAttribute('aria-describedby', 'intro-caption');
    else this.overlay.removeAttribute('aria-describedby');
    const labels: Record<RunPhase, string> = {
      intro: `CHAPTER ${snapshot.introSlide + 1} OF ${INTRO_SLIDES.length}. ${INTRO_SLIDES[snapshot.introSlide]!.title} ${INTRO_SLIDES[snapshot.introSlide]!.text}`,
      story: run.story.active?.title ?? 'THE CLAN GATHERS',
      epilogue: 'A PLACE BESIDE THE FIRE',
      'story-log': 'OUR REMEMBERED ROAD',
      ready: 'THE SKY IS WAITING',
      traditions: 'STARTING CLAN TRADITION',
      playing: 'THE CLAN ENDURES',
      paused: 'EXPEDITION PAUSED',
      saves: 'SAVED EXPEDITIONS',
      upgrade: 'PATRON TECH TREE',
      building: 'DEVELOPING THE CAMP',
      route: 'CHOOSING A ROUTE',
      journal: 'READING THE CLAN CHRONICLE',
      settings: 'SETTINGS',
      help: 'HOW TO PLAY',
      developer: import.meta.env.DEV ? 'DEVELOPER LEVEL SELECTOR' : '',
      console: import.meta.env.DEV ? 'DEVELOPER CONSOLE' : '',
      dead: 'THE BANNERS FALL',
      won: 'THE CLAN IS SAVED',
    };
    this.text('run-status', labels[run.phase]);
    if (run.phase === 'playing') {
      this.overlay.replaceChildren();
      return;
    }
    const quit = this.platform.desktop
      ? '<button class="menu-button menu-quit" data-action="quit">Quit game</button>'
      : '';
    const latestSave = [...this.platform.saves]
      .filter((s) => ['ready', 'recovered'].includes(s.status))
      .sort((a, b) => (b.savedAt ?? 0) - (a.savedAt ?? 0))[0];
    const savedMenu = '<button class="menu-button" data-action="saves">Saved expeditions</button>';
    const developer = import.meta.env.DEV
      ? '<button class="menu-button" data-action="developer">Developer mode <kbd>F8</kbd></button>'
      : '';
    if (run.phase === 'intro') this.overlay.innerHTML = introMenu(snapshot.introSlide);
    else if (run.phase === 'traditions') this.overlay.innerHTML = startingTraditionMenu(run);
    else if (run.phase === 'saves')
      this.overlay.innerHTML = saveMenu(snapshot, this.saveConfirmation);
    else if (run.phase === 'story') this.overlay.innerHTML = storyMenu(run);
    else if (run.phase === 'epilogue') this.overlay.innerHTML = epilogueMenu(run);
    else if (run.phase === 'story-log') this.overlay.innerHTML = storyLogMenu(run);
    else if (run.phase === 'ready') {
      this.overlay.innerHTML = `<section class="title-menu"><div class="title-emblem">${emblem}</div><p class="eyebrow">WHEN HEAVEN WENT SILENT</p><h1 id="overlay-title"><span class="title-prefix">Hordes of the</span> <em>Fallen Sky</em></h1><p class="title-tagline">You don’t build a city.<br>You build a people.</p><nav class="main-menu" aria-label="Main menu">${latestSave ? `<button class="menu-button featured" data-action="continue-expedition" data-slot="${latestSave.slot}" data-primary>CONTINUE EXPEDITION <span>→</span></button>` : ''}<button class="menu-button featured" data-action="begin" data-primary>NEW GAME <span>→</span></button>${this.platform.profile.camp ? '<button class="menu-button" data-action="continue-camp" title="Take your saved camp and stores into a new expedition. Patron research and battle start over.">Continue clan camp</button>' : ''}${savedMenu}<button class="menu-button" data-action="starting-traditions">Starting tradition: ${startingTradition(run.startingTradition).title}</button><button class="menu-button" data-action="intro">Replay introduction</button><button class="menu-button" data-action="help">How to play</button><button class="menu-button" data-action="settings">Settings</button>${developer}${quit}</nav><button class="story-preference" data-action="story-mode" aria-pressed="${run.story.enabled}">Camp scenes: ${run.story.enabled ? 'On' : 'Off'}</button>${this.scene.softwareTerrainNotice ? '<p class="settings-note" role="status">Software graphics detected. Terrain uses Flat 2D for smoother play. You can choose Angled 3D in Settings. <button class="secondary-button" data-action="dismiss-terrain-notice">Dismiss terrain notice</button></p>' : ''}<p class="title-caption">Two acts. Four pastures. One people to carry through.</p></section>`;
    } else if (run.phase === 'paused') {
      this.overlay.innerHTML = `<section class="pause-menu"><p class="eyebrow">EXPEDITION PAUSED</p><h2 id="overlay-title">A quiet moment.</h2><p class="panel-intro">The steppe holds still until you return.</p><nav class="main-menu" aria-label="Pause menu"><button class="menu-button featured" data-action="resume" data-primary>RETURN TO THE STEPPE <span>→</span></button><button class="menu-button" data-action="research">Patron tech tree</button><button class="menu-button" data-action="restart">Start a new run</button>${savedMenu}<button class="menu-button" data-action="save-title">${snapshot.developerRun ? 'Return to title' : 'Save and return to title'}</button><button class="menu-button" data-action="story-log">Our remembered road</button><button class="menu-button" data-action="settings">Settings</button><button class="menu-button" data-action="help">How to play</button>${developer}${quit}</nav></section>`;
    } else if (run.phase === 'building')
      this.overlay.innerHTML = buildingMenu(run, this.treeView(), this.campSelection);
    else if (run.phase === 'route') {
      if (!availableDestinations(run).some((location) => location.id === this.destinationSelection))
        this.destinationSelection = arrivalLocation(run).id;
      this.overlay.innerHTML = routeMenu(run, this.destinationSelection);
    } else if (run.phase === 'upgrade') this.overlay.innerHTML = researchMenu(run, this.treeView());
    else if (run.phase === 'journal') this.overlay.innerHTML = journalMenu(run, this.journalTab);
    else if (run.phase === 'settings')
      this.overlay.innerHTML = settingsMenu(
        this.platform.profile.muted,
        this.fullscreen,
        normalizeAudioMix(this.platform.profile.audioMix),
        normalizeVisualSettings(this.platform.profile.visualSettings),
        this.scene.terrainRenderer,
      );
    else if (run.phase === 'help') this.overlay.innerHTML = helpMenu(run.guidance.enabled);
    else if (import.meta.env.DEV && run.phase === 'developer')
      this.overlay.innerHTML = developerMenu(snapshot.developerConsole);
    else if (import.meta.env.DEV && run.phase === 'console')
      this.overlay.innerHTML = developerConsole(snapshot.developerConsole);
    else {
      const won = run.phase === 'won';
      this.overlay.innerHTML = `<section class="end-menu"><div class="title-emblem">${emblem}</div><p class="eyebrow">${won ? 'A PEOPLE, STILL ALIVE' : 'THE STEPPE WILL REMEMBER'}</p><h2 id="overlay-title">${won ? 'A sky worth saving.' : 'The banners fall.'}</h2><p class="panel-intro">${won ? `${run.clan.population} ${run.clan.population === 1 ? 'person' : 'people'} and ${run.clan.herd} ${run.clan.herd === 1 ? 'animal' : 'animals'} reach the mountain passage.<br>Your civilization lives to see another sky.` : defeatAccountContent(run)}</p><div class="end-stats"><div><strong>${formatTime(run.elapsed)}</strong><span>JOURNEY</span></div><div><strong>${run.clan.population}</strong><span>PEOPLE</span></div><div><strong>${run.clan.region + 1}/4</strong><span>PASTURES</span></div></div>${expeditionMetricsContent(run)}<nav class="main-menu"><button class="menu-button featured" data-action="restart" data-primary>RAISE THE BANNERS AGAIN <span>→</span></button>${savedMenu}${won ? '<button class="menu-button" data-action="epilogue">Read the epilogue</button>' : ''}<button class="menu-button" data-action="story-log">Our remembered road</button>${quit}</nav></section>`;
    }
    if (import.meta.env.DEV && ['developer', 'console'].includes(run.phase)) {
      this.developerRevision = -1;
      this.commandHistoryOffset = 0;
      this.updateDeveloperConsole(snapshot);
      if (run.phase === 'console') {
        this.overlay.querySelector<HTMLInputElement>('[data-developer-command-input]')!.focus();
        return;
      }
    }
    if (scroll !== undefined)
      this.overlay
        .querySelector('.tree-scroll, .migration-scroll, .starting-traditions .panel-body')
        ?.scrollTo({ top: scroll });
    for (const saved of scrolls) {
      const el = [...this.overlay.querySelectorAll<HTMLElement>('[data-scroll-key]')].find(
        (entry) => entry.dataset.scrollKey === saved.key,
      );
      el?.scrollTo({ top: saved.top, left: saved.left });
    }
    for (const saved of disclosures) {
      const detail = [
        ...this.overlay.querySelectorAll<HTMLDetailsElement>('details[data-disclosure-key]'),
      ].find((el) => el.dataset.disclosureKey === saved.key);
      if (detail) detail.open = saved.open;
    }
    if (focusKey) {
      const target = [...this.overlay.querySelectorAll<HTMLElement>('[data-focus-key]')].find(
        (entry) => entry.dataset.focusKey === focusKey,
      );
      if (target) {
        const popup =
          run.phase === 'building' && this.treeView().campPopup
            ? this.overlay.querySelector<HTMLElement>('.camp-popup')
            : null;
        if (popup && !(target instanceof HTMLInputElement) && !popup.contains(target)) {
          popup.querySelector<HTMLElement>('[data-camp-dismiss]')?.focus({ preventScroll: true });
          return;
        }
        const fallback =
          target instanceof HTMLButtonElement && target.disabled
            ? (popup?.querySelector<HTMLElement>('[data-camp-dismiss]') ??
              this.overlay.querySelector<HTMLElement>('.tree-node[aria-pressed="true"]'))
            : target;
        fallback?.focus({ preventScroll: true });
        if (target instanceof HTMLInputElement && selection !== null)
          target.setSelectionRange(selection, selection);
        return;
      }
    }
    this.overlay.scrollTop = 0;
    if (run.phase === 'building' && this.treeView().campPopup) {
      const preferred =
        this.overlay.querySelector<HTMLElement>('.camp-popup .tree-purchase:not(:disabled)') ??
        this.overlay.querySelector<HTMLElement>('.camp-popup [data-camp-dismiss]');
      if (preferred) {
        preferred.focus({ preventScroll: true });
        return;
      }
    }
    this.overlay
      .querySelector<HTMLButtonElement>(
        '[data-primary], [data-camp-site][aria-pressed="true"], [data-destination][aria-pressed="true"], [data-camp-encampment], .tree-node[aria-pressed="true"], [data-building]:not(:disabled), button[data-route], [role="tab"][aria-selected="true"], [data-action="sound"]',
      )
      ?.focus({ preventScroll: true });
    if (!this.overlay.contains(document.activeElement))
      this.overlay
        .querySelector<HTMLButtonElement>('button:not(:disabled)')
        ?.focus({ preventScroll: true });
  }

  private closeCampPopup(): boolean {
    if (this.phase !== 'building' || !this.lastSnapshot || !this.treeView().campPopup) return false;
    const focus =
      this.treeView().campTarget === 'building' && !this.lastSnapshot.run.clan.nomadicCamp
        ? `site-${this.campSelection}`
        : this.treeView().campFocus;
    Object.assign(this.treeView(), {
      campPopup: false,
      expanded: false,
      recipes: false,
      query: '',
    });
    this.renderPhase(this.lastSnapshot);
    const anchor = [...this.overlay.querySelectorAll<HTMLElement>('[data-focus-key]')].find(
      (el) => el.dataset.focusKey === focus,
    );
    (anchor ?? this.overlay.querySelector<HTMLElement>('[data-camp-encampment]'))?.focus({
      preventScroll: true,
    });
    return true;
  }

  private handleMenuClick(event: MouseEvent): void {
    const button = (event.target as Element).closest<HTMLButtonElement>('button');
    if (!button || button.disabled || button.getAttribute('aria-disabled') === 'true') return;
    const action = button.dataset.action;
    if (
      button.dataset.audioReference &&
      AUDIO_REFERENCE_CUES.includes(
        button.dataset.audioReference as (typeof AUDIO_REFERENCE_CUES)[number],
      )
    ) {
      this.scene.auditionAudio(button.dataset.audioReference as SoundKind);
      return;
    }
    if (
      action !== 'sound' &&
      !button.dataset.building &&
      !button.dataset.research &&
      !button.dataset.estateKind
    )
      this.scene.playInterfaceSound();
    if (
      button.dataset.nomadicPurchase &&
      NOMADIC_BUILDINGS.some((b) => b.id === button.dataset.nomadicPurchase)
    ) {
      this.treeView().campFocus = `nomadic-site-${button.dataset.nomadicPurchase}`;
      this.scene.improveNomadicCamp(
        button.dataset.nomadicPurchase as NomadicBuildingId,
        button.dataset.nomadicSlot === undefined ? undefined : Number(button.dataset.nomadicSlot),
      );
    } else if (
      button.dataset.nomadicSite &&
      this.lastSnapshot &&
      NOMADIC_BUILDINGS.some((b) => b.id === button.dataset.nomadicSite)
    ) {
      Object.assign(this.treeView(), {
        campPopup: true,
        campTarget: 'building',
        nomadicSelection: button.dataset.nomadicSite,
        campSlot:
          button.dataset.nomadicSlot === undefined ? undefined : Number(button.dataset.nomadicSlot),
        query: '',
        recipes: false,
        campFocus:
          this.lastSnapshot.run.clan.nomadicCamp &&
          (this.lastSnapshot.run.clan.nomadicCamp.slots.some(
            (slot) => slot?.id === button.dataset.nomadicSite,
          ) ||
            button.dataset.campSite)
            ? `nomadic-site-${button.dataset.nomadicSite}`
            : button.dataset.nomadicSlot === undefined
              ? 'tree-search'
              : `plot-${button.dataset.nomadicSlot}`,
      });
      this.renderPhase(this.lastSnapshot);
    } else if (button.hasAttribute('data-camp-dismiss')) {
      this.closeCampPopup();
    } else if (action === 'exit-camp') {
      this.scene.closeCamp();
    } else if (button.hasAttribute('data-camp-encampment') && this.lastSnapshot) {
      Object.assign(this.treeView(), {
        campPopup: true,
        campTarget: 'encampment',
        node: undefined,
        recipes: false,
        expanded: false,
        campFocus: 'camp-encampment',
      });
      this.renderPhase(this.lastSnapshot);
    } else if (button.dataset.campInternal && this.lastSnapshot) {
      Object.assign(this.treeView(), {
        campPopup: true,
        campTarget: 'internal',
        campInternal: button.dataset.campInternal,
        node: undefined,
        recipes: false,
        expanded: false,
        campFocus: button.dataset.focusKey,
      });
      this.renderPhase(this.lastSnapshot);
    } else if (button.dataset.campSlot !== undefined && this.lastSnapshot) {
      Object.assign(this.treeView(), {
        campPopup: true,
        campTarget: 'slot',
        campSlot: Number(button.dataset.campSlot),
        node: undefined,
        recipes: false,
        expanded: false,
        campFocus: button.dataset.focusKey,
      });
      this.renderPhase(this.lastSnapshot);
    } else if (button.hasAttribute('data-camp-economy') && this.lastSnapshot) {
      Object.assign(this.treeView(), {
        campPopup: true,
        campTarget: 'economy',
        expanded: false,
        recipes: false,
        campFocus: button.dataset.focusKey,
      });
      this.renderPhase(this.lastSnapshot);
    } else if (button.hasAttribute('data-camp-foldout') && this.lastSnapshot) {
      this.treeView().expanded = !this.treeView().expanded;
      this.renderPhase(this.lastSnapshot);
    } else if (
      button.dataset.estateKind === 'encampment' ||
      button.dataset.estateKind === 'internal'
    ) {
      this.treeView().node = undefined;
      this.scene.improveEstate(
        button.dataset.estateKind,
        button.dataset.estateId!,
        Number(button.dataset.estateRank),
      );
    } else if (button.dataset.progressionJump && this.lastSnapshot) {
      const phase = button.dataset.progressionJump === 'camp' ? 'building' : 'upgrade';
      const view = this.treeView(phase);
      if (
        phase === 'building' &&
        this.lastSnapshot.run.clan.nomadicCamp &&
        NOMADIC_BUILDINGS.some((b) => b.id === button.dataset.branch)
      ) {
        view.nomadicSelection = button.dataset.branch;
        view.campFocus = `nomadic-site-${button.dataset.branch}`;
      }
      Object.assign(view, {
        branch: button.dataset.branch,
        node: button.dataset.targetNode,
        category: 'all',
        query: '',
        overview: false,
        recipes: false,
      });
      if (phase === 'building') {
        this.campSelection = button.dataset.branch as BuildingId;
        view.campSlot = undefined;
        view.expanded = true;
        view.campPopup = true;
        view.campTarget = 'building';
      }
      if (this.phase === phase) this.renderPhase(this.lastSnapshot);
      else this.scene.switchProgression(phase);
      this.overlay
        .querySelector<HTMLButtonElement>(
          '.tree-node[aria-pressed="true"], .camp-path-node[aria-pressed="true"]',
        )
        ?.focus();
    } else if (button.dataset.treeSelect && this.lastSnapshot) {
      this.treeView().node = button.dataset.treeSelect;
      this.renderPhase(this.lastSnapshot);
      this.overlay.querySelector('[data-scroll-key="node-details"]')?.scrollTo({ top: 0 });
    } else if (button.dataset.treeBranchSelect && this.lastSnapshot) {
      Object.assign(this.treeView(), {
        branch: button.dataset.treeBranchSelect,
        node: undefined,
        overview: false,
        recipes: false,
      });
      this.renderPhase(this.lastSnapshot);
    } else if (button.hasAttribute('data-tree-overview') && this.lastSnapshot) {
      Object.assign(this.treeView(), { overview: true, recipes: false });
      this.renderPhase(this.lastSnapshot);
    } else if (button.hasAttribute('data-tree-recipes') && this.lastSnapshot) {
      Object.assign(this.treeView(), {
        recipes: !this.treeView().recipes,
        overview: false,
        ...(this.phase === 'building'
          ? {
              campPopup: true,
              campTarget: 'building',
              expanded: true,
              campFocus: button.dataset.focusKey,
            }
          : {}),
      });
      this.renderPhase(this.lastSnapshot);
    } else if (button.hasAttribute('data-camp-expand') && this.lastSnapshot) {
      this.treeView().expanded = !this.treeView().expanded;
      this.renderPhase(this.lastSnapshot);
    } else if (button.dataset.campSite && this.lastSnapshot && this.phase === 'building') {
      this.campSelection = button.dataset.campSite as BuildingId;
      this.treeView().query = '';
      this.treeView().node = undefined;
      Object.assign(this.treeView(), {
        campPopup: true,
        campTarget: 'building',
        expanded: false,
        recipes: false,
        campSlot:
          button.dataset.campPlot === undefined ? undefined : Number(button.dataset.campPlot),
        campFocus: button.dataset.focusKey,
      });
      this.renderPhase(this.lastSnapshot);
    } else if (button.dataset.destination && this.lastSnapshot && this.phase === 'route') {
      this.destinationSelection = button.dataset.destination;
      this.renderPhase(this.lastSnapshot);
    } else if (button.dataset.treeFilter && this.lastSnapshot) {
      this.treeView().category = button.dataset.treeFilter;
      this.treeView().query = '';
      this.renderPhase(this.lastSnapshot);
    } else if (button.dataset.storyChoice) this.scene.chooseStory(button.dataset.storyChoice);
    else if (action === 'story-skip') this.scene.chooseStory();
    else if (action === 'story-mode') this.scene.toggleStoryMode();
    else if (action === 'story-log') this.scene.openStoryLog();
    else if (action === 'epilogue') this.scene.showEpilogue();
    else if (action === 'epilogue-close') this.scene.closeEpilogue();
    else if (action === 'intro') this.scene.replayIntro();
    else if (action === 'intro-next') this.scene.advanceIntro(1);
    else if (action === 'intro-back') this.scene.advanceIntro(-1);
    else if (action === 'intro-skip') this.scene.skipIntro();
    else if (import.meta.env.DEV && action === 'developer') this.scene.toggleDeveloperMenu();
    else if (import.meta.env.DEV && action === 'developer-invincible')
      this.scene.executeDeveloperCommand('invincible');
    else if (import.meta.env.DEV && action === 'developer-clan-invincible')
      this.scene.executeDeveloperCommand('clan-invincible');
    else if (import.meta.env.DEV && button.dataset.developerLevel)
      this.scene.startDeveloperLevel(button.dataset.developerLevel);
    else if (action === 'starting-traditions') this.scene.openStartingTraditions();
    else if (button.dataset.startingTradition)
      this.scene.selectStartingTradition(button.dataset.startingTradition);
    else if (action === 'begin') this.scene.startRun();
    else if (action === 'saves') {
      this.saveConfirmation = undefined;
      this.scene.openSaves();
    } else if (action === 'continue-expedition' && isSaveSlot(button.dataset.slot))
      void this.scene.loadSavedExpedition(button.dataset.slot);
    else if (action === 'save-title') void this.scene.saveAndReturnToTitle();
    else if (button.dataset.saveAction && isSaveSlot(button.dataset.slot)) {
      const saveAction = button.dataset.saveAction as SaveConfirmation['action'];
      const occupied = this.platform.saves.some((s) => s.slot === button.dataset.slot);
      if (
        saveAction === 'delete' ||
        (saveAction === 'save' && occupied) ||
        (saveAction === 'load' && this.scene.canSaveExpedition)
      ) {
        this.saveConfirmation = { action: saveAction, slot: button.dataset.slot };
        this.renderPhase(this.lastSnapshot!);
        this.overlay.querySelector<HTMLElement>('[data-save-confirm]')?.focus();
      } else if (saveAction === 'save') void this.scene.saveExpedition(button.dataset.slot);
      else void this.scene.loadSavedExpedition(button.dataset.slot);
    } else if ('saveConfirm' in button.dataset && this.saveConfirmation) {
      const { action: operation, slot } = this.saveConfirmation;
      this.saveConfirmation = undefined;
      if (operation === 'save') void this.scene.saveExpedition(slot);
      else if (operation === 'load') void this.scene.loadSavedExpedition(slot);
      else void this.scene.deleteSavedExpedition(slot);
    } else if ('saveCancel' in button.dataset) {
      this.saveConfirmation = undefined;
      this.renderPhase(this.lastSnapshot!);
    } else if (action === 'continue-camp') this.scene.continueCamp();
    else if (action === 'guidance') this.scene.toggleGuidance();
    else if (action === 'resume') this.scene.togglePause();
    else if (action === 'restart') this.scene.restart();
    else if (action === 'settings' || action === 'help') this.scene.openUtilityMenu(action);
    else if (action === 'back') this.scene.closePlanning();
    else if (action === 'quit') void this.platform.desktop?.quit();
    else if (action === 'research') this.scene.openResearch();
    else if (action === 'build') this.scene.openBuildings();
    else if (action === 'routes') this.scene.openRoutes();
    else if (action === 'dismiss-terrain-notice') this.scene.dismissSoftwareTerrainNotice();
    else if (action === 'sound') {
      this.scene.toggleAudio();
      this.updateSettingsControls();
    } else if (
      button.dataset.visualSetting === 'projectileContrast' ||
      button.dataset.visualSetting === 'effectDensity' ||
      button.dataset.visualSetting === 'terrainRenderer'
    ) {
      this.scene.setVisualSetting(button.dataset.visualSetting);
      this.updateSettingsControls();
    } else if (action === 'fullscreen') {
      if (this.platform.desktop) void this.platform.desktop.toggleFullscreen();
      else if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
      else
        void this.get('arena-wrap')
          .parentElement!.requestFullscreen()
          .catch(() => undefined);
    } else if (button.dataset.research)
      this.scene.research(button.dataset.research, Number(button.dataset.rank));
    else if (button.dataset.building) {
      this.treeView().node = undefined;
      this.scene.construct(
        button.dataset.building as BuildingId,
        button.dataset.path,
        button.dataset.slot === undefined ? undefined : Number(button.dataset.slot),
      );
    } else if (button.dataset.route)
      this.scene.chooseRoute(button.dataset.route, this.destinationSelection);
    else if (button.dataset.tab) this.selectJournalTab(button.dataset.tab as JournalTab);
  }

  private updateSettingsControls(): void {
    const visuals = normalizeVisualSettings(this.platform.profile.visualSettings);
    const terrain = this.overlay.querySelector<HTMLButtonElement>(
      '[data-visual-setting="terrainRenderer"]',
    );
    if (terrain) {
      terrain.textContent = this.scene.terrainRenderer === '3d' ? 'Angled 3D' : 'Flat 2D';
      terrain.setAttribute('aria-pressed', String(this.scene.terrainRenderer === '3d'));
    }
    const contrast = this.overlay.querySelector<HTMLButtonElement>(
      '[data-visual-setting="projectileContrast"]',
    );
    if (contrast) {
      contrast.textContent = visuals.projectileContrast === 'high' ? 'High' : 'Standard';
      contrast.setAttribute('aria-pressed', String(visuals.projectileContrast === 'high'));
    }
    const density = this.overlay.querySelector<HTMLButtonElement>(
      '[data-visual-setting="effectDensity"]',
    );
    if (density) density.textContent = visuals.effectDensity;

    const sound = this.overlay.querySelector<HTMLButtonElement>('[data-action="sound"]');
    if (sound) {
      const muted = this.platform.profile.muted;
      sound.textContent = muted ? 'Muted' : 'Enabled';
      sound.setAttribute('aria-label', muted ? 'Unmute sound' : 'Mute sound');
      sound.setAttribute('aria-pressed', String(!muted));
    }
    const display = this.overlay.querySelector<HTMLButtonElement>('[data-action="fullscreen"]');
    if (display) {
      display.textContent = this.fullscreen ? 'Fullscreen' : 'Windowed';
      display.setAttribute('aria-label', this.fullscreen ? 'Exit fullscreen' : 'Enter fullscreen');
      display.setAttribute('aria-pressed', String(this.fullscreen));
    }
  }

  private selectJournalTab(tab: JournalTab): void {
    if (this.phase !== 'journal' || !this.lastSnapshot) return;
    this.journalTab = tab;
    this.renderPhase(this.lastSnapshot);
    this.get(`tab-${tab}`).focus();
  }

  private menuButtons(): HTMLElement[] {
    const scope =
      this.phase === 'building' && this.treeView().campPopup
        ? (this.overlay.querySelector('.camp-popup') ?? this.overlay)
        : this.overlay;
    return [
      ...scope.querySelectorAll<HTMLElement>(
        'button:not(:disabled), summary, input:not(:disabled)',
      ),
    ].filter((el) => el.getClientRects().length > 0);
  }
  private handleMenuKey(event: KeyboardEvent): void {
    if (event.target instanceof HTMLInputElement && event.target.matches('[data-audio-channel]')) {
      const input = event.target;
      if (
        [
          'ArrowLeft',
          'ArrowDown',
          'ArrowRight',
          'ArrowUp',
          'PageDown',
          'PageUp',
          'Home',
          'End',
        ].includes(event.key)
      ) {
        event.preventDefault();
        event.stopPropagation();
        if (event.key === 'Home') input.value = input.min;
        else if (event.key === 'End') input.value = input.max;
        else if (['ArrowLeft', 'ArrowDown', 'PageDown'].includes(event.key))
          input.stepDown(event.key === 'PageDown' ? 10 : 1);
        else input.stepUp(event.key === 'PageUp' ? 10 : 1);
        input.dispatchEvent(new Event('input', { bubbles: true }));
        return;
      }
    }
    // Holding Confirm must not race through chapters or activate the next screen.
    if (event.repeat && ['Enter', ' '].includes(event.key)) {
      event.preventDefault();
      return;
    }
    if (
      import.meta.env.DEV &&
      ['developer', 'console'].includes(this.phase) &&
      event.target instanceof HTMLInputElement &&
      event.target.matches('[data-developer-command-input]') &&
      ['ArrowUp', 'ArrowDown'].includes(event.key)
    ) {
      event.preventDefault();
      event.stopPropagation();
      const history = this.lastSnapshot?.developerConsole?.history ?? [];
      if (!this.commandHistoryOffset) this.commandHistoryDraft = event.target.value;
      this.commandHistoryOffset = Math.max(
        0,
        Math.min(history.length, this.commandHistoryOffset + (event.key === 'ArrowUp' ? 1 : -1)),
      );
      event.target.value = this.commandHistoryOffset
        ? history[history.length - this.commandHistoryOffset]!
        : this.commandHistoryDraft;
      event.target.setSelectionRange(event.target.value.length, event.target.value.length);
      return;
    }
    if (this.phase === 'intro' && ['ArrowLeft', 'ArrowRight'].includes(event.key)) {
      event.preventDefault();
      event.stopPropagation();
      if (!event.repeat) this.scene.advanceIntro(event.key === 'ArrowRight' ? 1 : -1);
      return;
    }
    if (
      ['upgrade', 'building', 'route', 'developer'].includes(this.phase) &&
      ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key) &&
      !(event.target instanceof HTMLInputElement)
    ) {
      event.preventDefault();
      event.stopPropagation();
      if (!this.navigateGraph(event.key))
        this.navigateMenu(['ArrowLeft', 'ArrowUp'].includes(event.key) ? 'previous' : 'next');
      return;
    }
    const button = (event.target as Element).closest<HTMLButtonElement>('[role="tab"]');
    if (button && ['ArrowLeft', 'ArrowRight'].includes(event.key)) {
      event.preventDefault();
      event.stopPropagation();
      const tabs: JournalTab[] = ['journey', 'clan', 'traditions', 'story'];
      this.selectJournalTab(
        tabs[
          (tabs.indexOf(this.journalTab) + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) %
            tabs.length
        ]!,
      );
      return;
    }
    if (event.key !== 'Tab' || this.phase === 'playing') return;
    const buttons = this.menuButtons().filter((entry) => entry.tabIndex >= 0);
    const first = buttons[0];
    const last = buttons.at(-1);
    if (
      this.phase === 'building' &&
      this.treeView().campPopup &&
      !buttons.some((entry) => entry === document.activeElement)
    ) {
      event.preventDefault();
      (event.shiftKey ? last : first)?.focus();
    } else if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  }
  private navigateMenu(action: 'next' | 'previous' | 'confirm'): void {
    const buttons = this.menuButtons();
    if (!buttons.length) return;
    const index = Math.max(
      0,
      buttons.findIndex((button) => button === document.activeElement),
    );
    if (action === 'confirm') buttons[index]?.click();
    else {
      const target =
        buttons[(index + (action === 'next' ? 1 : -1) + buttons.length) % buttons.length];
      target?.focus();
      target?.scrollIntoView({ block: 'nearest' });
    }
  }

  /** Directional focus uses the graph's real edges, without buying a rank. Tab reaches the inspector. */
  private navigateGraph(key: string): boolean {
    const current = document.activeElement as HTMLButtonElement | null;
    if (!current?.matches('.tree-node')) return false;
    const graph = current.closest('.tree-graph')!;
    const nodes = [...graph.querySelectorAll<HTMLButtonElement>('.tree-node')];
    let choices: HTMLButtonElement[];
    if (key === 'ArrowUp' || key === 'ArrowDown') {
      const down = key === 'ArrowDown';
      const edges = [...graph.querySelectorAll<SVGPathElement>('.tree-connections path')];
      const ids = edges
        .filter((e) => (down ? e.dataset.edgeFrom : e.dataset.edgeTo) === current.dataset.node)
        .map((e) => (down ? e.dataset.edgeTo : e.dataset.edgeFrom));
      choices = nodes.filter((n) => ids.includes(n.dataset.node));
      choices.sort(
        (a, b) =>
          Math.abs(a.offsetLeft - current.offsetLeft) - Math.abs(b.offsetLeft - current.offsetLeft),
      );
    } else {
      const row = nodes
        .filter((n) => n.dataset.level === current.dataset.level)
        .sort((a, b) => a.offsetLeft - b.offsetLeft);
      const next = row.indexOf(current) + (key === 'ArrowRight' ? 1 : -1);
      choices = row[next] ? [row[next]!] : [];
    }
    const target = choices[0];
    if (target) {
      const id = target.dataset.node;
      target.click();
      const refreshed = [...this.overlay.querySelectorAll<HTMLButtonElement>('.tree-node')].find(
        (n) => n.dataset.node === id,
      );
      refreshed?.focus({ preventScroll: true });
      refreshed?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
    return true;
  }
}
