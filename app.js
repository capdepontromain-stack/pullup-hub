// Navigation
function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const page = document.getElementById('page-' + id);
  if (page) page.classList.add('active');
  const navItem = document.querySelector(`[data-page="${id}"]`);
  if (navItem) navItem.classList.add('active');
  if (window.innerWidth <= 900) closeSidebar();
  if (id === 'events') {
    renderCalendar();
    if (typeof loadAndRenderEvents === 'function') loadAndRenderEvents();
  }
  if (id === 'finances') renderFinanceAnalyse();
}

document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', () => showPage(item.dataset.page));
});

// Sidebar mobile
const menuBtn = document.getElementById('menuBtn');
const sidebar = document.getElementById('sidebar');
menuBtn.addEventListener('click', () => sidebar.classList.toggle('open'));
function closeSidebar() { sidebar.classList.remove('open'); }

// Date
const d = new Date();
const dateEl = document.getElementById('currentDate');
if (dateEl) dateEl.textContent = d.toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long', year:'numeric' });

// Tabs
function switchTab(btn, contentId) {
  const parent = btn.closest('.page') || btn.closest('.card') || document.body;
  parent.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  parent.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));
  btn.classList.add('active');
  const tc = document.getElementById(contentId);
  if (tc) tc.classList.add('active');
}

// Modals
function openModal(id) {
  const el = document.getElementById('modal-' + id);
  if (el) el.classList.add('open');
}
function closeModal(id) {
  const el = document.getElementById('modal-' + id);
  if (el) el.classList.remove('open');
}
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.classList.remove('open'); });
});

// Event detail panel
function openEventDetail() {
  document.getElementById('eventDetailPanel').classList.add('open');
}
function closeEventDetail() {
  document.getElementById('eventDetailPanel').classList.remove('open');
}

// Toast
function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2800);
}

// Copy mail
function copyMail(btn) {
  const preview = btn.previousElementSibling.textContent;
  navigator.clipboard.writeText(preview).catch(() => {});
  btn.textContent = '✅ COPIÉ !';
  btn.classList.add('copied');
  setTimeout(() => { btn.textContent = '📋 COPIER LE TEXTE'; btn.classList.remove('copied'); }, 2000);
  showToast('Texte copié dans le presse-papier');
}

// Copy link
function copyLink(url) {
  navigator.clipboard.writeText(url).catch(() => {});
  showToast('Lien copié dans le presse-papier');
}

// Calendar
const calState = { year: new Date().getFullYear(), month: new Date().getMonth() };

function renderCalendar() {
  const wrap = document.getElementById('calendarWrap');
  if (!wrap) return;
  wrap.innerHTML = '';
  const { year, month } = calState;
  const now = new Date();
  const monthNames = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

  let html = `<div class="cal-header">
    <button class="btn-icon" onclick="calNav(-1)">‹</button>
    <h3>${monthNames[month]} ${year}</h3>
    <button class="btn-icon" onclick="calNav(1)">›</button>
  </div>`;
  html += '<div class="cal-grid">';
  ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'].forEach(d => html += `<div class="cal-day-name">${d}</div>`);

  const firstDay = new Date(year, month, 1).getDay();
  const offset = (firstDay === 0) ? 6 : firstDay - 1;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevDays = new Date(year, month, 0).getDate();

  for (let i = offset - 1; i >= 0; i--) {
    html += `<div class="cal-cell other-month"><div class="cal-num">${prevDays - i}</div></div>`;
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const isToday = d === now.getDate() && month === now.getMonth() && year === now.getFullYear();
    const cellDate = new Date(year, month, d);
    const evts = (window.calendarEvents || []).filter(e => {
      if (!e.event_date) return false;
      const [sy, sm, sd] = e.event_date.split('-').map(Number);
      const start = new Date(sy, sm - 1, sd);
      let end = start;
      if (e.end_date) {
        const [ey, em, ed] = e.end_date.split('-').map(Number);
        end = new Date(ey, em - 1, ed);
      }
      return cellDate >= start && cellDate <= end;
    });
    html += `<div class="cal-cell${isToday ? ' today' : ''}"><div class="cal-num">${d}</div>${evts.map(e => `<div class="cal-event">${e.name}</div>`).join('')}</div>`;
  }
  const remaining = 42 - offset - daysInMonth;
  for (let d = 1; d <= remaining; d++) {
    html += `<div class="cal-cell other-month"><div class="cal-num">${d}</div></div>`;
  }
  html += '</div>';
  wrap.innerHTML = html;
}

function calNav(dir) {
  calState.month += dir;
  if (calState.month > 11) { calState.month = 0; calState.year++; }
  if (calState.month < 0) { calState.month = 11; calState.year--; }
  renderCalendar();
}

// AI Assistant
const aiResponses = {
  mail: `Bonjour,

Nous avons eu le plaisir d'échanger avec vous lors du Salon du CSE à la Nordev et nous vous remercions pour ce moment.
Nous revenons vers vous concernant votre projet de [ex : Arbre de Noël / Team building / Soirée d'entreprise].

Nous serions ravis de vous accompagner sur cette prestation et de vous proposer une formule adaptée à vos attentes, à votre budget ainsi qu'à vos contraintes logistiques.

Afin d'avancer, nous pouvons :
– organiser un échange rapide par téléphone
– fixer un rendez-vous
– ou vous transmettre directement une proposition détaillée

Vous trouverez en fin de mail quelques vidéos de nos réalisations similaires :

Team building :
https://www.youtube.com/watch?v=UZ2BUXB7fwQ
https://youtu.be/ZLohkAyWL4I
https://youtu.be/Rmqa9AVUDK0

Bien cordialement,

Romain Capdepont — Président
Pull Up Événements — SAS
147 Bis. Rte Gabriel Macé, 97490 Sainte-Clotilde`,

  devis: `DEVIS — Animation galerie commerciale

Pull Up Événements
📧 contact@pullup-evenements.fr

CLIENT : [Nom société]
DATE : [Date]
DURÉE : 4 heures
PUBLIC : ~200 personnes

━━━━━━━━━━━━━━━━━━━━━━━━━━
PRESTATIONS                    MONTANT
━━━━━━━━━━━━━━━━━━━━━━━━━━
Animation micro + animateur      400 €
Sonorisation portable             150 €
Jeux interactifs public           200 €
Installation / démontage          100 €
Déplacement                        50 €
━━━━━━━━━━━━━━━━━━━━━━━━━━
TOTAL HT                         900 €
TVA 20%                          180 €
TOTAL TTC                      1 080 €
━━━━━━━━━━━━━━━━━━━━━━━━━━
Validité : 30 jours`,

  checklist: `✅ CHECKLIST ARCHERY TAG — EXTÉRIEUR

📋 J-7 :
□ Confirmation client et nombre participants
□ Vérification terrain / superficie disponible
□ Contrôle état des arcs (20 arcs)
□ Contrôle flèches mousses (150 pièces min.)
□ Réservation véhicule de transport
□ Envoi ordre de mission à l'équipe

📋 J-1 :
□ Chargement matériel dans le véhicule
□ Impression plan terrain et brief équipe
□ Confirmation horaires avec le client
□ Vérification météo

📋 JOUR J — Montage (J-2h) :
□ Délimitation terrain avec filets
□ Installation zones d'équipes
□ Briefing sécurité participants
□ Test équipements

📋 PENDANT :
□ Respect règles de sécurité
□ Animation tournoi en équipes
□ Photos/vidéos pour réseaux

📋 DÉMONTAGE :
□ Récupération tous les arcs
□ Comptage flèches
□ Chargement véhicule
□ Rapport fin d'animation`,

  facebook: `🎉 Pull Up Événements — Animation Archery Tag !

Vous cherchez une activité originale pour fédérer vos équipes ou dynamiser votre événement ? 🏹

Nous avons organisé une session Archery Tag pour [CLIENT] et le bilan est incroyable !

✅ 80 participants
✅ 4h d'animation non-stop
✅ 100% des participants satisfaits

L'Archery Tag, c'est le mélange parfait entre le tir à l'arc et le paintball — sans douleur, avec 100% d'adrénaline ! 💥

📩 Contactez-nous pour un devis gratuit !
🌐 www.pullup-evenements.fr

#PullUpÉvénements #ArcheryTag #TeamBuilding #Animation #Événementiel #Lyon`,

  instagram: `🏹 Une soirée qui marquera les esprits !

Archery Tag avec [CLIENT] × Pull Up Événements ✨

80 guerriers. 4h d'intensité. Des souvenirs inoubliables. 🔥

📩 DM pour un devis

#pullup #archery #teambuilding #evenement #lyon #animation #corporate #event #fun`,

  conducteur: `🎬 CONDUCTEUR ÉVÉNEMENTIEL
Soirée d'entreprise — 150 personnes

━━━━━━━━━━━━━━━━
TIMING DÉTAILLÉ
━━━━━━━━━━━━━━━━
14h00 — Arrivée équipe Pull Up
14h30 — Montage sonorisation & éclairages
16h00 — Test son et lumières
16h30 — Briefing équipe complète
17h30 — Accueil traiteur
18h00 — Ouverture portes, accueil guests
18h30 — Mot de bienvenue dirigeant
18h45 — Cocktail dinatoire
20h00 — Discours officiels
20h30 — Animation / spectacle
21h30 — Remise de récompenses
22h00 — Soirée dansante (DJ)
00h00 — Fin officielle
00h30 — Début démontage`,

  reunion: `📅 ORDRE DU JOUR — Réunion hebdo Pull Up

Date : [DATE] à [HEURE]
Lieu : Bureau Pull Up / Visio
Participants : Romain, Ketsia, Flora, Gloria

━━━━━━━━━━━━━━━━━━━━━━
1. POINT OPÉRATIONNEL (15 min)
   • Événements de la semaine
   • Avancement tâches en cours
   • Problèmes rencontrés

2. COMMERCIAL (10 min)
   • Devis envoyés et relances
   • Nouveaux prospects
   • Objectifs du mois

3. PLANNING (10 min)
   • Événements à venir
   • Répartition des équipes
   • Besoins matériels

4. DIVERS (5 min)
   • Points RH
   • Suggestions équipe
   • Next steps

━━━━━━━━━━━━━━━━━━━━━━
Prochain RDV : [DATE+7]`,

  default: `Je suis l'IA Pull Up. Je peux vous aider à rédiger des mails professionnels, générer des devis, créer des checklists, préparer des conducteurs événementiels et bien plus encore.

Essayez les boutons d'actions rapides à gauche ou posez-moi directement votre question ! 🚀`
};

function getAIResponse(msg) {
  const m = msg.toLowerCase();
  if (m.includes('mail') || m.includes('relance') || m.includes('email')) return aiResponses.mail;
  if (m.includes('devis') || m.includes('facture') || m.includes('tarif')) return aiResponses.devis;
  if (m.includes('checklist') || m.includes('archery') || m.includes('liste')) return aiResponses.checklist;
  if (m.includes('facebook') || m.includes('fb')) return aiResponses.facebook;
  if (m.includes('instagram') || m.includes('insta')) return aiResponses.instagram;
  if (m.includes('conducteur') || m.includes('timing') || m.includes('planning')) return aiResponses.conducteur;
  if (m.includes('réunion') || m.includes('meeting') || m.includes('ordre du jour')) return aiResponses.reunion;
  if (m.includes('compte rendu') || m.includes('rapport')) return `📋 COMPTE RENDU — [NOM ÉVÉNEMENT]\n\nDate : [DATE]\nLieu : [ADRESSE]\nOrganisateur : Pull Up Événements\nClient : [CLIENT]\n\n1. DÉROULEMENT\nL'événement s'est tenu de [HEURE_DEBUT] à [HEURE_FIN] dans les meilleures conditions. [NOMBRE] participants étaient présents.\n\n2. POINTS POSITIFS\n• Bonne ambiance générale\n• Prestataires ponctuels\n• Matériel fonctionnel\n\n3. POINTS D'AMÉLIORATION\n• [À COMPLÉTER]\n\n4. CONCLUSION\nL'événement a été une réussite. Nous remercions [CLIENT] pour sa confiance.`;
  return aiResponses.default;
}

function sendAIPrompt(prompt) {
  showPage('ai');
  setTimeout(() => {
    addAIMsg(prompt, 'user');
    setTimeout(() => addAIMsg(getAIResponse(prompt), 'assistant'), 600);
  }, 100);
}

function addAIMsg(text, role) {
  const container = document.getElementById('aiMessages');
  if (!container) return;
  const div = document.createElement('div');
  div.className = `ai-msg ${role}`;
  div.innerHTML = role === 'user'
    ? `<div class="ai-bubble">${text}</div><div class="ai-avatar">👤</div>`
    : `<div class="ai-avatar">🤖</div><div class="ai-bubble" style="white-space:pre-line">${text}</div>`;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function sendAIMessage() {
  const input = document.getElementById('aiInput');
  const msg = input.value.trim();
  if (!msg) return;
  addAIMsg(msg, 'user');
  input.value = '';
  setTimeout(() => addAIMsg(getAIResponse(msg), 'assistant'), 700);
}

document.getElementById('aiInput')?.addEventListener('keydown', e => {
  if (e.key === 'Enter') sendAIMessage();
});

// Kanban drag & drop
let dragging = null;
document.querySelectorAll('.kanban-card').forEach(card => {
  card.addEventListener('dragstart', () => { dragging = card; card.style.opacity = '.4'; });
  card.addEventListener('dragend', () => { dragging = null; card.style.opacity = '1'; });
});
document.querySelectorAll('.kanban-cards').forEach(col => {
  col.addEventListener('dragover', e => e.preventDefault());
  col.addEventListener('drop', () => {
    if (dragging) { col.appendChild(dragging); showToast('Tâche déplacée'); }
  });
});

// Global search
document.querySelector('.topbar-search input')?.addEventListener('input', function() {
  const val = this.value.toLowerCase().trim();
  if (!val) return;
  const pages = { 'événement': 'events', 'tâche': 'tasks', 'message': 'messages', 'finance': 'finances', 'facture': 'finances', 'devis': 'finances', 'client': 'crm', 'fournisseur': 'suppliers', 'matériel': 'inventory', 'personnel': 'personnel', 'km': 'mileage', 'ia': 'ai', 'rapport': 'reports' };
  for (const [keyword, page] of Object.entries(pages)) {
    if (val.includes(keyword)) { showPage(page); this.value = ''; return; }
  }
});

// ─── Finance Analyse ───────────────────────────────────────────────────────────
const FINANCE_2025 = {
  1:  { ca: 0,         benef: 0 },
  2:  { ca: 5758,      benef: 0 },
  3:  { ca: 3792,      benef: 0 },
  4:  { ca: 10162,     benef: 0 },
  5:  { ca: 22627,     benef: 0 },
  6:  { ca: 21357,     benef: 0 },
  7:  { ca: 1986,      benef: 0 },
  8:  { ca: 13289,     benef: 0 },
  9:  { ca: 22072,     benef: 0 },
  10: { ca: 51453,     benef: 0 },
  11: { ca: 7170,      benef: 0 },
  12: { ca: 127347,    benef: 0 },
};

const FINANCE_2026 = {
  1:  { ca: 14068,  benef: 7767,  done: true  },
  2:  { ca: 6675,   benef: 3787,  done: true  },
  3:  { ca: 13069,  benef: 7029,  done: true  },
  4:  { ca: 16911,  benef: 8651,  done: true  },
  5:  { ca: 33619,  benef: 19843, done: true  },
  6:  { ca: 14421,  benef: 8122,  done: true  },
  7:  { ca: 7552,   benef: 0,     done: false },
  8:  { ca: 0,      benef: 0,     done: false },
  9:  { ca: 0,      benef: 0,     done: false },
  10: { ca: 2737,   benef: 0,     done: false },
  11: { ca: 0,      benef: 0,     done: false },
  12: { ca: 0,      benef: 0,     done: false },
};

const MNAMES_FR = ['','Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
const CHARGES_FIXES_MOIS = 8000;
const OBJECTIF_CA_ANNUEL = 300000;

function fmt(n) {
  return n > 0 ? n.toLocaleString('fr-FR') + ' €' : '—';
}

function renderFinanceAnalyse() {
  const body26 = document.getElementById('fin-monthly-2026-body');
  const foot26 = document.getElementById('fin-monthly-2026-total');
  const body25 = document.getElementById('fin-monthly-2025-body');
  const foot25 = document.getElementById('fin-monthly-2025-total');
  if (!body26) return;

  const now = new Date();
  const curMonth = now.getMonth() + 1;

  let total26ca = 0, total26ben = 0;
  let total25ca = 0;
  let html26 = '', html25 = '';

  for (let m = 1; m <= 12; m++) {
    const d26 = FINANCE_2026[m];
    const d25 = FINANCE_2025[m];
    const isFuture = m > curMonth && !d26.ca;
    const rowClass = isFuture ? 'month-future' : 'month-done';

    total26ca += d26.ca;
    total26ben += d26.benef;
    total25ca += d25.ca;

    // % marge
    const marge = d26.ca > 0 ? Math.round((d26.benef / d26.ca) * 100) : 0;
    const margeClass = marge >= 50 ? 'fin-margin-ok' : marge >= 30 ? 'fin-margin-warn' : (d26.ca > 0 ? 'fin-margin-bad' : '');

    // vs charges (bénéfice - charges fixes)
    const vsCharges = d26.benef - CHARGES_FIXES_MOIS;
    const vsStr = d26.benef > 0
      ? `<span class="${vsCharges >= 0 ? 'fin-evol-up' : 'fin-evol-down'}">${vsCharges >= 0 ? '+' : ''}${Math.round(vsCharges).toLocaleString('fr-FR')} €</span>`
      : '<span class="fin-evol-neu">—</span>';

    // mini bar behind CA cell
    const barPct = Math.min(100, Math.round((d26.ca / 40000) * 100));
    const caCell = d26.ca > 0
      ? `<td style="position:relative"><div style="position:absolute;left:0;top:0;bottom:0;width:${barPct}%;background:var(--gold);opacity:.12;border-radius:3px"></div><span style="position:relative">${fmt(d26.ca)}</span></td>`
      : `<td class="${rowClass}">—</td>`;

    html26 += `<tr class="${rowClass}">
      <td><strong>${MNAMES_FR[m]}</strong></td>
      ${caCell}
      <td class="${margeClass}">${d26.benef > 0 ? fmt(d26.benef) : '—'}</td>
      <td class="${margeClass}">${marge > 0 ? marge + '%' : '—'}</td>
      <td>${vsStr}</td>
    </tr>`;

    // 2025 with evolution vs 2026
    let evol = '';
    if (d25.ca > 0 && d26.ca > 0) {
      const diff = Math.round(d26.ca - d25.ca);
      const pct = Math.round((diff / d25.ca) * 100);
      evol = `<span class="${diff >= 0 ? 'fin-evol-up' : 'fin-evol-down'}">${diff >= 0 ? '+' : ''}${pct}%</span>`;
    } else if (d26.ca > 0 && d25.ca === 0) {
      evol = `<span class="fin-evol-up">Nouveau</span>`;
    }
    html25 += `<tr><td><strong>${MNAMES_FR[m]}</strong></td><td>${fmt(d25.ca)}</td><td>${evol}</td></tr>`;
  }

  body26.innerHTML = html26;
  body25.innerHTML = html25;
  foot26.innerHTML = `<td>TOTAL</td><td><strong>${total26ca.toLocaleString('fr-FR')} €</strong></td><td><strong>${total26ben.toLocaleString('fr-FR')} €</strong></td><td><strong>${total26ca > 0 ? Math.round((total26ben/total26ca)*100) + '%' : '—'}</strong></td><td></td>`;
  foot25.innerHTML = `<td>TOTAL</td><td><strong>${total25ca.toLocaleString('fr-FR')} €</strong></td><td></td>`;

  // Animate gauges
  const chargesPct = Math.min(100, Math.round((total26ben / (CHARGES_FIXES_MOIS * 12)) * 100));
  const caPct = Math.min(100, Math.round((total26ca / OBJECTIF_CA_ANNUEL) * 100));

  setTimeout(() => {
    const gc = document.getElementById('gauge-charges');
    const gcp = document.getElementById('gauge-charges-pct');
    const gca = document.getElementById('gauge-ca');
    const gcap = document.getElementById('gauge-ca-pct');
    if (gc) { gc.style.width = chargesPct + '%'; gcp.textContent = chargesPct + '%'; }
    if (gca) { gca.style.width = caPct + '%'; gcap.textContent = caPct + '%'; }
    const caLabel = document.getElementById('gauge-ca-label');
    if (caLabel) caLabel.textContent = total26ca.toLocaleString('fr-FR') + ' €';
  }, 120);
}

// Init géré par supabase.js (boot → login ou app)
