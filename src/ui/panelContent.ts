import { clanMark, type ClanMark } from './artwork';

export function heading(
  eyebrow: string,
  title: string,
  close = true,
  mark: ClanMark = 'journal',
): string {
  return `<header class="panel-heading"><div class="panel-title"><span class="panel-emblem">${clanMark(mark)}</span><div><p class="eyebrow">${eyebrow}</p><h2 id="overlay-title">${title}</h2></div></div>${close ? '<button class="panel-close" data-action="back" aria-label="Close panel" title="Close (Escape)">×</button>' : ''}</header>`;
}

export function footer(label = 'Return to the steppe'): string {
  return `<footer class="panel-footer"><span class="paused-note">Ⅱ &nbsp; THE WORLD IS PAUSED</span><button class="secondary-button" data-action="back">${label} <kbd>ESC</kbd></button></footer>`;
}
