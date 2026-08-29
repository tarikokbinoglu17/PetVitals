# PetSolea Store Release Plan

## V1 release target
- iOS App Store + Google Play
- Version 1.0.0
- Bundle/package ID: `com.tarikokbinoglu.petsolea`

## Required before submission
1. Production EAS project and credentials
2. Apple Developer membership + App Store Connect app record
3. Google Play Console app record
4. Final 1024x1024 app icon and Android adaptive icon
5. Store screenshots for required device sizes
6. Public Privacy Policy URL and Support URL
7. App Privacy / Data Safety declarations matching actual data flows
8. Real Apple Sign In and Google Sign In provider configuration, or hide disabled providers for V1
9. Production Supabase environment variables in EAS secrets
10. Physical-device release candidate test on iOS and Android

## V1 functional acceptance
- Email sign up / sign in / sign out
- User-scoped data persistence
- Pet create/edit/delete
- Health record create/edit/delete
- Vaccine reminders
- Life tracking
- Health Passport sharing
- Nearby veterinary/petshop search with location permission
- Empty/loading/error states
- Account deletion path
- Privacy/support links reachable from Profile/Settings

## Build commands
```bash
eas build --platform ios --profile production
eas build --platform android --profile production
eas submit --platform ios --profile production
eas submit --platform android --profile production
```

Do not submit until all required items above are complete.
