import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'
import { google } from 'googleapis'
import { GoogleGenAI } from '@google/genai'
import dotenv from 'dotenv'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = process.env.PORT || 8081
const BASE_PATH = process.env.BASE_PATH || '/counselling/ayurveda'

const CONFIG = {
  spreadsheetId: process.env.SPREADSHEET_ID || '',
  sheetRaw: 'raw_intake',
  sheetTranslated: 'translated_intake',
  timezone: 'Asia/Tokyo',
  geminiModel: process.env.GEMINI_MODEL || 'gemini-3-flash-preview',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  gmailSender: process.env.GMAIL_SENDER || ''
}

app.use(express.json({ limit: '1mb' }))

// Health check
app.get('/health', (_req, res) => {
  res.json({ ok: true })
})

function getServiceAccountJson() {
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    return JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON)
  }
  const jsonPath = process.env.GOOGLE_SERVICE_ACCOUNT_JSON_PATH
  if (!jsonPath) {
    throw new Error('Missing GOOGLE_SERVICE_ACCOUNT_JSON or GOOGLE_SERVICE_ACCOUNT_JSON_PATH')
  }
  const raw = fs.readFileSync(jsonPath, 'utf-8')
  return JSON.parse(raw)
}

function getAuthClient(subjectEmail) {
  const sa = getServiceAccountJson()
  if (!sa.client_email || !sa.private_key) {
    throw new Error('Invalid service account JSON')
  }
  return new google.auth.JWT({
    email: sa.client_email,
    key: sa.private_key,
    scopes: [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/gmail.send'
    ],
    subject: subjectEmail
  })
}

function getGeminiClient() {
  if (!CONFIG.geminiApiKey) throw new Error('Missing GEMINI_API_KEY')
  return new GoogleGenAI({ apiKey: CONFIG.geminiApiKey })
}

async function ensureSheetsAndHeaders(sheets) {
  const ssId = CONFIG.spreadsheetId
  if (!ssId) throw new Error('Missing SPREADSHEET_ID')

  const meta = await sheets.spreadsheets.get({ spreadsheetId: ssId })
  const existingTitles = (meta.data.sheets || []).map(s => s.properties?.title).filter(Boolean)

  const requests = []
  if (!existingTitles.includes(CONFIG.sheetRaw)) {
    requests.push({ addSheet: { properties: { title: CONFIG.sheetRaw } } })
  }
  if (!existingTitles.includes(CONFIG.sheetTranslated)) {
    requests.push({ addSheet: { properties: { title: CONFIG.sheetTranslated } } })
  }
  if (requests.length > 0) {
    await sheets.spreadsheets.batchUpdate({ spreadsheetId: ssId, requestBody: { requests } })
  }

  const rawHeaders = [
    'submission_id','submitted_at','status',
    'last_name','first_name','last_name_kana','first_name_kana','email',
    'vitality_1_10','digestive_rhythm','sleep_quality','tension_areas','skin_condition',
    'mental_state','sensory_sensitivity',
    'let_go_text','invite_in','communication_preference',
    'allergies_text','medical_history_text','female_condition'
  ]
  const trHeaders = [
    'submission_id','translated_at',
    'english_summary','risk_flags','english_full',
    'source_row'
  ]

  await ensureHeaderRow(sheets, CONFIG.sheetRaw, rawHeaders)
  await ensureHeaderRow(sheets, CONFIG.sheetTranslated, trHeaders)
}

async function ensureHeaderRow(sheets, title, headers) {
  const range = `${title}!A1:${String.fromCharCode(64 + headers.length)}1`
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: CONFIG.spreadsheetId,
    range
  })
  const existing = (res.data.values && res.data.values[0]) || []
  const same = headers.every((h, i) => String(existing[i] || '') === h)
  if (!same) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: CONFIG.spreadsheetId,
      range,
      valueInputOption: 'RAW',
      requestBody: { values: [headers] }
    })
  }
}

function nowTokyo() {
  return new Intl.DateTimeFormat('ja-JP', {
    dateStyle: 'short',
    timeStyle: 'medium',
    timeZone: CONFIG.timezone
  }).format(new Date())
}

function uuid() {
  return crypto.randomUUID()
}

function safeStr(v) {
  if (v === null || v === undefined) return ''
  return String(v).trim()
}

function safeNum(v) {
  const n = Number(v)
  return Number.isFinite(n) ? n : ''
}

function safeArr(v) {
  if (!v) return []
  if (Array.isArray(v)) return v.map(x => safeStr(x)).filter(Boolean)
  return String(v).split(',').map(s => s.trim()).filter(Boolean)
}

function validatePayload(data) {
  const errors = []
  const requiredPersonal = [
    'last_name',
    'first_name',
    'last_name_kana',
    'first_name_kana',
    'email'
  ]
  const requiredText = [
    'digestive_rhythm',
    'skin_condition',
    'mental_state',
    'communication_preference',
    'allergies_text',
    'medical_history_text',
    'female_condition'
  ]
  const requiredMulti = ['sleep_quality', 'tension_areas', 'sensory_sensitivity', 'invite_in']

  if (!data || typeof data !== 'object') {
    errors.push('Invalid payload')
    return errors
  }

  for (const key of requiredPersonal) {
    if (!safeStr(data[key])) errors.push(`${key} is required`)
  }
  if (safeStr(data.email) && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(data.email))) {
    errors.push('email is invalid')
  }

  const vitality = Number(data.vitality_1_10)
  if (!Number.isFinite(vitality) || vitality < 1 || vitality > 10) {
    errors.push('vitality_1_10 out of range')
  }

  for (const key of requiredText) {
    if (!safeStr(data[key])) errors.push(`${key} is required`)
  }

  for (const key of requiredMulti) {
    const arr = safeArr(data[key])
    if (arr.length === 0) errors.push(`${key} requires at least one value`)
    if (key === 'sensory_sensitivity') {
      if (arr.includes('None') && arr.length > 1) {
        errors.push('sensory_sensitivity: None must be exclusive')
      }
    }
  }

  if (!safeStr(data.let_go_text)) errors.push('let_go_text is required')

  return errors
}

async function appendRawRow(sheets, data) {
  const submissionId = uuid()
  const now = nowTokyo()

  const row = [
    submissionId,
    now,
    'NEW',
    safeStr(data.last_name),
    safeStr(data.first_name),
    safeStr(data.last_name_kana),
    safeStr(data.first_name_kana),
    safeStr(data.email),
    safeNum(data.vitality_1_10),
    safeStr(data.digestive_rhythm),
    safeArr(data.sleep_quality).join(', '),
    safeArr(data.tension_areas).join(', '),
    safeStr(data.skin_condition),
    safeStr(data.mental_state),
    safeArr(data.sensory_sensitivity).join(', '),
    safeStr(data.let_go_text),
    safeArr(data.invite_in).join(', '),
    safeStr(data.communication_preference),
    safeStr(data.allergies_text),
    safeStr(data.medical_history_text),
    safeStr(data.female_condition)
  ]

  await sheets.spreadsheets.values.append({
    spreadsheetId: CONFIG.spreadsheetId,
    range: `${CONFIG.sheetRaw}!A:A`,
    valueInputOption: 'RAW',
    requestBody: { values: [row] }
  })

  return { submissionId, now }
}

async function translateAndSummarize(payload) {
  const prompt = `You are a professional spa intake interpreter for an Ayurvedic-inspired session.
Output MUST be JSON with keys:
- english_summary: <=10 lines, priority: allergies/pregnancy/medical history first
- risk_flags: short comma-separated flags (e.g., "Allergy", "Possible Pregnancy", "Medical History Provided", "None")
- english_full: structured English preserving original sections and bullet style.
- translated_fields: JSON object with English translations for:
  - let_go_text
  - allergies_text
  - medical_history_text
Do not add medical claims.

Input (JSON):
${JSON.stringify(payload, null, 2)}
`

  const ai = getGeminiClient()
  const response = await ai.models.generateContent({
    model: CONFIG.geminiModel,
    contents: prompt
  })
  const resultText = String(response.text || '').trim()

  let obj
  try {
    const jsonText = resultText
      .replace(/```json\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim()
    const match = jsonText.match(/\{[\s\S]*\}$/)
    obj = JSON.parse(match ? match[0] : jsonText)
  } catch {
    obj = {
      english_summary: resultText.slice(0, 800),
      risk_flags: 'CHECK_OUTPUT_FORMAT',
      english_full: resultText
    }
  }

  return {
    english_summary: safeStr(obj.english_summary),
    risk_flags: safeStr(obj.risk_flags),
    english_full: safeStr(obj.english_full),
    translated_fields: obj.translated_fields || {}
  }
}

async function appendTranslatedRow(sheets, submissionId, translated, sourceRowNumber) {
  const now = nowTokyo()
  await sheets.spreadsheets.values.append({
    spreadsheetId: CONFIG.spreadsheetId,
    range: `${CONFIG.sheetTranslated}!A:A`,
    valueInputOption: 'RAW',
    requestBody: {
      values: [[
        submissionId,
        now,
        translated.english_summary,
        translated.risk_flags,
        translated.english_full,
        sourceRowNumber
      ]]
    }
  })
}

function buildEmailBody(submissionId, translated) {
  const flags = safeStr(translated.risk_flags) || 'None'
  return `New Ayurveda intake received.\n\nSubmission ID: ${submissionId}\nRisk Flags: ${flags}\n\nSummary:\n${translated.english_summary}\n\nFull Detail:\n${translated.english_full}`
}

function sanitizeSheetTitle(title) {
  const cleaned = title.replace(/[\[\]\*\?:\/\\]/g, '').slice(0, 100)
  return cleaned || 'Karte'
}

function formatDateForTitle(date) {
  const d = new Date(date)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

async function createKarteSheet(sheets, submissionId, data, translated, submittedAt) {
  const ssId = CONFIG.spreadsheetId
  const suffix = String(submissionId).slice(0, 6)
  const titleBase = `${formatDateForTitle(submittedAt)}_${safeStr(data.last_name)}${safeStr(data.first_name)}様_${suffix}`
  const title = sanitizeSheetTitle(titleBase)

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: ssId,
    requestBody: {
      requests: [
        { addSheet: { properties: { title, index: 0 } } }
      ]
    }
  })

  const tf = translated.translated_fields || {}
  const rows = [
    ['Submission ID', submissionId],
    ['Submitted At (JST)', submittedAt],
    ['Last Name', safeStr(data.last_name)],
    ['First Name', safeStr(data.first_name)],
    ['Last Name (Kana)', safeStr(data.last_name_kana)],
    ['First Name (Kana)', safeStr(data.first_name_kana)],
    ['Email', safeStr(data.email)],
    ['Vitality Level (1-10)', safeStr(data.vitality_1_10)],
    ['Digestive Rhythm (past 48h)', safeStr(data.digestive_rhythm)],
    ['Sleep Quality', safeArr(data.sleep_quality).join(', ')],
    ['Tension Areas', safeArr(data.tension_areas).join(', ')],
    ['Skin Condition', safeStr(data.skin_condition)],
    ['Mental State', safeStr(data.mental_state)],
    ['Sensory Sensitivity', safeArr(data.sensory_sensitivity).join(', ')],
    ['Let Go (Free Text)', safeStr(tf.let_go_text) || safeStr(data.let_go_text)],
    ['Desired Feeling After Session', safeArr(data.invite_in).join(', ')],
    ['Communication Preference', safeStr(data.communication_preference)],
    ['Allergies', safeStr(tf.allergies_text) || safeStr(data.allergies_text)],
    ['Medical History / Notes', safeStr(tf.medical_history_text) || safeStr(data.medical_history_text)],
    ['Female Condition', safeStr(data.female_condition)],
    ['---', '---'],
    ['English Summary', safeStr(translated.english_summary)],
    ['Risk Flags', safeStr(translated.risk_flags)],
    ['English Full', safeStr(translated.english_full)]
  ]

  await sheets.spreadsheets.values.update({
    spreadsheetId: ssId,
    range: `${title}!A1:B${rows.length}`,
    valueInputOption: 'RAW',
    requestBody: { values: rows }
  })
}

async function sendNotificationEmail(auth, toEmail, submissionId, translated) {
  if (!toEmail) throw new Error('Missing GMAIL_SENDER')
  const gmail = google.gmail({ version: 'v1', auth })

  const subject = `L'VEDA Intake ${submissionId}`
  const body = buildEmailBody(submissionId, translated)
  const message = [
    `From: ${toEmail}`,
    `To: ${toEmail}`,
    'Content-Type: text/plain; charset="UTF-8"',
    `Subject: ${subject}`,
    '',
    body
  ].join('\n')

  const encodedMessage = Buffer.from(message)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

  await gmail.users.messages.send({
    userId: 'me',
    requestBody: { raw: encodedMessage }
  })
}

// API endpoint
const handleSubmit = async (req, res) => {
  try {
    if (!CONFIG.spreadsheetId) return res.status(500).json({ ok: false, error: 'Missing SPREADSHEET_ID' })
    if (!CONFIG.geminiApiKey) return res.status(500).json({ ok: false, error: 'Missing GEMINI_API_KEY' })
    if (!CONFIG.gmailSender) return res.status(500).json({ ok: false, error: 'Missing GMAIL_SENDER' })

    const data = req.body || {}
    const errors = validatePayload(data)
    if (errors.length > 0) {
      return res.status(400).json({ ok: false, error: errors.join('; ') })
    }

    const auth = getAuthClient(CONFIG.gmailSender)
    const sheets = google.sheets({ version: 'v4', auth })

    await ensureSheetsAndHeaders(sheets)

    const { submissionId, now } = await appendRawRow(sheets, data)

    const translated = await translateAndSummarize({
      last_name: data.last_name,
      first_name: data.first_name,
      last_name_kana: data.last_name_kana,
      first_name_kana: data.first_name_kana,
      email: data.email,
      vitality_1_10: data.vitality_1_10,
      digestive_rhythm: data.digestive_rhythm,
      sleep_quality: safeArr(data.sleep_quality),
      tension_areas: safeArr(data.tension_areas),
      skin_condition: data.skin_condition,
      mental_state: data.mental_state,
      sensory_sensitivity: safeArr(data.sensory_sensitivity),
      let_go_text: data.let_go_text,
      invite_in: safeArr(data.invite_in),
      communication_preference: data.communication_preference,
      allergies_text: data.allergies_text,
      medical_history_text: data.medical_history_text,
      female_condition: data.female_condition
    })

    // Append translated row (source_row unknown without readback; store empty for now)
    await appendTranslatedRow(sheets, submissionId, translated, '')
    await createKarteSheet(sheets, submissionId, data, translated, now)

    await sendNotificationEmail(auth, CONFIG.gmailSender, submissionId, translated)

    return res.json({ ok: true, submission_id: submissionId })
  } catch (err) {
    const message = err?.message || String(err)
    return res.status(500).json({ ok: false, error: message })
  }
}

app.post('/api/submit', handleSubmit)
app.post(`${BASE_PATH}/api/submit`, handleSubmit)

// Serve static assets (only if built)
const distPath = path.join(__dirname, 'dist')
const indexPath = path.join(distPath, 'index.html')
const hasDist = fs.existsSync(indexPath)

if (hasDist) {
  app.use(express.static(distPath))
  app.use(BASE_PATH, express.static(distPath))

  // SPA fallback
  app.get(`${BASE_PATH}/*`, (_req, res) => {
    res.sendFile(indexPath)
  })
  app.get('*', (_req, res) => {
    res.sendFile(indexPath)
  })
} else {
  app.get('/', (_req, res) => {
    res.status(200).send('API server running (no dist build found).')
  })
}

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
})
