/**
 * 결과 테이블 → XLSX 파일 저장 (ExcelJS)
 */

import ExcelJS from 'exceljs'

export const COLUMNS = [
  { key: 'no', header: '번호', width: 6 },
  { key: 'headword', header: '표제어', width: 22 },
  { key: 'pos', header: '품사', width: 6 },
  { key: 'meaning', header: '뜻', width: 20 },
  { key: 'derivatives', header: '파생어', width: 30 },
  { key: 'synonyms', header: '유의어', width: 26 },
  { key: 'antonyms', header: '반의어', width: 26 },
  { key: 'source', header: '출처', width: 8 },
  { key: 'sentence', header: '출처 문장', width: 64 },
]

/** 파생어는 한 줄에 하나씩. 엑셀 셀은 wrapText 가 켜져 있어 줄바꿈이 그대로 보인다. */
export function formatDerivatives(list) {
  return (list || []).map((d) => (d.pos ? `${d.word} (${d.pos})` : d.word)).join('\n')
}

export function formatWords(list) {
  return (list || []).map((d) => d.word).join(', ')
}

/** 1부터 시작하는 엑셀 열 번호 */
function columnIndex(key) {
  return COLUMNS.findIndex((c) => c.key === key) + 1
}

export function toRowObjects(rows) {
  return rows.map((r, i) => ({
    no: i + 1,
    headword: r.headword,
    pos: r.pos || '',
    meaning: r.meaning || '',
    derivatives: formatDerivatives(r.derivatives),
    synonyms: formatWords(r.synonyms),
    antonyms: formatWords(r.antonyms),
    source: `지문 ${r.passageNo}`,
    sentence: r.sentence || '',
  }))
}

/** 워크북 생성만 담당한다 (브라우저 API를 쓰지 않아 Node에서도 검증할 수 있다). */
export function buildWorkbook(rows, { title } = {}) {
  const wb = new ExcelJS.Workbook()
  wb.creator = '정상JLS 심화단어장'
  wb.created = new Date()

  const ws = wb.addWorksheet('심화단어장', {
    views: [{ state: 'frozen', ySplit: 2 }],
  })

  ws.columns = COLUMNS.map((c) => ({ key: c.key, width: c.width }))

  // 1행: 제목
  const titleRow = ws.addRow([title || '정상JLS 심화단어장'])
  ws.mergeCells(1, 1, 1, COLUMNS.length)
  titleRow.font = { bold: true, size: 14 }
  titleRow.alignment = { vertical: 'middle', horizontal: 'left' }
  titleRow.height = 24

  // 2행: 헤더
  const headerRow = ws.addRow(COLUMNS.map((c) => c.header))
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' }
  headerRow.height = 20
  headerRow.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2F5597' } }
    cell.border = thinBorder()
  })

  for (const obj of toRowObjects(rows)) {
    const row = ws.addRow(COLUMNS.map((c) => obj[c.key]))
    row.alignment = { vertical: 'top', wrapText: true }
    const center = { vertical: 'top', horizontal: 'center' }
    row.getCell(columnIndex('no')).alignment = center
    row.getCell(columnIndex('pos')).alignment = center
    row.getCell(columnIndex('source')).alignment = center
    row.getCell(columnIndex('headword')).font = { bold: true }
    row.eachCell((cell) => {
      cell.border = thinBorder()
    })
  }

  ws.autoFilter = { from: { row: 2, column: 1 }, to: { row: 2, column: COLUMNS.length } }
  return wb
}

const DEFAULT_TITLE = '정상JLS 심화단어장'

/** 윈도우에서 파일 이름에 쓸 수 없는 문자를 걷어낸다. */
function safeFileName(text) {
  return String(text || '')
    .replace(/[\\/:*?"<>|]/g, '')
    .trim()
    .replace(/\s+/g, '_')
}

/**
 * @param {string} [title] 사용자가 정한 단어장 제목. 있으면 엑셀 첫 줄과 파일 이름에 모두 쓴다.
 * @param {string} [sourceName] 제목을 비웠을 때 첫 줄에 덧붙일 원본 파일 이름
 */
export async function downloadXlsx(rows, { fileName, title, sourceName } = {}) {
  const custom = String(title || '').trim()
  const wb = buildWorkbook(rows, {
    title: custom || `${DEFAULT_TITLE}${sourceName ? ` — ${sourceName}` : ''}`,
  })
  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  // 제목을 파일 이름에 쓰되, 비었거나 특수문자만 남으면 기본 이름으로 돌아간다
  const base = safeFileName(custom) || safeFileName(DEFAULT_TITLE)
  triggerDownload(blob, fileName || `${base}_${stamp()}.xlsx`)
}

function thinBorder() {
  const side = { style: 'thin', color: { argb: 'FFBFBFBF' } }
  return { top: side, left: side, bottom: side, right: side }
}

function triggerDownload(blob, fileName) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function downloadText(text, fileName) {
  triggerDownload(new Blob(['﻿', text], { type: 'text/plain;charset=utf-8' }), fileName)
}

function stamp() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}`
}
