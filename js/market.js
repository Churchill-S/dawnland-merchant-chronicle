/* 市场：本地居民摊位、外地商队现货与需求、玩家仓库、外地需求情报 */
(function (G) {
  'use strict';
  var DL = G.DL = G.DL || {};

  function stockCap(goodId) {
    return goodId === 'pony' ? 5 : 200;
  }

  function tierStock(marketStock) {
    var s = marketStock || {};
    return { 1: s[1] || 0, 2: s[2] || 0, 3: s[3] || 0 };
  }

  function totalStock(stock) {
    var s = tierStock(stock);
    return s[1] + s[2] + s[3];
  }

  function mainTier(stock) {
    var s = tierStock(stock);
    var best = 1, bestQ = s[1];
    for (var t = 2; t <= 3; t++) {
      if (s[t] > bestQ) { best = t; bestQ = s[t]; }
    }
    return best;
  }

  function qualityMult(tier) {
    return (DL.DATA.QUALITY[tier] || DL.DATA.QUALITY[1]).mult;
  }

  function qualityName(tier) {
    return (DL.DATA.QUALITY[tier] || DL.DATA.QUALITY[1]).name;
  }

  function qualityStars(tier) {
    return (DL.DATA.QUALITY[tier] || DL.DATA.QUALITY[1]).stars;
  }

  function baselineStock(city, good) {
    var local = (city.nation === good.origin) || ((city.specialties || []).indexOf(good.id) !== -1);
    var base = local ? stockCap(good.id) * 0.45 : stockCap(good.id) * 0.12;
    return { 1: base, 2: base * 0.15, 3: base * 0.03 };
  }

  function productionTier(city, good) {
    if (city.quality && city.quality[good.id]) return city.quality[good.id];
    return city.nation === good.origin ? 2 : 1;
  }

  function nationMarkup(city, good) {
    var d = DL.DATA.nationDistance(city.nation, good.origin);
    var m = d === 0 ? 0.85 : (d === 1 ? 1.15 : 1.45);
    if (city.specialties && city.specialties.indexOf(good.id) !== -1) m = 0.78;
    return m;
  }

  function seasonalMult(good, monthIdx) {
    return (monthIdx >= 0 && good.seasonal[monthIdx]) ? good.seasonal[monthIdx] : 1;
  }

  function festivalMult(good, state) {
    var f = DL.Calendar.festivalAt(state.day);
    if (!f) return 1;
    var m = 1;
    if (f.effects && f.effects[good.id]) m *= f.effects[good.id];
    if (f.allMult) m *= f.allMult;
    if (f.foodBoost && (good.cat === '谷物' || good.cat === '食品' || good.cat === '饮品' || good.cat === '海产' || good.cat === '酒类')) m *= 1.05;
    return m;
  }

  function stockMult(goodId, stock) {
    var cap = stockCap(goodId);
    var target = cap * 0.5;
    // 库存系数限制在 0.75~1.25，避免满库存时价格崩盘
    return Math.max(0.75, Math.min(1.25, 1 + (target - totalStock(stock)) / cap * 0.4));
  }

  function weatherMult(good, state) {
    var cityNation = DL.DATA.cityById(state.homeCityId).nation;
    var m = 1;
    if (state.weather && state.weather.priceCut && state.weather.priceCut.until >= state.day) {
      if (state.weather.priceCut.nation === cityNation && DL.DATA.goodById(good.id).origin === cityNation) m *= 0.8;
    }
    if (state.weather && state.weather.importWave && state.weather.importWave.until >= state.day) {
      if (DL.DATA.goodById(good.id).origin !== cityNation) m *= 0.9;
    }
    if (state.weather && state.weather.storm && state.weather.storm.until >= state.day) {
      if (DL.DATA.goodById(good.id).origin === cityNation) m *= 1.5;
    }
    return m;
  }

  function treatyMult(state, cityId, mode) {
    var m = 1;
    if (DL.Diplo.hasTreaty(state, cityId, 'trade')) m *= (mode === 'buy' ? 0.90 : 1.10);
    if (DL.Diplo.hasTreaty(state, cityId, 'aid')) m *= (mode === 'buy' ? 0.95 : 1.05);
    return m;
  }

  // 一档（普通）基础价；卖价受该城“采购大单”加成
  function basePrice(state, cityId, goodId, mode) {
    var city = DL.DATA.cityById(cityId);
    var good = DL.DATA.goodById(goodId);
    var info = DL.Calendar.info(state.day);
    var p = good.base * nationMarkup(city, good) * seasonalMult(good, info.seasonMonthIdx) * festivalMult(good, state) * weatherMult(good, state) * stockMult(goodId, state.cities[cityId].market[goodId]);
    if (goodId === 'flour' && cityId === state.homeCityId && DL.City.buildingLevel(state, 'granary') > 0) {
      p = Math.max(good.base * 0.75, Math.min(good.base * 1.25, p));
    }
    p *= treatyMult(state, cityId, mode);
    if (mode === 'sell') {
      p *= 0.97;
      if (cityId !== state.homeCityId) p *= bulletinMult(state, cityId, goodId) * orderMult(state, cityId, goodId);
    } else {
      p *= 1.03;
    }
    return Math.max(1, p);
  }

  function tieredPrice(state, cityId, goodId, mode, tier) {
    return Math.round(basePrice(state, cityId, goodId, mode) * qualityMult(tier) * 100) / 100;
  }

  function recalc(state) {
    state.prices = {};
    DL.DATA.CITIES.forEach(function (c) {
      state.prices[c.id] = {};
      DL.DATA.GOODS.forEach(function (g) {
        state.prices[c.id][g.id] = {
          buy: Math.round(basePrice(state, c.id, g.id, 'buy') * 100) / 100,
          sell: Math.round(basePrice(state, c.id, g.id, 'sell') * 100) / 100
        };
      });
    });
  }

  // 价格历史：每个城市每件商品保留近 30 天买卖价，用于走势图
  function ensureHistory(state) {
    if (!state.priceHist) state.priceHist = {};
    DL.DATA.CITIES.forEach(function (c) {
      if (!state.priceHist[c.id]) state.priceHist[c.id] = {};
      DL.DATA.GOODS.forEach(function (g) {
        var arr = state.priceHist[c.id][g.id];
        if (Array.isArray(arr)) return;
        var p = state.prices && state.prices[c.id] && state.prices[c.id][g.id];
        state.priceHist[c.id][g.id] = p ? [{ day: state.day, buy: p.buy, sell: p.sell }] : [];
      });
    });
  }

  function recordHistory(state) {
    if (!state.priceHist) state.priceHist = {};
    DL.DATA.CITIES.forEach(function (c) {
      if (!state.priceHist[c.id]) state.priceHist[c.id] = {};
      DL.DATA.GOODS.forEach(function (g) {
        var p = state.prices && state.prices[c.id] && state.prices[c.id][g.id];
        if (!p) return;
        var arr = state.priceHist[c.id][g.id];
        if (!Array.isArray(arr)) arr = state.priceHist[c.id][g.id] = [];
        var last = arr[arr.length - 1];
        if (last && last.day === state.day) { last.buy = p.buy; last.sell = p.sell; return; }
        arr.push({ day: state.day, buy: p.buy, sell: p.sell });
        while (arr.length && arr[0].day <= state.day - 30) arr.shift();
      });
    });
  }

  function priceSeries(state, cityId, goodId) {
    return (state.priceHist && state.priceHist[cityId] && state.priceHist[cityId][goodId]) || [];
  }

  // 每日生产：本城产出进入居民摊位（本地市场流通），他城保持旧的市场库存
  function refreshDaily(state) {
    var info = DL.Calendar.info(state.day);
    DL.DATA.CITIES.forEach(function (c) {
      var st = state.cities[c.id];
      var eff = DL.City.buildingEffects(state);
      var craftBonus = 1 + (c.id === state.homeCityId ? (eff.craftPct || 0) / 100 : 0);
      DL.DATA.GOODS.forEach(function (g) {
        var cap = stockCap(g.id);
        var base = baselineStock(c, g);
        var stock = tierStock(st.market[g.id]);
        if ((g.origin === c.nation || (c.specialties || []).indexOf(g.id) !== -1) && g.id !== 'pony') {
          var season = DL.Calendar.seasonCoef(info.seasonMonthIdx, g.prod.type === 'agri' ? 'agri' : 'craft');
          var weather = 1;
          if (state.weather && state.weather.famine && state.weather.famine.until >= state.day && g.prod.type === 'agri' && c.id === state.homeCityId) weather = 0.5;
          var ind = c.id === state.homeCityId ? DL.City.effectiveIndustry(state, g.prod.type) : st.industry[g.prod.type];
          var qty = ind * season * g.prod.rate / 10 * weather * (g.prod.type === 'craft' ? craftBonus : 1);
          if (c.id === state.homeCityId) qty *= 2.5; // 本城腹地汇集的居民余货
          stock[productionTier(c, g)] += qty * (0.85 + Math.random() * 0.3);
        }
        if (g.id === 'pony') {
          if (c.id === 'grasshighland' && info.monthIdx >= 4 && info.monthIdx <= 6) stock[3] += 0.2;
          else stock[3] = Math.min(stock[3], 0.05);
        }
        for (var t = 1; t <= 3; t++) {
          if (g.id !== 'pony') stock[t] += (base[t] - stock[t]) * 0.04;
          stock[t] = Math.max(0, Math.min(cap * 2, stock[t]));
        }
        st.market[g.id] = stock;
      });
      // 他城简单面粉消耗；本城由居民需求系统处理
      if (c.id !== state.homeCityId) {
        var eat = st.pop / 500;
        var fl = tierStock(st.market.flour);
        var short = eat - totalStock(fl);
        if (short > 2) {
          st.foodShortage = (st.foodShortage || 0) + 1;
        } else {
          st.foodShortage = Math.max(0, (st.foodShortage || 0) - 0.2);
        }
        var need = eat;
        for (var t2 = 1; t2 <= 3 && need > 0; t2++) {
          var take = Math.min(need, fl[t2]);
          fl[t2] -= take;
          need -= take;
        }
        st.market.flour = fl;
      }
    });
    recalc(state);
    recordHistory(state);
    autoExport(state);
  }

  // 居民摊位自动外销：过剩库存会被行商买走，价格随之回升；玩家可压制（居民不满）
  function autoExport(state) {
    var home = state.homeCityId;
    var city = DL.DATA.cityById(home);
    var st = state.cities[home];
    if (state.market.suppressResidentSales) return;
    DL.DATA.GOODS.forEach(function (g) {
      var base = baselineStock(city, g);
      var totalBase = base[1] + base[2] + base[3];
      var target = totalBase * 1.2;
      var stock = tierStock(st.market[g.id]);
      var total = stock[1] + stock[2] + stock[3];
      if (total <= target) return;
      var exportAmt = Math.min(total - target, total * 0.15);
      if (exportAmt <= 0.01) return;
      for (var t = 1; t <= 3; t++) {
        stock[t] -= exportAmt * (stock[t] / total);
      }
      st.market[g.id] = stock;
    });
  }

  function marketClosed(state) {
    var f = DL.Calendar.festivalAt(state.day);
    return !!(f && f.marketClosed);
  }

  function warehouseWeight(state) {
    var w = 0;
    DL.DATA.GOODS.forEach(function (g) {
      var s = tierStock(state.warehouse[g.id]);
      w += (s[1] + s[2] + s[3]) * g.weight;
    });
    return w;
  }

  // 仓库容量：可囤货，约为马车载重的4倍
  function warehouseCap(state) {
    return state.player.wagonKg * 4 + (state.player.warehouseLv || 0) * 500;
  }

  // 升级仓库：每级 +500kg
  function upgradeWarehouse(state) {
    var lv = state.player.warehouseLv || 0;
    if (lv >= 5) return { ok: false, msg: '仓库已升级至最高等级' };
    var cost = 300 + lv * 200;
    if (state.finance.treasury < cost) return { ok: false, msg: '金币不足' };
    state.finance.treasury -= cost;
    state.player.warehouseLv = lv + 1;
    DL.State.log(state, '仓库扩建：容量提升至 ' + warehouseCap(state) + 'kg。');
    return { ok: true, msg: '仓库容量 +500kg' };
  }

  function warehouseQty(state, goodId, tier) {
    return tierStock(state.warehouse[goodId])[tier || 1];
  }

  /* ---------- 交易渠道 ---------- */

  // 本地居民摊位卖价（居民自产自售，价格实惠）
  function residentOfferPrice(state, goodId, tier) {
    var mult = (state.market && state.market.residentOfferMult) || 0.90;
    return Math.round(tieredPrice(state, state.homeCityId, goodId, 'buy', tier) * mult * 100) / 100;
  }

  // 外地商队现货卖价（含运费与关系折扣）
  function visitorOfferPrice(state, vi, goodId, tier) {
    // 按商队家乡的价格 + 运费计算，而不是本城价格再加价（否则永远比本地贵）
    var p = tieredPrice(state, vi.cityId, goodId, 'buy', tier) * vi.priceMult;
    if (vi.priceCap && vi.priceCap[goodId + '_' + tier] != null) p = Math.min(p, vi.priceCap[goodId + '_' + tier]);
    return Math.round(p * 100) / 100;
  }

  /* ---------- 玩家求购公告 ---------- */

  function publishDemand(state, goodId, qty, price, tier) {
    var active = (state.playerDemand || []).filter(function (e) { return e.until > state.day; });
    if (active.length >= 4) return { ok: false, msg: '求购公告最多同时挂4条' };
    if (active.some(function (e) { return e.goodId === goodId; })) return { ok: false, msg: '该商品已有求购公告' };
    if (qty <= 0 || price <= 0) return { ok: false, msg: '数量或出价无效' };
    var deposit = 10;
    if (state.finance.treasury < deposit) return { ok: false, msg: '金币不足（发布需付 10G 定金）' };
    state.finance.treasury -= deposit;
    state.playerDemand.push({ id: state.demandSeq++, goodId: goodId, qty: qty, price: Math.round(price * 100) / 100, tier: tier || 1, until: state.day + 7 });
    state.playerDemandHistory = (state.playerDemandHistory || 0) + 1;
    DL.State.log(state, '发布求购公告：' + qualityName(tier || 1) + DL.DATA.goodById(goodId).name + ' ×' + qty + '，出价 ' + fmtG(price) + '（7天，定金10G）。');
    return { ok: true, msg: '求购公告已发布（7天，已付10G定金）' };
  }

  function removeDemand(state, id) {
    state.playerDemand = state.playerDemand.filter(function (e) { return e.id !== id; });
    return { ok: true, msg: '已撤下求购公告' };
  }

  // 外地商队收购价（按他们的需求出价）
  function visitorBidPrice(state, vi, goodId, tier) {
    var want = vi.wants[goodId];
    if (want && want.price != null) return Math.round(want.price * 100) / 100; // 出售公告报价
    var mult = want ? (want.mult || 1) : 1;
    // 收购价只按普通档计价（批量采购压价），避免囤货刷钱
    return Math.round(basePrice(state, state.homeCityId, goodId, 'sell') * mult * 100) / 100;
  }

  /* ---------- 玩家出售公告 ---------- */

  function publishSaleAd(state, goodId, qty, price) {
    var active = (state.saleAds || []).filter(function (e) { return e.until > state.day; });
    if (active.length >= 4) return { ok: false, msg: '出售公告最多同时挂4条' };
    if (active.some(function (e) { return e.goodId === goodId; })) return { ok: false, msg: '该商品已有出售公告' };
    if (qty <= 0 || price <= 0) return { ok: false, msg: '数量或报价无效' };
    var have = DL.Market.warehouseQty(state, goodId, 1) + DL.Market.warehouseQty(state, goodId, 2) + DL.Market.warehouseQty(state, goodId, 3);
    if (have < 1) return { ok: false, msg: '仓库中没有该商品' };
    var fee = 20;
    if (state.finance.treasury < fee) return { ok: false, msg: '金币不足（广告费20G）' };
    state.finance.treasury -= fee;
    state.saleAds.push({ id: state.saleSeq++, goodId: goodId, qty: qty, price: Math.round(price * 100) / 100, until: state.day + 7 });
    DL.State.log(state, '发布出售公告：' + DL.DATA.goodById(goodId).name + ' ×' + qty + ' @ ' + fmtG(price) + '（7天，广告费20G）。');
    return { ok: true, msg: '出售公告已发布（7天）' };
  }

  function removeSaleAd(state, id) {
    state.saleAds = state.saleAds.filter(function (e) { return e.id !== id; });
    return { ok: true, msg: '已撤下出售公告' };
  }

  // 零售价（玩家定价，卖给本地居民）
  function retailPrice(state, goodId) {
    if (state.retail && state.retail.auto) {
      return Math.round(fairPrice(state, goodId) * 100) / 100;
    }
    var p = state.retail && state.retail.prices ? state.retail.prices[goodId] : null;
    if (p != null && isFinite(p) && p > 0) return p;
    return Math.round(fairPrice(state, goodId) * 100) / 100;
  }

  function fairPrice(state, goodId) {
    return state.prices[state.homeCityId][goodId].sell;
  }

  function setRetailPrice(state, goodId, delta) {
    if (!state.retail.prices[goodId]) state.retail.prices[goodId] = fairPrice(state, goodId);
    state.retail.prices[goodId] = Math.max(1, Math.round((state.retail.prices[goodId] + delta) * 100) / 100);
  }

  function initRetailPrices(state) {
    state.retail = state.retail || { auto: true, prices: {} };
    if (!state.retail.prices || typeof state.retail.prices !== 'object') state.retail.prices = {};
    DL.DATA.GOODS.forEach(function (g) {
      if (DL.DATA.RETAIL_DEMAND[g.id] && state.retail.prices[g.id] == null) {
        state.retail.prices[g.id] = Math.round(fairPrice(state, g.id) * 100) / 100;
      }
    });
  }

  // 从居民摊位买入（按该商品主要库存档位）
  function buy(state, goodId, qty, tier) {
    if (marketClosed(state)) return { ok: false, msg: '今日「静夜思」全图停市。' };
    var stock = tierStock(state.cities[state.homeCityId].market[goodId]);
    if (!tier) tier = mainTier(stock);
    var p = residentOfferPrice(state, goodId, tier);
    var cost = p * qty;
    if (state.finance.treasury < cost) return { ok: false, msg: '金币不足。' };
    if (stock[tier] < qty) return { ok: false, msg: '居民摊位该品质库存不足。' };
    var weight = DL.DATA.goodById(goodId).weight * qty;
    if (warehouseWeight(state) + weight > warehouseCap(state)) return { ok: false, msg: '仓库容量不足。' };
    state.finance.treasury -= cost;
    stock[tier] -= qty;
    state.cities[state.homeCityId].market[goodId] = stock;
    var wh = state.warehouse[goodId] = tierStock(state.warehouse[goodId]);
    wh[tier] += qty;
    state.player.tradeVolume += cost;
    state.dayTrade += cost;
    DL.Achievements.markGood(state, goodId);
    recalc(state);
    return { ok: true, msg: '向居民购入 ' + qty + ' ' + qualityName(tier) + DL.DATA.goodById(goodId).name + '，花费 ' + fmtG(cost), tier: tier };
  }

  // 向在镇的外地商队买入（提升与该城关系）
  function buyFromVisitor(state, viIdx, goodId, qty, tier) {
    if (marketClosed(state)) return { ok: false, msg: '今日「静夜思」全图停市。' };
    var vi = state.market.visitors[viIdx];
    if (!vi) return { ok: false, msg: '该商队已离开。' };
    var stock = tierStock(vi.stock[goodId]);
    if (stock[tier] < qty) return { ok: false, msg: '该商队此货不足。' };
    var p = visitorOfferPrice(state, vi, goodId, tier);
    var cost = p * qty;
    if (state.finance.treasury < cost) return { ok: false, msg: '金币不足。' };
    var weight = DL.DATA.goodById(goodId).weight * qty;
    if (warehouseWeight(state) + weight > warehouseCap(state)) return { ok: false, msg: '仓库容量不足。' };
    state.finance.treasury -= cost;
    stock[tier] -= qty;
    vi.stock[goodId] = stock;
    var wh = state.warehouse[goodId] = tierStock(state.warehouse[goodId]);
    wh[tier] += qty;
    state.player.tradeVolume += cost;
    state.dayTrade += cost;
    DL.Achievements.markGood(state, goodId);
    DL.Diplo.changeRelation(state, vi.cityId, 0.8);
    DL.State.log(state, '从' + DL.DATA.cityById(vi.cityId).name + '商队购入 ' + qty + ' ' + qualityName(tier) + DL.DATA.goodById(goodId).name + '，关系+0.8。');
    return { ok: true, msg: '购入 ' + qty + ' ' + qualityName(tier) + DL.DATA.goodById(goodId).name + '，关系+0.8' };
  }

  // 卖给本地居民（零售价，填补居民缺口）
  function sell(state, goodId, qty, tier) {
    tier = tier || 1;
    if (marketClosed(state)) return { ok: false, msg: '今日「静夜思」全图停市。' };
    var have = warehouseQty(state, goodId, tier);
    if (have < qty) return { ok: false, msg: '仓库中该品质商品不足。' };
    var unmet = state.market.unmetDemand[goodId] || 0;
    if (unmet <= 0) return { ok: false, msg: '居民暂时不缺货，可稍后再售。' };
    var take = Math.min(qty, unmet);
    var p = retailPrice(state, goodId);
    var gain = p * take;
    state.finance.treasury += gain;
    var wh = state.warehouse[goodId] = tierStock(state.warehouse[goodId]);
    wh[tier] -= take;
    state.market.unmetDemand[goodId] = unmet - take;
    state.player.tradeVolume += gain;
    state.dayTrade += gain;
    DL.Achievements.markGood(state, goodId);
    return { ok: true, msg: '售予居民 ' + take + ' ' + qualityName(tier) + DL.DATA.goodById(goodId).name + '，收入 ' + fmtG(gain) };
  }

  // 卖给在镇的外地商队（按他们的需求出价，提升关系）
  function sellToVisitor(state, viIdx, goodId, qty, tier) {
    if (marketClosed(state)) return { ok: false, msg: '今日「静夜思」全图停市。' };
    var vi = state.market.visitors[viIdx];
    if (!vi) return { ok: false, msg: '该商队已离开。' };
    var want = vi.wants[goodId];
    if (!want) return { ok: false, msg: '该商队不需要此货。' };
    var have = warehouseQty(state, goodId, tier);
    if (have < qty) return { ok: false, msg: '仓库中该品质商品不足。' };
    var take = Math.min(qty, want.qty);
    if (take <= 0) return { ok: false, msg: '该商队需求已满足。' };
    var p = visitorBidPrice(state, vi, goodId, tier);
    var gain = p * take;
    state.finance.treasury += gain;
    var wh = state.warehouse[goodId] = tierStock(state.warehouse[goodId]);
    wh[tier] -= take;
    want.qty -= take;
    state.player.tradeVolume += gain;
    state.dayTrade += gain;
    DL.Achievements.markGood(state, goodId);
    DL.Diplo.changeRelation(state, vi.cityId, 0.5);
    DL.State.log(state, '售予' + DL.DATA.cityById(vi.cityId).name + '商队 ' + take + ' ' + qualityName(tier) + DL.DATA.goodById(goodId).name + '，关系+0.5。');
    return { ok: true, msg: '售出 ' + take + ' ' + qualityName(tier) + DL.DATA.goodById(goodId).name + '，关系+0.5' };
  }

  /* ---------- 外地商队（在镇访客） ---------- */

  function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
    }
    return arr;
  }

  function pickWeighted(items, weightFn) {
    var total = 0, ws = [];
    items.forEach(function (it) {
      var w = Math.max(0.01, weightFn(it));
      ws.push(w); total += w;
    });
    var r = Math.random() * total;
    for (var i = 0; i < items.length; i++) {
      r -= ws[i];
      if (r <= 0) return items[i];
    }
    return items[items.length - 1];
  }

  function spawnVisitor(state) {
    if (state.market.visitors.length >= 4) return;
    var others = DL.DATA.CITIES.filter(function (c) { return c.id !== state.homeCityId; });
    var city = pickWeighted(others, function (c) {
      return Math.max(0.3, 1 + DL.Diplo.relation(state, c.id) / 50);
    });
    var dist = DL.DATA.nationDistance(DL.DATA.cityById(state.homeCityId).nation, city.nation);
    var rel = DL.Diplo.relation(state, city.id);
    var priceMult = Math.max(0.95, Math.min(1.55, 1.05 + 0.04 * dist - 0.10 * rel / 100));
    var bidMult = Math.max(1.0, Math.min(1.35, 1.05 + 0.04 * dist + 0.10 * rel / 100));
    var stock = {}, wants = {};
    DL.DATA.GOODS.forEach(function (g) {
      if (g.origin === city.nation || (city.specialties || []).indexOf(g.id) !== -1) {
        var tier = productionTier(city, g);
        stock[g.id] = {};
        stock[g.id][tier] = 6 + Math.floor(Math.random() * 18);
        if (Math.random() < 0.35) stock[g.id][1] = Math.floor(Math.random() * 8);
        if (g.id === 'pony') stock[g.id][3] = Math.min(stock[g.id][3] || 0, 2);
      }
    });
    var wantPool = shuffle(DL.DATA.GOODS.filter(function (g) {
      return g.origin !== city.nation && g.id !== 'pony';
    }));
    var nWants = 2 + Math.floor(Math.random() * 2);
    for (var i = 0; i < Math.min(nWants, wantPool.length); i++) {
      var wg = wantPool[i];
      wants[wg.id] = { tier: 1, qty: 10 + Math.floor(Math.random() * 20), mult: bidMult };
      if (Math.random() < 0.25) wants[wg.id].tier = 2;
    }
    var vi = {
      id: state.market.visitorSeq++,
      cityId: city.id,
      daysLeft: 2,
      priceMult: priceMult,
      bidMult: bidMult,
      stock: stock,
      wants: wants
    };
    // 玩家求购公告：商队看到后会特意带货，价格不超过出价
    var demandEntries = (state.playerDemand || []).filter(function (e) { return e.until > state.day; });
    var brought = [], haggled = [];
    for (var di = 0; di < Math.min(demandEntries.length, 3); di++) {
      if (Math.random() < 0.6) {
        var de = demandEntries[di];
        vi.stock[de.goodId] = vi.stock[de.goodId] || {};
        var dt = de.tier || 1;
        vi.stock[de.goodId][dt] = (vi.stock[de.goodId][dt] || 0) + Math.min(de.qty, 8 + Math.floor(Math.random() * 20));
        var fairTier = tieredPrice(state, state.homeCityId, de.goodId, 'buy', dt);
        var cap = de.price;
        if (cap < fairTier * 0.85) {
          cap = Math.round(fairTier * 0.9 * 100) / 100; // 嫌低，讨价还价
          haggled.push(qualityName(dt) + DL.DATA.goodById(de.goodId).name + '（谈到 ' + fmtG(cap) + 'G）');
        } else {
          brought.push(qualityName(dt) + DL.DATA.goodById(de.goodId).name);
        }
        vi.priceCap = vi.priceCap || {};
        vi.priceCap[de.goodId + '_' + dt] = cap;
      }
    }
    // 玩家出售公告：需要这些货的商队会前来按报价采购
    var saleAds = (state.saleAds || []).filter(function (e) { return e.until > state.day; });
    var adHits = [];
    for (var si = 0; si < Math.min(saleAds.length, 3); si++) {
      if (Math.random() < 0.6) {
        var ad = saleAds[si];
        var fairSell = state.prices[state.homeCityId][ad.goodId].sell;
        if (ad.price > fairSell * 1.4) continue; // 报价过高无人问津
        wants[ad.goodId] = { tier: 1, qty: Math.min(ad.qty, 5 + Math.floor(Math.random() * 12)), mult: 1, price: Math.round(ad.price * 100) / 100 };
        adHits.push(DL.DATA.goodById(ad.goodId).name);
      }
    }
    state.market.visitors.push(vi);
    DL.State.log(state, DL.DATA.cityById(city.id).name + '的商队抵达本镇，停留 ' + vi.daysLeft + ' 天，带来现货并发布收购需求。');
    if (brought.length) DL.State.log(state, '商队看到你的求购公告，按出价带来了 ' + brought.join('、') + '。');
    if (haggled.length) DL.State.log(state, '商队嫌部分出价太低，讨价还价后带来：' + haggled.join('、') + '。');
    if (adHits.length) DL.State.log(state, '外地商队看到你的出售公告，前来采购 ' + adHits.join('、') + '。');
    state.notices.push(DL.DATA.cityById(city.id).name + '商队抵达，快去市场看看现货与需求！');
    revealIntel(state, city.id);
  }

  function tickVisitors(state) {
    state.market.nextVisitorDay--;
    if (state.market.nextVisitorDay <= 0) {
      spawnVisitor(state);
      state.market.nextVisitorDay = 2 + Math.floor(Math.random() * 3);
    }
    state.market.visitors.forEach(function (vi) { vi.daysLeft--; });
    var left = state.market.visitors.filter(function (vi) { return vi.daysLeft > 0; });
    if (left.length !== state.market.visitors.length) {
      state.market.visitors.forEach(function (vi) {
        if (vi.daysLeft <= 0) DL.State.log(state, DL.DATA.cityById(vi.cityId).name + '的商队离开了本镇。');
      });
    }
    state.market.visitors = left;
  }

  /* ---------- 外地需求与情报 ---------- */

  // 每周商路公告（全城可见的公开需求）
  function bulletinMult(state, cityId, goodId) {
    var list = state.market.bulletin && state.market.bulletin[cityId];
    if (!list) return 1;
    for (var i = 0; i < list.length; i++) {
      if (list[i].goodId === goodId && list[i].until > state.day) return list[i].mult;
    }
    return 1;
  }

  function bulletinItems(state, cityId) {
    var list = state.market.bulletin && state.market.bulletin[cityId];
    if (!list) return [];
    return list.filter(function (b) { return b.until > state.day; });
  }

  // 季节需求权重：当季热销的货更容易被点名为本周公告
  function seasonalWeight(good, monthIdx) {
    var w = 1;
    if (good.seasonal && good.seasonal[monthIdx]) {
      var m = good.seasonal[monthIdx];
      w += Math.max(0, m - 1) * 4;
    }
    if (monthIdx >= 9 && (good.id === 'wax' || good.id === 'wool' || good.id === 'cheese' || good.id === 'fruit' || good.id === 'spice')) w += 1.5;
    if (monthIdx >= 7 && good.cat === '酒类') w += 1.5;
    return w;
  }

  function orderMult(state, cityId, goodId) {
    var list = state.market.orders[cityId] || [];
    for (var i = 0; i < list.length; i++) {
      if (list[i].goodId === goodId && list[i].until > state.day) return list[i].mult;
    }
    return 1;
  }

  function expireOrders(state) {
    Object.keys(state.market.orders).forEach(function (cid) {
      state.market.orders[cid] = state.market.orders[cid].filter(function (o) { return o.until > state.day; });
    });
  }

  function ordersTick(state) {
    state.market.nextOrdersDay = state.day + 7;
    var mIdx = DL.Calendar.info(state.day).seasonMonthIdx;
    // 每周公告：每座外城 3~4 种商品公开加价
    state.market.bulletin = {};
    DL.DATA.CITIES.forEach(function (c) {
      if (c.id === state.homeCityId) return;
      var pool = DL.DATA.GOODS.filter(function (g) { return g.origin !== c.nation && g.id !== 'pony'; });
      var n = 3 + Math.floor(Math.random() * 2);
      var picked = [];
      for (var i = 0; i < Math.min(n, pool.length); i++) {
        var weights = [];
        var total = 0;
        pool.forEach(function (g) {
          var ww = seasonalWeight(g, mIdx);
          weights.push(ww);
          total += ww;
        });
        var r = Math.random() * total, idx = 0;
        for (var k = 0; k < weights.length; k++) {
          r -= weights[k];
          if (r <= 0) { idx = k; break; }
        }
        var g = pool.splice(idx, 1)[0];
        picked.push({
          goodId: g.id,
          mult: Math.round((1.05 + Math.random() * 0.20) * 100) / 100,
          until: state.day + 7
        });
      }
      state.market.bulletin[c.id] = picked;
    });
    // 限时采购大单：3~6 座城各 1~3 单，数量与加价更随机
    var cities = shuffle(DL.DATA.CITIES.filter(function (c) { return c.id !== state.homeCityId; })).slice(0, 3 + Math.floor(Math.random() * 3));
    cities.forEach(function (c) {
      var pool = shuffle(DL.DATA.GOODS.filter(function (g) { return g.origin !== c.nation && g.id !== 'pony'; }));
      var n = 1 + Math.floor(Math.random() * 3);
      state.market.orders[c.id] = state.market.orders[c.id] || [];
      for (var i = 0; i < Math.min(n, pool.length); i++) {
        var g = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
        if (!g) break;
        var tier = Math.random() < 0.55 ? 1 : (Math.random() < 0.6 ? 2 : 3);
        state.market.orders[c.id].push({
          goodId: g.id,
          tier: tier,
          qty: 8 + Math.floor(Math.random() * 52),
          mult: Math.round((1.10 + Math.random() * 0.50) * 100) / 100,
          until: state.day + 4 + Math.floor(Math.random() * 7)
        });
      }
    });
  }

  function revealIntel(state, cityId) {
    state.market.intelCities[cityId] = Math.max(state.market.intelCities[cityId] || 0, state.day + 12);
  }

  function hasIntel(state, cityId) {
    return (state.market.intelCities[cityId] || 0) > state.day;
  }

  function intelLevel(state) {
    var eff = DL.City.buildingEffects(state);
    var lv = 0;
    if (eff.inn) lv += 1;
    if (eff.luxury) lv += 2;
    if (eff.toll) lv += 1;
    return lv;
  }

  function refreshIntel(state) {
    state.market.nextIntelDay = state.day + 5;
    var lv = intelLevel(state);
    var cities = shuffle(DL.DATA.CITIES.filter(function (c) { return c.id !== state.homeCityId; }));
    for (var i = 0; i < Math.min(lv, cities.length); i++) {
      revealIntel(state, cities[i].id);
    }
    if (lv > 0) DL.State.log(state, '酒馆与旅馆的伙计们带回消息：' + Math.min(lv, cities.length) + ' 座城市的最新行情已更新。');
  }

  // 公布需求：按（外城卖价 - 本地居民进价）排序的可获利商品
  function publishedDemand(state, cityId) {
    var out = [];
    DL.DATA.GOODS.forEach(function (g) {
      var sell = state.prices[cityId][g.id].sell;
      var home = residentOfferPrice(state, g.id, 1);
      var profit = sell - home;
      if (profit > 2) out.push({ goodId: g.id, sell: sell, profit: profit });
    });
    out.sort(function (a, b) { return b.profit - a.profit; });
    return out.slice(0, 3);
  }

  function fmtG(v) {
    return Math.round(v) + 'G';
  }

  DL.Market = {
    basePrice: basePrice,
    tieredPrice: tieredPrice,
    recalc: recalc,
    ensureHistory: ensureHistory,
    recordHistory: recordHistory,
    priceSeries: priceSeries,
    refreshDaily: refreshDaily,
    autoExport: autoExport,
    buy: buy,
    buyFromVisitor: buyFromVisitor,
    sell: sell,
    sellToVisitor: sellToVisitor,
    publishDemand: publishDemand,
    removeDemand: removeDemand,
    publishSaleAd: publishSaleAd,
    removeSaleAd: removeSaleAd,
    warehouseWeight: warehouseWeight,
    warehouseCap: warehouseCap,
    upgradeWarehouse: upgradeWarehouse,
    warehouseQty: warehouseQty,
    marketClosed: marketClosed,
    stockCap: stockCap,
    tierStock: tierStock,
    totalStock: totalStock,
    mainTier: mainTier,
    qualityMult: qualityMult,
    qualityName: qualityName,
    qualityStars: qualityStars,
    productionTier: productionTier,
    residentOfferPrice: residentOfferPrice,
    visitorOfferPrice: visitorOfferPrice,
    visitorBidPrice: visitorBidPrice,
    fairPrice: fairPrice,
    retailPrice: retailPrice,
    setRetailPrice: setRetailPrice,
    initRetailPrices: initRetailPrices,
    tickVisitors: tickVisitors,
    spawnVisitor: spawnVisitor,
    orderMult: orderMult,
    expireOrders: expireOrders,
    ordersTick: ordersTick,
    bulletinMult: bulletinMult,
    bulletinItems: bulletinItems,
    revealIntel: revealIntel,
    hasIntel: hasIntel,
    intelLevel: intelLevel,
    refreshIntel: refreshIntel,
    publishedDemand: publishedDemand,
    fmtG: fmtG
  };
})(typeof window !== 'undefined' ? window : globalThis);
