@echo off
cd /d "%~dp0"
powershell.exe -NoExit -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start_telegram_image_download.ps1"
