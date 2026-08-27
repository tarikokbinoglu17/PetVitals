import React, { useEffect, useMemo, useState } from 'react';
import { AudioModule, RecordingPresets, setAudioModeAsync, useAudioRecorder, useAudioRecorderState } from 'expo-audio';
import { ActivityIndicator, Alert, Linking, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { usePreferences } from '../context/PreferencesContext';
import {
  addCareMeasurement,
  calculatePersonalBaseline,
  confirmVetVisit,
  createCareProgram,
  createMedicationPlan,
  createVetVisit,
  loadCareJourney,
  medicationAdherence,
  recordMedicationDose,
  runVetVisitCopilot,
  saveDailyCheckIn,
  saveEmergencyProfile,
  speciesMetricDefinitions,
  type CareJourneySnapshot,
  type CareProgram,
  type CheckInMetric,
  type EmergencyRedFlag,
  type VetVisitSummary,
} from '../lib/careJourney';
import { uploadVetVisitAudio } from '../lib/healthFiles';
import type { Pet } from '../types';
import { colors, shadow } from '../theme';

type Panel = 'checkin' | 'medications' | 'programs' | 'visit' | 'emergency' | null;

const tr = {
  eyebrow: 'KİŞİSEL SAĞLIK YOLCULUĞU', title: 'Normalini öğren, değişimi erken fark et.',
  sub: 'Günlük gözlem, ilaç uyumu, kronik bakım ve veteriner görüşmeleri tek zaman çizgisinde.',
  loading: 'Sağlık yolculuğu yükleniyor…', loadFailed: 'Sağlık yolculuğu yüklenemedi.', saved: 'Kaydedildi.', queued: 'İnternet yok; kayıt güvenle sıraya alındı.',
  baseline: 'Kişisel baz çizgi', learning: 'Öğreniyor', stable: 'Kendi normalinde', watch: 'Belirgin değişim', urgent: 'Acil belirti',
  checkin: '20 saniyelik günlük kontrol', checkinSub: 'İştah, su, dışkı, enerji, ağrı ve ruh hâli.',
  medications: 'İlaç uyumu ve stok', medicationsSub: 'Planlanan/gerçek saat, kaçırılan doz ve yeniden temin.',
  programs: 'Kronik bakım programları', programsSub: 'Böbrek, diyabet, epilepsi, kalp, alerji ve yaşlılık takibi.',
  visit: 'Veteriner Görüşme Asistanı', visitSub: 'Açık rıza ile kayıt/deşifre; tanı, ilaç, test ve takipleri onayınıza sunar.',
  emergency: 'Çevrimdışı Acil Mod', emergencySub: 'Zehirlenme, kanama, solunum ve nöbet için hızlı güvenli adımlar.',
  appetite: 'İştah', water: 'Su', stool: 'Dışkı', energy: 'Enerji', pain: 'Ağrı', mood: 'Ruh hâli',
  low: 'Düşük', normal: 'Normal', high: 'Yüksek', none: 'Yok', note: 'Kısa not', saveCheckin: 'Bugünkü kontrolü kaydet',
  redFlags: 'Acil belirtiler', noFlags: 'Acil belirti yok', save: 'Kaydet', cancel: 'Kapat', add: 'Ekle',
  medName: 'İlaç adı', dose: 'Doz ve uygulama', times: 'Saatler (09:00, 21:00)', stock: 'Stok', threshold: 'Yeniden temin eşiği',
  taken: 'Alındı', missed: 'Kaçtı', skipped: 'Atlandı', adherence: '30 günlük uyum', refill: 'Stok azalıyor', ownerEntry: 'Sahip kaydı', verified: 'Veteriner doğruladı',
  programName: 'Program adı', condition: 'Takip türü', metric: 'Ölçüm (örn. glikoz)', value: 'Değer', unit: 'Birim',
  consent: 'Görüşmedeki herkesin kayıt konusunda bilgilendirildiğini ve onay verdiğini doğruluyorum.',
  startRecording: 'Ses kaydını başlat', stopRecording: 'Kaydı durdur', transcript: 'Ya da görüşme notunu/deşifreyi buraya yapıştırın',
  clinic: 'Klinik', veterinarian: 'Veteriner', processVisit: 'Görüşmeyi işle', confirmSummary: 'Özeti onayla', retry: 'Tekrar işle', realAccount: 'Bu güvenli sunucu işlemi için gerçek hesap gerekli.',
  emergencyNow: 'Bu ekran veteriner yardımının yerine geçmez. Solunum güçlüğü, çökme, nöbet, kontrolsüz kanama veya zehirlenme şüphesinde hemen acil veterinere gidin.',
  nearestVet: 'En yakın açık veterineri bul', callVet: 'Acil veterineri ara', emergencyVetName: 'Acil veteriner adı', emergencyVetPhone: 'Acil veteriner telefonu', safetyNotes: 'Kritik notlar / taşıma uyarıları',
  metaDays: 'gün', records: 'kayıt', activeCount: 'aktif', visitsCount: 'görüşme', offlineQueue: 'çevrimdışı kayıt gönderilmeyi bekliyor', customTracking: 'özel takip',
  audioReady: 'Ses kaydı hazır', deviceReady: 'Cihazda hazır', microphone: 'Mikrofon izni gerekli.', programSuffix: 'takip programı', processing: 'İşleniyor', failed: 'Başarısız',
  summaryObservations: 'Gözlemler', summaryAssessment: 'Tanı / değerlendirme', summaryTests: 'Testler', summaryFollowup: 'Takip', summaryQuestions: 'Sorular', summaryWarnings: 'Uyarılar', summaryFallback: 'Veteriner görüşmesi özeti',
  poisonTitle: 'Zehirlenme:', poisonText: 'Teması kesin, ambalajı alın; veteriner söylemeden kusturmayın ve yiyecek/ilaç vermeyin.', bleedingTitle: 'Kanama:', bleedingText: 'Temiz bezle doğrudan ve kesintisiz basınç uygulayın. Bez ıslanırsa kaldırmadan üstüne yenisini ekleyin.',
  seizureTitle: 'Nöbet:', seizureText: 'Çevresini boşaltın, ağzına el/cisim sokmayın, süre tutun ve acil veterinere gidin.', cprTitle: 'Solunum / CPR:', cprText: 'Yanıt vermiyor ve normal nefes almıyorsa acil veterineri arayın; eğitimliyseniz 100–120/dk göğüs basısı ve 30:2 döngüsü uygulayın.',
};

const en: typeof tr = {
  eyebrow: 'PERSONAL HEALTH JOURNEY', title: 'Learn their normal. Notice meaningful change.',
  sub: 'Daily observations, medication adherence, chronic care and veterinary visits in one timeline.',
  loading: 'Loading health journey…', loadFailed: 'Could not load the health journey.', saved: 'Saved.', queued: 'Offline; the record was safely queued.',
  baseline: 'Personal baseline', learning: 'Learning', stable: 'Within baseline', watch: 'Meaningful change', urgent: 'Urgent sign',
  checkin: '20-second daily check-in', checkinSub: 'Appetite, water, stool, energy, pain and mood.',
  medications: 'Medication adherence and stock', medicationsSub: 'Planned/actual time, missed doses and refills.',
  programs: 'Chronic care programs', programsSub: 'Kidney, diabetes, epilepsy, heart, allergy and senior care.',
  visit: 'Veterinary Visit Copilot', visitSub: 'Consent-based recording/transcription with diagnoses, medications, tests and follow-ups for your review.',
  emergency: 'Offline Emergency Mode', emergencySub: 'Fast, safe steps for poisoning, bleeding, breathing problems and seizures.',
  appetite: 'Appetite', water: 'Water', stool: 'Stool', energy: 'Energy', pain: 'Pain', mood: 'Mood',
  low: 'Low', normal: 'Normal', high: 'High', none: 'None', note: 'Short note', saveCheckin: 'Save today’s check-in',
  redFlags: 'Emergency signs', noFlags: 'No emergency sign', save: 'Save', cancel: 'Close', add: 'Add',
  medName: 'Medication name', dose: 'Dose and administration', times: 'Times (09:00, 21:00)', stock: 'Stock', threshold: 'Refill threshold',
  taken: 'Taken', missed: 'Missed', skipped: 'Skipped', adherence: '30-day adherence', refill: 'Stock is low', ownerEntry: 'Owner-entered', verified: 'Vet verified',
  programName: 'Program name', condition: 'Care type', metric: 'Measurement (e.g. glucose)', value: 'Value', unit: 'Unit',
  consent: 'I confirm everyone in the visit was informed about and consented to recording.',
  startRecording: 'Start audio recording', stopRecording: 'Stop recording', transcript: 'Or paste visit notes/transcript here',
  clinic: 'Clinic', veterinarian: 'Veterinarian', processVisit: 'Process visit', confirmSummary: 'Confirm summary', retry: 'Process again', realAccount: 'A real account is required for this secure server action.',
  emergencyNow: 'This screen does not replace veterinary care. Seek an emergency veterinarian immediately for breathing difficulty, collapse, seizure, uncontrolled bleeding or suspected poisoning.',
  nearestVet: 'Find nearest open veterinarian', callVet: 'Call emergency veterinarian', emergencyVetName: 'Emergency veterinarian name', emergencyVetPhone: 'Emergency veterinarian phone', safetyNotes: 'Critical notes / transport warnings',
  metaDays: 'days', records: 'records', activeCount: 'active', visitsCount: 'visits', offlineQueue: 'offline records waiting to sync', customTracking: 'special tracking',
  audioReady: 'Audio recording ready', deviceReady: 'Ready on device', microphone: 'Microphone permission is required.', programSuffix: 'care program', processing: 'Processing', failed: 'Failed',
  summaryObservations: 'Observations', summaryAssessment: 'Diagnosis / assessment', summaryTests: 'Tests', summaryFollowup: 'Follow-up', summaryQuestions: 'Questions', summaryWarnings: 'Warnings', summaryFallback: 'Veterinary visit summary',
  poisonTitle: 'Poisoning:', poisonText: 'Stop exposure and take the packaging. Do not induce vomiting or give food/medicine unless a veterinarian directs you.', bleedingTitle: 'Bleeding:', bleedingText: 'Apply firm, continuous pressure with a clean cloth. If soaked, add another cloth without removing the first.',
  seizureTitle: 'Seizure:', seizureText: 'Clear the area, do not put hands or objects in the mouth, time the seizure and seek emergency veterinary care.', cprTitle: 'Breathing / CPR:', cprText: 'If unresponsive and not breathing normally, call an emergency veterinarian; if trained, give 100–120 chest compressions/min in 30:2 cycles.',
};

const de: typeof tr = {
  eyebrow:'PERSÖNLICHER GESUNDHEITSVERLAUF', title:'Normalzustand lernen. Veränderungen früh erkennen.', sub:'Tägliche Beobachtungen, Medikamententreue, chronische Pflege und Tierarztbesuche in einem Verlauf.',
  loading:'Gesundheitsverlauf wird geladen…', loadFailed:'Gesundheitsverlauf konnte nicht geladen werden.', saved:'Gespeichert.', queued:'Offline; der Eintrag wurde sicher vorgemerkt.', baseline:'Persönliche Basislinie', learning:'Lernphase', stable:'Im persönlichen Normalbereich', watch:'Bedeutsame Veränderung', urgent:'Dringendes Anzeichen',
  checkin:'20-Sekunden-Tagescheck', checkinSub:'Appetit, Wasser, Kot, Energie, Schmerzen und Stimmung.', medications:'Medikamententreue und Bestand', medicationsSub:'Geplante/tatsächliche Zeit, ausgelassene Dosen und Nachschub.', programs:'Programme für chronische Erkrankungen', programsSub:'Niere, Diabetes, Epilepsie, Herz, Allergie und Seniorenpflege.',
  visit:'Tierarztbesuch-Assistent', visitSub:'Aufzeichnung/Transkription mit Einwilligung; Diagnosen, Medikamente, Tests und Kontrollen zur Prüfung.', emergency:'Offline-Notfallmodus', emergencySub:'Schnelle, sichere Schritte bei Vergiftung, Blutung, Atemproblemen und Krampfanfällen.',
  appetite:'Appetit', water:'Wasser', stool:'Kot', energy:'Energie', pain:'Schmerz', mood:'Stimmung', low:'Niedrig', normal:'Normal', high:'Hoch', none:'Keine', note:'Kurze Notiz', saveCheckin:'Heutigen Check speichern', redFlags:'Notfallzeichen', noFlags:'Kein Notfallzeichen', save:'Speichern', cancel:'Schließen', add:'Hinzufügen',
  medName:'Medikament', dose:'Dosis und Anwendung', times:'Zeiten (09:00, 21:00)', stock:'Bestand', threshold:'Nachbestellgrenze', taken:'Gegeben', missed:'Verpasst', skipped:'Übersprungen', adherence:'30-Tage-Treue', refill:'Bestand niedrig', ownerEntry:'Halterangabe', verified:'Tierärztlich bestätigt',
  programName:'Programmname', condition:'Betreuungsart', metric:'Messwert (z. B. Glukose)', value:'Wert', unit:'Einheit', consent:'Ich bestätige, dass alle Beteiligten über die Aufzeichnung informiert wurden und eingewilligt haben.', startRecording:'Audioaufnahme starten', stopRecording:'Aufnahme stoppen', transcript:'Oder Besuchsnotizen/Transkript hier einfügen',
  clinic:'Klinik', veterinarian:'Tierarzt', processVisit:'Besuch verarbeiten', confirmSummary:'Zusammenfassung bestätigen', retry:'Erneut verarbeiten', realAccount:'Für diese sichere Serveraktion ist ein echtes Konto erforderlich.', emergencyNow:'Dieser Bildschirm ersetzt keine tierärztliche Behandlung. Bei Atemnot, Kollaps, Krampfanfall, unkontrollierter Blutung oder Vergiftungsverdacht sofort zum Notdienst.',
  nearestVet:'Nächsten geöffneten Tierarzt finden', callVet:'Notfalltierarzt anrufen', emergencyVetName:'Name des Notfalltierarztes', emergencyVetPhone:'Telefon des Notfalltierarztes', safetyNotes:'Kritische Hinweise / Transportwarnungen', metaDays:'Tage', records:'Einträge', activeCount:'aktiv', visitsCount:'Besuche', offlineQueue:'Offline-Einträge warten auf Synchronisierung', customTracking:'spezielle Erfassung',
  audioReady:'Audioaufnahme bereit', deviceReady:'Auf dem Gerät verfügbar', microphone:'Mikrofonzugriff ist erforderlich.', programSuffix:'Betreuungsprogramm', processing:'In Bearbeitung', failed:'Fehlgeschlagen', summaryObservations:'Beobachtungen', summaryAssessment:'Diagnose / Beurteilung', summaryTests:'Tests', summaryFollowup:'Nachkontrolle', summaryQuestions:'Fragen', summaryWarnings:'Warnungen', summaryFallback:'Zusammenfassung des Tierarztbesuchs',
  poisonTitle:'Vergiftung:', poisonText:'Kontakt beenden und Verpackung mitnehmen. Kein Erbrechen auslösen und nichts geben, außer auf tierärztliche Anweisung.', bleedingTitle:'Blutung:', bleedingText:'Mit einem sauberen Tuch festen, ununterbrochenen Druck ausüben. Bei Durchnässung ein weiteres Tuch darüberlegen.', seizureTitle:'Krampfanfall:', seizureText:'Umgebung freiräumen, nichts in den Mund stecken, Dauer messen und den tierärztlichen Notdienst aufsuchen.', cprTitle:'Atmung / CPR:', cprText:'Bei Bewusstlosigkeit und fehlender normaler Atmung Notdienst rufen; falls geschult, 100–120 Kompressionen/Min. im Verhältnis 30:2 durchführen.',
};

const es: typeof tr = {
  eyebrow:'RECORRIDO DE SALUD PERSONAL', title:'Aprende su normalidad. Detecta cambios pronto.', sub:'Observaciones diarias, adherencia a medicamentos, cuidados crónicos y visitas en una línea temporal.', loading:'Cargando el recorrido de salud…', loadFailed:'No se pudo cargar el recorrido de salud.', saved:'Guardado.', queued:'Sin conexión; el registro quedó en cola de forma segura.',
  baseline:'Línea base personal', learning:'Aprendiendo', stable:'Dentro de su normalidad', watch:'Cambio importante', urgent:'Señal urgente', checkin:'Control diario de 20 segundos', checkinSub:'Apetito, agua, heces, energía, dolor y ánimo.', medications:'Adherencia y existencias', medicationsSub:'Hora prevista/real, dosis omitidas y reposición.', programs:'Programas de cuidados crónicos', programsSub:'Riñón, diabetes, epilepsia, corazón, alergias y cuidados sénior.',
  visit:'Asistente de visita veterinaria', visitSub:'Grabación/transcripción con consentimiento; diagnósticos, medicamentos, pruebas y seguimientos para revisar.', emergency:'Modo de emergencia sin conexión', emergencySub:'Pasos rápidos y seguros ante intoxicación, hemorragia, dificultad respiratoria y convulsiones.', appetite:'Apetito', water:'Agua', stool:'Heces', energy:'Energía', pain:'Dolor', mood:'Ánimo', low:'Bajo', normal:'Normal', high:'Alto', none:'Ninguno', note:'Nota breve', saveCheckin:'Guardar el control de hoy', redFlags:'Señales de emergencia', noFlags:'Sin señales de emergencia', save:'Guardar', cancel:'Cerrar', add:'Añadir',
  medName:'Medicamento', dose:'Dosis y administración', times:'Horas (09:00, 21:00)', stock:'Existencias', threshold:'Umbral de reposición', taken:'Administrada', missed:'Omitida', skipped:'Saltada', adherence:'Adherencia de 30 días', refill:'Pocas existencias', ownerEntry:'Introducido por el dueño', verified:'Verificado por veterinario', programName:'Nombre del programa', condition:'Tipo de cuidado', metric:'Medición (p. ej. glucosa)', value:'Valor', unit:'Unidad',
  consent:'Confirmo que todas las personas presentes fueron informadas y aceptaron la grabación.', startRecording:'Iniciar grabación', stopRecording:'Detener grabación', transcript:'O pega aquí notas o transcripción', clinic:'Clínica', veterinarian:'Veterinario', processVisit:'Procesar visita', confirmSummary:'Confirmar resumen', retry:'Procesar de nuevo', realAccount:'Se requiere una cuenta real para esta acción segura.', emergencyNow:'Esta pantalla no sustituye la atención veterinaria. Acude de inmediato ante dificultad respiratoria, colapso, convulsión, hemorragia incontrolada o sospecha de intoxicación.',
  nearestVet:'Buscar veterinario abierto cercano', callVet:'Llamar al veterinario de urgencias', emergencyVetName:'Nombre del veterinario de urgencias', emergencyVetPhone:'Teléfono de urgencias', safetyNotes:'Notas críticas / transporte', metaDays:'días', records:'registros', activeCount:'activos', visitsCount:'visitas', offlineQueue:'registros sin conexión pendientes de sincronizar', customTracking:'seguimiento especial', audioReady:'Grabación lista', deviceReady:'Disponible en el dispositivo', microphone:'Se requiere permiso de micrófono.', programSuffix:'programa de seguimiento', processing:'Procesando', failed:'Fallido',
  summaryObservations:'Observaciones', summaryAssessment:'Diagnóstico / valoración', summaryTests:'Pruebas', summaryFollowup:'Seguimiento', summaryQuestions:'Preguntas', summaryWarnings:'Advertencias', summaryFallback:'Resumen de la visita veterinaria', poisonTitle:'Intoxicación:', poisonText:'Corta la exposición y lleva el envase. No provoques el vómito ni des comida o medicación sin indicación veterinaria.', bleedingTitle:'Hemorragia:', bleedingText:'Aplica presión firme y continua con un paño limpio. Si se empapa, añade otro sin retirar el primero.', seizureTitle:'Convulsión:', seizureText:'Despeja la zona, no introduzcas nada en la boca, mide el tiempo y acude a urgencias.', cprTitle:'Respiración / RCP:', cprText:'Si no responde ni respira con normalidad, llama a urgencias; si tienes formación, realiza 100–120 compresiones/min en ciclos 30:2.',
};

const ja: typeof tr = {
  eyebrow:'パーソナル健康ジャーニー', title:'いつもの状態を学び、変化に早く気づく。', sub:'毎日の観察、服薬状況、慢性ケア、診察記録を一つのタイムラインに。', loading:'健康ジャーニーを読み込んでいます…', loadFailed:'健康ジャーニーを読み込めませんでした。', saved:'保存しました。', queued:'オフラインのため、安全に送信待ちへ追加しました。', baseline:'個別ベースライン', learning:'学習中', stable:'いつもの範囲', watch:'重要な変化', urgent:'緊急サイン',
  checkin:'20秒のデイリーチェック', checkinSub:'食欲、水分、便、元気、痛み、気分。', medications:'服薬状況と在庫', medicationsSub:'予定/実際の時刻、飲み忘れ、補充。', programs:'慢性ケアプログラム', programsSub:'腎臓、糖尿病、てんかん、心臓、アレルギー、シニアケア。', visit:'診察アシスタント', visitSub:'同意に基づく録音・文字起こしから、診断、薬、検査、再診予定を確認できます。', emergency:'オフライン緊急モード', emergencySub:'中毒、出血、呼吸異常、けいれん時の安全な初期対応。',
  appetite:'食欲', water:'水分', stool:'便', energy:'元気', pain:'痛み', mood:'気分', low:'低い', normal:'通常', high:'高い', none:'なし', note:'短いメモ', saveCheckin:'今日のチェックを保存', redFlags:'緊急サイン', noFlags:'緊急サインなし', save:'保存', cancel:'閉じる', add:'追加', medName:'薬の名前', dose:'用量と使用方法', times:'時刻（09:00, 21:00）', stock:'在庫', threshold:'補充ライン', taken:'投与済み', missed:'未投与', skipped:'スキップ', adherence:'30日間の服薬率', refill:'在庫が少なくなっています', ownerEntry:'飼い主入力', verified:'獣医師確認済み',
  programName:'プログラム名', condition:'ケアの種類', metric:'測定項目（例：血糖値）', value:'値', unit:'単位', consent:'診察に同席した全員が録音について説明を受け、同意したことを確認します。', startRecording:'録音を開始', stopRecording:'録音を停止', transcript:'または診察メモ・文字起こしを貼り付け', clinic:'動物病院', veterinarian:'獣医師', processVisit:'診察内容を処理', confirmSummary:'サマリーを承認', retry:'再処理', realAccount:'この安全なサーバー処理には実アカウントが必要です。', emergencyNow:'この画面は獣医療に代わるものではありません。呼吸困難、虚脱、けいれん、止まらない出血、中毒の疑いがある場合は直ちに救急動物病院へ。',
  nearestVet:'最寄りの営業中の動物病院を探す', callVet:'救急動物病院へ電話', emergencyVetName:'救急動物病院名', emergencyVetPhone:'救急連絡先', safetyNotes:'重要なメモ / 搬送時の注意', metaDays:'日', records:'件', activeCount:'有効', visitsCount:'回の診察', offlineQueue:'件のオフライン記録が送信待ちです', customTracking:'専用記録', audioReady:'録音の準備完了', deviceReady:'端末内で利用可能', microphone:'マイクの許可が必要です。', programSuffix:'ケアプログラム', processing:'処理中', failed:'失敗',
  summaryObservations:'観察事項', summaryAssessment:'診断 / 評価', summaryTests:'検査', summaryFollowup:'フォローアップ', summaryQuestions:'質問', summaryWarnings:'注意事項', summaryFallback:'診察サマリー', poisonTitle:'中毒:', poisonText:'原因物質から離し、容器や包装を持参してください。獣医師の指示なしに吐かせたり、食べ物や薬を与えないでください。', bleedingTitle:'出血:', bleedingText:'清潔な布で強く連続して圧迫してください。染みても最初の布を外さず上から重ねます。', seizureTitle:'けいれん:', seizureText:'周囲を片付け、口に手や物を入れず、時間を計って救急動物病院へ。', cprTitle:'呼吸 / CPR:', cprText:'反応がなく正常に呼吸していない場合は救急へ連絡し、訓練を受けている場合は毎分100〜120回、30:2で胸部圧迫を行います。',
};

const checkInMetrics: Array<{ key: CheckInMetric; icon: string; min: number }> = [
  { key: 'appetite', icon: '🍽️', min: 1 }, { key: 'waterIntake', icon: '💧', min: 1 },
  { key: 'stoolQuality', icon: '◉', min: 1 }, { key: 'energy', icon: '⚡', min: 1 },
  { key: 'pain', icon: '♥', min: 0 }, { key: 'mood', icon: '☺', min: 1 },
];

const redFlagOptions: Array<{ key: EmergencyRedFlag; tr: string; en: string; de: string; es: string; ja: string }> = [
  { key: 'breathing_difficulty', tr: 'Solunum güçlüğü', en: 'Breathing difficulty', de:'Atemnot', es:'Dificultad respiratoria', ja:'呼吸困難' },
  { key: 'collapse', tr: 'Çökme / bayılma', en: 'Collapse', de:'Kollaps / Ohnmacht', es:'Colapso / desmayo', ja:'虚脱 / 失神' },
  { key: 'seizure', tr: 'Nöbet', en: 'Seizure', de:'Krampfanfall', es:'Convulsión', ja:'けいれん' },
  { key: 'repeated_vomiting', tr: 'Tekrarlayan kusma', en: 'Repeated vomiting', de:'Wiederholtes Erbrechen', es:'Vómitos repetidos', ja:'繰り返す嘔吐' },
  { key: 'uncontrolled_bleeding', tr: 'Kontrolsüz kanama', en: 'Uncontrolled bleeding', de:'Unkontrollierte Blutung', es:'Hemorragia incontrolada', ja:'止まらない出血' },
  { key: 'possible_poisoning', tr: 'Zehirlenme şüphesi', en: 'Possible poisoning', de:'Vergiftungsverdacht', es:'Posible intoxicación', ja:'中毒の疑い' },
];

const conditionOptions: Array<{ key: CareProgram['conditionKey']; tr: string; en: string; de: string; es: string; ja: string }> = [
  { key: 'kidney', tr: 'Böbrek', en: 'Kidney', de:'Niere', es:'Riñón', ja:'腎臓' }, { key: 'diabetes', tr: 'Diyabet', en: 'Diabetes', de:'Diabetes', es:'Diabetes', ja:'糖尿病' },
  { key: 'epilepsy', tr: 'Epilepsi', en: 'Epilepsy', de:'Epilepsie', es:'Epilepsia', ja:'てんかん' }, { key: 'heart', tr: 'Kalp', en: 'Heart', de:'Herz', es:'Corazón', ja:'心臓' },
  { key: 'allergy', tr: 'Alerji', en: 'Allergy', de:'Allergie', es:'Alergia', ja:'アレルギー' }, { key: 'senior', tr: 'Yaşlılık', en: 'Senior', de:'Senior', es:'Sénior', ja:'シニア' },
  { key: 'other', tr: 'Diğer', en: 'Other', de:'Andere', es:'Otro', ja:'その他' },
];

function CardButton({ icon, title, text, status, onPress }: { icon: string; title: string; text: string; status?: string; onPress: () => void }) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={styles.featureCard}>
    <View style={styles.featureIcon}><Text style={styles.featureIconText}>{icon}</Text></View>
    <View style={styles.featureCopy}><Text style={styles.featureTitle}>{title}</Text><Text style={styles.featureText}>{text}</Text>{status ? <Text style={styles.featureStatus}>{status}</Text> : null}</View>
    <Text style={styles.chevron}>›</Text>
  </Pressable>;
}

function PanelHeader({ title, close }: { title: string; close: () => void }) {
  return <View style={styles.panelHeader}><Text style={styles.panelTitle}>{title}</Text><Pressable accessibilityLabel="Close" onPress={close}><Text style={styles.close}>×</Text></Pressable></View>;
}

function Field(props: React.ComponentProps<typeof TextInput>) {
  return <TextInput placeholderTextColor={colors.muted} style={[styles.input, props.multiline && styles.multiline]} {...props} />;
}

function SummaryView({ summary, c }: { summary: VetVisitSummary; c: typeof tr }) {
  const groups: Array<[string, string[]]> = [
    [c.summaryObservations, summary.observations ?? []], [c.summaryAssessment, summary.diagnoses ?? []],
    [c.summaryTests, summary.tests ?? []], [c.summaryFollowup, (summary.followUps ?? []).map(item => `${item.action}${item.dueDate ? ` · ${item.dueDate}` : ''}`)],
    [c.summaryQuestions, summary.ownerQuestions ?? []], [c.summaryWarnings, summary.warnings ?? []],
  ];
  return <View style={styles.summary}><Text style={styles.summaryTitle}>{summary.reason || c.summaryFallback}</Text>{groups.filter(([, items]) => items.length).map(([title, items]) => <View key={title} style={styles.summaryGroup}><Text style={styles.summaryLabel}>{title}</Text>{items.map((item, index) => <Text key={`${title}-${index}`} style={styles.summaryItem}>• {item}</Text>)}</View>)}</View>;
}

export function ClinicalCareSuite({ pet, userId, demoMode }: { pet: Pet; userId?: string; demoMode: boolean }) {
  const { language } = usePreferences();
  const c = { tr, en, de, es, ja }[language];
  const [panel, setPanel] = useState<Panel>(null);
  const [snapshot, setSnapshot] = useState<CareJourneySnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [metrics, setMetrics] = useState<Record<CheckInMetric, number>>({ appetite: 3, waterIntake: 3, stoolQuality: 3, energy: 3, pain: 0, mood: 3 });
  const [notes, setNotes] = useState('');
  const [redFlags, setRedFlags] = useState<EmergencyRedFlag[]>([]);
  const [speciesMetrics, setSpeciesMetrics] = useState<Record<string, string>>({});
  const [medName, setMedName] = useState(''); const [medDose, setMedDose] = useState(''); const [medTimes, setMedTimes] = useState('09:00');
  const [medStock, setMedStock] = useState(''); const [medThreshold, setMedThreshold] = useState('');
  const [condition, setCondition] = useState<CareProgram['conditionKey']>('kidney'); const [programName, setProgramName] = useState('');
  const [selectedProgramId, setSelectedProgramId] = useState(''); const [measurementType, setMeasurementType] = useState(''); const [measurementValue, setMeasurementValue] = useState(''); const [measurementUnit, setMeasurementUnit] = useState('');
  const [recordingConsent, setRecordingConsent] = useState(false); const [recordingUri, setRecordingUri] = useState('');
  const [clinic, setClinic] = useState(''); const [veterinarian, setVeterinarian] = useState(''); const [transcript, setTranscript] = useState('');
  const [visitResult, setVisitResult] = useState<{ visitId: string; transcript: string; summary: VetVisitSummary } | null>(null);
  const [emergencyVetName, setEmergencyVetName] = useState(''); const [emergencyVetPhone, setEmergencyVetPhone] = useState(''); const [safetyNotes, setSafetyNotes] = useState('');
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder);
  const speciesFields = useMemo(() => speciesMetricDefinitions(pet.species, language), [pet.species, language]);
  const baseline = useMemo(() => calculatePersonalBaseline(snapshot?.checkIns ?? []), [snapshot?.checkIns]);

  async function refresh() {
    setLoading(true);
    try {
      const data = await loadCareJourney(userId, pet.id, demoMode); setSnapshot(data); setError('');
      if (data.emergencyProfile) { setEmergencyVetName(data.emergencyProfile.emergencyVetName ?? ''); setEmergencyVetPhone(data.emergencyProfile.emergencyVetPhone ?? ''); setSafetyNotes(data.emergencyProfile.safetyNotes ?? ''); }
    } catch (reason) { setError(reason instanceof Error ? reason.message : c.loadFailed); }
    finally { setLoading(false); }
  }

  useEffect(() => { setPanel(null); setVisitResult(null); void refresh(); }, [pet.id, userId, demoMode]);

  const setMetric = (key: CheckInMetric, value: number, min: number) => setMetrics(current => ({ ...current, [key]: Math.max(min, Math.min(5, value)) }));
  const metricLabel = (key: CheckInMetric) => ({ appetite: c.appetite, waterIntake: c.water, stoolQuality: c.stool, energy: c.energy, pain: c.pain, mood: c.mood })[key];
  const baselineStatus = ({ learning: c.learning, stable: c.stable, watch: c.watch, urgent: c.urgent })[baseline.status];

  async function submitCheckIn() {
    setBusy(true); setError(''); setMessage('');
    try {
      const normalizedSpecies = Object.fromEntries(Object.entries(speciesMetrics).filter(([, value]) => value.trim()).map(([key, value]) => [key, Number.isFinite(Number(value.replace(',', '.'))) ? Number(value.replace(',', '.')) : value.trim()]));
      const result = await saveDailyCheckIn({ userId, petId: pet.id, demoMode, ...metrics, redFlags, speciesMetrics: normalizedSpecies, notes });
      setNotes(''); setRedFlags([]); setMessage(result.queued ? c.queued : c.saved); await refresh();
      if (redFlags.length) Alert.alert(c.urgent, c.emergencyNow);
    } catch (reason) { setError(reason instanceof Error ? reason.message : c.loadFailed); }
    finally { setBusy(false); }
  }

  async function submitMedication() {
    setBusy(true); setError('');
    try {
      await createMedicationPlan({ userId, petId: pet.id, demoMode, medicationName: medName, dosageText: medDose,
        scheduleTimes: medTimes.split(',').map(item => item.trim()).filter(item => /^([01]\d|2[0-3]):[0-5]\d$/.test(item)),
        stockQuantity: medStock ? Number(medStock.replace(',', '.')) : undefined, stockUnit: 'doz', refillThreshold: medThreshold ? Number(medThreshold.replace(',', '.')) : undefined });
      setMedName(''); setMedDose(''); setMedStock(''); setMedThreshold(''); setMessage(c.saved); await refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : c.loadFailed); }
    finally { setBusy(false); }
  }

  async function markDose(plan: NonNullable<CareJourneySnapshot['medicationPlans']>[number], status: 'taken' | 'missed' | 'skipped') {
    setBusy(true);
    try { const result = await recordMedicationDose({ userId, petId: pet.id, demoMode, plan, status }); setMessage(result.queued ? c.queued : c.saved); await refresh(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : c.loadFailed); }
    finally { setBusy(false); }
  }

  async function submitProgram() {
    setBusy(true);
    try { const defaultName = conditionOptions.find(item => item.key === condition)?.[language] ?? condition; await createCareProgram({ userId, petId: pet.id, demoMode, conditionKey: condition, label: programName.trim() || `${defaultName} ${c.programSuffix}` }); setProgramName(''); setMessage(c.saved); await refresh(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : c.loadFailed); }
    finally { setBusy(false); }
  }

  async function submitMeasurement() {
    if (!selectedProgramId) return;
    setBusy(true);
    try { const result = await addCareMeasurement({ userId, petId: pet.id, demoMode, programId: selectedProgramId, metricType: measurementType, value: measurementValue, unit: measurementUnit }); setMeasurementType(''); setMeasurementValue(''); setMeasurementUnit(''); setMessage(result.queued ? c.queued : c.saved); await refresh(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : c.loadFailed); }
    finally { setBusy(false); }
  }

  async function toggleRecording() {
    if (recorderState.isRecording) { await recorder.stop(); setRecordingUri(recorder.uri ?? ''); await setAudioModeAsync({ allowsRecording: false }); return; }
    if (!recordingConsent) { Alert.alert(c.visit, c.consent); return; }
    const permission = await AudioModule.requestRecordingPermissionsAsync();
    if (!permission.granted) { Alert.alert(c.visit, c.microphone); return; }
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true }); await recorder.prepareToRecordAsync(); recorder.record();
  }

  async function processVisit(existingVisitId?: string) {
    if (demoMode || !userId) { Alert.alert(c.visit, c.realAccount); return; }
    setBusy(true); setError('');
    try {
      let visitId = existingVisitId;
      if (!visitId) {
        let audioStoragePath: string | undefined;
        if (recordingUri) audioStoragePath = await uploadVetVisitAudio(userId, recordingUri, recordingUri.endsWith('.webm') ? 'audio/webm' : 'audio/m4a');
        visitId = await createVetVisit({ userId, petId: pet.id, clinicName: clinic, veterinarian, recordingConsent, audioStoragePath, transcript });
      }
      const result = await runVetVisitCopilot(visitId);
      setVisitResult({ visitId, transcript: result.transcript, summary: result.summary }); setTranscript(result.transcript); await refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : c.loadFailed); }
    finally { setBusy(false); }
  }

  async function approveVisit() {
    if (!visitResult || !userId) return;
    setBusy(true);
    try { await confirmVetVisit(userId, visitResult.visitId, visitResult.summary); setMessage(c.saved); setVisitResult(null); setTranscript(''); setRecordingUri(''); await refresh(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : c.loadFailed); }
    finally { setBusy(false); }
  }

  async function saveEmergency() {
    if (demoMode || !userId) { Alert.alert(c.emergency, c.realAccount); return; }
    setBusy(true);
    try { await saveEmergencyProfile(userId, { petId: pet.id, emergencyVetName, emergencyVetPhone, safetyNotes }); setMessage(c.saved); await refresh(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : c.loadFailed); }
    finally { setBusy(false); }
  }

  if (loading && !snapshot) return <View style={styles.loading}><ActivityIndicator color={colors.primary} /><Text style={styles.muted}>{c.loading}</Text></View>;
  const data = snapshot ?? { checkIns: [], medicationPlans: [], medicationDoses: [], programs: [], measurements: [], visits: [], queuedCount: 0 };

  return <View style={styles.wrap}>
    <Text style={styles.eyebrow}>{c.eyebrow}</Text><Text style={styles.title}>{c.title}</Text><Text style={styles.sub}>{c.sub}</Text>
    <View style={[styles.baseline, baseline.status === 'urgent' && styles.urgentCard]}><View style={{ flex: 1 }}><Text style={styles.baselineLabel}>{c.baseline}</Text><Text style={styles.baselineStatus}>{baselineStatus}</Text><Text style={styles.baselineMeta}>7 / 30 / 90 {c.metaDays} · {baseline.windows.map(window => window.count).join(' / ')} {c.records}</Text></View><View style={styles.changeBubble}><Text style={styles.changeValue}>{baseline.status === 'learning' ? '…' : baseline.changeScore}</Text><Text style={styles.changeUnit}>Δ</Text></View></View>
    {data.queuedCount ? <Text style={styles.queue}>↻ {data.queuedCount} {c.offlineQueue}</Text> : null}
    {message ? <Text accessibilityRole="alert" style={styles.success}>{message}</Text> : null}{error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}

    <CardButton icon="✓" title={c.checkin} text={c.checkinSub} status={`${data.checkIns.length} ${c.records}`} onPress={() => setPanel(panel === 'checkin' ? null : 'checkin')} />
    {panel === 'checkin' ? <View style={styles.panel}><PanelHeader title={c.checkin} close={() => setPanel(null)} />
      <View style={styles.metricGrid}>{checkInMetrics.map(item => <View key={item.key} style={styles.metricCard}><Text style={styles.metricIcon}>{item.icon}</Text><Text style={styles.metricName}>{metricLabel(item.key)}</Text><View style={styles.stepper}><Pressable onPress={() => setMetric(item.key, metrics[item.key] - 1, item.min)} style={styles.stepButton}><Text style={styles.stepText}>−</Text></Pressable><Text style={styles.metricValue}>{metrics[item.key]}</Text><Pressable onPress={() => setMetric(item.key, metrics[item.key] + 1, item.min)} style={styles.stepButton}><Text style={styles.stepText}>+</Text></Pressable></View></View>)}</View>
      <Text style={styles.formLabel}>{pet.species} · {c.customTracking}</Text><View style={styles.inlineFields}>{speciesFields.map(field => <View key={field.key} style={styles.flexField}><Field keyboardType={field.keyboard === 'numeric' ? 'decimal-pad' : 'default'} onChangeText={value => setSpeciesMetrics(current => ({ ...current, [field.key]: value }))} placeholder={`${field.label}${field.unit ? ` (${field.unit})` : ''}`} value={speciesMetrics[field.key] ?? ''} /></View>)}</View>
      <Text style={styles.formLabel}>{c.redFlags}</Text><View style={styles.chips}>{redFlagOptions.map(option => { const selected = redFlags.includes(option.key); return <Pressable key={option.key} onPress={() => setRedFlags(current => selected ? current.filter(item => item !== option.key) : [...current, option.key])} style={[styles.chip, selected && styles.dangerChip]}><Text style={[styles.chipText, selected && styles.dangerChipText]}>{option[language]}</Text></Pressable>; })}</View>
      <Field multiline onChangeText={setNotes} placeholder={c.note} value={notes} /><Pressable disabled={busy} onPress={submitCheckIn} style={styles.primary}><Text style={styles.primaryText}>{busy ? '…' : c.saveCheckin}</Text></Pressable>
    </View> : null}

    <CardButton icon="✚" title={c.medications} text={c.medicationsSub} status={`${data.medicationPlans.filter(item => item.active).length} ${c.activeCount}`} onPress={() => setPanel(panel === 'medications' ? null : 'medications')} />
    {panel === 'medications' ? <View style={styles.panel}><PanelHeader title={c.medications} close={() => setPanel(null)} />
      {data.medicationPlans.filter(plan => plan.active).map(plan => { const adherence = medicationAdherence(plan.id, data.medicationDoses); const lowStock = plan.stockQuantity != null && plan.refillThreshold != null && plan.stockQuantity <= plan.refillThreshold; return <View key={plan.id} style={styles.recordCard}><View style={styles.recordHeader}><View style={{ flex: 1 }}><Text style={styles.recordTitle}>{plan.medicationName}</Text><Text style={styles.recordMeta}>{plan.dosageText} · {plan.scheduleTimes.join(', ') || '—'}</Text></View><Text style={[styles.verifyBadge, plan.verificationStatus === 'vet_verified' && styles.verifiedBadge]}>{plan.verificationStatus === 'vet_verified' ? c.verified : c.ownerEntry}</Text></View><Text style={[styles.stock, lowStock && styles.stockLow]}>{plan.stockQuantity == null ? '' : `${c.stock}: ${plan.stockQuantity} ${plan.stockUnit ?? ''}`}{lowStock ? ` · ${c.refill}` : ''}</Text>{adherence != null ? <Text style={styles.adherence}>{c.adherence}: %{adherence}</Text> : null}<View style={styles.actionRow}><Pressable disabled={busy} onPress={() => markDose(plan, 'taken')} style={styles.smallPrimary}><Text style={styles.smallPrimaryText}>✓ {c.taken}</Text></Pressable><Pressable disabled={busy} onPress={() => markDose(plan, 'missed')} style={styles.smallGhost}><Text style={styles.smallGhostText}>{c.missed}</Text></Pressable><Pressable disabled={busy} onPress={() => markDose(plan, 'skipped')} style={styles.smallGhost}><Text style={styles.smallGhostText}>{c.skipped}</Text></Pressable></View></View>; })}
      <Text style={styles.formLabel}>{c.add}</Text><Field onChangeText={setMedName} placeholder={c.medName} value={medName} /><Field onChangeText={setMedDose} placeholder={c.dose} value={medDose} /><Field autoCapitalize="none" onChangeText={setMedTimes} placeholder={c.times} value={medTimes} /><View style={styles.inlineFields}><View style={styles.flexField}><Field keyboardType="decimal-pad" onChangeText={setMedStock} placeholder={c.stock} value={medStock} /></View><View style={styles.flexField}><Field keyboardType="decimal-pad" onChangeText={setMedThreshold} placeholder={c.threshold} value={medThreshold} /></View></View><Pressable disabled={busy || !medName.trim() || !medDose.trim()} onPress={submitMedication} style={styles.primary}><Text style={styles.primaryText}>{busy ? '…' : c.add}</Text></Pressable>
    </View> : null}

    <CardButton icon="⌁" title={c.programs} text={c.programsSub} status={`${data.programs.filter(item => item.status === 'active').length} ${c.activeCount}`} onPress={() => setPanel(panel === 'programs' ? null : 'programs')} />
    {panel === 'programs' ? <View style={styles.panel}><PanelHeader title={c.programs} close={() => setPanel(null)} /><View style={styles.chips}>{conditionOptions.map(option => <Pressable key={option.key} onPress={() => setCondition(option.key)} style={[styles.chip, condition === option.key && styles.chipActive]}><Text style={[styles.chipText, condition === option.key && styles.chipTextActive]}>{option[language]}</Text></Pressable>)}</View><Field onChangeText={setProgramName} placeholder={c.programName} value={programName} /><Pressable disabled={busy} onPress={submitProgram} style={styles.primary}><Text style={styles.primaryText}>{c.add}</Text></Pressable>
      {data.programs.filter(program => program.status === 'active').map(program => <Pressable key={program.id} onPress={() => setSelectedProgramId(program.id)} style={[styles.programRow, selectedProgramId === program.id && styles.programRowActive]}><View style={{ flex: 1 }}><Text style={styles.recordTitle}>{program.label}</Text><Text style={styles.recordMeta}>{program.verificationStatus === 'vet_verified' ? c.verified : c.ownerEntry}</Text></View><Text style={styles.chevron}>›</Text></Pressable>)}
      {selectedProgramId ? <View style={styles.measureBox}><Text style={styles.formLabel}>{c.metric}</Text><Field onChangeText={setMeasurementType} placeholder={c.metric} value={measurementType} /><View style={styles.inlineFields}><View style={styles.flexField}><Field onChangeText={setMeasurementValue} placeholder={c.value} value={measurementValue} /></View><View style={styles.flexField}><Field onChangeText={setMeasurementUnit} placeholder={c.unit} value={measurementUnit} /></View></View><Pressable disabled={busy} onPress={submitMeasurement} style={styles.primary}><Text style={styles.primaryText}>{c.save}</Text></Pressable></View> : null}
    </View> : null}

    <CardButton icon="◉" title={c.visit} text={c.visitSub} status={`${data.visits.length} ${c.visitsCount}`} onPress={() => setPanel(panel === 'visit' ? null : 'visit')} />
    {panel === 'visit' ? <View style={styles.panel}><PanelHeader title={c.visit} close={() => setPanel(null)} /><Field onChangeText={setClinic} placeholder={c.clinic} value={clinic} /><Field onChangeText={setVeterinarian} placeholder={c.veterinarian} value={veterinarian} /><Pressable onPress={() => setRecordingConsent(value => !value)} style={styles.consentRow}><View style={[styles.checkbox, recordingConsent && styles.checkboxActive]}>{recordingConsent ? <Text style={styles.check}>✓</Text> : null}</View><Text style={styles.consentText}>{c.consent}</Text></Pressable><Pressable disabled={busy} onPress={toggleRecording} style={[styles.recordButton, recorderState.isRecording && styles.recording]}><Text style={styles.recordButtonText}>{recorderState.isRecording ? `■ ${c.stopRecording} · ${Math.floor((recorderState.durationMillis ?? 0) / 1000)}s` : `● ${c.startRecording}`}</Text></Pressable>{recordingUri ? <Text style={styles.success}>✓ {c.audioReady}</Text> : null}<Field multiline onChangeText={setTranscript} placeholder={c.transcript} value={transcript} /><Pressable disabled={busy || (!recordingUri && !transcript.trim())} onPress={() => processVisit()} style={styles.primary}>{busy ? <ActivityIndicator color={colors.white} /> : <Text style={styles.primaryText}>{c.processVisit}</Text>}</Pressable>{visitResult ? <><SummaryView c={c} summary={visitResult.summary} /><Pressable disabled={busy} onPress={approveVisit} style={styles.primary}><Text style={styles.primaryText}>{c.confirmSummary}</Text></Pressable></> : null}{data.visits.filter(visit => visit.status === 'processing' || visit.status === 'failed').map(visit => <View key={visit.id} style={styles.retryRow}><Text style={styles.recordMeta}>{new Date(visit.visitAt).toLocaleDateString(language)} · {visit.status === 'processing' ? c.processing : c.failed}</Text><Pressable onPress={() => processVisit(visit.id)}><Text style={styles.link}>{c.retry}</Text></Pressable></View>)}</View> : null}

    <CardButton icon="⚕" title={c.emergency} text={c.emergencySub} status={c.deviceReady} onPress={() => setPanel(panel === 'emergency' ? null : 'emergency')} />
    {panel === 'emergency' ? <View style={[styles.panel, styles.emergencyPanel]}><PanelHeader title={c.emergency} close={() => setPanel(null)} /><Text style={styles.emergencyWarning}>{c.emergencyNow}</Text><View style={styles.emergencyStep}><Text style={styles.stepNumber}>1</Text><Text style={styles.emergencyText}><Text style={styles.bold}>{c.poisonTitle}</Text> {c.poisonText}</Text></View><View style={styles.emergencyStep}><Text style={styles.stepNumber}>2</Text><Text style={styles.emergencyText}><Text style={styles.bold}>{c.bleedingTitle}</Text> {c.bleedingText}</Text></View><View style={styles.emergencyStep}><Text style={styles.stepNumber}>3</Text><Text style={styles.emergencyText}><Text style={styles.bold}>{c.seizureTitle}</Text> {c.seizureText}</Text></View><View style={styles.emergencyStep}><Text style={styles.stepNumber}>4</Text><Text style={styles.emergencyText}><Text style={styles.bold}>{c.cprTitle}</Text> {c.cprText}</Text></View><View style={styles.actionRow}><Pressable onPress={() => Linking.openURL('https://www.google.com/maps/search/?api=1&query=24+hour+emergency+veterinarian')} style={styles.smallPrimary}><Text style={styles.smallPrimaryText}>{c.nearestVet}</Text></Pressable>{emergencyVetPhone ? <Pressable onPress={() => Linking.openURL(`tel:${emergencyVetPhone.replace(/[^+\d]/g, '')}`)} style={styles.smallGhost}><Text style={styles.smallGhostText}>{c.callVet}</Text></Pressable> : null}</View><Field onChangeText={setEmergencyVetName} placeholder={c.emergencyVetName} value={emergencyVetName} /><Field keyboardType="phone-pad" onChangeText={setEmergencyVetPhone} placeholder={c.emergencyVetPhone} value={emergencyVetPhone} /><Field multiline onChangeText={setSafetyNotes} placeholder={c.safetyNotes} value={safetyNotes} /><Pressable disabled={busy} onPress={saveEmergency} style={styles.primary}><Text style={styles.primaryText}>{c.save}</Text></Pressable></View> : null}
  </View>;
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 20, marginTop: 22 }, loading: { alignItems: 'center', gap: 10, padding: 30 }, muted: { color: colors.muted },
  eyebrow: { color: colors.primary, fontSize: 11, fontWeight: '900', letterSpacing: 1.2 }, title: { color: colors.text, fontSize: 27, fontWeight: '900', lineHeight: 33, marginTop: 7 }, sub: { color: colors.muted, lineHeight: 20, marginBottom: 15, marginTop: 8 },
  baseline: { ...shadow, alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: 20, flexDirection: 'row', marginBottom: 13, padding: 17 }, urgentCard: { backgroundColor: '#FCE8E6' }, baselineLabel: { color: colors.primaryDark, fontSize: 12, fontWeight: '900' }, baselineStatus: { color: colors.text, fontSize: 20, fontWeight: '900', marginTop: 3 }, baselineMeta: { color: colors.muted, fontSize: 11, marginTop: 4 }, changeBubble: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: 28, height: 56, justifyContent: 'center', width: 56 }, changeValue: { color: colors.primaryDark, fontSize: 20, fontWeight: '900' }, changeUnit: { color: colors.muted, fontSize: 9 }, queue: { color: colors.accent, fontSize: 11, fontWeight: '800', marginBottom: 10 },
  success: { color: colors.primary, fontSize: 12, fontWeight: '800', marginBottom: 9 }, error: { color: colors.danger, fontSize: 12, marginBottom: 9 },
  featureCard: { ...shadow, alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 20, borderWidth: 1, flexDirection: 'row', gap: 13, marginBottom: 10, padding: 15 }, featureIcon: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: 16, height: 48, justifyContent: 'center', width: 48 }, featureIconText: { color: colors.primaryDark, fontSize: 20, fontWeight: '900' }, featureCopy: { flex: 1 }, featureTitle: { color: colors.text, fontSize: 15, fontWeight: '900' }, featureText: { color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: 3 }, featureStatus: { color: colors.primary, fontSize: 10, fontWeight: '900', marginTop: 6 }, chevron: { color: colors.muted, fontSize: 24 },
  panel: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 20, borderWidth: 1, marginBottom: 13, marginTop: -3, padding: 16 }, panelHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 13 }, panelTitle: { color: colors.text, flex: 1, fontSize: 18, fontWeight: '900' }, close: { color: colors.muted, fontSize: 28, lineHeight: 28 },
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, metricCard: { alignItems: 'center', backgroundColor: colors.background, borderRadius: 15, padding: 10, width: '31%' }, metricIcon: { fontSize: 18 }, metricName: { color: colors.text, fontSize: 10, fontWeight: '800', marginTop: 4 }, stepper: { alignItems: 'center', flexDirection: 'row', gap: 8, marginTop: 8 }, stepButton: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: 12, height: 25, justifyContent: 'center', width: 25 }, stepText: { color: colors.primaryDark, fontSize: 17, fontWeight: '900' }, metricValue: { color: colors.text, fontSize: 16, fontWeight: '900', minWidth: 12, textAlign: 'center' },
  formLabel: { color: colors.text, fontSize: 12, fontWeight: '900', marginBottom: 8, marginTop: 14 }, input: { backgroundColor: colors.background, borderColor: colors.border, borderRadius: 13, borderWidth: 1, color: colors.text, marginBottom: 9, minHeight: 48, paddingHorizontal: 13 }, multiline: { minHeight: 92, paddingTop: 12, textAlignVertical: 'top' }, inlineFields: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, flexField: { flex: 1, minWidth: 118 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 10 }, chip: { backgroundColor: colors.background, borderColor: colors.border, borderRadius: 999, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 8 }, chipActive: { backgroundColor: colors.primary, borderColor: colors.primary }, chipText: { color: colors.text, fontSize: 10, fontWeight: '800' }, chipTextActive: { color: colors.white }, dangerChip: { backgroundColor: '#FCE8E6', borderColor: '#D77C73' }, dangerChipText: { color: colors.danger },
  primary: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: 14, justifyContent: 'center', marginTop: 3, minHeight: 49, paddingHorizontal: 15 }, primaryText: { color: colors.white, fontWeight: '900' },
  recordCard: { backgroundColor: colors.background, borderRadius: 15, marginBottom: 10, padding: 13 }, recordHeader: { alignItems: 'flex-start', flexDirection: 'row', gap: 8 }, recordTitle: { color: colors.text, fontSize: 14, fontWeight: '900' }, recordMeta: { color: colors.muted, fontSize: 11, marginTop: 3 }, verifyBadge: { backgroundColor: '#FFF3DF', borderRadius: 8, color: '#8B581D', fontSize: 8, fontWeight: '900', paddingHorizontal: 7, paddingVertical: 4 }, verifiedBadge: { backgroundColor: colors.primarySoft, color: colors.primaryDark }, stock: { color: colors.muted, fontSize: 11, marginTop: 8 }, stockLow: { color: colors.danger, fontWeight: '900' }, adherence: { color: colors.primaryDark, fontSize: 11, fontWeight: '800', marginTop: 5 }, actionRow: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 11 }, smallPrimary: { backgroundColor: colors.primary, borderRadius: 11, paddingHorizontal: 11, paddingVertical: 9 }, smallPrimaryText: { color: colors.white, fontSize: 11, fontWeight: '900' }, smallGhost: { backgroundColor: colors.primarySoft, borderRadius: 11, paddingHorizontal: 11, paddingVertical: 9 }, smallGhostText: { color: colors.primaryDark, fontSize: 11, fontWeight: '900' },
  programRow: { alignItems: 'center', backgroundColor: colors.background, borderColor: colors.border, borderRadius: 14, borderWidth: 1, flexDirection: 'row', marginTop: 8, padding: 12 }, programRowActive: { borderColor: colors.primary }, measureBox: { borderTopColor: colors.border, borderTopWidth: 1, marginTop: 13, paddingTop: 3 },
  consentRow: { alignItems: 'flex-start', flexDirection: 'row', gap: 10, marginBottom: 10 }, checkbox: { alignItems: 'center', borderColor: colors.border, borderRadius: 6, borderWidth: 2, height: 22, justifyContent: 'center', marginTop: 1, width: 22 }, checkboxActive: { backgroundColor: colors.primary, borderColor: colors.primary }, check: { color: colors.white, fontSize: 13, fontWeight: '900' }, consentText: { color: colors.muted, flex: 1, fontSize: 11, lineHeight: 17 }, recordButton: { alignItems: 'center', backgroundColor: '#273A35', borderRadius: 14, marginBottom: 10, minHeight: 48, justifyContent: 'center' }, recording: { backgroundColor: colors.danger }, recordButtonText: { color: colors.white, fontWeight: '900' },
  summary: { backgroundColor: colors.primarySoft, borderRadius: 15, marginTop: 12, padding: 13 }, summaryTitle: { color: colors.primaryDark, fontSize: 15, fontWeight: '900' }, summaryGroup: { marginTop: 10 }, summaryLabel: { color: colors.text, fontSize: 11, fontWeight: '900' }, summaryItem: { color: colors.text, fontSize: 11, lineHeight: 17, marginTop: 2 }, retryRow: { alignItems: 'center', borderTopColor: colors.border, borderTopWidth: 1, flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, paddingTop: 11 }, link: { color: colors.primary, fontSize: 11, fontWeight: '900' },
  emergencyPanel: { borderColor: '#D77C73' }, emergencyWarning: { backgroundColor: '#FCE8E6', borderRadius: 13, color: colors.danger, fontSize: 12, fontWeight: '800', lineHeight: 18, padding: 12 }, emergencyStep: { alignItems: 'flex-start', flexDirection: 'row', gap: 10, marginTop: 12 }, stepNumber: { backgroundColor: colors.danger, borderRadius: 12, color: colors.white, fontSize: 11, fontWeight: '900', overflow: 'hidden', paddingHorizontal: 8, paddingVertical: 4 }, emergencyText: { color: colors.text, flex: 1, fontSize: 12, lineHeight: 18 }, bold: { fontWeight: '900' },
});
