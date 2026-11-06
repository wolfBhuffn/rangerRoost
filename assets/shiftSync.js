/**
 * RANGER_ROOST / Shift Sync Core
 * Synchronizes active timer state and historical ledger data across pages using localStorage.
 */

const STORAGE_KEYS = {
  ACTIVE_SHIFT: 'rr_active_shift',
  SHIFTS_LEDGER: 'rr_shifts_ledger',
  HOURLY_RATE: 'rr_default_rate'
};

// Default initial ledger seeds if empty
const DEFAULT_LEDGER = [
  { id: 1, date: '2026-11-05', note: 'Ranger_Roost multi-page static layout & CSS overhaul', rate: 20.00, hours: 6.5, total: 130.00 },
  { id: 2, date: '2026-11-04', note: 'Multi-agent fallback array & Gemini API integration', rate: 20.00, hours: 8.0, total: 160.00 },
  { id: 3, date: '2026-11-02', note: 'Net worth telemetry & ledger_store.json sync loop', rate: 20.00, hours: 5.5, total: 110.00 },
  { id: 4, date: '2026-11-01', note: 'Render cloud deployment & GitHub Pages setup', rate: 20.00, hours: 4.5, total: 90.00 },
  { id: 5, date: '2026-10-30', note: 'CLI terminal input interpreter & command routing', rate: 20.00, hours: 6.0, total: 120.00 }
];

let shiftInterval = null;

// Initialize Storage State
function initShiftStore() {
  if (!localStorage.getItem(STORAGE_KEYS.SHIFTS_LEDGER)) {
    localStorage.setItem(STORAGE_KEYS.SHIFTS_LEDGER, JSON.stringify(DEFAULT_LEDGER));
  }
  if (!localStorage.getItem(STORAGE_KEYS.HOURLY_RATE)) {
    localStorage.setItem(STORAGE_KEYS.HOURLY_RATE, '20.00');
  }
}

// Get standard stored ledger
function getLedger() {
  initShiftStore();
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.SHIFTS_LEDGER)) || [];
}

// Calculate totals from local ledger
function calculateMetrics() {
  const ledger = getLedger();
  let totalHours = 0;
  let totalPay = 0;

  ledger.forEach(shift => {
    totalHours += parseFloat(shift.hours || 0);
    totalPay += parseFloat(shift.total || 0);
  });

  return {
    allTimeHours: totalHours.toFixed(1),
    allTimePay: totalPay.toFixed(2),
    totalShifts: ledger.length
  };
}

// Update DOM elements on Overview/Console pages
function syncUI() {
  const metrics = calculateMetrics();

  // Metrics elements
  const allHoursEl = document.getElementById('metricAllHours');
  const allPayEl = document.getElementById('metricAllPay');
  const totalShiftsEl = document.getElementById('metricTotalShifts');

  if (allHoursEl) allHoursEl.textContent = `${metrics.allTimeHours}h`;
  if (allPayEl) allPayEl.textContent = `$${Number(metrics.allTimePay).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  if (totalShiftsEl) totalShiftsEl.textContent = `${metrics.totalShifts} Shifts`;

  // Restore Active Shift State
  const activeShift = JSON.parse(localStorage.getItem(STORAGE_KEYS.ACTIVE_SHIFT));
  const btn = document.getElementById('shiftButton');
  const statusInd = document.getElementById('statusIndicator');
  const statusTxt = document.getElementById('statusText');
  const timerDisplay = document.getElementById('liveTimerDisplay');
  const rateInput = document.getElementById('hourlyRateInput');

  if (activeShift && btn) {
    btn.innerHTML = 'END SHIFT &times;';
    btn.className = 'inline-flex h-10 items-center justify-center bg-amber-400 px-6 font-mono text-[10px] font-medium tracking-[.1em] text-[#171a1b] hover:bg-amber-300 transition-colors';
    if (statusInd) statusInd.className = 'h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse';
    if (statusTxt) statusTxt.textContent = 'SHIFT IN PROGRESS';
    if (timerDisplay) timerDisplay.classList.remove('hidden');
    if (rateInput) {
      rateInput.value = activeShift.rate;
      rateInput.disabled = true;
    }

    startTimerLoop(activeShift.startTime);
  } else if (btn) {
    btn.innerHTML = 'START SHIFT &rarr;';
    btn.className = 'inline-flex h-10 items-center justify-center bg-lime-300 px-6 font-mono text-[10px] font-medium tracking-[.1em] text-[#171a1b] hover:bg-[#d4f378] transition-colors';
    if (statusInd) statusInd.className = 'h-1.5 w-1.5 rounded-full bg-lime-300';
    if (statusTxt) statusTxt.textContent = 'PERSONAL / PRIVATE';
    if (timerDisplay) timerDisplay.classList.add('hidden');
    if (rateInput) rateInput.disabled = false;
    
    if (shiftInterval) clearInterval(shiftInterval);
  }

  // Render shift table if on shifts.html
  renderShiftTable();
}

// Timer Ticking Loop based on absolute start timestamp
function startTimerLoop(startTime) {
  if (shiftInterval) clearInterval(shiftInterval);

  shiftInterval = setInterval(() => {
    const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
    const hrs = String(Math.floor(elapsedSeconds / 3600)).padStart(2, '0');
    const mins = String(Math.floor((elapsedSeconds % 3600) / 60)).padStart(2, '0');
    const secs = String(elapsedSeconds % 60).padStart(2, '0');

    const timerDisplay = document.getElementById('liveTimerDisplay');
    if (timerDisplay) {
      const strong = timerDisplay.querySelector('strong');
      if (strong) strong.textContent = `${hrs}:${mins}:${secs}`;
    }
  }, 1000);
}

// Toggle Clock-in / Clock-out
function toggleShift() {
  const activeShift = JSON.parse(localStorage.getItem(STORAGE_KEYS.ACTIVE_SHIFT));
  const rateInput = document.getElementById('hourlyRateInput');
  const noteInput = document.getElementById('shiftNoteInput');

  if (!activeShift) {
    // Start Shift
    const newShift = {
      startTime: Date.now(),
      rate: rateInput ? parseFloat(rateInput.value) || 20.00 : 20.00,
      note: noteInput ? noteInput.value.trim() : ''
    };
    localStorage.setItem(STORAGE_KEYS.ACTIVE_SHIFT, JSON.stringify(newShift));
  } else {
    // End Shift & Commit to Ledger
    const elapsedSeconds = Math.floor((Date.now() - activeShift.startTime) / 1000);
    const hours = (elapsedSeconds / 3600).toFixed(2);
    const total = (hours * activeShift.rate).toFixed(2);
    const today = new Date().toISOString().split('T')[0];

    const completedShift = {
      id: Date.now(),
      date: today,
      note: activeShift.note || (noteInput ? noteInput.value.trim() : '') || 'General operations',
      rate: activeShift.rate,
      hours: parseFloat(hours),
      total: parseFloat(total)
    };

    const ledger = getLedger();
    ledger.unshift(completedShift);
    localStorage.setItem(STORAGE_KEYS.SHIFTS_LEDGER, JSON.stringify(ledger));
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_SHIFT);

    if (noteInput) noteInput.value = '';
    alert(`Shift logged successfully!\nDuration: ${hours} hrs\nEarned: $${total}`);
  }

  syncUI();
}

// Render dynamic shift table on shifts.html
function renderShiftTable() {
  const tableBody = document.querySelector('tbody');
  if (!tableBody || window.location.pathname.indexOf('shifts.html') === -1) return;

  const ledger = getLedger();
  tableBody.innerHTML = ledger.map(shift => `
    <tr class="hover:bg-[#191d20] transition">
      <td class="px-6 py-4 text-[#89918c]">${shift.date}</td>
      <td class="px-6 py-4 text-[#efeee8]">${shift.note}</td>
      <td class="px-6 py-4">$${parseFloat(shift.rate).toFixed(2)}</td>
      <td class="px-6 py-4">${shift.hours}h</td>
      <td class="px-6 py-4 text-right text-lime-300 font-bold">$${parseFloat(shift.total).toFixed(2)}</td>
    </tr>
  `).join('');
}

// Listen for cross-tab changes in localStorage
window.addEventListener('storage', (e) => {
  if (Object.values(STORAGE_KEYS).includes(e.key)) {
    syncUI();
  }
});

// Run on page load
document.addEventListener('DOMContentLoaded', () => {
  initShiftStore();
  syncUI();
});
