/** Phaser can replay its native event queue before the next render frame. */
export class ActionKeys {
  private readonly handled = new WeakSet<object>();

  consume(event: Pick<KeyboardEvent, 'repeat'>): boolean {
    if (event.repeat || this.handled.has(event)) return false;
    this.handled.add(event);
    return true;
  }
}
