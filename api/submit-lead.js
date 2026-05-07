import { put } from '@vercel/blob';

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

  let firstName = '';
  let businessName = '';
  let email = '';
  let phone = '';
  let invoiceFileName = '';
  let invoiceFileUrl = UPLOAD_FAILED;

  try {
    const fd = await req.formData();
    firstName = String(fd.get('firstName') || '').trim();
    businessName = String(fd.get('businessName') || '').trim();
    email = String(fd.get('email') || '').trim();
    phone = String(fd.get('phone') || '').trim();

    const invoice = fd.get('invoice');
    if (invoice && typeof invoice === 'object' && typeof invoice.arrayBuffer === 'function') {
      invoiceFileName = invoice.name || 'invoice.pdf';
      console.log('[submit-lead] received file', {
        name: invoiceFileName,
        size: invoice.size,
        type: invoice.type,
      });

      if (process.env.BLOB_READ_WRITE_TOKEN) {
        try {
          const safeName = invoiceFileName.replace(/[^A-Za-z0-9._-]/g, '_');
          const key = `invoices/${Date.now()}-${safeName}`;
          const blob = await put(key, invoice, {
            access: 'public',
            contentType: invoice.type || 'application/pdf',
            addRandomSuffix: false,
          });
          invoiceFileUrl = blob.url;
          console.log('[submit-lead] uploaded to blob', { key, url: invoiceFileUrl });
        } catch (uploadErr) {
          console.error('[submit-lead] blob upload failed', uploadErr);
          invoiceFileUrl = UPLOAD_FAILED;
        }
      } else {
        console.warn('[submit-lead] BLOB_READ_WRITE_TOKEN not set; skipping upload');
      }
    } else {
      console.warn('[submit-lead] no invoice file in form data');
    }
  } catch (parseErr) {
    console.error('[submit-lead] failed to parse form data', parseErr);
    return json({
      ok: false,
      error: 'Failed to parse form data: ' + (parseErr && parseErr.message ? parseErr.message : String(parseErr)),
      webhookStatus: 0,
      webhookBody: '',
      payload: null,
      invoiceFileName,
      invoiceFileUrl,
    }, 400);
  }

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
