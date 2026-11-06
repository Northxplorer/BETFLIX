@echo off
REM Se placer dans le dossier du script (double-clic depuis l'explorateur)
cd /d "%~dp0"

echo ===================================================
echo   Creation de l'executable Dashboard T2 (Windows)
echo ===================================================

echo.
echo 0. Fermeture de l'application si elle est ouverte...
taskkill /F /IM "T2_dashboard.exe" >nul 2>&1
taskkill /F /IM "Dashboard T2.exe" >nul 2>&1

REM Verifier Node.js et Python
where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo Erreur: Node.js / npm n'est pas installe ou n'est pas dans le PATH.
    echo Installez Node.js depuis https://nodejs.org
    pause
    exit /b 1
)
REM "python" peut etre un raccourci vers le Microsoft Store : sinon utiliser "py"
set PY=python
python --version >nul 2>&1
if %errorlevel% neq 0 set PY=py
%PY% --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Erreur: Python n'est pas installe ou n'est pas dans le PATH.
    echo Installez Python depuis https://python.org
    pause
    exit /b 1
)

echo.
echo 1. Installation des dependances...
if not exist node_modules (
    call npm install
    if errorlevel 1 (
        echo ERREUR: npm install a echoue.
        pause
        exit /b 1
    )
)
%PY% -m pip install pyinstaller
if errorlevel 1 (
    echo Erreur critique: Impossible d'installer PyInstaller.
    pause
    exit /b 1
)

echo.
echo 2. Compilation de l'interface (npm run build vers le dossier web)...
call npm run build
if errorlevel 1 (
    echo.
    echo ERREUR: la compilation de l'interface a echoue. Voir les erreurs ci-dessus.
    pause
    exit /b 1
)
if not exist "web\index.html" (
    echo.
    echo ERREUR: web\index.html est introuvable apres la compilation.
    pause
    exit /b 1
)

echo.
echo 3. Construction de l'executable...
echo    Cela peut prendre quelques instants...
%PY% -m PyInstaller --noconfirm --clean T2_dashboard.spec
if errorlevel 1 (
    echo.
    echo ERREUR: La construction a echoue.
    pause
    exit /b 1
)

echo.
echo ===================================================
echo   SUCCES !
echo   L'executable se trouve dans dist\T2_dashboard.exe
echo   Vous pouvez le copier sur le lecteur Q:
echo ===================================================
pause
