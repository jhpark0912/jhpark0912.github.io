/**
 * Cover and gallery management.
 *
 * A picked file is shrunk in the browser and written to its own document
 * immediately — before 임시저장, before 게시하기. That is deliberate: the bytes
 * are the expensive part, and uploading them once means reordering, renaming
 * and previewing afterwards cost nothing. What the draft holds is only the id.
 *
 * The consequence is that a photo removed here still exists in storage until
 * the next 게시하기, which is when nothing points at it any more and it is
 * collected. Removing a photo therefore never breaks the live invitation that
 * is still showing it.
 *
 * Every photo is shown at the crop it will ship at, and that preview is also
 * the button that opens `PhotoCropDialog` to change it.
 */

import { useRef, useState, type ChangeEvent, type CSSProperties, type ReactNode } from 'react'
import { emptyPhoto, type GalleryPhoto, type SpotPhotos } from '../../data/wedding'
import {
  formatBytes,
  preparePhoto,
  savePhoto,
  PhotoTooLargeError,
  COVER_PROFILE,
  GALLERY_PROFILE,
  type PhotoProfile,
} from '../../lib/photos'
import { DEFAULT_CROP, type Crop } from '../../lib/crop'
import { defaultContent, SPOT_KEYS } from '../../lib/siteConfig'
import { useDraft } from '../DraftProvider'
import { PhotoCropDialog } from '../PhotoCropDialog'
import { move } from '../Fields'
import styles from '../Admin.module.css'

/**
 * Where each between-sections photo lands, said in the couple's own terms.
 *
 * The `ratio` repeats the crop each slot is rendered at on the invitation so
 * the preview and the crop editor can show the same crop. It is duplicated
 * rather than imported because the invitation states it at the call site — the
 * couple band as a prop, the other two by taking `SpotPhoto`'s default.
 */
const SPOT_LABELS: Record<keyof SpotPhotos, { title: string; note: string; ratio: number }> = {
  hosts: {
    title: '신랑신부 사진',
    note: '초대합니다의 부모님·신랑신부 이름 바로 위에, 좌우를 채우는 낮은 띠로 놓입니다. 가로로 찍은 상반신 사진을 권합니다.',
    ratio: 16 / 9,
  },
  calendar: { title: '일정 사진', note: '예식 일정의 날짜 아래, 달력 위에 놓입니다.', ratio: 4 / 5 },
  farewell: { title: '인사 사진', note: '맨 아래 마지막 인사 바로 위에 놓입니다.', ratio: 4 / 5 },
}

/** The carousel's own frame. */
const GALLERY_RATIO = 4 / 5
/** A phone screen, which is the frame the cover is cropped to. */
const COVER_RATIO = 9 / 16

/** Roughly what a guest downloads for the gallery; past this it starts to drag. */
const HEAVY_TOTAL = 2_600_000

/**
 * Weight of the uploaded photos only.
 *
 * A photo bundled under `public/images/` costs the guest a normal cached image
 * request, not a document read, so counting the length of its path would report
 * a number that means nothing.
 */
function uploadedBytes(content: {
  gallery: GalleryPhoto[]
  cover: { photoId?: string; image: string }
  photos: SpotPhotos
}): number {
  const gallery = content.gallery.reduce((sum, photo) => sum + (photo.photoId ? photo.src.length : 0), 0)
  const spots = SPOT_KEYS.reduce((sum, key) => {
    const photo = content.photos[key]
    return sum + (photo.photoId ? photo.src.length : 0)
  }, 0)
  return gallery + spots + (content.cover.photoId ? content.cover.image.length : 0)
}

/** Every photo carries the three numbers optionally; the editor needs all three. */
function cropOf(photo: { focusX?: number; focusY?: number; zoom?: number }): Crop {
  return {
    focusX: photo.focusX ?? DEFAULT_CROP.focusX,
    focusY: photo.focusY ?? DEFAULT_CROP.focusY,
    zoom: photo.zoom ?? DEFAULT_CROP.zoom,
  }
}

/**
 * A photo at the crop it will ship at, and the way in to changing it.
 *
 * An empty slot falls back to a small grey placeholder rather than a button:
 * at the preview's full width it would reserve a lot of nothing, and there is
 * no crop to adjust until a photo exists.
 */
function CropPreview({
  src,
  crop,
  ratio,
  label,
  className,
  style,
  children,
  onOpen,
}: {
  src: string
  crop: Crop
  ratio: number
  /** Names the photo in the button's accessible label. */
  label: string
  className: string
  style?: CSSProperties
  /** The gallery's position badge; nothing elsewhere. */
  children?: ReactNode
  onOpen: () => void
}) {
  const framing = {
    '--preview-ratio': String(ratio),
    '--preview-focus-x': `${crop.focusX}%`,
    '--preview-focus-y': `${crop.focusY}%`,
    '--preview-zoom': String(crop.zoom),
    ...style,
  } as CSSProperties

  if (!src) {
    return (
      <div className={[className, styles.previewEmpty].join(' ')} style={framing}>
        <span className={styles.thumbEmpty}>사진 없음</span>
      </div>
    )
  }

  return (
    <button
      type="button"
      className={[className, styles.previewButton].join(' ')}
      style={framing}
      onClick={onOpen}
      aria-label={`${label} 위치·크기 조절`}
    >
      <img src={src} alt="" />
      <span className={styles.previewChip} aria-hidden="true">
        위치·크기
      </span>
      {children}
    </button>
  )
}

/**
 * One between-sections photo.
 *
 * Each row owns its file input rather than sharing one, which is what lets the
 * input be cleared after a pick — clearing is what makes choosing the same file
 * twice work at all.
 */
function SpotPhotoRow({
  photo,
  title,
  note,
  ratio,
  busy,
  onPick,
  onClear,
  onAlt,
  onCrop,
}: {
  photo: GalleryPhoto
  title: string
  note: string
  ratio: number
  busy: boolean
  onPick: (files: FileList | null, done: () => void) => void
  onClear: () => void
  onAlt: (alt: string) => void
  onCrop: () => void
}) {
  const input = useRef<HTMLInputElement | null>(null)
  const chosen = Boolean(photo.photoId || photo.src)

  return (
    <div className={styles.spotRow}>
      <h3 className={styles.subListTitle}>{title}</h3>
      <p className={styles.groupNote}>{note}</p>

      <div className={styles.coverRow}>
        <CropPreview
          src={photo.src}
          crop={cropOf(photo)}
          ratio={ratio}
          label={title}
          className={styles.spotPreview}
          onOpen={onCrop}
        />

        <div className={styles.coverActions}>
          <button type="button" className={styles.ghost} onClick={() => input.current?.click()} disabled={busy}>
            {chosen ? '사진 바꾸기' : '사진 고르기'}
          </button>
          {/*
            Offered only once there is a photo: a button that opens an editor
            with nothing in it is a dead end the couple has to back out of.
          */}
          {chosen && (
            <button type="button" className={styles.ghost} onClick={onCrop}>
              위치·크기 조절
            </button>
          )}
          {chosen && (
            <button type="button" className={styles.ghost} onClick={onClear}>
              사진 빼기
            </button>
          )}

          <label className={styles.editField}>
            <span className={styles.editLabel}>
              설명
              <span className={styles.editHint}>화면에 보이지 않고, 사진이 안 뜰 때만 읽힙니다</span>
            </span>
            <input className={styles.editInput} value={photo.alt} onChange={(event) => onAlt(event.target.value)} />
          </label>
        </div>
      </div>

      <input
        ref={input}
        type="file"
        accept="image/*"
        className={styles.fileInput}
        onChange={(event) =>
          onPick(event.target.files, () => {
            if (input.current) input.current.value = ''
          })
        }
      />
    </div>
  )
}

/** Which photo the crop editor is open on, if any. */
type CropTarget =
  | { kind: 'cover' }
  | { kind: 'spot'; key: keyof SpotPhotos }
  | { kind: 'gallery'; index: number }

export function PhotosPanel() {
  const { config, editContent } = useDraft()
  const content = config.content
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [cropping, setCropping] = useState<CropTarget | null>(null)
  const coverInput = useRef<HTMLInputElement | null>(null)
  const galleryInput = useRef<HTMLInputElement | null>(null)

  const upload = async (
    files: FileList | null,
    onDone: (photo: GalleryPhoto) => void,
    what: string,
    profile: PhotoProfile = GALLERY_PROFILE,
  ) => {
    if (!files || files.length === 0) return

    setError('')
    const picked = [...files]

    for (const [index, file] of picked.entries()) {
      setBusy(picked.length > 1 ? `${what} ${index + 1}/${picked.length}장 올리는 중…` : `${what} 올리는 중…`)
      try {
        const prepared = await preparePhoto(file, profile)
        const stored = await savePhoto(prepared)
        onDone({
          photoId: stored.id,
          src: stored.src,
          alt: file.name.replace(/\.[^.]+$/, ''),
          width: stored.width,
          height: stored.height,
        })
      } catch (failure) {
        setError(
          failure instanceof PhotoTooLargeError
            ? `${file.name}은(는) 충분히 줄이지 못했습니다. 다른 사진을 사용해 주세요.`
            : `${file.name}을(를) 올리지 못했습니다. 잠시 후 다시 시도해 주세요.`,
        )
        break
      }
    }

    setBusy('')
  }

  const onCoverPicked = (event: ChangeEvent<HTMLInputElement>) => {
    void upload(
      event.target.files,
      (photo) =>
        editContent((current) => ({
          ...current,
          cover: { photoId: photo.photoId, image: photo.src, alt: current.cover.alt || photo.alt },
        })),
      '커버 사진을',
      // The cover fills the whole viewport, so it is the one photo a desktop
      // screen can out-resolve. It gets the larger allowance.
      COVER_PROFILE,
    ).finally(() => {
      // Clearing the input is what makes picking the same file twice work.
      if (coverInput.current) coverInput.current.value = ''
    })
  }

  const onGalleryPicked = (event: ChangeEvent<HTMLInputElement>) => {
    void upload(
      event.target.files,
      (photo) => editContent((current) => ({ ...current, gallery: [...current.gallery, photo] })),
      '사진을',
    ).finally(() => {
      if (galleryInput.current) galleryInput.current.value = ''
    })
  }

  const setGallery = (gallery: GalleryPhoto[]) => editContent((current) => ({ ...current, gallery }))

  const setSpot = (key: keyof SpotPhotos, photo: GalleryPhoto) =>
    editContent((current) => ({ ...current, photos: { ...current.photos, [key]: photo } }))

  /** What the dialog needs to draw itself, or null once the photo is gone. */
  const editorFor = (target: CropTarget) => {
    if (target.kind === 'cover') {
      if (!content.cover.image) return null
      return {
        title: '커버 사진',
        note: '청첩장을 열었을 때 화면을 가득 채우는 사진입니다. 세로로 긴 화면에 맞춰 잘립니다.',
        src: content.cover.image,
        frameRatio: COVER_RATIO,
        value: cropOf(content.cover),
      }
    }

    if (target.kind === 'spot') {
      const photo = content.photos[target.key]
      if (!photo.src) return null
      const label = SPOT_LABELS[target.key]
      return { title: label.title, note: label.note, src: photo.src, frameRatio: label.ratio, value: cropOf(photo) }
    }

    const photo = content.gallery[target.index]
    if (!photo?.src) return null
    return {
      title: `${target.index + 1}번째 사진`,
      note: '갤러리는 세로 4:5 틀에 맞춰 잘립니다. 크게 보기로 열면 사진 전체가 보입니다.',
      src: photo.src,
      frameRatio: GALLERY_RATIO,
      value: cropOf(photo),
    }
  }

  const applyCrop = (target: CropTarget, crop: Crop) => {
    if (target.kind === 'cover') {
      editContent((current) => ({ ...current, cover: { ...current.cover, ...crop } }))
    } else if (target.kind === 'spot') {
      setSpot(target.key, { ...content.photos[target.key], ...crop })
    } else {
      setGallery(content.gallery.map((item, index) => (index === target.index ? { ...item, ...crop } : item)))
    }
    setCropping(null)
  }

  const weight = uploadedBytes(content)
  // Optional on the type, so a fallback is needed even though both the bundled
  // cover and every stored config carry them.
  const coverDefaults = defaultContent().cover
  const coverCrop = cropOf({
    focusX: content.cover.focusX ?? coverDefaults.focusX,
    focusY: content.cover.focusY ?? coverDefaults.focusY,
    zoom: content.cover.zoom ?? coverDefaults.zoom,
  })
  const editor = cropping && editorFor(cropping)

  return (
    <div className={styles.editor}>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      {busy && <p className={styles.uploading}>{busy}</p>}

      <section className={styles.group}>
        <h2 className={styles.groupTitle}>커버 사진</h2>
        <p className={styles.groupNote}>청첩장을 열었을 때 화면을 가득 채우는 사진입니다.</p>

        <div className={styles.coverRow}>
          {/*
            Framed as the phone frames it — the whole screen. Narrower than the
            other previews: at the shared width a 9:16 frame is 500px tall.
          */}
          <CropPreview
            src={content.cover.image}
            crop={coverCrop}
            ratio={COVER_RATIO}
            label="커버 사진"
            className={styles.spotPreview}
            style={{ '--preview-max': '168px' } as CSSProperties}
            onOpen={() => setCropping({ kind: 'cover' })}
          />

          <div className={styles.coverActions}>
            <button
              type="button"
              className={styles.ghost}
              onClick={() => coverInput.current?.click()}
              disabled={Boolean(busy)}
            >
              사진 고르기
            </button>
            {content.cover.image && (
              <button type="button" className={styles.ghost} onClick={() => setCropping({ kind: 'cover' })}>
                위치·크기 조절
              </button>
            )}
            {content.cover.photoId && (
              <button
                type="button"
                className={styles.ghost}
                onClick={() =>
                  editContent((current) => ({ ...current, cover: { ...defaultContent().cover, alt: current.cover.alt } }))
                }
              >
                기본 이미지로
              </button>
            )}

            <label className={styles.editField}>
              <span className={styles.editLabel}>
                설명
                <span className={styles.editHint}>화면에 보이지 않고, 사진이 안 뜰 때만 읽힙니다</span>
              </span>
              <input
                className={styles.editInput}
                value={content.cover.alt}
                onChange={(event) =>
                  editContent((current) => ({ ...current, cover: { ...current.cover, alt: event.target.value } }))
                }
              />
            </label>
          </div>
        </div>

        <input
          ref={coverInput}
          type="file"
          accept="image/*"
          className={styles.fileInput}
          onChange={onCoverPicked}
        />
      </section>

      <section className={styles.group}>
        <h2 className={styles.groupTitle}>사이사이 사진</h2>
        <p className={styles.groupNote}>
          청첩장을 읽어 내려가는 중간에 한 장씩 놓이는 사진입니다. 고르지 않으면 그 자리는 지금처럼 비어 있습니다.
        </p>

        {SPOT_KEYS.map((key) => (
          <SpotPhotoRow
            key={key}
            photo={content.photos[key]}
            title={SPOT_LABELS[key].title}
            note={SPOT_LABELS[key].note}
            ratio={SPOT_LABELS[key].ratio}
            busy={Boolean(busy)}
            onPick={(files, done) => {
              void upload(files, (photo) => setSpot(key, photo), `${SPOT_LABELS[key].title}을`).finally(done)
            }}
            onClear={() => setSpot(key, emptyPhoto())}
            onAlt={(alt) => setSpot(key, { ...content.photos[key], alt })}
            onCrop={() => setCropping({ kind: 'spot', key })}
          />
        ))}
      </section>

      <section className={styles.group}>
        <div className={styles.subListHead}>
          <h2 className={styles.groupTitle}>갤러리</h2>
          <button
            type="button"
            className={styles.ghost}
            onClick={() => galleryInput.current?.click()}
            disabled={Boolean(busy)}
          >
            사진 추가
          </button>
        </div>
        <p className={styles.groupNote}>
          {content.gallery.length}장
          {weight > 0 && ` · 올린 사진 약 ${formatBytes(weight)}`}
          {weight > HEAVY_TOTAL && ' — 하객이 받아야 할 용량이 큽니다. 장수를 줄이는 편이 좋습니다.'}
        </p>

        <input
          ref={galleryInput}
          type="file"
          accept="image/*"
          multiple
          className={styles.fileInput}
          onChange={onGalleryPicked}
        />

        {content.gallery.length === 0 ? (
          <p className={styles.emptyNote}>등록된 사진이 없습니다. 사진이 하나도 없으면 갤러리 섹션은 숨겨집니다.</p>
        ) : (
          <ul className={styles.photoGrid}>
            {content.gallery.map((photo, index) => (
              <li key={photo.photoId ?? photo.src} className={styles.photoCard}>
                {/* Already the carousel's own 4:5, so the thumbnail is the crop. */}
                <CropPreview
                  src={photo.src}
                  crop={cropOf(photo)}
                  ratio={GALLERY_RATIO}
                  label={`${index + 1}번째 사진`}
                  className={styles.photoThumb}
                  onOpen={() => setCropping({ kind: 'gallery', index })}
                >
                  <span className={styles.photoIndex}>{index + 1}</span>
                </CropPreview>

                <input
                  className={styles.editInput}
                  value={photo.alt}
                  aria-label={`${index + 1}번째 사진 설명`}
                  placeholder="사진 설명"
                  onChange={(event) =>
                    setGallery(content.gallery.map((item, i) => (i === index ? { ...item, alt: event.target.value } : item)))
                  }
                />

                <div className={styles.photoActions}>
                  <button
                    type="button"
                    className={styles.iconButton}
                    onClick={() => setGallery(move(content.gallery, index, index - 1))}
                    disabled={index === 0}
                    aria-label={`${index + 1}번째 사진 앞으로`}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className={styles.iconButton}
                    onClick={() => setGallery(move(content.gallery, index, index + 1))}
                    disabled={index === content.gallery.length - 1}
                    aria-label={`${index + 1}번째 사진 뒤로`}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className={styles.danger}
                    onClick={() => setGallery(content.gallery.filter((_, i) => i !== index))}
                  >
                    삭제
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {editor && cropping && (
        <PhotoCropDialog
          {...editor}
          onCancel={() => setCropping(null)}
          onApply={(crop) => applyCrop(cropping, crop)}
        />
      )}
    </div>
  )
}
