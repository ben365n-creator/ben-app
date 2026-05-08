import { handleUpload } from '@vercel/blob/client';

export const config = { runtime: 'nodejs' };

const MAX_BYTES = 5 * 1024 * 1024;

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
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return json({ error: 'BLOB_READ_WRITE_TOKEN is not configured' }, 500);
  }

  let body;
  try {
    body = await req.json();
  } catch (e) {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  try {
    const result = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: ['application/pdf'],
        addRandomSuffix: true,
        maximumSizeInBytes: MAX_BYTES,
        tokenPayload: JSON.stringify({}),
      }),
      onUploadCompleted: async ({ blob }) => {
        console.log('[blob-upload] complete', { url: blob.url });
      },
    });
    return json(result);
  } catch (err) {
    console.error('[blob-upload] error', err);
    return json({ error: err && err.message ? err.message : String(err) }, 400);
  }
}
