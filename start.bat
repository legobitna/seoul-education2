@echo off
chcp 65001 >nul
title 회의록 자동화
cd /d "%~dp0"

where node >nul 2>nul
if %errorlevel% neq 0 (
  echo Node.js가 설치되어 있지 않습니다.
  echo https://nodejs.org 에서 Node.js 20 이상을 설치해 주세요.
  pause
  exit /b 1
)

if not exist "node_modules\" (
  echo 패키지 설치 중...
  call npm install
)

if not exist "data\app.db" (
  echo 데이터베이스 초기화 중...
  call npx prisma db push
  call npm run db:seed
)

echo.
echo 회의록 자동화 서버를 시작합니다...
echo 브라우저에서 http://localhost:3000 을 열어 주세요.
echo.

start "" "http://localhost:3000"
call npm run dev
