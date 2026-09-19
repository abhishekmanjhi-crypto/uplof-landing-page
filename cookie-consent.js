(() => {
  const key = 'uplof-cookie-choice';
  const measurementId = 'G-36B8PX5BFP';
  const tagManagerId = 'GTM-KPHGB4RK';

  // Keep campaign context only; never store names, emails or message text here.
  const captureAttribution = () => {
    const params = new URLSearchParams(window.location.search);
    const keys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'gclid'];
    const current = {};
    keys.forEach((key) => { if (params.get(key)) current[key] = params.get(key); });
    current.landing_page = `${window.location.pathname}${window.location.search}`;
    const last = JSON.parse(localStorage.getItem('uplof-attribution-last') || '{}');
    const first = JSON.parse(localStorage.getItem('uplof-attribution-first') || '{}');
    const mergedLast = { ...last, ...current };
    const mergedFirst = Object.keys(first).length ? first : mergedLast;
    localStorage.setItem('uplof-attribution-last', JSON.stringify(mergedLast));
    localStorage.setItem('uplof-attribution-first', JSON.stringify(mergedFirst));
    document.querySelectorAll('form').forEach((form) => {
      const fields = { ...mergedFirst, ...mergedLast };
      Object.entries(fields).forEach(([key, value]) => {
        if (!value) return;
        let input = form.querySelector(`input[name="${key}"]`);
        if (!input) { input = document.createElement('input'); input.type = 'hidden'; input.name = key; form.append(input); }
        input.value = value;
      });
    });
  };
  captureAttribution();

  const loadAnalytics = () => {
    if (window.__uplofAnalyticsLoaded || !measurementId) return;
    window.__uplofAnalyticsLoaded = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
    window.gtag('consent', 'default', {
      analytics_storage: 'granted',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied'
    });
    window.gtag('js', new Date());
    window.gtag('config', measurementId, { send_page_view: true });
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    document.head.append(script);

    if (tagManagerId && !window.__uplofTagManagerLoaded) {
      window.__uplofTagManagerLoaded = true;
      window.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });
      const gtm = document.createElement('script');
      gtm.async = true;
      gtm.src = `https://www.googletagmanager.com/gtm.js?id=${tagManagerId}`;
      document.head.append(gtm);
    }

    document.addEventListener('submit', () => {
      window.dataLayer.push({ event: 'generate_lead', lead_source: 'website_form' });
      window.gtag('event', 'generate_lead', { method: 'website_form' });
    }, { capture: true, once: true });
  };

  const choice = localStorage.getItem(key);
  if (choice === 'accepted') loadAnalytics();
  if (choice) return;
  const banner = document.createElement('aside');
  banner.setAttribute('aria-label', 'Cookie notice');
  banner.className = 'cookie-consent on-dark';
  banner.innerHTML = '<div><strong>Small cookie note</strong><p>We use essential browser storage to remember this choice. Analytics loads only if you choose Accept.</p><a href="/cookie-tracking-notice/">Read the Cookie and Tracking Notice ↗</a></div><div class="cookie-actions"><button class="btn btn--ghost btn--sm" type="button" data-choice="declined">Decline</button><button class="btn btn--solid btn--sm" type="button" data-choice="accepted">Accept</button></div>';
  banner.addEventListener('click', (event) => {
    const button = event.target.closest('[data-choice]');
    if (!button) return;
    localStorage.setItem(key, button.dataset.choice);
    if (button.dataset.choice === 'accepted') loadAnalytics();
    banner.remove();
  });
  document.body.append(banner);
})();
