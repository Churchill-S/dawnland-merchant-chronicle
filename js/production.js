/* 生产系统：进口原料 → 工坊按配方产出商品，可调开工率/暂停/换配方 */
(function (G) {
  'use strict';
  var DL = G.DL = G.DL || {};

  function init(state) {
    state.workshops = state.workshops || [];
    ensureSlots(state);
  }

  function ensureSlots(state) {
    state.workshops = state.workshops || [];
    var want = DL.City.buildingLevel(state, 'workshop');
    while (state.workshops.length < want) {
      state.workshops.push({ id: state.workshops.length + 1, recipeId: null, inputTier: 1, rate: 100, paused: false, progress: 0, batch: null, waitMsg: '' });
    }
    while (state.workshops.length > want) state.workshops.pop();
  }

  function slotById(state, slotId) {
    for (var i = 0; i < state.workshops.length; i++) if (state.workshops[i].id === slotId) return state.workshops[i];
    return null;
  }

  function canStartBatch(state, recipe, tier) {
    var missing = [];
    Object.keys(recipe.input).forEach(function (gid) {
      if (DL.Market.warehouseQty(state, gid, tier) < recipe.input[gid]) missing.push(gid);
    });
    return { ok: missing.length === 0, missing: missing };
  }

  function startBatch(state, slot, recipe) {
    var tier = slot.inputTier || 1;
    var chk = canStartBatch(state, recipe, tier);
    if (!chk.ok) return chk;
    Object.keys(recipe.input).forEach(function (gid) {
      var wh = state.warehouse[gid] = DL.Market.tierStock(state.warehouse[gid]);
      wh[tier] -= recipe.input[gid];
    });
    slot.batch = { recipeId: recipe.id, tier: tier, started: state.day };
    slot.progress = 0;
    slot.waitMsg = '';
    return { ok: true, missing: [] };
  }

  function missingText(state, gids) {
    return gids.map(function (gid) { return DL.DATA.goodById(gid).name; }).join('、');
  }

  function daily(state) {
    ensureSlots(state);
    fixedDaily(state);
    var level = DL.City.buildingLevel(state, 'workshop');
    var speedMult = 1 + 0.25 * (level - 1);
    state.workshops.forEach(function (slot) {
      if (!slot.recipeId || slot.paused) return;
      var recipe = DL.DATA.recipeById(slot.recipeId);
      if (!recipe) return;
      if (!slot.batch) {
        var r = startBatch(state, slot, recipe);
        slot.waitMsg = r.ok ? '' : ('缺原料：' + missingText(state, r.missing));
        if (!r.ok) return;
      }
      slot.progress += (slot.rate / 100) * speedMult;
      if (slot.progress >= recipe.days) {
        var outTier = slot.batch.tier;
        if (recipe.id === 'r_wine') outTier = Math.max(2, outTier); // 葡萄酒至少精良
        Object.keys(recipe.output).forEach(function (gid) {
          var wh = state.warehouse[gid] = DL.Market.tierStock(state.warehouse[gid]);
          wh[outTier] += recipe.output[gid];
        });
        DL.State.log(state, '工坊产出：' + DL.Market.qualityName(outTier) + DL.DATA.recipeById(slot.recipeId).name + '。');
        slot.progress = 0;
        slot.batch = null;
        var r2 = startBatch(state, slot, recipe);
        slot.waitMsg = r2.ok ? '' : ('缺原料：' + missingText(state, r2.missing));
      }
    });
  }

  var FIXED_PRODUCERS = [
    { b: 'brewery', input: { flour: 2 },    output: { craftbeer: 1 } },
    { b: 'winery',  input: { rawfruit: 2 }, output: { wine: 1 } },
    { b: 'weavery', input: { wool: 2 },     output: { clothing: 1 } },
    { b: 'bakery',  input: { flour: 2 },    output: { bread: 1 } }
  ];

  // 弹性消耗：从最低品质档开始取用，返回使用过的最低档
  function consumeFlexible(state, input) {
    var missing = [];
    var minTier = 3;
    Object.keys(input).forEach(function (gid) {
      var need = input[gid];
      var wh = DL.Market.tierStock(state.warehouse[gid]);
      var total = wh[1] + wh[2] + wh[3];
      if (total < need) { missing.push(gid); return; }
      var left = need;
      for (var t = 1; t <= 3 && left > 0; t++) {
        var take = Math.min(left, wh[t]);
        if (take > 0) {
          wh[t] -= take;
          left -= take;
          if (t < minTier) minTier = t;
        }
      }
      state.warehouse[gid] = wh;
    });
    if (missing.length) return { ok: false, missing: missing, tier: 1 };
    return { ok: true, missing: [], tier: minTier };
  }

  // 固定生产建筑：弹性取原料，产出品质 = 原料最低档（葡萄酒至少精良）
  function fixedDaily(state) {
    state.productionStatus = state.productionStatus || {};
    FIXED_PRODUCERS.forEach(function (f) {
      var lv = DL.City.buildingLevel(state, f.b);
      if (!lv) { state.productionStatus[f.b] = null; return; }
      var r = consumeFlexible(state, f.input);
      if (!r.ok) {
        state.productionStatus[f.b] = '缺原料：' + missingText(state, r.missing);
        return;
      }
      var outTier = f.b === 'winery' ? Math.max(2, r.tier) : r.tier;
      Object.keys(f.output).forEach(function (gid) {
        var wh = state.warehouse[gid] = DL.Market.tierStock(state.warehouse[gid]);
        wh[outTier] += f.output[gid];
      });
      state.productionStatus[f.b] = '产出：' + DL.Market.qualityName(outTier) + DL.DATA.goodById(Object.keys(f.output)[0]).name;
    });
    shopDaily(state, 'pub', ['craftbeer', 'wine'], 1.10);
    shopDaily(state, 'clothshop', ['clothing'], 1.15);
    shopDaily(state, 'pastry', ['bread'], 1.10);
  }

  // 商店：库存足够则自动消耗并赚钱（酒馆需啤酒与葡萄酒都有）
  function shopDaily(state, bid, goods, mult) {
    state.shopStatus = state.shopStatus || {};
    var lv = DL.City.buildingLevel(state, bid);
    if (!lv) { state.shopStatus[bid] = null; return; }
    var ok = true;
    goods.forEach(function (gid) {
      if (DL.Market.totalStock(state.warehouse[gid]) < lv) ok = false;
    });
    if (!ok) {
      state.shopStatus[bid] = '缺货停业';
      return;
    }
    var income = 0;
    var consumed = {};
    goods.forEach(function (gid) {
      for (var i = 0; i < lv; i++) {
        var wh = state.warehouse[gid] = DL.Market.tierStock(state.warehouse[gid]);
        var tier = 0;
        for (var t = 1; t <= 3; t++) if (wh[t] > 0) { tier = t; break; }
        if (!tier) break;
        wh[tier]--;
        consumed[gid] = (consumed[gid] || 0) + 1;
        income += state.prices[state.homeCityId][gid].sell * DL.Market.qualityMult(tier);
      }
    });
    if (income <= 0) { state.shopStatus[bid] = '缺货停业'; return; }
    income *= mult;
    var cTxt = Object.keys(consumed).map(function (gid) { return consumed[gid] + ' ' + DL.DATA.goodById(gid).name; }).join('、');
    state.shopStatus[bid] = '消耗 ' + cTxt + ' · 收入 ' + DL.Market.fmtG(income);
    state.finance.treasury += income;
    state.dayIncome += income;
    state.dayTrade += income;
    state.dayBreak.income[bid] = income;
  }

  function changeRecipe(state, slotId, recipeId) {
    var slot = slotById(state, slotId);
    if (!slot) return { ok: false, msg: '工坊不存在' };
    slot.recipeId = recipeId || null;
    slot.batch = null;
    slot.progress = 0;
    slot.waitMsg = '';
    return { ok: true, msg: recipeId ? '配方已切换' : '已清空配方' };
  }

  function setInputTier(state, slotId, tier) {
    var slot = slotById(state, slotId);
    if (!slot) return { ok: false, msg: '工坊不存在' };
    slot.inputTier = Math.max(1, Math.min(3, Math.round(tier)));
    slot.batch = null;
    slot.progress = 0;
    slot.waitMsg = '';
    return { ok: true, msg: '原料品质已设为' + DL.Market.qualityName(slot.inputTier) };
  }

  function setRate(state, slotId, rate) {
    var slot = slotById(state, slotId);
    if (!slot) return { ok: false, msg: '工坊不存在' };
    slot.rate = Math.max(0, Math.min(100, Math.round(rate)));
    return { ok: true, msg: '开工率 ' + slot.rate + '%' };
  }

  function togglePause(state, slotId) {
    var slot = slotById(state, slotId);
    if (!slot) return { ok: false, msg: '工坊不存在' };
    slot.paused = !slot.paused;
    return { ok: true, msg: slot.paused ? '已暂停生产' : '已恢复生产' };
  }

  DL.Production = {
    init: init,
    ensureSlots: ensureSlots,
    daily: daily,
    fixedDaily: fixedDaily,
    shopDaily: shopDaily,
    changeRecipe: changeRecipe,
    setInputTier: setInputTier,
    setRate: setRate,
    togglePause: togglePause
  };
})(typeof window !== 'undefined' ? window : globalThis);
