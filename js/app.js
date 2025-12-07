// js/app.js
// Validáció + localStorage mentés + statisztika-megjelenítés (canvas grafikon)

document.addEventListener('DOMContentLoaded', () => {
  // ----- KÖLTSÉG ŰRLAP: validáció + mentés -----
  const form = document.getElementById('expenseForm');
  if (form) {
    const dateInput = document.getElementById('date');
    const categoryInput = document.getElementById('category');
    const amountInput = document.getElementById('amount');
    const confirmInput = document.getElementById('confirm');

    const errDate = document.getElementById('error-date');
    const errCategory = document.getElementById('error-category');
    const errAmount = document.getElementById('error-amount');
    const errPayment = document.getElementById('error-payment');
    const errConfirm = document.getElementById('error-confirm');

    function isPaymentSelected() {
      const radios = document.getElementsByName('payment');
      return Array.from(radios).some(r => r.checked);
    }

    function clearErrors() {
      [errDate, errCategory, errAmount, errPayment, errConfirm].forEach(e => { if (e) e.textContent = ''; });
      form.querySelectorAll('input, select, textarea').forEach(i => i.classList.remove('input-error'));
      const radioGroup = form.querySelector('.radio-group');
      if (radioGroup) radioGroup.classList.remove('input-error');
    }

    // Segédfüggvény: mentés localStorage-ba (tömbként)
    function saveExpense(obj) {
      const key = 'expenses_v1';
      const raw = localStorage.getItem(key);
      const arr = raw ? JSON.parse(raw) : [];
      arr.push(obj);
      localStorage.setItem(key, JSON.stringify(arr));
    }

    form.addEventListener('submit', function (ev) {
      ev.preventDefault(); // mindig kezeljük JS-sel (egyszerűbb tesztelni)
      clearErrors();
      let isValid = true;

      // 1) Dátum
      if (!dateInput || dateInput.value.trim() === '') {
        if (errDate) errDate.textContent = 'A dátum megadása kötelező.';
        if (dateInput) dateInput.classList.add('input-error');
        isValid = false;
      }

      // 2) Kategória
      if (!categoryInput || categoryInput.value === '') {
        if (errCategory) errCategory.textContent = 'Kérlek válassz kategóriát.';
        if (categoryInput) categoryInput.classList.add('input-error');
        isValid = false;
      }

      // 3) Összeg
      const amountVal = Number(amountInput ? amountInput.value : 0);
      if (!amountInput || isNaN(amountVal) || amountVal <= 0) {
        if (errAmount) errAmount.textContent = 'Adj meg egy 0-nál nagyobb összeget.';
        if (amountInput) amountInput.classList.add('input-error');
        isValid = false;
      }

      // 4) Fizetési mód
      if (!isPaymentSelected()) {
        if (errPayment) errPayment.textContent = 'Válassz fizetési módot.';
        const radioGroup = form.querySelector('.radio-group');
        if (radioGroup) radioGroup.classList.add('input-error');
        isValid = false;
      }

      // 5) Confirm checkbox
      if (!confirmInput || !confirmInput.checked) {
        if (errConfirm) errConfirm.textContent = 'Kérlek jelöld be, hogy ellenőrizted az adatokat.';
        if (confirmInput) confirmInput.classList.add('input-error');
        isValid = false;
      }

      if (!isValid) {
        console.log('Űrlap validáció: hibák találhatók.');
        return;
      }

      // Ha érvényes: összegyűjtjük az adatokat és elmentjük
      const payment = (document.querySelector('input[name="payment"]:checked') || {}).value || 'cash';
      const entry = {
        id: 'e_' + Date.now(),
        date: dateInput.value,
        category: categoryInput.value,
        amount: Number(amountInput.value),
        label: document.getElementById('label') ? document.getElementById('label').value : '',
        notes: document.getElementById('notes') ? document.getElementById('notes').value : '',
        payment: payment,
        createdAt: new Date().toISOString()
      };

      saveExpense(entry);

      // Rövid visszajelzés: alert vagy itt console
      console.log('Költség elmentve:', entry);
      // töröljük az űrlapot (reset)
      form.reset();
      // opcionálisan: frissítsük a statisztika oldalt, ha nyitva van (lokálisan elég)
      alert('Költség rögzítve.');
    });
  }

  // ----- STATISZTIKA OLDAL: ha ott vagyunk, olvassuk a localStorage-t és jelenítsük meg -----
  const statsSummary = document.getElementById('stats-summary');
  const totalSpentEl = document.getElementById('total-spent');
  const entryCountEl = document.getElementById('entry-count');
  const maxExpenseEl = document.getElementById('max-expense');
  const categoryListEl = document.getElementById('category-stats');
  const canvas = document.getElementById('statsChart');

  if (statsSummary && totalSpentEl && entryCountEl && maxExpenseEl && categoryListEl && canvas) {
    const raw = localStorage.getItem('expenses_v1');
    const arr = raw ? JSON.parse(raw) : [];

    // Összes költés és darabszám
    const total = arr.reduce((s, e) => s + (Number(e.amount) || 0), 0);
    totalSpentEl.textContent = total.toFixed(0);
    entryCountEl.textContent = arr.length;

    // Legnagyobb tétel
    if (arr.length === 0) {
      maxExpenseEl.textContent = '—';
    } else {
      const max = arr.reduce((m, e) => (e.amount > m ? e.amount : m), 0);
      maxExpenseEl.textContent = max.toFixed(0) + ' Ft';
    }

    // Kategória összesítés
    const byCat = {};
    arr.forEach(e => {
      const c = e.category || 'egyeb';
      byCat[c] = (byCat[c] || 0) + (Number(e.amount) || 0);
    });

    // Megjelenítés listában
    categoryListEl.innerHTML = '';
    Object.keys(byCat).forEach(cat => {
      const li = document.createElement('li');
      li.textContent = `${capitalize(cat)}: ${byCat[cat].toFixed(0)} Ft`;
      categoryListEl.appendChild(li);
    });

    // Egyszerű oszlopdiagram rajzolása canvasra
    drawBarChart(canvas, byCat);
  }

  // ----- Segédfüggvények -----
  function capitalize(s) {
    if (!s) return s;
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  function drawBarChart(canvasEl, dataObj) {
    const ctx = canvasEl.getContext('2d');
    const w = canvasEl.width;
    const h = canvasEl.height;
    ctx.clearRect(0, 0, w, h);

    const keys = Object.keys(dataObj);
    if (keys.length === 0) {
      ctx.fillStyle = '#999';
      ctx.font = '14px Arial';
      ctx.fillText('Nincs adat a grafikonhoz.', 10, 20);
      return;
    }

    const vals = keys.map(k => dataObj[k]);
    const max = Math.max(...vals);

    // grafikon margók
    const margin = 20;
    const chartW = w - margin * 2;
    const chartH = h - margin * 2;
    const barW = Math.max(20, chartW / keys.length - 10);

    keys.forEach((k, i) => {
      const val = dataObj[k];
      const x = margin + i * (barW + 10);
      const barH = (val / max) * chartH;
      const y = margin + (chartH - barH);

      // oszlop
      ctx.fillStyle = '#3498db';
      ctx.fillRect(x, y, barW, barH);

      // érték feliratozása
      ctx.fillStyle = '#222';
      ctx.font = '12px Arial';
      ctx.fillText(Math.round(val) + ' Ft', x, y - 6);

      // kategória felirat (tördelés egyszerűen)
      ctx.save();
      ctx.translate(x + barW / 2, h - margin + 10);
      ctx.rotate(-0.3);
      ctx.textAlign = 'right';
      ctx.fillText(capitalize(k), 0, 0);
      ctx.restore();
    });
  }
});
