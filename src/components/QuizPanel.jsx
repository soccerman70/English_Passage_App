// 단어시험지 생성 화면 — 확정된 단어장을 6개 PART 에 나눠 담고 그 결과를 먼저 보여준다

import { useMemo, useState } from 'react'
import { useStore } from '../store.js'
import { allocate, verbForm, FORM_LABEL, PARTS } from '../lib/quizAllocate.js'
import { buildPartI, buildPartIV, renderPartIVItem } from '../lib/quizBuild.js'

export default function QuizPanel() {
  const { rows, passages, confirmedAt, docTitle, setStep } = useStore()
  const result = useMemo(() => allocate(rows), [rows])
  const { parts, stats, shortages, thirdDetail, ok } = result

  // 문항별로 앞뒤 문장을 몇 개까지 붙였는지. 맥락이 모자란지는 읽어봐야 알 수 있어 사람이 정한다.
  const [context, setContext] = useState({})
  const adjust = (rowId, side, delta) =>
    setContext((prev) => {
      const cur = prev[rowId] || { before: 0, after: 0 }
      return { ...prev, [rowId]: { ...cur, [side]: Math.max(0, Math.min(2, cur[side] + delta)) } }
    })

  const partI = useMemo(() => buildPartI(parts.I), [parts.I])
  const partIV = useMemo(() => buildPartIV(parts.IV), [parts.IV])

  return (
    <div className="setup quiz-view">
      <div className="setup-inner">
        {/* 1. 단어장이 시험지를 감당할 수 있는지 */}
        <div className="panel">
          <div className="panel-title">
            단어장 점검
            <span className="count-pill">
              표제어 {stats.usable} → {stats.required}문항
            </span>
            {confirmedAt && <span className="confirm-tag">확정 {formatStamp(confirmedAt)}</span>}
          </div>
          <div className="quiz-body">
            <div className="quiz-stats">
              <Cell k="쓸 수 있는 표제어" v={stats.usable} sub={stats.total !== stats.usable ? `전체 ${stats.total}` : ''} />
              <Cell k="동사" v={stats.verbs} sub="IV 5개" warn={stats.verbs < 5} />
              <Cell k="형용사·부사" v={stats.adjAdv} sub="II 5개" warn={stats.adjAdv < 5} />
              <Cell k="어구" v={stats.phrases} sub="I 우선" />
              <Cell k="파생어" v={stats.withDerivatives} sub="III 2개" warn={stats.withDerivatives < 2} />
              <Cell k="유의어 1+" v={stats.withSynonyms} sub="III 1개" warn={stats.withSynonyms < 1} />
              <Cell k="유의어 2" v={stats.withSynonyms2} sub="V 5개" warn={stats.withSynonyms2 < 5} />
              <Cell k="반의어" v={stats.withAntonyms} sub="III 2개" warn={stats.withAntonyms < 2} />
            </div>

            {Object.keys(stats.verbForms).length > 0 && (
              <p className="hint" style={{ margin: 0 }}>
                동사 형태 —{' '}
                {Object.entries(stats.verbForms)
                  .map(([form, n]) => `${FORM_LABEL[form]} ${n}`)
                  .join(' · ')}
                {Object.keys(stats.verbForms).length < 5 && ' · 5종에 못 미치면 PART IV 에 같은 형태가 섞입니다'}
              </p>
            )}

            {!ok && (
              <div className="notice-box">
                <strong>{shortages.length}개 PART 가 문항 수를 못 채웠습니다.</strong>{' '}
                {shortages.map((s) => `PART ${s.part} ${s.got}/${s.need}`).join(' · ')} — 표제어를 더 고른 뒤 다시
                확정해주세요.
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
          <div className="quiz-body">
            <p className="hint" style={{ margin: 0 }}>
              까다로운 PART 가 먼저 가져갑니다 (IV → III → II → V → VI → I). 한 번 쓴 말은 굴절형이 같은 것까지
              다시 쓰지 않습니다.
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

        {/* 3. AI 없이 조립되는 PART */}
        {partI.length > 0 && (
          <div className="panel">
            <div className="panel-title">
              PART I — 우리말 → 영어 쓰기
              <span className="count-pill">{partI.length}문항</span>
            </div>
            <div style={{ padding: 16 }}>
              <p className="hint" style={{ margin: '0 0 10px' }}>
                단어장에 있는 뜻과 표제어로 그대로 만들어집니다. 어구는 낱말 수를 괄호로 알려줍니다.
              </p>
              <table className="quiz-preview">
                <tbody>
                  {partI.map((q) => (
                    <tr key={q.rowId}>
                      <td className="qn">{q.no}</td>
                      <td>{q.prompt}</td>
                      <td className="qa">{q.answer}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {partIV.items.length > 0 && (
          <div className="panel">
            <div className="panel-title">
              PART IV — 동사 형태 변형
              <span className="count-pill">{partIV.items.length}문항</span>
            </div>
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <p className="hint" style={{ margin: 0 }}>
                보기 · {partIV.choices.join(' / ')}
              </p>
              <p className="hint" style={{ margin: 0 }}>
                출처 문장을 그대로 쓰고 동사 자리를 빈칸으로 두었습니다. 그 문장만으로 뜻을 유추하기 어려우면 앞뒤
                문장을 붙이세요. 유추가 가능하면 붙이지 않는 편이 낫고, 한 문항은 40단어를 넘지 않아야 합니다.
              </p>

              {partIV.items.map((it) => (
                <PartFourItem
                  key={it.rowId}
                  item={{ ...it, ...(context[it.rowId] || {}) }}
                  passages={passages}
                  onAdjust={adjust}
                />
              ))}
            </div>
          </div>
        )}

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
    <div className={`qs-cell${warn ? ' warn' : ''}`}>
      <div className="qs-k">{k}</div>
      <div className="qs-v">
        {v}
        {sub && <em>{sub}</em>}
      </div>
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

/** 문항 하나. 앞뒤 문장을 붙이고 뗄 수 있고, 40단어를 넘으면 알려준다. */
function PartFourItem({ item, passages, onAdjust }) {
  const r = renderPartIVItem(item, passages)
  return (
    <div className={`quiz-item${r.overLimit ? ' over' : ''}`}>
      <div className="qi-head">
        <span className="qi-no">{item.no}</span>
        <span className="qi-form">{FORM_LABEL[item.form]}</span>
        <span className="qi-answer">{item.answer}</span>
        <span className="qi-src">지문 {item.passageNo}</span>
        <span className={`qi-words${r.overLimit ? ' over' : ''}`}>{r.words} / 40 단어</span>
      </div>

      <p className="qi-text">{r.text}</p>

      <div className="qi-actions">
        <button className="btn ghost sm" disabled={item.before >= 2 || r.atStart} onClick={() => onAdjust(item.rowId, 'before', 1)}>
          ← 앞 문장 붙이기
        </button>
        <button className="btn ghost sm" disabled={!item.before} onClick={() => onAdjust(item.rowId, 'before', -1)}>
          앞 문장 떼기
        </button>
        <span className="qi-gap" />
        <button className="btn ghost sm" disabled={!item.after} onClick={() => onAdjust(item.rowId, 'after', -1)}>
          뒤 문장 떼기
        </button>
        <button className="btn ghost sm" disabled={item.after >= 2 || r.atEnd} onClick={() => onAdjust(item.rowId, 'after', 1)}>
          뒤 문장 붙이기 →
        </button>
      </div>
    </div>
  )
}

function formatStamp(ms) {
  const d = new Date(ms)
  const p = (n) => String(n).padStart(2, '0')
  return `${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}
