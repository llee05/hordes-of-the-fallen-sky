import '@fontsource/dm-sans/latin-400.css';
import '@fontsource/dm-sans/latin-500.css';
import '@fontsource/dm-sans/latin-600.css';
import '@fontsource/ibm-plex-mono/latin-400.css';
import './style.css';
import './tapestry.css';
import './motion.css';
import { createGame } from './game/createGame';
import { ArenaScene } from './game/scenes/ArenaScene';
import { GameUI } from './ui/GameUI';
import { GamePlatform } from './platform/GamePlatform';

async function bootstrap(): Promise<void> {
  const platform = await GamePlatform.create();
  const scene = new ArenaScene(platform);
  const ui = new GameUI(document.querySelector<HTMLElement>('#app')!, scene, platform);
  const game = createGame(ui.canvasParent, scene);

  // Local inspection and browser tests; this reference is removed from production.
  if (import.meta.env.DEV) Object.assign(window, { __gloam: { game, scene } });
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
