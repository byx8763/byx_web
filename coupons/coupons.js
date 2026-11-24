let coupons = [], couponLoaded = false;
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
