#!/usr/bin/env python3
"""
Composite a product image onto a tablet screen in a mockup video.
Uses manually defined screen corners with linear interpolation for camera drift.

Usage:
  python3 composite-video-mockup.py <product_image> [template_video] [output_video]
"""
import sys
import os
import cv2
import numpy as np

# Screen corners for the tablet mockup video (video-mockup-test.mp4)
# Defined on frame 0 and frame 60 (mid), linearly interpolated for camera push-in.
# Format: [top-left, top-right, bottom-right, bottom-left]
CORNERS_FRAME_0 = np.array([
    [255, 308],   # TL
    [870, 232],   # TR
    [955, 555],   # BR
    [225, 585],   # BL
], dtype=np.float32)

CORNERS_FRAME_60 = np.array([
    [200, 308],   # TL
    [820, 222],   # TR
    [830, 560],   # BR
    [115, 593],   # BL
], dtype=np.float32)


def interpolate_corners(frame_idx, total_frames):
    """Linearly interpolate corners between frame 0 and mid, then extrapolate."""
    t = frame_idx / max(total_frames - 1, 1)
    return CORNERS_FRAME_0 + t * 2 * (CORNERS_FRAME_60 - CORNERS_FRAME_0)


def composite_frame(frame, product_img, corners, opacity=0.85):
    """Warp product image onto the screen region and blend."""
    h, w = product_img.shape[:2]
    src_pts = np.array([[0, 0], [w, 0], [w, h], [0, h]], dtype=np.float32)
    M = cv2.getPerspectiveTransform(src_pts, corners)

    warped = cv2.warpPerspective(product_img, M, (frame.shape[1], frame.shape[0]))

    mask = np.zeros(frame.shape[:2], dtype=np.uint8)
    cv2.fillConvexPoly(mask, corners.astype(np.int32), 255)

    # Inset mask to avoid bezel overlap
    mask = cv2.erode(mask, np.ones((7, 7), np.uint8), iterations=1)

    # Feather edges
    mask_float = cv2.GaussianBlur(mask.astype(np.float32) / 255.0, (9, 9), 3)
    mask_float = (mask_float * opacity)[:, :, np.newaxis]

    result = frame.astype(np.float32) * (1 - mask_float) + warped.astype(np.float32) * mask_float
    return result.astype(np.uint8)


def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))

    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    product_path = sys.argv[1]
    template_path = sys.argv[2] if len(sys.argv) > 2 else os.path.join(script_dir, 'products/mockups/video-mockup-test.mp4')
    output_path = sys.argv[3] if len(sys.argv) > 3 else os.path.join(script_dir, 'products/mockups/video-composite-output.mp4')

    product_img = cv2.imread(product_path)
    if product_img is None:
        print(f"Error: couldn't read {product_path}")
        sys.exit(1)

    cap = cv2.VideoCapture(template_path)
    fps = cap.get(cv2.CAP_PROP_FPS)
    w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(output_path, fourcc, fps, (w, h))

    print(f"Template: {w}x{h} @ {fps}fps, {total} frames")
    print(f"Product:  {product_img.shape[1]}x{product_img.shape[0]}")
    print(f"Output:   {output_path}")

    idx = 0
    while True:
        ret, frame = cap.read()
        if not ret:
            break
        corners = interpolate_corners(idx, total)
        result = composite_frame(frame, product_img, corners)
        out.write(result)
        idx += 1
        if idx % 24 == 0:
            print(f"  Frame {idx}/{total}")

    cap.release()
    out.release()

    size_mb = os.path.getsize(output_path) / 1024 / 1024
    print(f"\n✅ Done! {idx} frames, {size_mb:.1f} MB")
    print(f"Output: {output_path}")


if __name__ == '__main__':
    main()
