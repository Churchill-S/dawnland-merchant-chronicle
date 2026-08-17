/* 城市经营：建筑、税收、人口、产业、每日结算 */
(function (G) {
  'use strict';
  var DL = G.DL = G.DL || {};

  function buildingLevel(state, bid) {
    var b = state.city.buildings[bid];
    return b ? b.level : 0;
  }

  function buildingEffects(state) {
    var eff = {};
    DL.DATA.BUILDINGS.forEach(function (b) {
      var lv = buildingLevel(state, b.id);
      if (!lv) return;
      Object.keys(b.effects).forEach(function (k) {
        var v = b.effects[k];
        if (typeof v === 'number') eff[k] = (eff[k] || 0) + v * lv;
        else if (v === true) eff[k] = true;
      });
    });
    return eff;
  }

  function canBuild(state, b) {
    var lv = buildingLevel(state, b.id);
    if (state.city.construction.some(function (c) { return c.id === b.id; })) return { ok: false, msg: '该设施正在施工中' };
    if (lv >= 3) return { ok: false, msg: '已达最高等级' };
    if (b.requires) {
      var city = DL.DATA.cityById(state.homeCityId);
      if (b.requires === 'coastalOrLake' && !(city.flags.indexOf('coastal') !== -1 || city.flags.indexOf('lake') !== -1)) {
        return { ok: false, msg: '本城不临海/湖，无法建造' };
      }
      if (b.requires === 'river' && city.flags.indexOf('river') === -1) {
        return { ok: false, msg: '本城不跨河，无法建造' };
      }
      if (b.requires === 'coastal' && city.flags.indexOf('coastal') === -1) {
        return { ok: false, msg: '本城不临海，无法建造航运公司' };
      }
    }
    if (b.requiresEither) {
      var any = b.requiresEither.some(function (bid) { return buildingLevel(state, bid) > 0; });
      if (!any) {
        return { ok: false, msg: '需先建造' + b.requiresEither.map(function (bid) { return DL.DATA.buildingById(bid).name; }).join(' 或 ') };
      }
    }
    var cost = buildCost(state, b);
    if (state.finance.treasury < cost) return { ok: false, msg: '金币不足' };
    return { ok: true, msg: '' };
  }

  function buildCost(state, b) {
    var lv = buildingLevel(state, b.id);
    return Math.round(b.cost * (lv + 1) * 1.5);
  }

  function buildDays(state, b) {
    var lv = buildingLevel(state, b.id);
    return b.days * (lv + 1);
  }

  function startBuild(state, bid) {
    var b = DL.DATA.buildingById(bid);
    var chk = canBuild(state, b);
    if (!chk.ok) return chk;
    var cost = buildCost(state, b);
    var days = buildDays(state, b);
    state.finance.treasury -= cost;
    var lv = buildingLevel(state, b.id);
    state.city.construction.push({ id: bid, level: lv + 1, daysLeft: days });
    DL.State.log(state, '开始建造「' + b.name + '」（等级' + (lv + 1) + '），预计 ' + days + ' 天完工。');
    return { ok: true, msg: '已开工' };
  }

  function constructionTick(state) {
    var finished = [];
    state.city.construction.forEach(function (c) {
      c.daysLeft--;
      if (c.daysLeft <= 0) finished.push(c);
    });
    state.city.construction = state.city.construction.filter(function (c) { return c.daysLeft > 0; });
    finished.forEach(function (c) {
      state.city.buildings[c.id] = { level: c.level };
      DL.State.log(state, '「' + DL.DATA.buildingById(c.id).name + '」建成（等级' + c.level + '）！');
      applyInstant(state, DL.DATA.buildingById(c.id), c.level);
      // 新手引导任务3：建造一座设施
      DL.State.tutorialComplete(state, 2);
    });
  }

  function applyInstant(state, b, lv) {
    var city = state.cities[state.homeCityId];
    if (b.effects.prosperity) city.prosperity = Math.min(100, city.prosperity + b.effects.prosperity * lv);
    if (b.effects.credit) city.credit = Math.min(100, city.credit + b.effects.credit * lv);
    if (b.effects.connectivity) city.connectivity = Math.min(100, city.connectivity + b.effects.connectivity * lv);
    if (b.effects.tourism) city.tourism = Math.min(100, city.tourism + b.effects.tourism * lv);
  }

  function effectiveIndustry(state, type) {
    var city = state.cities[state.homeCityId];
    var base = DL.DATA.cityById(state.homeCityId).init.industry[type];
    var alloc = state.city.alloc[type] || 0;
    var v = base * alloc / 50;
    if (type === 'craft') {
      var eff = buildingEffects(state);
      v *= 1 + (eff.craftPct || 0) / 100;
    }
    return v;
  }

  function weightedAvg(values, weights) {
    var s = 0, w = 0;
    for (var i = 0; i < values.length; i++) { s += values[i] * weights[i]; w += weights[i]; }
    return w > 0 ? s / w : 70;
  }

  // 本地零售：居民按玩家定价购买日常商品
  function residentDaily(state) {
    var city = state.cities[state.homeCityId];
    var popK = city.pop / 1000;
    var revenue = 0, unmet = 0, totalDemand = 0;
    var scores = [], weights = [];
    var qtySum = 0, qtyWeighted = 0;
    var fest = DL.Calendar.festivalAt(state.day);
    var market = state.market;
    DL.DATA.GOODS.forEach(function (g) {
      var rate = DL.DATA.RETAIL_DEMAND[g.id];
      if (!rate) return;
      var demand = rate * popK;
      if (fest) {
        if (fest.foodBoost && (g.cat === '谷物' || g.cat === '食品' || g.cat === '饮品' || g.cat === '海产' || g.cat === '酒类')) demand *= 2;
        else if (fest.allMult) demand *= 1.5;
      }
      // 1) 居民先消耗自家摊位库存（先普通，再精良，最后稀有）
      var stock = DL.Market.tierStock(city.market[g.id]);
      var need = demand;
      for (var t = 1; t <= 3 && need > 0; t++) {
        var take = Math.min(need, stock[t]);
        stock[t] -= take;
        need -= take;
        qtyWeighted += take * t;
        qtySum += take;
      }
      city.market[g.id] = stock;
      // 2) 缺口进入居民订单簿
      var short = need;
      market.unmetDemand[g.id] = (market.unmetDemand[g.id] || 0) + short;
      totalDemand += demand;
      unmet += short;
      // 满意度：零售价相对合理价
      var fair = Math.max(1, DL.Market.fairPrice(state, g.id));
      var ratio = DL.Market.retailPrice(state, g.id) / fair;
      scores.push(Math.max(0, Math.min(100, 100 - (ratio - 1) * 90)));
      weights.push(demand);
    });

    // 3) 自动补货：从玩家仓库按零售价卖给居民
    if (market.autoRetail) {
      DL.DATA.GOODS.forEach(function (g) {
        if (!DL.DATA.RETAIL_DEMAND[g.id]) return;
        var need2 = market.unmetDemand[g.id] || 0;
        if (need2 <= 0) return;
        var wh = DL.Market.tierStock(state.warehouse[g.id]);
        for (var t = 1; t <= 3 && need2 > 0; t++) {
          var take = Math.min(need2, wh[t]);
          if (take <= 0) continue;
          wh[t] -= take;
          var price = DL.Market.retailPrice(state, g.id);
          var gain = price * take;
          revenue += gain;
          need2 -= take;
          qtyWeighted += take * t;
          qtySum += take;
        }
        state.warehouse[g.id] = wh;
        market.unmetDemand[g.id] = need2;
      });
    }

    var priceSat = weightedAvg(scores, weights);
    var backlog = 0;
    DL.DATA.GOODS.forEach(function (g) {
      if (DL.DATA.RETAIL_DEMAND[g.id]) backlog += market.unmetDemand[g.id] || 0;
    });
    var supplySat = totalDemand > 0 ? Math.max(0, 100 - backlog / totalDemand * 120) : 100;
    var taxSat = Math.max(0, Math.min(100, 100 - (state.finance.taxRate - 0.10) * 800));
    var satisfaction = Math.max(0, Math.min(100, 0.45 * priceSat + 0.25 * supplySat + 0.2 * taxSat + 0.1 * city.prosperity));
    var avgQuality = qtySum > 0 ? qtyWeighted / qtySum : 1;
    satisfaction = Math.max(0, Math.min(100, satisfaction + (avgQuality - 1) * 5));
    // 压制居民自主外销会引起不满
    if (state.market && state.market.suppressResidentSales) satisfaction = Math.max(0, satisfaction - 0.6);
    state.city.satisfaction = Math.round(satisfaction * 10) / 10;
    state.retailLast = {
      revenue: revenue, unmet: unmet, backlog: backlog, totalDemand: totalDemand,
      priceSat: Math.round(priceSat), supplySat: Math.round(supplySat)
    };
    return { revenue: revenue, satisfaction: satisfaction };
  }

  function daily(state) {
    var city = state.cities[state.homeCityId];
    var info = DL.Calendar.info(state.day);
    var eff = buildingEffects(state);
    var treasury = state.finance;

    // 本地零售：居民购买（收入进金库）
    var retail = residentDaily(state);
    var satisfaction = retail.satisfaction;

    // 税收
    var tax = city.pop * state.finance.taxRate * (0.5 + city.prosperity / 100) / 100;
    // 旅游（受居民满意度影响）
    var tourCoef = DL.Calendar.seasonCoef(info.seasonMonthIdx, 'tourism');
    var noble = state.weather && state.weather.nobleUntil >= state.day ? 2 : 1;
    var festivalBoost = 1 + (DL.Calendar.festivalAt(state.day) ? 0.5 : 0);
    var jointFestival = DL.Diplo.jointFestivalActive(state) ? 1.3 : 1;
    var satMult = 0.7 + satisfaction / 100 * 0.6;
    var tour = city.tourism * tourCoef * noble * festivalBoost * jointFestival * satMult * 0.12 * Math.sqrt(city.pop / 2000);
    if (state.weather && state.weather.festivalTourism && state.weather.festivalTourism.until >= state.day) tour *= 1.25;
    if (state.weather && state.weather.lights && state.weather.lights.until >= state.day) tour += 4;
    // 过路费与旅馆
    var toll = city.connectivity / 60 + (eff.toll || 0);
    var inn = (eff.inn ? 3 : 0);
    var luxury = eff.luxury ? city.tourism / 200 : 0;
    var income = tax + tour + toll + inn + luxury + retail.revenue;

    // 维护费
    var upkeep = Object.keys(state.city.buildings).length * 0.8 + state.city.construction.length * 0.5;

    // 航运公司：按近期海上商路使用量收费（没人用船就赚不到钱）
    var shipLv = buildingLevel(state, 'shipping');
    if (shipLv > 0) {
      var uses = state.shipping.seaUses.filter(function (d) { return d > state.day - 30; }).length;
      var shipDemand = Math.min(uses / 8, 3);
      var shipIncome = shipLv * 4 * shipDemand;
      var shipUpkeep = shipLv * 2.5;
      income += shipIncome;
      upkeep += shipUpkeep;
      state.shipping.last = { income: shipIncome, upkeep: shipUpkeep, uses: uses, demand: shipDemand };
    } else {
      state.shipping.last = null;
    }

    // 护航船队维护费
    var escLv = buildingLevel(state, 'escort');
    if (escLv > 0) {
      var escUpkeep = escLv * 2;
      upkeep += escUpkeep;
      state.dayBreak.expense.escort = escUpkeep;
    }

    // 生产工坊维护费
    var wsLv = buildingLevel(state, 'workshop');
    if (wsLv > 0) {
      var wsUpkeep = wsLv * 3;
      upkeep += wsUpkeep;
      state.dayBreak.expense.workshops = wsUpkeep;
    }

    state.dayBreak.income.tax = tax;
    state.dayBreak.income.tour = tour;
    state.dayBreak.income.toll = toll;
    state.dayBreak.income.inn = inn;
    state.dayBreak.income.luxury = luxury;
    state.dayBreak.income.retail = retail.revenue;
    if (shipLv > 0) state.dayBreak.income.shipping = shipIncome;
    state.dayBreak.expense.buildings = Object.keys(state.city.buildings).length * 0.8 + state.city.construction.length * 0.5;
    if (shipLv > 0) state.dayBreak.expense.shipping = shipUpkeep;

    treasury.treasury += income - upkeep;
    state.dayIncome += income;
    state.dayExpense += upkeep;
    state.dayTrade += retail.revenue;
    state.player.tradeVolume += retail.revenue;

    // 人口变化
    var growth = (city.prosperity - 50) * 0.000002 - (state.finance.taxRate - 0.10) * 0.004 + (satisfaction - 60) * 0.000008;
    if ((city.foodShortage || 0) > 3 && !eff.granary) growth -= 0.002;
    if (satisfaction < 40) growth -= 0.0005;
    if (eff.satisfaction) growth += 0.0005;
    if (city.pop > 80000) growth -= 0.001;
    growth = Math.max(-0.002, Math.min(0.0012, growth));
    city.pop = Math.max(100, city.pop * (1 + growth));

    // 繁荣度漂移（向基准靠拢，并受满意度影响）
    var baseProsperity = DL.DATA.cityById(state.homeCityId).init.prosperity;
    city.prosperity += (baseProsperity - city.prosperity) * 0.003 + (growth > 0 ? 0.01 : -0.01);
    if (satisfaction >= 80) city.prosperity += 0.05;
    else if (satisfaction < 40) city.prosperity -= 0.15;
    if ((city.foodShortage || 0) > 3) city.prosperity -= 0.2;
    city.prosperity = Math.max(0, Math.min(100, city.prosperity));

    // 交通通达度微涨（设施维护）
    city.connectivity = Math.max(0, Math.min(100, city.connectivity + (eff.connectivity ? eff.connectivity * 0.02 : 0)));

    constructionTick(state);

    // 生产建筑与商店维护费
    var industryMaint = 0;
    ['brewery', 'winery', 'weavery', 'bakery', 'pub', 'clothshop', 'pastry'].forEach(function (bid) {
      var lv = buildingLevel(state, bid);
      if (lv > 0) industryMaint += lv * 2;
    });
    if (industryMaint > 0) {
      upkeep += industryMaint;
      state.dayBreak.expense.industry = industryMaint;
    }
  }

  DL.City = {
    buildingLevel: buildingLevel,
    buildingEffects: buildingEffects,
    canBuild: canBuild,
    buildCost: buildCost,
    buildDays: buildDays,
    startBuild: startBuild,
    constructionTick: constructionTick,
    effectiveIndustry: effectiveIndustry,
    residentDaily: residentDaily,
    daily: daily
  };
})(typeof window !== 'undefined' ? window : globalThis);
