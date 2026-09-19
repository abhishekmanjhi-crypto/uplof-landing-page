// Email templates for /api/lead.
//
// Pages Functions do not route files beginning with "_", so this is a module,
// not an endpoint.
//
// WRITTEN FOR EMAIL CLIENTS, NOT BROWSERS. That means:
//   - tables for layout, because Outlook renders with Word's engine and has no
//     usable flexbox or grid
//   - every style inline; <style> blocks are stripped by Gmail on forwards
//   - no SVG at all (Gmail removes it) and no CSS background-image (Outlook
//     ignores it), so the watermark's lightness is baked into the PNG itself
//   - explicit width/height on every image so blocked images still hold layout
//   - images served from uplof.me rather than attached, which keeps the message
//     a couple of KB instead of carrying ~12KB of PNG on every send
//
// Every message is sent multipart: the HTML below plus a real plain-text part,
// so a text-only client still gets a readable, complete email.

const SITE = 'https://uplof.me';
const ASSET = SITE + '/assets/email';

export const CONTACT = {
  name: 'Abhishek Manjhi',
  role: 'Founder, Uplof',
  tel: '+917710894943',
  telDisplay: '+91 77108 94943',
  email: 'hello@uplof.me',
  site: 'uplof.me',
  whatsapp: 'https://wa.me/917710894943',
};

const INK = '#070605';
const BODY = '#332f2b';
const MUTED = '#5e5853';
const RED = '#d12d34';
const PAPER = '#faf8f5';
const HAIRLINE = '#d8d2c9';

// Anything a visitor typed is untrusted: it must never be able to close a tag
// or inject markup into an inbox.
export function esc(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const FONT = "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;";

/** One "Label / value" row of the details table. */
function row(label, value, href) {
  const shown = value && String(value).trim() ? esc(value) : '&mdash;';
  const cell = href && value
    ? `<a href="${esc(href)}" style="color:${RED};text-decoration:none;">${shown}</a>`
    : shown;
  return `<tr>
    <td style="padding:10px 16px 10px 0;border-bottom:1px solid ${HAIRLINE};${FONT}font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:${MUTED};white-space:nowrap;vertical-align:top;">${esc(label)}</td>
    <td style="padding:10px 0;border-bottom:1px solid ${HAIRLINE};${FONT}font-size:15px;line-height:1.5;color:${INK};">${cell}</td>
  </tr>`;
}

/** The brand signature. This is the block people scroll back to for a number. */
function signature() {
  const c = CONTACT;
  return `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:32px;">
    <!-- colspan matters: the row below has two cells, so without it this rule
         only spans the first column and stops under the logo. -->
    <tr><td colspan="2" style="padding-bottom:20px;">
      <img src="${ASSET}/rule.png" width="600" height="3" alt="" style="display:block;width:100%;height:3px;border:0;line-height:0;">
    </td></tr>
    <tr>
      <td style="vertical-align:top;padding-right:18px;width:108px;">
        <!-- Animated: a light glare sweeps the mark, borrowed from the site's
             logo animation. Frame one is the finished logo on purpose, because
             Outlook on Windows renders only the first frame of a GIF. It loops
             three times rather than forever so a signature does not shimmer at
             the reader. Hosted, not attached, so the message itself stays ~4KB. -->
        <img src="${ASSET}/logo-animated.gif" width="108" height="69" alt="Uplof.me" style="display:block;border:0;">
      </td>
      <td style="vertical-align:top;${FONT}">
        <div style="font-size:15px;font-weight:700;color:${INK};">${esc(c.name)}</div>
        <div style="font-size:13px;color:${MUTED};padding-bottom:10px;">${esc(c.role)}</div>
        <div style="font-size:14px;line-height:1.85;color:${BODY};">
          <a href="tel:${esc(c.tel)}" style="color:${INK};text-decoration:none;font-weight:700;">${esc(c.telDisplay)}</a><br>
          <a href="${esc(c.whatsapp)}" style="color:${RED};text-decoration:none;">WhatsApp</a>
          <span style="color:${HAIRLINE};">&nbsp;|&nbsp;</span>
          <a href="mailto:${esc(c.email)}" style="color:${RED};text-decoration:none;">${esc(c.email)}</a>
          <span style="color:${HAIRLINE};">&nbsp;|&nbsp;</span>
          <a href="${SITE}" style="color:${RED};text-decoration:none;">${esc(c.site)}</a>
        </div>
      </td>
    </tr>
  </table>`;
}

/** Faint wordmark closing the message. Baked at 6% — not CSS opacity. */
function watermark() {
  return `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
    <tr><td align="center" style="padding:34px 0 8px;">
      <img src="${ASSET}/watermark.png" width="150" height="96" alt="" style="display:block;border:0;">
    </td></tr>
    <tr><td align="center" style="${FONT}font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#a8a29a;padding-bottom:8px;">
      Get found. Get contacted. Get followed up.
    </td></tr>
  </table>`;
}

/** Outer shell shared by both messages. */
function shell(inner, preheader) {
  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<title>Uplof</title>
</head>
<body style="margin:0;padding:0;background:${PAPER};">
<div style="display:none;font-size:1px;color:${PAPER};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${esc(preheader)}</div>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${PAPER};">
  <tr><td align="center" style="padding:28px 16px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="width:600px;max-width:100%;background:#ffffff;border:1px solid ${HAIRLINE};">
      <tr><td style="padding:32px 32px 0;">
        <img src="${ASSET}/logo.png" width="96" height="61" alt="Uplof.me" style="display:block;border:0;">
      </td></tr>
      <tr><td style="padding:24px 32px 32px;">${inner}</td></tr>
      <tr><td style="padding:0 32px 24px;">${watermark()}</td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}

/* ------------------------------------------------- 1. CONFIRMATION -------
   Goes to the person who enquired. It exists to (a) prove the form worked and
   (b) leave them holding a number they can call. */
export function confirmationEmail(lead) {
  const first = String(lead.name || '').trim().split(/\s+/)[0] || 'there';
  const inner = `
    <h1 style="${FONT}margin:0 0 14px;font-size:26px;line-height:1.25;color:${INK};">Enquiry received.</h1>
    <p style="${FONT}margin:0 0 16px;font-size:16px;line-height:1.6;color:${BODY};">
      Thanks, ${esc(first)}. Your enquiry reached me and I read every one myself &mdash;
      this is not an autoresponder queue.
    </p>
    <p style="${FONT}margin:0 0 16px;font-size:16px;line-height:1.6;color:${BODY};">
      I will reply within one working day with a first read on where your enquiries
      are most likely leaking. If it is urgent, call or WhatsApp the number below
      rather than waiting on email.
    </p>
    ${signature()}`;
  // Deliberately NOT repeating back what they submitted: echoing someone's own
  // details at them is needless data in an inbox and reads like an autoresponder.
  const text = [
    `Enquiry received.`,
    ``,
    `Thanks, ${first}. Your enquiry reached me and I read every one myself.`,
    `I will reply within one working day. If it is urgent, call or WhatsApp`,
    `${CONTACT.telDisplay} rather than waiting on email.`,
    ``,
    `— ${CONTACT.name}, ${CONTACT.role}`,
    `${CONTACT.telDisplay} | ${CONTACT.email} | ${SITE}`,
    `WhatsApp: ${CONTACT.whatsapp}`,
  ].join('\n');
  return {
    subject: 'Enquiry received — Uplof',
    html: shell(inner, 'Your enquiry reached Abhishek. A reply follows within one working day.'),
    text,
  };
}

/* ------------------------------------------------------- 2. THE LEAD -----
   Goes to Abhishek. Optimised for acting on fast: the number is tappable and
   Reply goes straight to the enquirer. */
export function leadEmail(lead, attribution, viaWhatsapp) {
  const waLink = lead.phone
    ? 'https://wa.me/' + String(lead.phone).replace(/[^\d]/g, '')
    : '';
  const notice = viaWhatsapp
    ? `<p style="${FONT}margin:0 0 20px;padding:12px 14px;background:#fdf3f3;border-left:3px solid ${RED};font-size:14px;line-height:1.55;color:${BODY};">
         Captured as the visitor was handed to WhatsApp. They may never have pressed
         Send there &mdash; follow up rather than waiting for a message.
       </p>`
    : '';
  const inner = `
    <h1 style="${FONT}margin:0 0 6px;font-size:24px;line-height:1.25;color:${INK};">${esc(lead.business || 'New enquiry')}</h1>
    <p style="${FONT}margin:0 0 20px;font-size:14px;color:${MUTED};">
      ${viaWhatsapp ? 'WhatsApp handoff' : 'Lead audit enquiry'} &middot; reply goes straight to them
    </p>
    ${notice}
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-top:1px solid ${HAIRLINE};">
      ${row('Name', lead.name)}
      ${row('Business', lead.business)}
      ${row('Email', lead.email, 'mailto:' + lead.email)}
      ${row('Phone', lead.phone, lead.phone ? 'tel:' + String(lead.phone).replace(/\s/g, '') : '')}
      ${row('Website', lead.website, lead.website)}
      ${row('Wants to improve', lead.message)}
    </table>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:22px;">
      <tr>
        <td style="background:${INK};">
          <a href="mailto:${esc(lead.email)}" style="${FONT}display:inline-block;padding:12px 20px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;">Reply by email</a>
        </td>
        ${waLink ? `<td style="padding-left:10px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td style="background:${RED};">
          <a href="${esc(waLink)}" style="${FONT}display:inline-block;padding:12px 20px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;">WhatsApp them</a>
        </td></tr></table></td>` : ''}
      </tr>
    </table>
    <p style="${FONT}margin:26px 0 8px;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:${MUTED};">Campaign context (non-personal)</p>
    <p style="${FONT}margin:0;font-size:13px;line-height:1.7;color:${MUTED};">
      ${attribution.length ? attribution.map(esc).join('<br>') : 'No campaign parameters captured.'}
    </p>`;
  const text = [
    viaWhatsapp
      ? 'New Uplof enquiry, captured as the visitor was handed to WhatsApp. They may not have pressed Send there, so follow up rather than waiting for a message.'
      : 'New Uplof lead audit enquiry',
    `Name: ${lead.name}`,
    `Business: ${lead.business}`,
    `Email: ${lead.email}`,
    `Website: ${lead.website || '—'}`,
    `Phone: ${lead.phone || '—'}`,
    '',
    lead.message || 'No additional message.',
    '',
    'Campaign context (non-personal):',
    ...(attribution.length ? attribution : ['No campaign parameters captured.']),
  ].join('\n');
  return {
    subject: viaWhatsapp
      ? `New Uplof enquiry (WhatsApp handoff) — ${lead.business}`
      : `New Uplof lead audit enquiry — ${lead.business}`,
    html: shell(inner, `${lead.name} at ${lead.business} — ${lead.email}`),
    text,
  };
}
