import { getSupabaseClient, supabaseIdBucket } from "./supabaseClient";

const ID_BUCKET = supabaseIdBucket;

function isMissingColumnError(message: string): boolean {
  return /could not find the .* column .* in the schema cache/i.test(message);
}

function buildIdFilePath(userId: string, file: File): string {
  const ext = file.name.includes(".") ? file.name.split(".").pop() : "bin";
  const safeExt = (ext ?? "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
  return `${userId}/${Date.now()}-${crypto.randomUUID()}.${safeExt || "bin"}`;
}

export async function uploadResidentIdAndLinkProfile(userId: string, file: File): Promise<string> {
  const supabase = getSupabaseClient();
  const filePath = buildIdFilePath(userId, file);

  const { error: uploadError } = await supabase.storage.from(ID_BUCKET).upload(filePath, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || undefined,
  });

  if (uploadError) {
    if (/bucket not found/i.test(uploadError.message)) {
      throw new Error(
        `Failed to upload ID image: storage bucket "${ID_BUCKET}" was not found. Create this bucket in Supabase Storage or set VITE_SUPABASE_ID_BUCKET to an existing bucket name.`,
      );
    }
    if (/row-level security policy|violates row-level security/i.test(uploadError.message)) {
      throw new Error(
        `Failed to upload ID image: storage policy blocked this upload. This app can upload with anon role when using backend JWT auth, so add an INSERT policy on storage.objects for bucket "${ID_BUCKET}" that permits anon/authenticated uploads into the user-id folder path.`,
      );
    }
    throw new Error(`Failed to upload ID image: ${uploadError.message}`);
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(ID_BUCKET).getPublicUrl(filePath);

  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      id_image_url: publicUrl,
      verification_status: "PENDING",
      verification_rejection_reason: null,
      is_verified: false,
    })
    .eq("id", userId);

  if (updateError && isMissingColumnError(updateError.message)) {
    // Backward-compatible fallback while PostgREST/Supabase schema cache is stale.
    const { error: fallbackUpdateError } = await supabase
      .from("profiles")
      .update({
        id_image_url: publicUrl,
        is_verified: false,
      })
      .eq("id", userId);

    if (!fallbackUpdateError) {
      return publicUrl;
    }

    throw new Error(`ID image uploaded but profile update failed: ${fallbackUpdateError.message}`);
  }

  if (updateError) {
    throw new Error(`ID image uploaded but profile update failed: ${updateError.message}`);
  }

  return publicUrl;
}

export async function getProfileVerificationStatus(userId: string) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("is_verified,id_image_url,verification_status,verification_rejection_reason,is_banned,banned_reason")
    .eq("id", userId)
    .maybeSingle();

  if (error && isMissingColumnError(error.message)) {
    const { data: fallbackData, error: fallbackError } = await supabase
      .from("profiles")
      .select("is_verified,id_image_url")
      .eq("id", userId)
      .maybeSingle();

    if (fallbackError) {
      throw new Error(`Failed to load profile verification status: ${fallbackError.message}`);
    }

    if (!fallbackData) {
      return null;
    }

    return {
      ...fallbackData,
      verification_status: fallbackData.id_image_url ? "PENDING" : null,
      verification_rejection_reason: null,
      is_banned: false,
      banned_reason: null,
    };
  }

  if (error) {
    throw new Error(`Failed to load profile verification status: ${error.message}`);
  }

  return data;
}

export async function getReportsWithSenderVerification() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from("reports").select(
    `
      *,
      sender_profile:profiles!reports_sender_profile_id_fkey (
        id,
        is_verified,
        id_image_url
      )
    `,
  );

  if (error) {
    throw new Error(`Failed to load reports with sender verification: ${error.message}`);
  }

  return data;
}
