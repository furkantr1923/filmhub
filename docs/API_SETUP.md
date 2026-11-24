# TMDB API Kurulumu

FILMHUB tüm film, dizi, belgesel, oyuncu ve görsel verilerini **The Movie Database (TMDB)** API’sinden alır.

## 1. Ücretsiz anahtar alma

1. <https://www.themoviedb.org/signup> adresinden ücretsiz hesap açın ve e-postanızı doğrulayın.
2. **Profil → Ayarlar → API** sayfasına gidin: <https://www.themoviedb.org/settings/api>
3. **Create / Request an API Key** → kullanım türü **Developer** (kişisel / eğitim amaçlı).
4. Formu doldurun (uygulama adı: FILMHUB, açıklama: kişisel film arşivi).
5. Sayfada iki değer görünür — **ikisi de çalışır**:
   - **API Key** (v3) — 32 karakterlik kısa anahtar
   - **API Read Access Token** (v4) — `eyJ…` ile başlayan uzun token *(önerilir)*

## 2. Anahtarı FILMHUB’a girme

### Yöntem A — Uygulama içinden (önerilen)

İlk açılışta çıkan ekranda ya da **Ayarlar → TMDB bağlantısı** bölümünde anahtarı yapıştırıp
**Kaydet ve doğrula**’ya basın. FILMHUB anahtarı TMDB’ye sorarak doğrular, geçerliyse yalnızca o cihazda saklar.

✅ GitHub’a yüklediğiniz kaynak kodda **hiçbir anahtar bulunmaz.**

### Yöntem B — Derleme sırasında `.env` ile

Kendi kişisel derlemeniz için anahtarı uygulamaya gömmek isterseniz:

```bash
cp .env.example .env
# .env dosyasını açıp FILMHUB_TMDB_KEY değerini doldurun
npm run build
```

`.env` dosyası `.gitignore` içindedir; repoya gönderilmez.
GitHub Actions derlemelerinde aynı değeri **Settings → Secrets and variables → Actions → New repository secret**
bölümünden `FILMHUB_TMDB_KEY` adıyla tanımlayabilirsiniz.

> ⚠️ İstemci tarafı bir uygulamaya gömülen her anahtar, derlenmiş dosyayı inceleyen biri tarafından okunabilir.
> Bu yüzden herkese dağıtacağınız derlemelerde **Yöntem A**’yı kullanın (secret tanımlamayın).
> Kullanıcı başına anahtar, TMDB’nin ücretsiz kullanım koşullarıyla da uyumludur.

Öncelik sırası: **Ayarlar’daki anahtar → .env anahtarı**.

## 3. Kullanılan uç noktalar

| Amaç | Uç nokta |
|---|---|
| Trend / popüler / en iyi / yakında / vizyonda | `/trending/*`, `/movie/popular`, `/movie/top_rated`, `/movie/upcoming`, `/movie/now_playing`, `/tv/popular`, `/tv/top_rated` |
| Keşif ve filtreler, belgeseller, takvim | `/discover/movie`, `/discover/tv` |
| Detay (tek istekte) | `/movie/{id}` ve `/tv/{id}` + `append_to_response=credits,videos,images,similar,recommendations` |
| Sezon ve bölümler | `/tv/{id}/season/{n}` |
| Arama | `/search/multi`, `/search/movie`, `/search/tv`, `/search/person` |
| Kişi | `/person/{id}?append_to_response=combined_credits` |
| Türler | `/genre/movie/list`, `/genre/tv/list` |
| Anahtar doğrulama | `/authentication` |

Tüm istekler `language=tr-TR` ile yapılır; Türkçe özet yoksa yalnızca özet için İngilizceye düşülür.

## 4. Performans ve limitler

- **Önbellek:** Yanıtlar bellekte ve IndexedDB’de süreli saklanır (listeler 3 sa, detaylar 12 sa, türler 7 gün).
- **Tekilleştirme:** Aynı anda yapılan aynı istekler tek ağ isteğine indirgenir.
- **Eşzamanlılık sınırı:** En fazla 6 eşzamanlı istek.
- **Rate limit (HTTP 429):** `Retry-After` süresi kadar beklenip otomatik yeniden denenir.
- **Hatalar:** 401 (geçersiz anahtar), 404, 5xx, zaman aşımı ve çevrimdışı durumları Türkçe mesajlarla gösterilir.

## 5. IMDb puanı hakkında

TMDB, IMDb **puanı** sağlamaz; yalnızca IMDb kimliğini verir. FILMHUB veri uydurmamak için IMDb puanı göstermez,
bunun yerine içeriğin IMDb sayfasına bağlantı verir. OMDb entegrasyonu, ücretsiz katmanın günlük 1.000 istek sınırı ve
ek anahtar gereksinimi nedeniyle bu sürüme dahil edilmemiştir.

## 6. Atıf ve kullanım koşulları

FILMHUB, TMDB’nin [API kullanım koşullarına](https://www.themoviedb.org/api-terms-of-use) uygun olarak
**Ayarlar → Hakkında** bölümünde şu bildirimi gösterir:

> Bu ürün TMDB API’sini kullanır ancak TMDB tarafından onaylanmamış veya sertifikalandırılmamıştır.
