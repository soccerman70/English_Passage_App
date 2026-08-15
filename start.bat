@echo off
REM Launcher: starts the dev server and opens the browser. Double-click to use.
REM ASCII only. Non-ASCII text breaks depending on the console code page.
cd /d "%~dp0"

set PORT=5180
set URL=http://localhost:%PORT%/

REM Starting a second instance would grab another port, so just open the browser.
netstat -ano | findstr ":%PORT% " | findstr "LISTENING" >nul
if not errorlevel 1 (
  echo Already running. Opening browser.
  start "" "%URL%"
  exit /b
)

if not exist "node_modules" (
  echo First run. Installing packages. This takes a few minutes.
  call npm install
)

echo.
echo   URL    %URL%
echo   Stop   Close this window, or press Ctrl+C
echo.
call npm run dev -- --open
