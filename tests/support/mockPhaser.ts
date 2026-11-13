/**
 * Node/Vitest test double for Phaser classes and math methods.
 * Used by unit tests of scene systems that depend on Phaser Physics / Arcade types.
 */
export function mockPhaser() {
  class MockArcadeBody {
    radius = 0;
    velocity = { x: 0, y: 0, lengthSq: () => this.velocity.x ** 2 + this.velocity.y ** 2 };
    reset(_x = 0, _y = 0) {}
    updateFromGameObject() {}
  }

  class MockGameObject {
    x = 0;
    y = 0;
    active = true;
    visible = true;
    width = 16;
    height = 16;
    scaleX = 1;
    scaleY = 1;
    rotation = 0;
    alpha = 1;
    depth = 0;
    tintTopLeft = 0xffffff;
    flipX = false;
    texture = { key: '' };
    body = new MockArcadeBody();
    private data = new Map<string, any>();

    enableBody(_reset?: boolean, x = 0, y = 0, _enable?: boolean, _show?: boolean) {
      this.active = true;
      this.visible = true;
      this.x = x;
      this.y = y;
      return this;
    }
    disableBody(_disable?: boolean, _hide?: boolean) {
      this.active = false;
      this.visible = false;
      return this;
    }
    setPosition(x: number, y: number) {
      this.x = x;
      this.y = y;
      return this;
    }
    setVelocity(vx: number, vy: number) {
      this.body.velocity.x = vx;
      this.body.velocity.y = vy;
      return this;
    }
    setAngle(_deg: number) {
      return this;
    }
    setAlpha(a: number) {
      this.alpha = a;
      return this;
    }
    setDepth(d: number) {
      this.depth = d;
      return this;
    }
    setTint(t: number) {
      this.tintTopLeft = t;
      return this;
    }
    clearTint() {
      this.tintTopLeft = 0xffffff;
      return this;
    }
    setFlipX(f: boolean) {
      this.flipX = f;
      return this;
    }
    setTexture(t: string) {
      this.texture.key = t;
      return this;
    }
    setScale(s: number) {
      this.scaleX = s;
      this.scaleY = s;
      return this;
    }
    setRotation(r: number) {
      this.rotation = r;
      return this;
    }
    setCircle(radius: number, _offsetX?: number, _offsetY?: number) {
      this.body.radius = radius;
      return this;
    }
    setOrigin(_x?: number, _y?: number) {
      return this;
    }
    setOffset(_x?: number, _y?: number) {
      return this;
    }
    setDisplaySize(_w: number, _h: number) {
      return this;
    }
    setVisible(v: boolean) {
      this.visible = v;
      return this;
    }
    setData(key: string, val: any) {
      this.data.set(key, val);
      return this;
    }
    getData(key: string) {
      return this.data.get(key);
    }
  }

  class MockVector2 {
    constructor(
      public x = 0,
      public y = 0,
    ) {}
  }

  return {
    default: {
      GameObjects: {
        Image: MockGameObject,
        Container: MockGameObject,
        Sprite: MockGameObject,
      },
      Physics: {
        Arcade: {
          Sprite: MockGameObject,
          Image: MockGameObject,
        },
      },
      Math: {
        Vector2: MockVector2,
        Distance: {
          Between: (x1: number, y1: number, x2: number, y2: number) => Math.hypot(x2 - x1, y2 - y1),
        },
        Linear: (p0: number, p1: number, t: number) => p0 + (p1 - p0) * t,
        FloatBetween: (min: number, max: number) => min + Math.random() * (max - min),
      },
    },
  };
}
