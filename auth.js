/* =============================================
   auth.js — OrganicCertify
   Works with LOCAL storage (no Firebase needed).
   If Firebase is configured, it upgrades to cloud.
   ============================================= */

/* ── Current user state ── */
let currentUser = null;

/* ── Open / Close Auth Modal ── */
function openAuthModal(tab = 'signin') {
  document.getElementById('authOverlay').classList.add('open');
  switchAuthTab(tab);
  setTimeout(() => {
    const firstInput = document.querySelector('#authOverlay input');
    if (firstInput) firstInput.focus();
  }, 300);
}

function closeAuthModal() {
  document.getElementById('authOverlay').classList.remove('open');
  clearAuthErrors();
}

/* ── Tab switching ── */
function switchAuthTab(tab) {
  const signinForm = document.getElementById('signinForm');
  const signupForm = document.getElementById('signupForm');
  const signinTab  = document.getElementById('signinTab');
  const signupTab  = document.getElementById('signupTab');

  if (tab === 'signin') {
    signinForm.classList.remove('hidden');
    signupForm.classList.add('hidden');
    signinTab.classList.add('active');
    signupTab.classList.remove('active');
  } else {
    signupForm.classList.remove('hidden');
    signinForm.classList.add('hidden');
    signupTab.classList.add('active');
    signinTab.classList.remove('active');
  }
  clearAuthErrors();
}

/* ── Error helpers ── */
function clearAuthErrors() {
  ['signinError', 'signupError'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.textContent = ''; el.style.display = 'none'; }
  });
}

function showAuthError(elementId, message) {
  const el = document.getElementById(elementId);
  if (el) { el.textContent = message; el.style.display = 'block'; }
}

function parseFirebaseError(code) {
  const msgs = {
    'auth/user-not-found':        '❌ No account found with this email.',
    'auth/wrong-password':        '❌ Incorrect password. Try again.',
    'auth/email-already-in-use':  '❌ This email is already registered. Sign in instead.',
    'auth/weak-password':         '❌ Password must be at least 6 characters.',
    'auth/invalid-email':         '❌ Please enter a valid email address.',
    'auth/popup-closed-by-user':  'ℹ️ Sign-in popup was closed.',
    'auth/network-request-failed':'❌ Network error. Check your connection.',
    'auth/too-many-requests':     '⚠️ Too many attempts. Try again later.',
    'auth/invalid-credential':    '❌ Incorrect email or password.',
  };
  return msgs[code] || '❌ Something went wrong. Please try again.';
}

/* ── Set loading state on button ── */
function setAuthLoading(btnId, loading) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  btn.disabled = loading;
  btn.dataset.original = btn.dataset.original || btn.textContent;
  btn.textContent = loading ? '⏳ Please wait...' : btn.dataset.original;
}

/* ── Email / Password Sign In ── */
async function signInWithEmail() {
  const email    = document.getElementById('signinEmail').value.trim();
  const password = document.getElementById('signinPassword').value;

  if (!email)    { showAuthError('signinError', '❌ Please enter your email.'); return; }
  if (!password) { showAuthError('signinError', '❌ Please enter your password.'); return; }

  setAuthLoading('signinBtn', true);

  try {
    // Try Firebase first if available
    if (isFirebaseReady()) {
      await auth.signInWithEmailAndPassword(email, password);
      closeAuthModal();
      showToast('👋 Welcome back!', 'success');
    } else {
      // Local sign in
      const result = window.__localAuth.signIn(email, password);
      if (!result.ok) {
        showAuthError('signinError', parseFirebaseError(result.error));
        return;
      }
      currentUser = result.user;
      window.__localAuth.saveSession(result.user);
      closeAuthModal();
      updateNavbarAuthState(currentUser);
      onUserLoggedIn(currentUser);
      showToast('👋 Welcome back, ' + currentUser.displayName + '!', 'success');
    }
  } catch (err) {
    showAuthError('signinError', parseFirebaseError(err.code));
  } finally {
    setAuthLoading('signinBtn', false);
  }
}

/* ── Email / Password Sign Up ── */
async function signUpWithEmail() {
  const name     = document.getElementById('signupName').value.trim();
  const email    = document.getElementById('signupEmail').value.trim();
  const password = document.getElementById('signupPassword').value;

  if (!name)     { showAuthError('signupError', '❌ Please enter your full name.'); return; }
  if (!email)    { showAuthError('signupError', '❌ Please enter your email.'); return; }
  if (!password) { showAuthError('signupError', '❌ Please enter a password.'); return; }
  if (password.length < 6) { showAuthError('signupError', '❌ Password must be at least 6 characters.'); return; }

  setAuthLoading('signupBtn', true);

  try {
    if (isFirebaseReady()) {
      const cred = await auth.createUserWithEmailAndPassword(email, password);
      await cred.user.updateProfile({ displayName: name });
      await saveUserProfile(cred.user.uid, {
        name, email,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
      closeAuthModal();
      showToast(`🎉 Welcome, ${name}! Your account is ready.`, 'success');
    } else {
      // Local registration
      const result = window.__localAuth.register(name, email, password);
      if (!result.ok) {
        showAuthError('signupError', parseFirebaseError(result.error));
        return;
      }
      currentUser = result.user;
      window.__localAuth.saveSession(result.user);
      window.__localDB.saveProfile({ name, email, uid: result.user.uid });
      closeAuthModal();
      updateNavbarAuthState(currentUser);
      onUserLoggedIn(currentUser);
      showToast(`🎉 Welcome, ${name}! Your account is ready.`, 'success');
    }
  } catch (err) {
    showAuthError('signupError', parseFirebaseError(err.code));
  } finally {
    setAuthLoading('signupBtn', false);
  }
}

/* ── Google Sign In (Firebase only) ── */
async function signInWithGoogle() {
  if (!isFirebaseReady()) {
    showToast('⚠️ Google Sign-In requires Firebase setup. Use email/password instead.', 'warning');
    return;
  }
  try {
    const result = await auth.signInWithPopup(googleProvider);
    const user   = result.user;
    const ref    = db.collection('users').doc(user.uid);
    const snap   = await ref.get();
    if (!snap.exists) {
      await ref.set({
        name:      user.displayName,
        email:     user.email,
        photoURL:  user.photoURL,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
    }
    closeAuthModal();
    showToast(`👋 Welcome, ${user.displayName}!`, 'success');
  } catch (err) {
    if (err.code !== 'auth/popup-closed-by-user') {
      showToast(parseFirebaseError(err.code), 'error');
    }
  }
}

/* ── Sign Out ── */
async function handleSignOut() {
  if (isFirebaseReady()) {
    try { await auth.signOut(); } catch {}
  }
  currentUser = null;
  window.__localAuth.clearSession();
  updateNavbarAuthState(null);
  showToast('👋 Signed out successfully.', 'info');
}

/* ── Update Navbar based on auth state ── */
function updateNavbarAuthState(user) {
  const signInBtn   = document.getElementById('navSignInBtn');
  const userSection = document.getElementById('navUserSection');
  const userName    = document.getElementById('navUserName');
  const userAvatar  = document.getElementById('navUserAvatar');
  const dropName    = document.getElementById('dropdownName');
  const dropEmail   = document.getElementById('dropdownEmail');
  const syncBanner  = document.getElementById('syncBanner');

  if (user) {
    if (signInBtn)   signInBtn.style.display   = 'none';
    if (userSection) userSection.style.display = 'flex';
    if (userName)    userName.textContent       = user.displayName || user.email.split('@')[0];
    if (dropName)    dropName.textContent       = user.displayName || 'Farmer';
    if (dropEmail)   dropEmail.textContent      = user.email || '';
    if (userAvatar) {
      if (user.photoURL) {
        userAvatar.innerHTML = `<img src="${user.photoURL}" alt="avatar" class="user-photo" />`;
      } else {
        const initials = (user.displayName || 'F').charAt(0).toUpperCase();
        userAvatar.textContent = initials;
      }
    }
    if (syncBanner) syncBanner.style.display = 'none';
  } else {
    if (signInBtn)   signInBtn.style.display   = 'flex';
    if (userSection) userSection.style.display = 'none';
    if (syncBanner)  syncBanner.style.display  = 'flex';
  }
}

/* ── Toggle user dropdown ── */
function toggleUserDropdown() {
  document.getElementById('userDropdown')?.classList.toggle('open');
}

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
  if (!e.target.closest('#navUserSection')) {
    document.getElementById('userDropdown')?.classList.remove('open');
  }
});

/* ── Called when user logs in ── */
function onUserLoggedIn(user) {
  // Load saved checklist from localStorage
  const loaded = window.__localDB.loadChecklist();
  if (loaded && typeof updateChecklist === 'function') updateChecklist();

  // Load saved reminders from localStorage
  const reminders = window.__localDB.getReminders();
  renderSavedReminders(reminders);
}

/* ── Render reminders from localStorage ── */
function renderSavedReminders(reminders) {
  if (!reminders || reminders.length === 0) return;
  const container = document.getElementById('customRemindersContainer');
  if (!container) return;
  container.innerHTML = '';

  reminders.forEach(rem => {
    const dateObj = new Date(rem.date);
    const today   = new Date();
    const diffDays = Math.ceil((dateObj - today) / (1000 * 60 * 60 * 24));
    const formatted = dateObj.toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });

    const html = `
      <div class="card reminder-card info" id="${rem.id}">
        <div class="reminder-badge badge-info">🔵 Custom</div>
        <div class="reminder-icon">📌</div>
        <div class="reminder-body">
          <h3>${rem.title}</h3>
          <p>${rem.note || 'Custom reminder'}</p>
          <div class="reminder-date"><span>📅 Due Date:</span> <strong>${formatted}</strong></div>
          <div class="reminder-countdown">${diffDays > 0 ? '⏳ ' + diffDays + ' days remaining' : '⚠️ Overdue!'}</div>
        </div>
        <div class="reminder-actions">
          <button class="btn btn-sm btn-outline" onclick="removeLocalReminder('${rem.id}', this)">🗑 Remove</button>
        </div>
      </div>`;
    container.insertAdjacentHTML('beforeend', html);
  });
}

function removeLocalReminder(id, btn) {
  // Remove from UI
  btn.closest('.reminder-card').remove();
  // Remove from localStorage
  const list = window.__localDB.getReminders().filter(r => r.id !== id);
  window.__localDB.saveReminders ? window.__localDB.saveReminders(list) : null;
  // Update via localSaveReminders directly
  try {
    const all = JSON.parse(localStorage.getItem('oc_reminders') || '[]');
    const updated = all.filter(r => r.id !== id);
    localStorage.setItem('oc_reminders', JSON.stringify(updated));
  } catch {}
  showToast('Reminder removed', 'info');
}

/* ── Firebase Auth State Listener (if available) ── */
if (isFirebaseReady()) {
  auth.onAuthStateChanged(async (user) => {
    currentUser = user;
    updateNavbarAuthState(user);

    if (user) {
      await loadAndApplyChecklistState(user.uid);
      await loadAndApplyReminders(user.uid);
      await loadAndApplyDocuments(user.uid);
    }
  });
} else {
  // Restore local session on page load
  document.addEventListener('DOMContentLoaded', () => {
    const session = window.__localAuth.getSession();
    if (session) {
      currentUser = session;
      updateNavbarAuthState(session);
      onUserLoggedIn(session);
    } else {
      // Show sync banner after 2s
      setTimeout(() => {
        const syncBanner = document.getElementById('syncBanner');
        if (syncBanner && !currentUser) syncBanner.style.display = 'flex';
      }, 2000);
    }
  });
}
