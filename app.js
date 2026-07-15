/* =============================================
   OrganicCertify – app.js
   ============================================= */

/* ---- Page Navigation ---- */
function showPage(pageId, linkEl) {
  // Hide all pages
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  // Show target
  const target = document.getElementById('page-' + pageId);
  if (target) target.classList.add('active');
  // Update nav links
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  if (linkEl) linkEl.classList.add('active');
  // Close mobile menu
  closeMenu();
  // Scroll to top
  window.scrollTo({ top: 0, behavior: 'smooth' });
  // Page-specific init
  if (pageId === 'calculator') calculateCost();
  if (pageId === 'checklist') updateChecklist();
  if (pageId === 'inspection') updateInspectionProgress();
  if (pageId === 'landing') animateStats();
}

/* ---- Stat Count-Up Animation ---- */
function animateStats() {
  const statEls = document.querySelectorAll('.stat-num[data-count]');
  statEls.forEach(el => {
    const target = parseInt(el.getAttribute('data-count'));
    const suffix = el.getAttribute('data-suffix') || '';
    const duration = 1500;
    const start = performance.now();
    function update(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(eased * target) + suffix;
      if (progress < 1) requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
  });
}

/* ---- Hamburger Menu ---- */
function toggleMenu() {
  document.getElementById('navLinks').classList.toggle('open');
}
function closeMenu() {
  document.getElementById('navLinks').classList.remove('open');
}

/* ---- Navbar scroll effect ---- */
window.addEventListener('scroll', () => {
  const navbar = document.getElementById('navbar');
  if (window.scrollY > 20) navbar.classList.add('scrolled');
  else navbar.classList.remove('scrolled');
});

/* ---- Toast Notifications ---- */
function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${icons[type] || '🔔'}</span><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

/* =============================================
   CHECKLIST PAGE
   ============================================= */
const CHECKLIST_SECTIONS = {
  farm:       ['cl1', 'cl2', 'cl3'],
  soil:       ['cl4', 'cl5'],
  organic:    ['cl6', 'cl7', 'cl8'],
  inspection: ['cl9', 'cl10', 'cl11', 'cl12'],
};
const TOTAL_ITEMS = Object.values(CHECKLIST_SECTIONS).flat().length;

function updateChecklist() {
  let checkedCount = 0;
  const allIds = Object.values(CHECKLIST_SECTIONS).flat();

  // Update statuses
  allIds.forEach(id => {
    const cb = document.getElementById(id);
    const statusEl = document.getElementById('status-' + id);
    const label = cb ? cb.closest('.check-item') : null;
    if (!cb || !statusEl) return;
    if (cb.checked) {
      checkedCount++;
      statusEl.textContent = 'Done';
      statusEl.classList.add('done');
      if (label) label.classList.add('is-checked');
    } else {
      statusEl.textContent = 'Pending';
      statusEl.classList.remove('done');
      if (label) label.classList.remove('is-checked');
    }
  });

  // Update section badges
  Object.entries(CHECKLIST_SECTIONS).forEach(([key, ids]) => {
    const badge = document.getElementById('badge-' + key);
    if (!badge) return;
    const checked = ids.filter(id => document.getElementById(id)?.checked).length;
    badge.textContent = `${checked}/${ids.length}`;
    badge.style.background = checked === ids.length ? 'var(--green-500)' : 'var(--green-100)';
    badge.style.color = checked === ids.length ? '#fff' : 'var(--green-700)';
  });

  const pct = Math.round((checkedCount / TOTAL_ITEMS) * 100);
  const pctEl = document.getElementById('checklistPct');
  const barEl = document.getElementById('checklistBar');
  const countEl = document.getElementById('checklistCounts');

  if (pctEl) pctEl.textContent = pct + '%';
  if (barEl) barEl.style.width = pct + '%';
  if (countEl) countEl.innerHTML = `<span>✅ ${checkedCount} Completed</span><span>⏳ ${TOTAL_ITEMS - checkedCount} Pending</span>`;

  // Auto-save to localStorage
  if (window.__localDB) window.__localDB.saveChecklist();
  // Also sync Firebase if available
  if (typeof saveChecklistState === 'function' && typeof currentUser !== 'undefined' && currentUser) {
    saveChecklistState(currentUser.uid);
  }

  // Update dashboard progress circle
  updateDashboardProgress(pct, checkedCount);

  if (pct === 100) showToast('🎉 All checklist items complete! You\'re ready!', 'success');
}

function selectAll(state) {
  const allIds = Object.values(CHECKLIST_SECTIONS).flat();
  allIds.forEach(id => {
    const cb = document.getElementById(id);
    if (cb) cb.checked = state;
  });
  updateChecklist();
  showToast(state ? 'All items marked complete' : 'Checklist reset', state ? 'success' : 'info');
}

/* =============================================
   DOCUMENTS PAGE
   ============================================= */
let uploadedCount = 4;
const totalDocs = 7;

function updateDocStats() {
  const pct = Math.round((uploadedCount / totalDocs) * 100);
  const el = document.getElementById('docUploaded');
  const barEl = document.getElementById('docBar');
  const pctEl = document.getElementById('docPct');
  if (el) el.textContent = uploadedCount;
  if (barEl) barEl.style.width = pct + '%';
  if (pctEl) pctEl.textContent = pct + '%';
}

const docData = {
  1: { icon: '📄', name: 'Land Ownership Document', file: 'land_deed_ramesh.pdf', size: '1.2 MB', date: 'Feb 5, 2026', type: 'PDF' },
  2: { icon: '🗺️', name: 'Farm Map', file: 'farm_map_v2.jpg', size: '3.8 MB', date: 'Feb 10, 2026', type: 'JPG Image' },
  3: { icon: '🧪', name: 'Soil Test Report', file: 'soil_test_2026.pdf', size: '0.9 MB', date: 'Mar 2, 2026', type: 'PDF' },
  4: { icon: '🌱', name: 'Organic Input Records', file: 'input_records_jan_jun.xlsx', size: '0.4 MB', date: 'Jun 30, 2026', type: 'Excel' },
};

function previewDoc(id) {
  const doc = docData[id];
  if (!doc) return;
  document.getElementById('modalTitle').textContent = doc.name;
  document.getElementById('modalBody').innerHTML = `
    <div class="doc-preview-info">
      <span class="doc-preview-icon">${doc.icon}</span>
      <h4>${doc.name}</h4>
      <p style="color:var(--gray-500);font-size:0.88rem;">File preview not available in prototype mode</p>
      <div class="doc-meta">
        <div class="doc-meta-item"><label>File Name</label><span>${doc.file}</span></div>
        <div class="doc-meta-item"><label>File Size</label><span>${doc.size}</span></div>
        <div class="doc-meta-item"><label>Uploaded On</label><span>${doc.date}</span></div>
        <div class="doc-meta-item"><label>File Type</label><span>${doc.type}</span></div>
      </div>
    </div>`;
  document.getElementById('docModal').classList.add('open');
}

function closeModal() {
  document.getElementById('docModal').classList.remove('open');
}

function deleteDoc(id) {
  const card = document.getElementById('doc-' + id);
  if (!card) return;
  card.style.opacity = '0';
  card.style.transform = 'scale(.95)';
  card.style.transition = 'all .3s ease';
  setTimeout(() => {
    card.classList.remove('uploaded');
    card.classList.add('pending');
    card.style.opacity = '1';
    card.style.transform = '';
    card.querySelector('.doc-actions').innerHTML = `
      <span class="doc-status status-pending">⏳ Pending</span>
      <div class="doc-btns">
        <button class="doc-btn doc-upload-btn" onclick="uploadDoc(${id})">📤 Upload</button>
      </div>`;
    card.querySelector('.doc-file-name').textContent = '⚠️ Removed — re-upload required';
    card.querySelector('.doc-file-name').classList.add('doc-pending-text');
    uploadedCount = Math.max(0, uploadedCount - 1);
    updateDocStats();
    showToast('Document removed. Please re-upload.', 'warning');
  }, 300);
}

function uploadDoc(id) {
  const card = document.getElementById('doc-' + id);
  if (!card) return;
  // Simulate upload animation
  const btn = card.querySelector('.doc-upload-btn');
  if (btn) {
    btn.textContent = '⏳ Uploading...';
    btn.disabled = true;
  }
  setTimeout(() => {
    card.classList.remove('pending');
    card.classList.add('uploaded');
    card.querySelector('.doc-actions').innerHTML = `
      <span class="doc-status status-uploaded">✅ Uploaded</span>
      <div class="doc-btns">
        <button class="doc-btn doc-view" onclick="previewDoc(${id})">👁 View</button>
        <button class="doc-btn doc-delete" onclick="deleteDoc(${id})">🗑</button>
      </div>`;
    const fileName = card.querySelector('.doc-file-name');
    fileName.textContent = 'document_' + id + '_uploaded.pdf';
    fileName.classList.remove('doc-pending-text');
    uploadedCount = Math.min(totalDocs, uploadedCount + 1);
    updateDocStats();
    showToast('Document uploaded successfully!', 'success');
  }, 1500);
}

function handleFileSelect(event) {
  const file = event.target.files[0];
  if (!file) return;
  const dropzone = document.getElementById('uploadDropzone');
  dropzone.innerHTML = `
    <span class="dropzone-icon">📄</span>
    <p style="color:var(--green-700);font-weight:700">${file.name}</p>
    <small style="color:var(--gray-500)">${(file.size / 1024).toFixed(1)} KB — Ready to upload</small>`;
}

function submitNewDoc() {
  const name = document.getElementById('newDocName')?.value?.trim();
  const fileInput = document.getElementById('fileInput');
  if (!name) { showToast('Please enter a document name', 'error'); return; }
  // Simulate upload
  showToast('Uploading "' + name + '"...', 'info');
  setTimeout(() => {
    showToast('"' + name + '" uploaded successfully!', 'success');
    if (document.getElementById('newDocName')) document.getElementById('newDocName').value = '';
    const dropzone = document.getElementById('uploadDropzone');
    if (dropzone) dropzone.innerHTML = `
      <span class="dropzone-icon">☁️</span>
      <p>Click to browse or drag and drop your file here</p>
      <small>Supports PDF, JPG, PNG, XLSX — Max 10MB</small>
      <input type="file" id="fileInput" style="display:none" onchange="handleFileSelect(event)" />`;
  }, 1800);
}

/* =============================================
   COST CALCULATOR
   ============================================= */
const costMatrix = {
  application: { small: 2000, medium: 4500, large: 8000, xlarge: 14000 },
  certification: {
    npop: { small: 5000, medium: 9000, large: 16000, xlarge: 28000 },
    pgs:  { small: 800,  medium: 1500, large: 3000,  xlarge: 5000  },
    usda: { small: 18000, medium: 32000, large: 55000, xlarge: 90000 },
    eu:   { small: 22000, medium: 38000, large: 65000, xlarge: 110000 },
  },
  inspection: { base: 3500 }, // per inspection
  govt: { small: 500, medium: 1000, large: 2000, xlarge: 3500 },
};

function calculateCost() {
  const size = document.getElementById('farmSize')?.value || 'medium';
  const cert = document.getElementById('certType')?.value || 'npop';
  const inspections = parseInt(document.getElementById('inspectionReq')?.value || 1);
  const fast = document.getElementById('urgencyFee')?.value === 'fast';
  const addon1 = document.getElementById('addon1')?.checked ? 2000 : 0;
  const addon2 = document.getElementById('addon2')?.checked ? 3500 : 0;
  const addon3 = document.getElementById('addon3')?.checked ? 1500 : 0;

  const appFee = costMatrix.application[size];
  const certFee = costMatrix.certification[cert][size];
  const inspFee = costMatrix.inspection.base * inspections;
  const govtFee = costMatrix.govt[size];
  const addons = addon1 + addon2 + addon3;

  let subtotal = appFee + certFee + inspFee + govtFee + addons;
  const fastSurcharge = fast ? Math.round(subtotal * 0.30) : 0;
  const total = subtotal + fastSurcharge;

  const items = [
    { label: '📋 Application Fee', amount: appFee },
    { label: '🏆 Certification Fee (' + cert.toUpperCase() + ')', amount: certFee },
    { label: '🔍 Inspection Fee (' + inspections + (inspections > 1 ? ' visits' : ' visit') + ')', amount: inspFee },
    { label: '🏛️ Government / Admin Fees', amount: govtFee },
  ];
  if (addon1 > 0) items.push({ label: '📋 Document Review Service', amount: addon1 });
  if (addon2 > 0) items.push({ label: '📞 Consultant Support', amount: addon2 });
  if (addon3 > 0) items.push({ label: '📚 Training Workshop', amount: addon3 });
  if (fastSurcharge > 0) items.push({ label: '⚡ Fast Track Surcharge (+30%)', amount: fastSurcharge });

  const costItemsEl = document.getElementById('costItems');
  const totalEl = document.getElementById('totalCost');

  if (costItemsEl) {
    costItemsEl.innerHTML = items.map(item => `
      <div class="cost-item">
        <span class="cost-item-label">${item.label}</span>
        <span class="cost-item-amount">Rs. ${item.amount.toLocaleString('en-IN')}</span>
      </div>`).join('');
  }
  if (totalEl) {
    totalEl.textContent = 'Rs. ' + total.toLocaleString('en-IN');
    totalEl.style.animation = 'none';
    requestAnimationFrame(() => { totalEl.style.animation = ''; });
  }
}

/* =============================================
   INSPECTION PAGE
   ============================================= */
const INSP_TOTAL = 12;
function updateInspectionProgress() {
  let checked = 0;
  for (let i = 1; i <= INSP_TOTAL; i++) {
    if (document.getElementById('insp' + i)?.checked) checked++;
  }
  const pct = Math.round((checked / INSP_TOTAL) * 100);
  const pctEl = document.getElementById('inspectionPct');
  const barEl = document.getElementById('inspectionBar');
  if (pctEl) pctEl.textContent = pct + '%';
  if (barEl) barEl.style.width = pct + '%';
  if (pct === 100) showToast('🎉 You\'re 100% ready for inspection!', 'success');
}

/* =============================================
   REMINDERS PAGE
   ============================================= */
let customReminderCount = 0;

function snoozeReminder(remId) {
  const card = document.getElementById(remId);
  if (!card) return;
  card.style.opacity = '0.5';
  card.style.transform = 'scale(.97)';
  card.style.transition = 'all .3s ease';
  setTimeout(() => { card.style.opacity = '1'; card.style.transform = ''; }, 300);
  showToast('Reminder snoozed for 7 days', 'info');
}

function addReminder() {
  const title = document.getElementById('remTitle')?.value?.trim();
  const date  = document.getElementById('remDate')?.value;
  const note  = document.getElementById('remNote')?.value?.trim();

  if (!title) { showToast('Please enter a reminder title', 'error'); return; }
  if (!date)  { showToast('Please select a due date', 'error'); return; }

  const dateObj     = new Date(date);
  const today       = new Date();
  const diffDays    = Math.ceil((dateObj - today) / (1000 * 60 * 60 * 24));
  const formattedDate = dateObj.toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });

  // Save to localStorage and get entry with ID
  let remId = 'rem_' + Date.now();
  if (window.__localDB) {
    const entry = window.__localDB.addReminder({ title, date, note });
    remId = entry.id;
  }

  const html = `
    <div class="card reminder-card info" id="${remId}">
      <div class="reminder-badge badge-info">🔵 Custom</div>
      <div class="reminder-icon">📌</div>
      <div class="reminder-body">
        <h3>${title}</h3>
        <p>${note || 'Custom reminder added by you'}</p>
        <div class="reminder-date"><span>📅 Due Date:</span> <strong>${formattedDate}</strong></div>
        <div class="reminder-countdown">${diffDays > 0 ? '⏳ ' + diffDays + ' days remaining' : '⚠️ Overdue!'}</div>
      </div>
      <div class="reminder-actions">
        <button class="btn btn-sm btn-outline" onclick="removeLocalReminder('${remId}', this)">🗑 Remove</button>
      </div>
    </div>`;

  const container = document.getElementById('customRemindersContainer');
  if (container) container.insertAdjacentHTML('beforeend', html);

  // Clear form
  document.getElementById('remTitle').value = '';
  document.getElementById('remDate').value  = '';
  if (document.getElementById('remNote')) document.getElementById('remNote').value = '';

  showToast('Reminder added: "' + title + '"', 'success');
}

/* =============================================
   DASHBOARD LIVE PROGRESS
   ============================================= */
function updateDashboardProgress(pct, checkedCount) {
  const progressPct = document.getElementById('progressPct');
  if (progressPct) progressPct.textContent = pct + '%';

  const circle = document.getElementById('progressCircle');
  if (circle) {
    const circumference = 2 * Math.PI * 52;
    circle.style.strokeDasharray  = circumference;
    circle.style.strokeDashoffset = circumference - (circumference * pct / 100);
  }
}

/* =============================================
   INIT
   ============================================= */
document.addEventListener('DOMContentLoaded', () => {
  // Init dashboard circle
  const circle = document.getElementById('progressCircle');
  if (circle) {
    const circumference = 2 * Math.PI * 52; // 326.7
    const pct = 0.70;
    circle.style.strokeDasharray = circumference;
    circle.style.strokeDashoffset = circumference - (circumference * pct);
    // Add gradient
    const svg = circle.closest('svg');
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    defs.innerHTML = `<linearGradient id="greenGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#22c55e"/>
      <stop offset="100%" stop-color="#4ade80"/>
    </linearGradient>`;
    svg.prepend(defs);
    circle.setAttribute('stroke', 'url(#greenGrad)');
  }

  // Init calculator
  calculateCost();

  // Animate stats on landing page load
  setTimeout(animateStats, 300);

  // Keyboard close modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });

  // Drag and drop support
  const dropzone = document.getElementById('uploadDropzone');
  if (dropzone) {
    dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.style.borderColor = 'var(--green-500)'; dropzone.style.background = 'var(--green-50)'; });
    dropzone.addEventListener('dragleave', () => { dropzone.style.borderColor = ''; dropzone.style.background = ''; });
    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.style.borderColor = '';
      dropzone.style.background = '';
      const file = e.dataTransfer.files[0];
      if (file) {
        dropzone.innerHTML = `
          <span class="dropzone-icon">📄</span>
          <p style="color:var(--green-700);font-weight:700">${file.name}</p>
          <small style="color:var(--gray-500)">${(file.size / 1024).toFixed(1)} KB — Ready to upload</small>`;
      }
    });
  }
});
