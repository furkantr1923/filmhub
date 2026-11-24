# Derleme Rehberi

## Gereksinimler

| Araç | Sürüm | Ne için |
|---|---|---|
| Node.js | 20+ (22 önerilir) | Tüm derlemeler |
| Windows 10/11 | — | `.exe` paketleri (yerel derleme) |
| JDK | 21 | Android |
| Android SDK | API 35 | Android |
| Python 3 + Pillow | — | Android ikon / splash hazırlığı |

> **En kolay yol:** Hiçbir şey kurmadan projeyi GitHub’a gönderin; [GitHub Actions](#otomatik-derleme-github-actions)
> üç platformu sizin için derler.

## Komutlar

```bash
npm install            # bağımlılıklar
npm run dev            # geliştirme sunucusu (http://localhost:5173, değişiklikleri izler)
npm run build          # üretim derlemesi → dist/
npm run preview        # dist/ klasörünü sunar (http://localhost:4173)
npm test               # birim testleri
npm run test:e2e       # tarayıcı testleri (önce npm run build)
npm run typecheck      # TypeScript strict tip denetimi
npm run icons          # ikonları public/icons/icon.svg'den yeniden üretir
```

## Web

```bash
npm run build
```

`dist/` klasörü herhangi bir statik sunucuya yüklenebilir. Tüm varlık yolları göreceli olduğu için
alt klasörde (ör. `kullanici.github.io/filmhub/`) de çalışır.

## Windows

Windows bilgisayarda:

```bash
npm install
npm run dist:win
```

Çıktılar `release/` klasöründe:

- `FILMHUB-Setup.exe` — kurulum sihirbazı (Türkçe, klasör seçimi, masaüstü + Başlat menüsü kısayolu, temiz kaldırma)
- `FILMHUB-Portable.exe` — kurulumsuz tek dosya

Uygulamayı paketlemeden denemek için: `npm run electron`

Yapılandırma: [`electron-builder.yml`](../electron-builder.yml) · Ana süreç: [`electron/main.cjs`](../electron/main.cjs)

## Android

```bash
npm install
pip install pillow
npm run android:prepare      # build + cap add android + markalaştırma + cap sync
cd android
./gradlew assembleRelease    # Windows'ta: gradlew.bat assembleRelease
```

`android/` klasörü Capacitor tarafından üretilir ve repoda tutulmaz; `scripts/android-prepare.py`
ikonları, açılış ekranını, siyah temayı, internet iznini ve sürüm numarasını her seferinde aynı şekilde uygular.

Android Studio ile açmak için: `npx cap open android`

### Android imzalama

Release APK’nın kurulabilmesi için imzalanması gerekir.

**Kalıcı anahtar oluşturma (bir kez):**

```bash
keytool -genkeypair -v -keystore filmhub.jks -alias filmhub -keyalg RSA -keysize 2048 -validity 10000
```

**Elle imzalama:**

```bash
BT=$ANDROID_HOME/build-tools/35.0.0
$BT/zipalign -p -f 4 android/app/build/outputs/apk/release/app-release-unsigned.apk aligned.apk
$BT/apksigner sign --ks filmhub.jks --ks-key-alias filmhub --out FILMHUB.apk aligned.apk
```

**GitHub Actions için:** anahtarı base64’e çevirip iki secret tanımlayın:

| Secret | Değer |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | `base64 -w0 filmhub.jks` çıktısı |
| `ANDROID_KEYSTORE_PASSWORD` | anahtar parolası |

Secret tanımlanmazsa CI her derlemede geçici bir anahtar üretir: APK yine kurulabilir, ancak bir sonraki
sürüme güncellemeden önce eskisini kaldırmak gerekir. `filmhub.jks` dosyasını **asla** repoya eklemeyin.

## Otomatik derleme (GitHub Actions)

[`.github/workflows/build.yml`](../.github/workflows/build.yml) her `main` gönderiminde:

1. **quality** — birim testleri + TypeScript strict denetimi
2. **web** — üretim derlemesi → `FILMHUB-Web.zip`
3. **windows** (`windows-latest`) — `FILMHUB-Setup.exe`, `FILMHUB-Portable.exe`, `FILMHUB-Windows.zip`
4. **android** (`ubuntu-latest`) — imzalı `FILMHUB.apk`
5. **release** — hepsini `FILMHUB v<sürüm>` adlı GitHub Release’e ekler

Adımlar:

```bash
git init
git add .
git commit -m "FILMHUB 1.0.0"
git branch -M main
git remote add origin https://github.com/furkantr1923/filmhub.git
git push -u origin main
```

Ardından GitHub’da **Actions** sekmesinden ilerlemeyi izleyin (~10–15 dk). Bittiğinde dosyalar
**Releases → FILMHUB v1.0.0** sayfasında olur. Yeni sürüm için `package.json` içindeki `version` değerini artırın.

## Sürüm numarası

Tek kaynak `package.json → version`. Uygulamadaki **Ayarlar → Hakkında**, Windows paketleri, Android
`versionName` ve GitHub Release adı bu değerden üretilir. Android `versionCode`, CI çalıştırma numarasıdır.
