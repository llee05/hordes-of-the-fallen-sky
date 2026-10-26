import { chromium, type FullConfig } from '@playwright/test';
import { verifyHardwareWebGL } from './graphics';

export default async function checkGraphics(config: FullConfig): Promise<void> {
  const { headless, launchOptions } = config.projects[0]!.use;
  const browser = await chromium.launch({ ...launchOptions, headless });
  try {
    const page = await browser.newPage();
    await verifyHardwareWebGL(page);
  } finally {
    await browser.close();
  }
}
