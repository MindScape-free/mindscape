$file = 'src\components\chat-panel.tsx'
$lines = [System.IO.File]::ReadAllLines($file)

# Lines 1617-1631 are 0-indexed as 1616-1630
# Remove those lines
$newLines = @()
for ($i = 0; $i -lt $lines.Length; $i++) {
    if ($i -ge 1616 -and $i -le 1630) {
        # skip orphaned old block
    } else {
        $newLines += $lines[$i]
    }
}

[System.IO.File]::WriteAllLines($file, $newLines)
Write-Host "Removed orphaned lines. New line count: $($newLines.Length)"
