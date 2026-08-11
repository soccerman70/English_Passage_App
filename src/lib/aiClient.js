/**
 * 브라우저 → Vite 미들웨어(/api/ai) → claude -p 구독 호출 클라이언트.
 * 배포로 옮길 때 교체할 지점은 이 파일 하나다.
 */

const ANTONYM_TARGET_RATIO = 0.4
const ANTONYM_MAX_RATIO = 0.5
const ANTONYM_MIN_RATIO = 0.3

async function post(path, body) {
  const res = await fetch(`/api/ai/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({ error: '응답을 해석할 수 없습니다.' }))
  if (!res.ok) throw new Error(data.error || `요청 실패 (${res.status})`)
  return data
}

export async function checkHealth() {
  try {
    const res = await fetch('/api/ai/health')
    if (!res.ok) return { ok: false, error: `상태 확인 실패 (${res.status})` }
    return await res.json()
  } catch (err) {
    return { ok: false, error: err.message }
  }
}

export function autoSelect({ passages, targetCount, model, exclude = [] }) {
  return post('select', {
    passages: passages.map((p) => ({ no: p.no, english: p.english })),
    targetCount,
    exclude,
    model,
  })
}

/**
 * 표제어 정규화 + 파생어/유의어/반의어 생성.
 * 배치로 나눠 순차 호출하고 진행률을 알린다.
 */
export async function enrichAll({ items, model, batchSize = 25, onProgress, signal }) {
  const batches = []
  for (let i = 0; i < items.length; i += batchSize) {
    batches.push(items.slice(i, i + batchSize))
  }

  const merged = []
  const usage = { inputTokens: 0, outputTokens: 0, cacheCreation: 0, durationMs: 0 }

  for (let b = 0; b < batches.length; b += 1) {
    if (signal?.aborted) throw new Error('사용자가 취소했습니다.')
    onProgress?.({ phase: 'running', batch: b + 1, batchCount: batches.length, done: merged.length, total: items.length })

    const payload = batches[b].map((it) => ({
      id: it.id,
      surface: it.surface,
      passageNo: it.passageNo,
      sentence: it.sentence,
    }))

    const { results, usage: u, durationMs } = await post('enrich', {
      items: payload,
      antonymTargetRatio: ANTONYM_TARGET_RATIO,
      model,
    })

    if (u) {
      usage.inputTokens += u.input_tokens || 0
      usage.outputTokens += u.output_tokens || 0
      usage.cacheCreation += u.cache_creation_input_tokens || 0
    }
    usage.durationMs += durationMs || 0

    merged.push(...normalizeBatch(results, batches[b]))
    onProgress?.({ phase: 'running', batch: b + 1, batchCount: batches.length, done: merged.length, total: items.length })
  }

  const trimmed = enforceAntonymRatio(merged)
  onProgress?.({ phase: 'done', batch: batches.length, batchCount: batches.length, done: trimmed.rows.length, total: items.length })

  return { rows: trimmed.rows, antonymStats: trimmed.stats, usage }
}

/**
 * 표제어·파생어·유의어·반의어는 모두 소문자로 표기한다.
 * 구문 틀의 자리표시자 A·B 는 단어가 아니라 기호이므로 대문자로 남긴다.
 */
function toLower(text) {
  return String(text).replace(/[A-Za-z]+/g, (w) => (w === 'A' || w === 'B' ? w : w.toLowerCase()))
}

/** 품사는 한 글자로 표기한다. AI가 두 글자로 보내와도 여기서 줄인다. */
const POS_SHORT = {
  명사: '명', 동사: '동', 형용사: '형', 부사: '부',
  전치사: '전', 접속사: '접', 대명사: '대', 어구: '구',
  관사: '관', 감탄사: '감', 조동사: '조',
}

export function shortPos(pos) {
  const p = String(pos || '').trim()
  if (!p) return ''
  return POS_SHORT[p] || p.slice(0, 1)
}

/** 응답에서 빠진 항목을 메우고 형태를 정돈한다. */
function normalizeBatch(results, sent) {
  const byId = new Map((results || []).map((r) => [String(r.id), r]))
  return sent.map((item) => {
    const r = byId.get(String(item.id)) || {}
    // 고유명사는 AI가 보낸 대문자 표기를 그대로 살린다
    const properNoun = Boolean(r.properNoun)
    const cased = (text) => (properNoun ? String(text) : toLower(text))

    return {
      id: item.id,
      passageNo: item.passageNo,
      surface: item.surface,
      sentence: item.sentence,
      headword: cased((r.headword || item.surface).trim()),
      normalizationNote: (r.normalizationNote || '').trim(),
      properNoun,
      pos: shortPos(r.pos),
      meaning: (r.meaning || '').trim(),
      derivatives: cleanEntries(r.derivatives, 2, cased),
      synonyms: cleanEntries(r.synonyms, 2, cased),
      antonyms: cleanEntries(r.antonyms, 2, cased).map((a) => ({ ...a, confidence: Number(a.confidence) || 0 })),
      missing: !byId.has(String(item.id)),
    }
  })
}

function cleanEntries(list, max, cased = toLower) {
  if (!Array.isArray(list)) return []
  return list
    .map((e) => (typeof e === 'string' ? { word: e } : e))
    .filter((e) => e && typeof e.word === 'string' && e.word.trim())
    .map((e) => ({ ...e, word: cased(e.word.trim()), pos: shortPos(e.pos) }))
    .slice(0, max)
}

/**
 * 반의어는 전체의 30~50%에만 달려야 한다.
 * 초과하면 confidence가 낮은 항목부터 떼어낸다.
 */
function enforceAntonymRatio(rows) {
  const withAntonyms = rows.filter((r) => r.antonyms.length > 0)
  const maxAllowed = Math.floor(rows.length * ANTONYM_MAX_RATIO)
  const minWanted = Math.ceil(rows.length * ANTONYM_MIN_RATIO)

  let removed = 0
  if (withAntonyms.length > maxAllowed) {
    const ranked = [...withAntonyms].sort(
      (a, b) => confidenceOf(a) - confidenceOf(b) || a.headword.localeCompare(b.headword)
    )
    const dropCount = withAntonyms.length - maxAllowed
    const dropIds = new Set(ranked.slice(0, dropCount).map((r) => r.id))
    rows = rows.map((r) => (dropIds.has(r.id) ? { ...r, antonyms: [], antonymTrimmed: true } : r))
    removed = dropCount
  }

  const finalCount = rows.filter((r) => r.antonyms.length > 0).length
  return {
    rows,
    stats: {
      count: finalCount,
      total: rows.length,
      ratio: rows.length ? finalCount / rows.length : 0,
      removed,
      belowMin: finalCount < minWanted,
      minWanted,
      maxAllowed,
    },
  }
}

function confidenceOf(row) {
  return Math.max(...row.antonyms.map((a) => a.confidence || 0), 0)
}
