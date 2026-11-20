import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function respond(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (request.method !== 'POST') return respond({ error: 'Метод не поддерживается.' }, 405)

  const url = Deno.env.get('SUPABASE_URL')
  const key = Deno.env.get('SUPABASE_ANON_KEY')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const token = Deno.env.get('TELEGRAM_BOT_TOKEN')
  const chatId = Deno.env.get('TELEGRAM_CHAT_ID')
  const authorization = request.headers.get('Authorization')
  if (!url || !key || !serviceKey || !token || !chatId) return respond({ error: 'Серверная функция не настроена.' }, 500)
  if (!authorization) return respond({ error: 'Необходима авторизация.' }, 401)

  try {
    const client = createClient(url, key, { global: { headers: { Authorization: authorization } } })
    const { data: { user }, error: authError } = await client.auth.getUser()
    if (authError || !user?.email) return respond({ error: 'Необходима действующая сессия.' }, 401)

    const { data: approval, error: approvalError } = await client.from('staff_approvals')
      .select('user_id').eq('user_id', user.id).maybeSingle()
    if (approvalError) return respond({ error: 'Не удалось проверить доступ сотрудника.' }, 500)
    if (!approval) return respond({ error: 'Доступ сотрудника не подтверждён.' }, 403)

    const { count, error: countError } = await client.from('restaurant_tables')
      .select('id', { count: 'exact', head: true }).eq('status', 'free')
    if (countError || count === null) return respond({ error: 'Не удалось получить количество свободных столиков.' }, 500)

    const text = `Сводка TableFlow\nСвободных столиков: ${count}`
    const telegramResponse = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
    })
    const telegramResult = await telegramResponse.json()
    if (!telegramResponse.ok || !telegramResult.ok) return respond({ error: 'Telegram отклонил сообщение. Проверьте настройки бота и чата.' }, 502)

    const admin = createClient(url, serviceKey, { auth: { persistSession: false } })
    const { error: logError } = await admin.from('activity_logs').insert({
      table_id: null,
      action: `Сводка отправлена в Telegram: свободных столиков — ${count}`,
      user_email: user.email,
    })
    if (logError) return respond({ sent: true, warning: logError.message })
    return respond({ sent: true })
  } catch (error) {
    console.error('Ошибка отправки сводки:', error instanceof Error ? error.name : 'неизвестная ошибка')
    return respond({ error: 'Ошибка связи с сервером отправки.' }, 500)
  }
})
