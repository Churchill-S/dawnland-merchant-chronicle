/* 游戏状态：初始化、每日推进、胜利/失败判定、存档 */
(function (G) {
  'use strict';
  var DL = G.DL = G.DL || {};

  var SAVE_KEY = 'dawnlands_save_v1';
  var SLOT_KEYS = ['dawnlands_save_v1_s0', 'dawnlands_save_v1_s1', 'dawnlands_save_v1_s2'];

  function initCities() {
    var cities = {};
    DL.DATA.CITIES.forEach(function (c) {
      var st = {
        pop: c.init.pop,
        prosperity: c.init.prosperity,
        credit: c.init.credit,
        connectivity: c.init.connectivity,
        tourism: c.init.tourism,
        industry: { agri: c.init.industry.agri, craft: c.init.industry.craft, mining: c.init.industry.mining },
        market: {},
        foodShortage: 0
      };
      DL.DATA.GOODS.forEach(function (g) {
        var base = (c.nation === g.origin) ? DL.Market.stockCap(g.id) * 0.45 : DL.Market.stockCap(g.id) * 0.12;
        st.market[g.id] = {
          1: base * (0.8 + Math.random() * 0.4),
          2: base * 0.15 * (0.8 + Math.random() * 0.4),
          3: base * 0.03 * (0.8 + Math.random() * 0.4)
        };
      });
      cities[c.id] = st;
    });
    return cities;
  }

  function initDiplo(homeId) {
    var rel = {};
    DL.DATA.CITIES.forEach(function (c) {
      if (c.id === homeId) return;
      var home = DL.DATA.cityById(homeId);
      var d = DL.DATA.nationDistance(home.nation, c.nation);
      rel[c.id] = d === 0 ? 28 + Math.random() * 10 : (d === 1 ? 18 + Math.random() * 8 : 8 + Math.random() * 8);
    });
    return { relations: rel, treaties: [] };
  }

  function initRates() {
    var rates = {};
    Object.keys(DL.DATA.CURRENCIES).forEach(function (code) {
      rates[code] = DL.DATA.CURRENCIES[code].rate * (0.98 + Math.random() * 0.04);
    });
    return rates;
  }

  function newGame(homeCityId, opts) {
    opts = opts || {};
    var diffKey = opts.difficulty || 'normal';
    var dc = DL.DATA.DIFFICULTY[diffKey] || DL.DATA.DIFFICULTY.normal;
    var state = {
      version: 1,
      day: 1,
      homeCityId: homeCityId,
      player: {
        debt: dc.debt,
        dailyInterest: dc.interest,
        license: false,
        wagonKg: 250,
        speedLevel: 0,
        warehouseLv: 0,
        tradeVolume: 0
      },
      dayIncome: 0,
      dayExpense: 0,
      dayTrade: 0,
      dayBreak: { income: {}, expense: {} },
      warehouse: (function () {
        var w = {};
        DL.DATA.GOODS.forEach(function (g) { w[g.id] = { 1: 0, 2: 0, 3: 0 }; });
        return w;
      })(),
      finance: {
        treasury: dc.gold,
        taxRate: 0.10,
        currency: {},
        rates: initRates(),
        loans: [],
        bills: []
      },
      city: {
        alloc: { agri: 50, craft: 35, mining: 15 },
        buildings: {},
        construction: [],
        tech: {},
        satisfaction: 70
      },
      retail: { auto: true, prices: {} },
      market: {
        visitors: [],
        visitorSeq: 1,
        unmetDemand: {},
        orders: {},
        bulletin: {},
        intelCities: {},
        nextVisitorDay: 2,
        nextOrdersDay: 7,
        nextIntelDay: 5,
        residentOfferMult: dc.residentMult,
        autoRetail: true,
        suppressResidentSales: false
      },
      shipping: { seaUses: [], last: null },
      playerDemand: [],
      demandSeq: 1,
      saleAds: [],
      saleSeq: 1,
      playerDemandHistory: 0,
      banditsCleared: 0,
      festivalActs: {},
      fairStalls: [],
      lastFestival: null,
      festivalForm: { goodId: 'flour', tier: 1, qty: 1, city: null },
      workshops: [],
      guild: { hired: null },
      sites: {},
      fleet: (function () {
        var units = [];
        DL.DATA.leadersFor(homeCityId).forEach(function (l) {
          units.push({ id: units.length + 1, leaderId: l.id, hiredDay: 0 });
        });
        return { units: units, usedRecruits: [], seq: units.length + 1 };
      })(),
      bandits: {
        enabled: opts.bandits !== false,
        routes: {}
      },
      flags: { noWin: !!opts.noWin, difficulty: diffKey },
      cities: initCities(),
      diplo: initDiplo(homeCityId),
      caravans: [],
      caravanSeq: 1,
      quest: null,
      weather: {},
      routeClosed: {},
      prices: {},
      priceHist: {},
      roadStops: [],
      pendingStop: null,
      eventChains: {},
      log: [],
      eventCooldown: 0,
      pendingEvent: null,
      ended: null,
      wins: [],
      hegemonicDays: 0,
      tradeRolling: [],
      saveSlot: 0,
      stats: {
        trips: 0, buildingsBuilt: 0, treatiesSigned: 0, maxProsperity: 0,
        incomeBy: {}, expenseBy: {}, bestDayIncome: 0, eventsSeen: 0,
        bestTrade: null
      },
      tutorial: { done: [false, false, false] },
      notices: []
    };
    Object.keys(DL.DATA.CURRENCIES).forEach(function (code) { state.finance.currency[code] = 0; });
    DL.DATA.ROUTES.forEach(function (r) {
      var base = Math.round((r.type === 'water' ? 8 + Math.random() * 18 : 25 + Math.random() * 40) * dc.banditMult);
      state.bandits.routes[r.id] = { base: base, danger: base, clearedUntil: 0 };
    });
    DL.Companies.initCompanies(state);
    DL.Sites.ensure(state);
    DL.Rivals.initRivals(state);
    DL.Achievements.init(state);
    DL.Travel.initTravel(state);
    DL.Adventurers.init(state);
    DL.Production.init(state);
    log(state, '商会于 ' + DL.DATA.cityById(homeCityId).name + ' 成立。身负 10000G 债务，怀揣 500G 启动金，十年之约，自此而始。');
    if (state.bandits.enabled) {
      log(state, '大陆上有强盗出没，商队出行可到冒险者公会聘请护卫或剿灭匪巢。');
    }
    DL.Market.recalc(state);
    DL.Market.recordHistory(state);
    DL.Market.initRetailPrices(state);
    DL.Market.revealIntel(state, DL.DATA.CITIES.filter(function (c) { return c.id !== state.homeCityId; })[0].id);
    if (state.flags.noWin) {
      log(state, '当前为自由经营模式：不启用胜利条件与十年期限。');
    }
    return state;
  }

  function ensureDefaults(st) {
    if (!st || typeof st !== 'object') return st;
    st.flags = st.flags || {};
    st.flags.noWin = !!st.flags.noWin;
    st.flags.difficulty = st.flags.difficulty || 'normal';
    if (st.player.dailyInterest == null) {
      var dc0 = DL.DATA.DIFFICULTY[st.flags.difficulty] || DL.DATA.DIFFICULTY.normal;
      st.player.dailyInterest = dc0.interest;
    }
    st.retail = st.retail || { auto: true, prices: {} };
    if (!st.retail.prices || typeof st.retail.prices !== 'object') st.retail.prices = {};
    st.market = st.market || {};
    if (!Array.isArray(st.market.visitors)) st.market.visitors = [];
    if (st.market.visitorSeq == null) st.market.visitorSeq = 1;
    st.market.unmetDemand = st.market.unmetDemand || {};
    st.market.orders = st.market.orders || {};
    st.market.bulletin = st.market.bulletin || {};
    st.market.intelCities = st.market.intelCities || {};
    if (st.market.nextVisitorDay == null) st.market.nextVisitorDay = 2;
    if (st.market.nextOrdersDay == null) st.market.nextOrdersDay = 7;
    if (st.market.nextIntelDay == null) st.market.nextIntelDay = 5;
    if (st.market.residentOfferMult == null) st.market.residentOfferMult = 0.90;
    if (st.market.autoRetail == null) st.market.autoRetail = true;
    if (st.market.suppressResidentSales == null) st.market.suppressResidentSales = false;
    st.shipping = st.shipping || {};
    if (!Array.isArray(st.shipping.seaUses)) st.shipping.seaUses = [];
    if (st.shipping.last == null) st.shipping.last = null;
    if (!Array.isArray(st.playerDemand)) st.playerDemand = [];
    if (st.demandSeq == null) st.demandSeq = 1;
    if (!Array.isArray(st.saleAds)) st.saleAds = [];
    if (st.saleSeq == null) st.saleSeq = 1;
    if (st.playerDemandHistory == null) st.playerDemandHistory = 0;
    if (st.banditsCleared == null) st.banditsCleared = 0;
    if (!st.festivalActs || typeof st.festivalActs !== 'object') st.festivalActs = {};
    if (!Array.isArray(st.fairStalls)) st.fairStalls = [];
    if (st.lastFestival == null) st.lastFestival = null;
    st.festivalForm = st.festivalForm || { goodId: 'flour', tier: 1, qty: 1, city: null };
    st.guild = st.guild || { hired: null };
    if (st.player.speedLevel == null) st.player.speedLevel = 0;
    if (st.player.warehouseLv == null) st.player.warehouseLv = 0;
    if (st.player.wagonKg == null) st.player.wagonKg = 250;
    st.roadStops = st.roadStops || [];
    st.pendingStop = st.pendingStop || null;
    st.eventChains = st.eventChains || {};
    st.chainHistory = st.chainHistory || {};
    if (st.saveSlot == null) st.saveSlot = 0;
    if (!st.stats) st.stats = {};
    if (!st.stats.incomeBy) st.stats.incomeBy = {};
    if (!st.stats.expenseBy) st.stats.expenseBy = {};
    if (st.stats.bestDayIncome == null) st.stats.bestDayIncome = 0;
    if (st.stats.eventsSeen == null) st.stats.eventsSeen = 0;
    if (st.stats.bestTrade == null) st.stats.bestTrade = null;
    st.sites = st.sites || {};
    st.dayBreak = st.dayBreak || { income: {}, expense: {} };
    if (st.player.speedLevel == null) st.player.speedLevel = 0;
    DL.Sites.ensure(st);
    if (!st.fleet || !Array.isArray(st.fleet.units) || st.fleet.units.length === 0) {
      var units = [];
      DL.DATA.leadersFor(st.homeCityId).forEach(function (l) {
        units.push({ id: units.length + 1, leaderId: l.id, hiredDay: 0 });
      });
      st.fleet = { units: units, usedRecruits: [], seq: units.length + 1 };
    }
    if (!Array.isArray(st.fleet.usedRecruits)) st.fleet.usedRecruits = [];
    if (st.fleet.seq == null) st.fleet.seq = st.fleet.units.length + 1;
    st.bandits = st.bandits || { enabled: true, routes: {} };
    if (st.bandits.enabled == null) st.bandits.enabled = true;
    st.bandits.routes = st.bandits.routes || {};
    DL.DATA.ROUTES.forEach(function (r) {
      if (!st.bandits.routes[r.id]) {
        var base = Math.round((r.type === 'water' ? 8 + Math.random() * 18 : 25 + Math.random() * 40));
        st.bandits.routes[r.id] = { base: base, danger: base, clearedUntil: 0 };
      } else {
        if (st.bandits.routes[r.id].base == null) st.bandits.routes[r.id].base = st.bandits.routes[r.id].danger || 30;
        if (st.bandits.routes[r.id].clearedUntil == null) st.bandits.routes[r.id].clearedUntil = 0;
      }
    });
    DL.Companies.initCompanies(st);
    DL.Rivals.initRivals(st);
    if (st.rivals && st.rivals.houses) {
      st.rivals.houses.forEach(function (h) {
        if (!h.warehouse) h.warehouse = {};
      });
    }
    DL.Achievements.init(st);
    DL.Travel.initTravel(st);
    DL.Adventurers.init(st);
    DL.Production.init(st);
    if (!st.city) st.city = {};
    if (st.city.satisfaction == null) st.city.satisfaction = 70;
    // 迁移：市场库存/仓库由单一数字改为品质分档
    DL.DATA.CITIES.forEach(function (c) {
      var citySt = st.cities && st.cities[c.id];
      if (!citySt || !citySt.market) return;
      DL.DATA.GOODS.forEach(function (g) {
        var cur = citySt.market[g.id];
        if (typeof cur === 'number') {
          citySt.market[g.id] = { 1: cur, 2: 0, 3: 0 };
        } else if (cur && typeof cur === 'object') {
          citySt.market[g.id] = DL.Market.tierStock(cur);
        } else {
          citySt.market[g.id] = { 1: 0, 2: 0, 3: 0 };
        }
      });
    });
    if (st.warehouse && typeof st.warehouse === 'object') {
      DL.DATA.GOODS.forEach(function (g) {
        var cur = st.warehouse[g.id];
        if (typeof cur === 'number') st.warehouse[g.id] = { 1: cur, 2: 0, 3: 0 };
        else if (cur && typeof cur === 'object') st.warehouse[g.id] = DL.Market.tierStock(cur);
        else st.warehouse[g.id] = { 1: 0, 2: 0, 3: 0 };
      });
    } else {
      st.warehouse = {};
      DL.DATA.GOODS.forEach(function (g) { st.warehouse[g.id] = { 1: 0, 2: 0, 3: 0 }; });
    }
    // 迁移：旧在途商队（负责人可能已从通用名册移除，货物为单一数量格式）
    if (Array.isArray(st.caravans)) {
      var roster = DL.DATA.leadersFor(st.homeCityId);
      st.caravans.forEach(function (cv) {
        if (!DL.DATA.leaderById(cv.leaderId) && roster.length) cv.leaderId = roster[0].id;
        if (cv.cargo && typeof cv.cargo === 'object') {
          DL.DATA.GOODS.forEach(function (g) {
            var v = cv.cargo[g.id];
            if (typeof v === 'number') {
              cv.cargo[g.id] = v > 0 ? { 1: v } : {};
            } else if (v && typeof v === 'object') {
              cv.cargo[g.id] = DL.Market.tierStock(v);
            }
          });
        }
      });
    }
    if (!st.prices || !st.prices[st.homeCityId]) DL.Market.recalc(st);
    DL.Market.ensureHistory(st);
    DL.Market.initRetailPrices(st);
    st.sandbox = false;
    return st;
  }

  function log(state, text) {
    state.log.push({ day: state.day, text: text });
    if (state.log.length > 300) state.log.splice(0, state.log.length - 300);
  }

  function tutorialComplete(state, idx) {
    if (state.tutorial.done[idx]) return;
    state.tutorial.done[idx] = true;
    var rewards = [
      { g: 30, msg: '任务完成：了解市场行情，获得 30G 情报奖金。' },
      { g: 80, msg: '任务完成：派出第一支商队，获得 80G 商路津贴。' },
      { g: 50, msg: '任务完成：动工建造，获得 50G 资助与繁荣+1。' }
    ];
    var r = rewards[idx];
    state.finance.treasury += r.g;
    if (idx === 2) state.cities[state.homeCityId].prosperity = Math.min(100, state.cities[state.homeCityId].prosperity + 1);
    log(state, r.msg);
  }

  function tick(state) {
    if (state.ended && !state.sandbox) return;
    state.day++;
    state.dayIncome = 0;
    state.dayExpense = 0;
    state.dayTrade = 0;
    state.dayBreak = { income: {}, expense: {} };
    state.pendingEvent = null;
    state.pendingStop = null;

    var info = DL.Calendar.info(state.day);

    // 节日播报
    var f = DL.Calendar.festivalAt(state.day);
    if (f && state.day > 1) {
      log(state, '今日节日「' + f.name + '」：' + f.desc);
      state.notices.push('节日「' + f.name + '」：' + f.desc);
    }

    DL.Market.refreshDaily(state);
    DL.City.daily(state);
    DL.Companies.daily(state);
    DL.Sites.daily(state);
    DL.Caravans.tick(state);
    DL.Diplo.daily(state);
    DL.Market.tickVisitors(state);
    DL.Sites.tickExpeditions(state);
    DL.Rivals.daily(state);
    DL.Achievements.check(state);
    DL.Festivals.daily(state);
    DL.Travel.roadDaily(state);
    DL.Adventurers.checkMissions(state);
    DL.Production.daily(state);
    // 求购公告过期
    if (state.playerDemand.length) {
      var before = state.playerDemand.length;
      state.playerDemand = state.playerDemand.filter(function (e) { return e.until > state.day; });
      if (state.playerDemand.length < before) log(state, '部分求购公告已到期撤下。');
    }
    if (state.saleAds.length) {
      var sb = state.saleAds.length;
      state.saleAds = state.saleAds.filter(function (e) { return e.until > state.day; });
      if (state.saleAds.length < sb) log(state, '部分出售公告已到期撤下。');
    }
    DL.Market.expireOrders(state);
    if (state.market.nextOrdersDay <= state.day) DL.Market.ordersTick(state);
    if (state.market.nextIntelDay <= state.day) DL.Market.refreshIntel(state);
    // 强盗：清除期结束恢复危险度，其余缓慢回升
    if (state.bandits.enabled) {
      DL.DATA.ROUTES.forEach(function (r) {
        var br = state.bandits.routes[r.id];
        if (!br) return;
        if (br.clearedUntil > 0) {
          if (state.day >= br.clearedUntil) {
            br.danger = br.base;
            br.clearedUntil = 0;
          }
        } else {
          br.danger = Math.min(br.base, br.danger + Math.max(0.05, (br.base - br.danger) * 0.02));
        }
      });
    }

    // 财政：债务利息
    var interest = (state.player.dailyInterest != null) ? state.player.dailyInterest : DL.DATA.DEBT_DAILY_INTEREST;
    state.finance.loans.forEach(function (l) {
      interest += l.amount * l.rate / 365;
    });
    state.player.debt += interest;
    state.dayExpense += interest;
    state.finance.treasury -= interest;
    state.dayBreak.expense.interest = interest;

    // 商队维护费（仅在途商队收费，闲置免费）
    var fleetMaint = DL.Caravans.unitMaintenance(state) * state.caravans.length;
    state.dayExpense += fleetMaint;
    state.finance.treasury -= fleetMaint;
    state.dayBreak.expense.fleet = fleetMaint;

    // 汇票到期
    state.finance.bills = state.finance.bills.filter(function (b) {
      if (b.dueDay <= state.day) {
        state.player.debt += b.amount;
        state.cities[state.homeCityId].credit = Math.max(0, state.cities[state.homeCityId].credit - b.penalty);
        log(state, '汇票到期，计入债务 ' + b.amount + 'G，信用-' + b.penalty + '。');
        return false;
      }
      return true;
    });

    // 汇率季度微调
    if (info.dayOfYear % 30 === 0) {
      var codes = Object.keys(state.finance.rates);
      var code = codes[Math.floor(Math.random() * codes.length)];
      var drift = 1 + (Math.random() * 0.06 - 0.03);
      state.finance.rates[code] *= drift;
    }

    // 采购大单倒计时
    if (state.quest) {
      state.quest.daysLeft--;
      if (state.quest.daysLeft <= 0) {
        DL.Diplo.changeRelation(state, state.quest.destCityId, -1);
        log(state, '领主采购大单已过期，对方好感-1。');
        state.quest = null;
      }
    }

    // 滚动年度贸易额
    state.tradeRolling.push({ day: state.day, amount: state.dayTrade });
    while (state.tradeRolling.length && state.tradeRolling[0].day <= state.day - 360) state.tradeRolling.shift();
    var vol = 0;
    state.tradeRolling.forEach(function (t) { vol += t.amount; });
    state.player.tradeVolumeYear = vol;

    // 霸主条件累计
    var hasBank = DL.City.buildingLevel(state, 'bank') > 0;
    var homeCredit = state.cities[state.homeCityId].credit;
    var highest = true;
    DL.DATA.CITIES.forEach(function (c) {
      if (state.cities[c.id].credit > homeCredit + 0.5) highest = false;
    });
    if (hasBank && homeCredit >= 92 && highest) state.hegemonicDays++;
    else state.hegemonicDays = 0;

    state.stats.maxProsperity = Math.max(state.stats.maxProsperity, state.cities[state.homeCityId].prosperity);

    // 收入/支出复盘累计
    Object.keys(state.dayBreak.income).forEach(function (k) {
      state.stats.incomeBy[k] = (state.stats.incomeBy[k] || 0) + state.dayBreak.income[k];
    });
    Object.keys(state.dayBreak.expense).forEach(function (k) {
      state.stats.expenseBy[k] = (state.stats.expenseBy[k] || 0) + state.dayBreak.expense[k];
    });
    if (state.dayIncome > state.stats.bestDayIncome) state.stats.bestDayIncome = state.dayIncome;

    // 随机事件（多步事件链优先）
    DL.Events.chainTick(state);
    var ev = DL.Events.roll(state);
    if (ev && !state.pendingEvent) {
      state.pendingEvent = ev;
      state.stats.eventsSeen++;
    }

    checkEnd(state);
    save(state);
  }

  function checkEnd(state) {
    if (state.ended) return;
    var c = state.cities[state.homeCityId];

    // 破产
    if (state.finance.treasury < 0 && state.player.debt > 2000) {
      state.ended = { type: 'bankrupt', title: '破产结局', text: '资金归零而债务高企，商会宣告破产。十年之约，止步于第 ' + state.day + ' 天。' };
      return;
    }
    if (state.finance.treasury < -500) {
      state.ended = { type: 'bankrupt', title: '破产结局', text: '负债累累，债主登门，商会彻底破产。' };
      return;
    }

    // 自由经营模式：无胜利条件、无十年期限
    if (state.flags && state.flags.noWin) return;

    // 各胜利条件
    if (state.player.tradeVolumeYear >= DL.DATA.WIN_TRADE_VOLUME) {
      return win(state, 'economic', '经济胜利', '本城年度贸易总额突破 ' + DL.DATA.WIN_TRADE_VOLUME + 'G，曦光之地最大的商路都写着你的名字。');
    }
    if (c.prosperity >= 100 && c.tourism >= 100) {
      return win(state, 'cultural', '文化胜利', '繁荣度与旅游吸引力双双满格，本城成为大陆最令人向往的商都。');
    }
    var allTrade = true, allRel = true;
    DL.DATA.CITIES.forEach(function (cc) {
      if (cc.id === state.homeCityId) return;
      if (!DL.Diplo.hasTreaty(state, cc.id, 'trade')) allTrade = false;
      if (DL.Diplo.relation(state, cc.id) < 60) allRel = false;
    });
    if (allTrade && allRel) {
      return win(state, 'diplomatic', '外交胜利', '互惠通商之约遍布大陆，六国皆视你为最可信赖的伙伴。');
    }
    if (DL.City.buildingLevel(state, 'bank') > 0 && state.player.debt <= 0 && state.cities[state.homeCityId].credit >= 95 && state.hegemonicDays >= 60) {
      return win(state, 'hegemony', '霸主胜利（隐藏）', '还清债务、连续60日保持全大陆最高信用，货币成为商路通用的结算之币。');
    }
    if (state.player.debt <= 0 && state.finance.treasury >= DL.DATA.WIN_SAVINGS && state.player.license) {
      return win(state, 'main', '主线胜利', '还清全部贷款，存款达标，商队牌照高悬门楣。你完成了当初立下的十年之约。');
    }

    // 十年期满
    if (state.day >= DL.DATA.GAME_YEARS * DL.DATA.DAYS_PER_YEAR) {
      state.ended = { type: 'ordinary', title: '平凡结局', text: '十年之期已到。虽未名震大陆，但你的城市已是安居乐业之地。可以继续经营。' };
    }
  }

  function win(state, type, title, text) {
    state.wins.push({ type: type, day: state.day });
    state.ended = { type: type, title: title, text: text };
    log(state, title + '：' + text);
  }

  function slotKey(slot) {
    slot = slot == null ? 0 : slot;
    return SLOT_KEYS[slot] || SLOT_KEYS[0];
  }

  function save(state, slot) {
    if (!state) return;
    if (slot == null) slot = state.saveSlot || 0;
    state.saveSlot = slot;
    try {
      localStorage.setItem(slotKey(slot), JSON.stringify(state));
      localStorage.setItem('dawnlands_save_active', String(slot));
    } catch (e) { /* 存储失败忽略 */ }
  }

  function load(slot) {
    try {
      if (slot == null) {
        var active = localStorage.getItem('dawnlands_save_active');
        slot = (active === '0' || active === '1' || active === '2') ? parseInt(active, 10) : 0;
      }
      var raw = localStorage.getItem(slotKey(slot));
      if (!raw && slot === 0) raw = localStorage.getItem(SAVE_KEY); // 兼容旧单槽存档
      if (!raw) return null;
      var st = JSON.parse(raw);
      if (!st || st.version !== 1) return null;
      st.saveSlot = slot;
      return ensureDefaults(st);
    } catch (e) {
      return null;
    }
  }

  function clearSave(slot) {
    try {
      if (slot == null) localStorage.removeItem(SAVE_KEY);
      else localStorage.removeItem(slotKey(slot));
    } catch (e) { /* ignore */ }
  }

  function slots() {
    var out = [];
    for (var i = 0; i < 3; i++) {
      var meta = null;
      try {
        var raw = localStorage.getItem(slotKey(i));
        if (raw) {
          var st = JSON.parse(raw);
          meta = {
            day: st.day,
            homeCity: DL.DATA.cityById(st.homeCityId).name,
            treasury: Math.round(st.finance ? st.finance.treasury : 0),
            ended: st.ended ? st.ended.title : null,
            year: Math.floor((st.day - 1) / 365) + 1
          };
        }
      } catch (e) { /* ignore */ }
      out.push({ slot: i, meta: meta });
    }
    return out;
  }

  function exportSave(state) {
    return JSON.stringify(state);
  }

  function importSave(json) {
    var st = JSON.parse(json);
    if (!st || !st.homeCityId) throw new Error('存档无效');
    return ensureDefaults(st);
  }

  function dateLabel(state) {
    return DL.Calendar.info(state.day).label;
  }

  DL.State = {
    SAVE_KEY: SAVE_KEY,
    newGame: newGame,
    tick: tick,
    log: log,
    save: save,
    load: load,
    clearSave: clearSave,
    slots: slots,
    exportSave: exportSave,
    importSave: importSave,
    dateLabel: dateLabel,
    tutorialComplete: tutorialComplete,
    checkEnd: checkEnd
  };
})(typeof window !== 'undefined' ? window : globalThis);
