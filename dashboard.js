let coupons = [], couponLoaded = false;
function showPage(page) {
  $('homePage').hidden = page !== 'home'; $('dashboard').hidden = page !== 'health'; $('couponPage').hidden = page !== 'coupons';
  $('pageTitle').textContent = ({home:'主畫面',health:'員工體檢管理',coupons:'優惠券查詢'})[page];
  $('pageSubtitle').textContent = ({home:'掌握重要提醒與常用功能',health:'掌握員工資料與體檢期限',coupons:'搜尋優惠券與餐點內容'})[page];
  document.querySelectorAll('[data-page]').forEach(b => { b.classList.toggle('active', b.dataset.page === page); if (b.dataset.page === page) b.setAttribute('aria-current','page'); else b.removeAttribute('aria-current'); });
  if (page === 'home') renderHome();
  if (page === 'coupons' && !couponLoaded) { couponLoaded = true; refreshCoupons(); }
}
document.querySelectorAll('[data-page],[data-go]').forEach(b => b.addEventListener('click', () => showPage(b.dataset.page || b.dataset.go)));
function renderHome() {
  const items = [];
  for (const e of employees) {
    const age = currentAge(e);
    for (const [type, date, years] of [['勞工體檢',e.labor_exam_date,age>=65?1:age>=40?3:5],['供膳體檢',e.food_exam_date,1]]) {
      const result = exam(date,years);
      if (result.due) items.push({e,type,result,deadline:addYears(date,years)});
    }
  }
  items.sort((a,b) => a.deadline-b.deadline);
  $('homeReminders').innerHTML = items.length ? items.map(({e,type,result}) => `<div class="reminder"><div><strong>${escapeText(e.name)} · ${type}</strong><small>到期日：${escapeText(result.text)}</small></div><span class="status ${result.state}">${escapeText(result.label)}</span></div>`).join('') : '<p class="empty">目前沒有體檢提醒。</p>';
}
function couponValid(c) { const today = new Date(); const day = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`; return Boolean(c.start_date && c.end_date && c.start_date <= day && c.end_date >= day); }
function renderCoupons() {
  const term = $('couponSearch').value.trim().toLowerCase();
  const terms = id => $(id).value.toLowerCase().split(/[,，]/).map(s=>s.trim()).filter(Boolean);
  const include = terms('couponInclude'), exclude = terms('couponExclude'), validity = $('couponValidity').value;
  const results = coupons.filter(c => { const names = c.items.map(i=>String(i.name || '').toLowerCase()); const text = `${c.coupon_code} ${c.name} ${names.join(' ')}`.toLowerCase(); return text.includes(term) && include.every(t=>names.some(n=>n.includes(t))) && !exclude.some(t=>names.some(n=>n.includes(t))) && (validity === 'all' || (validity === 'valid') === couponValid(c)); });
  const sort = $('couponSort').value;
  results.sort((a,b) => sort === 'date' ? String(a.end_date || '').localeCompare(String(b.end_date || '')) : sort === 'code' ? String(a.coupon_code).localeCompare(String(b.coupon_code)) : (Number(a.price)||0)-(Number(b.price)||0));
  if (sort === 'priceDesc') results.reverse();
  $('couponCount').textContent = `找到 ${results.length} 張優惠券`;
  $('couponResults').innerHTML = results.map(c => `<details class="coupon"><summary><span><strong>${escapeText(c.coupon_code)}　${escapeText(c.name)}</strong><small>${escapeText(c.start_date || '—')} ～ ${escapeText(c.end_date || '—')}</small></span><b>NT$${escapeText(c.price ?? '—')}</b></summary><ul>${c.items.map(i=>`<li>${escapeText(i.name || '')} × ${escapeText(i.count ?? 1)}${Array.isArray(i.flavors) ? i.flavors.map(f=>`<div class="hint">可更換：${escapeText(f.name || '')}　加價 ${escapeText(f.addition_price ?? 0)}</div>`).join('') : ''}</li>`).join('')}</ul></details>`).join('') || '<p class="empty">沒有符合條件的優惠券。</p>';
}
async function refreshCoupons() {
  $('couponRefresh').disabled = true; $('couponNotice').textContent = '正在更新優惠券…';
  try {
    const response = await fetch('https://raw.githubusercontent.com/Winedays/KCouper/master/public/coupon.js', {cache:'no-store'});
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const text = (await response.text()).trim(), prefix = 'window.COUPON_DICT=';
    if (!text.startsWith(prefix)) throw new Error('來源格式不符');
    const data = JSON.parse(text.slice(prefix.length).replace(/;\s*$/, ''));
    if (!Array.isArray(data.coupon_list) || data.coupon_list.some(c=>!c || c.coupon_code == null || c.name == null || !Array.isArray(c.items))) throw new Error('優惠券資料格式不符');
    coupons = data.coupon_list; const snapshot = {data, downloadedAt:new Date().toISOString()};
    try { localStorage.setItem('coupon_snapshot',JSON.stringify(snapshot)); } catch (_) { /* Display still works without a cache. */ }
    $('couponUpdated').textContent = `上次下載：${new Date(snapshot.downloadedAt).toLocaleString('zh-TW')}　來源更新：${data.last_update || '未知'}`; $('couponNotice').textContent = ''; renderCoupons();
  } catch (err) { $('couponNotice').textContent = `更新失敗：${err.message}。${coupons.length ? '顯示上次儲存的資料。' : '目前沒有可用資料，請稍後再試。'}`; }
  finally { $('couponRefresh').disabled = false; }
}
try { const cached = JSON.parse(localStorage.getItem('coupon_snapshot')); if (cached && Array.isArray(cached.data?.coupon_list) && cached.data.coupon_list.every(c=>c && Array.isArray(c.items))) { coupons = cached.data.coupon_list; $('couponUpdated').textContent = `上次下載：${new Date(cached.downloadedAt).toLocaleString('zh-TW')}　來源更新：${cached.data.last_update || '未知'}`; renderCoupons(); } } catch (_) { /* Ignore invalid cache. */ }
$('couponRefresh').addEventListener('click',refreshCoupons);
['couponSearch','couponInclude','couponExclude','couponValidity','couponSort'].forEach(id=>$(id).addEventListener('input',renderCoupons));
start();
