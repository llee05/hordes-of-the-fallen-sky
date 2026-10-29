import {
  researchEnemySlow,
  researchEnemySlowed,
  researchKnockback,
  inRidgePatch,
  terrainWarningBonus,
  resolveResearchEruption,
  claimTerrainWave,
} from '../state/researchTerrain';
import {
  recordEchoHit,
  echoVulnerability,
  recordShardGathering,
  researchSpiritYield,
  remembranceMagnetRadius,
} from '../state/researchEchoes';
import {
  claimRiderVolley,
  recordEliteAppearance,
  issueKurultai,
  bannerFormation,
  bannerDamage,
} from '../state/researchLeadership';
import {
  claimArrowPlatform,
  circlingVolley,
  wagonDamageMultiplier,
  wagonRangeMultiplier,
} from '../state/researchGuardian';
import { nearestCompanion, selectNearestCompanion } from '../state/researchCompanions';
import { claimThousandArrows, ghostArrowModifier } from '../state/researchHybrids';
import { volleyFactors } from '../state/volley';
import {
  observeResearchFrame,
  recordResearchDamage,
  type ResearchDamageSource,
} from '../state/researchMetrics';
import {
  advanceEnemyBleed,
  capWorldPiercerDamage,
  circleOfShaftsVolley,
  claimArrowRainDrop,
  claimAshBornPulse,
  claimFlameRefusesPulse,
  claimHoofTrailDamage,
  eagleEyeOverkillSpill,
  enemyStaggerSlowMultiplier,
  eternalHearthPush,
  isEnemyMarked,
  ownsResearch,
  packInstinctBonus,
  projectileDamageAfterPierce,
  recordFriendlyHitOnEnemy,
  recordGallopThroughEnemy,
  recordKhanTarget,
  recordKhanVolley,
  recordPiercingHitOnEnemy,
  recordResearchEnemyKill,
  recordResearchShard,
  researchArmorMultiplier,
  researchAttackIntervalMultiplier,
  researchBonusPierces,
  researchGallop,
  researchWaterRadius,
  riderPrefersTarget,
  stillHandDamageMultiplier,
  updateCampfireVigil,
  updateMarkedProximity,
  wagonResearchDefence,
} from '../state/researchRuntime';
import { purchaseNomadicBuilding } from '../state/nomadicCamp';
import type { NomadicBuildingId } from '../../shared/nomadicCamp.js';
import {
  normalizeVisualSettings,
  effectAmount,
  type VisualSettings,
} from '../../shared/visualSettings';
import {
  edgeWarnings,
  incomingTime,
  type ScreenDanger,
  type EliteMarker,
} from '../systems/combatReadability';
import Phaser from 'phaser';
import {
  ART_WIDTH,
  CAMP_VISUAL_SCALE,
  artTexture,
  createPainterlyEffects,
  paintedImage,
  preloadPainterlyArt,
  styleActor,
} from '../assets/painterlyArt';
import { ClanLife } from '../assets/ClanLife';
import { CampBarrier } from '../assets/CampBarrier';
import { campShelters } from '../state/campLife';
import { barrierContact, campBoundary } from '../state/campBarrier';
import { SteppeLandscape } from '../assets/SteppeLandscape';
import { TerrainCollision } from '../terrain/TerrainCollision';
import { advanceCrossingEncounter } from '../state/crossingEncounters';
import { CROSSING_ENCOUNTERS } from '../data/crossings';
import { advanceMountedCombat, spendMountedVolley, retreatShot } from '../state/mountedCombat';
import {
  advanceCharge,
  createEnemyTactics,
  tacticalGoal,
  seerDangerRadius,
} from '../systems/enemyTactics';
import type { SuccessorTrait } from '../data/successors';
import type { ClanDamageCause } from '../state/clanSafety';
import { projectGround } from '../world3d/worldProjection';
import { projectileTerrainClear } from '../world3d/projectileTerrain';
import { CharacterMotion, isCharacterKind } from '../animation/CharacterMotion';
import { DefeatSprites, renderCharacter } from '../animation/CharacterVisuals';
import { AREA_ENCOUNTERS, type AreaThreatKind } from '../data/areaEncounters';
import { areaSurface, habitatPreference, areaRiverTangent } from '../systems/AreaHabitat';
import {
  createAreaEncounter,
  syncAreaEncounter,
  advanceAreaEncounter,
  areaArrivalAngle,
} from '../state/areaEncounters';
import {
  createAreaThreats,
  addAreaThreat,
  advanceAreaThreats,
  areaMovementMultiplier,
  type AreaThreat,
} from '../state/areaThreats';
import { GAME } from '../config';
import { ALL_ENEMIES, SKYBREAKER, encounterSpawnDelay } from '../data/enemies';
import {
  advanceEncounters,
  encounterEnemy,
  encounterPlan,
  supportingAreaEnemy,
} from '../state/encounters';
import {
  syncFieldState,
  fieldObjectiveDue,
  startFieldObjective,
  advanceFieldObjective,
} from '../state/fieldObjectives';
import { FieldMarkers } from '../systems/FieldMarkers';
import { projectedEnemySpawnPosition } from '../systems/EnemySpawning';
import { FORMATIONS, ROUTES, STARTING_TRADITIONS, type StartingTraditionId } from '../data/clan';
import { currentLocation } from '../state/journey';
import { INTRO_SLIDES } from '../data/intro';
import { createDeveloperRun, DEVELOPER_LEVELS } from '../dev/levels';
import { createDeveloperTools, executeDeveloperCommand } from '../dev/commands';
import { openNextStory, resolveStory } from '../state/story';
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
import { RESEARCH_BY_ID } from '../data/research';
import { Enemy, Gem, Projectile } from '../entities/actors';
import { captureCampArchive, runFromCampArchive } from '../state/campArchive';
import { purchaseEstate, type EstatePurchaseKind } from '../state/campEstate';
import { applyResearch, createRun, gainExperience, redeemMasteredResearch } from '../state/run';
import {
  advancePatrons,
  friendlyDamageMultiplier,
  gallopCooldown,
  rewardPatronKill,
} from '../state/patrons';
import {
  advanceSuccession,
  beginSuccession,
  damageKhan,
  isKhanActive,
  chooseSuccessor,
  khanSpeedMultiplier,
} from '../state/khan';
import { PatronSupport } from '../systems/PatronSupport';
import { completeGuidance } from '../state/guidance';
import { GameAudio } from '../systems/Audio';
import type { AudioChannel } from '../../shared/audioSettings';
import { normalizeAudioMix } from '../../shared/audioSettings';
import type { SoundKind } from '../audio/soundPalette';
import { environmentForLocation } from '../audio/mixing';
import { SpatialHash } from '../systems/SpatialHash';
import { cameraZoomLimits, clampCameraZoom, enemySpawnPosition } from '../systems/CameraView';
import { ActionKeys } from '../systems/ActionKeys';
import { GamepadInput } from '../systems/GamepadInput';
import type { GamePlatform } from '../../platform/GamePlatform';
import type { BuildingId, EnemyDefinition, HudSnapshot, RunState } from '../types';
import {
  captureExpedition,
  decodeExpedition,
  type BodyArchive,
  type ProjectileArchive,
  type WorldArchive,
} from '../state/expeditionArchive';
import type { ExpeditionSave, SaveSlot } from '../../shared/expeditionSave';
import { markExpedition, metricStage, observeExpedition } from '../state/expeditionMetrics';
import {
  syncFinalStand,
  advanceFinalStand,
  finalChapter,
  acceptCampBarrage,
  defeatSkybreaker,
} from '../state/finalStand';

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
  private campLabel!: Phaser.GameObjects.Text;
  private landscape!: SteppeLandscape;
  private terrainCollision!: TerrainCollision;
  private clanLife!: ClanLife;
  private crossingMarkers!: FieldMarkers;
  private areaEffects!: Phaser.GameObjects.Graphics;
  private areaEncounter = createAreaEncounter();
  private areaThreats = createAreaThreats();
  private fieldMarkers!: FieldMarkers;
  private passageMarkers: FieldMarkers[] = [];
  private campBarrier!: CampBarrier;
  private campPopulation = -1;
  private campHerd = -1;
  private packedGers: { image: Phaser.GameObjects.Image; x: number; y: number }[] = [];
  private packingRemaining = 0;
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
    radius?: number;
    damage?: number;
    source?: 'seer';
    researchCrossed?: boolean;
    researchEntered?: boolean;
  }[] = [];
  private hazardTimer: number = GAME.hazards.initialDelay;
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
  private cameraZoom: number = GAME.camera.defaultZoom;
  private wheelZoomDelta = 0;
  private best = 0;
  private researchReturnPhase: 'playing' | 'journal' | 'paused' = 'playing';
  private progressionStack: ('upgrade' | 'building')[] = [];
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
  private touchMove = new Phaser.Math.Vector2();
  private dragOrigin?: Phaser.Math.Vector2;
  private joystick?: Phaser.GameObjects.Graphics;
  private expeditionStarted = false;
  private saveBusy = false;
  private pendingSceneSave: Promise<boolean> = Promise.resolve(true);
  private autosaveRemaining: number = GAME.saves.autosaveInterval;
  private checkpointQueued = false;
  private checkpointDirty = false;
  private saveGeneration = 0;
  private saveMenuReturn: 'ready' | 'paused' | 'dead' | 'won' = 'ready';
  private saveMessage = '';
  private visualSettings: VisualSettings;
  constructor(private readonly platform: GamePlatform) {
    super('arena');
    this.visualSettings = normalizeVisualSettings(platform.profile.visualSettings);
    this.audio.muted = platform.profile.muted;
    this.audio.setMix(normalizeAudioMix(platform.profile.audioMix));
    void this.audio.prepare();
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
    this.saveGeneration++;
    this.expeditionStarted = false;
    this.saveBusy = false;
    this.autosaveRemaining = GAME.saves.autosaveInterval;
    this.checkpointQueued = false;
    this.checkpointDirty = false;
    this.saveMessage = '';
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
    this.spawnTimer = 0;
    this.attackTimer = 0;
    this.dashTimer = 0;
    this.dashRemaining = 0;
    this.invulnerable = 0;
    this.hudTimer = 0;
    this.wheelZoomDelta = 0;
    this.researchReturnPhase = 'playing';
    this.progressionStack = [];
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
    this.packedGers = [];
    this.packingRemaining = 0;
    this.boss = undefined;
    this.hazards = [];
    this.hazardTimer = GAME.hazards.initialDelay;
    this.facing.set(0, 1);
    this.touchMove.set(0, 0);
    this.dragOrigin = undefined;
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
    this.campBarrier = new CampBarrier(this);
    this.refreshCamp();
    this.clanLife = new ClanLife(this);
    this.campLabel = this.add
      .text(center, center - 125 * CAMP_VISUAL_SCALE, 'YOUR CLAN', {
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
      .setName('khan')
      .setCollideWorldBounds(true);
    styleActor(this.player, 'player', ART_WIDTH.player!, 10);
    this.patronSupport = new PatronSupport(this, this.player);

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
          key !== 'F8' &&
          key !== 'F10' &&
          !(key === 'BACKTICK' && ['console', 'developer'].includes(this.run.phase)) &&
          event.target instanceof HTMLElement &&
          event.target.closest('input, textarea, select')
        )
          return;
        if (['F6', 'F7', 'F9', 'F10', 'BACKTICK'].includes(key)) event.preventDefault();
        if (this.actionKeys.consume(event)) {
          action();
        }
      });
    };
    bindAction('ESC', () => this.togglePause());
    bindAction('P', () => this.togglePause());
    bindAction('B', () => this.openBuildings());
    bindAction('M', () => this.openRoutes());
    bindAction('F', () => this.cycleFormation());
    bindAction('R', () => this.rallyHost());
    bindAction('ONE', () => this.selectSuccessor('outrider'));
    bindAction('TWO', () => this.selectSuccessor('hearthguard'));
    bindAction('J', () => this.toggleJournal());
    bindAction('T', () => this.openResearch());
    if (import.meta.env.DEV) {
      bindAction('F8', () => this.toggleDeveloperMenu());
      bindAction('F9', () => this.landscape.cycleTerrainDebug());
      bindAction('F7', () => {
        const world = this.landscape.world3d;
        if (world) world.setTerrainOnly(!world.terrainOnly);
      });
      bindAction('F6', () => {
        const world = this.landscape.world3d;
        if (world) world.setAngle(world.angle < 48 ? 48 : world.angle < 60 ? 60 : 40);
      });
      bindAction('F10', () => this.toggleDeveloperConsole());
      bindAction('BACKTICK', () => this.toggleDeveloperConsole());
    }
    const bindZoom = (key: string, steps: number): void => {
      this.input.keyboard!.on(`keydown-${key}`, (event: KeyboardEvent) => {
        if (
          !this.actionKeys.consume(event) ||
          this.run.phase !== 'playing' ||
          event.ctrlKey ||
          event.metaKey ||
          event.altKey ||
          (event.target instanceof HTMLElement && event.target.closest('input, textarea, select'))
        )
          return;
        event.preventDefault();
        this.changeZoom(steps);
      });
    };
    for (const key of ['PLUS', 'NUMPAD_ADD']) bindZoom(key, 1);
    for (const key of ['MINUS', 'NUMPAD_SUBTRACT']) bindZoom(key, -1);
    for (const key of ['ZERO', 'NUMPAD_ZERO']) bindZoom(key, 0);
    this.input.on(
      'wheel',
      (
        pointer: Phaser.Input.Pointer,
        _over: Phaser.GameObjects.GameObject[],
        _dx: number,
        dy: number,
      ) => {
        const event = pointer.event as WheelEvent;
        if (this.run.phase !== 'playing' || event.ctrlKey || event.metaKey) return;
        if (Math.sign(dy) !== Math.sign(this.wheelZoomDelta)) this.wheelZoomDelta = 0;
        this.wheelZoomDelta += dy;
        const steps = Math.trunc(this.wheelZoomDelta / GAME.camera.wheelStep);
        if (steps) {
          this.wheelZoomDelta %= GAME.camera.wheelStep;
          this.changeZoom(-steps);
        }
      },
    );
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
      this.audio.reset();
      this.game.events.off(Phaser.Core.Events.BLUR, this.pauseOnBlur, this);
      this.input.keyboard!.removeAllListeners();
      this.clearTouch();
    });
    this.events.off(Phaser.Scenes.Events.DESTROY, this.audio.destroy, this.audio);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.audio.destroy, this.audio);
    this.physics.pause();
    this.tweens.pauseAll();
    if (developerRun) {
      this.landscape.setRegion(this.run.clan.region, currentLocation(this.run));
      this.reconcileTerrain();
      this.campBarrier.relocate(this.run, this.camp);
      this.invulnerable = GAME.khan.returnProtection;
      this.beginExpedition();
    } else if (data?.expedition) this.restoreExpedition(data.expedition);
    else this.publishPhase();
  }

  get canSaveExpedition(): boolean {
    return (
      this.expeditionStarted &&
      !this.developerRun &&
      !this.run.legacy.outcome &&
      this.run.clan.population > 0 &&
      this.run.clan.integrity > 0
    );
  }

  saveExpedition(slot: SaveSlot = 'auto'): Promise<boolean> {
    if (!this.canSaveExpedition) return Promise.resolve(false);
    const generation = this.saveGeneration;
    const operation = this.pendingSceneSave
      .catch(() => false)
      .then(() => (generation === this.saveGeneration ? this.persistExpedition(slot) : false));
    this.pendingSceneSave = operation;
    return operation;
  }

  private async persistExpedition(slot: SaveSlot): Promise<boolean> {
    if (!this.canSaveExpedition || this.saveBusy) return false;
    const generation = this.saveGeneration;
    this.saveBusy = true;
    this.checkpointDirty = false;
    this.saveMessage = 'Saving…';
    if (this.run.phase === 'saves') this.publishPhase();
    try {
      const snapshot = captureExpedition(this.run, this.captureWorld());
      await this.platform.saveExpedition(slot, snapshot);
      if (generation !== this.saveGeneration) return true;
      this.autosaveRemaining = GAME.saves.autosaveInterval;
      this.saveMessage = slot === 'auto' ? 'Autosave complete.' : 'Expedition saved.';
      return true;
    } catch {
      if (generation !== this.saveGeneration) return false;
      this.saveMessage =
        'Saving failed. Your previous save is still available. Check available storage and try again.';
      this.callbacks?.onSaveError();
      return false;
    } finally {
      if (generation === this.saveGeneration) {
        this.saveBusy = false;
        if (this.run.phase === 'saves') this.publishPhase();
        if (this.checkpointDirty) this.requestCheckpoint();
      }
    }
  }

  openSaves(): void {
    if (!['ready', 'paused', 'dead', 'won'].includes(this.run.phase)) return;
    this.saveMenuReturn = this.run.phase as typeof this.saveMenuReturn;
    this.saveMessage = this.platform.saveStorageError
      ? 'Save storage could not be read. Try opening this menu again.'
      : '';
    this.setPhase('saves');
    void this.platform
      .refreshSaves()
      .then(() => {
        if (this.run.phase === 'saves') this.publishPhase();
      })
      .catch(() => {
        this.saveMessage = 'Save storage could not be read.';
        if (this.run.phase === 'saves') this.publishPhase();
      });
  }

  async loadSavedExpedition(slot: SaveSlot): Promise<void> {
    if (this.saveBusy) return;
    this.saveBusy = true;
    this.saveMessage = 'Loading…';
    if (this.run.phase === 'saves') this.publishPhase();
    try {
      await this.loadExpedition(slot);
    } catch (error) {
      this.saveMessage = error instanceof Error ? error.message : 'This save could not be loaded.';
      if (this.run.phase !== 'saves') {
        this.saveMenuReturn = this.run.phase as typeof this.saveMenuReturn;
        this.setPhase('saves');
      }
    } finally {
      this.saveBusy = false;
      if (this.run.phase === 'saves') this.publishPhase();
    }
  }

  async deleteSavedExpedition(slot: SaveSlot): Promise<void> {
    if (this.run.phase !== 'saves' || this.saveBusy) return;
    this.saveBusy = true;
    try {
      await this.platform.deleteExpedition(slot);
      this.saveMessage = 'Save deleted.';
    } catch {
      this.saveMessage = 'The save could not be deleted. Try again.';
    } finally {
      this.saveBusy = false;
      this.publishPhase();
    }
  }

  async saveAndReturnToTitle(): Promise<void> {
    if (this.run.phase !== 'paused') return;
    await this.platform.flush().catch(() => undefined);
    if (this.canSaveExpedition && !(await this.saveExpedition())) return;
    this.scene.restart({});
  }

  async prepareToClose(): Promise<boolean> {
    if (this.run.phase === 'playing') this.setPhase('paused');
    try {
      await this.pendingSceneSave;
      // A new write can recover from an earlier transient storage error.
      await this.platform.flush().catch(() => undefined);
      if (this.canSaveExpedition && !(await this.saveExpedition())) return false;
      await this.platform.flush();
      return true;
    } catch {
      this.callbacks?.onSaveError();
      return false;
    }
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
      timers: {
        spawnTimer: this.spawnTimer,
        attackTimer: this.attackTimer,
        dashTimer: this.dashTimer,
        dashRemaining: this.dashRemaining,
        invulnerable: this.invulnerable,
        supportTimer: this.supportTimer,
        wagonTimer: this.wagonTimer,
        wardTimer: this.wardTimer,
        hazardTimer: this.hazardTimer,
      },
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
      support: this.patronSupport.capture(),
      hazards: this.hazards.map(({ warning: _warning, ...hazard }) => hazard),
      areaEncounter: this.areaEncounter,
      areaThreats: this.areaThreats,
    };
  }

  private restoreExpedition(save: ExpeditionSave): void {
    const { run, world } = decodeExpedition(save);
    this.run = run;
    this.input.keyboard!.resetKeys();
    this.expeditionStarted = true;
    this.storiesEnabled = run.story.enabled;
    this.guidanceEnabled = run.guidance.enabled;
    Object.assign(this, world.timers);
    this.areaEncounter = world.areaEncounter;
    this.areaThreats = world.areaThreats;
    this.landscape.setRegion(
      run.clan.region,
      currentLocation(run),
      run.clan.stage === 'migration' ? run.clan.routeId : undefined,
    );
    this.camp.setPosition(world.camp.x, world.camp.y);
    this.camp.setDepth(100 + world.camp.y);
    this.campLabel
      .setPosition(world.camp.x, world.camp.y - 112 * CAMP_VISUAL_SCALE)
      .setText(run.clan.stage === 'migration' ? 'PROTECT THE CARAVAN  →' : 'YOUR CLAN');
    this.refreshCamp();
    this.campBarrier.relocate(run, this.camp);
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
    this.patronSupport.restore(world.support);
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
    this.refreshCamp();
    this.audio.unlock();
    this.beginExpedition();
  }

  private saveCamp(): void {
    if (this.developerRun) return;
    void this.platform
      .saveCamp(captureCampArchive(this.run))
      .catch(() => this.callbacks?.onSaveError());
    this.requestCheckpoint();
  }

  private requestCheckpoint(): void {
    if (!this.canSaveExpedition) return;
    this.checkpointDirty = true;
    if (this.checkpointQueued) return;
    this.checkpointQueued = true;
    const generation = this.saveGeneration;
    // Arrival and purchases finish all synchronous state/terrain changes before capture.
    queueMicrotask(() => {
      if (generation !== this.saveGeneration) return;
      this.checkpointQueued = false;
      this.autosaveRemaining = 0;
      if (!this.saveBusy) void this.saveExpedition();
    });
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
    this.refreshCamp();
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
    this.expeditionStarted = true;
    metricStage(this.run);
    this.autosaveRemaining = 0.5;
    this.cameras.main.setFollowOffset(0, 0);
    this.setPhase('playing');
    this.presentStory();
    this.requestCheckpoint();
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
    this.requestCheckpoint();
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
      if (!this.saveBusy) this.setPhase(this.saveMenuReturn);
      return;
    }
    if (this.run.phase === 'intro') this.skipIntro();
    else if (this.run.phase === 'story') this.chooseStory();
    else if (this.run.phase === 'epilogue') this.closeEpilogue();
    else if (this.run.phase === 'story-log') this.closePlanning();
    else if (this.run.phase === 'playing') this.setPhase('paused');
    else if (this.run.phase === 'paused') this.setPhase('playing');
    else if (
      [
        'building',
        'route',
        'journal',
        'upgrade',
        'settings',
        'help',
        'developer',
        'console',
      ].includes(this.run.phase)
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
    if (['upgrade', 'building'].includes(this.run.phase) && this.progressionStack.length) {
      this.setPhase(this.progressionStack.pop()!);
      return;
    }
    if (this.run.phase === 'console') {
      this.setPhase(this.consoleReturnPhase);
      return;
    }
    if (this.run.phase === 'developer') {
      this.setPhase(this.developerReturnPhase);
      return;
    }
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

  /** Recipe links change planning panels while simulation remains paused. Back returns to its source. */
  switchProgression(phase: 'upgrade' | 'building'): void {
    const current = this.run.phase;
    if ((current !== 'upgrade' && current !== 'building') || current === phase) return;
    this.progressionStack.push(current);
    this.setPhase(phase);
  }

  openUtilityMenu(menu: 'settings' | 'help'): void {
    if (this.run.phase !== 'ready' && this.run.phase !== 'paused') return;
    this.utilityReturnPhase = this.run.phase;
    this.setPhase(menu);
  }

  improveNomadicCamp(id: NomadicBuildingId, slot?: number): void {
    if (!purchaseNomadicBuilding(this.run, id, slot)) return;
    this.saveCamp();
    this.refreshCamp();
    this.audio.play('build');
    this.publishPhase();
  }

  improveEstate(kind: EstatePurchaseKind, id: string, rank: number): void {
    if (!purchaseEstate(this.run, kind, id, rank)) return;
    this.saveCamp();
    this.refreshCamp();
    this.audio.play('build');
    this.publishPhase();
  }

  construct(id: BuildingId, path?: string, slot?: number): void {
    const previousCooldown = gallopCooldown(this.run);
    if (!buildStructure(this.run, id, path, slot)) return;
    this.saveCamp();
    this.dashTimer *= gallopCooldown(this.run) / previousCooldown;
    this.refreshCamp();
    this.audio.play('build');
    this.publishPhase();
  }

  chooseRoute(id: string, destinationId?: string): void {
    if (!beginMigration(this.run, id, destinationId)) return;
    this.requestCheckpoint();
    for (const ger of this.camp.list) {
      if (!(ger instanceof Phaser.GameObjects.Image) || ger.name !== 'ger') continue;
      const x = ger.x * this.camp.scaleX;
      const y = ger.y * this.camp.scaleY;
      const image = this.add
        .image(this.camp.x + x, this.camp.y + y, ger.texture.key, ger.frame.name)
        .setOrigin(ger.originX, ger.originY)
        .setScale(ger.scaleX * this.camp.scaleX, ger.scaleY * this.camp.scaleY)
        .setDepth(100 + this.camp.y + y);
      this.packedGers.push({ image, x, y });
    }
    this.areaThreats = createAreaThreats();
    this.areaEncounter = createAreaEncounter();
    syncAreaEncounter(this.areaEncounter, this.run);
    this.areaEffects.clear();
    this.packingRemaining = 2.4;
    this.landscape.setRegion(this.run.clan.region, currentLocation(this.run), id);
    this.reconcileTerrain();
    this.refreshCamp();
    this.setPhase('playing');
    this.audio.play('depart');
  }

  rallyHost(): void {
    if (issueKurultai(this.run)) {
      this.run.clan.message = 'The Great Kurultai: the host rallies for fifteen seconds.';
      this.callbacks?.onHud(this.snapshot());
    }
  }

  cycleFormation(): void {
    if (this.run.phase !== 'playing') return;
    const formations = availableFormations(this.run);
    if (formations.length > 1) completeGuidance(this.run, 'formation');
    this.run.clan.formation =
      formations[(formations.indexOf(this.run.clan.formation) + 1) % formations.length]!;
    this.run.clan.message =
      (ownsResearch(this.run, 'su-banner-formation')
        ? `Banner ${bannerFormation(this.run)}. `
        : '') + FORMATIONS[this.run.clan.formation].description;
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

  private screenPoint(point: { x: number; y: number }): { x: number; y: number } {
    if (this.landscape.world3d) return this.landscape.world3d.screenPoint(point);
    const camera = this.cameras.main;
    return {
      x: camera.width / 2 + (point.x - camera.midPoint.x) * camera.zoom,
      y: camera.height / 2 + (point.y - camera.midPoint.y) * camera.zoom,
    };
  }

  private combatReadability(): {
    warnings: ReturnType<typeof edgeWarnings>;
    elites: EliteMarker[];
  } {
    const width = this.scale.width,
      height = this.scale.height;
    const threats: ScreenDanger[] = [],
      elites: EliteMarker[] = [];
    const campRadius = campBoundary(this.run).radius;
    for (const [index, shot] of (this.hostileShots.getChildren() as Projectile[]).entries()) {
      if (!shot.active) continue;
      const p = this.screenPoint(shot),
        body = shot.body!;
      const playerHit = isKhanActive(this.run)
        ? incomingTime(shot, body.velocity, this.player, 35)
        : undefined;
      const campHit = incomingTime(shot, body.velocity, this.camp, campRadius);
      const eta = Math.min(playerHit ?? Infinity, campHit ?? Infinity);
      if (eta <= Math.min(4, shot.remaining))
        threats.push({
          id: `shot-${index}`,
          label:
            playerHit !== undefined && playerHit <= (campHit ?? Infinity)
              ? 'Incoming projectile'
              : 'Camp under fire',
          ...p,
          eta,
        });
    }
    for (const enemy of this.enemies.getChildren() as Enemy[]) {
      if (!enemy.active) continue;
      const p = this.screenPoint(enemy),
        key = `${enemy.tacticalSlot}:${enemy.spawnId}`;
      if (
        (enemy.elite || enemy.definition.tacticalRole === 'bulwark') &&
        enemy !== this.boss &&
        p.x > 30 &&
        p.x < width - 30 &&
        p.y > 70 &&
        p.y < height - 60
      )
        elites.push({
          id: key,
          x: p.x / width,
          y: Math.max(
            0.06,
            (p.y - enemy.displayHeight * enemy.originY * this.cameraZoom - 8) / height,
          ),
          label: enemy.elite ? 'ELITE' : 'ARMOURED',
          health: enemy.health / enemy.maxHealth,
        });
      if (enemy.tactics.phase === 'windup')
        threats.push({ id: key, label: 'Charging enemy', ...p, eta: enemy.tactics.remaining });
      else if (enemy === this.boss && this.run.finalStand?.phase === 'warning')
        threats.push({
          id: key,
          label: 'Skybreaker barrage',
          ...p,
          eta: this.run.finalStand.remaining,
        });
      else if (
        enemy.definition.behavior === 'ranged' &&
        enemy.attackTimer > 0 &&
        enemy.attackTimer < 0.8 &&
        Math.min(
          Math.hypot(enemy.x - this.player.x, enemy.y - this.player.y),
          Math.hypot(enemy.x - this.camp.x, enemy.y - this.camp.y),
        ) < 650
      )
        threats.push({ id: key, label: 'Ranged attack', ...p, eta: enemy.attackTimer });
    }
    return { warnings: edgeWarnings(threats, width, height), elites: elites.slice(0, 6) };
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
    if (this.run.phase !== 'playing' || !isKhanActive(this.run) || this.dashTimer > 0) return;
    this.run.combat.gallopSerial++;
    researchGallop(this.run);
    this.dashRemaining = GAME.dash.duration;
    this.dashTimer = gallopCooldown(this.run);
    this.invulnerable = Math.max(this.invulnerable, GAME.dash.duration);
    this.audio.play('dash');
    this.burst(this.player.x, this.player.y, 0xc8df9b, 7);
  }

  research(id: string, rank: number): void {
    const upgrade = RESEARCH_BY_ID.get(id);
    const previousCooldown = gallopCooldown(this.run);
    if (this.run.phase !== 'upgrade' || !upgrade || !applyResearch(this.run, id, rank - 1)) return;
    this.requestCheckpoint();
    this.audio.play('research');
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
          'traditions',
          'developer',
          'console',
        ].includes(this.run.phase))
    )
      this.togglePause();
    else if (controller.research) this.openResearch();
    else if (this.run.phase === 'playing') {
      if (controller.zoomReset) this.changeZoom(0);
      else if (controller.zoomIn) this.changeZoom(1);
      else if (controller.zoomOut) this.changeZoom(-1);
      if (!isKhanActive(this.run)) {
        if (controller.previous) this.selectSuccessor('outrider');
        else if (controller.next) this.selectSuccessor('hearthguard');
      }
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
    observeResearchFrame(this.run, delta);
    this.run.elapsed += dt;
    updateCampfireVigil(
      this.run,
      isKhanActive(this.run) &&
        this.player.body!.velocity.lengthSq() <= 1 &&
        Math.hypot(this.player.x - this.camp.x, this.player.y - this.camp.y) < 300,
      Math.hypot(this.player.x - this.camp.x, this.player.y - this.camp.y),
    );
    advancePatrons(this.run, dt);
    this.dashTimer = Math.max(0, this.dashTimer - dt);
    this.invulnerable = Math.max(0, this.invulnerable - dt);
    this.dashRemaining = Math.max(0, this.dashRemaining - dt);
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
    selectNearestCompanion(this.run, this.player, [
      ...this.riders.flatMap((rider, index) =>
        rider.visible ? [{ kind: 'rider' as const, index, x: rider.x, y: rider.y }] : [],
      ),
      ...this.patronSupport.companionPositions(),
    ]);
    this.updateCamp(dt);
    if (this.run.phase !== 'playing') return;
    if (this.run.clan.integrity <= 0 || this.run.clan.population <= 0) {
      this.finish('dead');
      return;
    }
    if (advanceSuccession(this.run, dt)) this.returnKhan();
    advanceMountedCombat(this.run, dt, this.player, this.dashRemaining > 0);
    if (isKhanActive(this.run)) this.movePlayer(dt);
    else this.player.setPosition(this.camp.x, this.camp.y + GAME.khan.campOffset);
    this.audio.update(dt, {
      speed: isKhanActive(this.run) ? this.player.body!.velocity.length() : 0,
      galloping: this.dashRemaining > 0,
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
    this.patronSupport.update(this.run, dt, this.player, this.camp, this.spatial, {
      damage: (enemy, amount) => this.damageEnemy(enemy, amount),
      volley: (x, y, target, multiplier, index, ghost) =>
        this.shootVolley(x, y, target, 1, multiplier, true, false, 'rider', index, ghost),
    });
    this.attackTimer -= dt;
    if (this.attackTimer <= 0) this.fire();
    this.fireRiders();
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      const spawned = this.spawnEnemy();
      this.spawnTimer =
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
    this.autosaveRemaining -= dt;
    if (this.autosaveRemaining <= 0 && !this.saveBusy) {
      this.autosaveRemaining = GAME.saves.autosaveInterval;
      void this.saveExpedition();
    }
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
    if (this.landscape.world3d) {
      const rotated = this.landscape.world3d.movement(movement.x, movement.y);
      movement.set(rotated.x, rotated.y);
    }
    const moving = movement.lengthSq() > 0.01;
    if (moving) {
      completeGuidance(this.run, 'ride');
      this.facing.copy(movement).normalize();
    }
    if (this.dashRemaining > 0) movement.copy(this.facing).scale(GAME.dash.speed);
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
      this.invulnerable > 0 ? (Math.floor(this.run.elapsed * 20) % 2 ? 0.5 : 0.85) : 1,
    );
    this.player.setDepth(100 + this.player.y);
    this.shadow.setPosition(this.player.x + 9, this.player.y + 5).setDepth(99 + this.player.y);
    this.dustTimer -= dt;
    if (moving && effectAmount(this.visualSettings) > 0 && this.dustTimer <= 0) {
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
      this.dustTimer = 0.12 / Math.max(0.1, effectAmount(this.visualSettings));
    }
    this.aura.setPosition(this.player.x, this.player.y);
    // Scroll factor alone does not cancel camera zoom for the screen-space joystick.
    const camera = this.cameras.main;
    const inverseZoom = 1 / camera.zoom;
    this.joystick!.setScale(inverseZoom)
      .setPosition((camera.width / 2) * (1 - inverseZoom), (camera.height / 2) * (1 - inverseZoom))
      .clear();
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
    if (enemy.elite || isBoss) recordEliteAppearance(this.run);
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
    for (const trail of this.run.researchRuntime?.hoofTrails ?? [])
      if (trail.until > this.run.elapsed)
        warnings
          .lineStyle(
            1,
            0xd8a868,
            (0.35 * (trail.until - this.run.elapsed)) / GAME.research.hoofTrailSeconds,
          )
          .strokeCircle(trail.x, trail.y, GAME.mounted.trailRadius);
    let markedNear = false;
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
        researchEnemySlow(
          this.run,
          enemy.tacticalSlot,
          enemy.spawnId,
          Math.min(playerDistance, campDistance),
          dt,
          enemy.definition.behavior === 'boss',
          inRidgePatch(this.run, enemy.x, enemy.y),
        ) *
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
      if (
        khanActive &&
        playerDistance <= GAME.research.endlessPursuitRadius &&
        isEnemyMarked(this.run, enemy.tacticalSlot, enemy.spawnId)
      )
        markedNear = true;
      speed *= enemyStaggerSlowMultiplier(
        this.run,
        enemy.tacticalSlot,
        enemy.spawnId,
        behavior === 'boss',
      );
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
        this.burst(impact.x, impact.y - 12, 0xc9a26a, 3);
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
        this.dashRemaining > 0 &&
        playerDistance < 68 &&
        enemy.lastGallop !== this.run.combat.gallopSerial
      ) {
        enemy.lastGallop = this.run.combat.gallopSerial;
        const gallopHit = recordGallopThroughEnemy(
          this.run,
          enemy.tacticalSlot,
          enemy.spawnId,
          behavior === 'boss',
        );
        if (gallopHit.staggered && behavior !== 'boss') {
          enemy.pinned = Math.max(enemy.pinned, gallopHit.staggerSeconds);
          enemy.tactics.phase = 'recover';
          enemy.tactics.remaining = Math.max(enemy.tactics.remaining, gallopHit.staggerSeconds);
        }
        if (gallopHit.stormChaserVolley)
          this.shootVolley(
            this.player.x,
            this.player.y,
            enemy,
            this.run.stats.projectiles,
            GAME.research.stormChaserDamage,
            false,
            false,
            'khan',
          );
        const d = Math.max(1, playerDistance),
          push =
            GAME.mounted.breakthroughPush *
            researchKnockback(
              this.run,
              researchEnemySlowed(
                this.run,
                enemy.tacticalSlot,
                enemy.spawnId,
                Math.min(playerDistance, campDistance),
                enemy,
              ),
              behavior === 'boss',
            );
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
      if (enemy.active) {
        const hoofDamage = claimHoofTrailDamage(
          this.run,
          enemy.tacticalSlot,
          enemy.spawnId,
          enemy.x,
          enemy.y,
        );
        if (hoofDamage > 0) this.damageEnemy(enemy, hoofDamage);
      }
      if (enemy.active) {
        const bleedDamage = advanceEnemyBleed(this.run, enemy.tacticalSlot, enemy.spawnId, dt);
        if (bleedDamage > 0) this.damageEnemy(enemy, bleedDamage, 'khan', false);
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
    updateMarkedProximity(this.run, markedNear);
  }

  private fire(): void {
    let hostFired = false;
    const momentum = this.run.clan.momentum;
    const target = this.spatial.nearest(
      this.player.x,
      this.player.y,
      GAME.projectile.range +
        this.run.patrons.bow.range +
        this.run.clan.campEffects.bonuses.range +
        momentum * 120,
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
        this.burst(this.player.x, this.player.y, 0xe3c78c, 5);
      }
    }
    if (hostFired) this.run.combat.volleys++;
    this.attackTimer =
      this.run.stats.attackInterval *
      this.run.clan.campEffects.multipliers.hostInterval *
      researchAttackIntervalMultiplier(this.run) *
      (this.run.clan.formation === 'retreat' && momentum > 0.4 ? 0.7 : 1);
  }

  private fireRiders(): void {
    const count = riderCount(this.run);
    for (let i = 0; i < count; i += 1) {
      const rider = this.riders[i]!;
      const range =
        GAME.projectile.range +
        this.run.patrons.bow.range +
        this.run.clan.campEffects.bonuses.range;
      const clear = (e: Enemy) =>
        !this.landscape.navigation || this.landscape.navigation.lineClear(rider, e, 0);
      const riderTarget =
        this.spatial.nearest(
          rider.x,
          rider.y,
          range,
          (e) => clear(e) && riderPrefersTarget(this.run, e.tacticalSlot, e.spawnId),
        ) ?? this.spatial.nearest(rider.x, rider.y, range, clear);
      if (
        riderTarget &&
        claimRiderVolley(
          this.run,
          i,
          (paired) =>
            this.shootVolley(
              rider.x,
              rider.y,
              riderTarget,
              paired ? 2 : 1,
              (0.6 + (hasDevelopment(this.run, 'archery', 'veteran-riders') ? 0.3 : 0)) *
                this.run.patrons.banner.damage *
                this.run.clan.campEffects.multipliers.riderDamage *
                bannerDamage(this.run),
            ),
          nearestCompanion(this.run, 'rider', i),
        )
      ) {
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
        : volleyFactors(this.run, count, owner === 'khan', ancestral);
    const direction = Math.atan2(target.y - y, target.x - x);
    const tempest = !ghost && volley.tempest;
    const candidates: { slot: number; spawn: number; health: number; x: number; y: number }[] = [
      {
        slot: target.tacticalSlot,
        spawn: target.spawnId,
        health: target.health,
        x: target.x,
        y: target.y,
      },
    ];
    if (owner === 'khan') {
      this.spatial.forEachNearby(target.x, target.y, 180, (e) => {
        if (e.active && e !== target)
          candidates.push({
            slot: e.tacticalSlot,
            spawn: e.spawnId,
            health: e.health,
            x: e.x,
            y: e.y,
          });
      });
    }
    const first = this.projectiles.get(x, y, 'bolt') as Projectile | null;
    if (!first) return false;
    const khanVolley =
      owner === 'khan'
        ? recordKhanVolley(this.run, volley.count, candidates)
        : {
            executionArrow: false,
            skyDarkener: false,
            arrowRainQueued: false,
            damageMultiplier: 1,
            bonusPierces: 0,
            overrideCount: undefined,
          };
    const precision = owner === 'khan' && volley.count === 1;
    const stillHand = precision ? stillHandDamageMultiplier(this.run) : 1;
    const inherited = ghostArrowModifier(this.run);
    const arrowCount = ghost ? 1 : (khanVolley.overrideCount ?? volley.count);
    const basePierces = ghost
      ? inherited.pierces
      : this.run.patrons.bow.pierce + (charged ? 1 : 0) + khanVolley.bonusPierces;
    const bonusPierces = ghost ? 0 : researchBonusPierces(this.run, basePierces);
    for (let i = 0; i < arrowCount; i += 1) {
      const bolt = i === 0 ? first : (this.projectiles.get(x, y, 'bolt') as Projectile | null);
      if (!bolt) break;
      const angle = khanVolley.skyDarkener
        ? direction + (i * Math.PI * 2) / arrowCount
        : direction + (i - (arrowCount - 1) / 2) * volley.spacing;
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
      bolt.fire = ghost ? inherited.fire : hasDevelopment(this.run, 'archery', 'fire-arrows');
      bolt.tempest = tempest;
      bolt.pierces = basePierces + bonusPierces;
      bolt.pins = charged && (this.run.upgrades['piercing-shaft'] ?? 0) > 0;
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
            volley.damage *
            khanVolley.damageMultiplier *
            stillHand;
      bolt.setData('base-damage', bolt.damage);
      bolt.setData('dealt-damage', 0);
      bolt.setData('precision', precision);
      bolt.setData('ghost', ghost);
      bolt.remaining =
        GAME.projectile.lifetime *
        (owner === 'wagon' || owner === 'wagon-ricochet' ? wagonRangeMultiplier(this.run) : 1);
      bolt.setVelocity(
        Math.cos(angle) * GAME.projectile.speed * volley.speed,
        Math.sin(angle) * GAME.projectile.speed * volley.speed,
      );
    }
    const backward = circleOfShaftsVolley(this.run, count, owner === 'khan');
    for (let i = 0; i < backward.count; i += 1) {
      const bolt = this.projectiles.get(x, y, 'bolt') as Projectile | null;
      if (!bolt) break;
      const angle = direction + Math.PI + (i - (backward.count - 1) / 2) * 0.24;
      bolt.enableBody(true, x, y, true, true);
      bolt.barrage = undefined;
      bolt.echoIndex = ancestral ? echoIndex : undefined;
      bolt.source = 'khan';
      bolt.setData('terrain-previous', { x, y });
      bolt
        .setTexture('bolt')
        .setScale(1)
        .setDepth(9200)
        .setRotation(angle + Math.PI / 4)
        .setAlpha(1)
        .clearTint();
      bolt.setCircle(4.5, bolt.width / 2 - 4.5, bolt.height / 2 - 4.5);
      bolt.fire = ghost ? inherited.fire : hasDevelopment(this.run, 'archery', 'fire-arrows');
      bolt.tempest = false;
      bolt.pierces = basePierces + bonusPierces;
      bolt.pins = false;
      bolt.hitTargets.clear();
      bolt.turn = 0;
      if (bolt.fire) bolt.setTint(0xffa04e);
      bolt.damage = this.run.stats.damage * damageOrMultiplier * backward.damage;
      bolt.setData('base-damage', bolt.damage);
      bolt.setData('dealt-damage', 0);
      bolt.setData('precision', precision);
      bolt.setData('ghost', ghost);
      bolt.remaining =
        GAME.projectile.lifetime *
        (owner === 'wagon' || owner === 'wagon-ricochet' ? wagonRangeMultiplier(this.run) : 1);
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
        this.burst(impact.x, impact.y - 12, 0xc9a26a, 3);
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
    const ghost = bolt.getData('ghost') === true;
    const wasPiercing =
      !ghost &&
      (bolt.pierces > 0 ||
        (this.run.upgrades['piercing-shaft'] ?? 0) > 0 ||
        this.run.patrons.bow.pierce > 0);
    if (wasPiercing) recordPiercingHitOnEnemy(this.run, enemy.tacticalSlot, enemy.spawnId);
    const baseDamage = (bolt.getData('base-damage') as number | undefined) ?? bolt.damage;
    const dealtSoFar = (bolt.getData('dealt-damage') as number | undefined) ?? 0;
    const hitDamage = bolt.damage;

    if (bolt.pierces > 0) {
      bolt.pierces -= 1;
      if (!ghost) bolt.damage = projectileDamageAfterPierce(this.run, bolt.damage);
    } else bolt.disableBody(true, true);
    if (bolt.fire) enemy.burning = 2;
    if (bolt.pins && enemy.definition.behavior !== 'boss') {
      enemy.pinned = GAME.mounted.pinSeconds;
      enemy.tactics.phase = 'recover';
      enemy.tactics.remaining = GAME.tactics.chargeRecovery;
    }
    if (bolt.echoIndex !== undefined)
      recordEchoHit(this.run, enemy.tacticalSlot, enemy.spawnId, bolt.echoIndex);
    if (bolt.source === 'khan') recordKhanTarget(this.run, enemy.tacticalSlot, enemy.spawnId);
    const remainingBudget =
      ownsResearch(this.run, 'km-world-piercer') && wasPiercing
        ? capWorldPiercerDamage(this.run, Infinity, baseDamage, dealtSoFar)
        : undefined;
    const dealt = this.damageEnemy(
      enemy,
      hitDamage,
      bolt.source === 'khan' ? 'khan' : 'allied-arrows',
      true,
      bolt.getData('precision') === true,
      remainingBudget,
    );
    bolt.setData('dealt-damage', dealtSoFar + dealt);
    if (remainingBudget !== undefined && dealt >= remainingBudget) bolt.disableBody(true, true);
    if (bolt.source === 'wagon' && circlingVolley(this.run, enemy.definition.behavior === 'boss')) {
      const next = this.spatial.nearest(
        enemy.x,
        enemy.y,
        GAME.research.circlingVolleyRadius,
        (candidate) =>
          candidate !== enemy &&
          candidate.active &&
          candidate.definition.behavior !== 'boss' &&
          bolt.hitTargets.get(candidate) !== candidate.spawnId,
      );
      if (next)
        this.shootVolley(
          enemy.x,
          enemy.y,
          next,
          1,
          hitDamage,
          false,
          false,
          'wagon-ricochet',
          undefined,
          false,
          enemy,
        );
    }
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

  private damageEnemy(
    enemy: Enemy,
    amount: number,
    source: ResearchDamageSource = 'support-and-other',
    triggerOnHit = true,
    precision = false,
    budget = Infinity,
  ): number {
    if (!enemy.active) return 0;
    if (enemy === this.boss && this.run.finalStand?.phase === 'recovery')
      amount *= GAME.finalStand.vulnerableDamage;
    amount *= echoVulnerability(this.run, enemy.tacticalSlot, enemy.spawnId);
    const beforeRatio = enemy.maxHealth > 0 ? enemy.health / enemy.maxHealth : 1;
    amount *= friendlyDamageMultiplier(this.run, beforeRatio);
    const hasArmor =
      (enemy.definition.armor !== undefined || enemy.definition.id === 'brute') &&
      enemy.pinned <= 0;
    const baseArmor = hasArmor ? (enemy.definition.armor ?? GAME.tactics.heavyArmor) : 1;
    amount *= researchArmorMultiplier(
      this.run,
      enemy.tacticalSlot,
      enemy.spawnId,
      baseArmor,
      precision,
    );
    if (triggerOnHit) {
      amount *= recordFriendlyHitOnEnemy(
        this.run,
        enemy.tacticalSlot,
        enemy.spawnId,
        beforeRatio,
        enemy.elite,
        enemy.maxHealth > 0 ? (enemy.health - amount) / enemy.maxHealth : 1,
        precision,
      );
    }
    amount = Math.min(amount, budget);
    const actual = Math.min(Math.max(0, enemy.health), Math.max(0, amount));
    const spill =
      triggerOnHit && source === 'khan' && precision && !enemy.elite
        ? eagleEyeOverkillSpill(this.run, amount, enemy.health, enemy === this.boss)
        : 0;
    if (amount >= 1) enemy.motion.hit();
    recordResearchDamage(
      this.run,
      source,
      Math.min(Math.max(0, enemy.health), Math.max(0, amount)),
    );
    enemy.health -= amount;
    if (enemy.health > 0) {
      if (amount >= 1)
        this.audio.play(enemy.definition.texture === 'earth' ? 'stoneImpact' : 'impact', enemy);
      return actual;
    }
    const { x, y } = enemy;
    recordResearchEnemyKill(this.run, {
      slot: enemy.tacticalSlot,
      spawn: enemy.spawnId,
      elite: enemy.elite,
      nearCamp: Math.hypot(x - this.camp.x, y - this.camp.y) <= 260,
    });
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
    this.run.clan.spirit +=
      value *
      0.4 *
      this.run.patrons.ancestors.spiritGain *
      researchSpiritYield(this.run) *
      this.run.clan.campEffects.multipliers.spiritGain;
    rewardPatronKill(this.run);
    if (enemy === this.boss) defeatSkybreaker(this.run);
    if (spill > 0) {
      const spillTarget = this.spatial.nearest(x, y, 220, (e) => e.active && e !== enemy);
      if (spillTarget) this.damageEnemy(spillTarget, spill, 'khan', false);
    }
    this.burst(x, y, 0xa58aad, 5);
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
      if (
        distance <
        Math.max(
          this.run.stats.pickupRadius * (retreat ? 1.7 : 1),
          remembranceMagnetRadius(this.run),
        )
      )
        gem.attracted = true;
      if (!gem.attracted) continue;
      if (distance < 18) {
        experience += gem.value;
        recordResearchShard(this.run);
        const bonus = recordShardGathering(this.run, gem.value, gem.secondary);
        gem.disableBody(true, true);
        if (bonus > 0) {
          const duplicate = this.gems.get(gem.x + 20, gem.y, 'gem') as Gem | null;
          if (duplicate) {
            duplicate.enableBody(true, gem.x + 20, gem.y, true, true);
            duplicate.setTexture('gem').setScale(0.65).setDepth(3).setVelocity(0, 0);
            duplicate.value = bonus;
            duplicate.secondary = true;
            duplicate.attracted = false;
          } else experience += bonus;
        }
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
    if (
      this.run.phase !== 'playing' ||
      !isKhanActive(this.run) ||
      !enemy.active ||
      this.invulnerable > 0
    )
      return;
    enemy.motion.attack();
    this.takeDamage(enemy.definition.damage);
  }

  private takeDamage(amount: number): void {
    if (this.run.phase !== 'playing' || this.invulnerable > 0) return;
    if (import.meta.env.DEV && this.developerTools?.invincible) return;
    const outcome = damageKhan(this.run, amount);
    if (!outcome) return;
    this.playerMotion.hit();
    this.invulnerable = GAME.invulnerability;
    if (effectAmount(this.visualSettings) > 0) this.cameras.main.shake(90, 0.003);
    this.audio.play(outcome === 'fallen' ? 'fall' : 'hit');
    this.burst(this.player.x, this.player.y, 0xdd967c, 8);
    if (outcome === 'revived') {
      this.audio.play('level');
      this.run.clan.message = 'The last ember holds. Your Khan rides again.';
      this.burst(this.player.x, this.player.y, 0xf1c27b, 12);
    } else if (outcome === 'fallen') this.hideFallenKhan();
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
    this.dashRemaining = 0;
    this.run.clan.momentum = 0;
    this.clearTouch();
    this.patronSupport.relocate(this.camp);
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
    this.dashRemaining = this.dashTimer = 0;
    this.attackTimer = this.dustTimer = 0;
    this.invulnerable = GAME.khan.returnProtection;
    this.clearTouch();
    this.cameras.main.startFollow(this.player, true, 0.09, 0.09).setFollowOffset(0, 0);
    this.burst(x, y, 0xf1c27b, 12);
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
    this.wheelZoomDelta = 0;
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
    // Capture changes above reset Phaser's global preventDefault flag.
    if (import.meta.env.DEV && ['developer', 'console'].includes(phase))
      this.input.keyboard!.disableGlobalCapture();
    else this.input.keyboard!.enableGlobalCapture();
    this.publishPhase();
    if (wasPlaying && phase === 'paused' && !this.saveBusy) void this.saveExpedition();
  }

  private campPressure(): string {
    const sectors = new Array<number>(8).fill(0);
    let incoming = 0,
      attacking = 0;
    const boundary = campBoundary(this.run);
    for (const e of this.enemies.getChildren() as Enemy[]) {
      if (!e.active) continue;
      const dx = e.x - this.camp.x,
        dy = e.y - this.camp.y,
        distance = Math.hypot(dx, dy);
      if (distance > 650) continue;
      incoming++;
      if (distance <= boundary.attackRange + 2) attacking++;
      const screen = projectGround(
        dx,
        dy,
        0,
        this.landscape.world3d?.angle ?? 90,
        this.landscape.world3d?.yaw ?? 0,
      );
      const sector = (Math.round(Math.atan2(screen.y, screen.x) / (Math.PI / 4)) + 8) % 8;
      sectors[sector]! += e.definition.damage / Math.max(80, distance);
    }
    if (!incoming) return 'Camp approaches clear';
    const strongest = sectors.indexOf(Math.max(...sectors));
    return `${['→', '↘', '↓', '↙', '←', '↖', '↑', '↗'][strongest]} Camp: ${incoming} approaching${attacking ? ` · ${attacking} at the barricade` : ''}`;
  }

  private snapshot(): HudSnapshot {
    const dx = this.camp.x - this.player.x;
    const dy = this.camp.y - this.player.y;
    const direction = ['→', '↘', '↓', '↙', '←', '↖', '↑', '↗'][
      (Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) + 8) % 8
    ]!;
    const objective = this.run.field.objective;
    const offset = objective
      ? projectGround(
          objective.x - this.player.x,
          objective.y - this.player.y,
          0,
          this.landscape.world3d?.angle ?? 90,
          this.landscape.world3d?.yaw ?? 0,
        )
      : undefined;
    const fieldBearing = offset
      ? `${['→', '↘', '↓', '↙', '←', '↖', '↑', '↗'][(Math.round(Math.atan2(offset.y, offset.x) / (Math.PI / 4)) + 8) % 8]} ${Math.round(Math.hypot(objective!.x - this.player.x, objective!.y - this.player.y))} paces`
      : undefined;
    const zoomLimits = cameraZoomLimits(this.cameras.main.width, this.cameras.main.height);
    return {
      combatReadability: this.combatReadability(),
      saves: {
        entries: this.platform.saves,
        canSave: this.canSaveExpedition,
        busy: this.saveBusy,
        message: this.saveMessage,
      },
      campPressure: this.campPressure(),
      fieldBearing,
      developerRun: this.developerRun,
      developerConsole:
        import.meta.env.DEV && this.developerTools
          ? {
              ...this.developerTools,
              canCheat: this.canUseDeveloperCheats(),
            }
          : undefined,
      zoom: this.cameras.main.zoom,
      minZoom: zoomLimits.min,
      maxZoom: zoomLimits.max,
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
    count = Math.ceil(count * effectAmount(this.visualSettings));
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
    for (const shelter of campShelters(this.run))
      add(
        shelter.x,
        shelter.y,
        migrating ? 'cart' : 'ger',
        shelter.x === -64 || shelter.x === 65 ? 2.5 : 2,
      ).setData('household', true);
    add(10, -45, 'banner', 3.2);
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
    this.campPopulation = this.run.clan.population;
    this.campHerd = this.run.clan.herd;
    this.camp.sort('depth');
    this.campBarrier.refresh(this.run, this.camp);
  }

  private updateCamp(dt: number): void {
    const clan = this.run.clan;
    const center = GAME.worldSize / 2;
    if (clan.population !== this.campPopulation || clan.herd !== this.campHerd) this.refreshCamp();
    if (clan.stage === 'migration') this.camp.x = center + clan.migrationProgress * 1150;
    this.camp.setDepth(100 + this.camp.y);
    this.campBarrier.update(this.run, dt, this.camp);
    this.clanLife.update(this.run, dt, this.camp);
    this.packingRemaining = Math.max(0, this.packingRemaining - dt);
    for (const ger of this.packedGers) {
      ger.image
        .setPosition(this.camp.x + ger.x, this.camp.y + ger.y)
        .setAlpha(this.packingRemaining / 2.4)
        .setDepth(100 + this.camp.y + ger.y);
    }
    if (this.packingRemaining === 0 && this.packedGers.length) {
      for (const ger of this.packedGers) ger.image.destroy();
      this.packedGers = [];
    }
    for (const child of this.camp.list)
      if (child instanceof Phaser.GameObjects.Image && child.name === 'banner') {
        const rest = child.getData('restScale') as number;
        child
          .setScale(rest * (1 + Math.sin(this.run.elapsed * 2.3 + child.x) * 0.035), rest)
          .setAngle(Math.sin(this.run.elapsed * 1.7 + child.x) * 1.2);
      }
    this.campLabel
      .setPosition(this.camp.x, this.camp.y - 112 * CAMP_VISUAL_SCALE)
      .setText(clan.stage === 'migration' ? 'PROTECT THE CARAVAN  →' : 'YOUR CLAN');
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
      const packMove = packInstinctBonus(
        this.run,
        nearestCompanion(this.run, 'rider', i),
      ).moveSpeed;
      const next = {
        x: Phaser.Math.Linear(rider.x, desired.x, Math.min(1, dt * 5 * packMove)),
        y: Phaser.Math.Linear(rider.y, desired.y, Math.min(1, dt * 5 * packMove)),
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
    const preparingVolley = this.attackTimer > 0 && this.attackTimer < 0.12;
    if (isKhanActive(this.run)) {
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
    return addAreaThreat(this.areaThreats, kind, point, this.run.patrons.water.warning, owner);
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
          this.takeDamage(damage * this.run.patrons.water.hazardDamage);
        if (Math.hypot(threat.x - this.camp.x, threat.y - this.camp.y) < radius + 25)
          this.damageClan(
            damage * GAME.areaCombat.campDamage * this.run.patrons.water.hazardDamage,
            'area',
          );
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
    if (clan.region >= 2) this.hazardTimer -= dt;
    if (clan.region >= 2 && this.hazardTimer <= 0 && isKhanActive(this.run)) {
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
        remaining: 2 + this.run.patrons.water.warning + terrainWarningBonus(this.run),
        warning,
      });
      this.hazardTimer = clan.region === 3 ? 6 : 10;
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
      if (
        hazard.source !== 'seer' &&
        isKhanActive(this.run) &&
        Math.hypot(this.player.x - hazard.x, this.player.y - hazard.y) < radius
      )
        hazard.researchEntered = true;
      if (
        hazard.source !== 'seer' &&
        !hazard.researchCrossed &&
        this.dashRemaining > 0 &&
        Math.hypot(this.player.x - hazard.x, this.player.y - hazard.y) < radius &&
        ownsResearch(this.run, 'lu-eye-of-the-mountain')
      ) {
        hazard.researchCrossed = true;
        const crossing = resolveResearchEruption(
          this.run,
          hazard.x,
          hazard.y,
          radius,
          this.player,
          true,
          hazard.researchEntered === true,
          false,
        );
        if (crossing.rock)
          this.spatial.forEachNearby(hazard.x, hazard.y, GAME.research.rockArcRadius, (enemy) =>
            this.damageEnemy(enemy, this.run.stats.damage * GAME.research.rockArcDamage),
          );
      }
      if (hazard.remaining > 0) continue;
      this.burst(hazard.x, hazard.y, clan.region === 3 ? 0xbf6558 : 0x796d4d, 12);
      this.audio.play('thunder', hazard);
      const eruption =
        hazard.source !== 'seer'
          ? resolveResearchEruption(
              this.run,
              hazard.x,
              hazard.y,
              radius,
              this.player,
              this.dashRemaining > 0,
              hazard.researchEntered === true,
            )
          : { immune: false, rock: false };
      if (eruption.rock)
        this.spatial.forEachNearby(hazard.x, hazard.y, GAME.research.rockArcRadius, (enemy) =>
          this.damageEnemy(enemy, this.run.stats.damage * GAME.research.rockArcDamage),
        );
      if (
        !hazard.researchCrossed &&
        !eruption.immune &&
        Phaser.Math.Distance.Between(hazard.x, hazard.y, this.player.x, this.player.y) < radius
      )
        this.takeDamage((hazard.damage ?? 20) * this.run.patrons.water.hazardDamage);
      if (Phaser.Math.Distance.Between(hazard.x, hazard.y, this.camp.x, this.camp.y) < radius + 25)
        this.damageClan(
          (hazard.source === 'seer' ? 5 : 8) * this.run.patrons.water.hazardDamage,
          hazard.source === 'seer' ? 'seer' : 'eruption',
        );
      hazard.warning.destroy();
      this.hazards.splice(i, 1);
    }
  }

  private updateSupport(dt: number): void {
    const clan = this.run.clan;
    this.supportTimer -= dt;
    this.wagonTimer -= dt;
    this.wardTimer -= dt;
    const terrain = claimTerrainWave(this.run);
    if (terrain.wave || terrain.stone)
      this.spatial.forEachNearby(
        this.player.x,
        this.player.y,
        researchWaterRadius(this.run),
        (enemy) => {
          if (terrain.wave && enemy.definition.behavior !== 'boss') {
            delete this.run.researchRuntime?.staggerCooldownUntil?.[
              `${enemy.tacticalSlot}:${enemy.spawnId}`
            ];
            enemy.pinned = 0;
          }
          this.damageEnemy(
            enemy,
            this.run.stats.damage *
              ((terrain.wave ? GAME.research.riverWaveDamage : 0) +
                (terrain.stone ? GAME.research.landStoneDamage : 0)),
          );
        },
      );
    const ashPulse = claimAshBornPulse(this.run);
    const flamePulse = claimFlameRefusesPulse(this.run);
    if (isKhanActive(this.run)) {
      const radius = Math.max(
        ashPulse?.radius ?? 0,
        flamePulse?.radius ?? 0,
        GAME.research.eternalHearthRadius,
      );
      this.spatial.forEachNearby(this.player.x, this.player.y, radius, (enemy) => {
        const dx = enemy.x - this.player.x;
        const dy = enemy.y - this.player.y;
        const distance = Math.hypot(dx, dy);
        if (flamePulse && distance <= flamePulse.radius) this.damageEnemy(enemy, flamePulse.damage);
        if (!enemy.active) return;
        const boss = enemy.definition.behavior === 'boss';
        const push =
          ((ashPulse && !boss && distance <= ashPulse.radius ? ashPulse.push : 0) +
            eternalHearthPush(this.run, distance, boss) * dt) *
          researchKnockback(
            this.run,
            researchEnemySlowed(
              this.run,
              enemy.tacticalSlot,
              enemy.spawnId,
              Math.min(distance, Math.hypot(enemy.x - this.camp.x, enemy.y - this.camp.y)),
              enemy,
            ),
            boss,
          );
        if (push > 0)
          enemy.setPosition(
            enemy.x + (distance ? dx / distance : 1) * push,
            enemy.y + (distance ? dy / distance : 0) * push,
          );
      });
    }
    const arrowRain = claimArrowRainDrop(this.run);
    if (arrowRain) {
      claimThousandArrows(this.run, () => {
        let released = false;
        for (let i = 0; i < riderCount(this.run); i++) {
          const rider = this.riders[i]!;
          if (
            Math.hypot(rider.x - this.player.x, rider.y - this.player.y) >
            GAME.research.thousandArrowsRadius
          )
            continue;
          const target = this.spatial.nearest(
            rider.x,
            rider.y,
            GAME.projectile.range + this.run.patrons.bow.range,
          );
          if (target) {
            const fired = this.shootVolley(
              rider.x,
              rider.y,
              target,
              1,
              GAME.research.thousandArrowsDamage *
                0.6 *
                this.run.patrons.banner.damage *
                this.run.clan.campEffects.multipliers.riderDamage,
            );
            released ||= fired;
          }
        }
        return released;
      });
      this.spatial.forEachNearby(arrowRain.x, arrowRain.y, arrowRain.radius, (enemy) =>
        this.damageEnemy(enemy, arrowRain.damage, 'khan'),
      );
      this.burst(arrowRain.x, arrowRain.y, 0xe3c78c, 8);
    }
    if (clan.buildings.sanctuary && this.supportTimer <= 0) {
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
      this.supportTimer =
        (hasDevelopment(this.run, 'sanctuary', 'wind-shamans') ? 1.8 : 3.5) *
        (clan.region === 3 ? 1.5 : 1) *
        clan.campEffects.multipliers.sanctuaryInterval;
    }
    if (this.run.clan.buildings.wagon && ownsResearch(this.run, 'gu-arrow-platforms')) {
      const target = this.spatial.nearest(
        this.camp.x,
        this.camp.y,
        GAME.research.arrowPlatformRange * wagonRangeMultiplier(this.run),
      );
      if (target)
        claimArrowPlatform(this.run, () =>
          this.shootVolley(
            this.camp.x,
            this.camp.y,
            target,
            1,
            GAME.research.arrowPlatformDamage * wagonDamageMultiplier(this.run),
            false,
            false,
            'wagon',
          ),
        );
    }
    const wagonResearch = wagonResearchDefence(this.run);
    if (wagonResearch.active && this.wagonTimer <= 0) {
      const target = this.spatial.nearest(
        this.camp.x,
        this.camp.y,
        wagonResearch.range * wagonRangeMultiplier(this.run),
      );
      if (target)
        this.shootVolley(
          this.camp.x,
          this.camp.y,
          target,
          hasDevelopment(this.run, 'wagon', 'war-carts') ? 3 : 1,
          wagonResearch.damage * wagonDamageMultiplier(this.run),
          false,
          false,
          'wagon',
        );
      this.wagonTimer = 0.9 * this.run.patrons.guardian.wagonInterval;
    }
    if (hasDevelopment(this.run, 'sanctuary', 'ancestral-ward') && this.wardTimer <= 0) {
      this.spatial.forEachNearby(
        this.camp.x,
        this.camp.y,
        campBoundary(this.run).wardRadius,
        (enemy) => this.damageEnemy(enemy, this.run.stats.damage * 1.5),
      );
      this.burst(this.camp.x, this.camp.y, 0x8acfe2, 8);
      this.wardTimer = 1.2;
    }
  }

  private arrive(): void {
    this.saveCamp();
    const center = GAME.worldSize / 2;
    // Each crossing leads to a new handcrafted arena; structures travel with the clan.
    this.clanLife.relocate();
    this.packingRemaining = 0;
    for (const ger of this.packedGers) ger.image.destroy();
    this.packedGers = [];
    this.camp.setPosition(center, center);
    this.player.setPosition(center, center + 100).setVelocity(0, 0);
    this.patronSupport.relocate(isKhanActive(this.run) ? this.player : this.camp);
    for (const group of [this.enemies, this.projectiles, this.hostileShots])
      for (const actor of group.getChildren() as Enemy[]) actor.disableBody(true, true);
    // Carry all uncollected experience to the next camp rather than discarding it.
    for (const gem of this.gems.getChildren() as Gem[])
      if (gem.active) gem.setPosition(center, center + 100);
    for (const hazard of this.hazards) hazard.warning.destroy();
    this.hazards = [];
    this.hazardTimer = GAME.hazards.initialDelay;
    this.areaThreats = createAreaThreats();
    this.areaEncounter = createAreaEncounter();
    syncAreaEncounter(this.areaEncounter, this.run);
    this.areaEffects.clear();
    this.landscape.setRegion(this.run.clan.region, currentLocation(this.run));
    this.reconcileTerrain();
    this.refreshCamp();
    this.campBarrier.relocate(this.run, this.camp);
    this.cameras.main.flash(500, 225, 215, 180);
    if (!this.presentStory()) this.publishPhase();
    this.audio.play('arrive');
  }
}
