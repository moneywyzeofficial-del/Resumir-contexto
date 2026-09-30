@echo off
chcp 65001 > nul
title Resumo de Conteudo com IA
echo ========================================================
echo   Resumo de Conteudo com IA (Videos, Imagens e Web)
echo ========================================================
echo.

REM Verificar Python
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERRO] Python nao encontrado. Por favor instala o Python 3.10 ou superior.
    pause
    exit /b 1
)

REM Criar .env a partir de .env.example se nao existir
if not exist .env (
    if exist .env.example (
        copy .env.example .env > nul
        echo [INFO] Ficheiro .env criado.
    )
)

echo [1/2] A verificar dependencias...
pip install -r requirements.txt --quiet

echo.
echo [2/2] A iniciar o servidor web...
echo --------------------------------------------------------
echo   No teu computador:  http://localhost:8000
echo   No teu iPhone:      http://192.168.0.4:8000
echo   (Certifica-te de que o iPhone esta no mesmo Wi-Fi)
echo --------------------------------------------------------
echo.

REM Abrir o browser no PC apos 2 segundos
start "" timeout /t 2 /nobreak >nul & start http://localhost:8000

REM Iniciar FastAPI a escutar em 0.0.0.0 para acesso pelo telemovel
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

pause
