import SetupPanel from './components/SetupPanel.jsx'
import Workspace from './components/Workspace.jsx'
import ResultTable from './components/ResultTable.jsx'
import { useStore } from './store.js'

const STEPS = [
  { key: 'input', no: 1, label: '지문 입력' },
  { key: 'select', no: 2, label: '표제어 선택' },
  { key: 'result', no: 3, label: '단어장 생성' },
]

export default function App() {
  const { step, passages, selections, rows, setStep, reset } = useStore()

  const available = {
    input: true,
    select: passages.length > 0,
    result: rows.length > 0,
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          <span className="brand-logo">
            <img src="/logo-jls.png" alt="정상어학원 고등부" />
          </span>
          <span className="brand-titles">
            <h1>심화단어장</h1>
            <span className="brand-sub">
              {step === 'select' && selections.length > 0
                ? `표제어 ${selections.length}개 선택됨`
                : '지문 → 표제어 → 단어장'}
            </span>
          </span>
        </div>

        <div className="steps">
          <div className="step-track">
            {STEPS.map((s) => {
              const done = available[s.key] && stepIndex(s.key) < stepIndex(step)
              const state = step === s.key ? 'active' : done ? 'done' : ''
              return (
                <button
                  key={s.key}
                  className={`step-chip ${state}`.trim()}
                  disabled={!available[s.key]}
                  onClick={() => available[s.key] && setStep(s.key)}
                >
                  <span className="step-no">{s.no}</span>
                  <span className="step-label">{s.label}</span>
                </button>
              )
            })}
          </div>
          <button
            className="btn ghost sm"
            title="모든 작업 내용을 지우고 처음부터 시작합니다"
            onClick={() => {
              if (confirm('지문·선택·생성 결과를 모두 지우고 처음부터 시작할까요?')) reset()
            }}
          >
            초기화
          </button>
        </div>
      </header>

      <main className="app-main">
        {step === 'input' && <SetupPanel />}
        {step === 'select' && <Workspace />}
        {step === 'result' && <ResultTable />}
      </main>
    </div>
  )
}

function stepIndex(key) {
  return STEPS.findIndex((s) => s.key === key)
}
