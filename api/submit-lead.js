export const config = { runtime: 'edge' };

const UPLOAD_FAILED = 'UPLOAD_FAILED_OR_NOT_AVAILABLE';
const SMS_TO = '8652097235';
const EMAIL_TO = 'bennorris@aevonco.com';

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
}

export default async function handler(req) {
  if (req.method === 'GET') {
    return json({
      ok: true,
      route: '/api/submit-lead',
      hasMakeWebhook: Boolean(process.env.MAKE_WEBHOOK_URL),
      hasBlobToken: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
    });
  }

  if (req.method !== 'POST') {
    return json({ ok: false, error: 'Method not allowed' }, 405);
  }

  const webhookUrl = process.env.MAKE_WEBHOOK_URL;
  if (!webhookUrl) {
    console.error('[submit-lead] MAKE_WEBHOOK_URL is not configured');
    return json({
      ok: false,
      error: 'MAKE_WEBHOOK_URL is not configured',
      webhookStatus: 0,
      webhookBody: '',
      payload: null,
      invoiceFileName: '',
      invoiceFileUrl: UPLOAD_FAILED,
    }, 500);
  }

  let body;
  try {
    body = await req.json();
  } catch (e) {
    return json({
      ok: false,
      error: 'Invalid JSON body: ' + (e && e.message ? e.message : String(e)),
      webhookStatus: 0,
      webhookBody: '',
      payload: null,
      invoiceFileName: '',
      invoiceFileUrl: UPLOAD_FAILED,
    }, 400);
  }

  const firstName = String(body.firstName || '').trim();
  const businessName = String(body.businessName || '').trim();
  const email = String(body.email || '').trim();
  const phone = String(body.phone || '').trim();
  const invoiceFileName = String(body.invoiceFileName || '').trim();
  const invoiceFileUrl = String(body.invoiceFileUrl || UPLOAD_FAILED).trim() || UPLOAD_FAILED;

  const payload = {
    firstName,
    businessName,
    email,
    phone,
    invoiceFileName,
    invoiceFileUrl,
    submittedAt: new Date().toISOString(),
    smsTo: SMS_TO,
    emailTo: EMAIL_TO,
  };
  console.log('[submit-lead] webhook payload', payload);

  let webhookStatus = 0;
  let webhookBody = '';
  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    webhookStatus = res.status;
    webhookBody = await res.text();
    console.log('[submit-lead] webhook response', { status: webhookStatus, body: webhookBody });
  } catch (whErr) {
    console.error('[submit-lead] webhook fetch failed', whErr);
    webhookBody = 'Network error: ' + (whErr && whErr.message ? whErr.message : String(whErr));
  }

  return json({
    ok: webhookStatus >= 200 && webhookStatus < 300,
    webhookStatus,
    webhookBody,
    payload,
    invoiceFileName,
    invoiceFileUrl,
  });
}
