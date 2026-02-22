Add-Type -AssemblyName System.Drawing

$dir = "c:\100star\deploy-bridge\article-images"
$pngs = Get-ChildItem -Path $dir -Filter "*.png"

foreach ($png in $pngs) {
    $jpgPath = [System.IO.Path]::ChangeExtension($png.FullName, ".jpg")
    $img = [System.Drawing.Image]::FromFile($png.FullName)
    $img.Save($jpgPath, [System.Drawing.Imaging.ImageFormat]::Jpeg)
    $img.Dispose()
    Remove-Item $png.FullName
    Write-Host "Converted: $($png.Name) -> $([System.IO.Path]::GetFileName($jpgPath))"
}

Write-Host "`nDone. $($pngs.Count) files converted."
