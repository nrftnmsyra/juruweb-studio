/*!
 * Juruweb Studio tracker
 *
 * One tag on the client's site:
 *   <script defer src="https://juruweb-studio.vercel.app/t.js" data-website="example.com"></script>
 *
 * Sends pageviews and custom events to Juruweb, and injects GTM at runtime when
 * one is configured, so GA can be switched on for a site without redeploying it.
 * No cookies: the session id lives in sessionStorage and dies with the tab.
 */
(function () {
  'use strict';

  var CANONICAL = 'https://juruweb-studio.vercel.app';

  var script = document.currentScript;
  if (!script) return;
  var website = script.getAttribute('data-website');
  if (!website) return; // nothing to attribute events to

  // Call back to wherever this script came from, so preview deploys work. Falls
  // back to the canonical host when the origin cannot be read.
  var ORIGIN = CANONICAL;
  try {
    var src = script.getAttribute('src') || '';
    if (src.indexOf('//') > -1) ORIGIN = new URL(src, location.href).origin;
  } catch (e) {
    /* keep the canonical host */
  }

  /* ---------- session ---------- */
  var SID_KEY = '_jw_sid';
  var sid;
  try {
    sid = sessionStorage.getItem(SID_KEY);
    if (!sid) {
      sid = Math.random().toString(36).slice(2) + '-' + Date.now().toString(36);
      sessionStorage.setItem(SID_KEY, sid);
    }
  } catch (e) {
    // Private mode or blocked storage: still track, just without a session id.
    sid = null;
  }

  /* ---------- device and browser ---------- */
  var ua = navigator.userAgent || '';
  var device = /iPad|Tablet|PlayBook|Silk|(Android(?!.*Mobile))/i.test(ua)
    ? 'tablet'
    : /Mobi|Android|iPhone|iPod|Windows Phone/i.test(ua)
      ? 'mobile'
      : 'desktop';

  var browser = /Edg\//.test(ua)
    ? 'Edge'
    : /OPR\/|Opera/.test(ua)
      ? 'Opera'
      : /Firefox\//.test(ua)
        ? 'Firefox'
        : /Chrome\//.test(ua)
          ? 'Chrome'
          : /Safari\//.test(ua)
            ? 'Safari'
            : 'Other';

  /* ---------- send ---------- */
  function send(eventType, extra) {
    var payload = {
      website: website,
      event_type: eventType,
      path: location.pathname || '/',
      referrer: document.referrer || null,
      device: device,
      browser: browser,
      session_id: sid,
      label: (extra && extra.label) || null,
    };
    var url = ORIGIN + '/api/public/track';
    var body = JSON.stringify(payload);

    // sendBeacon survives the page being closed mid-request.
    try {
      if (navigator.sendBeacon) {
        var blob = new Blob([body], { type: 'application/json' });
        if (navigator.sendBeacon(url, blob)) return;
      }
    } catch (e) {
      /* fall through to XHR */
    }

    try {
      var xhr = new XMLHttpRequest();
      xhr.open('POST', url, true);
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.send(body);
    } catch (e) {
      /* tracking must never break the host page */
    }
  }

  /* ---------- pageviews, including SPA navigation ---------- */
  var lastPath = location.pathname;
  send('pageview');

  function onRouteChange() {
    // The delay lets the framework finish updating location. The path check is
    // essential: Next's App Router calls replaceState during hydration for the
    // URL you are already on, which would double-count every first visit.
    setTimeout(function () {
      if (location.pathname !== lastPath) {
        lastPath = location.pathname;
        send('pageview');
      }
    }, 10);
  }

  ['pushState', 'replaceState'].forEach(function (name) {
    var original = history[name];
    if (typeof original !== 'function') return;
    history[name] = function () {
      var result = original.apply(this, arguments);
      onRouteChange();
      return result;
    };
  });
  window.addEventListener('popstate', onRouteChange);

  /* ---------- manual events ---------- */
  // jw('whatsapp_click', {label: 'header'}) — also mirrored into dataLayer so a
  // GTM trigger can listen for the same name.
  window.jw = function (eventType, extra) {
    send(eventType || 'click', extra);
    try {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({ event: eventType, label: (extra && extra.label) || null });
    } catch (e) {
      /* dataLayer is optional */
    }
  };

  /* ---------- automatic WhatsApp and phone clicks ---------- */
  // The single most useful conversion for these clients, and one nobody
  // remembers to instrument by hand.
  document.addEventListener(
    'click',
    function (ev) {
      var el = ev.target;
      while (el && el !== document.body) {
        if (el.tagName === 'A' && el.href) {
          if (/wa\.me\/|api\.whatsapp\.com|whatsapp-redirect/i.test(el.href)) {
            window.jw('whatsapp_click', { label: el.href.replace(/^.*?(\d{6,})?.*$/, '$1') || 'whatsapp' });
          } else if (/^tel:/i.test(el.href)) {
            window.jw('phone_click', { label: el.href.replace(/^tel:/i, '') });
          } else if (el.hostname && el.hostname !== location.hostname) {
            window.jw('outbound_click', { label: el.hostname });
          }
          return;
        }
        el = el.parentNode;
      }
    },
    true
  );

  /* ---------- runtime GTM injection ---------- */
  try {
    var cfg = new XMLHttpRequest();
    cfg.open('GET', ORIGIN + '/api/public/config?website=' + encodeURIComponent(website), true);
    cfg.onload = function () {
      if (cfg.status < 200 || cfg.status >= 300) return;
      var data;
      try {
        data = JSON.parse(cfg.responseText);
      } catch (e) {
        return;
      }
      if (!data.gtmId || window.__jwGtmLoaded) return;
      window.__jwGtmLoaded = true;

      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });

      var tag = document.createElement('script');
      tag.async = true;
      tag.src = 'https://www.googletagmanager.com/gtm.js?id=' + encodeURIComponent(data.gtmId);
      document.head.appendChild(tag);
    };
    cfg.send();
  } catch (e) {
    /* config is optional; tracking still works without it */
  }
})();
