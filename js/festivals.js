/* 节日活动：放河灯、丰饶宴席、品酒、金秋大集摆摊、全城亮灯、礼赠 */
(function (G) {
  'use strict';
  var DL = G.DL = G.DL || {};

  function consume(state, goodId, need) {
    var wh = DL.Market.tierStock(state.warehouse[goodId]);
    var left = need;
    for (var t = 1; t <= 3 && left > 0; t++) {
      var take = Math.min(left, wh[t]);
      wh[t] -= take;
      left -= take;
    }
    state.warehouse[goodId] = wh;
  }

  var ACTIVITIES = [
    { festivalId: 'solstice', id: 'solstice_lantern', name: '放河灯', btn: '放一盏河灯（20G）',
      desc: '为商路祈福：满意度+2，有机会捡到顺水漂来的谢礼（30G），最多5盏',
      require: function (s) {
        if ((s.festivalActs.solstice_lantern || 0) >= 5) return { ok: false, msg: '今晚的河灯已放满5盏' };
        if (s.finance.treasury < 20) return { ok: false, msg: '金币不足' };
        return { ok: true, msg: '' };
      },
      run: function (s) {
        s.finance.treasury -= 20;
        s.festivalActs.solstice_lantern = (s.festivalActs.solstice_lantern || 0) + 1;
        s.city.satisfaction = Math.min(100, s.city.satisfaction + 2);
        s.cities[s.homeCityId].prosperity = Math.min(100, s.cities[s.homeCityId].prosperity + 0.5);
        var extra = Math.random() < 0.25 ? 30 : 0;
        if (extra) {
          s.finance.treasury += extra;
          DL.State.log(s, '一盏河灯顺流而下，带回漂来的谢礼 30G！');
        }
        return { ok: true, msg: '河灯顺流而下，愿商路平安' + (extra ? '，还捡到30G谢礼！' : '') };
      } },
    { festivalId: 'cornucopia', id: 'feast', name: '举办丰饶宴席', btn: '举办宴席',
      desc: '消耗 10面粉 + 5奶酪 + 5咸鱼：繁荣+5、满意度+8、旅游加成7天',
      require: function (s) {
        if (s.festivalActs.feast) return { ok: false, msg: '本次丰饶角已办过宴席' };
        if (DL.Market.totalStock(s.warehouse.flour) < 10 || DL.Market.totalStock(s.warehouse.cheese) < 5 || DL.Market.totalStock(s.warehouse.fish) < 5) {
          return { ok: false, msg: '需要仓库中面粉≥10、奶酪≥5、咸鱼≥5' };
        }
        return { ok: true, msg: '' };
      },
      run: function (s) {
        consume(s, 'flour', 10);
        consume(s, 'cheese', 5);
        consume(s, 'fish', 5);
        s.festivalActs.feast = true;
        s.cities[s.homeCityId].prosperity = Math.min(100, s.cities[s.homeCityId].prosperity + 5);
        s.city.satisfaction = Math.min(100, s.city.satisfaction + 8);
        s.weather.festivalTourism = { until: s.day + 7 };
        DL.State.log(s, '丰饶角宴席开席，全城欢宴！');
        return { ok: true, msg: '宴席大获成功！' };
      } },
    { festivalId: 'wineopening', id: 'tasting', name: '开坛品酒', btn: '品酒（15G）',
      desc: '满意度+1，有机会淘到陈年佳酿（40G），最多3次',
      require: function (s) {
        if ((s.festivalActs.tasting || 0) >= 3) return { ok: false, msg: '今日已品3次' };
        if (s.finance.treasury < 15) return { ok: false, msg: '金币不足' };
        return { ok: true, msg: '' };
      },
      run: function (s) {
        s.finance.treasury -= 15;
        s.festivalActs.tasting = (s.festivalActs.tasting || 0) + 1;
        s.city.satisfaction = Math.min(100, s.city.satisfaction + 1);
        var extra = Math.random() < 0.3 ? 40 : 0;
        if (extra) {
          s.finance.treasury += extra;
          DL.State.log(s, '品酒时淘到一坛陈年佳酿，转手 40G！');
        }
        return { ok: true, msg: '酒香四溢' + (extra ? '，竟淘到陈年佳酿（+40G）！' : '') };
      } },
    { festivalId: 'goldenfair', id: 'fair_stall', name: '金秋大集摆摊', btn: '摆摊（摊位费30G）',
      desc: '押上仓库里的货，大集结束时按行情卖出，可能大赚也可能亏本（最多2摊）',
      require: function (s) {
        if ((s.fairStalls || []).length >= 2) return { ok: false, msg: '最多同时摆2个摊' };
        if (s.finance.treasury < 30) return { ok: false, msg: '金币不足（摊位费30G）' };
        var gid = s.festivalForm.goodId || 'flour';
        var tier = s.festivalForm.tier || 1;
        if (DL.Market.warehouseQty(s, gid, tier) < 1) return { ok: false, msg: '仓库中没有该品质的货' };
        return { ok: true, msg: '' };
      },
      run: function (s) {
        var gid = s.festivalForm.goodId || 'flour';
        var tier = s.festivalForm.tier || 1;
        var qty = Math.max(1, s.festivalForm.qty || 1);
        var have = DL.Market.warehouseQty(s, gid, tier);
        qty = Math.min(qty, have);
        if (qty < 1) return { ok: false, msg: '仓库中没有该品质的货' };
        var wh = s.warehouse[gid] = DL.Market.tierStock(s.warehouse[gid]);
        wh[tier] -= qty;
        s.finance.treasury -= 30;
        s.fairStalls.push({ goodId: gid, tier: tier, qty: qty, fee: 30 });
        DL.State.log(s, '金秋大集摆摊：' + DL.Market.qualityName(tier) + DL.DATA.goodById(gid).name + ' ×' + qty + '。');
        return { ok: true, msg: '摊位开张，大集结束时结算' };
      } },
    { festivalId: 'lantern', id: 'lights', name: '全城亮灯', btn: '点亮全城（50G）',
      desc: '买灯油灯笼：旅游收入+4/天（3天）、满意度+3，每年一次',
      require: function (s) {
        if (s.festivalActs.lights) return { ok: false, msg: '今年已亮过灯' };
        if (s.finance.treasury < 50) return { ok: false, msg: '金币不足' };
        return { ok: true, msg: '' };
      },
      run: function (s) {
        s.finance.treasury -= 50;
        s.festivalActs.lights = true;
        s.weather.lights = { until: s.day + 3 };
        s.city.satisfaction = Math.min(100, s.city.satisfaction + 3);
        DL.State.log(s, '全城灯火通明，游人如织！');
        return { ok: true, msg: '全城亮灯，旅游收入提升！' };
      } },
    { festivalId: 'giftfest', id: 'gift', name: '备礼相赠', btn: '送礼（30G）',
      desc: '给所选城市送节日厚礼，关系+8（最多3次）',
      require: function (s) {
        if ((s.festivalActs.gift || 0) >= 3) return { ok: false, msg: '今日已送礼3次' };
        if (s.finance.treasury < 30) return { ok: false, msg: '金币不足' };
        return { ok: true, msg: '' };
      },
      run: function (s) {
        var cityId = s.festivalForm.city;
        if (!cityId || cityId === s.homeCityId) return { ok: false, msg: '请先选择一座城市' };
        s.finance.treasury -= 30;
        s.festivalActs.gift = (s.festivalActs.gift || 0) + 1;
        DL.Diplo.changeRelation(s, cityId, 8);
        DL.State.log(s, '礼赠节向 ' + DL.DATA.cityById(cityId).name + ' 送上厚礼，关系+8。');
        return { ok: true, msg: '礼物送达，关系+8' };
      } }
  ];

  function activities(state) {
    var f = DL.Calendar.festivalAt(state.day);
    if (!f || f.marketClosed) return [];
    return ACTIVITIES.filter(function (a) { return a.festivalId === f.id; });
  }

  function run(state, activityId) {
    for (var i = 0; i < ACTIVITIES.length; i++) {
      if (ACTIVITIES[i].id === activityId) {
        var chk = ACTIVITIES[i].require(state);
        if (!chk.ok) return chk;
        return ACTIVITIES[i].run(state);
      }
    }
    return { ok: false, msg: '未知活动' };
  }

  function daily(state) {
    var f = DL.Calendar.festivalAt(state.day);
    if (!f) {
      state.festivalActs = {};
      state.lastFestival = null;
    } else if (state.lastFestival !== f.id) {
      state.festivalActs = {};
      state.lastFestival = f.id;
    }
    // 金秋大集结束（秋分次日）后结算摊位
    if (state.fairStalls && state.fairStalls.length && !DL.Calendar.festivalAt(state.day)) {
      settleFairs(state);
    }
  }

  function settleFairs(state) {
    var total = 0;
    state.fairStalls.forEach(function (st) {
      var mult = 0.9 + Math.random() * 0.7;
      var price = state.prices[state.homeCityId][st.goodId].sell * DL.Market.qualityMult(st.tier) * mult;
      var gain = price * st.qty;
      total += gain;
      DL.State.log(state, '大集结算：' + DL.Market.qualityName(st.tier) + DL.DATA.goodById(st.goodId).name + ' ×' + st.qty + ' 卖出 ' + DL.Market.fmtG(gain) + '（行情 ×' + (Math.round(mult * 100) / 100).toFixed(2) + '）。');
    });
    state.finance.treasury += total;
    state.player.tradeVolume += total;
    state.dayTrade += total;
    state.fairStalls = [];
  }

  DL.Festivals = {
    activities: activities,
    run: run,
    daily: daily,
    ACTIVITIES: ACTIVITIES
  };
})(typeof window !== 'undefined' ? window : globalThis);
