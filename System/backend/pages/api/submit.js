import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || '';
const recaptchaSecretKey = process.env.RECAPTCHA_SECRET_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

async function verifyRecaptcha(token) {
  if (!recaptchaSecretKey) {
    throw new Error('RECAPTCHA_SECRET_KEY is not configured');
  }

  const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      secret: recaptchaSecretKey,
      response: token
    })
  });

  const data = await response.json();
  return Boolean(data.success);
}

function buildDisplayName(payload) {
  const fields = payload.fields || {};
  return [fields.surname, fields.firstname, fields.middlename]
    .map(function (value) {
      return (value || '').trim();
    })
    .filter(Boolean)
    .join(' ');
}

function buildSubmissionRecord(payload) {
  const fields = payload.fields || {};

  return {
    full_name: buildDisplayName(payload),
    date_of_birth: fields.dob || null,
    age: fields.age ? Number(fields.age) : null,
    payload
  };
}

export default async function handler(req, res) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const payload = req.body || {};
  const recaptchaToken = payload.recaptchaToken || '';

  if (!recaptchaToken) {
    return res.status(400).json({ error: 'Missing reCAPTCHA token' });
  }

  try {
    const recaptchaValid = await verifyRecaptcha(recaptchaToken);
    if (!recaptchaValid) {
      return res.status(400).json({ error: 'reCAPTCHA verification failed' });
    }

    // Store visible summary fields plus the full payload.
    const submissionRecord = buildSubmissionRecord(payload);
    const { data, error } = await supabase.from('applications').insert([
      submissionRecord
    ]).select('*');

    if (error) {
      console.error('Supabase insert error:', error);
      return res.status(500).json({ error: error.message || 'Database error' });
    }

    return res.status(200).json({ success: true, record: data && data[0] });
  } catch (err) {
    console.error('Unexpected error saving submission:', err);
    return res.status(500).json({ error: err.message || String(err) });
  }
}
