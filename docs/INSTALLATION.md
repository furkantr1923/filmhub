# Kurulum

## Windows

**Kurulumlu sürüm — `FILMHUB-Setup.exe`**

1. Dosyayı çift tıklayın.
2. Windows SmartScreen “Bilinmeyen yayımcı” uyarısı gösterirse **Ek bilgi → Yine de çalıştır** seçin (uygulama kod imzalama sertifikasıyla imzalanmadığı için bu uyarı normaldir).
3. Kurulum klasörünü seçin; masaüstü ve Başlat menüsü kısayolları otomatik oluşturulur.
4. Kaldırmak için: **Ayarlar → Uygulamalar → FILMHUB → Kaldır**.

**Kurulumsuz sürüm — `FILMHUB-Portable.exe`**

Kurulum gerektirmez; dosyayı istediğiniz klasöre koyup çalıştırın.

> Her iki sürüm de kişisel verileri `%APPDATA%\FILMHUB` altında saklar. Kaldırma işlemi bu klasörü silmez;
> ancak klasör elle silinirse kayıtlar geri getirilemez (yedekleme özelliği bilinçli olarak yoktur).

## Android

1. `FILMHUB.apk` dosyasını telefona indirin.
2. Açın; istenirse **Bilinmeyen kaynaklardan yüklemeye izin ver** seçeneğini bu indirme uygulaması için etkinleştirin.
3. **Yükle**’ye dokunun.

Gereksinim: Android 6.0 (API 23) veya üzeri, ARM64 / ARMv7 / x86_64. Uygulama yalnızca **İnternet** iznine ihtiyaç duyar.

> Kalıcı imzalama anahtarı tanımlanmamış CI derlemelerinde her sürüm farklı anahtarla imzalanır;
> bu durumda güncellemeden önce eski sürümü kaldırmanız gerekir (bkz. [BUILD_GUIDE.md](BUILD_GUIDE.md#android-imzalama)).

## Web

`FILMHUB-Web.zip` içeriğini herhangi bir statik sunucuya (GitHub Pages, Netlify, Vercel, Nginx…) yükleyin.
Hash tabanlı yönlendirme kullanıldığı için sunucu tarafında yönlendirme kuralı gerekmez; alt klasörlerde de çalışır.

Yerelde denemek için:

```bash
npm install
npm run build
npm run preview      # http://localhost:4173
```

## İlk açılış

Uygulama ilk açılışta **TMDB API anahtarı** ister. Anahtar ücretsizdir ve 2 dakikada alınır → [API_SETUP.md](API_SETUP.md)

Anahtar yalnızca cihazınızda saklanır; istediğiniz zaman **Ayarlar → TMDB bağlantısı** bölümünden değiştirebilir veya kaldırabilirsiniz.

## İnternet bağlantısı

FILMHUB içerik verilerini TMDB’den anlık getirir; normal kullanım için internet gerekir.
Kişisel kayıtlarınız (listeler, puanlar, dizi ilerlemesi) cihazınızda tutulur. Bağlantı yoksa uygulama
çökmeden anlaşılır bir hata mesajı ve **Tekrar dene** düğmesi gösterir.
