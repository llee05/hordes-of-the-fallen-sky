import * as THREE from 'three';
import type { MountainHeightfield } from './MountainHeightfield';
import { waterGeometry } from './waterGeometry';
import type { WorldRiver } from './WorldRiver';

/** Turquoise channels and timber crossings occupy the same elevated world as the terrain. */
export class Water3D {
  readonly group = new THREE.Group();
  readonly time = { value: 0 };
  readonly motion = { value: 1 };
  constructor(
    readonly river: WorldRiver,
    terrain: MountainHeightfield,
    bedTexture: THREE.Texture,
  ) {
    this.group.name = 'world-river';
    const data = waterGeometry(river, terrain);
    const geometry = new THREE.BufferGeometry()
      .setAttribute('position', new THREE.Float32BufferAttribute(data.positions, 3))
      .setAttribute('uv', new THREE.Float32BufferAttribute(data.uv, 2))
      .setAttribute('riverDepth', new THREE.Float32BufferAttribute(data.depth, 1));
    geometry.computeVertexNormals();
    const frozen = river.definition.kind === 'frozen';
    const material = new THREE.MeshLambertMaterial({
      color: 0xffffff,
      side: THREE.DoubleSide,
      transparent: true,
      depthWrite: false,
    });
    material.onBeforeCompile = (shader) => {
      shader.uniforms.flowTime = this.time;
      shader.uniforms.motionAmount = this.motion;
      shader.uniforms.frozen = { value: frozen ? 1 : 0 };
      shader.uniforms.bedTexture = { value: bedTexture };
      shader.uniforms.deepWater = {
        value: new THREE.Color(river.definition.color).multiplyScalar(0.65),
      };
      shader.uniforms.shallowWater = { value: new THREE.Color(0x8cae98) };
      shader.vertexShader =
        `attribute float riverDepth; varying float waterDepth; varying vec2 riverUv; varying vec2 riverWorld;\n${shader.vertexShader}`.replace(
          '#include <begin_vertex>',
          '#include <begin_vertex>\nwaterDepth=riverDepth;riverUv=uv;riverWorld=position.xz;',
        );
      shader.fragmentShader =
        `varying float waterDepth; varying vec2 riverUv; varying vec2 riverWorld;
        uniform float flowTime;uniform float motionAmount;uniform int frozen;
        uniform vec3 shallowWater;uniform vec3 deepWater;uniform sampler2D bedTexture;\n${shader.fragmentShader}`.replace(
          '#include <color_fragment>',
          `#include <color_fragment>
        float deep=smoothstep(0.4,8.0,waterDepth);
        vec3 bed=texture2D(bedTexture,riverWorld/170.0).rgb*vec3(0.72,0.83,0.75);
        vec3 water=mix(mix(bed,shallowWater,0.65),deepWater,deep*0.82);
        float time=flowTime*motionAmount*(frozen==1?0.0:1.0);
        float ripple=sin(riverUv.y*.7-time*.65+sin(riverUv.x*8.0+riverUv.y*.16));
        float stroke=pow(max(0.0,ripple),16.0)*.055;
        float edge=1.0-smoothstep(0.0,2.2,waterDepth);
        float broken=0.35+0.65*smoothstep(0.15,0.8,sin(riverUv.y*.4+sin(riverUv.y*.11)));
        water=mix(water,vec3(.59,.68,.56),edge*broken*.25)+stroke;
        if(frozen==1)water=mix(water,vec3(.54,.68,.7),.65);
        diffuseColor.rgb*=water;
        diffuseColor.a*=smoothstep(0.0,0.75,waterDepth);
      `,
        );
    };
    const mesh = new THREE.Mesh(geometry, material);
    mesh.receiveShadow = true;
    mesh.name = 'river-water';
    this.group.add(mesh);
    const matrices: THREE.Matrix4[] = [];
    const colors: THREE.Color[] = [];
    const dummy = new THREE.Object3D();
    for (const bridge of river.bridges) {
      const planks = Math.ceil(bridge.length / 10);
      for (let i = 0; i < planks; i++) {
        const distance = ((i + 0.5) / planks) * bridge.length - bridge.length / 2;
        dummy.position.set(
          bridge.x + bridge.nx * distance,
          bridge.height - 2,
          bridge.z + bridge.nz * distance,
        );
        dummy.rotation.set(0, Math.atan2(bridge.nx, bridge.nz), 0);
        dummy.scale.set(bridge.width, 4, bridge.length / planks - 0.5);
        dummy.updateMatrix();
        matrices.push(dummy.matrix.clone());
        colors.push(new THREE.Color(i % 3 ? 0xa1855b : 0xb69a6c));
      }
    }
    const deck = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshLambertMaterial({ color: 0xffffff }),
      matrices.length,
    );
    matrices.forEach((matrix, index) => {
      deck.setMatrixAt(index, matrix);
      deck.setColorAt(index, colors[index]!);
    });
    deck.castShadow = deck.receiveShadow = true;
    deck.name = 'river-crossings';
    this.group.add(deck);
  }
  update(elapsed: number, reducedMotion = false): void {
    this.time.value = reducedMotion ? 0 : elapsed;
    this.motion.value = reducedMotion ? 0 : 1;
  }
  destroy(): void {
    this.group.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
        if (object instanceof THREE.InstancedMesh) object.dispose();
        for (const material of Array.isArray(object.material) ? object.material : [object.material])
          material.dispose();
      }
    });
    this.group.removeFromParent();
  }
}
