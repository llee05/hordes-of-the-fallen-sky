import { characterCreatorContent } from './creator/characterCreatorContent';
import { createRiderPreviewState, startRiderPreview } from './creator/riderPreview';
import { AUDIO_REFERENCE_CUES, type SoundKind } from '../game/audio/soundPalette';
import { GAME } from '../game/config';
import { AREA_ENCOUNTERS } from '../game/data/areaEncounters';
import { classDefinition } from '../game/data/classes';
import { FORMATIONS } from '../game/data/clan';
import { AREA_ENEMIES } from '../game/data/enemies';
import { FIELD_OBJECTIVES } from '../game/data/fieldObjectives';
import { NOMADIC_BUILDINGS } from '../game/data/nomadicCamp';
import { SUCCESSORS } from '../game/data/successors';
import type { ArenaScene } from '../game/scenes/ArenaScene';
import {
  assignedWorkers,
  availableFormations,
  burningTempest,
  canMigrate,
  clanDoctrine,
  riderCount,
} from '../game/state/clan';
import { economyForecast } from '../game/state/economy';
import { encounterPlan } from '../game/state/encounters';
import { clanWarning, currentGuidance } from '../game/state/guidance';
import { arrivalLocation, availableDestinations, currentLocation } from '../game/state/journey';
import { isKhanActive } from '../game/state/khan';
import { journeyResults } from '../game/state/legacy';
import { formatTime } from '../game/state/run';
import type { BuildingId, HudSnapshot, RunPhase } from '../game/types';
import type { GamePlatform } from '../platform/GamePlatform';
import { AUDIO_CHANNELS, normalizeAudioMix, type AudioChannel } from '../shared/audioSettings';
import { isSaveSlot } from '../shared/expeditionSave';
import { isValidCharacterName } from '../shared/characterProfile';
import type { NomadicBuildingId } from '../shared/nomadicCamp.js';
import { normalizeVisualSettings, resolutionLabel } from '../shared/visualSettings';
import { clanMark } from './artwork';
import {
  dangerWarningsContent,
  eliteMarkersContent,
  majorLossMessage,
} from './combatReadabilityContent';
import { developerConsole, developerMenu } from './developerContent';
import { foodOutlook, FORECAST_NOTE, signedRate } from './economyContent';
import { expeditionMetricsContent } from './expeditionMetricsContent';
import { guidanceContent } from './guidanceContent';
import type { JournalTab } from './menuContent';
import {
  buildingMenu,
  helpMenu,
  journalMenu,
  routeMenu,
  settingsMenu,
  startingTraditionMenu,
} from './menuContent';
import { UIMotion } from './Motion';
import { escapeHtml, type TreeViewState } from './progressionTree';
import { saveMenu, type SaveConfirmation } from './saveContent';
import { titleMenuContent } from './titleContent';

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
  private developerRevision = -1;
  private commandHistoryOffset = 0;
  private commandHistoryDraft = '';
  private toastTimer?: number;
  private creatorPreviewCleanup?: () => void;
  private creatorAbilityId?: string;
  private readonly creatorPreviewState = createRiderPreviewState();
  private creatorClassFeedback = false;

  constructor(
    private readonly root: HTMLElement,
    private readonly scene: ArenaScene,
    private readonly platform: GamePlatform,
  ) {
    root.dataset.phase = 'ready';
    root.innerHTML = `<main class="game-shell" aria-label="Hordes of the Fallen Sky game">
      <div class="arena-wrap" id="arena-wrap" tabindex="0" aria-label="Game arena. Use WASD or arrow keys to ride. Hold left click for a light attack and right click for a heavy attack. Number keys 1, 2, 3 and 4 use class abilities. Space gallops. B builds. M migrates. F changes formation. Tab or J opens the clan chronicle. Escape pauses. Plus and minus zoom; zero resets.">
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
          <section class="objective-hud hud-surface" aria-label="Current objective"><div class="objective-heading"><strong id="location">OTGONTENGER</strong><span id="camp-age">DAY 1</span></div><p id="objective">Grow the camp. Keep your people alive.</p><div class="pressure-row"><span>PASTURE <b id="pasture">100%</b></span><span>CALAMITY <b id="threat">0%</b></span></div><div class="pressure-tracks"><div class="track pasture-track"><div id="pasture-fill"></div></div><div class="track threat-track"><div id="threat-fill"></div></div></div><div id="migration-progress" hidden><div class="meter-row"><span id="progress-label">Journey</span><b id="migration-percent">0%</b></div><div class="track"><div id="migration-fill"></div></div></div><p class="objective-hint" id="migration-hint">Routes open in 45s.</p><p id="camp-pressure" class="field-status" role="status"></p><p id="clan-losses" class="field-status"></p><p id="major-loss" class="major-loss" role="status" hidden></p><p id="encounter-status" class="field-status" role="status"></p><p id="field-objective" class="field-status"></p><p id="clan-warning" class="clan-warning" role="status" hidden></p></section>
          <aside id="field-guide" class="field-guide hud-surface" aria-label="Expedition guidance" hidden></aside>
          <div class="zoom-controls hud-surface" role="group" aria-label="Battlefield zoom"><button id="zoom-out" aria-label="Zoom out" aria-keyshortcuts="-" title="Zoom out (− / D-pad left)">−</button><button id="zoom-reset" aria-label="Reset battlefield zoom to 100%" aria-keyshortcuts="0" title="Reset zoom (0 / Right stick click)"><span id="zoom-level">100%</span></button><button id="zoom-in" aria-label="Zoom in" aria-keyshortcuts="+" title="Zoom in (+ / D-pad right)">+</button></div>
          <div id="danger-warnings" class="danger-warnings" aria-label="Offscreen danger warnings" role="list"></div><div id="elite-markers" class="elite-markers" aria-label="Elite and armoured enemies" role="list"></div><div id="clan-bearing" class="clan-bearing"></div><div id="synergy" class="synergy" hidden>ϟ THE BURNING TEMPEST</div>
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
          <section class="vitals-hud hud-surface" aria-label="Khan and clan health"><div class="health-heading"><span id="khan-title">THE KHAN</span><b id="health">100 / 100</b></div><div class="track health-track"><div id="health-fill"></div></div><div id="khan-succession" class="khan-succession" role="status" hidden><strong>Choosing a new Khan</strong><span id="khan-succession-countdown"></span></div><div class="health-heading clan-health"><span>CLAN RESOLVE</span><b id="integrity">100%</b></div><div class="track resolve-track"><div id="integrity-fill"></div></div><div class="vital-stats"><span><span id="weapon-label">BOW</span> <b id="power">16</b></span><span id="momentum">MOMENTUM 0%</span><span id="spirit-energy" hidden>SPIRITUAL ENERGY 0 / 12</span></div></section>
          <section class="tradition-hud" aria-label="Run progression"><span>LEVEL <b id="level">01</b></span><div class="xp-track"><div id="xp-fill"></div></div><small><b id="kills">0</b> BANISHED</small></section>
          <section id="ability-dock" class="ability-dock hud-surface" aria-label="Class abilities">${(['q', 'w', 'e', 'r'] as const).map((slot, index) => `<div class="ability-indicator" id="ability-${slot}"><kbd>${index + 1}</kbd><span><strong></strong><small></small></span></div>`).join('')}</section>
          <button id="dash" class="dash-button hud-surface" aria-label="Dash"><span class="dash-symbol">${clanMark('horse')}</span><div><strong>GALLOP</strong><small id="dash-label">SPACE / READY</small></div><span class="dash-charge" id="dash-charge"></span></button>
          <nav class="command-dock" aria-label="Clan commands"><button id="build" class="command-button" title="Develop camp (B)"><span class="command-icon">${clanMark('ger')}</span><span>Develop camp</span><kbd>B</kbd></button><button id="formation" class="command-button" title="Change formation (F)"><span class="command-icon">${clanMark('bow')}</span><span id="formation-name">Caravan guard</span><kbd>F</kbd></button><button id="migrate" class="command-button migrate-button" title="Pack & migrate (M)" disabled><span class="command-icon">${clanMark('banner')}</span><span>Pack & migrate</span><kbd>M</kbd></button></nav>
          <div class="chronicle-toast" id="chronicle-toast"><span aria-hidden="true">${clanMark('spirit')}</span><div><p id="clan-message"></p></div></div>
        </div>
        <div id="overlay" class="overlay ready-screen" role="dialog" aria-modal="true" aria-labelledby="overlay-title" tabindex="-1"></div>
        <p id="creator-status" class="sr-only" aria-live="polite"></p>
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
      else if (action === 'formation') scene.cycleFormation();
      else if (action === 'migrate') scene.openRoutes();
    });
    this.overlay.addEventListener('click', (event) => this.handleMenuClick(event));
    this.overlay.addEventListener('keydown', (event) => this.handleMenuKey(event));
    this.overlay.addEventListener('focusin', (event) => {
      const ability = (event.target as Element).closest<HTMLElement>('[data-creator-ability]');
      if (ability?.dataset.creatorAbility)
        this.selectCreatorAbility(ability.dataset.creatorAbility);
    });
    this.overlay.addEventListener('pointerover', (event) => {
      const ability = (event.target as Element).closest<HTMLElement>('[data-creator-ability]');
      if (ability?.dataset.creatorAbility)
        this.selectCreatorAbility(ability.dataset.creatorAbility);
    });
    this.overlay.addEventListener('input', (event) => {
      const input = event.target as HTMLInputElement;
      if (input.matches('[data-creator-name]')) {
        this.scene.changeCharacterOption('name', input.value);
        this.updateCreatorNameValidity(input);
        return;
      }
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
    const { run, dashReady, dashCooldown, best, clanBearing } = snapshot;
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
    const objective = run.field.objective;
    const visibleObjective = !!objective && ['available', 'returning'].includes(objective.status);
    this.get('field-objective').hidden = !visibleObjective;
    if (visibleObjective)
      this.text(
        'field-objective',
        `Optional ${snapshot.fieldBearing ?? ''}: ${FIELD_OBJECTIVES[objective.kind].title} · ${objective.status === 'returning' ? 'Escort to camp' : FIELD_OBJECTIVES[objective.kind].instruction} ${FIELD_OBJECTIVES[objective.kind].reward}${objective.kind === 'gathering' ? ` · ${objective.defeated}/${GAME.field.guards}` : ''}`,
      );
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
    this.text(
      'momentum',
      snapshot.attackCharge
        ? `${snapshot.attackCharge.name.toUpperCase()} ${Math.round(snapshot.attackCharge.progress * 100)}%`
        : 'LMB LIGHT · RMB HEAVY',
    );
    const spiritEnergy = this.get('spirit-energy');
    spiritEnergy.hidden = !snapshot.spiritCaller;
    if (snapshot.spiritCaller)
      spiritEnergy.textContent = `SPIRITUAL ENERGY ${snapshot.spiritCaller.energy} / ${snapshot.spiritCaller.maximum} · ${snapshot.spiritCaller.activeSpirits} ACTIVE SPIRITS`;
    for (const ability of snapshot.abilities) {
      const indicator = this.get(`ability-${ability.slot}`);
      indicator.title = ability.description;
      indicator.querySelector('kbd')!.textContent = ability.slotLabel;
      indicator.querySelector('strong')!.textContent = ability.name;
      indicator.querySelector('small')!.textContent =
        ability.remaining > 0 ? `${ability.remaining.toFixed(1)}s` : 'READY';
      indicator.classList.toggle('cooling', ability.remaining > 0);
    }
    for (const id of ['population', 'herd', 'food', 'materials', 'spirit'] as const)
      this.number(id, Math.floor(clan[id]));
    this.get('food').classList.toggle('danger', clan.food < 15);
    this.text('doctrine', clanDoctrine(run));
    this.text('riders', riderCount(run));
    this.text('workers', `${assignedWorkers(run)} / ${clan.population}`);
    const activeClass = classDefinition(run.character?.classId);
    this.text('weapon-label', activeClass.weapon.hudLabel);
    this.text('power', Math.round(run.stats.damage));
    const khanTitle = this.get('khan-title');
    khanTitle.dataset.characterClass = activeClass.id;
    khanTitle.dataset.characterName = run.character?.name ?? '';
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
    this.text(
      'camp-age',
      clan.stage === 'migration' ? 'ON THE MOVE' : `DAY ${1 + Math.floor(clan.stageTime / 30)}`,
    );
    this.text('stage-label', clan.stage === 'migration' ? 'THE GREAT FLIGHT' : 'ENCAMPMENT');
    this.text(
      'objective',
      clan.stage === 'migration'
        ? `Escort the caravan to ${arrivalLocation(run).name}.`
        : 'Grow the camp. Keep your people alive.',
    );
    this.get('migration-progress').hidden = clan.stage === 'camp';
    const progress = clan.migrationProgress;
    this.text('migration-percent', `${Math.min(Math.round(progress * 100), 100)}%`);
    this.meter('migration-fill', progress * 100);
    this.text(
      'migration-hint',
      clan.stage === 'migration'
        ? 'Guard the wagons on the road east.'
        : canMigrate(run)
          ? 'The roads are open. Pack up with M.'
          : `Routes open in ${Math.ceil(GAME.clan.minimumCamp - clan.stageTime)}s. Build up the camp with B.`,
    );
    const formationTitle = FORMATIONS[clan.formation].title;
    if (this.get('formation-name').textContent !== formationTitle) {
      this.text('formation-name', formationTitle);
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
    this.text('best', best > 0 ? formatTime(best) : '— — : — —');
    this.text('clan-message', clan.message);
    this.layoutGuidance();
    if (clan.message !== this.lastMessage) {
      this.lastMessage = clan.message;
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
    const bottom = this.get('dash').getBoundingClientRect().top - 12;
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
    this.stopCreatorPreview();
    this.motion.destroy();
  }

  private renderPhase(snapshot: HudSnapshot): void {
    const { run } = snapshot;
    const preserveTree =
      run.phase === this.phase &&
      ['building', 'route', 'saves', 'traditions', 'character'].includes(run.phase);
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
    if (run.phase === 'playing' && ['ready', 'character'].includes(this.phase)) this.showMessage();
    this.phase = run.phase;
    this.root.dataset.phase = run.phase;
    this.get('game-hud').inert = run.phase !== 'playing';
    this.get('game-hud').setAttribute(
      'aria-hidden',
      String(['ready', 'character', 'settings', 'help', 'developer'].includes(run.phase)),
    );
    this.get('menu-record').hidden = !['ready', 'paused', 'dead'].includes(run.phase);
    // Transfer focus before hiding or removing the focused menu control.
    if (run.phase === 'playing') this.get('arena-wrap').focus({ preventScroll: true });
    this.overlay.hidden = run.phase === 'playing';
    this.overlay.className = `overlay ${run.phase === 'character' ? 'character-creation-screen' : run.phase === 'console' ? 'console-screen' : run.phase === 'building' ? 'planning camp-planning' : run.phase === 'ready' ? 'ready-screen' : ['route', 'journal', 'settings', 'help', 'developer', 'saves', 'traditions'].includes(run.phase) ? 'planning' : 'pause-screen'}`;
    const labels: Record<RunPhase, string> = {
      ready: 'THE SKY IS WAITING',
      traditions: 'STARTING CLAN TRADITION',
      character: 'CHARACTER CREATION',
      playing: 'THE CLAN ENDURES',
      paused: 'EXPEDITION PAUSED',
      saves: 'SAVED EXPEDITIONS',
      building: 'DEVELOPING THE CAMP',
      route: 'CHOOSING A ROUTE',
      journal: 'READING THE CLAN CHRONICLE',
      settings: 'SETTINGS',
      help: 'HOW TO PLAY',
      developer: import.meta.env.DEV ? 'DEVELOPER LEVEL SELECTOR' : '',
      console: import.meta.env.DEV ? 'DEVELOPER CONSOLE' : '',
      dead: 'THE BANNERS FALL',
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
    if (run.phase !== 'character') {
      this.stopCreatorPreview();
    }

    if (run.phase === 'character') {
      this.overlay.innerHTML = characterCreatorContent(
        this.scene.characterCreator,
        this.creatorAbilityId,
      );
      const profile = this.scene.characterCreator.profile;
      this.text(
        'creator-status',
        `${profile.gender === 'woman' ? 'Female' : 'Male'} ${classDefinition(profile.classId).title}`,
      );
      if (this.creatorClassFeedback) {
        this.overlay
          .querySelector('.creator-rider-canvas')
          ?.classList.add('creator-choice-feedback');
        this.overlay
          .querySelector('.creator-class-details')
          ?.classList.add('creator-choice-feedback');
        this.creatorClassFeedback = false;
      }
      this.updateCreatorPreview();
    } else if (run.phase === 'traditions') this.overlay.innerHTML = startingTraditionMenu(run);
    else if (run.phase === 'saves')
      this.overlay.innerHTML = saveMenu(snapshot, this.saveConfirmation);
    else if (run.phase === 'ready') {
      this.overlay.innerHTML = titleMenuContent({
        latestSaveSlot: latestSave?.slot,
        hasCamp: Boolean(this.platform.profile.camp),
        developer: import.meta.env.DEV,
        desktop: Boolean(this.platform.desktop),
      });
    } else if (run.phase === 'paused') {
      this.overlay.innerHTML = `<section class="pause-menu"><p class="eyebrow">EXPEDITION PAUSED</p><h2 id="overlay-title">A quiet moment.</h2><p class="panel-intro">The steppe holds still until you return.</p><nav class="main-menu" aria-label="Pause menu"><button class="menu-button featured" data-action="resume" data-primary>RETURN TO THE STEPPE <span>→</span></button><button class="menu-button" data-action="restart">Start a new run</button>${savedMenu}<button class="menu-button" data-action="save-title">${snapshot.developerRun ? 'Return to title' : 'Save and return to title'}</button><button class="menu-button" data-action="settings">Settings</button><button class="menu-button" data-action="help">How to play</button>${developer}${quit}</nav></section>`;
    } else if (run.phase === 'building')
      this.overlay.innerHTML = buildingMenu(run, this.treeView(), this.campSelection);
    else if (run.phase === 'route') {
      if (!availableDestinations(run).some((location) => location.id === this.destinationSelection))
        this.destinationSelection = arrivalLocation(run).id;
      this.overlay.innerHTML = routeMenu(run, this.destinationSelection);
    } else if (run.phase === 'journal') this.overlay.innerHTML = journalMenu(run, this.journalTab);
    else if (run.phase === 'settings')
      this.overlay.innerHTML = settingsMenu(
        this.platform.profile.muted,
        this.fullscreen,
        normalizeAudioMix(this.platform.profile.audioMix),
        normalizeVisualSettings(this.platform.profile.visualSettings),
      );
    else if (run.phase === 'help') this.overlay.innerHTML = helpMenu(run.guidance.enabled);
    else if (import.meta.env.DEV && run.phase === 'developer')
      this.overlay.innerHTML = developerMenu(snapshot.developerConsole);
    else if (import.meta.env.DEV && run.phase === 'console')
      this.overlay.innerHTML = developerConsole(snapshot.developerConsole);
    else {
      const results = journeyResults(run);
      this.overlay.innerHTML = `<section class="end-menu"><div class="title-emblem">${emblem}</div><p class="eyebrow">THE STEPPE WILL REMEMBER</p><h2 id="overlay-title">The banners fall.</h2><p class="panel-intro">Clan lost · ${escapeHtml(results.location)} · ${escapeHtml(results.stage)}</p><div class="end-stats"><div><strong>${formatTime(results.elapsed)}</strong><span>JOURNEY</span></div><div><strong>${results.survivors}</strong><span>SURVIVORS</span></div><div><strong>${results.herd}</strong><span>HERD</span></div><div><strong>${results.pastures}</strong><span>PASTURES</span></div><div><strong>${results.fallenKhans}</strong><span>FALLEN KHANS</span></div></div>${expeditionMetricsContent(run)}<nav class="main-menu"><button class="menu-button featured" data-action="restart" data-primary>RAISE THE BANNERS AGAIN <span>→</span></button><button class="menu-button" data-action="journal">Clan chronicle</button>${savedMenu}${quit}</nav></section>`;
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
    if (!button || button.disabled) return;
    const action = button.dataset.action;
    if (button.getAttribute('aria-disabled') === 'true' && action !== 'begin-journey') return;
    if (
      button.dataset.audioReference &&
      AUDIO_REFERENCE_CUES.includes(
        button.dataset.audioReference as (typeof AUDIO_REFERENCE_CUES)[number],
      )
    ) {
      this.scene.auditionAudio(button.dataset.audioReference as SoundKind);
      return;
    }
    if (action !== 'sound' && !button.dataset.building && !button.dataset.estateKind)
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
        expanded: false,
        campFocus: button.dataset.focusKey,
      });
      this.renderPhase(this.lastSnapshot);
    } else if (button.hasAttribute('data-camp-economy') && this.lastSnapshot) {
      Object.assign(this.treeView(), {
        campPopup: true,
        campTarget: 'economy',
        expanded: false,
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
    } else if (button.dataset.treeZoom && this.lastSnapshot) {
      this.treeView().zoom =
        button.dataset.treeZoom === 'reset'
          ? 1
          : Math.max(
              0.6,
              Math.min(1.5, (this.treeView().zoom ?? 1) + Number(button.dataset.treeZoom)),
            );
      this.renderPhase(this.lastSnapshot);
    } else if (button.hasAttribute('data-tree-compact') && this.lastSnapshot) {
      this.treeView().compact = !this.treeView().compact;
      this.renderPhase(this.lastSnapshot);
    } else if (button.dataset.treePin && this.lastSnapshot) {
      this.treeView().pinned = button.dataset.treePin;
      this.renderPhase(this.lastSnapshot);
    } else if (button.dataset.treeSelect && this.lastSnapshot) {
      this.treeView().node = button.dataset.treeSelect;
      this.renderPhase(this.lastSnapshot);
      this.overlay.querySelector('[data-scroll-key="node-details"]')?.scrollTo({ top: 0 });
    } else if (button.dataset.treeBranchSelect && this.lastSnapshot) {
      Object.assign(this.treeView(), {
        branch: button.dataset.treeBranchSelect,
        node: undefined,
        overview: false,
      });
      this.renderPhase(this.lastSnapshot);
    } else if (button.hasAttribute('data-tree-overview') && this.lastSnapshot) {
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
    } else if (import.meta.env.DEV && action === 'developer') this.scene.toggleDeveloperMenu();
    else if (import.meta.env.DEV && action === 'developer-invincible')
      this.scene.executeDeveloperCommand('invincible');
    else if (import.meta.env.DEV && action === 'developer-clan-invincible')
      this.scene.executeDeveloperCommand('clan-invincible');
    else if (import.meta.env.DEV && button.dataset.developerLevel)
      this.scene.startDeveloperLevel(button.dataset.developerLevel);
    else if (import.meta.env.DEV && button.dataset.developerClass)
      this.scene.startDeveloperClass(button.dataset.developerClass);
    else if (action === 'starting-traditions') this.scene.openStartingTraditions();
    else if (button.dataset.startingTradition)
      this.scene.selectStartingTradition(button.dataset.startingTradition);
    else if (button.dataset.creatorAbility)
      this.selectCreatorAbility(button.dataset.creatorAbility);
    else if (button.dataset.creatorField && button.dataset.creatorValue) {
      if (
        button.dataset.creatorField === 'classId' &&
        button.dataset.creatorValue !== this.scene.characterCreator.profile.classId
      ) {
        this.creatorAbilityId = undefined;
        this.creatorClassFeedback = true;
      }
      this.scene.changeCharacterOption(button.dataset.creatorField, button.dataset.creatorValue);
    } else if (button.hasAttribute('data-creator-random')) this.scene.randomCharacterName();
    else if (action === 'begin-journey') {
      if (button.getAttribute('aria-disabled') === 'true') {
        this.overlay
          .querySelector<HTMLInputElement>('[data-creator-name]')
          ?.focus({ preventScroll: true });
        this.text('creator-status', 'Enter a name to begin your journey.');
      } else this.scene.beginJourney();
    } else if (action === 'begin') this.scene.startRun();
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
    else if (action === 'journal') this.scene.toggleJournal();
    else if (action === 'back') this.scene.closePlanning();
    else if (action === 'quit') void this.platform.desktop?.quit();
    else if (action === 'build') this.scene.openBuildings();
    else if (action === 'routes') this.scene.openRoutes();
    else if (action === 'sound') {
      this.scene.toggleAudio();
      this.updateSettingsControls();
    } else if (
      button.dataset.visualSetting === 'projectileContrast' ||
      button.dataset.visualSetting === 'effectDensity' ||
      button.dataset.visualSetting === 'renderResolution'
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
    } else if (button.dataset.building) {
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
    const resolution = this.overlay.querySelector<HTMLButtonElement>(
      '[data-visual-setting="renderResolution"]',
    );
    if (resolution) {
      resolution.textContent = resolutionLabel(visuals.renderResolution);
      resolution.setAttribute('aria-pressed', String(visuals.renderResolution === 'full'));
    }

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
    if (
      this.phase === 'character' &&
      event.target instanceof HTMLInputElement &&
      event.target.matches('[data-creator-name]') &&
      event.key === 'Enter'
    ) {
      event.preventDefault();
      this.overlay
        .querySelector<HTMLButtonElement>('[data-action="begin-journey"][aria-disabled="false"]')
        ?.focus({ preventScroll: true });
      return;
    }
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
    if (
      ['building', 'route', 'developer', 'character'].includes(this.phase) &&
      ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key) &&
      (!(event.target instanceof HTMLInputElement) ||
        (this.phase === 'character' && ['ArrowUp', 'ArrowDown'].includes(event.key)))
    ) {
      event.preventDefault();
      event.stopPropagation();
      if (this.phase === 'character') {
        this.navigateMenu(event.key.slice(5).toLowerCase() as 'up' | 'down' | 'left' | 'right');
      } else if (!this.navigateGraph(event.key))
        this.navigateMenu(['ArrowLeft', 'ArrowUp'].includes(event.key) ? 'previous' : 'next');
      return;
    }
    const button = (event.target as Element).closest<HTMLButtonElement>('[role="tab"]');
    if (button && ['ArrowLeft', 'ArrowRight'].includes(event.key)) {
      event.preventDefault();
      event.stopPropagation();
      const tabs: JournalTab[] = ['journey', 'clan'];
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
  private navigateMenu(
    action: 'next' | 'previous' | 'up' | 'down' | 'left' | 'right' | 'confirm',
  ): void {
    const buttons = this.menuButtons();
    if (!buttons.length) return;
    const index = Math.max(
      0,
      buttons.findIndex((button) => button === document.activeElement),
    );
    if (action === 'confirm') buttons[index]?.click();
    else if (
      this.phase === 'character' &&
      ['up', 'down', 'left', 'right'].includes(action) &&
      this.navigateCreator(action as 'up' | 'down' | 'left' | 'right')
    )
      return;
    else {
      const target =
        buttons[
          (index + (['next', 'down', 'right'].includes(action) ? 1 : -1) + buttons.length) %
            buttons.length
        ];
      target?.focus();
      target?.scrollIntoView({ block: 'nearest' });
    }
  }

  private navigateCreator(direction: 'up' | 'down' | 'left' | 'right'): boolean {
    const current = document.activeElement as HTMLElement | null;
    const directionName = `${direction[0]!.toUpperCase()}${direction.slice(1)}`;
    const focusKey = current?.dataset[`nav${directionName}`];
    if (!focusKey) return false;
    const target = [...this.overlay.querySelectorAll<HTMLElement>('[data-focus-key]')].find(
      (entry) => entry.dataset.focusKey === focusKey,
    );
    if (!target) return false;
    if (target.getAttribute('role') === 'radio') {
      const group = target.closest('[role="radiogroup"]');
      group
        ?.querySelectorAll<HTMLElement>('[role="radio"]')
        .forEach((radio) => (radio.tabIndex = radio === target ? 0 : -1));
    }
    target.focus({ preventScroll: true });
    return true;
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

  private updateCreatorPreview(): void {
    this.stopCreatorPreview();
    const canvas = this.overlay.querySelector<HTMLCanvasElement>('#creator-rider-canvas');
    if (canvas) {
      const p = this.scene.characterCreator.profile;
      this.creatorPreviewCleanup = startRiderPreview(
        canvas,
        p.classId,
        p.gender,
        this.creatorPreviewState,
      );
    }
  }

  private updateCreatorNameValidity(input: HTMLInputElement): void {
    const valid = isValidCharacterName(input.value);
    input.setAttribute('aria-invalid', String(!valid));
    const hint = this.overlay.querySelector<HTMLElement>('#creator-name-hint');
    if (hint) {
      hint.className = `creator-name-hint ${valid ? 'sr-only' : 'invalid'}`;
      hint.textContent = valid
        ? 'The name your clan will remember.'
        : 'Enter a name to begin your journey.';
    }
    const begin = this.overlay.querySelector<HTMLButtonElement>('[data-action="begin-journey"]');
    begin?.setAttribute('aria-disabled', String(!valid));
  }

  private selectCreatorAbility(id: string): void {
    if (this.phase !== 'character') return;
    const rows = [...this.overlay.querySelectorAll<HTMLButtonElement>('[data-creator-ability]')];
    if (!rows.some((row) => row.dataset.creatorAbility === id)) return;
    this.creatorAbilityId = id;
    for (const row of rows) {
      const expanded = row.dataset.creatorAbility === id;
      row.setAttribute('aria-expanded', String(expanded));
      const description = row.querySelector<HTMLElement>('.creator-ability-desc');
      if (description) description.hidden = !expanded;
    }
  }

  private stopCreatorPreview(): void {
    this.creatorPreviewCleanup?.();
    this.creatorPreviewCleanup = undefined;
  }
}
