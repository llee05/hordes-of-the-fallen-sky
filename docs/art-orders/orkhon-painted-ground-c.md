# Orkhon painted ground prototype — Candidate C

This is the approved Stage 2 source for the reversible painted-ground prototype around the
falls-plateau ramp nearest camp. The painting covers a **1,600 × 1,600 world-unit** square,
camp-relative `x = -550…1050`, `y = -1600…0`, and is projected over the existing elevation
geometry. Cliffs, props, actors, gameplay and camera remain separate.

## Files and sampling

- GPT Image source: `art-source/orkhon-painted-ground-c.png` (1,254 × 1,254 RGB).
- Runtime texture: `public/art/orkhon-valley/ground/painted_ramp_region_c.png`
  (2,048 × 2,048 RGB, opaque).
- Runtime coverage: 1,600 units square, exactly **0.78125 world units per runtime texel**.

Codex's built-in GPT Image generator does not expose an exact output-size control. It returned the
1,254-pixel source even though the prompt requested 2,048 pixels. The runtime texture is a faithful
Lanczos resample to the required power-of-two size; it does not claim newly generated native detail.
The source is retained so a future native-resolution repaint can replace it without ambiguity.

## Approved direction

The captain selected the grass appearance in the Stage 1
`mockup-candidate-c-in-current-view.png`: warm olive, visible hand-painted grass strokes, irregular
golden dry-grass ribbons, warm umber trail and hearth, and a cooler dark-olive plateau. Candidate B's
pale grey vellum and Candidate D's bright yellow field are explicitly not the target.

## GPT Image prompt

Input image 1 was Stage 1 `candidate-c-warm-balanced.png`, the strict top-down layout and edit target.
Input image 2 was `mockup-candidate-c-in-current-view.png`, used only as the approved grass-appearance
reference.

> Preserve Image 1's square framing, top-down geometry, plateau boundary, path/ramp route and width,
> partial hearth, irregular left and right dry-grass ribbons, embedded stones, edge treatment, and
> ground-only content. Preserve its warm olive field, A-style visible hand-painted grass brushwork,
> irregular straw patches, warm umber path, and dark cooler plateau. Match the grass appearance in
> Image 2: warm olive rather than grey, clear but restrained brush strokes, and naturally broken
> golden dry-grass marks. Lift only the valley-floor midtones slightly so it reads like Image 2 under
> game lighting, without changing hue family or reducing contrast. Do not drift toward Candidate B's
> pale grey/beige vellum or Candidate D's bright yellow/mustard field. Ground only: no cliffs, water,
> trees, shrubs, flowers, characters, buildings, objects, cast shadows, labels, text, borders,
> transparency, perspective or horizon. Request the highest-detail 2,048 × 2,048 square output.

Generated with Codex's built-in GPT Image tool on 2026-11-12. The runtime copy was made with:

```sh
magick art-source/orkhon-painted-ground-c.png -filter Lanczos -resize 2048x2048 \
  public/art/orkhon-valley/ground/painted_ramp_region_c.png
```

## Measured runtime image

`npm run atlas:inspect -- public/art/orkhon-valley/ground/painted_ramp_region_c.png` reports an opaque
2,048² image with median `L* 47`, median `C* 39`, hue 91°, and median `#806f2c`. This intentionally
follows the captain-approved Candidate C appearance rather than Candidate B's numeric palette target.
The painting is a unique bounded region, not a wrapping tile; its wrap-seam score is therefore not an
acceptance criterion.
