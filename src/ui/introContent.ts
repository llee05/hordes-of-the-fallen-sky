import { INTRO_SLIDES, introImageUrl, type IntroSceneId } from '../game/data/intro';

const DUST_SPECS: readonly (readonly [number, number, number, number, number])[] = [
  [12, 68, 3, 18, -2],
  [24, 52, 2, 22, -9],
  [37, 74, 4, 16, -5],
  [48, 61, 2.5, 20, -14],
  [61, 46, 3, 19, -7],
  [73, 66, 2, 24, -11],
  [84, 55, 3.5, 17, -4],
  [91, 72, 2.5, 21, -15],
];

const EMBER_SPECS: readonly (readonly [number, number, number, number, number])[] = [
  [46, 67, 3.5, 7.5, -1.2],
  [49, 70, 2.5, 6.2, -3.4],
  [51, 66, 4, 8.4, -5.1],
  [53, 69, 3, 6.8, -2.3],
  [48, 72, 2, 7.9, -4.6],
  [54, 68, 3.5, 9.1, -6.2],
  [44, 69, 2.5, 8.2, -0.8],
  [56, 71, 3, 7.1, -3.9],
];

function sceneLayers(id: IntroSceneId, imageUrl: string): string {
  const dust = DUST_SPECS.map(
    ([x, y, size, duration, delay]) =>
      `<i class="intro-mote" style="--x:${x}%;--y:${y}%;--size:${size}px;--dur:${duration}s;--delay:${delay}s"></i>`,
  ).join('');
  const embers = EMBER_SPECS.map(
    ([x, y, size, duration, delay]) =>
      `<i class="intro-ember" style="--x:${x}%;--y:${y}%;--size:${size}px;--dur:${duration}s;--delay:${delay}s"></i>`,
  ).join('');

  if (id === 'steppe') {
    return `<div class="intro-layer intro-layer-mid" style="--layer-image:url('${imageUrl}')"></div>
      <div class="intro-layer intro-layer-fore" style="--layer-image:url('${imageUrl}')"></div>
      <div class="intro-atmosphere intro-atmo-steppe">
        <span class="intro-sun-wash"></span>
        <span class="intro-smoke-plume"><i></i><i></i><i></i></span>
        <svg class="intro-cloth-overlay intro-steppe-ribbons" viewBox="0 0 1536 1024" preserveAspectRatio="xMidYMid slice">
          <path class="intro-ribbon-path ribbon-teal" d="M312 132 C398 158, 492 172, 588 214 C618 228, 636 226, 658 236 C618 238, 566 226, 514 202 C440 168, 368 156, 312 142 Z" />
          <path class="intro-ribbon-path ribbon-rust" d="M310 148 C388 184, 464 214, 548 258 C568 268, 580 272, 594 282 C556 276, 514 256, 468 230 C406 196, 352 174, 310 158 Z" />
        </svg>
        <div class="intro-motes">${dust}</div>
      </div>`;
  }

  if (id === 'iron-vow') {
    return `<div class="intro-layer intro-layer-mid" style="--layer-image:url('${imageUrl}')"></div>
      <div class="intro-layer intro-layer-fore" style="--layer-image:url('${imageUrl}')"></div>
      <div class="intro-atmosphere intro-atmo-vow">
        <span class="intro-rift-pulse"></span>
        <span class="intro-brazier-glow brazier-left"></span>
        <span class="intro-brazier-glow brazier-right"></span>
        <div class="intro-embers">${embers}</div>
        <div class="intro-motes">${dust}</div>
      </div>`;
  }

  if (id === 'fallen-sky') {
    return `<div class="intro-layer intro-layer-mid" style="--layer-image:url('${imageUrl}')"></div>
      <div class="intro-layer intro-layer-fore" style="--layer-image:url('${imageUrl}')"></div>
      <div class="intro-atmosphere intro-atmo-storm">
        <span class="intro-vortex-gleam"></span>
        <span class="intro-frost-mist"></span>
        <svg class="intro-cloth-overlay intro-fallen-banner" viewBox="0 0 1536 1024" preserveAspectRatio="xMidYMid slice">
          <path class="intro-ribbon-path ribbon-tattered" d="M668 594 C716 614, 764 646, 826 672 C784 676, 738 660, 694 642 C726 670, 762 694, 804 714 C752 706, 704 682, 650 656 Z" />
        </svg>
        <div class="intro-motes intro-ash-motes">${dust}</div>
      </div>`;
  }

  if (id === 'hearth') {
    return `<div class="intro-layer intro-layer-mid" style="--layer-image:url('${imageUrl}')"></div>
      <div class="intro-layer intro-layer-fore" style="--layer-image:url('${imageUrl}')"></div>
      <div class="intro-atmosphere intro-atmo-hearth">
        <span class="intro-hearth-glow"></span>
        <span class="intro-distant-rift"></span>
        <svg class="intro-cloth-overlay intro-hearth-banner" viewBox="0 0 1536 1024" preserveAspectRatio="xMidYMid slice">
          <path class="intro-ribbon-path ribbon-blue" d="M380 120 C454 148, 520 206, 616 244 C568 258, 504 244, 444 218 C394 196, 386 164, 380 120 Z" />
        </svg>
        <div class="intro-embers intro-hearth-embers">${embers}</div>
        <div class="intro-motes">${dust}</div>
      </div>`;
  }

  return `<div class="intro-layer intro-layer-mid" style="--layer-image:url('${imageUrl}')"></div>
    <div class="intro-layer intro-layer-fore" style="--layer-image:url('${imageUrl}')"></div>
    <div class="intro-atmosphere intro-atmo-caravan">
      <span class="intro-dawn-rays"></span>
      <span class="intro-storm-lightning"></span>
      <svg class="intro-cloth-overlay intro-caravan-banner" viewBox="0 0 1536 1024" preserveAspectRatio="xMidYMid slice">
        <path class="intro-ribbon-path ribbon-blue" d="M930 452 C882 454, 838 478, 774 494 C824 504, 874 492, 926 480 Z" />
      </svg>
      <div class="intro-motes">${dust}</div>
    </div>`;
}

export function introMenu(index: number): string {
  const slide = INTRO_SLIDES[index]!;
  const last = index === INTRO_SLIDES.length - 1;
  const imageUrl = introImageUrl(slide.image);
  return `<section class="intro-story" data-scene="${slide.id}" data-camera="${slide.camera}" style="--intro-focal:${slide.focalPoint}" aria-label="Opening story">
    <div class="intro-art" aria-hidden="true">
      <div class="intro-stage">
        <img class="intro-painting" src="${imageUrl}" alt="" width="1536" height="1024" decoding="async" />
        ${sceneLayers(slide.id, imageUrl)}
      </div>
      <div class="intro-vignette"></div>
    </div>
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
