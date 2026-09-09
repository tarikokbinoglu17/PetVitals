import { createClient } from 'npm:@supabase/supabase-js@2.112.3';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store, max-age=0',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
  'X-Robots-Tag': 'noindex, nofollow',
};
const respond = (body: object, status = 200) => new Response(JSON.stringify(body), { status, headers });
const tokenPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (req.method !== 'GET') return respond({ error: 'METHOD_NOT_ALLOWED' }, 405);
  // The random 122-bit UUIDv4 on the physical collar is the bearer credential.
  // Validate it and the owner's active publication before returning any data.
  const token = new URL(req.url).searchParams.get('token') ?? '';
  if (!tokenPattern.test(token)) return respond({ error: 'TAG_UNAVAILABLE' }, 404);
  try {
    const client = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: tag, error } = await client.from('pet_tags')
      .select('pet_id,owner_id,contact_phone,contact_name,finder_message,lost_mode')
      .eq('token', token).eq('enabled', true).maybeSingle();
    if (error) return respond({ error: 'TEMPORARILY_UNAVAILABLE' }, 503);
    if (!tag) return respond({ error: 'TAG_UNAVAILABLE' }, 404);
    const { data: pet, error: petError } = await client.from('pets')
      .select('name,species,breed').eq('id', tag.pet_id).eq('owner_id', tag.owner_id).maybeSingle();
    if (petError) return respond({ error: 'TEMPORARILY_UNAVAILABLE' }, 503);
    if (!pet) return respond({ error: 'TAG_UNAVAILABLE' }, 404);
    // Explicit allowlist: never include chip numbers, health records, owner IDs,
    // emails, addresses, private photo URLs or raw database rows.
    return respond({
      name: pet.name, species: pet.species, breed: pet.breed ?? '',
      contactName: tag.contact_name, contactPhone: tag.contact_phone,
      finderMessage: tag.finder_message, lostMode: tag.lost_mode,
    });
  } catch {
    return respond({ error: 'TEMPORARILY_UNAVAILABLE' }, 503);
  }
});
