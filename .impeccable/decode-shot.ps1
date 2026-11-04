param([string]$In, [string]$Out)
$json = Get-Content -Raw -Path $In | ConvertFrom-Json
$data = if ($json.data) { $json.data } elseif ($json.result.data) { $json.result.data } else { throw "no data field" }
New-Item -ItemType Directory -Force -Path (Split-Path $Out) | Out-Null
[IO.File]::WriteAllBytes($Out, [Convert]::FromBase64String($data))
Write-Output "wrote $Out"
