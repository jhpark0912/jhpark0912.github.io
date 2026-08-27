/**
 * Which rectangle of a photo survives the frame it is placed in.
 *
 * The invitation crops with `object-fit: cover`, an `object-position` of
 * `focusX% focusY%`, and a `transform: scale(zoom)` anchored on that same
 * point. Working that pipeline through for one axis collapses it to something
 * much easier to draw:
 *
 *     visible width = photo width × min(1, frameRatio / photoRatio) ÷ zoom
 *     visible left  = focusX% × (photo width − visible width)
 *
 * — a window of a fixed size for a given zoom, sitting that far along whatever
 * is left over. So the three stored numbers *are* a draggable rectangle, and
 * the admin page can let the couple drag it directly instead of asking them to
 * imagine what two sliders will do. What they position is the same rectangle a
 * guest ends up seeing, not an approximation of it.
 */

/** Life size: below it the photo would stop filling its frame. */
export const MIN_ZOOM = 1
/** Past this a stored photo starts showing its JPEG rather than its subject. */
export const MAX_ZOOM = 2
/** One notch of the 크기 slider, and of a wheel click over the photo. */
export const ZOOM_STEP = 0.05

export interface Crop {
  focusX: number
  focusY: number
  zoom: number
}

/** All four sides as fractions of the photo's own width or height. */
export interface CropWindow {
  left: number
  top: number
  width: number
  height: number
}

/** The centre of the frame at life size — a photo nobody has adjusted yet. */
export const DEFAULT_CROP: Crop = { focusX: 50, focusY: 50, zoom: MIN_ZOOM }

function clamp(value: number, low: number, high: number): number {
  return Math.min(high, Math.max(low, value))
}

export function clampZoom(zoom: number): number {
  return Number.isFinite(zoom) ? clamp(zoom, MIN_ZOOM, MAX_ZOOM) : MIN_ZOOM
}

/** A photo whose size has not been reported yet must not divide by zero. */
function safeRatio(ratio: number): number {
  return Number.isFinite(ratio) && ratio > 0 ? ratio : 1
}

export function cropWindow(photoRatio: number, frameRatio: number, crop: Crop): CropWindow {
  const photo = safeRatio(photoRatio)
  const frame = safeRatio(frameRatio)
  const zoom = clampZoom(crop.zoom)

  const width = Math.min(1, frame / photo) / zoom
  const height = Math.min(1, photo / frame) / zoom

  return {
    width,
    height,
    left: (clamp(crop.focusX, 0, 100) / 100) * (1 - width),
    top: (clamp(crop.focusY, 0, 100) / 100) * (1 - height),
  }
}

/**
 * Where the focus percentages land after the window is dragged.
 *
 * `dx` and `dy` are fractions of the photo's own width and height, which is
 * what a pointer delta becomes once it is divided by the size the photo is
 * being shown at.
 */
export function moveWindow(photoRatio: number, frameRatio: number, crop: Crop, dx: number, dy: number): Crop {
  const window = cropWindow(photoRatio, frameRatio, crop)
  return {
    zoom: clampZoom(crop.zoom),
    focusX: slide(window.left, window.width, dx, crop.focusX),
    focusY: slide(window.top, window.height, dy, crop.focusY),
  }
}

/**
 * One axis of the drag.
 *
 * An axis whose window already spans the whole photo has nothing to give: a
 * 4:5 photo in a 4:5 frame is cropped on neither side at life size. The focus
 * is returned untouched there rather than clamped to an edge, so that dragging
 * such a photo sideways leaves it where it was instead of snapping it.
 */
function slide(offset: number, span: number, delta: number, focus: number): number {
  const free = 1 - span
  if (free <= 0.0001) return clamp(focus, 0, 100)
  return (clamp(offset + delta, 0, free) / free) * 100
}
