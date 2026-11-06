// shiftSync.js - Ranger_Roost Shift & Overtime Ledger Engine

const BASE_RATE = 21.00;
const OT_RATE = BASE_RATE * 1.5; // $31.50/hr

function calculatePayWithOvertime(hours) {
  if (hours <= 40) {
    return {
      regularHours: hours,
      otHours: 0,
      totalPay: hours * BASE_RATE
    };
  } else {
    const regularHours = 40;
    const otHours = hours - 40;
    const totalPay = (regularHours * BASE_RATE) + (otHours * OT_RATE);
    return {
      regularHours,
      otHours,
      totalPay
    };
  }
}

function syncUI() {
  const ledger = JSON.parse(localStorage.getItem('rr_shifts_ledger')) || [];

  let totalHours = 0;
  let totalEarnings = 0;
  let weekHours = 0;

  // Get start of current week (Sunday)
  const now = new Date();
  const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
  startOfWeek.setHours(0, 0, 0, 0);

  ledger.forEach(shift => {
    const shiftHours = parseFloat(shift.hours) || 0;
    totalHours += shiftHours;
    
    // Check if shift falls into current week
    const shiftDate = new Date(shift.date);
    if (shiftDate >= startOfWeek) {
      weekHours += shiftHours;
    }
  });

  // Calculate current week pay with automatic Overtime detection
  const weekCalculation = calculatePayWithOvertime(weekHours);
  
  // Calculate total historical pay with per-week overtime detection
  // Group ledger entries by ISO week
  const weeklyGroups = {};
  ledger.forEach(shift => {
    const d = new Date(shift.date);
    const yearWeek = `${d.getFullYear()}-W${getWeekNumber(d)}`;
    weeklyGroups[yearWeek] = (weeklyGroups[yearWeek] || 0) + parseFloat(shift.hours || 0);
  });

  totalEarnings = Object.values(weeklyGroups).reduce((acc, hrs) => {
    return acc + calculatePayWithOvertime(hrs).totalPay;
  }, 0);

  // Update Dashboard Overview Elements if present
  const weekHoursEl = document.getElementById('metricWeekHours');
  const weekPayEl = document.getElementById('metricWeekPay');
  const allHoursEl = document.getElementById('metricAllHours');
  const allPayEl = document.getElementById('metricAllPay');

  if (weekHoursEl) {
    weekHoursEl.innerHTML = `${weekHours.toFixed(1)}h ${weekCalculation.otHours > 0 ? `<span class="text-xs text-amber-400">(${weekCalculation.otHours.toFixed(1)}h OT)</span>` : ''}`;
  }
  if (weekPayEl) {
    weekPayEl.textContent = `$${weekCalculation.totalPay.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  if (allHoursEl) {
    allHoursEl.textContent = `${totalHours.toFixed(1)}h`;
  }
  if (allPayEl) {
    allPayEl.textContent = `$${totalEarnings.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
}

// Helper: Get ISO Week Number
function getWeekNumber(d) {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

// Listen for cross-tab storage changes
window.addEventListener('storage', () => {
  syncUI();
});

// Run initial sync on load
document.addEventListener('DOMContentLoaded', () => {
  syncUI();
});
