/** World-space texture sampling; noise chooses material coverage, never substitutes painted color. */
export const TERRAIN_SAMPLING = `
  uniform sampler2D meadow; uniform sampler2D dryMeadow; uniform sampler2D soil;
  uniform sampler2D stone; uniform sampler2D snow;
  uniform int worldDebug; uniform int isWall;
  uniform float samplingDetail;
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
`;

export const TERRAIN_COLOR = `
  vec3 n=normalize(worldNormal);
  if(worldDebug<=1) {
  vec3 tri=pow(abs(n),vec3(5.0)); tri/=max(0.001,tri.x+tri.y+tri.z);
  vec3 grass=vec3(0.0), dryGrass=vec3(0.0), dirt=vec3(0.0), rock=vec3(0.0), gravel=vec3(0.0), white=vec3(0.0);
  if(isWall==0) {
    if(materialA.x>0.005) grass=painted(meadow,worldPoint.xz/390.0)*vec3(0.8,1.02,0.86)*grassTint;
    if(materialA.w>0.005) dryGrass=painted(dryMeadow,worldPoint.xz/470.0)*vec3(0.92,0.96,0.89)*grassTint;
    if(materialA.y>0.005) dirt=painted(soil,worldPoint.xz/420.0)*soilTint;
    if(materialB.z>0.005) gravel=painted(soil,worldPoint.xz/170.0)*vec3(0.84,0.88,0.87)*soilTint;
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
