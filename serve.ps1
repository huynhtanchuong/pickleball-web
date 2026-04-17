# serve.ps1 - Minimal HTTP server for pick-web
# Run: powershell -ExecutionPolicy Bypass -File serve.ps1

$port = 5500
$root = $PSScriptRoot

$listener = [System.Net.HttpListener]::new()
$listener.Prefixes.Add("http://localhost:$port/")
$listener.Start()

Write-Host ""
Write-Host "  Pickleball Tournament Server" -ForegroundColor Cyan
Write-Host "  Serving: $root" -ForegroundColor Gray
Write-Host "  URL    : http://localhost:$port" -ForegroundColor Green
Write-Host "  Press Ctrl+C to stop." -ForegroundColor Gray
Write-Host ""

Start-Process "http://localhost:$port"

$mimeTypes = @{
  ".html" = "text/html; charset=utf-8"
  ".css"  = "text/css; charset=utf-8"
  ".js"   = "application/javascript; charset=utf-8"
  ".json" = "application/json"
  ".png"  = "image/png"
  ".ico"  = "image/x-icon"
}

while ($listener.IsListening) {
  $ctx  = $listener.GetContext()
  $req  = $ctx.Request
  $resp = $ctx.Response

  $urlPath = $req.Url.LocalPath
  if ($urlPath -eq "/") { $urlPath = "/index.html" }

  $filePath = Join-Path $root $urlPath.TrimStart("/")

  if (Test-Path $filePath -PathType Leaf) {
    $ext   = [System.IO.Path]::GetExtension($filePath)
    $mime  = if ($mimeTypes[$ext]) { $mimeTypes[$ext] } else { "application/octet-stream" }
    $bytes = [System.IO.File]::ReadAllBytes($filePath)
    $resp.ContentType      = $mime
    $resp.ContentLength64  = $bytes.Length
    $resp.StatusCode       = 200
    $resp.OutputStream.Write($bytes, 0, $bytes.Length)
  } else {
    $notFound = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found")
    $resp.StatusCode      = 404
    $resp.ContentLength64 = $notFound.Length
    $resp.OutputStream.Write($notFound, 0, $notFound.Length)
  }

  $resp.OutputStream.Close()
}
