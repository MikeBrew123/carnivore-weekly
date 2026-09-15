#!/usr/bin/env python3
"""
Composite a REAL rendered product page into an empty AI scene plate.

House rule (CLAUDE.md): product mockups use the actual product screenshot
composited into a generated empty scene. Never an AI-generated fake of the
product. This script is the "composited" half.

It is also the answer to the consistency problem: every gallery image and every
video frame carries the byte-identical page render, so the product can never
drift between images the way it does when each mockup is generated separately.

How it works:
  1. Find the blank white sheet in the scene plate (largest bright quadrilateral).
  2. Perspective-warp the product page onto those four corners.
  3. Multiply the scene's own shading over the warped product, so the scene's
     shadows and light fall across the print instead of it looking pasted on.

Usage:
  python3 scripts/composite_product_scene.py PAGE.png PLATE.jpg OUT.jpg
  python3 scripts/composite_product_scene.py PAGE.png PLATE.jpg OUT.jpg --debug
"""

import argparse
import sys
from pathlib import Path

import cv2
import numpy as np


def order_corners(pts, page_aspect=None):
    """Order corners as [top-left, top-right, bottom-right, bottom-left].

    The usual sum/difference trick silently fails once a sheet is rotated much
    past 30 degrees (on a diamond, the min-sum corner is not the top-left), which
    lands the product on the page sideways. Instead: sort around the centroid to
    get a consistent winding, then choose which of the four rotations is "up".

    When the page's aspect ratio is known, the rotation whose edge lengths match
    it wins, which is what keeps a portrait page from being mapped landscape.
    Ties, and the square case, fall back to whichever candidate puts the leading
    edge highest in frame.
    """
    pts = pts.reshape(4, 2).astype(np.float32)

    c = pts.mean(axis=0)
    ang = np.arctan2(pts[:, 1] - c[1], pts[:, 0] - c[0])
    pts = pts[np.argsort(ang)]  # counter-clockwise in image coords

    best, best_key = None, None
    for r in range(4):
        q = np.roll(pts, -r, axis=0)
        for cand in (q, q[::-1].copy()):
            top = (np.linalg.norm(cand[1] - cand[0]) + np.linalg.norm(cand[2] - cand[3])) / 2
            side = (np.linalg.norm(cand[2] - cand[1]) + np.linalg.norm(cand[3] - cand[0])) / 2
            if side < 1e-6:
                continue
            # Clockwise winding only, so TL->TR->BR->BL is respected.
            area = cv2.contourArea(cand.astype(np.float32))
            if area <= 0:
                continue
            e0, e1 = cand[1] - cand[0], cand[2] - cand[1]
            if e0[0] * e1[1] - e0[1] * e1[0] <= 0:
                continue
            aspect_err = abs((top / side) - page_aspect) if page_aspect else 0.0
            lead_y = (cand[0][1] + cand[1][1]) / 2
            key = (round(aspect_err, 3), lead_y)
            if best_key is None or key < best_key:
                best, best_key = cand, key

    return np.ascontiguousarray(best, dtype=np.float32)


def find_sheet(plate, page_aspect=None, min_area_frac=0.02, max_area_frac=0.72):
    """Locate the blank sheet. Returns ordered corners, or None."""
    gray = cv2.cvtColor(plate, cv2.COLOR_BGR2GRAY)
    h, w = gray.shape
    best = None

    # The sheet is the brightest big region, but "bright" differs per scene
    # (sunlit oak vs brushed steel), so sweep thresholds and keep the most
    # rectangular large candidate rather than trusting one cutoff.
    for thr in range(150, 246, 5):
        _, mask = cv2.threshold(gray, thr, 255, cv2.THRESH_BINARY)
        mask = cv2.morphologyEx(
            mask, cv2.MORPH_CLOSE, np.ones((9, 9), np.uint8), iterations=2
        )
        contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        for c in contours:
            area = cv2.contourArea(c)
            if not (min_area_frac * h * w <= area <= max_area_frac * h * w):
                continue
            # A quad pinned to every edge is the image frame, not a sheet of
            # paper. Reject anything hugging three or more borders.
            x, y, bw, bh = cv2.boundingRect(c)
            pad = 3
            borders = (x <= pad) + (y <= pad) + (x + bw >= w - pad) + (y + bh >= h - pad)
            if borders >= 3:
                continue
            peri = cv2.arcLength(c, True)
            approx = None
            for eps in (0.02, 0.03, 0.04, 0.05):
                cand = cv2.approxPolyDP(c, eps * peri, True)
                if len(cand) == 4 and cv2.isContourConvex(cand):
                    approx = cand
                    break
            if approx is None:
                continue
            # Compare against the quad's own area, not a min-area rect: a sheet
            # seen at an angle is a legitimate trapezoid and scores badly against
            # its bounding box. This only rejects ragged, non-quad blobs.
            if area / (cv2.contourArea(approx) + 1e-6) < 0.9:
                continue
            if best is None or area > best[0]:
                best = (area, approx)

    return order_corners(best[1], page_aspect) if best else None


def composite(page_path, plate_path, out_path, debug=False, feather=2, corners=None):
    page = cv2.imread(str(page_path), cv2.IMREAD_COLOR)
    plate = cv2.imread(str(plate_path), cv2.IMREAD_COLOR)
    if page is None:
        raise SystemExit(f"cannot read page: {page_path}")
    if plate is None:
        raise SystemExit(f"cannot read plate: {plate_path}")

    ph0, pw0 = page.shape[:2]
    if corners is not None:
        dst = np.array(corners, dtype=np.float32).reshape(4, 2)
    else:
        dst = find_sheet(plate, page_aspect=pw0 / ph0)
    if dst is None:
        raise SystemExit(
            f"no blank sheet found in {plate_path}. If the sheet projects to a "
            f"near-square (a rotated page shot at an angle), auto-detection "
            f"cannot tell portrait from landscape: pass --corners instead."
        )

    ph, pw = page.shape[:2]
    src = np.array([[0, 0], [pw, 0], [pw, ph], [0, ph]], dtype=np.float32)
    H = cv2.getPerspectiveTransform(src, dst)

    h, w = plate.shape[:2]
    warped = cv2.warpPerspective(page, H, (w, h))

    mask = np.zeros((h, w), np.uint8)
    cv2.fillConvexPoly(mask, dst.astype(np.int32), 255)
    if feather:
        mask = cv2.GaussianBlur(mask, (0, 0), feather)

    # Carry the scene's own light and shadow onto the print. The blank sheet's
    # luminance, normalised against its own bright end, becomes a shading map.
    gray = cv2.cvtColor(plate, cv2.COLOR_BGR2GRAY).astype(np.float32)
    inside = gray[mask > 128]
    if inside.size:
        ref = np.percentile(inside, 92)
        shade = np.clip(gray / max(ref, 1.0), 0.55, 1.06)
        warped = np.clip(warped.astype(np.float32) * shade[:, :, None], 0, 255)
    warped = warped.astype(np.uint8)

    a = (mask.astype(np.float32) / 255.0)[:, :, None]
    out = (warped.astype(np.float32) * a + plate.astype(np.float32) * (1 - a)).astype(np.uint8)

    if debug:
        cv2.polylines(out, [dst.astype(np.int32)], True, (0, 0, 255), 3)
        for i, (x, y) in enumerate(dst):
            cv2.circle(out, (int(x), int(y)), 9, (0, 255, 0), -1)
            cv2.putText(out, str(i), (int(x) + 12, int(y)),
                        cv2.FONT_HERSHEY_SIMPLEX, 1.0, (0, 255, 0), 2)

    Path(out_path).parent.mkdir(parents=True, exist_ok=True)
    cv2.imwrite(str(out_path), out, [cv2.IMWRITE_JPEG_QUALITY, 94])
    print(f"  {Path(out_path).name}  corners={[tuple(map(int, p)) for p in dst]}")
    return dst


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("page")
    ap.add_argument("plate")
    ap.add_argument("out")
    ap.add_argument("--debug", action="store_true", help="draw the detected quad")
    ap.add_argument(
        "--corners",
        help="override auto-detect with 8 numbers: x0,y0,x1,y1,x2,y2,x3,y3 "
             "in TL,TR,BR,BL order. Needed when the sheet projects near-square.",
    )
    a = ap.parse_args()
    corners = None
    if a.corners:
        vals = [float(v) for v in a.corners.replace(" ", "").split(",")]
        if len(vals) != 8:
            ap.error("--corners needs exactly 8 comma-separated numbers")
        corners = [vals[i:i + 2] for i in range(0, 8, 2)]
    composite(a.page, a.plate, a.out, debug=a.debug, corners=corners)
    return 0


if __name__ == "__main__":
    sys.exit(main())
