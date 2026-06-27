$basePath = "C:\Users\sanga\Desktop\IA - Copie\IA\aura-os\apps\frontend"
$nextPath = Join-Path $basePath ".next"
$cachePath = Join-Path $basePath "node_modules\.cache"

if (Test-Path $nextPath) {
    Remove-Item $nextPath -Recurse -Force
    Write-Host "Removed .next"
} else {
    Write-Host ".next not found"
}

if (Test-Path $cachePath) {
    Remove-Item $cachePath -Recurse -Force
    Write-Host "Removed node_modules/.cache"
} else {
    Write-Host "node_modules/.cache not found"
}
