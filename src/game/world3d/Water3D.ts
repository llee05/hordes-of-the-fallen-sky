import * as THREE from 'three';
import type { MountainHeightfield } from './MountainHeightfield';
import { waterGeometry } from './waterGeometry';
import type { WorldRiver } from './WorldRiver';

/** Dusty-blue manuscript channels, wave-scroll linework, and timber plank crossings. */
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
        value: new THREE.Color(river.definition.color).multiplyScalar(0.84),
      };
      shader.uniforms.shallowWater = { value: new THREE.Color(0x8ba3b0) };
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
        vec3 inkColor=vec3(0.263,0.220,0.173); // #43382C dark manuscript ink
        vec3 parchmentLight=vec3(0.910,0.851,0.725); // #E8D9B9 light parchment
        vec3 ochreBank=vec3(0.851,0.784,0.647); // #D9C8A5 aged parchment shore
        float deep=smoothstep(0.35,7.0,waterDepth);
        vec3 bed=texture2D(bedTexture,riverWorld/170.0).rgb*vec3(0.86,0.84,0.74);
        vec3 water=mix(mix(bed,shallowWater,0.74),deepWater,deep*0.86);
        float time=flowTime*motionAmount*(frozen==1?0.0:1.0);
        // Manuscript flowing current lines & wave scroll curls
        float waveA=sin(riverUv.y*0.65-time*0.7+sin(riverUv.x*11.0+riverUv.y*0.18));
        float parchmentCrest=smoothstep(0.74,0.95,waveA)*0.24;
        float inkCurrent=smoothstep(0.84,0.98,-waveA)*0.24*smoothstep(0.6,3.5,waterDepth);
        float shoreEdge=1.0-smoothstep(0.0,2.1,waterDepth);
        float shoreInk=smoothstep(0.15,0.55,waterDepth)*(1.0-smoothstep(0.55,1.35,waterDepth));
        float broken=0.45+0.55*smoothstep(0.1,0.85,sin(riverUv.y*0.42+sin(riverUv.y*0.13)));
        water=mix(water,ochreBank,shoreEdge*broken*0.36);
        water=mix(water,parchmentLight,parchmentCrest);
        water=mix(water,inkColor,clamp(inkCurrent+shoreInk*0.42*broken,0.0,0.55));
        if(frozen==1)water=mix(water,vec3(0.76,0.82,0.82),0.58);
        diffuseColor.rgb*=water;
        diffuseColor.a*=smoothstep(0.0,0.65,waterDepth);
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
      const yaw = Math.atan2(bridge.nx, bridge.nz);
      const tx = bridge.nz;
      const tz = -bridge.nx;
      for (let i = 0; i < planks; i++) {
        const distance = ((i + 0.5) / planks) * bridge.length - bridge.length / 2;
        const bx = bridge.x + bridge.nx * distance;
        const bz = bridge.z + bridge.nz * distance;
        dummy.position.set(bx, bridge.height - 2, bz);
        dummy.rotation.set(0, yaw, 0);
        dummy.scale.set(bridge.width, 4, bridge.length / planks - 0.6);
        dummy.updateMatrix();
        matrices.push(dummy.matrix.clone());
        colors.push(new THREE.Color(i % 3 === 0 ? 0xad824d : i % 3 === 1 ? 0xc29e6d : 0x98614d));
      }
      // Illustrated timber side-stringers and posts along both edges of the bridge
      for (const side of [-1, 1]) {
        const edgeOffset = side * (bridge.width * 0.46);
        dummy.position.set(
          bridge.x + tx * edgeOffset,
          bridge.height + 1.2,
          bridge.z + tz * edgeOffset,
        );
        dummy.rotation.set(0, yaw, 0);
        dummy.scale.set(3.2, 2.6, bridge.length + 4);
        dummy.updateMatrix();
        matrices.push(dummy.matrix.clone());
        colors.push(new THREE.Color(0x43382c));

        const postCount = 4;
        for (let p = 0; p < postCount; p++) {
          const postDist = (p / (postCount - 1) - 0.5) * (bridge.length - 8);
          dummy.position.set(
            bridge.x + bridge.nx * postDist + tx * edgeOffset,
            bridge.height + 4.5,
            bridge.z + bridge.nz * postDist + tz * edgeOffset,
          );
          dummy.rotation.set(0, yaw, 0);
          dummy.scale.set(4.2, 9.5, 4.2);
          dummy.updateMatrix();
          matrices.push(dummy.matrix.clone());
          colors.push(new THREE.Color(p === 0 || p === postCount - 1 ? 0x98614d : 0x5c4d3c));
        }
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
