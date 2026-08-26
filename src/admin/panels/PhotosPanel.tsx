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
 */

import { useRef, useState, type ChangeEvent, type CSSProperties } from 'react'
import { emptyPhoto, type GalleryPhoto, type SpotPhotos } from '../../data/wedding'
import { formatBytes, preparePhoto, savePhoto, PhotoTooLargeError } from '../../lib/photos'
import { defaultContent, SPOT_KEYS } from '../../lib/siteConfig'
import { useDraft } from '../DraftProvider'
import { move } from '../Fields'
import styles from '../Admin.module.css'

/**
 * Where each between-sections photo lands, said in the couple's own terms.
 *
 * The `ratio` repeats the crop each slot is rendered at on the invitation so
 * the preview here can show the same crop. It is duplicated rather than
 * imported because the invitation states it at the call site — the couple band
 * as a prop, the other two by taking `SpotPhoto`'s default.
 */
const SPOT_LABELS: Record<keyof SpotPhotos, { title: string; note: string; ratio: string }> = {
  hosts: {
    title: '신랑신부 사진',
    note: '초대합니다의 부모님·신랑신부 이름 바로 위에, 좌우를 채우는 낮은 띠로 놓입니다. 가로로 찍은 상반신 사진을 권합니다.',
    ratio: '16 / 9',
  },
  calendar: { title: '일정 사진', note: '예식 일정의 날짜 아래, 달력 위에 놓입니다.', ratio: '4 / 5' },
  farewell: { title: '인사 사진', note: '맨 아래 마지막 인사 바로 위에 놓입니다.', ratio: '4 / 5' },
}

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

/** The centre of a frame, for a photo that has never been nudged off it. */
const CENTRE = { focusX: 50, focusY: 50 }

/**
 * Where a photo sits inside the frame it is cropped to, on both axes.
 *
 * Both are always offered even though only one of them can move any given
 * photo: a portrait dropped into the couple band is cropped top and bottom and
 * ignores 가로, the same portrait in the 4:5 slots is cropped left and right and
 * ignores 세로. Which one is live flips the moment the couple swaps the photo,
 * so hiding the inert axis would make the survivor look like the only setting
 * that had ever existed. The preview beside them shows which one is doing
 * anything far faster than a sentence could.
 */
function FocusFields({
  focusX,
  focusY,
  zoom,
  name,
  labelled = true,
  onChange,
  onZoom,
}: {
  focusX: number
  focusY: number
  /** Left out where enlarging is not offered — the cover and the gallery. */
  zoom?: number
  /** Names the photo in the sliders' accessible labels, e.g. "커버 사진". */
  name: string
  /** Off in the gallery grid, where the card is too narrow for a heading. */
  labelled?: boolean
  onChange: (focus: { focusX: number; focusY: number }) => void
  onZoom?: (zoom: number) => void
}) {
  const axes = [
    { axis: 'x' as const, label: '가로', value: focusX },
    { axis: 'y' as const, label: '세로', value: focusY },
  ]

  return (
    <div className={styles.focusGroup}>
      {labelled && (
        <span className={styles.editLabel}>
          사진 위치
          <span className={styles.editHint}>틀에 맞춰 잘릴 때 어느 쪽을 남길지 정합니다</span>
        </span>
      )}

      {axes.map(({ axis, label, value }) => (
        <label key={axis} className={styles.focusAxis}>
          <span aria-hidden="true">{label}</span>
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={value}
            className={styles.slider}
            aria-label={`${name} ${label} 위치`}
            onChange={(event) => {
              const next = Number(event.target.value)
              onChange(axis === 'x' ? { focusX: next, focusY } : { focusX, focusY: next })
            }}
          />
        </label>
      ))}

      {/*
        Percent rather than a bare multiplier, and it only goes up: the photo
        already fills its frame at 100, so a smaller number would pull it away
        from the edges rather than show more of it.
      */}
      {zoom !== undefined && onZoom && (
        <label className={styles.focusAxis}>
          <span aria-hidden="true">크기</span>
          <input
            type="range"
            min={100}
            max={200}
            step={5}
            value={Math.round(zoom * 100)}
            className={styles.slider}
            aria-label={`${name} 크기`}
            aria-valuetext={`${Math.round(zoom * 100)}퍼센트`}
            onChange={(event) => onZoom(Number(event.target.value) / 100)}
          />
        </label>
      )}
    </div>
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
  onFocus,
  onZoom,
}: {
  photo: GalleryPhoto
  title: string
  note: string
  ratio: string
  busy: boolean
  onPick: (files: FileList | null, done: () => void) => void
  onClear: () => void
  onAlt: (alt: string) => void
  onFocus: (focus: { focusX: number; focusY: number }) => void
  onZoom: (zoom: number) => void
}) {
  const input = useRef<HTMLInputElement | null>(null)
  const chosen = Boolean(photo.photoId || photo.src)
  const focusX = photo.focusX ?? CENTRE.focusX
  const focusY = photo.focusY ?? CENTRE.focusY
  const zoom = photo.zoom ?? 1

  return (
    <div className={styles.spotRow}>
      <h3 className={styles.subListTitle}>{title}</h3>
      <p className={styles.groupNote}>{note}</p>

      <div className={styles.coverRow}>
        <div
          className={[styles.spotPreview, photo.src ? '' : styles.previewEmpty].filter(Boolean).join(' ')}
          style={
            {
              '--preview-ratio': ratio,
              '--preview-focus-x': `${focusX}%`,
              '--preview-focus-y': `${focusY}%`,
              '--preview-zoom': String(zoom),
            } as CSSProperties
          }
        >
          {photo.src ? <img src={photo.src} alt="" /> : <span className={styles.thumbEmpty}>사진 없음</span>}
        </div>

        <div className={styles.coverActions}>
          <button type="button" className={styles.ghost} onClick={() => input.current?.click()} disabled={busy}>
            {chosen ? '사진 바꾸기' : '사진 고르기'}
          </button>
          {chosen && (
            <button type="button" className={styles.ghost} onClick={onClear}>
              사진 빼기
            </button>
          )}

          {/*
            Offered only once there is a photo: a slider that moves nothing is a
            control the couple has to work out the purpose of before ignoring.
          */}
          {chosen && (
            <FocusFields
              focusX={focusX}
              focusY={focusY}
              zoom={zoom}
              name={title}
              onChange={onFocus}
              onZoom={onZoom}
            />
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

export function PhotosPanel() {
  const { config, editContent } = useDraft()
  const content = config.content
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const coverInput = useRef<HTMLInputElement | null>(null)
  const galleryInput = useRef<HTMLInputElement | null>(null)

  const upload = async (files: FileList | null, onDone: (photo: GalleryPhoto) => void, what: string) => {
    if (!files || files.length === 0) return

    setError('')
    const picked = [...files]

    for (const [index, file] of picked.entries()) {
      setBusy(picked.length > 1 ? `${what} ${index + 1}/${picked.length}장 올리는 중…` : `${what} 올리는 중…`)
      try {
        const prepared = await preparePhoto(file)
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

  const weight = uploadedBytes(content)
  // Optional on the type, so a fallback is needed even though both the bundled
  // cover and every stored config carry them.
  const coverDefaults = defaultContent().cover
  const coverFocus = {
    focusX: content.cover.focusX ?? coverDefaults.focusX ?? CENTRE.focusX,
    focusY: content.cover.focusY ?? coverDefaults.focusY ?? CENTRE.focusY,
  }

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
            Framed as the phone frames it — the whole screen — so the sliders
            below are judged against the crop that actually ships.
          */}
          <div
            className={[styles.spotPreview, content.cover.image ? '' : styles.previewEmpty].filter(Boolean).join(' ')}
            style={
              {
                '--preview-ratio': '9 / 16',
                // Narrower than the others: at the shared width a 9:16 frame is
                // 500px tall and pushes its own sliders off the screen.
                '--preview-max': '168px',
                '--preview-focus-x': `${coverFocus.focusX}%`,
                '--preview-focus-y': `${coverFocus.focusY}%`,
              } as CSSProperties
            }
          >
            {content.cover.image ? (
              <img src={content.cover.image} alt="" />
            ) : (
              <span className={styles.thumbEmpty}>사진 없음</span>
            )}
          </div>

          <div className={styles.coverActions}>
            <button
              type="button"
              className={styles.ghost}
              onClick={() => coverInput.current?.click()}
              disabled={Boolean(busy)}
            >
              사진 고르기
            </button>
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

            {content.cover.image && (
              <FocusFields
                focusX={coverFocus.focusX}
                focusY={coverFocus.focusY}
                name="커버 사진"
                onChange={(focus) => editContent((current) => ({ ...current, cover: { ...current.cover, ...focus } }))}
              />
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
            onFocus={(focus) => setSpot(key, { ...content.photos[key], ...focus })}
            onZoom={(zoom) => setSpot(key, { ...content.photos[key], zoom })}
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
                <div
                  className={styles.photoThumb}
                  style={
                    {
                      '--preview-focus-x': `${photo.focusX ?? CENTRE.focusX}%`,
                      '--preview-focus-y': `${photo.focusY ?? CENTRE.focusY}%`,
                    } as CSSProperties
                  }
                >
                  {photo.src ? <img src={photo.src} alt="" /> : <span className={styles.thumbEmpty}>사진 없음</span>}
                  <span className={styles.photoIndex}>{index + 1}</span>
                </div>

                <FocusFields
                  focusX={photo.focusX ?? CENTRE.focusX}
                  focusY={photo.focusY ?? CENTRE.focusY}
                  name={`${index + 1}번째 사진`}
                  labelled={false}
                  onChange={(focus) =>
                    setGallery(content.gallery.map((item, i) => (i === index ? { ...item, ...focus } : item)))
                  }
                />

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
    </div>
  )
}
