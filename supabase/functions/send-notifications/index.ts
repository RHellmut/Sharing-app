import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
// @ts-ignore
import webpush from 'npm:web-push@3.6.7';

// Vienna timezone offset: +1 (CET) or +2 (CEST)
function viennaOffset(utc: Date): number {
  const y = utc.getUTCFullYear();
  const lastSunMar = new Date(Date.UTC(y, 2, 31));
  lastSunMar.setUTCDate(31 - lastSunMar.getUTCDay());
  const lastSunOct = new Date(Date.UTC(y, 9, 31));
  lastSunOct.setUTCDate(31 - lastSunOct.getUTCDay());
  const cestStart = new Date(lastSunMar.getTime() + 3600_000);
  const cestEnd   = new Date(lastSunOct.getTime() + 3600_000);
  return utc >= cestStart && utc < cestEnd ? 2 : 1;
}

// Parse "YYYY-MM-DD" + "HH:MM" as Vienna local time → UTC ms
function viennaLocalToUtcMs(dateStr: string, timeStr: string, offset: number): number {
  const [yy, mo, dd] = dateStr.split('-').map(Number);
  const [hh, mm] = timeStr.split(':').map(Number);
  return Date.UTC(yy, mo - 1, dd, hh - offset, mm);
}

function notificationTitle(minutesBefore: number | null, eventTitle: string): string {
  if (minutesBefore === null)   return `🔔 Erinnerung: ${eventTitle}`;
  if (minutesBefore === 0)      return `⏰ Jetzt: ${eventTitle}`;
  if (minutesBefore < 60)       return `⏰ In ${minutesBefore} Min: ${eventTitle}`;
  if (minutesBefore < 1440)     return `⏰ In ${minutesBefore / 60} Std: ${eventTitle}`;
  return `📅 Morgen: ${eventTitle}`;
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

  const nowUtc = new Date();
  const offset = viennaOffset(nowUtc);
  const WINDOW = 10 * 60_000; // ±10 minutes
  const windowStart = nowUtc.getTime() - WINDOW;
  const windowEnd   = nowUtc.getTime() + WINDOW;

  interface NotifyItem {
    event: Record<string, unknown>;
    reminderKey: string;
    minutesBefore: number | null;
  }
  const toNotify: NotifyItem[] = [];

  // ── Relative reminders (reminder_minutes IS NOT NULL) ──
  const { data: relEvents, error: relErr } = await supabase
    .from('calendar_events')
    .select('*')
    .not('reminder_minutes', 'is', null);
  if (relErr) return new Response(relErr.message, { status: 500 });

  for (const ev of relEvents ?? []) {
    const reminderMin = ev.reminder_minutes as number;
    const dateStr = (ev.date as string).slice(0, 10);
    // All-day events use 09:00 as reference time
    const refTime = ev.time_start ? (ev.time_start as string).slice(0, 5) : '09:00';
    const evUtcMs = viennaLocalToUtcMs(dateStr, refTime, offset);
    const reminderUtcMs = evUtcMs - reminderMin * 60_000;
    if (reminderUtcMs >= windowStart && reminderUtcMs < windowEnd) {
      toNotify.push({ event: ev as Record<string, unknown>, reminderKey: `m${reminderMin}`, minutesBefore: reminderMin });
    }
  }

  // ── Absolute reminders (reminder_at IS NOT NULL) ──
  const { data: absEvents, error: absErr } = await supabase
    .from('calendar_events')
    .select('*')
    .not('reminder_at', 'is', null);
  if (absErr) return new Response(absErr.message, { status: 500 });

  for (const ev of absEvents ?? []) {
    const reminderAt = ev.reminder_at as string; // "YYYY-MM-DD HH:MM"
    const spaceIdx = reminderAt.indexOf(' ');
    if (spaceIdx < 0) continue;
    const datePart = reminderAt.slice(0, spaceIdx);
    const timePart = reminderAt.slice(spaceIdx + 1);
    const reminderUtcMs = viennaLocalToUtcMs(datePart, timePart, offset);
    if (reminderUtcMs >= windowStart && reminderUtcMs < windowEnd) {
      toNotify.push({ event: ev as Record<string, unknown>, reminderKey: 'at', minutesBefore: null });
    }
  }

  if (!toNotify.length) return new Response('No upcoming reminders', { status: 200 });

  // ── Dedup ──
  const eventIds = [...new Set(toNotify.map(n => n.event.id as string))];
  const { data: alreadySent } = await supabase
    .from('sent_push_notifications')
    .select('event_id, reminder_key')
    .in('event_id', eventIds);

  const sentSet = new Set((alreadySent ?? []).map(r => `${r.event_id}:${r.reminder_key}`));
  const pending = toNotify.filter(n => !sentSet.has(`${n.event.id as string}:${n.reminderKey}`));

  if (!pending.length) return new Response('Already sent', { status: 200 });

  // ── Get subscriptions ──
  const { data: subs } = await supabase.from('push_subscriptions').select('*');
  if (!subs?.length) return new Response('No subscriptions', { status: 200 });

  // ── Send ──
  const results: string[] = [];

  for (const { event: ev, reminderKey, minutesBefore } of pending) {
    const personLabel = ev.person === 'person1' ? 'René' : ev.person === 'person2' ? 'Lisa' : 'Euch beiden';
    const timePrefix = ev.time_start ? `${(ev.time_start as string).slice(0, 5)} Uhr · ` : '';
    const payload = JSON.stringify({
      title: notificationTitle(minutesBefore, ev.title as string),
      body:  `${timePrefix}${personLabel}`,
      tag:   `event-${ev.id as string}-${reminderKey}`,
    });

    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
        );
        results.push(`✓ ${ev.title} [${reminderKey}] → ${(sub.endpoint as string).slice(-20)}`);
      } catch (err: unknown) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 410 || status === 404) {
          await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
        }
      }
    }

    await supabase.from('sent_push_notifications').insert({
      event_id: ev.id, reminder_key: reminderKey,
    });
  }

  return new Response(results.join('\n') || 'Done', { status: 200 });
});
