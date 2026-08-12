// 단어시험지 생성 화면 — 확정된 단어장을 받아 시험지를 만든다. 아직 자리만 잡아둔 단계다

import { useStore } from '../store.js'

export default function QuizPanel() {
  const { rows, confirmedAt, docTitle, setStep } = useStore()

  return (
    <div className="setup">
      <div className="setup-inner">
        <p className="setup-lead">
          확정된 단어장 <strong>{rows.length}개</strong> 표제어로 시험지를 만듭니다.
        </p>

        <div className="panel">
          <div className="panel-title">
            {docTitle || '단어시험지'}
            {confirmedAt && <span className="confirm-tag">확정 {formatStamp(confirmedAt)}</span>}
          </div>
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p className="hint" style={{ margin: 0 }}>
              시험지 형태가 정해지면 이 화면에 채웁니다. 단어장을 한 칸이라도 고치면 확정이 풀리므로, 고친 뒤에는 ④를
              다시 눌러 확정해주세요.
            </p>
            <div>
              <button className="btn" onClick={() => setStep('result')}>
                ← 단어장으로 돌아가기
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function formatStamp(ms) {
  const d = new Date(ms)
  const p = (n) => String(n).padStart(2, '0')
  return `${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}
