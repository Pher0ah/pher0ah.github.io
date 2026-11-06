  const opt = list => list.map(v => Array.isArray(v) ? v : [v, v[0].toUpperCase() + v.slice(1)]);

  const TYPES = {
    url: {
      name: 'Webpage',
      fields: [{ k: 'url', label: 'Web address', type: 'url', ph: 'https://example.com' }],
      encode: d => d.url ? normUrl(d.url) : ''
    },
    vcard: {
      name: 'Contact card',
      fields: [
        { row: [
          { k: 'prefix', label: 'Prefix', ph: 'Dr.' },
          { k: 'first', label: 'First name' },
          { k: 'middle', label: 'Middle name' }
        ] },
        { row: [
          { k: 'last', label: 'Last name' },
          { k: 'suffix', label: 'Suffix', ph: 'Jr.' },
          { k: 'nickname', label: 'Nickname' }
        ] },
        { row: [
          { k: 'org', label: 'Company' },
          { k: 'dept', label: 'Department' }
        ] },
        { row: [
          { k: 'title', label: 'Job title' },
          { k: 'role', label: 'Role' }
        ] },
        { group: 'phones', label: 'Phone numbers', add: 'Add phone', start: 1, fields: [
          { k: 'type', label: 'Type', type: 'select', opts: opt(['cell', 'work', 'home', 'main', 'fax', 'pager', 'other']) },
          { k: 'value', label: 'Number', type: 'tel', ph: '+1 555 123 4567' }
        ] },
        { group: 'emails', label: 'Email addresses', add: 'Add email', start: 1, fields: [
          { k: 'type', label: 'Type', type: 'select', opts: opt(['work', 'home', 'other']) },
          { k: 'value', label: 'Email', type: 'email' }
        ] },
        { group: 'addresses', label: 'Addresses', add: 'Add address', fields: [
          { k: 'type', label: 'Type', type: 'select', opts: opt(['work', 'home', 'other']) },
          { k: 'street', label: 'Street' },
          { k: 'ext', label: 'Apt / Suite' },
          { k: 'pobox', label: 'PO box' },
          { row: [{ k: 'city', label: 'City' }, { k: 'region', label: 'State / Region' }] },
          { row: [{ k: 'postal', label: 'Postcode' }, { k: 'country', label: 'Country' }] }
        ] },
        { group: 'urls', label: 'Websites', add: 'Add website', fields: [
          { k: 'type', label: 'Type', type: 'select', opts: opt(['work', 'home', 'other']) },
          { k: 'value', label: 'URL', type: 'url', ph: 'https://' }
        ] },
        { group: 'social', label: 'Social profiles', add: 'Add profile', fields: [
          { k: 'type', label: 'Service', type: 'select', opts: opt(['linkedin', 'x', 'instagram', 'facebook', 'github', 'tiktok', 'youtube', 'mastodon', 'threads', 'bluesky', 'other']) },
          { k: 'value', label: 'Profile URL', type: 'url', ph: 'https://' }
        ] },
        { k: 'bday', label: 'Birthday', type: 'dmy' },
        { k: 'anniv', label: 'Anniversary', type: 'dmy' },
        { k: 'note', label: 'Note', type: 'textarea' }
      ],
      encode: encodeVCard
    },
    wifi: {
      name: 'Wi-Fi network',
      fields: [
        { k: 'ssid', label: 'Network name (SSID)' },
        { k: 'auth', label: 'Security', type: 'select', opts: [['WPA', 'WPA / WPA2 / WPA3'], ['WEP', 'WEP'], ['nopass', 'None (open)']] },
        { k: 'pass', label: 'Password', type: 'text' },
        { k: 'hidden', label: 'Hidden network', type: 'checkbox' }
      ],
      encode: d => {
        if (!d.ssid) return '';
        const e = s => String(s).replace(/([\\;,:"])/g, '\\$1');
        const auth = d.auth || 'WPA';
        return `WIFI:T:${auth};S:${e(d.ssid)};${auth !== 'nopass' ? `P:${e(d.pass || '')};` : ''}${d.hidden ? 'H:true;' : ''};`;
      }
    },
    email: {
      name: 'Email',
      fields: [
        { k: 'to', label: 'To', type: 'email' },
        { row: [{ k: 'cc', label: 'Cc', type: 'email' }, { k: 'bcc', label: 'Bcc', type: 'email' }] },
        { k: 'subject', label: 'Subject' },
        { k: 'body', label: 'Message', type: 'textarea' }
      ],
      encode: d => {
        if (!d.to && !d.subject && !d.body) return '';
        const p = ['cc', 'bcc', 'subject', 'body'].filter(k => d[k]).map(k => `${k}=${encodeURIComponent(d[k])}`);
        return `mailto:${encodeURIComponent(d.to || '').replace(/%40/g, '@').replace(/%2C/g, ',')}${p.length ? '?' + p.join('&') : ''}`;
      }
    },
    sms: {
      name: 'Text message (SMS)',
      fields: [
        { k: 'number', label: 'Phone number', type: 'tel' },
        { k: 'message', label: 'Message', type: 'textarea' }
      ],
      encode: d => d.number ? `SMSTO:${d.number.replace(/\s/g, '')}:${d.message || ''}` : ''
    },
    phone: {
      name: 'Phone call',
      fields: [{ k: 'number', label: 'Phone number', type: 'tel' }],
      encode: d => d.number ? `tel:${d.number.replace(/[^\d+*#,;]/g, '')}` : ''
    },
    geo: {
      name: 'Location',
      fields: [
        { row: [
          { k: 'lat', label: 'Latitude', type: 'number', ph: '51.5007' },
          { k: 'lng', label: 'Longitude', type: 'number', ph: '-0.1246' }
        ] }
      ],
      encode: d => (d.lat !== '' && d.lng !== '' && d.lat != null && d.lng != null) ? `geo:${d.lat},${d.lng}` : ''
    },
    event: {
      name: 'Calendar event',
      fields: [
        { k: 'summary', label: 'Title' },
        { k: 'location', label: 'Location' },
        { k: 'allday', label: 'All-day event', type: 'checkbox' },
        { k: 'tzid', label: 'Time zone (optional)', ph: 'America/New_York' },
        { row: [
          { k: 'start', label: 'Starts', type: 'datetime-local' },
          { k: 'end', label: 'Ends', type: 'datetime-local' }
        ] },
        { k: 'desc', label: 'Description', type: 'textarea' }
      ],
      encode: d => {
        if (!d.summary || !d.start) return '';
        const dt = v => d.allday ? `;VALUE=DATE:${v.slice(0, 10).replace(/-/g, '')}`
          : `${d.tzid && /^[A-Za-z0-9_+./-]+$/.test(d.tzid) ? ';TZID=' + d.tzid : ''}:${v.replace(/[-:]/g, '').slice(0, 13)}00`;
        return ['BEGIN:VEVENT', `SUMMARY:${icsEsc(d.summary)}`, `DTSTART${dt(d.start)}`,
          d.end && `DTEND${dt(d.end)}`, d.location && `LOCATION:${icsEsc(d.location)}`,
          d.desc && `DESCRIPTION:${icsEsc(d.desc)}`, 'END:VEVENT'].filter(Boolean).join('\r\n');
      }
    },
    text: {
      name: 'Plain text',
      fields: [{ k: 'text', label: 'Text', type: 'textarea' }],
      encode: d => d.text || ''
    }
  };

  function normUrl(u) {
    u = String(u).trim();
    return /^[a-z][a-z\d+.-]*:/i.test(u) ? u : 'https://' + u;
  }
  function icsEsc(s) { return String(s).replace(/\\/g, '\\\\').replace(/[;,]/g, '\\$&').replace(/\r?\n/g, '\\n'); }

  function encodeVCard(d) {
    const v = icsEsc;
    const name = [d.prefix, d.first, d.middle, d.last, d.suffix].filter(Boolean).join(' ');
    const fn = name || d.org || '';
    const any = fn || (d.phones || []).some(p => p.value) || (d.emails || []).some(e => e.value);
    if (!any) return '';
    const TEL = { cell: 'CELL', work: 'WORK,VOICE', home: 'HOME,VOICE', main: 'MAIN', fax: 'FAX', pager: 'PAGER', other: 'VOICE' };
    const L = ['BEGIN:VCARD', 'VERSION:3.0',
      `N:${[d.last, d.first, d.middle, d.prefix, d.suffix].map(x => v(x || '')).join(';')}`,
      `FN:${v(fn)}`];
    if (d.nickname) L.push(`NICKNAME:${v(d.nickname)}`);
    if (d.org || d.dept) L.push(`ORG:${v(d.org || '')}${d.dept ? ';' + v(d.dept) : ''}`);
    if (d.title) L.push(`TITLE:${v(d.title)}`);
    if (d.role) L.push(`ROLE:${v(d.role)}`);
    for (const p of d.phones || []) if (p.value) L.push(`TEL;TYPE=${TEL[p.type] || 'VOICE'}:${p.value}`);
    for (const e of d.emails || []) if (e.value) L.push(`EMAIL;TYPE=INTERNET${e.type !== 'other' ? ',' + e.type.toUpperCase() : ''}:${e.value}`);
    for (const a of d.addresses || []) {
      const parts = [a.pobox, a.ext, a.street, a.city, a.region, a.postal, a.country];
      if (parts.some(Boolean)) L.push(`ADR;TYPE=${(a.type || 'other').toUpperCase()}:${parts.map(x => v(x || '')).join(';')}`);
    }
    for (const u of d.urls || []) if (u.value) L.push(`URL;TYPE=${(u.type || 'other').toUpperCase()}:${normUrl(u.value)}`);
    for (const s of d.social || []) if (s.value) L.push(`X-SOCIALPROFILE;TYPE=${s.type || 'other'}:${normUrl(s.value)}`);
    // Dates are "YYYY-MM-DD", or "--MM-DD" without a year. Apple contacts mark a missing
    // year with the placeholder year 1604 plus X-APPLE-OMIT-YEAR; Android reads --MM-DD.
    const apple = (prop, v) => v.startsWith('--') ? `${prop};X-APPLE-OMIT-YEAR=1604:1604${v.slice(1)}` : `${prop}:${v}`;
    if (d.bday) L.push(apple('BDAY', d.bday));
    if (d.anniv) L.push(`X-ANNIVERSARY:${d.anniv}`, apple('item1.X-ABDATE', d.anniv), 'item1.X-ABLabel:_$!<Anniversary>!$_');
    if (d.note) L.push(`NOTE:${v(d.note)}`);
    L.push('END:VCARD');
    return L.join('\r\n');
  }

  const encodeFace = f => (f && TYPES[f.type] ? TYPES[f.type].encode(f.data || {}) : '');

  const safeDecode = s => { try { return decodeURIComponent(s); } catch { return s; } };
  /** Split on `sep`, honouring backslash escapes (\n becomes a newline). */
  function splitEsc(s, sep, preserve = false) {
    const out = [''];
    for (let i = 0; i < s.length; i++) {
      const c = s[i];
      if (c === '\\' && i + 1 < s.length) { const n = s[++i]; out[out.length - 1] += preserve ? '\\' + n : n === 'n' || n === 'N' ? '\n' : n; }
      else if (c === sep) out.push('');
      else out[out.length - 1] += c;
    }
    return out;
  }
  /** "K:v;K:v;;" (Wi-Fi, MECARD, MATMSG) → {K: [v, …]} */
  function keyFields(body, preserve = false) {
    const out = {};
    for (const part of splitEsc(body, ';', preserve)) {
      const i = part.indexOf(':');
      if (i > 0) (out[part.slice(0, i).toUpperCase()] ||= []).push(part.slice(i + 1));
    }
    return out;
  }
  function normDate(v, noYear) {
    let m;
    if ((m = /^(\d{4})-?(\d{2})-?(\d{2})/.exec(v))) return `${noYear ? '-' : m[1]}-${m[2]}-${m[3]}`;
    if ((m = /^--(\d{2})-?(\d{2})/.exec(v))) return `--${m[1]}-${m[2]}`;
    return '';
  }
  const pick = (types, list, dflt) => list.find(t => types.includes(t)) || dflt;
  const SOCIAL = ['linkedin', 'x', 'instagram', 'facebook', 'github', 'tiktok', 'youtube', 'mastodon', 'threads', 'bluesky'];
  const LINE = /^(?:([\w-]+)\.)?([^:;]+)((?:;[^:]*)?):([\s\S]*)$/;   // [group.]PROP[;params]:value
  const unfold = t => t.replace(/\r?\n[ \t]/g, '').split(/\r?\n/);
  // Apple marks "no year" with a placeholder year named in X-APPLE-OMIT-YEAR.
  const omitsYear = (params, val) => { const y = /x-apple-omit-year=(\d{4})/.exec(params)?.[1]; return !!y && val.startsWith(y); };

  function parseVCard(t) {
    const d = { phones: [], emails: [], addresses: [], urls: [], social: [] };
    const lines = unfold(t), labels = {};
    for (const line of lines) {
      const m = LINE.exec(line);
      if (m && m[1] && /^X-ABLABEL$/i.test(m[2])) labels[m[1]] = m[4].toLowerCase();
    }
    for (const line of lines) {
      const m = LINE.exec(line);
      if (!m) continue;
      const [, grp, rawProp, rawParams, val] = m;
      const prop = rawProp.toUpperCase(), params = rawParams.toLowerCase();
      const types = params.replace(/type=/g, '').split(/[;,="]+/).filter(Boolean);
      const parts = splitEsc(val, ';');
      const one = parts.join(';');
      switch (prop) {
        case 'N': [d.last, d.first, d.middle, d.prefix, d.suffix] = parts.map(s => s.trim()); break;
        case 'FN': d.fn = one; break;
        case 'NICKNAME': d.nickname = one; break;
        case 'ORG': [d.org = '', d.dept = ''] = parts; break;
        case 'TITLE': d.title = one; break;
        case 'ROLE': d.role = one; break;
        case 'NOTE': d.note = one; break;
        case 'TEL': d.phones.push({
          type: types.some(x => /cell|mobile|iphone/.test(x)) ? 'cell' : pick(types, ['fax', 'pager', 'main', 'work', 'home'], 'other'),
          value: val.replace(/^tel:/i, '') }); break;
        case 'EMAIL': d.emails.push({ type: pick(types, ['work', 'home'], 'other'), value: one }); break;
        case 'ADR': {
          const [pobox, ext, street, city, region, postal, country] = parts;
          d.addresses.push({ type: pick(types, ['work', 'home'], 'other'), pobox, ext, street, city, region, postal, country });
          break;
        }
        case 'URL': d.urls.push({ type: pick(types, ['work', 'home'], 'other'), value: one }); break;
        case 'X-SOCIALPROFILE': d.social.push({ type: pick(types, SOCIAL, 'other'), value: one }); break;
        case 'BDAY': d.bday = normDate(val, omitsYear(params, val)); break;
        case 'ANNIVERSARY': case 'X-ANNIVERSARY': d.anniv ||= normDate(val); break;
        case 'X-ABDATE': if (/anniversary/.test(labels[grp] || '')) d.anniv ||= normDate(val, omitsYear(params, val)); break;
      }
    }
    if (!d.first && !d.last && d.fn) { const w = d.fn.split(/\s+/); d.last = w.length > 1 ? w.pop() : ''; d.first = w.join(' '); }
    delete d.fn;
    if (!d.phones.length) d.phones.push({ type: 'cell', value: '' });
    if (!d.emails.length) d.emails.push({ type: 'work', value: '' });
    return d;
  }

  function parseMeCard(t) {
    const f = keyFields(t.replace(/^MECARD:/i, ''), true);
    const [last = '', first = ''] = splitEsc(f.N?.[0] || '', ',');
    for (const k of Object.keys(f)) if (k !== 'N' && k !== 'ADR') f[k] = f[k].map(v => splitEsc(v, '\u0000')[0]);
    return {
      last: last.trim(), first: first.trim(), nickname: f.NICKNAME?.[0] || '', org: f.ORG?.[0] || '', title: f.TITLE?.[0] || '',
      note: f.NOTE?.[0] || '', bday: normDate(f.BDAY?.[0] || ''),
      phones: (f.TEL || ['']).map(value => ({ type: 'cell', value })),
      emails: (f.EMAIL || ['']).map(value => ({ type: 'other', value })),
      urls: (f.URL || []).map(value => ({ type: 'other', value })),
      addresses: (f.ADR || []).map(a => {
        const [pobox, ext, street, city, region, postal, country] = splitEsc(a, ',').map(s => s.trim());
        return { type: 'other', pobox, ext, street, city, region, postal, country };
      }),
      social: []
    };
  }

  function parseEvent(t) {
    const d = { summary: '', location: '', desc: '', allday: false, start: '', end: '' };
    const p2 = n => String(n).padStart(2, '0');
    const when = (val, params) => {
      const m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?/.exec(val);
      if (!m) return '';
      if (!m[4]) { d.allday = true; return `${m[1]}-${m[2]}-${m[3]}T00:00`; }
      const tzid = /(?:^|;)TZID=([^;]+)/i.exec(params)?.[1]?.replace(/^"|"$/g, '');
      if (tzid && !m[7]) { d.tzid = tzid; return `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}`; }
      const dt = m[7] ? new Date(Date.UTC(+m[1], m[2] - 1, +m[3], +m[4], +m[5])) : new Date(+m[1], m[2] - 1, +m[3], +m[4], +m[5]);
      return `${dt.getFullYear()}-${p2(dt.getMonth() + 1)}-${p2(dt.getDate())}T${p2(dt.getHours())}:${p2(dt.getMinutes())}`;
    };
    for (const line of unfold(t)) {
      const m = LINE.exec(line);
      if (!m) continue;
      const [, , prop, params, val] = m;
      const text = splitEsc(val, '\u0000')[0];
      switch (prop.toUpperCase()) {
        case 'SUMMARY': d.summary = text; break;
        case 'LOCATION': d.location = text; break;
        case 'DESCRIPTION': d.desc = text; break;
        case 'DTSTART': d.start = when(val, params); break;
        case 'DTEND': d.end = when(val, params); break;
      }
    }
    return d;
  }

  function parseMailto(t) {
    const body = t.slice(7), q = body.indexOf('?');
    const addr = q < 0 ? body : body.slice(0, q), query = q < 0 ? '' : body.slice(q + 1);
    const d = { to: safeDecode(addr), cc: '', bcc: '', subject: '', body: '' };
    for (const kv of query.split('&')) {
      const i = kv.indexOf('=');
      const k = i < 0 ? kv : kv.slice(0, i), v = i < 0 ? '' : kv.slice(i + 1);
      const key = k.toLowerCase();
      if (key in d && key !== 'to') d[key] = safeDecode(v);
    }
    return d;
  }

  /** Recognise any payload this app can make (and common variants) → {type, data}. */
  function parseQr(raw) {
    const t = raw.trim();
    let m;
    if (/^WIFI:/i.test(t)) {
      const f = keyFields(t.slice(5));
      const T = (f.T?.[0] || '').toUpperCase();
      return { type: 'wifi', data: { ssid: f.S?.[0] || '', auth: T === 'WEP' ? 'WEP' : !T || T === 'NOPASS' ? 'nopass' : 'WPA', pass: f.P?.[0] || '', hidden: /^true$/i.test(f.H?.[0] || '') } };
    }
    if (/^BEGIN:VCARD/i.test(t)) return { type: 'vcard', data: parseVCard(t) };
    if (/^MECARD:/i.test(t)) return { type: 'vcard', data: parseMeCard(t) };
    if (/BEGIN:VEVENT/i.test(t)) {
      const zones = [...t.matchAll(/DT(?:START|END);[^:\r\n]*TZID=([^;:\r\n]+)/gi)].map(m => m[1]);
      const dates = [...t.matchAll(/DT(?:START|END)([^:]*):([^\r\n]+)/gi)];
      if (new Set(zones).size > 1 || (zones.length && dates.some(m => !/TZID=/i.test(m[1])))) return { type: 'text', data: { text: raw } };
      return { type: 'event', data: parseEvent(t) };
    }
    if (/^mailto:/i.test(t)) return { type: 'email', data: parseMailto(t) };
    if (/^MATMSG:/i.test(t)) {
      const f = keyFields(t.slice(7));
      return { type: 'email', data: { to: f.TO?.[0] || '', cc: '', bcc: '', subject: f.SUB?.[0] || '', body: f.BODY?.[0] || '' } };
    }
    if ((m = /^SMSTO:([^:]*):?([\s\S]*)$/i.exec(t))) return { type: 'sms', data: { number: m[1], message: m[2] } };
    if ((m = /^sms:([^?&]*)(?:[?&]body=([\s\S]*))?$/i.exec(t))) return { type: 'sms', data: { number: safeDecode(m[1]), message: safeDecode(m[2] || '') } };
    if ((m = /^tel:(.+)$/i.exec(t))) return { type: 'phone', data: { number: m[1] } };
    if ((m = /^geo:(-?[\d.]+),(-?[\d.]+)/i.exec(t))) return { type: 'geo', data: { lat: m[1], lng: m[2] } };
    if (/^(https?:\/\/|www\.)\S+$/i.test(t)) return { type: 'url', data: { url: t } };
    return { type: 'text', data: { text: raw } };
  }


export { TYPES, encodeFace, parseQr };
