/**
 * Terrain fragment code. Generated places compile `TERRAIN_SAMPLING` and `TERRAIN_COLOR`, whose
 * text is unchanged since Orkhon Valley moved to its own program: its `authored` branch is inert
 * there (`authored` is 0). Orkhon compiles the self-contained `ORKHON_SAMPLING` and `ORKHON_COLOR`
 * instead (`terrainShaderSource`). Even removing dead code changes how the GPU compiler rounds a
 * few pixels, so edit the generated-place text only when meaning to change how those places look.
 */
/** World-space texture sampling; noise chooses material coverage, never substitutes painted color. */
export const TERRAIN_SAMPLING = `
  uniform sampler2D meadow; uniform sampler2D dryMeadow; uniform sampler2D soil;
  uniform sampler2D stone; uniform sampler2D snow; uniform sampler2D gravelMap;
  uniform sampler2D meadowAlt; uniform sampler2D patchMap;
  uniform int worldDebug; uniform int isWall; uniform int authored; uniform float tileSize;
  uniform float samplingDetail;
  uniform sampler2D cliffAtlas; uniform vec2 cliffAtlasSize; uniform vec4 cliffFaces[4];
  uniform float cliffFaceWidth; uniform float cliffPixel; uniform float cliffRise; uniform float cliffTop;
  uniform vec3 grassTint; uniform vec3 soilTint; uniform vec3 rockTint; uniform vec3 snowTint;
  varying float traversal; varying vec3 worldPoint; varying vec3 worldNormal;
  varying vec4 materialA; varying vec3 materialB; varying float occlusion;
  vec3 painted(sampler2D map, vec2 uv) {
    // Different rotations/scales prevent a repeating grid without swimming or per-frame noise.
    vec3 a=texture2D(map,uv).rgb;
    if(samplingDetail<0.5)return a;
    vec3 b=texture2D(map,vec2(-uv.y,uv.x)*0.79+vec2(0.37,0.61)).rgb;
    float blend=0.32+0.12*sin(uv.x*0.73+sin(uv.y*0.57));
    return mix(a,b,blend);
  }
  // Authored cliffs repeat opaque basalt bands cut from the terrain kit's straight cliff run along
  // their outline. Each repeat picks a band, never mirrored, so the painted light stays upper left;
  // the grass lip and inked column tops stay on top.
  vec3 cliffFace(float along, float depth) {
    float u=along/cliffPixel;
    float k=floor(u/cliffFaceWidth);
    float pick=fract(sin(k*12.9898+4.1)*43758.5453);
    vec4 face=cliffFaces[0];
    if(pick>0.75) face=cliffFaces[3]; else if(pick>0.5) face=cliffFaces[2]; else if(pick>0.25) face=cliffFaces[1];
    float x=u-k*cliffFaceWidth;
    float y=clamp(depth/cliffRise,0.0,1.0)*face.z;
    vec2 px=face.xy+vec2(clamp(x,0.5,cliffFaceWidth-0.5),clamp(y,0.5,face.z-0.5));
    return texture2D(cliffAtlas,vec2(px.x/cliffAtlasSize.x,1.0-px.y/cliffAtlasSize.y)).rgb;
  }
  // Authored locations sample supplied tiles exactly once at their painted scale. Materials meet
  // by height blending: each painting's own light and dark strokes decide where it shows through,
  // so edges follow tufts, stones and ruts instead of a soft cross-fade. Colours are untouched.
  float authoredHeight(vec3 c, float weight) {
    return weight + (dot(c, vec3(0.299, 0.587, 0.114)) - 0.45) * 0.7;
  }
  // Two grass paintings alternate in regions, meeting along their own strokes.
  vec3 grassRegions(vec3 calm, vec3 other, float swap) {
    float w=smoothstep(0.35,0.65,swap);
    return authoredHeight(other,w)>authoredHeight(calm,1.0-w)?other:calm;
  }
  vec3 authoredGround(vec2 p) {
    vec2 uv=p/tileSize;
    float swap=0.5+0.3*sin(p.x/290.0+sin(p.y/230.0)*1.7)+0.2*sin(p.y/410.0-p.x/630.0);
    vec3 c0=vec3(0.0),c1=c0,c2=c0,c3=c0,c4=c0,c5=c0,c6=c0;
    float h0=-9.0,h1=-9.0,h2=-9.0,h3=-9.0,h4=-9.0,h5=-9.0,h6=-9.0;
    // Valley: calm grass with regions of the olive variant, turned a quarter so the two tile grids
    // never line up.
    if(materialA.x>0.005) {
      c0=grassRegions(texture2D(meadow,uv).rgb,texture2D(meadowAlt,vec2(-uv.y,uv.x)).rgb,swap);
      if(materialA.x>0.995) return c0;
      h0=authoredHeight(c0,materialA.x);
    }
    // Plateau tops: the darker plateau moss in regions of two orientations.
    if(materialB.x>0.005) {
      c4=grassRegions(texture2D(snow,uv).rgb,texture2D(snow,vec2(uv.y,-uv.x)).rgb,0.8-swap);
      if(materialB.x>0.995) return c4;
      h4=authoredHeight(c4,materialB.x);
    }
    if(materialA.y>0.005) { c1=texture2D(soil,uv).rgb; h1=authoredHeight(c1,materialA.y); }
    if(materialA.z>0.005) { c2=texture2D(stone,uv).rgb; h2=authoredHeight(c2,materialA.z); }
    if(materialA.w>0.005) { c3=texture2D(dryMeadow,uv).rgb; h3=authoredHeight(c3,materialA.w); }
    if(materialB.y>0.005) { c5=texture2D(patchMap,uv).rgb; h5=authoredHeight(c5,materialB.y); }
    if(materialB.z>0.005) { c6=texture2D(gravelMap,uv).rgb; h6=authoredHeight(c6,materialB.z); }
    float top=max(max(max(h0,h1),max(h2,h3)),max(max(h4,h5),h6))-0.12;
    float w0=max(0.0,h0-top),w1=max(0.0,h1-top),w2=max(0.0,h2-top),w3=max(0.0,h3-top),
      w4=max(0.0,h4-top),w5=max(0.0,h5-top),w6=max(0.0,h6-top);
    return (c0*w0+c1*w1+c2*w2+c3*w3+c4*w4+c5*w5+c6*w6)/max(w0+w1+w2+w3+w4+w5+w6,0.0001);
  }
`;

export const TERRAIN_COLOR = `
  vec3 n=normalize(worldNormal);
  if(worldDebug<=1 && authored==1) {
    vec3 surface;
    if(isWall==0) {
      surface=authoredGround(worldPoint.xz);
      // Steep graded ground (ramp flanks) shows the same basalt bands as the plateau walls.
      if(n.y<0.75) {
        float along=mix(worldPoint.x,worldPoint.z,step(abs(n.z),abs(n.x)));
        surface=mix(surface,cliffFace(along,cliffTop-worldPoint.y),smoothstep(0.75,0.5,n.y));
      }
    } else if(materialB.z>0.5) surface=cliffFace(materialB.x,materialB.y);
    else {
      vec3 tri=pow(abs(n),vec3(5.0)); tri/=max(0.001,tri.x+tri.y+tri.z);
      surface=texture2D(stone,worldPoint.zy/tileSize).rgb*tri.x+texture2D(stone,worldPoint.xz/tileSize).rgb*tri.y+
        texture2D(stone,worldPoint.xy/tileSize).rgb*tri.z;
    }
    diffuseColor.rgb*=surface*occlusion;
  } else if(worldDebug<=1) {
  vec3 tri=pow(abs(n),vec3(5.0)); tri/=max(0.001,tri.x+tri.y+tri.z);
  vec3 grass=vec3(0.0), dryGrass=vec3(0.0), dirt=vec3(0.0), rock=vec3(0.0), gravel=vec3(0.0), white=vec3(0.0);
  if(isWall==0) {
    if(materialA.x>0.005) grass=painted(meadow,worldPoint.xz/390.0)*vec3(0.8,1.02,0.86)*grassTint;
    if(materialA.w>0.005) dryGrass=painted(dryMeadow,worldPoint.xz/470.0)*vec3(0.92,0.96,0.89)*grassTint;
    if(materialA.y>0.005) dirt=painted(soil,worldPoint.xz/420.0)*soilTint;
    if(materialB.z>0.005) gravel=painted(gravelMap,worldPoint.xz/170.0)*vec3(0.84,0.88,0.87)*soilTint;
    if(materialB.x+materialB.y>0.005) white=painted(snow,worldPoint.xz/520.0)*snowTint*0.82;
  }
  if(materialA.z>0.005 || isWall==1) {
    if(tri.x>0.005) rock+=painted(stone,worldPoint.zy/260.0)*tri.x;
    if(tri.y>0.005) rock+=painted(stone,worldPoint.xz/260.0)*tri.y;
    if(tri.z>0.005) rock+=painted(stone,worldPoint.xy/260.0)*tri.z;
    rock*=rockTint;
  }
  float sum=dot(materialA,vec4(1.0))+dot(materialB,vec3(1.0));
  vec3 surface=(grass*materialA.x+dirt*materialA.y+rock*materialA.z+dryGrass*materialA.w+
    white*materialB.x+white*vec3(0.67,0.84,0.91)*materialB.y+gravel*materialB.z)/max(0.001,sum);
  if(isWall==1) surface=rock;
  diffuseColor.rgb*=surface*occlusion;
  }
  if(worldDebug==2) diffuseColor.rgb=mix(vec3(0.08,0.28,0.45),vec3(1.0,0.85,0.4),clamp((worldPoint.y-60.0)/800.0,0.0,1.0));
  if(worldDebug==3) diffuseColor.rgb=n*0.5+0.5;
  if(worldDebug==4) diffuseColor.rgb=mix(vec3(0.13,0.65,0.48),vec3(0.85,0.13,0.1),1.0-n.y);
  if(worldDebug==5 || worldDebug==7) diffuseColor.rgb=traversal>0.5?vec3(0.85,0.16,0.1):vec3(0.1,0.75,0.65);
`;

/**
 * Orkhon Valley: the terrain kit's paintings, untinted. Ground surfaces carry only cliff-foot
 * nearness per vertex (`materialA.x`); every other mask is evaluated per pixel from the baked
 * ground mask (`orkhonGround.ts`, whose `orkhonGroundWeights` mirrors `orkhonWeights`). Wall
 * vertices carry painted-face coordinates in `materialB`.
 */
export const ORKHON_SAMPLING = `
  uniform sampler2D meadow; uniform sampler2D dryMeadow; uniform sampler2D soil;
  uniform sampler2D stone; uniform sampler2D snow; uniform sampler2D meadowAlt;
  uniform int worldDebug; uniform int isWall; uniform float samplingDetail; uniform float tileSize;
  varying float traversal; varying vec3 worldPoint; varying vec3 worldNormal;
  varying vec4 materialA; varying vec3 materialB; varying float occlusion;
  uniform sampler2D cliffAtlas; uniform vec2 cliffAtlasSize; uniform vec4 cliffFaces[4];
  uniform float cliffFaceWidth; uniform float cliffPixel; uniform float cliffRise; uniform float cliffTop;
  uniform sampler2D groundMask; uniform float worldSize; uniform float floorHeight; uniform float plateauRise;
  uniform vec4 rampAxis[ORKHON_RAMPS]; uniform vec4 rampSize[ORKHON_RAMPS];
  // Authored cliffs repeat opaque basalt bands cut from the terrain kit's straight cliff run along
  // their outline. Each repeat picks a band, never mirrored, so the painted light stays upper left;
  // the grass lip and inked column tops stay on top.
  vec3 cliffFace(float along, float depth) {
    float u=along/cliffPixel;
    float k=floor(u/cliffFaceWidth);
    float pick=fract(sin(k*12.9898+4.1)*43758.5453);
    vec4 face=cliffFaces[0];
    if(pick>0.75) face=cliffFaces[3]; else if(pick>0.5) face=cliffFaces[2]; else if(pick>0.25) face=cliffFaces[1];
    float x=u-k*cliffFaceWidth;
    float y=clamp(depth/cliffRise,0.0,1.0)*face.z;
    vec2 px=face.xy+vec2(clamp(x,0.5,cliffFaceWidth-0.5),clamp(y,0.5,face.z-0.5));
    return texture2D(cliffAtlas,vec2(px.x/cliffAtlasSize.x,1.0-px.y/cliffAtlasSize.y)).rgb;
  }
  // Ramp flanks run their bands along the nearest ramp's own arc length (orkhonFlankAlong), so
  // the bands keep their painted width instead of shearing where the normal's dominant axis
  // switches; they advance along (-n.z, n.x) as plateau walls do, so they are never mirrored.
  float orkhonFlankAlong(vec2 p, vec3 n, float along) {
    float best=1e9;
    for(int i=0;i<ORKHON_RAMPS;i++) {
      vec2 q=p-rampAxis[i].xy; vec2 d=rampAxis[i].zw; float len=rampSize[i].x;
      float s=dot(q,d), lateral=abs(dot(q,vec2(-d.y,d.x)));
      if(lateral>rampSize[i].z+40.0 || s<-0.3*len || s>1.3*len || lateral>=best) continue;
      best=lateral;
      along=(dot(vec2(-n.z,n.x),d)>=0.0?s:-s)+float(i)*397.0;
    }
    return along;
  }
  // Per-pixel weights of valley grass, trail dirt, scree and straw (wA) and plateau moss (wMoss):
  // worn earth and dry-grass potential come from the baked ground mask; plateau tops from
  // height, scree from slope and cliff-foot nearness.
  void orkhonWeights(vec3 p, float normalY, float cliffFoot, out vec4 wA, out float wMoss) {
    vec2 mask=texture2D(groundMask,p.xz/worldSize).rg;
    float top=smoothstep(plateauRise*0.55,plateauRise*0.85,p.y-floorHeight);
    float foot=cliffFoot*cliffFoot;
    float stone=clamp(smoothstep(0.3,0.62,1.0-normalY)+foot*foot*(1.0-top)*0.6,0.0,1.0);
    float soil=(1.0-stone)*mask.r, cover=(1.0-stone)*(1.0-mask.r);
    float dry=mask.g*(1.0-top), grass=cover*(1.0-dry);
    wA=vec4(grass*(1.0-top),soil,stone,cover*dry); wMoss=grass*top;
  }
  // Hex-tile sampling (Mikkelsen, "Practical Real-Time Hex-Tiling", 2022): three copies of the
  // painting, each translated by a random offset per vertex of a triangle grid about 100 units
  // apart, blended by distance and by each copy's own luminance, so copies meet along painted
  // strokes and the 200-unit repeat disappears. Copies are never rotated, mirrored, scaled or
  // tinted, so the painted light stays upper left. Each copy belongs to one of the grid's three
  // vertex classes, so its offset only changes where its weight is zero and ordinary sampling
  // (with anisotropic filtering) picks the right mip level. Below 70% render scale: one sample.
  const vec3 LUMA=vec3(0.299,0.587,0.114);
  struct Hex { vec2 cell0; vec2 cell1; vec2 cell2; vec3 weight; };
  Hex hexGrid(vec2 uv) {
    vec2 st=uv*2.0;
    vec2 skew=vec2(st.x-0.57735027*st.y,1.15470054*st.y);
    vec2 base=floor(skew), f=fract(skew);
    float fz=1.0-f.x-f.y, s=step(0.0,-fz), s2=2.0*s-1.0;
    vec2 v1=base+vec2(s), v2=base+vec2(s,1.0-s), v3=base+vec2(1.0-s,s);
    vec3 w=pow(max(vec3(-fz*s2,s-f.y*s2,s-f.x*s2),0.0),vec3(7.0));
    // Vertex class (a + 2b) mod 3: every triangle holds one vertex of each class.
    vec3 k=mod(vec3(v1.x+2.0*v1.y,v2.x+2.0*v2.y,v3.x+2.0*v3.y),3.0);
    Hex h;
    h.cell0=k.x<0.5?v1:(k.y<0.5?v2:v3); h.cell1=abs(k.x-1.0)<0.5?v1:(abs(k.y-1.0)<0.5?v2:v3);
    h.cell2=k.x>1.5?v1:(k.y>1.5?v2:v3);
    h.weight=vec3(k.x<0.5?w.x:(k.y<0.5?w.y:w.z),abs(k.x-1.0)<0.5?w.x:(abs(k.y-1.0)<0.5?w.y:w.z),
      k.x>1.5?w.x:(k.y>1.5?w.y:w.z));
    h.weight*=step(max(h.weight.x,max(h.weight.y,h.weight.z))*0.02,h.weight);
    return h;
  }
  vec2 hexOffset(vec2 cell, float seed) {
    return fract(sin(vec2(dot(cell,vec2(127.1,311.7)),dot(cell,vec2(269.5,183.3)))+seed)*43758.5453);
  }
  vec3 hexPainting(sampler2D map, vec2 uv, Hex h, float seed) {
    if(samplingDetail<0.5) return texture2D(map,uv).rgb;
    vec2 u0=uv+hexOffset(h.cell0,seed), u1=uv+hexOffset(h.cell1,seed), u2=uv+hexOffset(h.cell2,seed);
    vec3 w=h.weight, c0=vec3(0.0), c1=c0, c2=c0;
    if(w.x>0.0) c0=texture2D(map,u0).rgb;
    if(w.y>0.0) c1=texture2D(map,u1).rgb;
    if(w.z>0.0) c2=texture2D(map,u2).rgb;
    w*=mix(vec3(1.0),vec3(dot(c0,LUMA),dot(c1,LUMA),dot(c2,LUMA)),0.6);
    return (c0*w.x+c1*w.y+c2*w.z)/max(w.x+w.y+w.z,1e-5);
  }
  // Materials meet by height blending: each painting's own light and dark strokes decide where it
  // shows through, so edges follow tufts, stones and ruts instead of a soft cross-fade. Colours
  // are untouched.
  float authoredHeight(vec3 c, float weight) {
    return weight + (dot(c, LUMA) - 0.45) * 0.7;
  }
  // The calm and olive grass paintings alternate in broad regions, both unrotated, meeting along
  // their own strokes over a few tens of units.
  vec3 grassRegions(vec2 p, vec2 uv, Hex h) {
    float swap=0.5+0.3*sin(p.x/290.0+sin(p.y/230.0)*1.7)+0.2*sin(p.y/410.0-p.x/630.0);
    float w=smoothstep(0.3,0.7,swap);
    if(w<0.01) return hexPainting(meadow,uv,h,0.0);
    if(w>0.99) return hexPainting(meadowAlt,uv,h,17.3);
    vec3 calm=hexPainting(meadow,uv,h,0.0), olive=hexPainting(meadowAlt,uv,h,17.3);
    float hc=authoredHeight(calm,1.0-w), ho=authoredHeight(olive,w), top=max(hc,ho)-0.12;
    float wc=max(0.0,hc-top), wo=max(0.0,ho-top);
    return (calm*wc+olive*wo)/max(wc+wo,0.0001);
  }
  vec3 authoredGround(vec2 p, vec4 wA, float wMoss) {
    vec2 uv=p/tileSize; Hex h=hexGrid(uv);
    vec3 c0=vec3(0.0),c1=c0,c2=c0,c3=c0,c4=c0;
    float h0=-9.0,h1=-9.0,h2=-9.0,h3=-9.0,h4=-9.0;
    if(wA.x>0.005) {
      c0=grassRegions(p,uv,h);
      if(wA.x>0.995) return c0;
      h0=authoredHeight(c0,wA.x);
    }
    // Plateau tops: the darker plateau moss.
    if(wMoss>0.005) {
      c4=hexPainting(snow,uv,h,31.7);
      if(wMoss>0.995) return c4;
      h4=authoredHeight(c4,wMoss);
    }
    if(wA.y>0.005) { c1=hexPainting(soil,uv,h,43.1); h1=authoredHeight(c1,wA.y); }
    if(wA.z>0.005) { c2=hexPainting(stone,uv,h,59.9); h2=authoredHeight(c2,wA.z); }
    if(wA.w>0.005) { c3=hexPainting(dryMeadow,uv,h,71.3); h3=authoredHeight(c3,wA.w); }
    float top=max(max(max(h0,h1),max(h2,h3)),h4)-0.12;
    float w0=max(0.0,h0-top),w1=max(0.0,h1-top),w2=max(0.0,h2-top),w3=max(0.0,h3-top),w4=max(0.0,h4-top);
    return (c0*w0+c1*w1+c2*w2+c3*w3+c4*w4)/max(w0+w1+w2+w3+w4,0.0001);
  }
`;

export const ORKHON_COLOR = `
  vec3 n=normalize(worldNormal);
  if(worldDebug<=1) {
    vec3 surface;
    if(isWall==0) {
      vec4 wA; float wMoss;
      orkhonWeights(worldPoint,n.y,materialA.x,wA,wMoss);
      surface=authoredGround(worldPoint.xz,wA,wMoss);
      // Steep shoulders add side projections (orkhonSideProjection), so the paintings do not
      // stretch downhill. Each advances uphill the same way as the top projection, so no painting
      // turns or mirrors, and projections meet by height blending along their own strokes.
      if(n.y<0.85) {
        vec3 tri=pow(abs(n),vec3(8.0)); tri/=tri.x+tri.y+tri.z;
        vec3 sx=surface, sz=surface;
        float hy=authoredHeight(surface,tri.y), hx=-9.0, hz=-9.0;
        if(tri.x>0.02) {
          sx=authoredGround(vec2((n.x<0.0?1.0:-1.0)*worldPoint.y,worldPoint.z),wA,wMoss);
          hx=authoredHeight(sx,tri.x);
        }
        if(tri.z>0.02) {
          sz=authoredGround(vec2(worldPoint.x,(n.z<0.0?1.0:-1.0)*worldPoint.y),wA,wMoss);
          hz=authoredHeight(sz,tri.z);
        }
        float top=max(hy,max(hx,hz))-0.12;
        vec3 w=max(vec3(0.0),vec3(hx,hy,hz)-top);
        surface=(sx*w.x+surface*w.y+sz*w.z)/max(w.x+w.y+w.z,0.0001);
      }
      // Steep graded ground (ramp flanks) shows the same basalt bands as the plateau walls.
      if(n.y<0.75) {
        float along=mix(worldPoint.x,worldPoint.z,step(abs(n.z),abs(n.x)));
        if(texture2D(groundMask,worldPoint.xz/worldSize).b>0.5) along=orkhonFlankAlong(worldPoint.xz,n,along);
        surface=mix(surface,cliffFace(along,cliffTop-worldPoint.y),smoothstep(0.75,0.5,n.y));
      }
    } else if(materialB.z>0.5) surface=cliffFace(materialB.x,materialB.y);
    else {
      vec3 tri=pow(abs(n),vec3(5.0)); tri/=max(0.001,tri.x+tri.y+tri.z);
      surface=texture2D(stone,worldPoint.zy/tileSize).rgb*tri.x+texture2D(stone,worldPoint.xz/tileSize).rgb*tri.y+
        texture2D(stone,worldPoint.xy/tileSize).rgb*tri.z;
    }
    diffuseColor.rgb*=surface*occlusion;
  }

  if(worldDebug==2) diffuseColor.rgb=mix(vec3(0.08,0.28,0.45),vec3(1.0,0.85,0.4),clamp((worldPoint.y-60.0)/800.0,0.0,1.0));
  if(worldDebug==3) diffuseColor.rgb=n*0.5+0.5;
  if(worldDebug==4) diffuseColor.rgb=mix(vec3(0.13,0.65,0.48),vec3(0.85,0.13,0.1),1.0-n.y);
  if(worldDebug==5 || worldDebug==7) diffuseColor.rgb=traversal>0.5?vec3(0.85,0.16,0.1):vec3(0.1,0.75,0.65);
`;

/**
 * Fragment additions for a terrain program: the sampling functions to prepend and the colour step
 * that follows `#include <color_fragment>`. Only Orkhon programs carry the Orkhon code.
 */
export function terrainShaderSource(orkhon: { ramps: number } | undefined): {
  sampling: string;
  color: string;
} {
  if (!orkhon) return { sampling: TERRAIN_SAMPLING, color: TERRAIN_COLOR };
  return {
    sampling: `#define ORKHON_RAMPS ${Math.max(1, orkhon.ramps)}\n${ORKHON_SAMPLING}`,
    color: ORKHON_COLOR,
  };
}
