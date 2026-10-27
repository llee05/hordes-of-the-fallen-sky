/**
 * Phaser Graphics command-buffer opcodes that only change drawing state, mapped
 * to how many value arguments each pushes. Verified against Phaser's
 * gameobjects/graphics/Commands.js and Graphics.js, which seeds every new
 * Graphics with lineStyle(1,0,0) followed by fillStyle(0,0).
 */
const STYLE_COMMAND_ARGS: Record<number, number> = {
  6: 3, // LINE_STYLE: lineWidth, color, alpha
  7: 2, // FILL_STYLE: color, alpha
};

/**
 * True when a Graphics command buffer paints nothing. Phaser seeds every new
 * Graphics with two style commands, so a layer that was never drawn into still
 * carries a non-empty buffer; such a layer must not cost a canvas or texture.
 */
export function drawsNothing(commandBuffer: readonly unknown[]): boolean {
  for (let i = 0; i < commandBuffer.length;) {
    const args = STYLE_COMMAND_ARGS[commandBuffer[i] as number];
    if (args === undefined) return false;
    i += args + 1;
  }
  return true;
}
