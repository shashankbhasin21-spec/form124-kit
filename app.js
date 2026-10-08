(function () {
  var STORAGE_CHECK = 'form124kit-check-v1';
  var STORAGE_RENT = 'form124kit-rent-v1';
  var ITEMS = [
    { id: 'emp', label: 'Employee details ready (name, address, PAN, contact, tax year) for Form 124 Part A' },
    { id: 'hra-name', label: 'HRA: landlord full name' },
    { id: 'hra-addr', label: 'HRA: landlord address' },
    { id: 'hra-pan', label: 'HRA: landlord PAN (needed if aggregate rent in the tax year exceeds ₹1 lakh)' },
    { id: 'hra-rel', label: 'HRA: relationship with landlord disclosed (if any)' },
    { id: 'hra-rent', label: 'HRA: rent paid / payable figures for the tax year' },
    { id: 'a1', label: 'Annexure A-1: house rent agreement copy' },
    { id: 'receipts', label: 'Monthly rent receipts or bank/UPI proof of rent paid' },
    { id: 'lta', label: 'LTA: tickets / invoices if claiming leave travel (or mark N/A)' },
    { id: 'loan', label: 'Home-loan interest: lender details + interest certificate (or mark N/A)' },
    { id: 'ch8', label: 'Chapter VIII-A & B investment proofs listed as annexures (or mark N/A)' },
    { id: 'decl', label: 'Employee declaration: particulars are correct and complete' },
    { id: 'hr', label: 'Know your employer deadline for Form 124 / proof submission' }
  ];
  var MONTHS = ['Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar'];

  function loadJSON(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch (e) { return fallback; }
  }
  function saveJSON(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
  }

  function renderChecklist() {
    var state = loadJSON(STORAGE_CHECK, {});
    var box = document.getElementById('check-list');
    box.innerHTML = '';
    ITEMS.forEach(function (item) {
      var row = document.createElement('label');
      row.className = 'check-row';
      var cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = !!state[item.id];
      cb.addEventListener('change', function () {
        state[item.id] = cb.checked;
        saveJSON(STORAGE_CHECK, state);
        updateStatus(state);
      });
      var span = document.createElement('span');
      span.textContent = item.label;
      row.appendChild(cb);
      row.appendChild(span);
      box.appendChild(row);
    });
    updateStatus(state);
  }

  function updateStatus(state) {
    var done = ITEMS.filter(function (i) { return state[i.id]; }).length;
    document.getElementById('check-status').textContent =
      done + ' of ' + ITEMS.length + ' items ready on this device.';
  }

  function exportSummary() {
    var state = loadJSON(STORAGE_CHECK, {});
    var rent = loadJSON(STORAGE_RENT, {});
    var lines = ['Form124 Kit summary (not tax advice)', 'Generated locally — ' + new Date().toISOString().slice(0, 10), ''];
    lines.push('Checklist:');
    ITEMS.forEach(function (i) {
      lines.push((state[i.id] ? '[x] ' : '[ ] ') + i.label);
    });
    lines.push('');
    lines.push('Rent log:');
    lines.push('Tax year: ' + (rent.taxYear || '—'));
    lines.push('Landlord: ' + (rent.landlord || '—'));
    lines.push('City: ' + (rent.city || '—'));
    var total = 0;
    MONTHS.forEach(function (m) {
      var v = Number(rent.months && rent.months[m] || 0);
      total += v;
      if (v) lines.push(m + ': ₹' + v);
    });
    lines.push('Total: ₹' + total);
    if (total > 100000) lines.push('Note: aggregate rent > ₹1 lakh — landlord PAN is typically required (confirm on official Form 124 notes).');
    lines.push('');
    lines.push('Official: https://www.incometaxindia.gov.in/documents/d/guest/fn-124');
    var text = lines.join('\n');
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        document.getElementById('check-status').textContent = 'Summary copied to clipboard.';
      }).catch(function () {
        window.prompt('Copy this summary:', text);
      });
    } else {
      window.prompt('Copy this summary:', text);
    }
  }

  function renderRent() {
    var rent = loadJSON(STORAGE_RENT, { taxYear: '', landlord: '', city: '', months: {} });
    document.getElementById('tax-year').value = rent.taxYear || '';
    document.getElementById('landlord').value = rent.landlord || '';
    document.getElementById('city').value = rent.city || '';
    var box = document.getElementById('rent-months');
    box.innerHTML = '';
    MONTHS.forEach(function (m) {
      var row = document.createElement('div');
      row.className = 'month-row';
      var lab = document.createElement('label');
      lab.textContent = m;
      var inp = document.createElement('input');
      inp.type = 'number';
      inp.min = '0';
      inp.step = '1';
      inp.placeholder = '₹';
      inp.dataset.month = m;
      inp.value = rent.months && rent.months[m] ? rent.months[m] : '';
      inp.addEventListener('input', recalc);
      row.appendChild(lab);
      row.appendChild(inp);
      box.appendChild(row);
    });
    recalc();
  }

  function collectRent() {
    var months = {};
    document.querySelectorAll('#rent-months input').forEach(function (inp) {
      var v = Number(inp.value || 0);
      if (v > 0) months[inp.dataset.month] = v;
    });
    return {
      taxYear: document.getElementById('tax-year').value.trim(),
      landlord: document.getElementById('landlord').value.trim(),
      city: document.getElementById('city').value.trim(),
      months: months
    };
  }

  function recalc() {
    var rent = collectRent();
    var total = 0;
    Object.keys(rent.months).forEach(function (k) { total += Number(rent.months[k] || 0); });
    document.getElementById('rent-total').textContent = '₹' + total.toLocaleString('en-IN');
    document.getElementById('pan-hint').textContent = total > 100000
      ? 'Aggregate over ₹1 lakh — gather landlord PAN (confirm on official Form 124 notes).'
      : 'Keep receipts; PAN usually required only if aggregate rent exceeds ₹1 lakh.';
  }

  document.getElementById('btn-export').addEventListener('click', exportSummary);
  document.getElementById('btn-print').addEventListener('click', function () { window.print(); });
  document.getElementById('btn-reset-check').addEventListener('click', function () {
    saveJSON(STORAGE_CHECK, {});
    renderChecklist();
  });
  document.getElementById('btn-save-rent').addEventListener('click', function () {
    saveJSON(STORAGE_RENT, collectRent());
    document.getElementById('pan-hint').textContent += ' Saved on this device.';
  });
  document.getElementById('btn-clear-rent').addEventListener('click', function () {
    saveJSON(STORAGE_RENT, { taxYear: '', landlord: '', city: '', months: {} });
    renderRent();
  });

  renderChecklist();
  renderRent();
})();
