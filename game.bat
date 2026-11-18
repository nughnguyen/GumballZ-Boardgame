@echo off
REM Dat file nay vao trong thu muc gumballz (noi co index.html) roi nhap doi de chay
cd /d "%~dp0"
echo Dang chay GumballZ tai http://localhost:8000 ...
echo Dung tat cua so nay khi dang choi. Nhan Ctrl+C de dung.
timeout /t 2 /nobreak >nul
start "" http://localhost:8000
python -m http.server 8000
pause
