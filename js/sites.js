/* 名胜古迹：探险队发现、投资开发、收门票、付维护费 */
(function (G) {
  'use strict';
  var DL = G.DL = G.DL || {};

  function ensure(state) {
    state.sites = state.sites || {};
    state.sitesDiscovered = state.sitesDiscovered || {};
    state.expeditions = state.expeditions || [];
    if (state.expSeq == null) state.expSeq = 1;
  }

  function siteDef(siteId) {
    return DL.DATA.siteById(siteId);
  }

  function siteLevel(state, siteId) {
    return state.sites[siteId] || 0;
  }

  function discovered(state, siteId) {
    return !!state.sitesDiscovered[siteId];
  }

  function difficultyOf(siteId) {
    var s = siteDef(siteId);
    return s && s.difficulty != null ? s.difficulty : 40;
  }

  function undiscovered(state) {
    return DL.DATA.SITES.filter(function (s) { return !discovered(state, s.id); });
  }

  function investCost(state, siteId) {
    var s = siteDef(siteId);
    return Math.round(s.cost * (siteLevel(state, siteId) + 1));
  }

  function canInvest(state, siteId) {
    var s = siteDef(siteId);
    if (!s) return { ok: false, msg: '名胜不存在' };
    if (!discovered(state, siteId)) return { ok: false, msg: '尚未发现，无法开发——先派探险队去找' };
    if (siteLevel(state, siteId) >= 3) return { ok: false, msg: '已开发至最高等级' };
    if (state.finance.treasury < investCost(state, siteId)) return { ok: false, msg: '金币不足' };
    return { ok: true, msg: '' };
  }

  function invest(state, siteId) {
    var chk = canInvest(state, siteId);
    if (!chk.ok) return chk;
    var cost = investCost(state, siteId);
    state.finance.treasury -= cost;
    state.sites[siteId] = (state.sites[siteId] || 0) + 1;
    DL.State.log(state, '投资开发「' + siteDef(siteId).name + '」至 ' + state.sites[siteId] + ' 级，花费 ' + DL.Market.fmtG(cost) + '。');
    return { ok: true, msg: '开发完成，开始收门票' };
  }

  /* ---------- 探险队 ---------- */

  function sendExpedition(state) {
    ensure(state);
    if (state.expeditions.length >= 2) return { ok: false, msg: '探险队最多同时出发两支' };
    if (undiscovered(state).length === 0) return { ok: false, msg: '大陆上已没有待发现的名胜了' };
    var cost = 200;
    if (state.finance.treasury < cost) return { ok: false, msg: '金币不足（探险队需 200G）' };
    state.finance.treasury -= cost;
    state.expeditions.push({ id: state.expSeq++, daysLeft: 6 });
    DL.State.log(state, '探险队出发寻找失落的名胜，预计 6 天后归来。');
    return { ok: true, msg: '探险队已出发（6天）' };
  }

  function tickExpeditions(state) {
    ensure(state);
    var returned = [];
    state.expeditions.forEach(function (e) {
      e.daysLeft--;
      if (e.daysLeft <= 0) returned.push(e);
    });
    state.expeditions = state.expeditions.filter(function (e) { return e.daysLeft > 0; });
    returned.forEach(function () {
      var pool = undiscovered(state);
      if (!pool.length) return;
      // 总发现概率约四成，越容易的名胜越常被找到
      if (Math.random() >= 0.4) {
        DL.State.log(state, '探险队无功而返，打算下次换个方向。');
        return;
      }
      var total = 0;
      pool.forEach(function (s) { total += Math.max(5, 100 - difficultyOf(s.id)); });
      var r = Math.random() * total;
      var pick = null;
      for (var i = 0; i < pool.length; i++) {
        r -= Math.max(5, 100 - difficultyOf(pool[i].id));
        if (r <= 0) { pick = pool[i]; break; }
      }
      if (pick) {
        state.sitesDiscovered[pick.id] = true;
        DL.Adventurers.missionDiscover(state);
        DL.State.log(state, '探险队发现了名胜「' + pick.name + '」！');
        state.notices.push('探险队发现了名胜「' + pick.name + '」！');
      } else {
        DL.State.log(state, '探险队空手而归，只带回几枚古币。');
      }
    });
  }

  /* ---------- 门票收入与维护费 ---------- */

  function dailyIncome(state, siteId) {
    var s = siteDef(siteId);
    var lv = siteLevel(state, siteId);
    if (!lv) return 0;
    var city = state.cities[s.cityId];
    var coef = DL.Calendar.seasonCoef(DL.Calendar.info(state.day).seasonMonthIdx, 'tourism');
    return lv * (1.5 + city.tourism / 25) * coef;
  }

  function dailyUpkeep(state, siteId) {
    return siteLevel(state, siteId) * 1.2;
  }

  function daily(state) {
    ensure(state);
    var incomeTotal = 0, upkeepTotal = 0;
    DL.DATA.SITES.forEach(function (s) {
      var lv = siteLevel(state, s.id);
      if (!lv) return;
      var income = dailyIncome(state, s.id) * (0.8 + Math.random() * 0.4);
      var upkeep = dailyUpkeep(state, s.id);
      state.finance.treasury += income - upkeep;
      state.dayIncome += income;
      state.dayExpense += upkeep;
      incomeTotal += income;
      upkeepTotal += upkeep;
    });
    if (incomeTotal > 0) {
      state.dayBreak.income.sites = incomeTotal;
      state.dayBreak.expense.sites = upkeepTotal;
    }
  }

  DL.Sites = {
    ensure: ensure,
    siteLevel: siteLevel,
    discovered: discovered,
    undiscovered: undiscovered,
    investCost: investCost,
    canInvest: canInvest,
    invest: invest,
    sendExpedition: sendExpedition,
    tickExpeditions: tickExpeditions,
    dailyIncome: dailyIncome,
    dailyUpkeep: dailyUpkeep,
    daily: daily
  };
})(typeof window !== 'undefined' ? window : globalThis);
