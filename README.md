# 정상JLS 심화단어장

영어 지문 파일에서 표제어를 골라 **파생어 · 유의어 · 반의어**가 붙은 심화단어장을 만들고 엑셀로 내려받는 로컬 앱.

AI 생성은 Anthropic API 키 없이 **이 PC에 로그인된 Claude Code 구독 계정**으로 동작한다.

---

## 실행

```bash
npm install
npm run dev
```

브라우저에서 안내된 주소(기본 http://localhost:5180)를 연다.

### 사전 조건

- Node.js 18 이상
- Claude Code CLI 설치 및 로그인 — 터미널에서 `claude --version` 이 실행되어야 한다.
  - 실행 파일 경로가 특이하면 `CLAUDE_BIN` 환경변수로 지정할 수 있다.

---

## 사용 흐름

### 1단계 — 지문 입력

- **.docx** (권장): 지문별로 영어 본문만 뽑아내고 한글 해석은 걸러낸다.
- **.pdf**: 텍스트로 변환한 결과를 먼저 보여준다. 직접 고친 뒤 지문으로 넘기거나 `.txt`로 저장할 수 있다.
- **.txt**: 그대로 사용.

지문 분할 기준은 두 가지다.

1. `1.` `[2]` `지문 3` `Passage 4` 같은 **번호 표시**가 2개 이상 있으면 그것을 기준으로 나눈다.
2. 번호가 없으면 **영어 → 한글 → 영어** 로 넘어가는 지점과 빈 줄을 기준으로 나눈다.

나뉜 결과는 미리보기에서 확인하고 합치거나 지울 수 있다.

여기서 **총 표제어 개수**(기본 100), **선택 방식**(직접 / AI 자동), **AI 모델**을 정한다.

### 2단계 — 표제어 선택

- 카드는 순서대로 배열되고, **작업 중인 카드만 펼쳐지고 나머지는 한 줄로 접힌다.**
- 단어 **클릭** = 한 단어 선택, **드래그** = 여러 단어(어구) 선택, 선택된 자리를 **다시 클릭** = 해제.
- 카드를 자유롭게 오가며 목표 개수를 맞춘다. 오른쪽 패널에 선택 순서대로 쌓이고 카운트가 올라간다.
- **총 표제어 개수는 이 화면에서 바로 고칠 수 있다.** 카운터의 `/ 100` 자리를 직접 입력하면 목표가 바뀐다.
- 맨 오른쪽 메타 패널: 단어/어구 비율, 품사별 개수(접미사 기반 추정), 지문별 분포.
- **✨ AI 자동 추출** 버튼을 누르면 남은 개수만큼 AI가 골라 회색으로 표시한다. 직접 고른 것은 그대로 유지된다.

> **개수는 코드가 보장한다.** AI는 요청한 개수를 정확히 맞춰주지 않는다 — 50개를 요청하면 62개를 주기도 하고
> 46개만 주기도 한다. 그래서 [Workspace.jsx](src/components/Workspace.jsx) 에서 넘치면 잘라내고, 부족하면
> 이미 고른 표현을 제외 목록으로 넘겨 최대 3회까지 다시 요청한다. 그래도 못 채우면 몇 개를 채웠는지와
> 그 이유(초과분 잘라냄 / 지문에서 못 찾음 / 자리 겹침)를 화면에 그대로 알린다.
> `node tools/select-diagnose.mjs <포트> <개수>` 로 이 동작을 점검할 수 있다.

### 3단계 — 단어장 생성

`파생어·유의어·반의어 생성 →` 을 누르면 확인 창이 뜨고, 승인하면 25개씩 나눠 처리한다.

생성 규칙:

| 항목 | 규칙 |
| --- | --- |
| **표제어** | 선택한 표현 그대로. 단 현재분사·동명사·과거형·과거완료·3인칭 현재형은 **원형**으로, 복수 명사는 **단수형**으로. 과거분사는 완료형/수동태일 때만 원형으로 바꾸고 그 외에는 유지. `interesting` 처럼 형용사로 굳은 현재분사는 유지 |
| **구문 틀** | 상관어구는 자리표시자로 일반화. `Not only my brother but also my sister` → `Not only A but also B`, `too abstract to grasp` → `too 형용사 to 동사원형`. 관용구·구동사(`sift through`)는 그대로 유지 |
| **품사** | **한 글자**로 표기 — 명·동·형·부·전·접·대·구(어구). 파생어 괄호 안 품사도 같다 |
| **뜻** | 표제어가 **그 출처 문장에서 실제로 쓰인** 한국어 의미 하나. 사전 뜻 나열 금지. 품사에 맞는 어미(명사형·~하다·~한·~하게)를 쓴다 |
| **파생어** | 최대 2개, **한 줄에 하나씩**. 한국 고등학생에게 유용한 것. 명사형 &gt; 형용사형 &gt; 동사형 &gt; 부사형 순, 독특·예외적 형태 우선 |
| **유의어** | 적절한 것이 있으면 항상 2개. **출처 문장에서 그대로 대체 가능해야** 한다(어법 오류·어색함 없이) |
| **반의어** | 확실할 때만 최대 2개. 전체의 **30~50%** 항목에만. 초과분은 confidence가 낮은 것부터 자동으로 정리된다 |
| **표기** | 표제어·파생어·유의어·반의어는 모두 **소문자**. 예외는 구문 틀의 자리표시자 `A`·`B`와 **고유명사**뿐. 프롬프트로 지시하고, 받은 뒤 [aiClient.js](src/lib/aiClient.js)에서 한 번 더 강제한다 |
| **고유명사** | AI 자동 추출에서는 인명·지명·기관명을 **되도록 고르지 않는다**. 꼭 필요해 표제어가 된 경우에는 `properNoun` 으로 표시되어 대문자 표기가 유지된다 |

결과 테이블에서 셀을 직접 고친 뒤 **XLSX**로 내려받는다. 출처(지문 번호)와 출처 문장이 함께 들어간다.

---

## 디자인

`DESIGN-coinbase.md` 의 토큰을 [src/styles/global.css](src/styles/global.css) 하나에 CSS 변수로 옮겨 적용했다.

- **색**: 흰 캔버스 + ink(`#0a0b0d`) + 회색 elevation. 브랜드 블루(`#0052ff`)는 주 CTA·활성 단계·표제어 선택 표시에만 쓴다.
- **서체**: 라이선스 서체 대신 문서가 지정한 대체 서체를 자체 호스팅(`@fontsource-variable`) — 본문 Inter, 숫자 JetBrains Mono.
  한글은 Inter에 글리프가 없어 Pretendard → 맑은 고딕으로 폴백한다. 디스플레이는 weight 400 + 음수 자간.
- **형태**: 버튼은 전부 pill(100px), 카드 24px, 패널 16px, 입력 12px. 각진 모서리 없음.
- **깊이**: 헤어라인 1px가 기본, 그림자는 `0 4px 12px rgba(0,0,0,0.04)` 한 단계만. (모달 오버레이만 예외)

작업 화면(2·3단계)은 토큰만 따르고 96px 밴드 리듬은 쓰지 않는다 — 문서의
*"Density lives behind login walls, not on marketing"* 원칙에 따라 지문 카드·표는 작업 밀도를 유지한다.
`hero-band-dark` 시그니처 패턴은 1단계 지문 입력 화면 상단에 적용했다.

선택 표시는 팔레트 안에서 처리한다 — **직접 고른 표제어는 브랜드 블루**, **AI가 제안한 것은 회색**(`surface-strong`).
매매 신호용 green/red는 문서 지침대로 배경 채우기에 쓰지 않고, 진행 막대의 달성/초과 표시에만 쓴다.

## 구조

```
server/
  claudeBridge.js   Vite 미들웨어. /api/ai/* 요청을 claude -p 자식 프로세스로 넘긴다
  prompts.js        표제어 추출 · 정규화/생성 프롬프트
src/
  lib/
    textExtract.js  docx(mammoth) · pdf(pdf.js) · txt → 평문
    passages.js     지문 분할, 한글 해석 분리, 문장 분리
    tokenize.js     단어 토큰화, 드래그 구간 → 문자열, AI 응답 문자열 → 지문 위치
    posLite.js      접미사 기반 간이 품사 추정, 메타 집계
    aiClient.js     /api/ai 호출, 배치 처리, 반의어 비율 조정
    exportXlsx.js   ExcelJS 내보내기
  components/       SetupPanel · Workspace · PassageCard · SelectionPanel · MetaPanel · GenerateModal · ResultTable
  store.js          zustand 전역 상태 (localStorage 보존)
tools/
  make-sample-docx.mjs  테스트용 샘플 지문 docx 생성
  smoke-test.mjs        브라우저 없이 핵심 로직 점검 (파싱·선택·XLSX)
  ai-test.mjs           실제 AI 엔드포인트 · 정규화 규칙 점검
  select-diagnose.mjs   자동 추출이 목표 개수를 정확히 채우는지 점검
  seed-preview.mjs      2·3단계 화면 확인용 상태를 localStorage에 심는 임시 페이지 생성
```

작업 내용은 localStorage에 보존되므로 새로고침해도 선택한 표제어가 남는다. 헤더의 **초기화**로 지운다.

## 점검

```bash
node tools/make-sample-docx.mjs   # samples/샘플지문.docx 생성
node tools/smoke-test.mjs         # 파싱·분할·토큰화·품사 추정·XLSX (AI 호출 없음)
node tools/ai-test.mjs 5180       # 실제 AI 호출 (dev 서버 포트를 인자로)

node tools/seed-preview.mjs select   # 2단계 화면 상태 심기 → /__seed.html 접속
node tools/seed-preview.mjs result   # 3단계 화면 상태 심기 → /__seed.html 접속
rm public/__seed.html                # 확인 후 삭제
```

## 배포에 대해

지금 구조는 **이 PC 전용**이다. `claude -p` 는 로컬에 로그인된 계정으로 실행되므로 서버에 올려 여러 사람이 쓰게 할 수 없다.
웹으로 배포하려면 `server/claudeBridge.js` 를 Anthropic API 키를 쓰는 서버(예: Cloudflare Worker)로 교체하면 된다.
프롬프트(`server/prompts.js`)와 나머지 코드는 그대로 쓸 수 있다.
