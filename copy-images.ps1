$src = "C:\Users\1\.gemini\antigravity\brain\da33318e-d80a-46ee-b6e0-f570d28ec05d"
$dst = "c:\100star\deploy-bridge\article-images"

Copy-Item "$src\db_redesign_1771711645557.png" "$dst\deploybridge_landing.png"
Copy-Item "$src\media__1771713099548.png" "$dst\ram_policy.png"
Copy-Item "$src\media__1771713276922.png" "$dst\accesskey.png"
Copy-Item "$src\media__1771713366283.png" "$dst\oss_activate.png"
Copy-Item "$src\media__1771713462934.png" "$dst\oss_purchase.png"
Copy-Item "$src\media__1771713506805.png" "$dst\oss_activated.png"
Copy-Item "$src\media__1771713853700.png" "$dst\oss_bucket.png"
Copy-Item "$src\media__1771716111647.png" "$dst\dns_conflict.png"

Write-Output "Copied 8 images"
