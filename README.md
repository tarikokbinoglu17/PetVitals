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

1. Supabase projesinde **Project Settings > API** alanını açın.
2. `.env.example` dosyasını `.env` olarak kopyalayın.
3. `EXPO_PUBLIC_SUPABASE_URL` ve `EXPO_PUBLIC_SUPABASE_ANON_KEY` değerlerini doldurun.
4. Supabase **Authentication > Providers** içinde e-posta sağlayıcısını etkinleştirin. E-posta onayı açıksa yeni kullanıcı, gelen onay bağlantısını açtıktan sonra giriş yapabilir.
5. Ortam değişkeni değişikliğinden sonra Expo sunucusunu `npx expo start --clear` ile yeniden başlatın.

Anon anahtarı mobil istemcide kullanılmak üzere tasarlanmıştır; **service role** anahtarını kesinlikle uygulamaya koymayın. Uygulama oturumu AsyncStorage'da kalıcı tutar, token yenilemeyi otomatik yapar ve kimlik durumu değişikliklerini dinler.

### Kullanıcıya özel sağlık verileri

Giriş yapan kullanıcılar demo kayıtlarını görmez. **Dostlarım** ekranındaki form yeni hayvan profilini, **Sağlık** ekranındaki form ise aşı kaydını aynı kullanıcıya bağlı olarak kaydeder. Uygulama aşağıdaki Supabase tablolarını `user_id = auth.uid()` filtresiyle okur:

- `pets`: `id`, `user_id`, `name`, `species`, `breed`, `birth_date`, `weight`, `created_at`
- `health_records`: temel kayıt alanlarına ek olarak `vaccine_type`, `administered_date`, `next_due_date`, `repeat_interval_months`, `veterinarian`, `attachment_url`, `notification_enabled`, `notification_status` ve `notification_ids`

Her iki tabloda da Row Level Security etkin olmalı ve `SELECT`, `INSERT`, `UPDATE`, `DELETE` politikaları yalnızca `auth.uid() = user_id` koşulunu sağlayan satırlara izin vermelidir. `health_records.pet_id` ayrıca aynı kullanıcıya ait bir `pets.id` değerini göstermelidir.

Hazır tablo, indeks ve RLS politikaları için `supabase/migrations/20260820173000_vaccine_reminders.sql` dosyasını Supabase SQL Editor içinde çalıştırın.

## Aşı hatırlatmaları

Aşı kayıtlarında uygulama tarihi, sonraki tarih, tekrar aralığı, veteriner, notlar, bildirim durumu ve cihazın oluşturduğu bildirim kimlikleri saklanır. Bildirimler sonraki aşı tarihinden 30, 7 ve 1 gün önce; ayrıca aşı günü yerel saatle 09.00 için planlanır. Geçmişte kalan zamanlar planlanmaz.

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
- `src/lib`: Supabase istemcisi ve gösterge paneli yardımcıları
- `src/screens`: giriş, ana sayfa, dostlar, sağlık ve profil ekranları
- `src/components`: ortak form, buton ve uygulama kabuğu
- `src/data`: Supabase kurulmadan arayüzü incelemeye yarayan salt okunur demo verileri
