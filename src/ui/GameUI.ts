import { GAME } from '../game/config';
import { clanMark } from './artwork';
import { UIMotion } from './Motion';
import { FORMATIONS, REGIONS } from '../game/data/clan';
import { INTRO_SLIDES, introImageUrl } from '../game/data/intro';
import { introMenu } from './introContent';
import { storyAct } from '../game/data/story';
import { storyMenu, epilogueMenu, storyLogMenu } from './storyContent';
import type { ArenaScene } from '../game/scenes/ArenaScene';
import {
  assignedWorkers,
  availableFormations,
  burningTempest,
  canMigrate,
  clanDoctrine,
  riderCount,
} from '../game/state/clan';
import { currentGuidance, clanWarning } from '../game/state/guidance';
import { guidanceContent } from './guidanceContent';
import { formatTime } from '../game/state/run';
import { isKhanActive } from '../game/state/khan';
import type { BuildingId, HudSnapshot, RunPhase } from '../game/types';
import type { GamePlatform } from '../platform/GamePlatform';
import { buildingMenu, helpMenu, journalMenu, routeMenu, settingsMenu } from './menuContent';
import type { JournalTab } from './menuContent';
import { researchMenu } from './researchContent';
import type { TreeViewState } from './progressionTree';

const emblem = `<span class="clan-seal">${clanMark('spirit')}</span>`;

export class GameUI {
  readonly canvasParent: HTMLElement;
  private readonly overlay: HTMLElement;
  private readonly motion: UIMotion;
  private phase: RunPhase = 'ready';
  private fullscreen = false;
  private journalTab: JournalTab = 'journey';
  private treeViews = new Map<RunPhase, TreeViewState>();

  private treeView(): TreeViewState {
    let view = this.treeViews.get(this.phase);
    if (!view) {
      view = { category: 'all', query: '' };
      this.treeViews.set(this.phase, view);
    }
    return view;
  }
  private lastSnapshot?: HudSnapshot;
  private guideId = '';
  private lastMessage = '';
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
      <div class="arena-wrap" id="arena-wrap" tabindex="0" aria-label="Game arena. WASD to ride. Space to gallop. T for the tech tree. B to build. M to migrate. F for formation. Tab or J for the clan chronicle. Escape to pause.">
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
          </section>
          <div class="expedition-clock"><strong id="timer">00:00</strong><span id="stage-label">ENCAMPMENT</span></div>
          <nav class="hud-menu" aria-label="Game menus"><button id="journal" class="hud-menu-button" title="Clan chronicle (Tab / J)" aria-label="Open clan chronicle" aria-keyshortcuts="Tab J"><span>${clanMark('journal')}</span><kbd>TAB</kbd></button><button id="pause" class="hud-menu-button" aria-label="Pause" title="Pause (Escape)"><span>${clanMark('pause')}</span><kbd>ESC</kbd></button></nav>
          <section class="objective-hud hud-surface" aria-label="Current objective"><div class="objective-heading"><span id="region-count">01 / 04</span><strong id="location">GOLDEN PASTURE</strong><span id="camp-age">DAY 1</span></div><p class="act-heading" id="act-heading">ACT I · GATHER THE SCATTERED</p><p id="objective">Build the camp. Protect your people.</p><div class="pressure-row"><span>PASTURE <b id="pasture">100%</b></span><span>CALAMITY <b id="threat">0%</b></span></div><div class="pressure-tracks"><div class="track pasture-track"><div id="pasture-fill"></div></div><div class="track threat-track"><div id="threat-fill"></div></div></div><div id="migration-progress" hidden><div class="meter-row"><span id="progress-label">Crossing</span><b id="crossing">0%</b></div><div class="track"><div id="crossing-fill"></div></div></div><p class="objective-hint" id="migration-hint">New routes in 45s.</p><p id="clan-warning" class="clan-warning" role="status" hidden></p></section>
          <aside id="field-guide" class="field-guide hud-surface" aria-label="Expedition guidance" hidden></aside>
          <div id="clan-bearing" class="clan-bearing"></div><div id="synergy" class="synergy" hidden>ϟ THE BURNING TEMPEST</div>
          <div id="boss-bar" class="boss-bar" hidden><span>THE SKYBREAKER</span><div class="track"><div id="boss-fill"></div></div></div>
          <section class="vitals-hud hud-surface" aria-label="Khan and clan health"><div class="health-heading"><span id="khan-title">THE KHAN</span><b id="health">100 / 100</b></div><div class="track health-track"><div id="health-fill"></div></div><div id="khan-succession" class="khan-succession" role="status" hidden><strong>Choosing a new Khan</strong><span id="khan-succession-countdown"></span></div><div class="health-heading clan-health"><span>CLAN RESOLVE</span><b id="integrity">100%</b></div><div class="track resolve-track"><div id="integrity-fill"></div></div><div class="vital-stats"><span>BOW <b id="power">16</b></span><span id="momentum">MOMENTUM 0%</span></div></section>
          <section class="tradition-hud" aria-label="Run progression"><span>TRADITION <b id="level">01</b> <small>· <span id="blessing-count">0</span> LEARNED</small></span><div class="xp-track"><div id="xp-fill"></div></div><small><b id="kills">0</b> BANISHED</small><button id="research" class="research-button" aria-label="Open patron tech tree" aria-keyshortcuts="T">Tech tree <kbd>T</kbd><span id="research-points">0</span></button></section>
          <button id="dash" class="dash-button hud-surface" aria-label="Dash"><span class="dash-symbol">${clanMark('horse')}</span><div><strong>GALLOP</strong><small id="dash-label">SPACE / READY</small></div><span class="dash-charge" id="dash-charge"></span></button>
          <nav class="command-dock" aria-label="Clan commands"><button id="build" class="command-button" title="Develop camp (B)"><span class="command-icon">${clanMark('ger')}</span><span>Develop camp</span><kbd>B</kbd></button><button id="formation" class="command-button" title="Change formation (F)"><span class="command-icon">${clanMark('bow')}</span><span id="formation-name">Caravan guard</span><kbd>F</kbd></button><button id="migrate" class="command-button migrate-button" title="Pack & migrate (M)" disabled><span class="command-icon">${clanMark('banner')}</span><span>Pack & migrate</span><kbd>M</kbd></button></nav>
          <div class="chronicle-toast" id="chronicle-toast"><span aria-hidden="true">${clanMark('spirit')}</span><p id="clan-message"></p></div>
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
    this.get('formation').addEventListener('click', () => scene.cycleFormation());
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
      if (!input.matches('[data-tree-search]') || !this.lastSnapshot) return;
      this.treeView().query = input.value;
      this.renderPhase(this.lastSnapshot);
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
    this.get(id).style.width = `${Math.max(0, Math.min(100, value))}%`;
  }

  private update(snapshot: HudSnapshot): void {
    this.lastSnapshot = snapshot;
    const { run, dashReady, dashCooldown, best, bossHealth, clanBearing } = snapshot;
    this.motion.setPlaying(run.phase === 'playing');
    const clan = run.clan;
    const guide = currentGuidance(run);
    this.get('field-guide').hidden = !guide;
    if ((guide?.id ?? '') !== this.guideId) {
      this.guideId = guide?.id ?? '';
      this.get('field-guide').innerHTML = guide ? guidanceContent(guide) : '';
    }
    const warning = clanWarning(run);
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
    this.text(
      'khan-succession-countdown',
      `Returns ${clan.stage === 'migration' ? 'to the caravan' : 'at camp'} in ${Math.ceil(run.khan.successionRemaining)}s`,
    );
    this.get('khan-succession')
      .closest('.vitals-hud')!
      .classList.toggle('choosing-khan', !khanActive);
    const region = REGIONS[clan.region]!;
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
    this.text('momentum', `MOMENTUM ${Math.round(clan.momentum * 100)}%`);
    for (const id of ['population', 'herd', 'food', 'materials', 'spirit'] as const)
      this.number(id, Math.floor(clan[id]));
    this.get('food').classList.toggle('danger', clan.food < 15);
    this.text('doctrine', clanDoctrine(run));
    this.text('riders', riderCount(run));
    this.text('workers', `${assignedWorkers(run)} / ${clan.population}`);
    this.text('power', Math.round(run.stats.damage));
    this.number('integrity', Math.ceil(clan.integrity), `${Math.ceil(clan.integrity)}%`);
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
        ? 'Ride with the caravan. Protect the clan.'
        : clan.stage === 'final'
          ? 'Guard the families clearing the mountain passage.'
          : 'Grow the camp. Keep your people alive.',
    );
    this.get('migration-progress').hidden = clan.stage === 'camp';
    const progress =
      clan.stage === 'final' ? clan.stageTime / GAME.clan.finalDuration : clan.migrationProgress;
    this.text('progress-label', clan.stage === 'final' ? 'Passage opens' : 'Crossing');
    this.text('crossing', `${Math.min(100, Math.round(progress * 100))}%`);
    this.meter('crossing-fill', progress * 100);
    this.text(
      'migration-hint',
      clan.stage === 'migration'
        ? 'Defend the wagons on the journey east.'
        : clan.stage === 'final'
          ? `${formatTime(Math.max(0, GAME.clan.finalDuration - clan.stageTime))} until the passage opens.`
          : canMigrate(run)
            ? 'Fresh pastures await. Pack up with M.'
            : `New routes in ${Math.ceil(GAME.clan.minimumCamp - clan.stageTime)}s. Develop the camp with B.`,
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
    if (clan.message !== this.lastMessage) {
      this.lastMessage = clan.message;
      this.showMessage();
    }
  }

  private showMessage(): void {
    this.get('chronicle-toast').classList.add('visible');
    window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(
      () => this.get('chronicle-toast').classList.remove('visible'),
      7000,
    );
  }

  destroy(): void {
    window.clearTimeout(this.toastTimer);
    this.motion.destroy();
  }

  private renderPhase(snapshot: HudSnapshot): void {
    const { run } = snapshot;
    const preserveTree = run.phase === this.phase && ['upgrade', 'building'].includes(run.phase);
    const scroll = preserveTree ? this.overlay.querySelector('.tree-scroll')?.scrollTop : undefined;
    const active = document.activeElement as HTMLElement | null;
    const focusKey = preserveTree ? active?.dataset.focusKey : undefined;
    const selection = active instanceof HTMLInputElement ? active.selectionStart : null;
    this.overlay.dataset.entry =
      run.phase !== this.phase || !this.overlay.firstElementChild ? 'phase' : 'content';
    if (run.phase !== this.phase) this.motion.cancel();
    if (run.phase === 'playing' && (this.phase === 'ready' || this.phase === 'intro'))
      this.showMessage();
    this.phase = run.phase;
    this.root.dataset.phase = run.phase;
    this.get('game-hud').inert = run.phase !== 'playing';
    this.get('game-hud').setAttribute(
      'aria-hidden',
      String(
        ['intro', 'ready', 'settings', 'help', 'story', 'epilogue', 'story-log'].includes(
          run.phase,
        ),
      ),
    );
    this.get('menu-record').hidden = !['ready', 'paused', 'dead', 'won'].includes(run.phase);
    // Transfer focus before hiding or removing the focused menu control.
    if (run.phase === 'playing') this.get('arena-wrap').focus({ preventScroll: true });
    this.overlay.hidden = run.phase === 'playing';
    this.overlay.className = `overlay ${run.phase === 'intro' ? 'intro-screen' : run.phase === 'ready' ? 'ready-screen' : ['building', 'route', 'journal', 'upgrade', 'settings', 'help', 'story', 'epilogue', 'story-log'].includes(run.phase) ? 'planning' : 'pause-screen'}`;
    if (run.phase === 'intro') this.overlay.setAttribute('aria-describedby', 'intro-caption');
    else this.overlay.removeAttribute('aria-describedby');
    const labels: Record<RunPhase, string> = {
      intro: `CHAPTER ${snapshot.introSlide + 1} OF ${INTRO_SLIDES.length}. ${INTRO_SLIDES[snapshot.introSlide]!.title} ${INTRO_SLIDES[snapshot.introSlide]!.text}`,
      story: run.story.active?.title ?? 'THE CLAN GATHERS',
      epilogue: 'A PLACE BESIDE THE FIRE',
      'story-log': 'OUR REMEMBERED ROAD',
      ready: 'THE SKY IS WAITING',
      playing: 'THE CLAN ENDURES',
      paused: 'EXPEDITION PAUSED',
      upgrade: 'PATRON TECH TREE',
      building: 'DEVELOPING THE CAMP',
      route: 'CHOOSING A ROUTE',
      journal: 'READING THE CLAN CHRONICLE',
      settings: 'SETTINGS',
      help: 'HOW TO PLAY',
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
    if (run.phase === 'intro') this.overlay.innerHTML = introMenu(snapshot.introSlide);
    else if (run.phase === 'story') this.overlay.innerHTML = storyMenu(run);
    else if (run.phase === 'epilogue') this.overlay.innerHTML = epilogueMenu(run);
    else if (run.phase === 'story-log') this.overlay.innerHTML = storyLogMenu(run);
    else if (run.phase === 'ready') {
      this.overlay.innerHTML = `<section class="title-menu"><div class="title-emblem">${emblem}</div><p class="eyebrow">WHEN HEAVEN WENT SILENT</p><h1 id="overlay-title"><span class="title-prefix">Hordes of the</span> <em>Fallen Sky</em></h1><p class="title-tagline">You don’t build a city.<br>You build a people.</p><nav class="main-menu" aria-label="Main menu"><button class="menu-button featured" data-action="begin" data-primary>NEW GAME <span>→</span></button><button class="menu-button" data-action="intro">Replay introduction</button><button class="menu-button" data-action="help">How to play</button><button class="menu-button" data-action="settings">Settings</button>${quit}</nav><button class="story-preference" data-action="story-mode" aria-pressed="${run.story.enabled}">Camp scenes: ${run.story.enabled ? 'On' : 'Off'}</button><p class="title-caption">Two acts. Four pastures. One people to carry through.</p></section>`;
    } else if (run.phase === 'paused') {
      this.overlay.innerHTML = `<section class="pause-menu"><p class="eyebrow">EXPEDITION PAUSED</p><h2 id="overlay-title">A quiet moment.</h2><p class="panel-intro">Your people will be here when you return.</p><nav class="main-menu" aria-label="Pause menu"><button class="menu-button featured" data-action="resume" data-primary>RETURN TO THE STEPPE <span>→</span></button><button class="menu-button" data-action="research">Patron tech tree</button><button class="menu-button" data-action="restart">Start a new run</button><button class="menu-button" data-action="story-log">Our remembered road</button><button class="menu-button" data-action="settings">Settings</button><button class="menu-button" data-action="help">How to play</button>${quit}</nav></section>`;
    } else if (run.phase === 'building')
      this.overlay.innerHTML = buildingMenu(run, this.treeView());
    else if (run.phase === 'route') this.overlay.innerHTML = routeMenu(run);
    else if (run.phase === 'upgrade') this.overlay.innerHTML = researchMenu(run, this.treeView());
    else if (run.phase === 'journal') this.overlay.innerHTML = journalMenu(run, this.journalTab);
    else if (run.phase === 'settings')
      this.overlay.innerHTML = settingsMenu(this.platform.profile.muted, this.fullscreen);
    else if (run.phase === 'help') this.overlay.innerHTML = helpMenu(run.guidance.enabled);
    else {
      const won = run.phase === 'won';
      this.overlay.innerHTML = `<section class="end-menu"><div class="title-emblem">${emblem}</div><p class="eyebrow">${won ? 'A PEOPLE, STILL ALIVE' : 'THE STEPPE WILL REMEMBER'}</p><h2 id="overlay-title">${won ? 'A sky worth saving.' : 'The banners fall.'}</h2><p class="panel-intro">${won ? `${run.clan.population} ${run.clan.population === 1 ? 'person' : 'people'} and ${run.clan.herd} ${run.clan.herd === 1 ? 'animal' : 'animals'} reach the mountain passage.<br>Your civilization lives to see another sky.` : 'The journey ends here. Another clan will take up the blue banner.'}</p><div class="end-stats"><div><strong>${formatTime(run.elapsed)}</strong><span>JOURNEY</span></div><div><strong>${run.clan.population}</strong><span>PEOPLE</span></div><div><strong>${run.clan.region + 1}/4</strong><span>PASTURES</span></div></div><nav class="main-menu"><button class="menu-button featured" data-action="restart" data-primary>RAISE THE BANNERS AGAIN <span>→</span></button>${won ? '<button class="menu-button" data-action="epilogue">Read the epilogue</button>' : ''}<button class="menu-button" data-action="story-log">Our remembered road</button>${quit}</nav></section>`;
    }
    if (scroll !== undefined) this.overlay.querySelector('.tree-scroll')!.scrollTop = scroll;
    if (focusKey) {
      const target = [...this.overlay.querySelectorAll<HTMLElement>('[data-focus-key]')].find(
        (entry) => entry.dataset.focusKey === focusKey,
      );
      if (target) {
        target.focus({ preventScroll: true });
        if (target instanceof HTMLInputElement && selection !== null)
          target.setSelectionRange(selection, selection);
        return;
      }
    }
    this.overlay.scrollTop = 0;
    this.overlay
      .querySelector<HTMLButtonElement>(
        '[data-primary], .tree-node[aria-disabled="false"], [data-building]:not(:disabled), [data-route], [role="tab"][aria-selected="true"], [data-action="sound"]',
      )
      ?.focus({ preventScroll: true });
    if (!this.overlay.contains(document.activeElement))
      this.overlay
        .querySelector<HTMLButtonElement>('button:not(:disabled)')
        ?.focus({ preventScroll: true });
  }

  private handleMenuClick(event: MouseEvent): void {
    const button = (event.target as Element).closest<HTMLButtonElement>('button');
    if (!button || button.disabled || button.getAttribute('aria-disabled') === 'true') return;
    const action = button.dataset.action;
    if (button.dataset.treeFilter && this.lastSnapshot) {
      this.treeView().category = button.dataset.treeFilter;
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
    else if (action === 'begin') this.scene.startRun();
    else if (action === 'guidance') this.scene.toggleGuidance();
    else if (action === 'resume') this.scene.togglePause();
    else if (action === 'restart') this.scene.restart();
    else if (action === 'settings' || action === 'help') this.scene.openUtilityMenu(action);
    else if (action === 'back') this.scene.closePlanning();
    else if (action === 'quit') void this.platform.desktop?.quit();
    else if (action === 'research') this.scene.openResearch();
    else if (action === 'build') this.scene.openBuildings();
    else if (action === 'routes') this.scene.openRoutes();
    else if (action === 'sound') {
      this.scene.toggleAudio();
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
    else if (button.dataset.building)
      this.scene.construct(button.dataset.building as BuildingId, button.dataset.path);
    else if (button.dataset.route) this.scene.chooseRoute(button.dataset.route);
    else if (button.dataset.tab) this.selectJournalTab(button.dataset.tab as JournalTab);
  }

  private updateSettingsControls(): void {
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
    return [...this.overlay.querySelectorAll<HTMLElement>('button:not(:disabled), summary')];
  }
  private handleMenuKey(event: KeyboardEvent): void {
    // Holding Confirm must not race through chapters or activate the next screen.
    if (event.repeat && ['Enter', ' '].includes(event.key)) {
      event.preventDefault();
      return;
    }
    if (this.phase === 'intro' && ['ArrowLeft', 'ArrowRight'].includes(event.key)) {
      event.preventDefault();
      event.stopPropagation();
      if (!event.repeat) this.scene.advanceIntro(event.key === 'ArrowRight' ? 1 : -1);
      return;
    }
    if (
      ['upgrade', 'building'].includes(this.phase) &&
      ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key) &&
      !(event.target instanceof HTMLInputElement)
    ) {
      event.preventDefault();
      event.stopPropagation();
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
    if (event.shiftKey && document.activeElement === first) {
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
}
