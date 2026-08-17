/* 历法：一年12月×30日 + 5个空日 = 365天 */
(function (G) {
  'use strict';
  var DL = G.DL = G.DL || {};

  var MONTHS = [
    { name: '新芽月', nameEn: 'Sproutmonth', season: '春', desc: '残雪消融，春溪初涨' },
    { name: '百花月', nameEn: 'Blossommonth', season: '春', desc: '果树尽开，蜂箱开闸' },
    { name: '牧草月', nameEn: 'Pasturemonth', season: '初夏', desc: '青草疯长，羔羊离乳' },
    { name: '阳曦月', nameEn: 'Sunbrightmonth', season: '仲夏', desc: '白昼最长，日影最短' },
    { name: '刈草月', nameEn: 'Haymonth', season: '盛夏', desc: '第一茬干草收割' },
    { name: '初穗月', nameEn: 'Earingmonth', season: '初秋', desc: '麦田抽穗灌浆' },
    { name: '丰熟月', nameEn: 'Harvestmonth', season: '仲秋', desc: '麦浪金黄，最忙农月' },
    { name: '酿造月', nameEn: 'Vintagemonth', season: '晚秋', desc: '葡萄紫熟，新酒入瓮' },
    { name: '金秋月', nameEn: 'Goldentidemonth', season: '初冬', desc: '层林尽染，秋分昼等' },
    { name: '雾霭月', nameEn: 'Mistfallmonth', season: '仲冬', desc: '晨雾渐浓，露水凝重' },
    { name: '霜晨月', nameEn: 'Frostmornmonth', season: '深冬', desc: '初霜覆草，正午仍暖' },
    { name: '静息月', nameEn: 'Stillnessmonth', season: '冬末', desc: '万物敛藏，静待春归' }
  ];

  var HOLLOW_EN = {
    '春分': 'Spring Equinox', '夏至': 'Summer Solstice', '秋分': 'Autumn Equinox',
    '合欢跋日': 'Acacia Fair Day', '冬至': 'Winter Solstice'
  };

  var HOLLOW_AFTER = {
    1: ['春分'],
    3: ['夏至'],
    8: ['秋分', '合欢跋日'],
    11: ['冬至']
  };

  var YEAR_DAYS = [];
  (function build() {
    for (var m = 0; m < 12; m++) {
      for (var d = 1; d <= 30; d++) YEAR_DAYS.push({ m: m, d: d, hollow: null });
      var hollows = HOLLOW_AFTER[m];
      if (hollows) {
        hollows.forEach(function (h) { YEAR_DAYS.push({ m: -1, d: 0, hollow: h }); });
      }
    }
  })();

  function info(day) {
    var year = Math.floor((day - 1) / 365) + 1;
    var idx = (day - 1) % 365;
    var y = YEAR_DAYS[idx];
    var month = y.m >= 0 ? MONTHS[y.m] : null;
    var seasonMonth = y.m >= 0 ? y.m : YEAR_DAYS[(idx + 364) % 365].m;
    var en = DL.I18N && DL.I18N.lang() === 'en';
    var label;
    if (y.hollow) {
      label = en ? ('Year ' + year + ' · Hollow Day「' + (HOLLOW_EN[y.hollow] || y.hollow) + '」') : ('第' + year + '年 · 空日「' + y.hollow + '」');
    } else {
      label = en ? ('Year ' + year + ' · ' + month.nameEn + ' ' + y.d) : ('第' + year + '年 · ' + month.name + ' ' + y.d + '日');
    }
    return {
      year: year,
      dayInYear: idx,
      monthIdx: y.m,
      seasonMonthIdx: seasonMonth,
      dayOfMonth: y.d,
      hollow: y.hollow,
      monthName: month ? (en ? month.nameEn : month.name) : '',
      season: month ? month.season : '',
      label: label,
      dayOfYear: idx
    };
  }

  function monthName(m) { return MONTHS[m] ? MONTHS[m].name : ''; }

  function seasonCoef(monthIdx, kind) {
    // 季节对产业产出的影响系数（农业/手工业/商业/旅游/交通）
    var table = {
      agri:  { spring: 1.20, summer: 1.40, autumn: 1.50, winter: 0.50 },
      craft: { spring: 1.05, summer: 1.10, autumn: 1.25, winter: 0.80 },
      trade: { spring: 1.10, summer: 1.20, autumn: 1.30, winter: 0.80 },
      tourism:{ spring: 1.15, summer: 1.20, autumn: 1.25, winter: 0.50 }
    };
    var season;
    if (monthIdx <= 1) season = 'spring';
    else if (monthIdx <= 3) season = 'summer';
    else if (monthIdx <= 8) season = 'autumn';
    else season = 'winter';
    return table[kind][season];
  }

  function festivalAt(day) {
    var idx = (day - 1) % 365;
    return DL.DATA.festivalByDay[idx] || null;
  }

  function festivalsNear(day, window) {
    var idx = (day - 1) % 365;
    var out = [];
    for (var off = -window; off <= window; off++) {
      var f = DL.DATA.festivalByDay[((idx + off) % 365 + 365) % 365];
      if (f && out.indexOf(f) === -1) out.push(f);
    }
    return out;
  }

  DL.Calendar = {
    MONTHS: MONTHS,
    YEAR_DAYS: YEAR_DAYS,
    info: info,
    monthName: monthName,
    seasonCoef: seasonCoef,
    festivalAt: festivalAt,
    festivalsNear: festivalsNear
  };
})(typeof window !== 'undefined' ? window : globalThis);
