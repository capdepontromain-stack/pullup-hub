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
  if (id === 'finances') {
    // Onglet unique « Finances & Charges » (fusion demandée par Romain le 16/08) :
    // les sections Rapports et Charges s'affichent à la suite, tout au réel Qonto
    renderFinanceAnalyse().catch(console.error);
    if (typeof renderReports === 'function') renderReports().catch(console.error);
    if (typeof loadCharges === 'function') loadCharges();
    ['page-reports', 'page-charges'].forEach(pid => {
      const s = document.getElementById(pid);
      if (s) s.classList.add('active');
    });
  }
  if (id === 'dashboard') { renderDashboardCA().catch(console.error); renderMiniCalendar(); }
  if (id === 'reports') renderReports().catch(console.error);
  if (id === 'leaves') loadAndRenderLeaves();
  if (id === 'flora') loadAndRenderFlora();
  if (id === 'charges' && typeof loadCharges === 'function') loadCharges();
  if (id === 'mileage' && typeof loadMileageCalendar === 'function') loadMileageCalendar();
  if (id === 'devis-requests' && typeof loadDevisRequests === 'function') loadDevisRequests();
  if (id === 'personnel' && typeof loadPersonnelLeaveStats === 'function') loadPersonnelLeaveStats();
  if (id === 'editorial' && typeof loadAndRenderEditorial === 'function') loadAndRenderEditorial();
  if (id === 'improvements' && typeof loadImprovements === 'function') loadImprovements();
  if (id === 'links' && typeof loadAndRenderLinks === 'function') loadAndRenderLinks();
  if (id === 'audit' && typeof loadAuditLog === 'function') loadAuditLog();
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

function renderMiniCalendar() {
  const wrap = document.getElementById('dash-mini-cal');
  if (!wrap) return;
  const now = new Date();
  const year = now.getFullYear(), month = now.getMonth();
  const monthNames = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const offset = firstDay === 0 ? 6 : firstDay - 1;
  const prevDays = new Date(year, month, 0).getDate();

  let html = `<div style="text-align:center;font-weight:700;color:var(--gold);margin-bottom:10px;font-size:.9rem">${monthNames[month]} ${year}</div>`;
  html += '<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:2px;font-size:.72rem">';
  ['L','M','M','J','V','S','D'].forEach(d => html += `<div style="text-align:center;color:var(--text2);padding:3px 0;font-weight:600">${d}</div>`);

  for (let i = offset - 1; i >= 0; i--) {
    html += `<div style="text-align:center;color:var(--text2);opacity:.3;padding:4px 2px">${prevDays - i}</div>`;
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const isToday = d === now.getDate();
    const cellDate = new Date(year, month, d);
    const evts = (window.calendarEvents || []).filter(e => {
      if (!e.event_date) return false;
      const [sy, sm, sd] = e.event_date.split('-').map(Number);
      const start = new Date(sy, sm - 1, sd);
      const end = e.end_date ? (() => { const [ey,em,ed]=e.end_date.split('-').map(Number); return new Date(ey,em-1,ed); })() : start;
      return cellDate >= start && cellDate <= end;
    });
    const dots = evts.slice(0,3).map(e => {
      const c = typeof eventColor === 'function' ? eventColor(e) : { border: 'var(--gold)' };
      return `<span style="display:inline-block;width:5px;height:5px;border-radius:50%;background:${c.border};margin:0 1px"></span>`;
    }).join('');
    const todayStyle = isToday ? 'background:var(--gold);color:#000;border-radius:50%;font-weight:700;' : '';
    const hasEvt = evts.length > 0 ? 'color:var(--text);' : 'color:var(--text2);';
    html += `<div style="text-align:center;padding:3px 2px;${todayStyle}${!isToday ? hasEvt : ''}">
      <div>${d}</div>${dots ? `<div style="margin-top:1px">${dots}</div>` : ''}
    </div>`;
  }
  const remaining = 42 - offset - daysInMonth;
  for (let d = 1; d <= remaining; d++) {
    html += `<div style="text-align:center;color:var(--text2);opacity:.3;padding:4px 2px">${d}</div>`;
  }
  html += '</div>';
  wrap.innerHTML = html;
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
// (Les anciens tableaux statiques FINANCE_2025/FINANCE_2026 ont été supprimés le 16/08/2026 :
//  tout vient désormais de banque_factures, banque_transactions et finance_monthly.)

const MNAMES_FR = ['','Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
let CHARGES_FIXES_MOIS = 6432;   // mis à jour dynamiquement depuis Supabase
let CHARGES_VARS_MOIS  = 2985;
let OBJECTIF_CA_ANNUEL = CHARGES_FIXES_MOIS * 12;

function fmt(n) {
  return n > 0 ? n.toLocaleString('fr-FR') + ' €' : '—';
}

// Factures d'années précédentes dont l'ÉVÉNEMENT a eu lieu en 2026 (facturation anticipée) :
// numéro → mois 2026 de l'événement. MIO F-2025-093 = services aux Portois, réalisé en janvier 2026.
const FACTURES_ANTERIEURES_EVENEMENT_2026 = { 'F-2025-093': 1 };

// Charge les données réelles de l'année (factures Qonto + banque) — source de vérité depuis le 16/08/2026.
// Fournit aussi la vue « opérationnelle » (23/08/2026, demande Romain) : CA des événements du mois
// (Romain facture dans la foulée → facturé du mois = événements du mois, corrigé des décalages Noël),
// dépenses hors « Impôts & TVA » (souvent l'exercice précédent, ex. solde SIE 2025 payé en juillet 2026),
// et les impôts payés montrés à part.
async function fetchReel(annee) {
  const numsAnt = Object.keys(FACTURES_ANTERIEURES_EVENEMENT_2026);
  const [rFac, rTx, rAnt] = await Promise.all([
    sb.from('banque_factures').select('numero,mois,client,ht,ttc,statut,date_emission').eq('annee', annee),
    sb.from('banque_transactions').select('mois,debit,credit,categorie').eq('annee', annee),
    (annee === 2026 && numsAnt.length) ? sb.from('banque_factures').select('numero,ht,statut').in('numero', numsAnt) : Promise.resolve({ data: [] })
  ]);
  const factures = rFac.data || [], txs = rTx.data || [];
  const facMois = {}, encMois = {}, depMois = {}, depOpMois = {}, impotsMois = {}, caOpMois = {};
  factures.forEach(f => { if (f.statut !== 'canceled') facMois[f.mois] = (facMois[f.mois] || 0) + (parseFloat(f.ht) || 0); });
  txs.forEach(t => {
    if (t.credit) encMois[t.mois] = (encMois[t.mois] || 0) + parseFloat(t.credit);
    if (t.debit) {
      const d = parseFloat(t.debit);
      depMois[t.mois] = (depMois[t.mois] || 0) + d;
      if (t.categorie === 'Impôts & TVA') impotsMois[t.mois] = (impotsMois[t.mois] || 0) + d;
      else depOpMois[t.mois] = (depOpMois[t.mois] || 0) + d;
    }
  });
  Object.keys(facMois).forEach(m => { caOpMois[m] = facMois[m]; });
  if (annee === 2026) {
    // Les Noëls de décembre 2025 facturés en janvier sortent de janvier ; la MIO (événement janvier) y entre.
    factures.forEach(f => {
      if (f.statut !== 'canceled' && FACTURES_EVENEMENTS_2025.includes(f.numero)) caOpMois[f.mois] -= parseFloat(f.ht) || 0;
    });
    (rAnt.data || []).forEach(f => {
      if (f.statut !== 'canceled') {
        const m = FACTURES_ANTERIEURES_EVENEMENT_2026[f.numero];
        caOpMois[m] = (caOpMois[m] || 0) + (parseFloat(f.ht) || 0);
      }
    });
  }
  const sum = o => Object.values(o).reduce((s, v) => s + v, 0);
  return {
    factures, facMois, encMois, depMois, depOpMois, impotsMois, caOpMois,
    totFac: sum(facMois), totEnc: sum(encMois), totDep: sum(depMois),
    totCaOp: sum(caOpMois), totDepOp: sum(depOpMois), totImpots: sum(impotsMois)
  };
}

const fmtEur = v => Math.round(v).toLocaleString('fr-FR') + ' €';
const fmtSigne = v => (v >= 0 ? '+' : '') + Math.round(v).toLocaleString('fr-FR') + ' €';

// Factures émises en 2026 mais dont l'événement a eu lieu en 2025 (animations de Noël de décembre 2025,
// facturées en janvier 2026 — identifiées par leur objet le 23/08/2026). Liste fixe, à compléter à la main
// si une nouvelle facture « événement 2025 » apparaissait.
const FACTURES_EVENEMENTS_2025 = ['F-2026-002', 'F-2026-003', 'F-2026-005', 'F-2026-006', 'F-2026-007', 'F-2026-009'];

// Corrections du 23/08/2026 après rapprochement avec les virements bancaires réels (validé avec Romain) :
// le « payee_le » de Qonto est la date de POINTAGE du statut, pas celle du virement. Ces factures ont en
// réalité été payées en 2025 : F-2025-068/069 (Halloween — virement Mercialys 1 230,40 € du 03/12/2025),
// F-2025-081/082 (arbre de Noël CILAM — acompte 6 900 € le 06/11/2025 + solde 7 252,76 € le 10/12/2025),
// F-2025-084 (Lolipop — 1 996,40 € le 24/12/2025), F-2025-092 (Ravate — acompte 3 800 € le 12/11/2025
// + solde 3 719,05 € le 23/12/2025). Et F-2025-093 (MIO) : facturée en 2025 mais l'événement (mise en
// avant des services aux Portois) a eu lieu en JANVIER 2026 → ce n'est pas un héritage 2025.
const HERITAGE_EXCLUSIONS = ['F-2025-068', 'F-2025-069', 'F-2025-081', 'F-2025-082', 'F-2025-084', 'F-2025-092', 'F-2025-093'];
// Montant réellement encaissé en 2026 quand une partie l'avait déjà été en 2025 :
// Testoni F-2025-086 = acompte 4 120,22 € encaissé le 12/09/2025, solde 9 613,84 € encaissé le 24/02/2026.
const HERITAGE_ENCAISSE_2026 = { 'F-2025-086': 9613.84 };

// « Héritage 2025 » = argent encaissé en 2026 qui vient d'événements réalisés en 2025 :
// ① factures 2024/2025 payées en 2026 (colonne payee_le) + ② factures 2026 de la liste ci-dessus.
// Le TTC de banque_factures = « restant dû à l'émission » (acomptes déjà déduits) = ce qui a réellement
// été encaissé en 2026 pour ces factures.
async function fetchHeritage2025(reel) {
  const { data } = await sb.from('banque_factures')
    .select('numero,client,ttc,objet,payee_le')
    .lt('annee', 2026).gte('payee_le', '2026-01-01').neq('statut', 'canceled');
  const anciennes = (data || [])
    .filter(f => !HERITAGE_EXCLUSIONS.includes(f.numero))
    .map(f => HERITAGE_ENCAISSE_2026[f.numero] != null ? { ...f, ttc: HERITAGE_ENCAISSE_2026[f.numero] } : f);
  const noel = (reel.factures || []).filter(f => FACTURES_EVENEMENTS_2025.includes(f.numero) && f.statut === 'paid');
  const encAncien = anciennes.reduce((s, f) => s + (parseFloat(f.ttc) || 0), 0);
  const encNoel = noel.reduce((s, f) => s + (parseFloat(f.ttc) || 0), 0);
  const htNoel = noel.reduce((s, f) => s + (parseFloat(f.ht) || 0), 0);
  return {
    anciennes, noel,
    encaisse: encAncien + encNoel,        // hérité de 2025, encaissé en 2026
    caPur: reel.totFac - htNoel,          // CA facturé pour des événements 2026 (HT)
    encPur: reel.totEnc - encAncien - encNoel,
    resultatPur: (reel.totEnc - reel.totDep) - encAncien - encNoel
  };
}

// Carte « Est-ce que le mois est rentable ? » de l'onglet Finances (demande Romain 23/08/2026) :
// événements facturés dans le mois (HT, corrigés des décalages Noël) vs dépenses du mois hors impôts.
function renderRentabiliteMensuelle(reel) {
  const box = document.getElementById('rentab-body');
  if (!box) return;
  const vert = '#4CAF50', rouge = '#f44336';
  const moisActifs = [...new Set([...Object.keys(reel.caOpMois), ...Object.keys(reel.depOpMois), ...Object.keys(reel.impotsMois)])].map(Number).sort((a, b) => a - b);
  let totCa = 0, totDep = 0, totImp = 0;
  const lignes = moisActifs.map(m => {
    const ca = reel.caOpMois[m] || 0, dep = reel.depOpMois[m] || 0, imp = reel.impotsMois[m] || 0;
    const res = ca - dep;
    totCa += ca; totDep += dep; totImp += imp;
    return `<tr>
      <td style="font-weight:600">${MNAMES_FR[m]}</td>
      <td style="color:var(--gold);font-weight:700">${fmtEur(ca)}</td>
      <td style="color:#f44336">${fmtEur(dep)}</td>
      <td style="font-weight:700;color:${res >= 0 ? vert : rouge}">${res >= 0 ? '✅' : '🔴'} ${fmtSigne(res)}</td>
      <td style="color:var(--text2)">${imp > 0 ? fmtEur(imp) : '—'}</td>
    </tr>`;
  }).join('');
  const totRes = totCa - totDep;
  box.innerHTML = `
    <p style="font-size:.85rem;color:var(--text2);margin:0 0 12px">
      Tu factures dans la foulée de tes prestations : <strong>le facturé du mois = les événements du mois</strong>
      (corrigé : les Noëls de décembre 2025 facturés en janvier comptent en 2025, la MIO de janvier compte en janvier).
      Les <strong>impôts & TVA sont comptés à part</strong> — ils concernent souvent l'exercice précédent
      (ex. solde d'impôt 2025 payé en juillet 2026) et fausseraient la lecture du mois.
    </p>
    <div style="overflow-x:auto">
      <table class="data-table fin-monthly-table">
        <thead><tr><th>Mois</th><th style="color:var(--gold)">Événements facturés (HT)</th><th style="color:#f44336">Dépenses du mois</th><th>Rentable ?</th><th style="color:var(--text2)">Impôts payés (à part)</th></tr></thead>
        <tbody>${lignes}</tbody>
        <tfoot><tr style="font-weight:700;border-top:2px solid var(--border)">
          <td>TOTAL</td>
          <td style="color:var(--gold)">${fmtEur(totCa)}</td>
          <td style="color:#f44336">${fmtEur(totDep)}</td>
          <td style="color:${totRes >= 0 ? vert : rouge}">${fmtSigne(totRes)}</td>
          <td style="color:var(--text2)">${fmtEur(totImp)}</td>
        </tr></tfoot>
      </table>
    </div>`;
}

// Carte « 2026 en propre » de l'onglet Finances
async function renderHeritage2025(reel) {
  const box = document.getElementById('heritage-2025-body');
  if (!box) return;
  const h = await fetchHeritage2025(reel);
  const vert = '#4CAF50', rouge = '#f44336';
  const pct = reel.totEnc > 0 ? Math.round((h.encaisse / reel.totEnc) * 100) : 0;
  const lignes = [
    ...h.anciennes.map(f => ({ num: f.numero, client: f.client, objet: f.objet, ttc: parseFloat(f.ttc) || 0, paye: f.payee_le })),
    ...h.noel.map(f => ({ num: f.numero, client: f.client, objet: 'Animation de Noël — décembre 2025', ttc: parseFloat(f.ttc) || 0, paye: null }))
  ].sort((a, b) => a.num.localeCompare(b.num));
  box.innerHTML = `
    <p style="font-size:.85rem;color:var(--text2);margin:0 0 14px">
      Ton modèle : les événements de fin d'année sont payés au début de l'année suivante. Cette carte sépare
      ce que <strong>2026 a gagné toute seule</strong> de l'argent hérité des événements de 2025.
    </p>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px;margin-bottom:14px">
      <div style="background:var(--bg3);border-radius:10px;padding:12px 14px">
        <div style="font-size:.75rem;color:var(--text2);text-transform:uppercase;letter-spacing:.5px">CA facturé — événements 2026</div>
        <div style="font-size:1.25rem;font-weight:700;color:var(--gold)">${fmtEur(h.caPur)} <span style="font-size:.72rem;font-weight:400;color:var(--text2)">HT</span></div>
        <div style="font-size:.72rem;color:var(--text2)">sur ${fmtEur(reel.totFac)} facturés au total</div>
      </div>
      <div style="background:var(--bg3);border-radius:10px;padding:12px 14px">
        <div style="font-size:.75rem;color:var(--text2);text-transform:uppercase;letter-spacing:.5px">Encaissé — événements 2026</div>
        <div style="font-size:1.25rem;font-weight:700;color:${vert}">${fmtEur(h.encPur)}</div>
        <div style="font-size:.72rem;color:var(--text2)">sur ${fmtEur(reel.totEnc)} encaissés au total</div>
      </div>
      <div style="background:var(--bg3);border-radius:10px;padding:12px 14px">
        <div style="font-size:.75rem;color:var(--text2);text-transform:uppercase;letter-spacing:.5px">Hérité des événements 2025</div>
        <div style="font-size:1.25rem;font-weight:700;color:var(--gold)">${fmtEur(h.encaisse)}</div>
        <div style="font-size:.72rem;color:var(--text2)">${pct} % de l'encaissé 2026 (${lignes.length} factures)</div>
      </div>
      <div style="background:var(--bg3);border-radius:10px;padding:12px 14px">
        <div style="font-size:.75rem;color:var(--text2);text-transform:uppercase;letter-spacing:.5px">Trésorerie 2026 sans l'héritage</div>
        <div style="font-size:1.25rem;font-weight:700;color:${h.resultatPur >= 0 ? vert : rouge}">${fmtSigne(h.resultatPur)}</div>
        <div style="font-size:.72rem;color:var(--text2)">résultat réel : ${fmtSigne(reel.totEnc - reel.totDep)}</div>
      </div>
    </div>
    <p style="font-size:.78rem;color:var(--text2);margin:0 0 10px;line-height:1.55">
      ⚠️ À lire sans paniquer : ce chiffre « sans héritage » est sévère, car les dépenses des événements 2025 payées
      début 2026 (artistes des Noëls…) ne sont pas retirées, et surtout <strong>tes Noëls 2026 joueront exactement le même
      rôle pour 2027</strong>. L'important : que le CA « événements 2026 » (${fmtEur(h.caPur)} HT) continue de grossir,
      et que l'héritage de Noël soit provisionné, pas dépensé.
    </p>
    <details>
      <summary style="cursor:pointer;font-size:.82rem;color:var(--gold)">Voir les ${lignes.length} factures d'événements 2025 encaissées en 2026 (${fmtEur(h.encaisse)})</summary>
      <div style="margin-top:8px">
        ${lignes.map(l => `<div style="display:flex;flex-wrap:wrap;gap:2px 10px;align-items:center;padding:6px 4px;border-bottom:1px solid var(--border);font-size:.82rem">
          <span style="color:var(--text2)">${l.num}</span>
          <span style="flex:1;min-width:120px">${l.client || '—'}</span>
          ${l.paye ? `<span style="font-size:.72rem;color:var(--text2)">payée ${new Date(l.paye).toLocaleDateString('fr-FR')}</span>` : ''}
          <strong style="color:var(--gold);white-space:nowrap">${fmtEur(l.ttc)}</strong>
          ${l.objet ? `<span style="width:100%;color:var(--text2);font-size:.74rem">${l.objet.slice(0, 80)}</span>` : ''}
        </div>`).join('')}
      </div>
    </details>`;
}

async function renderDashboardCA() {
  const container = document.getElementById('dashboard-ca-bars');
  if (!container) return;
  const MONTHS = ['','Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
  const TARGET = (window.CHARGES_FIXES_MOIS || 6432) + (window.CHARGES_VARS_MOIS || 2985);
  document.querySelectorAll('[data-charges-label]').forEach(el => {
    el.textContent = TARGET.toLocaleString('fr-FR') + ' €/mois';
  });

  const reel = await fetchReel(2026);
  const resultat = reel.totEnc - reel.totDep;

  // Créances visibles dès le tableau de bord
  renderCreancesReelles(reel.factures);

  // La situation en un coup d'œil (revue finances du 16/08/2026)
  renderBilanClair(reel);

  const caStatEl = document.getElementById('stat-ca-count');
  if (caStatEl) caStatEl.textContent = fmtEur(reel.totFac);
  const benefLabelEl = document.getElementById('stat-benef-label');
  if (benefLabelEl) {
    benefLabelEl.innerHTML = `
      <span style="color:#aaa">Encaissé : <strong style="color:#4CAF50">${fmtEur(reel.totEnc)}</strong></span><br>
      <span style="color:#aaa">Dépensé : <strong style="color:#f44336">${fmtEur(reel.totDep)}</strong></span><br>
      <span style="color:#aaa">Résultat tréso : <strong style="color:${resultat >= 0 ? '#4CAF50' : '#f44336'}">${fmtSigne(resultat)}</strong></span>`;
    benefLabelEl.style.color = '';
  }

  // Barres mensuelles : rentabilité des ÉVÉNEMENTS du mois (facturé HT − dépenses hors impôts) —
  // demande Romain 23/08/2026 : « suis-je rentable chaque mois par rapport aux événements que je fais ? »
  const moisActifs = [...new Set([...Object.keys(reel.caOpMois), ...Object.keys(reel.depOpMois)])].map(Number).sort((a, b) => a - b);
  const maxAbs = Math.max(1, ...moisActifs.map(m => Math.abs((reel.caOpMois[m] || 0) - (reel.depOpMois[m] || 0))));
  let html = '';
  for (const m of moisActifs) {
    const ca = reel.caOpMois[m] || 0, dop = reel.depOpMois[m] || 0, imp = reel.impotsMois[m] || 0;
    const res = ca - dop;
    const pct = Math.max(4, Math.round((Math.abs(res) / maxAbs) * 100));
    html += `<div class="objective-item">
      <div class="obj-label" style="color:${res >= 0 ? '#4CAF50' : '#f44336'}">${MONTHS[m]} 2026</div>
      <div class="obj-progress-wrap" style="position:relative;overflow:hidden">
        <div style="position:absolute;left:0;top:0;bottom:0;width:${pct}%;background:${res >= 0 ? '#4CAF50' : '#f44336'};border-radius:4px"></div>
      </div>
      <div class="obj-values">
        <span style="color:${res >= 0 ? '#4CAF50' : '#f44336'};font-weight:700">${fmtSigne(res)}</span>
        <span class="obj-target">événements ${fmtEur(ca)} − dépenses ${fmtEur(dop)}${imp > 0 ? ` · impôts à part ${fmtEur(imp)}` : ''}</span>
      </div>
    </div>`;
  }
  container.innerHTML = html || '<p style="color:var(--text2);padding:1rem">Aucune opération bancaire 2026 — importe un export Qonto dans l\'onglet Charges</p>';

  // Jauges dashboard : couverture des dépenses par les encaissements + CA facturé vs objectif
  const couvPct = reel.totDep > 0 ? Math.min(100, Math.round((reel.totEnc / reel.totDep) * 100)) : 0;
  const caPct = Math.min(100, Math.round((reel.totFac / 300000) * 100));
  const dSub1 = document.getElementById('dash-gauge-charges-sub');
  if (dSub1) dSub1.innerHTML = `Encaissé : <strong>${fmtEur(reel.totEnc)}</strong> / Dépensé : <strong>${fmtEur(reel.totDep)}</strong>`;
  const dSub2 = document.getElementById('dash-gauge-ca-sub');
  if (dSub2) dSub2.innerHTML = `CA facturé : <strong>${fmtEur(reel.totFac)}</strong> / objectif 300 000 €`;
  const dH = document.getElementById('dash-gauge-charges-half');
  if (dH) dH.textContent = fmtEur(reel.totDep / 2);
  const dF = document.getElementById('dash-gauge-charges-full');
  if (dF) dF.textContent = fmtEur(reel.totDep);

  setTimeout(() => {
    const dg1 = document.getElementById('dash-gauge-charges'); const dp1 = document.getElementById('dash-gauge-charges-pct');
    const dg2 = document.getElementById('dash-gauge-ca');      const dp2 = document.getElementById('dash-gauge-ca-pct');
    if (dg1) { dg1.style.width = couvPct + '%'; if (dp1) dp1.textContent = couvPct + '%'; }
    if (dg2) { dg2.style.width = caPct + '%';   if (dp2) dp2.textContent = caPct + '%'; }
  }, 120);
}

// ---- La situation en un coup d'œil : rentable ?, CA vs objectif, ce qui coûte, impayés, à prévoir ----
async function renderBilanClair(reel) {
  const box = document.getElementById('bilan-clair');
  if (!box) return;
  const maj = document.getElementById('bilan-maj');
  if (maj) maj.textContent = 'Chiffres réels Qonto — ' + new Date().toLocaleDateString('fr-FR');

  const resultat = reel.totEnc - reel.totDep;
  const moisEcoules = Math.max(1, Object.keys(reel.encMois).length);
  const parMois = resultat / moisEcoules;

  // Ce qui coûte : familles de dépenses 2026 (Impôts + Cotisations regroupés pour la lecture)
  const rCat = await sb.from('banque_transactions').select('categorie,debit').eq('annee', 2026).gt('debit', 0);
  const fam = {};
  (rCat.data || []).forEach(t => {
    let c = t.categorie || 'Autres';
    if (c === 'Impôts & TVA' || c === 'Cotisations & retraite') c = 'Impôts & cotisations';
    fam[c] = (fam[c] || 0) + parseFloat(t.debit);
  });
  const topFam = Object.entries(fam).sort((a, b) => b[1] - a[1]).slice(0, 4);

  // Impayés : factures unpaid, en retard si émises depuis plus de 30 jours
  const auj = new Date();
  const impayees = (reel.factures || []).filter(f => f.statut === 'unpaid');
  const enRetard = impayees.filter(f => (auj - new Date(f.date_emission)) / 86400000 > 30);
  const totImp = impayees.reduce((s, f) => s + (parseFloat(f.ttc) || 0), 0);
  const totRetard = enRetard.reduce((s, f) => s + (parseFloat(f.ttc) || 0), 0);
  const nomsRetard = enRetard.map(f => `${(f.client || '?').split(' ').slice(0, 3).join(' ')} (${fmtEur(parseFloat(f.ttc) || 0)})`).join(' · ');

  const vert = '#4CAF50', rouge = '#f44336';
  const caPct = Math.min(100, Math.round((reel.totFac / 300000) * 100));

  // Pot impôts : 17 % de l'encaissé du trimestre en cours (ratio réel impôts+cotisations/encaissements 2026 ≈ 16,5 %)
  const moisCourant = auj.getMonth() + 1;
  const debutTrim = moisCourant - ((moisCourant - 1) % 3);
  let encTrim = 0;
  for (let m = debutTrim; m <= moisCourant; m++) encTrim += reel.encMois[m] || 0;
  const potImpots = encTrim * 0.17;

  // Avant / après impôts (vision trésorerie : impôts & cotisations réellement payés)
  const impotsPayes = fam['Impôts & cotisations'] || 0;
  const avantImpots = resultat + impotsPayes;

  // 2026 en propre : sans l'argent hérité des événements 2025 (détail dans l'onglet Finances)
  const herit = await fetchHeritage2025(reel).catch(() => null);

  box.innerHTML = `
    <div style="margin-bottom:12px">
      <div style="font-size:1.05rem;font-weight:700;color:${resultat >= 0 ? vert : rouge}">
        ${resultat >= 0 ? '✅ Rentable' : '⚠️ En perte'} : ${fmtSigne(resultat)} de bénéfice net depuis janvier
        <span style="color:var(--text2);font-weight:400;font-size:.85rem">(≈ ${fmtSigne(parMois)}/mois sur ${moisEcoules} mois)</span>
      </div>
      <div style="font-size:.82rem;color:var(--text2);margin-top:3px">
        Avant impôts : <strong style="color:${avantImpots >= 0 ? vert : rouge}">${fmtSigne(avantImpots)}</strong>
        &nbsp;→&nbsp; impôts & cotisations payés : <strong style="color:#f44336">−${fmtEur(impotsPayes)}</strong>
        &nbsp;→&nbsp; après impôts : <strong style="color:${resultat >= 0 ? vert : rouge}">${fmtSigne(resultat)}</strong>
      </div>
      ${herit ? `<div style="font-size:.82rem;color:var(--text2);margin-top:3px">
        🎄 Dont hérité des événements 2025 : <strong style="color:var(--gold)">${fmtEur(herit.encaisse)}</strong> encaissés
        &nbsp;→&nbsp; activité 2026 seule : <strong style="color:${herit.resultatPur >= 0 ? vert : rouge}">${fmtSigne(herit.resultatPur)}</strong>
        <span style="font-size:.72rem">(détail dans Finances & Charges — les Noëls 2026 feront pareil pour 2027)</span>
      </div>` : ''}
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px">
      <div>
        <div style="font-size:.78rem;color:var(--text2);text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">Chiffre d'affaires</div>
        <div style="font-size:1.1rem;font-weight:700;color:var(--gold)">${fmtEur(reel.totFac)} <span style="font-size:.75rem;color:var(--text2);font-weight:400">HT facturé</span></div>
        <div style="font-size:.78rem;color:var(--text2);margin-top:4px">Objectif 300 000 € : <strong style="color:var(--gold)">${caPct} %</strong></div>
        <div style="font-size:.78rem;color:var(--text2)">Encaissé ${fmtEur(reel.totEnc)} · Dépensé ${fmtEur(reel.totDep)}</div>
        ${herit ? `<div style="font-size:.78rem;color:var(--text2)">dont événements 2026 : <strong>${fmtEur(herit.caPur)}</strong> HT · Noëls 2025 : ${fmtEur(reel.totFac - herit.caPur)} HT</div>` : ''}
      </div>
      <div>
        <div style="font-size:.78rem;color:var(--text2);text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">Ce qui coûte le plus</div>
        ${topFam.map(([c, v]) => `<div style="display:flex;justify-content:space-between;font-size:.82rem;margin-bottom:3px"><span style="color:var(--text2)">${c}</span><strong>${fmtEur(v)}</strong></div>`).join('')}
      </div>
      <div>
        <div style="font-size:.78rem;color:var(--text2);text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">Impayés</div>
        <div style="font-size:1.1rem;font-weight:700">${fmtEur(totImp)} <span style="font-size:.75rem;color:var(--text2);font-weight:400">TTC en attente</span></div>
        ${totRetard > 0
          ? `<div style="font-size:.8rem;color:${rouge};font-weight:600;margin-top:4px">dont ${fmtEur(totRetard)} en retard (+30 j)</div>
             <div style="font-size:.74rem;color:var(--text2);margin-top:2px;line-height:1.5">${nomsRetard}</div>`
          : `<div style="font-size:.8rem;color:${vert};margin-top:4px">Aucun retard de plus de 30 jours 👍</div>`}
      </div>
      <div>
        <div style="font-size:.78rem;color:var(--text2);text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">À prévoir</div>
        <div style="font-size:.8rem;color:var(--text2);line-height:1.6">
          💰 Pot impôts conseillé : <strong style="color:var(--gold)">${fmtEur(potImpots)}</strong>
          <span style="font-size:.72rem">(17 % de l'encaissé du trimestre — à garder sur le sous-compte Qonto « Impôts & TVA »)</span><br>
          · CGSS trimestre juil-sept : <strong style="color:var(--text)">≈ 3 000 €</strong> vers octobre<br>
          · TVA après Noël : <strong style="color:var(--text)">≈ 15 000 €</strong> en janvier<br>
          · Retraite salariés (CRR) : ≈ 215 €/mois<br>
          <span style="font-size:.72rem">Rappel : l'argent du Noël N finance l'année N+1 — ne pas tout dépenser en janvier.</span>
        </div>
      </div>
    </div>`;
}

let _finMonthlyData = {}; // cache: { '2026-1': {ca,benef}, ... }

async function renderFinanceAnalyse() {
  const body26 = document.getElementById('fin-monthly-2026-body');
  const foot26 = document.getElementById('fin-monthly-2026-total');
  const body25 = document.getElementById('fin-monthly-2025-body');
  const foot25 = document.getElementById('fin-monthly-2025-total');
  if (!body26) return;

  // 2026 : données réelles (factures Qonto + banque) — plus de saisie manuelle
  const reel = await fetchReel(2026);
  renderRentabiliteMensuelle(reel);
  renderHeritage2025(reel).catch(console.error);
  // 2025 : référence saisie (finance_monthly)
  const rows = await fetchFinanceMonthly();
  _finMonthlyData = {};
  rows.forEach(r => { _finMonthlyData[`${r.year}-${r.month}`] = r; });

  let total26fac = 0, total25ca = 0;
  let html26 = '', html25 = '';

  for (let m = 1; m <= 12; m++) {
    const fac = reel.facMois[m] || 0;
    const enc = reel.encMois[m] || 0;
    const dep = reel.depMois[m] || 0;
    const res = enc - dep;
    const aBanque = (m in reel.encMois) || (m in reel.depMois);
    const ca25 = parseFloat(_finMonthlyData[`2025-${m}`]?.ca) || 0;
    total26fac += fac; total25ca += ca25;

    if (fac || aBanque) {
      html26 += `<tr class="month-done">
        <td><strong>${MNAMES_FR[m]}</strong></td>
        <td style="color:var(--gold);font-weight:700">${fac ? fmt(fac) : '<span style="color:var(--text2)">—</span>'}</td>
        <td style="color:#4CAF50">${aBanque ? fmt(enc) : '<span style="color:var(--text2)">—</span>'}</td>
        <td style="color:#f44336">${aBanque ? fmt(dep) : '<span style="color:var(--text2)">—</span>'}</td>
        <td style="font-weight:700;color:${res >= 0 ? '#4CAF50' : '#f44336'}">${aBanque ? fmtSigne(res) : '<span style="color:var(--text2)">—</span>'}</td>
      </tr>`;
    }

    let evol = '';
    const fac26 = fac;
    if (ca25 > 0 && fac26 > 0) {
      const pct = Math.round(((fac26 - ca25) / ca25) * 100);
      evol = `<span class="${pct >= 0 ? 'fin-evol-up' : 'fin-evol-down'}">${pct >= 0 ? '+' : ''}${pct}%</span>`;
    } else if (fac26 > 0 && ca25 === 0) {
      evol = `<span class="fin-evol-up">Nouveau</span>`;
    }
    html25 += `<tr><td><strong>${MNAMES_FR[m]}</strong></td>
      <td class="fin-editable" onclick="editFinanceCell(2025,${m},'ca',${ca25})" style="cursor:pointer" title="Cliquer pour modifier">
        ${ca25 > 0 ? fmt(ca25) : '<span style="color:var(--text2)">—</span>'}
      </td>
      <td style="color:var(--gold);font-weight:700">${fac26 > 0 ? fmt(fac26) : '<span style="color:var(--text2)">—</span>'}</td>
      <td>${evol}</td></tr>`;
  }

  const totRes = reel.totEnc - reel.totDep;
  body26.innerHTML = html26 || '<tr><td colspan="5" style="text-align:center;color:var(--text2);padding:1.5rem">Aucune donnée réelle — importe tes exports Qonto dans l\'onglet Charges</td></tr>';
  body25.innerHTML = html25;
  foot26.innerHTML = `<td>TOTAL</td><td style="color:var(--gold)"><strong>${fmtEur(total26fac)}</strong></td><td style="color:#4CAF50"><strong>${fmtEur(reel.totEnc)}</strong></td><td style="color:#f44336"><strong>${fmtEur(reel.totDep)}</strong></td><td style="color:${totRes >= 0 ? '#4CAF50' : '#f44336'}"><strong>${fmtSigne(totRes)}</strong></td>`;
  // Évolution globale sur les mois comparables (CA présent dans les deux années)
  let cmp25 = 0, cmp26 = 0;
  for (let m = 1; m <= 12; m++) {
    const a = parseFloat(_finMonthlyData[`2025-${m}`]?.ca) || 0, b = reel.facMois[m] || 0;
    if (a > 0 && b > 0) { cmp25 += a; cmp26 += b; }
  }
  const evolTot = cmp25 > 0 ? Math.round(((cmp26 - cmp25) / cmp25) * 100) : 0;
  foot25.innerHTML = `<td>TOTAL</td><td><strong>${total25ca.toLocaleString('fr-FR')} €</strong></td>` +
    `<td style="color:var(--gold)"><strong>${total26fac.toLocaleString('fr-FR')} €</strong></td>` +
    `<td><span class="${evolTot >= 0 ? 'fin-evol-up' : 'fin-evol-down'}" title="Sur les mois présents dans les deux années">${evolTot >= 0 ? '+' : ''}${evolTot}%</span></td>`;
  const tot25El = document.getElementById('ca-2025-total');
  if (tot25El) tot25El.textContent = fmtEur(total25ca);

  // KPI réels du haut de page
  const kpi = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  kpi('fkpi-facture', fmtEur(total26fac));
  kpi('fkpi-encaisse', fmtEur(reel.totEnc));
  kpi('fkpi-depense', fmtEur(reel.totDep));
  const resEl = document.getElementById('fkpi-resultat');
  if (resEl) { resEl.textContent = fmtSigne(totRes); resEl.style.color = totRes >= 0 ? '#4CAF50' : '#f44336'; }

  // Créances : factures Qonto non payées
  renderCreancesReelles(reel.factures);

  // Jauge 1 : couverture des dépenses par les encaissements
  const couvPct = reel.totDep > 0 ? Math.min(100, Math.round((reel.totEnc / reel.totDep) * 100)) : 0;
  const gSub1 = document.getElementById('gauge-charges-subtitle');
  if (gSub1) gSub1.innerHTML = `Encaissé : <strong>${fmtEur(reel.totEnc)}</strong> / Dépensé : <strong>${fmtEur(reel.totDep)}</strong> → résultat <strong style="color:${totRes >= 0 ? '#4CAF50' : '#f44336'}">${fmtSigne(totRes)}</strong>`;
  document.querySelectorAll('.gauge-label-half-charges').forEach(el => el.textContent = fmtEur(reel.totDep / 2));
  document.querySelectorAll('.gauge-label-full-charges').forEach(el => el.textContent = fmtEur(reel.totDep));

  // Jauge 2 : CA facturé vs objectif 300 000 €
  const caPct = Math.min(100, Math.round((total26fac / 300000) * 100));
  const gSub2 = document.getElementById('gauge-ca-subtitle');
  if (gSub2) gSub2.innerHTML = `Objectif annuel : <strong>300 000 €</strong> | CA facturé à ce jour : <strong>${fmtEur(total26fac)}</strong>`;
  document.querySelectorAll('.gauge-label-half-ca').forEach(el => el.textContent = '150 000 €');
  document.querySelectorAll('.gauge-label-full-ca').forEach(el => el.textContent = '300 000 €');

  setTimeout(() => {
    const gc  = document.getElementById('gauge-charges'); const gcp  = document.getElementById('gauge-charges-pct');
    const gca = document.getElementById('gauge-ca');      const gcap = document.getElementById('gauge-ca-pct');
    if (gc)  { gc.style.width  = couvPct + '%'; if (gcp)  gcp.textContent  = couvPct + '%'; }
    if (gca) { gca.style.width = caPct + '%';   if (gcap) gcap.textContent = caPct + '%'; }
  }, 120);
}

// Créances : factures Qonto au statut "unpaid" (échéance = émission + 30 jours)
function renderCreancesReelles(factures) {
  const impayees = (factures || []).filter(f => f.statut === 'unpaid')
    .sort((a, b) => (a.date_emission < b.date_emission ? -1 : 1));
  const total = impayees.reduce((s, f) => s + (parseFloat(f.ttc) || 0), 0);

  // Carte du dashboard : seulement les VRAIS retards (échéance 30 j dépassée) —
  // les factures récentes (Insee, IMPro…) sont normales, pas des alertes (demande Romain 16/08)
  const aujC = new Date();
  const enRetardC = impayees.filter(f => (aujC - new Date(f.date_emission)) / 86400000 > 30);
  const totalRetard = enRetardC.reduce((s, f) => s + (parseFloat(f.ttc) || 0), 0);
  const statEl = document.getElementById('stat-creances-count');
  if (statEl) statEl.textContent = enRetardC.length;
  const dashTotalEl = document.getElementById('stat-creances-total');
  if (dashTotalEl) {
    dashTotalEl.textContent = enRetardC.length
      ? 'En retard : ' + fmtEur(totalRetard) + (total > totalRetard ? ' · à venir : ' + fmtEur(total - totalRetard) : '')
      : (total > 0 ? 'Rien en retard · à venir : ' + fmtEur(total) : '');
  }
  const totalEl = document.getElementById('creances-total');
  if (totalEl) totalEl.textContent = fmtEur(total);

  const kpiMontant = document.getElementById('fkpi-creances-montant');
  const kpiLabel = document.getElementById('fkpi-creances-label');
  if (kpiMontant && kpiLabel) {
    if (!impayees.length) {
      kpiMontant.textContent = '✅ 0 €';
      kpiMontant.className = 'fkpi-val success';
      kpiLabel.textContent = 'Toutes les factures sont payées';
    } else {
      const clients = [...new Set(impayees.map(f => f.client).filter(Boolean))];
      kpiMontant.textContent = fmtEur(total);
      kpiMontant.className = 'fkpi-val danger';
      kpiLabel.innerHTML = `${impayees.length} facture${impayees.length > 1 ? 's' : ''} en attente<br><span style="font-size:.72rem;color:var(--text2)">${clients.slice(0, 3).map(c => c.split(' ').slice(0, 3).join(' ')).join(', ')}${clients.length > 3 ? '…' : ''}</span>`;
    }
  }

  const tbody = document.getElementById('creances-tbody');
  if (!tbody) return;
  if (!impayees.length) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text2);padding:2rem">✅ Aucune créance — toutes les factures sont payées</td></tr>';
    return;
  }
  const now = new Date();
  tbody.innerHTML = impayees.map(f => {
    const emise = new Date(f.date_emission);
    const echeance = new Date(emise); echeance.setDate(echeance.getDate() + 30);
    const retard = Math.floor((now - echeance) / 86400000);
    const badge = retard > 0
      ? `<span style="font-size:.75rem;background:rgba(244,67,54,.15);color:#f44336;border-radius:6px;padding:2px 8px;font-weight:700">⚠ ${retard} j de retard</span>`
      : `<span style="font-size:.75rem;background:rgba(76,175,80,.15);color:#4CAF50;border-radius:6px;padding:2px 8px">dans les délais</span>`;
    return `<tr>
      <td style="color:var(--text2)">${f.numero}</td>
      <td>${f.client || '—'}</td>
      <td style="font-weight:700;color:var(--gold)">${fmtEur(parseFloat(f.ttc) || 0)}</td>
      <td>${emise.toLocaleDateString('fr-FR')}</td>
      <td>${badge}</td>
    </tr>`;
  }).join('');
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

// ===== RAPPORTS — tout calculé depuis les factures et la banque Qonto =====
async function renderReports() {
  const reel = await fetchReel(2026);
  const actives = reel.factures.filter(f => f.statut !== 'canceled');

  const kpi = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  kpi('rkpi-factures', actives.length);
  kpi('rkpi-ca', fmtEur(reel.totFac));
  kpi('rkpi-clients', new Set(actives.map(f => (f.client || '').trim()).filter(Boolean)).size);

  // Barres CA facturé par mois
  const bars = document.getElementById('rpt-ca-bars');
  if (bars) {
    const MOIS_C = ['', 'Janv', 'Févr', 'Mars', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sept', 'Oct', 'Nov', 'Déc'];
    const maxCa = Math.max(1, ...Object.values(reel.facMois));
    let html = '';
    for (let m = 1; m <= 12; m++) {
      const ca = reel.facMois[m];
      if (ca === undefined) continue;
      const h = Math.max(6, Math.round((ca / maxCa) * 90));
      html += `<div class="bar-group" title="${MOIS_C[m]} : ${fmtEur(ca)}"><div class="bar ${ca === maxCa ? 'gold' : ''}" style="height:${h}px"></div><span>${MOIS_C[m]}</span></div>`;
    }
    bars.innerHTML = html;
  }

  // Top clients (CA HT facturé)
  const tcEl = document.getElementById('rpt-top-clients');
  if (tcEl) {
    const parClient = {};
    actives.forEach(f => {
      const c = (f.client || '—').trim().split(' ').slice(0, 4).join(' ');
      parClient[c] = (parClient[c] || 0) + (parseFloat(f.ht) || 0);
    });
    const top = Object.entries(parClient).sort((a, b) => b[1] - a[1]).slice(0, 6);
    const maxC = top.length ? top[0][1] : 1;
    tcEl.innerHTML = top.map(([c, v]) =>
      `<div class="tc-row"><span>${c}</span><div class="tc-bar-wrap"><div class="tc-bar" style="width:${Math.round((v / maxC) * 100)}%"></div></div><span>${fmtEur(v)}</span></div>`
    ).join('');
  }

  // Top prestataires & artistes (montants payés, depuis la banque)
  const tpEl = document.getElementById('rpt-top-prestas');
  if (tpEl) {
    const { data } = await sb.from('banque_transactions').select('libelle,debit')
      .eq('annee', 2026).eq('categorie', 'Artistes & prestataires').not('debit', 'is', null);
    const parPresta = {};
    (data || []).forEach(t => {
      const p = (t.libelle || '—').trim();
      parPresta[p] = (parPresta[p] || 0) + (parseFloat(t.debit) || 0);
    });
    const top = Object.entries(parPresta).sort((a, b) => b[1] - a[1]).slice(0, 6);
    const maxP = top.length ? top[0][1] : 1;
    tpEl.innerHTML = top.map(([p, v]) =>
      `<div class="tc-row"><span>${p}</span><div class="tc-bar-wrap"><div class="tc-bar" style="width:${Math.round((v / maxP) * 100)}%"></div></div><span>${fmtEur(v)}</span></div>`
    ).join('') || '<p style="color:var(--text2);font-size:.85rem">Aucune donnée</p>';
  }

  // Panier moyen
  const pEl = document.getElementById('rpt-panier');
  if (pEl && actives.length) {
    pEl.textContent = fmtEur(reel.totFac / actives.length);
    const sub = document.getElementById('rpt-panier-sub');
    if (sub) sub.textContent = `${fmtEur(reel.totFac)} facturés ÷ ${actives.length} factures`;
  }
}

// PWA Service Worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js');
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
