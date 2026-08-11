import { useMemo } from 'react'
import { sortSelections } from '../store.js'

export default function SelectionPanel({
  selections,
  targetCount,
  onTargetCountChange,
  onFocusPassage,
  onRemove,
  onClear,
  onGenerate,
  canGenerate,
  duplicates,
}) {
  const sorted = useMemo(() => sortSelections(selections), [selections])
  const count = sorted.length
  const remain = targetCount - count
  const pct = targetCount ? Math.min(100, (count / targetCount) * 100) : 0

  const groups = useMemo(() => {
    const map = new Map()
    sorted.forEach((sel, i) => {
      if (!map.has(sel.passageNo)) map.set(sel.passageNo, [])
      map.get(sel.passageNo).push({ ...sel, order: i + 1 })
    })
    return [...map.entries()]
  }, [sorted])

  return (
    <div className="panel selection-panel" style={{ flex: 1, minHeight: 0 }}>
      <div className="progress-block">
        <div className="progress-numbers">
          <span className="cur">{count}</span>
          <span className="sep">/</span>
          <input
            className="goal-input"
            type="number"
            min={1}
            max={500}
            value={targetCount}
            onChange={(e) => onTargetCountChange(e.target.value)}
            title="총 표제어 개수. 여기서 바로 바꿀 수 있습니다."
            aria-label="총 표제어 개수"
          />
          <span className="remain">
            {remain > 0 ? `${remain}개 남음` : remain === 0 ? '목표 달성' : `${-remain}개 초과`}
          </span>
        </div>
        <div className={`progress-bar${remain === 0 ? ' complete' : remain < 0 ? ' over' : ''}`}>
          <i style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="selection-list">
        {count === 0 ? (
          <div className="empty-note">
            아직 선택한 표제어가 없습니다.
            <br />
            지문에서 단어를 클릭하거나
            <br />
            여러 단어를 드래그해보세요.
          </div>
        ) : (
          groups.map(([passageNo, items]) => (
            <div key={passageNo}>
              <div className="sel-group-label">
                <span className="pno-badge">지문 {passageNo}</span>
              </div>
              {items.map((sel) => (
                <div
                  key={sel.id}
                  className={`sel-item${sel.origin === 'ai' ? ' ai' : ''}${
                    duplicates?.flaggedIds?.has(sel.id) ? ' dup' : ''
                  }`}
                  onClick={() => onFocusPassage(sel.passageId)}
                  title={dupTitle(duplicates, sel) || sel.sentence}
                >
                  <span className="idx">{sel.order}</span>
                  <span className="surface">{sel.surface}</span>
                  {duplicates?.flaggedIds?.has(sel.id) && <span className="dup-tag">중복</span>}
                  <span className="pos-tag">{sel.pos}</span>
                  <button
                    className="rm"
                    onClick={(e) => {
                      e.stopPropagation()
                      onRemove(sel.id)
                    }}
                    title="선택 해제"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          ))
        )}
      </div>

      {duplicates?.total > 0 && (
        <div className="dup-summary">
          중복 의심 {duplicates.total}건 — 생성 전 확인 창에서 정리할 수 있습니다.
        </div>
      )}

      <div className="panel-footer">
        <button className="btn primary" disabled={!canGenerate} onClick={onGenerate}>
          파생어·유의어·반의어 생성 →
        </button>
        {count > 0 && (
          <button className="btn ghost sm" onClick={onClear}>
            전체 선택 해제
          </button>
        )}
      </div>
    </div>
  )
}

/** 이 항목이 무엇과 겹치는지 마우스를 올렸을 때 알려준다. */
function dupTitle(duplicates, sel) {
  if (!duplicates?.flaggedIds?.has(sel.id)) return ''

  const others = (group) => group.filter((s) => s.id !== sel.id).map((s) => s.surface).join(', ')

  const exact = duplicates.exact.find((g) => g.some((s) => s.id === sel.id))
  if (exact) return `${others(exact)} 와(과) 같은 표제어가 됩니다`

  const derived = duplicates.derived.find((g) => g.some((s) => s.id === sel.id))
  if (derived) return `${others(derived)} 와(과) 같은 뿌리에서 나온 말입니다`

  return ''
}
