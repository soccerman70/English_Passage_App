/**
 * 앱 전역 상태.
 * 100개를 고르는 작업은 길어질 수 있으므로 새로고침에도 살아남도록 localStorage에 보존한다.
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { sentenceAt } from './lib/passages.js'
import { guessPos, guessLevel } from './lib/posLite.js'

let seq = 0
const nextId = () => `s${Date.now().toString(36)}${(seq += 1).toString(36)}`

const initial = {
  step: 'input', // input | select | result
  fileInfo: null, // { name, kind, pageCount }
  rawText: '',
  passages: [],
  splitMethod: '',

  targetCount: 100,
  mode: 'manual', // manual | ai
  model: 'claude-opus-5',

  focusedId: null,
  selections: [],

  rows: [],
  antonymStats: null,
  lastUsage: null,
}

export const useStore = create(
  persist(
    (set, get) => ({
      ...initial,

      reset: () => set({ ...initial }),

      /* ---------------- 입력 ---------------- */

      loadPassages: ({ passages, rawText, fileInfo, splitMethod }) =>
        set({
          passages,
          rawText,
          fileInfo,
          splitMethod,
          selections: [],
          rows: [],
          antonymStats: null,
          focusedId: passages[0]?.id ?? null,
          step: passages.length ? 'select' : 'input',
        }),

      setPassages: (passages) =>
        set((s) => ({
          passages,
          // 지문 구성이 바뀌면 사라진 지문의 선택은 버린다
          selections: s.selections.filter((sel) => passages.some((p) => p.id === sel.passageId)),
          focusedId: passages.some((p) => p.id === s.focusedId) ? s.focusedId : passages[0]?.id ?? null,
        })),

      setTargetCount: (n) => set({ targetCount: Math.max(1, Math.min(500, Number(n) || 0)) }),
      setMode: (mode) => set({ mode }),
      setModel: (model) => set({ model }),
      setStep: (step) => set({ step }),
      setFocused: (id) => set({ focusedId: id }),

      /* ---------------- 표제어 선택 ---------------- */

      /** 토큰 구간을 표제어로 추가한다. 겹치는 기존 선택이 있으면 그것을 제거(언클릭)한다. */
      toggleRange: ({ passageId, from, to, start, end, surface, origin = 'manual' }) => {
        const state = get()
        const passage = state.passages.find((p) => p.id === passageId)
        if (!passage || !surface) return

        const overlapping = state.selections.filter(
          (sel) => sel.passageId === passageId && sel.start < end && start < sel.end
        )

        if (overlapping.length) {
          const ids = new Set(overlapping.map((o) => o.id))
          set({ selections: state.selections.filter((sel) => !ids.has(sel.id)) })
          return
        }

        const sentence = sentenceAt(passage.english, start)
        const selection = {
          id: nextId(),
          passageId,
          passageNo: passage.no,
          from,
          to,
          start,
          end,
          surface,
          sentence,
          pos: guessPos(surface, sentence),
          level: guessLevel(surface),
          origin,
        }
        set({ selections: [...state.selections, selection] })
      },

      removeSelection: (id) => set((s) => ({ selections: s.selections.filter((sel) => sel.id !== id) })),

      clearSelections: () => set({ selections: [] }),

      clearSelectionsBy: (origin) =>
        set((s) => ({ selections: s.selections.filter((sel) => sel.origin !== origin) })),

      replaceSelections: (selections) => set({ selections }),

      /* ---------------- 결과 ---------------- */

      setRows: (rows, antonymStats, lastUsage) =>
        set({ rows, antonymStats, lastUsage, step: 'result' }),

      updateRow: (id, patch) =>
        set((s) => ({ rows: s.rows.map((r) => (r.id === id ? { ...r, ...patch } : r)) })),

      removeRow: (id) => set((s) => ({ rows: s.rows.filter((r) => r.id !== id) })),
    }),
    {
      name: 'jls-vocab-store',
      version: 1,
      partialize: (s) => ({
        step: s.step,
        fileInfo: s.fileInfo,
        rawText: s.rawText,
        passages: s.passages,
        splitMethod: s.splitMethod,
        targetCount: s.targetCount,
        mode: s.mode,
        model: s.model,
        focusedId: s.focusedId,
        selections: s.selections,
        rows: s.rows,
        antonymStats: s.antonymStats,
      }),
    }
  )
)

/** 선택 목록을 지문 순서 → 등장 순서로 정렬 */
export function sortSelections(selections) {
  return [...selections].sort((a, b) => a.passageNo - b.passageNo || a.start - b.start)
}
