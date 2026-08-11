/**
 * 지문 텍스트를 클릭 가능한 토큰으로 쪼갠다.
 * 단어 토큰과 그 사이의 공백·문장부호 토큰을 모두 보존해 원문을 그대로 복원할 수 있게 한다.
 */

const WORD = /[A-Za-z0-9]+(?:['’-][A-Za-z0-9]+)*/g

export function tokenize(text) {
  const tokens = []
  let cursor = 0
  let match

  WORD.lastIndex = 0
  while ((match = WORD.exec(text)) !== null) {
    if (match.index > cursor) {
      tokens.push({ text: text.slice(cursor, match.index), isWord: false, start: cursor, end: match.index })
    }
    tokens.push({ text: match[0], isWord: true, start: match.index, end: match.index + match[0].length })
    cursor = match.index + match[0].length
  }
  if (cursor < text.length) {
    tokens.push({ text: text.slice(cursor), isWord: false, start: cursor, end: text.length })
  }

  return tokens.map((t, i) => ({ ...t, i }))
}

/** 토큰 구간 [from, to] 의 원문 문자열. 양끝의 비단어 토큰은 잘라낸다. */
export function surfaceOf(text, tokens, from, to) {
  const lo = Math.min(from, to)
  const hi = Math.max(from, to)
  let a = lo
  let b = hi
  while (a <= b && !tokens[a].isWord) a += 1
  while (b >= a && !tokens[b].isWord) b -= 1
  if (a > b) return { surface: '', start: -1, end: -1 }
  return { surface: text.slice(tokens[a].start, tokens[b].end), start: tokens[a].start, end: tokens[b].end, from: a, to: b }
}

/**
 * AI가 돌려준 문자열을 지문 안의 토큰 구간으로 되찾는다.
 * 정확히 일치 → 대소문자 무시 → 단어 시퀀스 순으로 완화하며 찾는다.
 * @param {number[]} takenStarts 이미 선택된 시작 오프셋(중복 매칭 회피)
 */
export function locateSurface(text, tokens, surface, takenStarts = []) {
  const needle = String(surface).trim()
  if (!needle) return null

  const taken = new Set(takenStarts)
  const wordIdx = tokens.filter((t) => t.isWord)

  const tryOffset = (offset) => {
    if (offset < 0) return null
    const from = tokens.find((t) => t.isWord && t.start <= offset && t.end > offset)
    const to = [...tokens].reverse().find((t) => t.isWord && t.start < offset + needle.length && t.end >= offset + needle.length)
    if (!from || !to) return null
    return { from: from.i, to: to.i, start: from.start, end: to.end }
  }

  // 1) 정확히 일치하는 위치들 중 아직 안 쓴 것
  let idx = text.indexOf(needle)
  while (idx !== -1) {
    if (!taken.has(idx)) {
      const hit = tryOffset(idx)
      if (hit) return hit
    }
    idx = text.indexOf(needle, idx + 1)
  }

  // 2) 대소문자 무시
  const lowerText = text.toLowerCase()
  const lowerNeedle = needle.toLowerCase()
  idx = lowerText.indexOf(lowerNeedle)
  while (idx !== -1) {
    if (!taken.has(idx)) {
      const hit = tryOffset(idx)
      if (hit) return hit
    }
    idx = lowerText.indexOf(lowerNeedle, idx + 1)
  }

  // 3) 단어 시퀀스로 느슨하게 (공백·문장부호 차이 흡수)
  const needleWords = (lowerNeedle.match(WORD) || [])
  if (!needleWords.length) return null
  for (let i = 0; i + needleWords.length <= wordIdx.length; i += 1) {
    let ok = true
    for (let k = 0; k < needleWords.length; k += 1) {
      if (wordIdx[i + k].text.toLowerCase() !== needleWords[k]) {
        ok = false
        break
      }
    }
    if (!ok) continue
    const from = wordIdx[i]
    const to = wordIdx[i + needleWords.length - 1]
    if (taken.has(from.start)) continue
    return { from: from.i, to: to.i, start: from.start, end: to.end }
  }

  return null
}

export function isPhrase(surface) {
  return /\s/.test(String(surface).trim())
}

export function wordCount(surface) {
  return (String(surface).match(WORD) || []).length
}
