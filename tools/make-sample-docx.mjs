/**
 * 테스트용 샘플 지문 docx 생성기.
 *   node tools/make-sample-docx.mjs
 * → samples/샘플지문.docx
 */
import JSZip from 'jszip'
import { mkdir, writeFile } from 'node:fs/promises'

const PASSAGES = [
  {
    en: `The concept of flow, introduced by psychologist Mihaly Csikszentmihalyi, refers to a state of complete absorption in a challenging activity. When individuals are immersed in a flow state, they lose track of time and experience a sense of effortless control. This optimal experience occurs when the level of challenge matches the level of skill. Researchers have argued that regularly achieving flow contributes significantly to overall well-being.`,
    ko: `심리학자 미하이 칙센트미하이가 소개한 '몰입'의 개념은 도전적인 활동에 완전히 흡수된 상태를 의미한다. 몰입 상태에 빠진 개인은 시간 가는 줄 모르고 힘들이지 않는 통제감을 경험한다. 이 최적의 경험은 도전의 수준이 기술의 수준과 일치할 때 발생한다. 연구자들은 몰입을 규칙적으로 달성하는 것이 전반적인 행복에 크게 기여한다고 주장해 왔다.`,
  },
  {
    en: `Urbanization has dramatically reshaped human societies over the past two centuries, drawing people away from rural communities into dense metropolitan areas. Cities offer economic opportunities and cultural diversity that are often unavailable in rural settings. However, rapid urbanization has also brought about housing shortages, environmental degradation, and widening inequality. Sustainable urban planning has therefore emerged as one of the most pressing concerns of our time.`,
    ko: `도시화는 지난 두 세기 동안 인간 사회를 극적으로 재편하여 사람들을 농촌 공동체에서 밀집된 대도시 지역으로 끌어들였다. 도시는 농촌 환경에서는 흔히 이용할 수 없는 경제적 기회와 문화적 다양성을 제공한다. 그러나 급속한 도시화는 주택 부족, 환경 악화, 심화되는 불평등도 야기했다. 따라서 지속 가능한 도시 계획은 우리 시대의 가장 시급한 관심사 중 하나로 떠올랐다.`,
  },
  {
    en: `Biodiversity underpins the functioning of ecosystems that sustain all living organisms, including humans. Each species plays a distinctive role in maintaining ecological balance, and the loss of even a single species can trigger cascading effects throughout a food web. Human activities such as deforestation and pollution are accelerating the rate of extinction at an alarming pace. Protecting biodiversity is not merely an environmental concern but an essential safeguard for civilization itself.`,
    ko: `생물다양성은 인간을 포함한 모든 생물을 유지하는 생태계의 기능을 뒷받침한다. 각 종은 생태적 균형을 유지하는 데 독특한 역할을 하며, 단 하나의 종이 사라지는 것만으로도 먹이 그물 전체에 연쇄적인 영향을 미칠 수 있다. 삼림 벌채와 오염 같은 인간 활동은 놀라운 속도로 멸종 속도를 가속화하고 있다. 생물다양성을 보호하는 것은 단순한 환경적 관심사가 아니라 문명 자체를 위한 필수적인 안전장치이다.`,
  },
  {
    en: `Artificial intelligence has been transforming the way scientific research is conducted. Machine learning models can sift through enormous datasets and detect patterns that would otherwise go unnoticed. Yet critics caution that an overreliance on automated inference may erode the interpretive judgment that lies at the heart of scientific reasoning. The most compelling results tend to emerge when computational power is coupled with human insight.`,
    ko: `인공지능은 과학 연구가 수행되는 방식을 변화시켜 왔다. 기계 학습 모델은 방대한 데이터를 훑어 그렇지 않았다면 눈에 띄지 않았을 패턴을 감지할 수 있다. 그러나 비평가들은 자동화된 추론에 대한 과도한 의존이 과학적 추론의 핵심에 있는 해석적 판단을 약화시킬 수 있다고 경고한다. 가장 설득력 있는 결과는 연산 능력이 인간의 통찰과 결합될 때 나타나는 경향이 있다.`,
  },
]

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const para = (text) => `<w:p><w:r><w:t xml:space="preserve">${esc(text)}</w:t></w:r></w:p>`

const body = PASSAGES.flatMap((p, i) => [para(`${i + 1}.`), para(p.en), para(p.ko), para('')]).join('')

const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>${body}<w:sectPr/></w:body>
</w:document>`

const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`

const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`

const zip = new JSZip()
zip.file('[Content_Types].xml', contentTypes)
zip.folder('_rels').file('.rels', rels)
zip.folder('word').file('document.xml', documentXml)

const buffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })
await mkdir('samples', { recursive: true })
await writeFile('samples/샘플지문.docx', buffer)
console.log(`samples/샘플지문.docx 생성 완료 (${buffer.length} bytes, 지문 ${PASSAGES.length}개)`)
