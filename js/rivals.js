/* 竞争性 NPC 商会：真实经商——套利、囤货、抢采购大单、响应出售公告、避让玩家垄断的路线 */
(function (G) {
  'use strict';
  var DL = G.DL = G.DL || {};

  var HOUSES = [
    { id: 'wheat_house', name: '金穗联合行',   baseCityId: 'wheatseat',   color: '#d8a838' },
    { id: 'jade_house',  name: '青屿远帆商社', baseCityId: 'greenharbor', color: '#3f9d9a' },
    { id: 'azure_house', name: '苍澜明珠商会', baseCityId: 'canglang',    color: '#2f8f96' }
  ];

  function initRivals(state) {
    state.rivals = {
      houses: HOUSES.map(function (h) {
        return {
          id: h.id,
          name: h.name,
          baseCityId: h.baseCityId,
          color: h.color,
          treasury: 2000 + Math.random() * 1200,
          credit: 45 + Math.random() * 30,
          tradeVolume: 0,
          trips: 0,
          nextTripDay: 3 + Math.floor(Math.random() * 4),
          caravans: [],
          warehouse: {}
        };
      }),
      seq: 1
    };
  }

  function houseScore(house) {
    return house.tradeVolume + house.treasury / 10 + (house.credit || 50) * 8;
  }

  function playerScore(state) {
    var built = Object.keys(state.city.buildings).length;
    var sites = state.sitesDiscovered ? Object.keys(state.sitesDiscovered).length : 0;
    return state.player.tradeVolume + state.finance.treasury / 10 + built * 300 + sites * 150;
  }

  function ranking(state) {
    var list = state.rivals.houses.map(function (h) {
      return { name: h.name, score: Math.round(houseScore(h)), isPlayer: false, color: h.color };
    });
    list.push({ name: '你的商会', score: Math.round(playerScore(state)), isPlayer: true, color: '#c9a227' });
    list.sort(function (a, b) { return b.score - a.score; });
    return list;
  }

  function playerRank(state) {
    var list = ranking(state);
    for (var i = 0; i < list.length; i++) if (list[i].isPlayer) return i + 1;
    return 4;
  }

  // 玩家在某条路线上的在途商队数量（用于避让拥挤路线）
  function routeBusy(state, routeId) {
    var n = 0;
    state.caravans.forEach(function (cv) {
      var cl = cv.legs[cv.legIdx];
      if (cl && cl.routeId === routeId) n++;
    });
    return n;
  }

  function launch(state, h, p, cargo, destCityId) {
    h.caravans.push({
      id: state.rivals.seq++,
      destCityId: destCityId,
      path: p.path.slice(),
      legs: p.legs.map(function (l) { return { from: l.from, to: l.to, routeId: l.routeId, days: l.days }; }),
      legIdx: 0,
      progress: 0,
      state: 'outbound',
      cargo: cargo,
      done: false
    });
  }

  // 从某城市场买入货物（压低该城库存、推高价格）
  function buyFromMarket(state, h, cityId, wantList, budget) {
    var cargo = {}, spent = 0;
    wantList.forEach(function (w) {
      if (spent >= budget) return;
      var stock = DL.Market.tierStock(state.cities[cityId].market[w.gid]);
      var q = Math.min(stock[w.tier] || 0, 3 + Math.floor(Math.random() * 7));
      if (q <= 0) return;
      var price = state.prices[cityId][w.gid].buy * DL.Market.qualityMult(w.tier);
      var cost = price * q;
      if (spent + cost > budget) return;
      stock[w.tier] -= q;
      state.cities[cityId].market[w.gid] = stock;
      cargo[w.gid] = cargo[w.gid] || {};
      cargo[w.gid][w.tier] = (cargo[w.gid][w.tier] || 0) + q;
      spent += cost;
    });
    h.treasury -= spent;
    return cargo;
  }

  // 在某城卖出货物（增加当地库存、压低价格），返回收入
  function sellAtMarket(state, h, cityId, cargo) {
    var proceeds = 0;
    Object.keys(cargo).forEach(function (gid) {
      Object.keys(cargo[gid] || {}).forEach(function (ts) {
        var tier = parseInt(ts, 10);
        var q = cargo[gid][ts];
        if (q <= 0) return;
        var p = state.prices[cityId][gid].sell * DL.Market.qualityMult(tier) * 0.92;
        var stock = DL.Market.tierStock(state.cities[cityId].market[gid]);
        stock[tier] += q;
        state.cities[cityId].market[gid] = stock;
        proceeds += p * q;
      });
    });
    h.treasury += proceeds;
    h.tradeVolume += proceeds;
    return proceeds;
  }

  function sendTrip(state, h) {
    // 1) 抢玩家采购大单
    if (state.quest && Math.random() < 0.55) {
      var qd = state.quest.destCityId;
      var qp = DL.Caravans.findPath(state, h.baseCityId, qd);
      if (qp) {
        var qcargo = {};
        var qstock = DL.Market.tierStock(state.cities[h.baseCityId].market[state.quest.goodId]);
        var have = qstock[1] + qstock[2] + qstock[3];
        if (have >= state.quest.qty) {
          var take = state.quest.qty;
          for (var t = 1; t <= 3 && take > 0; t++) {
            var tk = Math.min(take, qstock[t]);
            qstock[t] -= tk; take -= tk;
          }
          state.cities[h.baseCityId].market[state.quest.goodId] = qstock;
          qcargo[state.quest.goodId] = { 1: state.quest.qty };
          h.treasury -= state.prices[h.baseCityId][state.quest.goodId].buy * state.quest.qty;
          launch(state, h, qp, qcargo, qd);
          return;
        }
      }
    }

    // 2) 计算套利候选（含公告/大单加价、拥挤路线避让）
    var cands = [];
    DL.DATA.CITIES.forEach(function (c) {
      if (c.id === h.baseCityId) return;
      var p = DL.Caravans.findPath(state, h.baseCityId, c.id);
      if (!p) return;
      var busy = 0;
      p.legs.forEach(function (l) { busy += routeBusy(state, l.routeId); });
      var avoid = busy >= 2 ? 0.4 : 1;
      DL.DATA.GOODS.forEach(function (g) {
        if (g.id === 'pony') return;
        for (var t = 1; t <= 3; t++) {
          var have = (h.warehouse[g.id] || {})[t] || 0;
          var buy = state.prices[h.baseCityId][g.id].buy * DL.Market.qualityMult(t);
          var sell = state.prices[c.id][g.id].sell * DL.Market.qualityMult(t) *
            DL.Market.bulletinMult(state, c.id, g.id) * DL.Market.orderMult(state, c.id, g.id);
          var profit = sell - buy;
          if (have > 0 || profit > 0.3) {
            cands.push({ cid: c.id, gid: g.id, tier: t, profit: profit, have: have, p: p, avoid: avoid, buy: buy });
          }
        }
      });
    });
    var total = 0;
    cands.forEach(function (x) { total += Math.max(0, x.profit) * x.avoid; });
    var chosen = null;
    if (total > 0) {
      var r = Math.random() * total;
      for (var i = 0; i < cands.length; i++) {
        r -= Math.max(0, cands[i].profit) * cands[i].avoid;
        if (r <= 0) { chosen = cands[i]; break; }
      }
      if (!chosen) chosen = cands[cands.length - 1];
    }
    if (!chosen) {
      // 兜底：带一样本城特产去邻城
      var homeN = DL.DATA.cityById(h.baseCityId).nation;
      var pool = DL.DATA.GOODS.filter(function (g) { return g.origin === homeN && g.id !== 'pony'; });
      var g = pool.length ? pool[Math.floor(Math.random() * pool.length)] : DL.DATA.GOODS[0];
      var others = DL.DATA.CITIES.filter(function (c) { return c.id !== h.baseCityId; });
      var dest2 = others[Math.floor(Math.random() * others.length)];
      var p2 = DL.Caravans.findPath(state, h.baseCityId, dest2.id);
      if (!p2) return;
      var stock2 = DL.Market.tierStock(state.cities[h.baseCityId].market[g.id]);
      var q2 = Math.min(stock2[1] || 0, 10);
      if (q2 <= 0) return;
      stock2[1] -= q2;
      state.cities[h.baseCityId].market[g.id] = stock2;
      var cargo2 = {};
      cargo2[g.id] = { 1: q2 };
      h.treasury -= state.prices[h.baseCityId][g.id].buy * q2;
      launch(state, h, p2, cargo2, dest2.id);
      return;
    }

    // 3) 装货：先清囤货，不足再买
    var cargo = {};
    var budget = Math.max(120, Math.min(h.treasury * 0.4, 1500));
    var maxLoad = 25 + Math.floor(Math.random() * 35);
    var load = 0;
    var w = chosen;
    while (load < maxLoad && budget > 0) {
      var have = (h.warehouse[w.gid] || {})[w.tier] || 0;
      var q = Math.min(3 + Math.floor(Math.random() * 6), have, maxLoad - load);
      if (q > 0) {
        h.warehouse[w.gid] = h.warehouse[w.gid] || {};
        h.warehouse[w.gid][w.tier] -= q;
        cargo[w.gid] = cargo[w.gid] || {};
        cargo[w.gid][w.tier] = (cargo[w.gid][w.tier] || 0) + q;
        load += q;
      } else {
        var stock = DL.Market.tierStock(state.cities[h.baseCityId].market[w.gid]);
        var qb = Math.min(3 + Math.floor(Math.random() * 6), stock[w.tier] || 0, maxLoad - load);
        if (qb <= 0) break;
        var cost = state.prices[h.baseCityId][w.gid].buy * DL.Market.qualityMult(w.tier) * qb;
        if (cost > budget) break;
        stock[w.tier] -= qb;
        state.cities[h.baseCityId].market[w.gid] = stock;
        h.treasury -= cost;
        cargo[w.gid] = cargo[w.gid] || {};
        cargo[w.gid][w.tier] = (cargo[w.gid][w.tier] || 0) + qb;
        load += qb;
        budget -= cost;
      }
    }
    if (!load) return;
    launch(state, h, chosen.p, cargo, chosen.cid);
  }

  // 竞争对手响应玩家的出售公告：抵达玩家本城时按报价买货
  function buyPlayerAds(state, h, cityId) {
    if (cityId !== state.homeCityId) return;
    var ads = (state.saleAds || []).filter(function (e) { return e.until > state.day; });
    ads.forEach(function (ad) {
      var price = ad.price;
      var qty = Math.min(ad.qty, 4 + Math.floor(Math.random() * 8));
      var cost = price * qty;
      if (h.treasury < cost) return;
      var have = DL.Market.warehouseQty(state, ad.goodId, 1) + DL.Market.warehouseQty(state, ad.goodId, 2) + DL.Market.warehouseQty(state, ad.goodId, 3);
      if (have < qty) qty = have;
      if (qty <= 0) return;
      // 从玩家仓库扣除（优先普通品质）
      var wh = state.warehouse[ad.goodId] = DL.Market.tierStock(state.warehouse[ad.goodId]);
      var left = qty;
      for (var t = 1; t <= 3 && left > 0; t++) {
        var tk = Math.min(left, wh[t]);
        wh[t] -= tk; left -= tk;
      }
      state.finance.treasury += cost;
      state.player.tradeVolume += cost;
      state.dayTrade += cost;
      h.treasury -= cost;
      ad.qty -= qty;
      DL.State.log(state, h.name + ' 响应你的出售公告，按报价购入 ' + qty + ' ' + DL.DATA.goodById(ad.goodId).name + '。');
    });
    state.saleAds = state.saleAds.filter(function (e) { return e.qty > 0 && e.until > state.day; });
  }

  function arrive(state, h, cv) {
    if (cv.state === 'outbound') {
      var proceeds = sellAtMarket(state, h, cv.destCityId, cv.cargo);
      h.trips++;
      DL.State.log(state, h.name + ' 的商队抵达' + DL.DATA.cityById(cv.destCityId).name + '，售出货物得 ' + DL.Market.fmtG(proceeds) + '。');
      if (state.quest && cv.destCityId === state.quest.destCityId) {
        var haveQ = 0;
        var qc = cv.cargo[state.quest.goodId];
        if (qc) Object.keys(qc).forEach(function (ts) { haveQ += qc[ts] || 0; });
        if (haveQ >= state.quest.qty) {
          DL.State.log(state, h.name + ' 抢先完成了领主采购大单，你的订单作废！');
          state.notices.push('「' + h.name + '」抢走了你的采购大单！');
          state.quest = null;
        }
      }
      buyPlayerAds(state, h, cv.destCityId);
      // 回程采购：在目的城买入回自家有利可图的货囤起来
      var want = [];
      var homeN = DL.DATA.cityById(h.baseCityId).nation;
      DL.DATA.GOODS.forEach(function (g) {
        for (var t = 1; t <= 3; t++) {
          var buy = state.prices[cv.destCityId][g.id].buy * DL.Market.qualityMult(t);
          var sell = state.prices[h.baseCityId][g.id].sell * DL.Market.qualityMult(t);
          if (sell - buy > 0.5) want.push({ gid: g.id, tier: t });
        }
      });
      var returnCargo = buyFromMarket(state, h, cv.destCityId, want, Math.max(80, h.treasury * 0.25));
      Object.keys(returnCargo).forEach(function (gid) {
        Object.keys(returnCargo[gid]).forEach(function (ts) {
          h.warehouse[gid] = h.warehouse[gid] || {};
          h.warehouse[gid][ts] = (h.warehouse[gid][ts] || 0) + returnCargo[gid][ts];
        });
      });
      cv.state = 'returning';
      cv.legs = cv.legs.slice().reverse();
      cv.legIdx = 0;
      cv.progress = 0;
      cv.cargo = {};
    } else {
      cv.done = true;
    }
  }

  function daily(state) {
    if (!state.rivals) return;
    state.rivals.houses.forEach(function (h) {
      h.nextTripDay--;
      var active = h.caravans.filter(function (cv) { return !cv.done; }).length;
      if (h.nextTripDay <= 0 && active < 3 && h.treasury > 150) {
        sendTrip(state, h);
        h.nextTripDay = 3 + Math.floor(Math.random() * 5);
      } else if (h.nextTripDay <= 0) {
        h.nextTripDay = 6 + Math.floor(Math.random() * 5);
      }
      h.caravans.forEach(function (cv) {
        if (cv.done) return;
        cv.progress += 1;
        while (cv.legIdx < cv.legs.length && cv.progress >= cv.legs[cv.legIdx].days) {
          cv.progress -= cv.legs[cv.legIdx].days;
          cv.legIdx++;
          if (cv.legIdx >= cv.legs.length) {
            arrive(state, h, cv);
            break;
          }
        }
      });
      h.caravans = h.caravans.filter(function (cv) { return !cv.done; });
      h.treasury = Math.min(h.treasury, 20000);
      // 囤货溢出：放回自家市场
      var total = 0;
      Object.keys(h.warehouse).forEach(function (gid) {
        Object.keys(h.warehouse[gid]).forEach(function (ts) { total += h.warehouse[gid][ts]; });
      });
      if (total > 150) {
        var surplus = total - 150;
        Object.keys(h.warehouse).forEach(function (gid) {
          Object.keys(h.warehouse[gid]).forEach(function (ts) {
            if (surplus <= 0) return;
            var q = Math.min(h.warehouse[gid][ts], surplus);
            h.warehouse[gid][ts] -= q;
            surplus -= q;
            var stock = DL.Market.tierStock(state.cities[h.baseCityId].market[gid]);
            stock[parseInt(ts, 10)] += q;
            state.cities[h.baseCityId].market[gid] = stock;
          });
        });
      }
    });
  }

  DL.Rivals = {
    initRivals: initRivals,
    daily: daily,
    ranking: ranking,
    playerRank: playerRank,
    playerScore: playerScore,
    HOUSES: HOUSES
  };
})(typeof window !== 'undefined' ? window : globalThis);
