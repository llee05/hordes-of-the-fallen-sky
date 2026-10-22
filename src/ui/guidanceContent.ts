import type { Guidance } from '../game/state/guidance';

export function guidanceContent(guide: Guidance): string {
  return `<p class="eyebrow">THE FIRST CROSSING</p><strong>${guide.title}</strong><p class="guide-copy">${guide.text}</p><div class="guide-actions">${guide.action ? `<button data-guide-action="${guide.action}">${guide.label}</button>` : ''}<button data-guide-action="hide" aria-label="Hide guidance">Hide tips</button></div>`;
}
