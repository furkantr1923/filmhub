<div align="center">

<img src="public/icons/icon-512.png" width="96" alt="FILMHUB logosu" />

# FILMHUB

**Film, dizi ve belgesel keşif & kişisel koleksiyon platformu**

Windows · Android · Web — tek kod tabanı, aynı premium deneyim

![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20Android%20%7C%20Web-111?style=flat-square)
![React](https://img.shields.io/badge/React-19-111?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-111?style=flat-square&logo=typescript)
![Tests](https://img.shields.io/badge/testler-56%20birim%20%2B%2040%20E2E-111?style=flat-square)
![License](https://img.shields.io/badge/lisans-MIT-111?style=flat-square)

<img src="docs/screenshots/02-home-desktop.jpg" width="820" alt="FILMHUB ana sayfa" />

</div>

---

## ✨ Özellikler

| | |
|---|---|
| 🎬 **Keşif** | Öne çıkanlar vitrini, trend & popüler listeler, belgeseller, yakında vizyonda, günün filmi, küratörlü koleksiyonlar, tür kâşifi |
| 📄 **Detay sayfaları** | Türkçe + orijinal ad, özet, süre, türler, ülkeler, yapım şirketleri, TMDB puanı, IMDb bağlantısı, oyuncu & ekip, fragmanlar, galeri, benzer içerikler |
| 🔎 **Arama** | Film / dizi / belgesel / oyuncu / yönetmen; otomatik tamamlama, öneriler, geçmiş, tür-yıl-puan-ülke filtreleri, sıralama, sonsuz kaydırma |
| 📚 **Kütüphane** | İzlediklerim · İzleme Listem · Favorilerim; kişisel notlar, kütüphane içi arama, filtre ve sıralama, çift kayıt engeli |
| ⭐ **Puan & yorum** | 0–10 arası, 0,5 adımlı kişisel puan; yorum ekleme / düzenleme / silme (topluluk puanından ayrı) |
| 📺 **Dizi takibi** | Bölüm bölüm işaretleme, sezon & genel ilerleme, sıradaki bölüm, izleme geçmişi, *İzleniyor / Güncel / Tamamlandı* durumları |
| 📊 **İstatistikler** | Film / dizi / belgesel / bölüm sayıları, tahmini izleme süresi, ortalama puan, tür & ülke dağılımı, aylık / yıllık grafikler, ısı haritası |
| 🗂️ **Koleksiyonlar** | Kendi listelerinizi oluşturun, adlandırın, kapak seçin, sıralayın, filtreleyin |
| 🧰 **Araçlar** | Rastgele seçici, iki yapımı karşılaştırma, 90 günlük yayın takvimi |

> FILMHUB tam uzunlukta film veya bölüm **yayınlamaz**. Fragmanlar yalnızca YouTube’un resmi gömme oynatıcısıyla gösterilir.

## 📸 Ekran görüntüleri

| Detay | Dizi takibi | İstatistikler |
|---|---|---|
| <img src="docs/screenshots/04-detail-movie.jpg" /> | <img src="docs/screenshots/06-tracker.jpg" /> | <img src="docs/screenshots/08-stats.jpg" /> |

| Mobil ana sayfa | Mobil detay | Sezon | Karşılaştırma |
|---|---|---|---|
| <img src="docs/screenshots/20-mobile-home.jpg" width="200" /> | <img src="docs/screenshots/21-mobile-detail.jpg" width="200" /> | <img src="docs/screenshots/05-season.jpg" /> | <img src="docs/screenshots/15-compare.jpg" /> |

<sub>Ekran görüntüleri otomatik E2E testleri sırasında, hayali test verileriyle alınmıştır.</sub>

## 🚀 Hızlı başlangıç

```bash
git clone https://github.com/furkantr1923/filmhub.git
cd filmhub
npm install
npm run dev          # http://localhost:5173
```

İlk açılışta ücretsiz **TMDB API anahtarınızı** girin → [docs/API_SETUP.md](docs/API_SETUP.md)

## 📦 İndirme (hazır sürümler)

Her `main` gönderiminde GitHub Actions üç platformu otomatik derler ve **Releases** sayfasına ekler:

| Platform | Dosya |
|---|---|
| Windows kurulum | `FILMHUB-Setup.exe` |
| Windows kurulumsuz | `FILMHUB-Portable.exe` |
| Android | `FILMHUB.apk` |
| Web | `FILMHUB-Web.zip` |

## 🏗️ Teknoloji

**React 19 · TypeScript (strict) · Tailwind CSS v4 · esbuild · IndexedDB · Electron · Capacitor · Playwright**

```
src/
├── api/            TMDB istemcisi (önbellek, tekilleştirme, rate-limit, hata yönetimi)
├── db/             Depolama arayüzü + IndexedDB / bellek adaptörleri + migration'lar
├── repositories/   Kütüphane, puan, dizi, koleksiyon, arama geçmişi, tercihler
├── services/       İstatistik, dizi ilerlemesi, filtre/sıralama, olay yolu
├── components/     Tasarım sistemi (kart, şerit, modal, grafik, oynatıcı…)
├── pages/          17 ekran (kod bölme ile tembel yüklenir)
├── platform/       Web / Windows / Android farkları
└── router/         Hash tabanlı yönlendirici
electron/           Windows kabuğu        tests/unit/   56 birim testi
scripts/            Derleme araçları      tests/e2e/    40 adımlık tarayıcı testi
```

Ayrıntılar: [ARCHITECTURE.md](docs/ARCHITECTURE.md)

## 🧪 Testler

```bash
npm test              # 56 birim testi (veritabanı, dizi takibi, istatistik, API)
npm run build && npm run test:e2e   # 40 adımlık gerçek tarayıcı testi
```

Sonuçlar: [TEST_REPORT.md](docs/TEST_REPORT.md)

## 📚 Dokümantasyon

[Kurulum](docs/INSTALLATION.md) · [Mimari](docs/ARCHITECTURE.md) · [API kurulumu](docs/API_SETUP.md) · [Derleme rehberi](docs/BUILD_GUIDE.md) · [Test raporu](docs/TEST_REPORT.md)

## 🔐 Gizlilik

Hesap, kayıt, sunucu veya bulut senkronizasyonu yoktur. Tüm kişisel veriler **yalnızca cihazınızda** saklanır.
Yedekleme bilinçli olarak bulunmadığından uygulamayı kaldırmak kayıtların kalıcı olarak silinmesine yol açabilir.

## 🙏 Atıf

<img src="https://img.shields.io/badge/TMDB-01b4e4?style=flat-square" alt="TMDB" />
Bu ürün TMDB API’sini kullanır ancak TMDB tarafından onaylanmamış veya sertifikalandırılmamıştır.

---

<div align="center"><sub>Designed &amp; Developed by <b>Furkan</b> · MIT Lisansı</sub></div>
