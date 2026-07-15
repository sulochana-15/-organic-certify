/* =============================================
   db.js — OrganicCertify Firestore Operations
   ============================================= */

/* ════════════════════════════════════════════
   USER PROFILE
   ════════════════════════════════════════════ */

async function saveUserProfile(uid, data) {
  if (!isFirebaseReady()) return;
  try {
    await db.collection('users').doc(uid).set(data, { merge: true });
  } catch (err) {
    console.error('Error saving profile:', err);
  }
}

async function loadUserProfile(uid) {
  if (!isFirebaseReady()) return null;
  try {
    const snap = await db.collection('users').doc(uid).get();
    return snap.exists ? snap.data() : null;
  } catch (err) {
    console.error('Error loading profile:', err);
    return null;
  }
}

/* ════════════════════════════════════════════
   CHECKLIST
   ════════════════════════════════════════════ */

async function saveChecklistState(uid) {
  if (!isFirebaseReady() || !uid) return;
  try {
    const allIds = ['cl1','cl2','cl3','cl4','cl5','cl6','cl7','cl8','cl9','cl10','cl11','cl12'];
    const state  = {};
    allIds.forEach(id => {
      const cb = document.getElementById(id);
      if (cb) state[id] = cb.checked;
    });
    await db.collection('users').doc(uid)
      .collection('data').doc('checklist')
      .set({ items: state, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
  } catch (err) {
    console.error('Error saving checklist:', err);
  }
}

async function loadAndApplyChecklistState(uid) {
  if (!isFirebaseReady() || !uid) return;
  try {
    const snap = await db.collection('users').doc(uid)
      .collection('data').doc('checklist').get();
    if (!snap.exists) return;
    const { items } = snap.data();
    Object.entries(items).forEach(([id, checked]) => {
      const cb = document.getElementById(id);
      if (cb) cb.checked = checked;
    });
    // Refresh checklist UI
    if (typeof updateChecklist === 'function') updateChecklist();
    showToast('📋 Checklist loaded from cloud', 'info');
  } catch (err) {
    console.error('Error loading checklist:', err);
  }
}

/* ════════════════════════════════════════════
   REMINDERS
   ════════════════════════════════════════════ */

async function saveReminderToDb(uid, reminder) {
  if (!isFirebaseReady() || !uid) return null;
  try {
    const ref = await db.collection('users').doc(uid)
      .collection('reminders').add({
        ...reminder,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
    return ref.id;
  } catch (err) {
    console.error('Error saving reminder:', err);
    return null;
  }
}

async function deleteReminderFromDb(uid, docId) {
  if (!isFirebaseReady() || !uid || !docId) return;
  try {
    await db.collection('users').doc(uid)
      .collection('reminders').doc(docId).delete();
  } catch (err) {
    console.error('Error deleting reminder:', err);
  }
}

async function loadAndApplyReminders(uid) {
  if (!isFirebaseReady() || !uid) return;
  try {
    const snap = await db.collection('users').doc(uid)
      .collection('reminders')
      .orderBy('createdAt', 'desc')
      .get();

    if (snap.empty) return;

    const container = document.getElementById('customRemindersContainer');
    if (!container) return;

    // Clear existing custom reminders
    container.innerHTML = '';

    snap.forEach(doc => {
      const r = doc.data();
      const dateObj     = r.date ? new Date(r.date) : null;
      const today       = new Date();
      const diffDays    = dateObj
        ? Math.ceil((dateObj - today) / (1000 * 60 * 60 * 24))
        : 0;
      const formattedDate = dateObj
        ? dateObj.toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })
        : 'No date';

      const remId = 'db-rem-' + doc.id;
      const html = `
        <div class="card reminder-card info" id="${remId}">
          <div class="reminder-badge badge-info">🔵 Custom</div>
          <div class="reminder-icon">📌</div>
          <div class="reminder-body">
            <h3>${r.title}</h3>
            <p>${r.note || 'Custom reminder'}</p>
            <div class="reminder-date"><span>📅 Due Date:</span> <strong>${formattedDate}</strong></div>
            <div class="reminder-countdown">${diffDays > 0 ? '⏳ ' + diffDays + ' days remaining' : '⚠️ Overdue!'}</div>
          </div>
          <div class="reminder-actions">
            <button class="btn btn-sm btn-outline"
              onclick="removeCloudReminder('${doc.id}','${remId}')">🗑 Remove</button>
          </div>
        </div>`;
      container.insertAdjacentHTML('beforeend', html);
    });

    showToast(`🔔 ${snap.size} reminder(s) loaded from cloud`, 'info');
  } catch (err) {
    console.error('Error loading reminders:', err);
  }
}

function removeCloudReminder(docId, elId) {
  if (currentUser) deleteReminderFromDb(currentUser.uid, docId);
  const el = document.getElementById(elId);
  if (el) {
    el.style.opacity = '0';
    el.style.transform = 'scale(.95)';
    el.style.transition = 'all .3s ease';
    setTimeout(() => el.remove(), 300);
  }
  showToast('Reminder removed', 'info');
}

/* ════════════════════════════════════════════
   DOCUMENTS (metadata)
   ════════════════════════════════════════════ */

async function saveDocumentMeta(uid, docData) {
  if (!isFirebaseReady() || !uid) return null;
  try {
    const ref = await db.collection('users').doc(uid)
      .collection('documents').add({
        ...docData,
        uploadedAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
    return ref.id;
  } catch (err) {
    console.error('Error saving document meta:', err);
    return null;
  }
}

async function deleteDocumentMeta(uid, docId) {
  if (!isFirebaseReady() || !uid || !docId) return;
  try {
    await db.collection('users').doc(uid)
      .collection('documents').doc(docId).delete();
  } catch (err) {
    console.error('Error deleting document:', err);
  }
}

async function loadAndApplyDocuments(uid) {
  if (!isFirebaseReady() || !uid) return;
  try {
    const snap = await db.collection('users').doc(uid)
      .collection('documents')
      .orderBy('uploadedAt', 'desc')
      .get();

    if (snap.empty) return;

    const list = document.getElementById('cloudDocsList');
    if (!list) return;

    list.innerHTML = '';
    snap.forEach(doc => {
      const d = doc.data();
      const uploadDate = d.uploadedAt?.toDate?.()
        ? d.uploadedAt.toDate().toLocaleDateString('en-IN')
        : 'Unknown';
      list.innerHTML += `
        <div class="cloud-doc-item">
          <div class="cloud-doc-info">
            <span class="cloud-doc-icon">📄</span>
            <div>
              <strong>${d.name}</strong>
              <span>${d.fileName} · ${d.size} · ${uploadDate}</span>
            </div>
          </div>
          <div class="cloud-doc-actions">
            ${d.downloadURL
              ? `<a class="doc-btn doc-view" href="${d.downloadURL}" target="_blank">👁 View</a>`
              : ''}
            <button class="doc-btn doc-delete"
              onclick="removeCloudDoc('${doc.id}', '${d.storagePath || ''}', this.closest('.cloud-doc-item'))">🗑</button>
          </div>
        </div>`;
    });

    document.getElementById('cloudDocsSection')?.style.setProperty('display', 'block');
    showToast(`📁 ${snap.size} document(s) loaded from cloud`, 'info');
  } catch (err) {
    console.error('Error loading documents:', err);
  }
}

/* ════════════════════════════════════════════
   STORAGE — Real File Upload
   ════════════════════════════════════════════ */

async function uploadFileToStorage(uid, file, docName) {
  if (!isFirebaseReady() || !uid) return null;

  const ext       = file.name.split('.').pop();
  const timestamp = Date.now();
  const path      = `users/${uid}/documents/${timestamp}_${file.name}`;
  const ref       = storage.ref(path);

  try {
    // Show progress
    const progressBar = document.getElementById('uploadProgressBar');
    const progressWrap = document.getElementById('uploadProgressWrap');
    if (progressWrap) progressWrap.style.display = 'block';

    const uploadTask = ref.put(file);

    return new Promise((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          if (progressBar) progressBar.style.width = pct + '%';
          if (progressBar) progressBar.textContent = pct + '%';
        },
        (err) => {
          if (progressWrap) progressWrap.style.display = 'none';
          showToast('❌ Upload failed: ' + err.message, 'error');
          reject(err);
        },
        async () => {
          const downloadURL = await uploadTask.snapshot.ref.getDownloadURL();
          if (progressWrap) progressWrap.style.display = 'none';

          // Save metadata to Firestore
          const docId = await saveDocumentMeta(uid, {
            name:        docName || file.name,
            fileName:    file.name,
            size:        (file.size / 1024).toFixed(1) + ' KB',
            type:        file.type,
            storagePath: path,
            downloadURL,
          });

          resolve({ downloadURL, docId, path });
        }
      );
    });
  } catch (err) {
    console.error('Upload error:', err);
    return null;
  }
}

async function removeCloudDoc(docId, storagePath, el) {
  if (!currentUser) return;
  // Delete from Firestore
  await deleteDocumentMeta(currentUser.uid, docId);
  // Delete from Storage if path exists
  if (storagePath && isFirebaseReady()) {
    try { await storage.ref(storagePath).delete(); } catch (_) {}
  }
  if (el) {
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 300);
  }
  showToast('Document removed from cloud', 'info');
}
