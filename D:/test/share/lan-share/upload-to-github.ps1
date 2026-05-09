$env:Path = "C:\Program Files\GitHub CLI;" + $env:Path
$token = gh auth token

cd "d:\test\share\lan-share"

$headers = @{
    "Authorization" = "token $token"
    "Accept" = "application/vnd.github.v3+json"
    "Content-Type" = "application/json"
}

$files = Get-ChildItem -Recurse -File | Where-Object {
    $_.FullName -notmatch '\.git' -and
    $_.FullName -notmatch 'node_modules' -and
    $_.FullName -notmatch '__pycache__' -and
    $_.FullName -notmatch '\.zip$' -and
    $_.FullName -notmatch 'installer\\dist' -and
    $_.FullName -notmatch 'installer\\python-embed' -and
    $_.FullName -notmatch 'installer\\python-3' -and
    $_.Length -lt 1MB
}

Write-Host "Uploading $($files.Count) files..."

$blobs = @{}
$treeItems = @()

foreach ($file in $files) {
    $relativePath = $file.FullName.Replace("d:\test\share\lan-share\", "").Replace("\", "/")

    if ($file.Extension -in @('.py', '.js', '.ts', '.tsx', '.json', '.css', '.html', '.md', '.txt', '.bat', '.ps1', '.svg', '.env', '.iss', '.spec')) {
        $content = [System.IO.File]::ReadAllText($file.FullName)
        $encoding = "utf-8"
    } else {
        $content = [Convert]::ToBase64String([System.IO.File]::ReadAllBytes($file.FullName))
        $encoding = "base64"
    }

    $blobBody = @{
        content = $content
        encoding = $encoding
    } | ConvertTo-Json

    try {
        $blob = Invoke-RestMethod -Uri "https://api.github.com/repos/Etheelper/LAN-Share/git/blobs" -Headers $headers -Method POST -Body $blobBody
        $blobs[$relativePath] = $blob.sha
        $treeItems += @{path=$relativePath; mode="100644"; type="blob"; sha=$blob.sha}
    } catch {
        Write-Host "Error uploading $relativePath : $($_.Exception.Message)"
    }

    if (($treeItems.Count % 10) -eq 0) {
        Write-Host "Uploaded $($treeItems.Count) files..."
    }
}

Write-Host "Creating tree..."
$treeBody = @{
    tree = $treeItems
    base_tree = $null
} | ConvertTo-Json -Depth 10

$tree = Invoke-RestMethod -Uri "https://api.github.com/repos/Etheelper/LAN-Share/git/trees" -Headers $headers -Method POST -Body $treeBody
Write-Host "Tree created: $($tree.sha)"

$commitBody = @{
    message = "feat: LAN Share v1.2.0 - 局域网资源共享系统"
    author = @{name="LAN Share"; email="lanshare@users.noreply.github.com"}
    tree = $tree.sha
} | ConvertTo-Json

$commit = Invoke-RestMethod -Uri "https://api.github.com/repos/Etheelper/LAN-Share/git/commits" -Headers $headers -Method POST -Body $commitBody
Write-Host "Commit created: $($commit.sha)"

$refBody = @{ref="refs/heads/main"; sha=$commit.sha} | ConvertTo-Json
Invoke-RestMethod -Uri "https://api.github.com/repos/Etheelper/LAN-Share/git/refs/heads/main" -Headers $headers -Method PATCH -Body $refBody
Write-Host "Branch updated!"

Write-Host "Done! https://github.com/Etheelper/LAN-Share"
