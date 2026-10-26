import type { Page } from '@playwright/test';

/** Refuse silent CPU fallback before spending a local run on slow game rendering. */
export async function verifyHardwareWebGL(page: Page): Promise<void> {
  const renderers = await page.evaluate(() =>
    (['webgl', 'webgl2'] as const).map((kind) => {
      const canvas = document.createElement('canvas');
      const gl = kind === 'webgl2' ? canvas.getContext('webgl2') : canvas.getContext('webgl');
      if (!gl) return { kind, renderer: 'unavailable' };
      const debug = gl.getExtension('WEBGL_debug_renderer_info');
      const renderer: string = debug
        ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL)
        : 'unavailable';
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return { kind, renderer };
    }),
  );
  for (const { kind, renderer } of renderers) {
    console.log(`[${kind}] ${renderer}`);
    if (/unavailable|swiftshader|llvmpipe|softpipe|software/i.test(renderer))
      throw new Error(
        `${kind} needs hardware rendering for local tests; got ${renderer}. ` +
          'Check the display/GPU setup, or explicitly use E2E_HEADLESS=1 for software rendering.',
      );
  }
}
