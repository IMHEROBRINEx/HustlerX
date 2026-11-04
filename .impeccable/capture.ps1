param([string[]]$Only)
$edge = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
$out = Join-Path $PSScriptRoot "review"
New-Item -ItemType Directory -Force -Path $out | Out-Null
$profile = Join-Path $env:TEMP "truss-shot-profile"

$shots = @(
  @{ name = "desktop";        url = "http://localhost:3000/";                              w = 1440; h = 4300 },
  @{ name = "mobile";         url = "http://localhost:3000/";                              w = 390;  h = 7600 },
  @{ name = "why-desktop";    url = "http://localhost:3000/why-us";                        w = 1440; h = 2900 },
  @{ name = "why-mobile";     url = "http://localhost:3000/why-us";                        w = 390;  h = 5200 },
  @{ name = "about-desktop";  url = "http://localhost:3000/about";                         w = 1440; h = 2000 },
  @{ name = "app-jobs-desktop";   url = "http://localhost:3000/design-preview?view=jobs&run=1";   w = 1440; h = 2600 },
  @{ name = "app-jobs-mobile";    url = "http://localhost:3000/design-preview?view=jobs&run=1";   w = 390;  h = 5400 },
  @{ name = "app-people-desktop"; url = "http://localhost:3000/design-preview?view=people&run=1"; w = 1440; h = 1800 },
  @{ name = "app-empty-desktop";  url = "http://localhost:3000/design-preview?view=jobs";         w = 1440; h = 1000 }
)

foreach ($s in $shots) {
  if ($Only -and ($Only -notcontains $s.name)) { continue }
  $file = Join-Path $out "$($s.name).png"
  & $edge --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 `
    --user-data-dir="$profile" --virtual-time-budget=6000 `
    --window-size="$($s.w),$($s.h)" --screenshot="$file" $s.url 2>$null | Out-Null
  Write-Output "$($s.name): $(Test-Path $file)"
}
