import { useCallback, useEffect, useMemo, useState } from 'react'
import { Armchair, ArrowRight, BellRing, Check, Clock3, LayoutGrid, LogOut, Plus, Send, Users, X } from 'lucide-react'
import { supabase } from './supabaseClient'

const statuses = {
  free: { label: 'Свободен', filter: 'Свободные', color: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500', border: 'border-emerald-400' },
  occupied: { label: 'Занят', filter: 'Занятые', color: 'bg-rose-50 text-rose-700', dot: 'bg-rose-500', border: 'border-rose-400' },
  reserved: { label: 'Бронь', filter: 'Бронь', color: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500', border: 'border-amber-400' },
}

const button = 'inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700'
const input = 'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100'

function formatTime(value) {
  return value ? new Intl.DateTimeFormat('ru-RU', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)) : 'Нет данных'
}

function Brand() {
  return <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white"><LayoutGrid size={21} /></div><div><div className="text-lg font-bold tracking-tight text-slate-900">TableFlow</div><div className="text-xs text-slate-400">Управление столиками</div></div></div>
}

function Auth({ notify }) {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    const result = mode === 'login'
      ? await supabase.auth.signInWithPassword({ email: email.trim(), password })
      : await supabase.auth.signUp({ email: email.trim(), password })
    setBusy(false)
    if (result.error) {
      notify(`Ошибка авторизации: ${result.error.message}`, true)
    } else if (mode === 'signup' && !result.data.session) {
      notify('Проверьте почту и подтвердите регистрацию, затем войдите.')
    }
  }

  return <main className="flex min-h-screen items-center justify-center bg-slate-50 p-5">
    <div className="w-full max-w-md">
      <div className="mb-9 flex justify-center"><Brand /></div>
      <div className="rounded-3xl border border-slate-100 bg-white p-8 shadow-xl shadow-slate-200/60">
        <h1 className="text-2xl font-bold text-slate-900">Добро пожаловать</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">Все столики вашего ресторана под контролем.</p>
        <div className="mt-7 flex rounded-xl bg-slate-100 p-1">
          {[['login', 'Вход'], ['signup', 'Регистрация']].map(([value, label]) => <button key={value} type="button" onClick={() => setMode(value)} className={`flex-1 rounded-lg py-2 text-sm font-semibold ${mode === value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>{label}</button>)}
        </div>
        <form className="mt-6 space-y-4" onSubmit={submit}>
          <label className="block text-sm font-medium text-slate-700">Электронная почта<input className={`${input} mt-2`} type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" /></label>
          <label className="block text-sm font-medium text-slate-700">Пароль<input className={`${input} mt-2`} type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required minLength={mode === 'signup' ? 6 : undefined} value={password} onChange={(e) => setPassword(e.target.value)} placeholder={mode === 'signup' ? 'Не менее 6 символов' : 'Введите пароль'} /></label>
          <button className={`${button} mt-2 w-full py-3`} disabled={busy}>{busy ? 'Подождите…' : mode === 'login' ? 'Войти' : 'Зарегистрироваться'} <ArrowRight size={16} /></button>
        </form>
      </div>
      <p className="mt-6 text-center text-xs text-slate-400">Удобное управление залом ресторана</p>
    </div>
  </main>
}

function TableCard({ table, busy, onStatus }) {
  const status = statuses[table.status]
  return <article className={`rounded-2xl border border-slate-200 border-t-4 ${status?.border || 'border-t-slate-400'} bg-white p-5 shadow-sm`}>
    <div className="flex items-start justify-between gap-3">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-600"><Armchair size={21} /></div>
      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${status?.color || 'bg-slate-100 text-slate-600'}`}><span className={`h-1.5 w-1.5 rounded-full ${status?.dot || 'bg-slate-400'}`} />{status?.label || 'Неизвестный статус'}</span>
    </div>
    <h3 className="mt-5 break-words text-lg font-bold text-slate-900">{table.table_number}</h3>
    <div className="mt-2 flex items-center gap-2 text-sm text-slate-500"><Users size={15} /> Мест: {table.seats}</div>
    <div className="mt-2 flex items-center gap-2 text-xs text-slate-400"><Clock3 size={14} /> Обновлено: {formatTime(table.updated_at)}</div>
    <div className="mt-5 border-t border-slate-100 pt-4"><p className="mb-2 text-xs font-medium text-slate-400">Изменить статус</p><div className="grid grid-cols-3 gap-1.5">{Object.entries(statuses).map(([value, option]) => <button key={value} type="button" disabled={busy || table.status === value} onClick={() => onStatus(table, value)} className={`rounded-lg px-1 py-2 text-xs font-semibold transition ${table.status === value ? option.color : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}>{option.label}</button>)}</div></div>
  </article>
}

function AccessGate({ session, notify }) {
  const [access, setAccess] = useState('loading')
  const [errorMessage, setErrorMessage] = useState('')

  const checkAccess = useCallback(() => {
    return supabase.from('profiles').upsert(
      { id: session.user.id, email: session.user.email, last_active: new Date().toISOString() },
      { onConflict: 'id' },
    ).then(async ({ error: profileError }) => {
      if (profileError) {
        setErrorMessage(`Не удалось обновить профиль: ${profileError.message}`)
        setAccess('error')
        return
      }
      const { data, error } = await supabase.from('staff_approvals')
        .select('user_id').eq('user_id', session.user.id).maybeSingle()
      if (error) {
        setErrorMessage(`Не удалось проверить доступ: ${error.message}`)
        setAccess('error')
      } else {
        setAccess(data ? 'approved' : 'pending')
      }
    })
  }, [session.user.id, session.user.email])

  useEffect(() => {
    checkAccess()
  }, [checkAccess])

  async function signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) notify(`Не удалось выйти: ${error.message}`, true)
  }

  if (access === 'approved') return <Dashboard session={session} notify={notify} />
  return <main className="flex min-h-screen items-center justify-center bg-slate-50 p-5"><div className="w-full max-w-md rounded-3xl border border-slate-100 bg-white p-8 shadow-xl shadow-slate-200/60">
    <Brand />
    <h1 className="mt-8 text-2xl font-bold">{access === 'loading' ? 'Проверяем доступ…' : access === 'pending' ? 'Ожидание подтверждения' : 'Ошибка проверки доступа'}</h1>
    <p className="mt-3 text-sm leading-6 text-slate-500">{access === 'pending' ? 'Администратор должен подтвердить, что вы сотрудник. После подтверждения обновите статус доступа.' : access === 'error' ? errorMessage : 'Пожалуйста, подождите.'}</p>
    {access !== 'loading' && <div className="mt-6 flex gap-3"><button type="button" className={button} onClick={checkAccess}>Проверить снова</button><button type="button" onClick={signOut} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600">Выйти</button></div>}
  </div></main>
}

function Dashboard({ session, notify }) {
  const [tables, setTables] = useState([])
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [tablesError, setTablesError] = useState('')
  const [logsError, setLogsError] = useState('')
  const [filter, setFilter] = useState('all')
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [seats, setSeats] = useState('2')
  const [pendingTable, setPendingTable] = useState(null)
  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState(false)

  const loadTables = useCallback(() => {
    return supabase.from('restaurant_tables').select('*').order('id').then(({ data, error }) => {
      if (error) { setTablesError(error.message); notify(`Не удалось загрузить столики: ${error.message}`, true) }
      else { setTablesError(''); setTables(data) }
      setLoading(false)
    })
  }, [notify])

  const loadLogs = useCallback(() => {
    return supabase.from('activity_logs').select('*').order('created_at', { ascending: false }).limit(20).then(({ data, error }) => {
      if (error) { setLogsError(error.message); notify(`Не удалось загрузить журнал: ${error.message}`, true) }
      else { setLogsError(''); setLogs(data) }
    })
  }, [notify])

  useEffect(() => {
    const channel = supabase.channel(`dashboard-${session.user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'restaurant_tables' }, () => loadTables())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'activity_logs' }, () => loadLogs())
      .subscribe((state) => {
        if (state === 'SUBSCRIBED') { loadTables(); loadLogs() }
        if (state === 'CHANNEL_ERROR' || state === 'TIMED_OUT') notify('Нет подключения к обновлениям в реальном времени. Обновите страницу.', true)
      })
    loadTables()
    loadLogs()
    return () => { supabase.removeChannel(channel) }
  }, [session.user.id, loadTables, loadLogs, notify])

  const counts = useMemo(() => ({
    free: tables.filter((t) => t.status === 'free').length,
    occupied: tables.filter((t) => t.status === 'occupied').length,
    reserved: tables.filter((t) => t.status === 'reserved').length,
  }), [tables])
  const visible = filter === 'all' ? tables : tables.filter((t) => t.status === filter)

  async function addTable(event) {
    event.preventDefault()
    const number = name.trim()
    const capacity = Number(seats)
    if (!number || !Number.isInteger(capacity) || capacity < 1) { notify('Укажите название и положительное число мест.', true); return }
    setSaving(true)
    const { error } = await supabase.from('restaurant_tables').insert({ table_number: number, seats: capacity, status: 'free', updated_at: new Date().toISOString(), updated_by: session.user.id })
    setSaving(false)
    if (error) notify(`Не удалось добавить столик: ${error.message}`, true)
    else { setName(''); setSeats('2'); setAdding(false); notify('Столик добавлен'); await loadTables() }
  }

  async function changeStatus(table, status) {
    setPendingTable(table.id)
    const { data, error } = await supabase.from('restaurant_tables').update({ status, updated_at: new Date().toISOString(), updated_by: session.user.id }).eq('id', table.id).select('id').maybeSingle()
    if (error || !data) {
      notify(`Не удалось изменить статус: ${error?.message || 'столик недоступен'}`, true)
    } else {
      notify('Статус столика обновлён')
      await Promise.all([loadTables(), loadLogs()])
    }
    setPendingTable(null)
  }

  async function sendSummary() {
    setSending(true)
    const { data, error } = await supabase.functions.invoke('telegram-summary')
    setSending(false)
    if (error) {
      let detail = error.message
      if (error.context instanceof Response) {
        const body = await error.context.json().catch(() => null)
        if (body?.error) detail = body.error
      }
      notify(`Не удалось отправить сводку: ${detail}`, true)
    } else if (data?.warning) {
      notify(`Сводка отправлена, но запись в журнал не добавлена: ${data.warning}`, true)
      await loadLogs()
    } else if (data?.sent === true) {
      notify('Сводка отправлена в чат менеджеров')
      await loadLogs()
    } else {
      notify('Не удалось подтвердить отправку сводки.', true)
    }
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) notify(`Не удалось выйти: ${error.message}`, true)
  }

  return <div className="min-h-screen bg-slate-50 text-slate-900">
    <header className="border-b border-slate-200 bg-white"><div className="mx-auto flex max-w-[1500px] flex-wrap items-center justify-between gap-5 px-5 py-4 sm:px-8"><Brand /><div className="flex items-center gap-4"><span className="max-w-[180px] truncate text-sm text-slate-500 sm:max-w-none">{session.user.email}</span><button type="button" onClick={signOut} className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"><LogOut size={16} /> Выйти</button></div></div></header>
    <main className="mx-auto max-w-[1500px] px-5 py-8 sm:px-8">
      <div className="mb-7"><div className="text-sm font-semibold text-indigo-600">Рабочее пространство</div><h1 className="mt-1 text-3xl font-bold tracking-tight">Обзор зала</h1><p className="mt-2 text-sm text-slate-500">Следите за столиками и управляйте посадкой гостей.</p></div>
      <section aria-label="Статистика столиков" className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[['Всего столиков', tables.length, 'bg-indigo-100 text-indigo-600'], ['Свободно', counts.free, 'bg-emerald-100 text-emerald-600'], ['Занято', counts.occupied, 'bg-rose-100 text-rose-600'], ['Бронь', counts.reserved, 'bg-amber-100 text-amber-600']].map(([label, count, color]) => <div key={label} className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className={`flex h-11 w-11 items-center justify-center rounded-xl ${color}`}><Armchair size={20} /></div><div><div className="text-xs font-medium text-slate-500">{label}</div><div className="mt-1 text-2xl font-bold">{loading || tablesError ? '—' : count}</div></div></div>)}
      </section>
      <div className="grid items-start gap-7 lg:grid-cols-3">
        <section className="lg:col-span-2"><div className="mb-5 flex flex-wrap items-center justify-between gap-4"><div><h2 className="text-xl font-bold">Столики</h2><p className="mt-1 text-sm text-slate-500">Управляйте статусами в один клик</p></div><button type="button" className={button} onClick={() => setAdding(!adding)}><Plus size={17} /> Добавить столик</button></div>
          {adding && <form onSubmit={addTable} className="mb-5 rounded-2xl border border-indigo-100 bg-white p-5 shadow-sm"><div className="mb-4 flex justify-between"><h3 className="font-bold">Новый столик</h3><button type="button" aria-label="Закрыть форму" onClick={() => setAdding(false)}><X size={18} /></button></div><div className="grid gap-3 sm:grid-cols-2"><label className="text-sm text-slate-600">Название или номер<input className={`${input} mt-1`} value={name} onChange={(e) => setName(e.target.value)} required placeholder="Например, Стол №1 (у окна)" /></label><label className="text-sm text-slate-600">Количество мест<input className={`${input} mt-1`} type="number" min="1" step="1" required value={seats} onChange={(e) => setSeats(e.target.value)} /></label></div><button className={`${button} mt-4`} disabled={saving}>Добавить</button></form>}
          <div className="mb-5 flex flex-wrap gap-2">{[['all', 'Все'], ...Object.entries(statuses).map(([key, value]) => [key, value.filter])].map(([key, label]) => <button key={key} type="button" onClick={() => setFilter(key)} className={`rounded-xl px-4 py-2 text-sm font-semibold ${filter === key ? 'bg-slate-900 text-white' : 'bg-white text-slate-500 hover:bg-slate-100'}`}>{label}</button>)}</div>
          {loading ? <p className="py-12 text-center text-sm text-slate-500">Загрузка столиков…</p> : tablesError ? <div className="rounded-2xl border border-rose-200 bg-white p-6 text-sm text-rose-700">Не удалось загрузить столики: {tablesError} <button type="button" className="font-bold underline" onClick={loadTables}>Повторить</button></div> : visible.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center text-sm text-slate-500">Столиков пока нет. Добавьте столик или измените фильтр.</div> : <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{visible.map((table) => <TableCard key={table.id} table={table} busy={pendingTable !== null} onStatus={changeStatus} />)}</div>}
        </section>
        <aside className="space-y-5"><div className="rounded-2xl bg-indigo-600 p-6 text-white shadow-lg shadow-indigo-200"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15"><Send size={20} /></div><h2 className="mt-4 text-lg font-bold">Команда всегда в курсе</h2><p className="mt-2 text-sm leading-6 text-indigo-100">Отправьте актуальную сводку о свободных столиках в чат менеджеров.</p><button type="button" onClick={sendSummary} disabled={sending} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-indigo-700 hover:bg-indigo-50"><Send size={16} /> {sending ? 'Отправка…' : 'Отправить сводку в Telegram'}</button></div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex items-center justify-between"><div><h2 className="text-lg font-bold">Журнал активности</h2><p className="mt-1 text-xs text-slate-400">Последние 20 событий</p></div><BellRing size={19} className="text-slate-400" /></div><div className="mt-5 space-y-5">{logsError ? <p className="text-sm text-rose-700">Не удалось загрузить журнал: {logsError} <button type="button" className="font-bold underline" onClick={loadLogs}>Повторить</button></p> : logs.length === 0 ? <p className="text-sm text-slate-400">Событий пока нет.</p> : logs.map((log) => <div key={log.id} className="flex gap-3"><div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-500"><Check size={15} /></div><div className="min-w-0"><p className="break-words text-sm font-medium text-slate-700">{log.action}</p><p className="mt-1 break-words text-xs text-slate-400">{log.user_email} · {formatTime(log.created_at)}</p></div></div>)}</div></div>
        </aside>
      </div>
    </main>
  </div>
}

function App() {
  const [session, setSession] = useState(null)
  const [ready, setReady] = useState(false)
  const [notice, setNotice] = useState(null)
  const notify = useCallback((message, error = false) => setNotice({ message, error }), [])

  useEffect(() => {
    let active = true
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (active) { setSession(nextSession); setReady(true) }
    })
    supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return
      if (error) notify(`Не удалось восстановить сессию: ${error.message}`, true)
      else setSession(data.session)
      setReady(true)
    })
    return () => { active = false; subscription.unsubscribe() }
  }, [notify])

  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => setNotice(null), 6500)
    return () => clearTimeout(timer)
  }, [notice])

  return <>{!ready ? <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-500">Загрузка…</div> : session ? <AccessGate key={session.user.id} session={session} notify={notify} /> : <Auth notify={notify} />}{notice && <div role={notice.error ? 'alert' : 'status'} className={`fixed bottom-5 right-5 z-50 max-w-sm rounded-xl px-5 py-4 text-sm font-medium text-white shadow-xl ${notice.error ? 'bg-rose-700' : 'bg-slate-900'}`}>{notice.message}</div>}</>
}

export default App
