@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  if exist "%~dp0.tools\node-v24.21.0-win-x64\node.exe" (
    set "PATH=%~dp0.tools\node-v24.21.0-win-x64;%PATH%"
  ) else (
    echo Node.js 22 or newer is required. Install it from https://nodejs.org/
    pause
    exit /b 1
  )
)
if not exist "%~dp0node_modules\ink" (
  if exist "%~dp0package-lock.json" (
    call npm.cmd ci --no-fund --no-audit
  ) else (
    if exist "%~dp0dist\cli.js" (
      call npm.cmd install --omit=dev --no-fund --no-audit
    ) else (
      call npm.cmd install --no-fund --no-audit
    )
  )
  if errorlevel 1 exit /b 1
)
if not exist "%~dp0dist\cli.js" (
  call npm.cmd run build
  if errorlevel 1 exit /b 1
)
node "%~dp0dist\cli.js" install %*
if errorlevel 1 (
  pause
  exit /b 1
)
endlocal
exit /b 0
