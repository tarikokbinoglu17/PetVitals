import { supabase } from "./supabase";

export type VerificationEntityType =
  | "health_record"
  | "vaccine"
  | "medication_plan"
  | "care_program"
  | "vet_visit";

export type VerificationStatus =
  | "owner_entered"
  | "pending"
  | "vet_verified"
  | "rejected";

export type VerificationCandidate = {
  entityType: VerificationEntityType;
  entityId: string;
  label: string;
  date?: string;
  verificationId?: string;
  status: VerificationStatus;
  clinicName?: string;
  verifierName?: string;
  verifiedAt?: string;
  notes?: string;
};

export type VeterinarianCredentialStatus =
  | "not_submitted"
  | "pending"
  | "verified"
  | "rejected";

function db() {
  if (!supabase) throw new Error("Supabase yapılandırılmamış.");
  return supabase as any;
}

export async function loadVerificationCenter(userId: string, petId: string) {
  const client = db();
  const [petResult, membershipResult, verificationResult, credentialResult] =
    await Promise.all([
      client.from("pets").select("owner_id").eq("id", petId).maybeSingle(),
      client
        .from("pet_members")
        .select("role")
        .eq("pet_id", petId)
        .eq("member_user_id", userId)
        .is("revoked_at", null)
        .maybeSingle(),
      client
        .from("record_verifications")
        .select(
          "id,owner_id,entity_type,entity_id,record_label,status,clinic_name,verifier_name,verified_at,notes",
        )
        .eq("pet_id", petId)
        .order("created_at", { ascending: false }),
      client
        .from("veterinarian_profiles")
        .select("verification_status,clinic_name,rejection_reason")
        .eq("user_id", userId)
        .maybeSingle(),
    ]);
  const error =
    petResult.error ??
    membershipResult.error ??
    verificationResult.error ??
    credentialResult.error;
  if (error) throw error;
  const isOwner = petResult.data?.owner_id === userId;
  const isVeterinarian = membershipResult.data?.role === "veterinarian";
  const verificationRows = verificationResult.data ?? [];
  const byEntity = new Map(
    verificationRows.map((row: any) => [
      `${row.entity_type}:${row.entity_id}`,
      row,
    ]),
  );

  let candidates: VerificationCandidate[] = [];
  if (isOwner) {
    const [vaccines, records, medications, programs, visits] = await Promise.all([
      client
        .from("vaccines")
        .select("id,vaccine_name,administered_date,next_due_date")
        .eq("pet_id", petId)
        .eq("owner_id", userId)
        .order("created_at", { ascending: false })
        .limit(30),
      client
        .from("health_records")
        .select("id,title,record_date")
        .eq("pet_id", petId)
        .eq("owner_id", userId)
        .order("record_date", { ascending: false })
        .limit(30),
      client
        .from("medication_plans")
        .select("id,medication_name,start_date")
        .eq("pet_id", petId)
        .eq("owner_id", userId)
        .order("created_at", { ascending: false })
        .limit(30),
      client
        .from("care_programs")
        .select("id,label,started_at")
        .eq("pet_id", petId)
        .eq("owner_id", userId)
        .order("created_at", { ascending: false })
        .limit(30),
      client
        .from("vet_visits")
        .select("id,clinic_name,veterinarian,visit_at")
        .eq("pet_id", petId)
        .eq("owner_id", userId)
        .eq("status", "confirmed")
        .order("visit_at", { ascending: false })
        .limit(30),
    ]);
    const candidateError = [vaccines, records, medications, programs, visits].find(
      (result) => result.error,
    )?.error;
    if (candidateError) throw candidateError;
    const raw = [
      ...(vaccines.data ?? []).map((row: any) => ({
        entityType: "vaccine" as const,
        entityId: row.id,
        label: row.vaccine_name,
        date: row.administered_date ?? row.next_due_date,
      })),
      ...(records.data ?? []).map((row: any) => ({
        entityType: "health_record" as const,
        entityId: row.id,
        label: row.title,
        date: row.record_date,
      })),
      ...(medications.data ?? []).map((row: any) => ({
        entityType: "medication_plan" as const,
        entityId: row.id,
        label: row.medication_name,
        date: row.start_date,
      })),
      ...(programs.data ?? []).map((row: any) => ({
        entityType: "care_program" as const,
        entityId: row.id,
        label: row.label,
        date: row.started_at,
      })),
      ...(visits.data ?? []).map((row: any) => ({
        entityType: "vet_visit" as const,
        entityId: row.id,
        label: row.clinic_name || row.veterinarian || "Veteriner görüşmesi",
        date: row.visit_at,
      })),
    ];
    candidates = raw.map((candidate) => {
      const row: any = byEntity.get(
        `${candidate.entityType}:${candidate.entityId}`,
      );
      return {
        ...candidate,
        verificationId: row?.id,
        status: (row?.status ?? "owner_entered") as VerificationStatus,
        clinicName: row?.clinic_name ?? undefined,
        verifierName: row?.verifier_name ?? undefined,
        verifiedAt: row?.verified_at ?? undefined,
        notes: row?.notes ?? undefined,
      };
    });
  } else if (isVeterinarian) {
    candidates = verificationRows
      .filter((row: any) => row.status === "pending")
      .map((row: any) => ({
        entityType: row.entity_type,
        entityId: row.entity_id,
        label: row.record_label || row.entity_type,
        verificationId: row.id,
        status: row.status,
      }));
  }

  return {
    isOwner,
    isVeterinarian,
    candidates,
    credentialStatus: (credentialResult.data?.verification_status ??
      "not_submitted") as VeterinarianCredentialStatus,
    credentialClinic: credentialResult.data?.clinic_name as string | undefined,
    credentialRejectionReason: credentialResult.data?.rejection_reason as
      | string
      | undefined,
  };
}

export async function requestRecordVerification(
  petId: string,
  entityType: VerificationEntityType,
  entityId: string,
) {
  const { error } = await db().rpc("request_record_verification", {
    p_pet_id: petId,
    p_entity_type: entityType,
    p_entity_id: entityId,
  });
  if (error) throw error;
}

export async function reviewRecordVerification(input: {
  verificationId: string;
  status: "vet_verified" | "rejected";
  clinicName?: string;
  verifierName?: string;
  notes?: string;
}) {
  const { error } = await db().rpc("review_record_verification", {
    p_verification_id: input.verificationId,
    p_status: input.status,
    p_clinic_name: input.clinicName?.trim() || null,
    p_verifier_name: input.verifierName?.trim() || null,
    p_notes: input.notes?.trim() || null,
  });
  if (error) throw error;
}

export async function submitVeterinarianCredentials(input: {
  clinicName: string;
  licenseCountry: string;
  licenseNumber: string;
}) {
  const { error } = await db().rpc("submit_veterinarian_credentials", {
    p_clinic_name: input.clinicName.trim(),
    p_license_country: input.licenseCountry.trim(),
    p_license_number: input.licenseNumber.trim(),
  });
  if (error) throw error;
}
