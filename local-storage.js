/* =============================================
   local-storage.js — OrganicCertify
   Full offline/local backend using localStorage.
   Works 100% without Firebase.
   ============================================= */

'use strict';

/* ════════════════════════════════════════
   STORAGE KEYS
   ════════════════════════════════════════ */
const LS = {
  USERS:      'oc_users',
  SESSION:    'oc_session',
  CHECKLIST:  'oc_checklist',
  REMINDERS:  'oc_reminders',
  DOCUMENTS:  'oc_documents',
  PROFILE:    'oc_profile',
};

/* ════════════════════════════════════════
   HELPERS
   ════════════════════════════════════════ */
function lsGet(key) {
  try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
}
function lsSet(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

/* ════════════════════════════════════════
   USER ACCOUNTS (local auth)
   ════════════════════════════════════════ */
function getAllUsers() { return lsGet(LS.USERS) || {}; }
function saveAllUsers(users) { lsSet(LS.USERS, users); }

function localRegister(name, email, password) {
  const users = getAllUsers();
  const key = email.toLowerCase().trim();
  if (users[key]) return { ok: false, error: 'auth/email-already-in-use' };
  const uid = 'local_' + Date.now() + '_' + Math.random().toString(36).slice(2);
  users[key] = { uid, name, email: key, password, createdAt: Date.now() };
  saveAllUsers(users);
  return { ok: true, user: { uid, displayName: name, email: key, photoURL: null } };
}

function localSignIn(email, password) {
  const users = getAllUsers();
  const key = email.toLowerCase().trim();
  const u = users[key];
  if (!u) return { ok: false, error: 'auth/user-not-found' };
  if (u.password !== password) return { ok: false, error: 'auth/wrong-password' };
  return { ok: true, user: { uid: u.uid, displayName: u.name, email: u.email, photoURL: null } };
}

function localSaveSession(user) {
  lsSet(LS.SESSION, user);
}
function localGetSession() {
  return lsGet(LS.SESSION);
}
function localClearSession() {
  localStorage.removeItem(LS.SESSION);
}

/* ════════════════════════════════════════
   CHECKLIST — localStorage
   ════════════════════════════════════════ */
function localSaveChecklist() {
  const ids = ['cl1','cl2','cl3','cl4','cl5','cl6','cl7','cl8','cl9','cl10','cl11','cl12'];
  const state = {};
  ids.forEach(id => {
    const cb = document.getElementById(id);
    if (cb) state[id] = cb.checked;
  });
  lsSet(LS.CHECKLIST, state);
}

function localLoadChecklist() {
  const state = lsGet(LS.CHECKLIST);
  if (!state) return false;
  Object.entries(state).forEach(([id, checked]) => {
    const cb = document.getElementById(id);
    if (cb) cb.checked = checked;
  });
  return true;
}

/* ════════════════════════════════════════
   REMINDERS — localStorage
   ════════════════════════════════════════ */
function localSaveReminders(list) { lsSet(LS.REMINDERS, list); }
function localGetReminders() { return lsGet(LS.REMINDERS) || []; }

function localAddReminder(reminder) {
  const list = localGetReminders();
  const entry = { ...reminder, id: 'rem_' + Date.now(), createdAt: Date.now() };
  list.push(entry);
  localSaveReminders(list);
  return entry;
}

/* ════════════════════════════════════════
   DOCUMENTS — localStorage
   ════════════════════════════════════════ */
function localSaveDocuments(docs) { lsSet(LS.DOCUMENTS, docs); }
function localGetDocuments() { return lsGet(LS.DOCUMENTS) || null; }

/* ════════════════════════════════════════
   PROFILE — localStorage
   ════════════════════════════════════════ */
function localSaveProfile(data) { lsSet(LS.PROFILE, data); }
function localGetProfile() { return lsGet(LS.PROFILE); }

/* ════════════════════════════════════════
   OVERRIDE AUTH.JS FUNCTIONS
   Intercept sign-in/sign-up if Firebase not ready
   ════════════════════════════════════════ */
window.__localAuth = {
  register: localRegister,
  signIn:   localSignIn,
  saveSession: localSaveSession,
  getSession:  localGetSession,
  clearSession: localClearSession,
};

/* ════════════════════════════════════════
   OVERRIDE DB.JS FUNCTIONS
   ════════════════════════════════════════ */
window.__localDB = {
  saveChecklist:  localSaveChecklist,
  loadChecklist:  localLoadChecklist,
  addReminder:    localAddReminder,
  getReminders:   localGetReminders,
  saveDocuments:  localSaveDocuments,
  getDocuments:   localGetDocuments,
  saveProfile:    localSaveProfile,
  getProfile:     localGetProfile,
};

console.log('✅ Local Storage backend ready (no Firebase needed).');
