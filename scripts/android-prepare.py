#!/usr/bin/env python3
"""
FILMHUB — Android projesini markalaştırır (npx cap add android sonrasında çalıştırılır).

  • Başlatıcı ikonlarını (normal, yuvarlak, uyarlanabilir ön katman) tüm yoğunluklar için üretir
  • Açılış (splash) görselini her ekran oranına uygun şekilde yerleştirir
  • Koyu (OLED siyah) pencere arka planı ve Android 12+ açılış ekranı rengini ayarlar
  • İnternet izni ve sürüm bilgisini doğrular

Gereksinim: Pillow (pip install pillow)
"""
import json
import os
import re
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
ANDROID = ROOT / "android"
RES = ANDROID / "app" / "src" / "main" / "res"
SRC = ROOT / "resources" / "android"


def fail(msg: str):
    print(f"✖ {msg}")
    sys.exit(1)


if not RES.exists():
    fail("android/ klasörü bulunamadı. Önce 'npx cap add android' çalıştırın.")

icon = Image.open(SRC / "icon.png").convert("RGBA")
foreground = Image.open(SRC / "icon-foreground.png").convert("RGBA")
splash = Image.open(SRC / "splash.png").convert("RGB")


def fit(img: Image.Image, size: tuple[int, int]) -> Image.Image:
    return img.resize(size, Image.LANCZOS)


def round_icon(img: Image.Image, size: int) -> Image.Image:
    base = Image.new("RGBA", (size, size), (12, 12, 14, 255))
    inner = fit(img, (size, size))
    base.alpha_composite(inner)
    mask = Image.new("L", (size, size), 0)
    from PIL import ImageDraw
    ImageDraw.Draw(mask).ellipse((0, 0, size - 1, size - 1), fill=255)
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    out.paste(base, (0, 0), mask)
    return out


def cover(img: Image.Image, w: int, h: int) -> Image.Image:
    """Kare açılış görselini hedef boyuta merkezden kırparak yerleştirir (logo hep ortada)."""
    s = max(w, h)
    scaled = img.resize((s, s), Image.LANCZOS)
    left, top = (s - w) // 2, (s - h) // 2
    return scaled.crop((left, top, left + w, top + h))


count = 0
for d in sorted(RES.iterdir()):
    if not d.is_dir():
        continue
    for f in d.iterdir():
        if f.suffix != ".png":
            continue
        with Image.open(f) as cur:
            w, h = cur.size
        if f.name == "ic_launcher.png":
            fit(icon, (w, h)).save(f)
        elif f.name == "ic_launcher_round.png":
            round_icon(icon, w).save(f)
        elif f.name == "ic_launcher_foreground.png":
            fit(foreground, (w, h)).save(f)
        elif f.name == "splash.png":
            cover(splash, w, h).save(f)
        else:
            continue
        count += 1
print(f"✔ {count} görsel güncellendi")

# Uyarlanabilir ikon arka plan rengi
bg = RES / "values" / "ic_launcher_background.xml"
if bg.exists():
    bg.write_text(
        '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n'
        '    <color name="ic_launcher_background">#0C0C0E</color>\n</resources>\n',
        encoding="utf-8",
    )
    print("✔ İkon arka plan rengi ayarlandı")

# Tema: siyah pencere arka planı + Android 12+ açılış ekranı
styles = RES / "values" / "styles.xml"
if styles.exists():
    xml = styles.read_text(encoding="utf-8")

    def add_items(xml: str, style: str, items: dict[str, str]) -> str:
        pattern = re.compile(rf'(<style name="{re.escape(style)}"[^>]*>)(.*?)(</style>)', re.S)
        m = pattern.search(xml)
        if not m:
            return xml
        body = m.group(2)
        for k, v in items.items():
            if f'name="{k}"' not in body:
                body += f'\n        <item name="{k}">{v}</item>'
        return xml[: m.start()] + m.group(1) + body + "\n    " + m.group(3) + xml[m.end():]

    xml = add_items(xml, "AppTheme.NoActionBar", {
        "android:windowBackground": "@android:color/black",
        "android:statusBarColor": "@android:color/black",
        "android:navigationBarColor": "@android:color/black",
    })
    xml = add_items(xml, "AppTheme.NoActionBarLaunch", {
        "windowSplashScreenBackground": "@android:color/black",
        "android:windowBackground": "@drawable/splash",
    })
    styles.write_text(xml, encoding="utf-8")
    print("✔ Tema renkleri ayarlandı")

# İnternet izni (Capacitor şablonunda vardır; yine de doğrula)
manifest = ANDROID / "app" / "src" / "main" / "AndroidManifest.xml"
mx = manifest.read_text(encoding="utf-8")
if "android.permission.INTERNET" not in mx:
    mx = mx.replace("</manifest>", '    <uses-permission android:name="android.permission.INTERNET" />\n</manifest>')
    manifest.write_text(mx, encoding="utf-8")
print("✔ İnternet izni mevcut")

# Sürüm bilgisi package.json'dan; sürüm kodu CI çalıştırma numarasından
version = json.loads((ROOT / "package.json").read_text(encoding="utf-8"))["version"]
code = int(os.environ.get("GITHUB_RUN_NUMBER", "1"))
gradle = ANDROID / "app" / "build.gradle"
g = gradle.read_text(encoding="utf-8")
g = re.sub(r"versionCode\s+\d+", f"versionCode {code}", g)
g = re.sub(r'versionName\s+"[^"]*"', f'versionName "{version}"', g)
gradle.write_text(g, encoding="utf-8")
print(f"✔ Sürüm {version} ({code})")
