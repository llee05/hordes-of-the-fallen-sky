/**
 * Medieval Manuscript Terrain & Cliff Shader (Phase 1 & 2).
 *
 * Combines painted ground textures with warm parchment mineral-pigment washes,
 * delicate topographical ink contour lines, diagonal ink crosshatching in
 * shaded crevices, and stratified/ink-outlined cliff faces.
 */
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
    vec3 inkColor=vec3(0.263,0.220,0.173); // #43382C dark manuscript ink
    vec3 parchmentLight=vec3(0.910,0.851,0.725); // #E8D9B9 light parchment
    vec3 parchmentAged=vec3(0.851,0.784,0.647); // #D9C8A5 aged parchment
    vec3 ochrePigment=vec3(0.678,0.510,0.302); // #AD824D faded ochre
    vec3 sagePigment=vec3(0.490,0.537,0.424); // #7D896C sage green
    vec3 slatePigment=vec3(0.376,0.478,0.545); // #607A8B dusty blue-slate

    float brushWave=sin(worldPoint.x*0.0045+sin(worldPoint.z*0.0038)*1.7)*0.5+0.5;
    float slope=clamp(1.0-n.y,0.0,1.0);

    if(isWall==0) {
      if(materialA.x>0.005) {
        vec3 rawGrass=painted(meadow,worldPoint.xz/390.0)*vec3(0.88,1.0,0.84)*grassTint;
        vec3 wash=mix(sagePigment*1.18,mix(parchmentAged,ochrePigment,0.35),brushWave*0.34);
        grass=mix(rawGrass,wash,0.28);
      }
      if(materialA.w>0.005) {
        vec3 rawDry=painted(dryMeadow,worldPoint.xz/470.0)*vec3(0.95,0.95,0.84)*grassTint;
        dryGrass=mix(rawDry,mix(parchmentAged,ochrePigment,0.42),0.32);
      }
      if(materialA.y>0.005) {
        dirt=mix(painted(soil,worldPoint.xz/420.0)*soilTint,parchmentAged*0.96,0.28);
      }
      if(materialB.z>0.005) {
        gravel=mix(painted(soil,worldPoint.xz/170.0)*vec3(0.88,0.86,0.79)*soilTint,parchmentLight*0.92,0.30);
      }
      if(materialB.x+materialB.y>0.005) {
        white=mix(painted(snow,worldPoint.xz/520.0)*snowTint*0.86,parchmentLight,0.25);
      }
    }
    if(materialA.z>0.005 || isWall==1) {
      if(tri.x>0.005) rock+=painted(stone,worldPoint.zy/260.0)*tri.x;
      if(tri.y>0.005) rock+=painted(stone,worldPoint.xz/260.0)*tri.y;
      if(tri.z>0.005) rock+=painted(stone,worldPoint.xy/260.0)*tri.z;
      rock*=rockTint;
      // Illustrated cliff strata: alternate dusty slate-blue, warm ochre-umber, and parchment ledges
      float strataPhase=worldPoint.y*0.095+sin(worldPoint.x*0.012+worldPoint.z*0.011)*1.4;
      float strataBand=sin(strataPhase)*0.5+0.5;
      vec3 cliffPigment=mix(slatePigment*0.95,mix(ochrePigment*0.92,parchmentAged,strataBand),0.45);
      rock=mix(rock,cliffPigment,isWall==1?0.48:0.32);
    }

    float sum=dot(materialA,vec4(1.0))+dot(materialB,vec3(1.0));
    vec3 surface=(grass*materialA.x+dirt*materialA.y+rock*materialA.z+dryGrass*materialA.w+
      white*materialB.x+white*vec3(0.67,0.80,0.88)*materialB.y+gravel*materialB.z)/max(0.001,sum);
    if(isWall==1) surface=rock;

    // 1. Delicate topographical ink contour lines on hills, ramps, and cliffs
    float organicWave=sin(worldPoint.x*0.011+sin(worldPoint.z*0.009)*1.8)*6.5+cos(worldPoint.z*0.013-sin(worldPoint.x*0.008)*1.5)*5.5;
    float elevWarp=worldPoint.y+organicWave;
    float contourCycle=abs(fract(elevWarp/34.0)-0.5)*2.0;
    float contourLine=(1.0-smoothstep(0.0,0.09,contourCycle))*smoothstep(0.015,0.20,slope+float(isWall)*0.5);

    // Subtle meadow brushstroke contour & pigment stipple on gentle ground
    float meadowStroke=0.0;
    if(isWall==0 && materialA.x>0.2) {
      float tuftWave=sin(worldPoint.x*0.045+sin(worldPoint.z*0.038)*2.4)*cos(worldPoint.z*0.042-sin(worldPoint.x*0.031)*2.1);
      meadowStroke=smoothstep(0.82,0.96,tuftWave)*0.14*materialA.x;
    }

    // 2. Organic painted boundary line where soil/shore/paths meet grassland
    float transitionEdge=materialA.x*(materialA.y+materialB.z+materialA.z);
    float boundaryStroke=smoothstep(0.14,0.24,transitionEdge)*(1.0-smoothstep(0.24,0.34,transitionEdge));

    // 3. Cliff face chiseled rock blocks, ink fissures, ledge rims, and crevice crosshatching
    float cliffInk=0.0;
    float ledgeHighlight=0.0;
    if(isWall==1 || slope>0.16) {
      float alongWall=(worldPoint.x*n.z-worldPoint.z*n.x);
      float blockWarp=sin(alongWall*0.018+sin(worldPoint.y*0.045)*1.7)*9.0+cos(alongWall*0.037-worldPoint.y*0.03)*4.5;
      float chiseledY=worldPoint.y+blockWarp;
      float jointCoord=alongWall*0.032+sin(chiseledY*0.075)*1.35+cos(alongWall*0.011)*0.8;
      float verticalCrack=(1.0-smoothstep(0.0,0.10,abs(fract(jointCoord)-0.5)*2.0))*0.62;
      float horizontalLedge=1.0-smoothstep(0.0,0.12,abs(fract(chiseledY/26.0)-0.5)*2.0);
      ledgeHighlight=smoothstep(0.68,0.95,sin(chiseledY*0.24))*0.26;
      float shadeFactor=clamp((1.0-occlusion)*1.45+slope*0.55+max(0.0,-n.x*0.38-n.z*0.28),0.0,1.0);
      float hatchA=1.0-smoothstep(0.0,0.17,abs(fract((alongWall+worldPoint.y*1.4)*0.085)-0.5)*2.0);
      float hatchB=1.0-smoothstep(0.0,0.17,abs(fract((alongWall-worldPoint.y*1.4)*0.085)-0.5)*2.0);
      float crosshatch=(hatchA*smoothstep(0.28,0.65,shadeFactor)+hatchB*smoothstep(0.55,0.86,shadeFactor))*0.46;
      cliffInk=clamp(verticalCrack+horizontalLedge*0.52+crosshatch,0.0,0.82)*clamp(slope*2.2+float(isWall),0.0,1.0);
    }

    surface=mix(surface,parchmentLight,ledgeHighlight);
    float totalInk=clamp(contourLine*0.36+meadowStroke+boundaryStroke*0.25+cliffInk,0.0,0.76);
    surface=mix(surface,inkColor,totalInk);
    float manuscriptOcclusion=mix(0.62,1.0,occlusion);
    diffuseColor.rgb*=surface*manuscriptOcclusion;
  }
  if(worldDebug==2) diffuseColor.rgb=mix(vec3(0.08,0.28,0.45),vec3(1.0,0.85,0.4),clamp((worldPoint.y-60.0)/800.0,0.0,1.0));
  if(worldDebug==3) diffuseColor.rgb=n*0.5+0.5;
  if(worldDebug==4) diffuseColor.rgb=mix(vec3(0.13,0.65,0.48),vec3(0.85,0.13,0.1),1.0-n.y);
  if(worldDebug==5 || worldDebug==7) diffuseColor.rgb=traversal>0.5?vec3(0.85,0.16,0.1):vec3(0.1,0.75,0.65);
`;
