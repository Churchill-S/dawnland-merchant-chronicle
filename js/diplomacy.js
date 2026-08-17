/* 外交：关系值、条约、外交行动 */
(function (G) {
  'use strict';
  var DL = G.DL = G.DL || {};

  function relation(state, cityId) {
    return state.diplo.relations[cityId] || 0;
  }

  function changeRelation(state, cityId, delta) {
    var v = (state.diplo.relations[cityId] || 0) + delta;
    state.diplo.relations[cityId] = Math.max(-100, Math.min(100, v));
  }

  function hasTreaty(state, cityId, kind) {
    return state.diplo.treaties.some(function (t) {
      return t.cityId === cityId && t.kind === kind && (t.until === null || t.until > state.day);
    });
  }

  function signTreaty(state, cityId, kind) {
    state.diplo.treaties.push({ cityId: cityId, kind: kind, until: null });
    changeRelation(state, cityId, 10);
    DL.State.log(state, '与' + DL.DATA.cityById(cityId).name + '签订了' + (kind === 'trade' ? '通商条约' : '互助协定') + '，关系 +10。');
    DL.Market.recalc(state);
  }

  function jointFestivalActive(state) {
    return state.diplo.treaties.some(function (t) { return t.kind === 'festival' && t.until > state.day; });
  }

  function daily(state) {
    // 关系值自然衰减（每季度约2点）
    DL.DATA.CITIES.forEach(function (c) {
      if (c.id === state.homeCityId) return;
      var v = state.diplo.relations[c.id] || 0;
      if (v > 0) state.diplo.relations[c.id] = Math.max(0, v - 0.022);
      else if (v < 0) state.diplo.relations[c.id] = Math.min(0, v + 0.022);
    });
    // 负债时信用微衰减
    if (state.player.debt > 0) {
      state.cities[state.homeCityId].credit = Math.max(0, state.cities[state.homeCityId].credit - 0.005);
    }
  }

  function warehouseFlour(state) {
    var fl = DL.Market.tierStock(state.warehouse.flour);
    return fl[1] + fl[2] + fl[3];
  }

  function canAction(state, cityId, actionId) {
    var city = DL.DATA.cityById(cityId);
    var target = state.cities[cityId];
    var home = state.cities[state.homeCityId];
    var eff = DL.City.buildingEffects(state);
    switch (actionId) {
      case 'gift':
        if (state.finance.treasury < 100) return '金币不足';
        return null;
      case 'trade':
        if (hasTreaty(state, cityId, 'trade')) return '已签署';
        if (home.credit < 60 || target.credit < 60) return '双方信用需≥60';
        if (state.finance.treasury < 300) return '金币不足';
        return null;
      case 'guard':
        if (hasTreaty(state, cityId, 'guard')) return '护卫生效中';
        if (DL.City.buildingLevel(state, 'stage') < 1) return '本城需先建造驿站';
        if (target.credit < 50) return '对方信用需≥50';
        if (state.finance.treasury < 50) return '金币不足';
        return null;
      case 'festival':
        if (hasTreaty(state, cityId, 'festival')) return '节庆筹备中';
        if (home.prosperity < 50 || target.prosperity < 50) return '双方繁荣度需≥50';
        if (state.finance.treasury < 200) return '金币不足';
        return null;
      case 'artisan':
        if (DL.City.buildingLevel(state, 'craft') < 1) return '本城需先建造工匠行会';
        if (state.finance.treasury < 150) return '金币不足';
        return null;
      case 'aid':
        if (warehouseFlour(state) < 30) return '仓库面粉需≥30';
        if (hasTreaty(state, cityId, 'aid')) return '已援助过';
        return null;
      default:
        return null;
    }
  }

  function doAction(state, cityId, actionId) {
    var err = canAction(state, cityId, actionId);
    if (err) return { ok: false, msg: err };
    var f = state.finance;
    var cityName = DL.DATA.cityById(cityId).name;
    switch (actionId) {
      case 'gift':
        f.treasury -= 100;
        changeRelation(state, cityId, 8);
        DL.State.log(state, '向 ' + cityName + ' 赠送礼物，关系 +8。');
        return { ok: true, msg: '关系 +8' };
      case 'trade':
        f.treasury -= 300;
        state.diplo.treaties.push({ cityId: cityId, kind: 'trade', until: null });
        changeRelation(state, cityId, 10);
        DL.State.log(state, '与 ' + cityName + ' 签署互惠通商协议，双方买卖价格互惠10%。');
        DL.Market.recalc(state);
        return { ok: true, msg: '通商协议已签署' };
      case 'guard':
        f.treasury -= 50;
        state.diplo.treaties.push({ cityId: cityId, kind: 'guard', until: state.day + 30 });
        changeRelation(state, cityId, 3);
        DL.State.log(state, '向 ' + cityName + ' 派遣商路护卫（30天），往返破损降为0。');
        return { ok: true, msg: '护卫已派出' };
      case 'festival':
        f.treasury -= 200;
        state.diplo.treaties.push({ cityId: cityId, kind: 'festival', until: state.day + 15 });
        changeRelation(state, cityId, 5);
        state.cities[state.homeCityId].tourism = Math.min(100, state.cities[state.homeCityId].tourism + 5);
        state.cities[cityId].tourism = Math.min(100, state.cities[cityId].tourism + 5);
        DL.State.log(state, '与 ' + cityName + ' 联合举办节庆（15天），双方旅游业提升。');
        return { ok: true, msg: '节庆筹备中' };
      case 'artisan':
        f.treasury -= 150;
        f.treasury += 50;
        state.diplo.treaties.push({ cityId: cityId, kind: 'artisan', until: state.day + 30 });
        changeRelation(state, cityId, 5);
        DL.State.log(state, '向 ' + cityName + ' 派遣技术工匠，助其工业产能+10%，获酬金50G。');
        return { ok: true, msg: '工匠已派出' };
      case 'aid':
        {
          var fl = DL.Market.tierStock(state.warehouse.flour);
          var need2 = 30;
          for (var t = 1; t <= 3 && need2 > 0; t++) {
            var take = Math.min(need2, fl[t]);
            fl[t] -= take;
            need2 -= take;
          }
          state.warehouse.flour = fl;
        }
        state.cities[cityId].credit = Math.min(100, state.cities[cityId].credit + 10);
        changeRelation(state, cityId, 5);
        state.diplo.treaties.push({ cityId: cityId, kind: 'aid', until: null });
        DL.State.log(state, '向 ' + cityName + ' 紧急援助30袋面粉，对方信用+10，关系+5。');
        return { ok: true, msg: '援助完成' };
      default:
        return { ok: false, msg: '未知行动' };
    }
  }

  DL.Diplo = {
    relation: relation,
    changeRelation: changeRelation,
    hasTreaty: hasTreaty,
    signTreaty: signTreaty,
    jointFestivalActive: jointFestivalActive,
    daily: daily,
    canAction: canAction,
    doAction: doAction
  };
})(typeof window !== 'undefined' ? window : globalThis);
