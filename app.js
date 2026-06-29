// Navigation
function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const page = document.getElementById('page-' + id);
  if (page) page.classList.add('active');
  const navItem = document.querySelector(`[data-page="${id}"]`);
  if (navItem) navItem.classList.add('active');
  localStorage.setItem('pullup_last_page', id);
  if (id === 'events') {
    renderCalendar();
    if (typeof loadAndRenderTasks === 'function') loadAndRenderTasks().then(() => {
      if (typeof loadAndRenderEvents === 'function') loadAndRenderEvents();
    });
    else if (typeof loadAndRenderEvents === 'function') loadAndRenderEvents();
  }
  if (id === 'finances') renderFinanceAnalyse().catch(console.error);
  if (id === 'dashboard') renderDashboardCA().catch(console.error);
  if (id === 'leaves') loadAndRenderLeaves();
  if (id === 'flora') loadAndRenderFlora();
  if (id === 'charges' && typeof loadCharges === 'function') loadCharges();
  if (id === 'mileage' && typeof loadMileageCalendar === 'function') loadMileageCalendar();
  if (id === 'devis-requests' && typeof loadDevisRequests === 'function') loadDevisRequests();
  if (id === 'personnel' && typeof loadPersonnelLeaveStats === 'function') loadPersonnelLeaveStats();
  if (id === 'editorial' && typeof loadAndRenderEditorial === 'function') loadAndRenderEditorial();
  if (id === 'improvements' && typeof loadImprovements === 'function') loadImprovements();
  if (typeof initChatDrop === 'function') initChatDrop();
}

document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', () => {
    showPage(item.dataset.page);
    if (window.innerWidth <= 900) closeSidebar();
  });
});

// ===== RÉORGANISATION DES ONGLETS PAR DRAG & DROP =====
(function initNavDrag() {
  const nav = document.querySelector('.sidebar-nav');
  if (!nav) return;

  // Restaurer l'ordre sauvegardé
  const allPages = [...nav.querySelectorAll('.nav-item')].map(el => el.dataset.page);
  const saved = localStorage.getItem('pullup_nav_order');
  if (saved) {
    try {
      const order = JSON.parse(saved);
      // Si des onglets manquent dans l'ordre sauvegardé, on efface et on repart de zéro
      const hasAll = allPages.every(p => order.includes(p));
      if (!hasAll) {
        localStorage.removeItem('pullup_nav_order');
      } else {
        order.forEach(page => {
          const el = nav.querySelector(`[data-page="${page}"]`);
          if (el) nav.appendChild(el);
        });
      }
    } catch(e) {
      localStorage.removeItem('pullup_nav_order');
    }
  }

  let dragEl = null;
  let touchDragEl = null;
  let touchClone = null;
  let holdTimer = null;
  let dragReady = false; // vrai seulement après 2 secondes d'appui

  function saveNavOrder() {
    const order = [...nav.querySelectorAll('.nav-item')].map(el => el.dataset.page);
    localStorage.setItem('pullup_nav_order', JSON.stringify(order));
  }

  function getNavItemAt(y) {
    return [...nav.querySelectorAll('.nav-item')].find(el => {
      if (el === touchDragEl) return false;
      const r = el.getBoundingClientRect();
      return y >= r.top && y <= r.bottom;
    });
  }

  nav.querySelectorAll('.nav-item').forEach(item => {
    // === Desktop : délai 2s avant d'activer le drag ===
    item.setAttribute('draggable', 'false'); // désactivé par défaut

    item.addEventListener('mousedown', () => {
      holdTimer = setTimeout(() => {
        item.setAttribute('draggable', 'true');
        item.style.cursor = 'grab';
      }, 2000);
    });
    item.addEventListener('mouseup', () => {
      clearTimeout(holdTimer);
      // Remettre non-draggable après un court délai
      setTimeout(() => { item.setAttribute('draggable', 'false'); item.style.cursor = ''; }, 300);
    });
    item.addEventListener('mouseleave', () => {
      clearTimeout(holdTimer);
    });

    item.addEventListener('dragstart', e => {
      if (item.getAttribute('draggable') !== 'true') { e.preventDefault(); return; }
      dragEl = item;
      item.style.opacity = '.4';
      e.dataTransfer.effectAllowed = 'move';
    });
    item.addEventListener('dragend', () => {
      dragEl = null;
      item.style.opacity = '';
      item.setAttribute('draggable', 'false');
      item.style.cursor = '';
      nav.querySelectorAll('.nav-item').forEach(i => { i.style.borderTop = ''; i.style.borderBottom = ''; });
      saveNavOrder();
    });
    item.addEventListener('dragover', e => {
      e.preventDefault();
      if (!dragEl || dragEl === item) return;
      const r = item.getBoundingClientRect();
      const after = e.clientY > r.top + r.height / 2;
      nav.querySelectorAll('.nav-item').forEach(i => { i.style.borderTop = ''; i.style.borderBottom = ''; });
      if (after) { item.style.borderBottom = '2px solid var(--gold)'; }
      else { item.style.borderTop = '2px solid var(--gold)'; }
      if (after) item.after(dragEl); else item.before(dragEl);
    });
    item.addEventListener('dragleave', () => {
      item.style.borderTop = '';
      item.style.borderBottom = '';
    });

    // === Touch : délai 2s avant d'activer le drag ===
    item.addEventListener('touchstart', e => {
      dragReady = false;
      const touch = e.touches[0];
      holdTimer = setTimeout(() => {
        dragReady = true;
        touchDragEl = item;
        // Vibration feedback si dispo
        if (navigator.vibrate) navigator.vibrate(80);
        // Clone visuel
        touchClone = item.cloneNode(true);
        touchClone.style.cssText = `position:fixed;left:0;width:${item.offsetWidth}px;opacity:.9;z-index:9999;background:var(--bg4);border:1px solid var(--gold);border-radius:8px;pointer-events:none;padding:9px 16px;color:var(--gold);font-size:13px;box-shadow:0 4px 20px rgba(0,0,0,.5)`;
        touchClone.style.top = item.getBoundingClientRect().top + 'px';
        document.body.appendChild(touchClone);
        item.style.opacity = '.3';
      }, 2000);
    }, { passive: true });

    item.addEventListener('touchmove', e => {
      if (!dragReady || !touchDragEl) {
        // Pas encore prêt : annuler le timer si l'utilisateur bouge
        clearTimeout(holdTimer);
        return;
      }
      e.preventDefault();
      const y = e.touches[0].clientY;
      if (touchClone) touchClone.style.top = (y - 20) + 'px';
      const target = getNavItemAt(y);
      nav.querySelectorAll('.nav-item').forEach(i => { i.style.borderTop = ''; i.style.borderBottom = ''; });
      if (target) {
        const r = target.getBoundingClientRect();
        if (y > r.top + r.height / 2) { target.style.borderBottom = '2px solid var(--gold)'; target.after(touchDragEl); }
        else { target.style.borderTop = '2px solid var(--gold)'; target.before(touchDragEl); }
      }
    }, { passive: false });

    item.addEventListener('touchend', () => {
      clearTimeout(holdTimer);
      if (!touchDragEl) return;
      touchDragEl.style.opacity = '';
      if (touchClone) { touchClone.remove(); touchClone = null; }
      nav.querySelectorAll('.nav-item').forEach(i => { i.style.borderTop = ''; i.style.borderBottom = ''; });
      if (dragReady) saveNavOrder();
      touchDragEl = null;
      dragReady = false;
    });
  });
})();

// Sidebar mobile
const menuBtn = document.getElementById('menuBtn');
const sidebar = document.getElementById('sidebar');
menuBtn.addEventListener('click', () => sidebar.classList.toggle('open'));
function closeSidebar() { sidebar.classList.remove('open'); }
// Ouvre le menu au démarrage sur mobile
if (window.innerWidth <= 900) sidebar.classList.add('open');

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
    <div class="cal-month-nav">
      <button class="btn-icon" onclick="calNav(-1)">‹</button>
      <h3>${monthNames[month]} ${year}</h3>
      <button class="btn-icon" onclick="calNav(1)">›</button>
    </div>
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
    html += `<div class="cal-cell${isToday ? ' today' : ''}"><div class="cal-num">${d}</div>${evts.map(e => {
      const c = typeof eventColor === 'function' ? eventColor(e) : (typeof clientColor === 'function' ? clientColor(e.client || e.name) : { bg:'var(--gold)', border:'var(--gold)', text:'#000' });
      return `<div class="cal-event" style="background:${c.bg};border-left:3px solid ${c.border};color:${c.text}" title="${e.client||e.name||''}">${e.name}</div>`;
    }).join('')}</div>`;
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
let CHARGES_FIXES_MOIS = 8717.96;   // mis à jour dynamiquement depuis Supabase
let CHARGES_VARS_MOIS  = 2000;
let OBJECTIF_CA_ANNUEL = CHARGES_FIXES_MOIS * 12;

function fmt(n) {
  return n > 0 ? n.toLocaleString('fr-FR') + ' €' : '—';
}

async function renderDashboardCA() {
  const container = document.getElementById('dashboard-ca-bars');
  if (!container) return;
  const MONTHS = ['','Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
  const TARGET = (window.CHARGES_FIXES_MOIS || 8717.96) + (window.CHARGES_VARS_MOIS || 2000);

  // Mettre à jour le titre
  document.querySelectorAll('[data-charges-label]').forEach(el => {
    el.textContent = TARGET.toLocaleString('fr-FR') + ' €/mois';
  });

  // Charger depuis Supabase
  const rows = await fetchFinanceMonthly();
  const byMonth = {};
  rows.forEach(r => { byMonth[r.month] = r; });

  // Calculer total CA pour le stat dashboard
  const totalCA = rows.filter(r => r.year === 2026).reduce((s,r) => s + (parseFloat(r.ca)||0), 0);
  const totalBenef = rows.filter(r => r.year === 2026).reduce((s,r) => s + (parseFloat(r.benef)||0), 0);
  const doneMonths = rows.filter(r => r.year === 2026 && (parseFloat(r.ca)||0) > 0).length;
  const totalChargesYTD = ((window.CHARGES_FIXES_MOIS || 8717.96) + (window.CHARGES_VARS_MOIS || 2000)) * doneMonths;
  const benefReel = totalBenef - totalChargesYTD;
  const caStatEl = document.getElementById('stat-ca-count');
  if (caStatEl) caStatEl.textContent = totalCA.toLocaleString('fr-FR') + ' €';
  const benefLabelEl = document.getElementById('stat-benef-label');
  if (benefLabelEl) {
    const signB = totalBenef >= 0 ? '+' : '';
    const signC = benefReel >= 0 ? '+' : '';
    benefLabelEl.innerHTML = `
      <span style="color:#aaa">Bénéfice : <strong style="color:#4A9EFF">${signB}${Math.round(totalBenef).toLocaleString('fr-FR')} €</strong></span><br>
      <span style="color:#aaa">Charges : <strong style="color:#f44336">-${Math.round(totalChargesYTD).toLocaleString('fr-FR')} €</strong></span><br>
      <span style="color:#aaa">Bénéfice réel : <strong style="color:${benefReel >= 0 ? '#4CAF50' : '#f44336'}">${signC}${Math.round(benefReel).toLocaleString('fr-FR')} €</strong></span>`;
    benefLabelEl.style.color = '';
  }

  const data2026 = rows.filter(r => r.year === 2026);
  const maxBenef = Math.max(TARGET, ...data2026.map(d => parseFloat(d.benef) || 0));
  const targetPct = Math.round((TARGET / maxBenef) * 100);

  let html = '';
  for (let m = 1; m <= 12; m++) {
    const d = byMonth[m];
    const benef = parseFloat(d?.benef) || 0;
    if (!benef) continue;
    const atteint = benef >= TARGET;
    const diff = benef - TARGET;
    const surplus = Math.max(0, diff);
    const deficit = Math.min(0, diff);
    const yellowPct = Math.round((Math.min(benef, TARGET) / maxBenef) * 100);
    const greenPct  = Math.round((surplus / maxBenef) * 100);
    const diffLabel = diff >= 0
      ? `<span style="color:#4CAF50;font-size:.75rem">(+${Math.round(diff).toLocaleString('fr-FR')} €)</span>`
      : `<span style="color:#f44336;font-size:.75rem">(${Math.round(diff).toLocaleString('fr-FR')} €)</span>`;

    html += `<div class="objective-item">
      <div class="obj-label" style="color:${atteint ? '#4CAF50' : 'var(--text)'}">${MONTHS[m]} 2026${atteint ? ' 🏆' : ''}</div>
      <div class="obj-progress-wrap" style="position:relative;overflow:hidden">
        <div style="position:absolute;left:0;top:0;bottom:0;width:${yellowPct}%;background:#F5C518;border-radius:4px 0 0 4px"></div>
        ${greenPct > 0 ? `<div style="position:absolute;left:${yellowPct}%;top:0;bottom:0;width:${greenPct}%;background:#4CAF50;border-radius:0 4px 4px 0"></div>` : ''}
        <div style="position:absolute;left:${targetPct}%;top:0;bottom:0;width:2px;background:#fff;opacity:.6"></div>
      </div>
      <div class="obj-values">
        <span style="color:${atteint ? '#4CAF50' : '#F5C518'};font-weight:700">${benef.toLocaleString('fr-FR')} €</span>
        ${diffLabel}
        <span class="obj-target">/ ${TARGET.toLocaleString('fr-FR')} €</span>
      </div>
    </div>`;
  }
  container.innerHTML = html || '<p style="color:var(--text2);padding:1rem">Aucune donnée 2026</p>';

  // Jauges du dashboard (mêmes données que Finances)
  const [rfRes, rvRes] = await Promise.all([
    sb.from('charges_fixes').select('montant'),
    sb.from('charges_variables_items').select('montant'),
  ]);
  const totalCF = (rfRes.data || []).reduce((s, c) => s + (parseFloat(c.montant) || 0), 0);
  const totalCV = (rvRes.data  || []).reduce((s, c) => s + (parseFloat(c.montant) || 0), 0);
  const totalChargesAnnuel = (totalCF + totalCV) * 12;
  const chargesPct = totalChargesAnnuel > 0 ? Math.min(100, Math.round((totalBenef / totalChargesAnnuel) * 100)) : 0;
  const caPct = Math.min(100, Math.round((totalCA / 300000) * 100));

  const dSub1 = document.getElementById('dash-gauge-charges-sub');
  if (dSub1) dSub1.innerHTML = `Bénéfice réalisé : <strong>${totalBenef.toLocaleString('fr-FR')} €</strong> / ${totalChargesAnnuel.toLocaleString('fr-FR')} € de charges annuelles`;
  const dSub2 = document.getElementById('dash-gauge-ca-sub');
  if (dSub2) dSub2.innerHTML = `CA réalisé : <strong>${totalCA.toLocaleString('fr-FR')} €</strong> / objectif 300 000 €`;
  const dH = document.getElementById('dash-gauge-charges-half');
  if (dH) dH.textContent = Math.round(totalChargesAnnuel / 2).toLocaleString('fr-FR') + ' €';
  const dF = document.getElementById('dash-gauge-charges-full');
  if (dF) dF.textContent = totalChargesAnnuel.toLocaleString('fr-FR') + ' €';

  setTimeout(() => {
    const dg1 = document.getElementById('dash-gauge-charges'); const dp1 = document.getElementById('dash-gauge-charges-pct');
    const dg2 = document.getElementById('dash-gauge-ca');      const dp2 = document.getElementById('dash-gauge-ca-pct');
    if (dg1) { dg1.style.width = chargesPct + '%'; if (dp1) dp1.textContent = chargesPct + '%'; }
    if (dg2) { dg2.style.width = caPct + '%';      if (dp2) dp2.textContent = caPct + '%'; }
  }, 120);
}

let _finMonthlyData = {}; // cache: { '2026-1': {ca,benef}, ... }

async function renderFinanceAnalyse() {
  const body26 = document.getElementById('fin-monthly-2026-body');
  const foot26 = document.getElementById('fin-monthly-2026-total');
  const body25 = document.getElementById('fin-monthly-2025-body');
  const foot25 = document.getElementById('fin-monthly-2025-total');
  if (!body26) return;

  // Load from Supabase
  const rows = await fetchFinanceMonthly();
  _finMonthlyData = {};
  rows.forEach(r => { _finMonthlyData[`${r.year}-${r.month}`] = r; });

  // Fallback to static if table empty
  const get = (year, month) => _finMonthlyData[`${year}-${month}`] || FINANCE_2026[month] || { ca:0, benef:0 };

  const now = new Date();
  const curMonth = now.getMonth() + 1;
  let total26ca = 0, total26ben = 0, total25ca = 0;
  let html26 = '', html25 = '';

  for (let m = 1; m <= 12; m++) {
    const d26 = get(2026, m);
    const d25 = get(2025, m);
    const ca26  = parseFloat(d26.ca)   || 0;
    const ben26 = parseFloat(d26.benef)|| 0;
    const ca25  = parseFloat(d25.ca)   || 0;

    const isFuture = m > curMonth && !ca26;
    const rowClass = isFuture ? 'month-future' : 'month-done';
    total26ca += ca26; total26ben += ben26; total25ca += ca25;

    const marge = ca26 > 0 ? Math.round((ben26 / ca26) * 100) : 0;
    const margeClass = marge >= 50 ? 'fin-margin-ok' : marge >= 30 ? 'fin-margin-warn' : (ca26 > 0 ? 'fin-margin-bad' : '');
    const vsCharges = ben26 - CHARGES_FIXES_MOIS;
    const vsStr = ben26 > 0
      ? `<span class="${vsCharges >= 0 ? 'fin-evol-up' : 'fin-evol-down'}">${vsCharges >= 0 ? '+' : ''}${Math.round(vsCharges).toLocaleString('fr-FR')} €</span>`
      : '<span class="fin-evol-neu">—</span>';

    const barPct = Math.min(100, Math.round((ca26 / (window.CHARGES_FIXES_MOIS || 8717.96)) * 100));

    html26 += `<tr class="${rowClass}">
      <td><strong>${MNAMES_FR[m]}</strong></td>
      <td class="fin-editable" onclick="editFinanceCell(2026,${m},'ca',${ca26})" style="position:relative;cursor:pointer" title="Cliquer pour modifier">
        <div style="position:absolute;left:0;top:0;bottom:0;width:${barPct}%;background:var(--gold);opacity:.12;border-radius:3px"></div>
        <span style="position:relative">${ca26 > 0 ? fmt(ca26) : '<span style="color:var(--text2)">—</span>'}</span>
      </td>
      <td class="fin-editable ${margeClass}" onclick="editFinanceCell(2026,${m},'benef',${ben26})" style="cursor:pointer" title="Cliquer pour modifier">
        ${ben26 > 0 ? fmt(ben26) : '<span style="color:var(--text2)">—</span>'}
      </td>
      <td class="${margeClass}">${marge > 0 ? marge + '%' : '—'}</td>
      <td>${vsStr}</td>
    </tr>`;

    let evol = '';
    if (ca25 > 0 && ca26 > 0) {
      const diff = Math.round(ca26 - ca25);
      const pct = Math.round((diff / ca25) * 100);
      evol = `<span class="${diff >= 0 ? 'fin-evol-up' : 'fin-evol-down'}">${diff >= 0 ? '+' : ''}${pct}%</span>`;
    } else if (ca26 > 0 && ca25 === 0) {
      evol = `<span class="fin-evol-up">Nouveau</span>`;
    }
    html25 += `<tr><td><strong>${MNAMES_FR[m]}</strong></td>
      <td class="fin-editable" onclick="editFinanceCell(2025,${m},'ca',${ca25})" style="cursor:pointer" title="Cliquer pour modifier">
        ${ca25 > 0 ? fmt(ca25) : '<span style="color:var(--text2)">—</span>'}
      </td>
      <td>${evol}</td></tr>`;
  }

  body26.innerHTML = html26;
  body25.innerHTML = html25;
  foot26.innerHTML = `<td>TOTAL</td><td><strong>${total26ca.toLocaleString('fr-FR')} €</strong></td><td><strong>${total26ben.toLocaleString('fr-FR')} €</strong></td><td><strong>${total26ca > 0 ? Math.round((total26ben/total26ca)*100) + '%' : '—'}</strong></td><td></td>`;
  foot25.innerHTML = `<td>TOTAL</td><td><strong>${total25ca.toLocaleString('fr-FR')} €</strong></td><td></td>`;

  // Récupérer le total annuel des charges depuis Supabase
  const [rfRes, rvRes] = await Promise.all([
    sb.from('charges_fixes').select('montant'),
    sb.from('charges_variables_items').select('montant'),
  ]);
  const totalChargesFixes = (rfRes.data || []).reduce((s, c) => s + (parseFloat(c.montant) || 0), 0);
  const totalChargesVars  = (rvRes.data  || []).reduce((s, c) => s + (parseFloat(c.montant) || 0), 0);
  const totalChargesMoisReel = totalChargesFixes + totalChargesVars;
  const totalChargesAnnuel = totalChargesMoisReel * 12;

  const OBJECTIF_CA = 300000;

  const chargesPct = totalChargesAnnuel > 0 ? Math.min(100, Math.round((total26ben / totalChargesAnnuel) * 100)) : 0;
  const caPct      = Math.min(100, Math.round((total26ca / OBJECTIF_CA) * 100));

  // Jauge 1 : bénéfice vs charges
  const gSub1 = document.getElementById('gauge-charges-subtitle');
  if (gSub1) gSub1.innerHTML = `Total charges : <strong>${totalChargesMoisReel.toLocaleString('fr-FR')} €/mois × 12 = ${totalChargesAnnuel.toLocaleString('fr-FR')} €</strong> | Bénéfice réalisé : <strong>${total26ben.toLocaleString('fr-FR')} €</strong>`;
  document.querySelectorAll('.gauge-label-half-charges').forEach(el => el.textContent = Math.round(totalChargesAnnuel / 2).toLocaleString('fr-FR') + ' €');
  document.querySelectorAll('.gauge-label-full-charges').forEach(el => el.textContent = totalChargesAnnuel.toLocaleString('fr-FR') + ' €');

  // Jauge 2 : CA réalisé vs objectif 300 000 €
  const gSub2 = document.getElementById('gauge-ca-subtitle');
  if (gSub2) gSub2.innerHTML = `Objectif annuel : <strong>300 000 €</strong> | CA réalisé à ce jour : <strong>${total26ca.toLocaleString('fr-FR')} €</strong>`;
  document.querySelectorAll('.gauge-label-half-ca').forEach(el => el.textContent = '150 000 €');
  document.querySelectorAll('.gauge-label-full-ca').forEach(el => el.textContent = '300 000 €');

  setTimeout(() => {
    const gc  = document.getElementById('gauge-charges'); const gcp  = document.getElementById('gauge-charges-pct');
    const gca = document.getElementById('gauge-ca');      const gcap = document.getElementById('gauge-ca-pct');
    if (gc)  { gc.style.width  = chargesPct + '%'; if (gcp)  gcp.textContent  = chargesPct + '%'; }
    if (gca) { gca.style.width = caPct + '%';      if (gcap) gcap.textContent = caPct + '%'; }
  }, 120);
}

function editFinanceCell(year, month, field, currentVal) {
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:300;display:flex;align-items:center;justify-content:center';
  const label = field === 'ca' ? 'CA' : 'Bénéfice';
  const MONTHS_FR = ['','Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
  overlay.innerHTML = `
    <div style="background:var(--bg2);border:1px solid var(--border);border-radius:14px;padding:24px 28px;min-width:300px;box-shadow:0 20px 60px rgba(0,0,0,.5)">
      <div style="font-weight:700;font-size:1rem;margin-bottom:16px">Modifier — ${MONTHS_FR[month]} ${year}</div>
      <label style="font-size:.85rem;color:var(--text2);display:block;margin-bottom:6px">${label} (€)</label>
      <input id="fin-edit-input" type="number" step="1" value="${currentVal || ''}" placeholder="0"
        style="width:100%;background:var(--bg3);border:1px solid var(--border);color:var(--text);border-radius:8px;padding:10px 14px;font-size:1rem;margin-bottom:16px;box-sizing:border-box">
      <div style="display:flex;gap:10px;justify-content:flex-end">
        <button onclick="this.closest('[style*=fixed]').remove()" style="background:var(--bg3);border:1px solid var(--border);color:var(--text);border-radius:8px;padding:8px 16px;cursor:pointer">Annuler</button>
        <button id="fin-edit-save" style="background:var(--gold);color:#000;border:none;border-radius:8px;padding:8px 18px;font-weight:700;cursor:pointer">Enregistrer</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  const input = overlay.querySelector('#fin-edit-input');
  input.focus(); input.select();
  const save = async () => {
    const val = input.value.trim() === '' ? null : (parseFloat(input.value) ?? 0);
    try {
      await upsertFinanceMonthly(year, month, field, val);
      overlay.remove();
      showToast('Sauvegardé ✓');
      renderFinanceAnalyse();
      if (year === 2026) renderDashboardCA();
    } catch(err) { showToast('Erreur : ' + err.message); }
  };
  overlay.querySelector('#fin-edit-save').addEventListener('click', save);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') overlay.remove(); });
}

// PWA Service Worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js');
}

// Init géré par supabase.js (boot → login ou app)

// Focus plein écran d'une colonne de tâches
let _focusedCol = null;
function focusPersonCol(name) {
  const board = document.getElementById('person-board');
  const col = document.getElementById('col-' + name);
  if (!board || !col) return;

  if (_focusedCol === name) {
    // Retour à la vue normale
    _focusedCol = null;
    board.classList.remove('focus-mode');
    board.querySelectorAll('.person-col').forEach(c => { c.style.display = ''; });
    const btn = document.getElementById('tasks-focus-back');
    if (btn) btn.remove();
  } else {
    // Mode focus grille
    _focusedCol = name;
    board.classList.add('focus-mode');
    board.querySelectorAll('.person-col').forEach(c => {
      c.style.display = (c.id === 'col-' + name) ? '' : 'none';
    });
    // Bouton retour
    if (!document.getElementById('tasks-focus-back')) {
      const btn = document.createElement('button');
      btn.id = 'tasks-focus-back';
      btn.textContent = '← Voir tous';
      btn.className = 'btn-outline';
      btn.style.cssText = 'margin-bottom:12px;display:block';
      btn.onclick = () => focusPersonCol(name);
      board.parentNode.insertBefore(btn, board);
    }
  }
}

// Drag & drop tableau de bord désactivé
/* (function initDashboardDrag() {
  const grid = document.getElementById('dashboard-grid');
  if (!grid) return;

  // Restaurer l'ordre sauvegardé
  const saved = localStorage.getItem('pullup_dashboard_order');
  if (saved) {
    try {
      JSON.parse(saved).forEach(id => {
        const el = grid.querySelector(`[data-dash-id="${id}"]`);
        if (el) grid.appendChild(el);
      });
    } catch(e) {}
  }

  function saveDashOrder() {
    const order = [...grid.querySelectorAll('[data-dash-id]')].map(el => el.dataset.dashId);
    localStorage.setItem('pullup_dashboard_order', JSON.stringify(order));
  }

  let dragEl = null, touchEl = null, touchClone = null;

  grid.querySelectorAll('[data-dash-id]').forEach(card => {
    // Desktop
    card.setAttribute('draggable', 'true');
    card.addEventListener('dragstart', e => {
      dragEl = card;
      card.style.opacity = '.4';
      e.dataTransfer.effectAllowed = 'move';
    });
    card.addEventListener('dragend', () => {
      dragEl = null;
      card.style.opacity = '';
      grid.querySelectorAll('[data-dash-id]').forEach(c => c.style.outline = '');
      saveDashOrder();
    });
    card.addEventListener('dragover', e => {
      e.preventDefault();
      if (!dragEl || dragEl === card) return;
      const r = card.getBoundingClientRect();
      const after = e.clientY > r.top + r.height / 2;
      grid.querySelectorAll('[data-dash-id]').forEach(c => c.style.outline = '');
      card.style.outline = '2px solid var(--gold)';
      if (after) card.after(dragEl); else card.before(dragEl);
    });
    card.addEventListener('dragleave', () => card.style.outline = '');

    // Touch
    card.addEventListener('touchstart', e => {
      touchEl = card;
      touchClone = card.cloneNode(true);
      const r = card.getBoundingClientRect();
      touchClone.style.cssText = `position:fixed;top:${r.top}px;left:${r.left}px;width:${r.width}px;opacity:.85;z-index:9999;pointer-events:none;border-radius:12px;background:var(--bg3);box-shadow:0 8px 32px rgba(0,0,0,.5)`;
      document.body.appendChild(touchClone);
      card.style.opacity = '.3';
    }, { passive: true });

    card.addEventListener('touchmove', e => {
      if (!touchEl) return;
      e.preventDefault();
      const t = e.touches[0];
      if (touchClone) { touchClone.style.top = (t.clientY - 40) + 'px'; touchClone.style.left = touchClone.style.left; }
      const target = [...grid.querySelectorAll('[data-dash-id]')].find(c => {
        if (c === touchEl) return false;
        const r = c.getBoundingClientRect();
        return t.clientY >= r.top && t.clientY <= r.bottom && t.clientX >= r.left && t.clientX <= r.right;
      });
      grid.querySelectorAll('[data-dash-id]').forEach(c => c.style.outline = '');
      if (target) {
        const r = target.getBoundingClientRect();
        target.style.outline = '2px solid var(--gold)';
        if (t.clientY > r.top + r.height / 2) target.after(touchEl); else target.before(touchEl);
      }
    }, { passive: false });

    card.addEventListener('touchend', () => {
      if (!touchEl) return;
      touchEl.style.opacity = '';
      if (touchClone) { touchClone.remove(); touchClone = null; }
      grid.querySelectorAll('[data-dash-id]').forEach(c => c.style.outline = '');
      saveDashOrder();
      touchEl = null;
    });
  });
})(); */

// ===== DRAG & DROP STATS GRID (cartes du haut) désactivé =====
/* (function initStatsDrag() {
  const grid = document.getElementById('stats-grid');
  if (!grid) return;

  const saved = localStorage.getItem('pullup_stats_order');
  if (saved) {
    try {
      JSON.parse(saved).forEach(id => {
        const el = grid.querySelector(`[data-stat-id="${id}"]`);
        if (el) grid.appendChild(el);
      });
    } catch(e) {}
  }

  function saveOrder() {
    const order = [...grid.querySelectorAll('[data-stat-id]')].map(el => el.dataset.statId);
    localStorage.setItem('pullup_stats_order', JSON.stringify(order));
  }

  let dragEl = null, touchEl = null, touchClone = null;

  grid.querySelectorAll('[data-stat-id]').forEach(card => {
    card.setAttribute('draggable', 'true');

    card.addEventListener('dragstart', e => {
      dragEl = card; card.style.opacity = '.4';
      e.dataTransfer.effectAllowed = 'move';
    });
    card.addEventListener('dragend', () => {
      dragEl = null; card.style.opacity = '';
      grid.querySelectorAll('[data-stat-id]').forEach(c => c.style.outline = '');
      saveOrder();
    });
    card.addEventListener('dragover', e => {
      e.preventDefault();
      if (!dragEl || dragEl === card) return;
      grid.querySelectorAll('[data-stat-id]').forEach(c => c.style.outline = '');
      card.style.outline = '2px solid var(--gold)';
      const r = card.getBoundingClientRect();
      if (e.clientX > r.left + r.width / 2) card.after(dragEl); else card.before(dragEl);
    });
    card.addEventListener('dragleave', () => card.style.outline = '');

    card.addEventListener('touchstart', e => {
      touchEl = card;
      const r = card.getBoundingClientRect();
      touchClone = card.cloneNode(true);
      touchClone.style.cssText = `position:fixed;top:${r.top}px;left:${r.left}px;width:${r.width}px;height:${r.height}px;opacity:.85;z-index:9999;pointer-events:none;border-radius:12px;background:var(--bg3);box-shadow:0 8px 32px rgba(0,0,0,.5)`;
      document.body.appendChild(touchClone);
      card.style.opacity = '.3';
    }, { passive: true });

    card.addEventListener('touchmove', e => {
      if (!touchEl) return;
      e.preventDefault();
      const t = e.touches[0];
      if (touchClone) { touchClone.style.top = (t.clientY - 40) + 'px'; touchClone.style.left = (t.clientX - 80) + 'px'; }
      const target = [...grid.querySelectorAll('[data-stat-id]')].find(c => {
        if (c === touchEl) return false;
        const r = c.getBoundingClientRect();
        return t.clientX >= r.left && t.clientX <= r.right && t.clientY >= r.top && t.clientY <= r.bottom;
      });
      grid.querySelectorAll('[data-stat-id]').forEach(c => c.style.outline = '');
      if (target) {
        target.style.outline = '2px solid var(--gold)';
        const r = target.getBoundingClientRect();
        if (t.clientX > r.left + r.width / 2) target.after(touchEl); else target.before(touchEl);
      }
    }, { passive: false });

    card.addEventListener('touchend', () => {
      if (!touchEl) return;
      touchEl.style.opacity = '';
      if (touchClone) { touchClone.remove(); touchClone = null; }
      grid.querySelectorAll('[data-stat-id]').forEach(c => c.style.outline = '');
      saveOrder();
      touchEl = null;
    });
  });
})(); */
