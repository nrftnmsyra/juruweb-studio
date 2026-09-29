import tls from 'node:tls';

// Node runtime only — node:tls is not available on the edge.

const FETCH_TIMEOUT_MS = 15000;
const TLS_TIMEOUT_MS = 10000;

function daysUntil(date) {
  if (!date) return null;
  return Math.floor((date.getTime() - Date.now()) / 86400000);
}

/**
 * Reads the certificate straight off a TLS handshake. Cheaper and more accurate
 * than any third-party API, and it needs no key.
 */
export function checkSsl(domain) {
  return new Promise((resolve) => {
    let settled = false;
    const done = (value) => {
      if (!settled) {
        settled = true;
        resolve(value);
      }
    };

    let socket;
    try {
      socket = tls.connect(
        { host: domain, port: 443, servername: domain, timeout: TLS_TIMEOUT_MS },
        () => {
          const cert = socket.getPeerCertificate();
          socket.end();
          if (!cert || !cert.valid_to) return done({ error: 'No certificate presented' });
          const expires = new Date(cert.valid_to);
          done({
            expiresAt: expires.toISOString(),
            daysLeft: daysUntil(expires),
            issuer: cert.issuer?.O || cert.issuer?.CN || null,
          });
        }
      );
    } catch (err) {
      return done({ error: err.message });
    }

    socket.on('error', (err) => {
      socket.destroy();
      done({ error: err.message });
    });
    socket.on('timeout', () => {
      socket.destroy();
      done({ error: 'TLS handshake timed out' });
    });
  });
}

/**
 * Registration expiry via RDAP — the open successor to WHOIS, free and with no
 * key. Not every registry runs an RDAP server (MYNIC, which handles .my, does
 * not at the time of writing), so a miss here is normal rather than a failure.
 */
export async function checkDomainExpiry(domain) {
  try {
    const res = await fetch(`https://rdap.org/domain/${encodeURIComponent(domain)}`, {
      headers: { Accept: 'application/rdap+json' },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) return { unsupported: true };

    const body = await res.json();
    const event = (body.events || []).find((e) => e.eventAction === 'expiration');
    if (!event?.eventDate) return { unsupported: true };

    const expires = new Date(event.eventDate);
    return { expiresAt: expires.toISOString(), daysLeft: daysUntil(expires) };
  } catch {
    return { unsupported: true };
  }
}

const pick = (html, re) => {
  const m = html.match(re);
  return m ? m[1].trim() : null;
};

/**
 * SEO basics read out of the served HTML. Deliberately the handful of things
 * that actually move the needle for a small business site, not a 60-point audit
 * nobody reads.
 */
export function readSeo(html) {
  const title = pick(html, /<title[^>]*>([\s\S]*?)<\/title>/i);
  const description = pick(
    html,
    /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i
  );
  const canonical = pick(html, /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']*)["']/i);
  const ogTitle = pick(html, /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']*)["']/i);
  const ogImage = pick(html, /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']*)["']/i);
  const viewport = pick(html, /<meta[^>]+name=["']viewport["'][^>]+content=["']([^"']*)["']/i);
  const robotsMeta = pick(html, /<meta[^>]+name=["']robots["'][^>]+content=["']([^"']*)["']/i);
  // [\s>] not [\b>]: inside a character class \b means backspace, so the old
  // pattern never matched <h1 class="…"> and reported every page as missing one.
  const h1Count = (html.match(/<h1[\s>]/gi) || []).length;
  const imgTags = html.match(/<img\b[^>]*>/gi) || [];
  const imgsMissingAlt = imgTags.filter((tag) => !/\balt\s*=/i.test(tag)).length;

  return {
    title,
    titleLength: title?.length ?? 0,
    description,
    descriptionLength: description?.length ?? 0,
    canonical: Boolean(canonical),
    ogTitle: Boolean(ogTitle),
    ogImage: Boolean(ogImage),
    viewport: Boolean(viewport),
    noindex: /noindex/i.test(robotsMeta || ''),
    h1Count,
    images: imgTags.length,
    imgsMissingAlt,
  };
}

/**
 * 0-100. Weighted so the things that stop a site being found or shared well
 * cost the most, and cosmetic gaps cost little.
 */
export function scoreSeo(seo, extras) {
  let score = 100;
  const notes = [];

  if (!seo.title) {
    score -= 25;
    notes.push('No page title');
  } else if (seo.titleLength < 15 || seo.titleLength > 65) {
    score -= 6;
    notes.push(`Title is ${seo.titleLength} characters (aim for 15-65)`);
  }

  if (!seo.description) {
    score -= 18;
    notes.push('No meta description');
  } else if (seo.descriptionLength < 70 || seo.descriptionLength > 165) {
    score -= 5;
    notes.push(`Description is ${seo.descriptionLength} characters (aim for 70-165)`);
  }

  if (seo.noindex) {
    score -= 30;
    notes.push('Page is set to noindex — Google will not list it');
  }
  if (seo.h1Count === 0) {
    score -= 10;
    notes.push('No H1 heading');
  } else if (seo.h1Count > 1) {
    score -= 4;
    notes.push(`${seo.h1Count} H1 headings (use one)`);
  }

  if (!seo.viewport) {
    score -= 12;
    notes.push('No mobile viewport tag');
  }
  if (!seo.canonical) {
    score -= 5;
    notes.push('No canonical URL');
  }
  if (!seo.ogTitle || !seo.ogImage) {
    score -= 5;
    notes.push('Missing Open Graph tags — links share without a preview');
  }
  if (seo.imgsMissingAlt > 0) {
    score -= Math.min(6, seo.imgsMissingAlt);
    notes.push(`${seo.imgsMissingAlt} image(s) without alt text`);
  }
  if (extras && !extras.sitemap) {
    score -= 6;
    notes.push('No sitemap.xml');
  }
  if (extras && !extras.robots) {
    score -= 3;
    notes.push('No robots.txt');
  }

  return { score: Math.max(0, Math.min(100, score)), notes };
}

async function reachable(url) {
  try {
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: AbortSignal.timeout(8000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Runs every check for one domain and returns a row ready for site_checks. */
export async function checkSite(domain) {
  const started = Date.now();
  const row = {
    ok: false,
    status_code: null,
    response_ms: null,
    error: null,
    ssl_expires_at: null,
    ssl_days_left: null,
    ssl_issuer: null,
    domain_expires_at: null,
    domain_days_left: null,
    seo: null,
    seo_score: null,
  };

  let html = '';
  try {
    const res = await fetch(`https://${domain}`, {
      redirect: 'follow',
      headers: { 'User-Agent': 'JuruwebMonitor/1.0 (+https://juruweb-studio.vercel.app)' },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    row.response_ms = Date.now() - started;
    row.status_code = res.status;
    row.ok = res.ok;
    html = res.ok ? await res.text() : '';
  } catch (err) {
    row.response_ms = Date.now() - started;
    row.error = err.name === 'TimeoutError' ? 'Timed out' : err.message;
  }

  const [ssl, registration, sitemap, robots] = await Promise.all([
    checkSsl(domain),
    checkDomainExpiry(domain),
    row.ok ? reachable(`https://${domain}/sitemap.xml`) : Promise.resolve(false),
    row.ok ? reachable(`https://${domain}/robots.txt`) : Promise.resolve(false),
  ]);

  if (ssl.expiresAt) {
    row.ssl_expires_at = ssl.expiresAt;
    row.ssl_days_left = ssl.daysLeft;
    row.ssl_issuer = ssl.issuer;
  } else if (!row.error && ssl.error) {
    row.error = `SSL: ${ssl.error}`;
  }

  if (registration.expiresAt) {
    row.domain_expires_at = registration.expiresAt;
    row.domain_days_left = registration.daysLeft;
  }

  if (html) {
    const seo = readSeo(html);
    const { score, notes } = scoreSeo(seo, { sitemap, robots });
    row.seo = { ...seo, sitemap, robots, notes };
    row.seo_score = score;
  }

  return row;
}
