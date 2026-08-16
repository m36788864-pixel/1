/* =========================================================
   DELEF FEST GOPASS - Frontend
   ตอนนี้ข้อมูลงานคอนเสิร์ตทั้งหมดมาจาก Backend จริง (Express API)
   ไม่ใช่ localStorage อีกต่อไป -> แอดมินเพิ่ม/แก้/ลบงานแล้ว
   ทุกคนที่เข้าเว็บ (คนละเครื่อง คนละเบราว์เซอร์) จะเห็นข้อมูลเดียวกัน
   ========================================================= */

const API_BASE = "/api";

/* ---------- ตัวช่วยทั่วไป ---------- */
function money(n) { return Number(n || 0).toLocaleString("th-TH") + " บาท"; }
function dateTH(v) {
  if (!v) return "-";
  return new Date(v + "T00:00:00").toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" });
}
function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[m]));
}
function poster(e, cls = "") {
  return e.image
    ? `<img class="${cls}" src="${esc(e.image)}" alt="${esc(e.name)}">`
    : `<div class="poster-fallback ${cls}">${esc(e.name)}</div>`;
}

/* ---------- Toast แจ้งเตือนสวย ๆ แทน alert() ---------- */
function toast(message, type = "success") {
  let host = document.getElementById("toastHost");
  if (!host) {
    host = document.createElement("div");
    host.id = "toastHost";
    host.className = "toast-host";
    document.body.appendChild(host);
  }
  const el = document.createElement("div");
  el.className = `toast toast-${type}`;
  const icon = type === "error" ? "fa-circle-exclamation" : type === "info" ? "fa-circle-info" : "fa-circle-check";
  el.innerHTML = `<i class="fa-solid ${icon}"></i><span>${esc(message)}</span>`;
  host.appendChild(el);
  requestAnimationFrame(() => el.classList.add("show"));
  setTimeout(() => { el.classList.remove("show"); setTimeout(() => el.remove(), 250); }, 3200);
}

/* ---------- เรียก API ---------- */
async function apiFetch(path, options = {}) {
  const res = await fetch(API_BASE + path, {
    ...options,
    headers: { ...(options.headers || {}) },
  });
  let data = null;
  try { data = await res.json(); } catch { /* no body */ }
  if (!res.ok) {
    const message = (data && data.message) || `เกิดข้อผิดพลาด (${res.status})`;
    const err = new Error(message);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

async function fetchEvents() { return apiFetch("/events"); }
async function fetchEvent(id) { return apiFetch(`/events/${encodeURIComponent(id)}`); }

/* ---------- การ์ดงาน ---------- */
function card(e) {
  return `<article class="event-card"><div class="poster">${poster(e)}<span class="badge">${esc(e.status)}</span></div><div class="card-body"><h3>${esc(e.name)}</h3><p><i class="fa-regular fa-calendar"></i>${dateTH(e.date)} · ${esc(e.time)} น.</p><p><i class="fa-solid fa-location-dot"></i>${esc(e.venue)}</p><div class="price">เริ่มต้น ${money(e.regular)}</div><a class="btn red full" href="event.html?id=${encodeURIComponent(e.id)}">ดูรายละเอียด <i class="fa-solid fa-arrow-right"></i></a></div></article>`;
}

function skeletonCards(n = 4) {
  return Array.from({ length: n }).map(() => `<div class="event-card skeleton"><div class="poster"></div><div class="card-body"><div class="sk-line w60"></div><div class="sk-line w40"></div><div class="sk-line w80"></div></div></div>`).join("");
}

/* ---------- หน้าแรก ---------- */
async function renderHome() {
  const el = document.getElementById("homeEvents");
  if (!el) return;
  el.innerHTML = skeletonCards(4);
  try {
    const list = (await fetchEvents()).filter(e => e.status === "เปิดขาย");
    el.innerHTML = list.length ? list.map(card).join("") : `<div class="empty"><i class="fa-regular fa-calendar-xmark"></i>ยังไม่มีงานที่เปิดขาย</div>`;
  } catch (err) {
    el.innerHTML = `<div class="empty error"><i class="fa-solid fa-triangle-exclamation"></i>โหลดข้อมูลไม่สำเร็จ: ${esc(err.message)}</div>`;
  }
}

/* ---------- หน้ารายการทั้งหมด (มีค้นหา) ---------- */
async function renderEvents() {
  const el = document.getElementById("eventList"), input = document.getElementById("search");
  if (!el) return;
  el.innerHTML = skeletonCards(6);
  let all = [];
  try {
    all = await fetchEvents();
  } catch (err) {
    el.innerHTML = `<div class="empty error"><i class="fa-solid fa-triangle-exclamation"></i>โหลดข้อมูลไม่สำเร็จ: ${esc(err.message)}</div>`;
    return;
  }
  function draw() {
    const q = (input?.value || "").toLowerCase();
    const list = all.filter(e => (e.name + " " + e.venue).toLowerCase().includes(q));
    el.innerHTML = list.length ? list.map(card).join("") : `<div class="empty"><i class="fa-solid fa-magnifying-glass"></i>ไม่พบคอนเสิร์ต</div>`;
  }
  input?.addEventListener("input", draw);
  draw();
}

/* ---------- หน้ารายละเอียดงาน ---------- */
function currentEventId() { return new URLSearchParams(location.search).get("id"); }

async function renderDetail() {
  const el = document.getElementById("detail");
  if (!el) return;
  el.innerHTML = `<div class="loading-block"><i class="fa-solid fa-spinner fa-spin"></i> กำลังโหลด...</div>`;
  const id = currentEventId();
  try {
    const e = id ? await fetchEvent(id) : (await fetchEvents())[0];
    if (!e) { el.innerHTML = "<div class='empty'>ไม่พบงาน</div>"; return; }
    window.currentEvent = e;
    el.innerHTML = `<div class="detail"><div class="detail-poster">${poster(e)}</div><div><span class="kicker">${esc(e.status)}</span><h1>${esc(e.name)}</h1><div class="info-line"><i class="fa-regular fa-calendar"></i>${dateTH(e.date)}</div><div class="info-line"><i class="fa-regular fa-clock"></i>${esc(e.time)} น.</div><div class="info-line"><i class="fa-solid fa-location-dot"></i>${esc(e.venue)}</div><h2 class="mt">รายละเอียดงาน</h2><p>เตรียมพบกับประสบการณ์คอนเสิร์ต DELEF FEST ผ่านระบบ GOPASS เลือกประเภทบัตรและเข้าสู่คิวได้จากหน้านี้</p><div class="ticket-types"><div><b>VIP</b><strong>${money(e.vip)}</strong></div><div><b>ธรรมดา (REGULAR)</b><strong>${money(e.regular)}</strong></div></div>${e.status === "เปิดขาย" ? `<a class="btn red full" href="queue.html?id=${encodeURIComponent(e.id)}">กดบัตร <i class="fa-solid fa-ticket"></i></a>` : `<button class="btn disabled full" disabled>${esc(e.status)}</button>`}</div></div>`;
  } catch (err) {
    el.innerHTML = `<div class="empty error"><i class="fa-solid fa-triangle-exclamation"></i>${esc(err.message)}</div>`;
  }
}

/* ---------- หน้าเลือกบัตร ---------- */
async function renderSeat() {
  const el = document.getElementById("seatPage");
  if (!el) return;

  el.innerHTML = `<div class="loading-block"><i class="fa-solid fa-spinner fa-spin"></i> กำลังโหลด...</div>`;

  const id = currentEventId();
  let e;

  try {
    e = id ? await fetchEvent(id) : (await fetchEvents())[0];
  } catch (err) {
    el.innerHTML = `<div class="empty error">${esc(err.message)}</div>`;
    return;
  }

  if (!e) {
    el.innerHTML = `<div class="empty">ไม่พบงาน</div>`;
    return;
  }

  const savedType = sessionStorage.getItem("ticketType") || "";
  const savedQty = Math.max(1, Math.min(10, Number(sessionStorage.getItem("ticketQty") || 1)));
  const eventImage = e.image ? `<img src="${esc(e.image)}" alt="${esc(e.name)}">` : `<div class="ticket-event-image-fallback"><i class="fa-solid fa-music"></i></div>`;

  el.innerHTML = `
    <div class="ticket-platform">
      <div class="ticket-stepper" aria-label="ขั้นตอนการซื้อบัตร">
        <div class="ticket-step active"><span>01</span><div><b>เลือกบัตร</b><small>ประเภทและจำนวน</small></div></div>
        <div class="ticket-step-line"></div>
        <div class="ticket-step"><span>02</span><div><b>ตรวจสอบ</b><small>ข้อมูลการสั่งซื้อ</small></div></div>
        <div class="ticket-step-line"></div>
        <div class="ticket-step"><span>03</span><div><b>เสร็จสิ้น</b><small>รับรายการของคุณ</small></div></div>
      </div>

      <section class="ticket-event-summary">
        <div class="ticket-event-thumb">${eventImage}</div>
        <div class="ticket-event-copy">
          <span class="ticket-eyebrow">DELEF FEST GOPASS</span>
          <h1>${esc(e.name)}</h1>
          <div class="ticket-event-meta">
            <span><i class="fa-regular fa-calendar"></i>${dateTH(e.date)}</span>
            <span><i class="fa-regular fa-clock"></i>${esc(e.time)} น.</span>
            <span><i class="fa-solid fa-location-dot"></i>${esc(e.venue)}</span>
          </div>
        </div>
        <div class="ticket-hold"><i class="fa-solid fa-shield-halved"></i><span>สิทธิ์ของคุณถูกสำรองไว้</span><b id="timer">10:00</b></div>
      </section>

      <div class="ticket-select-layout">
        <section class="ticket-main-panel">
          <div class="panel-heading">
            <div><span class="ticket-eyebrow">TICKET TYPE</span><h2>เลือกประเภทบัตร</h2><p>เลือกได้ 1 ประเภทต่อรายการ และสูงสุด 10 ใบ</p></div>
            <span class="secure-badge"><i class="fa-solid fa-lock"></i> Secure Checkout</span>
          </div>

          <div class="ticket-choice-grid">
            <button type="button" class="ticket-choice regular ${savedType === "REGULAR" ? "selected" : ""}" onclick="pickTicket('REGULAR', ${Number(e.regular) || 0})">
              <span class="choice-check"><i class="fa-solid fa-check"></i></span>
              <div class="choice-top"><div class="choice-icon"><i class="fa-solid fa-ticket"></i></div><span class="choice-tag">STANDARD</span></div>
              <div class="choice-copy"><h3>บัตรธรรมดา</h3><p>สิทธิ์เข้างานตามมาตรฐาน</p></div>
              <div class="choice-benefits"><span><i class="fa-solid fa-check"></i> เข้างานตามรอบที่กำหนด</span><span><i class="fa-solid fa-check"></i> รับบัตรอิเล็กทรอนิกส์</span></div>
              <div class="choice-footer"><div><small>ราคา / ใบ</small><strong>${money(e.regular)}</strong></div><span class="choice-radio"></span></div>
            </button>

            <button type="button" class="ticket-choice vip ${savedType === "VIP" ? "selected" : ""}" onclick="pickTicket('VIP', ${Number(e.vip) || 0})">
              <span class="choice-check"><i class="fa-solid fa-check"></i></span>
              <div class="choice-top"><div class="choice-icon"><i class="fa-solid fa-crown"></i></div><span class="choice-tag">VIP EXPERIENCE</span></div>
              <div class="choice-copy"><h3>บัตร VIP</h3><p>สิทธิ์พิเศษสำหรับผู้ถือบัตร VIP</p></div>
              <div class="choice-benefits"><span><i class="fa-solid fa-check"></i> สิทธิ์เข้าพื้นที่ VIP</span><span><i class="fa-solid fa-check"></i> รับสิทธิ์พิเศษตามงาน</span></div>
              <div class="choice-footer"><div><small>ราคา / ใบ</small><strong>${money(e.vip)}</strong></div><span class="choice-radio"></span></div>
            </button>
          </div>

          <div class="ticket-policy"><i class="fa-solid fa-circle-info"></i><span>กรุณาตรวจสอบประเภทบัตรและจำนวนก่อนดำเนินการต่อ ระบบจะถือสิทธิ์ไว้ชั่วคราวระหว่างการสั่งซื้อ</span></div>
        </section>

        <aside class="ticket-side-panel">
          <div class="side-heading"><span class="ticket-eyebrow">YOUR ORDER</span><h2>สรุปรายการ</h2></div>
          <div class="order-line"><span>ประเภทบัตร</span><b id="summaryType">ยังไม่ได้เลือก</b></div>
          <div class="order-line"><span>ราคาต่อใบ</span><b id="summaryPrice">-</b></div>
          <div class="order-qty">
            <div><span>จำนวนบัตร</span><small>สูงสุด 10 ใบ</small></div>
            <div class="qty-control"><button type="button" onclick="changeQty(-1)" aria-label="ลดจำนวน"><i class="fa-solid fa-minus"></i></button><strong id="qtyValue">${savedQty}</strong><button type="button" onclick="changeQty(1)" aria-label="เพิ่มจำนวน"><i class="fa-solid fa-plus"></i></button></div>
          </div>
          <div class="order-total"><span>ยอดรวม</span><strong id="total">0 บาท</strong></div>
          <button class="btn red full checkout-btn" type="button" onclick="checkout(event)"><span>ดำเนินการต่อ</span><i class="fa-solid fa-arrow-right"></i></button>
          <p class="checkout-note"><i class="fa-solid fa-lock"></i> ข้อมูลการสั่งซื้อจะถูกส่งผ่านระบบของ DELEF FEST GOPASS</p>
        </aside>
      </div>
    </div>`;

  window.currentEvent = e;
  window.selectedType = savedType;
  window.selectedPrice = savedType === "VIP" ? Number(e.vip) : savedType === "REGULAR" ? Number(e.regular) : 0;
  window.ticketQty = savedQty;

  updateTicketSelection();

  let sec = 600;
  const timerId = setInterval(() => {
    sec--;
    if (sec < 0) sec = 0;
    const t = document.getElementById("timer");
    if (t) t.textContent = `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}`;
    if (sec === 0) clearInterval(timerId);
  }, 1000);
}

function pickTicket(type, price) {
  window.selectedType = type;
  window.selectedPrice = Number(price) || 0;
  sessionStorage.setItem("ticketType", type);
  updateTicketSelection();
}

function changeQty(delta) {
  const current = Number(window.ticketQty || 1);
  window.ticketQty = Math.max(1, Math.min(10, current + Number(delta || 0)));
  sessionStorage.setItem("ticketQty", window.ticketQty);
  updateTicketSelection();
}

function updateTicketSelection() {
  document.querySelectorAll(".ticket-choice").forEach(card => card.classList.remove("selected"));
  const selected = document.querySelector(`.ticket-choice.${window.selectedType === "VIP" ? "vip" : "regular"}`);
  if (selected && window.selectedType) selected.classList.add("selected");

  const q = Number(window.ticketQty || 1);
  const qtyEl = document.getElementById("qtyValue");
  if (qtyEl) qtyEl.textContent = q;

  const typeEl = document.getElementById("summaryType");
  const priceEl = document.getElementById("summaryPrice");
  const totalEl = document.getElementById("total");
  if (typeEl) typeEl.textContent = window.selectedType === "VIP" ? "บัตร VIP" : window.selectedType === "REGULAR" ? "บัตรธรรมดา" : "ยังไม่ได้เลือก";
  if (priceEl) priceEl.textContent = window.selectedPrice ? money(window.selectedPrice) : "-";
  if (totalEl) totalEl.textContent = money((window.selectedPrice || 0) * q);
}

async function checkout(ev) {
  if (!window.selectedType) {
    toast("กรุณาเลือกประเภทบัตร VIP หรือ ธรรมดา", "error");
    return;
  }

  const q = Number(window.ticketQty || 1);
  const btn = ev?.target?.closest?.("button");

  try {
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> กำลังตรวจสอบ...`;
    }

    const order = await apiFetch("/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventId: window.currentEvent.id,
        ticketType: window.selectedType,
        qty: q,
        price: window.selectedPrice,
      }),
    });

    sessionStorage.setItem("ticketQty", q);
    sessionStorage.setItem("ticketPrice", window.selectedPrice);
    sessionStorage.setItem("ticketType", window.selectedType);
    sessionStorage.setItem("delef_checkout", JSON.stringify({
      eventId: window.currentEvent.id,
      ticketType: window.selectedType,
      qty: q,
      price: window.selectedPrice,
      orderId: order.id,
    }));

    location.href = `buyer.html?id=${encodeURIComponent(window.currentEvent.id)}&order=${encodeURIComponent(order.id)}`;
  } catch (err) {
    toast(err.message, "error");
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `ดำเนินการต่อ <i class="fa-solid fa-arrow-right"></i>`;
    }
  }
}

/* =========================================================
   ADMIN
   ========================================================= */
const ADMIN_TOKEN_KEY = "delef_admin_token";
const ADMIN_USER_KEY = "delef_admin_user";

function adminToken() { return localStorage.getItem(ADMIN_TOKEN_KEY); }
function adminUsername() { return localStorage.getItem(ADMIN_USER_KEY) || ""; }
function isAdminLoggedIn() { return !!adminToken(); }

function adminLogoutLocal() {
  localStorage.removeItem(ADMIN_TOKEN_KEY);
  localStorage.removeItem(ADMIN_USER_KEY);
}

async function adminApiFetch(path, options = {}) {
  try {
    return await apiFetch(path, {
      ...options,
      headers: { ...(options.headers || {}), Authorization: `Bearer ${adminToken()}` },
    });
  } catch (err) {
    if (err.status === 401) {
      adminLogoutLocal();
      toast("เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่", "error");
      setTimeout(() => { location.href = "login.html"; }, 900);
    }
    throw err;
  }
}

/** เรียกในทุกหน้า admin (ยกเว้น login) เพื่อกันคนที่ไม่ได้ login เข้ามาดูข้อมูล */
function adminGuard() {
  if (!isAdminLoggedIn()) {
    location.href = "login.html";
    return false;
  }
  const nameEl = document.getElementById("adminUsername");
  if (nameEl) nameEl.textContent = adminUsername();
  return true;
}

async function adminLogout() {
  try { await adminApiFetch("/admin/logout", { method: "POST" }); } catch { /* ignore */ }
  adminLogoutLocal();
  location.href = "login.html";
}

/* ---------- Admin: Login ---------- */
function initAdminLogin() {
  if (isAdminLoggedIn()) { location.href = "events.html"; return; }
  const form = document.getElementById("adminLoginForm");
  if (!form) return;
  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const btn = form.querySelector("button[type=submit]");
    const originalLabel = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> กำลังเข้าสู่ระบบ...`;
    try {
      const data = await apiFetch("/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: form.username.value.trim(), password: form.password.value }),
      });
      localStorage.setItem(ADMIN_TOKEN_KEY, data.token);
      localStorage.setItem(ADMIN_USER_KEY, data.username);
      toast(`ยินดีต้อนรับ ${data.username}`, "success");
      setTimeout(() => { location.href = "events.html"; }, 400);
    } catch (err) {
      toast(err.message, "error");
      btn.disabled = false;
      btn.innerHTML = originalLabel;
    }
  });
}

/* ---------- Admin: จัดการคอนเสิร์ต ---------- */
function initAdmin() {
  if (!adminGuard()) return;

  const rows = document.getElementById("rows"), form = document.getElementById("form"),
    file = document.getElementById("imageFile"), preview = document.getElementById("preview"),
    modal = document.getElementById("modal");
  let editing = null, currentImage = "", pendingFile = null, cachedList = [];

  async function draw() {
    rows.innerHTML = `<tr><td colspan="6" class="table-loading"><i class="fa-solid fa-spinner fa-spin"></i> กำลังโหลดข้อมูล...</td></tr>`;
    try {
      cachedList = await adminApiFetch("/events");
    } catch (err) {
      rows.innerHTML = `<tr><td colspan="6" class="table-loading error">โหลดข้อมูลไม่สำเร็จ: ${esc(err.message)}</td></tr>`;
      return;
    }
    if (!cachedList.length) {
      rows.innerHTML = `<tr><td colspan="6" class="table-loading">ยังไม่มีงานในระบบ กด "เพิ่มงานใหม่" เพื่อเริ่มต้น</td></tr>`;
      return;
    }
    rows.innerHTML = cachedList.map(e => `<tr><td>${e.image ? `<img class="thumb" src="${esc(e.image)}">` : "-"}</td><td><b>${esc(e.name)}</b></td><td>${dateTH(e.date)}<br>${esc(e.time)} · ${esc(e.venue)}</td><td>Regular ${money(e.regular)}<br>VIP ${money(e.vip)}</td><td><span class="status status-${statusClass(e.status)}">${esc(e.status)}</span></td><td><button class="icon-btn" onclick="editAdmin('${e.id}')" title="แก้ไข"><i class="fa-solid fa-pen"></i></button><button class="icon-btn danger" onclick="deleteAdmin('${e.id}')" title="ลบ"><i class="fa-solid fa-trash"></i></button></td></tr>`).join("");
  }

  function statusClass(s) { return s === "เปิดขาย" ? "open" : s === "เร็ว ๆ นี้" ? "soon" : "closed"; }

  window.openForm = () => {
    editing = null; currentImage = ""; pendingFile = null;
    form.reset(); preview.classList.add("hide");
    document.getElementById("formTitle").textContent = "เพิ่มคอนเสิร์ต";
    modal.classList.remove("hide");
  };
  window.closeForm = () => modal.classList.add("hide");

  window.deleteAdmin = async (id) => {
    if (!confirm("ลบงานนี้หรือไม่? การลบไม่สามารถย้อนกลับได้")) return;
    try {
      await adminApiFetch(`/events/${encodeURIComponent(id)}`, { method: "DELETE" });
      toast("ลบงานเรียบร้อย", "success");
      draw();
    } catch (err) { toast(err.message, "error"); }
  };

  window.editAdmin = (id) => {
    const e = cachedList.find(x => x.id === id);
    if (!e) return;
    editing = id; currentImage = e.image || ""; pendingFile = null;
    document.getElementById("formTitle").textContent = "แก้ไขคอนเสิร์ต";
    form.name.value = e.name; form.date.value = e.date; form.time.value = e.time;
    form.venue.value = e.venue; form.regular.value = e.regular; form.vip.value = e.vip; form.status.value = e.status;
    if (currentImage) { preview.src = currentImage; preview.classList.remove("hide"); } else { preview.classList.add("hide"); }
    modal.classList.remove("hide");
  };

  file.addEventListener("change", () => {
    const f = file.files[0];
    if (!f) return;
    pendingFile = f;
    const r = new FileReader();
    r.onload = () => { preview.src = r.result; preview.classList.remove("hide"); };
    r.readAsDataURL(f);
  });

  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const submitBtn = form.querySelector("button[type=submit]");
    const originalLabel = submitBtn.innerHTML;
    submitBtn.disabled = true;

    try {
      let imageUrl = currentImage;
      if (pendingFile) {
        submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> กำลังอัปโหลดรูป...`;
        const fd = new FormData();
        fd.append("poster", pendingFile);
        const uploadRes = await adminApiFetch("/upload", { method: "POST", body: fd });
        imageUrl = uploadRes.url;
      }

      submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> กำลังบันทึก...`;
      const payload = {
        name: form.name.value.trim(),
        date: form.date.value,
        time: form.time.value,
        venue: form.venue.value.trim(),
        regular: Number(form.regular.value),
        vip: Number(form.vip.value),
        status: form.status.value,
        image: imageUrl || "",
      };

      if (editing) {
        await adminApiFetch(`/events/${encodeURIComponent(editing)}`, {
          method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
        });
        toast("บันทึกการแก้ไขเรียบร้อย", "success");
      } else {
        await adminApiFetch("/events", {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
        });
        toast("เพิ่มงานใหม่เรียบร้อย พร้อมแสดงบนหน้าเว็บทันที", "success");
      }
      closeForm();
      draw();
    } catch (err) {
      toast(err.message, "error");
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalLabel;
    }
  });

  draw();
}

/* ---------- Admin: Dashboard ---------- */
async function initDashboard() {
  if (!adminGuard()) return;
  const statsEl = document.getElementById("statCards");
  const perEventEl = document.getElementById("perEventTable");
  const recentEl = document.getElementById("recentOrders");
  if (!statsEl) return;

  statsEl.innerHTML = Array.from({ length: 4 }).map(() => `<div class="stat-card skeleton"><div class="sk-line w40"></div><div class="sk-line w60"></div></div>`).join("");

  try {
    const s = await adminApiFetch("/admin/stats");
    statsEl.innerHTML = `
      <div class="stat-card"><i class="fa-solid fa-calendar-days"></i><div><small>งานทั้งหมด</small><b>${s.totalEvents}</b></div></div>
      <div class="stat-card"><i class="fa-solid fa-bolt"></i><div><small>เปิดขายอยู่</small><b>${s.onSale}</b></div></div>
      <div class="stat-card"><i class="fa-solid fa-ticket"></i><div><small>บัตรที่ถูกกด</small><b>${s.totalTickets.toLocaleString("th-TH")}</b></div></div>
      <div class="stat-card highlight"><i class="fa-solid fa-sack-dollar"></i><div><small>ยอดขายรวม</small><b>${money(s.totalRevenue)}</b></div></div>
    `;

    if (perEventEl) {
      perEventEl.innerHTML = s.perEvent.length
        ? s.perEvent.map(e => `<tr><td>${e.image ? `<img class="thumb" src="${esc(e.image)}">` : "-"}</td><td><b>${esc(e.name)}</b></td><td>${e.ticketsSold.toLocaleString("th-TH")} ใบ</td><td>${money(e.revenue)}</td></tr>`).join("")
        : `<tr><td colspan="4" class="table-loading">ยังไม่มีงานในระบบ</td></tr>`;
    }

    if (recentEl) {
      recentEl.innerHTML = s.recentOrders.length
        ? s.recentOrders.map(o => `<li><span>${esc(o.eventName)}</span><span class="muted">${esc(o.ticketType)} × ${o.qty}</span><b>${money(o.total)}</b></li>`).join("")
        : `<li class="muted">ยังไม่มีคำสั่งซื้อ</li>`;
    }
  } catch (err) {
    statsEl.innerHTML = `<div class="empty error"><i class="fa-solid fa-triangle-exclamation"></i>โหลดข้อมูลไม่สำเร็จ: ${esc(err.message)}</div>`;
  }
}
