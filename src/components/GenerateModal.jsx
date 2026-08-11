import { summarize } from '../lib/posLite.js'

export default function GenerateModal({ selections, targetCount, model, busy, progress, error, onConfirm, onClose }) {
  const stats = summarize(selections)
  const passageCount = new Set(selections.map((s) => s.passageNo)).size
  const off = stats.total - targetCount

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && !busy && onClose()}>
      <div className="modal">
        <header>
          <h3>{busy ? '심화 단어장 생성 중' : '심화 단어장 생성'}</h3>
        </header>

        <div className="modal-body">
          <p style={{ marginTop: 0 }}>
            선택한 표제어 <strong>{stats.total}개</strong>에 대해 표제어를 원형으로 정리하고 파생어·유의어·반의어를
            생성합니다.
          </p>

          <div className="summary-grid">
            <div className="summary-cell">
              <div className="sk">표제어</div>
              <div className="sv">{stats.total}</div>
            </div>
            <div className="summary-cell">
              <div className="sk">단어 / 어구</div>
              <div className="sv">
                {stats.words} / {stats.phrases}
              </div>
            </div>
            <div className="summary-cell">
              <div className="sk">지문</div>
              <div className="sv">{passageCount}</div>
            </div>
          </div>

          {off !== 0 && !busy && (
            <div className="notice-box" style={{ marginBottom: 12 }}>
              목표 개수({targetCount}개)와 {Math.abs(off)}개 차이가 있습니다. 이대로 진행해도 됩니다.
            </div>
          )}

          <ul style={{ margin: '0 0 4px', paddingLeft: 18 }}>
            <li>현재분사·동명사·과거형·3인칭 현재형은 원형으로, 복수 명사는 단수형으로 바꿉니다. 형용사로 굳은 형태는 그대로 둡니다.</li>
            <li>
              상관어구는 자리표시자로 일반화합니다. (Not only my brother but also my sister → Not only A but also B)
            </li>
            <li>파생어는 최대 2개, 명사형 &gt; 형용사형 &gt; 동사형 &gt; 부사형 순으로 고릅니다.</li>
            <li>유의어는 출처 문장에서 그대로 대체 가능한 것만 최대 2개 넣습니다.</li>
            <li>반의어는 확실한 경우에만, 전체의 30~50% 항목에만 넣습니다.</li>
            <li>표제어·파생어·유의어·반의어는 모두 소문자로 적습니다. (자리표시자 A·B는 대문자 유지)</li>
          </ul>

          {busy && (
            <div className="progress-log">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="spinner dark" />
                <span>
                  {progress?.done ?? 0} / {progress?.total ?? stats.total}개 완료
                </span>
              </div>
              <div className="progress-bar" style={{ marginTop: 8 }}>
                <i style={{ width: `${progress?.total ? (progress.done / progress.total) * 100 : 0}%` }} />
              </div>
              <p className="hint" style={{ margin: '8px 0 0' }}>
                {model} 사용 · {progress?.batchCount ?? '?'}개 묶음을 동시에 처리합니다. 창을 닫지 마세요.
              </p>
            </div>
          )}

          {error && (
            <div className="error-box" style={{ marginTop: 12 }}>
              {error}
            </div>
          )}
        </div>

        <footer>
          <button className="btn ghost" onClick={onClose} disabled={busy}>
            {error ? '닫기' : '취소'}
          </button>
          <button className="btn primary" onClick={onConfirm} disabled={busy || stats.total === 0}>
            {busy ? '생성 중…' : error ? '다시 시도' : '생성 시작'}
          </button>
        </footer>
      </div>
    </div>
  )
}
