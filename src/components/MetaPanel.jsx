import { useMemo } from 'react'
import { summarize } from '../lib/posLite.js'

const LEVEL_CLASS = { 상: 'high', 중: 'mid', 하: 'low' }

export default function MetaPanel({ selections, passages, onFocusPassage }) {
  const stats = useMemo(() => summarize(selections), [selections])
  const maxPos = Math.max(1, ...stats.posCounts.map((p) => p.count))
  const byPassage = useMemo(() => {
    const map = new Map(stats.byPassage.map((b) => [b.no, b.count]))
    return passages.map((p) => ({ ...p, count: map.get(p.no) || 0 }))
  }, [stats.byPassage, passages])

  return (
    <div className="panel meta-panel" style={{ flex: 1, minHeight: 0 }}>
      <div className="panel-title">메타 정보</div>
      <div className="meta-body">
        <div className="meta-section">
          <h4>구성</h4>
          <div className="meta-row">
            <span className="k">단어</span>
            <span className="bar">
              <i style={{ width: `${pct(stats.words, stats.total)}%` }} />
            </span>
            <span className="v">{stats.words}</span>
          </div>
          <div className="meta-row">
            <span className="k">어구</span>
            <span className="bar">
              <i style={{ width: `${pct(stats.phrases, stats.total)}%` }} />
            </span>
            <span className="v">{stats.phrases}</span>
          </div>
          {stats.total > 0 && (
            <p className="hint" style={{ margin: '6px 0 0' }}>
              어구 비중 {Math.round(pct(stats.phrases, stats.total))}%
            </p>
          )}
        </div>

        <div className="meta-section">
          <h4>품사별 (추정)</h4>
          {stats.posCounts.length === 0 ? (
            <p className="hint" style={{ margin: 0 }}>
              선택된 표제어가 없습니다.
            </p>
          ) : (
            stats.posCounts.map((p) => (
              <div className="meta-row" key={p.pos}>
                <span className="k">{p.pos}</span>
                <span className="bar">
                  <i style={{ width: `${pct(p.count, maxPos)}%` }} />
                </span>
                <span className="v">{p.count}</span>
              </div>
            ))
          )}
          <p className="hint" style={{ margin: '6px 0 0', fontSize: 11 }}>
            접미사로 추정한 값입니다. 정확한 품사는 생성 단계에서 출처 문장을 근거로 다시 판정합니다.
          </p>
        </div>

        <div className="meta-section">
          <h4>난이도 (추정)</h4>
          <div className="level-grid">
            {stats.levelCounts.map((l) => (
              <div className={`level-cell lv-${LEVEL_CLASS[l.level]}`} key={l.level}>
                <div className="lv-name">{l.level}</div>
                <div className="lv-count">{l.count}</div>
                <div className="lv-pct">{stats.total ? Math.round((l.count / stats.total) * 100) : 0}%</div>
              </div>
            ))}
          </div>
          <p className="hint" style={{ margin: '8px 0 0', fontSize: 11 }}>
            음절 수·파생 접사·기초 어휘 여부로 추정합니다.
          </p>
        </div>

        <div className="meta-section">
          <h4>지문별 분포</h4>
          <div className="meta-passage-grid">
            {byPassage.map((p) => (
              <div
                key={p.id}
                className={`meta-passage-cell${p.count === 0 ? ' zero' : ''}`}
                onClick={() => onFocusPassage(p.id)}
                title={`지문 ${p.no}`}
              >
                <div className="pno">{p.no}</div>
                <div className="pcount">{p.count}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function pct(n, total) {
  return total ? (n / total) * 100 : 0
}
