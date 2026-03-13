@echo off
echo Building TB-PWA-Clean with optimized settings...
echo.

REM Set Node memory limit to 4GB
set NODE_OPTIONS=--max-old-space-size=4096

REM Clean previous build
echo Cleaning previous build...
if exist .next rmdir /s /q .next
echo.

REM Run build
echo Starting build process...
bun run build

echo.
echo Build complete!
pause
