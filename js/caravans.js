/* 商队：路线寻路、出行、抵达结算（货物带品质档位） */
(function (G) {
  'use strict';
  var DL = G.DL = G.DL || {};

  function routeOpen(state, route) {
    if (state.routeClosed && state.routeClosed[route.id] && state.routeClosed[route.id] > state.day) return false;
    if (route.seasons) {
      var m = DL.Calendar.info(state.day).monthIdx;
      if (route.seasons.indexOf(m) === -1) return false;
    }
    var m2 = DL.Calendar.info(state.day).monthIdx;
    if (m2 >= 10 && route.type === 'land') {
      for (var i = 0; i < route.stops.length; i++) {
        var c = DL.DATA.cityById(route.stops[i]);
        if (c.nation === 'north') return false;
      }
    }
    return true;
  }

  function buildGraph(state) {
    var adj = {};
    DL.DATA.CITIES.forEach(function (c) { adj[c.id] = []; });
    DL.DATA.ROUTES.forEach(function (r) {
      if (!routeOpen(state, r)) return;
      var n = r.stops.length - 1;
      var legDays = r.days / n;
      for (var i = 0; i < n; i++) {
        var a = r.stops[i], b = r.stops[i + 1];
        adj[a].push({ to: b, routeId: r.id, days: legDays });
        adj[b].push({ to: a, routeId: r.id, days: legDays });
      }
    });
    return adj;
  }

  function findPath(state, from, to) {
    var adj = buildGraph(state);
    var dist = {}, prev = {}, seen = {};
    dist[from] = 0;
    var queue = [from];
    while (queue.length) {
      var cur = queue.shift();
      if (seen[cur]) continue;
      seen[cur] = true;
      if (cur === to) break;
      (adj[cur] || []).forEach(function (e) {
        var nd = dist[cur] + e.days;
        if (dist[e.to] === undefined || nd < dist[e.to]) {
          dist[e.to] = nd;
          prev[e.to] = { from: cur, routeId: e.routeId, days: e.days };
          queue.push(e.to);
        }
      });
      queue.sort(function (a, b) { return (dist[a] || 0) - (dist[b] || 0); });
    }
    if (dist[to] === undefined) return null;
    var path = [to], legs = [];
    var node = to;
    while (node !== from) {
      var p = prev[node];
      legs.unshift({ from: p.from, to: node, routeId: p.routeId, days: p.days });
      node = p.from;
      path.unshift(node);
    }
    return { path: path, legs: legs, totalDays: dist[to] };
  }

  function leaderBusy(state, leaderId) {
    return state.caravans.some(function (cv) { return cv.leaderId === leaderId && !cv.done; });
  }

  function canSend(state, destCityId, leaderId) {
    if (destCityId === state.homeCityId) return '目的地不能是己方城市';
    var p = findPath(state, state.homeCityId, destCityId);
    if (!p) return '当前季节没有可通的商路';
    if (leaderBusy(state, leaderId)) return '该商队负责人已在路上';
    return null;
  }

  function cargoWeight(cargo) {
    var w = 0;
    Object.keys(cargo).forEach(function (gid) {
      var g = DL.DATA.goodById(gid);
      Object.keys(cargo[gid] || {}).forEach(function (ts) {
        w += g.weight * (cargo[gid][ts] || 0);
      });
    });
    return w;
  }

  function cargoSummary(cargo) {
    var names = [];
    Object.keys(cargo).forEach(function (gid) {
      var g = DL.DATA.goodById(gid);
      Object.keys(cargo[gid] || {}).forEach(function (ts) {
        var q = cargo[gid][ts];
        if (q > 0) names.push(q + ' ' + DL.Market.qualityName(parseInt(ts, 10)) + g.name);
      });
    });
    return names.length ? names.join('、') : '空车';
  }

  function send(state, destCityId, leaderId, cargo, strategy, guardId) {
    var err = canSend(state, destCityId, leaderId);
    if (err) return { ok: false, msg: err };
    var p = findPath(state, state.homeCityId, destCityId);
    var weight = cargoWeight(cargo);
    var capacity = effectiveCapacity(state, p);
    if (weight > capacity) return { ok: false, msg: '超出载重 ' + capacity + 'kg（本路线限制）' };

    var upstreamFee = 0;
    p.legs.forEach(function (leg) {
      if (leg.routeId === 'goldriver' && leg.from === 'golddelta') upstreamFee = 50;
    });
    if (state.finance.treasury < upstreamFee) return { ok: false, msg: '不足以支付逆流纤夫费 50G' };
    state.finance.treasury -= upstreamFee;
    if (upstreamFee) DL.State.log(state, '为金河逆流雇佣纤夫，支付 50G。');

    var guard = null;
    if (guardId) {
      guard = DL.DATA.adventurerById(guardId);
      if (!guard) return { ok: false, msg: '冒险者不存在' };
      var guardCost = DL.Adventurers.costOf(state, guard);
      if (state.finance.treasury < guardCost) return { ok: false, msg: '金币不足以支付护卫酬金' };
      state.finance.treasury -= guardCost;
      DL.State.log(state, '聘请冒险者 ' + guard.name + ' 随队护卫，支付 ' + guardCost + 'G。');
    }

    Object.keys(cargo).forEach(function (gid) {
      var wh = state.warehouse[gid] = DL.Market.tierStock(state.warehouse[gid]);
      Object.keys(cargo[gid] || {}).forEach(function (ts) {
        wh[ts] = (wh[ts] || 0) - (cargo[gid][ts] || 0);
      });
    });
    var leader = DL.DATA.leaderById(leaderId);
    var cv = {
      id: state.caravanSeq++,
      leaderId: leaderId,
      destCityId: destCityId,
      path: p.path.slice(),
      legs: p.legs.map(function (l) { return { from: l.from, to: l.to, routeId: l.routeId, days: l.days }; }),
      legIdx: 0,
      progress: 0,
      cargo: JSON.parse(JSON.stringify(cargo)),
      state: 'outbound',
      strategy: strategy,
      cash: 0,
      daysTravelled: 0,
      guard: guard ? { id: guard.id, power: guard.power } : null,
      done: false
    };
    state.caravans.push(cv);
    state.stats.trips = (state.stats.trips || 0) + 1;
    DL.State.log(state, leader.name + '率商队出发：' + (cargoSummary(cargo) === '空车' ? '空车探路' : cargoSummary(cargo)) + ' → ' + DL.DATA.cityById(destCityId).name + '（约' + Math.ceil(p.totalDays) + '天）。');
    return { ok: true, msg: '商队已出发' };
  }

  function effectiveCapacity(state, pathInfo) {
    var cap = state.player.wagonKg;
    var usesSmall = pathInfo.legs.some(function (l) { return l.routeId === 'honeyriver'; });
    return usesSmall ? Math.min(cap, 50) : cap;
  }

  function tick(state) {
    state.caravans.forEach(function (cv) {
      if (cv.done) return;
      if (cv.delay > 0) { cv.delay--; return; } // 遭遇强盗后的延误待机
      var leader = DL.DATA.leaderById(cv.leaderId);
      var speed = leader.speed * (1 + 0.10 * (state.player.speedLevel || 0));
      var leg = cv.legs[cv.legIdx];
      var route = DL.DATA.routeById(leg.routeId);
      if (route.type === 'water' && DL.City.buildingLevel(state, 'harbor') > 0) speed *= 1 + 0.25 * DL.City.buildingLevel(state, 'harbor');
      cv.progress += speed;
      cv.daysTravelled += 1;
      // 强盗遭遇（每天判定一次）
      if (state.bandits && state.bandits.enabled) {
        var curRoute = DL.DATA.routeById(cv.legs[cv.legIdx].routeId);
        var br = state.bandits.routes[cv.legs[cv.legIdx].routeId];
        var danger = br ? br.danger : 0;
        if (danger > 0 && Math.random() < danger * 0.0008) {
          encounterBandits(state, cv, curRoute, danger);
          if (cv.done) return;
        }
      }
      // 海盗遭遇（海路）
      if (curRoute && curRoute.type === 'water' && state.pirates && state.pirates.enabled) {
        var pr = state.pirates.routes[curRoute.id];
        var pDanger = pr ? pr.danger : 0;
        if (pDanger > 0 && Math.random() < pDanger * 0.0008) {
          DL.Travel.pirateEncounter(state, cv, curRoute, pDanger);
        }
      }
      while (leg && cv.progress >= leg.days) {
        cv.progress -= leg.days;
        var doneRoute = DL.DATA.routeById(leg.routeId);
        DL.Achievements.markRoute(state, doneRoute.id);
        if (doneRoute && doneRoute.type === 'water' && doneRoute.stops.indexOf(state.homeCityId) !== -1) {
          state.shipping.seaUses.push(state.day);
          if (state.shipping.seaUses.length > 200) state.shipping.seaUses.splice(0, state.shipping.seaUses.length - 200);
        }
        cv.legIdx++;
        if (cv.legIdx >= cv.legs.length) {
          if (cv.state === 'outbound') arriveDest(state, cv);
          else arriveHome(state, cv);
          return;
        }
        if (cv.state === 'outbound' && !cv.stopPending && Math.random() < 0.30) {
          maybeRoadStop(state, cv, cv.legs[cv.legIdx]);
        }
        leg = cv.legs[cv.legIdx];
      }
    });
    state.roadStops = state.roadStops || [];
    state.roadStops.forEach(function (d) { d.daysLeft--; });
    var expired = state.roadStops.filter(function (d) { return d.daysLeft <= 0; });
    expired.forEach(function (d) { resolveRoadStop(state, d.id, 'sell'); });
    state.caravans = state.caravans.filter(function (cv) { return !cv.done; });
  }

  // 途经城市时有商贩愿高价收购部分货物（轻决策）
  function maybeRoadStop(state, cv, nextLeg) {
    var city = nextLeg.to;
    var best = null, bestP = 0;
    Object.keys(cv.cargo || {}).forEach(function (gid) {
      Object.keys(cv.cargo[gid] || {}).forEach(function (ts) {
        var q = cv.cargo[gid][ts];
        if (q <= 0) return;
        var tier = parseInt(ts, 10);
        var p = state.prices[city][gid].sell * DL.Market.qualityMult(tier);
        if (p > bestP) { bestP = p; best = { gid: gid, tier: tier, qty: q }; }
      });
    });
    if (!best) return;
    var offerQty = Math.min(best.qty, 4 + Math.floor(Math.random() * 9));
    var price = Math.round(state.prices[city][best.gid].sell * DL.Market.qualityMult(best.tier) * 1.08 * 100) / 100;
    var d = {
      id: (state.roadStopSeq = (state.roadStopSeq || 0) + 1),
      cvId: cv.id,
      cityId: city,
      goodId: best.gid,
      tier: best.tier,
      qty: offerQty,
      price: price,
      daysLeft: 2
    };
    state.roadStops = state.roadStops || [];
    state.roadStops.push(d);
    cv.stopPending = true;
    if (!state.pendingStop) state.pendingStop = d;
    DL.State.log(state, DL.DATA.leaderById(cv.leaderId).name + ' 途经' + DL.DATA.cityById(city).name + '，有商贩愿高价收购车上的 ' + offerQty + ' ' + DL.Market.qualityName(best.tier) + DL.DATA.goodById(best.gid).name + '。');
  }

  function resolveRoadStop(state, id, choice) {
    var idx = -1;
    for (var i = 0; i < state.roadStops.length; i++) {
      if (state.roadStops[i].id === id) { idx = i; break; }
    }
    if (idx === -1) return { ok: false, msg: '该路边交易已失效' };
    var d = state.roadStops[idx];
    var cv = null;
    state.caravans.forEach(function (c) { if (c.id === d.cvId) cv = c; });
    if (choice === 'sell' && cv && !cv.done) {
      var stock = cv.cargo[d.goodId] || {};
      var have = stock[d.tier] || 0;
      var qty = Math.min(d.qty, have);
      if (qty > 0) {
        stock[d.tier] = have - qty;
        cv.cash = (cv.cash || 0) + Math.round(qty * d.price * 100) / 100;
        DL.State.log(state, '路边交易：' + qty + ' ' + DL.Market.qualityName(d.tier) + DL.DATA.goodById(d.goodId).name + ' 售予' + DL.DATA.cityById(d.cityId).name + '商贩，得 ' + DL.Market.fmtG(qty * d.price) + '（回程结算）。');
      }
    }
    state.roadStops.splice(idx, 1);
    if (cv) cv.stopPending = false;
    if (state.pendingStop && state.pendingStop.id === id) state.pendingStop = null;
    return { ok: true, msg: '已处理' };
  }

  function encounterBandits(state, cv, route, danger) {
    var leader = DL.DATA.leaderById(cv.leaderId);
    var guard = cv.guard ? DL.DATA.adventurerById(cv.guard.id) : null;
    if (guard && Math.random() < DL.Adventurers.powerOf(state, guard) / 100) {
      DL.Adventurers.grantXP(state, guard.id, 1);
      DL.Adventurers.missionGuard(state);
      DL.State.log(state, leader.name + ' 在「' + route.name + '」遭遇强盗，护卫 ' + guard.name + ' 将其击退，货物无恙。');
      return;
    }
    // 没有护卫：有一定几率全军覆没（商队与首领一同损失）
    if (!guard) {
      var wipeChance = 0.05 + danger * 0.001;
      if (Math.random() < wipeChance) {
        var lostCargo = cargoSummary(cv.cargo);
        cv.done = true;
        cv.destroyed = true;
        destroyUnitByLeader(state, cv.leaderId);
        DL.State.log(state, leader.name + ' 的商队在「' + route.name + '」遭强盗伏击，全军覆没！' + (lostCargo !== '空车' ? '车上货物（' + lostCargo + '）全部损失。' : ''));
        state.notices.push('你的商队在「' + route.name + '」全军覆没！');
        return;
      }
    }
    var lossRatio = guard ? 0.10 : 0.15 + Math.random() * 0.20;
    var lost = [];
    Object.keys(cv.cargo).forEach(function (gid) {
      var g = DL.DATA.goodById(gid);
      Object.keys(cv.cargo[gid] || {}).forEach(function (ts) {
        var q = cv.cargo[gid][ts];
        if (q <= 0) return;
        var l = Math.min(q, Math.round(q * lossRatio));
        if (l > 0) {
          cv.cargo[gid][ts] = q - l;
          lost.push(l + ' ' + DL.Market.qualityName(parseInt(ts, 10)) + g.name);
        }
      });
    });
    cv.delay = 1;
    DL.State.log(state, leader.name + ' 在「' + route.name + '」遭遇强盗！损失 ' + (lost.length ? lost.join('、') : '部分现金') + '，行程延误1天。' + (guard ? '护卫 ' + guard.name + ' 负伤，只保住部分货物。' : ''));
  }

  function arriveDest(state, cv) {
    var leader = DL.DATA.leaderById(cv.leaderId);
    var proceeds = 0;
    var lost = [];
    var guardActive = DL.Diplo.hasTreaty(state, cv.destCityId, 'guard');
    Object.keys(cv.cargo).forEach(function (gid) {
      var good = DL.DATA.goodById(gid);
      Object.keys(cv.cargo[gid]).forEach(function (ts) {
        var tier = parseInt(ts, 10);
        var qty = cv.cargo[gid][tier];
        if (qty <= 0) return;
        if (good.fragile && !guardActive) {
          var loss = Math.max(0.05, 0.15 - leader.breakageReduce);
          var kept = Math.round(qty * (1 - loss));
          if (kept < qty) { lost.push((qty - kept) + ' ' + DL.Market.qualityName(tier) + good.name); qty = kept; }
        }
        if (good.perish && cv.daysTravelled > good.perish) {
          var kept2 = Math.round(qty * (cv.daysTravelled > good.perish * 1.5 ? 0.1 : 0.4));
          if (kept2 < qty) { lost.push((qty - kept2) + ' ' + DL.Market.qualityName(tier) + good.name + '（变质）'); qty = kept2; }
        }
        cv.cargo[gid][tier] = qty;
        if (qty > 0) {
          proceeds += state.prices[cv.destCityId][gid].sell * DL.Market.qualityMult(tier) * leader.haggle * qty;
        }
      });
    });
    DL.Achievements.markCity(state, cv.destCityId);
    DL.DATA.GOODS.forEach(function (g) {
      if (cv.cargo[g.id]) DL.Achievements.markGood(state, g.id);
    });
    state.finance.treasury += proceeds;
    state.player.tradeVolume += proceeds;
    state.dayTrade += proceeds;

    if (state.quest && state.quest.destCityId === cv.destCityId) {
      var have = 0;
      var qc = cv.cargo[state.quest.goodId];
      if (qc) {
        Object.keys(qc).forEach(function (ts) { have += qc[ts] || 0; });
      }
      if (have >= state.quest.qty) {
        state.finance.treasury += state.quest.reward;
        DL.State.log(state, '完成领主采购大单！获得 ' + state.quest.reward + 'G，' + DL.DATA.cityById(cv.destCityId).name + ' 好感+1。');
        DL.Diplo.changeRelation(state, cv.destCityId, 1);
        state.quest = null;
      }
    }

    var msg = '商队抵达 ' + DL.DATA.cityById(cv.destCityId).name + '，售出货物得 ' + DL.Market.fmtG(proceeds);
    if (lost.length) msg += '；途中损失：' + lost.join('、');
    DL.State.log(state, msg);
    DL.Market.revealIntel(state, cv.destCityId);
    DL.Travel.tryRoadEvent(state, cv);

    if (cv.strategy === 'auto') {
      var cargo2 = pickReturnCargo(state, cv);
      cv.cargo = cargo2;
      if (cargoWeight(cargo2) > 0) {
        DL.State.log(state, leader.name + '在' + DL.DATA.cityById(cv.destCityId).name + '采购回程货物。');
      }
    } else {
      cv.cargo = {};
    }
    cv.path.reverse();
    cv.legs = cv.legs.reverse();
    cv.legIdx = 0;
    cv.progress = 0;
    cv.state = 'returning';
  }

  function pickReturnCargo(state, cv) {
    var home = state.homeCityId;
    var dest = cv.destCityId;
    var budget = state.finance.treasury;
    var cap = effectiveCapacity(state, { legs: cv.legs }) * 0.6;
    var candidates = [];
    DL.DATA.GOODS.forEach(function (g) {
      // 自动回程只采购本城能消化的民生货（居民需求/外地商队收购），奢侈品留待手动决策
      if (!DL.DATA.RETAIL_DEMAND[g.id]) return;
      for (var t = 1; t <= 3; t++) {
        var buy = state.prices[dest][g.id].buy * DL.Market.qualityMult(t);
        var sell = state.prices[home][g.id].sell * DL.Market.qualityMult(t);
        if (buy <= 0) continue;
        var profitPerKg = (sell - buy) / g.weight;
        if (profitPerKg > 0) candidates.push({ gid: g.id, tier: t, buy: buy, profitPerKg: profitPerKg, weight: g.weight });
      }
    });
    candidates.sort(function (a, b) { return b.profitPerKg - a.profitPerKg; });
    var out = {}, weight = 0, spend = 0;
    candidates.forEach(function (cand) {
      while (weight + cand.weight <= cap && spend + cand.buy <= budget * 0.9) {
        out[cand.gid] = out[cand.gid] || {};
        out[cand.gid][cand.tier] = (out[cand.gid][cand.tier] || 0) + 1;
        weight += cand.weight;
        spend += cand.buy;
        if ((out[cand.gid][cand.tier] || 0) >= 15) break;
      }
    });
    if (spend > 0) {
      state.finance.treasury -= spend;
      state.player.tradeVolume += spend;
      state.dayTrade += spend;
    }
    return out;
  }

  function arriveHome(state, cv) {
    var leader = DL.DATA.leaderById(cv.leaderId);
    var home = state.homeCityId;
    var delivered = {};
    Object.keys(cv.cargo).forEach(function (gid) {
      Object.keys(cv.cargo[gid] || {}).forEach(function (ts) {
        var tier = parseInt(ts, 10);
        var qty = cv.cargo[gid][tier];
        if (qty <= 0) return;
        var wh = state.warehouse[gid] = DL.Market.tierStock(state.warehouse[gid]);
        wh[tier] += qty;
        delivered[gid] = (delivered[gid] || 0) + qty;
      });
    });
    state.finance.treasury += cv.cash;
    var names = [];
    Object.keys(delivered).forEach(function (gid) {
      names.push(delivered[gid] + ' ' + DL.DATA.goodById(gid).name);
      DL.Achievements.markGood(state, gid);
    });
    DL.State.log(state, leader.name + '率商队凯旋，' + (names.length ? names.join('、') + ' 已卸入仓库' : '空载而归') + '。');
    DL.Market.revealIntel(state, cv.destCityId);
    cv.guard = null;
    cv.done = true;
  }

  function pos(state, cv) {
    var leg = cv.legs[cv.legIdx];
    if (!leg) return null;
    var a = DL.DATA.cityById(leg.from), b = DL.DATA.cityById(leg.to);
    var t = Math.min(1, cv.progress / leg.days);
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
  }

  function upgradeWagon(state) {
    var lv = state.player.speedLevel || 0;
    if (lv >= 4) return { ok: false, msg: '车队已升级至最高等级。' };
    var cost = 250 + lv * 250;
    if (state.finance.treasury < cost) return { ok: false, msg: '金币不足。' };
    state.finance.treasury -= cost;
    state.player.wagonKg += 50;
    state.player.speedLevel = lv + 1;
    DL.State.log(state, '车队升级：载重提升至 ' + state.player.wagonKg + 'kg，商队速度 +10%。');
    return { ok: true, msg: '载重+50kg，速度+10%' };
  }

  /* ---------- 商队舰队：数量上限、招募、维护、损失 ---------- */

  // 在编上限：本城名册 + 商会大厅/驿站 + 繁荣度 + 商队牌照
  function fleetMax(state) {
    var base = DL.DATA.leadersFor(state.homeCityId).length;
    var extra = DL.City.buildingLevel(state, 'guildhall') + DL.City.buildingLevel(state, 'stage');
    var pro = state.cities[state.homeCityId].prosperity;
    if (pro >= 70) extra += 1;
    if (pro >= 90) extra += 1;
    if (state.player.license) extra += 2;
    return base + extra;
  }

  // 每队每日维护费（人吃马嚼 + 车辆养护）
  function unitMaintenance(state) {
    return (1.5 + state.player.wagonKg / 200) + (state.player.speedLevel || 0) * 1.2;
  }

  function nextRecruit(state) {
    for (var i = 0; i < DL.DATA.RECRUIT_POOL.length; i++) {
      var r = DL.DATA.RECRUIT_POOL[i];
      if (state.fleet.usedRecruits.indexOf(r.id) === -1) return r;
    }
    return null;
  }

  function recruitUnit(state) {
    if (state.fleet.units.length >= fleetMax(state)) return { ok: false, msg: '已达商队上限（' + fleetMax(state) + '）' };
    var leader = nextRecruit(state);
    if (!leader) return { ok: false, msg: '可招募的人手都用完了' };
    var cost = 400;
    if (state.finance.treasury < cost) return { ok: false, msg: '金币不足（招募150G + 购置马车250G）' };
    state.finance.treasury -= cost;
    state.fleet.units.push({ id: state.fleet.seq++, leaderId: leader.id, hiredDay: state.day });
    state.fleet.usedRecruits.push(leader.id);
    DL.State.log(state, '招募 ' + leader.name + ' 并购置马车，组建新商队。');
    return { ok: true, msg: leader.name + ' 已加入商会' };
  }

  function destroyUnitById(state, unitId) {
    for (var i = 0; i < state.fleet.units.length; i++) {
      if (state.fleet.units[i].id === unitId) {
        state.fleet.units.splice(i, 1);
        return true;
      }
    }
    return false;
  }

  function destroyUnitByLeader(state, leaderId) {
    for (var i = 0; i < state.fleet.units.length; i++) {
      if (state.fleet.units[i].leaderId === leaderId) {
        state.fleet.units.splice(i, 1);
        return true;
      }
    }
    return false;
  }

  function idleUnits(state) {
    return state.fleet.units.filter(function (u) { return !leaderBusy(state, u.leaderId); });
  }

  DL.Caravans = {
    buildGraph: buildGraph,
    findPath: findPath,
    canSend: canSend,
    send: send,
    tick: tick,
    pos: pos,
    upgradeWagon: upgradeWagon,
    effectiveCapacity: effectiveCapacity,
    leaderBusy: leaderBusy,
    cargoWeight: cargoWeight,
    cargoSummary: cargoSummary,
    fleetMax: fleetMax,
    unitMaintenance: unitMaintenance,
    nextRecruit: nextRecruit,
    recruitUnit: recruitUnit,
    destroyUnitById: destroyUnitById,
    destroyUnitByLeader: destroyUnitByLeader,
    idleUnits: idleUnits,
    resolveRoadStop: resolveRoadStop
  };
})(typeof window !== 'undefined' ? window : globalThis);
