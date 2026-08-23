@echo off
setlocal
chcp 65001 >nul

set "GITEXE=C:\Users\Daisy\AppData\Local\GitHubDesktop\app-3.6.3\resources\app\git\cmd\git.exe"
set "REPO=C:\Users\Daisy\AppData\Roaming\TRAE SOLO CN\ModularData\ai-agent\work-mode-projects\6a84785efe5fd9ae544c24ca\Microsoft-Rewards-Script"

echo ==========================================================
echo  Sync upstream latest into local v4
echo  (commit local changes, fetch, merge upstream/v4)
echo ==========================================================

echo.
echo [1/4] Commit local changes ...
"%GITEXE%" -C "%REPO%" add -A
if errorlevel 1 (
    echo [ERROR] git add failed.
    pause
    exit /b 1
)
"%GITEXE%" -C "%REPO%" reset -- push-changes.cmd >nul 2>&1
"%GITEXE%" -C "%REPO%" commit -F "%REPO%\.git\COMMIT_MSG.txt"
echo         Local changes committed (or nothing to commit).

echo.
echo [2/4] Fetch upstream ...
"%GITEXE%" -C "%REPO%" fetch upstream
if errorlevel 1 (
    echo [ERROR] git fetch upstream failed. Check network / upstream URL.
    pause
    exit /b 1
)
echo         Upstream fetched.

echo.
echo [3/4] Merge upstream/v4 ...
"%GITEXE%" -C "%REPO%" merge upstream/v4 --no-edit
set "MERGE_CODE=%errorlevel%"

if not "%MERGE_CODE%"=="0" (
    echo.
    echo [CONFLICT] Merge has conflicts. Unmerged files:
    "%GITEXE%" -C "%REPO%" diff --name-only --diff-filter=U
    echo.
    echo Please send the unmerged file list to the assistant,
    echo then run finish-merge.cmd after conflicts are resolved.
    pause
    exit /b 1
)

echo.
echo [4/4] Merge OK - no conflicts.
echo         Tell the assistant the merge succeeded,
echo         then run finish-merge.cmd to commit + push.
echo.
echo         (If conflicts appeared above, send the unmerged file
echo          list to the assistant so they can resolve them.)
pause
