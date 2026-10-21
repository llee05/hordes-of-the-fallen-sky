import { GAME } from '../game/config';
import { FORMATIONS, REGIONS } from '../game/data/clan';
import type { ArenaScene } from '../game/scenes/ArenaScene';
import {
  assignedWorkers,
  availableFormations,
  burningTempest,
  canMigrate,
  clanDoctrine,
  riderCount,
} from '../game/state/clan';
import { formatTime } from '../game/state/run';
import type { BuildingId, HudSnapshot, RunPhase, UpgradeDefinition } from '../game/types';
import type { GamePlatform } from '../platform/GamePlatform';
import {
  buildingMenu,
  helpMenu,
  journalMenu,
  routeMenu,
  settingsMenu,
  traditionMenu,
} from './menuContent';
import type { JournalTab } from './menuContent';

const emblem =
  '<svg viewBox="0 0 40 40" fill="none" aria-hidden="true"><path d="M20 3v8m0 18v8M6 11l6 5m16 8 6 5M6 29l6-5m16-8 6-5" stroke="currentColor" stroke-width="2"/><path d="m20 11 9 9-9 9-9-9 9-9Z" stroke="currentColor" stroke-width="2"/><circle cx="20" cy="20" r="3" fill="currentColor"/></svg>';

export class GameUI {
  readonly canvasParent: HTMLElement;
  private readonly overlay: HTMLElement;
  private phase: RunPhase = 'ready';
  private fullscreen = false;
  private journalTab: JournalTab = 'journey';
  private lastSnapshot?: HudSnapshot;
  private lastMessage = '';
  private toastTimer?: number;

  constructor(
    private readonly root: HTMLElement,
    private readonly scene: ArenaScene,
    private readonly platform: GamePlatform,
  ) {
    root.dataset.phase = 'ready';
    root.innerHTML = `<main class="game-shell" aria-label="Hordes of the Fallen Sky game">
      <div class="arena-wrap" id="arena-wrap" tabindex="0" aria-label="Game arena. WASD to ride. Space to gallop. B to build. M to migrate. F for formation. Tab or J for the clan chronicle. Escape to pause.">
        <div id="game-canvas"></div>
        <div class="screen-shade" aria-hidden="true"></div>
        <div class="game-hud" id="game-hud" inert>
          <section class="resource-hud hud-surface" aria-label="Clan resources">
            <div class="resource-row">${[
              ['population', '⚑', 'People', '8'],
              ['herd', '♧', 'Herd', '3'],
              ['food', '◒', 'Food', '70'],
              ['materials', '▱', 'Materials', '50'],
              ['spirit', '✧', 'Spirit', '0'],
            ]
              .map(
                ([id, icon, label, value]) =>
                  `<div class="resource" title="${label}"><span class="resource-icon" aria-hidden="true">${icon}</span><div><span>${label}</span><strong id="${id}">${value}</strong></div></div>`,
              )
              .join('')}</div>
            <div class="host-summary"><span id="doctrine">A people taking shape</span><span><b id="riders">1</b> RIDERS &nbsp; <b id="workers">0 / 8</b> WORKERS</span></div>
          </section>
          <div class="expedition-clock"><strong id="timer">00:00</strong><span id="stage-label">ENCAMPMENT</span></div>
          <nav class="hud-menu" aria-label="Game menus"><button id="journal" class="hud-menu-button" title="Clan chronicle (Tab / J)" aria-label="Open clan chronicle" aria-keyshortcuts="Tab J"><span>◇</span><kbd>TAB</kbd></button><button id="pause" class="hud-menu-button" aria-label="Pause" title="Pause (Escape)"><span>Ⅱ</span><kbd>ESC</kbd></button></nav>
          <section class="objective-hud hud-surface" aria-label="Current objective"><div class="objective-heading"><span id="region-count">01 / 04</span><strong id="location">GOLDEN PASTURE</strong><span id="camp-age">DAY 1</span></div><p id="objective">Build the camp. Protect your people.</p><div class="pressure-row"><span>PASTURE <b id="pasture">100%</b></span><span>CALAMITY <b id="threat">0%</b></span></div><div class="pressure-tracks"><div class="track pasture-track"><div id="pasture-fill"></div></div><div class="track threat-track"><div id="threat-fill"></div></div></div><div id="migration-progress" hidden><div class="meter-row"><span id="progress-label">Crossing</span><b id="crossing">0%</b></div><div class="track"><div id="crossing-fill"></div></div></div><p class="objective-hint" id="migration-hint">New routes in 45s.</p></section>
          <div id="clan-bearing" class="clan-bearing"></div><div id="synergy" class="synergy" hidden>ϟ THE BURNING TEMPEST</div>
          <div id="boss-bar" class="boss-bar" hidden><span>THE SKYBREAKER</span><div class="track"><div id="boss-fill"></div></div></div>
          <section class="vitals-hud hud-surface" aria-label="Commander and clan health"><div class="health-heading"><span>COMMANDER</span><b id="health">100 / 100</b></div><div class="track health-track"><div id="health-fill"></div></div><div class="health-heading clan-health"><span>CLAN RESOLVE</span><b id="integrity">100%</b></div><div class="track resolve-track"><div id="integrity-fill"></div></div><div class="vital-stats"><span>BOW <b id="power">16</b></span><span id="momentum">MOMENTUM 0%</span></div></section>
          <section class="tradition-hud" aria-label="Run progression"><span>TRADITION <b id="level">01</b> <small>· <span id="blessing-count">0</span> LEARNED</small></span><div class="xp-track"><div id="xp-fill"></div></div><small><b id="kills">0</b> BANISHED</small></section>
          <button id="dash" class="dash-button hud-surface" aria-label="Dash"><span class="dash-symbol">»</span><div><strong>GALLOP</strong><small id="dash-label">SPACE / READY</small></div><span class="dash-charge" id="dash-charge"></span></button>
          <nav class="command-dock" aria-label="Clan commands"><button id="build" class="command-button" title="Develop camp (B)"><span class="command-icon">⌂</span><span>Develop camp</span><kbd>B</kbd></button><button id="formation" class="command-button" title="Change formation (F)"><span class="command-icon">➶</span><span id="formation-name">Caravan guard</span><kbd>F</kbd></button><button id="migrate" class="command-button migrate-button" title="Pack & migrate (M)" disabled><span class="command-icon">⚑</span><span>Pack & migrate</span><kbd>M</kbd></button></nav>
          <div class="chronicle-toast" id="chronicle-toast"><span aria-hidden="true">✧</span><p id="clan-message"></p></div>
        </div>
        <div id="overlay" class="overlay ready-screen" role="dialog" aria-modal="true" aria-labelledby="overlay-title" tabindex="-1"></div>
        <div id="menu-record" class="menu-record"><span>LONGEST JOURNEY</span><strong id="best">— — : — —</strong></div>
        <div id="save-alert" class="save-alert" role="alert" hidden>Progress could not be saved.</div>
        <p id="run-status" class="sr-only" role="status">THE SKY IS WAITING</p>
      </div>
    </main>`;
    this.canvasParent = this.get('game-canvas');
    this.overlay = this.get('overlay');
    this.get('pause').addEventListener('click', () => scene.togglePause());
    this.get('journal').addEventListener('click', () => scene.toggleJournal());
    this.get('dash').addEventListener('click', () => scene.dash());
    this.get('build').addEventListener('click', () => scene.openBuildings());
    this.get('migrate').addEventListener('click', () => scene.openRoutes());
    this.get('formation').addEventListener('click', () => scene.cycleFormation());
    this.overlay.addEventListener('click', (event) => this.handleMenuClick(event));
    this.overlay.addEventListener('keydown', (event) => this.handleMenuKey(event));
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
      onPhase: (snapshot, choices) => this.renderPhase(snapshot, choices),
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
    this.get(id).textContent = String(value);
  }
  private meter(id: string, value: number): void {
    this.get(id).style.width = `${Math.max(0, Math.min(100, value))}%`;
  }

  private update(snapshot: HudSnapshot): void {
    this.lastSnapshot = snapshot;
    const { run, dashReady, best, bossHealth, clanBearing } = snapshot;
    const clan = run.clan;
    const region = REGIONS[clan.region]!;
    this.text('timer', formatTime(run.elapsed));
    this.text('level', run.level.toString().padStart(2, '0'));
    this.text('kills', run.kills);
    this.text('clan-bearing', clanBearing);
    this.text('health', `${Math.ceil(run.health)} / ${run.stats.maxHealth}`);
    this.meter('health-fill', (run.health / run.stats.maxHealth) * 100);
    this.get('health-fill').classList.toggle('low', run.health < run.stats.maxHealth * 0.3);
    this.meter('xp-fill', (run.xp / run.nextLevelXp) * 100);
    this.meter('dash-charge', dashReady * 100);
    this.text(
      'dash-label',
      dashReady >= 1
        ? 'SPACE / READY'
        : `RECHARGING ${((1 - dashReady) * GAME.dash.cooldown).toFixed(1)}s`,
    );
    this.text('momentum', `MOMENTUM ${Math.round(clan.momentum * 100)}%`);
    for (const id of ['population', 'herd', 'food', 'materials', 'spirit'] as const)
      this.text(id, Math.floor(clan[id]));
    this.get('food').classList.toggle('danger', clan.food < 15);
    this.text('doctrine', clanDoctrine(run));
    this.text('riders', riderCount(run));
    this.text('workers', `${assignedWorkers(run)} / ${clan.population}`);
    this.text('power', Math.round(run.stats.damage));
    this.text('integrity', `${Math.ceil(clan.integrity)}%`);
    this.meter('integrity-fill', clan.integrity);
    this.text('pasture', `${Math.ceil(clan.pasture)}%`);
    this.meter('pasture-fill', clan.pasture);
    this.text('threat', `${Math.round(clan.threat)}%`);
    this.meter('threat-fill', clan.threat);
    this.text('location', region.short);
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
          ? 'Hold until the mountain passage opens.'
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
    this.text('formation-name', FORMATIONS[clan.formation].title);
    (this.get('build') as HTMLButtonElement).disabled =
      run.phase !== 'playing' || clan.stage === 'migration';
    (this.get('migrate') as HTMLButtonElement).disabled =
      run.phase !== 'playing' || !canMigrate(run);
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

  private renderPhase(snapshot: HudSnapshot, choices: readonly UpgradeDefinition[]): void {
    const { run } = snapshot;
    if (run.phase === 'playing' && this.phase === 'ready') this.showMessage();
    this.phase = run.phase;
    this.root.dataset.phase = run.phase;
    this.get('game-hud').inert = run.phase !== 'playing';
    this.get('game-hud').setAttribute(
      'aria-hidden',
      String(run.phase === 'ready' || run.phase === 'settings' || run.phase === 'help'),
    );
    this.get('menu-record').hidden = !['ready', 'paused', 'dead', 'won'].includes(run.phase);
    // Transfer focus before hiding or removing the focused menu control.
    if (run.phase === 'playing') this.get('arena-wrap').focus({ preventScroll: true });
    this.overlay.hidden = run.phase === 'playing';
    this.overlay.className = `overlay ${run.phase === 'ready' ? 'ready-screen' : ['building', 'route', 'journal', 'upgrade', 'settings', 'help'].includes(run.phase) ? 'planning' : 'pause-screen'}`;
    const labels: Record<RunPhase, string> = {
      ready: 'THE SKY IS WAITING',
      playing: 'THE CLAN ENDURES',
      paused: 'EXPEDITION PAUSED',
      upgrade: 'A TRADITION IS BORN',
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
    if (run.phase === 'ready') {
      this.overlay.innerHTML = `<section class="title-menu"><div class="title-emblem">${emblem}</div><p class="eyebrow">WHEN HEAVEN WENT SILENT</p><h1 id="overlay-title"><span class="title-prefix">Hordes of the</span> <em>Fallen Sky</em></h1><p class="title-tagline">You don’t build a city.<br>You build a people.</p><nav class="main-menu" aria-label="Main menu"><button class="menu-button featured" data-action="begin" data-primary>LEAD YOUR PEOPLE <span>→</span></button><button class="menu-button" data-action="help">How to play</button><button class="menu-button" data-action="settings">Settings</button>${quit}</nav><p class="title-caption">A journey across the living steppe.</p></section>`;
    } else if (run.phase === 'paused') {
      this.overlay.innerHTML = `<section class="pause-menu"><p class="eyebrow">EXPEDITION PAUSED</p><h2 id="overlay-title">A quiet moment.</h2><p class="panel-intro">Your people will be here when you return.</p><nav class="main-menu" aria-label="Pause menu"><button class="menu-button featured" data-action="resume" data-primary>RETURN TO THE STEPPE <span>→</span></button><button class="menu-button" data-action="restart">Start a new run</button><button class="menu-button" data-action="settings">Settings</button><button class="menu-button" data-action="help">How to play</button>${quit}</nav></section>`;
    } else if (run.phase === 'building') this.overlay.innerHTML = buildingMenu(run);
    else if (run.phase === 'route') this.overlay.innerHTML = routeMenu(run);
    else if (run.phase === 'upgrade') this.overlay.innerHTML = traditionMenu(run, choices);
    else if (run.phase === 'journal') this.overlay.innerHTML = journalMenu(run, this.journalTab);
    else if (run.phase === 'settings')
      this.overlay.innerHTML = settingsMenu(this.platform.profile.muted, this.fullscreen);
    else if (run.phase === 'help') this.overlay.innerHTML = helpMenu();
    else {
      const won = run.phase === 'won';
      this.overlay.innerHTML = `<section class="end-menu"><div class="title-emblem">${emblem}</div><p class="eyebrow">${won ? 'A PEOPLE, STILL ALIVE' : 'THE STEPPE WILL REMEMBER'}</p><h2 id="overlay-title">${won ? 'A sky worth saving.' : 'The banners fall.'}</h2><p class="panel-intro">${won ? `${run.clan.population} people and ${run.clan.herd} animals reach the mountain passage.<br>Your civilization lives to see another sky.` : 'The journey ends here. Another clan will take up the blue banner.'}</p><div class="end-stats"><div><strong>${formatTime(run.elapsed)}</strong><span>JOURNEY</span></div><div><strong>${run.clan.population}</strong><span>PEOPLE</span></div><div><strong>${run.clan.region + 1}/4</strong><span>PASTURES</span></div></div><nav class="main-menu"><button class="menu-button featured" data-action="restart" data-primary>RAISE THE BANNERS AGAIN <span>→</span></button>${quit}</nav></section>`;
    }
    this.overlay.scrollTop = 0;
    this.overlay
      .querySelector<HTMLButtonElement>(
        '[data-primary], [data-upgrade], [data-building]:not(:disabled), [data-route], [role="tab"][aria-selected="true"], [data-action="sound"]',
      )
      ?.focus({ preventScroll: true });
    if (!this.overlay.contains(document.activeElement))
      this.overlay
        .querySelector<HTMLButtonElement>('button:not(:disabled)')
        ?.focus({ preventScroll: true });
  }

  private handleMenuClick(event: MouseEvent): void {
    const button = (event.target as Element).closest<HTMLButtonElement>('button');
    if (!button || button.disabled) return;
    const action = button.dataset.action;
    if (action === 'begin') this.scene.startRun();
    else if (action === 'resume') this.scene.togglePause();
    else if (action === 'restart') this.scene.restart();
    else if (action === 'settings' || action === 'help') this.scene.openUtilityMenu(action);
    else if (action === 'back') this.scene.closePlanning();
    else if (action === 'quit') void this.platform.desktop?.quit();
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
    } else if (button.dataset.upgrade !== undefined)
      this.scene.selectUpgrade(Number(button.dataset.upgrade));
    else if (button.dataset.building)
      this.scene.construct(
        button.dataset.building as BuildingId,
        button.dataset.path === undefined ? undefined : Number(button.dataset.path),
      );
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
    this.renderPhase(this.lastSnapshot, []);
    this.get(`tab-${tab}`).focus();
  }

  private menuButtons(): HTMLButtonElement[] {
    return [...this.overlay.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')];
  }
  private handleMenuKey(event: KeyboardEvent): void {
    const button = (event.target as Element).closest<HTMLButtonElement>('[role="tab"]');
    if (button && ['ArrowLeft', 'ArrowRight'].includes(event.key)) {
      event.preventDefault();
      event.stopPropagation();
      const tabs: JournalTab[] = ['journey', 'clan', 'traditions'];
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
    else buttons[(index + (action === 'next' ? 1 : -1) + buttons.length) % buttons.length]?.focus();
  }
}
