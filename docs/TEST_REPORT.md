# Test Raporu

**Tarih:** 24.11.2026 · **Sürüm:** 1.0.0

> Bu rapordaki her sonuç gerçekten çalıştırılan testlerden alınmıştır. Çalıştırılamayan testler
> açıkça “çalıştırılmadı” olarak belirtilmiştir.

## Özet

| Test türü | Ortam | Sonuç |
|---|---|---|
| Birim testleri | Node.js 22, `node:test` | **56/56 başarılı** (0 başarısız) |
| Uçtan uca (E2E) | Gerçek Chromium (Playwright 1.63), gerçek IndexedDB, masaüstü + mobil + tablet | **40/40 başarılı** |
| Web üretim derlemesi | `npm run build` | ✅ Başarılı (≈473 KB JS+CSS, sıkıştırmasız) |
| TypeScript strict | Yerel ortam | ⚠️ Kısmi — aşağıya bakın |
| Windows paketleme | — | ⏳ Bu ortamda çalıştırılmadı → GitHub Actions `windows` işi |
| Android paketleme | — | ⏳ Bu ortamda çalıştırılmadı → GitHub Actions `android` işi |
| Android cihaz kurulumu | — | ⏳ Çalıştırılmadı (cihaz / emülatör yoktu) |

## Komutlar

```bash
npm test                              # birim testleri
npm run build && npm run test:e2e     # E2E (ekran görüntüleri: tests/e2e/screenshots/)
```

## Birim testleri (56/56)

Veritabanı katmanı, IndexedDB ile aynı davranan bellek içi adaptör üzerinde test edilir
(birincil anahtar, indeks sorguları, yapılandırılmış kopyalama).

**TMDB istemcisi**

- ✅ URL parametrelerini sıralı ve boşları atlayarak üretir
- ✅ v3 anahtarını sorguya, v4 token’ı başlığa ekler
- ✅ önbellek: aynı istek ikinci kez ağa gitmez
- ✅ eşzamanlı aynı istekleri tekilleştirir
- ✅ 429 yanıtında Retry-After kadar bekleyip yeniden dener
- ✅ sunucu hatasında sınırlı sayıda yeniden dener, sonra Türkçe hata verir
- ✅ 401 → geçersiz anahtar (yeniden denemez), 404 → bulunamadı
- ✅ ağ hatasını yakalar
- ✅ anahtar yoksa istek atmadan "missing-key" hatası verir
- ✅ hatalı istek önbelleğe alınmaz; sonraki deneme başarılı olabilir

**TMDB veri dönüştürücüleri**

- ✅ liste: kişileri ayıklar, tekrarları kaldırır, belgeseli tanır
- ✅ detay: eksik alanları güvenle ele alır
- ✅ detay: yönetmen, oyuncu sırası, dizi yaratıcısı ve ortalama bölüm süresi
- ✅ videolar: yalnızca YouTube, fragman önce
- ✅ sezon ve kişi

**Keşif parametreleri**

- ✅ filtreleri TMDB parametrelerine çevirir
- ✅ dizide tarih alanı first_air_date olur; on yıl filtresi

**Şema ve migration**

- ✅ migration sürümleri artan sırada ve son sürüm doğru
- ✅ son şema gerekli tüm varlıkları içerir

**Kütüphane CRUD ve tekrar engelleme**

- ✅ izleme listesine ekler, ikinci eklemede "exists" döner
- ✅ izlendi işaretlenince izleme listesinden çıkar
- ✅ favori ekle / kaldır
- ✅ içerik anlık görüntüsü tek kayıt olarak güncellenir
- ✅ kişisel not kaydeder; boş not silinir

**Puan ve yorumlar**

- ✅ 0,5 adımlı puanları doğrular
- ✅ puan ekle → düzenle → sil; oluşturulma tarihi korunur
- ✅ geçersiz puanı reddeder
- ✅ yorum ekle → düzenle → sil; boş yorumu reddeder

**Koleksiyon yönetimi**

- ✅ oluştur, yeniden adlandır, içerik ekle/çıkar, sil (bağlı kayıtlarla)
- ✅ boş adı reddeder

**Arama geçmişi**

- ✅ aynı aramayı tekilleştirir ve sayar (Türkçe karakter duyarsız)
- ✅ en fazla 20 kayıt tutar
- ✅ tek kayıt siler ve tümünü temizler

**Tercihler ve veri silme**

- ✅ tercih kaydeder; veri silme tercihlere dokunmaz

**Sezon bölüm sayıları**

- ✅ özel bölümleri (sezon 0) hariç tutar
- ✅ devam eden dizide yayınlanmamış bölümleri saymaz

**Dizi takibi**

- ✅ bölüm işaretleme ve geri alma ilerlemeyi doğru hesaplar
- ✅ BİR SEZONU bitirmek diziyi tamamlamaz
- ✅ biten dizinin tüm bölümleri izlenince tamamlanır ve İzlediklerim’e eklenir
- ✅ devam eden dizide yayınlananların hepsi izlenince durum "güncel"dir, tamamlandı değil
- ✅ elle tamamlandı işaretleme ve geri alma
- ✅ aynı bölüm iki kez işaretlense de tek kayıt tutulur; geçmiş sıralıdır
- ✅ takibi kaldırmak bölüm kayıtlarını siler
- ✅ saf hesaplama: boş kayıtta yüzde 0

**İstatistik hesaplamaları**

- ✅ tür bazında sayar (belgesel ayrı)
- ✅ süreyi yalnızca bilinen değerlerden toplar; bilinmeyenleri ayrıca sayar
- ✅ ortalama kişisel puan
- ✅ tür ve ülke dağılımı
- ✅ aylık (son 12 ay) ve yıllık dağılım
- ✅ boş veride sahte değer üretmez
- ✅ süre biçimlendirme

**Kütüphane filtreleme ve sıralama**

- ✅ metinle arar (Türkçe karakter ve not dahil)
- ✅ türe, kategoriye ve puana göre filtreler
- ✅ sıralar

**Metin yardımcıları**

- ✅ Türkçe normalize
- ✅ günlük tohum aynı gün sabit, farklı gün farklı

## Uçtan uca testler (40/40)

TMDB ve görsel istekleri, gerçek TMDB yanıt yapısını taklit eden yerel sahte sunucuya
(`tests/e2e/mockTmdb.mjs`) yönlendirilir. Testlerdeki içerik adları hayalidir ve **yalnızca testlerde** kullanılır.
Uygulamanın kendisi her zaman gerçek TMDB verisi gösterir.

| # | Senaryo | Sonuç | Süre |
|---|---|---|---|
| 1 | Açılış ekranı gösterilir ve uygulamaya geçer | ✅ | 1.8 sn |
| 2 | Anahtar yokken karşılama ekranı ve API anahtarı formu | ✅ | 0.1 sn |
| 3 | Geçersiz API anahtarı reddedilir | ✅ | 0.1 sn |
| 4 | Geçerli anahtar kaydedilir ve ana sayfa yüklenir | ✅ | 1.2 sn |
| 5 | Ana sayfa şeritleri tembel yüklenir (kaydırınca) | ✅ | 2.3 sn |
| 6 | Film detay sayfası: bilgiler, oyuncular, fragman, galeri | ✅ | 1.5 sn |
| 7 | Fragman YouTube oynatıcısında açılır ve geri tuşu modalı kapatır | ✅ | 0.1 sn |
| 8 | İzleme listesine ekle; tekrar eklenmez (çift kayıt yok) | ✅ | 0.1 sn |
| 9 | Kişisel puan: 0,5 adımlı ver, düzenle | ✅ | 1.1 sn |
| 10 | Yorum ekle → düzenle → onaylı sil | ✅ | 1.1 sn |
| 11 | Koleksiyon oluştur ve içeriği ekle | ✅ | 0.7 sn |
| 12 | İzledim işareti izleme listesinden otomatik çıkarır | ✅ | 0.2 sn |
| 13 | Favorilere ekle | ✅ | 0.1 sn |
| 14 | Dizi: sezon sayfası, bölüm işaretleme ve geri alma | ✅ | 0.3 sn |
| 15 | Bir sezonu bitirmek diziyi TAMAMLAMAZ | ✅ | 0.2 sn |
| 16 | Dizi takibi sayfası: ilerleme ve sıradaki bölüm | ✅ | 0.4 sn |
| 17 | Kütüphane: sekmeler, sayılar, arama ve sıralama | ✅ | 0.9 sn |
| 18 | Sayfa yenilendiğinde tüm veriler kalıcıdır (IndexedDB) | ✅ | 2.7 sn |
| 19 | Kalıcı API önbelleği: yeniden açılışta aynı liste tekrar indirilmez | ✅ | 0.4 sn |
| 20 | İstatistikler gerçek verilerden hesaplanır | ✅ | 1.0 sn |
| 21 | Koleksiyon sayfası: yeniden adlandır ve sil | ✅ | 2.8 sn |
| 22 | Arama: otomatik tamamlama, sonuçlar ve arama geçmişi | ✅ | 1.3 sn |
| 23 | Arama filtreleri: tür + sıralama | ✅ | 0.3 sn |
| 24 | Kişi araması ve kişi sayfası | ✅ | 0.2 sn |
| 25 | Keşfet: tür ızgarası ve tür sayfası | ✅ | 1.0 sn |
| 26 | API hatası: anlaşılır hata ve yeniden deneme | ✅ | 1.9 sn |
| 27 | Ağ bağlantısı kesilince bağlantı hatası gösterilir | ✅ | 1.4 sn |
| 28 | Rastgele seçici bir içerik önerir | ✅ | 1.6 sn |
| 29 | Karşılaştırma tablosu | ✅ | 0.9 sn |
| 30 | Yayın takvimi | ✅ | 0.9 sn |
| 31 | Ayarlar: geliştirici imzası, TMDB atfı, veri uyarısı | ✅ | 0.9 sn |
| 32 | Bilinmeyen adres → 404 sayfası, olmayan film → hata durumu | ✅ | 0.8 sn |
| 33 | Tüm kişisel verileri silme (onaylı) | ✅ | 0.7 sn |
| 34 | Mobil ana sayfa: alt gezinme çubuğu var, kenar çubuğu gizli | ✅ | 1.1 sn |
| 35 | Mobil detay sayfası | ✅ | 1.8 sn |
| 36 | Mobil "Daha Fazla" menüsü ve geri tuşu ile kapanma | ✅ | 0.2 sn |
| 37 | Mobil sezon sayfası ve arama | ✅ | 1.1 sn |
| 38 | Yatay taşma yok (mobil) | ✅ | 3.5 sn |
| 39 | Tablet düzeni | ✅ | 4.5 sn |
| 40 | Konsolda beklenmeyen JavaScript hatası yok | ✅ | 0.0 sn |

**Kapsanan gereksinimler:** veritabanı CRUD, tekrar engelleme, arama, filtreleme, sıralama, API entegrasyonu,
API hata yönetimi (500, ağ kesintisi, geçersiz anahtar, 404), izleme listesi, favoriler, kişisel puan, yorum,
dizi ve bölüm takibi, istatistik hesapları, koleksiyon yönetimi, gezinme, duyarlı düzen (1440 / 820 / 390 px),
uygulama açılışı, kalıcılık (sayfa yenileme), kalıcı API önbelleği, Android geri tuşu davranışı (tarayıcı geçmişiyle).

## Tip denetimi hakkında

Proje `strict` modda yazılmıştır. Geliştirme ortamında `@types/react` paketi indirilemediği için tip denetimi,
React tiplerini taklit eden geçici bir tanım dosyasıyla çalıştırıldı: React dışındaki tüm kod (veri katmanı,
API, servisler, testler) hatasız geçti. Gerçek `@types/react` ile tam denetim GitHub Actions `quality` işinde
`npm run typecheck` ile yapılır.

## Platform paketleme durumu

Geliştirme ortamında Electron, electron-builder, Capacitor ve Android SDK bulunmadığı ve ağ erişimi kapalı olduğu için
`.exe` ve `.apk` dosyaları **bu ortamda üretilmedi ve test edilmedi**. Paketleme tamamen yapılandırılmıştır:

- `electron/main.cjs`, `electron-builder.yml` → GitHub Actions `windows` işi (`windows-latest`)
- `capacitor.config.json`, `scripts/android-prepare.py` → GitHub Actions `android` işi (`ubuntu-latest`)

`scripts/android-prepare.py` örnek bir Android kaynak yapısı üzerinde çalıştırılarak doğrulandı
(ikon boyutları, splash kırpma, tema, sürüm numarası). Electron dosyaları sözdizimi denetiminden geçti.

## Bilinen sınırlamalar

- IMDb puanı gösterilmez (TMDB sağlamıyor; veri uydurulmaz) — IMDb sayfasına bağlantı verilir.
- Windows paketleri kod imzalama sertifikası içermez; ilk açılışta SmartScreen uyarısı görülebilir.
- Kalıcı Android imzalama anahtarı secret olarak tanımlanmazsa her CI sürümü farklı anahtarla imzalanır.
- YouTube bazı videoların gömülü oynatılmasını engelleyebilir; bu durumda “YouTube’da aç” düğmesi kullanılır.
