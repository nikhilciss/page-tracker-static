// Fictional fixtures only. Dates move with the demo's UTC day; no database is read.
export function createData(now = new Date()) {
  const day = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const projects = [
    { id: 'project-store', origin: 'https://store.example.com' },
    { id: 'project-portal', origin: 'https://portal.example.com' },
  ];
  return {
    projects,
    sessions: Array.from({ length: 48 }, (_, i) => {
      const start = day - Math.floor(i / 2) * 86400000;
      const mobile = i % 3 === 1;
      return {
        id: `session-${i + 1}`,
        visitor_id: `visitor-${(i % 32) + 1}`,
        visitor_label: ['Alex Morgan', 'Sam Taylor', 'Anonymous visitor'][i % 3],
        project_id: projects[i % 2].id,
        origin: projects[i % 2].origin,
        started_at: new Date(start).toISOString(),
        last_activity_at: new Date(start + 12000).toISOString(),
        first_seen_at: new Date(start - (i % 3 === 0 ? 60 : 0) * 86400000).toISOString(),
        status: 'timed_out',
        device: mobile ? 'Mobile' : 'Desktop',
        browser: ['Chrome', 'Safari', 'Firefox'][i % 3],
        os: mobile ? 'iOS' : 'Windows',
        country: ['US', 'GB', 'IN'][i % 3],
        ip: `192.0.2.${i + 1}`,
        referrer: ['Direct', 'https://search.example.com', 'https://news.example.com'][i % 3],
        input_method: i % 2 ? 'typing' : 'paste',
        engaged_ms: 8000,
        observed_ms: 12000,
        pages: 2,
        max_scroll: [50, 75, 100][i % 3],
        has_recording: i % 4 !== 3,
      };
    }),
  };
}
export function detail(s) {
  const pages = ['/pricing', '/contact'].map((path, i) => ({
    id: `${s.id}-page-${i}`,
    tracking_session_id: s.id,
    recording_session_id: s.id,
    page_url: s.origin + path,
    started_at: new Date(Date.parse(s.started_at) + i * 5000).toISOString(),
    max_scroll: s.max_scroll,
    observed_ms: i ? 7000 : 5000,
  }));
  const types = [
    'session_start',
    'page_view',
    'click',
    'scroll_milestone',
    'navigation',
    'page_view',
    'form_view',
    'form_start',
    'form_field_interaction',
    'form_submit',
    'form_success',
    'session_end',
  ];
  const events = types.map((event_type, i) => ({
    id: `${s.id}-event-${i}`,
    event_type,
    page_id: pages[i < 4 ? 0 : 1].id,
    occurred_at: new Date(Date.parse(s.started_at) + i * 1000).toISOString(),
    session_offset_ms: i * 1000,
    recording_offset_ms: i * 1000,
    metadata:
      event_type === 'scroll_milestone'
        ? { milestone: s.max_scroll }
        : event_type === 'click'
          ? { tag: 'button', text: 'Contact sales', x: 320, y: 180 }
          : event_type.startsWith('form')
            ? {
                form: 'contact',
                ...(event_type === 'form_field_interaction'
                  ? { field: 'message', input_method: s.input_method }
                  : {}),
              }
            : {},
  }));
  const ua =
    s.browser === 'Safari'
      ? 'Mozilla/5.0 (iPhone) AppleWebKit/605.1 Version/18.0 Mobile Safari/605.1'
      : `Mozilla/5.0 (Windows NT 10.0) ${s.browser}/130.0`;
  const context = {
    user_name: s.visitor_label === 'Anonymous visitor' ? null : s.visitor_label,
    user_id: s.visitor_label === 'Anonymous visitor' ? null : s.visitor_id,
    user_agent: ua,
    country: s.country,
    geo_status: 'approximate',
    ip: s.ip,
    language: 'en-US',
    timezone: 'UTC',
    viewport_width: s.device === 'Mobile' ? 390 : 1440,
    viewport_height: 900,
    referrer_origin: s.referrer,
    recording_session_id: s.id,
  };
  const recordings = s.has_recording
    ? [
        {
          id: `${s.id}-recording`,
          session_id: s.id,
          page_url: pages[0].page_url,
          created_at: s.started_at,
          duration_ms: 12000,
          video_status: 'ready',
          browser: ua,
        },
      ]
    : [];
  return {
    session: s,
    pages,
    recordings,
    contexts: [context],
    engaged_ms: s.engaged_ms,
    events: Object.fromEntries(types.map((t) => [t, types.filter((x) => x === t).length])),
    timeline: events,
    pending_capture: { pages: 0, recoverable: false },
  };
}
const grouped = (rows, key) =>
  [...new Set(rows.map((s) => s[key]))].map((label) => ({
    label,
    value: rows.filter((s) => s[key] === label).length,
  }));
export function overview(data, q) {
  const from = q.get('from'),
    to = q.get('to');
  if (
    !from ||
    !to ||
    from >= to ||
    !Number.isFinite(Date.parse(from)) ||
    !Number.isFinite(Date.parse(to)) ||
    Date.parse(to) - Date.parse(from) > 366 * 86400000
  )
    throw new Error('Choose a valid date range of up to 366 days.');
  const selected = data.sessions.filter(
    (s) =>
      s.started_at >= from &&
      s.started_at < to &&
      ['project', 'browser', 'device', 'country', 'ip', 'referrer', 'input_method'].every(
        (k) => !q.get(k) || s[k === 'project' ? 'project_id' : k] === q.get(k),
      ),
  );
  const details = selected.map(detail),
    allEvents = details.flatMap((d) => d.timeline),
    recordings = details.flatMap((d) => d.recordings);
  const visitors = new Map(selected.map((s) => [s.visitor_id, s.first_seen_at >= from]));
  const events = Object.fromEntries(
    grouped(allEvents, 'event_type').map((r) => [r.label, r.value]),
  );
  const pageRows = details.flatMap((d) => d.pages),
    offset = Math.max(0, Number(q.get('offset')) || 0);
  return {
    projects: data.projects,
    options: Object.fromEntries(
      ['browser', 'device', 'country', 'referrer'].map((k) => [
        k,
        [...new Set(data.sessions.map((s) => s[k]))],
      ]),
    ),
    total: selected.length,
    sessions: selected.slice(offset, offset + 20),
    coverage: { analytics_sessions: selected.length, historical_visits: 0 },
    totals: {
      visitors: visitors.size,
      sessions: selected.length,
      page_views: pageRows.length,
      average_observed_ms: selected.length ? 12000 : 0,
      average_engaged_ms: selected.length ? 8000 : 0,
      interactions: allEvents.filter((e) =>
        ['click', 'form_start', 'form_field_interaction', 'form_submit', 'form_success'].includes(
          e.event_type,
        ),
      ).length,
      new_visitors: [...visitors.values()].filter(Boolean).length,
      returning_visitors: [...visitors.values()].filter((v) => !v).length,
    },
    trends: grouped(
      selected.map((s) => ({ day: s.started_at.slice(0, 10) })),
      'day',
    ).map((r) => ({ day: r.label, sessions: r.value, engaged_ms: r.value * 8000 })),
    events,
    top_pages: grouped(pageRows, 'page_url').map((r) => ({ url: r.label, views: r.value })),
    milestones: [25, 50, 75, 90, 100].map((depth) => ({
      depth,
      pages: pageRows.filter((p) => p.max_scroll >= depth).length,
    })),
    breakdown: Object.fromEntries(
      ['browser', 'device', 'os'].map((k) => [
        k,
        Object.fromEntries(grouped(selected, k).map((r) => [r.label, r.value])),
      ]),
    ),
    reports: {
      countries: grouped(selected, 'country'),
      ips: grouped(selected, 'ip').slice(0, 10),
      domains: grouped(selected, 'origin'),
      referrers: grouped(selected, 'referrer'),
      input_methods: grouped(selected, 'input_method'),
      input_method_unknown: 0,
      sensitive_activity: [{ label: 'Other field interactions only', value: selected.length }],
      duration: [{ label: '10–30 sec', value: selected.length }],
      submit_timing: [{ label: 'Under 10 sec', value: selected.length }],
      saved_recordings: recordings.length,
      recent_recordings: recordings.slice(0, 10),
      video_status: { ready: recordings.length, processing: 0, failed: 0, unavailable: 0 },
    },
  };
}
