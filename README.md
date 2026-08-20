# PetVitals

Evcil hayvanların profil, aşı, kontrol ve ilaç kayıtlarını tek yerde izlemek için Expo / React Native uygulaması.

## Başlangıç

```bash
npm install
cp .env.example .env
npm start
```

Android için `npm run android`, iOS için `npm run ios` kullanılabilir. Supabase bilgileri olmadan **demo modu** ile uygulamanın tüm ana ekranları incelenebilir.

## Supabase kurulumu

1. Supabase projesinde **Project Settings > API Keys** alanını açın.
2. `.env.example` dosyasını `.env` olarak kopyalayın.
3. `EXPO_PUBLIC_SUPABASE_URL` ve `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` değerlerini doldurun.
4. Supabase **Authentication > Providers** içinde e-posta sağlayıcısını etkinleştirin. E-posta onayı açıksa yeni kullanıcı, gelen onay bağlantısını açtıktan sonra giriş yapabilir.
5. Ortam değişkeni değişikliğinden sonra Expo sunucusunu `npx expo start --clear` ile yeniden başlatın.

Publishable anahtar mobil istemcide kullanılmak üzere tasarlanmıştır; **secret** veya **service role** anahtarını kesinlikle uygulamaya koymayın. Uygulama oturumu AsyncStorage'da kalıcı tutar, token yenilemeyi otomatik yapar ve kimlik durumu değişikliklerini dinler.

### Kullanıcıya özel sağlık verileri

Giriş yapan kullanıcılar demo kayıtlarını görmez. **Dostlarım** ekranındaki form yeni hayvan profilini, **Sağlık** ekranındaki form ise aşı kaydını aynı kullanıcıya bağlı olarak kaydeder. Uygulamanın etkin akışları aşağıdaki Supabase tablolarını `owner_id = auth.uid()` filtresiyle okur:

- `pets`: profil bilgileri ve özel depodaki dosya yolunu tutan `photo_url`
- `vaccines`: aşı, sonraki doz ve cihaz bildirim kimlikleri

Her iki tabloda da Row Level Security etkindir. Politikalar yalnızca `auth.uid() = owner_id` koşulunu sağlayan satırlara izin verir; `vaccines.pet_id` ayrıca aynı kullanıcıya ait bir `pets.id` değerini göstermelidir.

`pet-photos` ve `health-documents` depoları özeldir. Dosya yolları `<kullanıcı-id>/...` biçimindedir ve uygulama görüntüleme için kısa ömürlü imzalı bağlantılar üretir. Profil fotoğrafları en fazla 10 MB olabilir; desteklenen biçimler JPEG, PNG, WebP, HEIC ve HEIF'tir.

Hazır tablolar, indeksler, en az yetkili Data API izinleri, RLS politikaları ve özel depolar için `supabase/migrations/20260820173000_petvitals_schema.sql` dosyasını bir Supabase migration'ı olarak uygulayın.

## Aşı hatırlatmaları

Aşı kayıtlarında uygulama tarihi, sonraki tarih, tekrar aralığı, veteriner, notlar ve cihazın oluşturduğu bildirim kimlikleri saklanır. Bildirimler sonraki aşı tarihinden 30, 7 ve 1 gün önce; ayrıca aşı günü yerel saatle 09.00 için planlanır. Geçmişte kalan zamanlar planlanmaz.

Yerel bildirimler için uygulama ilk kayıtta kullanıcıdan izin ister. Android'de `vaccine-reminders` kanalı oluşturulur; Android 12 ve sonrasında tarih tabanlı kesin zamanlama için `SCHEDULE_EXACT_ALARM` izni yapılandırılmıştır.

## Kontroller

```bash
npm run typecheck
npm test
npx expo export --platform web
```

## Yapı

- `src/context`: oturum ve giriş/kayıt akışı
- `src/hooks`: kullanıcıya özel evcil hayvan ve sağlık verisi yükleme
- `src/lib`: Supabase istemcisi, özel dosya depolama, bildirim ve gösterge paneli yardımcıları
- `src/types/database.ts`: canlı Supabase şemasından üretilen istemci tipleri
- `src/screens`: giriş, ana sayfa, dostlar, sağlık ve profil ekranları
- `src/components`: ortak form, buton ve uygulama kabuğu
- `src/data`: Supabase kurulmadan arayüzü incelemeye yarayan salt okunur demo verileri
