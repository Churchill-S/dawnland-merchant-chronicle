/* 平衡分析：多城市多局完整对局，统计结局/收入构成/贸易利润，辅助数值调整 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ctx = { console, Math, JSON, Date, Object, Array, parseInt, parseFloat, isNaN, isFinite, String, Number, RegExp };
ctx.globalThis = ctx;
vm.createContext(ctx);
for (const f of [
  'js/data.js', 'js/i18n.js', 'js/calendar.js', 'js/market.js', 'js/caravans.js', 'js/city.js',
  'js/diplomacy.js', 'js/events.js', 'js/state.js', 'js/companies.js', 'js/sites.js', 'js/rivals.js',
  'js/achievements.js', 'js/festivals.js', 'js/travel.js', 'js/adventurers.js', 'js/production.js'
]) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', f), 'utf8'), ctx, { filename: f });
}
const DL = ctx.DL;

function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function setSeed(seed) { Math.random = mulberry32(seed); }

function bestTrade(s) {
  if (s.finance.treasury < 200) return null;
  const home = s.homeCityId;
  const paths = {};
  DL.DATA.CITIES.forEach(function (c) {
    if (c.id !== home) paths[c.id] = DL.Caravans.findPath(s, home, c.id);
  });
  const goods = DL.DATA.GOODS.filter(function (g) {
    return g.id !== 'pony' && DL.Market.totalStock(s.cities[home].market[g.id]) >= 6;
  });
  let best = null;
  goods.forEach(function (g) {
    const tier = DL.Market.mainTier(s.cities[s.homeCityId].market[g.id]);
    const buy = DL.Market.residentOfferPrice(s, g.id, tier);
    let bestSell = buy, bestCity = null;
    DL.DATA.CITIES.forEach(function (c) {
      if (c.id === s.homeCityId) return;
      if (!paths[c.id]) return;
      const sell = s.prices[c.id][g.id].sell * DL.Market.qualityMult(tier);
      if (sell > bestSell) { bestSell = sell; bestCity = c.id; }
    });
    if (bestCity && bestSell - buy > 3) {
      const profit = (bestSell - buy) * (s.player.wagonKg / g.weight);
      if (!best || profit > best.profit) best = { g, tier, buy, bestSell, bestCity, profit };
    }
  });
  return best;
}

function policy(s) {
  // 建筑顺序
  const order = ['market', 'stage', 'inn', 'workshop', 'bank', 'guildhall', 'craft'];
  for (const bid of order) {
    if (DL.City.buildingLevel(s, bid) === 0 && s.finance.treasury > 600) {
      const b = DL.DATA.buildingById(bid);
      if (DL.City.canBuild(s, b).ok) { DL.City.startBuild(s, bid); break; }
    }
  }
  // 生产链：有面粉/水果/羊毛就建配套建筑与商店
  const chain = [
    ['flour', 'bakery'], ['flour', 'brewery'], ['rawfruit', 'winery'], ['wool', 'weavery']
  ];
  for (const c of chain) {
    const have = DL.Market.warehouseQty(s, c[0], 1) + DL.Market.warehouseQty(s, c[0], 2) + DL.Market.warehouseQty(s, c[0], 3);
    if (have >= 8 && DL.City.buildingLevel(s, c[1]) === 0 && s.finance.treasury > 700) {
      const b = DL.DATA.buildingById(c[1]);
      if (DL.City.canBuild(s, b).ok) { DL.City.startBuild(s, c[1]); break; }
    }
  }
  // 工坊配方
  if (DL.City.buildingLevel(s, 'workshop') > 0) {
    DL.Production.ensureSlots(s);
    s.workshops.forEach(function (slot) {
      const h = {
        flour: DL.Market.warehouseQty(s, 'flour', 1), rawfruit: DL.Market.warehouseQty(s, 'rawfruit', 1),
        wool: DL.Market.warehouseQty(s, 'wool', 1), honey: DL.Market.warehouseQty(s, 'honey', 1),
        timber: DL.Market.warehouseQty(s, 'timber', 1), oil: DL.Market.warehouseQty(s, 'oil', 1)
      };
      let r = null;
      if (h.flour >= 6) r = 'r_brew';
      else if (h.rawfruit >= 4) r = 'r_dry';
      else if (h.wool >= 4) r = 'r_canvas';
      else if (h.rawfruit >= 2 && h.honey >= 1) r = 'r_wine';
      if (r && slot.recipeId !== r) DL.Production.changeRecipe(s, slot.id, r);
    });
  }
  // 商队贸易
  const bt = bestTrade(s);
  if (bt) {
    const unit = s.fleet.units.find(function (u) { return !DL.Caravans.leaderBusy(s, u.leaderId); });
    if (unit) {
      const qty = Math.max(1, Math.min(
        Math.floor((s.player.wagonKg / bt.g.weight) * 0.6),
        Math.floor(DL.Market.totalStock(s.cities[s.homeCityId].market[bt.g.id]) * 0.7),
        Math.floor((s.finance.treasury - 100) / bt.buy)
      ));
      if (qty >= 1) {
        const res = DL.Market.buy(s, bt.g.id, qty, bt.tier);
        if (res.ok) {
          const cargo = {}; cargo[bt.g.id] = {}; cargo[bt.g.id][res.tier] = qty;
          const guard = s.guild.hired && Math.random() < 0.5 ? s.guild.hired : null;
          DL.Caravans.send(s, bt.bestCity, unit.leaderId, cargo, 'auto', guard);
        }
      }
    }
  }
}

function runGame(home, years, seed) {
  setSeed(seed);
  const s = DL.State.newGame(home);
  const acc = { income: {}, expense: {}, trade: 0, byYear: [] };
  let lastYear = 1;
  for (let d = 0; d < years * 365; d++) {
    if (d % 3 === 0) policy(s);
    DL.State.tick(s);
    Object.keys(s.dayBreak.income).forEach(function (k) { acc.income[k] = (acc.income[k] || 0) + s.dayBreak.income[k]; });
    Object.keys(s.dayBreak.expense).forEach(function (k) { acc.expense[k] = (acc.expense[k] || 0) + s.dayBreak.expense[k]; });
    acc.trade += s.dayTrade;
    const yr = Math.floor(s.day / 365) + 1;
    if (yr !== lastYear) {
      acc.byYear.push({ year: lastYear, treasury: Math.round(s.finance.treasury), debt: Math.round(s.player.debt), vol: Math.round(s.player.tradeVolume) });
      lastYear = yr;
    }
    if (s.ended) break;
  }
  return {
    s, acc,
    days: s.day,
    end: s.ended ? s.ended.type : null,
    treasury: Math.round(s.finance.treasury),
    debt: Math.round(s.player.debt),
    vol: Math.round(s.player.tradeVolume),
    trips: s.stats.trips,
    fleet: s.fleet.units.length + '/' + DL.Caravans.fleetMax(s),
    buildings: Object.keys(s.city.buildings).length,
    satisfaction: Math.round(s.city.satisfaction || 70),
    credit: Math.round(s.cities[home].credit)
  };
}

const CITIES = ['sunring', 'greenharbor', 'wheatseat', 'amberterraces', 'woolcliff', 'canglang', 'shaou'];
const SEEDS = [1];
const results = [];
for (const home of CITIES) {
  for (const seed of SEEDS) {
    const r = runGame(home, 10, seed * 1000 + CITIES.indexOf(home));
    results.push(Object.assign({ home, seed }, r));
    process.stdout.write('.'); // 进度
  }
}
process.stdout.write('\n');

console.log('== 对局结果（2 局 × 7 城，最长 10 年）==');
const endCount = {};
results.forEach(function (r) {
  const key = r.home + '#' + r.seed;
  const label = r.end || '进行中';
  endCount[label] = (endCount[label] || 0) + 1;
  console.log(`${key.padEnd(14)} ${String(r.days).padStart(4)}天  ${label.padEnd(12)} 金库 ${String(r.treasury).padStart(7)}  债 ${String(r.debt).padStart(6)}  贸 ${String(r.vol).padStart(7)}  商队 ${String(r.trips).padStart(3)}  船队 ${r.fleet}  设施 ${r.buildings}  满意 ${r.satisfaction}  信用 ${r.credit}`);
});
console.log('结局分布:', JSON.stringify(endCount));

// 深度遥测：日晷王城与金穗领各 3 年
function telemetry(home, years, seed) {
  setSeed(seed);
  const s = DL.State.newGame(home);
  const acc = { income: {}, expense: {} };
  for (let d = 0; d < years * 365; d++) {
    if (d % 3 === 0) policy(s);
    DL.State.tick(s);
    Object.keys(s.dayBreak.income).forEach(function (k) { acc.income[k] = (acc.income[k] || 0) + s.dayBreak.income[k]; });
    Object.keys(s.dayBreak.expense).forEach(function (k) { acc.expense[k] = (acc.expense[k] || 0) + s.dayBreak.expense[k]; });
    if (s.ended) break;
  }
  const totIn = Object.keys(acc.income).reduce(function (a, k) { return a + acc.income[k]; }, 0);
  const totEx = Object.keys(acc.expense).reduce(function (a, k) { return a + acc.expense[k]; }, 0);
  console.log(`\n[${DL.DATA.cityById(home).name}] ${years} 年遥测（seed ${seed}）`);
  console.log('  收入合计', Math.round(totIn), '金币：',
    Object.keys(acc.income).map(function (k) { return k + ' ' + Math.round(acc.income[k]); }).join(' · '));
  console.log('  支出合计', Math.round(totEx), '金币：',
    Object.keys(acc.expense).map(function (k) { return k + ' ' + Math.round(acc.expense[k]); }).join(' · '));
  const bt = bestTrade(s);
  console.log('  末局最佳套利：', bt ? (bt.g.name + ' 买' + bt.buy.toFixed(1) + ' 卖' + bt.bestSell.toFixed(1) + ' → ' + DL.DATA.cityById(bt.bestCity).name) : '无');
}
telemetry('sunring', 3, 1000);
telemetry('wheatseat', 3, 1000);

// 首日/首月价格快照（日晷王城）
setSeed(7);
const p0 = DL.State.newGame('sunring');
console.log('\n[日晷王城开局价格]');
DL.DATA.GOODS.forEach(function (g) {
  if (g.id === 'pony') return;
  const buy = DL.Market.residentOfferPrice(p0, g.id, 1);
  let bestSell = buy, bestCity = null;
  DL.DATA.CITIES.forEach(function (c) {
    if (c.id === 'sunring') return;
    const sell = p0.prices[c.id][g.id].sell;
    if (sell > bestSell) { bestSell = sell; bestCity = c.id; }
  });
  if (bestCity && bestSell - buy > 2) {
    console.log(`  ${g.name.padEnd(10)} 买${buy.toFixed(1)} 卖${bestSell.toFixed(1)} (+${(bestSell - buy).toFixed(1)}) → ${DL.DATA.cityById(bestCity).name}`);
  }
});

// 配方利润率参考（用 日晷王城 行情）
console.log('\n[生产配方利润率参考（日晷王城行情）]');
DL.DATA.RECIPES.forEach(function (r) {
  let cost = 0;
  Object.keys(r.input).forEach(function (gid) { cost += DL.Market.residentOfferPrice(p0, gid, 1) * r.input[gid]; });
  let outVal = 0;
  Object.keys(r.output).forEach(function (gid) { outVal += p0.prices.sunring[gid].sell * r.output[gid]; });
  console.log(`  ${r.name.padEnd(10)} 成本${cost.toFixed(1)} 产值${outVal.toFixed(1)} 毛利${(outVal - cost).toFixed(1)} / ${r.days}天`);
});
