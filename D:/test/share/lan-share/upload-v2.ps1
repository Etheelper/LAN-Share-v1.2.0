$env:Path = "C:\Program Files\GitHub CLI;" + $env:Path
$token = gh auth token
$headers = @{
    "Authorization" = "token $token"
    "Accept" = "application/vnd.github.v3+json"
}

cd "d:\test\share\lan-share"

$repo = "Etheelper/LAN-Share-v1.2.0"

$files = Get-ChildItem -Recurse -File | Where-Object {
    $_.FullName -notmatch '\.git' -and
    $_.FullName -notmatch 'node_modules' -and
    $_.FullName -notmatch '__pycache__' -and
    $_.FullName -notmatch '\.zip$' -and
    $_.FullName -notmatch 'installer\\dist' -and
    $_.FullName -notmatch 'installer\\python-embed' -and
    $_.FullName -notmatch 'installer\\python-3' -and
    $_.Length -lt 500KB
}

Write-Host "Uploading $($files.Count) files..."

$count = 0
foreach ($file in $files) {
    $relativePath = $file.FullName.Replace("d:\test\share\lan-share\", "").Replace("\", "/")
    $count++
    
    $content = [System.IO.File]::ReadAllText($file.FullName)
    $sha = $null
    
    try {
        $existing = Invoke-RestMethod -Uri "https://api.github.com/repos/$repo/contents/$relativePath" -Headers $headers -Method GET
        $sha = $existing.sha
    } catch {}
    
    $body = @{
        message = "Update $relativePath"
        content = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($content))
        sha = $sha
    } | ConvertTo-Json
    
    $tempFile = "$env:TEMP\gh_upload_$([guid]::NewGuid().ToString('N')).json"
    $body | Out-File -FilePath $tempFile -Encoding UTF8 -NoNewline
    
    $result = Invoke-RestMethod -Uri "https://api.github.com/repos/$repo/contents/$relativePath" -Headers $headers -Method PUT -Body ([System.IO.File]::ReadAllText($tempFile))
    
    Remove-Item $tempFile -Force -ErrorAction SilentlyContinue
    
    Write-Host "[$count/$($files.Count)] OK: $relativePath"
}

Write-Host "Done! https://github.com/$repo"
