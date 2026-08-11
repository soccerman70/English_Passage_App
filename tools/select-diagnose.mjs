/**
 * AI 자동 추출이 목표 개수를 정확히 채우는지 점검한다.
 * Workspace.runAutoSelect 와 같은 로직(초과분 잘라내기 + 부족분 재요청)을 재현한다.
 *   node tools/select-diagnose.mjs [포트] [목표개수]
 */
import mammoth from 'mammoth'
import { readFile } from 'node:fs/promises'
import { splitPassages } from '../src/lib/passages.js'
import { tokenize, locateSurface } from '../src/lib/tokenize.js'

const PORT = process.argv[2] || '5180'
const TARGET = Number(process.argv[3] || 50)
const MAX_ROUNDS = 3

const { value: text } = await mammoth.extractRawText({ buffer: await readFile('samples/샘플지문.docx') })
const { passages } = splitPassages(text)

async function requestSelect(targetCount, exclude) {
  const res = await fetch(`http://localhost:${PORT}/api/ai/select`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      passages: passages.map((p) => ({ no: p.no, english: p.english })),
      targetCount,
      exclude,
      model: 'claude-opus-5',
    }),
  })
  const data = await res.json()
  if (data.error) throw new Error(data.error)
  return data.items || []
}

const added = []
const takenByPassage = new Map()
const exclude = new Set()
const drops = { notFound: 0, clash: 0, noPassage: 0 }
let overshoot = 0
let rounds = 0

while (added.length < TARGET && rounds < MAX_ROUNDS) {
  rounds += 1
  const want = TARGET - added.length
  const items = await requestSelect(want, [...exclude])
  console.log(`${rounds}차 — 요청 ${want}개 · 응답 ${items.length}개`)
  if (!items.length) break

  for (const item of items) {
    if (added.length >= TARGET) {
      overshoot += 1
      continue
    }
    const passage = passages.find((p) => p.no === Number(item.passageNo))
    if (!passage) {
      drops.noPassage += 1
      continue
    }
    if (!takenByPassage.has(passage.id)) takenByPassage.set(passage.id, [])
    const taken = takenByPassage.get(passage.id)
    const hit = locateSurface(passage.english, tokenize(passage.english), item.surface, taken)
    if (!hit) {
      drops.notFound += 1
      continue
    }
    const clash = added.some((s) => s.passageId === passage.id && s.start < hit.end && hit.start < s.end)
    if (clash) {
      drops.clash += 1
      continue
    }
    taken.push(hit.start)
    const surface = passage.english.slice(hit.start, hit.end)
    exclude.add(surface.toLowerCase())
    added.push({ passageId: passage.id, passageNo: passage.no, start: hit.start, end: hit.end, surface })
  }
}

const ok = added.length === TARGET
console.log(`\n${ok ? '통과' : '미달'} — 목표 ${TARGET}개 / 최종 ${added.length}개 · ${rounds}회 요청`)
console.log(`초과분 잘라냄 ${overshoot} · 못 찾음 ${drops.notFound} · 자리 겹침 ${drops.clash} · 지문번호 불일치 ${drops.noPassage}`)

const dup = new Set()
const repeated = added.filter((s) => {
  const key = s.surface.toLowerCase()
  if (dup.has(key)) return true
  dup.add(key)
  return false
})
console.log(`중복 표제어: ${repeated.length}${repeated.length ? ` — ${repeated.map((s) => s.surface).join(', ')}` : ''}`)

const perPassage = passages.map((p) => `지문${p.no}:${added.filter((s) => s.passageNo === p.no).length}`)
console.log(`지문별 분배: ${perPassage.join(' · ')}`)

process.exit(ok ? 0 : 1)
