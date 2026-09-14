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
  banner.className = 'cookie-consent';
  banner.innerHTML = '<div><strong>Small cookie note</strong><p>We use essential browser storage to remember this choice. Analytics loads only if you choose Accept.</p><a href="/cookie-tracking-notice/">Read the Cookie and Tracking Notice ↗</a></div><div class="cookie-actions"><button type="button" data-choice="declined">Decline</button><button type="button" data-choice="accepted">Accept</button></div>';
  const style = document.createElement('style');
  style.textContent = '.cookie-consent{position:fixed;z-index:50;left:20px;right:20px;bottom:20px;max-width:760px;margin:auto;display:flex;gap:22px;align-items:center;justify-content:space-between;padding:16px 18px;background:#121713;color:#f2f1ea;border:1px solid #354239;border-radius:10px;box-shadow:0 16px 50px #0009;font:14px/1.45 Geist,system-ui,sans-serif}.cookie-consent strong{font-size:15px}.cookie-consent p{margin:4px 0;color:#b7c0b8}.cookie-consent a{color:#B3272B}.cookie-actions{display:flex;gap:8px;flex-shrink:0}.cookie-actions button{border:1px solid #526057;border-radius:6px;padding:9px 13px;background:transparent;color:#f2f1ea;cursor:pointer;font:inherit}.cookie-actions button:last-child{background:#B3272B;color:#07120b;border-color:#B3272B}@media(max-width:620px){.cookie-consent{left:12px;right:12px;bottom:12px;display:block}.cookie-actions{margin-top:12px}.cookie-actions button{width:50%}}';
  document.head.append(style);
  banner.addEventListener('click', (event) => {
    const button = event.target.closest('[data-choice]');
    if (!button) return;
    localStorage.setItem(key, button.dataset.choice);
    if (button.dataset.choice === 'accepted') loadAnalytics();
    banner.remove();
  });
  document.body.append(banner);
})();
