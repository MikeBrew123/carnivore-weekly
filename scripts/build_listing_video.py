#!/usr/bin/env python3
"""
Build an Etsy listing video from the SAME images used in the gallery.

Brew's standing complaint about past attempts is that the images and the video
never matched each other. They do here by construction: this script takes the
already-built gallery stills as input and only pans, zooms and cross-fades. It
generates nothing, so there is nothing that can drift, and it costs nothing.

No ffmpeg on this machine, so encoding goes through OpenCV's VideoWriter.

Etsy's rules: 5-15 seconds, mp4, under 100 MB, and it plays muted, so the video
carries no audio and must read without it.

Usage:
  python3 scripts/build_listing_video.py OUT.mp4 IMG1.jpg IMG2.jpg ...
  python3 scripts/build_listing_video.py OUT.mp4 --size 1080 --hold 3.0 IMG...
"""

import argparse
import sys
from pathlib import Path

import cv2
import numpy as np

FPS = 30


def cover(img, size):
    """Scale and centre-crop to a square of `size`, preserving aspect."""
    h, w = img.shape[:2]
    s = max(size / w, size / h)
    r = cv2.resize(img, (max(size, int(round(w * s))), max(size, int(round(h * s)))),
                   interpolation=cv2.INTER_AREA)
    rh, rw = r.shape[:2]
    y, x = (rh - size) // 2, (rw - size) // 2
    return r[y:y + size, x:x + size]


def ken_burns(img, size, frames, z0, z1):
    """Yield `frames` frames zooming from z0 to z1 about the centre."""
    base = cover(img, int(size * max(z0, z1) + 2))
    bh, bw = base.shape[:2]
    for i in range(frames):
        t = i / max(frames - 1, 1)
        # Ease in and out so the motion starts and stops gently rather than
        # snapping, which is what makes a slideshow look cheap.
        e = t * t * (3 - 2 * t)
        z = z0 + (z1 - z0) * e
        cw = int(round(size * (max(z0, z1) / z)))
        cw = min(cw, bw, bh)
        x, y = (bw - cw) // 2, (bh - cw) // 2
        crop = base[y:y + cw, x:x + cw]
        yield cv2.resize(crop, (size, size), interpolation=cv2.INTER_AREA)


def open_writer(path, size):
    for tag in ("avc1", "mp4v"):
        w = cv2.VideoWriter(str(path), cv2.VideoWriter_fourcc(*tag), FPS, (size, size))
        if w.isOpened():
            print(f"  codec: {tag}")
            return w
        w.release()
    raise SystemExit("could not open a video writer (tried avc1, mp4v)")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("out")
    ap.add_argument("images", nargs="+")
    ap.add_argument("--size", type=int, default=1080)
    ap.add_argument("--hold", type=float, default=3.0, help="seconds per image")
    ap.add_argument("--fade", type=float, default=0.5, help="cross-fade seconds")
    a = ap.parse_args()

    imgs = []
    for p in a.images:
        im = cv2.imread(p, cv2.IMREAD_COLOR)
        if im is None:
            raise SystemExit(f"cannot read {p}")
        imgs.append(im)

    hold_f = int(round(a.hold * FPS))
    fade_f = int(round(a.fade * FPS))
    if fade_f * 2 >= hold_f:
        raise SystemExit("--fade is too long for --hold")

    total_s = len(imgs) * a.hold - (len(imgs) - 1) * a.fade
    if not 5 <= total_s <= 15:
        print(f"  WARNING: {total_s:.1f}s is outside Etsy's 5-15s window")

    Path(a.out).parent.mkdir(parents=True, exist_ok=True)
    writer = open_writer(a.out, a.size)

    # Alternate the zoom direction so consecutive shots do not all drift the
    # same way, which reads as a stuck camera.
    shots = []
    for i, im in enumerate(imgs):
        z0, z1 = (1.0, 1.10) if i % 2 == 0 else (1.10, 1.0)
        shots.append(list(ken_burns(im, a.size, hold_f, z0, z1)))

    prev_tail = None
    for i, frames in enumerate(shots):
        head, body = frames[:fade_f], frames[fade_f:len(frames) - fade_f]
        tail = frames[len(frames) - fade_f:]

        if prev_tail is None:
            for f in frames[:len(frames) - fade_f]:
                writer.write(f)
        else:
            for j, (pf, nf) in enumerate(zip(prev_tail, head)):
                al = j / max(len(head) - 1, 1)
                writer.write(cv2.addWeighted(pf, 1 - al, nf, al, 0))
            for f in body:
                writer.write(f)

        prev_tail = tail if i < len(shots) - 1 else None
        if prev_tail is None:
            for f in tail:
                writer.write(f)

    writer.release()
    mb = Path(a.out).stat().st_size / 1e6
    print(f"  {a.out}  {total_s:.1f}s  {a.size}x{a.size}  {mb:.1f} MB")
    if mb > 100:
        print("  WARNING: over Etsy's 100 MB limit")
    return 0


if __name__ == "__main__":
    sys.exit(main())
