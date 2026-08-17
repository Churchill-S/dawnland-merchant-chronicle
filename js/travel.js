/* 商队旅途小事件 + 海盗与海上护航 */
(function (G) {
  'use strict';
  var DL = G.DL = G.DL || {};

  var ROAD_EVENTS = [
    { id: 'road_artisan', title: '路遇流浪工匠', icon: '⚒', text: '商队歇脚时，一位流浪工匠打量着车轴，说可以加固车架。',
      choices: [
        { label: '花50G加固车架', hint: '回程货物更安全', run: function (state) {
            if (state.finance.treasury < 50) return '金币不够，工匠遗憾地走了。';
            state.finance.treasury -= 50;
            DL.State.log(state, '流浪工匠加固了车架，回程货物损耗减少。');
            return '车架加固完毕，工匠拍了拍车身。';
          } },
        { label: '婉拒', hint: '无事发生', run: function () { return '工匠喝了口水继续赶路。'; } }
      ] },
    { id: 'road_parcel', title: '顺路捎货', icon: '📦', text: '驿站托你把一箱货物捎到本城，酬金 60G。',
      choices: [
        { label: '接下', hint: '酬金60G', run: function (state) {
            state.finance.treasury += 60;
            state.player.tradeVolume += 60;
            state.dayTrade += 60;
            DL.State.log(state, '顺路捎货获得 60G 酬金。');
            return '货箱稳稳绑在车上，酬金到手。';
          } },
        { label: '婉拒', hint: '', run: function () { return '你婉言谢绝了驿站的委托。'; } }
      ] },
    { id: 'road_cache', title: '古骡驿站遗址', icon: '🪙', text: '路边露出一截旧屋基，像传说中废弃的古骡驿站。',
      choices: [
        { label: '花80G挖掘', hint: '随机获得一批货物', run: function (state) {
            if (state.finance.treasury < 80) return '金币不够，只能作罢。';
            state.finance.treasury -= 80;
            var pool = DL.DATA.GOODS.filter(function (x) { return x.id !== 'pony'; });
            var g = pool[Math.floor(Math.random() * pool.length)];
            var qty = 2 + Math.floor(Math.random() * 3);
            var wh = state.warehouse[g.id] = DL.Market.tierStock(state.warehouse[g.id]);
            wh[1] += qty;
            DL.State.log(state, '从遗址中挖出 ' + qty + ' ' + g.name + '！');
            return '旧木箱里翻出 ' + qty + ' ' + g.name + '。';
          } },
        { label: '只看不挖', hint: '小概率获得线索', run: function (state) {
            if (Math.random() < 0.4) {
              var cs = DL.DATA.CITIES.filter(function (c) { return c.id !== state.homeCityId; });
              var c = cs[Math.floor(Math.random() * cs.length)];
              DL.Market.revealIntel(state, c.id);
              DL.State.log(state, '在遗址刻字里发现了 ' + c.name + ' 的商路线索。');
              return '你在旧墙上读到一行字，指向 ' + c.name + '。';
            }
            return '什么也没发现。';
          } }
      ] },
    { id: 'road_merchant', title: '商人结伴', icon: '🤝', text: '一位行商想与你结伴同行，愿意分享沿途行情。',
      choices: [
        { label: '付30G佣金', hint: '获得两座城市的情报', run: function (state) {
            if (state.finance.treasury < 30) return '金币不够，行商独自上路了。';
            state.finance.treasury -= 30;
            var cs = DL.DATA.CITIES.filter(function (c) { return c.id !== state.homeCityId; });
            for (var i = 0; i < 2; i++) {
              var c = cs[Math.floor(Math.random() * cs.length)];
              DL.Market.revealIntel(state, c.id);
            }
            DL.State.log(state, '行商分享了沿途行情，获得两座城市的情报。');
            return '行商低声说了几处行情，你记下了。';
          } },
        { label: '婉拒', hint: '', run: function () { return '你们各走各的路。'; } }
      ] },
    { id: 'road_storm', title: '暴雨改道', icon: '🌧', text: '前方暴雨如注，向导建议绕道。',
      choices: [
        { label: '绕路（+1天）', hint: '稳妥', run: function (state) {
            DL.State.log(state, '商队绕路避雨，行程延误1天。');
            return '雨停后路更难走，但总算平安。';
          } },
        { label: '冒险抄近路', hint: '30%损失20G', run: function (state) {
            if (Math.random() < 0.3) {
              state.finance.treasury = Math.max(0, state.finance.treasury - 20);
              DL.State.log(state, '抄近路翻了车，损失 20G。');
              return '泥路打滑，赔了 20G 修车钱。';
            }
            return '赶在暴雨前穿过了谷口。';
          } }
      ] },
    { id: 'road_villagers', title: '好心村民', icon: '🏘', text: '路旁村民送来一篮当地特产，答谢商队平日带来的便宜货。',
      choices: [
        { label: '收下', hint: '获得1~3单位当地特产', run: function (state) {
            var c = DL.DATA.cityById(state.homeCityId);
            var pool = (c.specialties || []).length ? c.specialties : DL.DATA.GOODS.filter(function (g) { return g.origin === c.nation; }).map(function (g) { return g.id; });
            var gid = pool[Math.floor(Math.random() * pool.length)];
            var qty = 1 + Math.floor(Math.random() * 3);
            var wh = state.warehouse[gid] = DL.Market.tierStock(state.warehouse[gid]);
            wh[1] += qty;
            DL.State.log(state, '村民送来 ' + qty + ' ' + DL.DATA.goodById(gid).name + '。');
            return '篮子沉甸甸的，是乡亲的心意。';
          } }
      ] }
  ];

  function initTravel(state) {
    state.pirates = { routes: {}, enabled: true };
    DL.DATA.ROUTES.forEach(function (r) {
      if (r.type === 'water') {
        var base = Math.round(5 + Math.random() * 30);
        state.pirates.routes[r.id] = { base: base, danger: base, clearedUntil: 0 };
      }
    });
    state.pendingRoadEvent = null;
  }

  // 商队抵达目的地后有小概率触发旅途事件
  function tryRoadEvent(state, cv) {
    if (state.pendingRoadEvent) return;
    if (Math.random() < 0.12) {
      var ev = ROAD_EVENTS[Math.floor(Math.random() * ROAD_EVENTS.length)];
      state.pendingRoadEvent = { ev: ev, caravanId: cv.id, day: state.day };
    }
  }

  function roadDaily(state) {
    DL.DATA.ROUTES.forEach(function (r) {
      var pr = state.pirates.routes[r.id];
      if (!pr) return;
      if (pr.clearedUntil > 0) {
        if (state.day >= pr.clearedUntil) { pr.danger = pr.base; pr.clearedUntil = 0; }
      } else {
        pr.danger = Math.min(pr.base, pr.danger + Math.max(0.05, (pr.base - pr.danger) * 0.02));
      }
    });
    // 路途事件两天未处理则自动按第一项处理
    if (state.pendingRoadEvent && state.day - state.pendingRoadEvent.day >= 2) {
      var pe = state.pendingRoadEvent;
      var res = pe.ev.choices[0].run(state);
      if (res) DL.State.log(state, '（旅途事件未处理，自动' + pe.ev.choices[0].label + '）' + res);
      state.pendingRoadEvent = null;
    }
  }

  // 海盗遭遇（海路）
  function pirateEncounter(state, cv, route, danger) {
    var leader = DL.DATA.leaderById(cv.leaderId);
    var esc = DL.City.buildingLevel(state, 'escort');
    if (esc > 0 && Math.random() < 0.4 + 0.2 * esc) {
      DL.State.log(state, leader.name + ' 在「' + route.name + '」遭遇海盗，护航船队将其击退，货物无恙。');
      return;
    }
    var lossRatio = esc > 0 ? 0.15 : 0.25 + Math.random() * 0.15;
    var lost = [];
    Object.keys(cv.cargo || {}).forEach(function (gid) {
      var g = DL.DATA.goodById(gid);
      Object.keys(cv.cargo[gid] || {}).forEach(function (ts) {
        var q = cv.cargo[gid][ts];
        if (q <= 0) return;
        var l = Math.min(q, Math.round(q * lossRatio));
        if (l > 0) { cv.cargo[gid][ts] = q - l; lost.push(l + ' ' + DL.Market.qualityName(parseInt(ts, 10)) + g.name); }
      });
    });
    cv.delay = 1;
    DL.State.log(state, leader.name + ' 在「' + route.name + '」遭遇海盗！损失 ' + (lost.length ? lost.join('、') : '部分现金') + '，行程延误1天。' + (esc > 0 ? '护航船队负伤，只保住部分货物。' : ''));
  }

  function clearPirates(state, routeId) {
    var pr = state.pirates.routes[routeId];
    if (!pr || pr.danger <= 0) return { ok: false, msg: '该航线暂无海盗' };
    var cost = Math.round(pr.danger * 3);
    if (state.finance.treasury < cost) return { ok: false, msg: '金币不足' };
    state.finance.treasury -= cost;
    pr.danger = 0;
    pr.clearedUntil = state.day + 60;
    DL.State.log(state, '雇佣海军清剿「' + DL.DATA.routeById(routeId).name + '」上的海盗，60天内安全。');
    return { ok: true, msg: '已清剿，60天内安全' };
  }

  DL.Travel = {
    initTravel: initTravel,
    tryRoadEvent: tryRoadEvent,
    roadDaily: roadDaily,
    pirateEncounter: pirateEncounter,
    clearPirates: clearPirates,
    ROAD_EVENTS: ROAD_EVENTS
  };
})(typeof window !== 'undefined' ? window : globalThis);
