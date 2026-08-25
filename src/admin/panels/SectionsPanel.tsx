/**
 * The order the invitation's sections appear in, and which of them appear.
 *
 * Reordering is done with buttons rather than drag-and-drop: the couple will be
 * doing this on a phone, where a drag competes with the page's own scrolling,
 * and buttons are the version that also works with a keyboard and a screen
 * reader.
 */

import { SECTION_LABELS } from '../../data/sections'
import { useDraft } from '../DraftProvider'
import { move } from '../Fields'
import styles from '../Admin.module.css'

export function SectionsPanel() {
  const { config, setSections } = useDraft()
  const sections = config.sections

  return (
    <div className={styles.editor}>
      <section className={styles.group}>
        <h2 className={styles.groupTitle}>메뉴 순서</h2>
        <p className={styles.groupNote}>
          표지와 마지막 인사는 자리가 정해져 있어 목록에 없습니다. 숨긴 섹션은 청첩장에 나타나지 않지만 내용은 그대로
          남아 있어, 다시 켜면 되돌아옵니다.
        </p>

        <ul className={styles.orderList}>
          {sections.map((section, index) => (
            <li key={section.id} className={styles.orderRow} data-hidden={!section.visible}>
              <span className={styles.orderNumber}>{index + 1}</span>
              <span className={styles.orderLabel}>{SECTION_LABELS[section.id]}</span>

              <span className={styles.orderActions}>
                <button
                  type="button"
                  className={styles.iconButton}
                  onClick={() => setSections(move(sections, index, index - 1))}
                  disabled={index === 0}
                  aria-label={`${SECTION_LABELS[section.id]} 위로`}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className={styles.iconButton}
                  onClick={() => setSections(move(sections, index, index + 1))}
                  disabled={index === sections.length - 1}
                  aria-label={`${SECTION_LABELS[section.id]} 아래로`}
                >
                  ↓
                </button>
                <button
                  type="button"
                  className={styles.toggle}
                  aria-pressed={section.visible}
                  onClick={() =>
                    setSections(
                      sections.map((item, i) => (i === index ? { ...item, visible: !item.visible } : item)),
                    )
                  }
                >
                  {section.visible ? '표시' : '숨김'}
                </button>
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
