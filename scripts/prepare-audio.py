"""Edit licensed recordings, never synthesize replacements.
Usage: python3 scripts/prepare-audio.py /path/to/gloam-audio-sources
Requires ffmpeg; raw sources/download links and licences are in docs/sound-design.md.
The source directory contains tiny/sfx-cc0, weapons, wind.wav, river.wav,
drum.mp3, horse.mp3 and fire.mp3. Nothing is downloaded by this script.
"""
from pathlib import Path
import array
import hashlib
import json
import math
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
RAW = Path(sys.argv[1])
OUT = ROOT / 'public/audio'
OUT.mkdir(parents=True, exist_ok=True)
SOURCES = {
    'vehicle': {'creator': 'Vehicle', 'title': 'Fantasy Sound Effects (Tinysized SFX)', 'url': 'https://opengameart.org/content/fantasy-sound-effects-tinysized-sfx', 'download': 'https://opengameart.org/sites/default/files/tinysized.zip'},
    'archery': {'creator': 'Ben Jaszczak and Brian Nelson / Still North Media', 'title': 'Medieval sound effects — Weapon Textures', 'url': 'https://opengameart.org/content/medieval-sound-effects-weapon-textures', 'download': 'https://opengameart.org/sites/default/files/medieval_sfx_textures_1_of_2.7z'},
    'park': {'creator': 'Thimras', 'title': 'Park ambiences', 'url': 'https://opengameart.org/content/park-ambiences', 'note': 'Field recordings in Adelaide, Australia; environmental proxies, not recordings of Mongolia.'},
    'drum': {'creator': 'Jaturo', 'title': 'classic drum', 'url': 'https://freesound.org/people/Jaturo/sounds/169605/', 'download': 'https://cdn.freesound.org/previews/169/169605_2824510-hq.mp3', 'note': 'Recorded frame drum, from public HQ preview. Not a recording of a Tengri rite.'},
    'horse': {'creator': 'Max_Headroom', 'title': 'Horse Galloping.wav', 'url': 'https://freesound.org/people/Max_Headroom/sounds/175356/', 'download': 'https://cdn.freesound.org/previews/175/175356_2861652-hq.mp3', 'note': 'Real horse on hard dry ground; public HQ preview. Grass/snow contacts remain a recording request.'},
    'fire': {'creator': 'SKrafft', 'title': 'Campfire (Position 1)', 'url': 'https://freesound.org/people/SKrafft/sounds/681366/', 'download': 'https://cdn.freesound.org/previews/681/681366_5752443-hq.mp3', 'note': 'Sony PCM-D100 recording; public HQ preview, light compression upstream.'},
}
for source in SOURCES.values():
    source['licence'] = 'CC0-1.0'
    source['licenceUrl'] = 'https://creativecommons.org/publicdomain/zero/1.0/'

assets = []

def edit(name, source_id, original, start=0, duration=0.5, lowpass=10000, ambient=False):
    src = RAW / original
    if source_id == 'vehicle' and start <= .05:
        probe = array.array('f', subprocess.check_output(['ffmpeg', '-v', 'error', '-i', str(src), '-t', '6', '-ac', '1', '-ar', '22050', '-f', 'f32le', '-']))
        peak = max(abs(v) for v in probe)
        first = next((i for i,v in enumerate(probe) if abs(v) > peak*.18), 0) / 22050
        start = max(start, first-.018)
    # All operations edit actual recordings: no oscillators, noise generation or pitch shifting.
    cmd = ['ffmpeg', '-v', 'error', '-ss', str(start), '-i', str(src), '-t', str(duration),
           '-ac', '2' if ambient else '1', '-ar', '44100', '-af', f'highpass=f={45 if ambient else 65},lowpass=f={lowpass}', '-f', 'f32le', '-']
    pcm = array.array('f', subprocess.check_output(cmd))
    channels = 2 if ambient else 1
    frames = len(pcm) // channels
    peak = max(abs(v) for v in pcm)
    rms = math.sqrt(sum(v*v for v in pcm)/len(pcm))
    gain = min(.62 / max(peak, .00001), (0.055 if ambient else .16) / max(rms, .00001))
    attack = .6 if ambient else .003
    release = .8 if ambient else min(.07, duration*.25)
    for i in range(frames):
        envelope = min(1, i/(44100*attack), (frames-1-i)/(44100*release))
        for ch in range(channels): pcm[i*channels+ch] *= gain*envelope
    data = pcm.tobytes()
    target = OUT / (name+'.ogg')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', '44100', '-ac', str(channels), '-i', '-', '-c:a', 'libvorbis', '-q:a', '5', '-map_metadata', '-1', str(target)], input=data, check=True)
    decoded = array.array('f', subprocess.check_output(['ffmpeg', '-v', 'error', '-i', str(target), '-f', 'f32le', '-']))
    assets.append({'file': target.name, 'source': source_id, 'original': original, 'sourceSha256': hashlib.sha256(src.read_bytes()).hexdigest(), 'start': start, 'seconds': frames/44100, 'channels': channels, 'rate': 44100, 'lowpass': lowpass, 'gain': round(gain,6), 'attack': attack, 'release': release, 'peak': max(abs(v) for v in decoded), 'rms': math.sqrt(sum(v*v for v in decoded)/len(decoded)), 'bytes': target.stat().st_size, 'sha256': hashlib.sha256(target.read_bytes()).hexdigest()})

for n,t in enumerate([.195,.913,1.452,1.901],1): edit(f'bow-{n:02}', 'archery', 'weapons/Scythian Recurve Shoot.wav',t,.29,8500)
for n in range(1,4):
    edit(f'body-{n:02}', 'vehicle', f'tiny/sfx-cc0/apple-cut-{n:02}.wav',0,.44,6800)
    edit(f'wood-{n:02}', 'vehicle', f'tiny/sfx-cc0/wood-bowl-spoon-{n:02}.wav',0,.48,8000)
for n in range(1,3):
    edit(f'leather-{n:02}', 'vehicle', f'tiny/sfx-cc0/quiver-leather-squeeze-{n:02}.wav',0,.6,7000)
    edit(f'paper-{n:02}', 'vehicle', f'tiny/sfx-cc0/book-page-{n:02}.wav',.05,.48,6500)
    edit(f'twig-{n:02}', 'vehicle', f'tiny/sfx-cc0/wood-twigs-break-{n:02}.wav',0,.5,8000)
    edit(f'metal-{n:02}', 'vehicle', f'tiny/sfx-cc0/metal-hammer-hit-{n:02}.wav',0,.65,7500)
edit('feather-01', 'vehicle','tiny/sfx-cc0/arrow-feathers-01.wav',0,.52,8500)
edit('creak-01', 'vehicle','tiny/sfx-cc0/floor-creak-01.wav',0,.9,5500)
edit('wood-chime-01', 'vehicle','tiny/sfx-cc0/chimes-wood-rattle.wav',3,1.3,6500)
for n,t in enumerate([1.41,4.29,7.21],1): edit(f'frame-drum-{n:02}', 'drum','drum.mp3',t,.34,3500)
for n,t in enumerate([.375,.915,1.375,1.795,2.405],1): edit(f'hoof-{n:02}', 'horse','horse.mp3',t,.135,6500)
for n,t in enumerate([18,82,161],1): edit(f'wind-{n:02}', 'park','wind.wav',t,32,8500,True)
for n,t in enumerate([14,64],1): edit(f'river-{n:02}', 'park','river.wav',t,24,8500,True)
for n,t in enumerate([8,45],1): edit(f'fire-{n:02}', 'fire','fire.mp3',t,24,8000,True)
(OUT/'credits.json').write_text(json.dumps({'prepared':'2026-10-25','processing':'Trimmed recorded takes; mono for positional Foley, stereo for beds; rumble/brightness filtering, conservative gain and endpoint fades, Vorbis encoding. No synthesis or pitch changes. Source MP3 previews are identified explicitly.','sources':SOURCES,'assets':assets},indent=2)+'\n')
print(len(assets),'recorded clips;',sum(a['bytes'] for a in assets),'bytes')
