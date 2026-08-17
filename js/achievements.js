/* 成就系统 + 商路图鉴 */
(function (G) {
  'use strict';
  var DL = G.DL = G.DL || {};

  var ACHIEVEMENTS = [
    { id: 'a_first_trip',   name: '初出茅庐', desc: '派出第一支商队', reward: 30, check: function (s) { return (s.stats.trips || 0) >= 1; } },
    { id: 'a_trade_1k',     name: '商路初通', desc: '累计贸易额达到 1,000G', reward: 50, check: function (s) { return s.player.tradeVolume >= 1000; } },
    { id: 'a_treasury_10k', name: '万金在手', desc: '金库达到 10,000G', reward: 80, check: function (s) { return s.finance.treasury >= 10000; } },
    { id: 'a_debt_free',    name: '无债一身轻', desc: '还清全部债务', reward: 120, check: function (s) { return s.player.debt <= 0; } },
    { id: 'a_trade_50k',    name: '财源广进', desc: '累计贸易额达到 50,000G', reward: 150, check: function (s) { return s.player.tradeVolume >= 50000; } },
    { id: 'a_eco',          name: '十万大商', desc: '达成经济胜利', reward: 200, check: function (s) { return s.wins.some(function (w) { return w.type === 'economic'; }); } },
    { id: 'a_diplo',        name: '誉满大陆', desc: '达成外交胜利', reward: 200, check: function (s) { return s.wins.some(function (w) { return w.type === 'diplomatic'; }); } },
    { id: 'a_culture',      name: '文化之都', desc: '达成文化胜利', reward: 200, check: function (s) { return s.wins.some(function (w) { return w.type === 'cultural'; }); } },
    { id: 'a_hegemony',     name: '铸币权柄', desc: '达成霸主胜利', reward: 300, check: function (s) { return s.wins.some(function (w) { return w.type === 'hegemony'; }); } },
    { id: 'a_treasury_100k', name: '富可敌国', desc: '金库达到 100,000G', reward: 300, check: function (s) { return s.finance.treasury >= 100000; } },
    { id: 'a_rank1',        name: '名满天下', desc: '商会排行榜登顶第一名', reward: 150, check: function (s) { return DL.Rivals.playerRank(s) === 1; } },
    { id: 'a_first_site',   name: '探险先锋', desc: '发现第一处名胜', reward: 50, check: function (s) { return s.sitesDiscovered && Object.keys(s.sitesDiscovered).length >= 1; } },
    { id: 'a_all_sites',    name: '收藏家', desc: '发现全部名胜', reward: 300, check: function (s) { return s.sitesDiscovered && Object.keys(s.sitesDiscovered).length >= DL.DATA.SITES.length; } },
    { id: 'a_fleet8',       name: '商队之主', desc: '在编商队达到 8 支', reward: 100, check: function (s) { return s.fleet.units.length >= 8; } },
    { id: 'a_shares',       name: '股份大亨', desc: '持有股份合计达到 100 股', reward: 100, check: function (s) {
        var t = 0;
        Object.keys(s.companies).forEach(function (id) { t += s.companies[id].owned; });
        return t >= 100;
      } },
    { id: 'a_demand',       name: '广而告之', desc: '发布第一条求购公告', reward: 30, check: function (s) { return (s.playerDemandHistory || 0) > 0; } },
    { id: 'a_bandit',       name: '剿匪英雄', desc: '剿灭第一处强盗据点', reward: 60, check: function (s) { return (s.banditsCleared || 0) > 0; } },
    { id: 'a_visitor10',    name: '人脉广布', desc: '与 10 座城市关系达到 40 以上', reward: 100, check: function (s) {
        var n = 0;
        DL.DATA.CITIES.forEach(function (c) { if (c.id !== s.homeCityId && DL.Diplo.relation(s, c.id) >= 40) n++; });
        return n >= 10;
      } },
    { id: 'a_ten_years',    name: '十年经营', desc: '经营满十年', reward: 200, check: function (s) { return s.day >= DL.DATA.GAME_YEARS * DL.DATA.DAYS_PER_YEAR; } }
  ];

  function init(state) {
    state.achievements = state.achievements || { unlocked: {} };
    if (!state.achievements.unlocked) state.achievements.unlocked = {};
    initCodex(state);
  }

  function initCodex(state) {
    state.codex = state.codex || { cities: {}, goods: {}, routes: {} };
    if (!state.codex.cities) state.codex.cities = {};
    if (!state.codex.goods) state.codex.goods = {};
    if (!state.codex.routes) state.codex.routes = {};
    state.codex.cities[state.homeCityId] = true;
  }

  function markCity(state, cityId) {
    if (state.codex && state.codex.cities) state.codex.cities[cityId] = true;
  }

  function markGood(state, goodId) {
    if (state.codex && state.codex.goods) state.codex.goods[goodId] = true;
  }

  function markRoute(state, routeId) {
    if (state.codex && state.codex.routes) state.codex.routes[routeId] = true;
  }

  function check(state) {
    if (!state.achievements) init(state);
    var acc = state.achievements.unlocked;
    ACHIEVEMENTS.forEach(function (a) {
      if (acc[a.id]) return;
      try {
        if (a.check(state)) {
          acc[a.id] = state.day;
          state.finance.treasury += a.reward;
          state.dayIncome += a.reward;
          DL.State.log(state, '成就达成：' + a.name + '（奖励 ' + a.reward + 'G）');
          state.notices.push('成就达成：' + a.name + '！');
        }
      } catch (e) { /* 个别成就检查失败不影响游戏 */ }
    });
  }

  DL.Achievements = {
    ACHIEVEMENTS: ACHIEVEMENTS,
    list: function () { return ACHIEVEMENTS; },
    init: init,
    initCodex: initCodex,
    markCity: markCity,
    markGood: markGood,
    markRoute: markRoute,
    check: check
  };
})(typeof window !== 'undefined' ? window : globalThis);
