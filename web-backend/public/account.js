import { auth } from "./firebase-config.js";
import {
  onAuthStateChanged, signOut, EmailAuthProvider, reauthenticateWithCredential,
  updatePassword, deleteUser
} from "https://www.gstatic.com/firebasejs/10.7.2/firebase-auth.js";
import { getApp } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-app.js";
import {
  initializeFirestore, collection, collectionGroup, query, where, orderBy,
  onSnapshot, getDocs, doc, getDoc, deleteDoc, writeBatch
} from "https://www.gstatic.com/firebasejs/10.7.2/firebase-firestore.js";

const db = initializeFirestore(getApp(), { experimentalAutoDetectLongPolling: true });
const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
const timeAgo = ms => {
  const m = Math.max(0, Math.floor((Date.now() - ms) / 60000));
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  if (m < 1440) return `${Math.floor(m/60)} hr ago`;
  const d = Math.floor(m/1440);
  return `${d} ${d === 1 ? "day" : "days"} ago`;
};

let currentUser = null;
let unsubVotes = null, unsubSubs = null, unsubTopics = null, unsubComments = null;
let votes = {}, subscriptions = {}, topics = {}, comments = {};
let notificationState = {};

const titles = {
  profile: ["Your profile", "See your activity, votes, notifications, and comments."],
  topics: ["Your topics", "Topics you have posted in the community."],
  settings: ["Settings", "Manage your password, account, and help."]
};

function setTab(tab, updateUrl = true) {
  if (!titles[tab]) tab = "profile";
  document.querySelectorAll(".account-tab").forEach(b => b.classList.toggle("active", b.dataset.tab === tab));
  $("profile-section").hidden = tab !== "profile";
  $("topics-section").hidden = tab !== "topics";
  $("settings-section").hidden = tab !== "settings";
  $("page-title").textContent = titles[tab][0];
  $("page-subtitle").textContent = titles[tab][1];
  if (updateUrl) history.replaceState(null, "", `account.html?tab=${tab}`);
}
document.querySelector(".account-nav").addEventListener("click", e => {
  const b = e.target.closest(".account-tab");
  if (b) setTab(b.dataset.tab);
});

document.addEventListener("click", e => {
  const menu = $("user-menu");
  if (menu && !menu.contains(e.target)) menu.removeAttribute("open");
});
document.addEventListener("keydown", e => {
  if (e.key === "Escape") $("user-menu").removeAttribute("open");
});

function topicTime(t) {
  return t.createdAt?.toMillis ? t.createdAt.toMillis() : (t.createdAt || Date.now());
}
function topicRow(id, t, extra = "") {
  return `<a class="account-row" href="topic.html?id=${encodeURIComponent(id)}">
    <div class="account-row-main"><strong>${esc(t.title)}</strong><small><span class="tag">${esc(t.cat || "General")}</span> by ${esc(t.author || "you")} · ${timeAgo(topicTime(t))}</small></div>
    <div class="account-row-meta">${t.replies || 0}<br>replies${extra}</div>
  </a>`;
}

function renderVotes() {
  const up = Object.entries(votes).filter(([,v]) => v.dir === 1);
  const down = Object.entries(votes).filter(([,v]) => v.dir === -1);
  $("stat-votes").textContent = up.length + down.length;
  const render = arr => arr.length
    ? arr.map(([id]) => topics[id] ? topicRow(id, topics[id]) : "").join("") || `<div class="empty">Those topics are no longer available.</div>`
    : `<div class="empty">No topics here yet.</div>`;
  $("upvoted-list").innerHTML = render(up);
  $("downvoted-list").innerHTML = render(down);
}

function renderMyTopics() {
  const list = Object.entries(topics).filter(([,t]) => t.authorUid === currentUser?.uid)
    .sort((a,b) => topicTime(b[1]) - topicTime(a[1]));
  $("topics-count").textContent = `${list.length} ${list.length === 1 ? "topic" : "topics"}`;
  $("stat-topics").textContent = list.length;
  $("my-topics").innerHTML = list.length ? list.map(([id,t]) => topicRow(id,t)).join("") : `<div class="empty">You haven't posted any topics yet.</div>`;
}

function renderComments() {
  const list = Object.entries(comments).sort((a,b) => {
    const aa = a[1].createdAt?.toMillis ? a[1].createdAt.toMillis() : (a[1].createdAt || 0);
    const bb = b[1].createdAt?.toMillis ? b[1].createdAt.toMillis() : (b[1].createdAt || 0);
    return bb-aa;
  });
  $("stat-comments").textContent = list.length;
  $("comments-list").innerHTML = list.length ? list.map(([id,c]) => {
    const created = c.createdAt?.toMillis ? c.createdAt.toMillis() : (c.createdAt || Date.now());
    return `<a class="account-row" href="topic.html?id=${encodeURIComponent(c.topicId)}">
      <div class="account-row-main"><strong>${esc(c.topicTitle || "Topic")}</strong><div class="comment-text">${esc(c.text || (c.deleted ? "This reply was deleted." : "Image reply"))}</div><small>${timeAgo(created)}</small></div>
      <div class="account-row-meta">Comment</div>
    </a>`;
  }).join("") : `<div class="empty">You haven't commented on any topics yet.</div>`;
}

function renderNotifications() {
  const items = [];
  let unread = 0;
  let dirty = false;
  for (const [id, sub] of Object.entries(subscriptions)) {
    const t = topics[id];
    if (!t) continue;
    const replies = t.replies || 0;
    if (notificationState[id] === undefined) { notificationState[id] = replies; dirty = true; }
    const fresh = Math.max(0, replies - notificationState[id]);
    if (fresh > 0) { unread += fresh; items.push({id,t,fresh}); }
  }
  if (dirty) saveNotificationState();
  $("account-notifications").innerHTML = items.length
    ? items.sort((a,b) => topicTime(b.t)-topicTime(a.t)).map(n =>
      `<a class="note account-note unread" href="topic.html?id=${encodeURIComponent(n.id)}" data-notif-id="${esc(n.id)}"><strong>${esc(n.t.title)}</strong><small>${n.fresh} new ${n.fresh === 1 ? "reply" : "replies"}</small></a>`
    ).join("")
    : `<div class="empty">No new notifications.</div>`;
  $("mark-notifications-read").hidden = unread === 0;
}

function saveNotificationState() {
  try { localStorage.setItem("forum-seen-replies:" + currentUser.uid, JSON.stringify(notificationState)); } catch (_) {}
}
function loadNotificationState() {
  try { notificationState = JSON.parse(localStorage.getItem("forum-seen-replies:" + currentUser.uid)) || {}; } catch (_) { notificationState = {}; }
}

function clearListeners() {
  [unsubVotes,unsubSubs,unsubTopics,unsubComments].forEach(fn => { if (fn) fn(); });
  unsubVotes = unsubSubs = unsubTopics = unsubComments = null;
}

onAuthStateChanged(auth, user => {
  if (!user) { window.location.href = "login.html"; return; }
  currentUser = user;
  const name = user.displayName || user.email.split("@")[0];
  $("username").textContent = name;
  $("user-email").textContent = user.email;
  $("profile-email").textContent = user.email;
  $("avatar").textContent = name[0].toUpperCase();
  $("large-avatar").textContent = name[0].toUpperCase();
  loadNotificationState();
  clearListeners();

  unsubVotes = onSnapshot(query(collection(db,"votes"), where("uid","==",user.uid)), snap => {
    votes = {};
    snap.forEach(d => { const v=d.data(); votes[v.topicId]=v; });
    renderVotes();
  }, err => console.error(err));

  unsubSubs = onSnapshot(query(collection(db,"subscriptions"), where("uid","==",user.uid)), snap => {
    subscriptions = {};
    snap.forEach(d => { const x=d.data(); subscriptions[x.topicId]=true; });
    renderNotifications();
  }, err => console.error(err));

  // Upvoted/downvoted topics and your own topics can all be resolved from the existing topics collection.
  unsubTopics = onSnapshot(collection(db,"topics"), snap => {
    topics = {};
    snap.forEach(d => topics[d.id] = d.data());
    renderVotes(); renderMyTopics(); renderNotifications();
  }, err => console.error(err));

  // Replies live inside each topic. Read them from the topic subcollections
  // instead of using a collection-group query, so this works with the same
  // Firestore permissions already used by the topic page.
  unsubComments = onSnapshot(collection(db,"topics"), async topicSnap => {
    comments = {};
    const topicDocs = topicSnap.docs;
    try {
      await Promise.all(topicDocs.map(async topicDoc => {
        const topicId = topicDoc.id;
        const topicTitle = topicDoc.data().title || "Topic";
        const repliesSnap = await getDocs(
          query(collection(db,"topics",topicId,"replies"), where("authorUid","==",user.uid))
        );
        repliesSnap.forEach(replyDoc => {
          comments[replyDoc.id + "_" + topicId] = {
            ...replyDoc.data(),
            topicId,
            topicTitle
          };
        });
      }));
      renderComments();
    } catch (err) {
      console.error("Couldn't load profile comments:", err);
      $("comments-list").innerHTML = `<div class="empty">Comments couldn't be loaded. Please try again.</div>`;
    }
  }, err => {
    console.error(err);
    $("comments-list").innerHTML = `<div class="empty">Comments couldn't be loaded. Please try again.</div>`;
  });
});

$("account-notifications").addEventListener("click", e => {
  const a = e.target.closest("[data-notif-id]");
  if (!a) return;
  const id = a.dataset.notifId;
  const t = topics[id];
  if (t) notificationState[id] = t.replies || 0;
  saveNotificationState();
  renderNotifications();
});
$("mark-notifications-read").addEventListener("click", () => {
  Object.keys(subscriptions).forEach(id => { if (topics[id]) notificationState[id] = topics[id].replies || 0; });
  saveNotificationState(); renderNotifications();
});

$("password-form").addEventListener("submit", async e => {
  e.preventDefault();
  const msg = $("password-message"), btn = $("password-btn");
  msg.className = "form-message"; msg.textContent = "";
  const current = $("current-password").value, next = $("new-password").value, confirm = $("confirm-password").value;
  if (next !== confirm) { msg.textContent = "The new passwords do not match."; return; }
  if (next.length < 6) { msg.textContent = "Your new password must be at least 6 characters."; return; }
  if (!currentUser.email) { msg.textContent = "Password changes are only available for email/password accounts."; return; }
  btn.disabled = true; btn.textContent = "Changing...";
  try {
    await reauthenticateWithCredential(currentUser, EmailAuthProvider.credential(currentUser.email,current));
    await updatePassword(currentUser,next);
    msg.className = "form-message ok"; msg.textContent = "Password changed successfully.";
    e.target.reset();
  } catch (err) {
    console.error(err);
    msg.textContent = err.code === "auth/wrong-password" || err.code === "auth/invalid-credential" ? "Current password is incorrect." :
      err.code === "auth/too-many-requests" ? "Too many attempts. Please try again later." : "Couldn't change the password. Try again.";
  } finally { btn.disabled=false; btn.textContent="Change password"; }
});

$("delete-form").addEventListener("submit", async e => {
  e.preventDefault();
  const msg = $("delete-message"), btn = $("delete-btn");
  msg.className="form-message"; msg.textContent="";
  if (!confirm("Delete your account permanently? This cannot be undone.")) return;
  if (!currentUser.email) { msg.textContent="Password-based account deletion is only available for email/password accounts."; return; }
  btn.disabled=true; btn.textContent="Deleting...";
  try {
    await reauthenticateWithCredential(currentUser, EmailAuthProvider.credential(currentUser.email,$("delete-password").value));
    // Remove the user's vote/subscription documents first. Existing Firestore rules can then enforce ownership.
    const [voteSnap, subSnap, topicSnap] = await Promise.all([
      getDocs(query(collection(db,"votes"), where("uid","==",currentUser.uid))),
      getDocs(query(collection(db,"subscriptions"), where("uid","==",currentUser.uid))),
      getDocs(query(collection(db,"topics"), where("authorUid","==",currentUser.uid)))
    ]);
    const batch = writeBatch(db);
    voteSnap.forEach(d => batch.delete(d.ref));
    subSnap.forEach(d => batch.delete(d.ref));
    topicSnap.forEach(d => batch.delete(d.ref));
    await batch.commit();
    await deleteUser(currentUser);
    window.location.href="index.html";
  } catch (err) {
    console.error(err);
    msg.textContent = err.code === "auth/wrong-password" || err.code === "auth/invalid-credential"
      ? "Current password is incorrect." : "Couldn't delete the account. Check your Firestore permissions and try again.";
    btn.disabled=false; btn.textContent="Delete account";
  }
});

const initialTab = new URLSearchParams(location.search).get("tab") || "profile";
setTab(initialTab, false);
