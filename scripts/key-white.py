#!/usr/bin/env python3
"""Key the white studio background out of a Kohler product PNG.

Scene7 serves every product shot on a solid white plate. `fmt=png-alpha` returns an
alpha channel that is filled white, and `op_maskUse=alpha` does not help, so the
background has to be keyed locally.

A global white threshold cannot be used: it eats white ceramic products from the
inside. Instead the background is removed with a flood fill seeded from the image
border, so only white that is *connected to the edge* is dropped. Interior white
(a ceramic basin, a gloss highlight) is untouched because the fill never reaches it.

Usage:
    key-white.py <in.png> <out-dir> <basename> [--widths=1400,700]
    key-white.py --swatch <in.png> <out-dir> <basename>

Writes <out-dir>/<basename>.webp (widest) and <out-dir>/<basename>-<w>.webp for
each narrower width. In --swatch mode the chip is copied to webp untouched and its
average colour is printed as `HEX #rrggbb` for use as the finish accent.
"""

import sys
from collections import deque
from pathlib import Path

from PIL import Image

# Connected-to-border pixels at or above this brightness are background. The plate is
# normally a flat 255, so the only pixels in the 246..252 band are product: a Kohler ceramic
# deck renders at 246-248 and the spec's 246 cutoff let the fill walk straight into it.
BG_MIN = 252
# Leftover pixels this bright are candidates for the shadow ramp / edge feather.
NEAR_MIN = 236
# Below the product's contact line there is nothing but the baked-in drop shadow, so
# pixels down there are faded from much further into the greys.
SHADOW_MIN = 200

# ── the baked drop shadow (see shadow_background) ───────────────────────────────────────
# Largest brightness drop the descent may take in one 4-connected step. Measured on the
# masters: the shadow's own gradient peaks at 5 levels/px right under the contact point,
# while a product silhouette is a 13-124 level cliff.
SHADOW_STEP = 6
# The shadow is a neutral darkening of a neutral plate. Anything tinted is product.
SHADOW_CHROMA = 12
# The descent must stay clear of the tones the product body itself occupies, or it walks
# straight into a white basin. Measured floor = 75th percentile of the surviving pixels
# plus this: matte black lands at ~117, brushed metal at ~225, white ceramic above BG_MIN
# (which switches the pass off entirely, which is the right answer for a white-on-white shot).
SHADOW_MARGIN = 40
# Fraction of the descent's boundary that may end on that floor rather than on a silhouette.
# A descent that stalls on the floor can only erase part of the shadow, and a half-erased
# shadow with a ragged edge looks worse than the smear — so the whole pass is dropped.
SHADOW_STALL = 0.02
# ...and a backstop on how much of the opaque area one descent may claim.
SHADOW_MAX = 0.40


def flood_background(px, w, h):
    """Scanline flood fill from every white border pixel. Returns a w*h bytearray
    where 1 marks background. 4-connectivity, as validated in the design spec."""
    white = bytearray(w * h)
    for i, (r, g, b) in enumerate(px):
        if r >= BG_MIN and g >= BG_MIN and b >= BG_MIN:
            white[i] = 1

    filled = bytearray(w * h)
    stack = []
    for x in range(w):
        for y in (0, h - 1):
            if white[y * w + x]:
                stack.append((x, y))
    for y in range(h):
        for x in (0, w - 1):
            if white[y * w + x]:
                stack.append((x, y))

    while stack:
        x, y = stack.pop()
        row = y * w
        if filled[row + x] or not white[row + x]:
            continue
        # widen the span
        x1 = x
        while x1 > 0 and white[row + x1 - 1] and not filled[row + x1 - 1]:
            x1 -= 1
        x2 = x
        while x2 < w - 1 and white[row + x2 + 1] and not filled[row + x2 + 1]:
            x2 += 1
        for i in range(row + x1, row + x2 + 1):
            filled[i] = 1
        # seed the rows above and below, one seed per contiguous run
        for ny in (y - 1, y + 1):
            if ny < 0 or ny >= h:
                continue
            nrow = ny * w
            run = False
            for nx in range(x1, x2 + 1):
                ok = white[nrow + nx] and not filled[nrow + nx]
                if ok and not run:
                    stack.append((nx, ny))
                run = ok
    return filled


def shadow_background(px, w, h, filled):
    """Descend out of the keyed plate into the drop shadow Kohler bakes into the master.

    `flood_background` cannot reach it. The plate is a flat 255 but the shadow's outer
    penumbra lands at 249-252 — under BG_MIN — so the strict fill stops at the pool's rim and
    the whole ellipse survives fully opaque at 230-252. On #08090A that reads as a white
    puddle under the product. It is not a near-white leftover either: its core drops to
    ~180, which is dark enough that the old `y > bottom` ramp counted it as product body and
    put the bounding box *below* the shadow, leaving that ramp with nothing to act on.

    So walk the gradient instead of thresholding it. From the plate, step into a neighbour
    only if it is neutral and no more than SHADOW_STEP darker: the shadow's own slope is
    0-5 levels/px, a product silhouette is a 13-124 level cliff. A floor derived from the
    product's own tone stops the descent before it can enter the body.

    Returns a bytearray marking the pixels to key out, or None to leave the image alone.
    """
    vals = sorted(min(p) for p, f in zip(px, filled) if not f)
    if not vals:
        return None
    floor = vals[len(vals) * 3 // 4] + SHADOW_MARGIN
    if floor >= BG_MIN:
        # A white product on a white plate: there is no tonal room between the two, so
        # there is no shadow to separate. Ceramics land here.
        return None

    reach = bytearray(filled)
    level = bytearray(w * h)
    queue = deque()
    for i, f in enumerate(filled):
        if f:
            level[i] = BG_MIN  # enter from the plate at the gate, not at its literal 255
            queue.append(i)

    cliffed = stalled = 0
    while queue:
        i = queue.popleft()
        lo = level[i] - SHADOW_STEP
        y, x = divmod(i, w)
        for nx, ny, j in ((x - 1, y, i - 1), (x + 1, y, i + 1), (x, y - 1, i - w), (x, y + 1, i + w)):
            if nx < 0 or nx >= w or ny < 0 or ny >= h or reach[j]:
                continue
            r, g, b = px[j]
            m = min(r, g, b)
            if max(r, g, b) - m > SHADOW_CHROMA:
                continue
            if m < lo:  # a silhouette: the descent has found the product's own edge
                cliffed += 1
                continue
            if m < floor:  # the descent ran out of headroom before it found one
                stalled += 1
                continue
            reach[j] = 1
            level[j] = min(BG_MIN, m)
            queue.append(j)

    added = sum(1 for i, r in enumerate(reach) if r and not filled[i])
    if not added or stalled > SHADOW_STALL * (cliffed + stalled):
        return None
    if added > SHADOW_MAX * (w * h - sum(filled)):
        return None
    for i, f in enumerate(filled):
        if f:
            reach[i] = 0
    return reach


def key(path):
    im = Image.open(path).convert("RGB")
    w, h = im.size

    # Not every Scene7 asset is shot on the flat white plate. A few come on a grey studio
    # gradient (Moxie showerheads), and a few sit on a lit floor with a vignette — those
    # leave a white puddle under the product that no threshold can separate from the
    # ceramic above it. Both give themselves away at the corners: a real plate is a flat
    # 255 there. Reject anything dimmer so the caller drops the finish rather than ship it.
    corners = [min(im.getpixel(c)) for c in ((0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1))]
    if min(corners) < BG_MIN:
        return None, (0, 0, 0, 0), 0.0, 0.0, 0

    px = list(im.getdata())
    filled = flood_background(px, w, h)

    # Fold the baked drop shadow into the background before anything downstream reads it:
    # with the pool gone the bounding box lands on the product's real contact line, which is
    # what the ramp below has always assumed.
    shadow = shadow_background(px, w, h, filled)
    shadow_px = 0
    if shadow is not None:
        for i, s in enumerate(shadow):
            if s:
                filled[i] = 1
                shadow_px += 1

    alpha = bytearray(255 if not f else 0 for f in filled)

    # Bounding box of the *solid* product body — near-white leftovers are excluded so
    # the baked-in drop shadow underneath the object does not inflate the box.
    top, bottom, left, right = h, -1, w, -1
    for i, a in enumerate(alpha):
        if not a:
            continue
        r, g, b = px[i]
        m = min(r, g, b)
        if m >= NEAR_MIN:
            continue
        y, x = divmod(i, w)
        if y < top:
            top = y
        if y > bottom:
            bottom = y
        if x < left:
            left = x
        if x > right:
            right = x
    if bottom < 0:  # nothing but near-white survived — bail out, caller will flag it
        return None, (0, 0, 0, 0), 0.0, 0.0, 0

    # What the flood fill leaves behind gets cleaned up in two ways:
    #  1) under the product body there is nothing but the drop shadow Kohler bakes into
    #     the plate, and it fades out of a mid grey rather than out of white, so it is
    #     ramped from much further down the scale
    #  2) near-white pixels touching the keyed background are antialiasing against white;
    #     without a ramp they read as a bright fringe on a dark page
    for i, a in enumerate(alpha):
        if not a:
            continue
        r, g, b = px[i]
        m = min(r, g, b)
        y, x = divmod(i, w)
        if y > bottom:
            lo = SHADOW_MIN
        elif m < NEAR_MIN:
            continue
        elif (
            (x > 0 and filled[i - 1])
            or (x < w - 1 and filled[i + 1])
            or (y > 0 and filled[i - w])
            or (y < h - 1 and filled[i + w])
        ):
            lo = NEAR_MIN
        else:
            continue
        if m > lo:
            alpha[i] = max(0, min(255, round((BG_MIN - m) * 255 / (BG_MIN - lo))))

    out = im.convert("RGBA")
    out.putalpha(Image.frombytes("L", (w, h), bytes(alpha)))

    # How solid the surviving region is inside its own bounding box. A real product is an
    # irregular silhouette and never fills its box; a studio card that was not keyed at all
    # fills it exactly. This separates the two far better than the keyed fraction does — a
    # top-view kitchen sink keys perfectly yet only clears 47% of the frame.
    xs = [i % w for i, a in enumerate(alpha) if a > 200]
    ys = [i // w for i, a in enumerate(alpha) if a > 200]
    fill = 0.0
    if xs:
        box = (max(xs) - min(xs) + 1) * (max(ys) - min(ys) + 1)
        fill = len(xs) / box
    keyed = sum(1 for a in alpha if a < 200) / (w * h)
    return out, (left, top, right, bottom), keyed, fill, shadow_px


def swatch(src, out_dir, base):
    """Copy a finish chip to webp and report its average colour."""
    im = Image.open(src).convert("RGB")
    px = list(im.getdata())
    n = len(px)
    r, g, b = (round(sum(p[i] for p in px) / n) for i in range(3))
    im.save(out_dir / f"{base}.webp", "WEBP", quality=92, method=6)
    print(f"HEX #{r:02X}{g:02X}{b:02X}")
    return 0


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    widths = [1400, 700]
    for a in sys.argv[1:]:
        if a.startswith("--widths"):
            widths = [int(x) for x in a.split("=", 1)[1].split(",")]
    if len(args) < 3:
        print(__doc__)
        return 2

    src, out_dir, base = args[0], Path(args[1]), args[2]
    out_dir.mkdir(parents=True, exist_ok=True)

    if "--swatch" in sys.argv[1:]:
        return swatch(src, out_dir, base)

    img, bbox, keyed, fill, shadow_px = key(src)
    if img is None:
        print("FAIL not-shot-on-white", src, file=sys.stderr)
        return 1
    # A grey card inset into a white margin keys down to a perfect opaque rectangle. Real
    # products top out around 0.98 fill (a straight-on kitchen sink); cards hit 1.00.
    if fill >= 0.995 or keyed < 0.05:
        print(f"FAIL unkeyed-plate fill={fill:.3f} keyed={keyed:.2f}", src, file=sys.stderr)
        return 1

    # --dry reports what the key would do without writing, so a re-key run can pick out the
    # frames the shadow pass actually changes instead of re-encoding all 306.
    if "--dry" not in sys.argv[1:]:
        # Never upscale: a handful of Scene7 masters are narrower than 1400 (Scene7 answers a
        # too-large `wid` with a 403), and blowing those up would only cost bytes.
        src_w = img.size[0]
        widths = sorted({min(t, src_w) for t in widths}, reverse=True)
        for i, target in enumerate(widths):
            w, h = img.size
            scaled = img if w == target else img.resize((target, round(h * target / w)), Image.LANCZOS)
            name = f"{base}.webp" if i == 0 else f"{base}-{target}.webp"
            scaled.save(out_dir / name, "WEBP", quality=86, method=6)

    l, t, r, b = bbox
    print(f"OK keyed={keyed:.3f} fill={fill:.3f} shadow={shadow_px} bbox={l},{t},{r},{b} "
          f"out={out_dir / (base + '.webp')}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
