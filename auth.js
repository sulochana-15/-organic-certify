/* =============================================
   auth.js — OrganicCertify Firebase Auth
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
  const signinTab = document.getElementById('signinTab');
  const signupTab = document.getElementById('signupTab');

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
    'auth/user-not-found': '❌ No account found with this email.',
    'auth/wrong-password': '❌ Incorrect password. Try again.',
    'auth/email-already-in-use': '❌ This email is already registered. Sign in instead.',
    'auth/weak-password': '❌ Password must be at least 6 characters.',
    'auth/invalid-email': '❌ Please enter a valid email address.',
    'auth/popup-closed-by-user': 'ℹ️ Sign-in popup was closed.',
    'auth/network-request-failed': '❌ Network error. Check your connection.',
    'auth/too-many-requests': '⚠️ Too many attempts. Try again later.',
    'auth/invalid-credential': '❌ Incorrect email or password.',
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
  if (!isFirebaseReady()) {
    showAuthError('signinError', '⚠️ Firebase not configured yet. See firebase-config.js setup instructions.');
    return;
  }
  const email = document.getElementById('signinEmail').value.trim();
  const password = document.getElementById('signinPassword').value;

  if (!email || !password) {
    showAuthError('signinError', '❌ Please enter your email and password.');
    return;
  }

  setAuthLoading('signinBtn', true);
  try {
    await auth.signInWithEmailAndPassword(email, password);
    closeAuthModal();
    showToast('👋 Welcome back!', 'success');
  } catch (err) {
    showAuthError('signinError', parseFirebaseError(err.code));
  } finally {
    setAuthLoading('signinBtn', false);
  }
}

/* ── Email / Password Sign Up ── */
async function signUpWithEmail() {
  if (!isFirebaseReady()) {
    showAuthError('signupError', '⚠️ Firebase not configured yet. See firebase-config.js setup instructions.');
    return;
  }
  const name = document.getElementById('signupName').value.trim();
  const email = document.getElementById('signupEmail').value.trim();
  const password = document.getElementById('signupPassword').value;

  if (!name) { showAuthError('signupError', '❌ Please enter your full name.'); return; }
  if (!email) { showAuthError('signupError', '❌ Please enter your email.'); return; }
  if (!password) { showAuthError('signupError', '❌ Please enter a password.'); return; }

  setAuthLoading('signupBtn', true);
  try {
    const cred = await auth.createUserWithEmailAndPassword(email, password);
    await cred.user.updateProfile({ displayName: name });

    // Create user profile in Firestore
    await saveUserProfile(cred.user.uid, {
      name,
      email,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });

    closeAuthModal();
    showToast(`🎉 Welcome, ${name}! Your account is ready.`, 'success');
  } catch (err) {
    showAuthError('signupError', parseFirebaseError(err.code));
  } finally {
    setAuthLoading('signupBtn', false);
  }
}

/* ── Google Sign In ── */
async function signInWithGoogle() {
  if (!isFirebaseReady()) {
    showToast('⚠️ Firebase not configured yet.', 'warning');
    return;
  }
  try {
    const result = await auth.signInWithPopup(googleProvider);
    const user = result.user;
    // Create profile if first time
    const ref = db.collection('users').doc(user.uid);
    const snap = await ref.get();
    if (!snap.exists) {
      await ref.set({
        name: user.displayName,
        email: user.email,
        photoURL: user.photoURL,
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
  if (!isFirebaseReady()) return;
  try {
    await auth.signOut();
    currentUser = null;
    showToast('👋 Signed out successfully.', 'info');
    // Reset to local state
    updateNavbarAuthState(null);
  } catch (err) {
    showToast('Error signing out.', 'error');
  }
}

/* ── Update Navbar based on auth state ── */
function updateNavbarAuthState(user) {
  const signInBtn = document.getElementById('navSignInBtn');
  const userSection = document.getElementById('navUserSection');
  const userName = document.getElementById('navUserName');
  const userAvatar = document.getElementById('navUserAvatar');
  const syncBanner = document.getElementById('syncBanner');

  if (user) {
    if (signInBtn) signInBtn.style.display = 'none';
    if (userSection) userSection.style.display = 'flex';
    if (userName) userName.textContent = user.displayName || user.email.split('@')[0];
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
    if (signInBtn) signInBtn.style.display = 'flex';
    if (userSection) userSection.style.display = 'none';
    if (syncBanner) syncBanner.style.display = isFirebaseReady() ? 'flex' : 'none';
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

/* ── Auth State Listener ── */
if (isFirebaseReady()) {
  auth.onAuthStateChanged(async (user) => {
    currentUser = user;
    updateNavbarAuthState(user);

    if (user) {
      // Load user's saved data
      await loadAndApplyChecklistState(user.uid);
      await loadAndApplyReminders(user.uid);
      await loadAndApplyDocuments(user.uid);
    }
  });
} else {
  // Not configured — show sync banner
  document.addEventListener('DOMContentLoaded', () => {
    const syncBanner = document.getElementById('syncBanner');
    if (syncBanner) syncBanner.style.display = 'none'; // hide until configured
  });
}
