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

## Kontroller

```bash
npm run typecheck
npm test
npx expo export --platform web
```

## Yapı

- `src/context`: oturum ve giriş/kayıt akışı
- `src/lib`: Supabase istemcisi
- `src/screens`: giriş, ana sayfa, dostlar, sağlık ve profil ekranları
- `src/components`: ortak form, buton ve uygulama kabuğu
- `src/data`: Supabase kurulmadan arayüzü incelemeye yarayan salt okunur demo verileri
