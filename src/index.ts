import { Hono } from 'hono'

type Bindings = {
  DB: D1Database
}

type Todo = {
  id: number
  text: string
  done: number
  created_at: string
}

const app = new Hono<{ Bindings: Bindings }>()

// ── API routes ──────────────────────────────────────────────────────────────

app.get('/api/todos', async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM todos ORDER BY created_at DESC'
  ).all<Todo>()
  return c.json(results)
})

app.post('/api/todos', async (c) => {
  const { text } = await c.req.json<{ text: string }>()
  if (!text?.trim()) return c.json({ error: 'text is required' }, 400)
  const result = await c.env.DB.prepare(
    'INSERT INTO todos (text) VALUES (?) RETURNING *'
  ).bind(text.trim()).first<Todo>()
  return c.json(result, 201)
})

app.patch('/api/todos/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const result = await c.env.DB.prepare(
    'UPDATE todos SET done = ((done | 1) - (done & 1)) WHERE id = ? RETURNING *'
  ).bind(id).first<Todo>()
  if (!result) return c.json({ error: 'not found' }, 404)
  return c.json(result)
})

app.delete('/api/todos/:id', async (c) => {
  const id = Number(c.req.param('id'))
  await c.env.DB.prepare('DELETE FROM todos WHERE id = ?').bind(id).run()
  return c.body(null, 204)
})

// ── HTML UI ─────────────────────────────────────────────────────────────────

app.get('/', (c) => {
  return c.html(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Todo List</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #f5f5f5;
      min-height: 100vh;
      display: flex;
      justify-content: center;
      padding: 2rem 1rem;
    }
    .container { width: 100%; max-width: 520px; }
    h1 { font-size: 1.75rem; font-weight: 700; margin-bottom: 1.25rem; color: #1a1a1a; }
    .input-row {
      display: flex; gap: 0.5rem; margin-bottom: 1.25rem;
    }
    input {
      flex: 1; padding: 0.625rem 0.875rem; border: 1px solid #d1d5db;
      border-radius: 6px; font-size: 1rem; outline: none;
    }
    input:focus { border-color: #6366f1; box-shadow: 0 0 0 2px #e0e7ff; }
    button.add {
      padding: 0.625rem 1rem; background: #6366f1; color: #fff;
      border: none; border-radius: 6px; font-size: 1rem; cursor: pointer;
      white-space: nowrap;
    }
    button.add:hover { background: #4f46e5; }
    ul { list-style: none; display: flex; flex-direction: column; gap: 0.5rem; }
    li {
      display: flex; align-items: center; gap: 0.75rem;
      background: #fff; padding: 0.75rem 1rem;
      border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.07);
    }
    li.done span { text-decoration: line-through; color: #9ca3af; }
    li span { flex: 1; font-size: 0.975rem; color: #1a1a1a; }
    li button {
      border: none; background: none; cursor: pointer; font-size: 1.1rem;
      padding: 0.2rem 0.3rem; border-radius: 4px; line-height: 1;
    }
    li button:hover { background: #f3f4f6; }
    .empty { text-align: center; color: #9ca3af; padding: 2rem 0; font-size: 0.95rem; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Todo List</h1>
    <div class="input-row">
      <input id="input" type="text" placeholder="What needs to be done?" />
      <button class="add" onclick="addTodo()">Add</button>
    </div>
    <ul id="list"></ul>
    <p class="empty" id="empty" style="display:none">No todos yet. Add one above!</p>
  </div>
  <script>
    async function load() {
      const todos = await fetch('/api/todos').then(r => r.json())
      render(todos)
    }

    async function addTodo() {
      const input = document.getElementById('input')
      const text = input.value.trim()
      if (!text) return
      await fetch('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      })
      input.value = ''
      load()
    }

    async function toggleTodo(id) {
      await fetch('/api/todos/' + id, { method: 'PATCH' })
      load()
    }

    async function deleteTodo(id) {
      await fetch('/api/todos/' + id, { method: 'DELETE' })
      load()
    }

    function render(todos) {
      const list = document.getElementById('list')
      const empty = document.getElementById('empty')
      if (!todos.length) { list.innerHTML = ''; empty.style.display = ''; return }
      empty.style.display = 'none'
      list.innerHTML = todos.map(t => \`
        <li class="\${t.done ? 'done' : ''}">
          <span>\${escape(t.text)}</span>
          <button onclick="toggleTodo(\${t.id})" title="\${t.done ? 'Undo' : 'Done'}">\${t.done ? '↩' : '✓'}</button>
          <button onclick="deleteTodo(\${t.id})" title="Delete">✕</button>
        </li>
      \`).join('')
    }

    function escape(str) {
      return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
                .replace(/"/g,'&quot;').replace(/'/g,'&#039;')
    }

    document.getElementById('input').addEventListener('keydown', e => {
      if (e.key === 'Enter') addTodo()
    })

    load()
  </script>
</body>
</html>`)
})

export default app
