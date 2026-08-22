import * as Location from 'expo-location';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { findNearbyPetServices, type NearbyCategory, type NearbyPlace } from '../lib/nearbyServices';
import { colors, shadow } from '../theme';

type Coordinates = { latitude: number; longitude: number };
type SearchMode = { category: NearbyCategory; emergencyOnly: boolean };

function distanceLabel(meters: number | null) {
  if (meters == null) return '';
  return meters < 1000 ? `${meters} m` : `${(meters / 1000).toFixed(1)} km`;
}

function EmbeddedMap({ location, places, onSelect }: { location: Coordinates; places: NearbyPlace[]; onSelect: (place: NearbyPlace) => void }) {
  if (Platform.OS === 'web') return <View style={styles.mapFallback}><Text style={styles.mapFallbackText}>Harita mobil uygulamada görüntülenir.</Text></View>;
  try {
    const { AppleMaps, GoogleMaps } = require('expo-maps') as any;
    const markers = places.map(place => ({
      id: place.id,
      coordinates: { latitude: place.latitude, longitude: place.longitude },
      title: place.name,
      snippet: place.address,
      monogram: place.kind === 'veterinary' ? 'V' : 'P',
      tintColor: place.kind === 'veterinary' ? '#C7524C' : colors.primary,
      showCallout: true,
    }));
    const cameraPosition = { coordinates: location, zoom: 13 };
    if (Platform.OS === 'ios' && AppleMaps?.View) {
      return <AppleMaps.View cameraPosition={cameraPosition} markers={markers} onMarkerClick={(event: any) => { const place = places.find(item => item.id === event?.id); if (place) onSelect(place); }} style={styles.map} />;
    }
    if (Platform.OS === 'android' && GoogleMaps?.View) {
      return <GoogleMaps.View cameraPosition={cameraPosition} markers={markers} onMarkerClick={(event: any) => { const place = places.find(item => item.id === event?.id); if (place) onSelect(place); }} style={styles.map} />;
    }
  } catch {
    // expo-maps is not available inside Expo Go; list/directions still work.
  }
  return <View style={styles.mapFallback}><Text style={styles.mapFallbackTitle}>Harita development build ile açılır</Text><Text style={styles.mapFallbackText}>Yakındaki yerler ve yol tarifi listeden kullanılabilir.</Text></View>;
}

export function NearMeScreen() {
  const [category, setCategory] = useState<NearbyCategory>('all');
  const [emergencyOnly, setEmergencyOnly] = useState(false);
  const [location, setLocation] = useState<Coordinates | null>(null);
  const [places, setPlaces] = useState<NearbyPlace[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const requestLocation = useCallback(async () => {
    setError(null);
    const permission = await Location.requestForegroundPermissionsAsync();
    if (!permission.granted) {
      setError('Yakındaki veterinerleri göstermek için konum izni gerekiyor.');
      return null;
    }
    const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    const next = { latitude: position.coords.latitude, longitude: position.coords.longitude };
    setLocation(next);
    return next;
  }, []);

  const runSearch = useCallback(async (coords: Coordinates | null | undefined, mode: SearchMode) => {
    const target = coords ?? await requestLocation();
    if (!target) return;
    setLoading(true);
    setError(null);
    try {
      const result = await findNearbyPetServices({
        ...target,
        radiusMeters: mode.emergencyOnly ? 25000 : 10000,
        category: mode.emergencyOnly ? 'veterinary' : mode.category,
        openNowOnly: mode.emergencyOnly,
        languageCode: 'tr',
      });
      setPlaces(result);
      setSelectedId(result[0]?.id ?? null);
      if (mode.emergencyOnly && result.length === 0) {
        setError('25 km içinde şu an açık olduğu doğrulanan veteriner bulunamadı. Acil durumda daha geniş bölgede arama yapın veya bilinen kliniğinizi arayın.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Yakındaki yerler yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, [requestLocation]);

  useEffect(() => {
    let active = true;
    requestLocation().then(coords => {
      if (active && coords) void runSearch(coords, { category: 'all', emergencyOnly: false });
    });
    return () => { active = false; };
  }, [requestLocation, runSearch]);

  const selected = useMemo(() => places.find(place => place.id === selectedId) ?? null, [places, selectedId]);

  const openDirections = async (place: NearbyPlace) => {
    const url = place.mapsUrl || (Platform.OS === 'ios' ? `http://maps.apple.com/?daddr=${place.latitude},${place.longitude}&dirflg=d` : `https://www.google.com/maps/dir/?api=1&destination=${place.latitude},${place.longitude}`);
    await Linking.openURL(url);
  };

  const callPlace = async (place: NearbyPlace) => {
    if (place.phone) await Linking.openURL(`tel:${place.phone.replace(/[^+\d]/g, '')}`);
  };

  const applyCategory = (next: NearbyCategory) => {
    setEmergencyOnly(false);
    setCategory(next);
    void runSearch(location, { category: next, emergencyOnly: false });
  };

  const activateEmergency = () => {
    setEmergencyOnly(true);
    setCategory('veterinary');
    void runSearch(location, { category: 'veterinary', emergencyOnly: true });
  };

  return (
    <View style={styles.page}>
      <Text style={styles.eyebrow}>PETVITALS NEARBY</Text>
      <Text style={styles.title}>Yakınınızdaki bakım noktaları</Text>
      <Text style={styles.sub}>Veterinerleri ve petshopları konumunuza göre bulun. Acil mod, şu anda açık görünen veterinerleri öne çıkarır.</Text>

      <View style={styles.filters}>
        {(['all', 'veterinary', 'petshop'] as NearbyCategory[]).map(item => {
          const label = item === 'all' ? 'Tümü' : item === 'veterinary' ? 'Veteriner' : 'Petshop';
          const active = category === item && !emergencyOnly;
          return <Pressable key={item} onPress={() => applyCategory(item)} style={[styles.chip, active && styles.chipActive]}><Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text></Pressable>;
        })}
      </View>

      <Pressable accessibilityRole="button" onPress={activateEmergency} style={[styles.emergencyButton, emergencyOnly && styles.emergencyButtonActive]}>
        <Text style={styles.emergencyTitle}>⚕ ACİL · ŞU AN AÇIK VETERİNER</Text>
        <Text style={styles.emergencyText}>25 km içinde açık görünen klinikleri ara</Text>
      </Pressable>

      <View style={styles.actionRow}>
        <Pressable onPress={() => void runSearch(location, { category, emergencyOnly })} style={styles.refreshButton}><Text style={styles.refreshText}>↻ Yenile</Text></Pressable>
        <Text style={styles.locationNote}>{location ? 'Konumunuz kullanılıyor' : 'Konum bekleniyor'}</Text>
      </View>

      {loading ? <ActivityIndicator color={colors.primary} size="large" style={styles.loader} /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {location ? <EmbeddedMap location={location} onSelect={place => setSelectedId(place.id)} places={places} /> : null}

      {selected ? (
        <View style={styles.selectedCard}>
          <Text style={styles.selectedKind}>{selected.kind === 'veterinary' ? 'VETERİNER' : 'PETSHOP'}</Text>
          <Text style={styles.selectedName}>{selected.name}</Text>
          <Text style={styles.address}>{selected.address}</Text>
          <View style={styles.metaRow}>
            {selected.distanceMeters != null ? <Text style={styles.meta}>{distanceLabel(selected.distanceMeters)}</Text> : null}
            {selected.rating != null ? <Text style={styles.meta}>★ {selected.rating.toFixed(1)}{selected.ratingCount ? ` (${selected.ratingCount})` : ''}</Text> : null}
            <Text style={[styles.meta, selected.openNow === true ? styles.open : selected.openNow === false ? styles.closed : null]}>{selected.openNow === true ? 'Açık' : selected.openNow === false ? 'Kapalı' : 'Saat bilgisi yok'}</Text>
          </View>
          <View style={styles.cardActions}>
            <Pressable onPress={() => void openDirections(selected)} style={styles.primaryAction}><Text style={styles.primaryActionText}>Yol tarifi</Text></Pressable>
            <Pressable disabled={!selected.phone} onPress={() => void callPlace(selected)} style={[styles.secondaryAction, !selected.phone && styles.disabled]}><Text style={styles.secondaryActionText}>Ara</Text></Pressable>
          </View>
        </View>
      ) : null}

      <Text style={styles.section}>Yakındaki yerler</Text>
      {places.map(place => (
        <Pressable key={place.id} onPress={() => setSelectedId(place.id)} style={[styles.placeCard, selectedId === place.id && styles.placeCardSelected]}>
          <View style={styles.placeIcon}><Text>{place.kind === 'veterinary' ? '⚕' : '🛍'}</Text></View>
          <View style={styles.placeCopy}>
            <Text numberOfLines={1} style={styles.placeName}>{place.name}</Text>
            <Text numberOfLines={1} style={styles.placeAddress}>{place.address}</Text>
            <Text style={styles.placeMeta}>{distanceLabel(place.distanceMeters)}{place.rating != null ? ` · ★ ${place.rating.toFixed(1)}` : ''} · {place.openNow === true ? 'Açık' : place.openNow === false ? 'Kapalı' : 'Saat bilinmiyor'}</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </Pressable>
      ))}

      <View style={styles.safetyCard}><Text style={styles.safetyTitle}>Acil durumda saat bilgisini doğrulayın</Text><Text style={styles.safetyText}>Haritadaki “açık” bilgisi işletmenin yayınladığı çalışma saatlerine dayanır ve güncel olmayabilir. Yola çıkmadan önce kliniği arayın.</Text></View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { padding: 22 }, eyebrow: { color: colors.primary, fontSize: 11, fontWeight: '900', letterSpacing: 1.2 }, title: { color: colors.text, fontSize: 28, fontWeight: '900', lineHeight: 34, marginTop: 7 }, sub: { color: colors.muted, lineHeight: 21, marginTop: 8 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 18 }, chip: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 999, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 9 }, chipActive: { backgroundColor: colors.primary, borderColor: colors.primary }, chipText: { color: colors.text, fontWeight: '800' }, chipTextActive: { color: colors.white },
  emergencyButton: { backgroundColor: '#FFF2F0', borderColor: '#F0C0BB', borderRadius: 18, borderWidth: 1, marginTop: 13, padding: 15 }, emergencyButtonActive: { backgroundColor: '#FCE5E2', borderColor: '#C7524C' }, emergencyTitle: { color: '#A63D38', fontSize: 14, fontWeight: '900' }, emergencyText: { color: '#895B57', fontSize: 12, marginTop: 4 },
  actionRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }, refreshButton: { backgroundColor: colors.primarySoft, borderRadius: 12, paddingHorizontal: 13, paddingVertical: 9 }, refreshText: { color: colors.primaryDark, fontWeight: '800' }, locationNote: { color: colors.muted, fontSize: 11 }, loader: { marginVertical: 18 }, error: { color: colors.danger, lineHeight: 19, marginVertical: 10 },
  map: { borderRadius: 20, height: 300, marginTop: 15, overflow: 'hidden', width: '100%' }, mapFallback: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: 20, height: 210, justifyContent: 'center', marginTop: 15, padding: 24 }, mapFallbackTitle: { color: colors.primaryDark, fontSize: 16, fontWeight: '900', textAlign: 'center' }, mapFallbackText: { color: colors.muted, lineHeight: 19, marginTop: 7, textAlign: 'center' },
  selectedCard: { ...shadow, backgroundColor: colors.surface, borderRadius: 20, marginTop: 14, padding: 17 }, selectedKind: { color: colors.primary, fontSize: 10, fontWeight: '900', letterSpacing: 1 }, selectedName: { color: colors.text, fontSize: 19, fontWeight: '900', marginTop: 4 }, address: { color: colors.muted, lineHeight: 18, marginTop: 5 }, metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginTop: 10 }, meta: { color: colors.muted, fontSize: 12, fontWeight: '700' }, open: { color: colors.primary }, closed: { color: colors.danger },
  cardActions: { flexDirection: 'row', gap: 9, marginTop: 14 }, primaryAction: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: 13, flex: 1, paddingVertical: 12 }, primaryActionText: { color: colors.white, fontWeight: '900' }, secondaryAction: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: 13, flex: 1, paddingVertical: 12 }, secondaryActionText: { color: colors.primaryDark, fontWeight: '900' }, disabled: { opacity: 0.45 },
  section: { color: colors.text, fontSize: 19, fontWeight: '900', marginBottom: 11, marginTop: 24 }, placeCard: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 16, borderWidth: 1, flexDirection: 'row', marginBottom: 9, padding: 12 }, placeCardSelected: { borderColor: colors.primary }, placeIcon: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: 12, height: 40, justifyContent: 'center', width: 40 }, placeCopy: { flex: 1, marginLeft: 11, minWidth: 0 }, placeName: { color: colors.text, fontWeight: '900' }, placeAddress: { color: colors.muted, fontSize: 11, marginTop: 3 }, placeMeta: { color: colors.primaryDark, fontSize: 11, fontWeight: '700', marginTop: 5 }, chevron: { color: colors.muted, fontSize: 26, marginLeft: 6 },
  safetyCard: { backgroundColor: '#FFF8E8', borderRadius: 17, marginTop: 12, padding: 15 }, safetyTitle: { color: '#7A5A16', fontWeight: '900' }, safetyText: { color: colors.muted, lineHeight: 18, marginTop: 5 },
});
