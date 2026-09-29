# skin-codegen case format

Each case is one component state, normalised from a Figma/Canva export into
`cases/<id>.json`. The spec is the ground truth: the grader checks the
rendered output against these numbers, so no reference code is needed.

```jsonc
{
  "id": "btn-collect-idle",               // unique, path-safe
  "tags": ["button", "figma"],            // tags[0] = component type (report grouping)
  "source": "figma:<fileKey>:<nodeId>",   // where it came from
  "canvas": { "width": 360, "height": 200, "background": "#0B0B10" },
  "tokens": { "gold": "#F5C542", "radius-lg": "14px" },
  "component": {
    "description": "Collect button, idle glow",
    "root": {
      "box": { "x": 60, "y": 72, "width": 240, "height": 56 },
      "styles": { "background-color": "{gold}", "border-radius": "{radius-lg}" }
    },
    "parts": [
      { "name": "label", "text": "COLLECT",
        "box": { "width": 120, "height": 24 },          // optional
        "styles": { "color": "#1A1206", "font-size": "18px", "font-weight": "800" } }
    ]
  },
  "animations": [
    { "target": "root", "duration_ms": 1800, "delay_ms": 0,
      "iterations": "infinite", "direction": "normal",
      "easing": "cubic-bezier(0.4, 0, 0.2, 1)",
      "properties": ["transform"] }                    // optional: what must change
  ],
  "assets": [ { "name": "coin.svg", "type": "svg", "content": "<svg ...>" } ]
}
```

- `{token}` in any style value resolves from `tokens`.
- Style values are px (never em or rem) and leave out `line-height` and
  `transform-origin`: the grader resolves each value on a separate probe
  element, so anything relative to the element's own size or font would
  resolve differently there.
- A shorthand like `border` is only checked when all four sides agree;
  give per-side properties otherwise.
- `box.x` / `box.y` are relative to the stage's top-left corner, rest state,
  ignoring transforms.
- `target` names a part (`root` or a `parts[].name`). An animation on an
  element inside that part (a glow layer, a pseudo-element) counts for it.

## Output contract (what the generator must produce)

`{ html, css, js, notes }`. The HTML goes into a stage of the canvas size
(`position: relative`); the outermost element carries `data-part="root"`,
each named part carries `data-part="<name>"`. JS is optional and runs once
after the HTML is inserted.

## What the grader checks (see grade.mjs)

| Metric | Meaning |
|---|---|
| `pass` | every check below passes (headline) |
| `syntax` | no script errors, CSS produced rules, every named part present |
| `fidelity` | share of box and style values matching the spec exactly (box within 0.5 px) |
| `timing` | share of spec animations found with matching target, duration, delay, iterations, direction, easing and properties |
| `no_clip` | at 0/25/50/75/99% of every animation, nothing visibly leaves the stage, no text is cut by a clipping container, and all text fits the box that holds it. A decorative layer masked by its container (a sheen inside a button) is fine |
| `frame_ok` | animates only transform/opacity, and measured frame timing under 4x CPU slowdown stays in budget |
