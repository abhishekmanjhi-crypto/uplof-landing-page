import nodemailer from 'nodemailer';
import { confirmationEmail, leadEmail } from './_email.js';

// Two ways in, deliberately:
//   - a native form POST gets the 303 redirect it has always had, so the page
//     keeps working with JavaScript disabled or broken
//   - a fetch() that asks for JSON gets JSON, so the page can show an inline
//     confirmation instead of reloading itself
// The validation and the mail are identical on both paths.
function wantsJson(request) {
  const accept = request.headers.get('accept') || '';
  return accept.includes('application/json');
}

function reply(request, status, message, extra) {
  if (wantsJson(request)) {
    return new Response(JSON.stringify(Object.assign({ ok: status < 400, message }, extra || {})), {
      status,
      headers: { 'content-type': 'application/json; charset=utf-8' },
    });
  }
  return new Response(message, { status });
}

export async function onRequestPost({ request, env }) {
  const data = await request.formData();
  const lead = {
    name: String(data.get('name') || '').trim(),
    email: String(data.get('email') || '').trim(),
    business: String(data.get('business') || '').trim(),
    website: String(data.get('website') || '').trim(),
    phone: String(data.get('phone') || '').trim(),
    message: String(data.get('message') || '').trim(),
  };
  const viaWhatsapp = String(data.get('source') || '').trim() === 'whatsapp';
  const attributionKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'gclid', 'landing_page'];
  const attribution = attributionKeys
    .map((key) => [key, String(data.get(key) || '').trim()])
    .filter(([, value]) => value)
    .map(([key, value]) => `${key}: ${value}`);

  if (!lead.name || !lead.email || !lead.business) {
    return reply(request, 400, 'Please complete the required fields.');
  }
  if (!env.GMAIL_USER || !env.GMAIL_APP_PASSWORD) {
    return reply(request, 503, 'Email service is not configured yet. Please continue on WhatsApp.');
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: env.GMAIL_USER, pass: env.GMAIL_APP_PASSWORD },
  });
  const sender = { name: 'Abhishek Manjhi', address: 'hello@uplof.me' };

  const mine = leadEmail(lead, attribution, viaWhatsapp);
  const theirs = confirmationEmail(lead);

  // The lead notification is the one that must not be lost, so it is awaited
  // first and on its own. If the confirmation to the visitor fails, the enquiry
  // has still arrived and the page must not report a failure for it.
  await transporter.sendMail({
    from: sender,
    to: 'kumarabhishekbuild@gmail.com',
    replyTo: lead.email,
    subject: mine.subject,
    text: mine.text,
    html: mine.html,
  });

  try {
    await transporter.sendMail({
      from: sender,
      to: lead.email,
      replyTo: 'hello@uplof.me',
      subject: theirs.subject,
      text: theirs.text,
      html: theirs.html,
    });
  } catch (err) {
    // Swallowed on purpose: see above.
  }

  if (wantsJson(request)) {
    return reply(request, 200, 'Enquiry received.', { name: lead.name });
  }
  return Response.redirect(new URL('/?submitted=1#contact', request.url), 303);
}
