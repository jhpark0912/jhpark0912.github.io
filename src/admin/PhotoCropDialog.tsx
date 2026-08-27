/**
 * Positioning a photo inside the frame the invitation crops it to.
 *
 * The whole photo is shown, and over it the part that survives the crop is
 * left bright while everything the frame throws away is dimmed. The couple
 * drags that window to where they want it — which is the same rectangle the
 * stored numbers describe, so the invitation shows exactly what was framed
 * here rather than something close to it. See `lib/crop`.
 *
 * Nothing is written until 적용: a crop is fiddled with, and being able to
 * abandon a fiddle is what makes it safe to fiddle.
 */

import {
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { createPortal } from 'react-dom'
import { useLockBodyScroll } from '../hooks/useLockBodyScroll'
import { clampZoom, cropWindow, moveWindow, DEFAULT_CROP, MAX_ZOOM, MIN_ZOOM, ZOOM_STEP, type Crop } from '../lib/crop'
import styles from './PhotoCropDialog.module.css'
// The buttons are the admin page's own; only the stage below is new.
import admin from './Admin.module.css'

/** One arrow key, as a fraction of the photo. Shift moves four times as far. */
const NUDGE = 0.02

interface PhotoCropDialogProps {
  /** Names the photo being framed, e.g. "신랑신부 사진". */
  title: string
  /** Where it lands on the invitation, in the couple's terms. */
  note: string
  src: string
  /** The frame it is cropped to, as width ÷ height. */
  frameRatio: number
  value: Crop
  onCancel: () => void
  onApply: (crop: Crop) => void
}

export function PhotoCropDialog({ title, note, src, frameRatio, value, onCancel, onApply }: PhotoCropDialogProps) {
  const [crop, setCrop] = useState<Crop>(value)
  // Measured from the photo itself rather than taken from the stored width and
  // height, which the cover does not carry at all. Zero until it loads.
  const [photoRatio, setPhotoRatio] = useState(0)
  const stageRef = useRef<HTMLDivElement | null>(null)
  const photoRef = useRef<HTMLImageElement | null>(null)
  const dragFrom = useRef<{ x: number; y: number; crop: Crop } | null>(null)
  const titleId = useId()
  const hintId = useId()

  useLockBodyScroll(true)

  // The caller passes an inline handler, so it is a new function every render;
  // the ref keeps it out of the mount-only effect below.
  const cancelRef = useRef(onCancel)
  useEffect(() => {
    cancelRef.current = onCancel
  })

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null
    stageRef.current?.focus({ preventScroll: true })

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.stopPropagation()
      cancelRef.current()
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      previouslyFocused?.focus({ preventScroll: true })
    }
  }, [])

  /*
   * The photo is already on screen behind the dialog, so it is already in
   * cache, so `load` can fire before React has attached its handler. Reading
   * the size once on mount is what keeps that from leaving the editor with no
   * window in it.
   */
  useEffect(() => {
    const photo = photoRef.current
    if (photo?.complete && photo.naturalHeight) setPhotoRatio(photo.naturalWidth / photo.naturalHeight)
  }, [])

  /*
   * Wheel-to-zoom is attached by hand because React's own wheel listener is
   * passive, and a zoom that also scrolls the dialog behind it is worse than
   * no wheel support at all.
   */
  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return

    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      const step = event.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP
      setCrop((current) => ({ ...current, zoom: clampZoom(current.zoom + step) }))
    }

    stage.addEventListener('wheel', onWheel, { passive: false })
    return () => stage.removeEventListener('wheel', onWheel)
  }, [])

  const nudge = (dx: number, dy: number) =>
    setCrop((current) => moveWindow(photoRatio, frameRatio, current, dx, dy))

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!photoRatio) return
    event.currentTarget.setPointerCapture(event.pointerId)
    dragFrom.current = { x: event.clientX, y: event.clientY, crop }
  }

  /*
   * Measured from where the drag started rather than from the last event, so
   * the window stays under the finger. Adding up small steps instead would
   * lose whatever an edge clamped away: drag past the left edge and come back
   * a little, and the window would set off again while the finger was still
   * far outside — the crop moving on its own, which is what it looks like.
   */
  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const from = dragFrom.current
    if (!from) return

    const stage = stageRef.current?.getBoundingClientRect()
    if (!stage || stage.width === 0 || stage.height === 0) return

    const dx = (event.clientX - from.x) / stage.width
    const dy = (event.clientY - from.y) / stage.height
    // The wheel can zoom mid-drag, so the size comes from the live crop while
    // the position comes from the one the drag started on.
    setCrop((current) => moveWindow(photoRatio, frameRatio, { ...from.crop, zoom: current.zoom }, dx, dy))
  }

  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? NUDGE * 4 : NUDGE
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    }
    const move = moves[event.key]
    if (!move) return

    event.preventDefault()
    nudge(move[0], move[1])
  }

  const frame = photoRatio ? cropWindow(photoRatio, frameRatio, crop) : null
  const percent = Math.round(clampZoom(crop.zoom) * 100)

  return createPortal(
    <div className={styles.overlay} role="presentation" onClick={onCancel}>
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.head}>
          <div>
            <h2 id={titleId} className={styles.title}>
              {title} 위치·크기
            </h2>
            <p className={styles.note}>{note}</p>
          </div>
          <button type="button" className={admin.iconButton} onClick={onCancel} aria-label="닫기">
            ✕
          </button>
        </div>

        <div className={styles.stageWrap}>
          <div
            ref={stageRef}
            className={styles.stage}
            role="group"
            tabIndex={0}
            aria-label={`${title} 위치`}
            aria-describedby={hintId}
            style={photoRatio ? ({ '--photo-ratio': String(photoRatio) } as CSSProperties) : undefined}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={() => (dragFrom.current = null)}
            onPointerCancel={() => (dragFrom.current = null)}
            onKeyDown={onKeyDown}
          >
            <img
              ref={photoRef}
              src={src}
              alt=""
              className={styles.photo}
              draggable={false}
              onLoad={(event) => setPhotoRatio(event.currentTarget.naturalWidth / event.currentTarget.naturalHeight)}
            />
            {frame && (
              <div
                className={styles.window}
                aria-hidden="true"
                style={{
                  left: `${frame.left * 100}%`,
                  top: `${frame.top * 100}%`,
                  width: `${frame.width * 100}%`,
                  height: `${frame.height * 100}%`,
                }}
              />
            )}
          </div>
        </div>

        <div className={styles.controls}>
          <p id={hintId} className={styles.hint}>
            밝은 부분만 청첩장에 보입니다. 끌어서 옮기고, 아래에서 키우세요. (방향키로도 옮길 수 있습니다)
          </p>

          <label className={styles.zoomRow}>
            <span aria-hidden="true">크기</span>
            <input
              type="range"
              min={MIN_ZOOM * 100}
              max={MAX_ZOOM * 100}
              step={ZOOM_STEP * 100}
              value={percent}
              className={styles.slider}
              aria-label={`${title} 크기`}
              aria-valuetext={`${percent}퍼센트`}
              onChange={(event) => setCrop((current) => ({ ...current, zoom: Number(event.target.value) / 100 }))}
            />
            <span className={styles.zoomValue}>{percent}%</span>
          </label>
        </div>

        <div className={styles.foot}>
          <button
            type="button"
            className={[admin.ghost, styles.reset].join(' ')}
            onClick={() => setCrop({ ...DEFAULT_CROP })}
          >
            처음으로
          </button>
          <button type="button" className={admin.ghost} onClick={onCancel}>
            취소
          </button>
          <button type="button" className={admin.primary} onClick={() => onApply(crop)}>
            적용
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
