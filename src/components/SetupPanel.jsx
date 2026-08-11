import { useCallback, useEffect, useRef, useState } from 'react'
import { extractText, fileKind } from '../lib/textExtract.js'
import { splitPassages, mergePassages, removePassage } from '../lib/passages.js'
import { downloadText } from '../lib/exportXlsx.js'
import { checkHealth } from '../lib/aiClient.js'
import { useStore } from '../store.js'

const SPLIT_LABEL = {
  marker: '지문 번호 표시를 기준으로 나눴습니다',
  heuristic: '한글 해석 위치를 기준으로 나눴습니다',
  single: '나눌 기준을 찾지 못해 하나의 지문으로 두었습니다',
}

export default function SetupPanel() {
  const {
    passages,
    targetCount,
    mode,
    model,
    splitMethod,
    fileInfo,
    loadPassages,
    setPassages,
    setTargetCount,
    setMode,
    setModel,
    setStep,
  } = useStore()

  const [busy, setBusy] = useState(null)
  const [error, setError] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [pdfDraft, setPdfDraft] = useState(null) // { text, fileName, pageCount }
  const [health, setHealth] = useState(null)
  const inputRef = useRef(null)

  useEffect(() => {
    checkHealth().then(setHealth)
  }, [])

  const ingestText = useCallback(
    (text, info) => {
      const { passages: found, method } = splitPassages(text)
      if (!found.length) {
        setError('영어 지문을 찾지 못했습니다. 파일 내용을 확인해주세요.')
        return
      }
      loadPassages({ passages: found, rawText: text, fileInfo: info, splitMethod: method })
      setPdfDraft(null)
      setError('')
    },
    [loadPassages]
  )

  const handleFile = useCallback(
    async (file) => {
      if (!file) return
      setError('')
      setBusy({ label: `${file.name} 읽는 중…` })
      try {
        const kind = fileKind(file)
        const result = await extractText(file, ({ page, total }) =>
          setBusy({ label: `PDF 텍스트 변환 중… ${page}/${total} 쪽` })
        )
        if (kind === 'pdf') {
          // PDF는 바로 지문으로 넘기지 않고 변환 결과를 먼저 확인·수정하게 한다
          setPdfDraft({ text: result.text, fileName: file.name, pageCount: result.pageCount })
        } else {
          ingestText(result.text, { name: file.name, kind })
        }
      } catch (err) {
        setError(err.message)
      } finally {
        setBusy(null)
      }
    },
    [ingestText]
  )

  const onDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    handleFile(e.dataTransfer.files?.[0])
  }

  return (
    <div className="setup">
      <div className="setup-hero">
        <div className="setup-hero-inner">
          <h2>지문에서 심화단어장까지</h2>
          <p>
            지문 파일(.docx)을 올리면 한글 해석을 걸러내고 영어 본문만 카드로 만듭니다. PDF는 텍스트로 변환한 뒤
            사용할 수 있습니다.
          </p>
        </div>
      </div>

      <div className="setup-inner">
        {/* 1. 파일 입력 */}
        <div
          className={`dropzone${dragOver ? ' over' : ''}`}
          onDragOver={(e) => {
            e.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".docx,.pdf,.txt"
            hidden
            onChange={(e) => {
              handleFile(e.target.files?.[0])
              e.target.value = ''
            }}
          />
          {busy ? (
            <>
              <div className="dz-icon">
                <span className="spinner dark" style={{ display: 'inline-block' }} />
              </div>
              <div className="dz-main">{busy.label}</div>
            </>
          ) : (
            <>
              <div className="dz-icon">📄</div>
              <div className="dz-main">지문 파일을 여기에 끌어다 놓거나 클릭해서 고르세요</div>
              <div className="dz-sub">.docx 권장 · .pdf 는 텍스트 변환 후 사용 · .txt 도 가능</div>
            </>
          )}
        </div>

        {error && <div className="error-box">{error}</div>}

        {/* 2. PDF 변환 결과 확인 (특별 기능) */}
        {pdfDraft && (
          <div className="panel pdf-panel">
            <div className="panel-title">
              PDF 텍스트 변환 결과
              <span className="count-pill">{pdfDraft.pageCount}쪽</span>
            </div>
            <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <p className="hint" style={{ margin: 0 }}>
                PDF는 줄바꿈 정보가 정확하지 않을 수 있습니다. 아래에서 직접 고친 뒤 지문으로 넘기세요. 지문 사이는
                빈 줄로 띄우거나 <strong>1. 2. 3.</strong> 같은 번호를 붙이면 더 정확히 나뉩니다.
              </p>
              <textarea
                value={pdfDraft.text}
                onChange={(e) => setPdfDraft({ ...pdfDraft, text: e.target.value })}
                spellCheck={false}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className="btn primary"
                  onClick={() =>
                    ingestText(pdfDraft.text, { name: pdfDraft.fileName, kind: 'pdf', pageCount: pdfDraft.pageCount })
                  }
                >
                  이 텍스트로 지문 만들기
                </button>
                <button
                  className="btn"
                  onClick={() => downloadText(pdfDraft.text, pdfDraft.fileName.replace(/\.pdf$/i, '') + '.txt')}
                >
                  TXT로 저장
                </button>
                <button className="btn ghost" onClick={() => setPdfDraft(null)}>
                  취소
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 3. 지문 미리보기 */}
        {passages.length > 0 && (
          <div className="panel">
            <div className="panel-title">
              지문 확인
              <span className="count-pill">{passages.length}개</span>
            </div>
            <div style={{ padding: '10px 14px 0' }}>
              <p className="hint" style={{ margin: 0 }}>
                {fileInfo?.name} · {SPLIT_LABEL[splitMethod] || ''} · 잘못 나뉜 지문은 아래에서 합치거나 지우세요.
              </p>
            </div>
            <div className="passage-preview-list">
              {passages.map((p, i) => (
                <div className="passage-preview" key={p.id}>
                  <header>
                    <span className="pp-no pno-badge">지문 {p.no}</span>
                    <span className="pp-meta">
                      {countWords(p.english)} 단어{p.korean ? ' · 해석 있음' : ' · 해석 없음'}
                    </span>
                    <span className="pp-actions">
                      {i > 0 && (
                        <button className="btn ghost sm" onClick={() => setPassages(mergePassages(passages, i))}>
                          ↑ 위와 합치기
                        </button>
                      )}
                      <button className="btn ghost sm" onClick={() => setPassages(removePassage(passages, i))}>
                        삭제
                      </button>
                    </span>
                  </header>
                  <p>{p.english}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 4. 설정 */}
        {passages.length > 0 && (
          <div className="panel">
            <div className="panel-title">단어장 설정</div>
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="field-row">
                <div className="field">
                  <label htmlFor="target">총 표제어 개수</label>
                  <input
                    id="target"
                    type="number"
                    min={1}
                    max={500}
                    value={targetCount}
                    onChange={(e) => setTargetCount(e.target.value)}
                  />
                </div>

                <div className="field">
                  <label>표제어 선택 방식</label>
                  <div className="mode-toggle">
                    <button className={mode === 'manual' ? 'on' : ''} onClick={() => setMode('manual')}>
                      직접 선택
                    </button>
                    <button className={mode === 'ai' ? 'on' : ''} onClick={() => setMode('ai')}>
                      AI 자동 추출
                    </button>
                  </div>
                </div>

                <div className="field">
                  <label htmlFor="model">AI 모델</label>
                  <select id="model" value={model} onChange={(e) => setModel(e.target.value)}>
                    <option value="claude-opus-5">Opus 5 (정확도 우선)</option>
                    <option value="claude-sonnet-5">Sonnet 5 (속도 우선)</option>
                  </select>
                </div>
              </div>

              <p className="hint" style={{ margin: 0 }}>
                {mode === 'manual'
                  ? '지문에서 단어를 클릭하거나 드래그해 표제어를 직접 고릅니다. 카드를 자유롭게 오가며 다시 클릭하면 선택이 해제됩니다.'
                  : `AI가 지문 전체에서 학습 가치가 높은 표현 ${targetCount}개를 골라 표시합니다. 그 뒤 직접 더하거나 뺄 수 있습니다.`}
              </p>

              <HealthLine health={health} />

              <div>
                <button className="btn primary cta" onClick={() => setStep('select')}>
                  {mode === 'manual' ? '표제어 선택 시작' : 'AI 추출 화면으로'} →
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function HealthLine({ health }) {
  if (!health) return <p className="hint" style={{ margin: 0 }}>AI 연결 확인 중…</p>
  if (health.ok) {
    return (
      <p className="hint" style={{ margin: 0 }}>
        ✅ Claude Code 구독 연결됨 ({health.version}) — API 키 없이 이 PC의 로그인 계정으로 생성합니다.
      </p>
    )
  }
  return (
    <div className="notice-box">
      ⚠️ Claude Code CLI를 찾지 못했습니다{health.error ? ` (${health.error})` : ''}. AI 자동 추출과 단어장 생성이
      동작하지 않습니다. 터미널에서 <strong>claude --version</strong> 이 실행되는지 확인해주세요.
    </div>
  )
}

function countWords(text) {
  return (text.match(/[A-Za-z0-9]+/g) || []).length
}
