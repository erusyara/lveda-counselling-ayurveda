/**
 * L'VEDA Counselling — Lightweight i18n
 *
 * 言語判定: URLパラメータ ?lang=en|zh > ブラウザ言語 > デフォルト(ja)
 * 外部ライブラリ不要。翻訳データ + useI18n フック のみ。
 */

export type Lang = 'ja' | 'en' | 'zh'

export const SUPPORTED_LANGS: Lang[] = ['ja', 'en', 'zh']

// ---- 言語判定 ----

export function detectLang(): Lang {
  // 1. URLパラメータ ?lang=xx
  const params = new URLSearchParams(window.location.search)
  const paramLang = params.get('lang')?.toLowerCase()
  if (paramLang && SUPPORTED_LANGS.includes(paramLang as Lang)) {
    return paramLang as Lang
  }

  // 2. ブラウザ言語
  const nav = navigator.language?.toLowerCase() || ''
  if (nav.startsWith('zh')) return 'zh'
  if (nav.startsWith('en')) return 'en'

  // 3. デフォルト
  return 'ja'
}


// ---- 翻訳データ型 ----

type StepTranslation = {
  label: string
  title: string
  desc: string
  placeholder?: string
  options?: string[]
}

type Translations = {
  // UI chrome
  pageTitle: string
  pageSubtitle: string
  questionOf: string
  confirmOf: string
  remaining: string
  remainingZero: string
  next: string
  toConfirm: string
  submit: string
  back: string
  edit: string
  footerNote: string
  submitting: string

  // Validation
  enterNumber: string
  rangeError: string
  required: string
  emailFormat: string
  selectOne: string
  selectAtLeastOne: string
  noneExclusive: string
  checkInput: string

  // Submit
  submitSuccess: string
  submitFail: string

  // Preview
  notEntered: string

  // Steps (keyed by step.key)
  steps: Record<string, StepTranslation>
}


// ---- 日本語 ----

const ja: Translations = {
  pageTitle: 'アーユルヴェーダ セッション確認シート',
  pageSubtitle: 'ご回答は施術準備のために使用します。必要に応じてAIで翻訳して担当者が確認します。',
  questionOf: '質問 {current} / {total}',
  confirmOf: '確認 / {total}',
  remaining: '残り {n}',
  remainingZero: '残り 0',
  next: '次へ',
  toConfirm: '確認へ',
  submit: '送信',
  back: '戻る',
  edit: '修正',
  footerNote: '※安全確認のため、アレルギー・既往歴の項目はできる範囲で詳しくご記入ください。',
  submitting: '送信中...',

  enterNumber: '数字を入力してください。',
  rangeError: '{min}〜{max}の範囲で入力してください。',
  required: '入力してください。',
  emailFormat: 'メールアドレスの形式を確認してください。',
  selectOne: 'いずれか1つを選択してください。',
  selectAtLeastOne: '最低1つは選択してください。',
  noneExclusive: '「特になし」を選ぶ場合は、それ単独で選択してください。',
  checkInput: '入力内容を確認してください。',

  submitSuccess: '送信が完了しました。受付番号：{id}',
  submitFail: '送信に失敗しました: {error}',

  notEntered: '（未入力）',

  steps: {
    last_name:      { label: '姓', title: 'Q1. 姓', desc: '姓を入力してください。', placeholder: '例：山田' },
    first_name:     { label: '名', title: 'Q2. 名', desc: '名を入力してください。', placeholder: '例：太郎' },
    last_name_kana: { label: '姓カナ', title: 'Q3. 姓カナ', desc: 'カタカナで入力してください。', placeholder: '例：ヤマダ' },
    first_name_kana:{ label: '名カナ', title: 'Q4. 名カナ', desc: 'カタカナで入力してください。', placeholder: '例：タロウ' },
    email:          { label: 'メールアドレス', title: 'Q5. メールアドレス', desc: '連絡先のメールアドレスを入力してください。', placeholder: '例：example@lveda.jp' },
    vitality_1_10:  { label: '活力レベル（1〜10）', title: 'Q6. 活力レベル（1〜10）', desc: '1が最も低く、10が最も高い状態です。', placeholder: '例：7' },
    digestive_rhythm:{ label: '消化リズム（過去48時間）', title: 'Q7. 過去48時間の消化リズム', desc: '最も近いものを1つ選択してください。', options: ['重い', '不規則', '鋭い', '安定'] },
    sleep_quality:  { label: '睡眠の状態', title: 'Q8. 睡眠の状態', desc: '複数選択可（最低1つ選択）。', options: ['寝つきが悪い', '夜中に起きる', '起きてもスッキリしない', 'よく眠れた'] },
    tension_areas:  { label: '張り・緊張がある部位', title: 'Q9. 張り・緊張がある部位', desc: '複数選択可（最低1つ選択）。', options: ['首', '肩', '腰（下背部）', 'あご', '目', '股関節', 'その他'] },
    skin_condition: { label: '肌の状態', title: 'Q10. 肌の状態', desc: '最も近いものを1つ選択してください。', options: ['乾燥', '熱っぽい／敏感', '脂っぽい', 'バランス良い'] },
    mental_state:   { label: '現在のメンタル状態', title: 'Q11. 現在のメンタル状態', desc: '最も近いものを1つ選択してください。', options: ['風（Vata）— 落ち着かない／不安', '火（Pitta）— 集中／イライラ', '霧（Kapha）— 重い／やる気が出ない'] },
    sensory_sensitivity: { label: '刺激に弱い（敏感な）もの', title: 'Q12. 刺激に弱い（敏感な）もの', desc: '複数選択可（最低1つ選択）。「特になし」を選ぶ場合はそれ単独にしてください。', options: ['音', '光', '温度', '圧の強さ（タッチ）', '特になし'] },
    let_go_text:    { label: '手放したいこと', title: 'Q13. 手放したいこと（軽くしたいこと）', desc: '短くても大丈夫です。自由にご記入ください。', placeholder: '例：仕事の緊張、頭の中のモヤモヤ など' },
    invite_in:      { label: 'セッション後どう感じたいか', title: 'Q14. セッション後、どう感じたいですか？', desc: '複数選択可（最低1つ選択）。', options: ['クリアさ', '地に足がつく感覚', '活力', '深いリラックス', '内なる静けさ'] },
    communication_preference: { label: '施術中のコミュニケーション希望', title: 'Q15. 施術中のコミュニケーション希望', desc: '最も近いものを1つ選択してください。', options: ['完全に静かに過ごしたい', 'やさしいガイダンスが欲しい', '時々の確認だけしてほしい'] },
    allergies_text: { label: 'アレルギー', title: 'Q16. アレルギー', desc: 'ない場合も「なし」とご記入ください。', placeholder: '例：ゴマ、ナッツ、香料 など / なし' },
    medical_history_text: { label: '既往歴・注意点', title: 'Q17. 既往歴・体調面での注意点', desc: 'ない場合も「なし」とご記入ください。', placeholder: '例：高血圧、腰痛、服薬中 など / なし' },
    female_condition: { label: '女性の体調（該当者のみ）', title: 'Q18. （該当する方のみ）女性の体調', desc: '該当しない場合は「該当なし」を選択してください。', options: ['生理中', '妊娠の可能性あり', '該当なし'] },
    __preview__: { label: 'プレビュー', title: '入力内容の確認', desc: '内容に間違いがなければ「送信」。修正する場合は「修正」を押してください。' },
  },
}


// ---- English ----

const en: Translations = {
  pageTitle: 'Ayurveda Session Intake Form',
  pageSubtitle: 'Your answers help us prepare the best session for you. Responses are translated by AI for our therapists if needed.',
  questionOf: 'Question {current} / {total}',
  confirmOf: 'Review / {total}',
  remaining: '{n} remaining',
  remainingZero: '0 remaining',
  next: 'Next',
  toConfirm: 'Review',
  submit: 'Submit',
  back: 'Back',
  edit: 'Edit',
  footerNote: '* For your safety, please provide as much detail as possible for allergy and medical history questions.',
  submitting: 'Submitting...',

  enterNumber: 'Please enter a number.',
  rangeError: 'Please enter a value between {min} and {max}.',
  required: 'This field is required.',
  emailFormat: 'Please check the email format.',
  selectOne: 'Please select one option.',
  selectAtLeastOne: 'Please select at least one option.',
  noneExclusive: 'If you select "None", please select it alone.',
  checkInput: 'Please check your input.',

  submitSuccess: 'Submitted successfully. Reference number: {id}',
  submitFail: 'Submission failed: {error}',

  notEntered: '(not entered)',

  steps: {
    last_name:      { label: 'Last Name', title: 'Q1. Last Name', desc: 'Please enter your last name.', placeholder: 'e.g. Johnson' },
    first_name:     { label: 'First Name', title: 'Q2. First Name', desc: 'Please enter your first name.', placeholder: 'e.g. Sarah' },
    last_name_kana: { label: 'Last Name (Phonetic)', title: 'Q3. Last Name (Phonetic)', desc: 'How is your last name pronounced? (Alphabet is fine)', placeholder: 'e.g. Johnson' },
    first_name_kana:{ label: 'First Name (Phonetic)', title: 'Q4. First Name (Phonetic)', desc: 'How is your first name pronounced? (Alphabet is fine)', placeholder: 'e.g. Sarah' },
    email:          { label: 'Email', title: 'Q5. Email Address', desc: 'Please enter your email address.', placeholder: 'e.g. example@lveda.jp' },
    vitality_1_10:  { label: 'Vitality Level (1\u201310)', title: 'Q6. Vitality Level (1\u201310)', desc: '1 = lowest, 10 = highest.', placeholder: 'e.g. 7' },
    digestive_rhythm:{ label: 'Digestive Rhythm (Past 48h)', title: 'Q7. Digestive Rhythm (Past 48 Hours)', desc: 'Choose the one that best describes you.', options: ['Heavy', 'Irregular', 'Sharp', 'Stable'] },
    sleep_quality:  { label: 'Sleep Quality', title: 'Q8. Sleep Quality', desc: 'Select all that apply (at least one).', options: ['Difficulty falling asleep', 'Night awakening', 'Not refreshed upon waking', 'Restful sleep'] },
    tension_areas:  { label: 'Areas of Tension', title: 'Q9. Areas of Tension or Tightness', desc: 'Select all that apply (at least one).', options: ['Neck', 'Shoulders', 'Lower Back', 'Jaw', 'Eyes', 'Hips', 'Other'] },
    skin_condition: { label: 'Skin Condition', title: 'Q10. Skin Condition', desc: 'Choose the one that best describes you.', options: ['Dry', 'Warm / Sensitive', 'Oily', 'Balanced'] },
    mental_state:   { label: 'Current Mental State', title: 'Q11. Current Mental State', desc: 'Choose the one that best describes you.', options: ['Wind (Vata) \u2014 Restless / Anxious', 'Fire (Pitta) \u2014 Focused / Irritable', 'Mist (Kapha) \u2014 Heavy / Low Motivation'] },
    sensory_sensitivity: { label: 'Sensory Sensitivity', title: 'Q12. Sensory Sensitivity', desc: 'Select all that apply. If "None", select it alone.', options: ['Sound', 'Light', 'Temperature', 'Touch Pressure', 'None'] },
    let_go_text:    { label: 'What to Let Go', title: 'Q13. What Would You Like to Let Go Of?', desc: 'Even a short answer is fine. Write freely.', placeholder: 'e.g. Work tension, mental fog' },
    invite_in:      { label: 'How to Feel After', title: 'Q14. How Would You Like to Feel After the Session?', desc: 'Select all that apply (at least one).', options: ['Clarity', 'Grounded', 'Vitality', 'Deep Relaxation', 'Inner Silence'] },
    communication_preference: { label: 'Communication During Session', title: 'Q15. Communication Preference During Treatment', desc: 'Choose the one that best describes you.', options: ['Complete silence', 'Gentle guidance', 'Occasional check-in'] },
    allergies_text: { label: 'Allergies', title: 'Q16. Allergies', desc: 'If none, please write "None".', placeholder: 'e.g. Sesame, nuts, fragrances / None' },
    medical_history_text: { label: 'Medical History', title: 'Q17. Medical History & Health Notes', desc: 'If none, please write "None".', placeholder: 'e.g. High blood pressure, back pain, medication / None' },
    female_condition: { label: 'Female Health (if applicable)', title: 'Q18. Female Health (if applicable)', desc: 'Select "Not applicable" if this does not apply.', options: ['Menstruating', 'Possible pregnancy', 'Not applicable'] },
    __preview__: { label: 'Review', title: 'Review Your Answers', desc: 'If everything looks correct, press "Submit". To make changes, press "Edit".' },
  },
}


// ---- 中文 ----

const zh: Translations = {
  pageTitle: '阿育吠陀疗程确认表',
  pageSubtitle: '您的回答将帮助我们为您准备最佳的疗程。如有需要，回答将通过AI翻译供理疗师参考。',
  questionOf: '问题 {current} / {total}',
  confirmOf: '确认 / {total}',
  remaining: '剩余 {n}',
  remainingZero: '剩余 0',
  next: '下一步',
  toConfirm: '确认',
  submit: '提交',
  back: '返回',
  edit: '修改',
  footerNote: '※为确保安全，请尽量详细填写过敏和既往病史相关项目。',
  submitting: '提交中...',

  enterNumber: '请输入数字。',
  rangeError: '请输入{min}到{max}之间的数值。',
  required: '请填写此项。',
  emailFormat: '请检查邮箱格式。',
  selectOne: '请选择一项。',
  selectAtLeastOne: '请至少选择一项。',
  noneExclusive: '如果选择"无"，请单独选择。',
  checkInput: '请检查输入内容。',

  submitSuccess: '提交成功。受理编号：{id}',
  submitFail: '提交失败：{error}',

  notEntered: '（未填写）',

  steps: {
    last_name:      { label: '姓', title: 'Q1. 姓', desc: '请输入您的姓。', placeholder: '例：王' },
    first_name:     { label: '名', title: 'Q2. 名', desc: '请输入您的名。', placeholder: '例：小明' },
    last_name_kana: { label: '姓（读音）', title: 'Q3. 姓（读音）', desc: '请用拼音或字母填写。', placeholder: '例：Wang' },
    first_name_kana:{ label: '名（读音）', title: 'Q4. 名（读音）', desc: '请用拼音或字母填写。', placeholder: '例：Xiaoming' },
    email:          { label: '邮箱', title: 'Q5. 邮箱地址', desc: '请输入您的邮箱地址。', placeholder: '例：example@lveda.jp' },
    vitality_1_10:  { label: '活力水平（1〜10）', title: 'Q6. 活力水平（1〜10）', desc: '1为最低，10为最高。', placeholder: '例：7' },
    digestive_rhythm:{ label: '消化节律（过去48小时）', title: 'Q7. 过去48小时的消化节律', desc: '请选择最符合您情况的一项。', options: ['沉重', '不规律', '偏强', '稳定'] },
    sleep_quality:  { label: '睡眠状况', title: 'Q8. 睡眠状况', desc: '可多选（至少选一项）。', options: ['入睡困难', '夜间易醒', '醒来不清爽', '睡眠良好'] },
    tension_areas:  { label: '紧张/僵硬部位', title: 'Q9. 紧张或僵硬的部位', desc: '可多选（至少选一项）。', options: ['颈部', '肩部', '腰部', '下颚', '眼部', '髋部', '其他'] },
    skin_condition: { label: '皮肤状态', title: 'Q10. 皮肤状态', desc: '请选择最符合您情况的一项。', options: ['干燥', '偏热/敏感', '偏油', '平衡'] },
    mental_state:   { label: '当前精神状态', title: 'Q11. 当前精神状态', desc: '请选择最符合您情况的一项。', options: ['风型（Vata）\u2014 不安/焦虑', '火型（Pitta）\u2014 专注/易怒', '水型（Kapha）\u2014 沉重/缺乏动力'] },
    sensory_sensitivity: { label: '感觉敏感', title: 'Q12. 对哪些刺激比较敏感', desc: '可多选。如选"无"请单独选择。', options: ['声音', '光线', '温度', '触压', '无'] },
    let_go_text:    { label: '想要放下的事', title: 'Q13. 您想放下什么？', desc: '简短回答即可，请自由填写。', placeholder: '例：工作压力、头脑中的杂念' },
    invite_in:      { label: '疗程后期望的感受', title: 'Q14. 疗程后您希望有什么感觉？', desc: '可多选（至少选一项）。', options: ['清晰', '脚踏实地', '活力', '深度放松', '内心宁静'] },
    communication_preference: { label: '疗程中的沟通偏好', title: 'Q15. 疗程中的沟通偏好', desc: '请选择最符合您的一项。', options: ['希望完全安静', '希望有温柔的引导', '只需偶尔确认'] },
    allergies_text: { label: '过敏', title: 'Q16. 过敏', desc: '如果没有，请填写"无"。', placeholder: '例：芝麻、坚果、香料 / 无' },
    medical_history_text: { label: '既往病史', title: 'Q17. 既往病史及健康注意事项', desc: '如果没有，请填写"无"。', placeholder: '例：高血压、腰痛、正在服药 / 无' },
    female_condition: { label: '女性健康（如适用）', title: 'Q18. 女性健康（如适用）', desc: '如不适用请选择"不适用"。', options: ['生理期', '可能怀孕', '不适用'] },
    __preview__: { label: '预览', title: '确认填写内容', desc: '如果确认无误请点击"提交"。如需修改请点击"修改"。' },
  },
}


// ---- Export ----

const translations: Record<Lang, Translations> = { ja, en, zh }

export function getTranslations(lang: Lang): Translations {
  return translations[lang] || translations.ja
}

/**
 * 選択肢のローカライズ値 → 送信用の内部値へのリバースマッピング
 * バックエンドは常に日本語の選択肢値を期待するので、
 * en/zh の選択肢を ja の選択肢に変換して送信する必要がある
 */
export function buildOptionReverseMap(lang: Lang): Record<string, Record<string, string>> {
  if (lang === 'ja') return {} // 日本語はそのまま

  const jaSteps = translations.ja.steps
  const localSteps = translations[lang].steps
  const map: Record<string, Record<string, string>> = {}

  for (const key of Object.keys(jaSteps)) {
    const jaOpts = jaSteps[key].options
    const localOpts = localSteps[key]?.options
    if (jaOpts && localOpts && jaOpts.length === localOpts.length) {
      map[key] = {}
      for (let i = 0; i < localOpts.length; i++) {
        map[key][localOpts[i]] = jaOpts[i]
      }
    }
  }

  return map
  }
