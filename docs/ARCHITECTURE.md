# Mimari

## Genel bakış

FILMHUB, üç platformda **tek bir React + TypeScript kod tabanı** çalıştırır. Platforma özel kısımlar
yalnızca ince kabuklardır:

```
                     ┌────────────────────────────────────────────┐
                     │        FILMHUB Web Uygulaması (dist/)      │
                     │  React 19 · TypeScript strict · Tailwind 4 │
                     └───────────────┬───────────────┬────────────┘
                                     │               │
        ┌────────────────────────────┼───────────────┼───────────────────────────┐
        │                            │               │                           │
┌───────▼────────┐        ┌──────────▼─────────┐  ┌──▼─────────────────┐
│  Web tarayıcı  │        │ Windows: Electron  │  │ Android: Capacitor │
│ (statik barın.)│        │ app:// protokolü   │  │ WebView, https://  │
└────────────────┘        │ NSIS + Portable    │  │ localhost köken    │
                          └────────────────────┘  └────────────────────┘
```

## Katmanlar

```
pages/           Ekranlar (kod bölme: her sayfa ayrı paket parçası, ihtiyaç anında yüklenir)
   │
components/      Tasarım sistemi: düğmeler, kartlar, şeritler, modal, grafikler, oynatıcı
   │
hooks/           useQuery · useLiveQuery · usePaged · useInView · useDebounced
   │
services/        İş kuralları (saf fonksiyonlar, birim testli)
   │               stats.ts · seriesProgress.ts · libraryQuery.ts · lists.ts · events.ts
   │
repositories/    Veri erişimi: library · rating · series · collection · searchHistory · preferences
   │
db/              StorageAdapter arayüzü ─┬─ IndexedDbAdapter (Web / Windows / Android)
                                        └─ MemoryAdapter (birim testleri)
api/             TmdbClient (önbellek, tekilleştirme, kuyruk, yeniden deneme) → mappers → tmdb.ts
platform/        Web / Windows / Android farkları (dış bağlantı açma, platform adı)
router/          Hash tabanlı yönlendirici
```

**Bağımlılık yönü tek yönlüdür:** sayfalar repository’leri ve servisleri kullanır; repository’ler yalnızca
`StorageAdapter` arayüzünü bilir. Böylece depolama teknolojisi değişse bile üst katmanlar etkilenmez.

## Yerel veritabanı

### Neden her platformda IndexedDB?

Electron (Chromium) ve Android WebView, tarayıcıyla **aynı IndexedDB motorunu** kullanır. Bu sayede
üç platformda tek bir, test edilmiş depolama kodu çalışır. Windows’ta veriler `%APPDATA%\FILMHUB`, Android’de
uygulamanın özel veri klasöründe kalıcı olarak saklanır. `navigator.storage.persist()` ile tarayıcının veriyi
kendiliğinden silmesi de engellenir.

SQLite’a geçmek istenirse yalnızca `StorageAdapter` arayüzünü uygulayan yeni bir adaptör yazmak yeterlidir;
hiçbir repository veya ekran değişmez.

> Her cihazın veritabanı bağımsızdır; cihazlar arası senkronizasyon bilinçli olarak yoktur.

### Şema (varlıklar)

| Depo | Birincil anahtar | İndeksler | Açıklama |
|---|---|---|---|
| `mediaItems` | `key` ("movie:603") | type, tmdbId | İçerik anlık görüntüsü (istatistiklerin kaynağı) |
| `watched` | `key` | watchedAt | İzlediklerim |
| `watchlist` | `key` | addedAt | İzleme listesi |
| `favorites` | `key` | addedAt | Favoriler |
| `ratings` | `key` | value | Kişisel puan (0–10, 0,5 adım) |
| `reviews` | `key` | — | Kişisel yorum |
| `notes` | `key` | — | Kişisel not |
| `series` | `tmdbId` | — | Dizi takip kaydı (sezon bölüm / yayınlanan bölüm sayıları) |
| `watchedEpisodes` | `"dizi:sezon:bölüm"` | seriesId, watchedAt | İzlenen bölümler |
| `collections` | `id` (UUID) | updatedAt | Kişisel koleksiyonlar |
| `collectionItems` | `"koleksiyon\|içerik"` | collectionId, key | Koleksiyon ↔ içerik ilişkisi |
| `searchHistory` | normalize edilmiş sorgu | lastUsedAt | Arama geçmişi (en fazla 20) |
| `preferences` | `key` | — | API anahtarı, bildirim onayı |
| `apiCache` | URL | expiresAt | Kalıcı API önbelleği |

- **Tekrar engelleme:** Birincil anahtarlar doğal anahtarlardır (`movie:603`, `1399:1:5`); aynı kayıt iki kez oluşamaz.
- **İlişkiler:** `collectionItems.collectionId → collections.id` gibi yabancı anahtar ilişkileri indekslerle sorgulanır;
  koleksiyon silindiğinde bağlı kayıtlar da silinir (cascade).
- **Migration’lar:** `db/schema.ts` içindeki `MIGRATIONS` listesi sürüm sürüm uygulanır; yalnızca eksik adımlar çalışır.

## Dizi ilerleme kuralları

`services/seriesProgress.ts` saf fonksiyonları:

1. Sezon 0 (özel bölümler) ilerlemeye dahil edilmez.
2. Devam eden dizilerde, son yayınlanan bölümden sonrakiler **yayınlanmamış** sayılır.
3. Durumlar:
   - **İzleniyor** — yayınlanmış bölümlerden izlenmemiş olan var
   - **Güncel** — yayınlanan her şey izlendi ama dizi sürüyor
   - **Tamamlandı** — dizi sona ermiş *ve* tüm bölümler izlenmiş, ya da kullanıcı elle işaretlemiş
4. **Bir sezonu bitirmek diziyi asla tamamlamaz** (birim testi ve E2E testiyle doğrulanır).
5. Dizi tamamlandığında otomatik olarak *İzlediklerim*’e eklenir; tamamlanma bozulursa çıkarılır.

## API katmanı

```
istek → bellek önbelleği ─hit→ yanıt
          │miss
          ▼
     eşzamanlı aynı istek var mı? ─evet→ aynı Promise
          │hayır
          ▼
     IndexedDB önbelleği ─hit→ yanıt
          │miss
          ▼
     kuyruk (en fazla 6 eşzamanlı) → fetch (15 sn zaman aşımı)
          │
          ├─ 429 → Retry-After kadar bekle, yeniden dene
          ├─ 5xx / ağ hatası → üstel bekleme ile 2 kez yeniden dene
          ├─ 401 → "API anahtarı geçersiz" (yeniden denenmez)
          └─ 200 → mapper → tipli model → önbelleğe yaz
```

Ham TMDB yanıtları hiçbir zaman ekranlara ulaşmaz; `api/mappers.ts` eksik alanları güvenle `null`/boş
değerlere çevirir ve tekrar eden kayıtları ayıklar. Uygulama hiçbir koşulda veri uydurmaz.

## Durum yönetimi

Global durum kütüphanesi kullanılmaz:

- **Sunucu verisi:** `useQuery` / `usePaged` (önbellek API istemcisinde)
- **Yerel veri:** `useLiveQuery` — repository değişiklik yaptığında `events.ts` üzerinden konu yayınlar
  (`library`, `series`, `ratings`…), ilgili ekranlar kendini yeniler.
- **Kart rozetleri:** `LibraryProvider` kütüphane anahtarlarını bellekte tutar (O(1) sorgu).

## Performans

| Teknik | Uygulama |
|---|---|
| Kod bölme | 17 sayfa ayrı parça; ilk paket ≈185 KB (gzip ≈60 KB) |
| Tembel yükleme | Ana sayfa şeritleri ekrana yaklaşınca veri çeker; görseller `loading="lazy"` |
| Görsel optimizasyonu | Kullanım yerine göre TMDB boyutu (`w185`…`w1280`) + `srcset` |
| İstek azaltma | Önbellek + tekilleştirme + 300–450 ms debounce |
| Render | `memo`’lu kartlar, sabit en-boy oranlı yer tutucular (kayma yok) |
| Animasyon | Yalnızca `transform` / `opacity`; `prefers-reduced-motion` desteklenir |

## Güvenlik

- Kaynak kodda gizli anahtar yok; anahtar cihazda veya derleme ortamında.
- İçerik Güvenlik Politikası (CSP): yalnızca TMDB, YouTube ve kendi kökeni.
- Electron: `contextIsolation`, `sandbox`, `nodeIntegration: false`; dış adresler sistem tarayıcısında açılır.
- Android: yalnızca `INTERNET` izni, `allowMixedContent: false`.

## Platform adaptörleri

| Konu | Web | Windows | Android |
|---|---|---|---|
| Köken | barındırma adresi | `app://filmhub` | `https://localhost` |
| Dış bağlantı | yeni sekme | `shell.openExternal` | sistem tarayıcısı (intent) |
| Geri tuşu | tarayıcı geçmişi | — | `@capacitor/app` → WebView geçmişi; modallar geçmişe kayıt ekler |
| Güvenli alan | `env(safe-area-inset-*)` | — | `adjustMarginsForEdgeToEdge: auto` + CSS |
| YouTube | doğrudan | Referer başlığı eklenir | doğrudan |
