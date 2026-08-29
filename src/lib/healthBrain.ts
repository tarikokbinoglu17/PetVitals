import { supabase } from './supabase';

export type IntelligenceLanguage = 'tr' | 'en' | 'de' | 'es' | 'ja';

export type SmartHealthAlert = {
  id: string;
  alert_type: string;
  severity: 'low' | 'medium' | 'high' | string;
  title: string;
  message: string;
  status: string;
  detected_at: string;
};

export type HealthBrainAnswer = {
  answer: string;
  disclaimer?: string;
};

type IntelligenceReason = { text: string; penalty: number; severity: 'low' | 'medium' | 'high' };
type LifeRow = { entry_type: string; value_numeric: number | null; value_text: string | null; occurred_at: string };

const DAY = 86_400_000;

const I = {
  tr: {
    overdueReason: (n:number)=>`${n} gecikmiş aşı`, overdueTitle:'Aşı takibi gerekli', overdueMessage:(n:number)=>`${n} aşı kaydının planlanan tarihi geçmiş görünüyor.`,
    noVet:'Son 12 ayda veteriner ziyareti kaydı yok', frequentVetReason:(n:number)=>`90 günde ${n} veteriner ziyareti`, frequentVetTitle:'Sık veteriner ziyareti', frequentVetMessage:(n:number)=>`Son 90 günde ${n} veteriner ziyareti kaydedildi. Bu örüntüyü veterinerinizle değerlendirmeniz faydalı olabilir.`,
    symptomReason:(n:number)=>`90 günde ${n} semptom kaydı`, symptomTitle:'Tekrarlayan semptom örüntüsü', symptomMessage:(n:number)=>`Son 90 günde ${n} semptom kaydı girildi. PetSolea tekrar eden bir örüntü tespit etti.`,
    weightReason:(p:string)=>`Kilo %${p} değişti`, weightTitle:'Kilo eğilimi değişti', weightMessage:(p:string,up:boolean)=>`Kaydedilen kilo ilk ölçüme göre %${p} ${up?'daha yüksek':'daha düşük'}.`, weightNeed:'Düzenli kilo ölçümleri eğilim tespitini iyileştirir',
    foodReason:(p:string)=>`Mama tüketimi eğilimi %${p} azaldı`, foodTitle:'Mama tüketimi azalıyor', foodMessage:(p:string)=>`Son 7 gündeki ortalama mama tüketimi önceki 7 güne göre yaklaşık %${p} daha düşük.`,
    waterReason:(p:string)=>`Su tüketimi %${p} değişti`, waterTitle:'Su tüketimi örüntüsü değişti', waterMessage:(p:string,up:boolean)=>`Son 7 gündeki ortalama su tüketimi önceki 7 güne göre yaklaşık %${p} ${up?'daha yüksek':'daha düşük'}.`,
    activityReason:(p:string)=>`Aktivite eğilimi %${p} azaldı`, activityTitle:'Aktivite azalıyor', activityMessage:(p:string)=>`Son 7 gündeki ortalama aktivite önceki 7 güne göre yaklaşık %${p} daha düşük.`,
    excellent:'Mükemmel', good:'İyi', attention:'Dikkat gerekli', why:'Neden:', clean:'Mevcut kayıtlarda anlamlı olumsuz bir eğilim görünmüyor.', disclaimer:'Bu skor bir tanı değildir; sağlık takibi için erken sinyal sağlar.'
  },
  en: {
    overdueReason:(n:number)=>`${n} overdue vaccine${n>1?'s':''}`, overdueTitle:'Vaccine follow-up needed', overdueMessage:(n:number)=>`${n} vaccine schedule${n>1?'s are':' is'} past the recorded due date.`,
    noVet:'No vet visit recorded in the last 12 months', frequentVetReason:(n:number)=>`${n} vet visits recorded in 90 days`, frequentVetTitle:'Frequent vet visits', frequentVetMessage:(n:number)=>`${n} veterinary visits were recorded during the last 90 days. Consider reviewing the pattern with your veterinarian.`,
    symptomReason:(n:number)=>`${n} symptom logs in 90 days`, symptomTitle:'Recurring symptom pattern', symptomMessage:(n:number)=>`${n} symptom entries were logged in the last 90 days. PetSolea detected a repeating pattern worth discussing with a veterinarian.`,
    weightReason:(p:string)=>`Weight changed ${p}%`, weightTitle:'Weight trend changed', weightMessage:(p:string,up:boolean)=>`Recorded weight is ${p}% ${up?'higher':'lower'} than the first available measurement.`, weightNeed:'More weight measurements will improve trend detection',
    foodReason:(p:string)=>`Food intake trend down ${p}%`, foodTitle:'Food intake is trending down', foodMessage:(p:string)=>`Average recorded food intake is about ${p}% lower than the previous 7-day period.`,
    waterReason:(p:string)=>`Water intake changed ${p}%`, waterTitle:'Water intake pattern changed', waterMessage:(p:string,up:boolean)=>`Average recorded water intake is about ${p}% ${up?'higher':'lower'} than the previous 7-day period.`,
    activityReason:(p:string)=>`Activity trend down ${p}%`, activityTitle:'Activity is trending down', activityMessage:(p:string)=>`Average recorded activity is about ${p}% lower than the previous 7-day period.`,
    excellent:'Excellent', good:'Good', attention:'Needs attention', why:'Why:', clean:'No meaningful negative trend is visible in the available records.', disclaimer:'This score is a wellness tracking signal, not a diagnosis.'
  },
  de: {
    overdueReason:(n:number)=>`${n} überfällige Impfung${n>1?'en':''}`, overdueTitle:'Impfkontrolle erforderlich', overdueMessage:(n:number)=>`${n} Impfplan${n>1?'e sind':' ist'} laut Eintrag überfällig.`,
    noVet:'Kein Tierarztbesuch in den letzten 12 Monaten erfasst', frequentVetReason:(n:number)=>`${n} Tierarztbesuche in 90 Tagen`, frequentVetTitle:'Häufige Tierarztbesuche', frequentVetMessage:(n:number)=>`In den letzten 90 Tagen wurden ${n} Tierarztbesuche erfasst. Besprechen Sie das Muster bei Bedarf mit Ihrer Tierarztpraxis.`,
    symptomReason:(n:number)=>`${n} Symptom-Einträge in 90 Tagen`, symptomTitle:'Wiederkehrendes Symptommuster', symptomMessage:(n:number)=>`In den letzten 90 Tagen wurden ${n} Symptom-Einträge erfasst. PetSolea hat ein wiederkehrendes Muster erkannt.`,
    weightReason:(p:string)=>`Gewicht um ${p}% verändert`, weightTitle:'Gewichtstrend verändert', weightMessage:(p:string,up:boolean)=>`Das erfasste Gewicht liegt ${p}% ${up?'über':'unter'} der ersten verfügbaren Messung.`, weightNeed:'Weitere Gewichtsmessungen verbessern die Trenderkennung',
    foodReason:(p:string)=>`Futteraufnahme um ${p}% gesunken`, foodTitle:'Futteraufnahme sinkt', foodMessage:(p:string)=>`Die durchschnittliche Futteraufnahme der letzten 7 Tage liegt etwa ${p}% unter den vorherigen 7 Tagen.`,
    waterReason:(p:string)=>`Wasseraufnahme um ${p}% verändert`, waterTitle:'Muster der Wasseraufnahme verändert', waterMessage:(p:string,up:boolean)=>`Die durchschnittliche Wasseraufnahme liegt etwa ${p}% ${up?'über':'unter'} den vorherigen 7 Tagen.`,
    activityReason:(p:string)=>`Aktivität um ${p}% gesunken`, activityTitle:'Aktivität sinkt', activityMessage:(p:string)=>`Die durchschnittliche Aktivität der letzten 7 Tage liegt etwa ${p}% unter den vorherigen 7 Tagen.`,
    excellent:'Ausgezeichnet', good:'Gut', attention:'Aufmerksamkeit nötig', why:'Warum:', clean:'In den verfügbaren Daten ist derzeit kein bedeutender negativer Trend sichtbar.', disclaimer:'Dieser Score ist keine Diagnose, sondern ein Frühsignal für die Gesundheitsbeobachtung.'
  },
  es: {
    overdueReason:(n:number)=>`${n} vacuna${n>1?'s':''} atrasada${n>1?'s':''}`, overdueTitle:'Se necesita seguimiento de vacunas', overdueMessage:(n:number)=>`${n} vacuna${n>1?'s tienen':' tiene'} la fecha registrada vencida.`,
    noVet:'No hay una visita veterinaria registrada en los últimos 12 meses', frequentVetReason:(n:number)=>`${n} visitas veterinarias en 90 días`, frequentVetTitle:'Visitas veterinarias frecuentes', frequentVetMessage:(n:number)=>`Se registraron ${n} visitas veterinarias en los últimos 90 días. Puede ser útil revisar este patrón con su veterinario.`,
    symptomReason:(n:number)=>`${n} registros de síntomas en 90 días`, symptomTitle:'Patrón de síntomas recurrentes', symptomMessage:(n:number)=>`Se registraron ${n} síntomas en los últimos 90 días. PetSolea detectó un patrón repetitivo.`,
    weightReason:(p:string)=>`El peso cambió un ${p}%`, weightTitle:'Cambió la tendencia del peso', weightMessage:(p:string,up:boolean)=>`El peso registrado es un ${p}% ${up?'mayor':'menor'} que la primera medición disponible.`, weightNeed:'Más mediciones de peso mejorarán la detección de tendencias',
    foodReason:(p:string)=>`La ingesta de comida bajó un ${p}%`, foodTitle:'La ingesta de comida está bajando', foodMessage:(p:string)=>`La ingesta media de los últimos 7 días es aproximadamente un ${p}% menor que en los 7 días anteriores.`,
    waterReason:(p:string)=>`La ingesta de agua cambió un ${p}%`, waterTitle:'Cambió el patrón de consumo de agua', waterMessage:(p:string,up:boolean)=>`La ingesta media de agua es aproximadamente un ${p}% ${up?'mayor':'menor'} que en los 7 días anteriores.`,
    activityReason:(p:string)=>`La actividad bajó un ${p}%`, activityTitle:'La actividad está bajando', activityMessage:(p:string)=>`La actividad media de los últimos 7 días es aproximadamente un ${p}% menor que en los 7 días anteriores.`,
    excellent:'Excelente', good:'Bien', attention:'Necesita atención', why:'¿Por qué?', clean:'No se observa ninguna tendencia negativa importante en los registros disponibles.', disclaimer:'Esta puntuación no es un diagnóstico; es una señal temprana de seguimiento del bienestar.'
  },
  ja: {
    overdueReason:(n:number)=>`期限切れのワクチン ${n}件`, overdueTitle:'ワクチンの確認が必要です', overdueMessage:(n:number)=>`${n}件のワクチン予定日が過ぎています。`,
    noVet:'過去12か月の受診記録がありません', frequentVetReason:(n:number)=>`90日間の受診 ${n}回`, frequentVetTitle:'受診回数が増えています', frequentVetMessage:(n:number)=>`過去90日間に${n}回の受診が記録されています。この傾向を獣医師と確認してください。`,
    symptomReason:(n:number)=>`90日間の症状記録 ${n}件`, symptomTitle:'症状が繰り返されています', symptomMessage:(n:number)=>`過去90日間に症状が${n}回記録されています。PetSoleaが繰り返しの傾向を検出しました。`,
    weightReason:(p:string)=>`体重が${p}%変化`, weightTitle:'体重の傾向が変化しました', weightMessage:(p:string,up:boolean)=>`記録された体重は最初の測定より${p}%${up?'増加':'減少'}しています。`, weightNeed:'定期的な体重測定で傾向検出の精度が上がります',
    foodReason:(p:string)=>`食事量が${p}%減少傾向`, foodTitle:'食事量が減少しています', foodMessage:(p:string)=>`直近7日間の平均食事量は、その前の7日間より約${p}%少なくなっています。`,
    waterReason:(p:string)=>`飲水量が${p}%変化`, waterTitle:'飲水量の傾向が変化しました', waterMessage:(p:string,up:boolean)=>`直近7日間の平均飲水量は、その前の7日間より約${p}%${up?'多く':'少なく'}なっています。`,
    activityReason:(p:string)=>`活動量が${p}%減少傾向`, activityTitle:'活動量が減少しています', activityMessage:(p:string)=>`直近7日間の平均活動量は、その前の7日間より約${p}%少なくなっています。`,
    excellent:'とても良好', good:'良好', attention:'注意が必要', why:'理由：', clean:'現在の記録に重要な悪化傾向は見られません。', disclaimer:'このスコアは診断ではなく、健康変化の早期サインです。'
  }
} as const;

function requireSupabase() { if (!supabase) throw new Error('Supabase is not configured.'); return supabase as any; }
function clamp(value:number){ return Math.max(0,Math.min(100,Math.round(value))); }
function severityForScore(score:number):'low'|'medium'|'high'{ return score>=85?'low':score>=70?'medium':'high'; }
function average(rows:LifeRow[]){ const values=rows.map(r=>Number(r.value_numeric)).filter(Number.isFinite); return values.length?values.reduce((s,v)=>s+v,0)/values.length:null; }
function percentageChange(previous:number|null,recent:number|null){ if(previous==null||recent==null||previous===0)return null; return((recent-previous)/Math.abs(previous))*100; }
function splitLifeWindow(rows:LifeRow[],type:string,now:number){ const typed=rows.filter(r=>r.entry_type===type&&Number.isFinite(Number(r.value_numeric))); const recent=typed.filter(r=>{const t=new Date(r.occurred_at).getTime();return t>=now-7*DAY&&t<=now}); const previous=typed.filter(r=>{const t=new Date(r.occurred_at).getTime();return t>=now-14*DAY&&t<now-7*DAY}); return{recent:average(recent),previous:average(previous),recentCount:recent.length,previousCount:previous.length}; }
function makeAlert(id:string,severity:'low'|'medium'|'high',title:string,message:string,nowIso:string,type='petsolea_intelligence'):SmartHealthAlert{return{id,alert_type:type,severity,title,message,status:'active',detected_at:nowIso}}

export async function evaluateSmartHealthAlerts(petId:string, language:IntelligenceLanguage='en'):Promise<SmartHealthAlert[]>{
  const c=I[language]??I.en; const client=requireSupabase(); const now=Date.now(); const nowIso=new Date(now).toISOString();
  const [vaccinesResult,recordsResult,weightsResult,lifeResult]=await Promise.all([
    client.from('vaccines').select('id,vaccine_name,next_due_date').eq('pet_id',petId),
    client.from('health_records').select('id,record_type,title,record_date').eq('pet_id',petId).order('record_date',{ascending:false}).limit(50),
    client.from('weight_entries').select('id,weight,measured_at').eq('pet_id',petId).order('measured_at',{ascending:true}),
    client.from('pet_life_entries').select('id,entry_type,value_numeric,value_text,occurred_at').eq('pet_id',petId).order('occurred_at',{ascending:false}).limit(120),
  ]);
  const firstError=vaccinesResult.error??recordsResult.error??weightsResult.error??lifeResult.error; if(firstError)throw firstError;
  const vaccines=vaccinesResult.data??[],records=recordsResult.data??[],weights=weightsResult.data??[],lifeRows:LifeRow[]=lifeResult.data??[]; const reasons:IntelligenceReason[]=[]; const alerts:SmartHealthAlert[]=[];
  const overdue=vaccines.filter((r:any)=>r.next_due_date&&new Date(`${r.next_due_date}T23:59:59`).getTime()<now); if(overdue.length){const penalty=Math.min(30,overdue.length*15);reasons.push({text:c.overdueReason(overdue.length),penalty,severity:overdue.length>=2?'high':'medium'});alerts.push(makeAlert('intel-overdue-vaccine',overdue.length>=2?'high':'medium',c.overdueTitle,c.overdueMessage(overdue.length),nowIso));}
  const recentVetVisit=records.some((r:any)=>r.record_type==='vet_visit'&&now-new Date(`${r.record_date}T12:00:00`).getTime()<=365*DAY); if(!recentVetVisit)reasons.push({text:c.noVet,penalty:8,severity:'low'});
  const recentVetVisits=records.filter((r:any)=>r.record_type==='vet_visit'&&now-new Date(`${r.record_date}T12:00:00`).getTime()<=90*DAY).length; if(recentVetVisits>=3){reasons.push({text:c.frequentVetReason(recentVetVisits),penalty:5,severity:'low'});alerts.push(makeAlert('intel-frequent-vet-visits','low',c.frequentVetTitle,c.frequentVetMessage(recentVetVisits),nowIso));}
  const recentSymptoms=lifeRows.filter(r=>String(r.value_text??'').trim().toLowerCase()==='quick:symptom'&&now-new Date(r.occurred_at).getTime()<=90*DAY).length; if(recentSymptoms>=3){reasons.push({text:c.symptomReason(recentSymptoms),penalty:15,severity:'medium'});alerts.push(makeAlert('intel-recurring-symptoms',recentSymptoms>=5?'high':'medium',c.symptomTitle,c.symptomMessage(recentSymptoms),nowIso));}
  if(weights.length>=2){const first=Number(weights[0].weight),last=Number(weights[weights.length-1].weight);if(first>0&&Number.isFinite(last)){const change=((last-first)/first)*100,p=Math.abs(change).toFixed(1);if(Math.abs(change)>=10){reasons.push({text:c.weightReason(p),penalty:15,severity:'medium'});alerts.push(makeAlert('intel-weight-change','medium',c.weightTitle,c.weightMessage(p,change>=0),nowIso));}else if(Math.abs(change)>=5)reasons.push({text:c.weightReason(p),penalty:6,severity:'low'});}}else reasons.push({text:c.weightNeed,penalty:3,severity:'low'});
  const food=splitLifeWindow(lifeRows,'food',now),water=splitLifeWindow(lifeRows,'water',now),activity=splitLifeWindow(lifeRows,'activity',now);
  const foodChange=food.recentCount>=2&&food.previousCount>=2?percentageChange(food.previous,food.recent):null; if(foodChange!=null&&foodChange<=-25){const p=Math.abs(foodChange).toFixed(0);reasons.push({text:c.foodReason(p),penalty:12,severity:'medium'});alerts.push(makeAlert('intel-food-down','medium',c.foodTitle,c.foodMessage(p),nowIso));}
  const waterChange=water.recentCount>=2&&water.previousCount>=2?percentageChange(water.previous,water.recent):null; if(waterChange!=null&&Math.abs(waterChange)>=35){const p=Math.abs(waterChange).toFixed(0);reasons.push({text:c.waterReason(p),penalty:10,severity:'medium'});alerts.push(makeAlert('intel-water-change','medium',c.waterTitle,c.waterMessage(p,waterChange>=0),nowIso));}
  const activityChange=activity.recentCount>=2&&activity.previousCount>=2?percentageChange(activity.previous,activity.recent):null; if(activityChange!=null&&activityChange<=-30){const p=Math.abs(activityChange).toFixed(0);reasons.push({text:c.activityReason(p),penalty:10,severity:'medium'});alerts.push(makeAlert('intel-activity-down','medium',c.activityTitle,c.activityMessage(p),nowIso));}
  const score=clamp(100-reasons.reduce((s,r)=>s+r.penalty,0)); const label=score>=85?c.excellent:score>=70?c.good:c.attention; const explanation=reasons.length?`${c.why} ${reasons.slice(0,4).map(r=>r.text).join(' • ')}`:c.clean;
  const scoreCard=makeAlert('petsolea-intelligence-score',severityForScore(score),`PetSolea Intelligence · ${score}/100 · ${label}`,`${explanation} ${c.disclaimer}`,nowIso,'health_score');
  if(language==='en'){try{const{data,error}=await client.functions.invoke('evaluate-smart-health-alerts',{body:{petId}});if(!error&&!data?.error&&Array.isArray(data?.alerts)){alerts.push(...data.alerts.filter((item:any)=>item?.id&&item?.title&&!alerts.some(local=>local.id===item.id)));}}catch{/* local intelligence stays available */}}
  return[scoreCard,...alerts];
}

export async function askPetHealthBrain(petId:string,question:string,language:IntelligenceLanguage='en'):Promise<HealthBrainAnswer>{const trimmedQuestion=question.trim();if(!trimmedQuestion)throw new Error('Question is required.');const client=requireSupabase();const{data,error}=await client.functions.invoke('pet-health-assistant',{body:{petId,question:trimmedQuestion,language}});if(error)throw error;if(data?.code==='PRO_REQUIRED')throw new Error('PetSolea Pro is required for AI Health Brain.');if(data?.code==='AI_NOT_CONFIGURED')throw new Error('AI Health Brain is not configured yet.');if(data?.error)throw new Error(String(data.error));if(typeof data?.answer!=='string'||!data.answer.trim())throw new Error('AI Health Brain returned an empty response.');return{answer:data.answer.trim(),disclaimer:typeof data.disclaimer==='string'?data.disclaimer:undefined};}
