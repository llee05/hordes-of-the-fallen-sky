import type { Guidance } from '../game/state/guidance';

export function guidanceContent(guide: Guidance): string {
  const open = guide.id.startsWith('prologue:') ? ' open' : '';
  return `<p class="eyebrow">${guide.eyebrow ?? 'FIELD NOTE'}</p><details class="guide-details"${open}><summary>${guide.title}</summary><p class="guide-copy">${guide.text}</p></details><div class="guide-actions">${guide.action ? `<button data-guide-action="${guide.action}">${guide.label}</button>` : ''}<button data-guide-action="hide" aria-label="Hide guidance">Hide tips</button></div>`;
}
