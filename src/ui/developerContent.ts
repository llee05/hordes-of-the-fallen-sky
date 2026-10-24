import { GAME } from '../game/config';
import { DEVELOPER_LEVELS } from '../game/dev/levels';
import { DEVELOPER_COMMAND_MAX_LENGTH, type DeveloperConsoleSnapshot } from '../game/dev/commands';

export function developerMenu(console?: DeveloperConsoleSnapshot): string {
  const focused = console?.focusInput ?? false;
  return `<section class="game-panel developer-panel ${focused ? 'developer-console-panel' : ''}">
    <header class="panel-heading"><div><p class="eyebrow">${focused ? 'COMMAND CONSOLE · F10' : 'LEVEL SELECTOR · F8'}</p><h2 id="overlay-title">Developer mode</h2></div><button class="panel-close" data-action="back" aria-label="Close developer mode">×</button></header>
    <div class="panel-body">
      ${focused ? '' : `<p class="panel-intro">Jump straight into any chapter, crossing or named camp. Each choice replaces the current expedition with a fresh developer run.</p><p class="developer-kit">${GAME.developer.population} people · ${GAME.developer.knowledgePoints} knowledge points · stocked supplies · camp scenes off.<br>Developer runs do not change your longest journey.</p>`}
      <section class="developer-console" aria-label="Developer command console">
        <div class="developer-console-heading"><h3>Command console <kbd>F10</kbd></h3><button type="button" class="secondary-button" data-action="developer-invincible" aria-pressed="${console?.invincible ?? false}" ${console?.canCheat ? '' : 'disabled'}>Khan invincibility: ${console?.invincible ? 'On' : 'Off'}</button></div>
        <p class="developer-console-hint">Type <code>help</code> for commands. <code>invincible on</code> protects the Khan; clan survival continues normally. ↑ / ↓ recalls commands.</p>
        <div class="developer-log" data-developer-output role="log" aria-label="Developer command output" aria-live="polite" aria-relevant="additions"></div>
        <form class="developer-command-form" data-developer-command-form>
          <label for="developer-command">Command</label><div class="developer-command-row"><input id="developer-command" data-developer-command-input type="text" maxlength="${DEVELOPER_COMMAND_MAX_LENGTH}" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="invincible on" aria-describedby="developer-command-note"><button class="primary-button" type="submit">Run command</button></div>
          <small id="developer-command-note">Enter runs a command. Escape / F10 returns to the previous screen. Cheats reset on a normal new run.</small>
        </form>
      </section>
      ${
        focused
          ? ''
          : (
              [
                ['chapters', 'Chapters & final stand'],
                ['crossings', 'Crossings · every approach'],
                ['destinations', 'Named camps · chapters 2 & 3'],
              ] as const
            )
              .map(
                ([group, title]) =>
                  `<section class="developer-group" aria-label="${title}"><h3>${title}</h3><div class="developer-levels">${DEVELOPER_LEVELS.filter(
                    (level) => level.group === group,
                  )
                    .map(
                      (level) =>
                        `<button class="developer-level" data-developer-level="${level.id}"><strong>${level.title}</strong><span>${level.description}</span></button>`,
                    )
                    .join('')}</div></section>`,
              )
              .join('')
      }
    </div>
    <footer class="panel-footer"><span class="paused-note">EXPEDITION PAUSED</span><button class="secondary-button" data-action="back" data-primary>Back <kbd>${focused ? 'ESC / F10' : 'ESC / F8'}</kbd></button></footer>
  </section>`;
}
