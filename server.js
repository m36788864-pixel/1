const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const express = require("express");
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");

const JsonDb = require("./lib/jsonDb");
const { verifyLogin, createSession, destroySession, requireAuth } = require("./lib/auth");

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const UPLOAD_DIR = path.join(ROOT, "uploads");

if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const eventsDb = new JsonDb(path.join(ROOT, "data", "events.json"), []);
const ordersDb = new JsonDb(path.join(ROOT, "data", "orders.json"), []);

const app = express();
app.use(express.json({ limit: "2mb" }));

// ---------- อัปโหลดรูป Poster ----------
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || ".jpg";
    cb(null, `${uuidv4()}${ext}`);
  },
});
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_TYPES.has(file.mimetype)) {
      return cb(new Error("รองรับเฉพาะไฟล์รูปภาพ JPG, PNG, WEBP, GIF เท่านั้น"));
    }
    cb(null, true);
  },
});

app.post("/api/upload", requireAuth, (req, res) => {
  upload.single("poster")(req, res, (err) => {
    if (err) return res.status(400).json({ error: "upload_failed", message: err.message });
    if (!req.file) return res.status(400).json({ error: "no_file", message: "ไม่พบไฟล์รูปภาพ" });
    res.json({ url: `/uploads/${req.file.filename}` });
  });
});

app.use("/uploads", express.static(UPLOAD_DIR, { maxAge: "7d" }));

// ---------- Admin auth ----------
app.post("/api/admin/login", (req, res) => {
  const { username, password } = req.body || {};
  if (!verifyLogin(username, password)) {
    return res.status(401).json({ error: "invalid_credentials", message: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" });
  }
  const token = createSession(username);
  res.json({ token, username });
});

app.post("/api/admin/logout", requireAuth, (req, res) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  destroySession(token);
  res.json({ ok: true });
});

app.get("/api/admin/me", requireAuth, (req, res) => {
  res.json({ username: req.admin.username });
});

// ---------- Events: public read ----------
function validateEventPayload(body, { partial = false } = {}) {
  const errors = [];
  const clean = {};

  const str = (v) => (typeof v === "string" ? v.trim() : "");

  if (!partial || body.name !== undefined) {
    clean.name = str(body.name);
    if (!clean.name) errors.push("กรุณาระบุชื่อคอนเสิร์ต");
  }
  if (!partial || body.date !== undefined) {
    clean.date = str(body.date);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(clean.date)) errors.push("รูปแบบวันที่ไม่ถูกต้อง (YYYY-MM-DD)");
  }
  if (!partial || body.time !== undefined) {
    clean.time = str(body.time);
    if (!/^\d{2}:\d{2}$/.test(clean.time)) errors.push("รูปแบบเวลาไม่ถูกต้อง (HH:MM)");
  }
  if (!partial || body.venue !== undefined) {
    clean.venue = str(body.venue);
    if (!clean.venue) errors.push("กรุณาระบุสถานที่จัดงาน");
  }
  if (!partial || body.regular !== undefined) {
    clean.regular = Number(body.regular);
    if (!Number.isFinite(clean.regular) || clean.regular < 0) errors.push("ราคาบัตรธรรมดาไม่ถูกต้อง");
  }
  if (!partial || body.vip !== undefined) {
    clean.vip = Number(body.vip);
    if (!Number.isFinite(clean.vip) || clean.vip < 0) errors.push("ราคาบัตร VIP ไม่ถูกต้อง");
  }
  if (!partial || body.status !== undefined) {
    clean.status = str(body.status);
    if (!["เปิดขาย", "เร็ว ๆ นี้", "ปิดการขาย"].includes(clean.status)) {
      errors.push("สถานะไม่ถูกต้อง");
    }
  }
  if (body.image !== undefined) clean.image = str(body.image);

  return { errors, clean };
}

app.get("/api/health", (req, res) => res.json({ ok: true, service: "DELEF FEST GOPASS" }));

app.get("/api/events", (req, res) => {
  const list = eventsDb.read();
  res.json(list.sort((a, b) => (a.date > b.date ? 1 : -1)));
});

app.get("/api/events/:id", (req, res) => {
  const list = eventsDb.read();
  const item = list.find((e) => e.id === req.params.id);
  if (!item) return res.status(404).json({ error: "not_found", message: "ไม่พบงานนี้" });
  res.json(item);
});

// ---------- Events: admin write (ต้อง login ก่อน) ----------
app.post("/api/events", requireAuth, (req, res) => {
  const { errors, clean } = validateEventPayload(req.body);
  if (errors.length) return res.status(400).json({ error: "validation_error", message: errors.join(", ") });

  const now = new Date().toISOString();
  const item = {
    id: `event-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`,
    ...clean,
    image: clean.image || "",
    createdAt: now,
    updatedAt: now,
  };
  eventsDb.update((list) => list.push(item));
  res.status(201).json(item);
});

app.put("/api/events/:id", requireAuth, (req, res) => {
  const { errors, clean } = validateEventPayload(req.body, { partial: true });
  if (errors.length) return res.status(400).json({ error: "validation_error", message: errors.join(", ") });

  let updated = null;
  eventsDb.update((list) => {
    const idx = list.findIndex((e) => e.id === req.params.id);
    if (idx === -1) return;
    list[idx] = { ...list[idx], ...clean, updatedAt: new Date().toISOString() };
    updated = list[idx];
  });
  if (!updated) return res.status(404).json({ error: "not_found", message: "ไม่พบงานนี้" });
  res.json(updated);
});

app.delete("/api/events/:id", requireAuth, (req, res) => {
  let deleted = false;
  eventsDb.update((list) => {
    const idx = list.findIndex((e) => e.id === req.params.id);
    if (idx === -1) return;
    list.splice(idx, 1);
    deleted = true;
  });
  if (!deleted) return res.status(404).json({ error: "not_found", message: "ไม่พบงานนี้" });
  res.json({ ok: true });
});

// ---------- Orders (บันทึกการกดบัตรจริง เอาไว้ทำสถิติ/แดชบอร์ด) ----------
app.post("/api/orders", (req, res) => {
  const { eventId, ticketType, qty, price } = req.body || {};
  const events = eventsDb.read();
  const event = events.find((e) => e.id === eventId);
  if (!event) return res.status(404).json({ error: "not_found", message: "ไม่พบงานนี้" });

  const cleanQty = Math.max(1, Math.min(10, Number(qty) || 1));
  const cleanType = ["VIP", "REGULAR"].includes(ticketType) ? ticketType : "REGULAR";
  const cleanPrice = Number(price) || (cleanType === "VIP" ? event.vip : event.regular);

  const order = {
    id: `order-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`,
    eventId,
    eventName: event.name,
    ticketType: cleanType,
    qty: cleanQty,
    total: cleanQty * cleanPrice,
    createdAt: new Date().toISOString(),
  };
  ordersDb.update((list) => list.push(order));
  res.status(201).json(order);
});

app.get("/api/admin/stats", requireAuth, (req, res) => {
  const events = eventsDb.read();
  const orders = ordersDb.read();

  const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
  const totalTickets = orders.reduce((sum, o) => sum + o.qty, 0);
  const onSale = events.filter((e) => e.status === "เปิดขาย").length;
  const upcoming = events.filter((e) => e.status === "เร็ว ๆ นี้").length;

  const perEvent = events.map((e) => {
    const eventOrders = orders.filter((o) => o.eventId === e.id);
    return {
      id: e.id,
      name: e.name,
      image: e.image,
      status: e.status,
      ticketsSold: eventOrders.reduce((s, o) => s + o.qty, 0),
      revenue: eventOrders.reduce((s, o) => s + o.total, 0),
    };
  }).sort((a, b) => b.revenue - a.revenue);

  res.json({
    totalEvents: events.length,
    onSale,
    upcoming,
    totalOrders: orders.length,
    totalTickets,
    totalRevenue,
    perEvent,
    recentOrders: orders.slice(-8).reverse(),
  });
});

// ---------- Static frontend ----------
app.use(express.static(ROOT, { extensions: ["html"] }));

app.use((req, res) => {
  res.status(404).json({ error: "not_found", message: "ไม่พบหน้าหรือ endpoint นี้" });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`\nDELEF FEST GOPASS server พร้อมทำงานที่ http://localhost:${PORT}`);
  console.log(`เปิดหน้าเว็บ:  http://localhost:${PORT}/index.html`);
  console.log(`หน้าแอดมิน:   http://localhost:${PORT}/admin/login.html\n`);
});
