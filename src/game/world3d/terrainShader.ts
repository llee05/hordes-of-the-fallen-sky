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
