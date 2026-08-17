/* 无界面冒烟测试：加载纯逻辑模块，模拟一个简单AI经营10年 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ctx = {
  console, Math, JSON, Date, Object, Array, parseInt, parseFloat, isNaN, isFinite, String, Number, RegExp
};
ctx.globalThis = ctx;
const storage = {};
ctx.localStorage = {
  getItem: (k) => (k in storage ? storage[k] : null),
  setItem: (k, v) => { storage[k] = String(v); },
  removeItem: (k) => { delete storage[k]; }
};
vm.createContext(ctx);

const FILES = [
  'js/data.js', 'js/i18n.js', 'js/calendar.js', 'js/market.js', 'js/caravans.js',
  'js/city.js', 'js/diplomacy.js', 'js/events.js', 'js/state.js', 'js/companies.js', 'js/sites.js', 'js/rivals.js', 'js/achievements.js', 'js/festivals.js', 'js/travel.js', 'js/adventurers.js', 'js/production.js'
];
for (const f of FILES) {
  const code = fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
  vm.runInContext(code, ctx, { filename: f });
}

const DL = ctx.DL;

// 历法自检
const yearDays = DL.Calendar.YEAR_DAYS;
const hollows = yearDays.filter(d => d.hollow).map(d => d.hollow);
console.log('[日历] 天数 =', yearDays.length, '空日 =', hollows.join('、'));
const festDays = Object.keys(DL.DATA.festivalByDay).length;
console.log('[节日] 节日日数 =', festDays, '节日 =', Object.keys(DL.DATA.festivalByDay).map(k => DL.DATA.festivalByDay[k].name));
console.log('[历法] 第1天 =', DL.Calendar.info(1).label, '| 第61天 =', DL.Calendar.info(61).label, '| 第122天 =', DL.Calendar.info(122).label, '| 第273天 =', DL.Calendar.info(273).label, '| 第365天 =', DL.Calendar.info(365).label);

function runGame(homeId, maxDays) {
  let s = DL.State.newGame(homeId);
  s.guild.hired = DL.DATA.adventurersFor(homeId)[0].id;
  let sent = 0, events = 0;
  const aiSellOverflow = () => {
    const cap = DL.Market.warehouseCap(s);
    if (DL.Market.warehouseWeight(s) <= cap * 0.6) return;
    for (const g of DL.DATA.GOODS) {
      const unmet = s.market.unmetDemand[g.id] || 0;
      if (unmet <= 0) continue;
      const st = DL.Market.tierStock(s.warehouse[g.id]);
      for (let t = 1; t <= 3; t++) {
        if (st[t] > 0) { DL.Market.sell(s, g.id, Math.min(st[t], unmet), t); break; }
      }
    }
    for (const vi of s.market.visitors) {
      for (const gid of Object.keys(vi.wants || {})) {
        const w = vi.wants[gid];
        const have = DL.Market.warehouseQty(s, gid, w.tier);
        if (have > 0) { DL.Market.sellToVisitor(s, s.market.visitors.indexOf(vi), gid, Math.min(have, w.qty), w.tier); break; }
      }
    }
    // 还是满：挑仓库里外销利润最大的货再派一队出去（模拟再出口）
    if (DL.Market.warehouseWeight(s) > cap * 0.7) {
      const unit = s.fleet.units.find(u => !DL.Caravans.leaderBusy(s, u.leaderId));
      if (unit) {
        let bestEx = null;
        for (const g of DL.DATA.GOODS) {
          const st = DL.Market.tierStock(s.warehouse[g.id]);
          for (let t = 1; t <= 3; t++) {
            if (st[t] <= 0) continue;
            for (const cc of DL.DATA.CITIES) {
              if (cc.id === s.homeCityId) continue;
              if (!DL.Caravans.findPath(s, s.homeCityId, cc.id)) continue;
              const sellP = s.prices[cc.id][g.id].sell * DL.Market.qualityMult(t);
              const profit = sellP * (s.player.wagonKg / g.weight);
              if (!bestEx || profit > bestEx.profit) bestEx = { g, t, cc, profit };
            }
          }
        }
        if (bestEx) {
          const have = DL.Market.warehouseQty(s, bestEx.g.id, bestEx.t);
          const qty = Math.min(have, Math.floor((s.player.wagonKg / bestEx.g.weight) * 0.6));
          if (qty >= 1) {
            const cargo = {}; cargo[bestEx.g.id] = {}; cargo[bestEx.g.id][bestEx.t] = qty;
            DL.Caravans.send(s, bestEx.cc.id, unit.leaderId, cargo, 'empty');
          }
        }
      }
    }
  };
  for (let d = 0; d < maxDays; d++) {
    // 简单AI：从居民摊位挑价差最大的货，派商队外销
    if (d % 2 === 0) aiSellOverflow();
    if (d % 3 === 0 && s.finance.treasury > 250 && s.player.debt < 12000) {
      aiSellOverflow();
      const goods = DL.DATA.GOODS.filter(g => DL.Market.totalStock(s.cities[s.homeCityId].market[g.id]) >= 8);
      let best = null;
      for (const g of goods) {
        for (const cc of DL.DATA.CITIES) {
          if (cc.id === s.homeCityId) continue;
          const p = DL.Caravans.findPath(s, s.homeCityId, cc.id);
          if (!p) continue;
          const tier = DL.Market.mainTier(s.cities[s.homeCityId].market[g.id]);
          const buyP = DL.Market.residentOfferPrice(s, g.id, tier);
          const sellP = s.prices[cc.id][g.id].sell * DL.Market.qualityMult(tier);
          const profit = (sellP - buyP) * (s.player.wagonKg / g.weight);
          if (!best || profit > best.profit) best = { g, cc, tier, buyP, profit };
        }
      }
      if (best && best.profit > 5) {
        const unit = s.fleet.units.find(u => !DL.Caravans.leaderBusy(s, u.leaderId));
        if (unit) {
          const qty = Math.max(1, Math.min(
            Math.floor((s.player.wagonKg / best.g.weight) * 0.5),
            Math.floor(DL.Market.totalStock(s.cities[s.homeCityId].market[best.g.id]) * 0.7),
            Math.floor(s.finance.treasury / (best.buyP + 0.01))
          ));
          const res = DL.Market.buy(s, best.g.id, qty);
          if (res.ok && res.tier) {
            const cargo = {}; cargo[best.g.id] = {}; cargo[best.g.id][res.tier] = qty;
            const guardId = Math.random() < 0.5 ? s.guild.hired : null;
            const r = DL.Caravans.send(s, best.cc.id, unit.leaderId, cargo, Math.random() < 0.75 ? 'auto' : 'empty', guardId);
            if (r.ok) sent++;
          }
        }
      }
    }
    // 建银行与旅馆
    if (d % 25 === 0 && s.finance.treasury > 800) {
      for (const bid of ['bank', 'inn', 'market']) {
        const b = DL.DATA.buildingById(bid);
        if (DL.City.buildingLevel(s, bid) === 0 && DL.City.canBuild(s, b).ok) {
          DL.City.startBuild(s, bid);
          break;
        }
      }
      const homeCity = DL.DATA.cityById(s.homeCityId);
      if (homeCity.flags.indexOf('coastal') !== -1 && DL.City.buildingLevel(s, 'shipping') === 0) {
        const ship = DL.DATA.buildingById('shipping');
        if (DL.City.canBuild(s, ship).ok) DL.City.startBuild(s, 'shipping');
      }
    }
    // 外交：关系好且钱多时签通商
    if (d % 30 === 0 && s.finance.treasury > 800) {
      const others = DL.DATA.CITIES.filter(c => c.id !== s.homeCityId);
      const target = others[Math.floor(Math.random() * others.length)];
      if (DL.Diplo.canAction(s, target.id, 'trade') === null) DL.Diplo.doAction(s, target.id, 'trade');
    }
    // 偶尔买入一股最赚钱的公司，验证股份系统
    if (d % 50 === 0 && s.finance.treasury > 1500) {
      const top = Object.keys(s.companies).map(id => s.companies[id]).sort((a, b) => b.profit - a.profit)[0];
      if (top && top.price < s.finance.treasury) DL.Companies.buyShares(s, top.id, 1);
    }
    // 扩编商队
    if (d % 40 === 0 && s.finance.treasury > 1200 && s.fleet.units.length < DL.Caravans.fleetMax(s)) {
      DL.Caravans.recruitUnit(s);
    }
    // 探险队
    if (d % 30 === 0 && s.finance.treasury > 800 && s.expeditions.length < 2) {
      DL.Sites.sendExpedition(s);
    }
    DL.State.tick(s);
    if (s.pendingEvent) events++;
    if (s.ended) break;
  }
  return { s, sent, events };
}

for (const home of ['sunring', 'greenharbor', 'amberterraces', 'woolcliff', 'canglang', 'shaou']) {
  const { s, sent, events } = runGame(home, 3650);
  console.log(`\n[${DL.DATA.cityById(home).name}] 运行 ${s.day} 天，结局: ${s.ended ? s.ended.title : '无'}，商队 ${sent} 次，事件 ${events} 次`);
  console.log(`  金库 ${Math.round(s.finance.treasury)}G · 负债 ${Math.round(s.player.debt)}G · 年度贸易额 ${Math.round(s.player.tradeVolumeYear || 0)}G`);
  console.log(`  人口 ${Math.round(s.cities[home].pop)} · 繁荣 ${Math.round(s.cities[home].prosperity)} · 信用 ${Math.round(s.cities[home].credit)} · 满意度 ${Math.round(s.city.satisfaction || 70)} · 设施 ${Object.keys(s.city.buildings).length} · 商队 ${s.fleet.units.length}/${DL.Caravans.fleetMax(s)} · 名胜 ${Object.keys(s.sitesDiscovered || {}).length}/${DL.DATA.SITES.length}`);
}

// 纯挂机模式：验证十年期满触发平凡结局且不崩溃
{
  let s = DL.State.newGame('floralbasin');
  for (let d = 0; d < 3650; d++) DL.State.tick(s);
  console.log(`\n[挂机模式] 运行 ${s.day} 天，结局: ${s.ended ? s.ended.title : '无'}，金库 ${Math.round(s.finance.treasury)}G，人口 ${Math.round(s.cities.floralbasin.pop)}，满意度 ${Math.round(s.city.satisfaction || 70)}`);
}

// 自由经营模式：3650天后不应触发任何结局
{
  let s = DL.State.newGame('greenharbor', { noWin: true });
  for (let d = 0; d < 3650; d++) {
    if (d % 10 === 0 && s.finance.treasury > 150) {
      const dests = DL.DATA.CITIES.filter(c => c.id !== s.homeCityId)
        .map(c => ({ c, p: DL.Caravans.findPath(s, s.homeCityId, c.id) }))
        .filter(x => x.p);
      const unit = s.fleet.units.find(u => !DL.Caravans.leaderBusy(s, u.leaderId));
      if (dests.length && unit) {
        const good = DL.DATA.GOODS.filter(g => g.id !== 'pony')[Math.floor(Math.random() * (DL.DATA.GOODS.length - 1))];
        const qty = Math.max(1, Math.floor((s.player.wagonKg / good.weight) * 0.3));
        const res = DL.Market.buy(s, good.id, qty);
        if (res.ok && res.tier) {
          const cargo = {}; cargo[good.id] = {}; cargo[good.id][res.tier] = qty;
          DL.Caravans.send(s, dests[Math.floor(Math.random() * dests.length)].c.id, unit.leaderId, cargo, 'auto');
        }
      }
    }
    DL.State.tick(s);
  }
console.log(`\n[自由经营] 运行 ${s.day} 天，结局: ${s.ended ? s.ended.title : '无（沙盒正常）'}，金库 ${Math.round(s.finance.treasury)}G，满意度 ${Math.round(s.city.satisfaction || 70)}，零售收入 ${Math.round((s.retailLast || {}).revenue || 0)}G/天`);
}

// 难度档位校验
{
  const e = DL.State.newGame('sunring', { difficulty: 'easy' });
  const n = DL.State.newGame('sunring', { difficulty: 'normal' });
  const h = DL.State.newGame('sunring', { difficulty: 'hard' });
  const ok = e.finance.treasury === 1500 && e.player.debt === 5000 &&
    n.finance.treasury === 800 && n.player.debt === 10000 &&
    h.finance.treasury === 200 && h.player.debt === 15000 && h.player.dailyInterest === 1.0 &&
    e.player.dailyInterest === 0.3 && e.market.residentOfferMult === 0.92 && h.bandits.enabled;
console.log(`[难度] 三档初始资金/债务/日息校验: ${ok ? 'OK' : 'FAIL'}`);
}

// 求购公告校验
{
  const s2 = DL.State.newGame('sunring');
  const t0 = s2.finance.treasury;
  const r = DL.Market.publishDemand(s2, 'flour', 20, 15, 2);
  const ok1 = r.ok && s2.playerDemand.length === 1 && s2.playerDemand[0].tier === 2 && (t0 - s2.finance.treasury) === 10;
  const r2 = DL.Market.publishDemand(s2, 'flour', 10, 12, 1);
  const okDup = !r2.ok; // 重复商品应被拒绝
  const r3 = DL.Market.removeDemand(s2, s2.playerDemand[0].id);
  const ok2 = r3.ok && s2.playerDemand.length === 0;
  // 指定品质买入
  const wh0 = DL.Market.tierStock(s2.warehouse.flour)[2] || 0;
  const rb = DL.Market.buy(s2, 'flour', 2, 2);
  const ok3 = rb.ok && (DL.Market.tierStock(s2.warehouse.flour)[2] - wh0) === 2;
  console.log(`[求购/品质] 发布(定金+品质)/去重/撤下: ${ok1 && okDup && ok2 ? 'OK' : 'FAIL'} · 指定品质买入: ${ok3 ? 'OK' : 'FAIL'}`);
  // 讨价还价：低价求购时商队会抬价
  const s3 = DL.State.newGame('sunring');
  DL.Market.publishDemand(s3, 'flour', 20, 1, 1);
  const origRandom = Math.random;
  Math.random = function () { return 0.01; };
  DL.Market.spawnVisitor(s3);
  Math.random = origRandom;
  const vi = s3.market.visitors[0];
  const negotiated = vi && vi.stock.flour && vi.stock.flour[1] > 0 && vi.priceCap['flour_1'] > 1;
console.log(`[讨价还价] 低价求购被商队抬价: ${negotiated ? 'OK' : 'FAIL'}`);
}

// 竞争商会与成就校验
{
  const s4 = DL.State.newGame('sunring');
  const okInit = s4.rivals && s4.rivals.houses.length === 3 && DL.Rivals.playerRank(s4) >= 1 && DL.Rivals.playerRank(s4) <= 4;
  const res4 = DL.Market.buy(s4, 'book', 2);
  const cargo4 = { book: {} }; cargo4.book[res4.tier] = 2;
  DL.Caravans.send(s4, 'threesprings', s4.fleet.units[0].leaderId, cargo4, 'empty');
  DL.Achievements.check(s4);
  const okTrip = !!(s4.achievements.unlocked.a_first_trip);
  for (let d = 0; d < 60; d++) DL.State.tick(s4);
  const okDaily = s4.rivals.houses.some(function (h) { return h.trips > 0 || h.tradeVolume > 0; });
  const okRank = DL.Rivals.playerRank(s4) >= 1 && DL.Rivals.playerRank(s4) <= 4;
console.log(`[竞争商会/成就] 初始化: ${okInit ? 'OK' : 'FAIL'} · 首支商队成就: ${okTrip ? 'OK' : 'FAIL'} · 商会活动: ${okDaily ? 'OK' : 'FAIL'} · 排名: ${okRank ? 'OK' : 'FAIL'}`);
}

// 节日活动校验
{
  const s6 = DL.State.newGame('sunring');
  s6.day = 122; // 夏至光宴
  const acts = DL.Festivals.activities(s6);
  const okAct = acts.some(function (a) { return a.id === 'solstice_lantern'; });
  const sat0 = s6.city.satisfaction;
  const rLantern = DL.Festivals.run(s6, 'solstice_lantern');
  const okLantern = rLantern.ok && s6.city.satisfaction > sat0;
  const s7 = DL.State.newGame('sunring');
  DL.Market.buy(s7, 'flour', 5);
  s7.day = 266;
  s7.festivalForm = { goodId: 'flour', tier: 1, qty: 3, city: null };
  const rStall = DL.Festivals.run(s7, 'fair_stall');
  const okStall = rStall.ok && s7.fairStalls.length === 1;
  s7.day = 275;
  DL.Festivals.daily(s7);
  const okSettle = s7.fairStalls.length === 0;
console.log(`[节日活动] 夏至放河灯: ${okAct && okLantern ? 'OK' : 'FAIL'} · 金秋大集摆摊/结算: ${okStall && okSettle ? 'OK' : 'FAIL'}`);
}

// 旅途事件 / 海盗 / 冒险者养成校验
{
  const s8 = DL.State.newGame('sunring');
  const seaRoutes = DL.DATA.ROUTES.filter(function (r) { return r.type === 'water'; });
  const okPirateInit = seaRoutes.length > 0 && seaRoutes.every(function (r) { return s8.pirates.routes[r.id]; });
  const seaR = seaRoutes[0];
  s8.pirates.routes[seaR.id].danger = 100;
  const rClear = DL.Travel.clearPirates(s8, seaR.id);
  const okPirateClear = rClear.ok && s8.pirates.routes[seaR.id].danger === 0;
  // 旅途事件触发与自动处理
  const s9 = DL.State.newGame('sunring');
  const origR9 = Math.random;
  Math.random = function () { return 0.01; };
  DL.Travel.tryRoadEvent(s9, { id: 1 });
  Math.random = origR9;
  const okRoadTrigger = !!s9.pendingRoadEvent;
  s9.pendingRoadEvent.day = s9.day - 3;
  DL.Travel.roadDaily(s9);
  const okRoadAuto = !s9.pendingRoadEvent;
  // 冒险者升级与委托
  const sA = DL.State.newGame('sunring');
  const adv = DL.DATA.adventurersFor('sunring')[0];
  DL.Adventurers.grantXP(sA, adv.id, 2);
  DL.Adventurers.grantXP(sA, adv.id, 2);
  const okLevel = DL.Adventurers.levelOf(sA, adv.id) >= 2;
  sA.guild.missions = { guardTrips: 2, cleared: 1, discovered: 0 };
  sA.guild.missionDay = sA.day;
  DL.Adventurers.checkMissions(sA);
  const okMission = (sA.adventurers[adv.id] || {}).xp >= 5 && sA.guild.missions.guardTrips === 0;
console.log(`[旅途/海盗/冒险者] 海盗初始化与清剿: ${okPirateInit && okPirateClear ? 'OK' : 'FAIL'} · 路遇事件触发/自动处理: ${okRoadTrigger && okRoadAuto ? 'OK' : 'FAIL'} · 升级与委托: ${okLevel && okMission ? 'OK' : 'FAIL'}`);
}

// 生产系统校验
{
  const sP = DL.State.newGame('sunring');
  sP.city.buildings.workshop = { level: 1 };
  DL.Production.ensureSlots(sP);
  DL.Market.buy(sP, 'flour', 6);
  const okSlots = sP.workshops.length === 1;
  const rChg = DL.Production.changeRecipe(sP, sP.workshops[0].id, 'r_brew');
  DL.Production.daily(sP);
  const okBatch = rChg.ok && DL.Market.tierStock(sP.warehouse.flour)[1] === 3;
  DL.Production.daily(sP);
  const okOutput = DL.Market.tierStock(sP.warehouse.ale)[1] === 2;
  const rPause = DL.Production.togglePause(sP, sP.workshops[0].id);
  const okPause = rPause.ok && sP.workshops[0].paused;
console.log(`[生产] 工坊槽位: ${okSlots ? 'OK' : 'FAIL'} · 原料消耗: ${okBatch ? 'OK' : 'FAIL'} · 成品产出: ${okOutput ? 'OK' : 'FAIL'} · 暂停: ${okPause ? 'OK' : 'FAIL'}`);
  const sP2 = DL.State.newGame('sunring');
  sP2.city.buildings.workshop = { level: 1 };
  DL.Production.ensureSlots(sP2);
  sP2.warehouse.flour = { 1: 0, 2: 5, 3: 0 };
  DL.Production.setInputTier(sP2, sP2.workshops[0].id, 2);
  DL.Production.changeRecipe(sP2, sP2.workshops[0].id, 'r_brew');
  DL.Production.daily(sP2);
  DL.Production.daily(sP2);
  const okTier = DL.Market.tierStock(sP2.warehouse.ale)[2] === 2;
console.log(`[生产品质] 精良原料→精良成品: ${okTier ? 'OK' : 'FAIL'}`);

// 工坊窖藏葡萄酒：普通水果+蜂蜜 产出至少精良
{
  const sW3 = DL.State.newGame('sunring');
  sW3.city.buildings.workshop = { level: 1 };
  DL.Production.ensureSlots(sW3);
  sW3.warehouse.rawfruit = { 1: 5, 2: 0, 3: 0 };
  sW3.warehouse.honey = { 1: 5, 2: 0, 3: 0 };
  DL.Production.changeRecipe(sW3, sW3.workshops[0].id, 'r_wine');
  DL.Production.daily(sW3);
  DL.Production.daily(sW3);
  DL.Production.daily(sW3);
  const okWineTier = DL.Market.tierStock(sW3.warehouse.wine)[2] === 1;
  console.log(`[工坊葡萄酒] 普通原料→至少精良: ${okWineTier ? 'OK' : 'FAIL'}`);
}
}

// 产业链校验：精酿啤酒/葡萄酒坊/织造坊 + 酒馆
{
  const sI = DL.State.newGame('sunring');
  sI.warehouse.flour = { 1: 10, 2: 0, 3: 0 };
  sI.warehouse.rawfruit = { 1: 10, 2: 0, 3: 0 };
  sI.warehouse.wool = { 1: 10, 2: 0, 3: 0 };
  sI.city.buildings.brewery = { level: 1 };
  sI.city.buildings.winery = { level: 1 };
  sI.city.buildings.weavery = { level: 1 };
  DL.Production.fixedDaily(sI);
  const okProduce = DL.Market.tierStock(sI.warehouse.craftbeer)[1] === 1 &&
    DL.Market.tierStock(sI.warehouse.wine)[2] === 1 &&
    DL.Market.tierStock(sI.warehouse.clothing)[1] === 1;
  sI.warehouse.craftbeer = { 1: 5, 2: 1, 3: 0 };
  sI.warehouse.wine = { 1: 5, 2: 0, 3: 0 };
  sI.city.buildings.pub = { level: 1 };
  const inc0 = sI.dayIncome;
  DL.Production.shopDaily(sI, 'pub', ['craftbeer', 'wine'], 1.10);
  const okPub = sI.dayIncome > inc0;
  sI.warehouse.wine = { 1: 0, 2: 0, 3: 0 };
  const inc1 = sI.dayIncome;
  DL.Production.shopDaily(sI, 'pub', ['craftbeer', 'wine'], 1.10);
  const okNoPub = sI.dayIncome === inc1;
  const pubB = DL.DATA.buildingById('pub');
  const sP3 = DL.State.newGame('sunring');
  sP3.finance.treasury = 2000;
  const okPre = !DL.City.canBuild(sP3, pubB).ok;
  sP3.city.buildings.brewery = { level: 1 };
  const okPre2 = DL.City.canBuild(sP3, pubB).ok;
console.log(`[产业链] 生产建筑产精良货: ${okProduce ? 'OK' : 'FAIL'} · 酒馆营业/缺货停业: ${okPub && okNoPub ? 'OK' : 'FAIL'} · 酒馆前置: ${okPre && okPre2 ? 'OK' : 'FAIL'}`);
}

// 仓库升级校验
{
  const sW = DL.State.newGame('sunring');
  sW.finance.treasury = 6000;
  const c0 = DL.Market.warehouseCap(sW);
  const rW = DL.Market.upgradeWarehouse(sW);
  const okUp = rW.ok && DL.Market.warehouseCap(sW) === c0 + 500 && sW.player.warehouseLv === 1;
  for (let i = 0; i < 5; i++) DL.Market.upgradeWarehouse(sW);
  const okMax = sW.player.warehouseLv === 5 && !DL.Market.upgradeWarehouse(sW).ok;
  console.log(`[仓库] 升级扩容: ${okUp ? 'OK' : 'FAIL'} · 等级上限: ${okMax ? 'OK' : 'FAIL'}`);
}

// 价格下限校验：满库存时稀有面粉不应崩盘
{
  const sM = DL.State.newGame('wheatseat');
  sM.cities.wheatseat.market.flour = { 1: 200, 2: 100, 3: 100 };
  DL.Market.recalc(sM);
  const p = DL.Market.tieredPrice(sM, 'wheatseat', 'flour', 'buy', 3);
  const okP = p > 5;
  console.log(`[价格下限] 满库存稀有面粉 ${p.toFixed(1)}G: ${okP ? 'OK' : 'FAIL'}`);
}

// 采购大单目的地校验（不能是己方城市，货物需为外城所需）
{
  const sQ = DL.State.newGame('sunring');
  const ev = DL.Events.POOL.find(function (e) { return e.id === 'lord_order'; });
  ev.choices[0].run(sQ);
  const q = sQ.quest;
  const okQ = q && q.destCityId !== 'sunring' &&
    DL.DATA.goodById(q.goodId).origin !== DL.DATA.cityById(q.destCityId).nation && q.reward > 100;
  const sQ2 = DL.State.newGame('wheatseat');
  ev.choices[0].run(sQ2);
  const okQ2 = sQ2.quest && sQ2.quest.destCityId !== 'wheatseat';
  console.log(`[采购大单] 目的地非本城/货物为外城所需: ${okQ && okQ2 ? 'OK' : 'FAIL'}`);
}

// 自动外销与压制校验
{
  const sX = DL.State.newGame('wheatseat');
  sX.cities.wheatseat.market.flour = { 1: 200, 2: 100, 3: 100 };
  DL.Market.autoExport(sX);
  const okExport = DL.Market.totalStock(sX.cities.wheatseat.market.flour) < 400;
  sX.market.suppressResidentSales = true;
  const before = DL.Market.totalStock(sX.cities.wheatseat.market.flour);
  DL.Market.autoExport(sX);
  const okSuppress = DL.Market.totalStock(sX.cities.wheatseat.market.flour) === before;
  console.log(`[自动外销] 过剩自动外销: ${okExport ? 'OK' : 'FAIL'} · 压制后不外销: ${okSuppress ? 'OK' : 'FAIL'}`);
}

// 外地商队价格与出售公告校验
{
  const sV = DL.State.newGame('sunring');
  const vi = { cityId: 'wheatseat', priceMult: 1.05, stock: { flour: { 1: 10 } }, wants: {} };
  sV.market.visitors.push(vi);
  const vPrice = DL.Market.visitorOfferPrice(sV, vi, 'flour', 1);
  const rPrice = DL.Market.residentOfferPrice(sV, 'flour', 1);
  const okCheap = vPrice < rPrice;
  const sA2 = DL.State.newGame('sunring');
  sA2.warehouse.flour = { 1: 10, 2: 0, 3: 0 };
  const t0 = sA2.finance.treasury;
  const rAd = DL.Market.publishSaleAd(sA2, 'flour', 6, 15);
  const okAd = rAd.ok && sA2.saleAds.length === 1 && (t0 - sA2.finance.treasury) === 20;
  const origR = Math.random;
  Math.random = function () { return 0.01; };
  DL.Market.spawnVisitor(sA2);
  Math.random = origR;
  const vi2 = sA2.market.visitors[0];
  const okWant = vi2 && vi2.wants.flour && vi2.wants.flour.price === 15;
  const sA3 = DL.State.newGame('sunring');
  sA3.finance.treasury = 2000;
  sA3.warehouse.flour = { 1: 5, 2: 0, 3: 0 };
  DL.Market.publishSaleAd(sA3, 'flour', 6, 9999);
  const origR2 = Math.random;
  Math.random = function () { return 0.01; };
  DL.Market.spawnVisitor(sA3);
  Math.random = origR2;
  const okNoBuy = !sA3.market.visitors[0].wants.flour;
  console.log(`[商队价格/出售公告] 外地货比本地便宜: ${okCheap ? 'OK' : 'FAIL'} · 广告发布: ${okAd ? 'OK' : 'FAIL'} · 商队按报价采购: ${okWant ? 'OK' : 'FAIL'} · 高价无人问津: ${okNoBuy ? 'OK' : 'FAIL'}`);
}

// 生产修复：弹性原料 + 状态提示
{
  const sF = DL.State.newGame('sunring');
  sF.city.buildings.brewery = { level: 1 };
  sF.city.buildings.winery = { level: 1 };
  sF.warehouse.flour = { 1: 0, 2: 5, 3: 0 };
  sF.warehouse.rawfruit = { 1: 5, 2: 0, 3: 0 };
  DL.Production.fixedDaily(sF);
  const okBeer = DL.Market.tierStock(sF.warehouse.craftbeer)[2] === 1;
  const okWine = DL.Market.tierStock(sF.warehouse.wine)[2] === 1;
  const okStatus = (sF.productionStatus || {}).brewery && (sF.productionStatus || {}).winery;
  const sG = DL.State.newGame('sunring');
  sG.city.buildings.bakery = { level: 1 };
  sG.warehouse.flour = { 1: 0, 2: 0, 3: 0 };
  DL.Production.fixedDaily(sG);
  const noMat = (sG.productionStatus || {}).bakery || '';
  const okNoMat = noMat.indexOf('\u7f3a\u539f\u6599') !== -1; // 缺原料
console.log(`[生产修复] 精良面粉→精良啤酒: ${okBeer ? 'OK' : 'FAIL'} · 葡萄酒至少精良: ${okWine ? 'OK' : 'FAIL'} · 状态提示: ${okStatus && okNoMat ? 'OK' : 'FAIL'}`);
}

// 价格历史校验
{
  const sH = DL.State.newGame('sunring');
  DL.State.tick(sH);
  const arr = DL.Market.priceSeries(sH, 'sunring', 'flour');
  const okHist = Array.isArray(arr) && arr.length >= 1 && arr[arr.length - 1].day === sH.day;
  console.log(`[价格历史] 每日记录并可查询: ${okHist ? 'OK' : 'FAIL'}`);
}

// 路边交易校验：手动成交 + 过期自动成交
{
  const sR = DL.State.newGame('sunring');
  const p = DL.Caravans.findPath(sR, 'sunring', 'wheatseat');
  const cv = {
    id: 999, leaderId: sR.fleet.units[0].leaderId, destCityId: 'wheatseat',
    legs: p.legs.map(l => ({ from: l.from, to: l.to, routeId: l.routeId, days: l.days })),
    legIdx: 0, progress: 0, state: 'outbound',
    cargo: { flour: { 1: 20 } }, cash: 0, done: false
  };
  sR.caravans.push(cv);
  sR.roadStops.push({ id: 1, cvId: 999, cityId: 'wheatseat', goodId: 'flour', tier: 1, qty: 5, price: 20, daysLeft: 1 });
  DL.Caravans.resolveRoadStop(sR, 1, 'sell');
  const okSell = cv.cash === 100 && cv.cargo.flour[1] === 15;
  sR.roadStops.push({ id: 2, cvId: 999, cityId: 'wheatseat', goodId: 'flour', tier: 1, qty: 5, price: 20, daysLeft: 1 });
  sR.day = 2;
  const origR2 = Math.random;
  Math.random = function () { return 0.5; };
  DL.Caravans.tick(sR);
  Math.random = origR2;
  const okAuto = sR.roadStops.length === 0 && cv.cash === 200;
  console.log(`[路边交易] 手动成交/过期自动: ${okSell && okAuto ? 'OK' : 'FAIL'}`);
}

// 多步事件链校验：启动→接单→发展→结算
{
  const sC = DL.State.newGame('sunring');
  sC.eventChains.famine = { stage: 0, nextDay: sC.day, pending: false, data: {} };
  DL.Events.chainTick(sC);
  const okStart = sC.pendingEvent && sC.pendingEvent.chainId === 'famine' && sC.pendingEvent.choices.length === 2;
  sC.pendingEvent.choices[0].run(sC);
  const okAccept = !!sC.quest && sC.quest.goodId === 'flour' && sC.quest.destCityId === 'wheatseat';
  sC.eventChains.famine.nextDay = sC.day;
  sC.pendingEvent = null;
  DL.Events.chainTick(sC);
  const okStage2 = sC.pendingEvent && sC.pendingEvent.stageIdx === 1;
  const t0 = sC.finance.treasury;
  sC.pendingEvent.choices[0].run(sC);
  const okReward = sC.finance.treasury === t0 + 600 && !sC.eventChains.famine;
  console.log(`[事件链] 启动/接单/发展/结算: ${okStart && okAccept && okStage2 && okReward ? 'OK' : 'FAIL'}`);
}

// 公司深化校验：收购 / 增发 / 董事会 / 股价
{
  const sD = DL.State.newGame('sunring');
  const co = sD.companies[Object.keys(sD.companies)[0]];
  co.owned = 51;
  const rTake = DL.Companies.takeover(sD, co.id);
  const okTake = rTake.ok && co.controlled && co.owned === co.total;
  co.owned = 40;
  co.controlled = false;
  co.total = 100;
  const rIssue = DL.Companies.issueShares(sD, co.id);
  const okIssue = rIssue.ok && co.total === 150 && co.boostUntil > sD.day;
  const rBoard = DL.Companies.boardVote(sD, co.id, 'div');
  const okBoard = rBoard.ok && co.policy === 'div' && co.policyUntil > sD.day;
  DL.Companies.daily(sD);
  const okPrice = co.price > 0 && co.priceHist.length >= 1;
  console.log(`[公司深化] 收购/增发/董事会/股价: ${okTake && okIssue && okBoard && okPrice ? 'OK' : 'FAIL'}`);
}

// 存档槽位校验：保存 / 读取 / 清空
{
  const sS = DL.State.newGame('sunring');
  DL.State.save(sS, 2);
  const meta = DL.State.slots();
  const okSlot = meta.length === 3 && meta[2].meta && meta[2].meta.homeCity === DL.DATA.cityById('sunring').name;
  const loaded = DL.State.load(2);
  const okLoad = loaded && loaded.saveSlot === 2 && loaded.day === sS.day;
  DL.State.clearSave(2);
  const okClear = !DL.State.slots()[2].meta;
  console.log(`[存档槽位] 保存/读取/清空: ${okSlot && okLoad && okClear ? 'OK' : 'FAIL'}`);
}

// 竞争商会经商校验：派商队 / 抢采购大单
{
  const sN = DL.State.newGame('sunring');
  sN.rivals.houses.forEach(function (h) { h.treasury = 3000; h.nextTripDay = 1; });
  for (let i = 0; i < 10; i++) DL.Rivals.daily(sN);
  const okTrip = sN.rivals.houses.some(function (h) { return h.trips > 0 || h.caravans.length > 0; });
  const sN2 = DL.State.newGame('sunring');
  sN2.quest = { goodId: 'flour', qty: 10, destCityId: 'canglang', daysLeft: 5, reward: 500 };
  const h0 = sN2.rivals.houses[0];
  h0.treasury = 5000;
  h0.nextTripDay = 1;
  const origR = Math.random;
  Math.random = function () { return 0.01; };
  DL.Rivals.daily(sN2);
  Math.random = origR;
  const okRace = h0.caravans.some(function (c) { return c.destCityId === 'canglang'; });
  // 让抢单商队立刻抵达目的地，验证订单被抢走
  const cv0 = h0.caravans.find(function (c) { return c.destCityId === 'canglang'; });
  let okSteal = false;
  if (cv0) {
    cv0.legIdx = cv0.legs.length - 1;
    cv0.progress = cv0.legs[cv0.legIdx].days;
    Math.random = function () { return 0.01; };
    DL.Rivals.daily(sN2);
    Math.random = origR;
    okSteal = sN2.quest === null;
  }
  console.log(`[竞争商会] 派商队/抢单/抢走订单: ${okTrip && okRace && okSteal ? 'OK' : 'FAIL'}`);
}

console.log('\n冒烟测试完成：无异常。');
