import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { tokenize, surfaceOf } from '../lib/tokenize.js'

/**
 * 지문 카드.
 * 포커스된 카드만 본문을 펼치고 나머지는 한 줄로 접는다.
 * 단어 클릭 = 한 단어 선택, 드래그 = 여러 단어(어구) 선택, 선택된 자리를 다시 누르면 해제.
 */
function PassageCard({ passage, selections, focused, showKorean, onFocus, onToggleRange }) {
  const tokens = useMemo(() => tokenize(passage.english), [passage.english])
  const [drag, setDrag] = useState(null)
  const cardRef = useRef(null)

  // 토큰 인덱스 → 선택 정보
  const picked = useMemo(() => {
    const map = new Map()
    for (const sel of selections) {
      for (let i = sel.from; i <= sel.to; i += 1) map.set(i, sel)
    }
    return map
  }, [selections])

  useEffect(() => {
    if (focused) cardRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [focused])

  const commit = useCallback(
    (from, to) => {
      const { surface, start, end, from: a, to: b } = surfaceOf(passage.english, tokens, from, to)
      if (!surface) return
      onToggleRange({ passageId: passage.id, from: a, to: b, start, end, surface })
    },
    [onToggleRange, passage.english, passage.id, tokens]
  )

  useEffect(() => {
    if (!drag) return undefined
    const onUp = () => {
      commit(drag.from, drag.to)
      setDrag(null)
    }
    window.addEventListener('mouseup', onUp)
    return () => window.removeEventListener('mouseup', onUp)
  }, [drag, commit])

  const dragRange = drag ? [Math.min(drag.from, drag.to), Math.max(drag.from, drag.to)] : null

  if (!focused) {
    return (
      <div className="card" ref={cardRef}>
        <div className="card-head" onClick={() => onFocus(passage.id)}>
          <span className="c-no">지문 {passage.no}</span>
          <span className="c-peek">{passage.english}</span>
          <span className="c-badges">
            {selections.length > 0 && <span className="count-pill">{selections.length}</span>}
            <span className="hint">펼치기</span>
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="card focused" ref={cardRef}>
      <div className="card-head" onClick={() => onFocus(null)}>
        <span className="c-no">지문 {passage.no}</span>
        <span className="c-peek" style={{ color: 'var(--text-muted)' }}>
          클릭 = 단어 선택 · 드래그 = 어구 선택 · 다시 클릭 = 해제
        </span>
        <span className="c-badges">
          {selections.length > 0 && <span className="count-pill">{selections.length}</span>}
          <span className="hint">접기</span>
        </span>
      </div>

      <div className="card-body">
        <div className="passage-text" onMouseLeave={() => drag && setDrag(null)}>
          {tokens.map((t) => {
            const sel = picked.get(t.i)
            if (!t.isWord) {
              // 어구 안쪽의 공백·부호도 함께 칠해야 한 덩어리로 보인다
              if (!sel) return <span key={t.i}>{t.text}</span>
              return (
                <span key={t.i} className={`tok picked${sel.origin === 'ai' ? ' ai' : ''}`}>
                  {t.text}
                </span>
              )
            }
            const inDrag = dragRange && t.i >= dragRange[0] && t.i <= dragRange[1]
            const cls = [
              'tok',
              'word',
              sel ? 'picked' : '',
              sel?.origin === 'ai' ? 'ai' : '',
              inDrag && !sel ? 'dragging' : '',
            ]
              .filter(Boolean)
              .join(' ')
            return (
              <span
                key={t.i}
                className={cls}
                onMouseDown={(e) => {
                  e.preventDefault()
                  setDrag({ from: t.i, to: t.i })
                }}
                onMouseEnter={() => drag && setDrag((d) => ({ ...d, to: t.i }))}
                title={sel ? `선택됨: ${sel.surface}` : undefined}
              >
                {t.text}
              </span>
            )
          })}
        </div>

        {showKorean && passage.korean && <div className="card-korean">{passage.korean}</div>}
      </div>
    </div>
  )
}

export default memo(PassageCard)
