// fb-init.js — Firebase initialization + data helpers
// Uses Firebase Compat SDK for inline JS compatibility

const FB_CONFIG = {
  apiKey: "AIzaSyCt4BYsJUixbmOM6D8F-VhOnefaNHKfa3c",
  authDomain: "portfolio-db-cb379.firebaseapp.com",
  projectId: "portfolio-db-cb379",
  storageBucket: "portfolio-db-cb379.firebasestorage.app",
  messagingSenderId: "652684207863",
  appId: "1:652684207863:web:0b1de0395e96ba4c9a15f2"
};

let _fbApp = null, _fbDb = null;
function initFB() {
  if (_fbDb) return _fbDb;
  _fbApp = firebase.initializeApp(FB_CONFIG);
  _fbDb = firebase.firestore();
  return _fbDb;
}

// ══════ READ HELPERS (for frontend) ══════

// Load full site data (reconstructs same shape as old content.json)
async function loadSiteData() {
  var db = initFB();
  // 1. Load config
  var configSnap = await db.collection('config').doc('site').get();
  var config = configSnap.exists ? configSnap.data() : {};
  // 2. Load all items
  var itemsSnap = await db.collection('items').orderBy('createdAt', 'desc').get();
  var items = [];
  itemsSnap.forEach(function(d) { var it = d.data(); it.id = d.id; items.push(it); });
  // 3. Reconstruct pages with items
  var pagesMeta = config.pages_meta || {};
  var pages = {};
  Object.keys(pagesMeta).forEach(function(slug) {
    pages[slug] = Object.assign({}, pagesMeta[slug], {
      items: items.filter(function(it) { return it.pageSlug === slug; })
    });
  });
  // 4. Return combined data
  return {
    site: config.site || {},
    banner: config.banner || {},
    personal: config.personal || { skills: [], experience: [], education: [] },
    contact: config.contact || {},
    footer: config.footer || {},
    nav: config.nav || {},
    menus: config.menus || [],
    pages: pages
  };
}

// Load single item by ID
async function loadItemById(itemId) {
  var db = initFB();
  var snap = await db.collection('items').doc(itemId).get();
  if (!snap.exists) return null;
  var d = snap.data(); d.id = snap.id; return d;
}

// Load items by page slug
async function loadItemsBySlug(slug) {
  var db = initFB();
  var snap = await db.collection('items').where('pageSlug', '==', slug).orderBy('createdAt', 'desc').get();
  var items = [];
  snap.forEach(function(d) { var it = d.data(); it.id = d.id; items.push(it); });
  return items;
}

// ══════ WRITE HELPERS (for admin) ══════

async function saveConfig(data) {
  var db = initFB();
  await db.collection('config').doc('site').set(data, { merge: true });
}

async function saveItem(item) {
  var db = initFB();
  var id = item.id;
  if (!item.createdAt) item.createdAt = firebase.firestore.Timestamp.now();
  item.updatedAt = firebase.firestore.Timestamp.now();
  if (id && id.length > 5) {
    await db.collection('items').doc(id).set(item);
    return id;
  } else {
    var ref = await db.collection('items').add(item);
    return ref.id;
  }
}

async function deleteItem(itemId) {
  var db = initFB();
  await db.collection('items').doc(itemId).delete();
}

// Messages
async function loadMessages() {
  var db = initFB();
  var snap = await db.collection('messages').orderBy('date', 'desc').get();
  var msgs = [];
  snap.forEach(function(d) { var m = d.data(); m._docId = d.id; msgs.push(m); });
  return msgs;
}

async function saveMessage(msg) {
  var db = initFB();
  msg.date = new Date().toISOString();
  await db.collection('messages').add(msg);
}

async function updateMessage(docId, data) {
  var db = initFB();
  await db.collection('messages').doc(docId).update(data);
}

async function deleteMessage(docId) {
  var db = initFB();
  await db.collection('messages').doc(docId).delete();
}

async function deleteAllMessages() {
  var db = initFB();
  var snap = await db.collection('messages').get();
  var batch = db.batch();
  snap.forEach(function(d) { batch.delete(d.ref); });
  await batch.commit();
}

// ══════ MIGRATION: import content.json → Firestore ══════
async function migrateFromJSON(jsonUrl) {
  var r = await fetch(jsonUrl + '?t=' + Date.now());
  if (!r.ok) return false;
  var d = await r.json();
  var db = initFB();

  // Save config (everything except items)
  var pagesMeta = {};
  var allItems = [];
  Object.keys(d.pages || {}).forEach(function(slug) {
    var p = d.pages[slug];
    pagesMeta[slug] = { title: p.title, description: p.description || '', page_type: p.page_type };
    (p.items || []).forEach(function(item) {
      item.pageSlug = slug;
      item.pageType = p.page_type;
      item.createdAt = firebase.firestore.Timestamp.now();
      item.updatedAt = firebase.firestore.Timestamp.now();
      allItems.push(item);
    });
  });

  await db.collection('config').doc('site').set({
    site: d.site || {},
    banner: d.banner || {},
    personal: d.personal || { skills: [], experience: [], education: [] },
    contact: d.contact || {},
    footer: d.footer || {},
    nav: d.nav || {},
    menus: d.menus || [],
    pages_meta: pagesMeta
  });

  // Save items
  for (var i = 0; i < allItems.length; i++) {
    var item = allItems[i];
    var id = item.id || (Date.now().toString(36) + '_' + i);
    await db.collection('items').doc(id).set(item);
  }

  // Migrate messages
  try {
    var mr = await fetch('data/messages.json?t=' + Date.now());
    if (mr.ok) {
      var msgs = await mr.json();
      for (var j = 0; j < msgs.length; j++) {
        await db.collection('messages').add(msgs[j]);
      }
    }
  } catch(e) {}

  return true;
}
