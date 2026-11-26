function showPage(page) {
  $('homePage').hidden = page !== 'home'; $('dashboard').hidden = page !== 'health'; $('couponPage').hidden = page !== 'coupons'; $('pmsPage').hidden = page !== 'pms';
  $('pageTitle').textContent = ({home:'主畫面',health:'員工體檢管理',coupons:'優惠券查詢',pms:'多店營運比較'})[page];
  $('pageSubtitle').textContent = ({home:'掌握重要提醒與常用功能',health:'掌握員工資料與體檢期限',coupons:'搜尋優惠券與餐點內容',pms:'查看公司電腦同步的門市資料'})[page];
  document.querySelectorAll('[data-page]').forEach(b => { b.classList.toggle('active', b.dataset.page === page); if (b.dataset.page === page) b.setAttribute('aria-current','page'); else b.removeAttribute('aria-current'); });
  if (page === 'home') renderHome();
  if (page === 'coupons' && !couponLoaded) { couponLoaded = true; refreshCoupons(); }
  if (page === 'pms' && !$('pmsFrame').getAttribute('src')) $('pmsFrame').src = 'pms/index.html';
}
window.addEventListener('message', async event => {
  if (event.origin !== location.origin || event.source !== $('pmsFrame').contentWindow || event.data?.type !== 'pms-read' || $('pmsPage').hidden || typeof event.data.id !== 'string') return;
  try { const data = await api('/pms'); if (data) event.source.postMessage({type:'pms-result',id:event.data.id,data}, location.origin); }
  catch (error) { event.source.postMessage({type:'pms-result',id:event.data.id,error:error.message}, location.origin); }
});
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
start();
