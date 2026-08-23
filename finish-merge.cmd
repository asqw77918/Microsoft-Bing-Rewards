@echo off
setlocal
chcp 65001 >nul

set "GITEXE=C:\Users\Daisy\AppData\Local\GitHubDesktop\app-3.6.3\resources\app\git\cmd\git.exe"
set "REPO=C:\Users\Daisy\AppData\Roaming\TRAE SOLO CN\ModularData\ai-agent\work-mode-projects\6a84785efe5fd9ae544c24ca\Microsoft-Rewards-Script"

echo ==========================================================
echo  Finish merge: stage resolved files, commit merge, push
echo ==========================================================

echo.
echo [1/3] Stage all resolved files ...
"%GITEXE%" -C "%REPO%" add -A
if errorlevel 1 (
    echo [ERROR] git add failed.
    pause
    exit /b 1
)
"%GITEXE%" -C "%REPO%" reset -- merge-upstream.cmd >nul 2>&1
"%GITEXE%" -C "%REPO%" reset -- push-changes.cmd >nul 2>&1

echo.
echo [2/3] Complete merge commit ...
"%GITEXE%" -C "%REPO%" commit --no-edit
if errorlevel 1 (
    echo [ERROR] merge commit failed.
    pause
    exit /b 1
)

echo.
echo [3/3] Push to origin/v4 ...
"%GITEXE%" -C "%REPO%" push origin v4
if errorlevel 1 (
    echo [ERROR] push failed.
    pause
    exit /b 1
)

echo.
echo ==========================================================
echo  DONE! Merge completed and pushed to origin/v4.
echo ==========================================================
pause
