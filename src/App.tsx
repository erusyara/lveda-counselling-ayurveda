import React, { useMemo, useState } from 'react'

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
  label: string
  title: string
  desc?: string
  type: StepType
  options?: string[]
  min?: number
  max?: number
  placeholder?: string
}

const steps: Step[] = [
  { key: 'last_name', label: '姓', title: 'Q1. 姓', desc: '姓を入力してください。', type: 'text', placeholder: '例：山田' },
  { key: 'first_name', label: '名', title: 'Q2. 名', desc: '名を入力してください。', type: 'text', placeholder: '例：太郎' },
  { key: 'last_name_kana', label: '姓カナ', title: 'Q3. 姓カナ', desc: 'カタカナで入力してください。', type: 'text', placeholder: '例：ヤマダ' },
  { key: 'first_name_kana', label: '名カナ', title: 'Q4. 名カナ', desc: 'カタカナで入力してください。', type: 'text', placeholder: '例：タロウ' },
  { key: 'email', label: 'メールアドレス', title: 'Q5. メールアドレス', desc: '連絡先のメールアドレスを入力してください。', type: 'text', placeholder: '例：example@lveda.jp' },
  { key: 'vitality_1_10', label: '活力レベル（1〜10）', title: 'Q6. 活力レベル（1〜10）', desc: '1が最も低く、10が最も高い状態です。', type: 'number', min: 1, max: 10, placeholder: '例：7' },
  { key: 'digestive_rhythm', label: '消化リズム（過去48時間）', title: 'Q7. 過去48時間の消化リズム', desc: '最も近いものを1つ選択してください。', type: 'single', options: ['重い', '不規則', '鋭い', '安定'] },
  { key: 'sleep_quality', label: '睡眠の状態', title: 'Q8. 睡眠の状態', desc: '複数選択可（最低1つ選択）。', type: 'multi', options: ['寝つきが悪い', '夜中に起きる', '起きてもスッキリしない', 'よく眠れた'] },
  { key: 'tension_areas', label: '張り・緊張がある部位', title: 'Q9. 張り・緊張がある部位', desc: '複数選択可（最低1つ選択）。', type: 'multi', options: ['首', '肩', '腰（下背部）', 'あご', '目', '股関節', 'その他'] },
  { key: 'skin_condition', label: '肌の状態', title: 'Q10. 肌の状態', desc: '最も近いものを1つ選択してください。', type: 'single', options: ['乾燥', '熱っぽい／敏感', '脂っぽい', 'バランス良い'] },
  { key: 'mental_state', label: '現在のメンタル状態', title: 'Q11. 現在のメンタル状態', desc: '最も近いものを1つ選択してください。', type: 'single', options: ['風（Vata）— 落ち着かない／不安', '火（Pitta）— 集中／イライラ', '霧（Kapha）— 重い／やる気が出ない'] },
  { key: 'sensory_sensitivity', label: '刺激に弱い（敏感な）もの', title: 'Q12. 刺激に弱い（敏感な）もの', desc: '複数選択可（最低1つ選択）。「特になし」を選ぶ場合はそれ単独にしてください。', type: 'multi_none_exclusive', options: ['音', '光', '温度', '圧の強さ（タッチ）', '特になし'] },
  { key: 'let_go_text', label: '手放したいこと', title: 'Q13. 手放したいこと（軽くしたいこと）', desc: '短くても大丈夫です。自由にご記入ください。', type: 'text', placeholder: '例：仕事の緊張、頭の中のモヤモヤ など' },
  { key: 'invite_in', label: 'セッション後どう感じたいか', title: 'Q14. セッション後、どう感じたいですか？', desc: '複数選択可（最低1つ選択）。', type: 'multi', options: ['クリアさ', '地に足がつく感覚', '活力', '深いリラックス', '内なる静けさ'] },
  { key: 'communication_preference', label: '施術中のコミュニケーション希望', title: 'Q15. 施術中のコミュニケーション希望', desc: '最も近いものを1つ選択してください。', type: 'single', options: ['完全に静かに過ごしたい', 'やさしいガイダンスが欲しい', '時々の確認だけしてほしい'] },
  { key: 'allergies_text', label: 'アレルギー', title: 'Q16. アレルギー', desc: 'ない場合も「なし」とご記入ください。', type: 'text', placeholder: '例：ゴマ、ナッツ、香料 など / なし' },
  { key: 'medical_history_text', label: '既往歴・注意点', title: 'Q17. 既往歴・体調面での注意点', desc: 'ない場合も「なし」とご記入ください。', type: 'text', placeholder: '例：高血圧、腰痛、服薬中 など / なし' },
  { key: 'female_condition', label: '女性の体調（該当者のみ）', title: 'Q18. （該当する方のみ）女性の体調', desc: '該当しない場合は「該当なし」を選択してください。', type: 'single', options: ['生理中', '妊娠の可能性あり', '該当なし'] },
  { key: '__preview__', label: 'プレビュー', title: '入力内容の確認', desc: '内容に間違いがなければ「送信」。修正する場合は「修正」を押してください。', type: 'preview' }
]

const mapDigestive = (v: string) => ({ '重い': 'Heavy', '不規則': 'Irregular', '鋭い': 'Sharp', '安定': 'Stable' }[v] || v || '')
const mapSleep = (v: string) => ({
  '寝つきが悪い': 'Difficulty falling asleep',
  '夜中に起きる': 'Night awakening',
  '起きてもスッキリしない': 'Not refreshed',
  'よく眠れた': 'Restful'
}[v] || v || '')
const mapTension = (v: string) => ({
  '首': 'Neck',
  '肩': 'Shoulders',
  '腰（下背部）': 'Lower Back',
  'あご': 'Jaw',
  '目': 'Eyes',
  '股関節': 'Hips',
  'その他': 'Other'
}[v] || v || '')
const mapSkin = (v: string) => ({ '乾燥': 'Dry', '熱っぽい／敏感': 'Warm/Sensitive', '脂っぽい': 'Oily', 'バランス良い': 'Balanced' }[v] || v || '')
const mapMental = (v: string) => ({
  '風（Vata）— 落ち着かない／不安': 'Wind (Vata) – Restless/Anxious',
  '火（Pitta）— 集中／イライラ': 'Fire (Pitta) – Focused/Irritable',
  '霧（Kapha）— 重い／やる気が出ない': 'Mist (Kapha) – Heavy/Low Motivation'
}[v] || v || '')
const mapSensory = (v: string) => ({ '音': 'Sound', '光': 'Light', '温度': 'Temperature', '圧の強さ（タッチ）': 'Touch Pressure', '特になし': 'None' }[v] || v || '')
const mapInvite = (v: string) => ({ 'クリアさ': 'Clarity', '地に足がつく感覚': 'Grounded', '活力': 'Vitality', '深いリラックス': 'Deep Relaxation', '内なる静けさ': 'Inner Silence' }[v] || v || '')
const mapComm = (v: string) => ({
  '完全に静かに過ごしたい': 'Complete Silence',
  'やさしいガイダンスが欲しい': 'Gentle Guidance',
  '時々の確認だけしてほしい': 'Occasional Check-in'
}[v] || v || '')
const mapFemale = (v: string) => ({ '生理中': 'Menstruating', '妊娠の可能性あり': 'Possible Pregnancy', '該当なし': 'None' }[v] || v || '')

const App: React.FC = () => {
  const [stepIndex, setStepIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, any>>({})
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const current = steps[stepIndex]
  const totalQuestions = steps.length - 1
  const isPreview = current.type === 'preview'
  const currentQ = isPreview ? totalQuestions : stepIndex + 1

  const progress = Math.round((currentQ / totalQuestions) * 100)

  const nextLabel = useMemo(() => {
    if (isPreview) return '送信'
    if (stepIndex === steps.length - 2) return '確認へ'
    return '次へ'
  }, [isPreview, stepIndex])

  const backLabel = isPreview ? '修正' : '戻る'

  const setAnswer = (key: string, value: any) => {
    setAnswers(prev => ({ ...prev, [key]: value }))
  }

  const validateAndSave = () => {
    const s = current
    if (s.type === 'preview') return true

    const val = answers[s.key]

    if (s.type === 'number') {
      const n = Number(val)
      if (!Number.isFinite(n)) return setErrorAnd(false, '数字を入力してください。')
      if (n < (s.min ?? 1) || n > (s.max ?? 10)) return setErrorAnd(false, `${s.min}〜${s.max}の範囲で入力してください。`)
      return true
    }

    if (s.type === 'text') {
      if (!val || !String(val).trim()) return setErrorAnd(false, '入力してください。')
      if (s.key === 'email' && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(val))) {
        return setErrorAnd(false, 'メールアドレスの形式を確認してください。')
      }
      return true
    }

    if (s.type === 'single') {
      if (!val) return setErrorAnd(false, 'いずれか1つを選択してください。')
      return true
    }

    if (s.type === 'multi') {
      if (!Array.isArray(val) || val.length === 0) return setErrorAnd(false, '最低1つは選択してください。')
      return true
    }

    if (s.type === 'multi_none_exclusive') {
      if (!Array.isArray(val) || val.length === 0) return setErrorAnd(false, '最低1つは選択してください。')
      if (val.includes('特になし') && val.length > 1) return setErrorAnd(false, '「特になし」を選ぶ場合は、それ単独で選択してください。')
      return true
    }

    return setErrorAnd(false, '入力内容を確認してください。')
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

  const submitAll = async () => {
    setSubmitting(true)

    const payload = {
      last_name: answers.last_name,
      first_name: answers.first_name,
      last_name_kana: answers.last_name_kana,
      first_name_kana: answers.first_name_kana,
      email: answers.email,
      vitality_1_10: answers.vitality_1_10,
      digestive_rhythm: mapDigestive(answers.digestive_rhythm),
      sleep_quality: (answers.sleep_quality || []).map(mapSleep),
      tension_areas: (answers.tension_areas || []).map(mapTension),
      skin_condition: mapSkin(answers.skin_condition),
      mental_state: mapMental(answers.mental_state),
      sensory_sensitivity: (answers.sensory_sensitivity || []).map(mapSensory),
      let_go_text: answers.let_go_text,
      invite_in: (answers.invite_in || []).map(mapInvite),
      communication_preference: mapComm(answers.communication_preference),
      allergies_text: answers.allergies_text,
      medical_history_text: answers.medical_history_text,
      female_condition: mapFemale(answers.female_condition)
    }

    try {
      const res = await fetch(API_PATH, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const json = await res.json()
      if (!res.ok || !json.ok) {
        throw new Error(json.error || '送信に失敗しました')
      }
      setSuccess(`送信が完了しました。受付番号：${json.submission_id || ''}`)
    } catch (e: any) {
      setError(`送信に失敗しました: ${e.message || e}`)
    } finally {
      setSubmitting(false)
    }
  }

  const renderInput = () => {
    if (current.type === 'preview') {
      return (
        <div>
          {steps.filter(s => s.type !== 'preview').map(s => (
            <div className="previewRow" key={s.key}>
              <div className="previewKey">{s.label}</div>
              <div className="previewVal">{formatAnswerForPreview(s, answers[s.key]) || '（未入力）'}</div>
            </div>
          ))}
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
          placeholder={current.placeholder}
          value={answers[current.key] ?? ''}
          onChange={e => setAnswer(current.key, e.target.value)}
        />
      )
    }

    if (current.type === 'text') {
      return (
        <textarea
          placeholder={current.placeholder}
          value={answers[current.key] ?? ''}
          onChange={e => setAnswer(current.key, e.target.value)}
        />
      )
    }

    if (current.type === 'single') {
      return (
        <div className="options">
          {current.options?.map(opt => (
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
      const arr = Array.isArray(answers[current.key]) ? answers[current.key] : []
      return (
        <div className="options">
          {current.options?.map(opt => {
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
                      const next = current.type === 'multi_none_exclusive' && opt === '特になし'
                        ? ['特になし']
                        : [...arr.filter(v => v !== '特になし'), opt]
                      setAnswer(current.key, Array.from(new Set(next)))
                    } else {
                      setAnswer(current.key, arr.filter(v => v !== opt))
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

    return <div>未対応の入力タイプです。</div>
  }

  return (
    <div className="wrap">
      <div className="card">
        <div className="title">アーユルヴェーダ セッション確認シート</div>
        <div className="sub">ご回答は施術準備のために使用します。必要に応じてAIで翻訳して担当者が確認します。</div>

        <div className="progressWrap">
          <div className="progressMeta">
            <div>{isPreview ? `確認 / ${totalQuestions}` : `質問 ${currentQ} / ${totalQuestions}`}</div>
            <div>{isPreview ? '残り 0' : `残り ${totalQuestions - currentQ}`}</div>
          </div>
          <div className="bar"><div style={{ width: `${progress}%` }} /></div>
        </div>

        <div className="qTitle">{current.title}</div>
        <div className="qDesc">{current.desc || ''}</div>
        {renderInput()}

        {error && <div className="error">{error}</div>}
        {success && <div className="success">{success}</div>}

        <div className="nav">
          <button className="btn" onClick={goBack} disabled={stepIndex === 0 || submitting}>{backLabel}</button>
          <button className="btn btnPrimary" onClick={goNext} disabled={submitting}>{nextLabel}</button>
        </div>

        <div className="footerNote">※安全確認のため、アレルギー・既往歴の項目はできる範囲で詳しくご記入ください。</div>
      </div>
    </div>
  )
}

function formatAnswerForPreview(step: Step, value: any) {
  if (value === undefined || value === null) return ''
  if (Array.isArray(value)) return value.join('、')
  return String(value)
}

export default App
