import * as Location from "expo-location";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  createAppointmentRequest,
  loadFavoritePlaceIds,
  markAppointmentRequestSent,
  setPlaceFavorite,
} from "../lib/nearbyActions";
import {
  findNearbyPetServices,
  type NearbyCategory,
  type NearbyPlace,
} from "../lib/nearbyServices";
import { createPassportShare } from "../lib/platformData";
import type { Pet } from "../types";
import { colors, shadow } from "../theme";
import { usePreferences } from "../context/PreferencesContext";
type Coordinates = { latitude: number; longitude: number };
type SearchMode = { category: NearbyCategory; emergencyOnly: boolean };
const C = {
  tr: {
    title: "Yakınınızdaki bakım noktaları",
    sub: "Veterinerleri ve petshopları konumunuza göre bulun. Acil mod, şu anda açık görünen veterinerleri öne çıkarır.",
    all: "Tümü",
    vet: "Veteriner",
    shop: "Petshop",
    emergency: "⚕ ACİL · ŞU AN AÇIK VETERİNER",
    emergencyText: "25 km içinde açık görünen klinikleri ara",
    refresh: "↻ Yenile",
    using: "Konumunuz kullanılıyor",
    waiting: "Konum bekleniyor",
    needLocation:
      "Yakındaki veterinerleri göstermek için konum izni gerekiyor.",
    none: "25 km içinde şu an açık olduğu doğrulanan veteriner bulunamadı. Daha geniş bölgede arayın veya bilinen kliniğinizi arayın.",
    load: "Yakındaki yerler yüklenemedi.",
    open: "Açık",
    closed: "Kapalı",
    hours: "Saat bilgisi yok",
    directions: "Yol tarifi",
    call: "Ara",
    urgentCall: "⚡ Acil ara",
    passport: "Health Passport gönder",
    appt: "Randevu iste",
    apptTitle: "Randevu talebi",
    time: "Tercih edilen zaman (örn. yarın 14:00)",
    note: "Kısa not (isteğe bağlı)",
    send: "Talebi hazırla ve gönder",
    favorites: "favori bakım noktası kayıtlı",
    near: "Yakındaki yerler",
    safety: "Acil durumda saat bilgisini doğrulayın",
    safetyText:
      "Haritadaki “açık” bilgisi işletmenin yayınladığı çalışma saatlerine dayanır ve güncel olmayabilir. Yola çıkmadan önce kliniği arayın.",
    mapWeb: "Harita mobil uygulamada görüntülenir.",
    mapBuild: "Harita development build ile açılır",
    mapList: "Yakındaki yerler ve yol tarifi listeden kullanılabilir.",
    favFail: "Favori işlemi kaydedilemedi.",
    petFirst: "Önce bir dost profili oluşturun.",
    passportFail: "Health Passport paylaşımı oluşturulamadı.",
    apptFail: "Randevu talebi hazırlanamadı.",
    trust: "Bu kodu yalnızca güvendiğiniz veterinerle paylaşın.",
    hello: "Merhaba, Pawly üzerinden randevu talep ediyorum.",
  },
  en: {
    title: "Care near you",
    sub: "Find veterinarians and pet shops based on your location. Emergency mode prioritizes clinics that appear open now.",
    all: "All",
    vet: "Veterinarian",
    shop: "Pet shop",
    emergency: "⚕ EMERGENCY · VET OPEN NOW",
    emergencyText: "Search clinics that appear open within 25 km",
    refresh: "↻ Refresh",
    using: "Using your location",
    waiting: "Waiting for location",
    needLocation:
      "Location permission is required to show nearby veterinarians.",
    none: "No veterinarian confirmed open within 25 km. Search a wider area or call a known clinic.",
    load: "Nearby places could not be loaded.",
    open: "Open",
    closed: "Closed",
    hours: "Hours unavailable",
    directions: "Directions",
    call: "Call",
    urgentCall: "⚡ Emergency call",
    passport: "Send Health Passport",
    appt: "Request appointment",
    apptTitle: "Appointment request",
    time: "Preferred time (e.g. tomorrow 14:00)",
    note: "Short note (optional)",
    send: "Prepare and send request",
    favorites: "favorite care locations saved",
    near: "Nearby places",
    safety: "Verify opening hours in an emergency",
    safetyText:
      "“Open” status is based on business-published hours and may be outdated. Call the clinic before leaving.",
    mapWeb: "The map is available in the mobile app.",
    mapBuild: "Map opens in a development build",
    mapList: "Nearby places and directions remain available from the list.",
    favFail: "Favorite could not be saved.",
    petFirst: "Create a pet profile first.",
    passportFail: "Health Passport share could not be created.",
    apptFail: "Appointment request could not be prepared.",
    trust: "Share this code only with a veterinarian you trust.",
    hello: "Hello, I am requesting an appointment through Pawly.",
  },
  de: {
    title: "Versorgung in Ihrer Nähe",
    sub: "Finden Sie Tierärzte und Tierhandlungen nach Standort. Der Notfallmodus priorisiert aktuell geöffnete Praxen.",
    all: "Alle",
    vet: "Tierarzt",
    shop: "Tierhandlung",
    emergency: "⚕ NOTFALL · JETZT GEÖFFNETER TIERARZT",
    emergencyText: "Geöffnete Praxen im Umkreis von 25 km suchen",
    refresh: "↻ Aktualisieren",
    using: "Standort wird verwendet",
    waiting: "Warte auf Standort",
    needLocation:
      "Standortzugriff ist erforderlich, um Tierärzte in der Nähe anzuzeigen.",
    none: "Im Umkreis von 25 km wurde kein aktuell geöffneter Tierarzt bestätigt.",
    load: "Orte in der Nähe konnten nicht geladen werden.",
    open: "Geöffnet",
    closed: "Geschlossen",
    hours: "Öffnungszeiten unbekannt",
    directions: "Route",
    call: "Anrufen",
    urgentCall: "⚡ Notruf",
    passport: "Health Passport senden",
    appt: "Termin anfragen",
    apptTitle: "Terminanfrage",
    time: "Gewünschte Zeit (z. B. morgen 14:00)",
    note: "Kurze Notiz (optional)",
    send: "Anfrage vorbereiten und senden",
    favorites: "gespeicherte Favoriten",
    near: "Orte in der Nähe",
    safety: "Öffnungszeiten im Notfall prüfen",
    safetyText:
      "Der Status „geöffnet“ basiert auf veröffentlichten Geschäftszeiten und kann veraltet sein. Rufen Sie vorher an.",
    mapWeb: "Die Karte ist in der mobilen App verfügbar.",
    mapBuild: "Karte öffnet sich im Development Build",
    mapList: "Orte und Routen können weiterhin über die Liste genutzt werden.",
    favFail: "Favorit konnte nicht gespeichert werden.",
    petFirst: "Erstellen Sie zuerst ein Tierprofil.",
    passportFail: "Health Passport konnte nicht geteilt werden.",
    apptFail: "Terminanfrage konnte nicht vorbereitet werden.",
    trust: "Teilen Sie diesen Code nur mit einem Tierarzt Ihres Vertrauens.",
    hello: "Hallo, ich möchte über Pawly einen Termin anfragen.",
  },
  es: {
    title: "Cuidados cerca de ti",
    sub: "Encuentra veterinarios y tiendas para mascotas según tu ubicación. El modo de emergencia prioriza clínicas que parecen estar abiertas.",
    all: "Todos",
    vet: "Veterinario",
    shop: "Tienda de mascotas",
    emergency: "⚕ EMERGENCIA · VETERINARIO ABIERTO",
    emergencyText: "Buscar clínicas abiertas en 25 km",
    refresh: "↻ Actualizar",
    using: "Usando tu ubicación",
    waiting: "Esperando ubicación",
    needLocation:
      "Se requiere permiso de ubicación para mostrar veterinarios cercanos.",
    none: "No se encontró un veterinario confirmado abierto en 25 km. Amplía la búsqueda o llama a una clínica conocida.",
    load: "No se pudieron cargar los lugares cercanos.",
    open: "Abierto",
    closed: "Cerrado",
    hours: "Horario no disponible",
    directions: "Cómo llegar",
    call: "Llamar",
    urgentCall: "⚡ Llamada urgente",
    passport: "Enviar Health Passport",
    appt: "Pedir cita",
    apptTitle: "Solicitud de cita",
    time: "Hora preferida (ej. mañana 14:00)",
    note: "Nota breve (opcional)",
    send: "Preparar y enviar solicitud",
    favorites: "lugares favoritos guardados",
    near: "Lugares cercanos",
    safety: "Verifica el horario en una emergencia",
    safetyText:
      "El estado “abierto” se basa en horarios publicados por el negocio y puede no estar actualizado. Llama antes de salir.",
    mapWeb: "El mapa está disponible en la app móvil.",
    mapBuild: "El mapa se abre en una build de desarrollo",
    mapList: "Los lugares cercanos y las rutas siguen disponibles en la lista.",
    favFail: "No se pudo guardar el favorito.",
    petFirst: "Primero crea un perfil de mascota.",
    passportFail: "No se pudo crear el acceso Health Passport.",
    apptFail: "No se pudo preparar la solicitud de cita.",
    trust: "Comparte este código solo con un veterinario de confianza.",
    hello: "Hola, solicito una cita a través de Pawly.",
  },
  ja: {
    title: "周辺のケア施設",
    sub: "現在地から動物病院とペットショップを検索します。緊急モードでは現在営業中と表示される病院を優先します。",
    all: "すべて",
    vet: "動物病院",
    shop: "ペットショップ",
    emergency: "⚕ 緊急 · 現在営業中の動物病院",
    emergencyText: "25km以内で営業中と表示される病院を検索",
    refresh: "↻ 更新",
    using: "現在地を使用中",
    waiting: "位置情報を待っています",
    needLocation: "周辺の動物病院を表示するには位置情報の許可が必要です。",
    none: "25km以内で営業中と確認できる動物病院は見つかりませんでした。範囲を広げるか、かかりつけの病院へ電話してください。",
    load: "周辺施設を読み込めませんでした。",
    open: "営業中",
    closed: "営業時間外",
    hours: "営業時間不明",
    directions: "経路",
    call: "電話",
    urgentCall: "⚡ 緊急電話",
    passport: "健康パスポートを送る",
    appt: "予約を依頼",
    apptTitle: "予約リクエスト",
    time: "希望日時（例：明日14:00）",
    note: "短いメモ（任意）",
    send: "リクエストを作成して送信",
    favorites: "件のお気に入り施設",
    near: "周辺施設",
    safety: "緊急時は営業時間を確認してください",
    safetyText:
      "「営業中」は施設が公開した営業時間に基づき、最新でない場合があります。出発前に電話で確認してください。",
    mapWeb: "地図はモバイルアプリで表示されます。",
    mapBuild: "地図はdevelopment buildで表示されます",
    mapList: "周辺施設と経路は一覧から利用できます。",
    favFail: "お気に入りを保存できませんでした。",
    petFirst: "先にペットプロフィールを作成してください。",
    passportFail: "健康パスポートの共有を作成できませんでした。",
    apptFail: "予約リクエストを作成できませんでした。",
    trust: "このコードは信頼できる獣医師とのみ共有してください。",
    hello: "Pawlyから予約を希望します。",
  },
} as const;
function distanceLabel(m: number | null) {
  if (m == null) return "";
  return m < 1000 ? `${m} m` : `${(m / 1000).toFixed(1)} km`;
}
function EmbeddedMap({
  location,
  places,
  onSelect,
  c,
}: {
  location: Coordinates;
  places: NearbyPlace[];
  onSelect: (p: NearbyPlace) => void;
  c: any;
}) {
  if (Platform.OS === "web")
    return (
      <View style={styles.mapFallback}>
        <Text style={styles.mapFallbackText}>{c.mapWeb}</Text>
      </View>
    );
  try {
    const { AppleMaps, GoogleMaps } = require("expo-maps") as any;
    const markers = places.map((p) => ({
      id: p.id,
      coordinates: { latitude: p.latitude, longitude: p.longitude },
      title: p.name,
      snippet: p.address,
      monogram: p.kind === "veterinary" ? "V" : "P",
      tintColor: p.kind === "veterinary" ? "#C7524C" : colors.primary,
      showCallout: true,
    }));
    const cameraPosition = { coordinates: location, zoom: 13 };
    if (Platform.OS === "ios" && AppleMaps?.View)
      return (
        <AppleMaps.View
          cameraPosition={cameraPosition}
          markers={markers}
          onMarkerClick={(e: any) => {
            const p = places.find((x) => x.id === e?.id);
            if (p) onSelect(p);
          }}
          style={styles.map}
        />
      );
    if (Platform.OS === "android" && GoogleMaps?.View)
      return (
        <GoogleMaps.View
          cameraPosition={cameraPosition}
          markers={markers}
          onMarkerClick={(e: any) => {
            const p = places.find((x) => x.id === e?.id);
            if (p) onSelect(p);
          }}
          style={styles.map}
        />
      );
  } catch {}
  return (
    <View style={styles.mapFallback}>
      <Text style={styles.mapFallbackTitle}>{c.mapBuild}</Text>
      <Text style={styles.mapFallbackText}>{c.mapList}</Text>
    </View>
  );
}
export function NearMeScreen({
  userId,
  pets,
}: {
  userId?: string;
  pets: Pet[];
}) {
  const { language } = usePreferences();
  const c = C[language];
  const [category, setCategory] = useState<NearbyCategory>("all");
  const [emergencyOnly, setEmergencyOnly] = useState(false);
  const [location, setLocation] = useState<Coordinates | null>(null);
  const [places, setPlaces] = useState<NearbyPlace[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [selectedPetId, setSelectedPetId] = useState(pets[0]?.id);
  const [appointmentOpen, setAppointmentOpen] = useState(false);
  const [appointmentTime, setAppointmentTime] = useState("");
  const [appointmentNote, setAppointmentNote] = useState("");
  const [actionBusy, setActionBusy] = useState(false);
  const initialSearchStarted = useRef(false);
  useEffect(() => {
    if (!selectedPetId && pets[0]?.id) setSelectedPetId(pets[0].id);
  }, [pets, selectedPetId]);
  useEffect(() => {
    if (userId)
      loadFavoritePlaceIds(userId)
        .then(setFavoriteIds)
        .catch(() => undefined);
  }, [userId]);
  const requestLocation = useCallback(async () => {
    setError(null);
    const p = await Location.requestForegroundPermissionsAsync();
    if (!p.granted) {
      setError(c.needLocation);
      return null;
    }
    const pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    const next = {
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
    };
    setLocation(next);
    return next;
  }, [c.needLocation]);
  const runSearch = useCallback(
    async (coords: Coordinates | null | undefined, mode: SearchMode) => {
      const target = coords ?? (await requestLocation());
      if (!target) return;
      setLoading(true);
      setError(null);
      try {
        const result = await findNearbyPetServices({
          ...target,
          radiusMeters: mode.emergencyOnly ? 25000 : 10000,
          category: mode.emergencyOnly ? "veterinary" : mode.category,
          openNowOnly: mode.emergencyOnly,
          languageCode: language,
        });
        setPlaces(result);
        setSelectedId(result[0]?.id ?? null);
        if (mode.emergencyOnly && result.length === 0) setError(c.none);
      } catch (e) {
        setError(e instanceof Error ? e.message : c.load);
      } finally {
        setLoading(false);
      }
    },
    [requestLocation, language, c.none, c.load],
  );
  useEffect(() => {
    if (initialSearchStarted.current) return;
    initialSearchStarted.current = true;
    requestLocation().then((coords) => {
      if (coords)
        void runSearch(coords, { category: "all", emergencyOnly: false });
    });
  }, [requestLocation, runSearch]);
  const selected = useMemo(
    () => places.find((p) => p.id === selectedId) ?? null,
    [places, selectedId],
  );
  const selectedPet = pets.find((p) => p.id === selectedPetId) ?? pets[0];
  const selectedFavorite = selected ? favoriteIds.includes(selected.id) : false;
  const openDirections = async (p: NearbyPlace) =>
    Linking.openURL(
      p.mapsUrl ||
        (Platform.OS === "ios"
          ? `http://maps.apple.com/?daddr=${p.latitude},${p.longitude}&dirflg=d`
          : `https://www.google.com/maps/dir/?api=1&destination=${p.latitude},${p.longitude}`),
    );
  const callPlace = async (p: NearbyPlace) => {
    if (p.phone) await Linking.openURL(`tel:${p.phone.replace(/[^+\d]/g, "")}`);
  };
  async function toggleFavorite() {
    if (!selected || !userId) return;
    const next = !selectedFavorite;
    setActionBusy(true);
    try {
      await setPlaceFavorite(userId, selected, next);
      setFavoriteIds((cur) =>
        next
          ? Array.from(new Set([...cur, selected.id]))
          : cur.filter((id) => id !== selected.id),
      );
    } catch {
      setError(c.favFail);
    } finally {
      setActionBusy(false);
    }
  }
  async function sharePassport() {
    if (!selectedPet) {
      setError(c.petFirst);
      return;
    }
    setActionBusy(true);
    try {
      const s = await createPassportShare(selectedPet.id, false, language);
      await Share.share({
        message: `Pawly Health Passport — ${selectedPet.name}\n${s.token}\n\n${c.trust}`,
      });
    } catch {
      setError(c.passportFail);
    } finally {
      setActionBusy(false);
    }
  }
  async function sendAppointmentRequest() {
    if (!selected || selected.kind !== "veterinary" || !userId) return;
    setActionBusy(true);
    try {
      const id = await createAppointmentRequest({
        userId,
        petId: selectedPet?.id,
        place: selected,
        preferredTime: appointmentTime,
        note: appointmentNote,
      });
      const message = `${c.hello}${selectedPet?.name ? ` ${selectedPet.name}.` : ""}${appointmentTime.trim() ? ` ${appointmentTime.trim()}.` : ""}${appointmentNote.trim() ? ` ${appointmentNote.trim()}` : ""}`;
      if (selected.phone) {
        const phone = selected.phone.replace(/[^+\d]/g, "");
        await Linking.openURL(
          Platform.OS === "ios"
            ? `sms:${phone}&body=${encodeURIComponent(message)}`
            : `sms:${phone}?body=${encodeURIComponent(message)}`,
        );
        await markAppointmentRequestSent(userId, id);
      } else await Share.share({ message: `${selected.name}\n${message}` });
      setAppointmentOpen(false);
      setAppointmentTime("");
      setAppointmentNote("");
    } catch {
      setError(c.apptFail);
    } finally {
      setActionBusy(false);
    }
  }
  const applyCategory = (next: NearbyCategory) => {
    setEmergencyOnly(false);
    setCategory(next);
    void runSearch(location, { category: next, emergencyOnly: false });
  };
  const activateEmergency = () => {
    setEmergencyOnly(true);
    setCategory("veterinary");
    void runSearch(location, { category: "veterinary", emergencyOnly: true });
  };
  return (
    <View style={styles.page}>
      <Text style={styles.eyebrow}>PAWLY NEARBY</Text>
      <Text style={styles.title}>{c.title}</Text>
      <Text style={styles.sub}>{c.sub}</Text>
      <View style={styles.filters}>
        {(["all", "veterinary", "petshop"] as NearbyCategory[]).map((item) => {
          const label =
            item === "all" ? c.all : item === "veterinary" ? c.vet : c.shop;
          const active = category === item && !emergencyOnly;
          return (
            <Pressable
              key={item}
              onPress={() => applyCategory(item)}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Pressable
        onPress={activateEmergency}
        style={[
          styles.emergencyButton,
          emergencyOnly && styles.emergencyButtonActive,
        ]}
      >
        <Text style={styles.emergencyTitle}>{c.emergency}</Text>
        <Text style={styles.emergencyText}>{c.emergencyText}</Text>
      </Pressable>
      <View style={styles.actionRow}>
        <Pressable
          onPress={() => void runSearch(location, { category, emergencyOnly })}
          style={styles.refreshButton}
        >
          <Text style={styles.refreshText}>{c.refresh}</Text>
        </Pressable>
        <Text style={styles.locationNote}>
          {location ? c.using : c.waiting}
        </Text>
      </View>
      {loading ? (
        <ActivityIndicator
          color={colors.primary}
          size="large"
          style={styles.loader}
        />
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {location ? (
        <EmbeddedMap
          c={c}
          location={location}
          onSelect={(p) => {
            setSelectedId(p.id);
            setAppointmentOpen(false);
          }}
          places={places}
        />
      ) : null}
      {selected ? (
        <View style={styles.selectedCard}>
          <View style={styles.cardHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.selectedKind}>
                {selected.kind === "veterinary"
                  ? c.vet.toUpperCase()
                  : "PETSHOP"}
              </Text>
              <Text style={styles.selectedName}>{selected.name}</Text>
            </View>
            <Pressable
              disabled={!userId || actionBusy}
              onPress={() => void toggleFavorite()}
              style={styles.favoriteButton}
            >
              <Text style={styles.favoriteText}>
                {selectedFavorite ? "★" : "☆"}
              </Text>
            </Pressable>
          </View>
          <Text style={styles.address}>{selected.address}</Text>
          <View style={styles.metaRow}>
            {selected.distanceMeters != null ? (
              <Text style={styles.meta}>
                {distanceLabel(selected.distanceMeters)}
              </Text>
            ) : null}
            {selected.rating != null ? (
              <Text style={styles.meta}>★ {selected.rating.toFixed(1)}</Text>
            ) : null}
            <Text
              style={[
                styles.meta,
                selected.openNow === true
                  ? styles.open
                  : selected.openNow === false
                    ? styles.closed
                    : null,
              ]}
            >
              {selected.openNow === true
                ? c.open
                : selected.openNow === false
                  ? c.closed
                  : c.hours}
            </Text>
          </View>
          <View style={styles.cardActions}>
            <Pressable
              onPress={() => void openDirections(selected)}
              style={styles.primaryAction}
            >
              <Text style={styles.primaryActionText}>{c.directions}</Text>
            </Pressable>
            <Pressable
              disabled={!selected.phone}
              onPress={() => void callPlace(selected)}
              style={[
                styles.secondaryAction,
                !selected.phone && styles.disabled,
              ]}
            >
              <Text style={styles.secondaryActionText}>
                {emergencyOnly ? c.urgentCall : c.call}
              </Text>
            </Pressable>
          </View>
          {selected.kind === "veterinary" ? (
            <>
              {pets.length ? (
                <View style={styles.petRow}>
                  {pets.map((p) => (
                    <Pressable
                      key={p.id}
                      onPress={() => setSelectedPetId(p.id)}
                      style={[
                        styles.petChip,
                        selectedPet?.id === p.id && styles.petChipActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.petChipText,
                          selectedPet?.id === p.id && styles.petChipTextActive,
                        ]}
                      >
                        {p.name}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
              <View style={styles.cardActions}>
                <Pressable
                  disabled={actionBusy || !selectedPet}
                  onPress={() => void sharePassport()}
                  style={styles.secondaryAction}
                >
                  <Text style={styles.secondaryActionText}>{c.passport}</Text>
                </Pressable>
                <Pressable
                  disabled={actionBusy || !userId}
                  onPress={() => setAppointmentOpen((v) => !v)}
                  style={styles.secondaryAction}
                >
                  <Text style={styles.secondaryActionText}>{c.appt}</Text>
                </Pressable>
              </View>
              {appointmentOpen ? (
                <View style={styles.appointmentBox}>
                  <Text style={styles.appointmentTitle}>{c.apptTitle}</Text>
                  <TextInput
                    value={appointmentTime}
                    onChangeText={setAppointmentTime}
                    placeholder={c.time}
                    placeholderTextColor={colors.muted}
                    style={styles.input}
                  />
                  <TextInput
                    multiline
                    value={appointmentNote}
                    onChangeText={setAppointmentNote}
                    placeholder={c.note}
                    placeholderTextColor={colors.muted}
                    style={[styles.input, styles.noteInput]}
                  />
                  <Pressable
                    disabled={actionBusy}
                    onPress={() => void sendAppointmentRequest()}
                    style={styles.primaryAction}
                  >
                    {actionBusy ? (
                      <ActivityIndicator color={colors.white} />
                    ) : (
                      <Text style={styles.primaryActionText}>{c.send}</Text>
                    )}
                  </Pressable>
                </View>
              ) : null}
            </>
          ) : null}
        </View>
      ) : null}
      {favoriteIds.length ? (
        <Text style={styles.favoriteInfo}>
          ★ {favoriteIds.length} {c.favorites}
        </Text>
      ) : null}
      <Text style={styles.section}>{c.near}</Text>
      {places.map((p) => (
        <Pressable
          key={p.id}
          onPress={() => {
            setSelectedId(p.id);
            setAppointmentOpen(false);
          }}
          style={[
            styles.placeCard,
            selectedId === p.id && styles.placeCardSelected,
          ]}
        >
          <View style={styles.placeIcon}>
            <Text>{p.kind === "veterinary" ? "⚕" : "🛍"}</Text>
          </View>
          <View style={styles.placeCopy}>
            <Text numberOfLines={1} style={styles.placeName}>
              {favoriteIds.includes(p.id) ? "★ " : ""}
              {p.name}
            </Text>
            <Text numberOfLines={1} style={styles.placeAddress}>
              {p.address}
            </Text>
            <Text style={styles.placeMeta}>
              {distanceLabel(p.distanceMeters)}
              {p.rating != null ? ` · ★ ${p.rating.toFixed(1)}` : ""} ·{" "}
              {p.openNow === true
                ? c.open
                : p.openNow === false
                  ? c.closed
                  : c.hours}
            </Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </Pressable>
      ))}
      <View style={styles.safetyCard}>
        <Text style={styles.safetyTitle}>{c.safety}</Text>
        <Text style={styles.safetyText}>{c.safetyText}</Text>
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  page: { padding: 22 },
  eyebrow: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.2,
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: "900",
    lineHeight: 34,
    marginTop: 7,
  },
  sub: { color: colors.muted, lineHeight: 21, marginTop: 8 },
  filters: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 18 },
  chip: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.text, fontWeight: "800" },
  chipTextActive: { color: colors.white },
  emergencyButton: {
    backgroundColor: "#FFF2F0",
    borderColor: "#F0C0BB",
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 13,
    padding: 15,
  },
  emergencyButtonActive: { backgroundColor: "#FCE5E2", borderColor: "#C7524C" },
  emergencyTitle: { color: "#A63D38", fontSize: 14, fontWeight: "900" },
  emergencyText: { color: "#895B57", fontSize: 12, marginTop: 4 },
  actionRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
  },
  refreshButton: {
    backgroundColor: colors.primarySoft,
    borderRadius: 12,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  refreshText: { color: colors.primaryDark, fontWeight: "800" },
  locationNote: { color: colors.muted, fontSize: 11 },
  loader: { marginVertical: 18 },
  error: { color: colors.danger, lineHeight: 19, marginVertical: 10 },
  map: {
    borderRadius: 20,
    height: 300,
    marginTop: 15,
    overflow: "hidden",
    width: "100%",
  },
  mapFallback: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: 20,
    height: 210,
    justifyContent: "center",
    marginTop: 15,
    padding: 24,
  },
  mapFallbackTitle: {
    color: colors.primaryDark,
    fontSize: 16,
    fontWeight: "900",
    textAlign: "center",
  },
  mapFallbackText: {
    color: colors.muted,
    lineHeight: 19,
    marginTop: 7,
    textAlign: "center",
  },
  selectedCard: {
    ...shadow,
    backgroundColor: colors.surface,
    borderRadius: 20,
    marginTop: 14,
    padding: 17,
  },
  cardHeader: { alignItems: "center", flexDirection: "row", gap: 12 },
  favoriteButton: {
    alignItems: "center",
    backgroundColor: "#FFF8E8",
    borderRadius: 22,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  favoriteText: { color: "#9A6B00", fontSize: 24 },
  selectedKind: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
  },
  selectedName: {
    color: colors.text,
    fontSize: 19,
    fontWeight: "900",
    marginTop: 4,
  },
  address: { color: colors.muted, lineHeight: 18, marginTop: 5 },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 9, marginTop: 10 },
  meta: { color: colors.muted, fontSize: 12, fontWeight: "700" },
  open: { color: colors.primary },
  closed: { color: colors.danger },
  cardActions: { flexDirection: "row", gap: 9, marginTop: 14 },
  primaryAction: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 13,
    flex: 1,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  primaryActionText: {
    color: colors.white,
    fontWeight: "900",
    textAlign: "center",
  },
  secondaryAction: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: 13,
    flex: 1,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 10,
    paddingVertical: 12,
  },
  secondaryActionText: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: "900",
    textAlign: "center",
  },
  disabled: { opacity: 0.45 },
  petRow: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 14 },
  petChip: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  petChipActive: { backgroundColor: colors.primary },
  petChipText: { color: colors.text, fontSize: 12, fontWeight: "800" },
  petChipTextActive: { color: colors.white },
  appointmentBox: {
    backgroundColor: colors.background,
    borderRadius: 15,
    marginTop: 12,
    padding: 12,
  },
  appointmentTitle: { color: colors.text, fontWeight: "900", marginBottom: 8 },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    color: colors.text,
    fontSize: 16,
    marginBottom: 8,
    minHeight: 46,
    paddingHorizontal: 12,
  },
  noteInput: { minHeight: 80, paddingTop: 12, textAlignVertical: "top" },
  favoriteInfo: {
    color: "#8A6500",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 14,
  },
  section: {
    color: colors.text,
    fontSize: 19,
    fontWeight: "900",
    marginBottom: 11,
    marginTop: 24,
  },
  placeCard: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    marginBottom: 9,
    padding: 12,
  },
  placeCardSelected: { borderColor: colors.primary },
  placeIcon: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: 12,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  placeCopy: { flex: 1, marginLeft: 11, minWidth: 0 },
  placeName: { color: colors.text, fontWeight: "900" },
  placeAddress: { color: colors.muted, fontSize: 11, marginTop: 3 },
  placeMeta: {
    color: colors.primaryDark,
    fontSize: 11,
    fontWeight: "700",
    marginTop: 5,
  },
  chevron: { color: colors.muted, fontSize: 26, marginLeft: 6 },
  safetyCard: {
    backgroundColor: "#FFF8E8",
    borderRadius: 17,
    marginTop: 12,
    padding: 15,
  },
  safetyTitle: { color: "#7A5A16", fontWeight: "900" },
  safetyText: { color: colors.muted, lineHeight: 18, marginTop: 5 },
});
