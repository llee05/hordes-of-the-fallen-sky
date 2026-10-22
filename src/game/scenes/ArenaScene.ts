import Phaser from 'phaser';
import {
  ART_WIDTH,
  artTexture,
  createPainterlyEffects,
  paintedImage,
  preloadPainterlyArt,
  styleActor,
} from '../assets/painterlyArt';
import { SteppeLandscape } from '../assets/SteppeLandscape';
import { CharacterMotion, isCharacterKind } from '../animation/CharacterMotion';
import { DefeatSprites, renderCharacter } from '../animation/CharacterVisuals';
import { GAME } from '../config';
import { chooseEnemy, SKYBREAKER, spawnInterval } from '../data/enemies';
import { FORMATIONS, ROUTES } from '../data/clan';
import { INTRO_SLIDES } from '../data/intro';
import { openNextStory, resolveStory } from '../state/story';
import {
  advanceClan,
  availableFormations,
  beginMigration,
  buildStructure,
  burningTempest,
  canMigrate,
  damageClan,
  hasDevelopment,
  riderCount,
} from '../state/clan';
import { UPGRADES } from '../data/upgrades';
import { Enemy, Gem, Projectile } from '../entities/actors';
import { applyUpgrade, createRun, gainExperience, redeemMasteredResearch } from '../state/run';
import {
  advancePatrons,
  damageCommander,
  friendlyDamageMultiplier,
  gallopCooldown,
  rewardPatronKill,
  terrainSpeedMultiplier,
} from '../state/patrons';
import { PatronSupport } from '../systems/PatronSupport';
import { GameAudio } from '../systems/Audio';
import { SpatialHash } from '../systems/SpatialHash';
import { ActionKeys } from '../systems/ActionKeys';
import { GamepadInput } from '../systems/GamepadInput';
import type { GamePlatform } from '../../platform/GamePlatform';
import type { BuildingId, EnemyDefinition, HudSnapshot, RunState } from '../types';

export interface ArenaCallbacks {
  onHud: (snapshot: HudSnapshot) => void;
  onPhase: (snapshot: HudSnapshot) => void;
  onMenuInput: (action: 'next' | 'previous' | 'confirm') => void;
  onSaveError: () => void;
}

export class ArenaScene extends Phaser.Scene {
  run: RunState = createRun();
  private player!: Phaser.Physics.Arcade.Sprite;
  private shadow!: Phaser.GameObjects.Image;
  private aura!: Phaser.GameObjects.Arc;
  private enemies!: Phaser.Physics.Arcade.Group;
  private projectiles!: Phaser.Physics.Arcade.Group;
  private camp!: Phaser.GameObjects.Container;
  private riders: Phaser.GameObjects.Image[] = [];
  private hostileShots!: Phaser.Physics.Arcade.Group;
  private campLabel!: Phaser.GameObjects.Text;
  private landscape!: SteppeLandscape;
  private riderShadows: Phaser.GameObjects.Image[] = [];
  private readonly playerMotion = new CharacterMotion('player');
  private riderMotions: CharacterMotion[] = [];
  private riderSpeeds: number[] = [];
  private defeats!: DefeatSprites;
  private patronSupport!: PatronSupport;
  private enemyShadows = new Map<Enemy, Phaser.GameObjects.Image>();
  private dustTimer = 0;
  private supportTimer = 0;
  private wagonTimer = 0;
  private wardTimer = 0;
  private boss?: Enemy;
  private hazards: {
    x: number;
    y: number;
    remaining: number;
    warning: Phaser.GameObjects.Graphics;
  }[] = [];
  private hazardTimer = 8;
  private gems!: Phaser.Physics.Arcade.Group;
  private keys!: Record<
    'up' | 'down' | 'left' | 'right' | 'w' | 'a' | 's' | 'd',
    Phaser.Input.Keyboard.Key
  >;
  private readonly spatial = new SpatialHash<Enemy>();
  private readonly audio = new GameAudio();
  private readonly controller = new GamepadInput();
  private readonly actionKeys = new ActionKeys();
  private controllerMove = new Phaser.Math.Vector2();
  private callbacks?: ArenaCallbacks;
  private spawnTimer = 0;
  private attackTimer = 0;
  private dashTimer = 0;
  private dashRemaining = 0;
  private invulnerable = 0;
  private hudTimer = 0;
  private best = 0;
  private researchReturnPhase: 'playing' | 'journal' | 'paused' = 'playing';
  private utilityReturnPhase: 'ready' | 'paused' = 'ready';
  private introSlide = 0;
  private introStartsRun = false;
  private storiesEnabled = true;
  private storyLogReturn: 'paused' | 'won' | 'dead' = 'paused';
  private facing = new Phaser.Math.Vector2(0, 1);
  private touchMove = new Phaser.Math.Vector2();
  private dragOrigin?: Phaser.Math.Vector2;
  private joystick?: Phaser.GameObjects.Graphics;

  constructor(private readonly platform: GamePlatform) {
    super('arena');
    this.audio.muted = platform.profile.muted;
  }

  connect(callbacks: ArenaCallbacks): void {
    this.callbacks = callbacks;
    if (this.player) this.publishPhase();
  }

  preload(): void {
    preloadPainterlyArt(this);
  }

  create(): void {
    this.run = createRun();
    this.run.story.enabled = this.storiesEnabled;
    this.storyLogReturn = 'paused';
    this.introSlide = 0;
    this.introStartsRun = false;
    this.spawnTimer = 0;
    this.attackTimer = 0;
    this.dashTimer = 0;
    this.dashRemaining = 0;
    this.invulnerable = 0;
    this.hudTimer = 0;
    this.researchReturnPhase = 'playing';
    this.utilityReturnPhase = 'ready';
    this.supportTimer = 0;
    this.wagonTimer = 0;
    this.wardTimer = 0;
    this.riders = [];
    this.riderShadows = [];
    this.riderMotions = [];
    this.riderSpeeds = [];
    this.playerMotion.reset('player');
    this.enemyShadows.clear();
    this.dustTimer = 0;
    this.boss = undefined;
    this.hazards = [];
    this.hazardTimer = 8;
    this.facing.set(0, 1);
    this.touchMove.set(0, 0);
    this.dragOrigin = undefined;
    this.best = this.platform.profile.bestSeconds;

    createPainterlyEffects(this);
    this.defeats = new DefeatSprites(this);
    this.physics.world.setBounds(0, 0, GAME.worldSize, GAME.worldSize);
    this.landscape = new SteppeLandscape(this);
    const center = GAME.worldSize / 2;
    this.camp = this.add.container(center, center).setDepth(100 + center);
    this.refreshCamp();
    this.campLabel = this.add
      .text(center, center - 125, 'YOUR CLAN', {
        fontFamily: 'Georgia',
        fontSize: '11px',
        color: '#f5e6bf',
        backgroundColor: '#34483bb3',
        padding: { x: 8, y: 4 },
      })
      .setOrigin(0.5)
      .setDepth(9500);
    for (let i = 0; i < 16; i += 1) {
      this.riders.push(paintedImage(this, center, center, 'rider').setVisible(false));
      this.riderMotions.push(new CharacterMotion('rider', i * 0.137));
      this.riderSpeeds.push(0);
      this.riderShadows.push(
        this.add.image(center, center, 'shadow').setDisplaySize(48, 18).setVisible(false),
      );
    }
    this.shadow = this.add.image(center, center, 'shadow').setDisplaySize(64, 24).setAlpha(0.85);
    this.aura = this.add
      .circle(center, center, 24, 0x9bc9c3, 0.02)
      .setStrokeStyle(1, 0xe9dfaf, 0.45)
      .setScale(1, 0.5)
      .setDepth(2);
    this.player = this.physics.add
      .sprite(center, center + 100, ...artTexture('player'))
      .setCollideWorldBounds(true);
    styleActor(this.player, 'player', ART_WIDTH.player!, 10);
    this.patronSupport = new PatronSupport(this, this.player);

    this.enemies = this.physics.add.group({
      classType: Enemy,
      maxSize: GAME.maxEnemies,
      runChildUpdate: false,
    });
    this.projectiles = this.physics.add.group({
      classType: Projectile,
      maxSize: GAME.maxProjectiles,
    });
    this.gems = this.physics.add.group({ classType: Gem, maxSize: GAME.maxGems });
    this.hostileShots = this.physics.add.group({ classType: Projectile, maxSize: 180 });
    this.physics.add.overlap(this.hostileShots, this.player, (shot) => {
      if (this.run.phase !== 'playing' || !(shot as Projectile).active) return;
      const damage = (shot as Projectile).damage;
      (shot as Projectile).disableBody(true, true);
      this.takeDamage(damage);
    });
    // Collision callbacks only deactivate bodies; Phaser retains pooled objects.
    this.physics.add.overlap(this.projectiles, this.enemies, (bolt, enemy) =>
      this.hitEnemy(bolt as Projectile, enemy as Enemy),
    );
    this.physics.add.overlap(this.player, this.enemies, (_player, enemy) =>
      this.hurtPlayer(enemy as Enemy),
    );

    this.cameras.main.setBounds(0, 0, GAME.worldSize, GAME.worldSize);
    this.cameras.main.startFollow(this.player, true, 0.09, 0.09);
    this.cameras.main.roundPixels = false;
    this.cameras.main.setFollowOffset(120, 0);

    this.keys = this.input.keyboard!.addKeys({
      up: 'UP',
      down: 'DOWN',
      left: 'LEFT',
      right: 'RIGHT',
      w: 'W',
      a: 'A',
      s: 'S',
      d: 'D',
    }) as typeof this.keys;
    const bindAction = (key: string, action: () => void): void => {
      this.input.keyboard!.on(`keydown-${key}`, (event: KeyboardEvent) => {
        if (
          key !== 'ESC' &&
          event.target instanceof HTMLElement &&
          event.target.closest('input, textarea, select')
        )
          return;
        if (this.actionKeys.consume(event)) action();
      });
    };
    bindAction('ESC', () => this.togglePause());
    bindAction('P', () => this.togglePause());
    bindAction('B', () => this.openBuildings());
    bindAction('M', () => this.openRoutes());
    bindAction('F', () => this.cycleFormation());
    bindAction('J', () => this.toggleJournal());
    bindAction('T', () => this.openResearch());
    this.input.keyboard!.on('keydown-TAB', (event: KeyboardEvent) => {
      if (this.run.phase !== 'playing' || !this.actionKeys.consume(event)) return;
      event.preventDefault();
      this.toggleJournal();
    });
    // Native Space activation remains available to focused menu buttons.
    this.input.keyboard!.removeCapture('SPACE');
    bindAction('SPACE', () => this.dash());

    // Drag anywhere in the arena for analog movement on touch screens.
    this.joystick = this.add.graphics().setScrollFactor(0).setDepth(10000);
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.wasTouch && this.run.phase === 'playing')
        this.dragOrigin = new Phaser.Math.Vector2(pointer.x, pointer.y);
    });
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.dragOrigin) return;
      this.touchMove
        .set(pointer.x - this.dragOrigin.x, pointer.y - this.dragOrigin.y)
        .limit(45)
        .scale(1 / 45);
    });
    this.input.on('pointerup', () => this.clearTouch());
    this.input.on('pointerupoutside', () => this.clearTouch());
    this.game.events.on(Phaser.Core.Events.BLUR, this.pauseOnBlur, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off(Phaser.Core.Events.BLUR, this.pauseOnBlur, this);
      this.input.keyboard!.removeAllListeners();
      this.clearTouch();
    });
    this.physics.pause();
    this.tweens.pauseAll();
    this.publishPhase();
  }

  startRun(): void {
    if (this.run.phase !== 'ready') return;
    this.audio.unlock();
    this.introSlide = 0;
    this.introStartsRun = true;
    this.setPhase('intro');
  }

  private beginExpedition(): void {
    this.cameras.main.setFollowOffset(0, 0);
    this.setPhase('playing');
    this.presentStory();
  }

  toggleStoryMode(): void {
    if (this.run.phase !== 'ready') return;
    this.storiesEnabled = !this.storiesEnabled;
    this.run.story.enabled = this.storiesEnabled;
    this.publishPhase();
  }

  private presentStory(): boolean {
    if (!openNextStory(this.run)) return false;
    this.setPhase('story');
    return true;
  }

  chooseStory(choice?: string): void {
    if (this.run.phase !== 'story' || !resolveStory(this.run, choice)) return;
    // Check for a queued arrival beat before resuming any simulation.
    this.run.phase = 'playing';
    if (this.presentStory()) return;
    redeemMasteredResearch(this.run);
    this.setPhase('playing');
  }

  showEpilogue(): void {
    if (this.run.phase === 'won') this.setPhase('epilogue');
  }

  closeEpilogue(): void {
    if (this.run.phase === 'epilogue') this.setPhase('won');
  }

  openStoryLog(): void {
    const phase = this.run.phase;
    if (phase !== 'paused' && phase !== 'won' && phase !== 'dead') return;
    this.storyLogReturn = phase;
    this.setPhase('story-log');
  }

  replayIntro(): void {
    if (this.run.phase !== 'ready') return;
    this.introSlide = 0;
    this.introStartsRun = false;
    this.setPhase('intro');
  }

  advanceIntro(direction: -1 | 1): void {
    if (this.run.phase !== 'intro') return;
    const next = Math.max(0, this.introSlide + direction);
    if (next >= INTRO_SLIDES.length) this.skipIntro();
    else if (next !== this.introSlide) {
      this.introSlide = next;
      this.publishPhase();
    }
  }

  skipIntro(): void {
    if (this.run.phase !== 'intro') return;
    const startsRun = this.introStartsRun;
    this.introStartsRun = false;
    if (startsRun) this.beginExpedition();
    else this.setPhase('ready');
  }

  restart(): void {
    this.scene.restart();
  }

  togglePause(): void {
    if (this.run.phase === 'intro') this.skipIntro();
    else if (this.run.phase === 'story') this.chooseStory();
    else if (this.run.phase === 'epilogue') this.closeEpilogue();
    else if (this.run.phase === 'story-log') this.closePlanning();
    else if (this.run.phase === 'playing') this.setPhase('paused');
    else if (this.run.phase === 'paused') this.setPhase('playing');
    else if (
      ['building', 'route', 'journal', 'upgrade', 'settings', 'help'].includes(this.run.phase)
    )
      this.closePlanning();
  }

  openBuildings(): void {
    if (['playing', 'journal'].includes(this.run.phase) && this.run.clan.stage !== 'migration')
      this.setPhase('building');
    else if (this.run.phase === 'building') this.closePlanning();
  }

  openRoutes(): void {
    if (
      ['playing', 'journal'].includes(this.run.phase) &&
      canMigrate(this.run) &&
      this.presentStory()
    )
      return;
    if (['playing', 'journal'].includes(this.run.phase) && canMigrate(this.run))
      this.setPhase('route');
    else if (this.run.phase === 'route') this.closePlanning();
  }

  closePlanning(): void {
    if (this.run.phase === 'upgrade') {
      this.setPhase(this.researchReturnPhase);
      return;
    }
    if (this.run.phase === 'story-log') {
      this.setPhase(this.storyLogReturn);
      return;
    }
    if (['building', 'route', 'journal'].includes(this.run.phase)) this.setPhase('playing');
    else if (['settings', 'help'].includes(this.run.phase)) this.setPhase(this.utilityReturnPhase);
  }

  toggleJournal(): void {
    if (this.run.phase === 'playing') this.setPhase('journal');
    else if (this.run.phase === 'journal') this.setPhase('playing');
  }

  openResearch(): void {
    const phase = this.run.phase;
    if (phase === 'upgrade') {
      this.closePlanning();
      return;
    }
    if (phase !== 'playing' && phase !== 'journal' && phase !== 'paused') return;
    this.researchReturnPhase = phase;
    this.setPhase('upgrade');
  }

  openUtilityMenu(menu: 'settings' | 'help'): void {
    if (this.run.phase !== 'ready' && this.run.phase !== 'paused') return;
    this.utilityReturnPhase = this.run.phase;
    this.setPhase(menu);
  }

  construct(id: BuildingId, path?: string): void {
    const previousCooldown = gallopCooldown(this.run);
    if (!buildStructure(this.run, id, path)) return;
    this.dashTimer *= gallopCooldown(this.run) / previousCooldown;
    this.refreshCamp();
    this.audio.play('level');
    this.publishPhase();
  }

  chooseRoute(id: string): void {
    if (!beginMigration(this.run, id)) return;
    this.refreshCamp();
    this.setPhase('playing');
  }

  cycleFormation(): void {
    if (this.run.phase !== 'playing') return;
    const formations = availableFormations(this.run);
    this.run.clan.formation =
      formations[(formations.indexOf(this.run.clan.formation) + 1) % formations.length]!;
    this.run.clan.message = FORMATIONS[this.run.clan.formation].description;
    this.callbacks?.onHud(this.snapshot());
  }

  toggleAudio(): boolean {
    this.audio.muted = !this.audio.muted;
    void this.platform.saveMuted(this.audio.muted).catch(() => this.callbacks?.onSaveError());
    return this.audio.muted;
  }

  dash(): void {
    if (this.run.phase !== 'playing' || this.dashTimer > 0) return;
    this.dashRemaining = GAME.dash.duration;
    this.dashTimer = gallopCooldown(this.run);
    this.invulnerable = Math.max(this.invulnerable, GAME.dash.duration);
    this.audio.play('dash');
    this.burst(this.player.x, this.player.y, 0xc8df9b, 7);
  }

  research(id: string, rank: number): void {
    const upgrade = UPGRADES.find((entry) => entry.id === id);
    const previousCooldown = gallopCooldown(this.run);
    if (this.run.phase !== 'upgrade' || !upgrade || !applyUpgrade(this.run, upgrade, rank)) return;
    this.audio.play('level');
    this.dashTimer *= gallopCooldown(this.run) / previousCooldown;
    this.run.clan.message = `${upgrade.title} — rank ${rank} learned.`;
    redeemMasteredResearch(this.run);
    this.publishPhase();
  }

  update(_time: number, delta: number): void {
    const controller = this.controller.poll();
    this.controllerMove.set(controller.x, controller.y);
    if (this.run.phase === 'intro') {
      if (controller.back || controller.pause) this.skipIntro();
      else {
        if (controller.next) this.callbacks?.onMenuInput('next');
        if (controller.previous) this.callbacks?.onMenuInput('previous');
        if (controller.confirm) this.callbacks?.onMenuInput('confirm');
      }
      return;
    }
    const phaseBeforeInput = this.run.phase;
    if (
      controller.pause ||
      (controller.back &&
        [
          'playing',
          'paused',
          'building',
          'upgrade',
          'route',
          'journal',
          'settings',
          'help',
          'story',
          'epilogue',
          'story-log',
        ].includes(this.run.phase))
    )
      this.togglePause();
    else if (controller.research) this.openResearch();
    else if (this.run.phase === 'playing') {
      if (controller.confirm) this.dash();
      if (controller.build) this.openBuildings();
      else if (controller.migrate) this.openRoutes();
      else if (controller.formation) this.cycleFormation();
      else if (controller.journal) this.toggleJournal();
    } else {
      if (controller.journal && this.run.phase === 'journal') this.toggleJournal();
      if (controller.next) this.callbacks?.onMenuInput('next');
      if (controller.previous) this.callbacks?.onMenuInput('previous');
      if (controller.confirm) this.callbacks?.onMenuInput('confirm');
    }
    if (this.run.phase !== phaseBeforeInput) return;
    if (this.run.phase !== 'playing') return;
    if (this.presentStory()) return;
    const dt = Math.min(delta / 1000, 0.05);
    this.run.elapsed += dt;
    advancePatrons(this.run, dt);
    this.dashTimer = Math.max(0, this.dashTimer - dt);
    this.invulnerable = Math.max(0, this.invulnerable - dt);
    this.dashRemaining = Math.max(0, this.dashRemaining - dt);
    const outcome = advanceClan(this.run, dt);
    if (outcome === 'lost') {
      this.finish('dead');
      return;
    }
    if (outcome === 'saved') {
      this.finish('won');
      return;
    }
    if (outcome === 'arrived') this.arrive();
    if (this.run.phase !== 'playing') return;
    this.updateCamp(dt);
    if (this.run.phase !== 'playing') return;
    this.movePlayer(dt);
    this.updateEnemies(dt);
    if (this.run.clan.integrity <= 0 || this.run.clan.population <= 0) {
      this.finish('dead');
      return;
    }
    this.spatial.rebuild(this.enemies.getChildren() as Enemy[]);
    this.updateSupport(dt);
    this.patronSupport.update(this.run, dt, this.player, this.camp, this.spatial, {
      damage: (enemy, amount) => this.damageEnemy(enemy, amount),
      volley: (x, y, target, multiplier) => this.shootVolley(x, y, target, 1, multiplier, true),
    });
    this.attackTimer -= dt;
    if (this.attackTimer <= 0) this.fire();
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnEnemy();
      this.spawnTimer =
        spawnInterval(this.run.clan.stageTime + this.run.clan.region * 65) /
        (this.run.clan.stage === 'migration'
          ? (ROUTES.find((r) => r.id === this.run.clan.routeId)?.danger ?? 1)
          : 1);
      if (this.run.clan.stageTime < 18 && this.run.clan.region === 0) this.spawnTimer = 2;
    }
    this.updateProjectiles(dt);
    this.collectGems(dt);
    if (this.run.phase !== 'playing') return;
    this.updateCharacterAnimations(dt);
    this.hudTimer -= dt;
    if (this.hudTimer <= 0) {
      this.hudTimer = 0.08;
      this.callbacks?.onHud(this.snapshot());
    }
    if (
      this.run.clan.stage === 'final' &&
      !this.run.clan.finalBossSpawned &&
      this.run.clan.stageTime >= 20
    ) {
      this.run.clan.finalBossSpawned = true;
      this.spawnEnemy(SKYBREAKER);
    }
    this.presentStory();
  }

  private movePlayer(dt: number): void {
    const x =
      Number(this.keys.right.isDown || this.keys.d.isDown) -
      Number(this.keys.left.isDown || this.keys.a.isDown);
    const y =
      Number(this.keys.down.isDown || this.keys.s.isDown) -
      Number(this.keys.up.isDown || this.keys.w.isDown);
    const movement = new Phaser.Math.Vector2(x, y);
    if (movement.lengthSq() > 0) movement.normalize();
    else if (this.controllerMove.lengthSq() > 0) movement.copy(this.controllerMove);
    else movement.copy(this.touchMove);
    const moving = movement.lengthSq() > 0.01;
    this.run.clan.momentum = Phaser.Math.Clamp(
      this.run.clan.momentum + dt * (moving ? 0.72 : -1.5),
      0,
      1,
    );
    if (moving) this.facing.copy(movement).normalize();
    if (this.dashRemaining > 0) movement.copy(this.facing).scale(GAME.dash.speed);
    else movement.scale(this.run.stats.speed);
    this.player.setVelocity(movement.x, movement.y);
    this.player.setFlipX(this.facing.x < 0);
    this.player.setAlpha(
      this.invulnerable > 0 ? (Math.floor(this.run.elapsed * 20) % 2 ? 0.5 : 0.85) : 1,
    );
    this.player.setDepth(100 + this.player.y);
    this.shadow.setPosition(this.player.x + 9, this.player.y + 5).setDepth(99 + this.player.y);
    this.dustTimer -= dt;
    if (moving && this.dustTimer <= 0) {
      const dust = this.add
        .image(this.player.x - this.facing.x * 14, this.player.y + 3, 'dust')
        .setDepth(98 + this.player.y)
        .setAlpha(this.dashRemaining > 0 ? 0.8 : 0.35)
        .setScale(0.4);
      this.tweens.add({
        targets: dust,
        alpha: 0,
        scale: 1.3,
        x: dust.x - this.facing.x * 15,
        duration: 700,
        onComplete: () => dust.destroy(),
      });
      this.dustTimer = 0.12;
    }
    this.aura.setPosition(this.player.x, this.player.y);
    this.joystick!.clear();
    if (this.dragOrigin) {
      this.joystick!.lineStyle(2, 0xc8df9b, 0.3).strokeCircle(
        this.dragOrigin.x,
        this.dragOrigin.y,
        45,
      );
      this.joystick!.fillStyle(0xc8df9b, 0.3).fillCircle(
        this.dragOrigin.x + this.touchMove.x * 45,
        this.dragOrigin.y + this.touchMove.y * 45,
        12,
      );
    }
  }

  private spawnEnemy(forced?: EnemyDefinition): void {
    const definition = forced ?? chooseEnemy(this.run.elapsed + this.run.clan.region * 80);
    const camera = this.cameras.main;
    const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
    // Spawn beyond the visible rectangle, including near the world boundaries.
    const distance = Math.min(
      (camera.width / 2 + 60) / Math.max(0.01, Math.abs(Math.cos(angle))),
      (camera.height / 2 + 60) / Math.max(0.01, Math.abs(Math.sin(angle))),
    );
    const anchor = Math.random() < 0.45 ? this.camp : this.player;
    const x = Phaser.Math.Clamp(anchor.x + Math.cos(angle) * distance, 24, GAME.worldSize - 24);
    const y = Phaser.Math.Clamp(anchor.y + Math.sin(angle) * distance, 24, GAME.worldSize - 24);
    if (Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y) < 200) return;
    const enemy = this.enemies.get(x, y, ...artTexture(definition.texture)) as Enemy | null;
    if (!enemy) return;
    enemy.enableBody(true, x, y, true, true);
    const width = (ART_WIDTH[definition.texture] ?? 50) * (definition.scale / (forced ? 4 : 2));
    styleActor(enemy, definition.texture, width, 5 * definition.scale);
    enemy.clearTint();
    if (!this.enemyShadows.has(enemy)) this.enemyShadows.set(enemy, this.add.image(x, y, 'shadow'));
    this.enemyShadows
      .get(enemy)!
      .setDisplaySize(width * 0.9, width * 0.3)
      .setVisible(true);
    enemy.definition = definition;
    enemy.health = definition.health * (forced ? 1 : 1 + this.run.elapsed / 1200);
    enemy.maxHealth = enemy.health;
    enemy.spawnId += 1;
    enemy.setAlpha(1).setAngle(0).setVelocity(0, 0);
    enemy.attackTimer = 1.5;
    enemy.clanAttackTimer = 0;
    enemy.chargeTimer = 0;
    enemy.burning = 0;
    if (forced) {
      this.boss = enemy;
      this.run.clan.message =
        'THE SKYBREAKER — hold the line. Your people are the victory condition.';
    }
    if (!isCharacterKind(definition.texture))
      throw new Error(`Missing character animation: ${definition.texture}`);
    enemy.motion.reset(definition.texture, Math.random());
    enemy.preparingAttack = false;
  }

  private updateEnemies(dt: number): void {
    const clan = this.run.clan;
    for (const enemy of this.enemies.getChildren() as Enemy[]) {
      const shadow = this.enemyShadows.get(enemy);
      shadow?.setVisible(enemy.active);
      if (!enemy.active) continue;
      enemy.setDepth(100 + enemy.y);
      shadow?.setPosition(enemy.x + 8, enemy.y + 5).setDepth(99 + enemy.y);
      enemy.attackTimer -= dt;
      enemy.clanAttackTimer -= dt;
      enemy.chargeTimer -= dt;
      const playerDistance = Phaser.Math.Distance.Between(
        enemy.x,
        enemy.y,
        this.player.x,
        this.player.y,
      );
      const campDistance = Phaser.Math.Distance.Between(enemy.x, enemy.y, this.camp.x, this.camp.y);
      if (playerDistance > 1600 && campDistance > 1600 && enemy !== this.boss) {
        enemy.disableBody(true, true);
        continue;
      }
      const target = campDistance < playerDistance * 1.25 ? this.camp : this.player;
      const distance = target === this.camp ? campDistance : playerDistance;
      const behavior = enemy.definition.behavior;
      let speed =
        enemy.definition.speed *
        (1 + clan.region * 0.1) *
        terrainSpeedMultiplier(this.run, Math.min(playerDistance, campDistance));
      if ((behavior === 'ranged' || behavior === 'boss') && distance < 260) speed = 0;
      if (behavior === 'charger' && enemy.chargeTimer <= 0) {
        enemy.chargeTimer = 3;
        enemy.motion.attack();
        const angle = Math.atan2(target.y - enemy.y, target.x - enemy.x);
        enemy.setData('chargeAngle', angle);
      }
      if (behavior === 'charger' && enemy.chargeTimer > 2.3) {
        const angle = enemy.getData('chargeAngle') as number;
        enemy.setVelocity(Math.cos(angle) * speed * 2.2, Math.sin(angle) * speed * 2.2);
      } else this.physics.moveToObject(enemy, target, speed);
      enemy.setFlipX(enemy.x > target.x);
      enemy.preparingAttack =
        ((behavior === 'ranged' || behavior === 'boss') &&
          distance < 650 &&
          enemy.attackTimer > 0 &&
          enemy.attackTimer < 0.25) ||
        (campDistance < 90 && enemy.clanAttackTimer > 0 && enemy.clanAttackTimer < 0.2) ||
        (behavior === 'charger' && enemy.chargeTimer > 0 && enemy.chargeTimer < 0.2);
      if (campDistance < 68 && enemy.clanAttackTimer <= 0) {
        enemy.motion.attack();
        damageClan(this.run, enemy.definition.damage * 0.45);
        enemy.clanAttackTimer = 1.5;
        this.burst(this.camp.x, this.camp.y, 0xc56c4e, 3);
      }
      if (
        (behavior === 'ranged' || behavior === 'boss') &&
        enemy.attackTimer <= 0 &&
        distance < 650
      ) {
        const angle = Math.atan2(target.y - enemy.y, target.x - enemy.x);
        const count = behavior === 'boss' ? 12 : 1;
        enemy.motion.attack();
        for (let i = 0; i < count; i += 1)
          this.fireHostile(enemy, angle + (i * Math.PI * 2) / count);
        enemy.attackTimer = behavior === 'boss' ? 2.5 : 3.5;
      }
      if (enemy.burning > 0) {
        enemy.burning -= dt;
        this.damageEnemy(
          enemy,
          dt * this.run.stats.damage * 0.45 * this.run.clan.campEffects.multipliers.burnDamage,
        );
      }
      if (
        enemy.active &&
        this.dashRemaining > 0 &&
        clan.formation === 'wedge' &&
        playerDistance < 64
      )
        this.damageEnemy(enemy, dt * this.run.stats.damage * 18);
    }
  }

  private fire(): void {
    const momentum = this.run.clan.momentum;
    const target = this.spatial.nearest(
      this.player.x,
      this.player.y,
      GAME.projectile.range +
        this.run.patrons.bow.range +
        this.run.clan.campEffects.bonuses.range +
        momentum * 120,
    );
    if (target) {
      this.playerMotion.attack();
      if (this.player.body!.velocity.lengthSq() < 4) this.player.setFlipX(target.x < this.player.x);
      this.shootVolley(
        this.player.x,
        this.player.y,
        target,
        this.run.stats.projectiles,
        1 + momentum * 0.3,
      );
    }
    const count = riderCount(this.run);
    for (let i = 0; i < count; i += 1) {
      const rider = this.riders[i]!;
      const riderTarget = this.spatial.nearest(
        rider.x,
        rider.y,
        GAME.projectile.range +
          this.run.patrons.bow.range +
          this.run.clan.campEffects.bonuses.range,
      );
      if (riderTarget) {
        this.riderMotions[i]!.attack();
        if (this.riderSpeeds[i]! < 2) rider.setFlipX(riderTarget.x < rider.x);
        this.shootVolley(
          rider.x,
          rider.y,
          riderTarget,
          1,
          (0.6 + (hasDevelopment(this.run, 'archery', 'veteran-riders') ? 0.3 : 0)) *
            this.run.patrons.banner.damage *
            this.run.clan.campEffects.multipliers.riderDamage,
        );
      }
    }
    this.attackTimer =
      this.run.stats.attackInterval *
      this.run.clan.campEffects.multipliers.hostInterval *
      (this.run.clan.formation === 'retreat' && momentum > 0.4 ? 0.7 : 1);
    this.audio.play('shoot');
  }

  private shootVolley(
    x: number,
    y: number,
    target: Enemy,
    count: number,
    multiplier: number,
    ancestral = false,
  ): void {
    const direction = Math.atan2(target.y - y, target.x - x);
    const tempest = burningTempest(this.run);
    for (let i = 0; i < count + (tempest ? 2 : 0); i += 1) {
      const bolt = this.projectiles.get(x, y, 'bolt') as Projectile | null;
      if (!bolt) break;
      const angle = direction + (i - (count - 1) / 2) * (tempest ? 0.28 : 0.12);
      bolt.enableBody(true, x, y, true, true);
      bolt
        .setTexture('bolt')
        .setScale(1)
        .setDepth(9200)
        .setRotation(angle + Math.PI / 4)
        .setAlpha(1)
        .clearTint();
      // Preserve the original 4.5-world-unit arrow radius at the new texture scale.
      bolt.setCircle(4.5, bolt.width / 2 - 4.5, bolt.height / 2 - 4.5);
      bolt.fire = hasDevelopment(this.run, 'archery', 'fire-arrows');
      bolt.tempest = tempest;
      bolt.pierces = this.run.patrons.bow.pierce;
      bolt.hitTargets.clear();
      bolt.turn = tempest ? (i % 2 ? 1 : -1) * 0.65 : 0;
      if (bolt.fire) bolt.setTint(0xffa04e);
      if (ancestral) bolt.setTint(0x91ded6);
      bolt.damage =
        this.run.stats.damage *
        multiplier *
        (this.run.clan.formation === 'encircle' && this.run.clan.momentum > 0.5 ? 1.3 : 1);
      bolt.remaining = GAME.projectile.lifetime;
      bolt.setVelocity(
        Math.cos(angle) * GAME.projectile.speed,
        Math.sin(angle) * GAME.projectile.speed,
      );
    }
  }

  private fireHostile(enemy: Enemy, angle: number): void {
    const shot = this.hostileShots.get(enemy.x, enemy.y, 'gem') as Projectile | null;
    if (!shot) return;
    shot.enableBody(true, enemy.x, enemy.y, true, true);
    shot
      .setTexture('gem')
      .setScale(1.1)
      .setDepth(9200)
      .setTint(0xb94948)
      .setAlpha(1)
      .setRotation(0);
    const radius = 5.4 / shot.scaleX;
    shot.setCircle(radius, shot.width / 2 - radius, shot.height / 2 - radius);
    shot.remaining = 5;
    shot.damage = enemy.definition.damage;
    shot.fire = false;
    shot.tempest = false;
    shot.turn = 0;
    shot.pierces = 0;
    shot.hitTargets.clear();
    shot.setVelocity(Math.cos(angle) * 125, Math.sin(angle) * 125);
  }

  private updateProjectiles(dt: number): void {
    for (const bolt of this.projectiles.getChildren() as Projectile[]) {
      if (!bolt.active) continue;
      bolt.remaining -= dt;
      if (bolt.turn) {
        const body = bolt.body as Phaser.Physics.Arcade.Body;
        const angle = Math.atan2(body.velocity.y, body.velocity.x) + bolt.turn * dt;
        bolt.setVelocity(
          Math.cos(angle) * GAME.projectile.speed,
          Math.sin(angle) * GAME.projectile.speed,
        );
        bolt.setRotation(angle + Math.PI / 4);
      }
      if (bolt.remaining <= 0) bolt.disableBody(true, true);
    }
    for (const shot of this.hostileShots.getChildren() as Projectile[]) {
      if (!shot.active) continue;
      shot.remaining -= dt;
      if (shot.remaining <= 0) shot.disableBody(true, true);
      else if (Phaser.Math.Distance.Between(shot.x, shot.y, this.camp.x, this.camp.y) < 48) {
        damageClan(this.run, shot.damage * 0.5);
        shot.disableBody(true, true);
      }
    }
  }

  private hitEnemy(bolt: Projectile, enemy: Enemy): void {
    if (this.run.phase !== 'playing' || !bolt.active || !enemy.active) return;
    if (bolt.hitTargets.get(enemy) === enemy.spawnId) return;
    bolt.hitTargets.set(enemy, enemy.spawnId);
    if (bolt.pierces > 0) bolt.pierces -= 1;
    else bolt.disableBody(true, true);
    if (bolt.fire) enemy.burning = 2;
    this.damageEnemy(enemy, bolt.damage);
  }

  private damageEnemy(enemy: Enemy, amount: number): void {
    if (!enemy.active) return;
    amount *= friendlyDamageMultiplier(
      this.run,
      enemy.maxHealth > 0 ? enemy.health / enemy.maxHealth : 1,
    );
    if (amount >= 1) enemy.motion.hit();
    enemy.health -= amount;
    if (enemy.health > 0) return;
    const { x, y } = enemy;
    const value = enemy.definition.xp;
    this.defeats.show(enemy);
    enemy.disableBody(true, true);
    this.enemyShadows.get(enemy)?.setVisible(false);
    this.run.kills += 1;
    this.run.clan.spirit += value * 0.4 * this.run.patrons.ancestors.spiritGain;
    rewardPatronKill(this.run);
    if (enemy === this.boss) {
      this.run.clan.finalBossDefeated = true;
      this.run.clan.integrity = Math.min(100, this.run.clan.integrity + 20);
      this.run.clan.message =
        'The Skybreaker has fallen. Protect the families until the passage opens.';
    }
    this.burst(x, y, 0xa58aad, 5);
    const gem = this.gems.get(x, y, 'gem') as Gem | null;
    if (gem) {
      gem.enableBody(true, x, y, true, true);
      gem.setTexture('gem').setScale(0.85).setDepth(3).setVelocity(0, 0);
      gem.value = value;
      gem.attracted = false;
    } else {
      // Preserve experience even if the gem pool is full.
      const active = this.gems.getFirstAlive() as Gem | null;
      if (active) active.value += value;
    }
  }

  private collectGems(dt: number): void {
    let experience = 0;
    for (const gem of this.gems.getChildren() as Gem[]) {
      if (!gem.active) continue;
      const distance = Phaser.Math.Distance.Between(gem.x, gem.y, this.player.x, this.player.y);
      const retreat = this.run.clan.formation === 'retreat' && this.run.clan.momentum > 0.4;
      if (distance < this.run.stats.pickupRadius * (retreat ? 1.7 : 1)) gem.attracted = true;
      if (!gem.attracted) continue;
      if (distance < 18) {
        experience += gem.value;
        gem.disableBody(true, true);
      } else {
        const step = Math.min(1, dt * (6 + 140 / distance));
        gem.setPosition(
          Phaser.Math.Linear(gem.x, this.player.x, step),
          Phaser.Math.Linear(gem.y, this.player.y, step),
        );
      }
    }
    if (experience > 0) {
      this.audio.play('gem');
      if (gainExperience(this.run, experience)) {
        this.audio.play('level');
        if (!redeemMasteredResearch(this.run))
          this.run.clan.message = `${this.run.pendingUpgrades} knowledge point${this.run.pendingUpgrades === 1 ? '' : 's'} ready. Open the tech tree with T.`;
        this.callbacks?.onHud(this.snapshot());
      }
    }
  }

  private hurtPlayer(enemy: Enemy): void {
    if (this.run.phase !== 'playing' || !enemy.active || this.invulnerable > 0) return;
    enemy.motion.attack();
    this.takeDamage(enemy.definition.damage);
  }

  private takeDamage(amount: number): void {
    if (this.run.phase !== 'playing' || this.invulnerable > 0) return;
    const outcome = damageCommander(this.run, amount);
    if (!outcome) return;
    this.playerMotion.hit();
    this.invulnerable = GAME.invulnerability;
    this.cameras.main.shake(90, 0.003);
    this.audio.play('hit');
    this.burst(this.player.x, this.player.y, 0xdd967c, 8);
    if (outcome === 'revived') {
      this.run.clan.message = 'The last ember holds. Your commander rides again.';
      this.burst(this.player.x, this.player.y, 0xf1c27b, 12);
    } else if (outcome === 'dead') this.finish('dead');
  }

  private finish(phase: 'won' | 'dead'): void {
    this.best = Math.max(this.best, Math.floor(this.run.elapsed));
    void this.platform.saveBest(this.best).catch(() => this.callbacks?.onSaveError());
    this.setPhase(phase === 'won' && this.run.story.enabled ? 'epilogue' : phase);
  }

  private setPhase(phase: RunState['phase']): void {
    this.run.phase = phase;
    this.clearTouch();
    if (phase === 'playing') {
      this.input.keyboard!.addCapture(['SPACE', 'TAB']);
      this.physics.resume();
      this.tweens.resumeAll();
    } else {
      // Let focused menu buttons retain their native Space activation.
      this.input.keyboard!.removeCapture(['SPACE', 'TAB']);
      this.physics.pause();
      this.tweens.pauseAll();
    }
    this.publishPhase();
  }

  private snapshot(): HudSnapshot {
    const dx = this.camp.x - this.player.x;
    const dy = this.camp.y - this.player.y;
    const direction = ['→', '↘', '↓', '↙', '←', '↖', '↑', '↗'][
      (Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) + 8) % 8
    ]!;
    return {
      run: this.run,
      introSlide: this.introSlide,
      dashReady: Math.max(0, 1 - this.dashTimer / gallopCooldown(this.run)),
      dashCooldown: gallopCooldown(this.run),
      best: this.best,
      bossHealth: this.boss?.active ? this.boss.health / SKYBREAKER.health : undefined,
      clanBearing: `${direction} CLAN · ${Math.round(Math.hypot(dx, dy))} PACES`,
    };
  }
  private publishPhase(): void {
    const snapshot = this.snapshot();
    this.callbacks?.onHud(snapshot);
    this.callbacks?.onPhase(snapshot);
  }
  private pauseOnBlur(): void {
    if (this.run.phase === 'playing') this.setPhase('paused');
  }
  private clearTouch(): void {
    this.dragOrigin = undefined;
    this.touchMove.set(0, 0);
    this.joystick?.clear();
  }

  private burst(x: number, y: number, color: number, count: number): void {
    // Short-lived feedback only; gameplay actors use bounded pools above.
    for (let i = 0; i < count; i += 1) {
      const spark = this.add
        .image(x, y, 'spark')
        .setDisplaySize(9, 9)
        .setTint(color)
        .setDepth(9600);
      const angle = Math.random() * Math.PI * 2;
      const distance = 8 + Math.random() * 20;
      this.tweens.add({
        targets: spark,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        alpha: 0,
        duration: 180 + Math.random() * 160,
        onComplete: () => spark.destroy(),
      });
    }
  }

  private refreshCamp(): void {
    this.camp.removeAll(true);
    const migrating = this.run.clan.stage === 'migration';
    const ring = this.add.graphics();
    ring.lineStyle(1.5, 0xf4deb0, 0.24).strokeEllipse(0, 16, 300, 170);
    this.camp.add(ring);
    const add = (x: number, y: number, key: string, scale = 2.5): Phaser.GameObjects.Image => {
      const width = ((ART_WIDTH[key] ?? 60) * scale) / 2.5;
      this.camp.add(
        this.add
          .image(x + 10, y + 6, 'shadow')
          .setDisplaySize(width * 1.05, width * 0.31)
          .setAlpha(0.7)
          .setDepth(y - 1),
      );
      const image = paintedImage(this, x, y, key, width).setDepth(y).setName(key);
      image.setData('restScale', image.scaleX);
      this.camp.add(image);
      return image;
    };
    add(-64, 0, migrating ? 'cart' : 'ger');
    add(65, 28, migrating ? 'cart' : 'ger');
    add(10, -45, 'banner', 3.2);
    if (
      hasDevelopment(this.run, 'ger', 'hearthkeepers') ||
      hasDevelopment(this.run, 'ger', 'refugee-beacons')
    ) {
      add(-110, 55, migrating ? 'cart' : 'ger', 2);
      add(110, -55, migrating ? 'cart' : 'ger', 2);
    }
    if (this.run.clan.buildings.archery) add(-130, -35, 'banner');
    if (this.run.clan.buildings.sanctuary) add(128, 58, 'pillar', 2.5);
    if (this.run.clan.buildings.wagon) {
      add(-95, 55, 'cart', 2);
      add(100, 0, 'cart', 2);
    }
    if (this.run.clan.buildings.felt)
      add(-190, -75, migrating ? 'cart' : 'ger', 1.7).setData('buildingId', 'felt');
    if (this.run.clan.buildings.provisions)
      add(178, -70, migrating ? 'cart' : 'ger', 1.7).setData('buildingId', 'provisions');
    if (this.run.clan.buildings.relay) {
      add(185, 75, 'cart', 1.7).setData('buildingId', 'relay');
      add(185, 45, 'banner', 2);
    }
    for (let i = 0; i < Math.min(10, this.run.clan.herd); i += 1)
      add(-55 + (i % 5) * 27, 80 + Math.floor(i / 5) * 20, 'sheep', 2);
    this.camp.sort('depth');
  }

  private updateCamp(dt: number): void {
    const clan = this.run.clan;
    const center = GAME.worldSize / 2;
    if (clan.stage === 'migration') this.camp.x = center + clan.migrationProgress * 1150;
    this.camp.setDepth(100 + this.camp.y);
    for (const child of this.camp.list)
      if (child instanceof Phaser.GameObjects.Image && child.name === 'banner') {
        const rest = child.getData('restScale') as number;
        child
          .setScale(rest * (1 + Math.sin(this.run.elapsed * 2.3 + child.x) * 0.035), rest)
          .setAngle(Math.sin(this.run.elapsed * 1.7 + child.x) * 1.2);
      }
    this.campLabel
      .setPosition(this.camp.x, this.camp.y - 112)
      .setText(clan.stage === 'migration' ? 'PROTECT THE CARAVAN  →' : 'YOUR CLAN');
    const count = riderCount(this.run);
    for (let i = 0; i < this.riders.length; i += 1) {
      const rider = this.riders[i]!;
      if (!rider.visible && i < count) this.riderMotions[i]!.reset('rider', i * 0.137);
      rider.setVisible(i < count);
      this.riderShadows[i]!.setVisible(i < count);
      if (i >= count) continue;
      const formation = clan.formation;
      const angle =
        (i / count) * Math.PI * 2 + (formation === 'encircle' ? this.run.elapsed * 0.65 : 0);
      const enemyGroup =
        formation === 'encircle'
          ? this.spatial.nearest(this.player.x, this.player.y, 280)
          : undefined;
      const anchor = formation === 'guard' ? this.camp : (enemyGroup ?? this.player);
      let x = anchor.x + Math.cos(angle) * (formation === 'retreat' ? 145 : 95);
      let y = anchor.y + Math.sin(angle) * 65;
      if (formation === 'wedge') {
        x =
          this.player.x -
          this.facing.x * (45 + Math.floor(i / 2) * 28) +
          this.facing.y * (i % 2 ? 26 : -26);
        y =
          this.player.y -
          this.facing.y * (45 + Math.floor(i / 2) * 28) -
          this.facing.x * (i % 2 ? 26 : -26);
      }
      const previousX = rider.x;
      const previousY = rider.y;
      rider.setPosition(
        Phaser.Math.Linear(rider.x, x, Math.min(1, dt * 5)),
        Phaser.Math.Linear(rider.y, y, Math.min(1, dt * 5)),
      );
      const dx = rider.x - previousX;
      const dy = rider.y - previousY;
      this.riderSpeeds[i] = dt > 0 ? Math.hypot(dx, dy) / dt : 0;
      if (Math.abs(dx) > 0.1) rider.setFlipX(dx < 0);
      rider.setDepth(100 + rider.y);
      this.riderShadows[i]!.setPosition(rider.x + 7, rider.y + 4).setDepth(99 + rider.y);
    }
    this.landscape.update(
      this.run.elapsed,
      clan.region,
      this.cameras.main,
      clan.stage === 'final' ? clan.stageTime / GAME.clan.finalDuration : 0,
    );
    this.updateHazards(dt);
  }

  private updateCharacterAnimations(dt: number): void {
    const preparingVolley = this.attackTimer > 0 && this.attackTimer < 0.12;
    this.playerMotion.advance(
      dt,
      this.player.body!.velocity.length(),
      preparingVolley &&
        Boolean(
          this.spatial.nearest(
            this.player.x,
            this.player.y,
            GAME.projectile.range +
              this.run.patrons.bow.range +
              this.run.clan.campEffects.bonuses.range,
          ),
        ),
    );
    renderCharacter(this.player, this.playerMotion);
    this.player.setTint(this.playerMotion.hurt ? 0xffd3b2 : 0xffffff);
    for (let i = 0; i < this.riders.length; i++) {
      const rider = this.riders[i]!;
      if (!rider.visible) continue;
      const motion = this.riderMotions[i]!;
      motion.advance(
        dt,
        this.riderSpeeds[i]!,
        preparingVolley &&
          Boolean(
            this.spatial.nearest(
              rider.x,
              rider.y,
              GAME.projectile.range +
                this.run.patrons.bow.range +
                this.run.clan.campEffects.bonuses.range,
            ),
          ),
      );
      renderCharacter(rider, motion);
    }
    for (const enemy of this.enemies.getChildren() as Enemy[]) {
      if (!enemy.active) continue;
      enemy.motion.advance(dt, enemy.body!.velocity.length(), enemy.preparingAttack);
      renderCharacter(enemy, enemy.motion);
      enemy.setTint(
        enemy.motion.hurt
          ? 0xffd3b2
          : enemy.burning > 0
            ? 0xffad67
            : enemy.definition.id === 'frost-mare'
              ? 0xb1efff
              : 0xffffff,
      );
    }
    this.defeats.update(dt);
  }

  private updateHazards(dt: number): void {
    const clan = this.run.clan;
    if (clan.region < 2) return;
    this.hazardTimer -= dt;
    if (this.hazardTimer <= 0) {
      const x = this.player.x;
      const y = this.player.y;
      const warning = this.add.graphics().setDepth(3);
      warning
        .fillStyle(0xa14839, 0.18)
        .fillCircle(x, y, 70)
        .lineStyle(2, 0xe6bd7b, 0.8)
        .strokeCircle(x, y, 70);
      this.hazards.push({ x, y, remaining: 2 + this.run.patrons.water.warning, warning });
      this.hazardTimer = clan.region === 3 ? 6 : 10;
    }
    for (let i = this.hazards.length - 1; i >= 0; i -= 1) {
      const hazard = this.hazards[i]!;
      hazard.remaining -= dt;
      if (hazard.remaining > 0) continue;
      this.burst(hazard.x, hazard.y, clan.region === 3 ? 0xbf6558 : 0x796d4d, 12);
      if (Phaser.Math.Distance.Between(hazard.x, hazard.y, this.player.x, this.player.y) < 70)
        this.takeDamage(20 * this.run.patrons.water.hazardDamage);
      if (Phaser.Math.Distance.Between(hazard.x, hazard.y, this.camp.x, this.camp.y) < 95)
        damageClan(this.run, 8 * this.run.patrons.water.hazardDamage);
      hazard.warning.destroy();
      this.hazards.splice(i, 1);
    }
  }

  private updateSupport(dt: number): void {
    const clan = this.run.clan;
    this.supportTimer -= dt;
    this.wagonTimer -= dt;
    this.wardTimer -= dt;
    if (clan.buildings.sanctuary && this.supportTimer <= 0) {
      const target =
        this.spatial.nearest(this.player.x, this.player.y, 520) ??
        this.spatial.nearest(this.camp.x, this.camp.y, 520);
      if (target) {
        const x = target.x;
        const y = target.y;
        const lightning = this.add.graphics().setDepth(9600);
        lightning
          .lineStyle(3, 0xd9f2f5)
          .beginPath()
          .moveTo(x + 25, y - 130)
          .lineTo(x - 14, y - 50)
          .lineTo(x + 14, y - 60)
          .lineTo(x, y)
          .strokePath();
        this.tweens.add({
          targets: lightning,
          alpha: 0,
          duration: 280,
          onComplete: () => lightning.destroy(),
        });
        this.spatial.forEachNearby(x, y, 70, (enemy) =>
          this.damageEnemy(enemy, this.run.stats.damage * 3),
        );
      }
      this.supportTimer =
        (hasDevelopment(this.run, 'sanctuary', 'wind-shamans') ? 1.8 : 3.5) *
        (clan.region === 3 ? 1.5 : 1) *
        clan.campEffects.multipliers.sanctuaryInterval;
    }
    if (clan.buildings.wagon && this.wagonTimer <= 0) {
      const target = this.spatial.nearest(this.camp.x, this.camp.y, 520);
      if (target)
        this.shootVolley(
          this.camp.x,
          this.camp.y,
          target,
          hasDevelopment(this.run, 'wagon', 'war-carts') ? 3 : 1,
          (clan.stage === 'migration' && !hasDevelopment(this.run, 'wagon', 'war-carts')
            ? 0.7
            : 1.5) * clan.campEffects.multipliers.wagonDamage,
        );
      this.wagonTimer = 0.9 * this.run.patrons.guardian.wagonInterval;
    }
    if (hasDevelopment(this.run, 'sanctuary', 'ancestral-ward') && this.wardTimer <= 0) {
      this.spatial.forEachNearby(this.camp.x, this.camp.y, 125, (enemy) =>
        this.damageEnemy(enemy, this.run.stats.damage * 1.5),
      );
      this.burst(this.camp.x, this.camp.y, 0x8acfe2, 8);
      this.wardTimer = 1.2;
    }
  }

  private arrive(): void {
    const center = GAME.worldSize / 2;
    // Each crossing leads to a new handcrafted arena; structures travel with the clan.
    this.camp.setPosition(center, center);
    this.player.setPosition(center, center + 100).setVelocity(0, 0);
    this.patronSupport.relocate(this.player);
    for (const group of [this.enemies, this.projectiles, this.hostileShots])
      for (const actor of group.getChildren() as Enemy[]) actor.disableBody(true, true);
    // Carry all uncollected experience to the next camp rather than discarding it.
    for (const gem of this.gems.getChildren() as Gem[])
      if (gem.active) gem.setPosition(center, center + 100);
    for (const hazard of this.hazards) hazard.warning.destroy();
    this.hazards = [];
    this.hazardTimer = 8;
    this.landscape.setRegion(this.run.clan.region);
    this.refreshCamp();
    this.cameras.main.flash(500, 225, 215, 180);
    if (!this.presentStory()) this.publishPhase();
  }
}
