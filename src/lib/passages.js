/**
 * 추출된 평문을 지문 단위로 나누고, 각 지문에서 영어 본문과 한글 해석을 분리한다.
 */

const HANGUL = /[ㄱ-ㆎ가-힣]/g
const LATIN = /[A-Za-z]/g

/** 지문 번호 표시 줄. "1.", "[3]", "지문 5", "Passage 2", "01)" 등을 인식한다. */
const MARKER = /^\s*(?:\[\s*(\d{1,3})\s*\]|(?:지문|문항|Passage|PASSAGE|Text)\s*[.:]?\s*(\d{1,3})|(\d{1,3})\s*[.)\]]|(\d{1,3})\s*번)\s*(.*)$/

export function classifyLine(line) {
  const hangul = (line.match(HANGUL) || []).length
  const latin = (line.match(LATIN) || []).length
  if (hangul === 0 && latin === 0) return 'other'
  if (hangul > 0 && hangul * 2 >= latin) return 'ko'
  if (latin > 0) return 'en'
  return 'other'
}

/** 한 줄에서 영어 부분만 남긴다 (영문 뒤에 괄호 해석이 붙은 경우 대비). */
export function stripKoreanInline(line) {
  return line
    .replace(/[(（[][^)）\]]*[ㄱ-ㆎ가-힣][^)）\]]*[)）\]]/g, '')
    .replace(/[ㄱ-ㆎ가-힣][^A-Za-z]*/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

function detectMarkers(lines) {
  const hits = []
  lines.forEach((line, i) => {
    const m = line.match(MARKER)
    if (!m) return
    const no = Number(m[1] || m[2] || m[3] || m[4])
    const rest = (m[5] || '').trim()
    // 번호 뒤 내용이 없거나 영어로 시작하면 지문 머리로 본다.
    // "3.14" 같은 소수나 문장 중간 숫자는 걸러낸다.
    if (!Number.isFinite(no) || no < 1 || no > 300) return
    if (rest && classifyLine(rest) === 'other') return
    hits.push({ line: i, no, rest })
  })
  return hits
}

function buildPassage(id, no, lines) {
  const en = []
  const ko = []
  for (const line of lines) {
    const kind = classifyLine(line)
    if (kind === 'en') {
      const cleaned = stripKoreanInline(line)
      if (cleaned) en.push(cleaned)
    } else if (kind === 'ko') {
      ko.push(line.trim())
    }
  }
  return {
    id,
    no,
    english: en.join(' ').replace(/\s{2,}/g, ' ').trim(),
    korean: ko.join('\n').trim(),
  }
}

/**
 * @returns {{ passages: Array, method: string, markerCount: number }}
 */
export function splitPassages(rawText) {
  const lines = String(rawText).split('\n').map((l) => l.trim())
  const markers = detectMarkers(lines)

  // 1순위: 번호 표시가 2개 이상이면 그것으로 나눈다.
  if (markers.length >= 2) {
    const passages = []
    markers.forEach((marker, idx) => {
      const from = marker.line
      const to = idx + 1 < markers.length ? markers[idx + 1].line : lines.length
      const slice = lines.slice(from, to)
      // 머리 줄에서 번호 부분을 떼어낸다
      slice[0] = (slice[0].match(MARKER)?.[5] ?? slice[0]).trim()
      const p = buildPassage(`p${idx + 1}`, marker.no, slice)
      if (p.english) passages.push(p)
    })
    if (passages.length >= 2) {
      return { passages: renumber(passages), method: 'marker', markerCount: markers.length }
    }
  }

  // 2순위: 빈 줄로 나뉜 덩어리 + 한글 → 영어 전환점에서 나눈다.
  const passages = []
  let current = []
  let sawKoreanSinceEnglish = false
  let currentHasEnglish = false

  const flush = () => {
    if (!current.length) return
    const p = buildPassage(`p${passages.length + 1}`, passages.length + 1, current)
    if (p.english) passages.push(p)
    current = []
    sawKoreanSinceEnglish = false
    currentHasEnglish = false
  }

  for (const line of lines) {
    if (!line) {
      // 빈 줄: 이미 영어와 한글을 모두 본 상태면 지문이 끝난 것으로 본다
      if (currentHasEnglish && sawKoreanSinceEnglish) flush()
      continue
    }
    const kind = classifyLine(line)
    if (kind === 'en') {
      if (currentHasEnglish && sawKoreanSinceEnglish) flush()
      currentHasEnglish = true
      sawKoreanSinceEnglish = false
    } else if (kind === 'ko') {
      if (currentHasEnglish) sawKoreanSinceEnglish = true
    }
    current.push(line)
  }
  flush()

  if (passages.length) {
    return { passages: renumber(passages), method: 'heuristic', markerCount: markers.length }
  }

  // 3순위: 통짜 한 덩어리
  const only = buildPassage('p1', 1, lines)
  return {
    passages: only.english ? [only] : [],
    method: 'single',
    markerCount: markers.length,
  }
}

function renumber(passages) {
  return passages.map((p, i) => ({ ...p, id: `p${i + 1}`, no: i + 1 }))
}

/** 인접한 두 지문을 합친다. */
export function mergePassages(passages, index) {
  if (index < 1 || index >= passages.length) return passages
  const prev = passages[index - 1]
  const cur = passages[index]
  const merged = {
    ...prev,
    english: `${prev.english} ${cur.english}`.replace(/\s{2,}/g, ' ').trim(),
    korean: [prev.korean, cur.korean].filter(Boolean).join('\n'),
  }
  const next = [...passages.slice(0, index - 1), merged, ...passages.slice(index + 1)]
  return renumber(next)
}

export function removePassage(passages, index) {
  return renumber(passages.filter((_, i) => i !== index))
}

/** 문장 단위 분리. 약어(Dr., e.g., U.S.)에서 잘리지 않도록 보호한다. */
const ABBREV = /\b(?:Mr|Mrs|Ms|Dr|Prof|St|Jr|Sr|vs|etc|e\.g|i\.e|approx|Inc|Ltd|Co|Fig|No|cf)\.$/i

/**
 * 문장을 닫는 자리 — 마침표 뒤에 따옴표나 괄호가 따라올 수 있다.
 * 이것을 빠뜨리면 `… are." Then …` 이 한 문장으로 붙어버린다.
 */
const SENT_END = '[.!?]["\'’”»)\\]]*'

/**
 * 다음이 대문자(또는 여는 따옴표+대문자)로 시작할 때만 문장을 나눈다.
 * `"Stop!" he shouted.` 처럼 인용 뒤에 소문자가 이어지면 아직 한 문장이다.
 */
const NEXT_STARTS = '(?=["\'“‘(]?[A-Z0-9가-힣])'

export function splitSentences(text) {
  const out = []
  let buf = ''
  const parts = String(text).split(new RegExp(`(?<=${SENT_END})\\s+${NEXT_STARTS}`))
  const endsSentence = new RegExp(`${SENT_END}$`)
  for (const part of parts) {
    buf = buf ? `${buf} ${part}` : part
    const tail = buf.trimEnd()
    if (ABBREV.test(tail)) continue
    if (endsSentence.test(tail)) {
      out.push(tail)
      buf = ''
    }
  }
  if (buf.trim()) out.push(buf.trim())
  return out.length ? out : [String(text).trim()].filter(Boolean)
}

/** 문자 오프셋이 속한 문장을 돌려준다. */
export function sentenceAt(text, offset) {
  const sentences = splitSentences(text)
  let cursor = 0
  for (const s of sentences) {
    const start = text.indexOf(s, cursor)
    if (start === -1) continue
    const end = start + s.length
    if (offset >= start && offset < end) return s
    cursor = end
  }
  return sentences[0] || ''
}
