// Cloudflare Pages Function — /functions/calendar.js
const SUPABASE_URL = 'https://vincxrmtfjbenlzhjwby.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZpbmN4cm10ZmpiZW5semhqd2J5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIyOTI1MTksImV4cCI6MjA5Nzg2ODUxOX0.M9_ChGDlOIUKKZtbBHs1xn4cdy4FwUAQKN0aYyXefQY';

export async function onRequest(context) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/events?select=*&order=event_date.asc`, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`
    }
  });

  const events = await res.json();

  const escape = s => (s || '').replace(/[\\;,]/g, m => '\\' + m).replace(/\n/g, '\\n');

  let ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Pull Up Événements//HUB//FR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Pull Up Hub',
    'X-WR-TIMEZONE:Indian/Reunion',
  ].join('\r\n') + '\r\n';

  for (const ev of (Array.isArray(events) ? events : [])) {
    if (!ev.event_date) continue;

    const dtStart = ev.event_date.replace(/-/g, '');
    const endRaw = ev.end_date || ev.event_date;
    const [ey, em, ed] = endRaw.split('-').map(Number);
    const endDate = new Date(ey, em - 1, ed + 1);
    const dtEnd = [
      endDate.getFullYear(),
      String(endDate.getMonth() + 1).padStart(2, '0'),
      String(endDate.getDate()).padStart(2, '0')
    ].join('');

    const lines = [
      'BEGIN:VEVENT',
      `UID:${ev.id}@pullup-hub`,
      `DTSTART;VALUE=DATE:${dtStart}`,
      `DTEND;VALUE=DATE:${dtEnd}`,
      `SUMMARY:${escape(ev.name)}`,
      ev.client   ? `DESCRIPTION:Client\\: ${escape(ev.client)}` : '',
      ev.location ? `LOCATION:${escape(ev.location)}` : '',
      ev.notes    ? `COMMENT:${escape(ev.notes)}` : '',
      `STATUS:${ev.status === 'Annulé' ? 'CANCELLED' : 'CONFIRMED'}`,
      'END:VEVENT'
    ].filter(Boolean);

    ics += lines.join('\r\n') + '\r\n';
  }

  ics += 'END:VCALENDAR';

  return new Response(ics, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Cache-Control': 'no-cache'
    }
  });
}
