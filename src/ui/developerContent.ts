import { GAME } from '../game/config';
import { DEVELOPER_LEVELS } from '../game/dev/levels';

export function developerMenu(): string {
  return `<section class="game-panel developer-panel">
    <header class="panel-heading"><div><p class="eyebrow">LEVEL SELECTOR · F8</p><h2 id="overlay-title">Developer mode</h2></div><button class="panel-close" data-action="back" aria-label="Close developer mode">×</button></header>
    <div class="panel-body">
      <p class="panel-intro">Jump straight into any chapter, crossing or named camp. Each choice replaces the current expedition with a fresh developer run.</p>
      <p class="developer-kit">${GAME.developer.population} people · ${GAME.developer.knowledgePoints} knowledge points · stocked supplies · camp scenes off.<br>Developer runs do not change your longest journey.</p>
      ${(
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
        .join('')}
    </div>
    <footer class="panel-footer"><span class="paused-note">EXPEDITION PAUSED</span><button class="secondary-button" data-action="back" data-primary>Back <kbd>ESC / F8</kbd></button></footer>
  </section>`;
}
