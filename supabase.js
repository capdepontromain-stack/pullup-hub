// =============================================
// PULL UP HUB — Supabase Client
// =============================================

const SUPABASE_URL = 'https://vincxrmtfjbenlzhjwby.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZpbmN4cm10ZmpiZW5semhqd2J5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIyOTI1MTksImV4cCI6MjA5Nzg2ODUxOX0.M9_ChGDlOIUKKZtbBHs1xn4cdy4FwUAQKN0aYyXefQY';

const { createClient } = supabase;
const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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
function renderEventsTable(events) {
  const tbody = document.querySelector('#page-events .data-table tbody');
  if (!tbody) return;
  if (!events.length) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--text2);padding:2rem">Aucun événement — cliquez sur "+ Nouvel événement"</td></tr>';
    return;
  }
  tbody.innerHTML = events.map(ev => {
    const date = ev.event_date ? new Date(ev.event_date).toLocaleDateString('fr-FR') : '—';
    return `<tr>
      <td onclick="openEventDetailById('${ev.id}')" style="cursor:pointer"><strong>${ev.name}</strong></td>
      <td>${ev.client || '—'}</td>
      <td>${date}</td>
      <td>${ev.start_time ? ev.start_time.slice(0,5) : '—'}${ev.end_time ? ' → ' + ev.end_time.slice(0,5) : ''}</td>
      <td>${ev.location || '—'}</td>
      <td>${ev.participants || '—'}</td>
      <td>${ev.amount_ht ? ev.amount_ht.toLocaleString('fr-FR') + ' €' : '—'}</td>
      <td>
        <select onchange="updateEventStatus('${ev.id}', this.value)"
          style="background:var(--bg3);color:var(--text);border:1px solid var(--border);border-radius:6px;padding:4px 8px;font-size:.8rem;cursor:pointer">
          ${['En préparation','Confirmé','Terminé','Annulé'].map(s =>
            `<option ${ev.status===s?'selected':''}>${s}</option>`
          ).join('')}
        </select>
      </td>
    </tr>`;
  }).join('');
}

async function updateEventStatus(id, status) {
  const { error } = await sb.from('events').update({ status }).eq('id', id);
  if (error) { showToast('Erreur : ' + error.message); return; }
  showToast('Statut mis à jour ✓');
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
  openModal('editTask');
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
function renderMessages(messages) {
  const container = document.getElementById('chatMessages');
  if (!container) return;
  container.innerHTML = messages.map(m => {
    const isMine = m.author_id === currentUser?.id;
    const time = new Date(m.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    return `<div class="chat-msg ${isMine ? 'mine' : ''}">
      ${!isMine ? `<div class="chat-avatar">${chatAvatar(m.author_name)}</div>` : ''}
      <div class="chat-bubble">
        ${!isMine ? `<div class="chat-name">${m.author_name}</div>` : ''}
        <div class="chat-text">${m.content}</div>
        <div class="chat-time">${time}</div>
      </div>
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

// Render mileage — 4 person columns
let allMileageEntries = [];

function renderMileage(entries) {
  allMileageEntries = entries || [];
  renderMileageBoard(allMileageEntries);
}

function filterMileageMonth() {
  const val = document.getElementById('mileage-month-filter')?.value;
  if (!val) return renderMileageBoard(allMileageEntries);
  const filtered = allMileageEntries.filter(e => e.trip_date && e.trip_date.startsWith(val));
  renderMileageBoard(filtered);
}

function renderMileageBoard(entries) {
  const members = [
    { name: 'Romain',  aliases: ['Romain', 'Romain Capdepont'] },
    { name: 'Ketsia',  aliases: ['Ketsia'] },
    { name: 'Flora',   aliases: ['Flora', 'Flora Boyer'] },
    { name: 'Gloria',  aliases: ['Gloria'] },
  ];

  members.forEach(({ name, aliases }) => {
    const col = document.getElementById('mileage-' + name);
    const countEl = document.getElementById('km-count-' + name);
    const amountEl = document.getElementById('km-amount-' + name);
    if (!col) return;

    const myEntries = entries.filter(e => aliases.some(a => (e.user_name || '').includes(a)));
    const totalKm = myEntries.reduce((s, e) => s + (parseFloat(e.km) || 0), 0);
    const totalAmt = myEntries.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);

    if (countEl) countEl.textContent = Math.round(totalKm) + ' km';
    if (amountEl) amountEl.textContent = totalAmt.toFixed(2) + ' €';

    if (!myEntries.length) {
      col.innerHTML = '<div class="ptask-empty">Aucun trajet</div>';
      return;
    }

    // Group by month
    const byMonth = {};
    myEntries.forEach(e => {
      const key = e.trip_date ? e.trip_date.slice(0, 7) : '—';
      if (!byMonth[key]) byMonth[key] = [];
      byMonth[key].push(e);
    });

    col.innerHTML = Object.entries(byMonth).sort((a,b) => b[0].localeCompare(a[0])).map(([month, rows]) => {
      const mKm = rows.reduce((s,e) => s + (parseFloat(e.km)||0), 0);
      const mAmt = rows.reduce((s,e) => s + (parseFloat(e.amount)||0), 0);
      const [y, m] = month.split('-');
      const mNames = ['','Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
      const mLabel = m ? `${mNames[parseInt(m)]} ${y}` : month;

      const trips = rows.map(e => {
        const date = e.trip_date ? new Date(e.trip_date + 'T00:00:00').toLocaleDateString('fr-FR', {day:'2-digit',month:'2-digit'}) : '—';
        return `<div class="km-trip">
          <div class="km-trip-date">${date}</div>
          <div class="km-trip-route">${e.departure || ''}${e.destination ? ' → ' + e.destination : ''}</div>
          <div class="km-trip-motif">${e.motif || ''}</div>
          <div class="km-trip-meta">
            <span>${Math.round(e.km || 0)} km</span>
            <span style="color:var(--person-color);font-weight:600">${(parseFloat(e.amount)||0).toFixed(2)} €</span>
            <button class="btn-icon" style="font-size:11px;padding:2px 4px" onclick="deleteMileageById('${e.id}')">🗑</button>
          </div>
        </div>`;
      }).join('');

      return `<div class="km-month-group">
        <div class="km-month-header">
          <span>${mLabel}</span>
          <span style="color:var(--person-color);font-weight:700">${Math.round(mKm)} km · ${mAmt.toFixed(2)} €</span>
        </div>
        ${trips}
      </div>`;
    }).join('');
  });
}

// Render finances
function renderFinances(entries) {
  const factures = entries.filter(e => e.type === 'facture');
  const devis = entries.filter(e => e.type === 'devis');

  const facturesTbody = document.querySelector('#fin-factures .data-table tbody');
  if (facturesTbody) {
    facturesTbody.innerHTML = factures.map(f => {
      const statusClass = { 'Payée': 'badge-success', 'En attente': 'badge-warning', 'En retard': 'badge-danger', 'Non payé': 'badge-danger' }[f.status] || 'badge-warning';
      return `<tr>
        <td>—</td>
        <td>${f.client || '—'}</td>
        <td>${f.amount ? f.amount.toLocaleString('fr-FR') + ' €' : '—'}</td>
        <td>${f.invoice_date ? new Date(f.invoice_date).toLocaleDateString('fr-FR') : '—'}</td>
        <td>—</td>
        <td>
          <select onchange="updateFinanceStatus('${f.id}', this.value)" style="background:var(--bg3);color:var(--text);border:1px solid var(--border);border-radius:6px;padding:4px 8px;font-size:.8rem;cursor:pointer;">
            ${['En attente','Payée','En retard','Non payé'].map(s => `<option ${f.status===s?'selected':''}>${s}</option>`).join('')}
          </select>
        </td>
      </tr>`;
    }).join('') || '<tr><td colspan="6" style="text-align:center;color:var(--text2);padding:2rem">Aucune facture — cliquez sur "+ Nouvelle facture" pour commencer</td></tr>';
  }

  const devisTbody = document.querySelector('#fin-devis .data-table tbody');
  if (devisTbody) {
    devisTbody.innerHTML = devis.map(d => {
      return `<tr>
        <td>—</td>
        <td>${d.client || '—'}</td>
        <td>${d.amount ? d.amount.toLocaleString('fr-FR') + ' €' : 'En cours'}</td>
        <td>${d.invoice_date ? new Date(d.invoice_date).toLocaleDateString('fr-FR') : '—'}</td>
        <td>
          <select onchange="updateFinanceStatus('${d.id}', this.value)" style="background:var(--bg3);color:var(--text);border:1px solid var(--border);border-radius:6px;padding:4px 8px;font-size:.8rem;cursor:pointer;">
            ${['Envoyé','Fait','En attente'].map(s => `<option ${d.status===s?'selected':''}>${s}</option>`).join('')}
          </select>
        </td>
      </tr>`;
    }).join('') || '<tr><td colspan="5" style="text-align:center;color:var(--text2);padding:2rem">Aucun devis — cliquez sur "+ Nouvelle facture" pour commencer</td></tr>';
  }
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
    const statusClass = {'Confirmé':'badge-gold','En préparation':'badge-warning','Terminé':'badge-info','Annulé':'badge-danger'}[ev.status] || 'badge-warning';
    return `<div class="event-item">
      <div class="event-date-badge"><span class="event-day">${day}</span><span class="event-month">${mon}</span></div>
      <div class="event-details"><strong>${ev.name}</strong><span>${ev.location || ''} ${ev.client ? '• ' + ev.client : ''}</span></div>
      <span class="badge ${statusClass}">${ev.status}</span>
    </div>`;
  }).join('') || '<p style="color:var(--text2);padding:1rem;text-align:center">Aucun événement à venir</p>';

  const countEl = document.getElementById('stat-events-count');
  if (countEl) countEl.textContent = events.filter(e => e.status !== 'Terminé' && e.status !== 'Annulé').length;
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
    await createTask(data);
    closeModal('newTask');
    await loadAndRenderTasks();
    showToast('Tâche créée !');
    form.reset();
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
  try {
    const { error } = await sb.from('messages').insert([{
      channel: activeChannel,
      content: msg,
      author_name: currentProfile?.name || currentUser.email
    }]);
    if (error) throw error;
  } catch(e) {
    console.error('Erreur message:', e);
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

  showPage('dashboard');
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
  const today = new Date().toISOString().slice(0,10);
  const [{ data: tasks }, { data: events }, { data: finances }] = await Promise.all([
    sb.from('tasks').select('*').neq('status','done').order('created_at', { ascending: false }).limit(10),
    sb.from('events').select('*').gte('event_date', today).order('event_date').limit(5),
    sb.from('finances').select('*').eq('status','En attente').limit(5)
  ]);
  allNotifications = [
    ...(tasks||[]).filter(t => t.priority === 'Urgent').map(t => ({ type:'urgent', text: `🔴 Tâche urgente : ${t.title}`, action: () => showPage('tasks') })),
    ...(events||[]).slice(0,3).map(e => ({ type:'event', text: `📅 Événement : ${e.name} — ${new Date(e.event_date+'T00:00:00').toLocaleDateString('fr-FR')}`, action: () => showPage('events') })),
    ...(finances||[]).slice(0,3).map(f => ({ type:'finance', text: `💰 Facture en attente : ${f.client} — ${f.amount ? f.amount.toLocaleString('fr-FR') + ' €' : '?'}`, action: () => showPage('finances') }))
  ];
  const badge = document.getElementById('notifBadge');
  if (badge) badge.textContent = allNotifications.length;
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
async function switchChannel(channel) {
  activeChannel = channel;
  if (messageSubscription) { sb.removeChannel(messageSubscription); }

  // Update header
  const header = document.getElementById('chatHeader');
  if (header) {
    const labels = { general:'# général', annonces:'# annonces', 'dm-romain':'💬 Romain', 'dm-ketsia':'💬 Ketsia', 'dm-flora':'💬 Flora', 'dm-gloria':'💬 Gloria' };
    header.textContent = labels[channel] || '# ' + channel;
  }

  const messages = await fetchMessages(channel);
  renderMessages(messages);
  messageSubscription = subscribeToMessages(channel, (msg) => {
    const container = document.getElementById('chatMessages');
    if (!container) return;
    const isMine = msg.author_name === (currentProfile?.name || currentUser?.email);
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
      switchChannel(item.dataset.channel || 'general');
    });
  });
});
