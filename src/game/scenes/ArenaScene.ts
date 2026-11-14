import {
  createCharacterCreator,
  creatorProfile,
  changeCreatorOption,
  randomizeCreatorName,
} from '../state/characterCreator';
import { isValidCharacterName } from '../../shared/characterProfile';
import Phaser from 'phaser';
import type { GamePlatform } from '../../platform/GamePlatform';
import type { AudioChannel } from '../../shared/audioSettings';
import { normalizeAudioMix } from '../../shared/audioSettings';
import { CHARACTER_CLASSES, type CharacterClassId } from '../../shared/characterProfile';
import type { ExpeditionSave, SaveSlot } from '../../shared/expeditionSave';
import type { NomadicBuildingId } from '../../shared/nomadicCamp.js';
import { normalizeVisualSettings, type VisualSettings } from '../../shared/visualSettings';
import type { CharacterMotion } from '../animation/CharacterMotion';
import type { DefeatSprites } from '../animation/CharacterVisuals';
import type { CampBarrier } from '../assets/CampBarrier';
import type { ClanLife } from '../assets/ClanLife';
import {
  ART_WIDTH,
  CAMP_VISUAL_SCALE,
  artTexture,
  createPainterlyEffects,
  preloadPainterlyArt,
  styleActor,
} from '../assets/painterlyArt';
import { SteppeLandscape } from '../assets/SteppeLandscape';
import { environmentForLocation } from '../audio/mixing';
import type { SoundKind } from '../audio/soundPalette';
import { GAME } from '../config';
import type { ClassAbilitySlot } from '../data/classes';
import { FORMATIONS, STARTING_TRADITIONS, type StartingTraditionId } from '../data/clan';
import type { SuccessorTrait } from '../data/successors';
import { createDeveloperTools, executeDeveloperCommand } from '../dev/commands';
import { DEVELOPER_LEVELS, createDeveloperClassRun, createDeveloperRun } from '../dev/levels';
import { Enemy, Gem, Projectile } from '../entities/actors';
import { runFromCampArchive } from '../state/campArchive';
import { advanceCampRecovery, gallopCooldown } from '../state/campCombat';
import { purchaseEstate, type EstatePurchaseKind } from '../state/campEstate';
import {
  advanceClan,
  availableFormations,
  beginMigration,
  buildStructure,
  canMigrate,
} from '../state/clan';
import type { ClanDamageCause } from '../state/clanSafety';
import { advanceEncounters } from '../state/encounters';
import { decodeExpedition, type WorldArchive } from '../state/expeditionArchive';
import { metricStage, observeExpedition } from '../state/expeditionMetrics';
import { syncFieldState } from '../state/fieldObjectives';
import { completeGuidance } from '../state/guidance';
import { currentLocation } from '../state/journey';
import { advanceSuccession, beginSuccession, chooseSuccessor, isKhanActive } from '../state/khan';
import { advanceMountedCombat } from '../state/mountedCombat';
import { advanceKhanManeuver } from '../state/khanManeuvers';
import { purchaseNomadicBuilding } from '../state/nomadicCamp';
import { createRun } from '../state/run';
import { ActionKeys } from '../systems/ActionKeys';
import { GameAudio } from '../systems/Audio';
import { clampCameraZoom } from '../systems/CameraView';
import type { FieldMarkers } from '../systems/FieldMarkers';
import { GamepadInput } from '../systems/GamepadInput';
import { SpatialHash } from '../systems/SpatialHash';
import { TerrainCollision } from '../terrain/TerrainCollision';
import type { BuildingId, EnemyDefinition, HudSnapshot, RunState } from '../types';
import { AreaCombat } from './arena/AreaCombat';
import type { ArenaContext } from './arena/ArenaContext';
import { ArenaEffects } from './arena/ArenaEffects';
import { ArenaInput } from './arena/ArenaInput';
import { ArenaPersistence } from './arena/ArenaPersistence';
import { createArenaTimers, type ArenaTimers } from './arena/ArenaTimers';
import { captureBody } from './arena/bodyArchive';
import { CampDefences } from './arena/CampDefences';
import { CampPresenter } from './arena/CampPresenter';
import { CharacterAnimator } from './arena/CharacterAnimator';
import { ClanDamage } from './arena/ClanDamage';
import { CombatSystem, type HostileShooter } from './arena/CombatSystem';
import { EnemyBehaviour } from './arena/EnemyBehaviour';
import { EnemyDirector, type SpawnDirective } from './arena/EnemyDirector';
import { FieldObjectiveDirector } from './arena/FieldObjectiveDirector';
import { Hazards, type Hazard } from './arena/Hazards';
import { HudPresenter } from './arena/HudPresenter';
import { KhanController } from './arena/KhanController';
import { RiderHost } from './arena/RiderHost';

export interface ArenaCallbacks {
  onHud: (snapshot: HudSnapshot) => void;
  onPhase: (snapshot: HudSnapshot) => void;
  onMenuInput: (action: 'next' | 'previous' | 'up' | 'down' | 'left' | 'right' | 'confirm') => void;
  onSaveError: () => void;
  onCampBack?: () => boolean;
}

export class ArenaScene extends Phaser.Scene {
  run: RunState = createRun();
  characterCreator = createCharacterCreator();
  private player!: Phaser.Physics.Arcade.Sprite;
  private enemies!: Phaser.Physics.Arcade.Group;
  private projectiles!: Phaser.Physics.Arcade.Group;
  private camp!: Phaser.GameObjects.Container;
  private hostileShots!: Phaser.Physics.Arcade.Group;
  private landscape!: SteppeLandscape;
  private campPresenter!: CampPresenter;
  private terrainCollision!: TerrainCollision;
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
  private readonly enemyDirector = this.createEnemyDirector();
  private readonly clanDamage = new ClanDamage(this.arena);
  private readonly khan = this.createKhan();
  private readonly areaCombat = new AreaCombat(
    this.arena,
    { takeDamage: (amount) => this.khan.takeDamage(amount) },
    this.clanDamage,
  );
  private readonly hazardSystem = new Hazards(
    this.arena,
    { takeDamage: (amount) => this.khan.takeDamage(amount) },
    this.clanDamage,
  );
  private readonly combat = this.createCombat();
  private readonly riderHost = new RiderHost(this.arena, this.combat);
  private readonly animator = new CharacterAnimator(
    this.arena,
    this.khan,
    this.riderHost,
    this.combat,
  );
  private readonly campDefences = new CampDefences(this.arena, this.combat);
  private readonly fieldObjectives = new FieldObjectiveDirector(this.arena, this.enemyDirector);
  private readonly enemyBehaviour = this.createEnemyBehaviour();
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
  private startingTraditionId: StartingTraditionId = 'shared-hearth';
  private guidanceEnabled = true;
  private facing = new Phaser.Math.Vector2(0, 1);
  /** Created once, so the pending write and save generation survive a restart. */
  private readonly persistence: ArenaPersistence;
  private saveMenuReturn: 'ready' | 'paused' | 'dead' = 'ready';
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

  private createEnemyDirector(): EnemyDirector {
    const scene = this;
    return new EnemyDirector(this.arena, {
      get areaEncounter() {
        return scene.areaCombat.areaEncounter;
      },
    });
  }

  private createKhan(): KhanController {
    const scene = this;
    return new KhanController(this.arena, {
      get areaThreats() {
        return scene.areaCombat.areaThreats;
      },
      clearTouch: () => scene.controls.clearTouch(),
    });
  }

  private createEnemyBehaviour(): EnemyBehaviour {
    const scene = this;
    return new EnemyBehaviour(
      this.arena,
      {
        get campBarrier() {
          return scene.campBarrier;
        },
        get fieldMarkers() {
          return scene.fieldObjectives.fieldMarkers;
        },
        addSeerHazard: (target, definition) => scene.hazardSystem.addSeer(target, definition),
        queueAreaThreat: (kind, point, owner) => scene.areaCombat.queueThreat(kind, point, owner),
      },
      this.combat,
      this.enemyDirector,
      this.clanDamage,
    );
  }

  private createCombat(): CombatSystem {
    const scene = this;
    return new CombatSystem(
      this.arena,
      {
        get playerMotion() {
          return scene.khan.playerMotion;
        },
        get defeats() {
          return scene.animator.defeats;
        },
        get campBarrier() {
          return scene.campBarrier;
        },
        takeDamage: (amount) => scene.khan.takeDamage(amount),
        hurtPlayer: (enemy) => scene.khan.hurtPlayer(enemy),
        faceTarget: (x, y) => scene.khan.faceTarget(x, y),
      },
      this.enemyDirector,
      this.clanDamage,
    );
  }

  connect(callbacks: ArenaCallbacks): void {
    this.callbacks = callbacks;
    if (this.player) this.publishPhase();
  }

  preload(): void {
    preloadPainterlyArt(this);
  }

  create(data?: {
    developerLevel?: string;
    developerClass?: CharacterClassId;
    expedition?: ExpeditionSave;
  }): void {
    this.audio.reset();
    this.persistence.reset();
    const developerRun =
      import.meta.env.DEV && data?.developerLevel
        ? createDeveloperRun(data.developerLevel)
        : import.meta.env.DEV && data?.developerClass
          ? createDeveloperClassRun(
              data.developerClass,
              this.startingTraditionId,
              this.platform.profile.character,
            )
          : undefined;
    this.developerRun = !!developerRun;
    // Keep testing preferences across checkpoints; a normal new run clears every cheat.
    if (import.meta.env.DEV && !developerRun)
      this.developerTools = createDeveloperTools(this.platform.profile.developerCommandHistory);
    this.characterCreator = createCharacterCreator(this.platform.profile.character);
    this.consoleReturnPhase = 'ready';
    this.run = developerRun ?? createRun(this.startingTraditionId, this.platform.profile.character);
    if (!developerRun) {
      this.run.guidance.enabled = this.guidanceEnabled;
    }
    this.developerReturnPhase = 'ready';
    Object.assign(this.timers, createArenaTimers());
    this.hudTimer = 0;
    this.utilityReturnPhase = 'ready';
    this.riderHost.reset();
    this.khan.reset();
    this.combat.reset();
    this.enemyDirector.reset();
    this.hazardSystem.reset();
    this.facing.set(0, 1);
    this.best = this.platform.profile.bestSeconds;

    createPainterlyEffects(this);
    this.areaCombat.create();
    this.animator.create();
    this.fieldObjectives.create();
    this.landscape = new SteppeLandscape(this);
    this.landscape.setResolution(this.visualSettings.renderResolution);
    this.applyLandscapeBounds();
    const center = this.landscape.campPosition;
    this.camp = this.add
      .container(center.x, center.y)
      .setScale(CAMP_VISUAL_SCALE)
      .setDepth(100 + center.y);
    this.campPresenter = new CampPresenter(this.arena);
    this.riderHost.createSlots();
    this.khan.createAttachments();
    this.player = this.physics.add
      .sprite(center.x, center.y + 100, ...artTexture('player'))
      .setName('khan')
      .setCollideWorldBounds(true);
    styleActor(this.player, 'player', ART_WIDTH.player!, 10);
    this.khan.renderPlayerVisual();

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
    this.combat.registerOverlaps();
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
      useAbility: (slot) => this.useAbility(slot),
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
      this.landscape.setLocation(currentLocation(this.run));
      this.applyLandscapeBounds();
      this.relocateToLandscapeCamp();
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
    if (!['ready', 'paused', 'dead'].includes(this.run.phase)) return;
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
    if (!['ready', 'paused', 'saves', 'dead'].includes(this.run.phase)) return;
    const save = await this.platform.loadExpedition(slot);
    // Validate completely before tearing down the current, still playable scene.
    decodeExpedition(save);
    this.audio.unlock();
    this.scene.restart({ expedition: save });
  }

  private captureWorld(): WorldArchive {
    const body = captureBody;
    const pool = this.enemies.getChildren() as Enemy[];
    return {
      orkhonLayout: currentLocation(this.run).id === 'orkhon-valley' ? 2 : undefined,
      player: this.khan.capture(),
      camp: { x: this.camp.x, y: this.camp.y },
      facing: { x: this.facing.x, y: this.facing.y },
      zoom: this.cameraZoom,
      timers: { ...this.timers },
      ...this.enemyDirector.capturePool(),
      ...this.combat.captureShots(pool),
      gems: (this.gems.getChildren() as Gem[])
        .filter((g) => g.active)
        .map((g) => ({
          ...body(g),
          value: g.value,
          attracted: g.attracted,
          secondary: g.secondary,
        })),
      riders: this.riderHost.capture(),
      hazards: this.hazardSystem.capture(),
      ...this.areaCombat.capture(),
    };
  }

  private restoreExpedition(save: ExpeditionSave): void {
    const { run, world } = decodeExpedition(save);
    this.run = run;
    this.input.keyboard!.resetKeys();
    this.persistence.started = true;
    this.guidanceEnabled = run.guidance.enabled;
    Object.assign(this.timers, world.timers);
    this.areaCombat.restore(world);
    this.landscape.setLocation(currentLocation(run));
    this.applyLandscapeBounds();
    this.campPresenter.restore(world.camp);
    this.khan.restore(world);
    if (!isKhanActive(run)) this.khan.hideFallenKhan();
    const pool = this.enemyDirector.restorePool(world);
    this.combat.restoreShots(world, pool);
    for (const saved of world.gems) {
      const gem = this.gems.get(saved.x, saved.y, 'gem') as Gem;
      gem.enableBody(true, saved.x, saved.y, true, true);
      gem.setScale(0.85).setDepth(3).setVelocity(saved.vx, saved.vy);
      gem.value = saved.value;
      gem.attracted = saved.attracted;
      gem.secondary = saved.secondary ?? false;
    }
    this.riderHost.restore(world.riders);
    this.hazardSystem.restore(world.hazards);
    this.reconcileTerrain();
    this.applyCameraZoom(world.zoom);
    this.cameras.main.startFollow(this.player, true, 0.09, 0.09).setFollowOffset(0, 0);
    this.cameras.main.centerOn(this.player.x, this.player.y);
    this.areaCombat.update(0);
    this.fieldObjectives.refreshMarkers();
    this.setPhase('paused');
  }

  continueCamp(): void {
    if (this.run.phase !== 'ready') return;
    const restored = runFromCampArchive(this.platform.profile.camp);
    if (!restored) return;
    this.run = restored;
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
    this.run = createRun(this.startingTraditionId, this.platform.profile.character);
    this.run.phase = 'traditions';
    this.run.guidance.enabled = this.guidanceEnabled;
    this.campPresenter.refresh();
    this.publishPhase();
  }

  startRun(): void {
    if (!['ready', 'traditions'].includes(this.run.phase)) return;
    this.audio.unlock();
    this.setPhase('character');
  }

  changeCharacterOption(field: string, value: string): void {
    if (this.run.phase !== 'character') return;
    changeCreatorOption(this.characterCreator, field, value);
    // Name typing is reflected in place so the preview animation and input caret stay uninterrupted.
    if (field === 'name') return;
    this.publishPhase();
  }

  randomCharacterName(): void {
    if (this.run.phase !== 'character') return;
    randomizeCreatorName(this.characterCreator);
    this.publishPhase();
  }

  beginJourney(): void {
    if (this.run.phase !== 'character' || !isValidCharacterName(this.characterCreator.profile.name))
      return;
    const profile = creatorProfile(this.characterCreator);
    this.run = createRun(this.startingTraditionId, profile);
    this.run.guidance.enabled = this.guidanceEnabled;
    this.campPresenter.refresh();
    this.khan.reset();
    void this.platform.saveCharacterProfile(profile).catch(() => this.callbacks?.onSaveError());
    this.audio.unlock();
    this.beginExpedition();
  }

  private beginExpedition(): void {
    this.persistence.begin();
    metricStage(this.run);
    this.cameras.main.setFollowOffset(0, 0);
    this.setPhase('playing');
    this.persistence.requestCheckpoint();
    this.audio.play('arrive');
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
    return !this.run.legacy.outcome && !['ready', 'traditions', 'character'].includes(phase);
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

  startDeveloperClass(classId: string): void {
    if (
      !import.meta.env.DEV ||
      this.run.phase !== 'developer' ||
      !CHARACTER_CLASSES.includes(classId as CharacterClassId)
    )
      return;
    this.audio.unlock();
    this.scene.restart({ developerClass: classId as CharacterClassId });
  }

  togglePause(): void {
    if (['traditions', 'character'].includes(this.run.phase)) {
      this.setPhase('ready');
      return;
    }
    if (this.run.phase === 'saves') {
      if (!this.persistence.busy) this.setPhase(this.saveMenuReturn);
      return;
    }
    if (this.run.phase === 'playing') this.setPhase('paused');
    else if (this.run.phase === 'paused') this.setPhase('playing');
    else if (
      ['building', 'route', 'journal', 'settings', 'help', 'developer', 'console'].includes(
        this.run.phase,
      )
    )
      this.closePlanning();
  }

  openBuildings(): void {
    if (this.run.legacy.outcome) return;
    if (['playing', 'journal'].includes(this.run.phase) && this.run.clan.stage !== 'migration')
      this.setPhase('building');
    else if (this.run.phase === 'building') this.closePlanning();
  }

  openRoutes(): void {
    if (this.run.legacy.outcome) return;
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
    if (['traditions', 'character'].includes(this.run.phase)) {
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
    if (this.run.phase === 'journal') this.setPhase(this.run.legacy.outcome ?? 'playing');
    else if (['building', 'route'].includes(this.run.phase)) this.setPhase('playing');
    else if (['settings', 'help'].includes(this.run.phase)) this.setPhase(this.utilityReturnPhase);
  }

  toggleJournal(): void {
    if (['playing', 'dead'].includes(this.run.phase)) this.setPhase('journal');
    else if (this.run.phase === 'journal') this.closePlanning();
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
    this.areaCombat.reset();
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
    this.cameraZoom = clampCameraZoom(zoom, camera.width, camera.height, this.landscape.playBounds);
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
    else if (key === 'renderResolution') {
      this.visualSettings.renderResolution =
        this.visualSettings.renderResolution === 'auto' ? 'full' : 'auto';
      this.landscape.setResolution(this.visualSettings.renderResolution);
    }
    this.combat.restyleHostileShots();
    this.areaCombat.update(0);
    void this.platform
      .saveVisualSettings(this.visualSettings)
      .catch(() => this.callbacks?.onSaveError());
  }

  private applyLandscapeBounds(): void {
    const bounds = this.landscape.playBounds;
    this.physics.world.setBounds(bounds.x, bounds.y, bounds.width, bounds.height);
    this.cameras.main.setBounds(bounds.x, bounds.y, bounds.width, bounds.height);
  }

  private relocateToLandscapeCamp(): void {
    const camp = this.landscape.campPosition;
    this.camp.setPosition(camp.x, camp.y).setDepth(100 + camp.y);
    this.player.setPosition(camp.x, camp.y + 100).setVelocity(0, 0);
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
    this.khan.syncAttachments();
    for (const [enemy, shadow] of this.enemyDirector.shadows)
      if (enemy.active) shadow.setPosition(enemy.x + 6, enemy.y + 4).setDepth(99 + enemy.y);
    this.riderHost.reconcile(navigation);
    this.spatial.rebuild(this.enemies.getChildren() as Enemy[]);
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
    this.khan.dash();
  }

  update(_time: number, delta: number): void {
    if (!this.controls.pollController()) return;
    if (this.run.phase !== 'playing') return;
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
      this.khan.hideFallenKhan();
    }

    this.run.elapsed += dt;

    advanceCampRecovery(this.run, dt);
    this.timers.dashTimer = Math.max(0, this.timers.dashTimer - dt);
    this.timers.invulnerable = Math.max(0, this.timers.invulnerable - dt);
    this.timers.dashRemaining = Math.max(0, this.timers.dashRemaining - dt);
    advanceKhanManeuver(this.timers, dt);
    const outcome = advanceClan(this.run, dt, this.clanDamage.protection);
    if (outcome === 'lost') {
      this.finish('dead');
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
    if (advanceSuccession(this.run, dt)) this.khan.returnKhan();
    advanceMountedCombat(this.run, dt, this.player, this.timers.dashRemaining > 0);
    const aim = this.controls.aimPoint(this.player, this.facing);
    if (isKhanActive(this.run)) {
      this.khan.move(dt, this.controls.movement(this.player));
      this.controls.drawJoystick();
    } else this.player.setPosition(this.camp.x, this.camp.y + GAME.khan.campOffset);
    this.audio.update(dt, {
      speed: isKhanActive(this.run) ? this.player.body!.velocity.length() : 0,
      galloping: this.timers.dashRemaining > 0,
      caravan: this.run.clan.stage === 'migration',
      environment: environmentForLocation(currentLocation(this.run)),
      listener: isKhanActive(this.run) ? this.player : this.camp,
      camp: this.camp,
    });
    syncFieldState(this.run);
    this.areaCombat.sync();
    if (
      advanceEncounters(
        this.run,
        this.enemies.countActive(true) > 0 ||
          this.hostileShots.countActive(true) > 0 ||
          this.hazards.some((hazard) => hazard.source === 'seer') ||
          this.areaCombat.areaThreats.threats.some(
            (threat) =>
              !!threat.owner &&
              threat.impacted &&
              GAME.areaCombat.threats[threat.kind].tickDamage > 0 &&
              threat.age < threat.warning + GAME.areaCombat.threats[threat.kind].duration,
          ),
      )
    )
      this.audio.play('encounter');
    this.fieldObjectives.update(dt);
    this.enemyBehaviour.update(dt);
    if (this.run.clan.integrity <= 0 || this.run.clan.population <= 0) {
      this.finish('dead');
      return;
    }
    this.spatial.rebuild(this.enemies.getChildren() as Enemy[]);
    this.campDefences.update(dt);
    this.combat.tickKhanCombat(
      dt,
      this.controls.lightAttackHeld(),
      this.controls.heavyAttackHeld(),
      aim,
      this.controls.hasUsableAim(),
    );
    this.riderHost.fire();
    this.enemyDirector.tickSpawns(dt);
    this.combat.updateProjectiles(dt);
    this.combat.collectGems(dt);
    if (this.run.phase !== 'playing') return;
    this.areaCombat.update(dt);
    this.persistence.tick(dt);
    if (this.run.clan.integrity <= 0 || this.run.clan.population <= 0) {
      this.finish('dead');
      return;
    }
    this.animator.update(dt);
    this.hudTimer -= dt;
    if (this.hudTimer <= 0) {
      this.hudTimer = GAME.hud.updateInterval;
      this.callbacks?.onHud(this.snapshot());
    }
  }

  selectSuccessor(trait: SuccessorTrait): void {
    if (!chooseSuccessor(this.run, trait)) return;
    this.audio.play('ui');
    this.callbacks?.onHud(this.snapshot());
  }

  useAbility(slot: ClassAbilitySlot): void {
    this.combat.useAbility(slot, this.controls.aimPoint(this.player, this.facing));
  }

  private finish(phase: 'dead'): void {
    this.run.legacy.outcome = phase;
    if (!this.developerRun) {
      this.best = Math.max(this.best, Math.floor(this.run.elapsed));
      void this.platform.saveBest(this.best).catch(() => this.callbacks?.onSaveError());
    }
    this.setPhase(phase);
    this.audio.play('loss');
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
    if (phase === 'character' || (import.meta.env.DEV && ['developer', 'console'].includes(phase)))
      this.input.keyboard!.disableGlobalCapture();
    else this.input.keyboard!.enableGlobalCapture();
    this.publishPhase();
    if (wasPlaying && phase === 'paused' && !this.persistence.busy) void this.saveExpedition();
  }

  private snapshot(): HudSnapshot {
    return this.hudPresenter.snapshot({
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
      abilities: this.combat.abilityStates(),
      spiritCaller: this.combat.spiritStatus(),
      attackCharge: this.combat.chargeStatus(),
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
    this.campPresenter.update(dt);
    this.riderHost.update(dt);
    this.landscape.update(this.run.elapsed);
    this.hazardSystem.update(dt);
  }

  private arrive(): void {
    this.persistence.saveCamp();
    // Each migration leads to a new handcrafted arena; structures travel with the clan.
    this.campPresenter.relocate();
    this.landscape.setLocation(currentLocation(this.run));
    this.applyLandscapeBounds();
    this.relocateToLandscapeCamp();
    const camp = this.landscape.campPosition;
    for (const group of [this.enemies, this.projectiles, this.hostileShots])
      for (const actor of group.getChildren() as Enemy[]) actor.disableBody(true, true);
    // Carry all uncollected experience to the next camp rather than discarding it.
    for (const gem of this.gems.getChildren() as Gem[])
      if (gem.active) gem.setPosition(camp.x, camp.y + 100);
    this.hazardSystem.clear();
    this.areaCombat.reset();
    this.reconcileTerrain();
    this.campPresenter.refresh();
    this.campBarrier.relocate(this.run, this.camp);
    this.cameras.main.flash(500, 225, 215, 180);
    this.publishPhase();
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
  get areaEncounter(): AreaCombat['areaEncounter'] {
    return this.areaCombat.areaEncounter;
  }
  get areaThreats(): AreaCombat['areaThreats'] {
    return this.areaCombat.areaThreats;
  }
  get areaEffects(): Phaser.GameObjects.Graphics {
    return this.areaCombat.areaEffects;
  }
  updateAreaCombat(dt: number): void {
    this.areaCombat.update(dt);
  }
  get hazards(): Hazard[] {
    return this.hazardSystem.hazards;
  }
  set hazards(value: Hazard[]) {
    this.hazardSystem.hazards = value;
  }
  updateHazards(dt: number): void {
    this.hazardSystem.update(dt);
  }
  updateSupport(dt: number): void {
    this.campDefences.update(dt);
  }
  get fieldMarkers(): FieldMarkers {
    return this.fieldObjectives.fieldMarkers;
  }
  updateFieldObjectives(dt: number): void {
    this.fieldObjectives.update(dt);
  }
  get defeats(): DefeatSprites {
    return this.animator.defeats;
  }
  updateCharacterAnimations(dt: number): void {
    this.animator.update(dt);
  }
  burst(x: number, y: number, color: number, count: number): void {
    this.effects.burst(x, y, color, count);
  }
  damageClan(amount: number, cause: ClanDamageCause = 'attack', source?: string): void {
    this.clanDamage.damage(amount, cause, source);
  }
  shootVolley(...args: Parameters<CombatSystem['shootVolley']>): boolean {
    return this.combat.shootVolley(...args);
  }
  fire(): void {
    this.combat.fire();
  }
  fireHostile(enemy: HostileShooter, angle: number): Projectile | undefined {
    return this.combat.fireHostile(enemy, angle);
  }
  updateProjectiles(dt: number): void {
    this.combat.updateProjectiles(dt);
  }
  hitEnemy(bolt: Projectile, enemy: Enemy): void {
    this.combat.hitEnemy(bolt, enemy);
  }
  damageEnemy(enemy: Enemy, amount: number): number {
    return this.combat.damageEnemy(enemy, amount);
  }
  collectGems(dt: number): void {
    this.combat.collectGems(dt);
  }
  get playerMotion(): CharacterMotion {
    return this.khan.playerMotion;
  }
  get shadow(): Phaser.GameObjects.Image {
    return this.khan.shadow;
  }
  takeDamage(amount: number): void {
    this.khan.takeDamage(amount);
  }
  hurtPlayer(enemy: Enemy): void {
    this.khan.hurtPlayer(enemy);
  }
  hideFallenKhan(): void {
    this.khan.hideFallenKhan();
  }
  updateEnemies(dt: number): void {
    this.enemyBehaviour.update(dt);
  }
  get riders(): Phaser.GameObjects.Image[] {
    return this.riderHost.riders;
  }
  fireRiders(): void {
    this.riderHost.fire();
  }
  spawnEnemy(forced?: EnemyDefinition, directive?: SpawnDirective): boolean {
    return this.enemyDirector.spawn(forced, directive);
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
}
