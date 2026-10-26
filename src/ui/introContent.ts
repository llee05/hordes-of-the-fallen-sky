import { INTRO_SLIDES, introImageUrl } from '../game/data/intro';

export function introMenu(index: number): string {
  const slide = INTRO_SLIDES[index]!;
  const last = index === INTRO_SLIDES.length - 1;
  return `<section class="intro-story" aria-label="Opening story">
    <div class="intro-art" aria-hidden="true"><img class="intro-painting" src="${introImageUrl(slide.image)}" alt="" width="1536" height="1024" decoding="async" /></div>
    <header class="intro-header"><span>HORDES OF THE FALLEN SKY <span class="intro-prologue">/ PROLOGUE</span></span><button class="intro-skip" data-action="intro-skip">Skip intro <kbd>ESC / B</kbd></button></header>
    <article class="intro-caption"><p class="eyebrow">${slide.chapter}</p><h1 id="overlay-title">${slide.title}</h1><p id="intro-caption">${slide.text}</p></article>
    <footer class="intro-footer">
      <button class="intro-back" data-action="intro-back" ${index === 0 ? 'disabled' : ''}>← Back</button>
      <div class="intro-pages" aria-label="Chapter ${index + 1} of ${INTRO_SLIDES.length}">${INTRO_SLIDES.map((_, i) => `<span class="intro-page${i === index ? ' current' : ''}" aria-hidden="true"></span>`).join('')}<span class="intro-count">${String(index + 1).padStart(2, '0')} / ${String(INTRO_SLIDES.length).padStart(2, '0')}</span></div>
      <button class="intro-next" data-action="intro-next" data-primary>${last ? 'Raise the blue banner' : 'Continue'} <span aria-hidden="true">→</span></button>
    </footer>
    <p class="intro-hint">Take your time · Enter / A to continue · ← → to turn the page</p>
  </section>`;
}
