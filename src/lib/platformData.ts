import { supabase } from "./supabase";
import type { PetMemberRole, ProEntitlement, WeightEntry } from "../types";
import type { SupportedLocale } from "./globalization";

export type ActivePassport = {
  id: string;
  lostMode: boolean;
  createdAt: string;
  expiresAt?: string;
};

export type PetLifeEntryType =
  | "food"
  | "water"
  | "activity"
  | "sleep"
  | "grooming"
  | "parasite"
  | "mood"
  | "custom";

export type PetLifeEntry = {
  id: string;
  petId: string;
  entryType: PetLifeEntryType;
  valueNumeric?: number;
  valueText?: string;
  unit?: string;
  occurredAt: string;
  notes?: string;
};

export type PlatformSnapshot = {
  weights: WeightEntry[];
  lifeEntries: PetLifeEntry[];
  memberCount: number;
  activePassportCount: number;
  passports: ActivePassport[];
  pro: ProEntitlement;
};

const fullAccessEntitlement: ProEntitlement = { plan: "pro" };

function client() {
  if (!supabase) throw new Error("Supabase yapılandırılmamış.");
  return supabase as any;
}

export async function loadPlatformSnapshot(
  userId: string,
  petId: string,
): Promise<PlatformSnapshot> {
  if (!supabase)
    return {
      weights: [],
      lifeEntries: [],
      memberCount: 0,
      activePassportCount: 0,
      passports: [],
      pro: fullAccessEntitlement,
    };
  const db = client();

  const [
    weightsResult,
    lifeResult,
    membersResult,
    passportResult,
    entitlementResult,
  ] = await Promise.all([
    db
      .from("weight_entries")
      .select("id,pet_id,weight,measured_at,notes")
      .eq("owner_id", userId)
      .eq("pet_id", petId)
      .order("measured_at", { ascending: true }),
    db
      .from("pet_life_entries")
      .select(
        "id,pet_id,entry_type,value_numeric,value_text,unit,occurred_at,notes",
      )
      .eq("owner_id", userId)
      .eq("pet_id", petId)
      .order("occurred_at", { ascending: false })
      .limit(30),
    db
      .from("pet_members")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", userId)
      .eq("pet_id", petId)
      .is("revoked_at", null),
    db
      .from("passport_shares")
      .select("id,lost_mode,created_at,expires_at")
      .eq("owner_id", userId)
      .eq("pet_id", petId)
      .is("revoked_at", null)
      .order("created_at", { ascending: false }),
    db
      .from("pro_entitlements")
      .select("plan,provider,product_id,expires_at")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);

  const firstError =
    weightsResult.error ??
    lifeResult.error ??
    membersResult.error ??
    passportResult.error ??
    entitlementResult.error;
  if (firstError) throw firstError;

  const passports: ActivePassport[] = (passportResult.data ?? []).map(
    (row: any) => ({
      id: row.id,
      lostMode: Boolean(row.lost_mode),
      createdAt: row.created_at,
      expiresAt: row.expires_at ?? undefined,
    }),
  );

  return {
    weights: (weightsResult.data ?? []).map((row: any) => ({
      id: row.id,
      petId: row.pet_id,
      weight: Number(row.weight),
      measuredAt: row.measured_at,
      notes: row.notes ?? undefined,
    })),
    lifeEntries: (lifeResult.data ?? []).map((row: any) => ({
      id: row.id,
      petId: row.pet_id,
      entryType: row.entry_type,
      valueNumeric:
        row.value_numeric == null ? undefined : Number(row.value_numeric),
      valueText: row.value_text ?? undefined,
      unit: row.unit ?? undefined,
      occurredAt: row.occurred_at,
      notes: row.notes ?? undefined,
    })),
    memberCount: membersResult.count ?? 0,
    activePassportCount: passports.length,
    passports,
    // App-wide access is controlled by the 7-day trial / Premium gate.
    // Anyone who passes that gate receives every PetSolea feature.
    pro: {
      plan: "pro",
      provider: entitlementResult.data?.provider ?? undefined,
      productId: entitlementResult.data?.product_id ?? undefined,
      expiresAt: entitlementResult.data?.expires_at ?? undefined,
    },
  };
}

export async function addWeightEntry(
  userId: string,
  petId: string,
  weight: number,
  measuredAt?: string,
  notes?: string,
) {
  if (!Number.isFinite(weight) || weight <= 0 || weight > 5000)
    throw new Error("Geçerli bir kilo girin.");
  const { error } = await client()
    .from("weight_entries")
    .insert({
      owner_id: userId,
      pet_id: petId,
      weight,
      measured_at: measuredAt || new Date().toISOString().slice(0, 10),
      notes: notes?.trim() || null,
    });
  if (error) throw error;
}

export async function addLifeEntry(
  userId: string,
  petId: string,
  input: {
    entryType: PetLifeEntryType;
    valueNumeric?: number;
    valueText?: string;
    unit?: string;
    notes?: string;
  },
) {
  const hasNumeric = Number.isFinite(input.valueNumeric);
  const text = input.valueText?.trim();
  const notes = input.notes?.trim();
  if (!hasNumeric && !text && !notes)
    throw new Error("En az bir değer veya not girin.");

  const { error } = await client()
    .from("pet_life_entries")
    .insert({
      owner_id: userId,
      pet_id: petId,
      entry_type: input.entryType,
      value_numeric: hasNumeric ? input.valueNumeric : null,
      value_text: text || null,
      unit: input.unit?.trim() || null,
      notes: notes || null,
    });
  if (error) throw error;
}

export async function invitePetMember(
  userId: string,
  petId: string,
  email: string,
  role: PetMemberRole,
) {
  const normalized = email.trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(normalized))
    throw new Error("Geçerli bir e-posta adresi girin.");
  const { error } = await client()
    .from("pet_members")
    .insert({
      owner_id: userId,
      pet_id: petId,
      invite_email: normalized,
      role,
      can_edit: role !== "viewer",
    });
  if (error) throw error;
}

export async function createPassportShare(
  petId: string,
  lostMode = false,
  language: SupportedLocale = "en",
) {
  const { data, error } = await client().rpc("create_passport_share", {
    p_pet_id: petId,
    p_lost_mode: lostMode,
    p_include_owner_contact: lostMode,
  });
  if (error) throw error;
  const result = data?.[0];
  if (!result?.id || !result?.share_token)
    throw new Error("Pasaport bağlantısı oluşturulamadı.");
  const baseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
  if (!baseUrl) throw new Error("Supabase URL eksik.");
  const token = String(result.share_token);
  return {
    id: String(result.id),
    token,
    url: `${baseUrl}/functions/v1/public-pet-passport?token=${encodeURIComponent(token)}&lang=${language}`,
  };
}

export async function revokePassportShare(userId: string, passportId: string) {
  const { error } = await client()
    .from("passport_shares")
    .update({ revoked_at: new Date().toISOString() })
    .eq("owner_id", userId)
    .eq("id", passportId);
  if (error) throw error;
}

export async function setPassportLostMode(
  userId: string,
  passportId: string,
  enabled: boolean,
) {
  const { error } = await client()
    .from("passport_shares")
    .update({
      lost_mode: enabled,
      include_owner_contact: enabled,
    })
    .eq("owner_id", userId)
    .eq("id", passportId)
    .is("revoked_at", null);
  if (error) throw error;
}
