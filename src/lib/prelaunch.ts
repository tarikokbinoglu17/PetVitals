import { supabase } from './supabase';

function client() {
  if (!supabase) throw new Error('Supabase yapılandırılmamış.');
  return supabase as any;
}

export type TodayCareTask = {
  id: string;
  petId: string;
  title: string;
  taskType: string;
  dueAt?: string;
  status: 'open' | 'completed' | 'skipped';
  completedAt?: string;
};

export type SmartReminder = {
  id: string;
  petId: string;
  title: string;
  reminderType: string;
  remindAt: string;
  status: 'active' | 'done' | 'snoozed' | 'cancelled';
};

export type CareInvite = {
  id: string;
  petId: string;
  role: string;
  inviteEmail?: string;
};

export async function loadToday(userId: string) {
  const db = client();
  const now = new Date();
  const start = new Date(now); start.setHours(0, 0, 0, 0);
  const end = new Date(now); end.setHours(23, 59, 59, 999);
  const [tasks, reminders, alerts] = await Promise.all([
    db.from('care_tasks').select('id,pet_id,title,task_type,due_at,status,completed_at').or(`owner_id.eq.${userId},assigned_user_id.eq.${userId}`).gte('due_at', start.toISOString()).lte('due_at', end.toISOString()).order('due_at'),
    db.from('smart_reminders').select('id,pet_id,title,reminder_type,remind_at,status').gte('remind_at', start.toISOString()).lte('remind_at', end.toISOString()).in('status', ['active','snoozed']).order('remind_at'),
    db.from('smart_health_alerts').select('id,pet_id,severity,title,message,detected_at,status').eq('owner_id', userId).eq('status','active').order('detected_at',{ascending:false}).limit(8),
  ]);
  const error = tasks.error ?? reminders.error ?? alerts.error;
  if (error) throw error;
  return {
    tasks: (tasks.data ?? []).map((r:any)=>({id:r.id,petId:r.pet_id,title:r.title,taskType:r.task_type,dueAt:r.due_at??undefined,status:r.status,completedAt:r.completed_at??undefined})) as TodayCareTask[],
    reminders: (reminders.data ?? []).map((r:any)=>({id:r.id,petId:r.pet_id,title:r.title,reminderType:r.reminder_type,remindAt:r.remind_at,status:r.status})) as SmartReminder[],
    alerts: alerts.data ?? [],
  };
}

export async function createSmartReminder(userId:string, petId:string, input:{title:string; reminderType:string; remindAt:string; repeatRule?:string; snoozeMinutes?:number}) {
  const { error } = await client().from('smart_reminders').insert({
    owner_id:userId, pet_id:petId, title:input.title.trim(), reminder_type:input.reminderType,
    remind_at:input.remindAt, repeat_rule:input.repeatRule?.trim()||null, snooze_minutes:input.snoozeMinutes ?? 60,
  });
  if (error) throw error;
}

export async function completeSmartReminder(reminderId:string) {
  const { error } = await client().from('smart_reminders').update({status:'done',completed_at:new Date().toISOString(),completed_by:(await client().auth.getUser()).data.user?.id}).eq('id',reminderId);
  if (error) throw error;
}

export async function snoozeSmartReminder(reminderId:string, minutes=60) {
  const remindAt = new Date(Date.now()+minutes*60000).toISOString();
  const { error } = await client().from('smart_reminders').update({status:'snoozed',remind_at:remindAt}).eq('id',reminderId);
  if (error) throw error;
}

export async function createCareTask(userId:string, petId:string, input:{title:string;taskType:string;dueAt?:string;notes?:string}) {
  const { error } = await client().from('care_tasks').insert({owner_id:userId,pet_id:petId,title:input.title.trim(),task_type:input.taskType,due_at:input.dueAt||null,notes:input.notes?.trim()||null});
  if (error) throw error;
}

export async function completeCareTask(taskId:string) {
  const user = (await client().auth.getUser()).data.user;
  const { error } = await client().from('care_tasks').update({status:'completed',completed_at:new Date().toISOString(),completed_by:user?.id??null}).eq('id',taskId);
  if (error) throw error;
}

export async function loadPendingCareInvites() {
  const { data, error } = await client().from('pet_members').select('id,pet_id,role,invite_email').is('member_user_id',null).is('revoked_at',null);
  if (error) throw error;
  return (data??[]).map((r:any)=>({id:r.id,petId:r.pet_id,role:r.role,inviteEmail:r.invite_email??undefined})) as CareInvite[];
}

export async function acceptCareInvite(memberId:string) {
  const { error } = await client().rpc('accept_pet_invite',{p_member_id:memberId});
  if (error) throw error;
}

export async function generateVetVisitSummary(petId:string, windowDays=90) {
  const { data, error } = await client().functions.invoke('vet-visit-summary',{body:{petId,windowDays}});
  if (error) throw error;
  if (data?.error) throw new Error(String(data.error));
  if (typeof data?.summary !== 'string') throw new Error('Veteriner özeti oluşturulamadı.');
  return {summary:data.summary as string, source:String(data.source??'structured'), disclaimer:String(data.disclaimer??'')};
}

export function passportPublicUrl(token:string) {
  const base = process.env.EXPO_PUBLIC_SUPABASE_URL;
  if (!base) throw new Error('Supabase URL eksik.');
  return `${base}/functions/v1/public-pet-passport?token=${encodeURIComponent(token)}`;
}
