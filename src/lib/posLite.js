/**
 * 선택하는 즉시 보여줄 품사·난이도 추정.
 *
 * 품사는 접미사만 보지 않고 **출처 문장에서의 위치**(앞뒤 단어)를 함께 본다.
 * 앞에 조동사가 오면 동사, 관사 뒤이고 뒤에 전치사가 오면 명사 같은 규칙이다.
 * 규칙을 다 통과해도 "미상"으로 남기지 않고 문장 위치로 가장 그럴듯한 품사를 고른다.
 * 정확한 품사는 생성 단계에서 AI가 출처 문장을 근거로 다시 판정한다.
 */

import { tokenize, isPhrase, wordCount } from './tokenize.js'

export const POS_ORDER = ['명사', '동사', '형용사', '부사', '어구', '기타']
export const LEVEL_ORDER = ['상', '중', '하']

/* ------------------------------------------------------------------ */
/* 어휘 집합                                                          */
/* ------------------------------------------------------------------ */

const set = (s) => new Set(s.split(/\s+/).filter(Boolean))

/** 조동사·be동사 — 뒤에 오는 것은 동사 */
const AUX = set(`
  can could will would shall should may might must
  do does did done have has had be is are was were been being
  get gets got getting
`)

/** 관사·한정사 */
const DETERMINER = set(`
  the a an this that these those its his her their our my your
  some any each every no another both all such which what whose
  one two three many few several most more less other others
`)

/** 전치사 */
const PREP = set(`
  of in on at for with from by about into through during without within
  against between among across toward towards upon over under below beneath
  after before since until while despite besides beyond throughout via per
  onto off out up down along around near like unlike including regarding
`)

/** 빈도·정도 부사 — 뒤에 오는 것은 대개 동사 */
const FREQ_ADV = set(`
  often always never usually sometimes rarely seldom still also already
  soon just even only again once twice thus therefore hence however
  merely simply largely mostly partly hardly barely
`)

/** 대명사 — 뒤에 오면 앞 단어는 동사(목적어를 받는다) */
const PRONOUN = set(`
  it them him her us me you they we he she itself themselves
  everything something anything nothing everyone someone anyone
`)

/** -ly 로 끝나지만 부사가 아닌 흔한 단어 */
const LY_NOT_ADVERB = set(`
  early likely friendly lovely ugly silly lonely costly deadly
  elderly orderly timely unlikely monthly weekly daily yearly holy
`)

/** 기능어 — 표제어로 고를 일은 드물지만 들어오면 "기타" */
const FUNCTION_WORD = set(`
  the a an and or but if because although while when of in on at to for
  with from by about into through this that these those not so as than
`)

/**
 * 중학 수준까지의 기초 어휘. 짧은 단어가 진짜 쉬운지 가리는 데 쓴다.
 * (erode 처럼 짧지만 어려운 단어를 "하"로 떨어뜨리지 않기 위한 목록)
 */
const BASIC = set(`
  able about above accept across act add afraid after again against age ago agree air
  all allow almost alone along already also always among angry animal answer any anyone
  appear apple area arm around arrive art ask asleep attack aunt away baby back bad bag
  ball band bank base basket bath be beach bear beat beautiful because become bed before
  begin behind believe bell below beside best better between big bike bird birth bit bite
  black blood blow blue board boat body boil book boot bore born borrow both bottle bottom
  box boy brain branch brave bread break breakfast breath bridge bright bring broad brother
  brown brush build burn bus business busy but butter button buy cake call calm camera camp
  can cap car card care careful carry case cat catch cause ceiling cell cent center century
  certain chair chance change cheap check cheer cheese chicken child choice choose church
  circle city class clean clear clever climb clock close cloth cloud club coat coffee coin
  cold collect college color come comfort common company compare complete computer concern
  condition contact contain continue control cook cool copy corner correct cost cotton
  cough could count country couple course cover cow crazy cream create cross crowd cry
  culture cup cut cute dad daily damage dance danger dark date daughter day dead deal dear
  death decide deep degree delicious deliver depend describe desert design desk destroy
  detail develop dial diary die diet differ difficult dig dinner direct dirty discover
  discuss disease dish divide do doctor dog door double doubt down draw dream dress drink
  drive drop dry duck due during dust duty each ear early earn earth east easy eat edge
  education effect effort egg eight either elbow elect else empty end enemy energy engine
  enjoy enough enter entire envelope equal error escape even evening event ever every
  exact example excite excuse exercise exist exit expect expensive experience explain
  express eye face fact factory fail fair fall false family famous fan far farm fashion
  fast fat father fault favor fear feed feel female fence few field fight fill film final
  find fine finger finish fire first fish fit fix flag flat floor flow flower fly focus
  follow food foot for force foreign forest forget fork form former forward free fresh
  friend from front fruit full fun funny future gain game garden gas gate gather general
  gentle get gift girl give glad glass glove go goal god gold good govern grade grand
  grass gray great green greet ground group grow guard guess guest guide gun guy habit
  hair half hall hand handle hang happen happy hard harm hat hate have head health hear
  heart heat heavy help here hide high hill history hit hobby hold hole holiday home
  honest hope horse hospital hot hotel hour house how huge human hungry hunt hurry hurt
  husband ice idea if ill image imagine important improve include increase indeed
  industry inform inside instead interest into introduce invite iron island issue item
  job join joke journey joy judge jump just keep key kick kid kill kind king kiss
  kitchen knee knife knock know lack lady lake lamp land language large last late laugh
  law lay lazy lead leaf learn least leave left leg lend length less lesson let letter
  level library lie life lift light like line lip list listen little live local lock
  lonely long look lose lot loud love low luck lunch machine mad magazine mail main
  major make male man manage many map march mark market marry match material math matter
  may meal mean meat medicine meet member memory mention menu message metal method
  middle might mile milk mind mine minute mirror miss mistake mix model modern moment
  money monkey month moon more morning most mother motor mountain mouse mouth move
  movie much music must name narrow nation nature near neck need needle neighbor never
  new news next nice night no noise none noon north nose not note nothing notice now
  number nurse object ocean odd of off offer office often oil old on once one only open
  opinion or order other out outside over own pack page pain paint pair paper parent
  park part partner party pass past path patient pay peace pen pencil people perfect
  perform perhaps period person pet phone photo pick picture piece pig pile pink pipe
  place plan plane plant plastic plate play please pocket point police polite pool poor
  popular port position possible post pot potato pound pour power practice praise pray
  prefer prepare present press pretty prevent price pride print prison prize problem
  produce program progress project promise proper protect proud prove provide public
  pull punish pupil pure purpose push put puzzle quality quarter queen question quick
  quiet quit quite race radio rail rain raise range rate rather reach read ready real
  reason receive recent record red reduce refer refuse regard region regret relate
  relax remain remember remind remove rent repair repeat reply report request require
  rescue rest result return rich ride right ring rise risk river road rock role roll
  roof room root rope rose rough round row rub rule run rush sad safe sail salt same
  sand save say scale scene school science score sea search season seat second secret
  section see seed seem sell send sense sentence separate serious serve set settle
  several shake shall shape share sharp she sheep sheet shelf shine ship shirt shock
  shoe shoot shop short should shoulder shout show shower shut shy sick side sight sign
  silence silver similar simple since sing single sink sir sister sit site situation
  size skill skin skirt sky sleep slide slip slow small smart smell smile smoke smooth
  snow so soap social society sock soft soil soldier solve some son song soon sorry
  sort sound soup south space speak special speed spell spend spirit spoon sport spot
  spread spring square staff stage stair stamp stand star start state station stay steal
  steam steel step stick still stone stop store storm story straight strange street
  stress strike strong student study stupid style subject succeed such sudden suffer
  sugar suggest suit summer sun supper supply support suppose sure surface surprise
  sweet swim symbol system table tail take talk tall tape task taste tax tea teach team
  tear tell temper temple tend tennis tent term terrible test than thank that theater
  then theory there thick thin thing think third thirsty this though thought thousand
  throat through throw thumb thus ticket tide tie tiger tight till time tiny tip tired
  title today toe together tomorrow tone tongue tonight too tool tooth top total touch
  tour toward towel tower town toy trade traffic train travel treat tree trip trouble
  truck true trust truth try tube turn twice type ugly uncle under understand unit
  universe unless until up upon upset use useful usual valley value various vegetable
  very victory video view village visit voice volume vote wait wake walk wall want war
  warm warn wash waste watch water wave way weak wear weather wedding week weight
  welcome well west wet what wheel when where whether which while white who whole why
  wide wife wild will win wind window wine wing winter wipe wise wish with within
  without woman wonder wood word work world worry worse worth would wound wrap write
  wrong yard year yellow yes yesterday yet you young
`)

/* ------------------------------------------------------------------ */
/* 품사                                                               */
/* ------------------------------------------------------------------ */

const ADJ_SUFFIX = /(?:ous|ful|less|ive|able|ible|ical|ic|ish|ary|ory|like|proof|worthy|ant|ent)$/i
const NOUN_SUFFIX = /(?:tion|sion|ment|ness|ity|ance|ence|ship|hood|ism|ist|ure|age|dom|cy|logy|graphy|ee|er|or|ian)$/i
const VERB_SUFFIX = /(?:ize|ise|ify|ate|en)$/i

const clean = (t) => String(t || '').toLowerCase().replace(/[^a-z'’-]/g, '')

/** 출처 문장에서 표제어의 앞뒤 단어를 찾는다. */
function neighbors(surface, sentence) {
  if (!sentence) return null
  const tokens = tokenize(sentence).filter((t) => t.isWord)
  const words = tokens.map((t) => t.text)
  const needle = (String(surface).match(/[A-Za-z0-9'’-]+/g) || []).map((w) => w.toLowerCase())
  if (!needle.length) return null

  for (let i = 0; i + needle.length <= words.length; i += 1) {
    let hit = true
    for (let k = 0; k < needle.length; k += 1) {
      if (words[i + k].toLowerCase() !== needle[k]) {
        hit = false
        break
      }
    }
    if (!hit) continue
    return {
      prev: clean(words[i - 1]),
      prev2: clean(words[i - 2]),
      next: clean(words[i + needle.length]),
      first: i === 0,
    }
  }
  return null
}

/**
 * @param {string} surface 선택된 표현
 * @param {string} [sentence] 출처 문장 — 주면 문맥 규칙을 함께 쓴다
 */
export function guessPos(surface, sentence) {
  const raw = String(surface).trim()
  if (!raw) return '명사'
  if (isPhrase(raw)) return '어구'

  const w = clean(raw)
  if (!w) return '명사'
  if (FUNCTION_WORD.has(w)) return '기타'

  const ctx = neighbors(raw, sentence)
  const prev = ctx?.prev || ''
  const prev2 = ctx?.prev2 || ''
  const next = ctx?.next || ''

  const nextIsWord = Boolean(next)
  const detBefore = DETERMINER.has(prev) || DETERMINER.has(prev2)
  const prevIsAdverb = prev.endsWith('ly') && prev.length > 4 && !LY_NOT_ADVERB.has(prev)

  // 1) 어미가 확실한 것부터
  if (w.endsWith('ly') && w.length > 4 && !LY_NOT_ADVERB.has(w)) return '부사'
  if (LY_NOT_ADVERB.has(w)) return '형용사'
  if (ADJ_SUFFIX.test(w) && !NOUN_SUFFIX.test(w)) return '형용사'

  // 2) 문맥 규칙
  if (AUX.has(prev)) return '동사'
  if (prev === 'to' && !DETERMINER.has(w)) return '동사'
  if (FREQ_ADV.has(prev)) return '동사'
  if (DETERMINER.has(next) || PRONOUN.has(next)) return '동사'
  if (detBefore && (PREP.has(next) || !nextIsWord)) return '명사'
  if (detBefore && nextIsWord) return '형용사'
  if (prevIsAdverb) return /(?:ed|ing|s)$/.test(w) ? '동사' : '형용사'
  if (PREP.has(prev)) return '명사'

  // 3) 접미사
  if (NOUN_SUFFIX.test(w)) return '명사'
  if (VERB_SUFFIX.test(w)) return '동사'
  if (/(?:ed|ing)$/.test(w)) return '동사'

  // 4) 그래도 남으면 문장 위치로 결정한다 — "미상"은 만들지 않는다
  if (PREP.has(next) || !nextIsWord) return '명사'
  if (/s$/.test(w) && !/ss$/.test(w)) return '동사'
  return nextIsWord ? '형용사' : '명사'
}

/* ------------------------------------------------------------------ */
/* 난이도                                                             */
/* ------------------------------------------------------------------ */

const PREFIX = /^(?:over|under|inter|pre|post|dis|un|in|im|re|mis|non|counter|sub|super|trans|anti|extra|multi|semi|micro)/i

function syllables(word) {
  const w = word.toLowerCase().replace(/[^a-z]/g, '')
  if (!w) return 0
  const groups = w.replace(/e$/, '').match(/[aeiouy]+/g)
  return Math.max(1, groups ? groups.length : 1)
}

function affixCount(word) {
  let n = 0
  if (NOUN_SUFFIX.test(word)) n += 1
  if (ADJ_SUFFIX.test(word)) n += 1
  if (VERB_SUFFIX.test(word)) n += 1
  if (PREFIX.test(word) && word.length > 7) n += 1
  return n
}

/**
 * 한국 고등학생 기준 체감 난이도 추정 — 상 / 중 / 하
 * 음절 수 + 파생 접사 + 기초 어휘 목록을 함께 본다.
 * 짧아도 기초 어휘가 아니면 "하"로 떨어지지 않는다. (erode, dwell 등)
 */
export function guessLevel(surface) {
  const raw = String(surface).trim()
  if (!raw) return '중'

  if (isPhrase(raw)) {
    // 어구는 길수록 관용성이 높아 어렵다
    return wordCount(raw) >= 3 ? '상' : '중'
  }

  const w = clean(raw).replace(/[^a-z]/g, '')
  if (!w) return '중'

  const syl = syllables(w)
  const affix = affixCount(w)
  const basic = BASIC.has(w) || BASIC.has(w.replace(/(?:s|es|ed|ing)$/, ''))

  if (syl >= 4) return basic ? '중' : '상'
  if (syl === 3) return basic ? '하' : affix >= 1 ? '중' : '상'
  // 1~2음절
  if (basic) return '하'
  return affix >= 1 ? '중' : '중'
}

/* ------------------------------------------------------------------ */
/* 집계                                                               */
/* ------------------------------------------------------------------ */

export function summarize(selections) {
  const byPos = new Map()
  const byLevel = new Map()
  const byPassage = new Map()
  let phrases = 0
  let words = 0

  for (const sel of selections) {
    const pos = sel.pos || guessPos(sel.surface, sel.sentence)
    byPos.set(pos, (byPos.get(pos) || 0) + 1)

    const level = sel.level || guessLevel(sel.surface)
    byLevel.set(level, (byLevel.get(level) || 0) + 1)

    if (isPhrase(sel.surface)) phrases += 1
    else words += 1
    byPassage.set(sel.passageNo, (byPassage.get(sel.passageNo) || 0) + 1)
  }

  const posCounts = POS_ORDER.filter((p) => byPos.has(p)).map((p) => ({ pos: p, count: byPos.get(p) }))
  for (const [p, count] of byPos) {
    if (!POS_ORDER.includes(p)) posCounts.push({ pos: p, count })
  }

  const levelCounts = LEVEL_ORDER.map((l) => ({ level: l, count: byLevel.get(l) || 0 }))

  return {
    total: selections.length,
    words,
    phrases,
    posCounts,
    levelCounts,
    byPassage: [...byPassage.entries()].sort((a, b) => a[0] - b[0]).map(([no, count]) => ({ no, count })),
  }
}
