import React, { useMemo, useState } from 'react'
import { detectLang, getTranslations, buildOptionReverseMap, type Lang } from './i18n'

const API_PATH = '/api/submit'

type StepType =
  | 'number'
  | 'single'
  | 'multi'
  | 'multi_none_exclusive'
  | 'text'
  | 'preview'

type Step = {
  key: string
  type: StepType
  min?: number
  max?: number
}

/**
 * Steps structure (language-independent).
 * Labels, titles, descriptions, options, placeholders are all in i18n.ts
 */
const steps: Step[] = [
  { key: 'last_name', type: 'text' },
  { key: 'first_name', type: 'text' },
  { key: 'last_name_kana', type: 'text' },
  { key: 'first_name_kana', type: 'text' },
  { key: 'email', type: 'text' },
  { key: 'vitality_1_10', type: 'number', min: 1, max: 10 },
  { key: 'digestive_rhythm', type: 'single' },
  { key: 'sleep_quality', type: 'multi' },
  { key: 'tension_areas', type: 'multi' },
  { key: 'skin_condition', type: 'single' },
  { key: 'mental_state', type: 'single' },
  { key: 'sensory_sensitivity', type: 'multi_none_exclusive' },
  { key: 'let_go_text', type: 'text' },
  { key: 'invite_in', type: 'multi' },
  { key: 'communication_preference', type: 'single' },
  { key: 'allergies_text', type: 'text' },
  { key: 'medical_history_text', type: 'text' },
  { key: 'female_condition', type: 'single' },
  { key: '__preview__', type: 'preview' },
]

// Server-side mapping functions (always map to English for backend)
const mapDigestive = (v: string) => ({ '重い': 'Heavy', '不規則': 'Irregular', '鋭い': 'Sharp', '安定': 'Stable' }[v] || v || '')
const mapSleep = (v: string) => ({
  '寝つきが悪い': 'Difficulty falling asleep',
  '夜中に起きる': 'Night awakening',
  '起きてもスッキリしない': 'Not refreshed',
  'よく眠れた': 'Restful'
}[v] || v || '')
const mapTension = (v: string) => ({
  '首': 'Neck', '肩': 'Shoulders', '腰（下背部）': 'Lower Back',
  'あご': 'Jaw', '目': 'Eyes', '股関節': 'Hips', 'その他': 'Other'
}[v] || v || '')
const mapSkin = (v: string) => ({ '乾燥': 'Dry', '熱っぽい／敏感': 'Warm/Sensitive', '脂っぽい': 'Oily', 'バランス良い': 'Balanced' }[v] || v || '')
const mapMental = (v: string) => ({
  '風（Vata）\u2014 落ち着かない／不安': 'Wind (Vata) \u2013 Restless/Anxious',
  '火（Pitta）\u2014 集中／イライラ': 'Fire (Pitta) \u2013 Focused/Irritable',
  '霧（Kapha）\u2014 重い／やる気が出ない': 'Mist (Kapha) \u2013 Heavy/Low Motivation'
}[v] || v || '')
const mapSensory = (v: string) => ({ '音': 'Sound', '光': 'Light', '温度': 'Temperature', '圧の強さ（タッチ）': 'Touch Pressure', '特になし': 'None' }[v] || v || '')
const mapInvite = (v: string) => ({ 'クリアさ': 'Clarity', '地に足がつく感覚': 'Grounded', '活力': 'Vitality', '深いリラックス': 'Deep Relaxation', '内なる静けさ': 'Inner Silence' }[v] || v || '')
const mapComm = (v: string) => ({
  '完全に静かに過ごしたい': 'Complete Silence',
  'やさしいガイダンスが欲しい': 'Gentle Guidance',
  '時々の確認だけしてほしい': 'Occasional Check-in'
}[v] || v || '')
const mapFemale = (v: string) => ({ '生理中': 'Menstruating', '妊娠の可能性あり': 'Possible Pregnancy', '該当なし': 'None' }[v] || v || '')

// "None" equivalent per language (for multi_none_exclusive logic)
const NONE_VALUES: Record<Lang, string> = { ja: '特になし', en: 'None', zh: '無' }

// ----- URL parameter prefill (GAS reservation integration) ----
const PREFILL_KEYS = ['last_name', 'first_name', 'last_name_kana', 'first_name_kana', 'email'] as const
const RESERVATION_META_KEYS = [
  'reservation_media', 'reservation_id', 'reservation_at', 'reservation_staff',
  'campaign', 'source',
] as const

function readUrlPrefill(): { answers: Record<string, string>; meta: Record<string, string> } {
  const params = new URLSearchParams(window.location.search)
  const answers: Record<string, string> = {}
  const meta: Record<string, string> = {}
  for (const key of PREFILL_KEYS) {
    const v = params.get(key)
    if (v) answers[key] = v
  }
  for (const key of RESERVATION_META_KEYS) {
    const v = params.get(key)
    if (v) meta[key] = v
  }
  return { answers, meta }
}

const App: React.FC = () => {
  const [lang] = useState<Lang>(detectLang)
  const t = useMemo(() => getTranslations(lang), [lang])
  const reverseMap = useMemo(() => buildOptionReverseMap(lang), [lang])

  // Read URL prefill once on mount
  const prefill = useMemo(() => readUrlPrefill(), [])

  const [stepIndex, setStepIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, any>>(prefill.answers)
  const [reservationMeta] = useState<Record<string, string>>(prefill.meta)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const current = steps[stepIndex]
  const currentStepT = t.steps[current.key] || { label: '', title: '', desc: '' }
  const totalQuestions = steps.length - 1
  const isPreview = current.type === 'preview'
  const currentQ = isPreview ? totalQuestions : stepIndex + 1

  const progress = Math.round((currentQ / totalQuestions) * 100)

  const noneValue = NONE_VALUES[lang]

  const nextLabel = useMemo(() => {
    if (isPreview) return t.submit
    if (stepIndex === steps.length - 2) return t.toConfirm
    return t.next
  }, [isPreview, stepIndex, t])

  const backLabel = isPreview ? t.edit : t.back

  const setAnswer = (key: string, value: any) => {
    setAnswers(prev => ({ ...prev, [key]: value }))
  }

  // --- Helpers for template strings ---
  const fmt = (template: string, vars: Record<string, string | number>) => {
    let result = template
    for (const [k, v] of Object.entries(vars)) {
      result = result.replace(`{${k}}`, String(v))
    }
    return result
  }

  const validateAndSave = () => {
    const s = current
    if (s.type === 'preview') return true

    const val = answers[s.key]

    if (s.type === 'number') {
      const n = Number(val)
      if (!Number.isFinite(n)) return setErrorAnd(false, t.enterNumber)
      if (n < (s.min ?? 1) || n > (s.max ?? 10)) return setErrorAnd(false, fmt(t.rangeError, { min: s.min ?? 1, max: s.max ?? 10 }))
      return true
    }

    if (s.type === 'text') {
      if (!val || !String(val).trim()) return setErrorAnd(false, t.required)
      if (s.key === 'email' && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(val))) {
        return setErrorAnd(false, t.emailFormat)
      }
      return true
    }

    if (s.type === 'single') {
      if (!val) return setErrorAnd(false, t.selectOne)
      return true
    }

    if (s.type === 'multi') {
      if (!Array.isArray(val) || val.length === 0) return setErrorAnd(false, t.selectAtLeastOne)
      return true
    }

    if (s.type === 'multi_none_exclusive') {
      if (!Array.isArray(val) || val.length === 0) return setErrorAnd(false, t.selectAtLeastOne)
      if (val.includes(noneValue) && val.length > 1) return setErrorAnd(false, t.noneExclusive)
      return true
    }

    return setErrorAnd(false, t.checkInput)
  }

  const setErrorAnd = (value: boolean, message: string) => {
    setError(message)
    return value
  }

  const goNext = async () => {
    if (submitting) return
    setError('')
    setSuccess('')

    if (!validateAndSave()) return

    if (isPreview) {
      await submitAll()
      return
    }

    setStepIndex(i => Math.min(i + 1, steps.length - 1))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const goBack = () => {
    if (stepIndex === 0 || submitting) return
    setError('')
    setSuccess('')
    setStepIndex(i => Math.max(i - 1, 0))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  /**
   * Convert a localized option value to its Japanese equivalent for the backend.
   * For 'ja' this is a no-op.
   */
  const toJa = (stepKey: string, value: string): string => {
    if (lang === 'ja') return value
    return reverseMap[stepKey]?.[value] || value
  }
  const toJaArray = (stepKey: string, values: string[]): string[] => {
    return values.map(v => toJa(stepKey, v))
  }

  const submitAll = async () => {
    setSubmitting(true)

    // Convert all answers to Japanese for backend compatibility
    const payload = {
      last_name: answers.last_name,
      first_name: answers.first_name,
      last_name_kana: answers.last_name_kana,
      first_name_kana: answers.first_name_kana,
      email: answers.email,
      vitality_1_10: answers.vitality_1_10,
      digestive_rhythm: mapDigestive(toJa('digestive_rhythm', answers.digestive_rhythm)),
      sleep_quality: toJaArray('sleep_quality', answers.sleep_quality || []).map(mapSleep),
      tension_areas: toJaArray('tension_areas', answers.tension_areas || []).map(mapTension),
      skin_condition: mapSkin(toJa('skin_condition', answers.skin_condition)),
      mental_state: mapMental(toJa('mental_state', answers.mental_state)),
      sensory_sensitivity: toJaArray('sensory_sensitivity', answers.sensory_sensitivity || []).map(mapSensory),
      let_go_text: answers.let_go_text,
      invite_in: toJaArray('invite_in', answers.invite_in || []).map(mapInvite),
      communication_preference: mapComm(toJa('communication_preference', answers.communication_preference)),
      allergies_text: answers.allergies_text,
      medical_history_text: answers.medical_history_text,
      female_condition: mapFemale(toJa('female_condition', answers.female_condition)),
      ...(Object.keys(reservationMeta).length > 0 ? { _reservation: reservationMeta } : {}),
    }

    try {
      const res = await fetch(API_PATH, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const json = await res.json()
      if (!res.ok || !json.ok) {
        throw new Error(json.error || t.submitFail.replace('{error}', ''))
      }
      setSuccess(fmt(t.submitSuccess, { id: json.submission_id || '' }))
    } catch (e: any) {
      setError(fmt(t.submitFail, { error: e.message || String(e) }))
    } finally {
      setSubmitting(false)
    }
  }

  const renderInput = () => {
    if (current.type === 'preview') {
      return (
        <div>
          {steps.filter(s => s.type !== 'preview').map(s => {
            const sT = t.steps[s.key] || { label: s.key }
            return (
              <div className="previewRow" key={s.key}>
                <div className="previewKey">{sT.label}</div>
                <div className="previewVal">{formatAnswerForPreview(answers[s.key]) || t.notEntered}</div>
              </div>
            )
          })}
        </div>
      )
    }

    if (current.type === 'number') {
      return (
        <input
          type="number"
          inputMode="numeric"
          min={current.min}
          max={current.max}
          placeholder={currentStepT.placeholder}
          value={answers[current.key] ?? ''}
          onChange={e => setAnswer(current.key, e.target.value)}
        />
      )
    }

    if (current.type === 'text') {
      return (
        <textarea
          placeholder={currentStepT.placeholder}
          value={answers[current.key] ?? ''}
          onChange={e => setAnswer(current.key, e.target.value)}
        />
      )
    }

    if (current.type === 'single') {
      const options = currentStepT.options || []
      return (
        <div className="options">
          {options.map(opt => (
            <label
              className={['opt', answers[current.key] === opt ? 'selected' : ''].join(' ')}
              key={opt}
            >
              <input
                type="radio"
                name={`single_${current.key}`}
                value={opt}
                checked={answers[current.key] === opt}
                onChange={() => setAnswer(current.key, opt)}
              />
              <div>{opt}</div>
            </label>
          ))}
        </div>
      )
    }

    if (current.type === 'multi' || current.type === 'multi_none_exclusive') {
      const options = currentStepT.options || []
      const arr: string[] = Array.isArray(answers[current.key]) ? (answers[current.key] as string[]) : []
      return (
        <div className="options">
          {options.map(opt => {
            const checked = arr.includes(opt)
            return (
              <label
                className={['opt', checked ? 'selected' : ''].join(' ')}
                key={opt}
              >
                <input
                  type="checkbox"
                  value={opt}
                  checked={checked}
                  onChange={e => {
                    if (e.target.checked) {
                      const next = current.type === 'multi_none_exclusive' && opt === noneValue
                        ? [noneValue]
                        : [...arr.filter((v: string) => v !== noneValue), opt]
                      setAnswer(current.key, Array.from(new Set(next)))
                    } else {
                      setAnswer(current.key, arr.filter((v: string) => v !== opt))
                    }
                  }}
                />
                <div>{opt}</div>
              </label>
            )
          })}
        </div>
      )
    }

    return <div>{t.checkInput}</div>
  }

  return (
    <div className="wrap">
      <div className="card">
        <div className="title">{t.pageTitle}</div>
        <div className="sub">{t.pageSubtitle}</div>

        <div className="progressWrap">
          <div className="progressMeta">
            <div>{isPreview
              ? fmt(t.confirmOf, { total: totalQuestions })
              : fmt(t.questionOf, { current: currentQ, total: totalQuestions })
            }</div>
            <div>{isPreview ? t.remainingZero : fmt(t.remaining, { n: totalQuestions - currentQ })}</div>
          </div>
          <div className="bar"><div style={{ width: `${progress}%` }} /></div>
        </div>

        <div className="qTitle">{isPreview ? t.steps.__preview__?.title || currentStepT.title : currentStepT.title}</div>
        <div className="qDesc">{isPreview ? t.steps.__preview__?.desc || currentStepT.desc : currentStepT.desc}</div>
        {renderInput()}

        {error && <div className="error">{error}</div>}
        {success && <div className="success">{success}</div>}

        <div className="nav">
          <button className="btn" onClick={goBack} disabled={stepIndex === 0 || submitting}>{backLabel}</button>
          <button className="btn btnPrimary" onClick={goNext} disabled={submitting}>
            {submitting ? t.submitting : nextLabel}
          </button>
        </div>

        <div className="footerNote">{t.footerNote}</div>
      </div>
    </div>
  )
}

function formatAnswerForPreview(value: any) {
  if (value === undefined || value === null) return ''
  if (Array.isArray(value)) return value.join(', ')
  return String(value)
}

export default App
