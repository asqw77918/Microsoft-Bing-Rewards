@echo off
setlocal
chcp 65001 >nul

set "GITEXE=C:\Users\Daisy\AppData\Local\GitHubDesktop\app-3.6.3\resources\app\git\cmd\git.exe"
set "REPO=C:\Users\Daisy\AppData\Roaming\TRAE SOLO CN\ModularData\ai-agent\work-mode-projects\6a84785efe5fd9ae544c24ca\Microsoft-Rewards-Script"
set "MSGFILE=%REPO%\.git\COMMIT_MSG.txt"

echo ==========================================================
echo  Quick push all changes to origin/v4 (no Node.js needed)
echo  Note: compile is verified by GitHub Actions CI
echo ==========================================================

REM ---------- 1. git add ----------
echo.
echo [1/2] Stage and commit ...
"%GITEXE%" -C "%REPO%" add -A
if errorlevel 1 (
    echo [ERROR] git add failed.
    pause
    exit /b 1
)
REM keep helper scripts out of the repository
"%GITEXE%" -C "%REPO%" reset -- push-changes.cmd >nul 2>&1
"%GITEXE%" -C "%REPO%" reset -- merge-upstream.cmd >nul 2>&1
"%GITEXE%" -C "%REPO%" reset -- finish-merge.cmd >nul 2>&1

"%GITEXE%" -C "%REPO%" commit -F "%MSGFILE%"
if errorlevel 1 (
    echo [WARN] commit failed or nothing to commit - continuing to push.
)

REM ---------- 2. push ----------
echo.
echo [2/2] Push to origin/v4 ...
"%GITEXE%" -C "%REPO%" push origin v4
if errorlevel 1 (
    echo [ERROR] push failed. Check the Microsoft-Bing-Rewards repo exists and you are authenticated.
    pause
    exit /b 1
)

echo.
echo ==========================================================
echo  DONE! Changes pushed to asqw77918/Microsoft-Bing-Rewards
echo ==========================================================
pause
