/* 公司与股份：股价随真实经营浮动、增发/收购、董事会政策 */
(function (G) {
  'use strict';
  var DL = G.DL = G.DL || {};

  function companyId(cityId, type, goodId) {
    return type === 'good' ? cityId + '_' + goodId : cityId + '_shipping';
  }

  function addCompany(state, cityId, type, goodId) {
    var id = companyId(cityId, type, goodId);
    if (state.companies[id]) return;
    state.companies[id] = {
      id: id,
      cityId: cityId,
      type: type,
      goodId: goodId || null,
      owned: 0,
      total: 100,
      profit: 0,
      price: 10,
      controlled: false,
      policy: null,
      policyUntil: 0,
      boostUntil: 0,
      hist: [],
      priceHist: []
    };
  }

  function initCompanies(state) {
    state.companies = state.companies || {};
    DL.DATA.CITIES.forEach(function (c) {
      (c.specialties || []).forEach(function (gid) {
        addCompany(state, c.id, 'good', gid);
      });
      if (c.flags.indexOf('coastal') !== -1) addCompany(state, c.id, 'shipping', null);
    });
    // 老存档迁移：补充新字段
    Object.keys(state.companies).forEach(function (id) {
      var co = state.companies[id];
      if (co.total == null) co.total = 100;
      if (co.controlled == null) co.controlled = false;
      if (co.policy == null) co.policy = null;
      if (co.policyUntil == null) co.policyUntil = 0;
      if (co.boostUntil == null) co.boostUntil = 0;
      if (!Array.isArray(co.priceHist)) co.priceHist = [];
      if (!Array.isArray(co.hist)) co.hist = [];
    });
  }

  function payoutRatio(co, state) {
    var r = 0.5;
    if (co.policy && co.policyUntil > state.day) {
      if (co.policy === 'grow') r = 0.35;
      if (co.policy === 'div') r = 0.70;
    }
    return r;
  }

  // 每日结算各公司利润、更新股价并派发股息
  function daily(state) {
    var info = DL.Calendar.info(state.day);
    var divTotal = 0;
    Object.keys(state.companies).forEach(function (id) {
      var co = state.companies[id];
      var city = DL.DATA.cityById(co.cityId);
      var profit = 0;
      if (co.type === 'good') {
        var good = DL.DATA.goodById(co.goodId);
        var season = DL.Calendar.seasonCoef(info.seasonMonthIdx, good.prod.type === 'agri' ? 'agri' : 'craft');
        var units = city.init.industry[good.prod.type] * season * good.prod.rate / 10 * 2.5;
        var price = (state.prices[co.cityId] || {})[co.goodId] ? state.prices[co.cityId][co.goodId].buy : good.base;
        profit = units * price * 0.20;
      } else {
        var uses = (state.shipping && state.shipping.seaUses) ? state.shipping.seaUses.filter(function (d) { return d > state.day - 30; }).length : 0;
        var mult = 1;
        if (co.cityId === state.homeCityId) mult = 1 + 0.5 * DL.City.buildingLevel(state, 'shipping');
        var base = co.cityId === state.homeCityId ? uses * 8 : city.connectivity * 0.8;
        profit = base * mult;
      }
      if (co.controlled) profit *= 1.3; // 控股后的管理加成
      if (co.boostUntil > state.day) profit *= 1.25; // 增发融资后的扩张红利
      if (co.policy === 'grow' && co.policyUntil > state.day) profit *= 1.15;
      if (co.policy === 'div' && co.policyUntil > state.day) profit *= 0.9;
      co.profit = Math.max(0, profit);
      co.hist.push({ day: state.day, profit: co.profit });
      while (co.hist.length && co.hist[0].day <= state.day - 30) co.hist.shift();
      var avg = 0;
      co.hist.forEach(function (h) { avg += h.profit; });
      avg /= Math.max(1, co.hist.length);
      // 股价 = 每股盈利驱动 + 均值回归
      var eps = co.total > 0 ? co.profit / co.total : 0;
      var target = Math.max(2, 6 + eps * 18);
      co.price = Math.max(2, Math.round((co.price + (target - co.price) * 0.18) * 100) / 100);
      co.priceHist.push({ day: state.day, price: co.price });
      while (co.priceHist.length && co.priceHist[0].day <= state.day - 30) co.priceHist.shift();
      if (co.owned > 0 && co.profit > 0) {
        var div = co.profit * payoutRatio(co, state) * co.owned / co.total;
        state.finance.treasury += div;
        state.dayIncome += div;
        divTotal += div;
      }
    });
    if (divTotal > 0) state.dayBreak.income.dividend = divTotal;
  }

  function buyShares(state, coId, n) {
    var co = state.companies[coId];
    if (!co) return { ok: false, msg: '公司不存在' };
    if (co.owned + n > co.total) return { ok: false, msg: '持股不能超过总股本 ' + co.total };
    var cost = co.price * n;
    if (state.finance.treasury < cost) return { ok: false, msg: '金币不足' };
    state.finance.treasury -= cost;
    co.owned += n;
    DL.State.log(state, '买入 ' + companyName(state, coId) + ' ' + n + ' 股，花费 ' + DL.Market.fmtG(cost) + '。');
    return { ok: true, msg: '买入 ' + n + ' 股' };
  }

  function sellShares(state, coId, n) {
    var co = state.companies[coId];
    if (!co) return { ok: false, msg: '公司不存在' };
    if (co.owned < n) return { ok: false, msg: '持股不足' };
    var gain = co.price * n * 0.9;
    state.finance.treasury += gain;
    co.owned -= n;
    if (co.owned <= 0) co.controlled = false;
    DL.State.log(state, '卖出 ' + companyName(state, coId) + ' ' + n + ' 股，得 ' + DL.Market.fmtG(gain) + '。');
    return { ok: true, msg: '卖出 ' + n + ' 股' };
  }

  // 增发：总股本 +50，摊薄股价，融资扩张（利润加成 20 天）
  function issueShares(state, coId) {
    var co = state.companies[coId];
    if (!co) return { ok: false, msg: '公司不存在' };
    if (co.owned / co.total < 0.30) return { ok: false, msg: '需持有至少 30% 才能提议增发' };
    var oldTotal = co.total;
    co.total += 50;
    co.price = Math.max(2, Math.round(co.price * oldTotal / co.total * 100) / 100);
    co.boostUntil = state.day + 20;
    DL.State.log(state, companyName(state, coId) + ' 完成增发（总股本 ' + oldTotal + '→' + co.total + '），股价摊薄，未来 20 天扩张经营。');
    return { ok: true, msg: '增发完成，总股本 ' + co.total + ' 股' };
  }

  // 收购：持股过半可溢价收购剩余股份，实现控股（利润 +30%）
  function takeover(state, coId) {
    var co = state.companies[coId];
    if (!co) return { ok: false, msg: '公司不存在' };
    if (co.controlled) return { ok: false, msg: '已是控股状态' };
    if (co.owned / co.total < 0.51) return { ok: false, msg: '需持有至少 51% 才能发起收购' };
    var cost = Math.round(co.price * (co.total - co.owned) * 1.2 * 100) / 100;
    if (state.finance.treasury < cost) return { ok: false, msg: '金币不足：收购需 ' + DL.Market.fmtG(cost) };
    state.finance.treasury -= cost;
    co.owned = co.total;
    co.controlled = true;
    DL.State.log(state, '你完成了对 ' + companyName(state, coId) + ' 的收购，实现控股（利润 +30%）。');
    return { ok: true, msg: '收购成功，控股 ' + co.total + ' 股' };
  }

  // 董事会：持股 ≥10% 可定经营方针（每 15 天可改一次）
  function boardVote(state, coId, policy) {
    var co = state.companies[coId];
    if (!co) return { ok: false, msg: '公司不存在' };
    if (co.owned / co.total < 0.10) return { ok: false, msg: '需持有至少 10% 才能参与董事会' };
    if (co.policyUntil > state.day) return { ok: false, msg: '董事会决议每 15 天才能调整一次' };
    co.policy = policy;
    co.policyUntil = state.day + 15;
    var names = { grow: '扩张经营', div: '提高分红', neutral: '稳健经营' };
    DL.State.log(state, companyName(state, coId) + ' 董事会决议：' + names[policy] + '（15 天）。');
    return { ok: true, msg: '决议生效：' + names[policy] };
  }

  function companyName(state, coId) {
    var co = state.companies[coId];
    if (!co) return coId;
    var city = DL.DATA.cityById(co.cityId);
    if (co.type === 'shipping') return city.name + '·航运公司';
    return city.name + '·' + DL.DATA.goodById(co.goodId).name + '公司';
  }

  // 玩家可在本城为「本地可产出但尚无公司」的商品开设新公司
  function canFound(state, goodId) {
    var c = DL.DATA.cityById(state.homeCityId);
    var g = DL.DATA.goodById(goodId);
    if (!g) return { ok: false, msg: '' };
    var producible = g.origin === c.nation || (c.specialties || []).indexOf(goodId) !== -1;
    if (!producible) return { ok: false, msg: '本城不产此货' };
    if (state.companies[companyId(state.homeCityId, 'good', goodId)]) return { ok: false, msg: '该商品已有人开设公司' };
    if (state.finance.treasury < 300) return { ok: false, msg: '金币不足' };
    return { ok: true, msg: '' };
  }

  function foundCompany(state, goodId) {
    var chk = canFound(state, goodId);
    if (!chk.ok) return chk;
    state.finance.treasury -= 300;
    addCompany(state, state.homeCityId, 'good', goodId);
    state.companies[companyId(state.homeCityId, 'good', goodId)].owned = 40;
    DL.State.log(state, '在本城开设 ' + DL.DATA.goodById(goodId).name + ' 公司，持有 40 股。');
    return { ok: true, msg: '公司成立，持股 40 股' };
  }

  DL.Companies = {
    initCompanies: initCompanies,
    daily: daily,
    buyShares: buyShares,
    sellShares: sellShares,
    issueShares: issueShares,
    takeover: takeover,
    boardVote: boardVote,
    companyName: companyName,
    canFound: canFound,
    foundCompany: foundCompany,
    addCompany: addCompany
  };
})(typeof window !== 'undefined' ? window : globalThis);
