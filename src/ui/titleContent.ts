import type { SaveSlot } from '../shared/expeditionSave';
import { clanMark, type ClanMark } from './artwork';

export interface TitleMenuOptions {
  latestSaveSlot?: SaveSlot;
  hasCamp: boolean;
  developer: boolean;
  desktop: boolean;
}

function titleButton(
  action: string,
  label: string,
  icon: ClanMark,
  options: { className?: string; attributes?: string; shortcut?: string } = {},
): string {
  const className = options.className ? ` ${options.className}` : '';
  const attributes = options.attributes ? ` ${options.attributes}` : '';
  const shortcut = options.shortcut ? `<kbd>${options.shortcut}</kbd>` : '';
  return `<button class="menu-button menu-plaque title-menu-button${className}" data-action="${action}"${attributes}><span class="title-menu-icon" data-icon="${icon}">${clanMark(icon)}</span><span class="title-menu-label">${label}</span>${shortcut}</button>`;
}

/** Title-only navigation. Pause and results menus keep their own longer labels and entries. */
export function titleMenuContent(options: TitleMenuOptions): string {
  const background = `${import.meta.env.BASE_URL}art/title-main-menu.png`;
  const continueButton = options.latestSaveSlot
    ? titleButton('continue-expedition', 'CONTINUE', 'banner', {
        attributes: `data-slot="${options.latestSaveSlot}" data-primary`,
      })
    : '';
  const newGame = titleButton('begin', 'NEW GAME', 'bow', {
    className: 'title-menu-new',
    attributes: options.latestSaveSlot ? undefined : 'data-primary',
  });
  const continueCamp = options.hasCamp
    ? titleButton('continue-camp', 'Continue clan camp', 'ger', {
        attributes:
          'title="Take your saved camp and stores into a new expedition. Battle starts over."',
      })
    : '';
  const load = titleButton('saves', 'Load', 'journal');
  const settings = titleButton('settings', 'Settings', 'knot');
  const developer = options.developer
    ? titleButton('developer', 'Developer mode', 'hammer', { shortcut: 'F8' })
    : '';
  const quit = options.desktop ? titleButton('quit', 'Quit', 'road') : '';

  return `<div class="title-background" style="--title-background:url('${background}')" aria-hidden="true"></div><section class="title-menu"><header class="title-cartouche"><div class="title-emblem"><span class="clan-seal">${clanMark('spirit')}</span></div><div><p class="eyebrow">WHEN HEAVEN WENT SILENT</p><h1 id="overlay-title"><span class="title-prefix">Hordes of the</span> <em>Fallen Sky</em></h1></div></header><nav class="main-menu" aria-label="Main menu">${continueButton}${newGame}${continueCamp}${load}${settings}${developer}${quit}</nav><p class="title-caption">One people to carry through.</p></section>`;
}
