/**
 * 1단계 화면 상단의 작업 흐름 안내 스트립.
 *
 * 처음에는 시안대로 01·02 를 큰 세로 블록으로 쌓고 03~07 만 가로로 뒀는데,
 * 그러면 배너가 화면의 주인공이 되어 정작 눌러야 할 지문 업로드 상자를 밀어냈다.
 * 이건 방향 안내(direction)지 작업 자체가 아니므로, 일곱 단계를 같은 크기로
 * 한 줄에 눕히고 글자를 눌러 배경으로 물러나게 했다. 클릭 동작은 없다.
 */

/** 01~07 단계. 배열 순서가 곧 화면 순서다. 02 만 두 갈래라 options 를 갖는다. */
const STEPS = [
  { no: '01', label: '지문파일 또는 교재 텍스트 파일 올리기' },
  {
    no: '02',
    label: '표제어 선택',
    options: [
      { key: 'manual', title: '단어 지정', icon: 'pencil' },
      { key: 'ai', title: 'AI 자동 생성', icon: 'sparkles' },
    ],
  },
  /* 실제 버튼(SelectionPanel)이 "파생어·유의어·반의어 생성 →" 이라 같은 말로 적는다 */
  { no: '03', label: '파생어·유의어·반의어 생성' },
  { no: '04', label: '검수' },
  { no: '05', label: '단어시험 항목 배치' },
  { no: '06', label: '파트별 문항 생성' },
  { no: '07', label: '최종 단어시험지 생성' },
]

export default function WorkflowBanner() {
  return (
    <section className="wb" aria-label="이용 방법">
      <div className="wb-head">
        <span className="wb-tag">HOW IT WORKS</span>
      </div>

      <ol className="wb-flow">
        {STEPS.map((s, i) => (
          <li className="wb-cell" key={s.no}>
            {/* 첫 칸 앞에는 이어받을 것이 없다 */}
            {i > 0 && (
              <span className="wb-arrow">
                <ArrowIcon />
              </span>
            )}
            <div className="wb-body">
              <span className="wb-num">{s.no}</span>
              <div className="wb-label">{s.label}</div>
              {s.options && (
                <div className="wb-opts">
                  {s.options.map((o) => (
                    <span className="wb-opt" key={o.key}>
                      <span className="wb-opt-icon">
                        {o.icon === 'pencil' ? <PencilIcon /> : <SparklesIcon />}
                      </span>
                      {o.title}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}

/**
 * 아이콘은 SetupPanel 의 dz-icon 과 같은 규격으로 맞춘다 —
 * 24 뷰박스, currentColor, strokeWidth 1.5. 크기는 CSS 에서 정한다.
 */
function PencilIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  )
}

function SparklesIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z" />
      <path d="M20 2v4" />
      <path d="M22 4h-4" />
      <circle cx="4" cy="20" r="2" />
    </svg>
  )
}

function ArrowIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  )
}
