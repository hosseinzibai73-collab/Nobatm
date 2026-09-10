import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Home, CalendarClock, Users, BarChart3, X, Search, CheckCircle2, ChevronRight, ChevronDown, ChevronsRight, Scissors, CircleUserRound, Info, Trash2, Pencil, ArrowRight, DownloadCloud, UploadCloud } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

// Standalone storage shim — replaces Claude's artifact-only window.storage API
// with plain browser localStorage so the app works on a normal website/GitHub Pages.
const storage = {
  async get(key) {
    const v = localStorage.getItem(key);
    return v !== null ? { key, value: v } : null;
  },
  async set(key, value) {
    localStorage.setItem(key, value);
    return { key, value };
  },
};


const DEFAULT_SERVICES = [
  { id: 's1', name: 'کوتاهی مو' },
  { id: 's2', name: 'رنگ مو' },
  { id: 's3', name: 'براشینگ' },
  { id: 's4', name: 'کراتینه' },
  { id: 's5', name: 'اصلاح ابرو' },
  { id: 's6', name: 'میکاپ' },
];
// Only used to make the seeded demo appointments/reports look realistic —
// actual services no longer carry a fixed price; the price is entered
// each time an appointment is completed.
const SEED_PRICES = { s1: 150000, s2: 450000, s3: 120000, s4: 900000, s5: 80000, s6: 350000 };

const AVATAR_PALETTE = [
  { bg: '#F1DCE1', fg: '#7C2D42' },
  { bg: '#F4E9D8', fg: '#8A6A37' },
  { bg: '#DCEAE3', fg: '#2F6B52' },
  { bg: '#DCE6F4', fg: '#2F4F8A' },
  { bg: '#EADCF4', fg: '#6B2F8A' },
  { bg: '#F4DCDC', fg: '#8A2F2F' },
  { bg: '#F4EFDC', fg: '#8A7A2F' },
  { bg: '#DCF4EF', fg: '#2F8A7A' },
];

const DEFAULT_PROFILE = { fullName: '', salonName: 'آرایشگاه نگین', salonPhone: '', address: '', workStart: '09:00', workEnd: '21:00', bio: '' };

const NAMES = ['علی رضایی', 'محمد حسینی', 'سارا احمدی', 'مریم کریمی', 'نگار صادقی', 'امیر توکلی', 'زهرا موسوی', 'حسین نوری', 'فاطمه رستمی', 'رضا قاسمی', 'الناز شریفی', 'بهنام یوسفی', 'پریسا نجفی', 'کیانا محمدی'];

function pad(n) { return String(n).padStart(2, '0'); }
function isoDate(d) { const dt = new Date(d); return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`; }
function addDays(base, n) { const d = new Date(base); d.setDate(d.getDate() + n); return d; }
function todayISO() { return isoDate(new Date()); }
function toPersianDigits(str) {
  const fa = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return String(str).replace(/[0-9]/g, d => fa[d]);
}
function formatToman(n) { return toPersianDigits(Number(n).toLocaleString('en-US')) + ' تومان'; }
function formatDayLabel(iso) {
  const today = todayISO();
  const tmr = isoDate(addDays(new Date(), 1));
  if (iso === today) return 'امروز';
  if (iso === tmr) return 'فردا';
  return new Date(iso).toLocaleDateString('fa-IR', { weekday: 'long', day: 'numeric', month: 'long' });
}
function formatShort(iso) { return new Date(iso).toLocaleDateString('fa-IR', { day: 'numeric', month: 'short' }); }

function buildSeed() {
  const customers = NAMES.map((name, i) => ({
    id: 'c' + (i + 1),
    name,
    phone: '09' + (120000000 + i * 137931).toString().slice(0, 9),
    visits: 0,
    lastVisit: null,
    avatarIndex: i % AVATAR_PALETTE.length,
    createdAt: isoDate(addDays(new Date(), -(40 - i * 2))),
  }));

  const plan = [
    [-6, 10, 0, 0, 0], [-6, 12, 30, 3, 1], [-6, 16, 0, 7, 2],
    [-5, 9, 30, 2, 4], [-5, 11, 0, 5, 0], [-5, 14, 0, 9, 5], [-5, 17, 30, 1, 2],
    [-4, 10, 0, 4, 1], [-4, 13, 0, 8, 0], [-4, 18, 0, 11, 3],
    [-3, 9, 0, 6, 2], [-3, 12, 0, 0, 5], [-3, 15, 30, 10, 0], [-3, 17, 0, 3, 4],
    [-2, 11, 0, 12, 1], [-2, 13, 30, 7, 0], [-2, 16, 30, 2, 3, 'cancelled'],
    [-1, 9, 30, 5, 0], [-1, 11, 30, 9, 2], [-1, 14, 0, 1, 1], [-1, 17, 0, 13, 5],
    [0, 9, 0, 4, 0], [0, 10, 30, 8, 2], [0, 12, 0, 6, 4], [0, 14, 30, 11, 1],
    [0, 16, 0, 0, 3], [0, 18, 30, 10, 0],
    [1, 10, 0, 3, 0], [1, 12, 0, 12, 5], [1, 15, 0, 2, 1],
    [2, 11, 0, 7, 2], [2, 13, 0, 9, 0], [2, 16, 0, 13, 3],
  ];

  const now = new Date();
  const currentHour = now.getHours();

  const appointments = plan.map((row, idx) => {
    const [dayOffset, hour, minute, custIdx, svcIdx, override] = row;
    const date = isoDate(addDays(now, dayOffset));
    const service = DEFAULT_SERVICES[svcIdx];
    const customer = customers[custIdx];
    let status;
    if (override) status = override;
    else if (dayOffset < 0) status = 'done';
    else if (dayOffset === 0) status = hour < currentHour ? 'done' : 'confirmed';
    else status = 'confirmed';
    return {
      id: 'a' + (idx + 1),
      customerId: customer.id,
      customerName: customer.name,
      serviceIds: [service.id],
      serviceNames: [service.name],
      price: status === 'done' ? SEED_PRICES[service.id] : 0,
      date, hour, minute, status,
    };
  });

  appointments.filter(a => a.status === 'done').forEach(a => {
    const c = customers.find(c => c.id === a.customerId);
    c.visits += 1;
    if (!c.lastVisit || a.date > c.lastVisit) c.lastVisit = a.date;
  });

  return { customers, appointments };
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;500;600;700;800;900&display=swap');
.nvbm-root {
  --bg:#F6EFEA; --surface:#FFFFFF; --ink:#2B1F26; --ink-soft:#8B7780;
  --primary:#7C2D42; --primary-dark:#5E1F32; --primary-soft:#F1DCE1;
  --gold:#B8905A; --gold-soft:#F4E9D8; --success:#4F7942; --success-soft:#E7EFDF; --line:#E8DED7;
  font-family:'Vazirmatn',sans-serif; background:var(--bg); color:var(--ink); direction:rtl;
  max-width:460px; margin:0 auto; min-height:100vh; position:relative; padding-bottom:88px; box-sizing:border-box;
}
.nvbm-root *{box-sizing:border-box;}
.page{padding:4px 18px 8px;}
.home-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:18px;}
.greeting{margin:0;font-size:13px;color:var(--ink-soft);}
.salon-name{margin:2px 0 0;font-size:22px;font-weight:800;}
.date-chip{background:var(--surface);border:1px solid var(--line);padding:6px 12px;border-radius:20px;font-size:12px;color:var(--ink-soft);white-space:nowrap;margin-top:2px;}
.hero-card{background:linear-gradient(155deg,var(--primary) 0%,var(--primary-dark) 100%);border-radius:22px;padding:22px 20px;color:#fff;margin-bottom:24px;position:relative;overflow:hidden;}
.hero-card::after{content:'';position:absolute;left:-40px;top:-40px;width:140px;height:140px;border-radius:50%;background:rgba(255,255,255,0.06);}
.hero-label{margin:0;font-size:13px;opacity:0.8;}
.hero-amount{margin:6px 0 18px;font-size:29px;font-weight:900;}
.hero-stats{display:flex;align-items:center;}
.hero-stat{flex:1;text-align:center;}
.hero-stat-num{display:block;font-size:18px;font-weight:800;}
.hero-stat-label{display:block;font-size:11px;opacity:0.75;margin-top:2px;}
.hero-divider{width:1px;height:28px;background:rgba(255,255,255,0.2);}
.section-head{display:flex;justify-content:space-between;align-items:center;margin:22px 0 10px;}
.section-head h2{font-size:15px;margin:0;font-weight:700;}
.link-btn{background:none;border:none;color:var(--primary);font-size:12px;display:flex;align-items:center;gap:2px;font-family:inherit;cursor:pointer;padding:0;}
.card-list{display:flex;flex-direction:column;gap:8px;}
.appt-item{display:flex;align-items:center;gap:12px;background:var(--surface);border-radius:16px;padding:12px 14px;}
.appt-time{flex-shrink:0;width:52px;text-align:center;}
.appt-time-num{font-weight:800;font-size:14px;color:var(--primary);}
.appt-main{flex:1;min-width:0;}
.appt-row1{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:4px;}
.appt-customer{font-weight:700;font-size:14px;}
.appt-row2{display:flex;justify-content:space-between;align-items:center;font-size:12px;color:var(--ink-soft);}
.appt-service{display:flex;align-items:center;gap:5px;}
.appt-price{font-weight:600;color:var(--ink);}
.appt-price-pending{color:var(--ink-soft);font-weight:500;}
.badge{font-size:11px;padding:3px 9px;border-radius:20px;font-weight:600;white-space:nowrap;}
.mini-btn{background:var(--success-soft);color:var(--success);border:none;width:32px;height:32px;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0;cursor:pointer;}
.customer-strip{display:flex;gap:14px;overflow-x:auto;padding-bottom:6px;}
.customer-chip{flex-shrink:0;display:flex;flex-direction:column;align-items:center;gap:6px;font-size:11px;color:var(--ink-soft);width:56px;}
.avatar{border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;flex-shrink:0;}
.page-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;}
.page-header h1{font-size:21px;font-weight:800;margin:0;}
.pill-row{display:flex;gap:8px;margin-bottom:16px;overflow-x:auto;}
.pill{border:1px solid var(--line);background:var(--surface);color:var(--ink-soft);font-size:12.5px;padding:7px 14px;border-radius:20px;font-family:inherit;cursor:pointer;white-space:nowrap;}
.pill-active{background:var(--primary);border-color:var(--primary);color:#fff;}
.date-group{margin-bottom:18px;}
.date-group-label{font-size:12.5px;font-weight:700;color:var(--ink-soft);margin:0 0 8px 2px;}
.search-box{display:flex;align-items:center;gap:8px;background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:10px 14px;margin-bottom:12px;color:var(--ink-soft);}
.search-box input{border:none;outline:none;flex:1;font-family:inherit;font-size:13.5px;background:none;color:var(--ink);}
.list-count{font-size:12px;color:var(--ink-soft);margin:0 2px 10px;}
.customer-item{display:flex;align-items:center;gap:12px;background:var(--surface);border-radius:16px;padding:12px 14px;}
.customer-info{flex:1;min-width:0;}
.customer-name{margin:0;font-weight:700;font-size:14px;}
.customer-phone{margin:2px 0 0;font-size:12px;color:var(--ink-soft);}
.customer-meta{text-align:left;font-size:11px;color:var(--ink-soft);display:flex;flex-direction:column;gap:2px;}
.visit-count{color:var(--primary);font-weight:600;}
.stat-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:18px;}
.stat-box{background:var(--surface);border:1px solid var(--line);border-radius:16px;padding:14px;}
.stat-box-label{margin:0;font-size:12px;color:var(--ink-soft);}
.stat-box-num{margin:6px 0 0;font-size:16px;font-weight:800;}
.report-card{background:var(--surface);border:1px solid var(--line);border-radius:18px;padding:16px;margin-bottom:14px;}
.report-card h2{margin:0 0 12px;font-size:14px;font-weight:700;}
.bar-list{display:flex;flex-direction:column;gap:12px;}
.bar-row-top{display:flex;justify-content:space-between;font-size:12.5px;margin-bottom:5px;}
.bar-count{color:var(--ink-soft);}
.bar-track{height:7px;background:var(--gold-soft);border-radius:10px;overflow:hidden;}
.bar-fill{height:100%;background:var(--gold);border-radius:10px;}
.empty-note{text-align:center;color:var(--ink-soft);font-size:13px;padding:26px 0;background:var(--surface);border:1px dashed var(--line);border-radius:14px;}
.bottom-nav{position:fixed;bottom:0;left:50%;transform:translateX(-50%);width:100%;max-width:460px;background:var(--surface);border-top:1px solid var(--line);display:grid;grid-template-columns:repeat(4,1fr);align-items:center;padding:8px 10px calc(8px + env(safe-area-inset-bottom));z-index:20;}
.nav-item{background:none;border:none;display:flex;flex-direction:column;align-items:center;gap:3px;color:var(--ink-soft);font-family:inherit;font-size:10.5px;cursor:pointer;padding:6px 0;}
.nav-item-active{color:var(--primary);font-weight:700;}
.nav-home{justify-self:center;width:52px;height:52px;border-radius:50%;background:var(--primary);color:#fff;border:none;display:flex;align-items:center;justify-content:center;margin-top:-26px;box-shadow:0 8px 18px rgba(124,45,66,0.35);cursor:pointer;}
.nav-home-active{background:var(--primary-dark);}
.toast{position:fixed;bottom:96px;left:50%;transform:translateX(-50%);background:var(--ink);color:#fff;padding:10px 18px;border-radius:24px;font-size:13px;z-index:50;}
.modal-overlay{position:fixed;inset:0;background:rgba(43,31,38,0.45);display:flex;align-items:flex-end;z-index:40;}
.modal-sheet{background:var(--surface);width:100%;max-width:460px;margin:0 auto;border-radius:22px 22px 0 0;padding:20px;max-height:80vh;overflow-y:auto;}
.modal-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;}
.modal-head h3{margin:0;font-size:16px;font-weight:800;}
.icon-btn{background:var(--bg);border:none;width:32px;height:32px;border-radius:10px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--ink-soft);}
.icon-btn.danger{color:#B84C4C;}
.form-field{margin-bottom:14px;display:flex;flex-direction:column;gap:6px;}
.form-field label{font-size:12.5px;color:var(--ink-soft);}
.form-field input,.form-field select{border:1px solid var(--line);border-radius:12px;padding:10px 12px;font-family:inherit;font-size:13.5px;background:var(--bg);color:var(--ink);outline:none;}
.backup-textarea{border:1px solid var(--line);border-radius:12px;padding:10px 12px;font-family:inherit;font-size:12.5px;background:var(--bg);color:var(--ink);outline:none;resize:vertical;width:100%;line-height:1.6;direction:ltr;text-align:left;}
.ms-wrap{position:relative;}
.ms-control{width:100%;display:flex;align-items:center;justify-content:space-between;gap:8px;border:1px solid var(--line);border-radius:12px;padding:10px 12px;font-family:inherit;font-size:13.5px;background:var(--bg);color:var(--ink);cursor:pointer;}
.ms-control-text{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:right;flex:1;}
.ms-placeholder{color:var(--ink-soft);}
.ms-chevron{transition:transform .15s ease;flex-shrink:0;color:var(--ink-soft);}
.ms-chevron-open{transform:rotate(180deg);}
.ms-panel{position:absolute;top:calc(100% + 6px);right:0;left:0;background:var(--surface);border:1px solid var(--line);border-radius:14px;box-shadow:0 10px 30px rgba(43,31,38,0.16);padding:6px;max-height:220px;overflow-y:auto;z-index:60;}
.ms-option{width:100%;display:flex;align-items:center;gap:10px;border:none;background:none;padding:9px 8px;border-radius:10px;font-family:inherit;font-size:13.5px;color:var(--ink);cursor:pointer;text-align:right;}
.ms-option-active{background:var(--primary-soft);}
.ms-check{width:18px;height:18px;border-radius:5px;border:1.5px solid var(--ink-soft);display:flex;align-items:center;justify-content:center;flex-shrink:0;color:var(--primary);}
.ms-check-active{border-color:var(--primary);background:var(--surface);}
.form-row{display:flex;gap:8px;}
.form-row .form-field{flex:1;}
.primary-btn{width:100%;background:var(--primary);color:#fff;border:none;padding:13px;border-radius:14px;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;margin-top:4px;}
.primary-btn:disabled{opacity:0.5;cursor:not-allowed;}
.loading-wrap{display:flex;align-items:center;justify-content:center;height:60vh;color:var(--ink-soft);font-size:13px;}
.drawer-overlay{position:fixed;inset:0;background:rgba(43,31,38,0.4);z-index:45;}
.drawer{position:fixed;top:0;bottom:0;left:0;width:78%;max-width:300px;background:var(--surface);z-index:46;padding:20px 16px;box-shadow:6px 0 24px rgba(0,0,0,0.15);display:flex;flex-direction:column;overflow-y:auto;}
.drawer-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;}
.drawer-avatar{width:46px;height:46px;border-radius:50%;background:var(--primary-soft);color:var(--primary-dark);display:flex;align-items:center;justify-content:center;}
.drawer-list{display:flex;flex-direction:column;gap:4px;}
.drawer-item{display:flex;align-items:center;gap:12px;background:none;border:none;padding:13px 10px;border-radius:12px;font-family:inherit;font-size:14px;color:var(--ink);cursor:pointer;text-align:right;}
.drawer-item-bold{font-weight:800;font-size:15.5px;color:var(--primary);border-bottom:1px solid var(--line);border-radius:0;padding-bottom:16px;margin-bottom:8px;}
.drawer-item-active{background:var(--bg);}
.add-handle{position:fixed;top:50%;left:max(0px, calc((100vw - 460px)/2));width:16px;height:68px;border-radius:0 14px 14px 0;background:rgba(255,255,255,0.35);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);border:1px solid rgba(255,255,255,0.5);border-right:none;display:flex;align-items:center;justify-content:center;color:var(--primary);z-index:35;cursor:grab;touch-action:none;transform:translateY(-50%);}
.add-overlay{position:fixed;inset:0;background:rgba(43,31,38,0.35);z-index:33;}
.add-panel{position:fixed;top:50%;left:max(20px, calc((100vw - 460px)/2 + 22px));transform:translateY(-50%);z-index:36;display:flex;flex-direction:column;gap:10px;}
.add-panel-btn{display:flex;align-items:center;gap:8px;background:var(--surface);border:1px solid var(--line);padding:12px 18px;border-radius:16px;font-family:inherit;font-size:13.5px;font-weight:700;color:var(--ink);box-shadow:0 10px 24px rgba(43,31,38,0.15);cursor:pointer;white-space:nowrap;}
.swipe-wrap{position:relative;overflow:hidden;border-radius:16px;}
.swipe-actions{position:absolute;top:0;bottom:0;right:0;width:132px;display:flex;align-items:stretch;}
.swipe-action{width:66px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;border:none;color:#fff;font-family:inherit;font-size:11px;cursor:pointer;}
.swipe-action.edit{background:var(--gold);}
.swipe-action.delete{background:#B84C4C;}
.swipe-content{position:relative;touch-action:pan-y;border-radius:16px;}
.swipe-content-open{box-shadow:0 0 0 2px var(--primary-soft);}
.avatar-picker{display:flex;gap:10px;flex-wrap:wrap;}
.avatar-swatch{width:40px;height:40px;border-radius:50%;border:2px solid transparent;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:14px;cursor:pointer;}
.avatar-swatch-active{border-color:var(--primary);}
.profile-card{background:var(--surface);border:1px solid var(--line);border-radius:18px;padding:22px 16px;display:flex;flex-direction:column;align-items:center;gap:8px;margin-bottom:16px;}
.profile-card h2{margin:4px 0 0;font-size:17px;font-weight:800;}
.profile-card p{margin:0;font-size:12.5px;color:var(--ink-soft);}
.detail-stats{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:20px;}
.detail-stat{background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:12px;text-align:center;}
.detail-stat-label{display:block;font-size:11.5px;color:var(--ink-soft);}
.detail-stat-value{display:block;font-size:14.5px;font-weight:800;margin-top:4px;}
.payment-row{display:flex;justify-content:space-between;align-items:center;background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:11px 14px;}
.payment-service{margin:0;font-size:13px;font-weight:700;}
.payment-date{margin:2px 0 0;font-size:11.5px;color:var(--ink-soft);}
.payment-amount{font-size:13px;font-weight:700;color:var(--primary);}
.service-row{display:flex;justify-content:space-between;align-items:center;background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:12px 14px;}
.service-name{margin:0;font-size:13.5px;font-weight:700;}
.service-meta{margin:4px 0 0;font-size:11.5px;color:var(--ink-soft);display:flex;align-items:center;gap:8px;}
.meta-divider{width:1px;height:9px;background:var(--line);display:inline-block;}
.about-text{margin:0;font-size:13.5px;line-height:1.9;color:var(--ink-soft);}
.accordion-head{width:100%;display:flex;justify-content:space-between;align-items:center;background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:13px 14px;font-family:inherit;font-size:14px;font-weight:700;color:var(--ink);cursor:pointer;margin:14px 0 0;}
.accordion-head-left{display:flex;align-items:center;gap:8px;}
.accordion-count{font-size:12px;font-weight:600;color:var(--ink-soft);}
.accordion-chevron{transition:transform 0.2s ease;color:var(--ink-soft);}
.accordion-chevron-open{transform:rotate(180deg);}
.accordion-body{margin-top:10px;}
.top-menu-row{display:flex;justify-content:flex-end;padding:16px 18px 0;}
.menu-btn{width:38px;height:38px;border-radius:12px;background:var(--surface);border:1px solid var(--line);display:flex;align-items:center;justify-content:center;color:var(--ink);cursor:pointer;box-shadow:0 4px 14px rgba(43,31,38,0.06);}
.reports-filters{display:flex;flex-direction:column;gap:10px;margin-bottom:16px;}
.reports-select{border:1px solid var(--line);background:var(--surface);color:var(--ink);border-radius:12px;padding:9px 12px;font-family:inherit;font-size:13px;}
`;

function Avatar({ name, avatarIndex, size = 44 }) {
  const p = AVATAR_PALETTE[(avatarIndex ?? 0) % AVATAR_PALETTE.length];
  return (
    <div className="avatar" style={{ width: size, height: size, fontSize: size * 0.36, background: p.bg, color: p.fg }}>
      {name ? name.trim().charAt(0) : <CircleUserRound size={size * 0.5} />}
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    confirmed: { label: 'تایید شده', bg: 'var(--gold-soft)', fg: '#8A6A37' },
    done: { label: 'انجام شده', bg: 'var(--success-soft)', fg: 'var(--success)' },
    cancelled: { label: 'لغو شده', bg: '#F3E3E3', fg: '#A33' },
  };
  const s = map[status] || map.confirmed;
  return <span className="badge" style={{ background: s.bg, color: s.fg }}>{s.label}</span>;
}

function EmptyNote({ text }) { return <div className="empty-note">{text}</div>; }

function SwipeRow({ id, openId, setOpenId, onEdit, onDelete, onTap, children }) {
  const [dragX, setDragX] = useState(0);
  const stateRef = useRef({ dragging: false, startX: 0, startY: 0, baseX: 0, locked: 'none', longPressTimer: null, longPressed: false });
  const isOpen = openId === id;
  const REVEAL = 132;
  const LOCK_THRESHOLD = 7;
  const LONG_PRESS_MS = 420;

  useEffect(() => { setDragX(isOpen ? -REVEAL : 0); }, [isOpen]);

  function clearLongPress() {
    const s = stateRef.current;
    if (s.longPressTimer) { clearTimeout(s.longPressTimer); s.longPressTimer = null; }
  }

  function onPointerDown(e) {
    const s = stateRef.current;
    s.dragging = true;
    s.startX = e.clientX;
    s.startY = e.clientY;
    s.baseX = isOpen ? -REVEAL : 0;
    s.locked = 'none';
    s.longPressed = false;
    clearLongPress();
    // Fallback: press-and-hold also reveals edit/delete, in case a horizontal
    // swipe isn't cleanly detected on some devices.
    s.longPressTimer = setTimeout(() => {
      if (s.dragging && s.locked === 'none') {
        s.longPressed = true;
        setDragX(-REVEAL);
        setOpenId(id);
        if (navigator.vibrate) navigator.vibrate(8);
      }
    }, LONG_PRESS_MS);
  }
  function onPointerMove(e) {
    const s = stateRef.current;
    if (!s.dragging || s.locked === 'vertical' || s.longPressed) return;
    const dx = e.clientX - s.startX;
    const dy = e.clientY - s.startY;
    if (s.locked === 'none') {
      if (Math.abs(dx) < LOCK_THRESHOLD && Math.abs(dy) < LOCK_THRESHOLD) return;
      clearLongPress();
      if (Math.abs(dx) >= Math.abs(dy)) {
        s.locked = 'horizontal';
        e.currentTarget.setPointerCapture?.(e.pointerId);
      } else {
        s.locked = 'vertical';
        return;
      }
    }
    let next = s.baseX + dx;
    next = Math.max(-REVEAL, Math.min(0, next));
    setDragX(next);
  }
  function onPointerUp() {
    const s = stateRef.current;
    clearLongPress();
    if (!s.dragging) return;
    s.dragging = false;
    if (s.longPressed) { s.locked = 'none'; return; }
    if (s.locked === 'horizontal') {
      if (dragX < -REVEAL / 2) setOpenId(id); else setOpenId(null);
    } else if (s.locked === 'none') {
      if (isOpen) setOpenId(null);
      else if (onTap) onTap();
    }
    s.locked = 'none';
  }

  return (
    <div className="swipe-wrap">
      <div className="swipe-actions">
        <button className="swipe-action edit" onClick={() => { setOpenId(null); onEdit(); }}><Pencil size={16} /><span>ویرایش</span></button>
        <button className="swipe-action delete" onClick={() => { setOpenId(null); onDelete(); }}><Trash2 size={16} /><span>حذف</span></button>
      </div>
      <div
        className={'swipe-content' + (isOpen ? ' swipe-content-open' : '')}
        style={{ transform: `translateX(${dragX}px)` }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {children}
      </div>
    </div>
  );
}

function AppointmentItem({ appt, onComplete }) {
  return (
    <div className="appt-item">
      <div className="appt-time"><span className="appt-time-num">{toPersianDigits(pad(appt.hour) + ':' + pad(appt.minute))}</span></div>
      <div className="appt-main">
        <div className="appt-row1">
          <span className="appt-customer">{appt.customerName}</span>
          <StatusBadge status={appt.status} />
        </div>
        <div className="appt-row2">
          {appt.status === 'done' ? (
            <>
              <span className="appt-service"><Scissors size={13} />{(appt.serviceNames || []).join('، ')}</span>
              <span className="appt-price">{formatToman(appt.price)}</span>
            </>
          ) : (
            <span className="appt-price-pending">خدمت و مبلغ هنگام تکمیل مشخص می‌شود</span>
          )}
        </div>
      </div>
      {appt.status === 'confirmed' && onComplete && (
        <button className="mini-btn" onClick={() => onComplete(appt)} title="تکمیل نوبت و ثبت مبلغ">
          <CheckCircle2 size={18} />
        </button>
      )}
    </div>
  );
}

function HomePage({ profile, customers, appointments, onGoTab, onComplete }) {
  const today = todayISO();
  const todays = appointments.filter(a => a.date === today).sort((a, b) => a.hour * 60 + a.minute - (b.hour * 60 + b.minute));
  const doneToday = todays.filter(a => a.status === 'done');
  const revenueToday = doneToday.reduce((s, a) => s + a.price, 0);
  const upcoming = todays.filter(a => a.status === 'confirmed');

  const greeting = (() => {
    const h = new Date().getHours();
    const base = h < 12 ? 'صبح بخیر' : h < 18 ? 'ظهر بخیر' : 'شب بخیر';
    return profile.fullName ? base + '، ' + profile.fullName.split(' ')[0] : base;
  })();

  return (
    <div className="page">
      <div className="home-header">
        <div>
          <p className="greeting">{greeting}</p>
          <h1 className="salon-name">{profile.salonName || 'آرایشگاه من'}</h1>
        </div>
        <div className="date-chip">{formatDayLabel(today)}</div>
      </div>

      <div className="hero-card">
        <p className="hero-label">کارکرد امروز</p>
        <p className="hero-amount">{formatToman(revenueToday)}</p>
        <div className="hero-stats">
          <div className="hero-stat"><span className="hero-stat-num">{toPersianDigits(todays.length)}</span><span className="hero-stat-label">نوبت امروز</span></div>
          <div className="hero-divider" />
          <div className="hero-stat"><span className="hero-stat-num">{toPersianDigits(doneToday.length)}</span><span className="hero-stat-label">انجام شده</span></div>
          <div className="hero-divider" />
          <div className="hero-stat"><span className="hero-stat-num">{toPersianDigits(upcoming.length)}</span><span className="hero-stat-label">در انتظار</span></div>
        </div>
      </div>

      <div className="section-head">
        <h2>نوبت‌های امروز</h2>
        <button className="link-btn" onClick={() => onGoTab('appointments')}>مشاهده همه<ChevronRight size={14} /></button>
      </div>
      <div className="card-list">
        {todays.length === 0 && <EmptyNote text="برای امروز نوبتی ثبت نشده" />}
        {todays.slice(0, 4).map(a => <AppointmentItem key={a.id} appt={a} onComplete={onComplete} />)}
      </div>

      <div className="section-head">
        <h2>مشتری‌های اخیر</h2>
        <button className="link-btn" onClick={() => onGoTab('customers')}>مشاهده همه<ChevronRight size={14} /></button>
      </div>
      <div className="customer-strip">
        {customers.slice(0, 8).map(c => (
          <div className="customer-chip" key={c.id}>
            <Avatar name={c.name} avatarIndex={c.avatarIndex} size={44} />
            <span>{c.name.split(' ')[0]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AppointmentsPage({ appointments, onComplete, onEdit, onDelete, openId, setOpenId }) {
  const [filter, setFilter] = useState('all');
  const today = todayISO();
  let list = [...appointments];
  if (filter === 'today') list = list.filter(a => a.date === today);
  else if (filter === 'upcoming') list = list.filter(a => a.date > today);
  else if (filter === 'past') list = list.filter(a => a.date < today);
  list.sort((a, b) => a.date === b.date ? (a.hour * 60 + a.minute) - (b.hour * 60 + b.minute) : (a.date < b.date ? -1 : 1));

  const groups = [];
  list.forEach(a => {
    let g = groups.find(g => g.date === a.date);
    if (!g) { g = { date: a.date, items: [] }; groups.push(g); }
    g.items.push(a);
  });

  return (
    <div className="page">
      <div className="page-header"><h1>نوبت‌ها</h1></div>
      <div className="pill-row">
        {[['all', 'همه'], ['today', 'امروز'], ['upcoming', 'آینده'], ['past', 'گذشته']].map(([k, l]) => (
          <button key={k} className={'pill' + (filter === k ? ' pill-active' : '')} onClick={() => setFilter(k)}>{l}</button>
        ))}
      </div>
      {groups.length === 0 && <EmptyNote text="نوبتی برای نمایش وجود ندارد" />}
      {groups.map(g => (
        <div key={g.date} className="date-group">
          <p className="date-group-label">{formatDayLabel(g.date)}</p>
          <div className="card-list">
            {g.items.map(a => (
              <SwipeRow key={a.id} id={a.id} openId={openId} setOpenId={setOpenId} onEdit={() => onEdit(a)} onDelete={() => onDelete(a.id)}>
                <AppointmentItem appt={a} onComplete={onComplete} />
              </SwipeRow>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function CustomersPage({ customers, onSelect, onEdit, onDelete, openId, setOpenId }) {
  const [q, setQ] = useState('');
  const filtered = customers.filter(c => c.name.includes(q) || c.phone.includes(q));
  const sorted = [...filtered].sort((a, b) => a.name.localeCompare(b.name, 'fa'));

  return (
    <div className="page">
      <div className="page-header"><h1>مشتری‌ها</h1></div>
      <div className="search-box">
        <Search size={16} />
        <input placeholder="جستجوی نام یا شماره تماس" value={q} onChange={e => setQ(e.target.value)} />
      </div>
      <p className="list-count">{toPersianDigits(sorted.length)} مشتری</p>
      <div className="card-list">
        {sorted.length === 0 && <EmptyNote text="مشتری‌ای پیدا نشد" />}
        {sorted.map(c => (
          <SwipeRow key={c.id} id={c.id} openId={openId} setOpenId={setOpenId} onEdit={() => onEdit(c)} onDelete={() => onDelete(c.id)} onTap={() => onSelect(c.id)}>
            <div className="customer-item">
              <Avatar name={c.name} avatarIndex={c.avatarIndex} size={46} />
              <div className="customer-info">
                <p className="customer-name">{c.name}</p>
                <p className="customer-phone">{toPersianDigits(c.phone)}</p>
              </div>
              <div className="customer-meta">
                <span className="visit-count">{toPersianDigits(c.visits)} بار مراجعه</span>
                {c.lastVisit && <span className="last-visit">آخرین بازدید: {formatShort(c.lastVisit)}</span>}
              </div>
            </div>
          </SwipeRow>
        ))}
      </div>
    </div>
  );
}

function CustomerDetailPage({ customer, appointments, onBack }) {
  const [openSection, setOpenSection] = useState(null);
  const history = appointments.filter(a => a.customerId === customer.id)
    .sort((a, b) => a.date === b.date ? (b.hour * 60 + b.minute) - (a.hour * 60 + a.minute) : (a.date < b.date ? 1 : -1));
  const payments = history.filter(a => a.status === 'done');
  const totalPaid = payments.reduce((s, a) => s + a.price, 0);

  function toggle(key) { setOpenSection(prev => prev === key ? null : key); }

  return (
    <div className="page">
      <div className="page-header">
        <button className="icon-btn" onClick={onBack}><ArrowRight size={18} /></button>
        <h1>پرونده مشتری</h1>
        <div style={{ width: 32 }} />
      </div>

      <div className="profile-card">
        <Avatar name={customer.name} avatarIndex={customer.avatarIndex} size={64} />
        <h2>{customer.name}</h2>
        <p>{toPersianDigits(customer.phone)}</p>
      </div>

      <div className="detail-stats">
        <div className="detail-stat"><span className="detail-stat-label">آخرین مراجعه</span><span className="detail-stat-value">{customer.lastVisit ? formatShort(customer.lastVisit) : '—'}</span></div>
        <div className="detail-stat"><span className="detail-stat-label">کل پرداختی‌ها</span><span className="detail-stat-value">{formatToman(totalPaid)}</span></div>
      </div>

      <button className="accordion-head" onClick={() => toggle('history')}>
        <span>تاریخچه مراجعه</span>
        <span className="accordion-head-left"><span className="accordion-count">{toPersianDigits(history.length)}</span><ChevronDown size={17} className={'accordion-chevron' + (openSection === 'history' ? ' accordion-chevron-open' : '')} /></span>
      </button>
      {openSection === 'history' && (
        <div className="card-list accordion-body">
          {history.length === 0 && <EmptyNote text="هنوز مراجعه‌ای ثبت نشده" />}
          {history.map(a => <AppointmentItem key={a.id} appt={a} />)}
        </div>
      )}

      <button className="accordion-head" onClick={() => toggle('payments')}>
        <span>تاریخچه پرداختی‌ها</span>
        <span className="accordion-head-left"><span className="accordion-count">{toPersianDigits(payments.length)}</span><ChevronDown size={17} className={'accordion-chevron' + (openSection === 'payments' ? ' accordion-chevron-open' : '')} /></span>
      </button>
      {openSection === 'payments' && (
        <div className="card-list accordion-body">
          {payments.length === 0 && <EmptyNote text="پرداختی ثبت نشده" />}
          {payments.map(a => (
            <div className="payment-row" key={a.id}>
              <div>
                <p className="payment-service">{(a.serviceNames || []).join('، ')}</p>
                <p className="payment-date">{formatShort(a.date)}</p>
              </div>
              <span className="payment-amount">{formatToman(a.price)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const REPORT_PERIODS = [
  { key: '7d', label: '۷ روز اخیر', days: 7 },
  { key: '30d', label: '۳۰ روز اخیر', days: 30 },
  { key: '90d', label: '۳ ماه اخیر', days: 90 },
];

function ReportsPage({ appointments, services }) {
  const [periodKey, setPeriodKey] = useState('7d');
  const [serviceFilter, setServiceFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('done');
  const period = REPORT_PERIODS.find(p => p.key === periodKey) || REPORT_PERIODS[0];

  const scoped = appointments.filter(a => {
    if (serviceFilter !== 'all' && !(a.serviceNames || []).includes(serviceFilter)) return false;
    if (statusFilter !== 'all' && a.status !== statusFilter) return false;
    return true;
  });

  const days = Array.from({ length: period.days }, (_, i) => isoDate(addDays(new Date(), i - (period.days - 1))));
  const revenueByDay = days.map(d => ({
    date: d, label: formatShort(d),
    total: appointments.filter(a => a.date === d && a.status === 'done' && (serviceFilter === 'all' || (a.serviceNames || []).includes(serviceFilter))).reduce((s, a) => s + a.price, 0),
  }));
  const periodTotal = revenueByDay.reduce((s, d) => s + d.total, 0);
  const doneInRange = appointments.filter(a => a.status === 'done' && days.includes(a.date) && (serviceFilter === 'all' || (a.serviceNames || []).includes(serviceFilter)));
  const avgTicket = doneInRange.length ? Math.round(periodTotal / doneInRange.length) : 0;
  const axisInterval = period.days > 14 ? Math.ceil(period.days / 8) : 0;

  const serviceMap = {};
  scoped.filter(a => a.status !== 'cancelled' && days.includes(a.date)).forEach(a => {
    (a.serviceNames || []).forEach(name => { serviceMap[name] = (serviceMap[name] || 0) + 1; });
  });
  const topServices = Object.entries(serviceMap).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const maxServiceCount = topServices.length ? topServices[0][1] : 1;

  const hourMap = {};
  scoped.filter(a => a.status !== 'cancelled' && days.includes(a.date)).forEach(a => { hourMap[a.hour] = (hourMap[a.hour] || 0) + 1; });
  const busyHours = Object.entries(hourMap).map(([h, c]) => ({ hour: Number(h), count: c })).sort((a, b) => a.hour - b.hour);

  return (
    <div className="page">
      <div className="page-header"><h1>گزارش‌ها</h1></div>

      <div className="reports-filters">
        <div className="pill-row">
          {REPORT_PERIODS.map(p => (
            <button key={p.key} className={'pill' + (periodKey === p.key ? ' pill-active' : '')} onClick={() => setPeriodKey(p.key)}>{p.label}</button>
          ))}
        </div>
        <div className="form-row">
          <select className="reports-select" value={serviceFilter} onChange={e => setServiceFilter(e.target.value)}>
            <option value="all">همه خدمات</option>
            {services.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
          </select>
          <select className="reports-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="all">همه وضعیت‌ها</option>
            <option value="done">فقط انجام‌شده</option>
            <option value="confirmed">فقط تایید‌شده</option>
            <option value="cancelled">فقط لغو‌شده</option>
          </select>
        </div>
      </div>

      <div className="stat-grid">
        <div className="stat-box"><p className="stat-box-label">درآمد {period.label}</p><p className="stat-box-num">{formatToman(periodTotal)}</p></div>
        <div className="stat-box"><p className="stat-box-label">میانگین هر نوبت</p><p className="stat-box-num">{formatToman(avgTicket)}</p></div>
      </div>

      <div className="report-card">
        <h2>روند درآمد</h2>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={revenueByDay}>
            <CartesianGrid stroke="var(--line)" vertical={false} />
            <XAxis dataKey="label" interval={axisInterval} tick={{ fontSize: 11, fill: 'var(--ink-soft)' }} axisLine={false} tickLine={false} />
            <YAxis hide />
            <Tooltip formatter={(v) => formatToman(v)} contentStyle={{ fontFamily: 'Vazirmatn', direction: 'rtl', borderRadius: 10, border: '1px solid var(--line)' }} />
            <Line type="monotone" dataKey="total" stroke="var(--primary)" strokeWidth={2.5} dot={period.days <= 14} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="report-card">
        <h2>پرتقاضاترین خدمات</h2>
        <div className="bar-list">
          {topServices.length === 0 && <EmptyNote text="داده‌ای برای این فیلتر وجود ندارد" />}
          {topServices.map(([name, count]) => (
            <div className="bar-row" key={name}>
              <div className="bar-row-top"><span>{name}</span><span className="bar-count">{toPersianDigits(count)}</span></div>
              <div className="bar-track"><div className="bar-fill" style={{ width: (count / maxServiceCount * 100) + '%' }} /></div>
            </div>
          ))}
        </div>
      </div>

      <div className="report-card">
        <h2>ساعت‌های شلوغ</h2>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={busyHours}>
            <CartesianGrid stroke="var(--line)" vertical={false} />
            <XAxis dataKey="hour" tickFormatter={h => toPersianDigits(h)} tick={{ fontSize: 11, fill: 'var(--ink-soft)' }} axisLine={false} tickLine={false} />
            <YAxis hide />
            <Tooltip formatter={(v) => toPersianDigits(v) + ' نوبت'} labelFormatter={h => 'ساعت ' + toPersianDigits(h)} contentStyle={{ fontFamily: 'Vazirmatn', direction: 'rtl', borderRadius: 10, border: '1px solid var(--line)' }} />
            <Bar dataKey="count" fill="var(--gold)" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function ProfilePage({ profile, onSave }) {
  const [form, setForm] = useState(profile);
  useEffect(() => { setForm(profile); }, [profile]);
  function update(k, v) { setForm(f => ({ ...f, [k]: v })); }
  return (
    <div className="page">
      <div className="page-header"><h1>پروفایل من</h1></div>
      <div className="form-field"><label>نام و نام خانوادگی</label><input value={form.fullName} onChange={e => update('fullName', e.target.value)} /></div>
      <div className="form-field"><label>نام آرایشگاه</label><input value={form.salonName} onChange={e => update('salonName', e.target.value)} /></div>
      <div className="form-field"><label>شماره تماس آرایشگاه</label><input value={form.salonPhone} onChange={e => update('salonPhone', e.target.value)} inputMode="numeric" /></div>
      <div className="form-field"><label>آدرس</label><input value={form.address} onChange={e => update('address', e.target.value)} /></div>
      <div className="form-row">
        <div className="form-field"><label>ساعت شروع کاری</label><input type="time" value={form.workStart} onChange={e => update('workStart', e.target.value)} /></div>
        <div className="form-field"><label>ساعت پایان کاری</label><input type="time" value={form.workEnd} onChange={e => update('workEnd', e.target.value)} /></div>
      </div>
      <div className="form-field"><label>توضیحات</label><input value={form.bio} onChange={e => update('bio', e.target.value)} placeholder="یک معرفی کوتاه از آرایشگاه" /></div>
      <button className="primary-btn" onClick={() => onSave(form)}>ذخیره تغییرات</button>
    </div>
  );
}

function ServicesPage({ services, onAdd, onDelete }) {
  const [name, setName] = useState('');
  function submit() {
    if (!name.trim()) return;
    onAdd({ id: 'svc' + Date.now(), name: name.trim() });
    setName('');
  }
  return (
    <div className="page">
      <div className="page-header"><h1>خدمات</h1></div>
      <div className="card-list" style={{ marginBottom: 18 }}>
        {services.map(s => (
          <div className="service-row" key={s.id}>
            <p className="service-name">{s.name}</p>
            <button className="icon-btn danger" onClick={() => onDelete(s.id)}><Trash2 size={16} /></button>
          </div>
        ))}
        {services.length === 0 && <EmptyNote text="هنوز خدمتی ثبت نشده" />}
      </div>
      <div className="report-card">
        <h2>افزودن خدمت جدید</h2>
        <div className="form-field"><label>نام خدمت</label><input value={name} onChange={e => setName(e.target.value)} placeholder="مثلا کوتاهی مو" /></div>
        <p className="about-text" style={{ marginBottom: 14 }}>قیمت و مدت‌زمان لازم نیست از قبل ثبت بشه؛ موقع تکمیل هر نوبت، مبلغ همون نوبت رو وارد می‌کنی.</p>
        <button className="primary-btn" onClick={submit} disabled={!name.trim()}>افزودن خدمت</button>
      </div>
    </div>
  );
}

function AboutPage() {
  return (
    <div className="page">
      <div className="page-header"><h1>درباره ما</h1></div>
      <div className="report-card">
        <h2>نوبتم</h2>
        <p className="about-text">نوبتم دستیار مدیریت نوبت و مشتریان آرایشگاه شماست؛ نوبت‌ها را ثبت کنید، پرونده مشتری‌ها را دنبال کنید و عملکرد روزانه‌تان را در یک نگاه ببینید.</p>
      </div>
    </div>
  );
}

function BackupPage({ customers, appointments, services, profile, onRestore, showToast }) {
  const [importText, setImportText] = useState('');
  const fileInputRef = useRef(null);

  function buildBackup() {
    return { version: 1, exportedAt: new Date().toISOString(), customers, appointments, services, profile };
  }

  function handleDownload() {
    try {
      const data = JSON.stringify(buildBackup(), null, 2);
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `novbatam-backup-${todayISO()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('فایل پشتیبان دانلود شد');
    } catch (e) {
      showToast('دانلود انجام نشد؛ از گزینه کپی متن استفاده کن');
    }
  }

  function handleCopy() {
    const data = JSON.stringify(buildBackup(), null, 2);
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(data).then(() => showToast('متن پشتیبان کپی شد')).catch(() => showToast('کپی انجام نشد'));
    } else {
      showToast('کپی خودکار پشتیبانی نمی‌شود');
    }
  }

  function applyRestore(obj) {
    if (!obj || typeof obj !== 'object') { showToast('فایل پشتیبان معتبر نیست'); return; }
    onRestore({
      customers: Array.isArray(obj.customers) ? obj.customers : [],
      appointments: Array.isArray(obj.appointments) ? obj.appointments : [],
      services: Array.isArray(obj.services) && obj.services.length ? obj.services : DEFAULT_SERVICES,
      profile: obj.profile && typeof obj.profile === 'object' ? obj.profile : DEFAULT_PROFILE,
    });
    showToast('اطلاعات بازیابی شد');
  }

  function handleFilePicked(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try { applyRestore(JSON.parse(reader.result)); }
      catch (err) { showToast('فایل پشتیبان معتبر نیست'); }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  function handleTextRestore() {
    try { applyRestore(JSON.parse(importText)); setImportText(''); }
    catch (err) { showToast('متن وارد شده معتبر نیست'); }
  }

  return (
    <div className="page">
      <div className="page-header"><h1>پشتیبان‌گیری</h1></div>

      <div className="report-card">
        <h2>گرفتن نسخه پشتیبان</h2>
        <p className="about-text" style={{ marginBottom: 14 }}>یک فایل شامل تمام نوبت‌ها، مشتری‌ها، خدمات و پروفایل تهیه می‌شود که می‌توانی جای امنی نگه داری.</p>
        <button className="primary-btn" onClick={handleDownload}><DownloadCloud size={16} style={{ verticalAlign: 'middle', marginLeft: 6 }} />دانلود فایل پشتیبان</button>
        <button className="primary-btn" style={{ background: 'var(--gold)', marginTop: 8 }} onClick={handleCopy}>کپی کردن به‌صورت متن</button>
      </div>

      <div className="report-card">
        <h2>بازیابی از فایل</h2>
        <p className="about-text" style={{ marginBottom: 14 }}>یک فایل پشتیبان قبلی را انتخاب کن تا جای اطلاعات فعلی بنشیند.</p>
        <input ref={fileInputRef} type="file" accept="application/json" onChange={handleFilePicked} style={{ display: 'none' }} />
        <button className="primary-btn" style={{ background: 'var(--primary-dark)' }} onClick={() => fileInputRef.current?.click()}><UploadCloud size={16} style={{ verticalAlign: 'middle', marginLeft: 6 }} />انتخاب فایل پشتیبان</button>
      </div>

      <div className="report-card">
        <h2>بازیابی از متن</h2>
        <div className="form-field">
          <textarea className="backup-textarea" rows={5} value={importText} onChange={e => setImportText(e.target.value)} placeholder="متن پشتیبان را اینجا paste کن" />
        </div>
        <button className="primary-btn" disabled={!importText.trim()} onClick={handleTextRestore}>بازیابی از متن</button>
      </div>
    </div>
  );
}

function BottomNav({ tab, setTab }) {
  const items = [
    { key: 'appointments', label: 'نوبت‌ها', icon: CalendarClock },
    { key: 'home', label: 'صفحه اصلی', icon: Home },
    { key: 'customers', label: 'مشتری‌ها', icon: Users },
    { key: 'reports', label: 'گزارش', icon: BarChart3 },
  ];
  return (
    <nav className="bottom-nav">
      {items.map(it => {
        const Icon = it.icon;
        const active = tab === it.key;
        if (it.key === 'home') {
          return <button key={it.key} className={'nav-home' + (active ? ' nav-home-active' : '')} onClick={() => setTab('home')}><Icon size={22} /></button>;
        }
        return (
          <button key={it.key} className={'nav-item' + (active ? ' nav-item-active' : '')} onClick={() => setTab(it.key)}>
            <Icon size={20} /><span>{it.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

function MenuDrawer({ open, onClose, tab, setTab }) {
  if (!open) return null;
  const items = [
    { key: 'profile', label: 'پروفایل من', icon: CircleUserRound, bold: true },
    { key: 'appointments', label: 'نوبت‌ها', icon: CalendarClock },
    { key: 'customers', label: 'مشتری‌ها', icon: Users },
    { key: 'reports', label: 'گزارش', icon: BarChart3 },
    { key: 'services', label: 'خدمات', icon: Scissors },
    { key: 'backup', label: 'پشتیبان‌گیری', icon: DownloadCloud },
    { key: 'about', label: 'درباره ما', icon: Info },
  ];
  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div className="drawer">
        <div className="drawer-head">
          <div className="drawer-avatar"><CircleUserRound size={28} /></div>
          <button className="icon-btn" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="drawer-list">
          {items.map(it => {
            const Icon = it.icon;
            const active = tab === it.key;
            return (
              <button key={it.key} className={'drawer-item' + (it.bold ? ' drawer-item-bold' : '') + (active ? ' drawer-item-active' : '')} onClick={() => { setTab(it.key); onClose(); }}>
                <Icon size={it.bold ? 22 : 19} />
                <span>{it.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}

function AddHandle({ onOpenAppt, onOpenCustomer }) {
  const [open, setOpen] = useState(false);
  const [dragX, setDragX] = useState(0);
  const draggingRef = useRef(false);
  const startRef = useRef(0);
  const THRESHOLD = 46;
  const MAX = 64;

  function onPointerDown(e) {
    draggingRef.current = true;
    startRef.current = e.clientX;
    e.currentTarget.setPointerCapture?.(e.pointerId);
  }
  function onPointerMove(e) {
    if (!draggingRef.current) return;
    const dx = e.clientX - startRef.current;
    setDragX(Math.max(0, Math.min(MAX, dx)));
  }
  function onPointerUp() {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    if (dragX >= THRESHOLD) setOpen(true);
    setDragX(0);
  }

  return (
    <>
      {open && <div className="add-overlay" onClick={() => setOpen(false)} />}
      <div
        className="add-handle"
        style={{ transform: `translateY(-50%) translateX(${dragX}px)` }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <ChevronsRight size={14} />
      </div>
      {open && (
        <div className="add-panel">
          <button className="add-panel-btn" onClick={() => { setOpen(false); onOpenAppt(); }}><CalendarClock size={18} />نوبت جدید</button>
          <button className="add-panel-btn" onClick={() => { setOpen(false); onOpenCustomer(); }}><Users size={18} />مشتری جدید</button>
        </div>
      )}
    </>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        <div className="modal-head"><h3>{title}</h3><button className="icon-btn" onClick={onClose}><X size={18} /></button></div>
        {children}
      </div>
    </div>
  );
}

function AddCustomerModal({ onClose, onSave, initial }) {
  const [name, setName] = useState(initial?.name || '');
  const [phone, setPhone] = useState(initial?.phone || '');
  const [avatarIndex, setAvatarIndex] = useState(initial?.avatarIndex ?? 0);
  const isEdit = !!initial;
  return (
    <Modal title={isEdit ? 'ویرایش مشتری' : 'مشتری جدید'} onClose={onClose}>
      <div className="form-field">
        <label>انتخاب آواتار</label>
        <div className="avatar-picker">
          {AVATAR_PALETTE.map((p, i) => (
            <button key={i} type="button" className={'avatar-swatch' + (avatarIndex === i ? ' avatar-swatch-active' : '')} style={{ background: p.bg, color: p.fg }} onClick={() => setAvatarIndex(i)}>
              {name.trim().charAt(0) || <CircleUserRound size={18} />}
            </button>
          ))}
        </div>
      </div>
      <div className="form-field"><label>نام و نام خانوادگی</label><input value={name} onChange={e => setName(e.target.value)} placeholder="مثلا سارا احمدی" /></div>
      <div className="form-field"><label>شماره تماس</label><input value={phone} onChange={e => setPhone(e.target.value)} placeholder="۰۹xxxxxxxxx" inputMode="numeric" /></div>
      <button className="primary-btn" disabled={!name.trim()} onClick={() => onSave({ id: initial?.id, name: name.trim(), phone: phone.trim(), avatarIndex })}>{isEdit ? 'ذخیره تغییرات' : 'ثبت مشتری'}</button>
    </Modal>
  );
}

function ServiceMultiSelect({ services, selectedIds, onToggle }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const selected = services.filter(s => selectedIds.includes(s.id));

  useEffect(() => {
    if (!open) return;
    function onDocClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  return (
    <div className="ms-wrap" ref={wrapRef}>
      <button type="button" className="ms-control" onClick={() => setOpen(o => !o)}>
        <span className={'ms-control-text' + (selected.length ? '' : ' ms-placeholder')}>
          {selected.length ? selected.map(s => s.name).join('، ') : 'انتخاب خدمات'}
        </span>
        <ChevronDown size={16} className={'ms-chevron' + (open ? ' ms-chevron-open' : '')} />
      </button>
      {open && (
        <div className="ms-panel">
          {services.length === 0 && <p className="about-text" style={{ padding: '10px 6px' }}>هنوز خدمتی ثبت نشده — اول از بخش «خدمات» یکی اضافه کن.</p>}
          {services.map(s => {
            const checked = selectedIds.includes(s.id);
            return (
              <button type="button" key={s.id} className={'ms-option' + (checked ? ' ms-option-active' : '')} onClick={() => onToggle(s.id)}>
                <span className={'ms-check' + (checked ? ' ms-check-active' : '')}>{checked && <CheckCircle2 size={13} />}</span>
                <span>{s.name}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CompleteAppointmentModal({ appt, services, onClose, onConfirm }) {
  const [serviceIds, setServiceIds] = useState(appt.serviceIds && appt.serviceIds.length ? appt.serviceIds : []);
  const [price, setPrice] = useState(String(appt.price || ''));

  function toggleService(id) {
    setServiceIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  return (
    <Modal title="تکمیل نوبت" onClose={onClose}>
      <div className="detail-stats" style={{ marginBottom: 14 }}>
        <div className="detail-stat"><span className="detail-stat-label">مشتری</span><span className="detail-stat-value">{appt.customerName}</span></div>
        <div className="detail-stat"><span className="detail-stat-label">تاریخ</span><span className="detail-stat-value">{formatDayLabel(appt.date)}</span></div>
      </div>
      <div className="form-field">
        <label>خدمات انجام‌شده</label>
        <ServiceMultiSelect services={services} selectedIds={serviceIds} onToggle={toggleService} />
      </div>
      <div className="form-field">
        <label>مبلغ نهایی (تومان)</label>
        <input value={price} onChange={e => setPrice(e.target.value.replace(/[^0-9]/g, ''))} inputMode="numeric" placeholder="مثلا ۱۵۰۰۰۰" autoFocus />
      </div>
      <button className="primary-btn" disabled={!serviceIds.length || !price} onClick={() => onConfirm({ serviceIds, price: Number(price) })}>ثبت و تکمیل نوبت</button>
    </Modal>
  );
}

function AddAppointmentModal({ customers, onClose, onSave, initial }) {
  const isEdit = !!initial;
  const [customerId, setCustomerId] = useState(initial?.customerId || customers[0]?.id || '');
  const [date, setDate] = useState(initial?.date || todayISO());
  const [hour, setHour] = useState(initial?.hour ?? 10);
  const [minute, setMinute] = useState(initial?.minute ?? 0);
  return (
    <Modal title={isEdit ? 'ویرایش نوبت' : 'نوبت جدید'} onClose={onClose}>
      <div className="form-field">
        <label>مشتری</label>
        <select value={customerId} onChange={e => setCustomerId(e.target.value)}>
          {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <div className="form-row">
        <div className="form-field"><label>تاریخ</label><input type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
        <div className="form-field">
          <label>ساعت</label>
          <select value={hour} onChange={e => setHour(Number(e.target.value))}>
            {Array.from({ length: 12 }, (_, i) => i + 9).map(h => <option key={h} value={h}>{toPersianDigits(pad(h))}</option>)}
          </select>
        </div>
        <div className="form-field">
          <label>دقیقه</label>
          <select value={minute} onChange={e => setMinute(Number(e.target.value))}>
            {[0, 15, 30, 45].map(m => <option key={m} value={m}>{toPersianDigits(pad(m))}</option>)}
          </select>
        </div>
      </div>
      <p className="about-text" style={{ marginBottom: 14 }}>خدمت و مبلغ، هنگام تکمیل نوبت مشخص می‌شود.</p>
      <button className="primary-btn" disabled={!customerId} onClick={() => onSave({ id: initial?.id, customerId, date, hour, minute })}>{isEdit ? 'ذخیره تغییرات' : 'ثبت نوبت'}</button>
    </Modal>
  );
}

export default function NovbatamApp() {
  const [tab, setTabRaw] = useState('home');
  const [customers, setCustomers] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [services, setServices] = useState([]);
  const [profile, setProfile] = useState(DEFAULT_PROFILE);
  const [loaded, setLoaded] = useState(false);

  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [apptModalOpen, setApptModalOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState(null);
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [openSwipeId, setOpenSwipeId] = useState(null);
  const [toast, setToast] = useState(null);
  const [completingAppointment, setCompletingAppointment] = useState(null);
  const backPressRef = useRef(0);

  function setTab(t) { setSelectedCustomerId(null); setOpenSwipeId(null); setTabRaw(t); }

  useEffect(() => {
    window.history.pushState({ nvbm: true }, '');
    function onPopState() {
      const now = Date.now();
      if (now - backPressRef.current < 2000) {
        // second back-press within the window: let the app actually exit
        return;
      }
      backPressRef.current = now;
      showToast('برای خروج از برنامه، دوباره دکمه برگشت را بزنید');
      window.history.pushState({ nvbm: true }, '');
    }
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    (async () => {
      async function loadKey(key) {
        try { const r = await storage.get(key); return r && r.value ? JSON.parse(r.value) : null; }
        catch (e) { return null; }
      }
      let cust = await loadKey('novbatam-customers');
      let appt = await loadKey('novbatam-appointments');
      let svc = await loadKey('novbatam-services');
      let prof = await loadKey('novbatam-profile');

      if (!cust || !appt) {
        const seed = buildSeed();
        cust = cust || seed.customers;
        appt = appt || seed.appointments;
        try {
          await storage.set('novbatam-customers', JSON.stringify(cust));
          await storage.set('novbatam-appointments', JSON.stringify(appt));
        } catch (e) {}
      }
      if (!svc) {
        svc = DEFAULT_SERVICES;
        try { await storage.set('novbatam-services', JSON.stringify(svc)); } catch (e) {}
      }
      if (!prof) {
        prof = DEFAULT_PROFILE;
        try { await storage.set('novbatam-profile', JSON.stringify(prof)); } catch (e) {}
      }

      setCustomers(cust);
      setAppointments(appt);
      setServices(svc);
      setProfile(prof);
      setLoaded(true);
    })();
  }, []);

  const persistCustomers = useCallback(async (next) => {
    setCustomers(next);
    try { await storage.set('novbatam-customers', JSON.stringify(next)); } catch (e) {}
  }, []);
  const persistAppointments = useCallback(async (next) => {
    setAppointments(next);
    try { await storage.set('novbatam-appointments', JSON.stringify(next)); } catch (e) {}
  }, []);
  const persistServices = useCallback(async (next) => {
    setServices(next);
    try { await storage.set('novbatam-services', JSON.stringify(next)); } catch (e) {}
  }, []);
  const persistProfile = useCallback(async (next) => {
    setProfile(next);
    try { await storage.set('novbatam-profile', JSON.stringify(next)); } catch (e) {}
  }, []);

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(null), 2200); }

  function saveCustomer(data) {
    if (data.id) {
      persistCustomers(customers.map(c => c.id === data.id ? { ...c, name: data.name, phone: data.phone, avatarIndex: data.avatarIndex } : c));
      showToast('اطلاعات مشتری به‌روزرسانی شد');
    } else {
      const c = { id: 'c' + Date.now(), visits: 0, lastVisit: null, createdAt: todayISO(), name: data.name, phone: data.phone, avatarIndex: data.avatarIndex };
      persistCustomers([c, ...customers]);
      showToast('مشتری جدید ثبت شد');
    }
    setCustomerModalOpen(false); setEditingCustomer(null);
  }

  function deleteCustomer(id) {
    persistCustomers(customers.filter(c => c.id !== id));
    if (selectedCustomerId === id) setSelectedCustomerId(null);
    showToast('مشتری حذف شد');
  }

  function saveAppointment(data) {
    const customer = customers.find(c => c.id === data.customerId);
    if (data.id) {
      persistAppointments(appointments.map(a => a.id === data.id ? {
        ...a, customerId: data.customerId, customerName: customer ? customer.name : a.customerName,
        date: data.date, hour: data.hour, minute: data.minute,
      } : a));
      showToast('نوبت به‌روزرسانی شد');
    } else {
      const a = {
        id: 'a' + Date.now(), customerId: data.customerId, customerName: customer ? customer.name : '',
        serviceIds: [], serviceNames: [], price: 0,
        date: data.date, hour: data.hour, minute: data.minute, status: 'confirmed',
      };
      persistAppointments([...appointments, a]);
      showToast('نوبت جدید ثبت شد');
    }
    setApptModalOpen(false); setEditingAppointment(null);
  }

  function deleteAppointment(id) {
    persistAppointments(appointments.filter(a => a.id !== id));
    showToast('نوبت حذف شد');
  }

  function openComplete(appt) { setCompletingAppointment(appt); }

  function confirmComplete({ serviceIds, price }) {
    const appt = completingAppointment;
    if (!appt) return;
    const chosen = services.filter(s => serviceIds.includes(s.id));
    persistAppointments(appointments.map(a => a.id === appt.id ? {
      ...a, status: 'done', serviceIds, serviceNames: chosen.map(s => s.name), price,
    } : a));
    persistCustomers(customers.map(c => c.id === appt.customerId ? { ...c, visits: c.visits + 1, lastVisit: appt.date } : c));
    showToast('نوبت تکمیل و مبلغ ثبت شد');
    setCompletingAppointment(null);
  }

  function addService(s) { persistServices([...services, s]); showToast('خدمت جدید اضافه شد'); }
  function deleteService(id) { persistServices(services.filter(s => s.id !== id)); showToast('خدمت حذف شد'); }

  function restoreBackup(data) {
    if (Array.isArray(data.customers)) persistCustomers(data.customers);
    if (Array.isArray(data.appointments)) persistAppointments(data.appointments);
    if (Array.isArray(data.services)) persistServices(data.services);
    if (data.profile) persistProfile(data.profile);
  }

  if (!loaded) {
    return <div className="nvbm-root"><style>{CSS}</style><div className="loading-wrap">در حال بارگذاری...</div></div>;
  }

  const selectedCustomer = selectedCustomerId ? customers.find(c => c.id === selectedCustomerId) : null;

  return (
    <div className="nvbm-root">
      <style>{CSS}</style>

      <div className="top-menu-row">
        <button className="menu-btn" onClick={() => setMenuOpen(true)}><CircleUserRound size={20} /></button>
      </div>

      {tab === 'home' && <HomePage profile={profile} customers={customers} appointments={appointments} onGoTab={setTab} onComplete={openComplete} />}
      {tab === 'appointments' && (
        <AppointmentsPage
          appointments={appointments}
          onComplete={openComplete}
          onEdit={(a) => { setEditingAppointment(a); setApptModalOpen(true); }}
          onDelete={deleteAppointment}
          openId={openSwipeId}
          setOpenId={setOpenSwipeId}
        />
      )}
      {tab === 'customers' && !selectedCustomer && (
        <CustomersPage
          customers={customers}
          onSelect={setSelectedCustomerId}
          onEdit={(c) => { setEditingCustomer(c); setCustomerModalOpen(true); }}
          onDelete={deleteCustomer}
          openId={openSwipeId}
          setOpenId={setOpenSwipeId}
        />
      )}
      {tab === 'customers' && selectedCustomer && (
        <CustomerDetailPage customer={selectedCustomer} appointments={appointments} onBack={() => setSelectedCustomerId(null)} />
      )}
      {tab === 'reports' && <ReportsPage appointments={appointments} services={services} />}
      {tab === 'profile' && <ProfilePage profile={profile} onSave={(p) => { persistProfile(p); showToast('پروفایل ذخیره شد'); }} />}
      {tab === 'services' && <ServicesPage services={services} onAdd={addService} onDelete={deleteService} />}
      {tab === 'backup' && <BackupPage customers={customers} appointments={appointments} services={services} profile={profile} onRestore={restoreBackup} showToast={showToast} />}
      {tab === 'about' && <AboutPage />}

      <BottomNav tab={tab} setTab={setTab} />
      <AddHandle
        onOpenAppt={() => { setEditingAppointment(null); setApptModalOpen(true); }}
        onOpenCustomer={() => { setEditingCustomer(null); setCustomerModalOpen(true); }}
      />
      <MenuDrawer open={menuOpen} onClose={() => setMenuOpen(false)} tab={tab} setTab={setTab} />

      {apptModalOpen && (
        <AddAppointmentModal
          customers={customers}
          initial={editingAppointment}
          onClose={() => { setApptModalOpen(false); setEditingAppointment(null); }}
          onSave={saveAppointment}
        />
      )}
      {customerModalOpen && (
        <AddCustomerModal
          initial={editingCustomer}
          onClose={() => { setCustomerModalOpen(false); setEditingCustomer(null); }}
          onSave={saveCustomer}
        />
      )}
      {completingAppointment && (
        <CompleteAppointmentModal
          appt={completingAppointment}
          services={services}
          onClose={() => setCompletingAppointment(null)}
          onConfirm={confirmComplete}
        />
      )}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
