// 단어시험지 생성 화면 — 확정된 단어장을 6개 PART 에 나눠 담고 그 결과를 먼저 보여준다

import { useMemo } from 'react'
import { useStore } from '../store.js'
import { allocate, verbForm, FORM_LABEL, PARTS } from '../lib/quizAllocate.js'

export default function QuizPanel() {
  const { rows, confirmedAt, docTitle, setStep } = useStore()
  const result = useMemo(() => allocate(rows), [rows])
  const { parts, stats, shortages, thirdDetail, ok } = result

  return (
    <div className="setup">
      <div className="setup-inner">
        <p className="setup-lead">
          확정된 단어장 <strong>{rows.length}개</strong> 중 <strong>{stats.required}개</strong>를 6개 PART 에
          나눠 담습니다.
        </p>

        {/* 1. 단어장이 시험지를 감당할 수 있는지 */}
        <div className="panel">
          <div className="panel-title">
            단어장 점검
            {confirmedAt && <span className="confirm-tag">확정 {formatStamp(confirmedAt)}</span>}
          </div>
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="summary-grid">
              <Cell k="쓸 수 있는 표제어" v={stats.usable} sub={stats.total !== stats.usable ? `전체 ${stats.total}` : ''} />
              <Cell k="동사" v={stats.verbs} sub="PART IV 는 5개 필요" warn={stats.verbs < 5} />
              <Cell k="형용사·부사" v={stats.adjAdv} sub="PART II 는 5개 필요" warn={stats.adjAdv < 5} />
              <Cell k="어구" v={stats.phrases} sub="PART I 에 먼저 쓴다" />
            </div>
            <div className="summary-grid">
              <Cell k="파생어 보유" v={stats.withDerivatives} sub="PART III 는 2개 필요" warn={stats.withDerivatives < 2} />
              <Cell k="유의어 1개 이상" v={stats.withSynonyms} sub="PART III 는 1개 필요" warn={stats.withSynonyms < 1} />
              <Cell k="유의어 2개" v={stats.withSynonyms2} sub="PART V 는 5개 필요" warn={stats.withSynonyms2 < 5} />
              <Cell k="반의어 보유" v={stats.withAntonyms} sub="PART III 는 2개 필요" warn={stats.withAntonyms < 2} />
            </div>

            {Object.keys(stats.verbForms).length > 0 && (
              <p className="hint" style={{ margin: 0 }}>
                동사 형태 —{' '}
                {Object.entries(stats.verbForms)
                  .map(([form, n]) => `${FORM_LABEL[form]} ${n}`)
                  .join(' · ')}
                {Object.keys(stats.verbForms).length < 5 &&
                  ' (형태 가짓수가 5종에 못 미치면 PART IV 에 같은 형태가 섞입니다)'}
              </p>
            )}

            {!ok && (
              <div className="notice-box">
                <strong>{shortages.length}개 PART 가 문항 수를 채우지 못했습니다.</strong>
                <br />
                {shortages.map((s) => `PART ${s.part} ${s.got}/${s.need} — ${s.why}`).join(' · ')}
                <br />
                표제어를 더 고르거나, 모자란 조건에 맞는 낱말을 추가한 뒤 다시 확정해주세요.
              </div>
            )}
          </div>
        </div>

        {/* 2. 어떤 낱말이 어느 PART 로 갔는지 */}
        <div className="panel">
          <div className="panel-title">
            PART 배정
            <span className="count-pill">{docTitle || '제목 없음'}</span>
          </div>
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p className="hint" style={{ margin: 0 }}>
              조건이 까다로운 PART 가 먼저 가져갑니다 (IV → III → II → V → VI → I). 한 번 쓴 말은 다른 PART 에
              다시 쓰지 않으며, 굴절형이 같은 것도 같은 말로 봅니다.
            </p>

            {PARTS.map((p) => (
              <PartRow
                key={p.key}
                spec={p}
                items={p.key === 'III' ? parts.III.all : parts[p.key]}
                detail={p.key === 'III' ? thirdDetail : null}
                showForm={p.key === 'IV'}
              />
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn" onClick={() => setStep('result')}>
            ← 단어장으로 돌아가기
          </button>
        </div>
      </div>
    </div>
  )
}

function Cell({ k, v, sub, warn }) {
  return (
    <div className="summary-cell">
      <div className="sk">{k}</div>
      <div className="sv" style={warn ? { color: 'var(--semantic-down)' } : undefined}>
        {v}
      </div>
      {sub && <div className="hint" style={{ fontSize: 11, marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

function PartRow({ spec, items, detail, showForm }) {
  const short = items.length < spec.need
  return (
    <div className={`quiz-part${short ? ' short' : ''}`}>
      <div className="qp-head">
        <span className="qp-no">PART {spec.key}</span>
        <span className="qp-label">{spec.label}</span>
        <span className={`qp-count${short ? ' short' : ''}`}>
          {items.length} / {spec.need}
        </span>
      </div>

      {detail && (
        <div className="qp-detail">
          파생 {detail.derivative.got}/{detail.derivative.need} · 유의 {detail.synonym.got}/{detail.synonym.need} ·
          반의 {detail.antonym.got}/{detail.antonym.need}
        </div>
      )}

      <div className="qp-words">
        {items.length === 0 ? (
          <span className="qp-empty">조건에 맞는 낱말이 없습니다</span>
        ) : (
          items.map((row) => (
            <span key={row.id} className="qp-word" title={row.sentence}>
              {row.headword}
              {showForm && <em>{FORM_LABEL[verbForm(row.surface, row.headword)]}</em>}
            </span>
          ))
        )}
      </div>
    </div>
  )
}

function formatStamp(ms) {
  const d = new Date(ms)
  const p = (n) => String(n).padStart(2, '0')
  return `${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}
