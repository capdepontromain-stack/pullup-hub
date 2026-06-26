// =============================================
// PULL UP HUB — Supabase Client
// =============================================

const SUPABASE_URL = 'https://vincxrmtfjbenlzhjwby.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZpbmN4cm10ZmpiZW5semhqd2J5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIyOTI1MTksImV4cCI6MjA5Nzg2ODUxOX0.M9_ChGDlOIUKKZtbBHs1xn4cdy4FwUAQKN0aYyXefQY';

const { createClient } = supabase;
const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    storage: window.localStorage
  }
});

// =============================================
// AUTH
// =============================================
let currentUser = null;
let currentProfile = null;

async function signIn(email, password) {
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

async function signOut() {
  await sb.auth.signOut();
  currentUser = null;
  currentProfile = null;
  showLoginScreen();
}

async function loadProfile(userId) {
  const { data } = await sb.from('profiles').select('*').eq('id', userId).single();
  return data;
}

// =============================================
// EVENTS
// =============================================
async function fetchEvents() {
  const { data, error } = await sb.from('events').select('*').order('event_date', { ascending: true });
  if (error) { console.error(error); return []; }
  return data;
}

async function createEvent(ev) {
  const { data, error } = await sb.from('events').insert([ev]).select().single();
  if (error) throw error;
  return data;
}

async function updateEvent(id, updates) {
  const { data, error } = await sb.from('events').update({ ...updates, updated_at: new Date() }).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

async function deleteEvent(id) {
  const { error } = await sb.from('events').delete().eq('id', id);
  if (error) throw error;
}

// =============================================
// TASKS
// =============================================
async function fetchTasks() {
  const { data, error } = await sb.from('tasks').select('*').order('created_at', { ascending: false });
  if (error) { console.error(error); return []; }
  return data;
}

async function createTask(task) {
  const { data, error } = await sb.from('tasks').insert([task]).select().single();
  if (error) throw error;
  return data;
}

async function updateTaskStatus(id, status) {
  const { data, error } = await sb.from('tasks').update({ status, updated_at: new Date() }).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

async function deleteTask(id) {
  const { error } = await sb.from('tasks').delete().eq('id', id);
  if (error) throw error;
}

// =============================================
// CLIENTS
// =============================================
async function fetchClients() {
  const { data, error } = await sb.from('clients').select('*').order('company');
  if (error) { console.error(error); return []; }
  return data;
}

async function createClient_(client) {
  const { data, error } = await sb.from('clients').insert([client]).select().single();
  if (error) throw error;
  return data;
}

async function updateClient(id, updates) {
  const { data, error } = await sb.from('clients').update({ ...updates, updated_at: new Date() }).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

// =============================================
// SUPPLIERS
// =============================================
async function fetchSuppliers() {
  const { data, error } = await sb.from('suppliers').select('*').order('name');
  if (error) { console.error(error); return []; }
  return data;
}

// =============================================
// MESSAGES
// =============================================
async function fetchMessages(channel = 'general') {
  const { data, error } = await sb.from('messages').select('*').eq('channel', channel).order('created_at', { ascending: true });
  if (error) { console.error(error); return []; }
  return data;
}

async function sendMessage(channel, content) {
  const { data, error } = await sb.from('messages').insert([{
    channel,
    content,
    author_id: currentUser.id,
    author_name: currentProfile?.name || currentUser.email
  }]).select().single();
  if (error) throw error;
  return data;
}

// Subscribe to real-time messages
function subscribeToMessages(channel, callback) {
  return sb.channel(`messages-${channel}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'messages',
      filter: `channel=eq.${channel}`
    }, payload => callback(payload.new))
    .subscribe();
}

function subscribeToTaskAssignments() {
  const myName = currentProfile?.name || '';
  if (!myName) return;
  sb.channel('tasks-assigned')
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'tasks'
    }, payload => {
      const task = payload.new;
      const assignee = (task.assignee || task.assignee_name || '');
      if (assignee.toLowerCase().includes(myName.toLowerCase())) {
        if (Notification.permission === 'granted') {
          const notif = new Notification('📋 Nouvelle tâche assignée', {
            body: task.title || task.name || 'Une tâche vous a été assignée',
            icon: '/logo-192.png',
            badge: '/logo-192.png',
            tag: 'task-' + task.id
          });
          notif.onclick = () => { window.focus(); showPage('tasks'); notif.close(); };
        }
      }
    })
    .subscribe();
}

// =============================================
// MILEAGE
// =============================================
async function fetchMileage() {
  const { data, error } = await sb.from('mileage').select('*').order('trip_date', { ascending: false });
  if (error) { console.error(error); return []; }
  return data;
}

async function createMileage(entry) {
  const km = parseFloat(entry.km) || 0;
  const rate = parseFloat(entry.rate) || 0.374;
  const amount = Math.round(km * rate * 100) / 100;
  const { data, error } = await sb.from('mileage').insert([{
    ...entry, km, rate, amount,
    user_name: entry.user_name || currentProfile?.name
  }]).select().single();
  if (error) throw error;
  return data;
}

async function createSupplier(s) {
  const { data, error } = await sb.from('suppliers').insert([s]).select().single();
  if (error) throw error;
  return data;
}

async function createInventoryItem(item) {
  const { data, error } = await sb.from('inventory').insert([item]).select().single();
  if (error) throw error;
  return data;
}

async function updateFinanceStatus(id, status) {
  const { error } = await sb.from('finances').update({ status }).eq('id', id);
  if (error) throw error;
  await loadAndRenderFinances();
  showToast('Statut mis à jour');
}

// =============================================
// FINANCES
// =============================================
async function fetchFinances() {
  const { data, error } = await sb.from('finances').select('*').order('invoice_date', { ascending: false });
  if (error) { console.error(error); return []; }
  return data;
}

async function createFinance(entry) {
  const { data, error } = await sb.from('finances').insert([entry]).select().single();
  if (error) throw error;
  return data;
}

async function fetchFinanceMonthly() {
  const { data, error } = await sb.from('finance_monthly').select('*').order('year').order('month');
  if (error) { console.error(error); return []; }
  return data;
}

async function upsertFinanceMonthly(year, month, field, value) {
  const num = parseFloat(value);
  const update = { year, month, [field]: isNaN(num) ? 0 : num };
  const { error } = await sb.from('finance_monthly').upsert(update, { onConflict: 'year,month' });
  if (error) throw error;
}

async function saveNewFacture(e) {
  e.preventDefault();
  const form = e.target;
  const data = {
    type: 'facture',
    client:       form.querySelector('[name=client]').value,
    amount:       parseFloat(form.querySelector('[name=amount]').value) || null,
    invoice_date: form.querySelector('[name=invoice_date]').value || null,
    status:       form.querySelector('[name=status]').value || 'En attente',
    notes:        form.querySelector('[name=notes]')?.value || null,
  };
  try {
    await createFinance(data);
    showToast('Facture ajoutée ✓');
    closeModal('newFacture');
    form.reset();
    const entries = await fetchFinances();
    renderFinances(entries);
  } catch(err) { showToast('Erreur : ' + err.message); }
}

async function saveNewDevis(e) {
  e.preventDefault();
  const form = e.target;
  const data = {
    type: 'devis',
    client:       form.querySelector('[name=client]').value,
    amount:       parseFloat(form.querySelector('[name=amount]').value) || null,
    invoice_date: form.querySelector('[name=invoice_date]').value || null,
    status:       form.querySelector('[name=status]').value || 'Envoyé',
    notes:        form.querySelector('[name=notes]')?.value || null,
  };
  try {
    await createFinance(data);
    showToast('Devis ajouté ✓');
    closeModal('newDevis');
    form.reset();
    const entries = await fetchFinances();
    renderFinances(entries);
  } catch(err) { showToast('Erreur : ' + err.message); }
}

async function deleteFinanceEntry(id) {
  if (!confirm('Supprimer cette entrée ?')) return;
  const { error } = await sb.from('finances').delete().eq('id', id);
  if (error) { showToast('Erreur : ' + error.message); return; }
  showToast('Supprimé ✓');
  const entries = await fetchFinances();
  renderFinances(entries);
}

// =============================================
// INVENTORY
// =============================================
async function fetchInventory() {
  const { data, error } = await sb.from('inventory').select('*').order('name');
  if (error) { console.error(error); return []; }
  return data;
}

// =============================================
// MAIL TEMPLATES
// =============================================
async function fetchMailTemplates() {
  const { data, error } = await sb.from('mail_templates').select('*').order('title');
  if (error) { console.error(error); return []; }
  return data;
}

// =============================================
// QUICK LINKS
// =============================================
async function fetchQuickLinks() {
  const { data, error } = await sb.from('quick_links').select('*').order('category');
  if (error) { console.error(error); return []; }
  return data;
}

// =============================================
// UI — RENDU DYNAMIQUE
// =============================================

// Render events table
// Génère une couleur pastel unique et reproductible à partir d'une chaîne
function clientColor(str) {
  if (!str) return { bg: 'transparent', border: 'transparent', text: 'inherit' };
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  const hue = Math.abs(hash) % 360;
  return {
    bg: `hsla(${hue},60%,55%,0.12)`,
    border: `hsla(${hue},60%,55%,0.5)`,
    text: `hsl(${hue},55%,70%)`
  };
}

function renderEventsTable(events) {
  const tbody = document.querySelector('#page-events .data-table tbody');
  if (!tbody) return;
  if (!events.length) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--text2);padding:2rem">Aucun événement — cliquez sur "+ Nouvel événement"</td></tr>';
    return;
  }
  tbody.innerHTML = events.map(ev => {
    const date = ev.event_date ? new Date(ev.event_date).toLocaleDateString('fr-FR') : '—';
    const c = clientColor(ev.client);
    return `<tr style="border-left:3px solid ${c.border};background:${c.bg}">
      <td onclick="openEventDetailById('${ev.id}')" style="cursor:pointer"><strong>${ev.name}</strong></td>
      <td><span style="color:${c.text};font-weight:600">${ev.client || '—'}</span></td>
      <td>${date}</td>
      <td>${ev.start_time ? ev.start_time.slice(0,5) : '—'}${ev.end_time ? ' → ' + ev.end_time.slice(0,5) : ''}</td>
      <td>${ev.location || '—'}</td>
      <td>${ev.participants || '—'}</td>
      <td>${ev.amount_ht ? ev.amount_ht.toLocaleString('fr-FR') + ' €' : '—'}</td>
      <td>
        <select onchange="updateEventStatus('${ev.id}', this.value, this)" data-prev="${ev.status}"
          style="background:var(--bg3);color:var(--text);border:1px solid var(--border);border-radius:6px;padding:4px 8px;font-size:.8rem;cursor:pointer">
          ${['En préparation','Confirmé','Terminé','Annulé','Supprimé'].map(s =>
            `<option ${ev.status===s?'selected':''}>${s}</option>`
          ).join('')}
        </select>
      </td>
    </tr>`;
  }).join('');
}

async function updateEventStatus(id, status, selectEl) {
  if (status === 'Supprimé') {
    const confirmed = confirm('Êtes-vous sûr de vouloir supprimer cet événement ?');
    if (!confirmed) {
      // Remettre le menu sur le statut précédent
      if (selectEl) {
        const prevStatus = selectEl.dataset.prev || 'En préparation';
        selectEl.value = prevStatus;
      }
      return;
    }
    const { error } = await sb.from('events').delete().eq('id', id);
    if (error) { showToast('Erreur : ' + error.message); return; }
    showToast('Événement supprimé ✓');
  } else {
    const { error } = await sb.from('events').update({ status }).eq('id', id);
    if (error) { showToast('Erreur : ' + error.message); return; }
    showToast('Statut mis à jour ✓');
  }
  await loadAndRenderEvents();
}

// Render kanban tasks
function renderKanban(tasks) {
  const members = ['Romain', 'Ketsia', 'Flora', 'Gloria'];
  const statusLabel = { todo: 'À faire', inprogress: 'En cours', waiting: 'En attente', done: 'Terminé' };
  const prioBadge = { 'Urgent': '#e74c3c', 'Normal': '#F5A623', 'Bas': '#3498db' };

  members.forEach(name => {
    const col = document.getElementById('tasks-' + name);
    const counter = document.getElementById('count-' + name);
    if (!col) return;
    col.innerHTML = '';

    const myTasks = tasks.filter(t => t.assignee_name === name);
    if (counter) counter.textContent = myTasks.filter(t => t.status !== 'done').length;

    if (!myTasks.length) {
      col.innerHTML = '<div class="ptask-empty">Aucune tâche</div>';
      return;
    }

    // Trier : actives d'abord, terminées en dernier
    const sorted = [...myTasks].sort((a, b) => {
      if (a.status === 'done' && b.status !== 'done') return 1;
      if (a.status !== 'done' && b.status === 'done') return -1;
      const prioOrder = { Urgent: 0, Normal: 1, Bas: 2 };
      return (prioOrder[a.priority] ?? 1) - (prioOrder[b.priority] ?? 1);
    });

    sorted.forEach(t => {
      const isDone = t.status === 'done';
      const card = document.createElement('div');
      card.className = 'ptask-card' + (isDone ? ' ptask-done' : '');
      card.style.cursor = 'pointer';
      const prioColor = prioBadge[t.priority] || prioBadge['Normal'];
      const dateStr = t.due_date ? new Date(t.due_date.split('-')).toLocaleDateString('fr-FR', {day:'numeric',month:'short'}) : '';
      card.innerHTML = `
        ${t.photo_url ? `<img src="${t.photo_url}" style="width:100%;height:120px;object-fit:cover;border-radius:8px;margin-bottom:.5rem;display:block">` : ''}
        <div class="ptask-top">
          <span style="font-size:10px;font-weight:700;color:${prioColor}">${t.priority || 'Normal'}</span>
          <div style="display:flex;gap:4px;align-items:center">
            ${dateStr ? `<span style="font-size:10px;color:var(--text3)">${dateStr}</span>` : ''}
            <button onclick="event.stopPropagation();quickDoneTask('${t.id}','${t.status}')"
              style="background:${isDone ? 'var(--success)' : 'transparent'};border:1px solid ${isDone ? 'var(--success)' : 'var(--border)'};border-radius:4px;color:${isDone ? '#000' : 'var(--text2)'};padding:1px 6px;cursor:pointer;font-size:.72rem">
              ${isDone ? '✓' : '○'}
            </button>
            <button onclick="event.stopPropagation();deleteTaskById('${t.id}')" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:.85rem;line-height:1">✕</button>
          </div>
        </div>
        <div class="ptask-title" style="${isDone ? 'text-decoration:line-through;color:var(--text2)' : 'font-weight:600'}">${t.title}</div>
        ${t.description ? `<div style="font-size:.78rem;color:var(--text2);margin-top:3px">${t.description}</div>` : ''}
        <div class="ptask-status"><span style="font-size:10px;color:var(--text3)">${statusLabel[t.status] || t.status}</span></div>`;
      card.addEventListener('click', () => openEditTask(t));
      col.appendChild(card);
    });
  });
}

let currentEditTaskId = null;

function openEditTask(t) {
  currentEditTaskId = t.id;
  const form = document.getElementById('form-editTask');
  if (!form) return;
  form.elements['id'].value = t.id || '';
  form.elements['title'].value = t.title || '';
  form.elements['assignee_name'].value = t.assignee_name || 'Romain';
  form.elements['priority'].value = t.priority || 'Normal';
  form.elements['status'].value = t.status || 'todo';
  form.elements['due_date'].value = t.due_date || '';
  form.elements['description'].value = t.description || '';
  // Reset photo input
  const photoInput = form.querySelector('[name=photo]');
  if (photoInput) photoInput.value = '';
  window._editTaskPhotoRemoved = false;
  // Show existing photo if any
  const img = document.getElementById('edit-task-photo-img');
  const removeBtn = document.getElementById('edit-task-photo-remove');
  if (img && removeBtn) {
    if (t.photo_url) {
      img.src = t.photo_url;
      img.style.display = 'block';
      removeBtn.style.display = 'block';
    } else {
      img.src = '';
      img.style.display = 'none';
      removeBtn.style.display = 'none';
    }
  }
  window._editTaskCurrentPhotoUrl = t.photo_url || null;
  openModal('editTask');
}

function previewNewTaskPhoto(input) {
  const file = input.files[0];
  if (!file) return;
  const preview = document.getElementById('new-task-photo-preview');
  const img = document.getElementById('new-task-photo-img');
  img.src = URL.createObjectURL(file);
  preview.style.display = 'block';
}
function clearNewTaskPhoto() {
  const input = document.querySelector('#form-newTask [name=photo]');
  if (input) input.value = '';
  document.getElementById('new-task-photo-preview').style.display = 'none';
  document.getElementById('new-task-photo-img').src = '';
}
function previewEditTaskPhoto(input) {
  const file = input.files[0];
  if (!file) return;
  const img = document.getElementById('edit-task-photo-img');
  const removeBtn = document.getElementById('edit-task-photo-remove');
  img.src = URL.createObjectURL(file);
  img.style.display = 'block';
  removeBtn.style.display = 'block';
}
function clearEditTaskPhoto() {
  const input = document.querySelector('#form-editTask [name=photo]');
  if (input) input.value = '';
  const img = document.getElementById('edit-task-photo-img');
  const removeBtn = document.getElementById('edit-task-photo-remove');
  img.src = ''; img.style.display = 'none'; removeBtn.style.display = 'none';
  window._editTaskPhotoRemoved = true;
}

async function uploadTaskPhoto(file, taskId) {
  const ext = file.name.split('.').pop();
  const path = `${taskId}_${Date.now()}.${ext}`;
  const { error } = await sb.storage.from('task-photos').upload(path, file, { upsert: true });
  if (error) throw error;
  const { data } = sb.storage.from('task-photos').getPublicUrl(path);
  return data.publicUrl;
}

async function saveEditTask() {
  const form = document.getElementById('form-editTask');
  if (!form || !currentEditTaskId) return;
  const updates = {
    title: form.elements['title'].value.trim(),
    assignee_name: form.elements['assignee_name'].value,
    priority: form.elements['priority'].value,
    status: form.elements['status'].value,
    due_date: form.elements['due_date'].value || null,
    description: form.elements['description'].value.trim() || null,
  };
  // Handle photo
  const photoInput = form.querySelector('[name=photo]');
  const photoFile = photoInput?.files[0];
  if (photoFile) {
    try {
      updates.photo_url = await uploadTaskPhoto(photoFile, currentEditTaskId);
    } catch(e) { showToast('Erreur upload photo : ' + e.message); return; }
  } else if (window._editTaskPhotoRemoved) {
    updates.photo_url = null;
  }
  const { error } = await sb.from('tasks').update(updates).eq('id', currentEditTaskId);
  if (error) { showToast('Erreur : ' + error.message); return; }
  closeModal('editTask');
  await loadAndRenderTasks();
  showToast('Tâche mise à jour ✓');
}

async function deleteCurrentTask() {
  if (!currentEditTaskId) return;
  if (!confirm('Supprimer cette tâche ?')) return;
  await sb.from('tasks').delete().eq('id', currentEditTaskId);
  closeModal('editTask');
  await loadAndRenderTasks();
  showToast('Tâche supprimée');
}

async function quickDoneTask(id, currentStatus) {
  const newStatus = currentStatus === 'done' ? 'todo' : 'done';
  await updateTaskStatus(id, newStatus);
  await loadAndRenderTasks();
  showToast(newStatus === 'done' ? 'Tâche terminée ✓' : 'Tâche réouverte');
}

// Render clients table
function renderClientsTable(clients) {
  const tbody = document.querySelector('#page-crm .data-table tbody');
  if (!tbody) return;
  tbody.innerHTML = clients.map(c => {
    const potClass = { 'Élevé': 'success', 'Moyen': 'warning', 'Faible': 'danger' }[c.potential] || 'warning';
    const statusClass = { 'Actif': 'success', 'Prospect': 'info', 'Inactif': 'text2', 'Relance': 'warning' }[c.status] || 'info';
    return `<tr>
      <td><strong>${c.company}</strong></td>
      <td>${c.contact_name || '—'}</td>
      <td>${c.email || '—'}</td>
      <td>${c.revenue ? c.revenue.toLocaleString('fr-FR') + ' €' : '—'}</td>
      <td><span class="badge ${potClass}">${c.potential}</span></td>
      <td><span class="badge ${statusClass}">${c.status}</span></td>
      <td>
        <button class="btn-icon" onclick="editClient('${c.id}')" title="Modifier">✏️</button>
        <button class="btn-icon" onclick="deleteClientById('${c.id}')" title="Supprimer">🗑️</button>
      </td>
    </tr>`;
  }).join('');
}

// Render messages
async function deleteMessage(id) {
  if (!confirm('Êtes-vous sûr de vouloir supprimer ce message ?')) return;
  const { error } = await sb.from('messages').delete().eq('id', id);
  if (error) { showToast('Erreur : ' + error.message); return; }
  const el = document.querySelector(`.chat-msg[data-id="${id}"]`);
  if (el) el.remove();
}

function renderMessages(messages) {
  const container = document.getElementById('chatMessages');
  if (!container) return;
  container.innerHTML = messages.map(m => {
    const isMine = m.author_id === currentUser?.id;
    const canDelete = true;
    const time = new Date(m.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    return `<div class="chat-msg ${isMine ? 'mine' : ''}" data-id="${m.id}">
      ${!isMine ? `<div class="chat-avatar">${chatAvatar(m.author_name)}</div>` : ''}
      <div class="chat-bubble">
        ${!isMine ? `<div class="chat-name">${m.author_name}</div>` : ''}
        <div class="chat-text">${m.content}</div>
        <div class="chat-time">${time}</div>
      </div>
      ${canDelete ? `<button class="msg-delete-btn" onclick="deleteMessage('${m.id}')" title="Supprimer">✕</button>` : ''}
    </div>`;
  }).join('');
  container.scrollTop = container.scrollHeight;
}

// Render inventory
function renderInventory(items) {
  const grid = document.querySelector('#page-inventory .inventory-grid');
  if (!grid || !items.length) return;
  grid.innerHTML = items.map(item => {
    const condClass = { 'Bon état': 'good', 'Vérifier': 'warning', 'À réparer': 'danger' }[item.condition] || 'good';
    return `<div class="inv-card">
      <div class="inv-img">${item.emoji || '📦'}</div>
      <div class="inv-info">
        <strong>${item.name}</strong>
        <div class="inv-meta">
          <span class="inv-qty">${item.price_per_day ? item.price_per_day + ' €/J' : 'Qté : ' + (item.quantity || 1)}</span>
          <span class="inv-status ${condClass}">${item.condition}</span>
        </div>
        <span class="inv-location">📍 ${item.location || '—'}</span>
      </div>
    </div>`;
  }).join('');
}

// Render suppliers
function renderSuppliers(suppliers) {
  const grid = document.querySelector('#page-suppliers .supplier-grid');
  if (!grid || !suppliers.length) return;
  grid.innerHTML = suppliers.map(s => {
    const stars = '★'.repeat(s.rating || 4) + '☆'.repeat(5 - (s.rating || 4));
    const emoji = {'Traiteur':'🍽','DJ':'🎧','Animateur':'🎤','Hôtesse':'👩','Sonorisation':'🔊','Artiste':'🎨'}[s.category] || '🤝';
    return `<div class="supplier-card">
      <div class="supplier-header">
        <div class="supplier-avatar">${emoji}</div>
        <div><strong>${s.name}</strong><span class="supplier-cat">${s.category || ''}</span></div>
        <div class="supplier-rating">${stars}</div>
      </div>
      <div class="supplier-details">
        <p>📞 ${s.phone || '—'}</p>
        <p>✉ ${s.email || '—'}</p>
      </div>
      <div class="supplier-collab">${s.notes || (s.collaborations ? s.collaborations + ' collab(s)' : 'Partenaire')}</div>
    </div>`;
  }).join('');
}

// Render mileage — focus mode per person
let allMileageEntries = [];
let mileageFocusPerson = null;
let mileageFocusMonth = null;

const MILEAGE_MEMBERS = [
  { name: 'Romain',  aliases: ['Romain', 'Romain Capdepont'], color: 'var(--color-romain)' },
  { name: 'Ketsia',  aliases: ['Ketsia'],                     color: 'var(--color-ketsia)'  },
  { name: 'Flora',   aliases: ['Flora', 'Flora Boyer'],        color: 'var(--color-flora)'   },
  { name: 'Gloria',  aliases: ['Gloria'],                      color: 'var(--color-gloria)'  },
];
const KM_MONTH_NAMES = ['','Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
const KM_MONTH_FULL  = ['','Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

function renderMileage(entries) {
  allMileageEntries = entries || [];
  renderMileageBoard();
}

function filterMileageMonth() {
  mileageFocusMonth = document.getElementById('mileage-month-filter')?.value || null;
  renderMileageBoard();
}

function focusMileagePerson(name) {
  mileageFocusPerson = mileageFocusPerson === name ? null : name;
  renderMileageBoard();
}

function renderMileageBoard() {
  const board = document.getElementById('mileage-board');
  if (!board) return;

  if (mileageFocusPerson) {
    // ——— FOCUS MODE : affiche une seule personne en pleine largeur ———
    const member = MILEAGE_MEMBERS.find(m => m.name === mileageFocusPerson);
    if (!member) return;

    const myEntries = allMileageEntries.filter(e => member.aliases.some(a => (e.user_name || '').includes(a)));

    // Construire le sélecteur de mois disponibles
    const months = [...new Set(myEntries.map(e => e.trip_date?.slice(0,7)).filter(Boolean))].sort().reverse();
    if (!mileageFocusMonth && months.length) mileageFocusMonth = months[0];

    const monthEntries = mileageFocusMonth
      ? myEntries.filter(e => e.trip_date?.startsWith(mileageFocusMonth))
      : myEntries;

    const totalKm  = myEntries.reduce((s,e)=>s+(parseFloat(e.km)||0),0);
    const totalAmt = myEntries.reduce((s,e)=>s+(parseFloat(e.amount)||0),0);
    const mKm  = monthEntries.reduce((s,e)=>s+(parseFloat(e.km)||0),0);
    const mAmt = monthEntries.reduce((s,e)=>s+(parseFloat(e.amount)||0),0);

    const monthOpts = months.map(k => {
      const [y,m] = k.split('-');
      const label = `${KM_MONTH_FULL[parseInt(m)]} ${y}`;
      return `<option value="${k}" ${k===mileageFocusMonth?'selected':''}>${label}</option>`;
    }).join('');

    const trips = monthEntries.map(e => {
      const date = e.trip_date ? new Date(e.trip_date+'T00:00:00').toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit'}) : '—';
      return `<tr>
        <td style="color:var(--text2);white-space:nowrap">${date}</td>
        <td>${e.motif || ''}</td>
        <td>${e.departure||''}</td>
        <td>${e.destination||''}</td>
        <td style="text-align:right;font-weight:600">${Math.round(e.km||0)} km</td>
        <td style="text-align:right;color:${member.color};font-weight:700">${(parseFloat(e.amount)||0).toFixed(2)} €</td>
        <td><button class="btn-icon" style="font-size:11px" onclick="deleteMileageById('${e.id}')">🗑</button></td>
      </tr>`;
    }).join('') || `<tr><td colspan="7" style="color:var(--text2);text-align:center;padding:1.5rem">Aucun trajet ce mois</td></tr>`;

    board.innerHTML = `
      <div class="km-focus-panel" style="--person-color:${member.color}">
        <div class="km-focus-header">
          <button class="btn-outline" style="font-size:.8rem;padding:6px 12px" onclick="focusMileagePerson('${member.name}')">← Retour</button>
          <div style="display:flex;align-items:center;gap:12px">
            <img src="photos/${member.name.toLowerCase()}.jpg" class="person-col-photo" alt="${member.name}" style="width:44px;height:44px">
            <div>
              <div style="font-weight:700;font-size:1.1rem">${member.name}</div>
              <div style="font-size:.8rem;color:var(--text2)">Total 2026 : ${Math.round(totalKm)} km · ${totalAmt.toFixed(2)} €</div>
            </div>
          </div>
          <select onchange="mileageFocusMonth=this.value;renderMileageBoard()" style="background:var(--bg3);border:1px solid var(--border);color:var(--text);border-radius:8px;padding:8px 14px;font-size:.875rem">
            ${monthOpts}
          </select>
        </div>
        <div class="km-focus-stats">
          <div class="km-stat-card"><div class="km-stat-val" style="color:${member.color}">${Math.round(mKm)} km</div><div class="km-stat-label">Ce mois</div></div>
          <div class="km-stat-card"><div class="km-stat-val" style="color:${member.color}">${mAmt.toFixed(2)} €</div><div class="km-stat-label">Remboursement</div></div>
          <div class="km-stat-card"><div class="km-stat-val">${monthEntries.length}</div><div class="km-stat-label">Trajets</div></div>
          <div class="km-stat-card"><div class="km-stat-val">${monthEntries.length ? Math.round(mKm/monthEntries.length) : 0} km</div><div class="km-stat-label">Moy. / trajet</div></div>
        </div>
        <div class="events-table-wrap" style="margin-top:8px">
          <table class="data-table">
            <thead><tr><th>Date</th><th>Motif</th><th>Départ</th><th>Destination</th><th style="text-align:right">Km</th><th style="text-align:right">Montant</th><th></th></tr></thead>
            <tbody>${trips}</tbody>
          </table>
        </div>
      </div>`;
  } else {
    // ——— VUE GRILLE : 4 cartes cliquables ———
    const filterMonth = mileageFocusMonth;
    const entries = filterMonth ? allMileageEntries.filter(e => e.trip_date?.startsWith(filterMonth)) : allMileageEntries;

    board.innerHTML = MILEAGE_MEMBERS.map(member => {
      const myEntries = entries.filter(e => member.aliases.some(a => (e.user_name||'').includes(a)));
      const totalKm  = myEntries.reduce((s,e)=>s+(parseFloat(e.km)||0),0);
      const totalAmt = myEntries.reduce((s,e)=>s+(parseFloat(e.amount)||0),0);

      // Résumé par mois (dans vue grille, max 3 mois visibles)
      const byMonth = {};
      myEntries.forEach(e => {
        const k = e.trip_date?.slice(0,7) || '—';
        if (!byMonth[k]) byMonth[k] = { km:0, amt:0 };
        byMonth[k].km  += parseFloat(e.km)||0;
        byMonth[k].amt += parseFloat(e.amount)||0;
      });
      const monthRows = Object.entries(byMonth).sort((a,b)=>b[0].localeCompare(a[0])).slice(0,6).map(([k,v]) => {
        const [y,m] = k.split('-');
        return `<div class="km-mini-month">
          <span>${KM_MONTH_NAMES[parseInt(m)||0]} ${y}</span>
          <span style="color:${member.color};font-weight:600">${Math.round(v.km)} km · ${v.amt.toFixed(0)} €</span>
        </div>`;
      }).join('') || '<div style="color:var(--text2);font-size:.8rem;padding:.5rem 0">Aucun trajet</div>';

      return `<div class="person-col km-person-card" style="--person-color:${member.color};cursor:pointer" onclick="focusMileagePerson('${member.name}')">
        <div class="person-col-header">
          <img src="photos/${member.name.toLowerCase()}.jpg" class="person-col-photo" alt="${member.name}">
          <div>
            <div class="person-col-name">${member.name}</div>
            <div style="font-size:.75rem;color:var(--text2)">Cliquer pour détail</div>
          </div>
          <div style="margin-left:auto;text-align:right">
            <div class="person-task-count" style="color:${member.color}">${Math.round(totalKm)} km</div>
            <div style="font-size:.7rem;color:var(--text2)">${totalAmt.toFixed(2)} €</div>
          </div>
        </div>
        <div class="person-tasks" style="padding:8px 0">${monthRows}</div>
      </div>`;
    }).join('');
  }
}

// Render finances
function renderFinances(entries) {
  renderCreances(entries);
  const factures = entries.filter(e => e.type === 'facture');
  const devis    = entries.filter(e => e.type === 'devis');

  const facturesTbody = document.getElementById('fin-factures-body');
  if (facturesTbody) {
    facturesTbody.innerHTML = factures.length ? factures.map(f => {
      const statusColors = { 'Payée':'#4CAF50','En attente':'#F5C518','En retard':'#f44336','Non payé':'#f44336' };
      const sc = statusColors[f.status] || 'var(--text2)';
      return `<tr>
        <td>${f.client || '—'}</td>
        <td style="font-weight:700">${f.amount ? parseFloat(f.amount).toLocaleString('fr-FR') + ' €' : '—'}</td>
        <td>${f.invoice_date ? new Date(f.invoice_date).toLocaleDateString('fr-FR') : '—'}</td>
        <td>${f.notes || '—'}</td>
        <td>
          <select onchange="updateFinanceStatus('${f.id}', this.value)" style="background:var(--bg3);color:${sc};border:1px solid var(--border);border-radius:6px;padding:4px 8px;font-size:.8rem;font-weight:600">
            ${['En attente','Payée','En retard','Non payé'].map(s=>`<option ${f.status===s?'selected':''}>${s}</option>`).join('')}
          </select>
        </td>
        <td><button class="btn-icon" onclick="deleteFinanceEntry('${f.id}')" title="Supprimer">🗑</button></td>
      </tr>`;
    }).join('') : '<tr><td colspan="6" style="text-align:center;color:var(--text2);padding:2rem">Aucune facture — cliquez sur "+ Nouvelle facture"</td></tr>';
  }

  const devisTbody = document.getElementById('fin-devis-body');
  if (devisTbody) {
    devisTbody.innerHTML = devis.length ? devis.map(d => {
      const statusColors = { 'Envoyé':'#F5C518','Fait':'#4CAF50','En attente':'var(--text2)','⚠ Urgent':'#f44336' };
      const sc = statusColors[d.status] || 'var(--text2)';
      return `<tr>
        <td>${d.client || '—'}</td>
        <td style="font-weight:700">${d.amount ? parseFloat(d.amount).toLocaleString('fr-FR') + ' €' : 'En cours'}</td>
        <td>${d.invoice_date ? new Date(d.invoice_date).toLocaleDateString('fr-FR') : '—'}</td>
        <td>${d.notes || '—'}</td>
        <td>
          <select onchange="updateFinanceStatus('${d.id}', this.value)" style="background:var(--bg3);color:${sc};border:1px solid var(--border);border-radius:6px;padding:4px 8px;font-size:.8rem;font-weight:600">
            ${['Envoyé','Fait','En attente','⚠ Urgent'].map(s=>`<option ${d.status===s?'selected':''}>${s}</option>`).join('')}
          </select>
        </td>
        <td><button class="btn-icon" onclick="deleteFinanceEntry('${d.id}')" title="Supprimer">🗑</button></td>
      </tr>`;
    }).join('') : '<tr><td colspan="6" style="text-align:center;color:var(--text2);padding:2rem">Aucun devis — cliquez sur "+ Nouveau devis"</td></tr>';
  }
}

// Render créances clients (factures impayées)
function renderCreances(entries) {
  const impayees = entries.filter(e => e.type === 'facture' && e.status !== 'Payée');
  const statEl = document.getElementById('stat-creances-count');
  if (statEl) statEl.textContent = impayees.length;
  const total = impayees.reduce((s, f) => s + (parseFloat(f.amount) || 0), 0);

  const totalEl = document.getElementById('creances-total');
  if (totalEl) totalEl.textContent = total.toLocaleString('fr-FR', { minimumFractionDigits: 0 }) + ' €';

  const tbody = document.getElementById('creances-tbody');
  if (!tbody) return;
  if (!impayees.length) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--text2);padding:2rem">✅ Aucune créance — toutes les factures sont payées</td></tr>';
    return;
  }
  tbody.innerHTML = impayees.map(f => `
    <tr data-id="${f.id}">
      <td>${f.client || '—'}</td>
      <td style="font-weight:700;color:var(--gold)">${f.amount ? parseFloat(f.amount).toLocaleString('fr-FR') + ' €' : '—'}</td>
      <td>${f.invoice_date ? new Date(f.invoice_date).toLocaleDateString('fr-FR') : '—'}</td>
      <td>
        <select onchange="markInvoicePaid('${f.id}', this)" data-prev="Impayé"
          style="background:var(--bg3);color:var(--text);border:1px solid var(--border);border-radius:6px;padding:4px 8px;font-size:.8rem;cursor:pointer">
          <option selected>Impayé</option>
          <option>Payé</option>
        </select>
      </td>
    </tr>`).join('');
}

async function saveNewCreance(e) {
  e.preventDefault();
  const form = e.target;
  const data = {
    type: 'facture',
    client: form.querySelector('[name=client]').value,
    amount: parseFloat(form.querySelector('[name=amount]').value),
    invoice_date: form.querySelector('[name=invoice_date]').value,
    status: 'Non payé',
  };
  const { error } = await sb.from('finances').insert([data]);
  if (error) { showToast('Erreur : ' + error.message); return; }
  showToast('Créance ajoutée ✓');
  closeModal('newCreance');
  form.reset();
  const { data: entries } = await sb.from('finances').select('*').order('invoice_date', { ascending: false });
  if (entries) renderCreances(entries);
}

async function markInvoicePaid(id, selectEl) {
  if (selectEl.value !== 'Payé') return;
  const confirmed = confirm('Êtes-vous sûr que cette facture a été payée ?');
  if (!confirmed) { selectEl.value = 'Impayé'; return; }
  const { error } = await sb.from('finances').update({ status: 'Payée' }).eq('id', id);
  if (error) { showToast('Erreur : ' + error.message); selectEl.value = 'Impayé'; return; }
  showToast('Facture marquée comme payée ✓');
  // Retirer la ligne sans recharger
  const row = document.querySelector(`#creances-tbody tr[data-id="${id}"]`);
  if (row) row.remove();
  // Recalculer l'encours
  const remaining = [...document.querySelectorAll('#creances-tbody tr[data-id]')];
  // Recharger pour avoir le bon total
  const entries = await sb.from('finances').select('*').order('invoice_date', { ascending: false });
  if (!entries.error) renderCreances(entries.data);
}

// =============================================
// PROSPECTS
// =============================================
const TEMP_LABELS = { froid: '❄️ Froid', tiede: '🌤 Tiède', chaud: '🔥 Chaud' };
const TEMP_COLORS = { froid: '#4A9EFF', tiede: '#F5C518', chaud: '#FF6B9D' };
const PROSPECT_STATUS_COLORS = {
  'À contacter': '#9B59B6', 'Contacté': '#4A9EFF', 'Devis envoyé': '#F5C518',
  'En attente retour': '#FF9800', 'Négociation': '#FF6B9D', 'Gagné': '#4CAF50', 'Perdu': '#f44336'
};

async function loadAndRenderProspects() {
  const { data, error } = await sb.from('prospects').select('*').order('followup_date', { ascending: true, nullsFirst: false });
  if (error) { console.error(error); return; }
  renderProspects(data || []);
}

function renderProspects(prospects) {
  const today = new Date().toISOString().slice(0, 10);
  const chauds = prospects.filter(p => p.temperature === 'chaud' && p.status !== 'Gagné' && p.status !== 'Perdu');
  const relances = prospects.filter(p => p.followup_date && p.followup_date <= today && p.status !== 'Gagné' && p.status !== 'Perdu');
  const caTotal = prospects.filter(p => p.status !== 'Perdu').reduce((s, p) => s + (parseFloat(p.estimated_amount) || 0), 0);

  const el = id => document.getElementById(id);
  if (el('prospect-count')) el('prospect-count').textContent = prospects.filter(p => p.status !== 'Gagné' && p.status !== 'Perdu').length;
  if (el('prospect-chaud')) el('prospect-chaud').textContent = chauds.length;
  if (el('prospect-relance')) el('prospect-relance').textContent = relances.length;
  if (el('prospect-ca-estime')) el('prospect-ca-estime').textContent = caTotal.toLocaleString('fr-FR') + ' €';

  const tbody = document.getElementById('prospects-tbody');
  if (!tbody) return;
  if (!prospects.length) {
    tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;color:var(--text2);padding:2rem">Aucun prospect — cliquez sur "+ Nouveau prospect"</td></tr>';
    return;
  }
  tbody.innerHTML = prospects.map(p => {
    const isLate = p.followup_date && p.followup_date < today && p.status !== 'Gagné' && p.status !== 'Perdu';
    const relanceStr = p.followup_date ? new Date(p.followup_date + 'T00:00:00').toLocaleDateString('fr-FR') : '—';
    const statusColor = PROSPECT_STATUS_COLORS[p.status] || '#aaa';
    const tempColor = TEMP_COLORS[p.temperature] || '#aaa';
    return `<tr style="${isLate ? 'background:rgba(244,67,54,0.08);border-left:3px solid #f44336' : ''}">
      <td><strong>${p.name}</strong></td>
      <td style="font-size:.8rem">${p.contact_name || '—'}${p.phone ? '<br><span style="color:var(--text2)">' + p.phone + '</span>' : ''}</td>
      <td style="text-align:center">${p.devis_sent === 'oui' ? '<span style="color:#4CAF50;font-size:1.1rem">✅</span>' : '<span style="color:var(--text3)">—</span>'}</td>
      <td style="text-align:center">${p.email_sent === 'oui' ? '<span style="color:#4CAF50;font-size:1.1rem">✅</span>' : '<span style="color:var(--text3)">—</span>'}</td>
      <td style="${isLate ? 'color:#f44336;font-weight:700' : ''}">${relanceStr}${isLate ? ' ⚠️' : ''}</td>
      <td style="font-weight:600;color:var(--gold)">${p.estimated_amount ? parseFloat(p.estimated_amount).toLocaleString('fr-FR') + ' €' : '—'}</td>
      <td><span style="color:${tempColor};font-weight:600">${TEMP_LABELS[p.temperature] || '—'}</span></td>
      <td>
        <select onchange="updateProspectStatus('${p.id}', this)" style="background:${statusColor}22;color:${statusColor};border:1px solid ${statusColor}55;border-radius:12px;padding:3px 8px;font-size:.75rem;font-weight:600;cursor:pointer;outline:none">
          ${Object.keys(PROSPECT_STATUS_COLORS).map(s => `<option value="${s}" ${p.status===s?'selected':''}>${s}</option>`).join('')}
        </select>
      </td>
      <td style="font-size:.8rem;color:var(--text2);max-width:200px;white-space:pre-wrap">${p.notes || '—'}</td>
      <td>
        <button onclick="editProspect('${p.id}')" style="background:none;border:none;cursor:pointer;font-size:1rem;padding:2px 6px" title="Modifier">✏️</button>
        <button onclick="deleteProspect('${p.id}')" style="background:none;border:none;cursor:pointer;font-size:1rem;padding:2px 6px" title="Supprimer">🗑</button>
      </td>
    </tr>`;
  }).join('');
}

async function saveNewProspect(e) {
  e.preventDefault();
  const form = e.target;
  const data = {
    name: form.querySelector('[name=name]').value,
    contact_name: form.querySelector('[name=contact_name]').value,
    email: form.querySelector('[name=email]').value,
    phone: form.querySelector('[name=phone]').value,
    devis_sent: form.querySelector('[name=devis_sent]').value,
    email_sent: form.querySelector('[name=email_sent]').value,
    followup_date: form.querySelector('[name=followup_date]').value || null,
    estimated_amount: parseFloat(form.querySelector('[name=estimated_amount]').value) || null,
    temperature: form.querySelector('[name=temperature]').value,
    status: form.querySelector('[name=status]').value,
    notes: form.querySelector('[name=notes]').value,
  };
  const { error } = await sb.from('prospects').insert([data]);
  if (error) { showToast('Erreur : ' + error.message); return; }
  showToast('Prospect ajouté ✓');
  closeModal('newProspect');
  form.reset();
  await loadAndRenderProspects();
}

async function updateProspectStatus(id, selectEl) {
  const newStatus = selectEl.value;
  const prev = selectEl.querySelector('option[selected]')?.value || selectEl.dataset.prev;
  if (newStatus === 'Gagné' || newStatus === 'Perdu') {
    const msg = newStatus === 'Gagné'
      ? '🎉 Êtes-vous sûr que ce prospect a été gagné ?'
      : '❌ Êtes-vous sûr que ce prospect est perdu ?';
    if (!confirm(msg)) {
      selectEl.value = prev || 'À contacter';
      return;
    }
  }
  const { error } = await sb.from('prospects').update({ status: newStatus }).eq('id', id);
  if (error) { showToast('Erreur : ' + error.message); selectEl.value = prev || 'À contacter'; return; }
  showToast('Statut mis à jour ✓');
  await loadAndRenderProspects();
  await renderDashboardProspectsRelance();
}

async function deleteProspect(id) {
  if (!confirm('Supprimer ce prospect ?')) return;
  await sb.from('prospects').delete().eq('id', id);
  await loadAndRenderProspects();
}

async function editProspect(id) {
  const { data: p } = await sb.from('prospects').select('*').eq('id', id).single();
  if (!p) return;
  // Réutilise le modal newProspect en mode édition
  const form = document.getElementById('form-newProspect');
  form.querySelector('[name=name]').value = p.name || '';
  form.querySelector('[name=contact_name]').value = p.contact_name || '';
  form.querySelector('[name=email]').value = p.email || '';
  form.querySelector('[name=phone]').value = p.phone || '';
  form.querySelector('[name=devis_sent]').value = p.devis_sent || 'non';
  form.querySelector('[name=email_sent]').value = p.email_sent || 'non';
  form.querySelector('[name=followup_date]').value = p.followup_date || '';
  form.querySelector('[name=estimated_amount]').value = p.estimated_amount || '';
  form.querySelector('[name=temperature]').value = p.temperature || 'froid';
  form.querySelector('[name=status]').value = p.status || 'À contacter';
  form.querySelector('[name=notes]').value = p.notes || '';
  form.dataset.editId = id;
  document.querySelector('#modal-newProspect .modal-header h3').textContent = 'Modifier le prospect';
  openModal('newProspect');
  form.onsubmit = async (e) => {
    e.preventDefault();
    const data = {
      name: form.querySelector('[name=name]').value,
      contact_name: form.querySelector('[name=contact_name]').value,
      email: form.querySelector('[name=email]').value,
      phone: form.querySelector('[name=phone]').value,
      devis_sent: form.querySelector('[name=devis_sent]').value,
      email_sent: form.querySelector('[name=email_sent]').value,
      followup_date: form.querySelector('[name=followup_date]').value || null,
      estimated_amount: parseFloat(form.querySelector('[name=estimated_amount]').value) || null,
      temperature: form.querySelector('[name=temperature]').value,
      status: form.querySelector('[name=status]').value,
      notes: form.querySelector('[name=notes]').value,
    };
    const { error } = await sb.from('prospects').update(data).eq('id', id);
    if (error) { showToast('Erreur : ' + error.message); return; }
    showToast('Prospect modifié ✓');
    closeModal('newProspect');
    form.onsubmit = saveNewProspect;
    form.dataset.editId = '';
    document.querySelector('#modal-newProspect .modal-header h3').textContent = 'Nouveau prospect';
    await loadAndRenderProspects();
  };
}

function switchCrmTab(btn, tabId) {
  document.getElementById('crm-clients').style.display = tabId === 'crm-clients' ? '' : 'none';
  document.getElementById('crm-prospects').style.display = tabId === 'crm-prospects' ? '' : 'none';
  document.getElementById('crm-btn-new-client').style.display = tabId === 'crm-clients' ? '' : 'none';
  document.getElementById('crm-btn-new-prospect').style.display = tabId === 'crm-prospects' ? '' : 'none';
  document.querySelectorAll('#page-crm .tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  if (tabId === 'crm-prospects') loadAndRenderProspects();
}

// Render mail templates
function renderMailTemplates(templates) {
  const container = document.querySelector('#page-mails .mails-grid');
  if (!container) return;
  container.innerHTML = templates.map(t => `
    <div class="mail-card">
      <div class="mail-card-header">
        <span class="mail-tag">${t.category || 'Général'}</span>
        <h3>${t.title}</h3>
      </div>
      <div class="mail-preview">${t.content}</div>
      <button class="btn-copy" onclick="copyMail(this)">📋 COPIER LE TEXTE</button>
    </div>`).join('');
}

// Render quick links
function renderQuickLinks(links) {
  const container = document.querySelector('#page-links .links-grid');
  if (!container) return;
  const groups = {};
  links.forEach(l => {
    if (!groups[l.category]) groups[l.category] = [];
    groups[l.category].push(l);
  });
  container.innerHTML = Object.entries(groups).map(([cat, items]) => `
    <div class="links-group">
      <h3 class="links-group-title">${cat}</h3>
      <div class="links-list">
        ${items.map(l => `
          <a href="${l.url}" target="_blank" class="link-item">
            <span class="link-emoji">${l.emoji || '🔗'}</span>
            <span class="link-name">${l.name}</span>
          </a>`).join('')}
      </div>
    </div>`).join('');
}

// =============================================
// DELETE HELPERS
// =============================================
async function deleteTaskById(id) {
  if (!confirm('Supprimer cette tâche ?')) return;
  await deleteTask(id);
  await loadAndRenderTasks();
  showToast('Tâche supprimée');
}

async function deleteClientById(id) {
  if (!confirm('Supprimer ce client ?')) return;
  const { error } = await sb.from('clients').delete().eq('id', id);
  if (!error) { await loadAndRenderClients(); showToast('Client supprimé'); }
}

async function deleteMileageById(id) {
  if (!confirm('Supprimer cette entrée ?')) return;
  const { error } = await sb.from('mileage').delete().eq('id', id);
  if (!error) { await loadAndRenderMileage(); showToast('Entrée supprimée'); }
}

async function deleteFinanceById(id) {
  if (!confirm('Supprimer cette entrée ?')) return;
  const { error } = await sb.from('finances').delete().eq('id', id);
  if (!error) { await loadAndRenderFinances(); showToast('Entrée supprimée'); }
}

// =============================================
// LOAD & RENDER (combinés)
// =============================================
async function loadAndRenderEvents() {
  const events = await fetchEvents();
  renderEventsTable(events);
  updateDashboardEvents(events);
  window.calendarEvents = events;
  if (document.getElementById('page-events')?.classList.contains('active')) renderCalendar();
}

async function loadAndRenderTasks() {
  const tasks = await fetchTasks();
  renderKanban(tasks);
  updateDashboardTasks(tasks);
}

async function loadAndRenderClients() {
  const clients = await fetchClients();
  renderClientsTable(clients);
}

async function loadAndRenderMileage() {
  const entries = await fetchMileage();
  renderMileage(entries);
}

async function loadAndRenderFinances() {
  const entries = await fetchFinances();
  renderFinances(entries);
  // Update CA stat on dashboard
  const total = (entries || []).filter(e => e.type === 'paiement' || e.type === 'recette').reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
  const el = document.getElementById('stat-ca-count');
  if (el) el.textContent = total > 0 ? total.toLocaleString('fr-FR') + ' €' : '—';
}

function updateDashboardEvents(events) {
  const upcomingEl = document.getElementById('dash-events-list');
  if (!upcomingEl) return;
  const upcoming = events.filter(e => e.event_date >= new Date().toISOString().slice(0,10)).slice(0,4);
  const monthNames = ['JAN','FÉV','MAR','AVR','MAI','JUN','JUL','AOÛ','SEP','OCT','NOV','DÉC'];
  upcomingEl.innerHTML = upcoming.map(ev => {
    const d = new Date(ev.event_date + 'T00:00:00');
    const day = String(d.getDate()).padStart(2,'0');
    const mon = monthNames[d.getMonth()];
    const statusClass = {'Confirmé':'badge-gold','En préparation':'badge-warning','Terminé':'badge-info','Annulé':'badge-danger','Supprimé':'badge-danger'}[ev.status] || 'badge-warning';
    return `<div class="event-item">
      <div class="event-date-badge"><span class="event-day">${day}</span><span class="event-month">${mon}</span></div>
      <div class="event-details"><strong>${ev.name}</strong><span>${ev.location || ''} ${ev.client ? '• ' + ev.client : ''}</span></div>
      <span class="badge ${statusClass}">${ev.status}</span>
    </div>`;
  }).join('') || '<p style="color:var(--text2);padding:1rem;text-align:center">Aucun événement à venir</p>';

  const countEl = document.getElementById('stat-events-count');
  if (countEl) countEl.textContent = events.filter(e => e.status !== 'Terminé' && e.status !== 'Annulé' && e.status !== 'Supprimé').length;
}

function updateDashboardTasks(tasks) {
  const pending = tasks.filter(t => t.status !== 'done');
  const el = document.getElementById('stat-tasks-count');
  if (el) el.textContent = pending.length;

  const list = document.getElementById('dash-tasks-list');
  if (!list) return;
  if (!tasks.length) {
    list.innerHTML = '<p style="color:var(--text2);text-align:center;padding:1rem">Aucune tâche — cliquez sur "+ Nouvelle tâche"</p>';
    return;
  }
  const sorted = [...tasks].sort((a,b) => {
    const p = {Urgent:0,Normal:1,Bas:2};
    return (p[a.priority]||1) - (p[b.priority]||1);
  }).slice(0, 6);
  list.innerHTML = sorted.map(t => {
    const prioColor = {Urgent:'red',Normal:'orange',Bas:'yellow'}[t.priority] || 'orange';
    const isDone = t.status === 'done';
    return `<div class="task-item" style="${isDone ? 'opacity:.5' : ''}">
      <div class="task-check ${t.priority === 'Urgent' ? 'urgent' : ''}"
           onclick="toggleTaskDone('${t.id}','${t.status}')"
           style="cursor:pointer;width:18px;height:18px;border-radius:50%;border:2px solid var(--${isDone ? 'success' : 'border'});background:${isDone ? 'var(--success)' : 'transparent'};display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:10px">
        ${isDone ? '✓' : ''}
      </div>
      <div class="task-info">
        <strong style="${isDone ? 'text-decoration:line-through' : ''}">${t.title}</strong>
        <span style="display:flex;align-items:center;gap:5px">${miniAvatar(t.assignee_name, 18)} <b style="color:${personColors[t.assignee_name]||'var(--text2)'}">${t.assignee_name||'—'}</b> • <select onchange="changeTaskStatus('${t.id}',this.value)" style="background:transparent;border:none;color:var(--text2);font-size:.8rem;cursor:pointer">
          <option value="todo" ${t.status==='todo'?'selected':''}>À faire</option>
          <option value="inprogress" ${t.status==='inprogress'?'selected':''}>En cours</option>
          <option value="waiting" ${t.status==='waiting'?'selected':''}>En attente</option>
          <option value="done" ${t.status==='done'?'selected':''}>Terminé</option>
        </select></span>
      </div>
      <span class="priority-dot ${prioColor}"></span>
    </div>`;
  }).join('');
}

async function toggleTaskDone(id, currentStatus) {
  const newStatus = currentStatus === 'done' ? 'todo' : 'done';
  await updateTaskStatus(id, newStatus);
  await loadAndRenderTasks();
}

async function changeTaskStatus(id, newStatus) {
  await updateTaskStatus(id, newStatus);
  await loadAndRenderTasks();
  showToast('Statut mis à jour');
}

// =============================================
// MODAL FORMS — SAVE TO SUPABASE
// =============================================
async function saveNewEvent() {
  const form = document.getElementById('form-newEvent');
  if (!form) return;
  const data = {
    name: form.querySelector('[name=name]')?.value,
    client: form.querySelector('[name=client]')?.value,
    event_date: form.querySelector('[name=event_date]')?.value,
    end_date: form.querySelector('[name=end_date]')?.value || null,
    start_time: form.querySelector('[name=start_time]')?.value,
    end_time: form.querySelector('[name=end_time]')?.value,
    location: form.querySelector('[name=location]')?.value,
    contact_name: form.querySelector('[name=contact_name]')?.value,
    contact_phone: form.querySelector('[name=contact_phone]')?.value,
    participants: parseInt(form.querySelector('[name=participants]')?.value) || null,
    budget: parseFloat(form.querySelector('[name=budget]')?.value) || null,
    status: form.querySelector('[name=status]')?.value || 'En préparation',
    notes: form.querySelector('[name=notes]')?.value
  };
  if (!data.name) { showToast('Nom obligatoire'); return; }
  try {
    await createEvent(data);
    closeModal('newEvent');
    await loadAndRenderEvents();
    showToast('Événement créé !');
    form.reset();
  } catch(e) { showToast('Erreur : ' + e.message); }
}

async function saveNewTask() {
  const form = document.getElementById('form-newTask');
  if (!form) return;
  const data = {
    title: form.querySelector('[name=title]')?.value,
    description: form.querySelector('[name=description]')?.value,
    assignee_name: form.querySelector('[name=assignee]')?.value,
    due_date: form.querySelector('[name=due_date]')?.value || null,
    priority: form.querySelector('[name=priority]')?.value || 'Normal',
    status: 'todo'
  };
  if (!data.title) { showToast('Titre obligatoire'); return; }
  try {
    const { data: created, error } = await sb.from('tasks').insert(data).select().single();
    if (error) throw error;
    // Upload photo if selected
    const photoFile = form.querySelector('[name=photo]')?.files[0];
    if (photoFile && created) {
      try {
        const photoUrl = await uploadTaskPhoto(photoFile, created.id);
        await sb.from('tasks').update({ photo_url: photoUrl }).eq('id', created.id);
      } catch(e) { showToast('Tâche créée mais erreur photo : ' + e.message); }
    }
    closeModal('newTask');
    await loadAndRenderTasks();
    showToast('Tâche créée !');
    form.reset();
    clearNewTaskPhoto();
  } catch(e) { showToast('Erreur : ' + e.message); }
}

async function saveNewSupplier() {
  const form = document.getElementById('form-newSupplier');
  if (!form) return;
  const data = {
    name: form.querySelector('[name=name]')?.value,
    category: form.querySelector('[name=category]')?.value,
    phone: form.querySelector('[name=phone]')?.value,
    email: form.querySelector('[name=email]')?.value,
    rating: parseInt(form.querySelector('[name=rating]')?.value) || 4,
    notes: form.querySelector('[name=notes]')?.value
  };
  if (!data.name) { showToast('Nom obligatoire'); return; }
  try {
    await createSupplier(data);
    closeModal('newSupplier');
    allSuppliers = await fetchSuppliers();
    renderSuppliers(allSuppliers);
    showToast('Fournisseur ajouté !');
    form.reset();
  } catch(e) { showToast('Erreur : ' + e.message); }
}

async function saveNewClient() {
  const form = document.getElementById('form-newClient');
  if (!form) return;
  const data = {
    company: form.querySelector('[name=company]')?.value,
    contact_name: form.querySelector('[name=contact_name]')?.value,
    phone: form.querySelector('[name=phone]')?.value,
    email: form.querySelector('[name=email]')?.value,
    revenue: parseFloat(form.querySelector('[name=revenue]')?.value) || 0,
    potential: form.querySelector('[name=potential]')?.value || 'Moyen',
    status: form.querySelector('[name=status]')?.value || 'Prospect',
    notes: form.querySelector('[name=notes]')?.value
  };
  if (!data.company) { showToast('Nom de société obligatoire'); return; }
  try {
    await createClient_(data);
    closeModal('newClient');
    await loadAndRenderClients();
    showToast('Client ajouté !');
    form.reset();
  } catch(e) { showToast('Erreur : ' + e.message); }
}

async function saveNewMileage() {
  const form = document.getElementById('form-newMileage');
  if (!form) return;
  const data = {
    trip_date: form.querySelector('[name=trip_date]')?.value,
    user_name: form.querySelector('[name=user_name]')?.value,
    departure: form.querySelector('[name=departure]')?.value,
    destination: form.querySelector('[name=destination]')?.value,
    km: parseFloat(form.querySelector('[name=km]')?.value) || 0,
    rate: parseFloat(form.querySelector('[name=rate]')?.value) || 0.374,
    motif: form.querySelector('[name=motif]')?.value
  };
  if (!data.trip_date || !data.km) { showToast('Date et km obligatoires'); return; }
  try {
    await createMileage(data);
    closeModal('newMileage');
    await loadAndRenderMileage();
    showToast('Frais enregistrés !');
    form.reset();
  } catch(e) { showToast('Erreur : ' + e.message); }
}

async function saveNewInventory() {
  const form = document.getElementById('form-newInventory');
  if (!form) return;
  const data = {
    name: form.querySelector('[name=name]')?.value,
    quantity: parseInt(form.querySelector('[name=quantity]')?.value) || 1,
    emoji: form.querySelector('[name=emoji]')?.value || '📦',
    condition: form.querySelector('[name=condition]')?.value || 'Bon état',
    location: form.querySelector('[name=location]')?.value,
    price_per_day: parseFloat(form.querySelector('[name=price_per_day]')?.value) || null,
    purchase_price: parseFloat(form.querySelector('[name=purchase_price]')?.value) || null,
    notes: form.querySelector('[name=notes]')?.value
  };
  if (!data.name) { showToast('Nom obligatoire'); return; }
  try {
    await createInventoryItem(data);
    closeModal('newInventory');
    const items = await fetchInventory();
    renderInventory(items);
    showToast('Matériel ajouté !');
    form.reset();
  } catch(e) { showToast('Erreur : ' + e.message); }
}

async function saveNewKnowledge() {
  const form = document.getElementById('form-newKnowledge');
  if (!form) return;
  const data = {
    title: form.querySelector('[name=title]')?.value,
    category: form.querySelector('[name=category]')?.value,
    type: form.querySelector('[name=type]')?.value || 'document',
    content: form.querySelector('[name=content]')?.value,
    author_name: currentProfile?.name || 'Équipe Pull Up'
  };
  if (!data.title) { showToast('Titre obligatoire'); return; }
  try {
    await sb.from('knowledge').insert([data]);
    closeModal('newKnowledge');
    await loadAndRenderKnowledge();
    showToast('Document créé !');
    form.reset();
  } catch(e) { showToast('Erreur : ' + e.message); }
}

// loadAndRenderKnowledge et renderKnowledgeDocs → voir section KNOWLEDGE BASE FILTER plus bas

async function viewKnowledgeDoc(id) {
  const { data } = await sb.from('knowledge').select('*').eq('id', id).single();
  if (!data) return;
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.8);z-index:9000;display:flex;align-items:center;justify-content:center;padding:2rem';
  overlay.innerHTML = `<div style="background:var(--bg2);border:1px solid var(--border);border-radius:16px;padding:2rem;max-width:700px;width:100%;max-height:80vh;overflow-y:auto">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem">
      <h2 style="color:var(--gold)">${data.title}</h2>
      <button onclick="this.closest('[style*=fixed]').remove()" style="background:none;border:none;color:var(--text2);font-size:1.5rem;cursor:pointer">✕</button>
    </div>
    <div style="color:var(--text2);font-size:.85rem;margin-bottom:1rem">${data.category || ''} • ${data.author_name || ''}</div>
    <pre style="white-space:pre-wrap;font-family:inherit;color:var(--text);line-height:1.6">${data.content || ''}</pre>
  </div>`;
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  document.body.appendChild(overlay);
}

async function deleteKnowledgeDoc(id) {
  if (!confirm('Supprimer ce document ?')) return;
  await sb.from('knowledge').delete().eq('id', id);
  await loadAndRenderKnowledge();
  showToast('Document supprimé');
}

async function saveNewFinanceEntry() {
  const form = document.getElementById('form-newFinance');
  if (!form) return;
  const data = {
    type: form.querySelector('[name=type]')?.value || 'facture',
    client: form.querySelector('[name=client]')?.value,
    amount: parseFloat(form.querySelector('[name=amount]')?.value) || null,
    invoice_date: form.querySelector('[name=invoice_date]')?.value || new Date().toISOString().slice(0,10),
    status: form.querySelector('[name=status]')?.value || 'En attente',
    notes: form.querySelector('[name=notes]')?.value
  };
  if (!data.client) { showToast('Client obligatoire'); return; }
  try {
    await createFinance(data);
    closeModal('newFinance');
    await loadAndRenderFinances();
    showToast('Entrée financière ajoutée !');
    form.reset();
  } catch(e) { showToast('Erreur : ' + e.message); }
}

// openEventDetailById et switchChannel → voir sections EDIT EVENT et MESSAGES plus bas
let activeChannel = 'general';
let messageSubscription = null;

async function sendChatMessage() {
  const input = document.getElementById('chatInput');
  const msg = input?.value.trim();
  if (!msg) return;
  if (!currentUser) { showToast('Non connecté'); return; }
  input.value = '';

  // Affichage optimiste immédiat
  const container = document.getElementById('chatMessages');
  const time = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const tempId = 'tmp-' + Date.now();
  if (container) {
    const div = document.createElement('div');
    div.className = 'chat-msg mine';
    div.id = tempId;
    div.innerHTML = `<div class="chat-bubble"><div class="chat-text">${msg}</div><div class="chat-time">${time} <span style="opacity:.5;font-size:.7rem">…</span></div></div>`;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
  }

  try {
    const { error } = await sb.from('messages').insert([{
      channel: activeChannel,
      content: msg,
      author_name: currentProfile?.name || currentUser.email,
      author_id: currentUser.id
    }]);
    if (error) throw error;
    // Retire l'indicateur d'envoi
    const tmp = document.getElementById(tempId);
    if (tmp) tmp.querySelector('.chat-time').innerHTML = time;
  } catch(e) {
    console.error('Erreur message:', e);
    const tmp = document.getElementById(tempId);
    if (tmp) tmp.remove();
    input.value = msg;
    showToast('Erreur : ' + (e.message || 'Impossible d\'envoyer'));
  }
}

// =============================================
// LOGIN SCREEN
// =============================================
function showLoginScreen() {
  document.getElementById('app-container').style.display = 'none';
  document.getElementById('login-screen').style.display = 'flex';
}

function showApp() {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('app-container').style.display = 'flex';
}

async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  const btn = document.getElementById('login-btn');
  btn.textContent = 'Connexion...';
  btn.disabled = true;
  try {
    const { user } = await signIn(email, password);
    currentUser = user;
    currentProfile = await loadProfile(user.id);
    showApp();
    await initApp();
  } catch(err) {
    document.getElementById('login-error').textContent = 'Email ou mot de passe incorrect';
    btn.textContent = 'Se connecter';
    btn.disabled = false;
  }
}

// =============================================
// INIT APP (chargement de toutes les données)
// =============================================
async function initApp() {
  // Update user info in sidebar
  if (currentProfile) {
    const nameEl = document.getElementById('user-name');
    const roleEl = document.getElementById('user-role');
    if (nameEl) nameEl.textContent = currentProfile.name;
    if (roleEl) roleEl.textContent = currentProfile.role;
    const initial = (currentProfile.name || '?')[0].toUpperCase();
    const sideAvatar = document.getElementById('sidebar-user-avatar');
    if (sideAvatar) sideAvatar.textContent = initial;
    document.querySelectorAll('.topbar-avatar').forEach(el => el.textContent = initial);
  }

  // Charger toutes les données en parallèle
  await Promise.all([
    loadAndRenderEvents(),
    loadAndRenderTasks(),
    loadAndRenderClients(),
    fetchSuppliers().then(renderSuppliers),
    fetchInventory().then(renderInventory),
    fetchMileage().then(renderMileage),
    fetchFinances().then(renderFinances),
    fetchMailTemplates().then(renderMailTemplates),
    fetchQuickLinks().then(renderQuickLinks),
    loadAndRenderKnowledge(),
  ]);

  // Activer messagerie
  await switchChannel('general');

  // Notifications
  await loadNotifications();

  // Cache fournisseurs
  allSuppliers = await fetchSuppliers();

  const lastPage = localStorage.getItem('pullup_last_page') || 'dashboard';
  showPage(lastPage);
  await loadChargesGlobales();
  if (typeof renderDashboardCA === 'function') renderDashboardCA();
  renderDashboardProspectsRelance();
  renderDashboardDevisRequests();
  loadUnreadCounts();
  setInterval(loadUnreadCounts, 30000);
  await requestNotificationPermission();
  subscribeToTaskAssignments();
  loadTasksBadge();
  setInterval(loadTasksBadge, 60000);
}

async function loadTasksBadge() {
  if (!currentUser) return;
  const myName = currentProfile?.name || '';
  if (!myName) return;
  const { count } = await sb.from('tasks')
    .select('id', { count: 'exact', head: true })
    .neq('status', 'done')
    .ilike('assignee', `%${myName}%`);
  const badge = document.getElementById('nav-badge-tasks');
  if (!badge) return;
  const n = count || 0;
  if (n > 0) {
    badge.textContent = n > 99 ? '99+' : n;
    badge.style.display = 'inline-flex';
  } else {
    badge.style.display = 'none';
  }
}

async function loadDevisRequests() {
  const { data, error } = await sb.from('devis_requests').select('*').order('created_at', { ascending: false });
  if (error) { console.error(error); return; }
  const PRIORITY_COLOR = { 'Urgent': '#f44336', 'Normal': '#4A9EFF', 'Basse': '#aaa' };
  const STATUS_COLOR = { 'À faire': '#FF9800', 'En cours': '#4A9EFF', 'Envoyé': '#4CAF50' };

  // stats counters
  const todo = data.filter(r => r.status === 'À faire').length;
  const encours = data.filter(r => r.status === 'En cours').length;
  const envoye = data.filter(r => r.status === 'Envoyé').length;
  ['dr-count-todo','dr-count-encours','dr-count-envoye'].forEach((id,i) => {
    const el = document.getElementById(id);
    if (el) el.textContent = [todo, encours, envoye][i];
  });

  const emptyMsg = '<tr><td colspan="10" style="text-align:center;color:var(--text2);padding:2rem">Aucune demande de devis pour l\'instant</td></tr>';
  const rows = !data.length ? emptyMsg : data.map(r => {
    const pc = PRIORITY_COLOR[r.priority] || '#aaa';
    const sc = STATUS_COLOR[r.status] || '#aaa';
    return `<tr>
      <td><strong>${r.client}</strong>${r.contact_name ? '<br><span style="font-size:.78rem;color:var(--text2)">' + r.contact_name + '</span>' : ''}</td>
      <td style="font-size:.8rem">${r.phone || '—'}${r.email ? '<br>' + r.email : ''}</td>
      <td>${r.event_type || '—'}</td>
      <td>${r.event_date ? new Date(r.event_date + 'T00:00:00').toLocaleDateString('fr-FR') : '—'}</td>
      <td>${r.location || '—'}</td>
      <td style="text-align:center">${r.guest_count || '—'}</td>
      <td style="font-weight:700;color:var(--gold)">${r.budget_estimate ? parseFloat(r.budget_estimate).toLocaleString('fr-FR') + ' €' : '—'}</td>
      <td><span style="background:${pc}22;color:${pc};padding:2px 8px;border-radius:10px;font-size:.75rem;font-weight:600">${r.priority}</span></td>
      <td>
        <select onchange="updateDevisRequestStatus('${r.id}',this)" style="background:${sc}22;color:${sc};border:1px solid ${sc}55;border-radius:10px;padding:2px 8px;font-size:.75rem;font-weight:600;cursor:pointer;outline:none">
          ${['À faire','En cours','Envoyé'].map(s=>`<option ${r.status===s?'selected':''}>${s}</option>`).join('')}
        </select>
      </td>
      <td>
        <button onclick="deleteDevisRequest('${r.id}')" style="background:none;border:none;cursor:pointer;font-size:1rem;padding:2px 6px" title="Supprimer">🗑</button>
      </td>
    </tr>`;
  }).join('');

  // Injecte dans la page dédiée ET dans l'onglet Finance
  ['devis-requests-main-tbody','devis-requests-tbody'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = rows;
  });
}

async function saveDevisRequest(e) {
  e.preventDefault();
  const f = e.target;
  const data = {
    client: f.querySelector('[name=client]').value,
    contact_name: f.querySelector('[name=contact_name]').value || null,
    phone: f.querySelector('[name=phone]').value || null,
    email: f.querySelector('[name=email]').value || null,
    event_type: f.querySelector('[name=event_type]').value || null,
    event_date: f.querySelector('[name=event_date]').value || null,
    location: f.querySelector('[name=location]').value || null,
    guest_count: parseInt(f.querySelector('[name=guest_count]').value) || null,
    duration: f.querySelector('[name=duration]').value || null,
    budget_estimate: parseFloat(f.querySelector('[name=budget_estimate]').value) || null,
    priority: f.querySelector('[name=priority]').value,
    status: f.querySelector('[name=status]').value,
    services_requested: f.querySelector('[name=services_requested]').value || null,
    catering: f.querySelector('[name=catering]').value || null,
    decoration: f.querySelector('[name=decoration]').value || null,
    sound_light: f.querySelector('[name=sound_light]').value || null,
    animation: f.querySelector('[name=animation]').value || null,
    notes: f.querySelector('[name=notes]').value || null,
  };
  const { error } = await sb.from('devis_requests').insert([data]);
  if (error) { showToast('Erreur : ' + error.message); return; }
  showToast('Demande enregistrée ✓');
  closeModal('newDevisRequest');
  f.reset();
  await loadDevisRequests();
  await renderDashboardDevisRequests();
}

async function updateDevisRequestStatus(id, selectEl) {
  const { error } = await sb.from('devis_requests').update({ status: selectEl.value }).eq('id', id);
  if (error) { showToast('Erreur : ' + error.message); return; }
  showToast('Statut mis à jour ✓');
  await renderDashboardDevisRequests();
}

async function deleteDevisRequest(id) {
  if (!confirm('Supprimer cette demande de devis ?')) return;
  await sb.from('devis_requests').delete().eq('id', id);
  await loadDevisRequests();
  await renderDashboardDevisRequests();
}

async function renderDashboardDevisRequests() {
  const { data, error } = await sb.from('devis_requests').select('client,priority,status').not('status', 'eq', 'Envoyé');
  if (error) return;
  const countEl = document.getElementById('stat-devis-req-count');
  const namesEl = document.getElementById('stat-devis-req-names');
  const PRIORITY_EMOJI = { 'Urgent': '🔴', 'Normal': '🟡', 'Basse': '⚪' };
  if (countEl) countEl.textContent = data.length;
  if (namesEl) namesEl.innerHTML = data.map(r => `${PRIORITY_EMOJI[r.priority] || ''} ${r.client}`).join('<br>');
}

async function loadChargesGlobales() {
  const annee = new Date().getFullYear();
  const curMonth = new Date().getMonth() + 1;
  const { data } = await sb.from('charges_monthly').select('charges_fixes,charges_variables').eq('year', annee).eq('month', curMonth).single();
  if (data) {
    if (typeof CHARGES_FIXES_MOIS !== 'undefined') {
      window.CHARGES_FIXES_MOIS = parseFloat(data.charges_fixes) || 8717.96;
      window.CHARGES_VARS_MOIS  = parseFloat(data.charges_variables) || 2000;
      window.OBJECTIF_CA_ANNUEL = window.CHARGES_FIXES_MOIS * 12;
    }
    // Met à jour les textes statiques dans la page Finance
    document.querySelectorAll('[data-charges-label]').forEach(el => {
      el.textContent = (window.CHARGES_FIXES_MOIS || 8717.96).toLocaleString('fr-FR') + ' €/mois';
    });
    // KPI rapports
    const kpiEl = document.getElementById('rkpi-charges');
    if (kpiEl) kpiEl.textContent = (window.CHARGES_FIXES_MOIS || 8717.96).toLocaleString('fr-FR') + ' €';
  }
}

async function renderDashboardProspectsRelance() {
  const { data, error } = await sb.from('prospects').select('name,status,temperature')
    .not('status', 'eq', 'Gagné')
    .not('status', 'eq', 'Perdu');
  if (error) return;
  const TEMP_EMOJI = { froid: '❄️', tiede: '🌤', chaud: '🔥' };
  const countEl = document.getElementById('stat-prospects-count');
  const namesEl = document.getElementById('stat-prospects-names');
  if (countEl) countEl.textContent = data.length;
  if (namesEl) namesEl.innerHTML = data.map(p => `${TEMP_EMOJI[p.temperature] || ''} ${p.name}`).join('<br>');
}

// =============================================
// =============================================
// EDIT EVENT
// =============================================
async function openEventDetailById(id) {
  const { data: ev } = await sb.from('events').select('*').eq('id', id).single();
  if (!ev) return;
  const form = document.getElementById('form-editEvent');
  if (!form) return;
  form.querySelector('[name=id]').value = ev.id;
  form.querySelector('[name=name]').value = ev.name || '';
  form.querySelector('[name=client]').value = ev.client || '';
  form.querySelector('[name=status]').value = ev.status || 'En préparation';
  form.querySelector('[name=event_date]').value = ev.event_date || '';
  form.querySelector('[name=start_time]').value = ev.start_time || '';
  form.querySelector('[name=end_time]').value = ev.end_time || '';
  form.querySelector('[name=location]').value = ev.location || '';
  form.querySelector('[name=contact_name]').value = ev.contact_name || '';
  form.querySelector('[name=contact_phone]').value = ev.contact_phone || '';
  form.querySelector('[name=participants]').value = ev.participants || '';
  form.querySelector('[name=amount_ht]').value = ev.amount_ht || '';
  form.querySelector('[name=notes]').value = ev.notes || '';
  openModal('editEvent');
}

async function saveEditEvent() {
  const form = document.getElementById('form-editEvent');
  if (!form) return;
  const id = form.querySelector('[name=id]').value;
  const data = {
    name: form.querySelector('[name=name]').value,
    client: form.querySelector('[name=client]').value,
    status: form.querySelector('[name=status]').value,
    event_date: form.querySelector('[name=event_date]').value,
    end_date: form.querySelector('[name=end_date]').value || null,
    start_time: form.querySelector('[name=start_time]').value || null,
    end_time: form.querySelector('[name=end_time]').value || null,
    location: form.querySelector('[name=location]').value,
    contact_name: form.querySelector('[name=contact_name]').value,
    contact_phone: form.querySelector('[name=contact_phone]').value,
    participants: parseInt(form.querySelector('[name=participants]').value) || null,
    amount_ht: parseFloat(form.querySelector('[name=amount_ht]').value) || null,
    notes: form.querySelector('[name=notes]').value,
    updated_at: new Date()
  };
  if (!data.name) { showToast('Nom obligatoire'); return; }
  try {
    const { error } = await sb.from('events').update(data).eq('id', id);
    if (error) throw error;
    closeModal('editEvent');
    await loadAndRenderEvents();
    showToast('Événement modifié ✓');
  } catch(e) { showToast('Erreur : ' + e.message); }
}

// =============================================
// NOTIFICATIONS
// =============================================
let allNotifications = [];

async function loadNotifications() {
  const myName = currentProfile?.name || '';
  const isRomain = myName === 'Romain';
  // Canal DM de l'utilisateur (messages privés reçus)
  const dmChannel = 'dm-' + myName.toLowerCase();

  const promises = [
    // Tâches assignées à moi, non terminées
    sb.from('tasks').select('*').neq('status','done').ilike('assignee', `%${myName}%`),
    // Messages privés reçus dans mon canal DM (dernières 24h)
    sb.from('messages').select('*').eq('channel', dmChannel).order('created_at', { ascending: false }).limit(10),
  ];
  if (isRomain) {
    // Congés en attente à valider
    promises.push(sb.from('leaves').select('*').eq('status','pending'));
  }

  const results = await Promise.all(promises);
  const myTasks = results[0]?.data || [];
  const myDMs = (results[1]?.data || []).filter(m => m.author_name !== myName); // seulement ceux des autres
  const pendingLeaves = isRomain ? (results[2]?.data || []) : [];

  allNotifications = [
    ...myTasks.map(t => ({
      type: 'task',
      text: `📋 Tâche : ${t.title}${t.priority === 'Urgent' ? ' 🔴' : ''}`,
      action: () => showPage('tasks')
    })),
    ...myDMs.map(m => ({
      type: 'message',
      text: `💬 Message de ${m.author_name} : "${m.content.slice(0, 50)}${m.content.length > 50 ? '…' : ''}"`,
      action: () => { showPage('messages'); switchChannel(dmChannel); }
    })),
    ...pendingLeaves.map(l => ({
      type: 'leave',
      text: `🏖 Congé à valider : ${l.person_name} — ${new Date(l.leave_date).toLocaleDateString('fr-FR')}`,
      action: () => showPage('leaves')
    }))
  ];

  const badge = document.getElementById('notifBadge');
  if (badge) {
    badge.textContent = allNotifications.length || '';
    badge.style.display = allNotifications.length ? 'flex' : 'none';
  }
  renderNotifPanel();
}

function renderNotifPanel() {
  const list = document.getElementById('notifList');
  if (!list) return;
  if (!allNotifications.length) {
    list.innerHTML = '<p style="color:var(--text2);font-size:.85rem;text-align:center">Aucune notification</p>';
    return;
  }
  list.innerHTML = allNotifications.map((n,i) => `
    <div onclick="handleNotif(${i})" style="padding:.6rem .75rem;border-radius:8px;cursor:pointer;font-size:.85rem;margin-bottom:.4rem;background:var(--bg3);hover:var(--bg4)">
      ${n.text}
    </div>`).join('');
}

function handleNotif(i) {
  allNotifications[i]?.action?.();
  toggleNotifPanel();
}

function toggleNotifPanel() {
  const panel = document.getElementById('notifPanel');
  if (!panel) return;
  const isOpen = panel.style.display !== 'none';
  panel.style.display = isOpen ? 'none' : 'flex';
  panel.style.flexDirection = 'column';
  if (!isOpen) loadNotifications();
}

// Close notif panel when clicking outside
document.addEventListener('click', e => {
  const panel = document.getElementById('notifPanel');
  const btn = document.getElementById('notifBtn');
  if (panel && btn && !panel.contains(e.target) && !btn.contains(e.target)) {
    panel.style.display = 'none';
  }
});

// =============================================
// SUPPLIERS FILTER
// =============================================
let allSuppliers = [];

async function filterSuppliers(category, btn) {
  document.querySelectorAll('#page-suppliers .filter-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  if (!allSuppliers.length) allSuppliers = await fetchSuppliers();
  const filtered = category ? allSuppliers.filter(s => s.category === category) : allSuppliers;
  if (!filtered.length) {
    const grid = document.querySelector('#page-suppliers .supplier-grid');
    if (grid) grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;color:var(--text2);padding:2rem">
      Aucun fournisseur dans cette catégorie.<br>
      <button class="btn-primary" style="margin-top:1rem" onclick="openModal('newSupplier')">+ Ajouter un ${category || 'fournisseur'}</button>
    </div>`;
  } else {
    renderSuppliers(filtered);
  }
}

// =============================================
// KNOWLEDGE BASE FILTER
// =============================================
let allDocs = [];

async function loadAndRenderKnowledge() {
  const { data } = await sb.from('knowledge').select('*').order('created_at', { ascending: false });
  allDocs = data || [];
  updateKnowledgeCounts();
  renderKnowledgeList(allDocs);
}

function updateKnowledgeCounts() {
  document.querySelectorAll('.kcat-count').forEach(el => {
    const cat = el.dataset.cat;
    el.textContent = allDocs.filter(d => d.category === cat).length + ' doc(s)';
  });
  const total = document.getElementById('kcat-total');
  if (total) total.textContent = allDocs.length + ' doc(s)';
}

function filterKnowledge(category) {
  const filtered = category ? allDocs.filter(d => d.category === category) : allDocs;
  const title = document.getElementById('knowledge-section-title');
  if (title) title.textContent = category || 'Tous les documents';
  renderKnowledgeList(filtered);
}

function renderKnowledgeList(docs) {
  const list = document.getElementById('knowledge-doc-list');
  if (!list) return;
  if (!docs.length) {
    list.innerHTML = '<p style="color:var(--text2);text-align:center;padding:2rem">Aucun document — cliquez sur "+ Nouveau document"</p>';
    return;
  }
  const typeIcon = { document:'📄', checklist:'✅', tutorial:'🎓', faq:'❓' };
  list.innerHTML = docs.map(d => `
    <div class="doc-item">
      <div class="doc-icon">${typeIcon[d.type] || '📄'}</div>
      <div class="doc-info">
        <strong>${d.title}</strong>
        <span>${d.category || ''} • ${d.author_name || ''} • ${new Date(d.created_at).toLocaleDateString('fr-FR')}</span>
      </div>
      <button class="btn-sm" onclick="viewKnowledgeDoc('${d.id}')">Ouvrir</button>
      <button onclick="deleteKnowledgeDoc('${d.id}')" style="background:none;border:none;color:var(--text3);cursor:pointer;margin-left:4px">🗑️</button>
    </div>`).join('');
}

// =============================================
// MESSAGES — UPDATE CHAT HEADER
// =============================================
function mobileSwitchChannel(btn, channel, label) {
  document.querySelectorAll('.msg-mobile-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  // Sync sidebar
  document.querySelectorAll('.channel-item').forEach(i => {
    i.classList.toggle('active', i.dataset.channel === channel);
  });
  switchChannel(channel);
}

async function markChannelRead(channel) {
  if (!currentUser) return;
  await sb.from('message_reads').upsert({ user_id: currentUser.id, channel, last_read_at: new Date().toISOString() }, { onConflict: 'user_id,channel' });
  // Efface le badge du channel
  const badge = document.getElementById('badge-' + channel);
  if (badge) { badge.textContent = ''; badge.style.background = '#4CAF50'; badge.style.minWidth = '10px'; badge.style.width = '10px'; badge.style.height = '10px'; badge.style.padding = '0'; badge.style.display = 'inline-flex'; }
  refreshNavMessageBadge();
}

async function loadUnreadCounts() {
  if (!currentUser) return;
  const channels = ['general', 'annonces', 'dm-romain', 'dm-ketsia', 'dm-flora', 'dm-gloria'];
  const { data: reads } = await sb.from('message_reads').select('channel,last_read_at').eq('user_id', currentUser.id);
  const readMap = {};
  (reads || []).forEach(r => { readMap[r.channel] = r.last_read_at; });

  let totalUnread = 0;
  for (const ch of channels) {
    const lastRead = readMap[ch] || '1970-01-01T00:00:00Z';
    let q = sb.from('messages').select('id', { count: 'exact', head: true })
      .eq('channel', ch)
      .neq('author_id', currentUser.id)
      .gt('created_at', lastRead);
    const { count } = await q;
    const n = count || 0;
    const badge = document.getElementById('badge-' + ch);
    if (badge) {
      badge.style.display = 'inline-flex';
      if (n > 0) {
        badge.textContent = n > 99 ? '99+' : n;
        badge.style.background = '#f44336';
        badge.style.minWidth = '18px';
      } else {
        badge.textContent = '';
        badge.style.background = '#4CAF50';
        badge.style.minWidth = '10px';
        badge.style.width = '10px';
        badge.style.height = '10px';
        badge.style.padding = '0';
      }
    }
    totalUnread += n;
  }
  refreshNavMessageBadge(totalUnread);
}

function refreshNavMessageBadge(total) {
  const navBadge = document.getElementById('nav-badge-messages');
  if (!navBadge) return;
  if (total === undefined) {
    // Recalcule depuis les badges existants
    let t = 0;
    ['general','annonces','dm-romain','dm-ketsia','dm-flora','dm-gloria'].forEach(ch => {
      const b = document.getElementById('badge-' + ch);
      if (b && b.style.display !== 'none') t += parseInt(b.textContent) || 0;
    });
    total = t;
  }
  if (total > 0) { navBadge.textContent = total > 99 ? '99+' : total; navBadge.style.display = 'inline-flex'; }
  else navBadge.style.display = 'none';
}

async function switchChannel(channel) {
  activeChannel = channel;
  if (messageSubscription) { sb.removeChannel(messageSubscription); }

  // Update header
  const header = document.getElementById('chatHeader');
  if (header) {
    const labels = { general:'# général', annonces:'# annonces', 'dm-romain':'💬 Romain', 'dm-ketsia':'💬 Ketsia', 'dm-flora':'💬 Flora', 'dm-gloria':'💬 Gloria' };
    header.textContent = labels[channel] || '# ' + channel;
  }

  await markChannelRead(channel);
  const messages = await fetchMessages(channel);
  renderMessages(messages);
  messageSubscription = subscribeToMessages(channel, (msg) => {
    const container = document.getElementById('chatMessages');
    if (!container) return;
    const isMine = msg.author_name === (currentProfile?.name || currentUser?.email);
    if (!isMine) {
      showMessageNotification(msg);
      loadUnreadCounts();
    }
    const time = new Date(msg.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const div = document.createElement('div');
    div.className = `chat-msg ${isMine ? 'mine' : ''}`;
    div.innerHTML = `${!isMine ? `<div class="chat-avatar">${chatAvatar(msg.author_name)}</div>` : ''}
      <div class="chat-bubble">
        ${!isMine ? `<div class="chat-name">${msg.author_name}</div>` : ''}
        <div class="chat-text">${msg.content}</div>
        <div class="chat-time">${time}</div>
      </div>`;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
  });
}

function showMessageNotification(msg) {
  if (Notification.permission !== 'granted') return;
  const channelLabels = { general: '# général', annonces: '# annonces', 'dm-romain': 'MP Romain', 'dm-ketsia': 'MP Ketsia', 'dm-flora': 'MP Flora', 'dm-gloria': 'MP Gloria' };
  const label = channelLabels[msg.channel] || msg.channel;
  const notif = new Notification(`${msg.author_name} — ${label}`, {
    body: msg.content,
    icon: '/logo-192.png',
    badge: '/logo-192.png',
    tag: msg.channel,
    renotify: true
  });
  notif.onclick = () => {
    window.focus();
    switchChannel(msg.channel);
    document.querySelectorAll('.channel-item').forEach(i => i.classList.toggle('active', i.dataset.channel === msg.channel));
    notif.close();
  };
}

async function requestNotificationPermission() {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'default') {
    await Notification.requestPermission();
  }
}

// =============================================
// AVATARS PHOTOS
// =============================================
const personColors = {
  'Romain': 'var(--color-romain)', 'Romain Capdepont': 'var(--color-romain)',
  'Ketsia': 'var(--color-ketsia)',
  'Flora': 'var(--color-flora)',   'Flora Boyer': 'var(--color-flora)',
  'Gloria': 'var(--color-gloria)',
};
const personTextColors = {
  'Romain': '#000', 'Romain Capdepont': '#000',
  'Ketsia': '#fff', 'Flora': '#fff', 'Flora Boyer': '#fff', 'Gloria': '#fff',
};
const avatarPhotos = {
  'Romain': 'photos/romain.jpg', 'Romain Capdepont': 'photos/romain.jpg',
  'Flora': 'photos/flora.jpg',   'Flora Boyer': 'photos/flora.jpg',
  'Ketsia': 'photos/ketsia.jpg',
};

function chatAvatar(name) {
  const photo = avatarPhotos[name];
  if (photo) return `<img src="${photo}" style="width:32px;height:32px;border-radius:50%;object-fit:cover;object-position:top;border:2px solid ${personColors[name] || '#333'}" alt="${name}">`;
  const bg = personColors[name] || '#333';
  const fg = personTextColors[name] || '#fff';
  return `<span style="display:flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:50%;background:${bg};color:${fg};font-weight:700;font-size:13px">${(name||'?')[0].toUpperCase()}</span>`;
}

function miniAvatar(name, size = 24) {
  const photo = avatarPhotos[name];
  if (photo) return `<img src="${photo}" style="width:${size}px;height:${size}px;border-radius:50%;object-fit:cover;object-position:top;border:1.5px solid ${personColors[name]||'#333'}" alt="${name}">`;
  const bg = personColors[name] || '#333';
  const fg = personTextColors[name] || '#fff';
  return `<span style="display:inline-flex;align-items:center;justify-content:center;width:${size}px;height:${size}px;border-radius:50%;background:${bg};color:${fg};font-weight:700;font-size:${Math.round(size*0.45)}px;flex-shrink:0">${(name||'?')[0].toUpperCase()}</span>`;
}

// =============================================
// PERSONNEL DETAIL
// =============================================
const personnelData = {
  'Romain': {
    nom: 'Romain Capdepont', role: 'Président SASU', contrat: 'Gérant',
    email: 'romain@pullup.re', photo: 'photos/romain.jpg',
    salaire: '1 950 €/mois', vehicule: 'Mercedes Classe A — DS591QS',
    bareme_km: '0,374 €/km', heures: '~180h/mois',
    domicile: 'La Réunion', notes: 'Président et fondateur de Pull Up Événements'
  },
  'Ketsia': {
    nom: 'Ketsia', role: 'Responsable Projet', contrat: 'CDI',
    email: 'ketsia@pullup.re', photo: 'photos/ketsia.jpg',
    salaire: '1 950 €/mois', vehicule: '—', bareme_km: '—', heures: '~150h/mois',
    domicile: '—', notes: ''
  },
  'Flora': {
    nom: 'Flora Boyer', role: 'Alternante', contrat: 'Alternance',
    email: 'flora@pullup.re', photo: 'photos/flora.jpg',
    salaire: '1 112 €/mois', vehicule: 'Peugeot 207 (4CV)', bareme_km: '0,374 €/km',
    heures: '124h (Juin)', domicile: 'Le Tampon', notes: 'Congés pris : 4 jours'
  },
  'Gloria': {
    nom: 'Gloria', role: 'Commerciale', contrat: 'CDI',
    email: 'gloria@pullup.re', photo: null,
    salaire: '—', vehicule: '—', bareme_km: '—', heures: '~140h/mois',
    domicile: '—', notes: ''
  }
};

function openPersonnelDetail(name) {
  const p = personnelData[name];
  if (!p) return;
  document.getElementById('personnelDetailTitle').textContent = p.nom;
  document.getElementById('personnelDetailBody').innerHTML = `
    ${p.photo ? `<img src="${p.photo}" class="personnel-avatar-photo-lg" alt="${p.nom}">` : ''}
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">
      <div><span style="color:var(--text2);font-size:.8rem">RÔLE</span><div style="font-weight:600;margin-top:.2rem">${p.role}</div></div>
      <div><span style="color:var(--text2);font-size:.8rem">CONTRAT</span><div style="font-weight:600;margin-top:.2rem">${p.contrat}</div></div>
      <div><span style="color:var(--text2);font-size:.8rem">EMAIL</span><div style="margin-top:.2rem">${p.email}</div></div>
      <div><span style="color:var(--text2);font-size:.8rem">SALAIRE</span><div style="font-weight:600;color:var(--gold);margin-top:.2rem">${p.salaire}</div></div>
      <div><span style="color:var(--text2);font-size:.8rem">HEURES CE MOIS</span><div style="margin-top:.2rem">${p.heures}</div></div>
      <div><span style="color:var(--text2);font-size:.8rem">BARÈME KM</span><div style="margin-top:.2rem">${p.bareme_km}</div></div>
      <div><span style="color:var(--text2);font-size:.8rem">VÉHICULE</span><div style="margin-top:.2rem">${p.vehicule}</div></div>
      <div><span style="color:var(--text2);font-size:.8rem">DOMICILE</span><div style="margin-top:.2rem">${p.domicile}</div></div>
      ${p.notes ? `<div style="grid-column:1/-1"><span style="color:var(--text2);font-size:.8rem">NOTES</span><div style="margin-top:.2rem">${p.notes}</div></div>` : ''}
    </div>`;
  openModal('personnelDetail');
}

// =============================================
// BOOT
// =============================================
document.addEventListener('DOMContentLoaded', async () => {
  // Vérifier session existante
  const { data: { session } } = await sb.auth.getSession();
  if (session) {
    currentUser = session.user;
    currentProfile = await loadProfile(session.user.id);
    showApp();
    await initApp();
  } else {
    showLoginScreen();
  }

  // Login form
  document.getElementById('login-form')?.addEventListener('submit', handleLogin);

  // Logout button
  document.getElementById('btn-logout')?.addEventListener('click', signOut);

  // Send message
  document.getElementById('chatInput')?.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChatMessage(); }
  });
  document.getElementById('btn-sendMsg')?.addEventListener('click', sendChatMessage);

  // Channel switching
  document.querySelectorAll('.channel-item').forEach(item => {
    item.addEventListener('click', () => {
      document.querySelectorAll('.channel-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      const ch = item.dataset.channel || 'general';
      // Sync barre mobile
      document.querySelectorAll('.msg-mobile-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.channel === ch);
      });
      switchChannel(ch);
    });
  });
});

// =============================================
// CONGÉS
// =============================================
let leaveViewDate = new Date();
const LEAVE_TOTAL = 20; // jours ouvrés par an (4 semaines)
const LEAVE_MEMBERS = ['Romain', 'Ketsia', 'Flora', 'Gloria'];
const LEAVE_PHOTOS = { Romain: 'photos/romain.jpg', Ketsia: 'photos/ketsia.jpg', Flora: 'photos/flora.jpg', Gloria: 'photos/gloria.jpg' };
const LEAVE_COLORS = { Romain: 'var(--color-romain)', Ketsia: 'var(--color-ketsia)', Flora: 'var(--color-flora)', Gloria: 'var(--color-gloria)' };
const LEAVE_COLORS_HEX = { Romain: '#F5C518', Ketsia: '#4A9EFF', Flora: '#FF6B9D', Gloria: '#9B59B6' };

let allLeaves = [];
let currentUserName = 'Romain';

async function loadAndRenderLeaves() {
  // Détecter l'utilisateur connecté
  const { data: { user } } = await sb.auth.getUser();
  if (user?.email) {
    if (user.email.includes('ketsia')) currentUserName = 'Ketsia';
    else if (user.email.includes('flora')) currentUserName = 'Flora';
    else if (user.email.includes('gloria')) currentUserName = 'Gloria';
    else currentUserName = 'Romain';
  }

  const year = leaveViewDate.getFullYear();
  const { data, error } = await sb.from('leaves').select('*').gte('leave_date', year + '-01-01').lte('leave_date', year + '-12-31').order('leave_date');
  if (error) { showToast('Erreur congés : ' + error.message); return; }
  allLeaves = data || [];

  renderLeaveCards();
  renderLeavePending();
  renderLeaveCalendar();
  updateLeavesMonthLabel();
}

function updateLeavesMonthLabel() {
  const label = document.getElementById('leaves-month-label');
  if (label) label.textContent = leaveViewDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
}

function leavePrevMonth() {
  leaveViewDate = new Date(leaveViewDate.getFullYear(), leaveViewDate.getMonth() - 1, 1);
  renderLeaveCalendar();
  updateLeavesMonthLabel();
}

function leaveNextMonth() {
  leaveViewDate = new Date(leaveViewDate.getFullYear(), leaveViewDate.getMonth() + 1, 1);
  renderLeaveCalendar();
  updateLeavesMonthLabel();
}

function renderLeaveCards() {
  const container = document.getElementById('leaves-cards');
  if (!container) return;
  const year = leaveViewDate.getFullYear();
  const yearLeaves = allLeaves.filter(l => l.leave_date.startsWith(year));

  container.innerHTML = LEAVE_MEMBERS.map(name => {
    const approved = yearLeaves.filter(l => l.person_name === name && l.status === 'approved').length;
    const pending = yearLeaves.filter(l => l.person_name === name && l.status === 'pending').length;
    const remaining = LEAVE_TOTAL - approved;
    const pct = Math.round((approved / LEAVE_TOTAL) * 100);
    const color = LEAVE_COLORS_HEX[name];
    return `<div class="card" style="text-align:center;padding:1.25rem">
      <img src="${LEAVE_PHOTOS[name]}" style="width:64px;height:64px;border-radius:50%;object-fit:cover;border:3px solid ${color};margin:0 auto .75rem;display:block" onerror="this.style.display='none'">
      <div style="font-weight:700;font-size:1rem;margin-bottom:.25rem">${name}</div>
      <div style="font-size:2rem;font-weight:800;color:${color};line-height:1">${remaining}</div>
      <div style="font-size:.75rem;color:var(--text2);margin-bottom:.75rem">jours restants / ${LEAVE_TOTAL}</div>
      ${pending > 0 ? `<div style="font-size:.75rem;background:rgba(245,197,24,.15);color:var(--gold);border-radius:6px;padding:2px 8px;margin-bottom:.5rem">${pending} en attente</div>` : ''}
      <div style="background:var(--bg3);border-radius:99px;height:6px;overflow:hidden">
        <div style="height:100%;width:${pct}%;background:${color};border-radius:99px;transition:.3s"></div>
      </div>
      <div style="font-size:.72rem;color:var(--text3);margin-top:.3rem">${approved} pris</div>
    </div>`;
  }).join('');
}

function renderLeavePending() {
  const section = document.getElementById('leaves-pending-section');
  const list = document.getElementById('leaves-pending-list');
  if (!section || !list) return;
  const pending = allLeaves.filter(l => l.status === 'pending');
  if (!pending.length) { section.style.display = 'none'; return; }
  section.style.display = 'block';
  list.innerHTML = pending.map(l => {
    const date = new Date(l.leave_date).toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long' });
    const color = LEAVE_COLORS_HEX[l.person_name];
    const isRomain = currentUserName === 'Romain';
    return `<div style="display:flex;align-items:center;gap:.75rem;background:var(--bg2);border:1px solid var(--border);border-radius:10px;padding:.75rem 1rem">
      <span style="width:10px;height:10px;border-radius:50%;background:${color};flex-shrink:0"></span>
      <span style="font-weight:600;color:${color}">${l.person_name}</span>
      <span style="color:var(--text);flex:1">${date}</span>
      ${isRomain ? `
        <button onclick="approveLeave('${l.id}')" style="background:var(--success);color:#000;border:none;border-radius:6px;padding:4px 12px;cursor:pointer;font-size:.8rem;font-weight:600">✓ Valider</button>
        <button onclick="rejectLeave('${l.id}')" style="background:var(--danger);color:#fff;border:none;border-radius:6px;padding:4px 12px;cursor:pointer;font-size:.8rem">✕ Refuser</button>
      ` : '<span style="font-size:.8rem;color:var(--gold)">En attente de validation</span>'}
    </div>`;
  }).join('');
}

function renderLeaveCalendar() {
  const container = document.getElementById('leaves-calendar');
  if (!container) return;

  const year = leaveViewDate.getFullYear();
  const month = leaveViewDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDow = (firstDay.getDay() + 6) % 7; // lundi = 0

  const days = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  // Index leaves by date
  const leaveByDate = {};
  allLeaves.forEach(l => {
    if (!leaveByDate[l.leave_date]) leaveByDate[l.leave_date] = [];
    leaveByDate[l.leave_date].push(l);
  });

  let html = `<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;margin-bottom:4px">
    ${days.map(d => `<div style="text-align:center;font-size:.75rem;font-weight:600;color:var(--text2);padding:4px">${d}</div>`).join('')}
  </div><div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px">`;

  // Cellules vides avant le premier jour
  for (let i = 0; i < startDow; i++) {
    html += `<div style="min-height:72px"></div>`;
  }

  const today = new Date().toISOString().slice(0, 10);

  for (let d = 1; d <= lastDay.getDate(); d++) {
    const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const dow = (new Date(year, month, d).getDay() + 6) % 7;
    const isWeekend = dow >= 5;
    const isToday = dateStr === today;
    const isPast = dateStr < today;
    const leavesOnDay = leaveByDate[dateStr] || [];
    const myLeave = leavesOnDay.find(l => l.person_name === currentUserName);

    let cellStyle = `min-height:72px;border-radius:8px;padding:4px;position:relative;cursor:${isWeekend || isPast ? 'default' : 'pointer'};`;
    cellStyle += `background:${isWeekend ? 'var(--bg)' : 'var(--bg3)'};`;
    if (isToday) cellStyle += 'border:2px solid var(--gold);';
    if (isWeekend) cellStyle += 'opacity:.4;';

    const clickAttr = (!isWeekend && !isPast) ? `onclick="requestLeaveDay('${dateStr}')"` : '';

    html += `<div style="${cellStyle}" ${clickAttr}>
      <div style="font-size:.8rem;font-weight:${isToday?'700':'400'};color:${isToday?'var(--gold)':'var(--text2)'};margin-bottom:3px">${d}</div>
      ${leavesOnDay.map(l => `
        <div style="background:${LEAVE_COLORS_HEX[l.person_name]};border-radius:4px;padding:1px 5px;font-size:.68rem;font-weight:600;color:${l.person_name==='Romain'?'#000':'#fff'};margin-bottom:2px;opacity:${l.status==='pending'?'0.6':'1'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${l.person_name}${l.status==='pending'?' (attente)':''}">
          ${l.person_name}${l.status==='pending'?' ⏳':''}
        </div>`).join('')}
    </div>`;
  }

  html += '</div>';
  container.innerHTML = html;
}

async function requestLeaveDay(dateStr) {
  const existing = allLeaves.find(l => l.person_name === currentUserName && l.leave_date === dateStr);
  if (existing) {
    if (!confirm(`Annuler le congé du ${new Date(dateStr).toLocaleDateString('fr-FR')} ?`)) return;
    await sb.from('leaves').delete().eq('id', existing.id);
    showToast('Congé annulé');
    await loadAndRenderLeaves();
    return;
  }
  const dateLabel = new Date(dateStr).toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long' });
  if (!confirm(`Demander un congé le ${dateLabel} ?`)) return;

  const { error } = await sb.from('leaves').insert({
    person_name: currentUserName,
    leave_date: dateStr,
    status: currentUserName === 'Romain' ? 'approved' : 'pending'
  });
  if (error) { showToast('Erreur : ' + error.message); return; }

  // Notification pour Romain
  if (currentUserName !== 'Romain') {
    await sb.from('notifications').insert({
      type: 'leave_request',
      title: `Congé demandé par ${currentUserName}`,
      message: `${currentUserName} demande un congé le ${dateLabel}`,
      read: false
    }).catch(() => {});
  }

  showToast(currentUserName === 'Romain' ? 'Congé posé ✓' : 'Demande envoyée à Romain ✓');
  await loadAndRenderLeaves();
}

async function approveLeave(id) {
  await sb.from('leaves').update({ status: 'approved', approved_at: new Date() }).eq('id', id);
  showToast('Congé validé ✓');
  await loadAndRenderLeaves();
}

async function rejectLeave(id) {
  if (!confirm('Refuser ce congé ?')) return;
  await sb.from('leaves').delete().eq('id', id);
  showToast('Congé refusé');
  await loadAndRenderLeaves();
}

// =============================================
// SUIVI FLORA
// =============================================
let floraViewDate = new Date();

const FLORA_DAY_TYPES = {
  bureau:    { label: '🏢 Bureau',       color: '#4A9EFF' },
  terrain:   { label: '🏕 Terrain',      color: '#F5C518' },
  formation: { label: '📚 Formation',    color: '#9B59B6' },
  ferie:     { label: '🎉 Férié',        color: '#4CAF50' },
  conge:     { label: '🏖 Congé',        color: '#FF6B9D' },
  fermeture: { label: '🔒 Ferm. agence', color: '#FF9800' },
};

async function loadAndRenderFlora() {
  const y = floraViewDate.getFullYear();
  const m = floraViewDate.getMonth();
  const label = document.getElementById('flora-month-label');
  if (label) label.textContent = floraViewDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

  const from = `${y}-${String(m+1).padStart(2,'0')}-01`;
  const to   = `${y}-${String(m+1).padStart(2,'0')}-${new Date(y,m+1,0).getDate()}`;

  const { data } = await sb.from('flora_timesheet').select('*').gte('date', from).lte('date', to);
  const byDate = {};
  (data || []).forEach(r => { byDate[r.date] = r; });

  renderFloraTable(y, m, byDate);
  await renderFloraMonthlySummary();
}

async function renderFloraMonthlySummary() {
  const container = document.getElementById('flora-summary');
  if (!container) return;
  const { data } = await sb.from('flora_timesheet').select('*').order('date');
  if (!data || !data.length) return;

  // Grouper par mois
  const byMonth = {};
  data.forEach(r => {
    const key = r.date.slice(0,7); // YYYY-MM
    if (!byMonth[key]) byMonth[key] = [];
    byMonth[key].push(r);
  });

  const MNAMES = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
  let html = '<table class="data-table" style="min-width:600px"><thead><tr><th>Mois</th><th>Heures</th><th>H. supp</th><th>Congés</th><th>Ind. km</th><th>Jours Bureau</th><th>Jours Terrain</th><th>Jours Formation</th></tr></thead><tbody>';

  let totH=0,totE=0,totC=0,totK=0;
  Object.keys(byMonth).sort().forEach(key => {
    const rows = byMonth[key];
    const h   = rows.reduce((s,r)=>s+(parseFloat(r.hours)||0),0);
    const e   = rows.reduce((s,r)=>s+(parseFloat(r.extra_hours)||0),0);
    const c   = rows.reduce((s,r)=>s+(parseFloat(r.leave_days)||0),0);
    const k   = rows.reduce((s,r)=>s+(parseFloat(r.km_indemnity)||0),0);
    const nBureau    = rows.filter(r=>r.day_type==='bureau').length;
    const nTerrain   = rows.filter(r=>r.day_type==='terrain').length;
    const nFormation = rows.filter(r=>r.day_type==='formation').length;
    totH+=h; totE+=e; totC+=c; totK+=k;
    const [yr,mo] = key.split('-');
    html += `<tr>
      <td><strong>${MNAMES[parseInt(mo)-1]} ${yr}</strong></td>
      <td style="color:var(--color-flora);font-weight:600">${h.toFixed(1)}h</td>
      <td style="color:var(--gold)">${e>0?'+'+e.toFixed(1)+'h':'—'}</td>
      <td style="color:#4A9EFF">${c>0?c+'j':'—'}</td>
      <td style="color:#9B59B6">${k>0?k.toLocaleString('fr-FR')+' €':'—'}</td>
      <td>${nBureau||'—'}</td>
      <td>${nTerrain||'—'}</td>
      <td>${nFormation||'—'}</td>
    </tr>`;
  });

  html += `<tr style="font-weight:700;border-top:2px solid var(--border);background:var(--bg3)">
    <td>TOTAL</td>
    <td style="color:var(--color-flora)">${totH.toFixed(1)}h</td>
    <td style="color:var(--gold)">${totE>0?'+'+totE.toFixed(1)+'h':'—'}</td>
    <td style="color:#4A9EFF">${totC>0?totC+'j':'—'}</td>
    <td style="color:#9B59B6">${totK>0?totK.toLocaleString('fr-FR')+' €':'—'}</td>
    <td></td><td></td><td></td>
  </tr></tbody></table>`;
  container.innerHTML = html;
}

function renderFloraTable(year, month, byDate) {
  const tbody = document.getElementById('flora-tbody');
  if (!tbody) return;

  const daysInMonth = new Date(year, month+1, 0).getDate();
  const dayNames = ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'];
  const monthNames = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

  let html = '';
  let totalHours = 0, totalExtra = 0, totalConge = 0, totalKm = 0;

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const dow = new Date(year, month, d).getDay();
    const isWeekend = dow === 0 || dow === 6;
    const r = byDate[dateStr];

    const dayType = r?.day_type || (isWeekend ? 'repos' : null);
    const cfg = FLORA_DAY_TYPES[dayType] || {};
    const rowBg = isWeekend ? 'background:var(--bg2)' : '';
    const hours = r?.hours || '';
    const extra = r?.extra_hours || '';
    const conge = r?.leave_days || '';
    const km = r?.km_indemnity || '';

    if (hours) totalHours += parseFloat(hours);
    if (extra) totalExtra += parseFloat(extra);
    if (conge) totalConge += parseFloat(conge);
    if (km) totalKm += parseFloat(km);

    html += `<tr style="${rowBg};cursor:pointer" onclick="openFloraDay('${dateStr}')">
      <td style="font-weight:600;color:${isWeekend?'var(--text3)':'var(--text)'}">${dayNames[dow]} ${d}</td>
      <td>${cfg.label ? `<span style="color:${cfg.color};font-weight:600">${cfg.label}</span>` : '<span style="color:var(--text3)">—</span>'}</td>
      <td>${hours ? hours + 'h' : '—'}</td>
      <td>${extra ? '<span style="color:var(--gold)">+'+extra+'h</span>' : '—'}</td>
      <td>${conge ? '<span style="color:var(--color-flora)">'+conge+'j</span>' : '—'}</td>
      <td style="text-align:center">${r?.agency_closed ? '🔒' : '—'}</td>
      <td style="font-size:.8rem;color:var(--text2)">${r?.trips || '—'}</td>
      <td>${km ? km.toLocaleString('fr-FR')+'€' : '—'}</td>
      <td style="font-size:.8rem;color:var(--text2)">${r?.external_service || '—'}</td>
      <td style="font-size:.8rem;color:var(--text2);max-width:160px">${r?.notes || '—'}</td>
    </tr>`;
  }

  // Ligne total
  html += `<tr style="font-weight:700;border-top:2px solid var(--border);background:var(--bg3)">
    <td>TOTAL</td>
    <td></td>
    <td style="color:var(--color-flora)">${totalHours.toFixed(1)}h</td>
    <td style="color:var(--gold)">${totalExtra > 0 ? '+'+totalExtra.toFixed(1)+'h' : '—'}</td>
    <td style="color:#4A9EFF">${totalConge > 0 ? totalConge+'j' : '—'}</td>
    <td></td><td></td>
    <td style="color:#9B59B6">${totalKm > 0 ? totalKm.toLocaleString('fr-FR')+'€' : '—'}</td>
    <td></td><td></td>
  </tr>`;

  tbody.innerHTML = html;

  // KPIs
  const h = id => document.getElementById(id);
  if (h('fkpi-hours')) h('fkpi-hours').textContent = totalHours.toFixed(1) + 'h';
  if (h('fkpi-extra')) h('fkpi-extra').textContent = totalExtra > 0 ? '+' + totalExtra.toFixed(1) + 'h' : '0h';
  if (h('fkpi-conge')) h('fkpi-conge').textContent = totalConge + 'j';
  if (h('fkpi-km')) h('fkpi-km').textContent = totalKm.toLocaleString('fr-FR') + ' €';
}

function floraNav(dir) {
  floraViewDate = new Date(floraViewDate.getFullYear(), floraViewDate.getMonth() + dir, 1);
  loadAndRenderFlora();
}

function openFloraDay(dateStr) {
  const form = document.getElementById('form-floraDay');
  if (!form) return;
  form.reset();
  form.querySelector('[name=date]').value = dateStr;
  const d = new Date(dateStr + 'T00:00:00');
  document.getElementById('flora-modal-title').textContent =
    d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  // Pré-remplir si données existantes
  sb.from('flora_timesheet').select('*').eq('date', dateStr).single().then(({ data: r }) => {
    if (!r) return;
    form.querySelector('[name=day_type]').value = r.day_type || 'bureau';
    form.querySelector('[name=hours]').value = r.hours || '';
    form.querySelector('[name=extra_hours]').value = r.extra_hours || '';
    form.querySelector('[name=leave_days]').value = r.leave_days || '';
    form.querySelector('[name=trips]').value = r.trips || '';
    form.querySelector('[name=km_indemnity]').value = r.km_indemnity || '';
    form.querySelector('[name=external_service]').value = r.external_service || '';
    form.querySelector('[name=notes]').value = r.notes || '';
  });
  openModal('floraDay');
}

async function saveFloraDay(e) {
  e.preventDefault();
  const form = e.target;
  const dateStr = form.querySelector('[name=date]').value;
  const data = {
    date: dateStr,
    day_type: form.querySelector('[name=day_type]').value,
    hours: parseFloat(form.querySelector('[name=hours]').value) || null,
    extra_hours: parseFloat(form.querySelector('[name=extra_hours]').value) || 0,
    leave_days: parseFloat(form.querySelector('[name=leave_days]').value) || 0,
    trips: form.querySelector('[name=trips]').value || null,
    km_indemnity: parseFloat(form.querySelector('[name=km_indemnity]').value) || 0,
    external_service: form.querySelector('[name=external_service]').value || null,
    notes: form.querySelector('[name=notes]').value || null,
  };
  const { error } = await sb.from('flora_timesheet').upsert([data], { onConflict: 'date' });
  if (error) { showToast('Erreur : ' + error.message); return; }
  showToast('Enregistré ✓');
  closeModal('floraDay');
  await loadAndRenderFlora();
}

// =============================================
// CHARGES
// =============================================

const MOIS_LABELS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

let _chargesMonthly = [];
let _chargesFixes = [];
let _chargesVarsItems = [];

async function loadCharges() {
  const annee = parseInt(document.getElementById('charges-year-sel')?.value || 2026);
  const [rm, rf, rv] = await Promise.all([
    sb.from('charges_monthly').select('*').eq('year', annee).order('month'),
    sb.from('charges_fixes').select('*').order('categorie').order('label'),
    sb.from('charges_variables_items').select('*').order('categorie').order('label')
  ]);
  if (rf.error) console.error('charges_fixes error:', rf.error);
  if (rv.error) console.error('charges_variables_items error:', rv.error);
  _chargesMonthly = rm.data || [];
  _chargesFixes = rf.data || [];
  _chargesVarsItems = rv.data || [];
  console.log('charges_fixes:', _chargesFixes.length, 'items | charges_variables_items:', _chargesVarsItems.length, 'items');
  renderChargesMonthly(annee);
  renderChargesFixesDetail();
  renderChargesVarsDetail();
}

function renderChargesFixesDetail() {
  const container = document.getElementById('charges-fixes-detail');
  const sumEl = document.getElementById('charges-fixes-sum');
  if (!container) return;
  const total = _chargesFixes.reduce((s, c) => s + (parseFloat(c.montant) || 0), 0);
  if (sumEl) sumEl.textContent = total.toLocaleString('fr-FR') + ' €';
  const byCateg = {};
  _chargesFixes.forEach(c => { if (!byCateg[c.categorie]) byCateg[c.categorie] = []; byCateg[c.categorie].push(c); });
  container.innerHTML = Object.entries(byCateg).map(([cat, items]) => `
    <div style="background:var(--bg3);border-radius:10px;padding:12px">
      <div style="font-size:.75rem;font-weight:700;color:var(--text2);text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px">${cat}</div>
      ${items.map(c => `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:5px 0;border-bottom:1px solid var(--border)">
          <span style="font-size:.88rem">${c.label}</span>
          <div style="display:flex;align-items:center;gap:8px">
            <span class="fin-editable" onclick="editChargeFixeItem('${c.id}')" style="color:#f44336;font-weight:700;cursor:pointer;font-size:.88rem">${parseFloat(c.montant).toLocaleString('fr-FR')} €</span>
            <button onclick="deleteChargeFixeItem('${c.id}')" style="background:none;border:none;cursor:pointer;font-size:.8rem;color:var(--text3)">✕</button>
          </div>
        </div>`).join('')}
    </div>`).join('');
}

function editChargeFixeItem(id) {
  const c = _chargesFixes.find(x => x.id === id);
  if (!c) return;
  const f = document.getElementById('form-newChargeFixe');
  f.querySelector('[name=id]').value = c.id;
  f.querySelector('[name=label]').value = c.label;
  f.querySelector('[name=categorie]').value = c.categorie;
  f.querySelector('[name=montant]').value = c.montant;
  document.getElementById('modal-cf-title').textContent = 'Modifier charge fixe';
  openModal('newChargeFixe');
}

async function saveChargeFixeItem(e) {
  e.preventDefault();
  const f = e.target;
  const id = f.querySelector('[name=id]').value;
  const payload = { label: f.querySelector('[name=label]').value, categorie: f.querySelector('[name=categorie]').value, montant: parseFloat(f.querySelector('[name=montant]').value) || 0, actif: true };
  const { error } = id ? await sb.from('charges_fixes').update(payload).eq('id', id) : await sb.from('charges_fixes').insert([payload]);
  if (error) { showToast('Erreur : ' + error.message); return; }
  const { data: allFixes } = await sb.from('charges_fixes').select('montant');
  const newTotal = (allFixes || []).reduce((s, c) => s + (parseFloat(c.montant) || 0), 0);
  const annee = parseInt(document.getElementById('charges-year-sel')?.value || 2026);
  await sb.from('charges_monthly').update({ charges_fixes: newTotal }).eq('year', annee);
  showToast('Enregistré ✓');
  closeModal('newChargeFixe');
  f.reset(); f.querySelector('[name=id]').value = '';
  document.getElementById('modal-cf-title').textContent = 'Nouvelle charge fixe';
  await loadCharges();
}

async function deleteChargeFixeItem(id) {
  if (!confirm('Supprimer cette charge fixe ?')) return;
  await sb.from('charges_fixes').update({ actif: false }).eq('id', id);
  const { data: allFixes } = await sb.from('charges_fixes').select('montant');
  const newTotal = (allFixes || []).reduce((s, c) => s + (parseFloat(c.montant) || 0), 0);
  const annee = parseInt(document.getElementById('charges-year-sel')?.value || 2026);
  await sb.from('charges_monthly').update({ charges_fixes: newTotal }).eq('year', annee);
  await loadCharges();
}

function renderChargesVarsDetail() {
  const container = document.getElementById('charges-vars-detail');
  const sumEl = document.getElementById('charges-vars-sum');
  if (!container) return;
  const total = _chargesVarsItems.reduce((s, c) => s + (parseFloat(c.montant) || 0), 0);
  if (sumEl) sumEl.textContent = total.toLocaleString('fr-FR') + ' €';
  const byCateg = {};
  _chargesVarsItems.forEach(c => { if (!byCateg[c.categorie]) byCateg[c.categorie] = []; byCateg[c.categorie].push(c); });
  container.innerHTML = Object.entries(byCateg).map(([cat, items]) => `
    <div style="background:var(--bg3);border-radius:10px;padding:12px;margin-bottom:8px">
      <div style="font-size:.75rem;font-weight:700;color:var(--text2);text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px">${cat}</div>
      ${items.map(c => `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:5px 0;border-bottom:1px solid var(--border)">
          <span style="font-size:.88rem">${c.label}</span>
          <div style="display:flex;align-items:center;gap:8px">
            <span class="fin-editable" onclick="editChargeVariableItem('${c.id}')" style="color:#4A9EFF;font-weight:700;cursor:pointer;font-size:.88rem">${parseFloat(c.montant).toLocaleString('fr-FR')} €</span>
            <button onclick="deleteChargeVariableItem('${c.id}')" style="background:none;border:none;cursor:pointer;font-size:.8rem;color:var(--text3)">✕</button>
          </div>
        </div>`).join('')}
    </div>`).join('');
}

function editChargeVariableItem(id) {
  const c = _chargesVarsItems.find(x => x.id === id);
  if (!c) return;
  const f = document.getElementById('form-newChargeVariable');
  f.querySelector('[name=id]').value = c.id;
  f.querySelector('[name=label]').value = c.label;
  f.querySelector('[name=categorie]').value = c.categorie;
  f.querySelector('[name=montant]').value = c.montant;
  document.getElementById('modal-cv-title').textContent = 'Modifier charge variable';
  openModal('newChargeVariable');
}

async function saveChargeVariableItem(e) {
  e.preventDefault();
  const f = e.target;
  const id = f.querySelector('[name=id]').value;
  const payload = { label: f.querySelector('[name=label]').value, categorie: f.querySelector('[name=categorie]').value, montant: parseFloat(f.querySelector('[name=montant]').value) || 0, actif: true };
  const { error } = id ? await sb.from('charges_variables_items').update(payload).eq('id', id) : await sb.from('charges_variables_items').insert([payload]);
  if (error) { showToast('Erreur : ' + error.message); return; }
  const { data: allVars } = await sb.from('charges_variables_items').select('montant');
  const newTotal = (allVars || []).reduce((s, c) => s + (parseFloat(c.montant) || 0), 0);
  const annee = parseInt(document.getElementById('charges-year-sel')?.value || 2026);
  await sb.from('charges_monthly').update({ charges_variables: newTotal }).eq('year', annee);
  showToast('Enregistré ✓');
  closeModal('newChargeVariable');
  f.reset(); f.querySelector('[name=id]').value = '';
  document.getElementById('modal-cv-title').textContent = 'Nouvelle charge variable';
  await loadCharges();
}

async function deleteChargeVariableItem(id) {
  if (!confirm('Supprimer cette charge variable ?')) return;
  await sb.from('charges_variables_items').update({ actif: false }).eq('id', id);
  const { data: allVars } = await sb.from('charges_variables_items').select('montant');
  const newTotal = (allVars || []).reduce((s, c) => s + (parseFloat(c.montant) || 0), 0);
  const annee = parseInt(document.getElementById('charges-year-sel')?.value || 2026);
  await sb.from('charges_monthly').update({ charges_variables: newTotal }).eq('year', annee);
  await loadCharges();
}

function renderChargesMonthly(annee) {
  const tbody = document.getElementById('charges-monthly-tbody');
  if (!tbody) return;

  let totalFixes = 0, totalVars = 0;

  tbody.innerHTML = MOIS_LABELS.map((label, i) => {
    const mois = i + 1;
    const row = _chargesMonthly.find(r => r.month === mois) || { charges_fixes: 0, charges_variables: 0 };
    const fixes = parseFloat(row.charges_fixes) || 0;
    const vars = parseFloat(row.charges_variables) || 0;
    const total = fixes + vars;
    totalFixes += fixes;
    totalVars += vars;
    return `<tr>
      <td style="font-weight:600">${label}</td>
      <td class="fin-editable" onclick="editChargeCell(${annee},${mois},'charges_fixes',${fixes})"
          style="color:#f44336;font-weight:700;cursor:pointer">${fixes.toLocaleString('fr-FR')} €</td>
      <td class="fin-editable" onclick="editChargeCell(${annee},${mois},'charges_variables',${vars})"
          style="color:#4A9EFF;font-weight:700;cursor:pointer">${vars.toLocaleString('fr-FR')} €</td>
      <td style="color:var(--gold);font-weight:700">${total.toLocaleString('fr-FR')} €</td>
    </tr>`;
  }).join('');

  const annualTotal = totalFixes + totalVars;
  const el = id => document.getElementById(id);
  if (el('charges-annual-fixes')) el('charges-annual-fixes').textContent = totalFixes.toLocaleString('fr-FR') + ' €';
  if (el('charges-annual-vars')) el('charges-annual-vars').textContent = totalVars.toLocaleString('fr-FR') + ' €';
  if (el('charges-annual-total')) el('charges-annual-total').textContent = annualTotal.toLocaleString('fr-FR') + ' €';
}

function editChargeCell(year, month, field, currentVal) {
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9999;display:flex;align-items:center;justify-content:center';
  const label = field === 'charges_fixes' ? 'Charges fixes' : 'Charges variables';
  const moisLabel = MOIS_LABELS[month - 1];
  overlay.innerHTML = `
    <div style="background:var(--bg2);border-radius:16px;padding:24px;width:320px;box-shadow:0 8px 32px rgba(0,0,0,.4)">
      <h3 style="margin:0 0 16px">${label} — ${moisLabel} ${year}</h3>
      <input id="charge-cell-input" type="number" step="0.01" value="${currentVal}"
        style="width:100%;background:var(--bg3);border:1px solid var(--border);border-radius:8px;padding:10px 14px;color:var(--text1);font-size:1rem;margin-bottom:16px">
      <div style="display:flex;gap:10px;justify-content:flex-end">
        <button onclick="this.closest('div[style]').remove()" style="background:var(--bg3);border:1px solid var(--border);border-radius:8px;padding:8px 16px;color:var(--text1);cursor:pointer">Annuler</button>
        <button id="charge-cell-save" class="btn-primary">Enregistrer</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  const input = overlay.querySelector('#charge-cell-input');
  input.focus(); input.select();
  const save = async () => {
    const val = input.value.trim() === '' ? 0 : (parseFloat(input.value) || 0);
    const { error } = await sb.from('charges_monthly')
      .upsert({ year, month, [field]: val }, { onConflict: 'year,month' });
    if (error) { showToast('Erreur : ' + error.message); return; }
    overlay.remove();
    showToast('Sauvegardé ✓');
    await loadCharges();
  };
  overlay.querySelector('#charge-cell-save').onclick = save;
  input.onkeydown = e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') overlay.remove(); };
}