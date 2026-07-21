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

function isAdmin() {
  return currentProfile?.role === 'admin';
}

async function logAudit(action, details) {
  try {
    await sb.from('audit_logs').insert([{
      user_name: currentProfile?.name || currentUser?.email || 'Inconnu',
      action,
      details,
    }]);
  } catch(e) { console.warn('Audit log failed', e); }
}

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
  if (!isAdmin()) { showToast('Seul l\'administrateur peut supprimer un événement.'); return; }
  const { error } = await sb.from('events').delete().eq('id', id);
  if (error) throw error;
  logAudit('Suppression événement', `id: ${id}`);
}

// =============================================
// TASKS
// =============================================
async function fetchTasks() {
  const { data, error } = await sb.from('tasks').select('*, events(name, client, event_date)').order('created_at', { ascending: false });
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
  if (!isAdmin()) { showToast('Seul l\'administrateur peut supprimer une tâche.'); return; }
  const { error } = await sb.from('tasks').delete().eq('id', id);
  if (error) throw error;
  logAudit('Suppression tâche', `id: ${id}`);
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

let _allFactures = [];

function openEditFacture(id) {
  const f = _allFactures.find(x => x.id == id);
  if (!f) return;
  const form = document.getElementById('form-newFacture');
  form.querySelector('[name=client]').value = f.client || '';
  form.querySelector('[name=amount]').value = f.amount || '';
  form.querySelector('[name=benef]').value = f.benef || '';
  form.querySelector('[name=invoice_date]').value = f.invoice_date || '';
  form.querySelector('[name=notes]').value = f.notes || '';
  form.querySelector('[name=status]').value = f.status || 'En attente';
  form.querySelector('[name=facture_file]').value = '';
  const cur = document.getElementById('facture-file-current');
  if (cur) cur.innerHTML = f.file_url
    ? `Fichier actuel : <a href="${f.file_url}" target="_blank" style="color:var(--gold)">voir le document</a>`
    : '';
  form.dataset.editId = id;
  document.querySelector('#modal-newFacture .modal-header h3').textContent = 'Modifier la facture';
  openModal('newFacture');
}

async function saveNewFacture(e) {
  e.preventDefault();
  const form = e.target;
  const editId = form.dataset?.editId;
  const benefVal = parseFloat(form.querySelector('[name=benef]')?.value) || null;
  const invoiceDate = form.querySelector('[name=invoice_date]').value || null;
  const data = {
    type: 'facture',
    client:       form.querySelector('[name=client]').value,
    amount:       parseFloat(form.querySelector('[name=amount]').value) || null,
    benef:        benefVal,
    invoice_date: invoiceDate,
    event_date:   form.querySelector('[name=event_date]')?.value || null,
    paid_date:    form.querySelector('[name=paid_date]')?.value || null,
    status:       form.querySelector('[name=status]').value || 'En attente',
    notes:        form.querySelector('[name=notes]')?.value || null,
  };
  try {
    let fileUrl = null;
    const fileInput = form.querySelector('[name=facture_file]');
    if (fileInput?.files?.length) {
      const file = fileInput.files[0];
      const ext = file.name.split('.').pop();
      const path = `factures/${Date.now()}_${data.client.replace(/\s+/g,'_')}.${ext}`;
      const { error: upErr } = await sb.storage.from('factures').upload(path, file, { upsert: true });
      if (!upErr) {
        const { data: urlData } = sb.storage.from('factures').getPublicUrl(path);
        fileUrl = urlData?.publicUrl;
        data.file_url = fileUrl;
      }
    }
    if (editId) {
      await sb.from('finances').update(data).eq('id', editId);
      form.dataset.editId = '';
    } else {
      await createFinance(data);
    }
    // Recalculer le bénéfice mensuel depuis toutes les factures du même mois
    if (invoiceDate) {
      const d = new Date(invoiceDate);
      const year = d.getFullYear();
      const month = d.getMonth() + 1;
      const { data: allFact } = await sb.from('finances').select('invoice_date,benef').eq('type','facture').not('benef','is',null);
      const monthBenef = (allFact || []).filter(f => {
        if (!f.invoice_date || !f.benef) return false;
        const fd = new Date(f.invoice_date);
        return fd.getFullYear() === year && fd.getMonth() + 1 === month;
      }).reduce((s, f) => s + (parseFloat(f.benef) || 0), 0);
      const { data: existing } = await sb.from('finance_monthly').select('id').eq('year', year).eq('month', month).single();
      if (existing) {
        await sb.from('finance_monthly').update({ benef: Math.round(monthBenef) }).eq('id', existing.id);
      } else if (monthBenef > 0) {
        await sb.from('finance_monthly').insert({ year, month, ca: 0, benef: Math.round(monthBenef) });
      }
    }
    showToast(editId ? 'Facture modifiée ✓' : 'Facture ajoutée ✓');
    closeModal('newFacture');
    document.querySelector('#modal-newFacture .modal-header h3').textContent = 'Nouvelle facture';
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

async function loadAndRenderLinks() {
  const links = await fetchQuickLinks();
  const container = document.getElementById('links-container');
  if (!container) return;
  if (!links.length) {
    container.innerHTML = '<p style="color:var(--text2);padding:2rem;text-align:center">Aucun lien — cliquez sur "+ Ajouter lien"</p>';
    return;
  }
  // Grouper par catégorie
  const groups = {};
  links.forEach(l => {
    const cat = l.category || 'Général';
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(l);
  });
  container.innerHTML = Object.entries(groups).map(([cat, items]) => `
    <div style="margin-bottom:28px">
      <h3 style="font-size:.8rem;font-weight:700;letter-spacing:.08em;color:var(--text2);text-transform:uppercase;margin-bottom:12px">${cat}</h3>
      <div class="links-grid">
        ${items.map(l => `
          <div class="link-card" style="position:relative">
            <div class="link-icon" style="background:var(--bg3);font-size:1.4rem">${l.icon || l.emoji || '🔗'}</div>
            <div class="link-info" style="flex:1;cursor:pointer" onclick="window.open('${l.url}','_blank')">
              <strong>${l.name}</strong>
              <span>${l.description || l.url}</span>
            </div>
            <div style="display:flex;gap:6px;align-items:center">
              <button class="btn-copy-link" onclick="copyLink('${l.url}')">🔗 Copier</button>
              <button onclick="deleteLink(${l.id})" title="Supprimer" style="background:none;border:none;color:#f44336;cursor:pointer;font-size:1.1rem;padding:4px">🗑</button>
            </div>
          </div>`).join('')}
      </div>
    </div>`).join('');
}

async function saveLinkForm(e) {
  e.preventDefault();
  const name = document.getElementById('link-name').value.trim();
  const url = document.getElementById('link-url').value.trim();
  const desc = document.getElementById('link-desc').value.trim();
  const cat = document.getElementById('link-cat').value.trim() || 'Général';
  const icon = document.getElementById('link-icon').value.trim() || '🔗';
  const { error } = await sb.from('quick_links').insert([{ name, url, description: desc, category: cat, icon, emoji: icon }]);
  if (error) { showToast('Erreur : ' + error.message); return; }
  closeModal('newLink');
  document.getElementById('form-newLink').reset();
  showToast('Lien ajouté ✓');
  loadAndRenderLinks();
}

async function deleteLink(id) {
  if (!confirm('Supprimer ce lien ?')) return;
  const { error } = await sb.from('quick_links').delete().eq('id', String(id));
  if (error) { showToast('Erreur : ' + error.message); return; }
  showToast('Lien supprimé');
  loadAndRenderLinks();
}

// =============================================
// UI — RENDU DYNAMIQUE
// =============================================

// Render events table
// Génère une couleur pastel unique et reproductible à partir d'une chaîne
function clientColor(str) {
  if (!str) str = '?';
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  const hue = Math.abs(hash) % 360;
  return {
    bg: `hsla(${hue},65%,55%,0.13)`,
    border: `hsla(${hue},65%,55%,0.6)`,
    text: `hsl(${hue},55%,70%)`
  };
}

function eventColor(ev) {
  return clientColor(ev.client || ev.name);
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
    const c = eventColor(ev);
    const evTasks = (window._allTasks || []).filter(t => t.event_id === ev.id);
    const todoTasks = evTasks.filter(t => t.status !== 'done' && t.status !== 'fait');
    const doneTasks = evTasks.filter(t => t.status === 'done' || t.status === 'fait');
    const tasksHtml = evTasks.length ? `
      <tr style="background:${c.bg}">
        <td colspan="8" style="padding:2px 12px 10px 20px;border-left:3px solid ${c.border}">
          <div style="display:flex;flex-wrap:wrap;gap:6px">
            ${todoTasks.map(t => `<span style="display:inline-flex;align-items:center;gap:5px;background:var(--bg3);border:1px solid var(--border);border-radius:6px;padding:3px 10px;font-size:.75rem">
              <span style="width:7px;height:7px;border-radius:50%;background:#f44336;flex-shrink:0"></span>
              <span>${t.title}</span>
              <span style="color:var(--text3);font-size:.7rem">— ${t.assignee_name || ''}</span>
            </span>`).join('')}
            ${doneTasks.map(t => `<span style="display:inline-flex;align-items:center;gap:5px;background:var(--bg3);border:1px solid var(--border);border-radius:6px;padding:3px 10px;font-size:.75rem;opacity:.5;text-decoration:line-through">
              <span style="width:7px;height:7px;border-radius:50%;background:#4CAF50;flex-shrink:0"></span>
              <span>${t.title}</span>
            </span>`).join('')}
          </div>
        </td>
      </tr>` : '';
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
    </tr>${tasksHtml}`;
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

    // Trier par sort_order, puis terminées en dernier
    const sorted = [...myTasks].sort((a, b) => {
      if (a.status === 'done' && b.status !== 'done') return 1;
      if (a.status !== 'done' && b.status === 'done') return -1;
      return (a.sort_order ?? 0) - (b.sort_order ?? 0);
    });

    sorted.forEach(t => {
      const isDone = t.status === 'done';
      const card = document.createElement('div');
      card.className = 'ptask-card' + (isDone ? ' ptask-done' : '');
      card.style.cursor = 'grab';
      card.dataset.taskId = t.id;
      if (t.color) card.style.borderLeft = `3px solid ${t.color}`;
      const prioColor = prioBadge[t.priority] || prioBadge['Normal'];
      const dateStr = t.due_date ? new Date(t.due_date.split('-')).toLocaleDateString('fr-FR', {day:'numeric',month:'short'}) : '';
      card.innerHTML = `
        ${t.photo_url ? `<img src="${t.photo_url}" onclick="event.stopPropagation();openFilePreview('${t.photo_url}')" style="width:100%;height:120px;object-fit:cover;border-radius:8px;margin-bottom:.5rem;display:block;cursor:zoom-in" title="Cliquer pour agrandir">` : ''}
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
        ${t.events ? `<div style="margin-top:5px;display:flex;align-items:center;gap:4px;background:var(--bg4);border-radius:6px;padding:3px 7px;font-size:.72rem;color:var(--gold)">📅 ${t.events.name}${t.events.client ? ' · ' + t.events.client : ''}${t.events.event_date ? ' · ' + new Date(t.events.event_date).toLocaleDateString('fr-FR',{day:'numeric',month:'short'}) : ''}</div>` : ''}
        <div style="display:flex;align-items:center;justify-content:space-between;margin-top:6px">
          <span style="font-size:10px;color:var(--text3)">${statusLabel[t.status] || t.status}</span>
          <button class="task-color-btn" onclick="event.stopPropagation();openTaskColorPicker(this,'${t.id}')"
            style="width:16px;height:16px;border-radius:4px;border:1.5px solid var(--border);background:${t.color || 'var(--bg3)'};cursor:pointer;flex-shrink:0;padding:0"
            title="Couleur"></button>
        </div>`;

      card.addEventListener('click', () => openEditTask(t));
      setupTaskDrag(card, col);
      col.appendChild(card);
    });
  });
}

let _dragSrc = null;

function setupTaskDrag(card, col) {
  // Desktop drag
  card.draggable = true;
  card.addEventListener('dragstart', e => {
    _dragSrc = card;
    card.style.opacity = '0.4';
    e.dataTransfer.effectAllowed = 'move';
  });
  card.addEventListener('dragend', () => {
    card.style.opacity = '1';
    col.querySelectorAll('.ptask-card').forEach(c => c.style.borderTop = '');
    saveTaskOrder(col);
  });
  card.addEventListener('dragover', e => {
    e.preventDefault();
    if (_dragSrc && _dragSrc !== card) {
      const rect = card.getBoundingClientRect();
      const mid = rect.top + rect.height / 2;
      if (e.clientY < mid) {
        col.insertBefore(_dragSrc, card);
      } else {
        col.insertBefore(_dragSrc, card.nextSibling);
      }
    }
  });

  // Mobile touch
  let touchClone = null, touchStartY = 0, touchMoved = false;
  card.addEventListener('touchstart', e => {
    touchStartY = e.touches[0].clientY;
    touchMoved = false;
    // Long press delay to distinguish tap vs drag
    card._touchTimer = setTimeout(() => {
      _dragSrc = card;
      card.style.opacity = '0.5';
      card.style.transform = 'scale(1.03)';
      touchClone = card;
    }, 200);
  }, { passive: true });

  card.addEventListener('touchmove', e => {
    if (!_dragSrc || _dragSrc !== card) { clearTimeout(card._touchTimer); return; }
    touchMoved = true;
    e.preventDefault();
    const touch = e.touches[0];
    const els = document.elementsFromPoint(touch.clientX, touch.clientY);
    const target = els.find(el => el.classList.contains('ptask-card') && el !== card);
    if (target) {
      const rect = target.getBoundingClientRect();
      if (touch.clientY < rect.top + rect.height / 2) {
        col.insertBefore(card, target);
      } else {
        col.insertBefore(card, target.nextSibling);
      }
    }
  }, { passive: false });

  card.addEventListener('touchend', () => {
    clearTimeout(card._touchTimer);
    card.style.opacity = '1';
    card.style.transform = '';
    if (_dragSrc === card) {
      saveTaskOrder(col);
      _dragSrc = null;
    }
  });
}

async function saveTaskOrder(col) {
  const cards = [...col.querySelectorAll('.ptask-card')];
  const updates = cards.map((c, i) => ({ id: c.dataset.taskId, sort_order: i }));
  for (const u of updates) {
    await sb.from('tasks').update({ sort_order: u.sort_order }).eq('id', u.id);
  }
}

let currentEditTaskId = null;

function openEditTask(t) {
  currentEditTaskId = t.id;
  const form = document.getElementById('form-editTask');
  if (!form) { console.error('form-editTask introuvable'); return; }
  try {
    const statusMap = { faire: 'todo', fait: 'done', inprogress: 'inprogress', waiting: 'waiting', done: 'done', todo: 'todo' };
    form.elements['id'].value = t.id || '';
    form.elements['title'].value = t.title || '';
    form.querySelectorAll('[name=assignees]').forEach(c => {
      c.checked = c.value === (t.assignee_name || 'Romain');
    });
    // Masquer la section assignation pour les non-admins
    const assigneeSection = form.querySelector('.assignee-section');
    if (assigneeSection) assigneeSection.style.display = isAdmin() ? '' : 'none';
    // Masquer le bouton supprimer pour les non-admins
    const delBtn = document.getElementById('btn-delete-task');
    if (delBtn) delBtn.style.display = isAdmin() ? '' : 'none';
    form.elements['priority'].value = t.priority || 'Normal';
    form.elements['status'].value = statusMap[t.status] || 'todo';
    form.elements['due_date'].value = t.due_date || '';
    form.elements['description'].value = t.description || '';
  } catch(e) { console.error('openEditTask error', e); return; }
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
  const assignees = [...form.querySelectorAll('[name=assignees]:checked')].map(c => c.value);
  if (!assignees.length) { showToast('⚠️ Vous n\'avez attribué cette tâche à personne. Veuillez sélectionner au moins un responsable.'); return; }
  // Vérifier si l'assignation change — seul l'admin peut changer le responsable
  const prevTask = (window._allTasks || []).find(t => t.id === currentEditTaskId);
  const prevAssignee = prevTask?.assignee_name || '';
  const newAssignee = assignees[0];
  if (!isAdmin() && newAssignee !== prevAssignee) {
    showToast('Seul l\'administrateur peut changer le responsable d\'une tâche.');
    return;
  }
  const baseUpdates = {
    title: form.elements['title'].value.trim(),
    priority: form.elements['priority'].value,
    status: form.elements['status'].value,
    due_date: form.elements['due_date'].value || null,
    description: form.elements['description'].value.trim() || null,
  };
  const photoInput = form.querySelector('[name=photo]');
  const photoFile = photoInput?.files[0];
  if (photoFile) {
    try {
      baseUpdates.photo_url = await uploadTaskPhoto(photoFile, currentEditTaskId);
    } catch(e) { showToast('Erreur upload photo : ' + e.message); return; }
  } else if (window._editTaskPhotoRemoved) {
    baseUpdates.photo_url = null;
  }
  const { error } = await sb.from('tasks').update({ ...baseUpdates, assignee_name: assignees[0] }).eq('id', currentEditTaskId);
  if (error) { showToast('Erreur : ' + error.message); return; }
  if (isAdmin() && assignees.length > 1) {
    for (let i = 1; i < assignees.length; i++) {
      await sb.from('tasks').insert({ ...baseUpdates, assignee_name: assignees[i], status: 'todo' });
    }
  }
  if (isAdmin() && newAssignee !== prevAssignee) logAudit('Réassignation tâche', `"${baseUpdates.title}" → ${newAssignee}`);
  closeModal('editTask');
  await loadAndRenderTasks();
  loadTasksBadge();
  showToast(assignees.length > 1 ? `Tâche assignée à ${assignees.length} personnes ✓` : 'Tâche mise à jour ✓');
}


async function deleteCurrentTask() {
  if (!currentEditTaskId) return;
  if (!isAdmin()) { showToast('Seul l\'administrateur peut supprimer une tâche.'); return; }
  if (!confirm('Supprimer cette tâche ?')) return;
  const t = (window._allTasks || []).find(t => t.id === currentEditTaskId);
  await sb.from('tasks').delete().eq('id', currentEditTaskId);
  logAudit('Suppression tâche', `"${t?.title || currentEditTaskId}"`);
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

// WhatsApp channel selection
// Génère un canal DM unique par paire (ex: dm-flora-romain)
function dmChannelName(otherName) {
  const me = (currentProfile?.name || '').split(' ')[0].toLowerCase();
  const them = otherName.toLowerCase();
  return 'dm-' + [me, them].sort().join('-');
}

function waSelectChannel(el, channelKey, name, avatar) {
  document.querySelectorAll('.wa-conv-item').forEach(i => i.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('waSidebar')?.classList.add('hidden');
  document.getElementById('waBackBtn').style.display = 'flex';
  const avatarEl = document.getElementById('waChatAvatar');
  if (avatarEl) { avatarEl.textContent = avatar; avatarEl.style.background = el.querySelector('.wa-conv-avatar')?.style.background || '#25D366'; }
  document.getElementById('chatHeader').textContent = name;
  const subs = { general:'Canal principal de l\'équipe', annonces:'Informations importantes' };
  document.getElementById('waChatSub').textContent = subs[channelKey] || 'En ligne';
  document.getElementById('chatInput').placeholder = `Message dans ${name}…`;
  // Calculer le vrai canal : DM = paire unique, groupe = tel quel
  const isDM = channelKey.startsWith('dm-');
  const realChannel = isDM ? dmChannelName(channelKey.replace('dm-', '')) : channelKey;
  if (typeof switchChannel === 'function') switchChannel(realChannel);
}

function waShowSidebar() {
  document.getElementById('waSidebar')?.classList.remove('hidden');
  document.getElementById('waBackBtn').style.display = 'none';
}

// Avatar couleurs par personne
const WA_COLORS = { Romain:'var(--color-romain)', Ketsia:'var(--color-ketsia)', Flora:'var(--color-flora)', Gloria:'var(--color-gloria)' };

function renderMessages(messages) {
  const container = document.getElementById('chatMessages');
  if (!container) return;
  let lastDate = '';
  let html = '';
  messages.forEach(m => {
    const isMine = m.author_id === currentUser?.id;
    const d = new Date(m.created_at);
    const dateKey = d.toLocaleDateString('fr-FR', { day:'2-digit', month:'long', year:'numeric' });
    if (dateKey !== lastDate) {
      html += `<div class="wa-date-sep"><span>${dateKey}</span></div>`;
      lastDate = dateKey;
    }
    const time = d.toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' });
    const firstName = (m.author_name || '?').split(' ')[0];
    const initials = firstName[0].toUpperCase();
    const avatarColor = WA_COLORS[firstName] || '#555';
    const isVoice = m.content?.startsWith('__voice__:');
    const isImg   = m.content?.startsWith('__img__:');
    const isFile  = m.content?.startsWith('__file__:');
    let bubbleContent;
    if (isVoice) {
      const url = m.content.replace('__voice__:','');
      bubbleContent = `<div class="wa-audio"><span style="font-size:1.2rem">🎤</span><audio controls src="${url}" style="flex:1;height:32px;max-width:200px"></audio></div>`;
    } else if (isImg) {
      const url = m.content.replace('__img__:','');
      bubbleContent = `<img src="${url}" style="max-width:220px;max-height:200px;border-radius:8px;display:block;cursor:pointer" onclick="window.open('${url}','_blank')">`;
    } else if (isFile) {
      try { const {url,name} = JSON.parse(m.content.replace('__file__:','')); bubbleContent = `<a href="${url}" download="${name}" target="_blank" style="display:flex;align-items:center;gap:8px;color:var(--gold);text-decoration:none;font-size:.85rem;background:var(--bg4);padding:8px 12px;border-radius:8px"><span style="font-size:1.6rem">📄</span><div><div style="font-weight:600">${name}</div><div style="font-size:.7rem;color:var(--text3)">Appuyer pour télécharger</div></div></a>`; } catch { bubbleContent = `<div class="chat-text">${m.content}</div>`; }
    } else {
      bubbleContent = `<div class="chat-text">${m.content}</div>`;
    }
    html += `<div class="chat-msg ${isMine ? 'mine' : ''}" data-id="${m.id}">
      ${!isMine ? `<div class="chat-avatar-wa" style="background:${avatarColor};color:${firstName==='Romain'?'#000':'#fff'}">${initials}</div>` : ''}
      <div class="chat-bubble">
        ${!isMine ? `<div class="chat-name">${firstName}</div>` : ''}
        ${bubbleContent}
        <div class="chat-time">${time}</div>
      </div>
      <button class="msg-delete-btn" onclick="deleteMessage('${m.id}')" title="Supprimer">✕</button>
    </div>`;
  });
  container.innerHTML = html;
  container.scrollTop = container.scrollHeight;
}

// ===== FICHIERS EN CHAT =====
const CHAT_ALLOWED_TYPES = /\.(png|jpg|jpeg|gif|webp|pdf|pages|doc|docx|xls|xlsx|ppt|pptx|txt|csv|zip|mp4|mov|heic|svg)$/i;

async function sendChatFile(file) {
  if (!file) return;
  if (!currentUser) { showToast('Connecte-toi pour envoyer un fichier'); return; }

  // Accepter tous les types mais avertir si format inhabituel
  const safeName = file.name.replace(/[^a-zA-Z0-9._\-]/g, '_');
  const path = `chat-files/${Date.now()}_${safeName}`;

  showToast('⏳ Envoi en cours…');
  try {
    // Essayer d'abord chat-files, sinon fallback sur task-photos (existant)
    let bucket = 'chat-files';
    let upResult = await sb.storage.from(bucket).upload(path, file, { upsert: true, contentType: file.type || 'application/octet-stream' });
    if (upResult.error?.message?.toLowerCase().includes('not found') || upResult.error?.message?.toLowerCase().includes('bucket')) {
      bucket = 'task-photos';
      upResult = await sb.storage.from(bucket).upload(path, file, { upsert: true, contentType: file.type || 'application/octet-stream' });
    }
    const upErr = upResult.error;
    if (upErr) { showToast('❌ Erreur upload : ' + upErr.message); return; }
    const { data: urlData } = sb.storage.from(bucket).getPublicUrl(path);
    const url = urlData?.publicUrl;
    if (!url) { showToast('❌ Impossible d\'obtenir l\'URL du fichier'); return; }

    const isImage = /\.(png|jpg|jpeg|gif|webp|heic|svg)$/i.test(file.name);
    const content = isImage
      ? `__img__:${url}`
      : `__file__:${JSON.stringify({ url, name: file.name, size: file.size, type: file.type })}`;

    const { error: msgErr } = await sb.from('messages').insert([{
      channel: activeChannel,
      content,
      author_name: currentProfile?.name || currentUser.email,
      author_id: currentUser.id
    }]);
    if (msgErr) { showToast('❌ Erreur message : ' + msgErr.message); return; }
    showToast('✅ Fichier envoyé !');
  } catch(e) {
    showToast('❌ Erreur : ' + (e.message || 'inconnue'));
  }
}

// Drag & drop sur la zone de messages — initialisé à la demande
function initChatDrop() {
  if (window._globalDropInit) return;
  window._globalDropInit = true;

  const overlay = document.createElement('div');
  overlay.id = 'global-drop-overlay';
  overlay.innerHTML = '<div>📎 Dépose ton fichier ici</div>';
  overlay.style.cssText = 'display:none;position:fixed;inset:0;background:#25D36680;z-index:9999;align-items:center;justify-content:center;font-size:1.8rem;font-weight:700;color:#fff;text-align:center;backdrop-filter:blur(4px)';
  document.body.appendChild(overlay);

  let dragCounter = 0;

  document.addEventListener('dragenter', e => {
    if (!e.dataTransfer?.types?.includes('Files')) return;
    dragCounter++;
    overlay.style.display = 'flex';
  });

  document.addEventListener('dragleave', e => {
    dragCounter--;
    if (dragCounter <= 0) { dragCounter = 0; overlay.style.display = 'none'; }
  });

  document.addEventListener('dragover', e => {
    if (e.dataTransfer?.types?.includes('Files')) e.preventDefault();
  });

  document.addEventListener('drop', e => {
    e.preventDefault();
    dragCounter = 0;
    overlay.style.display = 'none';
    const file = e.dataTransfer?.files?.[0];
    if (!file) return;
    // Uniquement si on est sur la page messages
    const msgPage = document.getElementById('page-messages');
    if (msgPage?.classList.contains('active')) {
      sendChatFile(file);
    } else {
      showToast('Ouvre d\'abord une conversation pour envoyer un fichier');
    }
  });

  // Coller une image depuis le presse-papier (Ctrl+V)
  document.addEventListener('paste', e => {
    const msgPage = document.getElementById('page-messages');
    if (!msgPage?.classList.contains('active')) return;
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.kind === 'file') {
        const file = item.getAsFile();
        if (file) { sendChatFile(file); break; }
      }
    }
  });
}

// ===== MESSAGES VOCAUX =====
let mediaRecorder = null;
let audioChunks = [];
let voiceTimerInterval = null;
let voiceSeconds = 0;

async function toggleVoiceRecord() {
  const btn = document.getElementById('voiceRecordBtn');
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    sendVoiceRecord();
    return;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    audioChunks = [];
    mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
    mediaRecorder.start();
    btn.classList.add('recording');
    document.getElementById('waVoiceBar').style.display = 'flex';
    document.getElementById('waVoiceTimer').textContent = '0:00';
    voiceSeconds = 0;
    voiceTimerInterval = setInterval(() => {
      voiceSeconds++;
      const m = Math.floor(voiceSeconds/60);
      const s = voiceSeconds%60;
      document.getElementById('waVoiceTimer').textContent = `${m}:${s.toString().padStart(2,'0')}`;
    }, 1000);
  } catch(e) {
    showToast('Microphone non autorisé');
  }
}

function cancelVoiceRecord() {
  if (mediaRecorder) { mediaRecorder.stream.getTracks().forEach(t=>t.stop()); mediaRecorder = null; }
  clearInterval(voiceTimerInterval);
  document.getElementById('waVoiceBar').style.display = 'none';
  document.getElementById('voiceRecordBtn').classList.remove('recording');
}

async function sendVoiceRecord() {
  if (!mediaRecorder) return;
  mediaRecorder.stop();
  clearInterval(voiceTimerInterval);
  document.getElementById('voiceRecordBtn').classList.remove('recording');
  document.getElementById('waVoiceBar').style.display = 'none';
  mediaRecorder.onstop = async () => {
    const blob = new Blob(audioChunks, { type: 'audio/webm' });
    const path = `voice/${Date.now()}_${currentUserName || 'user'}.webm`;
    const { error } = await sb.storage.from('voice-messages').upload(path, blob, { upsert: true });
    if (error) { showToast('Erreur upload audio'); return; }
    const { data } = sb.storage.from('voice-messages').getPublicUrl(path);
    const url = data?.publicUrl;
    await sb.from('messages').insert([{
      channel: activeChannel,
      content: `__voice__:${url}`,
      author_name: currentProfile?.name || currentUser.email,
      author_id: currentUser.id
    }]);
    mediaRecorder.stream.getTracks().forEach(t=>t.stop());
    mediaRecorder = null;
  };
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
    const emoji = {'Traiteur':'🍽','DJ':'🎧','Animateur':'🎤','Hôtesse':'👩','Sonorisation':'🔊','Artiste':'🎨','Domaine':'🏡'}[s.category] || '🤝';
    return `<div class="supplier-card" onclick="openEditSupplierById('${s.id}')" style="cursor:pointer" title="Cliquer pour modifier">
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
  _allFactures = factures;
  const devis    = entries.filter(e => e.type === 'devis');

  const facturesTbody = document.getElementById('fin-factures-body');
  if (facturesTbody) {
    if (factures.length) {
      // Grouper par mois
      const grouped = {};
      factures.forEach(f => {
        const key = f.invoice_date ? f.invoice_date.slice(0,7) : '0000-00';
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(f);
      });
      const MOIS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
      facturesTbody.innerHTML = Object.keys(grouped).sort().reverse().map(key => {
        const [yr, mo] = key.split('-');
        const label = key === '0000-00' ? 'Sans date' : `${MOIS[parseInt(mo)-1]} ${yr}`;
        const rows = grouped[key].map(f => {
          const statusColors = { 'Payée':'#4CAF50','En attente':'#F5C518','En retard':'#f44336','Non payé':'#f44336' };
          const sc = statusColors[f.status] || 'var(--text2)';
          return `<tr style="cursor:pointer" onclick="openEditFacture('${f.id}')" title="Cliquer pour modifier">
            <td>${f.client || '—'}</td>
            <td style="font-weight:700">${f.amount ? parseFloat(f.amount).toLocaleString('fr-FR') + ' €' : '—'}</td>
            <td style="color:#4CAF50;font-weight:700">${f.benef ? parseFloat(f.benef).toLocaleString('fr-FR') + ' €' : '—'}</td>
            <td>${f.invoice_date ? new Date(f.invoice_date).toLocaleDateString('fr-FR') : '—'}</td>
            <td>${f.notes || '—'}</td>
            <td onclick="event.stopPropagation()">
              <select onchange="updateFinanceStatus('${f.id}', this.value)" style="background:var(--bg3);color:${sc};border:1px solid var(--border);border-radius:6px;padding:4px 8px;font-size:.8rem;font-weight:600">
                ${['En attente','Payée','En retard','Non payé'].map(s=>`<option ${f.status===s?'selected':''}>${s}</option>`).join('')}
              </select>
            </td>
            <td onclick="event.stopPropagation()">
              ${f.file_url ? `<a href="${f.file_url}" target="_blank" title="Voir la facture" style="margin-right:6px;font-size:1.1rem;text-decoration:none">📄</a>` : ''}
              <button class="btn-icon" onclick="deleteFinanceEntry('${f.id}')" title="Supprimer">🗑</button>
            </td>
          </tr>`;
        }).join('');
        return `<tr><td colspan="7" style="padding:1rem 0 .3rem;font-weight:700;font-size:.85rem;color:var(--gold);letter-spacing:.05em;border-bottom:1px solid var(--border);text-transform:uppercase">${label}</td></tr>${rows}`;
      }).join('');
    } else {
      facturesTbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--text2);padding:2rem">Aucune facture — cliquez sur "+ Nouvelle facture"</td></tr>';
    }
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

  const dashTotalEl = document.getElementById('stat-creances-total');
  if (dashTotalEl) dashTotalEl.textContent = total > 0 ? 'Total : ' + total.toLocaleString('fr-FR') + ' €' : '';

  // Carte KPI dynamique dans Finances
  const kpiMontant = document.getElementById('fkpi-creances-montant');
  const kpiLabel = document.getElementById('fkpi-creances-label');
  if (kpiMontant && kpiLabel) {
    if (impayees.length === 0) {
      kpiMontant.textContent = '✅ 0 €';
      kpiMontant.className = 'fkpi-val success';
      kpiLabel.textContent = 'Aucune créance impayée';
    } else {
      const clients = [...new Set(impayees.map(f => f.client).filter(Boolean))];
      kpiMontant.textContent = total.toLocaleString('fr-FR') + ' €';
      kpiMontant.className = 'fkpi-val danger';
      kpiLabel.innerHTML = `❌ ${impayees.length} facture${impayees.length > 1 ? 's' : ''} impayée${impayees.length > 1 ? 's' : ''}<br><span style="font-size:.72rem;color:var(--text2)">${clients.slice(0,3).join(', ')}${clients.length > 3 ? '…' : ''}</span>`;
    }
  }

  const tbody = document.getElementById('creances-tbody');
  if (!tbody) return;
  if (!impayees.length) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--text2);padding:2rem">✅ Aucune créance — toutes les factures sont payées</td></tr>';
    return;
  }
  tbody.innerHTML = impayees.map(f => `
    <tr data-id="${f.id}" style="cursor:pointer" onclick="openEditFacture('${f.id}')" title="Cliquer pour modifier">
      <td>${f.client || '—'}</td>
      <td style="font-weight:700;color:var(--gold)">${f.amount ? parseFloat(f.amount).toLocaleString('fr-FR') + ' €' : '—'}</td>
      <td>${f.invoice_date ? new Date(f.invoice_date).toLocaleDateString('fr-FR') : '—'}</td>
      <td onclick="event.stopPropagation()">
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
const TASK_COLORS = [
  { label: 'Aucune', value: null },
  { label: 'Rouge',   value: '#e74c3c' },
  { label: 'Orange',  value: '#e67e22' },
  { label: 'Jaune',   value: '#f1c40f' },
  { label: 'Vert',    value: '#2ecc71' },
  { label: 'Bleu',    value: '#3498db' },
  { label: 'Violet',  value: '#9b59b6' },
  { label: 'Rose',    value: '#FF6B9D' },
  { label: 'Cyan',    value: '#1abc9c' },
];

function openTaskColorPicker(btn, taskId) {
  // Fermer tout picker existant
  document.querySelectorAll('.task-color-picker').forEach(p => p.remove());

  const picker = document.createElement('div');
  picker.className = 'task-color-picker';
  picker.style.cssText = 'position:absolute;z-index:999;background:var(--bg2);border:1px solid var(--border);border-radius:10px;padding:8px;display:flex;gap:6px;flex-wrap:wrap;width:152px;box-shadow:0 4px 16px rgba(0,0,0,.4)';

  TASK_COLORS.forEach(c => {
    const swatch = document.createElement('button');
    swatch.title = c.label;
    swatch.style.cssText = `width:24px;height:24px;border-radius:6px;border:2px solid var(--border);cursor:pointer;background:${c.value || 'var(--bg3)'};padding:0;flex-shrink:0`;
    if (!c.value) swatch.textContent = '✕';
    swatch.onclick = async (e) => {
      e.stopPropagation();
      picker.remove();
      // Mettre à jour visuellement
      const card = btn.closest('.ptask-card');
      if (card) {
        card.style.borderLeft = c.value ? `3px solid ${c.value}` : '';
        btn.style.background = c.value || 'var(--bg3)';
      }
      await sb.from('tasks').update({ color: c.value }).eq('id', taskId);
    };
    picker.appendChild(swatch);
  });

  // Positionner sous le bouton
  document.body.appendChild(picker);
  const rect = btn.getBoundingClientRect();
  picker.style.top = (rect.bottom + window.scrollY + 4) + 'px';
  picker.style.left = Math.max(4, rect.right - picker.offsetWidth + window.scrollX) + 'px';

  // Fermer au clic extérieur
  setTimeout(() => document.addEventListener('click', function h() {
    picker.remove(); document.removeEventListener('click', h);
  }), 10);
}

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
  if (typeof renderMiniCalendar === 'function') renderMiniCalendar();
}

async function loadAndRenderTasks() {
  const tasks = await fetchTasks();
  window._allTasks = tasks;
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
function fv(form, name) { const v = form.querySelector(`[name=${name}]`)?.value?.trim(); return v || null; }

async function saveNewEvent() {
  const form = document.getElementById('form-newEvent');
  if (!form) return;
  const data = {
    name:          fv(form,'name'),
    client:        fv(form,'client'),
    event_date:    fv(form,'event_date'),
    end_date:      fv(form,'end_date'),
    start_time:    fv(form,'start_time'),
    end_time:      fv(form,'end_time'),
    location:      fv(form,'location'),
    contact_name:  fv(form,'contact_name'),
    contact_phone: fv(form,'contact_phone'),
    participants:  parseInt(form.querySelector('[name=participants]')?.value) || null,
    budget:        parseFloat(form.querySelector('[name=budget]')?.value) || null,
    status:        fv(form,'status') || 'En préparation',
    notes:         fv(form,'notes'),
  };
  if (!data.name) { showToast('Le nom de l\'événement est obligatoire'); return; }
  try {
    await createEvent(data);
    closeModal('newEvent');
    await loadAndRenderEvents();
    showToast('Événement créé !');
    form.reset();
  } catch(e) { showToast('Erreur : ' + e.message); }
}

function toggleAllTaskAssignees(btn) {
  const container = btn.closest('.form-group').querySelector('[id$="-task-assignees"], #new-task-assignees, #edit-task-assignees');
  const checkboxes = container ? container.querySelectorAll('[name=assignees]') : btn.closest('.form-group').querySelectorAll('[name=assignees]');
  const allChecked = [...checkboxes].every(c => c.checked);
  checkboxes.forEach(c => c.checked = !allChecked);
}

async function saveNewTask() {
  const form = document.getElementById('form-newTask');
  if (!form) return;
  const title = form.querySelector('[name=title]')?.value;
  if (!title) { showToast('Titre obligatoire'); return; }
  const assignees = [...form.querySelectorAll('[name=assignees]:checked')].map(c => c.value);
  if (!assignees.length) { showToast('⚠️ Vous n\'avez attribué cette tâche à personne. Veuillez sélectionner au moins un responsable.'); return; }
  const base = {
    title,
    description: form.querySelector('[name=description]')?.value || null,
    due_date: form.querySelector('[name=due_date]')?.value || null,
    priority: form.querySelector('[name=priority]')?.value || 'Normal',
    status: 'todo'
  };
  const photoFile = form.querySelector('[name=photo]')?.files[0];
  try {
    for (const name of assignees) {
      const { data: created, error } = await sb.from('tasks').insert({ ...base, assignee_name: name }).select().single();
      if (error) throw error;
      if (photoFile && created) {
        try {
          const photoUrl = await uploadTaskPhoto(photoFile, created.id);
          await sb.from('tasks').update({ photo_url: photoUrl }).eq('id', created.id);
        } catch(e) {}
      }
    }
    // Si case "Devis à établir" cochée → créer une demande de devis pour chaque responsable
    const isDevis = form.querySelector('[name=is_devis]')?.checked;
    if (isDevis) {
      for (const name of assignees) {
        await sb.from('devis_requests').insert([{
          client: title,
          notes: form.querySelector('[name=description]')?.value || null,
          priority: form.querySelector('[name=priority]')?.value || 'Normal',
          status: 'À traiter',
          assigned_to: name,
          event_date: form.querySelector('[name=due_date]')?.value || null,
        }]);
      }
    }
    closeModal('newTask');
    form.reset();
    form.querySelectorAll('[name=assignees]').forEach(c => c.checked = false);
    clearNewTaskPhoto();
    await loadAndRenderTasks();
    loadTasksBadge();
    const suffix = isDevis ? ' + devis ajouté ✓' : ' ✓';
    showToast(assignees.length > 1 ? `Tâche créée pour ${assignees.length} personnes${suffix}` : `Tâche créée${suffix}`);
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

async function showMonthDetail(year, month) {
  const MNAMES = ['','Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
  const titleEl = document.getElementById('monthDetail-title');
  const tbody = document.getElementById('monthDetail-tbody');
  const totalEl = document.getElementById('monthDetail-total');
  if (titleEl) titleEl.textContent = `${MNAMES[month]} ${year} — Détail des factures`;
  if (tbody) tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:2rem;color:var(--text2)">Chargement…</td></tr>';
  openModal('monthDetail');

  const start = `${year}-${String(month).padStart(2,'0')}-01`;
  const end = new Date(year, month, 0).toISOString().split('T')[0];
  const { data, error } = await sb.from('finances').select('*').gte('invoice_date', start).lte('invoice_date', end).order('invoice_date');

  if (error || !data?.length) {
    if (tbody) tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--text2);padding:2.5rem">
      Aucune facture enregistrée pour ce mois.<br>
      <span style="font-size:.82rem;margin-top:6px;display:block">Ajoutez des factures via l'onglet <strong>Factures</strong>.</span>
    </td></tr>`;
    if (totalEl) totalEl.innerHTML = '';
    return;
  }

  const statusColors = { 'Payée':'#4CAF50','Payé':'#4CAF50','Non payé':'#f44336','En attente':'#F5C518','En retard':'#f44336' };
  let totalCA = 0, totalBenef = 0;
  tbody.innerHTML = data.map(f => {
    const amt = parseFloat(f.amount) || 0;
    const ben = parseFloat(f.benef) || 0;
    totalCA += amt; totalBenef += ben;
    const marge = amt > 0 && ben > 0 ? Math.round((ben / amt) * 100) : null;
    const margeClass = marge >= 50 ? '#4CAF50' : marge >= 30 ? '#F5C518' : '#f44336';
    const date = f.invoice_date ? new Date(f.invoice_date+'T00:00:00').toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit'}) : '—';
    const color = statusColors[f.status] || 'var(--text2)';
    return `<tr style="cursor:pointer" onclick="openEditFinanceRow(${JSON.stringify(f).replace(/'/g,'&#39;')})" title="Cliquer pour modifier">
      <td style="color:var(--text2);font-size:.85rem">${date}</td>
      <td>${f.notes || '—'}</td>
      <td><strong>${f.client || '—'}</strong></td>
      <td style="font-weight:700;color:var(--gold)">${amt > 0 ? amt.toLocaleString('fr-FR',{minimumFractionDigits:2}) + ' €' : '—'}</td>
      <td style="font-weight:700;color:#4CAF50">${ben > 0 ? ben.toLocaleString('fr-FR',{minimumFractionDigits:2}) + ' €' : '—'}</td>
      <td style="color:${marge !== null ? margeClass : 'var(--text2)'};font-weight:600">${marge !== null ? marge + '%' : '—'}</td>
      <td><span style="color:${color};font-size:.82rem">${f.status || '—'}</span></td>
    </tr>`;
  }).join('');

  const totalMarge = totalCA > 0 && totalBenef > 0 ? Math.round((totalBenef/totalCA)*100) : null;
  if (totalEl) totalEl.innerHTML = `
    <span style="margin-right:24px">CA : <strong style="color:var(--gold)">${totalCA.toLocaleString('fr-FR',{minimumFractionDigits:2})} €</strong></span>
    <span style="margin-right:24px">Bénéfice : <strong style="color:#4CAF50">${totalBenef > 0 ? totalBenef.toLocaleString('fr-FR',{minimumFractionDigits:2}) + ' €' : '—'}</strong></span>
    ${totalMarge !== null ? `<span>Marge : <strong style="color:#4CAF50">${totalMarge}%</strong></span>` : ''}
    <span style="color:var(--text2);font-size:.82rem;margin-left:16px">(${data.length} facture${data.length>1?'s':''})</span>`;
}

let _editFinanceRowMonth = null;

function openEditFinanceRow(f) {
  const form = document.getElementById('form-editFinanceRow');
  if (!form) return;
  form.querySelector('[name=id]').value = f.id;
  form.querySelector('[name=notes]').value = f.notes || '';
  form.querySelector('[name=client]').value = f.client || '';
  form.querySelector('[name=amount]').value = f.amount || '';
  form.querySelector('[name=benef]').value = f.benef || '';
  form.querySelector('[name=invoice_date]').value = f.invoice_date || '';
  form.querySelector('[name=status]').value = f.status || 'En attente';
  // Store month context to refresh after save
  if (f.invoice_date) {
    const d = new Date(f.invoice_date);
    _editFinanceRowMonth = { year: d.getFullYear(), month: d.getMonth() + 1 };
  }
  calcEditMarge();
  openModal('editFinanceRow');
}

function calcEditMarge() {
  const form = document.getElementById('form-editFinanceRow');
  if (!form) return;
  const amt = parseFloat(form.querySelector('[name=amount]')?.value) || 0;
  const ben = parseFloat(form.querySelector('[name=benef]')?.value) || 0;
  const el = document.getElementById('editFinanceRow-marge');
  if (!el) return;
  if (amt > 0 && ben > 0) {
    const pct = Math.round((ben / amt) * 100);
    const color = pct >= 50 ? '#4CAF50' : pct >= 30 ? '#F5C518' : '#f44336';
    el.style.color = color;
    el.textContent = pct + '%';
  } else {
    el.style.color = 'var(--text2)';
    el.textContent = '—';
  }
}

async function saveFinanceRow() {
  const form = document.getElementById('form-editFinanceRow');
  if (!form) return;
  const id = form.querySelector('[name=id]').value;
  const data = {
    notes: form.querySelector('[name=notes]').value || null,
    client: form.querySelector('[name=client]').value,
    amount: parseFloat(form.querySelector('[name=amount]').value) || null,
    benef: parseFloat(form.querySelector('[name=benef]').value) || null,
    invoice_date: form.querySelector('[name=invoice_date]').value || null,
    status: form.querySelector('[name=status]').value,
  };
  const { error } = await sb.from('finances').update(data).eq('id', id);
  if (error) { showToast('Erreur : ' + error.message); return; }
  showToast('Facture mise à jour ✓');
  closeModal('editFinanceRow');
  if (_editFinanceRowMonth) showMonthDetail(_editFinanceRowMonth.year, _editFinanceRowMonth.month);
}

async function deleteFinanceRow() {
  const form = document.getElementById('form-editFinanceRow');
  if (!form) return;
  const id = form.querySelector('[name=id]').value;
  if (!confirm('Supprimer cette facture ?')) return;
  const { error } = await sb.from('finances').delete().eq('id', id);
  if (error) { showToast('Erreur : ' + error.message); return; }
  showToast('Facture supprimée');
  closeModal('editFinanceRow');
  if (_editFinanceRowMonth) showMonthDetail(_editFinanceRowMonth.year, _editFinanceRowMonth.month);
}

async function autoCalcDistance() {
  const form = document.getElementById('form-newMileage');
  if (!form) return;
  const departure = form.querySelector('[name=departure]')?.value?.trim();
  const destination = form.querySelector('[name=destination]')?.value?.trim();
  if (!departure || !destination) return;

  const totalEl = document.getElementById('mileage-calc-total');
  if (totalEl) totalEl.textContent = '⏳ Calcul…';

  try {
    const geocode = async (place) => {
      const q = encodeURIComponent(place + ', Réunion');
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`, {
        headers: { 'Accept-Language': 'fr' }
      });
      const data = await res.json();
      if (!data.length) throw new Error(`Lieu introuvable : ${place}`);
      return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
    };

    const [dep, dest] = await Promise.all([geocode(departure), geocode(destination)]);
    const osrmRes = await fetch(`https://router.project-osrm.org/route/v1/driving/${dep.lon},${dep.lat};${dest.lon},${dest.lat}?overview=false`);
    const osrmData = await osrmRes.json();
    if (osrmData.code !== 'Ok') throw new Error('Itinéraire introuvable');

    const km = Math.round(osrmData.routes[0].distance / 100) / 10;
    const kmInput = form.querySelector('[name=km]');
    if (kmInput) { kmInput.value = km; }
    calcMileageAmount();
  } catch(e) {
    if (totalEl) totalEl.textContent = '— €';
    showToast('📍 Distance non trouvée, saisis les km manuellement.');
  }
}

function calcMileageAmount() {
  const form = document.getElementById('form-newMileage');
  if (!form) return;
  const km = parseFloat(form.querySelector('[name=km]')?.value) || 0;
  const rate = parseFloat(form.querySelector('[name=rate]')?.value) || 0.374;
  const roundtrip = form.querySelector('[name=roundtrip]')?.checked ? 2 : 1;
  const total = km * roundtrip * rate;
  const totalEl = document.getElementById('mileage-calc-total');
  if (totalEl) totalEl.textContent = km > 0 ? `${total.toFixed(2)} €` : '— €';
}

async function saveNewMileage() {
  const form = document.getElementById('form-newMileage');
  if (!form) return;
  const kmOne = parseFloat(form.querySelector('[name=km]')?.value) || 0;
  const roundtrip = form.querySelector('[name=roundtrip]')?.checked ? 2 : 1;
  const km = kmOne * roundtrip;
  const rate = parseFloat(form.querySelector('[name=rate]')?.value) || 0.374;
  const data = {
    trip_date: form.querySelector('[name=trip_date]')?.value,
    user_name: form.querySelector('[name=user_name]')?.value,
    departure: form.querySelector('[name=departure]')?.value,
    destination: form.querySelector('[name=destination]')?.value,
    client: form.querySelector('[name=client]')?.value || null,
    km,
    rate,
    amount: Math.round(km * rate * 100) / 100,
    motif: form.querySelector('[name=motif]')?.value
  };
  if (!data.trip_date || !data.km) { showToast('Date et km obligatoires'); return; }
  try {
    const editId = form.dataset?.editId;
    if (editId) {
      await sb.from('mileage').update(data).eq('id', editId);
      form.dataset.editId = '';
    } else {
      await createMileage(data);
    }
    closeModal('newMileage');
    await loadAndRenderMileage();
    if (typeof loadMileageCalendar === 'function') loadMileageCalendar();
    showToast(editId ? 'Trajet modifié !' : 'Frais enregistrés !');
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
  const _now = new Date();
  const time = _now.toLocaleDateString('fr-FR', { day:'2-digit', month:'2-digit' }) + ' ' + _now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
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
async function updatePresence() {
  if (!currentUser) return;
  await sb.from('profiles').update({ last_seen: new Date().toISOString() }).eq('id', currentUser.id);
}

async function refreshPresenceDots() {
  const { data: profiles } = await sb.from('profiles').select('name, last_seen');
  if (!profiles) return;
  const now = Date.now();
  const DM_NAMES = ['romain','ketsia','flora','gloria'];
  DM_NAMES.forEach(n => {
    const dot = document.querySelector(`.wa-conv-item[data-channel="dm-${n}"] .wa-conv-dot`);
    if (!dot) return;
    const p = profiles.find(p => p.name?.toLowerCase() === n);
    if (!p?.last_seen) { dot.className = 'wa-conv-dot wa-offline'; return; }
    const diff = now - new Date(p.last_seen).getTime();
    dot.className = diff < 5 * 60 * 1000 ? 'wa-conv-dot wa-online' : 'wa-conv-dot wa-offline';
  });
}

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

  // Présence : mettre à jour last_seen toutes les 60s
  updatePresence();
  setInterval(updatePresence, 60000);
  refreshPresenceDots();
  setInterval(refreshPresenceDots, 60000);

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
  if (typeof checkCharter === 'function') checkCharter();
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
  loadDevisBadge();
  setInterval(loadDevisBadge, 60000);
  loadImprovementsBadge();
  // Écoute temps réel — nouvelle amélioration
  sb.channel('improvements-realtime')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'improvements' }, (payload) => {
      // Ne pas notifier si c'est moi qui ai posté
      if (payload.new?.author_id === currentUser?.id) return;
      loadImprovementsBadge();
      showToast('💡 Nouvelle suggestion d\'amélioration !');
    })
    .subscribe();
  // Afficher les éléments réservés admin
  if (isAdmin()) {
    document.querySelectorAll('.nav-admin-only').forEach(el => el.style.display = '');
  }
}

async function loadDevisBadge() {
  if (!currentUser) return;
  const firstName = (currentProfile?.name || '').split(' ')[0];
  if (!firstName) return;
  const { count } = await sb.from('devis_requests')
    .select('id', { count: 'exact', head: true })
    .eq('assigned_to', firstName)
    .neq('status', 'Envoyé');
  const badge = document.getElementById('nav-badge-devis');
  if (!badge) return;
  const n = count || 0;
  if (n > 0) { badge.textContent = n > 99 ? '99+' : n; badge.style.display = 'inline-flex'; }
  else badge.style.display = 'none';
}

async function loadImprovementsBadge() {
  if (!currentUser) return;
  const lastSeen = localStorage.getItem('improvements_last_seen') || '2000-01-01';
  const { count } = await sb.from('improvements')
    .select('id', { count: 'exact', head: true })
    .gt('created_at', lastSeen);
  const badge = document.getElementById('nav-badge-improvements');
  if (!badge) return;
  const n = count || 0;
  if (n > 0) {
    badge.textContent = n > 99 ? '99+' : n;
    badge.style.display = 'inline-flex';
  } else {
    badge.style.display = 'none';
  }
}

async function loadTasksBadge() {
  if (!currentUser) return;
  const fullName = currentProfile?.name || '';
  if (!fullName) return;
  const firstName = fullName.split(' ')[0];
  const { count } = await sb.from('tasks')
    .select('id', { count: 'exact', head: true })
    .not('status', 'in', '("fait","done")')
    .ilike('assignee_name', `%${firstName}%`);
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
      <td style="font-size:.82rem;font-weight:600;color:var(--gold)">${r.assigned_to || '—'}</td>
      <td>
        <select onchange="updateDevisRequestStatus('${r.id}',this)" style="background:${sc}22;color:${sc};border:1px solid ${sc}55;border-radius:10px;padding:2px 8px;font-size:.75rem;font-weight:600;cursor:pointer;outline:none">
          ${['À faire','En cours','Envoyé'].map(s=>`<option ${r.status===s?'selected':''}>${s}</option>`).join('')}
        </select>
      </td>
      <td style="display:flex;gap:4px">
        <button onclick="openEditDevis('${r.id}')" style="background:none;border:none;cursor:pointer;font-size:1rem;padding:2px 6px" title="Modifier">✏️</button>
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

function extractDevisFormData(f) {
  return {
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
    assigned_to: f.querySelector('[name=assigned_to]').value || null,
  };
}

function resetDevisModal() {
  const f = document.getElementById('form-newDevisRequest');
  f.reset();
  delete f.dataset.editId;
  delete f.dataset.prevAssignedTo;
  f.querySelectorAll('input,select,textarea').forEach(el => {
    el.removeEventListener('input', el._autoSave);
    el.removeEventListener('change', el._autoSave);
  });
  document.querySelector('#modal-newDevisRequest .modal-header h3').textContent = 'Nouvelle demande de devis';
  document.getElementById('devis-autosave-indicator').textContent = '';
}

async function openEditDevis(id) {
  const { data: r } = await sb.from('devis_requests').select('*').eq('id', id).single();
  if (!r) return;
  const f = document.getElementById('form-newDevisRequest');
  f.querySelector('[name=client]').value = r.client || '';
  f.querySelector('[name=contact_name]').value = r.contact_name || '';
  f.querySelector('[name=phone]').value = r.phone || '';
  f.querySelector('[name=email]').value = r.email || '';
  f.querySelector('[name=event_type]').value = r.event_type || '';
  f.querySelector('[name=event_date]').value = r.event_date || '';
  f.querySelector('[name=location]').value = r.location || '';
  f.querySelector('[name=guest_count]').value = r.guest_count || '';
  f.querySelector('[name=duration]').value = r.duration || '';
  f.querySelector('[name=budget_estimate]').value = r.budget_estimate || '';
  f.querySelector('[name=priority]').value = r.priority || 'Normal';
  f.querySelector('[name=status]').value = r.status || 'À faire';
  f.querySelector('[name=services_requested]').value = r.services_requested || '';
  f.querySelector('[name=catering]').value = r.catering || '';
  f.querySelector('[name=decoration]').value = r.decoration || '';
  f.querySelector('[name=sound_light]').value = r.sound_light || '';
  f.querySelector('[name=animation]').value = r.animation || '';
  f.querySelector('[name=notes]').value = r.notes || '';
  f.querySelector('[name=assigned_to]').value = r.assigned_to || '';
  f.dataset.editId = id;
  f.dataset.prevAssignedTo = r.assigned_to || '';
  document.querySelector('#modal-newDevisRequest .modal-header h3').textContent = 'Modifier le devis';
  openModal('newDevisRequest');

  // Auto-save à chaque changement
  let autoSaveTimer;
  const autoSave = () => {
    clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(async () => {
      if (!f.dataset.editId) return;
      const data = extractDevisFormData(f);
      const newAssignee = data.assigned_to;
      const prevAssignee = f.dataset.prevAssignedTo || '';
      await sb.from('devis_requests').update(data).eq('id', f.dataset.editId);
      // Créer une tâche si l'assignation vient de changer
      if (newAssignee && newAssignee !== prevAssignee) {
        await sb.from('tasks').insert([{
          title: `Établir devis — ${data.client}`,
          description: data.event_type ? `${data.event_type}${data.event_date ? ' · ' + new Date(data.event_date).toLocaleDateString('fr-FR') : ''}` : null,
          assignee_name: newAssignee,
          status: 'todo',
          priority: data.priority === 'Urgent' ? 'Urgent' : 'Normal',
          created_at: new Date()
        }]);
        f.dataset.prevAssignedTo = newAssignee;
        loadTasksBadge();
      }
      const indicator = document.getElementById('devis-autosave-indicator');
      if (indicator) { indicator.textContent = '✓ Sauvegardé'; setTimeout(() => { indicator.textContent = ''; }, 2000); }
      await loadDevisRequests();
      loadDevisBadge();
    }, 800);
  };
  f.querySelectorAll('input,select,textarea').forEach(el => {
    el.removeEventListener('input', el._autoSave);
    el.removeEventListener('change', el._autoSave);
    el._autoSave = autoSave;
    el.addEventListener('input', autoSave);
    el.addEventListener('change', autoSave);
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
    assigned_to: f.querySelector('[name=assigned_to]').value || null,
  };
  const editId = f.dataset.editId;
  let error;
  if (editId) {
    ({ error } = await sb.from('devis_requests').update(data).eq('id', editId));
    delete f.dataset.editId;
    document.querySelector('#modal-newDevisRequest .modal-header h3').textContent = 'Nouvelle demande de devis';
  } else {
    ({ error } = await sb.from('devis_requests').insert([data]));
  }
  if (error) { showToast('Erreur : ' + error.message); return; }

  // Créer une tâche seulement pour un nouveau devis
  if (!editId && data.assigned_to) {
    try {
      await createTask({
        title: `Établir devis — ${data.client}`,
        description: data.event_type || null,
        assignee_name: data.assigned_to,
        status: 'todo',
        priority: data.priority === 'Urgent' ? 'Urgent' : 'Normal',
      });
      loadTasksBadge();
    } catch(e) { showToast('Erreur tâche : ' + e.message); }
  }

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
async function loadEventTasks(eventId) {
  const list = document.getElementById('event-tasks-list');
  if (!list) return;
  const { data } = await sb.from('tasks').select('*').eq('event_id', eventId).order('created_at');
  if (!data || !data.length) { list.innerHTML = '<div style="color:var(--text3);font-size:.85rem">Aucune tâche pour cet événement.</div>'; return; }
  list.innerHTML = data.map(t => {
    const done = t.status === 'done' || t.status === 'fait';
    return `<div style="display:flex;align-items:center;gap:8px;background:var(--bg3);border-radius:8px;padding:8px 10px">
      <span style="font-size:1rem">${done ? '✅' : '⬜'}</span>
      <span style="flex:1;font-size:.85rem;${done ? 'text-decoration:line-through;opacity:.5' : ''}">${t.title}</span>
      <span style="font-size:.75rem;color:var(--text3);background:var(--bg4);border-radius:6px;padding:2px 7px">${t.assignee_name || ''}</span>
      <button onclick="deleteEventTask('${t.id}')" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:.8rem">✕</button>
    </div>`;
  }).join('');
}

async function addEventTask() {
  const input = document.getElementById('event-task-input');
  const assignee = document.getElementById('event-task-assignee').value;
  const title = input?.value.trim();
  const eventId = document.querySelector('#form-editEvent [name=id]')?.value;
  if (!title || !eventId) return;
  input.value = '';
  const { error } = await sb.from('tasks').insert([{
    title,
    assignee_name: assignee,
    event_id: eventId,
    status: 'todo',
    priority: 'normal',
    created_at: new Date()
  }]);
  if (error) { showToast('Erreur : ' + error.message); return; }
  await loadEventTasks(eventId);
  loadTasksBadge();
  showToast('Tâche ajoutée ✓');
}

async function deleteEventTask(taskId) {
  if (!confirm('Supprimer cette tâche ?')) return;
  await sb.from('tasks').delete().eq('id', taskId);
  const eventId = document.querySelector('#form-editEvent [name=id]')?.value;
  if (eventId) await loadEventTasks(eventId);
  loadTasksBadge();
}

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
  await loadEventTasks(ev.id);
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
  // Canaux DM de l'utilisateur (conversations privées avec chaque membre)
  const otherMembers = ['Romain','Ketsia','Flora','Gloria'].filter(n => n !== myName.split(' ')[0]);
  const myDmChannels = otherMembers.map(n => dmChannelName(n));

  const promises = [
    // Tâches assignées à moi, non terminées
    sb.from('tasks').select('*').neq('status','done').ilike('assignee', `%${myName}%`),
    // Messages privés reçus dans mes canaux DM
    sb.from('messages').select('*').in('channel', myDmChannels).neq('author_id', currentUser.id).order('created_at', { ascending: false }).limit(10),
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
  if (badge) { badge.textContent = ''; badge.style.display = 'none'; }
  refreshNavMessageBadge();
}

async function loadUnreadCounts() {
  if (!currentUser || !currentProfile) return;
  const me = (currentProfile.name || '').split(' ')[0];
  // Canaux groupes fixes + DM par paire pour chaque membre
  const dmPairs = ['Romain','Ketsia','Flora','Gloria']
    .filter(n => n !== me)
    .map(n => ({ key: 'dm-' + n.toLowerCase(), real: dmChannelName(n) }));
  const groupChannels = [
    { key: 'general', real: 'general' },
    { key: 'annonces', real: 'annonces' }
  ];
  const allChannels = [...groupChannels, ...dmPairs];

  const { data: reads } = await sb.from('message_reads').select('channel,last_read_at').eq('user_id', currentUser.id);
  const readMap = {};
  (reads || []).forEach(r => { readMap[r.channel] = r.last_read_at; });

  let totalUnread = 0;
  for (const { key, real } of allChannels) {
    const lastRead = readMap[real] || '1970-01-01T00:00:00Z';
    const { count } = await sb.from('messages').select('id', { count: 'exact', head: true })
      .eq('channel', real)
      .neq('author_id', currentUser.id)
      .gt('created_at', lastRead);
    const n = count || 0;
    const badge = document.getElementById('badge-' + key);
    if (badge) {
      if (n > 0) {
        badge.textContent = n > 99 ? '99+' : String(n);
        badge.style.display = 'inline-flex';
        badge.style.background = '#25D366';
      } else {
        badge.textContent = '';
        badge.style.display = 'none';
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
    ['general','annonces','dm-romain','dm-ketsia','dm-flora','dm-gloria'].forEach(key => {
      const b = document.getElementById('badge-' + key);
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
    const isMine = msg.author_id === currentUser?.id;
    if (!isMine) { showMessageNotification(msg); loadUnreadCounts(); }
    const time = new Date(msg.created_at).toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' });
    const firstName = (msg.author_name || '?').split(' ')[0];
    const initials = firstName[0].toUpperCase();
    const avatarColor = WA_COLORS[firstName] || '#555';
    const isVoice = msg.content?.startsWith('__voice__:');
    const isImg   = msg.content?.startsWith('__img__:');
    const isFile  = msg.content?.startsWith('__file__:');
    let bubbleContent;
    if (isVoice) {
      const url = msg.content.replace('__voice__:','');
      bubbleContent = `<div class="wa-audio"><span>🎤</span><audio controls src="${url}" style="height:32px;max-width:200px"></audio></div>`;
    } else if (isImg) {
      const url = msg.content.replace('__img__:','');
      bubbleContent = `<img src="${url}" style="max-width:220px;max-height:200px;border-radius:8px;display:block;cursor:pointer" onclick="window.open('${url}','_blank')">`;
    } else if (isFile) {
      try { const {url,name} = JSON.parse(msg.content.replace('__file__:','')); bubbleContent = `<a href="${url}" download="${name}" target="_blank" style="display:flex;align-items:center;gap:8px;color:var(--gold);text-decoration:none;font-size:.85rem;background:var(--bg4);padding:8px 12px;border-radius:8px"><span style="font-size:1.6rem">📄</span><div><div style="font-weight:600">${name}</div><div style="font-size:.7rem;color:var(--text3)">Appuyer pour télécharger</div></div></a>`; } catch { bubbleContent = `<div class="chat-text">${msg.content}</div>`; }
    } else {
      bubbleContent = `<div class="chat-text">${msg.content}</div>`;
    }
    const div = document.createElement('div');
    div.className = `chat-msg ${isMine ? 'mine' : ''}`;
    div.innerHTML = `${!isMine ? `<div class="chat-avatar-wa" style="background:${avatarColor};color:${firstName==='Romain'?'#000':'#fff'}">${initials}</div>` : ''}
      <div class="chat-bubble">
        ${!isMine ? `<div class="chat-name">${firstName}</div>` : ''}
        ${bubbleContent}
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
    document.querySelectorAll('.wa-conv-item').forEach(i => i.classList.toggle('active', i.dataset.channel === msg.channel));
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

async function loadPersonnelLeaveStats() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const firstDay = `${year}-${String(month+1).padStart(2,'0')}-01`;
  const lastDay = new Date(year, month+1, 0).toISOString().slice(0,10);

  const [{ data }, { data: profiles }] = await Promise.all([
    sb.from('leaves').select('*').gte('leave_date', firstDay).lte('leave_date', lastDay),
    sb.from('profiles').select('name, last_seen')
  ]);

  const members = ['Romain', 'Ketsia', 'Flora', 'Gloria'];
  members.forEach(name => {
    const myLeaves = (data || []).filter(l => l.person_name === name);
    const totalH = myLeaves.reduce((s, l) => s + (parseFloat(l.hours) || 0), 0);
    const congeJ = myLeaves.filter(l => !l.leave_type || l.leave_type === 'conge').length;
    const maladieJ = myLeaves.filter(l => l.leave_type === 'maladie').length;

    const hEl = document.getElementById(`pstat-h-${name}`);
    const cEl = document.getElementById(`pstat-conge-${name}`);
    const mEl = document.getElementById(`pstat-maladie-${name}`);
    if (hEl) hEl.textContent = totalH > 0 ? `${totalH}h` : '0h';
    if (cEl) cEl.textContent = congeJ > 0 ? `${congeJ}j` : '0j';
    if (mEl) mEl.textContent = maladieJ > 0 ? `${maladieJ}j` : '0j';

    // Dernière connexion
    const lsEl = document.getElementById(`lastseen-${name}`);
    if (lsEl) {
      const profile = (profiles || []).find(p => p.name && p.name.startsWith(name));
      if (profile?.last_seen) {
        const d = new Date(profile.last_seen);
        const diffMin = Math.floor((now - d) / 60000);
        const isOnline = diffMin < 5;
        let label;
        if (diffMin < 1) label = 'En ligne maintenant';
        else if (diffMin < 60) label = `Il y a ${diffMin} min`;
        else if (diffMin < 1440) label = `Il y a ${Math.floor(diffMin/60)}h`;
        else {
          const opts = { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' };
          label = `Le ${d.toLocaleDateString('fr-FR', opts)}`;
        }
        lsEl.innerHTML = `<span class="${isOnline ? 'dot-online' : 'dot-offline'}"></span> Dernière connexion : ${label}`;
      } else {
        lsEl.innerHTML = `<span class="dot-offline"></span> Jamais connecté`;
      }
    }
  });
}

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

  // Channel switching (new WA UI handled by waSelectChannel, fallback)
  document.querySelectorAll('.wa-conv-item').forEach(item => {
    item.addEventListener('click', () => {
      const ch = item.dataset.channel || 'general';
      switchChannel(ch);
    });
  });
});

// =============================================
// CONGÉS
// =============================================
let leaveViewDate = new Date();
const LEAVE_TOTAL = 30; // jours ouvrés par an (légal France)
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
  // Charger déc N-1 → déc N pour inclure Flora (contrat 1er déc)
  const { data, error } = await sb.from('leaves').select('*').gte('leave_date', (year-1) + '-12-01').lte('leave_date', year + '-12-31').order('leave_date');
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

async function leavePrevMonth() {
  leaveViewDate = new Date(leaveViewDate.getFullYear(), leaveViewDate.getMonth() - 1, 1);
  updateLeavesMonthLabel();
  await loadAndRenderLeaves();
}

async function leaveNextMonth() {
  leaveViewDate = new Date(leaveViewDate.getFullYear(), leaveViewDate.getMonth() + 1, 1);
  updateLeavesMonthLabel();
  await loadAndRenderLeaves();
}

function renderLeaveCards() {
  const container = document.getElementById('leaves-cards');
  if (!container) return;
  const year = leaveViewDate.getFullYear();
  const yearLeaves = allLeaves.filter(l => l.leave_date.startsWith(year));

  const monthLeaves = allLeaves.filter(l => l.leave_date.startsWith(`${leaveViewDate.getFullYear()}-${String(leaveViewDate.getMonth()+1).padStart(2,'0')}`));

  container.innerHTML = LEAVE_MEMBERS.map(name => {
    // Flora : année de contrat du 1er déc N-1 au 30 nov N
    const floraStart = `${year-1}-12-01`;
    const floraEnd   = `${year}-11-30`;
    const approved = name === 'Flora'
      ? allLeaves.filter(l => l.person_name === 'Flora' && l.status === 'approved' && (!l.leave_type || l.leave_type === 'conge') && l.leave_date >= floraStart && l.leave_date <= floraEnd).length
      : yearLeaves.filter(l => l.person_name === name && l.status === 'approved' && (!l.leave_type || l.leave_type === 'conge')).length;
    const pending = yearLeaves.filter(l => l.person_name === name && l.status === 'pending').length;
    const remaining = LEAVE_TOTAL - approved;
    const pct = Math.round((approved / LEAVE_TOTAL) * 100);
    const color = LEAVE_COLORS_HEX[name];
    const monthHours = monthLeaves.filter(l => l.person_name === name).reduce((s, l) => s + (parseFloat(l.hours) || 0), 0);
    const yearHours = yearLeaves.filter(l => l.person_name === name).reduce((s, l) => s + (parseFloat(l.hours) || 0), 0);
    const yearMaladie = yearLeaves.filter(l => l.person_name === name && l.leave_type === 'maladie').length;
    const monthMaladie = monthLeaves.filter(l => l.person_name === name && l.leave_type === 'maladie').length;
    return `<div class="card" style="text-align:center;padding:1.25rem">
      <img src="${LEAVE_PHOTOS[name]}" style="width:64px;height:64px;border-radius:50%;object-fit:cover;border:3px solid ${color};margin:0 auto .75rem;display:block" onerror="this.style.display='none'">
      <div style="font-weight:700;font-size:1rem;margin-bottom:.25rem">${name}</div>
      <div style="font-size:2rem;font-weight:800;color:${color};line-height:1">${remaining}</div>
      <div style="font-size:.75rem;color:var(--text2);margin-bottom:.75rem">jours restants / ${LEAVE_TOTAL}</div>
      ${monthHours > 0 ? `<div style="font-size:.78rem;color:var(--text2);margin-bottom:4px">Ce mois : <strong style="color:${color}">${monthHours}h</strong></div>` : ''}
      ${yearHours > 0 ? `<div style="font-size:.75rem;color:var(--text3);margin-bottom:.5rem">Cette année : <strong>${yearHours}h</strong></div>` : ''}
      ${yearMaladie > 0 ? `<div style="font-size:.75rem;background:rgba(74,158,255,.12);color:#4A9EFF;border-radius:6px;padding:3px 8px;margin-bottom:.5rem">🤒 ${yearMaladie}j maladie / an${monthMaladie > 0 ? ` · ${monthMaladie}j ce mois` : ''}</div>` : ''}
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

  const monthLabel = leaveViewDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  let html = `
  <div style="display:flex;align-items:center;justify-content:center;gap:16px;margin-bottom:16px">
    <button onclick="leavePrevMonth()" style="background:var(--bg3);border:1px solid var(--border);color:var(--text1);width:36px;height:36px;border-radius:8px;font-size:1.2rem;cursor:pointer;display:flex;align-items:center;justify-content:center">‹</button>
    <span style="font-weight:700;font-size:1rem;min-width:160px;text-align:center;text-transform:capitalize">${monthLabel}</span>
    <button onclick="leaveNextMonth()" style="background:var(--bg3);border:1px solid var(--border);color:var(--text1);width:36px;height:36px;border-radius:8px;font-size:1.2rem;cursor:pointer;display:flex;align-items:center;justify-content:center">›</button>
  </div>
  <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;margin-bottom:4px">
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

    let cellStyle = `min-height:72px;border-radius:8px;padding:4px;position:relative;cursor:pointer;`;
    cellStyle += `background:${isWeekend ? 'var(--bg)' : 'var(--bg3)'};`;
    if (isToday) cellStyle += 'border:2px solid var(--gold);';
    if (isPast) cellStyle += 'opacity:.7;';

    const clickAttr = `onclick="requestLeaveDay('${dateStr}')"`;

    html += `<div style="${cellStyle}" ${clickAttr}>
      <div style="font-size:.8rem;font-weight:${isToday?'700':'400'};color:${isToday?'var(--gold)':'var(--text2)'};margin-bottom:3px">${d}</div>
      ${leavesOnDay.map(l => {
        const typeIcons = { maladie:'🤒', formation:'📚', bureau:'🏢', ferie:'🎌', evenement:'🎉', conge:'🏖' };
        const personHex = LEAVE_COLORS_HEX[l.person_name] || '#888';
        const typeOverride = { maladie:'#4A9EFF', formation:'#9B59B6' };
        const bg = typeOverride[l.leave_type] || personHex;
        const icon = typeIcons[l.leave_type] || '🏖';
        const textColor = (l.person_name === 'Romain') ? '#000' : '#fff';
        return `<div style="background:${bg};border-radius:4px;padding:1px 5px;font-size:.68rem;font-weight:600;color:${textColor};margin-bottom:2px;opacity:${l.status==='pending'?'0.6':'1'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${l.person_name} ${icon}${l.hours?` · ${l.hours}h`:''}${l.status==='pending'?' (attente)':''}">
          ${icon} ${l.person_name}${l.hours ? ` <span style="opacity:.8">${l.hours}h</span>` : ''}${l.status==='pending'?' ⏳':''}
        </div>`;
      }).join('')}
    </div>`;
  }

  html += '</div>';
  container.innerHTML = html;
}

async function requestLeaveDay(dateStr) {
  const existing = allLeaves.find(l => l.person_name === currentUserName && l.leave_date === dateStr);
  if (existing) {
    if (!confirm(`Annuler le ${existing.leave_type === 'maladie' ? 'congé maladie' : 'congé'} du ${new Date(dateStr).toLocaleDateString('fr-FR')} ?`)) return;
    await sb.from('leaves').delete().eq('id', existing.id);
    showToast('Congé annulé');
    await loadAndRenderLeaves();
    return;
  }
  const dateLabel = new Date(dateStr + 'T00:00:00').toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long' });

  // Popup étape 1 : choix du type
  const leaveType = await new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9999;display:flex;align-items:center;justify-content:center';
    overlay.innerHTML = `
      <div style="background:var(--bg2);border:1px solid var(--border);border-radius:16px;padding:24px;width:300px;text-align:center">
        <div style="font-size:1rem;font-weight:700;margin-bottom:6px">📅 ${dateLabel}</div>
        <div style="font-size:.85rem;color:var(--text2);margin-bottom:20px">Quel type d'absence ?</div>
        <div style="display:flex;flex-direction:column;gap:10px">
          <button id="lchoice-conge" style="background:var(--gold);color:#000;border:none;border-radius:10px;padding:12px;font-size:.95rem;font-weight:700;cursor:pointer">🏖 Congé</button>
          <button id="lchoice-maladie" style="background:#4A9EFF;color:#fff;border:none;border-radius:10px;padding:12px;font-size:.95rem;font-weight:700;cursor:pointer">🤒 Maladie</button>
          <button id="lchoice-formation" style="background:#9B59B6;color:#fff;border:none;border-radius:10px;padding:12px;font-size:.95rem;font-weight:700;cursor:pointer">📚 Formation</button>
          <button id="lchoice-bureau" style="background:#4CAF50;color:#fff;border:none;border-radius:10px;padding:12px;font-size:.95rem;font-weight:700;cursor:pointer">🏢 Bureau</button>
          <button id="lchoice-evenement" style="background:#FF6B9D;color:#fff;border:none;border-radius:10px;padding:12px;font-size:.95rem;font-weight:700;cursor:pointer">🎉 Événement</button>
          <button id="lchoice-cancel" style="background:var(--bg3);color:var(--text2);border:none;border-radius:10px;padding:10px;font-size:.85rem;cursor:pointer">Annuler</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    const cleanup = (val) => { document.body.removeChild(overlay); resolve(val); };
    overlay.querySelector('#lchoice-conge').onclick = () => cleanup('conge');
    overlay.querySelector('#lchoice-maladie').onclick = () => cleanup('maladie');
    overlay.querySelector('#lchoice-formation').onclick = () => cleanup('formation');
    overlay.querySelector('#lchoice-bureau').onclick = () => cleanup('bureau');
    overlay.querySelector('#lchoice-evenement').onclick = () => cleanup('evenement');
    overlay.querySelector('#lchoice-cancel').onclick = () => cleanup(null);
  });
  if (!leaveType) return;

  // Popup étape 2 : nombre d'heures
  const typeLabels = { conge:'Congé', maladie:'Maladie', formation:'Formation', bureau:'Bureau', evenement:'Événement' };
  const typeColors = { conge:'var(--gold)', maladie:'#4A9EFF', formation:'#9B59B6', bureau:'#4CAF50', evenement:'#FF6B9D' };
  const hours = await new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9999;display:flex;align-items:center;justify-content:center';
    overlay.innerHTML = `
      <div style="background:var(--bg2);border:1px solid var(--border);border-radius:16px;padding:24px;width:300px;text-align:center">
        <div style="font-size:1rem;font-weight:700;margin-bottom:4px">⏱ Nombre d'heures</div>
        <div style="font-size:.85rem;color:var(--text2);margin-bottom:16px">${typeLabels[leaveType]} · ${dateLabel}</div>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:16px">
          ${[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16].map(h => `<button onclick="this.closest('.hours-popup').dataset.val='${h}';this.closest('.hours-popup').querySelectorAll('button.hbtn').forEach(b=>b.style.background='var(--bg3)');this.style.background='${typeColors[leaveType]}';this.style.color='${leaveType==='conge'?'#000':'#fff'}'" class="hbtn" style="background:var(--bg3);border:none;border-radius:8px;padding:10px;font-size:.9rem;font-weight:700;cursor:pointer;color:var(--text1)">${h}h</button>`).join('')}
        </div>
        <input id="hours-custom" type="number" min="0.5" max="24" step="0.5" placeholder="Autre..." style="width:100%;background:var(--bg3);border:1px solid var(--border);border-radius:8px;padding:10px;color:var(--text1);font-size:.9rem;margin-bottom:12px;box-sizing:border-box;text-align:center">
        <div style="display:flex;gap:8px">
          <button id="hours-cancel" style="flex:1;background:var(--bg3);color:var(--text2);border:none;border-radius:8px;padding:10px;cursor:pointer">Annuler</button>
          <button id="hours-ok" style="flex:2;background:${typeColors[leaveType]};color:${leaveType==='conge'?'#000':'#fff'};border:none;border-radius:8px;padding:10px;font-weight:700;cursor:pointer">Confirmer</button>
        </div>
      </div>`;
    const inner = overlay.querySelector('div > div');
    inner.classList.add('hours-popup');
    document.body.appendChild(overlay);
    overlay.querySelector('#hours-ok').onclick = () => {
      const selected = parseFloat(inner.dataset.val || overlay.querySelector('#hours-custom').value);
      document.body.removeChild(overlay);
      resolve(isNaN(selected) ? null : selected);
    };
    overlay.querySelector('#hours-cancel').onclick = () => { document.body.removeChild(overlay); resolve(null); };
  });
  if (!hours) return;

  const { error } = await sb.from('leaves').insert({
    person_name: currentUserName,
    leave_date: dateStr,
    leave_type: leaveType,
    hours: hours,
    status: (currentUserName === 'Romain' || leaveType === 'bureau') ? 'approved' : 'pending'
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
// ===== CALENDRIER ÉDITORIAL =====
let editorialViewDate = new Date();
let allEditorialPosts = [];
let editorialFilterNet = 'all';

const ED_NET_COLORS = {
  Instagram: { bg:'#E1306C', text:'#fff' },
  Facebook:  { bg:'#1877F2', text:'#fff' },
  LinkedIn:  { bg:'#0077B5', text:'#fff' },
  TikTok:    { bg:'#010101', text:'#fff' },
  Email:     { bg:'#F5C518', text:'#000' },
};

const ED_STATUS_ICONS = { idee:'💡', redaction:'✍️', pret:'✅', publie:'🚀' };

async function loadAndRenderEditorial() {
  const year = editorialViewDate.getFullYear();
  const month = editorialViewDate.getMonth();
  const firstDay = `${year}-${String(month+1).padStart(2,'0')}-01`;
  const lastDay = new Date(year, month+1, 0).toISOString().slice(0,10);
  const { data } = await sb.from('editorial_posts').select('*').gte('publish_date', firstDay).lte('publish_date', lastDay).order('publish_date');
  allEditorialPosts = data || [];
  renderEditorialCalendar();
}

function renderEditorialCalendar() {
  const year = editorialViewDate.getFullYear();
  const month = editorialViewDate.getMonth();
  const label = editorialViewDate.toLocaleDateString('fr-FR', { month:'long', year:'numeric' });
  const el = document.getElementById('editorial-month-label');
  if (el) el.textContent = label.charAt(0).toUpperCase() + label.slice(1);

  const filtered = editorialFilterNet === 'all' ? allEditorialPosts : allEditorialPosts.filter(p => p.network === editorialFilterNet);

  const cal = document.getElementById('editorial-calendar');
  if (!cal) return;

  const firstOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month+1, 0).getDate();
  let startDow = firstOfMonth.getDay(); // 0=Sun
  startDow = (startDow === 0) ? 6 : startDow - 1; // Lun=0

  const today = new Date();
  const todayStr = today.toISOString().slice(0,10);

  const days = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'];
  let html = `<div class="ed-calendar-grid">${days.map(d=>`<div class="ed-day-name">${d}</div>`).join('')}`;

  // Jours vides au début
  for (let i = 0; i < startDow; i++) html += `<div class="ed-day other-month"></div>`;

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const isToday = dateStr === todayStr;
    const posts = filtered.filter(p => p.publish_date === dateStr);
    const pillsHtml = posts.slice(0,3).map(p => {
      const col = ED_NET_COLORS[p.network] || { bg:'var(--bg4)', text:'var(--text)' };
      return `<div class="ed-post-pill" style="background:${col.bg};color:${col.text}" onclick="event.stopPropagation();openEditorialModal('${p.id}')" title="${p.title||p.network}">${ED_STATUS_ICONS[p.status]||''} ${p.title || p.network}</div>`;
    }).join('');
    const more = posts.length > 3 ? `<div style="font-size:.6rem;color:var(--text3)">+${posts.length-3} autres</div>` : '';
    html += `<div class="ed-day${isToday?' today':''}" onclick="openEditorialModal(null,'${dateStr}')">
      <div class="ed-day-num">${d}</div>
      ${pillsHtml}${more}
    </div>`;
  }

  // Jours vides à la fin
  const total = startDow + daysInMonth;
  const rem = total % 7;
  if (rem) for (let i = 0; i < 7 - rem; i++) html += `<div class="ed-day other-month"></div>`;

  html += '</div>';
  cal.innerHTML = html;
}

function editorialNav(dir) {
  editorialViewDate.setMonth(editorialViewDate.getMonth() + dir);
  loadAndRenderEditorial();
}

function setEditorialFilter(btn, net) {
  document.querySelectorAll('.editorial-filter').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  editorialFilterNet = net;
  renderEditorialCalendar();
}

function openEditorialModal(id, prefillDate) {
  document.getElementById('ed-edit-id').value = id || '';
  document.getElementById('editorial-modal-title').textContent = id ? 'Modifier la publication' : 'Nouvelle publication';
  if (id) {
    const post = allEditorialPosts.find(p => p.id == id);
    if (post) {
      document.getElementById('ed-date').value = post.publish_date || '';
      document.getElementById('ed-network').value = post.network || 'Instagram';
      document.getElementById('ed-title').value = post.title || '';
      document.getElementById('ed-content').value = post.content || '';
      document.getElementById('ed-status').value = post.status || 'idee';
      document.getElementById('ed-assignee').value = post.assignee || '';
    }
  } else {
    document.getElementById('ed-date').value = prefillDate || '';
    document.getElementById('ed-network').value = 'Instagram';
    document.getElementById('ed-title').value = '';
    document.getElementById('ed-content').value = '';
    document.getElementById('ed-status').value = 'idee';
    document.getElementById('ed-assignee').value = '';
  }
  openModal('editorial');
}

async function saveEditorialPost() {
  const id = document.getElementById('ed-edit-id').value;
  const payload = {
    publish_date: document.getElementById('ed-date').value,
    network:      document.getElementById('ed-network').value,
    title:        document.getElementById('ed-title').value,
    content:      document.getElementById('ed-content').value,
    status:       document.getElementById('ed-status').value,
    assignee:     document.getElementById('ed-assignee').value || null,
  };
  if (!payload.publish_date || !payload.title) { showToast('Date et titre requis'); return; }
  if (id) {
    await sb.from('editorial_posts').update(payload).eq('id', id);
  } else {
    await sb.from('editorial_posts').insert(payload);
  }
  closeModal('editorial');
  await loadAndRenderEditorial();
  showToast(id ? 'Publication mise à jour' : 'Publication créée');
}

// ===== AMÉLIORATIONS HUB =====
let allImprovements = [];
let improvFilterStatus = 'all';

const IMPROV_PRIORITY = { high:'🔥 Urgent', normal:'Normal', low:'Plus tard' };
const IMPROV_STATUS = { idea:'💡 Idée', todo:'🔧 À faire', done:'✅ Fait' };
const IMPROV_STATUS_COLORS = { idea:'#F5C518', todo:'#4A9EFF', done:'#4CAF50' };

async function loadImprovements() {
  // Marquer comme vu — efface la pastille
  localStorage.setItem('improvements_last_seen', new Date().toISOString());
  const badge = document.getElementById('nav-badge-improvements');
  if (badge) badge.style.display = 'none';
  const { data } = await sb.from('improvements').select('*').order('created_at', { ascending: false });
  allImprovements = data || [];
  renderImprovements();
}

function filterImprovements(btn, status) {
  document.querySelectorAll('#page-improvements .editorial-filter').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  improvFilterStatus = status;
  renderImprovements();
}

function renderImprovements() {
  const list = document.getElementById('improvements-list');
  if (!list) return;
  const filtered = improvFilterStatus === 'all' ? allImprovements : allImprovements.filter(i => i.status === improvFilterStatus);
  if (!filtered.length) {
    list.innerHTML = '<div style="text-align:center;color:var(--text3);padding:3rem">Aucune suggestion pour l\'instant</div>';
    return;
  }
  list.innerHTML = filtered.map(item => {
    const sc = IMPROV_STATUS_COLORS[item.status] || 'var(--text2)';
    const date = item.created_at ? new Date(item.created_at).toLocaleDateString('fr-FR', { day:'numeric', month:'short', year:'numeric' }) : '';
    return `<div style="background:var(--bg3);border:1px solid var(--border);border-left:3px solid ${sc};border-radius:10px;padding:16px 18px">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap">
        <div style="flex:1;min-width:0">
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:6px">
            <span style="font-weight:700;font-size:.95rem">${item.title}</span>
            ${item.priority === 'high' ? '<span style="font-size:.72rem;background:#e74c3c22;color:#e74c3c;border-radius:4px;padding:2px 7px;font-weight:700">🔥 Urgent</span>' : ''}
          </div>
          ${item.description ? `<div style="font-size:.85rem;color:var(--text2);white-space:pre-wrap;line-height:1.5">${item.description}</div>` : ''}
          <div style="margin-top:8px;font-size:.75rem;color:var(--text3)">Par <strong style="color:var(--text2)">${item.author || '—'}</strong> · ${date}</div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;flex-shrink:0">
          <select onchange="updateImprovementStatus('${item.id}', this.value)"
            style="background:var(--bg4);color:${sc};border:1px solid var(--border);border-radius:6px;padding:4px 8px;font-size:.78rem;font-weight:600;cursor:pointer">
            ${Object.entries(IMPROV_STATUS).map(([v,l]) => `<option value="${v}" ${item.status===v?'selected':''}>${l}</option>`).join('')}
          </select>
          <div style="display:flex;gap:6px">
            <button onclick="openEditImprovement('${item.id}')" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:.8rem">✏️</button>
            <button onclick="deleteImprovement('${item.id}')" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:.8rem">🗑</button>
          </div>
        </div>
      </div>
    </div>`;
  }).join('');
}

async function saveImprovement() {
  const idEl = document.getElementById('improv-edit-id');
  const titleEl = document.getElementById('improv-title');
  const descEl = document.getElementById('improv-desc');
  const prioEl = document.getElementById('improv-priority');

  if (!titleEl || !titleEl.value.trim()) { showToast('Le titre est requis'); return; }

  const id = idEl ? idEl.value.trim() : '';
  const title = titleEl.value.trim();
  const description = descEl ? (descEl.value.trim() || null) : null;
  const priority = prioEl ? prioEl.value : 'normal';

  let result;
  if (id) {
    result = await sb.from('improvements').update({ title, description, priority }).eq('id', id);
  } else {
    result = await sb.from('improvements').insert({ title, description, priority, status: 'idea' });
  }

  if (result.error) {
    console.error('Improvements error:', result.error);
    showToast('Erreur : ' + result.error.message);
    return;
  }

  closeModal('newImprovement');
  await loadImprovements();
  showToast(id ? 'Mise à jour ✓' : 'Suggestion ajoutée ✓');
}

function openNewImprovement() {
  document.getElementById('improv-edit-id').value = '';
  document.getElementById('improv-modal-title').textContent = 'Nouvelle suggestion';
  document.getElementById('improv-title').value = '';
  document.getElementById('improv-desc').value = '';
  document.getElementById('improv-priority').value = 'normal';
  openModal('newImprovement');
}

function openEditImprovement(id) {
  const item = allImprovements.find(i => i.id == id);
  if (!item) return;
  document.getElementById('improv-edit-id').value = id;
  document.getElementById('improv-modal-title').textContent = 'Modifier la suggestion';
  document.getElementById('improv-title').value = item.title || '';
  document.getElementById('improv-desc').value = item.description || '';
  document.getElementById('improv-priority').value = item.priority || 'normal';
  openModal('newImprovement');
}

async function updateImprovementStatus(id, status) {
  await sb.from('improvements').update({ status }).eq('id', id);
  const item = allImprovements.find(i => i.id == id);
  if (item) item.status = status;
  renderImprovements();
}

async function deleteImprovement(id) {
  if (!confirm('Supprimer cette suggestion ?')) return;
  await sb.from('improvements').delete().eq('id', id);
  await loadImprovements();
}

// ===== CALENDRIER KILOMÉTRIQUE =====
let mileageCalDate = new Date();
let mileageCalPerson = 'Tous';
let _allMileageTrips = [];

const PERSON_COLORS = {
  'Romain Capdepont': '#F5C518',
  'Ketsia': '#4A9EFF',
  'Flora Boyer': '#FF6B9D',
  'Gloria': '#9B59B6',
};

async function loadMileageCalendar() {
  const year = mileageCalDate.getFullYear();
  const month = mileageCalDate.getMonth();
  const firstDay = `${year}-${String(month+1).padStart(2,'0')}-01`;
  const lastDay = new Date(year, month+1, 0).toISOString().slice(0,10);
  const { data } = await sb.from('mileage').select('*').gte('trip_date', firstDay).lte('trip_date', lastDay).order('trip_date');
  _allMileageTrips = data || [];
  renderMileageCalendar();
}

function setMileagePerson(btn, person) {
  document.querySelectorAll('.mileage-person-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  mileageCalPerson = person;
  renderMileageCalendar();
}

function mileageCalNav(dir) {
  mileageCalDate.setMonth(mileageCalDate.getMonth() + dir);
  loadMileageCalendar();
}

function renderMileageCalendar() {
  const year = mileageCalDate.getFullYear();
  const month = mileageCalDate.getMonth();
  const label = mileageCalDate.toLocaleDateString('fr-FR', { month:'long', year:'numeric' });
  const el = document.getElementById('mileage-cal-label');
  if (el) el.textContent = label.charAt(0).toUpperCase() + label.slice(1);

  const cal = document.getElementById('mileage-calendar');
  if (!cal) return;

  const filtered = mileageCalPerson === 'Tous' ? _allMileageTrips : _allMileageTrips.filter(t => t.user_name === mileageCalPerson);

  const firstOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month+1, 0).getDate();
  let startDow = firstOfMonth.getDay();
  startDow = startDow === 0 ? 6 : startDow - 1;
  const todayStr = new Date().toISOString().slice(0,10);

  const days = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'];
  let html = `<div class="km-cal-grid">${days.map(d=>`<div class="km-day-name">${d}</div>`).join('')}`;

  for (let i = 0; i < startDow; i++) html += `<div class="km-day other-month"></div>`;

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const isToday = dateStr === todayStr;
    const trips = filtered.filter(t => t.trip_date === dateStr);
    const pillsHtml = trips.slice(0,3).map(t => {
      const col = PERSON_COLORS[t.user_name] || 'var(--gold)';
      const label = `${t.km}km${t.departure ? ' · ' + t.departure + '→' + (t.destination||'') : ''}${t.motif ? ' · ' + t.motif : ''}`;
      return `<div class="km-trip-pill" style="border-color:${col}" title="${label}" onclick="event.stopPropagation();openEditMileage('${t.id}')">${label}</div>`;
    }).join('');
    const more = trips.length > 3 ? `<div style="font-size:.62rem;color:var(--text3)">+${trips.length-3} autres</div>` : '';

    html += `<div class="km-day${isToday?' today':''}" onclick="openNewMileageOnDate('${dateStr}')">
      <div class="km-day-num">${d}${trips.length ? `<span style="font-size:.6rem;color:var(--gold);margin-left:4px">${trips.reduce((s,t)=>s+(parseFloat(t.km)||0),0)}km</span>` : ''}</div>
      ${pillsHtml}${more}
    </div>`;
  }

  const total = startDow + daysInMonth;
  const rem = total % 7;
  if (rem) for (let i = 0; i < 7 - rem; i++) html += `<div class="km-day other-month"></div>`;
  html += '</div>';
  cal.innerHTML = html;
}

function openNewMileageOnDate(dateStr) {
  const f = document.getElementById('form-newMileage');
  if (!f) return;
  f.reset();
  f.querySelector('[name=trip_date]').value = dateStr;
  if (mileageCalPerson !== 'Tous') {
    const sel = f.querySelector('[name=user_name]');
    if (sel) sel.value = mileageCalPerson;
  }
  // Vider l'id d'édition si existant
  if (f.dataset) f.dataset.editId = '';
  document.querySelector('#modal-newMileage .modal-header h3').textContent = 'Nouvelle saisie kilométrique';
  openModal('newMileage');
}

function openEditMileage(id) {
  const trip = _allMileageTrips.find(t => t.id == id);
  if (!trip) return;
  const f = document.getElementById('form-newMileage');
  if (!f) return;
  f.querySelector('[name=trip_date]').value = trip.trip_date || '';
  f.querySelector('[name=user_name]').value = trip.user_name || '';
  f.querySelector('[name=departure]').value = trip.departure || '';
  f.querySelector('[name=destination]').value = trip.destination || '';
  f.querySelector('[name=km]').value = trip.km || '';
  f.querySelector('[name=rate]').value = trip.rate || 0.374;
  f.querySelector('[name=motif]').value = trip.motif || '';
  f.dataset.editId = id;
  document.querySelector('#modal-newMileage .modal-header h3').textContent = 'Modifier le trajet';
  openModal('newMileage');
}

function openFilePreview(url) {
  const modal = document.getElementById('modal-filePreview');
  const img   = document.getElementById('filePreview-img');
  const link  = document.getElementById('filePreview-link');
  const isImage = /\.(png|jpe?g|gif|webp|bmp|svg)(\?|$)/i.test(url);
  if (isImage) {
    img.src = url;
    img.style.display = 'block';
    link.style.display = 'none';
  } else {
    img.style.display = 'none';
    link.href = url;
    link.textContent = url.split('/').pop().split('?')[0] || 'Ouvrir le fichier';
    link.style.display = 'inline-block';
  }
  modal.classList.add('active');
}

function closeFilePreview() {
  const modal = document.getElementById('modal-filePreview');
  modal.classList.remove('active');
  document.getElementById('filePreview-img').src = '';
}

function openEditSupplierById(id) {
  const s = allSuppliers.find(x => x.id == id);
  if (s) openEditSupplier(s);
}

function openEditSupplier(s) {
  document.getElementById('editSupplier-id').value = s.id || '';
  document.getElementById('editSupplier-name').value = s.name || '';
  document.getElementById('editSupplier-category').value = s.category || 'Traiteur';
  document.getElementById('editSupplier-rating').value = s.rating || 4;
  document.getElementById('editSupplier-phone').value = s.phone || '';
  document.getElementById('editSupplier-email').value = s.email || '';
  document.getElementById('editSupplier-notes').value = s.notes || '';
  openModal('editSupplier');
}

async function saveEditSupplier() {
  const id = document.getElementById('editSupplier-id').value;
  if (!id) return;
  const updates = {
    name:     document.getElementById('editSupplier-name').value.trim(),
    category: document.getElementById('editSupplier-category').value,
    rating:   parseInt(document.getElementById('editSupplier-rating').value),
    phone:    document.getElementById('editSupplier-phone').value.trim() || null,
    email:    document.getElementById('editSupplier-email').value.trim() || null,
    notes:    document.getElementById('editSupplier-notes').value.trim() || null,
  };
  const { error } = await sb.from('suppliers').update(updates).eq('id', id);
  if (error) { alert('Erreur : ' + error.message); return; }
  closeModal('editSupplier');
  const fresh = await fetchSuppliers();
  renderSuppliers(fresh);
  allSuppliers = fresh;
}

async function deleteSupplier() {
  const id = document.getElementById('editSupplier-id').value;
  if (!id) return;
  if (!confirm('Supprimer ce fournisseur définitivement ?')) return;
  const { error } = await sb.from('suppliers').delete().eq('id', id);
  if (error) { alert('Erreur : ' + error.message); return; }
  closeModal('editSupplier');
  const fresh = await fetchSuppliers();
  renderSuppliers(fresh);
  allSuppliers = fresh;
}
