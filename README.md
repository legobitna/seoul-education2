# 회의록 자동화 (로컬)

회의를 녹음하고 종료하면 **Gemini API(무료)** 로 회의록을 작성한 뒤, **Gmail**으로 참석자에게 자동 발송하는 로컬 웹 앱입니다.

## 기능

- 3단계 위저드: 회의 준비 → 녹음 → 자동 처리(전사·회의록·메일)
- 자주 쓰는 참석자·회의 템플릿 저장
- 회의록 Markdown 복사/다운로드
- 액션 아이템 체크리스트

## 사전 준비

1. [Node.js 20+](https://nodejs.org)
2. [Google AI Studio](https://aistudio.google.com/apikey) — Gemini API 키 (무료)
3. Gmail + [앱 비밀번호](https://myaccount.google.com/apppasswords) (2단계 인증 필요)

## 실행 방법

### Windows (간편)

`start.bat` 더블클릭

### 수동

```bash
npm install
npx prisma db push
npm run db:seed
npm run dev
```

브라우저: http://localhost:3000

최초 실행 시 **설정** 페이지에서 Gemini 키와 Gmail을 입력하세요.

## 환경 변수 (선택)

`.env.example`을 참고해 `.env` 파일을 만들 수 있습니다. UI 설정이 우선합니다.

```
DATABASE_URL="file:./data/app.db"
GEMINI_API_KEY=
SMTP_USER=
SMTP_PASS=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 데이터 저장

- DB: `data/app.db` (SQLite)
- 녹음: `data/recordings/`

`data/` 폴더는 백업을 권장합니다 (`.gitignore` 처리됨).

## 제한 사항

- **브라우저**: Chrome/Edge 권장, 마이크 권한 필요
- **Gemini 무료**: 일일/분당 요청 한도 — 장시간 회의는 90분 이내 권장
- **Gmail**: 일일 발송 한도 약 500통
- **로컬 전용**: 기본 `localhost`만 사용

## 기술 스택

- Next.js 15, TypeScript, Tailwind CSS
- Prisma + SQLite
- Google Gemini API (`gemini-2.5-flash`)
- Nodemailer + Gmail SMTP
