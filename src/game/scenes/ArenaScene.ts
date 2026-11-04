import Phaser from 'phaser';
import type { GamePlatform } from '../../platform/GamePlatform';
import type { AudioChannel } from '../../shared/audioSettings';
import { normalizeAudioMix } from '../../shared/audioSettings';
import type { ExpeditionSave, SaveSlot } from '../../shared/expeditionSave';
import type { NomadicBuildingId } from '../../shared/nomadicCamp.js';
import {
  effectAmount,
  normalizeVisualSettings,
  type VisualSettings,
} from '../../shared/visualSettings';
import { CharacterMotion, isCharacterKind } from '../animation/CharacterMotion';
import { DefeatSprites, renderCharacter } from '../animation/CharacterVisuals';
import type { CampBarrier } from '../assets/CampBarrier';
import type { ClanLife } from '../assets/ClanLife';
import {
  ART_WIDTH,
  CAMP_VISUAL_SCALE,
  artTexture,
  createPainterlyEffects,
  paintedImage,
  preloadPainterlyArt,
  styleActor,
} from '../assets/painterlyArt';
import { SteppeLandscape } from '../assets/SteppeLandscape';
import { environmentForLocation } from '../audio/mixing';
import type { SoundKind } from '../audio/soundPalette';
import { GAME } from '../config';
import { AREA_ENCOUNTERS, type AreaThreatKind } from '../data/areaEncounters';
import { FORMATIONS, ROUTES, STARTING_TRADITIONS, type StartingTraditionId } from '../data/clan';
import { CROSSING_ENCOUNTERS } from '../data/crossings';
import { ALL_ENEMIES, SKYBREAKER, encounterSpawnDelay } from '../data/enemies';
import { INTRO_SLIDES } from '../data/intro';
import type { SuccessorTrait } from '../data/successors';
import { createDeveloperTools, executeDeveloperCommand } from '../dev/commands';
import { DEVELOPER_LEVELS, createDeveloperRun } from '../dev/levels';
import { Enemy, Gem, Projectile } from '../entities/actors';
import {
  advanceAreaEncounter,
  areaArrivalAngle,
  createAreaEncounter,
  syncAreaEncounter,
} from '../state/areaEncounters';
import {
  addAreaThreat,
  advanceAreaThreats,
  areaMovementMultiplier,
  createAreaThreats,
  type AreaThreat,
} from '../state/areaThreats';
import { runFromCampArchive } from '../state/campArchive';
import { barrierContact, campBoundary } from '../state/campBarrier';
import { advanceCampRecovery, gallopCooldown, wagonDefence } from '../state/campCombat';
import { purchaseEstate, type EstatePurchaseKind } from '../state/campEstate';
import {
  advanceClan,
  availableFormations,
  beginMigration,
  buildStructure,
  canMigrate,
  damageClan,
  hasDevelopment,
  riderCount,
  type ClanProtection,
} from '../state/clan';
import type { ClanDamageCause } from '../state/clanSafety';
import { advanceCrossingEncounter } from '../state/crossingEncounters';
import {
  advanceEncounters,
  encounterEnemy,
  encounterPlan,
  supportingAreaEnemy,
} from '../state/encounters';
import {
  decodeExpedition,
  type BodyArchive,
  type ProjectileArchive,
  type WorldArchive,
} from '../state/expeditionArchive';
import { markExpedition, metricStage, observeExpedition } from '../state/expeditionMetrics';
import {
  advanceFieldObjective,
  fieldObjectiveDue,
  startFieldObjective,
  syncFieldState,
} from '../state/fieldObjectives';
import {
  acceptCampBarrage,
  advanceFinalStand,
  defeatSkybreaker,
  finalChapter,
  syncFinalStand,
} from '../state/finalStand';
import { completeGuidance } from '../state/guidance';
import { currentLocation } from '../state/journey';
import {
  advanceSuccession,
  beginSuccession,
  chooseSuccessor,
  damageKhan,
  isKhanActive,
  khanSpeedMultiplier,
} from '../state/khan';
import { advanceMountedCombat, retreatShot, spendMountedVolley } from '../state/mountedCombat';
import { purchaseNomadicBuilding } from '../state/nomadicCamp';
import { createRun, gainExperience } from '../state/run';
import { openNextStory, resolveStory } from '../state/story';
import { volleyFactors } from '../state/volley';
import { ActionKeys } from '../systems/ActionKeys';
import { areaRiverTangent, areaSurface, habitatPreference } from '../systems/AreaHabitat';
import { GameAudio } from '../systems/Audio';
import { clampCameraZoom, enemySpawnPosition } from '../systems/CameraView';
import { projectedEnemySpawnPosition } from '../systems/EnemySpawning';
import {
  advanceCharge,
  createEnemyTactics,
  seerDangerRadius,
  tacticalGoal,
} from '../systems/enemyTactics';
import { FieldMarkers } from '../systems/FieldMarkers';
import { GamepadInput } from '../systems/GamepadInput';
import { SpatialHash } from '../systems/SpatialHash';
import { TerrainCollision } from '../terrain/TerrainCollision';
import type { BuildingId, EnemyDefinition, HudSnapshot, RunState } from '../types';
import { projectileTerrainClear } from '../world3d/projectileTerrain';
import type { ArenaContext } from './arena/ArenaContext';
import { ArenaEffects } from './arena/ArenaEffects';
import { ArenaInput } from './arena/ArenaInput';
import { ArenaPersistence } from './arena/ArenaPersistence';
import { createArenaTimers, type ArenaTimers } from './arena/ArenaTimers';
import { CampPresenter } from './arena/CampPresenter';
import { HudPresenter } from './arena/HudPresenter';

export interface ArenaCallbacks {
  onHud: (snapshot: HudSnapshot) => void;
  onPhase: (snapshot: HudSnapshot) => void;
  onMenuInput: (action: 'next' | 'previous' | 'confirm') => void;
  onSaveError: () => void;
  onCampBack?: () => boolean;
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
  private landscape!: SteppeLandscape;
  private campPresenter!: CampPresenter;
  private terrainCollision!: TerrainCollision;
  private crossingMarkers!: FieldMarkers;
  private areaEffects!: Phaser.GameObjects.Graphics;
  private areaEncounter = createAreaEncounter();
  private areaThreats = createAreaThreats();
  private fieldMarkers!: FieldMarkers;
  private passageMarkers: FieldMarkers[] = [];
  private riderShadows: Phaser.GameObjects.Image[] = [];
  private readonly playerMotion = new CharacterMotion('player');
  private riderMotions: CharacterMotion[] = [];
  private riderSpeeds: number[] = [];
  private defeats!: DefeatSprites;
  private enemyShadows = new Map<Enemy, Phaser.GameObjects.Image>();
  private dustTimer = 0;
  private boss?: Enemy;
  private hazards: {
    x: number;
    y: number;
    remaining: number;
    warning: Phaser.GameObjects.Graphics;
    radius?: number;
    damage?: number;
    source?: 'seer';
  }[] = [];
  private gems!: Phaser.Physics.Arcade.Group;
  private readonly spatial = new SpatialHash<Enemy>();
  private readonly audio = new GameAudio();
  private readonly controller = new GamepadInput();
  private readonly actionKeys = new ActionKeys();
  private callbacks?: ArenaCallbacks;
  private readonly timers: ArenaTimers = createArenaTimers();
  /** Shared world access; see ArenaContext for the live-state contract. */
  private readonly arena: ArenaContext = this.createArenaContext();
  private readonly effects = new ArenaEffects(this.arena);
  private readonly hudPresenter = new HudPresenter(this.arena);
  /** Created once with the scene's controller and ActionKeys, so held input survives a restart. */
  private readonly controls = new ArenaInput(this.arena, this.controller, this.actionKeys);
  private hudTimer = 0;
  private cameraZoom: number = GAME.camera.defaultZoom;
  private best = 0;
  private utilityReturnPhase: 'ready' | 'paused' = 'ready';
  private developerReturnPhase: RunState['phase'] = 'ready';
  private developerRun = false;
  private developerTools = import.meta.env.DEV ? createDeveloperTools() : undefined;
  private consoleReturnPhase: RunState['phase'] = 'ready';
  private introSlide = 0;
  private introStartsRun = false;
  private startingTraditionId: StartingTraditionId = 'shared-hearth';
  private storiesEnabled = true;
  private guidanceEnabled = true;
  private storyLogReturn: 'paused' | 'won' | 'dead' = 'paused';
  private facing = new Phaser.Math.Vector2(0, 1);
  /** Created once, so the pending write and save generation survive a restart. */
  private readonly persistence: ArenaPersistence;
  private saveMenuReturn: 'ready' | 'paused' | 'dead' | 'won' = 'ready';
  private visualSettings: VisualSettings;
  constructor(private readonly platform: GamePlatform) {
    super('arena');
    this.visualSettings = normalizeVisualSettings(platform.profile.visualSettings);
    const scene = this;
    this.persistence = new ArenaPersistence(platform, {
      get run() {
        return scene.run;
      },
      get developerRun() {
        return scene.developerRun;
      },
      captureWorld: () => scene.captureWorld(),
      publishPhase: () => scene.publishPhase(),
      onSaveError: () => scene.callbacks?.onSaveError(),
    });
    this.audio.muted = platform.profile.muted;
    this.audio.setMix(normalizeAudioMix(platform.profile.audioMix));
    void this.audio.prepare();
  }

  private createArenaContext(): ArenaContext {
    const scene = this;
    return {
      scene,
      get run() {
        return scene.run;
      },
      get timers() {
        return scene.timers;
      },
      get player() {
        return scene.player;
      },
      get camp() {
        return scene.camp;
      },
      get enemies() {
        return scene.enemies;
      },
      get projectiles() {
        return scene.projectiles;
      },
      get hostileShots() {
        return scene.hostileShots;
      },
      get gems() {
        return scene.gems;
      },
      get landscape() {
        return scene.landscape;
      },
      get spatial() {
        return scene.spatial;
      },
      get audio() {
        return scene.audio;
      },
      get visualSettings() {
        return scene.visualSettings;
      },
      get facing() {
        return scene.facing;
      },
      get cameraZoom() {
        return scene.cameraZoom;
      },
      get developerTools() {
        return scene.developerTools;
      },
      get effects() {
        return scene.effects;
      },
      hud: { refresh: () => scene.callbacks?.onHud(scene.snapshot()) },
    };
  }

  connect(callbacks: ArenaCallbacks): void {
    this.callbacks = callbacks;
    if (this.player) this.publishPhase();
  }

  preload(): void {
    preloadPainterlyArt(this);
  }

  create(data?: { developerLevel?: string; expedition?: ExpeditionSave }): void {
    this.audio.reset();
    this.persistence.reset();
    const developerRun =
      import.meta.env.DEV && data?.developerLevel
        ? createDeveloperRun(data.developerLevel)
        : undefined;
    this.developerRun = !!developerRun;
    // Keep testing preferences across checkpoints; a normal new run clears every cheat.
    if (import.meta.env.DEV && !developerRun)
      this.developerTools = createDeveloperTools(this.platform.profile.developerCommandHistory);
    this.consoleReturnPhase = 'ready';
    this.run = developerRun ?? createRun(this.startingTraditionId);
    if (!developerRun) {
      this.run.story.enabled = this.storiesEnabled;
      this.run.guidance.enabled = this.guidanceEnabled;
    }
    this.developerReturnPhase = 'ready';
    this.storyLogReturn = 'paused';
    this.introSlide = 0;
    this.introStartsRun = false;
    Object.assign(this.timers, createArenaTimers());
    this.hudTimer = 0;
    this.utilityReturnPhase = 'ready';
    this.riders = [];
    this.riderShadows = [];
    this.riderMotions = [];
    this.riderSpeeds = [];
    this.playerMotion.reset('player');
    this.enemyShadows.clear();
    this.dustTimer = 0;
    this.boss = undefined;
    this.hazards = [];
    this.facing.set(0, 1);
    this.best = this.platform.profile.bestSeconds;

    createPainterlyEffects(this);
    this.areaThreats = createAreaThreats();
    this.areaEncounter = createAreaEncounter();
    syncAreaEncounter(this.areaEncounter, this.run);
    this.areaEffects = this.add.graphics().setDepth(5);
    this.defeats = new DefeatSprites(this);
    this.fieldMarkers = new FieldMarkers(this);
    this.passageMarkers = [];
    // Crossing and passage markers share the field warning surface so their
    // drawings reuse one GraphicsBridge canvas texture.
    this.crossingMarkers = new FieldMarkers(this, this.fieldMarkers.warnings);
    this.physics.world.setBounds(0, 0, GAME.worldSize, GAME.worldSize);
    this.landscape = new SteppeLandscape(this);
    const center = GAME.worldSize / 2;
    this.camp = this.add
      .container(center, center)
      .setScale(CAMP_VISUAL_SCALE)
      .setDepth(100 + center);
    this.campPresenter = new CampPresenter(this.arena);
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
      .setName('khan')
      .setCollideWorldBounds(true);
    styleActor(this.player, 'player', ART_WIDTH.player!, 10);

    this.enemies = this.physics.add.group({
      classType: Enemy,
      maxSize: GAME.maxEnemies,
      runChildUpdate: false,
    });
    this.terrainCollision = new TerrainCollision(this, this.player, this.enemies);
    this.terrainCollision.setTerrain(this.landscape.navigation);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.terrainCollision.destroy());
    this.projectiles = this.physics.add.group({
      classType: Projectile,
      maxSize: GAME.maxProjectiles,
    });
    this.gems = this.physics.add.group({ classType: Gem, maxSize: GAME.maxGems });
    this.hostileShots = this.physics.add.group({ classType: Projectile, maxSize: 180 });
    // Phaser reports the individual sprite first when overlapping it with a group.
    this.physics.add.overlap(this.player, this.hostileShots, (_player, shot) => {
      if (
        this.run.phase !== 'playing' ||
        !(shot as Projectile).active ||
        !this.projectileReaches(shot as Projectile)
      )
        return;
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
    this.applyCameraZoom(this.cameraZoom);
    const resizeZoom = (): void => this.applyCameraZoom(this.cameraZoom);
    this.scale.on(Phaser.Scale.Events.RESIZE, resizeZoom);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () =>
      this.scale.off(Phaser.Scale.Events.RESIZE, resizeZoom),
    );

    this.controls.bind({
      togglePause: () => this.togglePause(),
      openBuildings: () => this.openBuildings(),
      openRoutes: () => this.openRoutes(),
      cycleFormation: () => this.cycleFormation(),
      selectSuccessor: (trait) => this.selectSuccessor(trait),
      toggleJournal: () => this.toggleJournal(),
      toggleDeveloperMenu: () => this.toggleDeveloperMenu(),
      toggleDeveloperConsole: () => this.toggleDeveloperConsole(),
      changeZoom: (steps) => this.changeZoom(steps),
      dash: () => this.dash(),
      skipIntro: () => this.skipIntro(),
      menuInput: (action) => this.callbacks?.onMenuInput(action),
    });
    this.game.events.on(Phaser.Core.Events.BLUR, this.pauseOnBlur, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.audio.reset();
      this.game.events.off(Phaser.Core.Events.BLUR, this.pauseOnBlur, this);
      this.input.keyboard!.removeAllListeners();
      this.controls.clearTouch();
    });
    this.events.off(Phaser.Scenes.Events.DESTROY, this.audio.destroy, this.audio);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.audio.destroy, this.audio);
    this.physics.pause();
    this.tweens.pauseAll();
    if (developerRun) {
      this.landscape.setRegion(this.run.clan.region, currentLocation(this.run));
      this.reconcileTerrain();
      this.campBarrier.relocate(this.run, this.camp);
      this.timers.invulnerable = GAME.khan.returnProtection;
      this.beginExpedition();
    } else if (data?.expedition) this.restoreExpedition(data.expedition);
    else this.publishPhase();
  }

  get canSaveExpedition(): boolean {
    return this.persistence.canSave;
  }

  saveExpedition(slot: SaveSlot = 'auto'): Promise<boolean> {
    return this.persistence.save(slot);
  }

  openSaves(): void {
    if (!['ready', 'paused', 'dead', 'won'].includes(this.run.phase)) return;
    this.saveMenuReturn = this.run.phase as typeof this.saveMenuReturn;
    this.persistence.message = this.platform.saveStorageError
      ? 'Save storage could not be read. Try opening this menu again.'
      : '';
    this.setPhase('saves');
    void this.platform
      .refreshSaves()
      .then(() => {
        if (this.run.phase === 'saves') this.publishPhase();
      })
      .catch(() => {
        this.persistence.message = 'Save storage could not be read.';
        if (this.run.phase === 'saves') this.publishPhase();
      });
  }

  loadSavedExpedition(slot: SaveSlot): Promise<void> {
    return this.persistence.load(
      () => this.loadExpedition(slot),
      () => {
        if (this.run.phase !== 'saves') {
          this.saveMenuReturn = this.run.phase as typeof this.saveMenuReturn;
          this.setPhase('saves');
        }
      },
    );
  }

  deleteSavedExpedition(slot: SaveSlot): Promise<void> {
    return this.persistence.delete(slot);
  }

  async saveAndReturnToTitle(): Promise<void> {
    if (this.run.phase !== 'paused') return;
    await this.platform.flush().catch(() => undefined);
    if (this.canSaveExpedition && !(await this.saveExpedition())) return;
    this.scene.restart({});
  }

  async prepareToClose(): Promise<boolean> {
    if (this.run.phase === 'playing') this.setPhase('paused');
    return this.persistence.prepareToClose();
  }

  async loadExpedition(slot: SaveSlot): Promise<void> {
    if (!['ready', 'paused', 'saves', 'dead', 'won'].includes(this.run.phase)) return;
    const save = await this.platform.loadExpedition(slot);
    // Validate completely before tearing down the current, still playable scene.
    decodeExpedition(save);
    this.audio.unlock();
    this.scene.restart({ expedition: save });
  }

  private captureWorld(): WorldArchive {
    const body = (
      actor: Phaser.Physics.Arcade.Sprite | Phaser.Physics.Arcade.Image,
    ): BodyArchive => ({
      x: actor.x,
      y: actor.y,
      vx: actor.body!.velocity.x,
      vy: actor.body!.velocity.y,
      flip: actor.flipX,
    });
    const pool = this.enemies.getChildren() as Enemy[];
    const shots = (group: Phaser.Physics.Arcade.Group): ProjectileArchive[] =>
      (group.getChildren() as Projectile[])
        .filter((p) => p.active)
        .map((p) => ({
          ...body(p),
          damage: p.damage,
          remaining: p.remaining,
          fire: p.fire,
          tempest: p.tempest,
          turn: p.turn,
          pierces: p.pierces,
          pins: p.pins,
          echoIndex: p.echoIndex,
          precision: p.getData('precision') as boolean | undefined,
          ghost: p.getData('ghost') as boolean | undefined,
          baseDamage: p.getData('base-damage') as number | undefined,
          dealtDamage: p.getData('dealt-damage') as number | undefined,
          rotation: p.rotation,
          tint: p.tintTopLeft,
          previous: p.getData('terrain-previous') as { x: number; y: number } | undefined,
          barrage: p.barrage,
          source: p.source,
          hits: [...p.hitTargets].map(([enemy, spawnId]) => ({
            slot: pool.indexOf(enemy),
            spawnId,
          })),
        }));
    return {
      player: { ...body(this.player), motion: this.playerMotion.capture() },
      camp: { x: this.camp.x, y: this.camp.y },
      facing: { x: this.facing.x, y: this.facing.y },
      zoom: this.cameraZoom,
      timers: { ...this.timers },
      generations: pool.map((e) => e.spawnId),
      enemies: pool.flatMap((e, slot) =>
        e.active
          ? [
              {
                ...body(e),
                slot,
                definition: e.definition.id,
                state: {
                  health: e.health,
                  elite: e.elite,
                  maxHealth: e.maxHealth,
                  spawnId: e.spawnId,
                  attackTimer: e.attackTimer,
                  clanAttackTimer: e.clanAttackTimer,
                  chargeTimer: e.chargeTimer,
                  burning: e.burning,
                  pinned: e.pinned,
                  lastGallop: e.lastGallop,
                  dangerTimer: e.dangerTimer,
                  tacticalSlot: e.tacticalSlot,
                  objectiveId: e.objectiveId,
                  crossingId: e.crossingId,
                  preparingAttack: e.preparingAttack,
                  tactics: e.tactics,
                },
                motion: e.motion.capture(),
              },
            ]
          : [],
      ),
      projectiles: shots(this.projectiles),
      hostileShots: shots(this.hostileShots),
      gems: (this.gems.getChildren() as Gem[])
        .filter((g) => g.active)
        .map((g) => ({
          ...body(g),
          value: g.value,
          attracted: g.attracted,
          secondary: g.secondary,
        })),
      riders: this.riders.map((r, i) => ({
        x: r.x,
        y: r.y,
        flip: r.flipX,
        motion: this.riderMotions[i]!.capture(),
      })),
      hazards: this.hazards.map(({ warning: _warning, ...hazard }) => hazard),
      areaEncounter: this.areaEncounter,
      areaThreats: this.areaThreats,
    };
  }

  private restoreExpedition(save: ExpeditionSave): void {
    const { run, world } = decodeExpedition(save);
    this.run = run;
    this.input.keyboard!.resetKeys();
    this.persistence.started = true;
    this.storiesEnabled = run.story.enabled;
    this.guidanceEnabled = run.guidance.enabled;
    Object.assign(this.timers, world.timers);
    this.areaEncounter = world.areaEncounter;
    this.areaThreats = world.areaThreats;
    this.landscape.setRegion(
      run.clan.region,
      currentLocation(run),
      run.clan.stage === 'migration' ? run.clan.routeId : undefined,
    );
    this.campPresenter.restore(world.camp);
    this.player.enableBody(true, world.player.x, world.player.y, true, true);
    this.player.setVelocity(world.player.vx, world.player.vy).setFlipX(world.player.flip);
    this.facing.set(world.facing.x, world.facing.y);
    this.playerMotion.restore(world.player.motion);
    renderCharacter(this.player, this.playerMotion);
    this.player.setDepth(100 + this.player.y);
    this.shadow.setPosition(this.player.x + 9, this.player.y + 5).setDepth(99 + this.player.y);
    this.aura.setPosition(this.player.x, this.player.y);
    if (!isKhanActive(run)) this.hideFallenKhan();
    const pool = world.generations.map((spawnId, slot) => {
      const enemy = this.enemies.create(0, 0, ...artTexture('wolf')) as Enemy;
      const saved = world.enemies.find((e) => e.slot === slot);
      if (!saved) {
        enemy.spawnId = spawnId;
        enemy.disableBody(true, true);
        return enemy;
      }
      const definition = [...ALL_ENEMIES, SKYBREAKER].find((e) => e.id === saved.definition)!;
      this.initializeEnemy(enemy, definition, saved.x, saved.y);
      Object.assign(enemy, saved.state);
      enemy.setVelocity(saved.vx, saved.vy).setFlipX(saved.flip);
      enemy.motion.restore(saved.motion);
      renderCharacter(enemy, enemy.motion);
      enemy.setDepth(100 + enemy.y);
      this.enemyShadows
        .get(enemy)!
        .setPosition(enemy.x + 6, enemy.y + 4)
        .setDepth(99 + enemy.y);
      return enemy;
    });
    const restoreShots = (
      group: Phaser.Physics.Arcade.Group,
      shots: ProjectileArchive[],
      hostile: boolean,
    ): void => {
      for (const saved of shots) {
        const p = group.get(saved.x, saved.y, hostile ? 'gem' : 'bolt') as Projectile;
        p.enableBody(true, saved.x, saved.y, true, true);
        const { x: _x, y: _y, vx, vy, flip, rotation, tint, previous, hits, ...state } = saved;
        p.echoIndex = undefined;
        Object.assign(p, state);
        p.setData('precision', saved.precision);
        p.setData('ghost', saved.ghost);
        p.setData('base-damage', saved.baseDamage);
        p.setData('dealt-damage', saved.dealtDamage);
        p.setScale(hostile ? 1.1 : 1)
          .setDepth(9200)
          .setRotation(rotation)
          .setTint(tint)
          .setAlpha(1)
          .setFlipX(flip)
          .setVelocity(vx, vy);
        const radius = hostile ? 5.4 / p.scaleX : 4.5;
        p.setCircle(radius, p.width / 2 - radius, p.height / 2 - radius);
        p.setData('terrain-previous', previous ?? { x: saved.x, y: saved.y });
        if (hostile) this.styleHostileProjectile(p);
        p.hitTargets.clear();
        for (const hit of hits) p.hitTargets.set(pool[hit.slot]!, hit.spawnId);
      }
    };
    restoreShots(this.projectiles, world.projectiles, false);
    restoreShots(this.hostileShots, world.hostileShots, true);
    for (const saved of world.gems) {
      const gem = this.gems.get(saved.x, saved.y, 'gem') as Gem;
      gem.enableBody(true, saved.x, saved.y, true, true);
      gem.setScale(0.85).setDepth(3).setVelocity(saved.vx, saved.vy);
      gem.value = saved.value;
      gem.attracted = saved.attracted;
      gem.secondary = saved.secondary ?? false;
    }
    world.riders.forEach((r, i) => {
      this.riders[i]!.setPosition(r.x, r.y)
        .setFlipX(r.flip)
        .setVisible(i < riderCount(run))
        .setDepth(100 + r.y);
      this.riderShadows[i]!.setPosition(r.x + 7, r.y + 4)
        .setVisible(i < riderCount(run))
        .setDepth(99 + r.y);
      this.riderMotions[i]!.restore(r.motion);
      renderCharacter(this.riders[i]!, this.riderMotions[i]!);
    });
    this.hazards = world.hazards.map((h) => ({
      ...h,
      warning: this.add
        .graphics()
        .setDepth(5)
        .lineStyle(2, 0xd49b79, 0.8)
        .strokeCircle(h.x, h.y, h.radius ?? 90),
    }));
    this.reconcileTerrain();
    this.applyCameraZoom(world.zoom);
    this.cameras.main.startFollow(this.player, true, 0.09, 0.09).setFollowOffset(0, 0);
    this.cameras.main.centerOn(this.player.x, this.player.y);
    this.updateAreaCombat(0);
    this.updateFinalStand(0);
    this.fieldMarkers.update(run.field.objective);
    if (run.crossing?.escort && !run.crossing.escort.lost && !run.crossing.escort.joined)
      this.crossingMarkers.update({
        ...run.crossing.escort,
        kind: 'refugees',
        status: 'returning',
      });
    this.setPhase(run.story.active ? 'story' : 'paused');
  }

  continueCamp(): void {
    if (this.run.phase !== 'ready') return;
    const restored = runFromCampArchive(this.platform.profile.camp);
    if (!restored) return;
    this.run = restored;
    this.run.story.enabled = this.storiesEnabled;
    this.run.guidance.enabled = this.guidanceEnabled;
    this.developerRun = false;
    if (import.meta.env.DEV)
      this.developerTools = createDeveloperTools(this.platform.profile.developerCommandHistory);
    this.campPresenter.refresh();
    this.audio.unlock();
    this.beginExpedition();
  }

  openStartingTraditions(): void {
    if (this.run.phase === 'ready') this.setPhase('traditions');
  }

  selectStartingTradition(id: string): void {
    if (this.run.phase !== 'traditions' || !STARTING_TRADITIONS.some((entry) => entry.id === id))
      return;
    this.startingTraditionId = id as StartingTraditionId;
    this.run = createRun(this.startingTraditionId);
    this.run.phase = 'traditions';
    this.run.story.enabled = this.storiesEnabled;
    this.run.guidance.enabled = this.guidanceEnabled;
    this.campPresenter.refresh();
    this.publishPhase();
  }

  startRun(): void {
    if (!['ready', 'traditions'].includes(this.run.phase)) return;
    this.audio.unlock();
    this.introSlide = 0;
    this.introStartsRun = true;
    this.setPhase('intro');
  }

  private beginExpedition(): void {
    this.persistence.begin();
    metricStage(this.run);
    this.cameras.main.setFollowOffset(0, 0);
    this.setPhase('playing');
    this.presentStory();
    this.persistence.requestCheckpoint();
    this.audio.play('arrive');
  }

  toggleStoryMode(): void {
    if (this.run.phase !== 'ready') return;
    this.storiesEnabled = !this.storiesEnabled;
    this.run.story.enabled = this.storiesEnabled;
    this.publishPhase();
  }

  private presentStory(): boolean {
    if (!isKhanActive(this.run)) return false;
    if (!openNextStory(this.run)) return false;
    this.setPhase('story');
    return true;
  }

  chooseStory(choice?: string): void {
    if (this.run.phase !== 'story' || !resolveStory(this.run, choice)) return;
    this.persistence.requestCheckpoint();
    // Check for a queued arrival beat before resuming any simulation.
    this.run.phase = 'playing';
    if (this.presentStory()) return;
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
    this.scene.restart({});
  }

  toggleDeveloperMenu(): void {
    if (!import.meta.env.DEV) return;
    if (this.run.phase === 'console') {
      if (this.consoleReturnPhase !== 'developer')
        this.developerReturnPhase = this.consoleReturnPhase;
      this.setPhase('developer');
      return;
    }
    if (this.run.phase === 'developer') this.setPhase(this.developerReturnPhase);
    else {
      this.developerReturnPhase = this.run.phase;
      this.setPhase('developer');
    }
  }

  toggleDeveloperConsole(): void {
    if (!import.meta.env.DEV) return;
    if (this.run.phase === 'console') this.setPhase(this.consoleReturnPhase);
    else {
      this.consoleReturnPhase = this.run.phase;
      this.setPhase('console');
    }
  }

  executeDeveloperCommand(input: string): void {
    if (
      !import.meta.env.DEV ||
      !['developer', 'console'].includes(this.run.phase) ||
      !this.developerTools
    )
      return;
    const previousCommand = this.developerTools.history.at(-1);
    const result = executeDeveloperCommand(
      this.developerTools,
      this.run,
      input,
      this.canUseDeveloperCheats(),
      this.landscape.world3d,
    );
    if (result.cheated) this.developerRun = true;
    if (this.developerTools.history.at(-1) !== previousCommand)
      void this.platform
        .saveDeveloperCommandHistory(this.developerTools.history)
        .catch(() => this.callbacks?.onSaveError());
    this.callbacks?.onHud(this.snapshot());
  }

  private canUseDeveloperCheats(): boolean {
    let phase = this.run.phase;
    if (phase === 'console') phase = this.consoleReturnPhase;
    if (phase === 'developer') phase = this.developerReturnPhase;
    if (['settings', 'help'].includes(phase)) phase = this.utilityReturnPhase;
    return !this.run.legacy.outcome && !['ready', 'intro', 'traditions'].includes(phase);
  }

  startDeveloperLevel(id: string): void {
    if (
      !import.meta.env.DEV ||
      this.run.phase !== 'developer' ||
      !DEVELOPER_LEVELS.some((level) => level.id === id)
    )
      return;
    this.audio.unlock();
    this.scene.restart({ developerLevel: id });
  }

  togglePause(): void {
    if (this.run.phase === 'traditions') {
      this.setPhase('ready');
      return;
    }
    if (this.run.phase === 'saves') {
      if (!this.persistence.busy) this.setPhase(this.saveMenuReturn);
      return;
    }
    if (this.run.phase === 'intro') this.skipIntro();
    else if (this.run.phase === 'story') this.chooseStory();
    else if (this.run.phase === 'epilogue') this.closeEpilogue();
    else if (this.run.phase === 'story-log') this.closePlanning();
    else if (this.run.phase === 'playing') this.setPhase('paused');
    else if (this.run.phase === 'paused') this.setPhase('playing');
    else if (
      ['building', 'route', 'journal', 'settings', 'help', 'developer', 'console'].includes(
        this.run.phase,
      )
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

  closeCamp(): void {
    if (this.run.phase !== 'building') return;
    this.callbacks?.onCampBack?.();
    this.closePlanning();
  }

  closePlanning(): void {
    if (this.run.phase === 'traditions') {
      this.setPhase('ready');
      return;
    }
    if (this.run.phase === 'saves') {
      this.togglePause();
      return;
    }
    if (this.run.phase === 'building' && this.callbacks?.onCampBack?.()) return;
    if (this.run.phase === 'console') {
      this.setPhase(this.consoleReturnPhase);
      return;
    }
    if (this.run.phase === 'developer') {
      this.setPhase(this.developerReturnPhase);
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

  openUtilityMenu(menu: 'settings' | 'help'): void {
    if (this.run.phase !== 'ready' && this.run.phase !== 'paused') return;
    this.utilityReturnPhase = this.run.phase;
    this.setPhase(menu);
  }

  improveNomadicCamp(id: NomadicBuildingId, slot?: number): void {
    if (!purchaseNomadicBuilding(this.run, id, slot)) return;
    this.persistence.saveCamp();
    this.campPresenter.refresh();
    this.audio.play('build');
    this.publishPhase();
  }

  improveEstate(kind: EstatePurchaseKind, id: string, rank: number): void {
    if (!purchaseEstate(this.run, kind, id, rank)) return;
    this.persistence.saveCamp();
    this.campPresenter.refresh();
    this.audio.play('build');
    this.publishPhase();
  }

  construct(id: BuildingId, path?: string, slot?: number): void {
    const previousCooldown = gallopCooldown(this.run);
    if (!buildStructure(this.run, id, path, slot)) return;
    this.persistence.saveCamp();
    this.timers.dashTimer *= gallopCooldown(this.run) / previousCooldown;
    this.campPresenter.refresh();
    this.audio.play('build');
    this.publishPhase();
  }

  chooseRoute(id: string, destinationId?: string): void {
    if (!beginMigration(this.run, id, destinationId)) return;
    this.persistence.requestCheckpoint();
    this.campPresenter.beginPacking();
    this.areaThreats = createAreaThreats();
    this.areaEncounter = createAreaEncounter();
    syncAreaEncounter(this.areaEncounter, this.run);
    this.areaEffects.clear();
    this.landscape.setRegion(this.run.clan.region, currentLocation(this.run), id);
    this.reconcileTerrain();
    this.campPresenter.refresh();
    this.setPhase('playing');
    this.audio.play('depart');
  }

  cycleFormation(): void {
    if (this.run.phase !== 'playing') return;
    const formations = availableFormations(this.run);
    if (formations.length > 1) completeGuidance(this.run, 'formation');
    this.run.clan.formation =
      formations[(formations.indexOf(this.run.clan.formation) + 1) % formations.length]!;
    this.run.clan.message = FORMATIONS[this.run.clan.formation].description;
    this.callbacks?.onHud(this.snapshot());
  }

  changeZoom(steps: number): void {
    if (this.run.phase !== 'playing' || !Number.isFinite(steps)) return;
    this.applyCameraZoom(
      steps === 0 ? GAME.camera.defaultZoom : this.cameras.main.zoom + steps * GAME.camera.zoomStep,
    );
    this.callbacks?.onHud(this.snapshot());
  }

  private applyCameraZoom(zoom: number): void {
    const camera = this.cameras.main;
    this.cameraZoom = clampCameraZoom(zoom, camera.width, camera.height);
    camera.setZoom(this.cameraZoom);
  }

  toggleGuidance(): void {
    this.guidanceEnabled = !this.run.guidance.enabled;
    this.run.guidance.enabled = this.guidanceEnabled;
    this.publishPhase();
  }

  setVisualSetting(key: keyof VisualSettings): void {
    if (this.run.phase !== 'settings') return;
    if (key === 'projectileContrast')
      this.visualSettings.projectileContrast =
        this.visualSettings.projectileContrast === 'high' ? 'standard' : 'high';
    else if (key === 'effectDensity')
      this.visualSettings.effectDensity =
        this.visualSettings.effectDensity === 'full'
          ? 'reduced'
          : this.visualSettings.effectDensity === 'reduced'
            ? 'minimal'
            : 'full';
    for (const shot of this.hostileShots.getChildren() as Projectile[])
      if (shot.active) this.styleHostileProjectile(shot);
    this.updateAreaCombat(0);
    void this.platform
      .saveVisualSettings(this.visualSettings)
      .catch(() => this.callbacks?.onSaveError());
  }

  private reconcileTerrain(): void {
    const navigation = this.landscape.navigation;
    this.terrainCollision.setTerrain(navigation);
    if (!navigation) {
      this.spatial.rebuild(this.enemies.getChildren() as Enemy[]);
      return;
    }
    for (const actor of [
      this.player,
      ...this.enemies.getChildren(),
      ...this.gems.getChildren(),
    ] as (Phaser.Physics.Arcade.Sprite | Gem)[]) {
      if (!actor.active) continue;
      const safe = navigation.nearestWalkable(actor);
      if (!safe || (safe.x === actor.x && safe.y === actor.y)) continue;
      actor.setPosition(safe.x, safe.y);
      actor.body?.updateFromGameObject();
      if (!(actor instanceof Gem)) actor.setDepth(100 + actor.y);
    }
    this.shadow.setPosition(this.player.x + 9, this.player.y + 5).setDepth(99 + this.player.y);
    this.aura.setPosition(this.player.x, this.player.y);
    for (const [enemy, shadow] of this.enemyShadows)
      if (enemy.active) shadow.setPosition(enemy.x + 6, enemy.y + 4).setDepth(99 + enemy.y);
    this.riders.forEach((rider, index) => {
      if (!rider.visible) return;
      const safe = navigation.nearestWalkable(rider);
      if (!safe) return;
      rider.setPosition(safe.x, safe.y).setDepth(100 + safe.y);
      this.riderShadows[index]!.setPosition(safe.x + 7, safe.y + 4).setDepth(99 + safe.y);
    });
    this.spatial.rebuild(this.enemies.getChildren() as Enemy[]);
  }

  private styleHostileProjectile(shot: Projectile): void {
    const high = this.visualSettings.projectileContrast === 'high';
    shot
      .setScale(high ? 1.45 : 1.1)
      .setTint(high ? 0xffc36b : 0xb94948)
      .setDepth(9200);
    const radius = 5.4 / shot.scaleX;
    shot.setCircle(radius, shot.width / 2 - radius, shot.height / 2 - radius);
  }

  toggleAudio(): boolean {
    this.audio.muted = !this.audio.muted;
    if (!this.audio.muted) this.audio.unlock();
    void this.platform.saveMuted(this.audio.muted).catch(() => this.callbacks?.onSaveError());
    return this.audio.muted;
  }

  setAudioVolume(channel: AudioChannel, value: number): void {
    this.audio.setVolume(channel, value);
    void this.platform.saveAudioMix(this.audio.volumes).catch(() => this.callbacks?.onSaveError());
  }

  playInterfaceSound(): void {
    this.audio.unlock();
    this.audio.play('ui');
  }

  auditionAudio(kind: SoundKind): void {
    if (this.run.phase === 'settings') this.audio.audition(kind);
  }

  dash(): void {
    if (this.run.phase !== 'playing' || !isKhanActive(this.run) || this.timers.dashTimer > 0)
      return;
    this.run.combat.gallopSerial++;

    this.timers.dashRemaining = GAME.dash.duration;
    this.timers.dashTimer = gallopCooldown(this.run);
    this.timers.invulnerable = Math.max(this.timers.invulnerable, GAME.dash.duration);
    this.audio.play('dash');
    this.effects.burst(this.player.x, this.player.y, 0xc8df9b, 7);
  }

  update(_time: number, delta: number): void {
    if (!this.controls.pollController()) return;
    if (this.run.phase !== 'playing') return;
    if (this.presentStory()) return;
    const dt = Math.min(delta / 1000, 0.05);
    observeExpedition(
      this.run,
      dt,
      isKhanActive(this.run) && this.player.body!.velocity.length() > GAME.mounted.minimumSpeed,
      isKhanActive(this.run) &&
        Math.hypot(this.player.x - this.camp.x, this.player.y - this.camp.y) < 300,
    );
    if (!isKhanActive(this.run) && this.player.active) {
      beginSuccession(this.run);
      this.hideFallenKhan();
    }

    this.run.elapsed += dt;

    advanceCampRecovery(this.run, dt);
    this.timers.dashTimer = Math.max(0, this.timers.dashTimer - dt);
    this.timers.invulnerable = Math.max(0, this.timers.invulnerable - dt);
    this.timers.dashRemaining = Math.max(0, this.timers.dashRemaining - dt);
    const outcome = advanceClan(this.run, dt, this.clanProtection);
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
    if (this.run.clan.integrity <= 0 || this.run.clan.population <= 0) {
      this.finish('dead');
      return;
    }
    if (advanceSuccession(this.run, dt)) this.returnKhan();
    advanceMountedCombat(this.run, dt, this.player, this.timers.dashRemaining > 0);
    if (isKhanActive(this.run)) this.movePlayer(dt);
    else this.player.setPosition(this.camp.x, this.camp.y + GAME.khan.campOffset);
    this.audio.update(dt, {
      speed: isKhanActive(this.run) ? this.player.body!.velocity.length() : 0,
      galloping: this.timers.dashRemaining > 0,
      caravan: this.run.clan.stage === 'migration',
      region: this.run.clan.region,
      environment: environmentForLocation(currentLocation(this.run)),
      listener: isKhanActive(this.run) ? this.player : this.camp,
      camp: this.camp,
    });
    syncFieldState(this.run);
    if (syncAreaEncounter(this.areaEncounter, this.run)) this.areaThreats = createAreaThreats();
    if (
      advanceEncounters(
        this.run,
        this.enemies.countActive(true) > 0 ||
          this.hostileShots.countActive(true) > 0 ||
          this.hazards.some((hazard) => hazard.source === 'seer') ||
          this.areaThreats.threats.some(
            (threat) =>
              !!threat.owner &&
              threat.impacted &&
              GAME.areaCombat.threats[threat.kind].tickDamage > 0 &&
              threat.age < threat.warning + GAME.areaCombat.threats[threat.kind].duration,
          ),
      )
    )
      this.audio.play('encounter');
    this.updateFieldObjectives(dt);
    this.updateCrossing(dt);
    this.updateFinalStand(dt);
    this.updateEnemies(dt);
    if (this.run.clan.integrity <= 0 || this.run.clan.population <= 0) {
      this.finish('dead');
      return;
    }
    this.spatial.rebuild(this.enemies.getChildren() as Enemy[]);
    this.updateSupport(dt);
    this.timers.attackTimer -= dt;
    if (this.timers.attackTimer <= 0) this.fire();
    this.fireRiders();
    this.timers.spawnTimer -= dt;
    if (this.timers.spawnTimer <= 0) {
      const spawned = this.spawnEnemy();
      this.timers.spawnTimer =
        encounterSpawnDelay(
          this.run.clan.stageTime,
          this.run.clan.region,
          this.run.clan.stage === 'migration'
            ? (ROUTES.find((r) => r.id === this.run.clan.routeId)?.danger ?? 1)
            : 1,
          spawned,
        ) * (spawned ? encounterPlan(this.run).interval : 1);
    }
    this.updateProjectiles(dt);
    this.collectGems(dt);
    if (this.run.phase !== 'playing') return;
    this.updateAreaCombat(dt);
    this.persistence.tick(dt);
    if (this.run.clan.integrity <= 0 || this.run.clan.population <= 0) {
      this.finish('dead');
      return;
    }
    this.updateCharacterAnimations(dt);
    this.hudTimer -= dt;
    if (this.hudTimer <= 0) {
      this.hudTimer = GAME.hud.updateInterval;
      this.callbacks?.onHud(this.snapshot());
    }
    if (
      this.run.clan.stage === 'final' &&
      !this.run.clan.finalBossSpawned &&
      this.run.clan.stageTime >= GAME.finalStand.bossDelay
    ) {
      if (this.spawnEnemy(SKYBREAKER)) this.run.clan.finalBossSpawned = true;
    }
    this.presentStory();
  }

  private movePlayer(dt: number): void {
    const movement = this.controls.movement();
    if (this.landscape.world3d) {
      const rotated = this.landscape.world3d.movement(movement.x, movement.y);
      movement.set(rotated.x, rotated.y);
    }
    const moving = movement.lengthSq() > 0.01;
    if (moving) {
      completeGuidance(this.run, 'ride');
      this.facing.copy(movement).normalize();
    }
    if (this.timers.dashRemaining > 0) movement.copy(this.facing).scale(GAME.dash.speed);
    else
      movement.scale(
        this.run.stats.speed *
          khanSpeedMultiplier(this.run) *
          areaMovementMultiplier(this.areaThreats, this.player),
      );
    this.player.setVelocity(movement.x, movement.y);
    const faceX = this.landscape.world3d?.screenX(this.facing.x, this.facing.y) ?? this.facing.x;
    if (Math.abs(faceX) > 0.01) this.player.setFlipX(faceX < 0);
    this.player.setAlpha(
      this.timers.invulnerable > 0 ? (Math.floor(this.run.elapsed * 20) % 2 ? 0.5 : 0.85) : 1,
    );
    this.player.setDepth(100 + this.player.y);
    this.shadow.setPosition(this.player.x + 9, this.player.y + 5).setDepth(99 + this.player.y);
    this.dustTimer -= dt;
    if (moving && effectAmount(this.visualSettings) > 0 && this.dustTimer <= 0) {
      this.effects.dust(this.player.x, this.player.y, this.facing.x, this.timers.dashRemaining > 0);
      this.dustTimer = 0.12 / Math.max(0.1, effectAmount(this.visualSettings));
    }
    this.aura.setPosition(this.player.x, this.player.y);
    this.controls.drawJoystick();
  }

  private spawnEnemy(
    forced?: EnemyDefinition,
    directive?: {
      point?: { x: number; y: number };
      angle?: number;
      objectiveId?: number;
      crossingId?: string;
      campOnly?: boolean;
    },
  ): boolean {
    if (this.enemies.countActive(true) >= GAME.maxEnemies) return false;
    const selection = encounterEnemy(this.run);
    const definition = forced ?? selection.definition;
    const isBoss = definition.behavior === 'boss';
    const plan = encounterPlan(this.run);
    const camera = this.cameras.main;
    const anchor =
      directive?.campOnly || !isKhanActive(this.run) || Math.random() < 0.45
        ? this.camp
        : this.player;
    const area = AREA_ENCOUNTERS[currentLocation(this.run).id];
    const base =
      area.pattern === 'banks'
        ? areaRiverTangent(
            this.landscape.navigation?.terrain,
            currentLocation(this.run).id,
            anchor,
            plan.angle,
          )
        : plan.angle;
    const angle =
      directive?.angle ??
      (['warning', 'assault', 'elite'].includes(plan.phase)
        ? areaArrivalAngle(this.areaEncounter, this.run, base) +
          Phaser.Math.FloatBetween(-0.35, 0.35)
        : Phaser.Math.FloatBetween(0, Math.PI * 2));
    const viewWidth = camera.width / camera.zoom;
    const viewHeight = camera.height / camera.zoom;
    const view = {
      x: camera.midPoint.x - viewWidth / 2,
      y: camera.midPoint.y - viewHeight / 2,
      width: viewWidth,
      height: viewHeight,
    };
    const navigation = this.landscape.navigation;
    const world = this.landscape.world3d;
    let point;
    if (directive?.point) {
      point = directive.point;
      if (navigation && !navigation.isWalkable(point.x, point.y, GAME.terrain.actorClearance, true))
        return false;
    } else if (world?.spawnView && navigation) {
      point = projectedEnemySpawnPosition(
        world.spawnView,
        anchor,
        isKhanActive(this.run) ? this.player : undefined,
        angle,
        {
          heightAt: (x, y) =>
            world.terrain.actorHeight(x, y) * world.terrain.region.biome.heightScale,
          walkable: (x, y) => navigation.isWalkable(x, y, GAME.terrain.actorClearance, true),
          preference:
            definition.home && definition.habitat
              ? (x, y) =>
                  habitatPreference(
                    areaSurface(navigation.terrain, currentLocation(this.run).id, x, y),
                    definition.habitat!,
                  )
              : undefined,
        },
      );
      if (!point) return false;
    } else {
      point = enemySpawnPosition(view, anchor, angle);
      if (navigation) {
        let safe = navigation.nearestWalkable(point);
        // Prefer connected ground beyond the view; never start a pooled actor inside a cliff.
        for (let attempt = 0; attempt < 12; attempt++) {
          const candidate = enemySpawnPosition(view, anchor, angle + (attempt * Math.PI) / 6);
          if (navigation.isWalkable(candidate.x, candidate.y, GAME.terrain.actorClearance, true)) {
            safe = candidate;
            break;
          }
        }
        if (!safe) return false;
        point = safe;
      }
    }
    const { x, y } = point;
    if (
      isKhanActive(this.run) &&
      Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y) <
        GAME.spawning.minimumPlayerDistance
    )
      return false;
    const enemy = this.enemies.get(x, y, ...artTexture(definition.texture)) as Enemy | null;
    if (!enemy) return false;
    this.initializeEnemy(enemy, definition, x, y);
    enemy.elite ||= !forced && !!selection.elite;
    enemy.objectiveId = directive?.objectiveId;
    enemy.crossingId = directive?.crossingId;
    if (isBoss)
      this.run.clan.message =
        'THE SKYBREAKER — hold the line. Your people are the victory condition.';
    if (!forced && selection.elite) this.run.encounters.eliteSpawned = true;
    if (!directive?.point) this.areaEncounter.arrivals++;
    return true;
  }

  private initializeEnemy(enemy: Enemy, definition: EnemyDefinition, x: number, y: number): void {
    const isBoss = definition.behavior === 'boss';
    enemy.enableBody(true, x, y, true, true);
    const width = (ART_WIDTH[definition.texture] ?? 50) * (definition.scale / (isBoss ? 4 : 2));
    styleActor(enemy, definition.texture, width, 5 * definition.scale);
    enemy.setTint(definition.tint ?? 0xffffff);
    if (!this.enemyShadows.has(enemy)) this.enemyShadows.set(enemy, this.add.image(x, y, 'shadow'));
    this.enemyShadows
      .get(enemy)!
      .setDisplaySize(width * 0.9, width * 0.3)
      .setVisible(true);
    enemy.definition = definition;
    enemy.elite = !!definition.elite;
    enemy.health = definition.health * (isBoss ? 1 : 1 + this.run.elapsed / 1200);
    enemy.maxHealth = enemy.health;
    enemy.spawnId += 1;
    enemy.setAlpha(1).setAngle(0).setVelocity(0, 0);
    enemy.attackTimer = 1.5;
    enemy.clanAttackTimer = 0;
    enemy.chargeTimer = 0;
    enemy.burning = 0;
    enemy.tactics = createEnemyTactics();
    enemy.tacticalSlot = this.enemies.getChildren().indexOf(enemy);
    enemy.pinned = 0;
    enemy.lastGallop = -1;
    enemy.dangerTimer = definition.ability
      ? GAME.areaCombat.abilityEvery + (enemy.tacticalSlot % 7) * 0.15
      : GAME.tactics.seerEvery;
    enemy.objectiveId = undefined;
    enemy.crossingId = undefined;
    if (isBoss) this.boss = enemy;
    if (!isCharacterKind(definition.texture))
      throw new Error(`Missing character animation: ${definition.texture}`);
    enemy.motion.reset(definition.texture, Math.random());
    enemy.preparingAttack = false;
  }

  private updateFinalStand(dt: number): void {
    const state = syncFinalStand(this.run);
    if (!state) {
      this.passageMarkers.forEach((marker) => marker.update());
      return;
    }
    if (!this.passageMarkers.length)
      this.passageMarkers = [
        new FieldMarkers(this, this.fieldMarkers.warnings),
        new FieldMarkers(this, this.fieldMarkers.warnings),
      ];
    state.works.forEach((work, index) => {
      if (work.x === undefined || work.y === undefined) {
        const desired = {
          x: this.camp.x + (index ? 1 : -1) * GAME.finalStand.workOffset,
          y: this.camp.y + 180,
        };
        const point = this.landscape.navigation?.nearestWalkable(desired) ?? desired;
        work.x = point.x;
        work.y = point.y;
      }
      const unlocked = this.run.clan.stageTime >= GAME.finalStand.workUnlockAt[index]!;
      this.passageMarkers[index]!.update(
        {
          kind: 'refugees',
          x: work.x,
          y: work.y,
          status: work.done ? 'complete' : unlocked ? 'available' : 'abandoned',
        },
        dt,
      );
    });
    const contested = state.works.map((work) =>
      (this.enemies.getChildren() as Enemy[]).some(
        (e) => e.active && Math.hypot(e.x - work.x!, e.y - work.y!) < GAME.finalStand.contestRadius,
      ),
    );
    const event = advanceFinalStand(this.run, dt, !!this.boss?.active, this.player, contested);
    const boss = this.boss;
    if (!boss?.active) return;
    const chapter = finalChapter(this.run);
    if (event === 'warning') {
      const angle = (state.approach * Math.PI) / 2;
      state.aim =
        chapter === 0 && isKhanActive(this.run)
          ? { x: this.player.x, y: this.player.y }
          : { x: this.camp.x + Math.cos(angle) * 80, y: this.camp.y + Math.sin(angle) * 80 };
      this.run.clan.message =
        chapter === 0
          ? 'The Skybreaker draws breath. Move away from the marked line.'
          : 'The Skybreaker turns toward another approach. Guard the warned side.';
      this.audio.play('encounter', boss);
    }
    if (event === 'release' && state.aim) {
      const direction = Math.atan2(state.aim.y - boss.y, state.aim.x - boss.x);
      const count = GAME.finalStand.barrageShots[chapter];
      for (let index = 0; index < count; index++) {
        const shot = this.fireHostile(
          boss,
          direction + (index / (count - 1) - 0.5) * GAME.finalStand.barrageSpread,
        );
        if (shot) {
          shot.barrage = state.cycle;
          shot.damage *= GAME.finalStand.barrageDamage;
        }
      }
      boss.motion.attack();
      this.run.clan.message = 'The Skybreaker falters. Its exposed form takes 50% more damage.';
      if (chapter > 0)
        for (let i = 0; i < GAME.finalStand.assaultCount; i++)
          this.spawnEnemy(
            supportingAreaEnemy(this.run, state.cycle + i, [i ? 'hollow-seer' : 'ghost-rider']),
            { angle: (state.approach * Math.PI) / 2 + (i ? 0.3 : -0.3), campOnly: true },
          );
    }
  }

  private updateCrossing(dt: number): void {
    const c = this.run.crossing,
      nav = this.landscape.navigation;
    if (this.run.clan.stage !== 'migration' || !c) {
      this.crossingMarkers.update();
      return;
    }
    let threats = 0;
    if (c.escort)
      for (const e of this.enemies.getChildren() as Enemy[])
        if (e.active && Math.hypot(e.x - c.escort.x, e.y - c.escort.y) < 160) threats++;
    if (advanceCrossingEncounter(this.run, dt, this.player, this.camp, threats))
      this.audio.play('encounter');
    if (c.phase === 'warning' && c.route === 'refuge' && !c.escort) {
      const desired = { x: this.camp.x + 380, y: this.camp.y + 200 };
      const point = nav?.nearestWalkable(desired) ?? desired;
      c.escort = { x: point.x, y: point.y, progress: 0, exposure: 0, joined: false, lost: false };
    }
    const definition = CROSSING_ENCOUNTERS[c.route];
    c.spawnDelay = Math.max(0, c.spawnDelay - dt);
    if (c.phase === 'assault' && c.spawned < definition.guards && c.spawnDelay <= 0) {
      const id =
        c.route === 'ridge'
          ? c.spawned % 2
            ? 'hollow-seer'
            : 'brute'
          : c.spawned % 2
            ? 'ghost-rider'
            : 'bat';
      const enemy = supportingAreaEnemy(this.run, c.spawned, [id]);
      const angle =
        c.route === 'river'
          ? c.spawned % 2
            ? Math.PI / 2
            : -Math.PI / 2
          : c.route === 'ridge'
            ? 0
            : Math.PI;
      if (this.spawnEnemy(enemy, { angle, crossingId: c.key, campOnly: true })) {
        c.spawned++;
        c.spawnDelay = GAME.crossings.spawnInterval;
      } else c.spawnDelay = GAME.spawning.retryInterval;
    }
    const e = c.escort;
    if (
      e &&
      !e.joined &&
      !e.lost &&
      isKhanActive(this.run) &&
      threats === 0 &&
      Math.hypot(e.x - this.player.x, e.y - this.player.y) < GAME.field.escortLeash
    ) {
      const to = nav?.waypoint(e, this.camp) ?? this.camp,
        distance = Math.max(1, Math.hypot(to.x - e.x, to.y - e.y));
      const step = Math.min(1, (GAME.field.escortSpeed * dt) / distance),
        desired = { x: e.x + (to.x - e.x) * step, y: e.y + (to.y - e.y) * step };
      Object.assign(e, nav?.slide(e, desired, 18) ?? desired);
    }
    this.crossingMarkers.update(
      e && !e.joined && !e.lost
        ? { kind: 'refugees', status: 'returning', x: e.x, y: e.y }
        : undefined,
      dt,
    );
  }

  private updateFieldObjectives(dt: number): void {
    const run = this.run,
      nav = this.landscape.navigation;
    if (fieldObjectiveDue(run)) {
      for (let i = 0; i < 12; i++) {
        const angle = run.field.issued * 1.7 + (i * Math.PI) / 6;
        const desired = {
          x: this.camp.x + Math.cos(angle) * GAME.field.radius,
          y: this.camp.y + Math.sin(angle) * GAME.field.radius,
        };
        const point = nav ? nav.nearestWalkable(desired) : desired;
        if (
          point &&
          Math.hypot(point.x - desired.x, point.y - desired.y) < 160 &&
          startFieldObjective(run, point)
        )
          break;
      }
    }
    const o = run.field.objective;
    if (o && o.status === 'available' && o.kind === 'gathering' && o.guards < GAME.field.guards) {
      const angle = (o.guards * Math.PI * 2) / GAME.field.guards;
      const desired = { x: o.x + Math.cos(angle) * 85, y: o.y + Math.sin(angle) * 85 };
      const point = nav ? nav.nearestWalkable(desired) : desired;
      if (
        point &&
        this.spawnEnemy(supportingAreaEnemy(this.run, o.guards, ['wisp']), {
          point,
          objectiveId: o.id,
        })
      )
        o.guards++;
    }
    let threats = 0;
    if (o)
      for (const e of this.enemies.getChildren() as Enemy[])
        if (e.active && Math.hypot(e.x - o.x, e.y - o.y) < 180) threats++;
    advanceFieldObjective(run, dt, this.player, this.camp, threats);
    if (
      o?.status === 'returning' &&
      isKhanActive(run) &&
      Math.hypot(o.x - this.player.x, o.y - this.player.y) < GAME.field.escortLeash &&
      threats === 0
    ) {
      const to = nav?.waypoint(o, this.camp) ?? this.camp;
      const distance = Math.hypot(to.x - o.x, to.y - o.y);
      const step = Math.min(1, (GAME.field.escortSpeed * dt) / Math.max(1, distance));
      const desired = { x: o.x + (to.x - o.x) * step, y: o.y + (to.y - o.y) * step };
      Object.assign(o, nav?.slide(o, desired, 18) ?? desired);
    }
    this.fieldMarkers.update(o, dt);
  }

  private updateEnemies(dt: number): void {
    const clan = this.run.clan;
    const boundary = campBoundary(this.run);
    const khanActive = isKhanActive(this.run);
    const warnings = this.fieldMarkers.warnings.clear();
    for (const trail of this.run.combat.trails)
      warnings
        .lineStyle(1, 0x78b6ae, (0.3 * trail.remaining) / GAME.mounted.trailSeconds)
        .strokeCircle(trail.x, trail.y, GAME.mounted.trailRadius);
    for (const enemy of this.enemies.getChildren() as Enemy[]) {
      const shadow = this.enemyShadows.get(enemy);
      shadow?.setVisible(enemy.active);
      if (!enemy.active) continue;
      const objective = this.run.field.objective;
      if (
        (objective?.kind === 'gathering' &&
          objective.status === 'available' &&
          enemy.objectiveId === objective.id) ||
        (this.run.clan.stage === 'migration' &&
          this.run.crossing &&
          enemy.crossingId === this.run.crossing.key)
      )
        warnings.lineStyle(2, 0xdfbc74, 0.8).strokeCircle(enemy.x, enemy.y, 22);
      let campDistance = Phaser.Math.Distance.Between(enemy.x, enemy.y, this.camp.x, this.camp.y);
      const finaleWarning = enemy === this.boss ? this.run.finalStand : undefined;
      if (finaleWarning?.phase === 'warning' && finaleWarning.aim)
        warnings
          .lineStyle(4, 0xdc976a, 0.85)
          .lineBetween(enemy.x, enemy.y, finaleWarning.aim.x, finaleWarning.aim.y)
          .strokeCircle(finaleWarning.aim.x, finaleWarning.aim.y, 70);
      if (finaleWarning?.phase === 'recovery')
        warnings.lineStyle(3, 0xf0d194, 0.8).strokeCircle(enemy.x, enemy.y, 52);
      const clearance = boundary.attackRange - 1;
      if (campDistance < clearance) {
        // Moving or expanding hurdles push attackers out instead of covering them.
        const contact = barrierContact(this.camp, enemy, clearance);
        enemy.setPosition(contact.x, contact.y);
        enemy.body!.updateFromGameObject();
        campDistance = clearance;
      }
      enemy.setDepth(100 + enemy.y);
      shadow?.setPosition(enemy.x + 8, enemy.y + 5).setDepth(99 + enemy.y);
      enemy.attackTimer -= dt;
      enemy.clanAttackTimer -= dt;
      enemy.chargeTimer -= dt;
      enemy.pinned = Math.max(0, enemy.pinned - dt);
      enemy.dangerTimer -= dt;
      const playerDistance = khanActive
        ? Phaser.Math.Distance.Between(enemy.x, enemy.y, this.player.x, this.player.y)
        : Infinity;
      if (
        playerDistance > GAME.spawning.despawnDistance &&
        campDistance > GAME.spawning.despawnDistance &&
        enemy !== this.boss &&
        !this.landscape.world3d?.nearView(enemy, GAME.spawning.viewRetentionMargin)
      ) {
        enemy.disableBody(true, true);
        continue;
      }
      const attackingCamp = campDistance <= boundary.attackRange;
      let target: { x: number; y: number } =
        attackingCamp || campDistance < playerDistance * 1.25 ? this.camp : this.player;
      const finale = enemy.definition.behavior === 'boss' ? this.run.finalStand : undefined;
      if (finale) {
        const angle = (finale.approach * Math.PI) / 2;
        const desired = {
          x: this.camp.x + Math.cos(angle) * (boundary.attackRange + 180),
          y: this.camp.y + Math.sin(angle) * (boundary.attackRange + 180),
        };
        target = this.landscape.navigation?.nearestWalkable(desired) ?? desired;
      }
      const distance = Phaser.Math.Distance.Between(enemy.x, enemy.y, target.x, target.y);
      const behavior = enemy.definition.behavior;
      const ranged = behavior === 'ranged' || behavior === 'boss';
      const clearShot =
        !this.landscape.world3d ||
        !ranged ||
        distance >= 650 ||
        this.landscape.navigation!.lineClear(enemy, target, 0);
      let speed =
        enemy.definition.speed *
        (1 + clan.region * 0.1) *
        Math.max(
          0.65,
          1 /
            Math.sqrt(
              this.landscape.navigation?.travelCost(enemy, enemy.definition.navigation) ?? 1,
            ),
        );
      if (enemy.definition.home && enemy.definition.habitat) {
        const surface = areaSurface(
          this.landscape.navigation?.terrain,
          currentLocation(this.run).id,
          enemy.x,
          enemy.y,
        );
        const suited = habitatPreference(surface, enemy.definition.habitat) > 0.5;
        if (suited) speed *= GAME.areaEnemies.habitatSpeed;
        enemy.setAlpha(
          enemy.definition.concealed &&
            suited &&
            Math.min(playerDistance, campDistance) > GAME.areaEnemies.revealRange
            ? GAME.areaEnemies.concealedAlpha
            : 1,
        );
      }
      if (enemy.elite) warnings.lineStyle(3, 0xe0bc76, 0.85).strokeCircle(enemy.x, enemy.y, 30);

      speed *= 1;
      if (enemy.pinned > 0 || (finale && finale.phase !== 'advance')) speed = 0;
      if (
        this.run.combat.trails.some(
          (t) => Math.hypot(enemy.x - t.x, enemy.y - t.y) < GAME.mounted.trailRadius,
        )
      )
        speed *= 1 - GAME.mounted.trailSlow;
      if (ranged && !finale && distance < 260 && clearShot) speed = 0;
      if (finale && finale.phase !== 'advance') {
        enemy.setVelocity(0, 0);
      } else if (attackingCamp) {
        // Hold outside the tents instead of walking (or charging) into their centre.
        enemy.setVelocity(0, 0);
        enemy.chargeTimer = 0;
        enemy.tactics = createEnemyTactics();
      } else {
        const tactical = tacticalGoal(
          enemy.definition,
          enemy,
          target,
          enemy.tacticalSlot,
          this.run.elapsed,
        );
        if (behavior === 'charger') {
          const state = enemy.tactics;
          const aim = state.aim ?? target;
          const angle = state.direction
            ? Math.atan2(state.direction.y, state.direction.x)
            : Math.atan2(aim.y - enemy.y, aim.x - enemy.x);
          const ahead = { x: enemy.x + Math.cos(angle) * 90, y: enemy.y + Math.sin(angle) * 90 };
          const blocked =
            !!this.landscape.navigation && !this.landscape.navigation.lineClear(enemy, ahead);
          advanceCharge(state, dt, enemy, target, blocked, enemy.pinned > 0);
          enemy.chargeTimer =
            state.phase === 'charge'
              ? state.remaining + 2.3
              : state.phase === 'windup'
                ? state.remaining
                : 0;
          if (state.phase === 'windup') {
            enemy.setVelocity(0, 0);
            enemy.preparingAttack = true;
            warnings
              .lineStyle(3, 0xc97b62, 0.65)
              .lineBetween(enemy.x, enemy.y, state.aim!.x, state.aim!.y);
          } else if (state.phase === 'charge') {
            const chargeAngle = Math.atan2(state.direction!.y, state.direction!.x);
            enemy.setVelocity(
              Math.cos(chargeAngle) * speed * 2.2,
              Math.sin(chargeAngle) * speed * 2.2,
            );
          } else {
            const waypoint =
              this.landscape.navigation?.waypoint(enemy, target, enemy.definition.navigation) ??
              target;
            this.physics.moveTo(
              enemy,
              waypoint.x,
              waypoint.y,
              speed * (state.phase === 'recover' ? 0.45 : 1),
            );
          }
        } else {
          const navigation = this.landscape.navigation;
          const waypoint =
            tactical !== target && (!navigation || navigation.lineClear(enemy, tactical))
              ? tactical
              : (navigation?.waypoint(enemy, target, enemy.definition.navigation) ?? target);
          const hold =
            !finale && ranged && clearShot && Math.abs(distance - GAME.tactics.seerRange) < 55;
          if (hold || speed === 0) enemy.setVelocity(0, 0);
          else this.physics.moveTo(enemy, waypoint.x, waypoint.y, speed);
        }
      }
      enemy.setFlipX(
        (this.landscape.world3d?.screenX(enemy.x - target.x, enemy.y - target.y) ??
          enemy.x - target.x) > 0,
      );
      enemy.preparingAttack =
        finale?.phase === 'warning' ||
        ((behavior === 'ranged' || behavior === 'boss') &&
          distance < 650 &&
          enemy.attackTimer > 0 &&
          enemy.attackTimer < 0.25) ||
        (attackingCamp && enemy.clanAttackTimer > 0 && enemy.clanAttackTimer < 0.2) ||
        (behavior === 'charger' && enemy.tactics.phase === 'windup') ||
        (!!enemy.definition.ability &&
          enemy.dangerTimer > 0 &&
          enemy.dangerTimer < 0.4 &&
          distance < GAME.areaCombat.abilityRange);
      if (attackingCamp && !finale && enemy.clanAttackTimer <= 0) {
        enemy.motion.attack();
        this.damageClan(
          enemy.definition.damage * GAME.camp.enemyAttack.damageMultiplier,
          'attack',
          enemy.definition.title ?? enemy.definition.id,
        );
        enemy.clanAttackTimer = GAME.camp.enemyAttack.interval;
        const impact = this.campBarrier.hit(this.camp, enemy);
        this.audio.play('barrier', impact);
        this.effects.burst(impact.x, impact.y - 12, 0xc9a26a, 3);
      }
      if (
        (behavior === 'ranged' || (behavior === 'boss' && !finale)) &&
        clearShot &&
        enemy.pinned <= 0 &&
        enemy.attackTimer <= 0 &&
        distance < 650
      ) {
        const angle = Math.atan2(target.y - enemy.y, target.x - enemy.x);
        const count = behavior === 'boss' ? 12 : (enemy.definition.volley?.shots ?? 1);
        enemy.motion.attack();
        for (let i = 0; i < count; i += 1)
          this.fireHostile(
            enemy,
            angle +
              (behavior === 'boss'
                ? (i * Math.PI * 2) / count
                : (i - (count - 1) / 2) * (enemy.definition.volley?.spread ?? 0)),
          );
        enemy.attackTimer = behavior === 'boss' ? 2.5 : (enemy.definition.volley?.interval ?? 3.5);
      }
      if (
        enemy.definition.ability &&
        distance < GAME.areaCombat.abilityRange &&
        enemy.dangerTimer <= 0 &&
        enemy.pinned <= 0 &&
        (!this.landscape.navigation || this.landscape.navigation.lineClear(enemy, target, 0))
      ) {
        const ability = enemy.definition.ability,
          owner = `${enemy.tacticalSlot}:${enemy.spawnId}`;
        let placed = 0;
        for (let i = 0; i < ability.count; i++) {
          const offset = (i - (ability.count - 1) / 2) * GAME.areaCombat.spread;
          const angle = Math.atan2(target.y - enemy.y, target.x - enemy.x);
          const point = {
            x: target.x - Math.sin(angle) * offset,
            y: target.y + Math.cos(angle) * offset,
          };
          if (this.queueAreaThreat(ability.kind, point, owner)) placed++;
        }
        enemy.dangerTimer = placed ? GAME.areaCombat.abilityEvery : GAME.areaCombat.abilityRetry;
        if (placed) {
          enemy.motion.attack();
          this.audio.play('spell', enemy);
        }
      }
      if (
        enemy.definition.id === 'hollow-seer' &&
        distance < 650 &&
        clearShot &&
        enemy.dangerTimer <= 0 &&
        enemy.pinned <= 0
      ) {
        this.hazards.push({
          x: target.x,
          y: target.y,
          remaining: GAME.tactics.seerDangerWarning,
          warning: this.add.graphics().setDepth(5),
          radius: seerDangerRadius(enemy.definition),
          damage: GAME.tactics.seerDangerDamage,
          source: 'seer',
        });
        enemy.dangerTimer = GAME.tactics.seerEvery;
      }
      if (
        enemy.active &&
        khanActive &&
        this.timers.dashRemaining > 0 &&
        playerDistance < 68 &&
        enemy.lastGallop !== this.run.combat.gallopSerial
      ) {
        enemy.lastGallop = this.run.combat.gallopSerial;
        const d = Math.max(1, playerDistance),
          push = GAME.mounted.breakthroughPush;
        if (push > 0) {
          const desired = {
            x: enemy.x + ((enemy.x - this.player.x) / d) * push,
            y: enemy.y + ((enemy.y - this.player.y) / d) * push,
          };
          const point =
            this.landscape.navigation?.slide(enemy, desired, GAME.terrain.actorClearance) ??
            desired;
          enemy.setPosition(point.x, point.y);
        }
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
        this.timers.dashRemaining > 0 &&
        clan.formation === 'wedge' &&
        playerDistance < 64
      )
        this.damageEnemy(enemy, dt * this.run.stats.damage * 18);
    }
  }

  private fire(): void {
    let hostFired = false;
    const momentum = this.run.clan.momentum;
    const target = this.spatial.nearest(
      this.player.x,
      this.player.y,
      GAME.projectile.range + this.run.clan.campEffects.bonuses.range + momentum * 120,
      (e) => !this.landscape.navigation || this.landscape.navigation.lineClear(this.player, e, 0),
    );
    if (isKhanActive(this.run) && target) {
      this.playerMotion.attack();
      if (this.player.body!.velocity.lengthSq() < 4)
        this.player.setFlipX(
          (this.landscape.world3d?.screenX(target.x - this.player.x, target.y - this.player.y) ??
            target.x - this.player.x) < 0,
        );
      const charged = this.run.combat.ready;
      const retreat = retreatShot(this.run, this.player, this.camp, target, this.facing);
      const released = this.shootVolley(
        this.player.x,
        this.player.y,
        target,
        this.run.stats.projectiles,
        (1 + momentum * 0.3) * (retreat ? GAME.mounted.retreatDamage : 1),
        false,
        charged,
        'khan',
      );
      hostFired ||= released;
      if (released && charged) {
        spendMountedVolley(this.run);
        this.effects.burst(this.player.x, this.player.y, 0xe3c78c, 5);
      }
    }
    if (hostFired) this.run.combat.volleys++;
    this.timers.attackTimer =
      this.run.stats.attackInterval *
      this.run.clan.campEffects.multipliers.hostInterval *
      (this.run.clan.formation === 'retreat' && momentum > 0.4 ? 0.7 : 1);
  }

  private fireRiders(): void {
    const count = riderCount(this.run);
    for (let i = 0; i < count; i += 1) {
      const rider = this.riders[i]!;
      const range = GAME.projectile.range + this.run.clan.campEffects.bonuses.range;
      const clear = (e: Enemy) =>
        !this.landscape.navigation || this.landscape.navigation.lineClear(rider, e, 0);
      const riderTarget = this.spatial.nearest(rider.x, rider.y, range, clear);
      if (
        riderTarget &&
        ((this.run.combat.riderFireAt ??= [])[i] ?? 0) <= this.run.elapsed &&
        this.shootVolley(
          rider.x,
          rider.y,
          riderTarget,
          1,
          (0.6 + (hasDevelopment(this.run, 'archery', 'veteran-riders') ? 0.3 : 0)) *
            this.run.clan.campEffects.multipliers.riderDamage,
        )
      ) {
        (this.run.combat.riderFireAt ??= [])[i] =
          this.run.elapsed +
          this.run.stats.attackInterval *
            this.run.clan.campEffects.multipliers.hostInterval *
            (this.run.clan.formation === 'retreat' && this.run.clan.momentum > 0.4 ? 0.7 : 1);
        this.riderMotions[i]!.attack();
        if (this.riderSpeeds[i]! < 2)
          rider.setFlipX(
            (this.landscape.world3d?.screenX(riderTarget.x - rider.x, riderTarget.y - rider.y) ??
              riderTarget.x - rider.x) < 0,
          );
      }
    }
  }

  private shootVolley(
    x: number,
    y: number,
    target: Enemy,
    count: number,
    damageOrMultiplier: number,
    ancestral = false,
    charged = false,
    owner: 'khan' | 'rider' | 'wagon' | 'wagon-ricochet' = 'rider',
    echoIndex?: number,
    ghost = false,
    origin?: Enemy,
  ): boolean {
    const volley =
      owner === 'wagon-ricochet'
        ? { tempest: false, count: 1, spacing: 0, damage: 1, speed: 1 }
        : volleyFactors(this.run, count);
    const direction = Math.atan2(target.y - y, target.x - x);
    const tempest = volley.tempest;
    const first = this.projectiles.get(x, y, 'bolt') as Projectile | null;
    if (!first) return false;
    const arrowCount = volley.count;
    const basePierces = this.run.stats.pierce + (charged ? 1 : 0);
    for (let i = 0; i < arrowCount; i += 1) {
      const bolt = i === 0 ? first : (this.projectiles.get(x, y, 'bolt') as Projectile | null);
      if (!bolt) break;
      const angle = direction + (i - (arrowCount - 1) / 2) * volley.spacing;
      bolt.enableBody(true, x, y, true, true);
      bolt.barrage = undefined;
      bolt.echoIndex = ancestral ? echoIndex : undefined;
      bolt.source =
        owner === 'khan' || owner === 'wagon' || owner === 'wagon-ricochet' ? owner : undefined;
      bolt.setData('terrain-previous', { x, y });
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
      bolt.pierces = basePierces;
      bolt.pins = false;
      if (charged) bolt.setTint(0xe2c586);
      bolt.hitTargets.clear();
      if (origin) bolt.hitTargets.set(origin, origin.spawnId);
      bolt.turn = tempest ? (i % 2 ? 1 : -1) * 0.65 : 0;
      if (bolt.fire) bolt.setTint(0xffa04e);
      if (ancestral) bolt.setTint(0x91ded6);
      bolt.damage =
        owner === 'wagon-ricochet'
          ? damageOrMultiplier
          : this.run.stats.damage *
            (charged ? GAME.mounted.chargedDamage : 1) *
            damageOrMultiplier *
            volley.damage;
      bolt.setData('base-damage', bolt.damage);
      bolt.setData('dealt-damage', 0);
      bolt.setData('precision', false);
      bolt.setData('ghost', ghost);
      bolt.remaining = GAME.projectile.lifetime;
      bolt.setVelocity(
        Math.cos(angle) * GAME.projectile.speed * volley.speed,
        Math.sin(angle) * GAME.projectile.speed * volley.speed,
      );
    }
    markExpedition(this.run, 'fight');
    this.audio.play('shoot', { x, y });
    return true;
  }

  private fireHostile(enemy: Enemy, angle: number): Projectile | undefined {
    const shot = this.hostileShots.get(enemy.x, enemy.y, 'gem') as Projectile | null;
    if (!shot) return;
    shot.enableBody(true, enemy.x, enemy.y, true, true);
    if (this.run.phase === 'playing') markExpedition(this.run, 'fight');
    shot.barrage = undefined;
    shot.source = enemy.definition.title ?? enemy.definition.id;
    shot.setData('terrain-previous', { x: enemy.x, y: enemy.y });
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
    shot.pins = false;
    shot.hitTargets.clear();
    shot.setVelocity(Math.cos(angle) * 125, Math.sin(angle) * 125);
    this.styleHostileProjectile(shot);
    this.audio.play('spell', enemy);
    return shot;
  }

  private updateProjectiles(dt: number): void {
    const terrain = this.landscape.world3d?.terrain;
    if (terrain)
      for (const projectile of [
        ...this.projectiles.getChildren(),
        ...this.hostileShots.getChildren(),
      ] as Projectile[]) {
        if (!projectile.active) continue;
        const previous = projectile.getData('terrain-previous') as
          { x: number; y: number } | undefined;
        if (previous && !projectileTerrainClear(terrain, previous, projectile))
          projectile.disableBody(true, true);
        projectile.setData('terrain-previous', { x: projectile.x, y: projectile.y });
      }
    const boundary = campBoundary(this.run);
    for (const bolt of this.projectiles.getChildren() as Projectile[]) {
      if (!bolt.active) continue;
      bolt.remaining -= dt;
      if (bolt.turn) {
        const body = bolt.body as Phaser.Physics.Arcade.Body;
        const angle = Math.atan2(body.velocity.y, body.velocity.x) + bolt.turn * dt;
        const speed = body.velocity.length();
        bolt.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
        bolt.setRotation(angle + Math.PI / 4);
      }
      if (bolt.remaining <= 0) bolt.disableBody(true, true);
    }
    for (const shot of this.hostileShots.getChildren() as Projectile[]) {
      if (!shot.active) continue;
      shot.remaining -= dt;
      if (shot.remaining <= 0) shot.disableBody(true, true);
      else if (
        Phaser.Math.Distance.Between(shot.x, shot.y, this.camp.x, this.camp.y) <= boundary.radius
      ) {
        if (acceptCampBarrage(this.run, shot.barrage))
          this.damageClan(shot.damage * 0.5, 'attack', shot.source);
        const impact = this.campBarrier.hit(this.camp, shot);
        this.audio.play('barrier', impact);
        this.effects.burst(impact.x, impact.y - 12, 0xc9a26a, 3);
        shot.disableBody(true, true);
      }
    }
  }

  private hitEnemy(bolt: Projectile, enemy: Enemy): void {
    if (
      this.run.phase !== 'playing' ||
      !bolt.active ||
      !enemy.active ||
      !this.projectileReaches(bolt)
    )
      return;
    if (bolt.hitTargets.get(enemy) === enemy.spawnId) return;
    bolt.hitTargets.set(enemy, enemy.spawnId);
    const hitDamage = bolt.damage;

    if (bolt.pierces > 0) {
      bolt.pierces -= 1;
    } else bolt.disableBody(true, true);
    if (bolt.fire) enemy.burning = 2;
    this.damageEnemy(enemy, hitDamage);
  }

  private projectileReaches(projectile: Projectile): boolean {
    const terrain = this.landscape.world3d?.terrain;
    const previous = projectile.getData('terrain-previous') as { x: number; y: number } | undefined;
    if (terrain && previous && !projectileTerrainClear(terrain, previous, projectile)) {
      projectile.disableBody(true, true);
      return false;
    }
    return true;
  }

  private damageEnemy(enemy: Enemy, amount: number): number {
    if (!enemy.active) return 0;
    if (enemy === this.boss && this.run.finalStand?.phase === 'recovery')
      amount *= GAME.finalStand.vulnerableDamage;
    const hasArmor =
      (enemy.definition.armor !== undefined || enemy.definition.id === 'brute') &&
      enemy.pinned <= 0;
    const baseArmor = hasArmor ? (enemy.definition.armor ?? GAME.tactics.heavyArmor) : 1;
    amount *= baseArmor;
    const actual = Math.min(Math.max(0, enemy.health), Math.max(0, amount));
    if (amount >= 1) enemy.motion.hit();
    enemy.health -= amount;
    if (enemy.health > 0) {
      if (amount >= 1)
        this.audio.play(enemy.definition.texture === 'earth' ? 'stoneImpact' : 'impact', enemy);
      return actual;
    }
    const { x, y } = enemy;
    const value = enemy.definition.xp;
    if (effectAmount(this.visualSettings) > 0) this.defeats.show(enemy);
    enemy.disableBody(true, true);
    this.audio.play('defeat', { x, y });
    this.enemyShadows.get(enemy)?.setVisible(false);
    this.run.kills += 1;
    if (this.run.crossing && enemy.crossingId === this.run.crossing.key)
      this.run.crossing.defeated++;
    const objective = this.run.field.objective;
    if (
      objective?.status === 'available' &&
      objective.kind === 'gathering' &&
      enemy.objectiveId === objective.id
    )
      objective.defeated++;
    this.run.clan.spirit += value * 0.4 * this.run.clan.campEffects.multipliers.spiritGain;
    if (enemy === this.boss) defeatSkybreaker(this.run);
    this.effects.burst(x, y, 0xa58aad, 5);
    const gem = this.gems.get(x, y, 'gem') as Gem | null;
    if (gem) {
      gem.enableBody(true, x, y, true, true);
      gem.setTexture('gem').setScale(0.85).setDepth(3).setVelocity(0, 0);
      gem.value = value;
      gem.secondary = false;
      gem.attracted = false;
    } else {
      // Preserve experience even if the gem pool is full.
      const active = this.gems.getFirstAlive() as Gem | null;
      if (active) active.value += value;
    }
    return actual;
  }

  private collectGems(dt: number): void {
    if (!isKhanActive(this.run)) return;
    let experience = 0;
    for (const gem of this.gems.getChildren() as Gem[]) {
      if (!gem.active) continue;
      const distance = Phaser.Math.Distance.Between(gem.x, gem.y, this.player.x, this.player.y);
      const retreat = this.run.clan.formation === 'retreat' && this.run.clan.momentum > 0.4;
      if (distance < Math.max(this.run.stats.pickupRadius * (retreat ? 1.7 : 1), 0))
        gem.attracted = true;
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
        this.run.clan.message = `Level ${this.run.level} reached.`;
        this.callbacks?.onHud(this.snapshot());
      }
    }
  }

  private hurtPlayer(enemy: Enemy): void {
    if (
      this.run.phase !== 'playing' ||
      !isKhanActive(this.run) ||
      !enemy.active ||
      this.timers.invulnerable > 0
    )
      return;
    enemy.motion.attack();
    this.takeDamage(enemy.definition.damage);
  }

  private takeDamage(amount: number): void {
    if (this.run.phase !== 'playing' || this.timers.invulnerable > 0) return;
    if (import.meta.env.DEV && this.developerTools?.invincible) return;
    const outcome = damageKhan(this.run, amount);
    if (!outcome) return;
    this.playerMotion.hit();
    this.timers.invulnerable = GAME.invulnerability;
    if (effectAmount(this.visualSettings) > 0) this.cameras.main.shake(90, 0.003);
    this.audio.play(outcome === 'fallen' ? 'fall' : 'hit');
    this.effects.burst(this.player.x, this.player.y, 0xdd967c, 8);
    if (outcome === 'fallen') this.hideFallenKhan();
  }

  private get clanProtection(): ClanProtection | undefined {
    return import.meta.env.DEV && this.developerTools?.clanInvincible
      ? { invincible: true }
      : undefined;
  }

  private damageClan(amount: number, cause: ClanDamageCause = 'attack', source?: string): void {
    damageClan(this.run, amount, this.clanProtection, cause, source);
  }

  selectSuccessor(trait: SuccessorTrait): void {
    if (!chooseSuccessor(this.run, trait)) return;
    this.audio.play('ui');
    this.callbacks?.onHud(this.snapshot());
  }

  private hideFallenKhan(): void {
    this.player.setVelocity(0, 0).disableBody(true, true);
    this.shadow.setVisible(false);
    this.aura.setVisible(false);
    this.timers.dashRemaining = 0;
    this.run.clan.momentum = 0;
    this.controls.clearTouch();
    this.cameras.main.startFollow(this.camp, true, 0.09, 0.09).setFollowOffset(0, 0);
    this.callbacks?.onHud(this.snapshot());
  }

  private returnKhan(): void {
    if (!isKhanActive(this.run)) return;
    const x = this.camp.x;
    const y = Phaser.Math.Clamp(this.camp.y + GAME.khan.campOffset, 24, GAME.worldSize - 24);
    this.player.enableBody(true, x, y, true, true);
    this.player
      .setVelocity(0, 0)
      .setAlpha(1)
      .clearTint()
      .setFlipX(false)
      .setDepth(100 + y);
    this.playerMotion.reset('player', 0);
    this.run.combat.previous = undefined;
    this.run.combat.heading = undefined;
    this.run.combat.rideSeconds = 0;
    this.run.combat.ready = false;
    renderCharacter(this.player, this.playerMotion);
    this.shadow
      .setPosition(x + 9, y + 5)
      .setDepth(99 + y)
      .setVisible(true);
    this.aura.setPosition(x, y).setVisible(true);
    this.facing.set(1, 0);
    this.timers.dashRemaining = this.timers.dashTimer = 0;
    this.timers.attackTimer = this.dustTimer = 0;
    this.timers.invulnerable = GAME.khan.returnProtection;
    this.controls.clearTouch();
    this.cameras.main.startFollow(this.player, true, 0.09, 0.09).setFollowOffset(0, 0);
    this.effects.burst(x, y, 0xf1c27b, 12);
    this.audio.play('succession');
    this.callbacks?.onHud(this.snapshot());
  }

  private finish(phase: 'won' | 'dead'): void {
    this.run.legacy.outcome = phase;
    if (!this.developerRun) {
      this.best = Math.max(this.best, Math.floor(this.run.elapsed));
      void this.platform.saveBest(this.best).catch(() => this.callbacks?.onSaveError());
    }
    this.setPhase(phase === 'won' && this.run.story.enabled ? 'epilogue' : phase);
    this.audio.play(phase === 'won' ? 'victory' : 'loss');
  }

  private setPhase(phase: RunState['phase']): void {
    const wasPlaying = this.run.phase === 'playing';
    this.run.phase = phase;
    this.audio.setPlaying(phase === 'playing', phase === 'building');
    this.controls.release();
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
    // Capture changes above reset Phaser's global preventDefault flag.
    if (import.meta.env.DEV && ['developer', 'console'].includes(phase))
      this.input.keyboard!.disableGlobalCapture();
    else this.input.keyboard!.enableGlobalCapture();
    this.publishPhase();
    if (wasPlaying && phase === 'paused' && !this.persistence.busy) void this.saveExpedition();
  }

  private snapshot(): HudSnapshot {
    return this.hudPresenter.snapshot({
      introSlide: this.introSlide,
      best: this.best,
      developerRun: this.developerRun,
      developerConsole:
        import.meta.env.DEV && this.developerTools
          ? {
              ...this.developerTools,
              canCheat: this.canUseDeveloperCheats(),
            }
          : undefined,
      saves: {
        entries: this.platform.saves,
        canSave: this.canSaveExpedition,
        busy: this.persistence.busy,
        message: this.persistence.message,
      },
      boss: this.boss,
    });
  }
  private publishPhase(): void {
    const snapshot = this.snapshot();
    this.callbacks?.onHud(snapshot);
    this.callbacks?.onPhase(snapshot);
  }
  private pauseOnBlur(): void {
    if (this.run.phase === 'playing') this.setPhase('paused');
  }

  private updateCamp(dt: number): void {
    const clan = this.run.clan;
    this.campPresenter.update(dt);
    const count = riderCount(this.run);
    for (let i = 0; i < this.riders.length; i += 1) {
      const rider = this.riders[i]!;
      if (!rider.visible && i < count) this.riderMotions[i]!.reset('rider', i * 0.137);
      rider.setVisible(i < count);
      this.riderShadows[i]!.setVisible(i < count);
      if (i >= count) continue;
      const formation = isKhanActive(this.run) ? clan.formation : 'guard';
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
      const navigation = this.landscape.navigation;
      const desired =
        navigation && !navigation.lineClear(rider, { x, y }, 18)
          ? navigation.waypoint(rider, anchor)
          : { x, y };
      const next = {
        x: Phaser.Math.Linear(rider.x, desired.x, Math.min(1, dt * 5)),
        y: Phaser.Math.Linear(rider.y, desired.y, Math.min(1, dt * 5)),
      };
      const position = navigation?.slide(rider, next) ?? next;
      rider.setPosition(position.x, position.y);
      const dx = rider.x - previousX;
      const dy = rider.y - previousY;
      this.riderSpeeds[i] = dt > 0 ? Math.hypot(dx, dy) / dt : 0;
      const screenDx = this.landscape.world3d?.screenX(dx, dy) ?? dx;
      if (Math.abs(screenDx) > 0.1) rider.setFlipX(screenDx < 0);
      rider.setDepth(100 + rider.y);
      this.riderShadows[i]!.setPosition(rider.x + 7, rider.y + 4).setDepth(99 + rider.y);
    }
    this.landscape.update(this.run.elapsed);
    this.updateHazards(dt);
  }

  private updateCharacterAnimations(dt: number): void {
    const preparingVolley = this.timers.attackTimer > 0 && this.timers.attackTimer < 0.12;
    if (isKhanActive(this.run)) {
      this.playerMotion.advance(
        dt,
        this.player.body!.velocity.length(),
        preparingVolley &&
          Boolean(
            this.spatial.nearest(
              this.player.x,
              this.player.y,
              GAME.projectile.range + this.run.clan.campEffects.bonuses.range,
            ),
          ),
      );
      renderCharacter(this.player, this.playerMotion);
      this.player.setTint(this.playerMotion.hurt ? 0xffd3b2 : 0xffffff);
    }
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
              GAME.projectile.range + this.run.clan.campEffects.bonuses.range,
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
              : (enemy.definition.tint ?? 0xffffff),
      );
    }
    this.defeats.update(dt);
  }

  private queueAreaThreat(
    kind: AreaThreatKind,
    point: { x: number; y: number },
    owner?: string,
  ): boolean {
    const nav = this.landscape.navigation;
    if (nav && !nav.isWalkable(point.x, point.y, 8, true)) return false;
    if (
      point.x < 24 ||
      point.y < 24 ||
      point.x > GAME.worldSize - 24 ||
      point.y > GAME.worldSize - 24
    )
      return false;
    return addAreaThreat(this.areaThreats, kind, point, 0, owner);
  }

  private terrainThreatPoints(): { x: number; y: number }[] {
    const area = AREA_ENCOUNTERS[currentLocation(this.run).id],
      anchor = isKhanActive(this.run) ? this.player : this.camp;
    const nav = this.landscape.navigation,
      candidates: { x: number; y: number; score: number }[] = [];
    for (let ring = 0; ring < GAME.areaCombat.searchRings; ring++)
      for (let i = 0; i < GAME.areaCombat.probes; i++) {
        const angle =
          (i * Math.PI * 2) / GAME.areaCombat.probes + this.areaEncounter.sequence * 0.7;
        const radius = (ring * GAME.areaCombat.searchRadius) / (GAME.areaCombat.searchRings - 1);
        const point = {
          x: anchor.x + Math.cos(angle) * radius,
          y: anchor.y + Math.sin(angle) * radius,
        };
        if (Math.hypot(point.x - this.camp.x, point.y - this.camp.y) < GAME.areaCombat.campSafety)
          continue;
        if (nav && !nav.isWalkable(point.x, point.y, 8, true)) continue;
        const surface = areaSurface(nav?.terrain, currentLocation(this.run).id, point.x, point.y);
        let score =
          area.pattern === 'shelter' ? surface.open : habitatPreference(surface, area.habitat);
        if (area.threat === 'rockfall' && area.pattern !== 'shelter') score = surface.shelter;
        if (area.threat === 'frost') score = Math.max(surface.shore, surface.snow);
        if (area.pattern === 'shelter' && surface.shelter > 0.25) continue;
        if (score < 0.25) continue;
        candidates.push({ ...point, score });
      }
    candidates.sort((a, b) => b.score - a.score);
    const points: { x: number; y: number }[] = [];
    for (const p of candidates)
      if (points.every((old) => Math.hypot(p.x - old.x, p.y - old.y) > 130)) {
        points.push({ x: p.x, y: p.y });
        if (points.length >= GAME.areaCombat.maxTerrainThreats) break;
      }
    return points;
  }

  private updateAreaCombat(dt: number): void {
    if (syncAreaEncounter(this.areaEncounter, this.run)) {
      this.areaThreats = createAreaThreats();
    }
    const area = AREA_ENCOUNTERS[currentLocation(this.run).id];
    const event = advanceAreaEncounter(this.areaEncounter, this.run, dt);
    if (event === 'lesson' && this.run.clan.stage !== 'migration')
      this.run.clan.message = `${area.title}. ${area.rule} ${area.counter}`;
    if (event === 'terrain' && area.threat) {
      let placed = 0;
      for (const point of this.terrainThreatPoints())
        if (this.queueAreaThreat(area.threat, point)) placed++;
      if (placed) {
        this.run.clan.message = `${area.warning} ${area.counter}`;
        this.audio.play('encounter');
      }
    }
    advanceAreaThreats(this.areaThreats, this.run.phase, dt, {
      ownerActive: (key) => {
        const [slot, id] = key.split(':').map(Number),
          enemy = this.enemies.getChildren()[slot!] as Enemy | undefined;
        return !!enemy?.active && enemy.spawnId === id && enemy.pinned <= 0;
      },
      hit: (threat, damage) => {
        const radius = GAME.areaCombat.threats[threat.kind].radius;
        if (
          isKhanActive(this.run) &&
          Math.hypot(threat.x - this.player.x, threat.y - this.player.y) < radius
        )
          this.takeDamage(damage);
        if (Math.hypot(threat.x - this.camp.x, threat.y - this.camp.y) < radius + 25)
          this.damageClan(damage * GAME.areaCombat.campDamage, 'area');
        this.audio.play('spell', threat);
      },
    });
    const graphics = this.areaEffects.clear();
    for (const threat of this.areaThreats.threats) this.drawAreaThreat(graphics, threat);
    if (this.visualSettings.projectileContrast === 'high')
      for (const shot of this.hostileShots.getChildren() as Projectile[])
        if (shot.active)
          graphics
            .lineStyle(3, 0x352a25, 0.95)
            .strokeCircle(shot.x, shot.y, 8.5)
            .lineStyle(1.5, 0xffefba, 1)
            .strokeCircle(shot.x, shot.y, 8.5);
  }

  private drawAreaThreat(graphics: Phaser.GameObjects.Graphics, threat: AreaThreat): void {
    const spec = GAME.areaCombat.threats[threat.kind];
    graphics
      .fillStyle(spec.color, threat.impacted ? 0.1 : 0.055)
      .fillCircle(threat.x, threat.y, spec.radius);
    graphics
      .lineStyle(
        threat.impacted ? 1 : 2,
        threat.impacted ? spec.color : 0xd49b79,
        threat.impacted ? 0.4 : 0.8,
      )
      .strokeCircle(threat.x, threat.y, spec.radius);
    if (!threat.impacted)
      graphics
        .lineStyle(1, spec.color, 0.7)
        .strokeCircle(threat.x, threat.y, spec.radius * Math.min(1, threat.age / threat.warning));
    if (threat.kind === 'crosswind' || threat.kind === 'rift')
      graphics
        .lineStyle(2, spec.color, 0.5)
        .lineBetween(
          threat.x - spec.radius * 0.6,
          threat.y - spec.radius * 0.6,
          threat.x + spec.radius * 0.6,
          threat.y + spec.radius * 0.6,
        );
  }

  private updateHazards(dt: number): void {
    const clan = this.run.clan;
    if (clan.region >= 2) this.timers.hazardTimer -= dt;
    if (clan.region >= 2 && this.timers.hazardTimer <= 0 && isKhanActive(this.run)) {
      const x = this.player.x;
      const y = this.player.y;
      const warning = this.add.graphics().setDepth(3);
      warning
        .fillStyle(0xa14839, 0.18)
        .fillCircle(x, y, 70)
        .lineStyle(2, 0xe6bd7b, 0.8)
        .strokeCircle(x, y, 70);
      this.hazards.push({
        x,
        y,
        remaining: 2,
        warning,
      });
      this.timers.hazardTimer = clan.region === 3 ? 6 : 10;
    }
    for (let i = this.hazards.length - 1; i >= 0; i -= 1) {
      const hazard = this.hazards[i]!;
      hazard.remaining -= dt;
      const radius = hazard.radius ?? 70;
      if (hazard.source === 'seer')
        hazard.warning
          .clear()
          .fillStyle(0x976aa9, 0.13)
          .fillCircle(hazard.x, hazard.y, radius)
          .lineStyle(2, 0xcba0c6, 0.8)
          .strokeCircle(hazard.x, hazard.y, radius);
      if (hazard.remaining > 0) continue;
      this.effects.burst(hazard.x, hazard.y, clan.region === 3 ? 0xbf6558 : 0x796d4d, 12);
      this.audio.play('thunder', hazard);
      if (Phaser.Math.Distance.Between(hazard.x, hazard.y, this.player.x, this.player.y) < radius)
        this.takeDamage(hazard.damage ?? 20);
      if (Phaser.Math.Distance.Between(hazard.x, hazard.y, this.camp.x, this.camp.y) < radius + 25)
        this.damageClan(
          hazard.source === 'seer' ? 5 : 8,
          hazard.source === 'seer' ? 'seer' : 'eruption',
        );
      hazard.warning.destroy();
      this.hazards.splice(i, 1);
    }
  }

  private updateSupport(dt: number): void {
    const clan = this.run.clan;
    this.timers.supportTimer -= dt;
    this.timers.wagonTimer -= dt;
    this.timers.wardTimer -= dt;
    if (clan.buildings.sanctuary && this.timers.supportTimer <= 0) {
      const anchor = isKhanActive(this.run) ? this.player : this.camp;
      const target =
        this.spatial.nearest(anchor.x, anchor.y, 520) ??
        this.spatial.nearest(this.camp.x, this.camp.y, 520);
      if (target) {
        const x = target.x;
        const y = target.y;
        this.audio.play('thunder', { x, y });
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
      this.timers.supportTimer =
        (hasDevelopment(this.run, 'sanctuary', 'wind-shamans') ? 1.8 : 3.5) *
        (clan.region === 3 ? 1.5 : 1) *
        clan.campEffects.multipliers.sanctuaryInterval;
    }
    const wagonResearch = wagonDefence(this.run);
    if (wagonResearch.active && this.timers.wagonTimer <= 0) {
      const target = this.spatial.nearest(this.camp.x, this.camp.y, wagonResearch.range);
      if (target)
        this.shootVolley(
          this.camp.x,
          this.camp.y,
          target,
          hasDevelopment(this.run, 'wagon', 'war-carts') ? 3 : 1,
          wagonResearch.damage,
          false,
          false,
          'wagon',
        );
      this.timers.wagonTimer = 0.9;
    }
    if (hasDevelopment(this.run, 'sanctuary', 'ancestral-ward') && this.timers.wardTimer <= 0) {
      this.spatial.forEachNearby(
        this.camp.x,
        this.camp.y,
        campBoundary(this.run).wardRadius,
        (enemy) => this.damageEnemy(enemy, this.run.stats.damage * 1.5),
      );
      this.effects.burst(this.camp.x, this.camp.y, 0x8acfe2, 8);
      this.timers.wardTimer = 1.2;
    }
  }

  private arrive(): void {
    this.persistence.saveCamp();
    const center = GAME.worldSize / 2;
    // Each crossing leads to a new handcrafted arena; structures travel with the clan.
    this.campPresenter.relocate();
    this.camp.setPosition(center, center);
    this.player.setPosition(center, center + 100).setVelocity(0, 0);
    for (const group of [this.enemies, this.projectiles, this.hostileShots])
      for (const actor of group.getChildren() as Enemy[]) actor.disableBody(true, true);
    // Carry all uncollected experience to the next camp rather than discarding it.
    for (const gem of this.gems.getChildren() as Gem[])
      if (gem.active) gem.setPosition(center, center + 100);
    for (const hazard of this.hazards) hazard.warning.destroy();
    this.hazards = [];
    this.timers.hazardTimer = GAME.hazards.initialDelay;
    this.areaThreats = createAreaThreats();
    this.areaEncounter = createAreaEncounter();
    syncAreaEncounter(this.areaEncounter, this.run);
    this.areaEffects.clear();
    this.landscape.setRegion(this.run.clan.region, currentLocation(this.run));
    this.reconcileTerrain();
    this.campPresenter.refresh();
    this.campBarrier.relocate(this.run, this.camp);
    this.cameras.main.flash(500, 225, 215, 180);
    if (!this.presentStory()) this.publishPhase();
    this.audio.play('arrive');
  }

  // Development test hooks read through window.__gloam.scene; see tests/e2e/scene-hooks.spec.ts.
  // Not private: noUnusedLocals rejects private members that only tests use.
  get saveBusy(): boolean {
    return this.persistence.busy;
  }
  requestCheckpoint(): void {
    this.persistence.requestCheckpoint();
  }
  get joystick(): Phaser.GameObjects.Graphics | undefined {
    return this.controls.joystick;
  }
  get dragOrigin(): Phaser.Math.Vector2 | undefined {
    return this.controls.dragOrigin;
  }
  get campBarrier(): CampBarrier {
    return this.campPresenter.campBarrier;
  }
  get clanLife(): ClanLife {
    return this.campPresenter.clanLife;
  }
  get packedGers(): CampPresenter['packedGers'] {
    return this.campPresenter.packedGers;
  }
  get packingRemaining(): number {
    return this.campPresenter.packingRemaining;
  }
  burst(x: number, y: number, color: number, count: number): void {
    this.effects.burst(x, y, color, count);
  }
  get spawnTimer(): number {
    return this.timers.spawnTimer;
  }
  set spawnTimer(value: number) {
    this.timers.spawnTimer = value;
  }
  get attackTimer(): number {
    return this.timers.attackTimer;
  }
  set attackTimer(value: number) {
    this.timers.attackTimer = value;
  }
  get dashTimer(): number {
    return this.timers.dashTimer;
  }
  set dashTimer(value: number) {
    this.timers.dashTimer = value;
  }
  get dashRemaining(): number {
    return this.timers.dashRemaining;
  }
  set dashRemaining(value: number) {
    this.timers.dashRemaining = value;
  }
  get invulnerable(): number {
    return this.timers.invulnerable;
  }
  set invulnerable(value: number) {
    this.timers.invulnerable = value;
  }
  get supportTimer(): number {
    return this.timers.supportTimer;
  }
  set supportTimer(value: number) {
    this.timers.supportTimer = value;
  }
  get wagonTimer(): number {
    return this.timers.wagonTimer;
  }
  set wagonTimer(value: number) {
    this.timers.wagonTimer = value;
  }
  get wardTimer(): number {
    return this.timers.wardTimer;
  }
  set wardTimer(value: number) {
    this.timers.wardTimer = value;
  }
  get hazardTimer(): number {
    return this.timers.hazardTimer;
  }
  set hazardTimer(value: number) {
    this.timers.hazardTimer = value;
  }
}
