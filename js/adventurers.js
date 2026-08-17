/* 冒险者养成：护卫获得经验升级，公会每周委托 */
(function (G) {
  'use strict';
  var DL = G.DL = G.DL || {};

  var XP_THRESHOLDS = [0, 3, 8, 15, 25];
  var MAX_LEVEL = 5;

  function init(state) {
    state.adventurers = state.adventurers || {};
    state.guild = state.guild || {};
    if (!state.guild.missions) {
      state.guild.missions = { guardTrips: 0, cleared: 0, discovered: 0 };
    }
    if (state.guild.missionDay == null) state.guild.missionDay = state.day + 7;
  }

  function get(state, advId) {
    if (!state.adventurers[advId]) {
      state.adventurers[advId] = { xp: 0, level: 1, trips: 0 };
    }
    return state.adventurers[advId];
  }

  function levelOf(state, advId) {
    return get(state, advId).level;
  }

  function xpOf(state, advId) {
    return get(state, advId).xp;
  }

  function powerOf(state, adv) {
    return adv.power + (levelOf(state, adv.id) - 1) * 8;
  }

  function costOf(state, adv) {
    return adv.cost + (levelOf(state, adv.id) - 1) * 5;
  }

  function grantXP(state, advId, xp) {
    var a = get(state, advId);
    a.xp += xp;
    a.trips++;
    while (a.level < MAX_LEVEL && a.xp >= XP_THRESHOLDS[a.level]) {
      a.level++;
      DL.State.log(state, DL.DATA.adventurerById(advId).name + ' 晋升至 Lv' + a.level + '！');
      state.notices.push(DL.DATA.adventurerById(advId).name + ' 晋升至 Lv' + a.level + '！');
    }
  }

  function missionGuard(state) {
    if (state.guild.missions) state.guild.missions.guardTrips++;
  }

  function missionClear(state) {
    if (state.guild.missions) state.guild.missions.cleared++;
  }

  function missionDiscover(state) {
    if (state.guild.missions) state.guild.missions.discovered++;
  }

  // 每周委托：护卫2趟 + 剿匪1处 完成后全员+3XP，商会+80G
  function checkMissions(state) {
    if (!state.guild.missions || state.day < state.guild.missionDay) return;
    var m = state.guild.missions;
    if (m.guardTrips >= 2 && m.cleared >= 1) {
      DL.DATA.adventurersFor(state.homeCityId).forEach(function (ad) {
        grantXP(state, ad.id, 3);
      });
      state.finance.treasury += 80;
      state.dayIncome += 80;
      DL.State.log(state, '冒险者公会委托完成：全员获得经验，商会获得 80G 酬劳。');
      state.guild.missions = { guardTrips: 0, cleared: 0, discovered: 0 };
      state.guild.missionDay = state.day + 7;
    } else {
      state.guild.missionDay = state.day + 1;
    }
  }

  DL.Adventurers = {
    init: init,
    get: get,
    levelOf: levelOf,
    xpOf: xpOf,
    powerOf: powerOf,
    costOf: costOf,
    grantXP: grantXP,
    missionGuard: missionGuard,
    missionClear: missionClear,
    missionDiscover: missionDiscover,
    checkMissions: checkMissions,
    XP_THRESHOLDS: XP_THRESHOLDS,
    MAX_LEVEL: MAX_LEVEL
  };
})(typeof window !== 'undefined' ? window : globalThis);
