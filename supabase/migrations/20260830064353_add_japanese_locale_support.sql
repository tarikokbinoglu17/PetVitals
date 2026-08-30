-- Keep persisted profile and push-delivery locales aligned with Pawly's five UI languages.
alter table public.profiles
  drop constraint if exists profiles_language_check;

alter table public.profiles
  add constraint profiles_language_check
  check (language in ('tr', 'en', 'de', 'es', 'ja'));

alter table public.device_push_tokens
  drop constraint if exists device_push_tokens_locale_check;

alter table public.device_push_tokens
  add constraint device_push_tokens_locale_check
  check (locale in ('tr', 'en', 'de', 'es', 'ja'));
