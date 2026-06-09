import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
// @ts-ignore
import webpush from 'npm:web-push@3.6.7';

// Vienna offset: +1 (CET) or +2 (CEST)
function viennaOffset(utc: Date): number {
  const y = utc.getUTCFullYear();
  const lastSunMar = new Date(Date.UTC(y, 2, 31));
  lastSunMar.setUTCDate(31 - lastSunMar.getUTCDay());
  const lastSunOct = new Date(Date.UTC(y, 9, 31));
  lastSunOct.setUTCDate(31 - lastSunOct.getUTCDay());
  const cestStart = new Date(lastSunMar.getTime() + 3600_000); // 01:00 UTC
  const cestEnd   = new Date(lastSunOct.getTime() + 3600_000);
  return utc >= cestStart && utc < cestEnd ? 2 : 1;
}

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  webpush.setVapidDetails(
    'mailto:rene@hellmuth.me',
    Deno.env.get('VAPID_PUBLIC_KEY')!,
    Deno.env.get('VAPID_PRIVATE_KEY')!,
  );

  const nowUtc   = new Date();
  const offset   = viennaOffset(nowUtc);
  // Current Vienna time in ms
  const nowLocal = nowUtc.getTime() + offset * 3_600_000;

  // Target Vienna time: now + 2 hours (in ms)
  const targetMs    = nowLocal + 120 * 60_000;
  // Window: ±10 minutes around the target
  const windowStart = targetMs - 10 * 60_000;
  const windowEnd   = targetMs + 10 * 60_000;

  // Convert window bounds to date strings and minute-of-day
  const wStartDate = new Date(windowStart);
  const wEndDate   = new Date(windowEnd);
  const startDateStr = `${wStartDate.getUTCFullYear()}-${String(wStartDate.getUTCMonth()+1).padStart(2,'0')}-${String(wStartDate.getUTCDate()).padStart(2,'0')}`;
  const endDateStr   = `${wEndDate.getUTCFullYear()}-${String(wEndDate.getUTCMonth()+1).padStart(2,'0')}-${String(wEndDate.getUTCDate()).padStart(2,'0')}`;

  const dates = [...new Set([startDateStr, endDateStr])];

  // Fetch candidate events
  const { data: events, error: evErr } = await supabase
    .from('calendar_events')
    .select('*')
    .in('date', dates)
    .not('time_start', 'is', null);

  if (evErr) return new Response(evErr.message, { status: 500 });

  // Filter events whose datetime falls in window
  const upcoming = (events ?? []).filter(ev => {
    const [hh, mm] = (ev.time_start as string).split(':').map(Number);
    const [yy, mo, dd] = (ev.date as string).split('-').map(Number);
    const evAbsMs = Date.UTC(yy, mo - 1, dd, hh - offset, mm); // shift to UTC
    // recompute as local ms for window comparison
    const evLocalAbsMs = evAbsMs + offset * 3_600_000;
    return evLocalAbsMs >= windowStart && evLocalAbsMs < windowEnd;
  });

  if (!upcoming.length) return new Response('No upcoming events', { status: 200 });

  // Dedup: filter out already sent
  const eventIds = upcoming.map(e => e.id as string);
  const { data: alreadySent } = await supabase
    .from('sent_push_notifications')
    .select('event_id')
    .in('event_id', eventIds)
    .eq('reminder_minutes', 120);

  const sentIds = new Set((alreadySent ?? []).map(r => r.event_id as string));
  const toNotify = upcoming.filter(e => !sentIds.has(e.id as string));

  if (!toNotify.length) return new Response('Already sent', { status: 200 });

  // Get all push subscriptions
  const { data: subs } = await supabase.from('push_subscriptions').select('*');
  if (!subs?.length) return new Response('No subscriptions', { status: 200 });

  // Send notifications
  const results: string[] = [];
  for (const ev of toNotify) {
    const person = ev.person === 'person1' ? 'René' : ev.person === 'person2' ? 'Lisa' : 'Euch beiden';
    const timeStr = (ev.time_start as string).slice(0, 5);
    const payload = JSON.stringify({
      title: `⏰ In 2 Stunden: ${ev.title}`,
      body:  `${timeStr} Uhr · ${person}`,
      tag:   `event-${ev.id}-120`,
    });

    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
        );
        results.push(`✓ ${ev.title} → ${sub.endpoint.slice(-20)}`);
      } catch (err: unknown) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 410 || status === 404) {
          // Expired subscription — remove
          await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
        }
      }
    }

    // Mark as sent
    await supabase.from('sent_push_notifications').insert({
      event_id: ev.id, reminder_minutes: 120,
    });
  }

  return new Response(results.join('\n') || 'Done', { status: 200 });
});
