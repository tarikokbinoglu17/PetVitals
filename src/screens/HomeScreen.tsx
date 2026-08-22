import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { formatDashboardDate, formatRecordDate, getUpcomingRecords } from '../lib/dashboard';
import {
  acceptCareInvite,
  completeCareTask,
  completeSmartReminder,
  createCareTask,
  createScopedPassport,
  createSmartReminder,
  generateVetVisitSummary,
  loadPendingCareInvites,
  loadToday,
  snoozeSmartReminder,
} from '../lib/prelaunch';
import type { HealthRecord, Pet } from '../types';
import { colors, shadow } from '../theme';

export function HomeScreen({ pets, records, userId, demoMode }: { pets: Pet[]; records: HealthRecord[]; userId?: string; demoMode: boolean }) {
  const now = new Date();
  const upcoming = getUpcomingRecords(records, now);
  const [selectedPetId, setSelectedPetId] = useState(pets[0]?.id ?? '');
  const [today, setToday] = useState<{tasks:any[];reminders:any[];alerts:any[]}>({tasks:[],reminders:[],alerts:[]});
  const [invites,setInvites]=useState<any[]>([]);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [quickTitle,setQuickTitle]=useState('');
  const [quickMode,setQuickMode]=useState<'reminder'|'task'>('reminder');
  const [passportUrl,setPassportUrl]=useState('');
  const [passportHours,setPassportHours]=useState(24);
  const [includeContact,setIncludeContact]=useState(false);
  const [lostMode,setLostMode]=useState(false);
  const selectedPet=pets.find(p=>p.id===selectedPetId)??pets[0];
  const next=upcoming[0];
  const nextPet=next?pets.find(p=>p.id===next.petId):undefined;
  const dueCount=today.tasks.filter(x=>x.status==='open').length+today.reminders.length;

  async function refresh(){if(!userId||demoMode)return;try{const [snapshot,pending]=await Promise.all([loadToday(userId),loadPendingCareInvites()]);setToday(snapshot);setInvites(pending);setError('');}catch(e){setError(e instanceof Error?e.message:'Today verileri yüklenemedi.');}}
  useEffect(()=>{void refresh();},[userId,demoMode]);
  useEffect(()=>{if(!pets.some(p=>p.id===selectedPetId))setSelectedPetId(pets[0]?.id??'');},[pets,selectedPetId]);

  async function addQuick(){if(!userId||!selectedPet||!quickTitle.trim())return;setBusy(true);try{const at=new Date(Date.now()+60*60*1000).toISOString();if(quickMode==='reminder')await createSmartReminder(userId,selectedPet.id,{title:quickTitle,reminderType:'custom',remindAt:at});else await createCareTask(userId,selectedPet.id,{title:quickTitle,taskType:'custom',dueAt:at});setQuickTitle('');await refresh();}catch(e){Alert.alert('Eklenemedi',e instanceof Error?e.message:'İşlem başarısız.');}finally{setBusy(false);}}
  async function makePassport(){if(!selectedPet)return;setBusy(true);try{const result=await createScopedPassport(selectedPet.id,{lostMode,includeOwnerContact:includeContact,expiresInHours:passportHours});setPassportUrl(result.url);}catch(e){Alert.alert('Pasaport oluşturulamadı',e instanceof Error?e.message:'İşlem başarısız.');}finally{setBusy(false);}}
  async function vetSummary(){if(!selectedPet)return;setBusy(true);try{const result=await generateVetVisitSummary(selectedPet.id,90);await Share.share({message:`PetVitals · ${selectedPet.name}\n\n${result.summary}\n\n${result.disclaimer}`});}catch(e){Alert.alert('Özet oluşturulamadı',e instanceof Error?e.message:'İşlem başarısız.');}finally{setBusy(false);}}

  return <View style={styles.page}>
    <Text style={styles.eyebrow}>{formatDashboardDate(now)}</Text>
    <Text style={styles.title}>Today</Text>
    <Text style={styles.sub}>Bugün önemli olan her şey tek yerde.</Text>

    {pets.length>1?<View style={styles.chips}>{pets.map(p=><Pressable key={p.id} onPress={()=>setSelectedPetId(p.id)} style={[styles.chip,selectedPet?.id===p.id&&styles.chipActive]}><Text style={[styles.chipText,selectedPet?.id===p.id&&styles.chipTextActive]}>{p.name}</Text></Pressable>)}</View>:null}

    <View style={styles.hero}><View style={{flex:1}}><Text style={styles.heroLabel}>Bugünün planı</Text><Text style={styles.heroTitle}>{dueCount?`${dueCount} yapılacak iş`:'Plan temiz görünüyor'}</Text><Text style={styles.heroMeta}>{next?`${nextPet?.name??'Dostunuz'} • ${next.title} • ${formatRecordDate(next.date)}`:'Yaklaşan sağlık kaydı yok.'}</Text></View><Text style={styles.heroIcon}>✓</Text></View>

    {error?<Text style={styles.error}>{error}</Text>:null}
    {today.alerts.length?<><Text style={styles.section}>Akıllı sağlık uyarıları</Text>{today.alerts.map((a:any)=><View key={a.id} style={styles.alert}><Text style={styles.alertLevel}>{String(a.severity).toUpperCase()}</Text><Text style={styles.cardTitle}>{a.title}</Text><Text style={styles.cardText}>{a.message}</Text></View>)}</>:null}

    <Text style={styles.section}>Bugünün görevleri</Text>
    {today.tasks.length===0&&today.reminders.length===0?<Text style={styles.empty}>Bugün için kayıtlı görev yok.</Text>:null}
    {today.tasks.map((t:any)=><View key={t.id} style={styles.item}><View style={{flex:1}}><Text style={styles.cardTitle}>{t.title}</Text><Text style={styles.cardText}>Care Network görevi</Text></View><Pressable onPress={async()=>{await completeCareTask(t.id);await refresh();}} style={styles.done}><Text style={styles.doneText}>Tamamla</Text></Pressable></View>)}
    {today.reminders.map((r:any)=><View key={r.id} style={styles.item}><View style={{flex:1}}><Text style={styles.cardTitle}>{r.title}</Text><Text style={styles.cardText}>{new Date(r.remindAt).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</Text></View><Pressable onPress={async()=>{await snoozeSmartReminder(r.id,60);await refresh();}} style={styles.ghost}><Text style={styles.ghostText}>+1 sa</Text></Pressable><Pressable onPress={async()=>{await completeSmartReminder(r.id);await refresh();}} style={styles.done}><Text style={styles.doneText}>Bitti</Text></Pressable></View>)}

    {!demoMode&&userId&&selectedPet?<View style={styles.box}><Text style={styles.boxTitle}>Hızlı ekle</Text><View style={styles.chips}><Pressable onPress={()=>setQuickMode('reminder')} style={[styles.chip,quickMode==='reminder'&&styles.chipActive]}><Text style={[styles.chipText,quickMode==='reminder'&&styles.chipTextActive]}>Hatırlatma</Text></Pressable><Pressable onPress={()=>setQuickMode('task')} style={[styles.chip,quickMode==='task'&&styles.chipActive]}><Text style={[styles.chipText,quickMode==='task'&&styles.chipTextActive]}>Ortak görev</Text></Pressable></View><TextInput value={quickTitle} onChangeText={setQuickTitle} placeholder={`${selectedPet.name} için...`} placeholderTextColor={colors.muted} style={styles.input}/><Pressable disabled={busy||!quickTitle.trim()} onPress={addQuick} style={styles.primary}><Text style={styles.primaryText}>1 saat sonrasına ekle</Text></Pressable></View>:null}

    {invites.length?<><Text style={styles.section}>Care Network davetleri</Text>{invites.map((i:any)=><View key={i.id} style={styles.item}><View style={{flex:1}}><Text style={styles.cardTitle}>Pet paylaşım daveti</Text><Text style={styles.cardText}>{i.role}</Text></View><Pressable onPress={async()=>{await acceptCareInvite(i.id);await refresh();}} style={styles.done}><Text style={styles.doneText}>Kabul et</Text></Pressable></View>)}</>:null}

    {selectedPet&&!demoMode?<View style={styles.box}><Text style={styles.boxTitle}>Universal Health Passport</Text><Text style={styles.cardText}>Süreli, iptal edilebilir ve seçili bilgilerle güvenli paylaşım.</Text><View style={styles.chips}>{[1,24,168].map(h=><Pressable key={h} onPress={()=>setPassportHours(h)} style={[styles.chip,passportHours===h&&styles.chipActive]}><Text style={[styles.chipText,passportHours===h&&styles.chipTextActive]}>{h===168?'7 gün':`${h} saat`}</Text></Pressable>)}</View><View style={styles.chips}><Pressable onPress={()=>setIncludeContact(v=>!v)} style={[styles.chip,includeContact&&styles.chipActive]}><Text style={[styles.chipText,includeContact&&styles.chipTextActive]}>İletişim</Text></Pressable><Pressable onPress={()=>setLostMode(v=>!v)} style={[styles.chip,lostMode&&styles.dangerChip]}><Text style={[styles.chipText,lostMode&&styles.chipTextActive]}>Lost Mode</Text></Pressable></View><Pressable disabled={busy} onPress={makePassport} style={styles.primary}><Text style={styles.primaryText}>QR Passport oluştur</Text></Pressable>{passportUrl?<View style={styles.qr}><QRCode value={passportUrl} size={190}/><Text style={styles.qrHint}>Veteriner veya bakıcı kamerayla tarayabilir.</Text><Pressable onPress={()=>Share.share({message:passportUrl})} style={styles.ghostWide}><Text style={styles.ghostText}>Bağlantıyı paylaş</Text></Pressable></View>:null}</View>:null}

    {selectedPet&&!demoMode?<View style={styles.box}><Text style={styles.boxTitle}>Veterinere hazırlan</Text><Text style={styles.cardText}>Son 90 günlük kayıtları, kilo trendini, aşıları, Life verilerini ve uyarıları tek özet haline getirir.</Text><Pressable disabled={busy} onPress={vetSummary} style={styles.primary}>{busy?<ActivityIndicator color={colors.white}/>:<Text style={styles.primaryText}>Veteriner özetini oluştur & paylaş</Text>}</Pressable></View>:null}
  </View>;
}

const styles=StyleSheet.create({page:{padding:22},eyebrow:{color:colors.primary,fontSize:12,fontWeight:'800',letterSpacing:1.1},title:{color:colors.text,fontSize:32,fontWeight:'900',marginTop:5},sub:{color:colors.muted,fontSize:15,marginTop:5},hero:{...shadow,alignItems:'center',backgroundColor:colors.primary,borderRadius:22,flexDirection:'row',marginTop:22,padding:22},heroLabel:{color:'#BFE4D7',fontSize:12,fontWeight:'700'},heroTitle:{color:colors.white,fontSize:19,fontWeight:'900',marginTop:6},heroMeta:{color:'#DDEFE8',lineHeight:19,marginTop:8},heroIcon:{fontSize:35,color:colors.white},section:{color:colors.text,fontSize:19,fontWeight:'900',marginBottom:10,marginTop:26},chips:{flexDirection:'row',flexWrap:'wrap',gap:8,marginTop:12},chip:{backgroundColor:colors.surface,borderColor:colors.border,borderRadius:999,borderWidth:1,paddingHorizontal:11,paddingVertical:7},chipActive:{backgroundColor:colors.primary,borderColor:colors.primary},dangerChip:{backgroundColor:colors.danger,borderColor:colors.danger},chipText:{color:colors.text,fontSize:12,fontWeight:'800'},chipTextActive:{color:colors.white},alert:{backgroundColor:'#FFF4E8',borderRadius:16,marginBottom:9,padding:14},alertLevel:{color:colors.danger,fontSize:10,fontWeight:'900'},item:{alignItems:'center',backgroundColor:colors.surface,borderColor:colors.border,borderRadius:16,borderWidth:1,flexDirection:'row',gap:8,marginBottom:9,padding:13},cardTitle:{color:colors.text,fontSize:14,fontWeight:'900'},cardText:{color:colors.muted,fontSize:12,lineHeight:18,marginTop:3},done:{backgroundColor:colors.primary,borderRadius:10,paddingHorizontal:10,paddingVertical:8},doneText:{color:colors.white,fontSize:11,fontWeight:'900'},ghost:{borderColor:colors.border,borderRadius:10,borderWidth:1,paddingHorizontal:9,paddingVertical:8},ghostWide:{alignItems:'center',borderColor:colors.border,borderRadius:12,borderWidth:1,marginTop:10,padding:10},ghostText:{color:colors.primaryDark,fontSize:11,fontWeight:'900'},box:{backgroundColor:colors.surface,borderColor:colors.border,borderRadius:19,borderWidth:1,marginTop:18,padding:16},boxTitle:{color:colors.text,fontSize:17,fontWeight:'900'},input:{backgroundColor:colors.background,borderColor:colors.border,borderRadius:12,borderWidth:1,color:colors.text,marginTop:12,padding:12},primary:{alignItems:'center',backgroundColor:colors.primary,borderRadius:12,marginTop:12,minHeight:44,justifyContent:'center',padding:11},primaryText:{color:colors.white,fontWeight:'900'},qr:{alignItems:'center',marginTop:18},qrHint:{color:colors.muted,fontSize:11,marginTop:10},empty:{color:colors.muted},error:{color:colors.danger,marginTop:12}});
