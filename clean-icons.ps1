$f = Join-Path $PSScriptRoot 'public/index.html'
$c = Get-Content $f -Raw -Encoding UTF8

# Landing page emojis - replace with clean text or nothing
$map = @{
  '🤖 ' = 'K/ '
  '🇵🇭 ' = ''
  '⚡ '  = ''
  '✨ '  = ''
  '🚀 '  = ''
  '🔗 '  = ''
  '💰 '  = ''
  '💬 '  = ''
  '❓ '  = ''
  '📧 '  = ''
  '🧬 '  = ''
  '🔐 '  = ''
  '📱 '  = ''
  '📨 '  = ''
  '✍️ '  = ''
  '⭐ '  = ''
  '❌ '  = ''
  '😩'   = '—'
  '🐌'   = '—'
  '😴'   = '—'
  '🤯'   = '—'
  '📉'   = '—'
  '😊'   = ''
  '🙏'   = ''
  '😂'   = ''
  '📧'   = ''
  '🤖'   = ''
  '📘'   = ''
  '📸'   = ''
  '📬'   = ''
  '💬'   = ''
  '🧬'   = ''
  '⚙️'   = ''
  '📝'   = ''
  '📥'   = ''
  '🧠'   = ''
  '❤️'   = ''
  '🇵🇭'   = 'PH'
  '🎉'   = ''
  '✏️'   = ''
  '🔄'   = ''
  '⏭️'   = ''
}

foreach ($k in $map.Keys) {
  $c = $c.Replace($k, $map[$k])
}

# Clean specific patterns
$c = $c -replace '✅ No credit card', 'No credit card'
$c = $c -replace '🔒 AES-256', 'AES-256'
$c = $c -replace '⚡ 2-minute', '2-minute'
$c = $c -replace '✅ ', '· '
$c = $c -replace '<span class="bva-icon">⚡</span>', '<span class="bva-icon">—</span>'
$c = $c -replace '<span class="bva-icon">🎯</span>', '<span class="bva-icon">—</span>'
$c = $c -replace '<span class="bva-icon">🌙</span>', '<span class="bva-icon">—</span>'
$c = $c -replace '<span class="bva-icon">📈</span>', '<span class="bva-icon">—</span>'

Set-Content $f $c -NoNewline -Encoding UTF8
Write-Host "Done"
