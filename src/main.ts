import '@fontsource/dm-sans/latin-400.css';
import '@fontsource/dm-sans/latin-500.css';
import '@fontsource/dm-sans/latin-600.css';
import '@fontsource/ibm-plex-mono/latin-400.css';
import './camp.css';
import './character-creator.css';
import './combat-readability.css';
import { createGame } from './game/createGame';
import { ArenaScene } from './game/scenes/ArenaScene';
import './migration.css';
import './motion.css';
import { GamePlatform } from './platform/GamePlatform';
import './progression.css';
import './saves.css';
import './style.css';
import './tapestry.css';
import './traditions.css';
import { GameUI } from './ui/GameUI';
if (import.meta.env.DEV) void import('./developer.css');

async function bootstrap(): Promise<void> {
  // Resolve development instrumentation before creating interactive controls.
  const testHooksModule = import.meta.env.DEV
    ? await import('./game/scenes/arena/testHooks')
    : undefined;
  const platform = await GamePlatform.create();
  const scene = new ArenaScene(platform);
  const ui = new GameUI(document.querySelector<HTMLElement>('#app')!, scene, platform);
  const game = createGame(ui.canvasParent, scene);
  const stopCloseListener = platform.desktop?.onCloseRequested(() => {
    void scene.prepareToClose().then((saved) => platform.desktop?.completeClose(saved));
  });
  game.events.once('destroy', () => ui.destroy());
  game.events.once('destroy', () => stopCloseListener?.());

  // Local inspection and browser tests; this reference is removed from production.
  if (import.meta.env.DEV && testHooksModule) {
    const hooks = testHooksModule.createTestHooks(scene);
    Object.assign(window, { __gloam: { game, scene, hooks } });
  }
  if (import.meta.hot) import.meta.hot.dispose(() => game.destroy(true));
}

void bootstrap().catch((error: unknown) => {
  console.error('Unable to start Hordes of the Fallen Sky', error);
  const message = document.createElement('p');
  message.className = 'startup-error';
  message.textContent =
    'Hordes of the Fallen Sky could not load your profile. Check that the save folder is accessible, then restart the game.';
  document.querySelector('#app')!.replaceChildren(message);
});
