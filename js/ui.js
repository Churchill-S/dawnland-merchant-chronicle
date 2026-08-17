/* 界面：顶栏、标签页面板、弹窗、引导 */
(function (G) {
  'use strict';
  var DL = G.DL = G.DL || {};

  var state = null;
  var curTab = 'overview';
  var marketSub = 'flow';
  var forceScrollTop = false;
  var qty = {};
  var buyTier = {};
  var caravanForm = { dest: null, leader: null, strategy: 'auto', load: {} };
  var diploTarget = null;
var demandForm = { goodId: 'flour', price: null, tier: 1 };
var saleForm = { goodId: null, price: null };
var pendingScrollId = null;
var chartGoodId = 'flour';

  var TABS = [
    { id: 'overview', name: '概览' },
    { id: 'industry', name: '产业' },
    { id: 'market', name: '市场' },
    { id: 'caravan', name: '商队' },
    { id: 'production', name: '生产' },
    { id: 'guild', name: '公会' },
    { id: 'company', name: '公司' },
    { id: 'sites', name: '名胜' },
    { id: 'achieve', name: '成就' },
    { id: 'build', name: '建造' },
    { id: 'diplo', name: '外交' },
    { id: 'finance', name: '财政' },
    { id: 'stats', name: '统计' }
  ];

  function fmt(n) { return Math.round(n).toLocaleString('zh-CN'); }
  function fmtG(n) { return fmt(n) + 'G'; }
  function fmt1(n) { return (Math.round(n * 10) / 10).toLocaleString('zh-CN'); }

  function init(s, container) {
    state = s;
    DL.DATA.GOODS.forEach(function (g) { qty[g.id] = qty[g.id] || 1; });
    render();
  }

  function setState(s) {
    state = s;
    DL.DATA.GOODS.forEach(function (g) { if (qty[g.id] === undefined) qty[g.id] = 1; });
  }

  function render() {
    var prev = 0;
    var jump = pendingScrollId;
    pendingScrollId = null;
    if (!forceScrollTop && !jump) {
      var tb = document.getElementById('tab-body');
      prev = tb ? tb.scrollTop : 0;
    }
    forceScrollTop = false;
    renderTop();
    renderTabs();
    renderTab();
    var tb2 = document.getElementById('tab-body');
    if (tb2 && jump) {
      var el = document.getElementById(jump);
      if (el && el.scrollIntoView) el.scrollIntoView({ block: 'start' });
      else if (el) tb2.scrollTop = el.offsetTop || 0;
    } else if (tb2 && prev) {
      tb2.scrollTop = prev;
    }
    renderToasts();
    DL.I18N.localizeDom(document.body);
  }

  function renderTop() {
    var el = document.getElementById('topbar');
    var info = DL.Calendar.info(state.day);
    var f = DL.Calendar.festivalAt(state.day);
    var festivalBadge = f ? '<span class="fest-badge">' + f.name + '</span>' : '';
    el.innerHTML =
      '<div class="brand">曦光之地 · 商会风云</div>' +
      '<div class="top-date">' + info.label + (info.hollow ? '' : ' · ' + info.season) + festivalBadge + '</div>' +
      '<div class="top-money">金库 <b>' + fmtG(state.finance.treasury) + '</b></div>' +
      '<div class="top-debt ' + (state.player.debt > 0 ? 'debt' : 'ok') + '">负债 <b>' + fmtG(state.player.debt) + '</b></div>' +
      '<div class="top-btn"><button id="btn-lang">' + (DL.I18N.lang() === 'zh' ? 'EN' : '中') + '</button><button id="btn-save">存档</button><button id="btn-load">读档</button><button id="btn-new">新游戏</button><button id="btn-help">帮助</button></div>' +
      '<div class="top-version">v' + DL.DATA.VERSION + '</div>';
    document.getElementById('btn-lang').onclick = function () {
      DL.I18N.setLang(DL.I18N.lang() === 'zh' ? 'en' : 'zh');
      render();
    };
    document.getElementById('btn-save').onclick = function () { showSaveLoadModal('save'); };
    document.getElementById('btn-load').onclick = function () { showSaveLoadModal('load'); };
    document.getElementById('btn-new').onclick = function () { confirmModal('开始新游戏？当前进度将被覆盖。', function () { showNewGame(); }); };
    document.getElementById('btn-help').onclick = function () { showHelp(); };
  }

  function renderTabs() {
    var el = document.getElementById('side-panel');
    var tabsHtml = '<div class="tabs">' + TABS.map(function (t) {
      return '<button class="tab-btn' + (curTab === t.id ? ' active' : '') + '" data-tab="' + t.id + '">' + t.name + '</button>';
    }).join('') + '</div>';
    el.innerHTML = tabsHtml + '<div class="tab-body" id="tab-body"></div>';
    el.querySelectorAll('.tab-btn').forEach(function (b) {
      b.onclick = function () {
        curTab = b.getAttribute('data-tab');
        forceScrollTop = true;
        if (curTab === 'market') DL.State.tutorialComplete(state, 0);
        render();
      };
    });
  }

  function renderTab() {
    var body = document.getElementById('tab-body');
    if (!body) return;
    switch (curTab) {
      case 'overview': body.innerHTML = tabOverview(); break;
      case 'industry': body.innerHTML = tabIndustry(); break;
      case 'market': body.innerHTML = tabMarket(); break;
      case 'caravan': body.innerHTML = tabCaravan(); break;
      case 'production': body.innerHTML = tabProduction(); break;
      case 'guild': body.innerHTML = tabGuild(); break;
      case 'company': body.innerHTML = tabCompany(); break;
      case 'sites': body.innerHTML = tabSites(); break;
      case 'achieve': body.innerHTML = tabAchieve(); break;
      case 'build': body.innerHTML = tabBuild(); break;
      case 'diplo': body.innerHTML = tabDiplo(); break;
      case 'finance': body.innerHTML = tabFinance(); break;
      case 'stats': body.innerHTML = tabStats(); break;
    }
    bindTabActions();
  }

  function tutorialBanner() {
    var tasks = [
      '任务一：点击上方「市场」标签，查看本城行情',
      '任务二：前往「商队」标签，派出第一支商队',
      '任务三：在「建造」标签为本城建一座设施'
    ];
    var idx = -1;
    for (var i = 0; i < 3; i++) if (!state.tutorial.done[i]) { idx = i; break; }
    if (idx === -1) return '';
    return '<div class="tutorial">💡 ' + tasks[idx] + '</div>';
  }

  function mood() {
    var c = state.cities[state.homeCityId];
    var sat = state.city.satisfaction || 70;
    if (sat < 50) return '“街角有人叹气：物价一天比一天高，日子可怎么过呀。”';
    if (sat < 70) return '“居民们精打细算，盼着市集上能有更实惠的粮食。”';
    if (c.prosperity >= 80) return '“集市人声鼎沸，连外乡人都说这里是曦光之地最热闹的地方。”';
    if (c.credit >= 75) return '“商人们说，和你的商会做生意最让人放心。”';
    if (state.player.debt > 8000) return '“有人在酒馆里小声议论着商会的债务。”';
    if (c.pop < 600) return '“街巷有些冷清，但孩子们依然在合欢树下玩耍。”';
    if (c.prosperity >= 55) return '“麦香混着蜜香，城里的日子安稳而明亮。”';
    return '“今年的收成不算差，大家盼着集市日快点到。”';
  }

  function festivalSection() {
    var acts = DL.Festivals.activities(state);
    if (!acts.length) return '';
    var f = DL.Calendar.festivalAt(state.day);
    var html = acts.map(function (a) {
      var chk = a.require(state);
      var extra = '';
      if (a.id === 'fair_stall') {
        var goodOpts = DL.DATA.GOODS.map(function (g) {
          return '<option value="' + g.id + '"' + (state.festivalForm.goodId === g.id ? ' selected' : '') + '>' + g.name + '</option>';
        }).join('');
        var tierOpts = [1, 2, 3].map(function (t) {
          return '<option value="' + t + '"' + ((state.festivalForm.tier || 1) === t ? ' selected' : '') + '>' + DL.Market.qualityName(t) + '</option>';
        }).join('');
        extra = '<div class="form-row"><label>商品</label><select data-fest-good>' + goodOpts + '</select>' +
          '<label>品质</label><select data-fest-tier>' + tierOpts + '</select>' +
          '<label>数量</label>' + qtyStepper(state.festivalForm.goodId || 'flour') + '</div>';
      }
      if (a.id === 'gift') {
        var cityOpts = DL.DATA.CITIES.filter(function (c) { return c.id !== state.homeCityId; }).map(function (c) {
          return '<option value="' + c.id + '"' + (state.festivalForm.city === c.id ? ' selected' : '') + '>' + c.name + '</option>';
        }).join('');
        extra = '<div class="form-row"><label>对象</label><select data-fest-city>' + cityOpts + '</select></div>';
      }
      return '<div class="cv-row"><div class="cv-head"><b>' + a.name + '</b><span class="cv-state">' + a.desc + '</span></div>' +
        extra +
        '<button class="btn small ' + (chk.ok ? 'primary' : 'disabled') + '" data-fest-act="' + a.id + '"' + (chk.ok ? '' : ' title="' + chk.msg + '"') + '>' + a.btn + '</button></div>';
    }).join('');
    return '<div class="panel-title">节日活动 · ' + f.name + '</div>' + html;
  }

  function statRow(label, value, max, color) {
    var pct = Math.max(0, Math.min(100, value / max * 100));
    return '<div class="stat-row"><span class="stat-label">' + label + '</span><div class="bar"><div class="bar-fill" style="width:' + pct + '%;background:' + (color || '#8a9a4f') + '"></div></div><span class="stat-val">' + fmt(value) + (max > 100 ? '' : '/' + max) + '</span></div>';
  }

  function breakTitle(kind) {
    var b = state.dayBreak[kind] || {};
    var labels = {
      tax: '税收', tour: '旅游', toll: '过路费', inn: '旅馆', luxury: '贵族消费',
      retail: '零售', shipping: '航运', dividend: '股份分红', sites: '名胜门票',
      pub: '酒馆', clothshop: '服装店', pastry: '糕点铺',
      interest: '债务利息', buildings: '设施维护', fleet: '商队维护', industry: '生产维护'
    };
    var parts = [];
    Object.keys(b).forEach(function (k) {
      if (b[k] > 0 && labels[k]) parts.push(labels[k] + ' ' + fmt1(b[k]) + 'G');
    });
    return parts.join(' · ') || '暂无';
  }

  function tabOverview() {
    var c = state.cities[state.homeCityId];
    var net = state.dayIncome - state.dayExpense;
    var retailIncome = (state.retailLast && state.retailLast.revenue) || 0;
    var tutorial = tutorialBanner();
    var caravansActive = state.caravans.filter(function (cv) { return !cv.done; }).length;
    var leaders = state.fleet.units.map(function (u) {
      var l = DL.DATA.leaderById(u.leaderId);
      var busy = DL.Caravans.leaderBusy(state, u.leaderId);
      return '<span class="leader-chip ' + (busy ? 'busy' : '') + '">' + l.name + (busy ? ' 途中' : ' 待命') + '</span>';
    }).join(' ');
    var buildings = Object.keys(state.city.buildings).map(function (id) {
      return DL.DATA.buildingById(id).name + ' Lv' + state.city.buildings[id].level;
    }).join('、') || '暂无';
    return tutorial +
      festivalSection() +
      '<div class="panel-title">' + DL.DATA.cityById(state.homeCityId).name + ' · 概览</div>' +
      '<div class="mood">' + mood() + '</div>' +
      statRow('人口', Math.round(c.pop), 10000, '#7b96a5') +
      statRow('繁荣度', c.prosperity, 100, '#d8a838') +
      statRow('信用评级', c.credit, 100, '#3f9d9a') +
      statRow('交通通达度', c.connectivity, 100, '#8a7346') +
      statRow('旅游吸引力', c.tourism, 100, '#c9643a') +
      statRow('居民满意度', state.city.satisfaction || 70, 100, (state.city.satisfaction || 70) >= 70 ? '#3f9d4a' : (state.city.satisfaction || 70) >= 40 ? '#d8a838' : '#c05a3a') +
      '<div class="row2">' +
      '<div class="mini-card" title="收入：' + breakTitle('income') + '"><div class="mini-label">今日收入</div><div class="mini-val green">' + fmtG(state.dayIncome) + '</div></div>' +
      '<div class="mini-card" title="支出：' + breakTitle('expense') + '"><div class="mini-label">今日支出</div><div class="mini-val red">' + fmtG(state.dayExpense) + '</div></div>' +
      '<div class="mini-card"><div class="mini-label">今日净额</div><div class="mini-val ' + (net >= 0 ? 'green' : 'red') + '">' + fmtG(net) + '</div></div>' +
      '<div class="mini-card"><div class="mini-label">今日贸易额</div><div class="mini-val">' + fmtG(state.dayTrade) + '</div></div>' +
      '<div class="mini-card"><div class="mini-label">今日零售收入</div><div class="mini-val green">' + fmtG(retailIncome) + '</div></div>' +
      '</div>' +
      '<div class="sub-title">商会资产</div>' +
      '<div class="kv"><span>金库</span><b>' + fmtG(state.finance.treasury) + '</b></div>' +
      '<div class="kv"><span>负债（日息 ' + fmt1(state.player.dailyInterest != null ? state.player.dailyInterest : DL.DATA.DEBT_DAILY_INTEREST) + 'G）</span><b class="' + (state.player.debt > 0 ? 'red' : 'green') + '">' + fmtG(state.player.debt) + '</b></div>' +
      '<div class="kv"><span>马车载重</span><b>' + state.player.wagonKg + 'kg</b></div>' +
      '<div class="kv"><span>商队牌照</span><b>' + (state.player.license ? '已持有' : '未购买') + '</b></div>' +
      '<div class="kv"><span>难度</span><b>' + ((DL.DATA.DIFFICULTY[state.flags.difficulty] || {}).name || '普通') + '</b></div>' +
      '<div class="kv"><span>商会排名</span><b>' + DL.Rivals.playerRank(state) + ' / 4</b></div>' +
      '<div class="sub-title">车队 · ' + caravansActive + ' 支在途</div>' +
      '<div class="kv"><span>在编商队（' + state.fleet.units.length + '/' + DL.Caravans.fleetMax(state) + '）</span><b>' + leaders + '</b></div>' +
      '<div class="sub-title">设施</div>' +
      '<div class="kv"><span>已建成</span><b>' + buildings + '</b></div>' +
      '<div class="sub-title">年度贸易额</div>' +
      '<div class="kv"><span>' + fmtG(state.player.tradeVolumeYear || 0) + ' / ' + fmtG(DL.DATA.WIN_TRADE_VOLUME) + '</span><b></b></div>' +
      '<div class="sub-title">近期日志</div>' +
      '<div class="log-box">' + state.log.slice(-8).reverse().map(function (l) {
        return '<div class="log-line"><span class="log-day">D' + l.day + '</span>' + l.text + '</div>';
      }).join('') + '</div>';
  }

  function tabIndustry() {
    var info = DL.Calendar.info(state.day);
    var eff = DL.City.buildingEffects(state);
    var alloc = state.city.alloc;
    var seasonLines = [
      '农业：' + Math.round(DL.Calendar.seasonCoef(info.monthIdx, 'agri') * 100) + '%',
      '手工业：' + Math.round(DL.Calendar.seasonCoef(info.monthIdx, 'craft') * 100) + '%',
      '商业：' + Math.round(DL.Calendar.seasonCoef(info.monthIdx, 'trade') * 100) + '%',
      '旅游：' + Math.round(DL.Calendar.seasonCoef(info.monthIdx, 'tourism') * 100) + '%'
    ].join(' · ');
    var effValues = {
      agri: DL.City.effectiveIndustry(state, 'agri') + (state.city.tech.agri || 0),
      craft: DL.City.effectiveIndustry(state, 'craft') + (state.city.tech.craft || 0),
      mining: DL.City.effectiveIndustry(state, 'mining') + (state.city.tech.mining || 0)
    };
    return '<div class="panel-title">产业分配（调整后次日生效）</div>' +
      '<div class="season-note">' + DL.Calendar.monthName(info.monthIdx) + ' · 季节系数 — ' + seasonLines + '</div>' +
      allocSlider('agri', '农业', alloc.agri, effValues.agri, '#8a9a4f') +
      allocSlider('craft', '手工业', alloc.craft, effValues.craft, '#c9643a') +
      allocSlider('mining', '矿业', alloc.mining, effValues.mining, '#7b96a5') +
      '<div class="note">提示：把更多人手投入农业可提高粮食产出，投入手工业则产出更多可交易商品。矿业影响建材与矿石类产出。</div>';
  }

  function allocSlider(id, name, val, eff, color) {
    return '<div class="alloc-block">' +
      '<div class="alloc-head"><span>' + name + '</span><b>' + val + '%</b></div>' +
      '<input type="range" min="0" max="100" step="5" value="' + val + '" data-alloc="' + id + '">' +
      '<div class="alloc-eff">有效产能 ' + fmt(eff) + '</div>' +
      '</div>';
  }

  function sparkline(canvas, series, key, color) {
    if (!canvas || !series || series.length < 2) return;
    var ctx = canvas.getContext('2d');
    var w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    var vals = series.map(function (p) { return p[key]; });
    var min = Math.min.apply(null, vals), max = Math.max.apply(null, vals);
    if (max - min < 0.01) max = min + 1;
    ctx.strokeStyle = color || '#3f9d9a';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    series.forEach(function (p, i) {
      var x = (series.length === 1 ? 0.5 : i / (series.length - 1)) * (w - 4) + 2;
      var y = h - 2 - ((p[key] - min) / (max - min)) * (h - 4);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }

  function drawPriceChart(canvas, series) {
    if (!canvas) return;
    if (!series || series.length < 2) {
      sparkline(canvas, [{ buy: 0, sell: 0 }, { buy: 0, sell: 0 }], 'buy', '#bbb');
      return;
    }
    sparkline(canvas, series, 'buy', '#3f9d9a');
    sparkline(canvas, series, 'sell', '#c05a3a');
    var ctx = canvas.getContext('2d');
    ctx.fillStyle = '#888';
    ctx.font = '10px sans-serif';
    ctx.fillText('绿=买入 红=卖出', canvas.width - 92, 10);
  }

  function priceChartSection() {
    var gid = chartGoodId || 'flour';
    var series = DL.Market.priceSeries(state, state.homeCityId, gid);
    var opts = DL.DATA.GOODS.map(function (g) {
      return '<option value="' + g.id + '"' + (g.id === gid ? ' selected' : '') + '>' + g.name + '</option>';
    }).join('');
    var last = series.length ? series[series.length - 1] : null;
    return '<div class="panel-title">价格走势 · 本城（近30天）</div>' +
      '<div class="form-row"><label>商品</label><select id="chart-good">' + opts + '</select>' +
      (last ? '<span class="cv-state">最新买入 ' + fmt1(last.buy) + 'G · 卖出 ' + fmt1(last.sell) + 'G</span>' : '') +
      '</div><canvas id="price-chart" width="560" height="120" class="spark-big"></canvas>';
  }

  function tabMarket() {
    var subs = [
      ['flow', '流通市场'], ['warehouse', '我的仓库'], ['demand', '外地需求']
    ];
    var bar = '<div class="sub-tabs">' + subs.map(function (s) {
      return '<button class="sub-tab' + (marketSub === s[0] ? ' active' : '') + '" data-subtab="' + s[0] + '">' + s[1] + '</button>';
    }).join('') + '</div>';
    if (marketSub === 'flow') return bar + subFlow();
    if (marketSub === 'warehouse') return bar + subWarehouse();
    return bar + subDemand();
  }

  function qtyStepper(gid) {
    var q = qty[gid] || 1;
    return '<div class="stepper"><button data-step="-5" data-good="' + gid + '">-5</button><button data-step="-1" data-good="' + gid + '">-</button><span>' + q + '</span><button data-step="1" data-good="' + gid + '">+</button><button data-step="5" data-good="' + gid + '">+5</button></div>';
  }

  function demandBoardSection() {
    var entries = (state.playerDemand || []).filter(function (e) { return e.until > state.day; });
    var rows = entries.map(function (e) {
      var g = DL.DATA.goodById(e.goodId);
      return '<tr><td>' + DL.Market.qualityName(e.tier) + ' ' + g.name + '</td><td>' + fmt(e.qty) + '</td><td>' + fmt1(e.price) + 'G</td><td>' + (e.until - state.day) + '天</td><td><button class="btn small" data-demand-rm="' + e.id + '">取消</button></td></tr>';
    }).join('') || '<tr><td colspan="5" class="empty">暂无求购公告——发布后，外地商队会特意带货前来</td></tr>';
    var goodOpts = DL.DATA.GOODS.map(function (g) {
      return '<option value="' + g.id + '"' + (demandForm.goodId === g.id ? ' selected' : '') + '>' + g.name + '</option>';
    }).join('');
    var tierOpts = [1, 2, 3].map(function (t) {
      return '<option value="' + t + '"' + ((demandForm.tier || 1) === t ? ' selected' : '') + '>' + DL.Market.qualityName(t) + '</option>';
    }).join('');
    var price = demandForm.price || DL.Market.fairPrice(state, demandForm.goodId);
    return '<div class="panel-title">我的求购公告（' + entries.length + '/4）</div>' +
      '<div class="note">发布需付 10G 定金（防乱挂公告）；到访的外地商队会按你的出价带货，出价低于合理价 85% 时他们会讨价还价。</div>' +
      '<div class="table-wrap"><table class="tbl"><thead><tr><th>商品</th><th>数量</th><th>出价</th><th>剩余</th><th>操作</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
      '<div class="form-row"><label>商品</label><select id="demand-good">' + goodOpts + '</select>' +
      '<label>品质</label><select id="demand-tier">' + tierOpts + '</select>' +
      '<label>数量</label>' + qtyStepper(demandForm.goodId || 'flour') + '</div>' +
      '<div class="form-row"><label>出价</label><div class="stepper">' +
      '<button class="btn small" data-demand-price="-5">-5</button><button class="btn small" data-demand-price="-1">-1</button>' +
      '<span>' + fmt1(price) + 'G</span>' +
      '<button class="btn small" data-demand-price="1">+1</button><button class="btn small" data-demand-price="5">+5</button></div></div>' +
      '<button class="btn primary" id="demand-publish">发布求购（7天）</button>';
  }

  function saleBoardSection() {
    var ads = (state.saleAds || []).filter(function (e) { return e.until > state.day; });
    var rows = ads.map(function (e) {
      var g = DL.DATA.goodById(e.goodId);
      return '<tr><td>' + g.name + '</td><td>' + fmt(e.qty) + '</td><td>' + fmt1(e.price) + 'G</td><td>' + (e.until - state.day) + '天</td><td><button class="btn small" data-sale-rm="' + e.id + '">取消</button></td></tr>';
    }).join('') || '<tr><td colspan="5" class="empty">暂无出售公告——发布后，需要这些货的外地商队会专程前来采购</td></tr>';
    var goods = DL.DATA.GOODS.filter(function (g) {
      return DL.Market.warehouseQty(state, g.id, 1) > 0 || DL.Market.warehouseQty(state, g.id, 2) > 0 || DL.Market.warehouseQty(state, g.id, 3) > 0;
    });
    var gid = saleForm.goodId || (goods.length ? goods[0].id : 'flour');
    if (!goods.some(function (g) { return g.id === gid; })) gid = goods.length ? goods[0].id : 'flour';
    var goodOpts = goods.map(function (g) {
      return '<option value="' + g.id + '"' + (gid === g.id ? ' selected' : '') + '>' + g.name + '</option>';
    }).join('');
    var price = saleForm.price || DL.Market.fairPrice(state, gid);
    return '<div class="panel-title">我的出售公告（' + ads.length + '/4）</div>' +
      '<div class="note">付 20G 广告费挂出售公告；需要这些货的外地商队会按你的报价专程采购。报价高于合理卖价1.4倍时无人问津。</div>' +
      '<div class="table-wrap"><table class="tbl"><thead><tr><th>商品</th><th>数量</th><th>报价</th><th>剩余</th><th>操作</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
      '<div class="form-row"><label>商品</label><select id="sale-good">' + goodOpts + '</select>' +
      '<label>数量</label>' + qtyStepper(gid) + '</div>' +
      '<div class="form-row"><label>报价</label><div class="stepper">' +
      '<button class="btn small" data-sale-price="-5">-5</button><button class="btn small" data-sale-price="-1">-1</button>' +
      '<span>' + fmt1(price) + 'G</span>' +
      '<button class="btn small" data-sale-price="1">+1</button><button class="btn small" data-sale-price="5">+5</button></div></div>' +
      '<button class="btn primary" id="sale-publish">发布出售（7天 · 广告费20G）</button>';
  }

  function subFlow() {
    var closed = DL.Market.marketClosed(state);
    var c = state.cities[state.homeCityId];
    var warn = closed ? '<div class="warn">今日「静夜思」，全图停市。</div>' : '';
    // 居民摊位：按商品类型分组，每组内每种货物一行，右侧选品质
    var catOrder = ['谷物', '饮品', '酒类', '食品', '海产', '调味品', '药材', '纺织原料', '金属制品', '工艺品', '文化用品', '日用品', '奢侈品', '建材原料'];
    var rows = catOrder.map(function (cat) {
      var goods = DL.DATA.GOODS.filter(function (g) {
        return g.cat === cat && DL.Market.totalStock(DL.Market.tierStock(c.market[g.id])) > 0;
      });
      if (!goods.length) return '';
      var inner = goods.map(function (g) {
        var stock = DL.Market.tierStock(c.market[g.id]);
        var tier = buyTier[g.id] || DL.Market.mainTier(stock);
        if (stock[tier] <= 0) tier = DL.Market.mainTier(stock);
        var price = DL.Market.residentOfferPrice(state, g.id, tier);
        var total = Math.round(stock[1] + stock[2] + stock[3]);
        var tierOpts = [1, 2, 3].map(function (t) {
          return '<option value="' + t + '"' + (tier === t ? ' selected' : '') + (stock[t] <= 0 ? ' disabled' : '') + '>' + DL.Market.qualityName(t) + '</option>';
        }).join('');
        return '<tr>' +
          '<td class="gname">' + g.name + '</td>' +
          '<td><select data-rbuy-tier="' + g.id + '">' + tierOpts + '</select></td>' +
          '<td>' + fmt(Math.round(stock[tier])) + '<span class="gcat">总 ' + fmt(total) + '</span></td>' +
          '<td class="buy">' + fmt1(price) + 'G</td>' +
          '<td>' + qtyStepper(g.id) + '</td>' +
          '<td><button class="btn small ' + (closed ? 'disabled' : 'buy-btn') + '" data-rbuy="' + g.id + '" data-tier="' + tier + '">买入</button></td>' +
          '</tr>';
      }).join('');
      return '<tr class="cat-head"><td colspan="6">' + cat + '</td></tr>' + inner;
    }).join('') || '<tr><td colspan="6" class="empty">居民摊位暂时空着</td></tr>';

    // 外地商队在镇
    var visitors = state.market.visitors.map(function (vi, idx) {
      var cname = DL.DATA.cityById(vi.cityId).name;
      var rel = Math.round(DL.Diplo.relation(state, vi.cityId));
      var offerRows = Object.keys(vi.stock || {}).map(function (gid) {
        var stock = DL.Market.tierStock(vi.stock[gid]);
        var out = '';
        for (var t = 1; t <= 3; t++) {
          if (stock[t] <= 0) continue;
          var p = DL.Market.visitorOfferPrice(state, vi, gid, t);
          out += '<tr><td>' + DL.Market.qualityName(t) + ' ' + DL.Market.qualityStars(t) + ' ' + DL.DATA.goodById(gid).name + '</td><td>' + fmt(Math.round(stock[t])) + '</td><td>' + fmt1(p) + 'G</td>' +
            '<td><button class="btn small ' + (closed ? 'disabled' : 'buy-btn') + '" data-vbuy="' + idx + '" data-good="' + gid + '" data-tier="' + t + '">买入</button></td></tr>';
        }
        return out;
      }).join('') || '<tr><td colspan="4" class="empty">没有现货</td></tr>';
      var wantRows = Object.keys(vi.wants || {}).map(function (gid) {
        var w = vi.wants[gid];
        var p = DL.Market.visitorBidPrice(state, vi, gid, w.tier);
        return '<tr><td>' + DL.Market.qualityName(w.tier) + ' ' + DL.DATA.goodById(gid).name + '</td><td>' + fmt(w.qty) + '</td><td class="sell">' + fmt1(p) + 'G</td>' +
          '<td><button class="btn small ' + (closed ? 'disabled' : 'sell-btn') + '" data-vsell="' + idx + '" data-good="' + gid + '" data-tier="' + w.tier + '">卖出</button></td></tr>';
      }).join('') || '<tr><td colspan="4" class="empty">暂无收购需求</td></tr>';
      return '<div class="cv-row"><div class="cv-head"><b>来自「' + cname + '」的商队</b><span class="cv-state">停留 ' + vi.daysLeft + ' 天</span><span class="cv-eta">关系 ' + rel + '</span></div>' +
        '<div class="sub-title">现货（购买可增进关系 +0.8）</div>' +
        '<div class="table-wrap"><table class="tbl"><thead><tr><th>商品</th><th>数量</th><th>单价</th><th>操作</th></tr></thead><tbody>' + offerRows + '</tbody></table></div>' +
        '<div class="sub-title">收购需求（出售可增进关系 +0.5）</div>' +
        '<div class="table-wrap"><table class="tbl"><thead><tr><th>商品</th><th>需要</th><th>出价</th><th>操作</th></tr></thead><tbody>' + wantRows + '</tbody></table></div>' +
        '</div>';
    }).join('') || '<div class="empty">暂无外地商队在镇——过几天就会有访客。</div>';

    // 居民需求与零售
    var unmetRows = DL.DATA.GOODS.filter(function (g) { return (state.market.unmetDemand[g.id] || 0) > 0; }).map(function (g) {
      var price = DL.Market.retailPrice(state, g.id);
      return '<tr><td>' + g.name + '</td><td class="red">' + fmt(Math.round(state.market.unmetDemand[g.id])) + '</td><td>' + fmt1(price) + 'G</td></tr>';
    }).join('') || '<tr><td colspan="3" class="empty">居民暂无缺货</td></tr>';
    var sat = Math.round(state.city.satisfaction || 70);
    var last = state.retailLast || {};
    var autoRetail = state.market.autoRetail;
    var autoPrice = state.retail.auto;
    var retailRows = DL.DATA.GOODS.filter(function (g) { return DL.DATA.RETAIL_DEMAND[g.id]; }).map(function (g) {
      var fair = DL.Market.fairPrice(state, g.id);
      var price = DL.Market.retailPrice(state, g.id);
      var cls = price > fair * 1.15 ? 'red' : (price < fair * 0.95 ? 'green' : '');
      return '<tr><td>' + g.name + '</td><td class="' + cls + '">' + fmt1(price) + 'G</td><td>' + fmt1(fair) + 'G</td>' +
        '<td><div class="stepper">' +
        '<button class="btn small ' + (autoPrice ? 'disabled' : '') + '" data-retail="-5" data-good="' + g.id + '">-5</button>' +
        '<button class="btn small ' + (autoPrice ? 'disabled' : '') + '" data-retail="-1" data-good="' + g.id + '">-</button>' +
        '<button class="btn small ' + (autoPrice ? 'disabled' : '') + '" data-retail="1" data-good="' + g.id + '">+</button>' +
        '<button class="btn small ' + (autoPrice ? 'disabled' : '') + '" data-retail="5" data-good="' + g.id + '">+5</button>' +
        '</div></td></tr>';
    }).join('');
    var supplyPct = last.totalDemand ? Math.round((last.backlog || last.unmet) / last.totalDemand * 100) : 0;
    return warn +
      priceChartSection() +
      saleBoardSection() +
      demandBoardSection() +
      '<div class="panel-title">本地市场流通 · 居民摊位（买入来源）</div>' +
      '<div class="note">摊位上的货属于本地居民，不属于商会；买入后进入你的仓库。</div>' +
      '<label class="auto-line"><input type="checkbox" id="suppress-sales" ' + (state.market.suppressResidentSales ? 'checked' : '') + '> 压制居民自主外销（居民不满：满意度每日-0.6；可让本地货更便宜）</label>' +
      '<div class="table-wrap"><table class="tbl"><thead><tr><th>商品</th><th>品质</th><th>库存</th><th>居民卖价</th><th>数量</th><th>操作</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
      '<div class="panel-title">外地商队在镇</div>' +
      visitors +
      '<div class="panel-title">居民需求 · 零售</div>' +
      '<div class="stat-row"><span class="stat-label">居民满意度</span><div class="bar"><div class="bar-fill" style="width:' + sat + '%;background:' + (sat >= 70 ? '#3f9d4a' : sat >= 40 ? '#d8a838' : '#c05a3a') + '"></div></div><span class="stat-val">' + sat + '</span></div>' +
      '<div class="note">居民先吃自家摊位存货，缺口成为「订单」；你可按自己定的零售价卖货补缺口（自动补货默认开启）。</div>' +
      '<label class="auto-line"><input type="checkbox" id="retail-auto" ' + (autoRetail ? 'checked' : '') + '> 自动从仓库补货</label>' +
      '<div class="table-wrap"><table class="tbl"><thead><tr><th>商品</th><th>缺口</th><th>零售价</th></tr></thead><tbody>' + unmetRows + '</tbody></table></div>' +
      '<div class="sub-title">零售定价</div>' +
      '<label class="auto-line"><input type="checkbox" id="retail-price-auto" ' + (autoPrice ? 'checked' : '') + '> 零售价自动跟随合理价</label>' +
      '<div class="table-wrap"><table class="tbl"><thead><tr><th>商品</th><th>零售价</th><th>合理价</th><th>调价</th></tr></thead><tbody>' + retailRows + '</tbody></table></div>' +
      (last.revenue ? '<div class="note">昨日零售收入 ' + fmtG(last.revenue) + '，缺货比例 ' + supplyPct + '%。</div>' : '');
  }

  function subWarehouse() {
    var whWeight = DL.Market.warehouseWeight(state);
    var whCap = DL.Market.warehouseCap(state);
    var rows = DL.DATA.GOODS.map(function (g) {
      var s = DL.Market.tierStock(state.warehouse[g.id]);
      var out = '';
      for (var t = 1; t <= 3; t++) {
        if (s[t] <= 0) continue;
        var retailP = DL.Market.retailPrice(state, g.id);
        out += '<tr><td>' + DL.Market.qualityName(t) + ' ' + DL.Market.qualityStars(t) + ' ' + g.name + '</td><td>' + fmt(s[t]) + '</td><td>' + fmt(s[t] * g.weight) + 'kg</td>' +
          '<td>' + fmt1(retailP) + 'G</td>' +
          '<td><button class="btn small sell-btn" data-rsell="' + g.id + '" data-tier="' + t + '">卖给居民</button>' +
          '<button class="btn small" data-load="' + g.id + '" data-tier="' + t + '">装车外销</button></td></tr>';
      }
      return out;
    }).join('') || '<tr><td colspan="5" class="empty">仓库空空如也——到「流通市场」买入，或派商队从外地进货。</td></tr>';
    return '<div class="panel-title">商会仓库（' + fmt(whWeight) + '/' + fmt(whCap) + 'kg）</div>' +
      '<div class="note">仓库里的货全部属于商会。去向：卖给本地居民（零售价）、卖给在镇外地商队（流通市场页）、装车随商队外销。</div>' +
      '<div class="kv"><span>仓库等级</span><b>Lv' + (state.player.warehouseLv || 0) + ' / 5</b></div>' +
      '<button class="btn" id="warehouse-up">升级仓库 +500kg（' + fmtG(300 + (state.player.warehouseLv || 0) * 200) + '）</button>' +
      '<div class="table-wrap"><table class="tbl"><thead><tr><th>商品</th><th>数量</th><th>重量</th><th>零售价</th><th>操作</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
  }

  function subDemand() {
    var intelNote = '情报来源：① 外地公布——各城「本周商路公告」每周更新，公开加价商品一目了然；② 打听——建造旅馆/豪华饭店/驿站可定期获取情报，外地商队抵达、商队归航也会带回该城情报，情报可揭示限时「采购大单」，按单供货可卖更高加价。';
    var cards = DL.DATA.CITIES.filter(function (c) { return c.id !== state.homeCityId; }).map(function (c) {
      var rel = Math.round(DL.Diplo.relation(state, c.id));
      var bull = DL.Market.bulletinItems(state, c.id);
      var pubRows = bull.map(function (b) {
        return '<tr><td>' + DL.DATA.goodById(b.goodId).name + '</td><td class="sell">×' + fmt1(b.mult) + '</td><td>' + (b.until - state.day) + '天</td></tr>';
      }).join('') || '<tr><td colspan="3" class="empty">本周暂无公告</td></tr>';
      var orderRows = '';
      if (DL.Market.hasIntel(state, c.id)) {
        var orders = state.market.orders[c.id] || [];
        orderRows = orders.map(function (o) {
          return '<tr><td>' + DL.Market.qualityName(o.tier) + ' ' + DL.DATA.goodById(o.goodId).name + '</td><td>' + fmt(o.qty) + '</td><td class="sell">×' + fmt1(o.mult) + '</td><td>' + (o.until - state.day) + '天</td></tr>';
        }).join('') || '<tr><td colspan="4" class="empty">该城暂无限时采购单</td></tr>';
      } else {
        orderRows = '<tr><td colspan="4" class="empty">情报不明——建造旅馆/豪华饭店，或派商队前往打听</td></tr>';
      }
      return '<div class="cv-row" id="demand-city-' + c.id + '"><div class="cv-head"><b>' + c.name + '</b><span class="cv-state">关系 ' + rel + '</span><button class="btn small" data-cv-dest="' + c.id + '">派商队</button></div>' +
        '<div class="sub-title">公布需求（本周商路公告 · 每周更新）</div>' +
        '<div class="table-wrap"><table class="tbl"><thead><tr><th>商品</th><th>加价</th><th>剩余</th></tr></thead><tbody>' + pubRows + '</tbody></table></div>' +
        '<div class="sub-title">打听情报（限时采购大单）</div>' +
        '<div class="table-wrap"><table class="tbl"><thead><tr><th>商品</th><th>需要量</th><th>加价</th><th>剩余</th></tr></thead><tbody>' + orderRows + '</tbody></table></div>' +
        '</div>';
    }).join('');
    return '<div class="panel-title">外地需求</div>' +
      '<div class="note">' + intelNote + '</div>' +
      cards;
  }

  function tabCaravan() {
    var paths = {};
    DL.DATA.CITIES.forEach(function (c) {
      if (c.id === state.homeCityId) return;
      var p = DL.Caravans.findPath(state, state.homeCityId, c.id);
      paths[c.id] = p;
    });
    var destOpts = DL.DATA.CITIES.filter(function (c) { return c.id !== state.homeCityId; }).map(function (c) {
      var p = paths[c.id];
      var label = c.name + (p ? '（约' + Math.ceil(p.totalDays) + '天）' : '（当前无通路）');
      return '<option value="' + c.id + '"' + (caravanForm.dest === c.id ? ' selected' : '') + (p ? '' : ' disabled') + '>' + label + '</option>';
    }).join('');
    var leaderOpts = state.fleet.units.map(function (u) {
      var l = DL.DATA.leaderById(u.leaderId);
      var busy = DL.Caravans.leaderBusy(state, u.leaderId);
      return '<option value="' + u.leaderId + '"' + (caravanForm.leader === u.leaderId ? ' selected' : '') + (busy ? ' disabled' : '') + '>' + l.name + '（' + l.desc + '）' + (busy ? '·途中' : '') + '</option>';
    }).join('');
    var cargoRows = DL.DATA.GOODS.map(function (g) {
      var s = DL.Market.tierStock(state.warehouse[g.id]);
      var out = '';
      for (var t = 1; t <= 3; t++) {
        var have = s[t];
        if (have <= 0) continue;
        var load = (caravanForm.load[g.id] || {})[t] || 0;
        out += '<tr><td>' + DL.Market.qualityName(t) + ' ' + DL.Market.qualityStars(t) + ' ' + g.name + '</td><td>' + fmt(have) + '</td><td>' + g.weight + 'kg</td>' +
          '<td><div class="stepper"><button data-cload="-1" data-good="' + g.id + '" data-tier="' + t + '">-</button><span>' + load + '</span><button data-cload="1" data-good="' + g.id + '" data-tier="' + t + '">+</button><button data-cload="max" data-good="' + g.id + '" data-tier="' + t + '">最大</button></div></td></tr>';
      }
      return out;
    }).join('') || '<tr><td colspan="4" class="empty">仓库无货，请先到市场买入</td></tr>';
    var loadWeight = 0;
    Object.keys(caravanForm.load).forEach(function (gid) {
      Object.keys(caravanForm.load[gid]).forEach(function (t) {
        loadWeight += (caravanForm.load[gid][t] || 0) * DL.DATA.goodById(gid).weight;
      });
    });
    var activeRows = state.caravans.filter(function (cv) { return !cv.done; }).map(function (cv) {
      var leader = DL.DATA.leaderById(cv.leaderId);
      var leg = cv.legs[cv.legIdx];
      var eta = Math.max(0, Math.ceil((cv.legs.length - cv.legIdx - 1) + (leg.days - cv.progress)));
      var cargoTxt = DL.Caravans.cargoSummary(cv.cargo);
      return '<div class="cv-row"><div class="cv-head"><b>' + leader.name + '</b><span class="cv-state">' + (cv.state === 'outbound' ? '去程 → ' + DL.DATA.cityById(cv.destCityId).name : '回程 ← ' + DL.DATA.cityById(cv.destCityId).name) + '</span><span class="cv-eta">约 ' + eta + ' 天</span></div><div class="cv-cargo">' + cargoTxt + '</div></div>';
    }).join('') || '<div class="empty">暂无在途商队</div>';
    return '<div class="panel-title">派出商队</div>' +
      '<div class="form-row"><label>目的地</label><select id="cv-dest">' + destOpts + '</select></div>' +
      '<div class="form-row"><label>负责人</label><select id="cv-leader">' + leaderOpts + '</select></div>' +
      '<div class="form-row"><label>回程策略</label><select id="cv-strategy"><option value="auto"' + (caravanForm.strategy === 'auto' ? ' selected' : '') + '>自动采购最佳回货</option><option value="empty"' + (caravanForm.strategy === 'empty' ? ' selected' : '') + '>空载返回</option></select></div>' +
      guardRow() +
      '<div class="sub-title">装载货物（' + fmt(loadWeight) + '/' + state.player.wagonKg + 'kg）</div>' +
      '<div class="table-wrap"><table class="tbl"><thead><tr><th>商品</th><th>库存</th><th>重量</th><th>装载</th></tr></thead><tbody>' + cargoRows + '</tbody></table></div>' +
      '<button class="btn primary" id="cv-send">出发</button>' +
      '<div class="sub-title">在途商队</div>' + activeRows +
      '<div class="sub-title">车队管理</div>' +
      '<div class="kv"><span>在编商队</span><b>' + state.fleet.units.length + ' / ' + DL.Caravans.fleetMax(state) + '</b></div>' +
      '<div class="kv"><span>每日维护费</span><b>' + fmtG(DL.Caravans.unitMaintenance(state) * state.caravans.length) + '（仅在途，每队 ' + fmt1(DL.Caravans.unitMaintenance(state)) + 'G）</b></div>' +
      '<div class="kv"><span>当前载重</span><b>' + state.player.wagonKg + 'kg</b></div>' +
      '<div class="kv"><span>商队速度加成</span><b>+' + Math.round((state.player.speedLevel || 0) * 10) + '%</b></div>' +
      '<div class="note">上限来源：本城名册 + 商会大厅/驿站等级 + 繁荣度70/90 + 商队牌照。</div>' +
      '<button class="btn" id="recruit-unit">招募新商队（400G）</button>' +
      (function () {
        var nr = DL.Caravans.nextRecruit(state);
        return nr ? '<div class="note">下一位可招募：' + nr.name + '</div>' : '<div class="note">可招募的人手都用完了。</div>';
      })() +
      '<button class="btn" id="wagon-up">升级车队（+50kg · 速度+10%）</button>';
  }

  function guardRow() {
    if (!state.bandits || !state.bandits.enabled) return '';
    var hired = state.guild.hired ? DL.DATA.adventurerById(state.guild.hired) : null;
    var label = hired ? ('雇佣 ' + hired.name + ' 护卫（' + fmtG(DL.Adventurers.costOf(state, hired)) + '）') : '公会未聘请冒险者（先到「公会」页聘请）';
    return '<div class="form-row"><label>护卫</label><label class="auto-line"><input type="checkbox" id="cv-guard" ' + (hired ? '' : 'disabled') + (caravanForm.guard ? ' checked' : '') + '> ' + label + '</label></div>';
  }

  function tabProduction() {
    DL.Production.ensureSlots(state);
    var lv = DL.City.buildingLevel(state, 'workshop');
    var slots = state.workshops || [];
    var cards = slots.map(function (slot) {
      var recipe = slot.recipeId ? DL.DATA.recipeById(slot.recipeId) : null;
      var opts = DL.DATA.RECIPES.map(function (r) {
        return '<option value="' + r.id + '"' + (slot.recipeId === r.id ? ' selected' : '') + '>' + r.name + '</option>';
      }).join('');
      var batchInfo = '';
      if (recipe) {
        var pct = Math.min(100, Math.round(slot.progress / recipe.days * 100));
        var tierOpts = [1, 2, 3].map(function (t) {
          return '<option value="' + t + '"' + ((slot.inputTier || 1) === t ? ' selected' : '') + '>' + DL.Market.qualityName(t) + '</option>';
        }).join('');
        batchInfo = '<div class="bar"><div class="bar-fill" style="width:' + pct + '%;background:#8a6b2f"></div></div>' +
          '<div class="b-meta">产出：' + DL.Market.qualityName(slot.inputTier || 1) + recipe.name + ' · 进度 ' + fmt1(slot.progress) + '/' + recipe.days + '天 · ' + (slot.paused ? '已暂停' : '开工率 ' + slot.rate + '%') + '</div>' +
          '<div class="form-row"><label>原料品质</label><select data-prod-tier="' + slot.id + '">' + tierOpts + '</select></div>' +
          (slot.waitMsg ? '<div class="ship-info">' + slot.waitMsg + '</div>' : '');
      }
      return '<div class="cv-row"><div class="cv-head"><b>工坊 #' + slot.id + '</b><span class="cv-state">' + (recipe ? recipe.name : '未设置配方') + '</span></div>' +
        '<div class="form-row"><label>配方</label><select data-prod-recipe="' + slot.id + '">' + opts + '</select></div>' +
        batchInfo +
        (recipe ? '<div class="form-row"><label>开工率</label><input type="range" min="0" max="100" step="10" value="' + slot.rate + '" data-prod-rate="' + slot.id + '"></div>' +
          '<button class="btn small" data-prod-pause="' + slot.id + '">' + (slot.paused ? '恢复' : '暂停') + '</button>' : '') +
        '</div>';
    }).join('') || '<div class="empty">尚未建造生产工坊——到「建造」页开工吧（最多3座）</div>';
    var recipes = DL.DATA.RECIPES.map(function (r) {
      var inputTxt = Object.keys(r.input).map(function (gid) { return r.input[gid] + ' ' + DL.DATA.goodById(gid).name; }).join(' + ');
      var outputTxt = Object.keys(r.output).map(function (gid) { return r.output[gid] + ' ' + DL.DATA.goodById(gid).name; }).join(' + ');
      var out = Object.keys(r.output)[0];
      var homeSell = state.prices[state.homeCityId][out].sell;
      var bestCity = null, bestSell = homeSell;
      DL.DATA.CITIES.forEach(function (c) {
        if (c.id === state.homeCityId) return;
        var p = state.prices[c.id][out].sell;
        if (p > bestSell) { bestSell = p; bestCity = c.id; }
      });
      return '<div class="cv-row"><div class="cv-head"><b>' + r.name + '</b><span class="cv-state">' + inputTxt + ' → ' + outputTxt + '（' + r.days + '天/批）</span></div>' +
        '<div class="cv-cargo">本城卖 ' + fmt1(homeSell) + 'G' + (bestCity ? ' · 最高外销 ' + fmt1(bestSell) + 'G（' + DL.DATA.cityById(bestCity).name + '）' : '') + '</div></div>';
    }).join('');
    var fixedB = ['brewery', 'winery', 'weavery', 'bakery'];
    var fixedHtml = fixedB.map(function (bid) {
      if (DL.City.buildingLevel(state, bid) <= 0) return '';
      var st = (state.productionStatus && state.productionStatus[bid]) || '待产';
      return '<div class="log-line">' + DL.DATA.buildingById(bid).name + '：' + st + '</div>';
    }).join('');
    var shopB = ['pub', 'clothshop', 'pastry'];
    var shopHtml = shopB.map(function (bid) {
      if (DL.City.buildingLevel(state, bid) <= 0) return '';
      var st = (state.shopStatus && state.shopStatus[bid]) || '待产';
      return '<div class="log-line">' + DL.DATA.buildingById(bid).name + '：' + st + '</div>';
    }).join('');
    return '<div class="panel-title">生产工坊（' + slots.length + '/' + lv + ' · 每日维护 ' + fmtG(lv * 3) + '）</div>' +
      '<div class="note">原料从仓库消耗（可经商队、外地商队或求购进口）；成品品质 = 原料品质。根据行情切换配方、调节开工率或暂停。</div>' +
      cards +
      '<div class="panel-title">生产建筑与商店（今日状态）</div>' +
      (fixedHtml + shopHtml || '<div class="empty">尚未建造生产建筑或商店</div>') +
      '<div class="panel-title">配方与行情</div>' + recipes;
  }

  function tabGuild() {
    if (!state.bandits || !state.bandits.enabled) {
      return '<div class="panel-title">冒险者公会</div><div class="note">本局未启用强盗，公会暂时歇业——强盗只在开局勾选的对局中出现。</div>';
    }
    var cityName = DL.DATA.cityById(state.homeCityId).name;
    var roster = DL.DATA.adventurersFor(state.homeCityId);
    var cards = roster.map(function (a) {
      var hired = state.guild.hired === a.id;
      var lv = DL.Adventurers.levelOf(state, a.id);
      var xp = DL.Adventurers.xpOf(state, a.id);
      var power = DL.Adventurers.powerOf(state, a);
      var cost = DL.Adventurers.costOf(state, a);
      var next = lv < DL.Adventurers.MAX_LEVEL ? DL.Adventurers.XP_THRESHOLDS[lv] : null;
      var xpPct = next ? Math.min(100, Math.round(xp / next * 100)) : 100;
      return '<div class="b-card"><div class="b-name">' + a.name + '</div>' +
        '<div class="b-desc">' + a.desc + ' · 战力 ' + power + '</div>' +
        '<div class="bar"><div class="bar-fill" style="width:' + xpPct + '%;background:#c9643a"></div></div>' +
        '<div class="b-meta">Lv' + lv + ' · XP ' + xp + (next ? '/' + next : '') + ' · 护卫一趟 ' + fmtG(cost) + '</div>' +
        '<button class="btn small ' + (hired ? 'primary' : '') + '" data-hire="' + a.id + '">' + (hired ? '当前护卫' : '聘请为护卫') + '</button></div>';
    }).join('');
    var routeOpts = DL.DATA.ROUTES.filter(function (r) {
      var br = state.bandits.routes[r.id];
      return br && br.danger > 0;
    }).map(function (r) {
      var br = state.bandits.routes[r.id];
      return '<option value="' + r.id + '">' + r.name + '（危险度 ' + Math.round(br.danger) + ' · 剿灭 ' + fmtG(Math.round(br.danger * 3)) + 'G）</option>';
    }).join('');
    var m = state.guild.missions || { guardTrips: 0, cleared: 0, discovered: 0 };
    var mDays = Math.max(0, (state.guild.missionDay || state.day) - state.day);
    var isCoastal = DL.DATA.cityById(state.homeCityId).flags.indexOf('coastal') !== -1;
    var seaRoutes = DL.DATA.ROUTES.filter(function (r) {
      return r.type === 'water' && state.pirates && state.pirates.routes[r.id] && state.pirates.routes[r.id].danger > 0;
    });
    var seaOpts = seaRoutes.map(function (r) {
      var pr = state.pirates.routes[r.id];
      return '<option value="' + r.id + '">' + r.name + '（海盗活跃度 ' + Math.round(pr.danger) + ' · 清剿 ' + fmtG(Math.round(pr.danger * 3)) + 'G）</option>';
    }).join('');
    return '<div class="panel-title">冒险者名册 · ' + cityName + '</div>' +
      '<div class="note">聘请护卫后，派商队时勾选「雇佣护卫」即可随队保护；护卫可在遭遇强盗时击退他们，减少损失。</div>' +
      '<div class="b-grid">' + cards + '</div>' +
      '<div class="panel-title">公会委托（每周）</div>' +
      '<div class="kv"><span>护卫商队</span><b>' + m.guardTrips + '/2</b></div>' +
      '<div class="kv"><span>剿灭强盗</span><b>' + m.cleared + '/1</b></div>' +
      '<div class="kv"><span>刷新倒计时</span><b>' + mDays + ' 天</b></div>' +
      '<div class="note">完成委托：全员冒险者 +3XP，商会 +80G。</div>' +
      '<div class="panel-title">剿灭强盗</div>' +
      '<div class="form-row"><label>路线</label><select id="guild-route">' + routeOpts + '</select></div>' +
      '<button class="btn primary" id="guild-clear">剿灭所选路线（60天安全）</button>' +
      '<div class="note">剿灭费用约为危险度×3金；清剿后该路线 60 天内强盗绝迹，之后会慢慢卷土重来。</div>' +
      '<div class="panel-title">海防（海盗）</div>' +
      (isCoastal
        ? '<div class="form-row"><label>航线</label><select id="pirate-route">' + seaOpts + '</select></div><button class="btn primary" id="pirate-clear">雇佣海军清剿（60天安全）</button>'
        : '<div class="note">非沿海城市无法雇佣海军——到港口城市发展后回来看看吧。</div>') +
      '<div class="note">海路商队可能遭遇海盗；建造「护航船队」可降低遭遇率，并在遭遇时击退海盗。</div>';
  }

  function tabCompany() {
    var cityName = DL.DATA.cityById(state.homeCityId).name;
    var ownedRows = Object.keys(state.companies).filter(function (id) { return state.companies[id].owned > 0; }).map(function (id) {
      var co = state.companies[id];
      var payout = (co.policy === 'div' && co.policyUntil > state.day) ? 0.7 : ((co.policy === 'grow' && co.policyUntil > state.day) ? 0.35 : 0.5);
      var div = co.profit * payout * co.owned / co.total;
      var policyTxt = co.policy && co.policyUntil > state.day ? (co.policy === 'grow' ? '扩张' : co.policy === 'div' ? '高分红' : '稳健') : '—';
      return '<tr><td>' + DL.Companies.companyName(state, id) + (co.controlled ? ' 👑' : '') + '</td><td>' + fmt(co.owned) + '/' + fmt(co.total) + '股</td><td>' + fmt1(co.price) + 'G</td><td class="green">' + fmt1(div) + 'G/天</td><td>' + policyTxt + '</td>' +
        '<td><button class="btn small" data-csell="' + id + '" data-n="1">卖1</button><button class="btn small" data-csell="' + id + '" data-n="10">卖10</button></td></tr>';
    }).join('') || '<tr><td colspan="6" class="empty">尚未持股——到下方投资列表买入</td></tr>';
    var all = Object.keys(state.companies).map(function (id) { return state.companies[id]; });
    all.sort(function (a, b) { return b.profit - a.profit; });
    var invRows = all.map(function (co) {
      var div = co.profit / co.total;
      var typeLabel = co.type === 'shipping' ? '航运' : '特产·' + DL.DATA.goodById(co.goodId).name;
      var policyTxt = co.policy && co.policyUntil > state.day ? (co.policy === 'grow' ? '扩张' : co.policy === 'div' ? '高分红' : '稳健') : '—';
      var acts = '<button class="btn small buy-btn" data-cbuy="' + co.id + '" data-n="1">买1</button><button class="btn small buy-btn" data-cbuy="' + co.id + '" data-n="10">买10</button>';
      if (co.owned > 0 && co.owned / co.total >= 0.10) acts += '<button class="btn small" data-cboard="' + co.id + '">董事会</button>';
      if (co.owned > 0 && co.owned / co.total >= 0.30) acts += '<button class="btn small" data-cissue="' + co.id + '">增发</button>';
      if (co.owned > 0 && co.owned / co.total >= 0.51 && !co.controlled) acts += '<button class="btn small" data-ctake="' + co.id + '">收购</button>';
      return '<tr><td>' + DL.Companies.companyName(state, co.id) + (co.controlled ? ' 👑' : '') + '</td><td>' + DL.DATA.cityById(co.cityId).name + '</td><td>' + typeLabel + '</td><td>' + fmt1(co.price) + 'G</td><td class="green">' + fmt1(div) + 'G/股/天</td><td>' + policyTxt + '</td><td>' + acts + '</td></tr>';
    }).join('');
    var foundable = DL.DATA.GOODS.filter(function (g) { return DL.Companies.canFound(state, g.id).ok; });
    var foundOpts = foundable.map(function (g) { return '<option value="' + g.id + '">' + g.name + '</option>'; }).join('');
    return '<div class="panel-title">我的持股 · ' + cityName + '</div>' +
      '<div class="table-wrap"><table class="tbl"><thead><tr><th>公司</th><th>持股</th><th>股价</th><th>日分红</th><th>方针</th><th>操作</th></tr></thead><tbody>' + ownedRows + '</tbody></table></div>' +
      '<div class="panel-title">投资机会（全大陆）</div>' +
      '<div class="note">股价随公司真实经营浮动（每股盈利驱动）；持股 ≥10% 可召开董事会定方针，≥30% 可提议增发，≥51% 可溢价收购控股（利润 +30%）。</div>' +
      '<div class="table-wrap"><table class="tbl"><thead><tr><th>公司</th><th>城市</th><th>类型</th><th>股价</th><th>每股盈利/天</th><th>方针</th><th>操作</th></tr></thead><tbody>' + invRows + '</tbody></table></div>' +
      '<div class="panel-title">在本城开设新公司（300G，赠40股）</div>' +
      (foundOpts ? '<div class="form-row"><label>商品</label><select id="found-good">' + foundOpts + '</select></div><button class="btn primary" id="found-btn">开设公司</button>' : '<div class="note">本城可产的商品都已有人开设公司。</div>');
  }

  function tabSites() {
    var exps = state.expeditions || [];
    var expHtml = exps.map(function (e) {
      return '<div class="cv-row"><div class="cv-head"><b>探险队 #' + e.id + '</b><span class="cv-eta">剩 ' + e.daysLeft + ' 天</span></div></div>';
    }).join('') || '<div class="empty">没有在外的探险队</div>';
    var undisc = DL.Sites.undiscovered(state).length;
    var rows = DL.DATA.SITES.map(function (s) {
      var disc = DL.Sites.discovered(state, s.id);
      var lv = DL.Sites.siteLevel(state, s.id);
      var income = lv ? DL.Sites.dailyIncome(state, s.id) : 0;
      var upkeep = lv ? DL.Sites.dailyUpkeep(state, s.id) : 0;
      var cost = DL.Sites.investCost(state, s.id);
      var chk = DL.Sites.canInvest(state, s.id);
      var status = !disc ? '未发现' : (lv > 0 ? '已开发 Lv' + lv : '已发现 · 待开发');
      return '<div class="cv-row"><div class="cv-head"><b>' + s.name + '</b><span class="cv-state">' + status + '</span></div>' +
        '<div class="cv-cargo">' + s.desc + (lv > 0 ? ' · 门票约 ' + fmt1(income) + 'G/天 · 维护 ' + fmt1(upkeep) + 'G/天' : '') + '</div>' +
        (disc && lv < 3 ? '<button class="btn small ' + (chk.ok ? 'primary' : 'disabled') + '" data-site-invest="' + s.id + '"' + (chk.ok ? '' : ' title="' + chk.msg + '"') + '>投资开发（' + fmtG(cost) + '）</button>' : '') +
        '</div>';
    }).join('');
    return '<div class="panel-title">名胜古迹 · 探险队</div>' +
      '<div class="note">派探险队寻找失落的名胜（200G，6天，约四成把握）；发现后才能投资开发、收门票，也要付维护费。</div>' +
      '<button class="btn primary" id="expedition-send">派出探险队（200G）</button>' +
      '<div class="sub-title">在外的探险队（' + exps.length + '/2）</div>' + expHtml +
      '<div class="sub-title">名胜清单（未发现 ' + undisc + ' 处）</div>' + rows;
  }

  function codexBar(label, done, total) {
    var pct = total ? Math.round(done / total * 100) : 0;
    return '<div class="stat-row"><span class="stat-label">' + label + '</span><div class="bar"><div class="bar-fill" style="width:' + pct + '%;background:#5d8f4f"></div></div><span class="stat-val">' + done + '/' + total + '</span></div>';
  }

  function tabAchieve() {
    var acc = (state.achievements && state.achievements.unlocked) || {};
    var cards = DL.Achievements.list().map(function (a) {
      var done = !!acc[a.id];
      return '<div class="b-card' + (done ? ' ach-done' : '') + '"><div class="b-name">' + a.name + (done ? ' ✓' : '') + '</div><div class="b-desc">' + a.desc + '</div><div class="b-meta">奖励 ' + fmtG(a.reward) + (done ? ' · 第' + acc[a.id] + '天达成' : '') + '</div></div>';
    }).join('');
    var cx = state.codex || {};
    var cityD = Object.keys(cx.cities || {}).length, cityN = DL.DATA.CITIES.length;
    var goodD = Object.keys(cx.goods || {}).length, goodN = DL.DATA.GOODS.length;
    var routeD = Object.keys(cx.routes || {}).length, routeN = DL.DATA.ROUTES.length;
    var siteD = state.sitesDiscovered ? Object.keys(state.sitesDiscovered).length : 0, siteN = DL.DATA.SITES.length;
    var cityChips = DL.DATA.CITIES.map(function (c) {
      return '<span class="codex-chip' + (cx.cities[c.id] ? ' on' : '') + '">' + c.name + '</span>';
    }).join('');
    var goodChips = DL.DATA.GOODS.map(function (g) {
      return '<span class="codex-chip' + (cx.goods[g.id] ? ' on' : '') + '">' + g.name + '</span>';
    }).join('');
    return '<div class="panel-title">成就（' + Object.keys(acc).length + '/' + DL.Achievements.list().length + '）</div>' +
      '<div class="b-grid">' + cards + '</div>' +
      '<div class="panel-title">商路图鉴</div>' +
      codexBar('城市', cityD, cityN) + codexBar('商品', goodD, goodN) + codexBar('商路', routeD, routeN) + codexBar('名胜', siteD, siteN) +
      '<div class="sub-title">到访城市（' + cityD + '/' + cityN + '）</div><div class="codex-chips">' + cityChips + '</div>' +
      '<div class="sub-title">经手商品（' + goodD + '/' + goodN + '）</div><div class="codex-chips">' + goodChips + '</div>';
  }

  function rankingTable() {
    var list = DL.Rivals.ranking(state);
    var rows = list.map(function (r, i) {
      return '<tr class="' + (r.isPlayer ? 'rank-player' : '') + '"><td>' + (i + 1) + '</td><td>' + r.name + '</td><td>' + fmt(r.score) + '</td></tr>';
    }).join('');
    return '<div class="panel-title">商会排行榜</div>' +
      '<div class="table-wrap"><table class="tbl"><thead><tr><th>排名</th><th>商会</th><th>分数</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
      '<div class="note">分数 = 累计贸易额 + 金库/10 + 设施×300 + 名胜×150。</div>';
  }

  function tabBuild() {
    var queue = state.city.construction.map(function (c) {
      var b = DL.DATA.buildingById(c.id);
      return '<div class="cv-row"><div class="cv-head"><b>' + b.name + ' Lv' + c.level + '</b><span class="cv-eta">剩 ' + c.daysLeft + ' 天</span></div></div>';
    }).join('') || '<div class="empty">没有正在施工的设施</div>';
    var cards = DL.DATA.BUILDINGS.map(function (b) {
      var lv = DL.City.buildingLevel(state, b.id);
      var cost = DL.City.buildCost(state, b);
      var days = DL.City.buildDays(state, b);
      var chk = DL.City.canBuild(state, b);
      var status = lv > 0 ? '（已建 Lv' + lv + '）' : '';
      var shipInfo = '';
      if (b.id === 'shipping' && lv > 0 && state.shipping.last) {
        shipInfo = '<div class="ship-info">近30天海路使用 ' + state.shipping.last.uses + ' 次 · 日收入 ' + fmt1(state.shipping.last.income) + 'G · 维护 ' + fmt1(state.shipping.last.upkeep) + 'G</div>';
      }
      return '<div class="b-card">' +
        '<div class="b-name">' + b.name + status + '</div>' +
        '<div class="b-desc">' + b.desc + '</div>' +
        '<div class="b-meta">' + fmtG(cost) + ' · ' + days + '天</div>' +
        shipInfo +
        '<button class="btn small ' + (chk.ok ? 'primary' : 'disabled') + '" data-build="' + b.id + '"' + (chk.ok ? '' : ' title="' + chk.msg + '"') + '>' + (lv > 0 ? '升级' : '建造') + '</button>' +
        '</div>';
    }).join('');
    return '<div class="panel-title">施工中</div>' + queue +
      '<div class="panel-title">可建造设施</div>' +
      '<div class="b-grid">' + cards + '</div>';
  }

  function tabDiplo() {
    var cities = DL.DATA.CITIES.filter(function (c) { return c.id !== state.homeCityId; });
    if (!diploTarget || !DL.DATA.cityById(diploTarget)) diploTarget = cities[0].id;
    var target = diploTarget;
    var tc = DL.DATA.cityById(target);
    var tst = state.cities[target];
    var rel = DL.Diplo.relation(state, target);
    var relColor = rel >= 60 ? '#3f9d4a' : (rel >= 20 ? '#d8a838' : (rel >= 0 ? '#b0a080' : '#c05a3a'));
    var actions = [
      { id: 'gift', name: '赠送礼物', cost: '100G', desc: '关系 +8' },
      { id: 'trade', name: '签署互惠通商协议', cost: '300G', desc: '双方买卖优惠10%（永久）' },
      { id: 'guard', name: '派遣商路护卫', cost: '50G', desc: '通往该城破损降0，30天' },
      { id: 'festival', name: '联合举办节庆', cost: '200G', desc: '双方旅游+5，15天' },
      { id: 'artisan', name: '派遣技术工匠', cost: '150G', desc: '对方产业+10%，获50G酬金' },
      { id: 'aid', name: '紧急粮食援助', cost: '30袋面粉', desc: '对方信用+10，关系+5' }
    ];
    var actionBtns = actions.map(function (a) {
      var err = DL.Diplo.canAction(state, target, a.id);
      return '<div class="act-row">' +
        '<div><b>' + a.name + '</b><div class="act-desc">' + a.desc + '</div></div>' +
        '<div class="act-cost">' + a.cost + '</div>' +
        '<button class="btn small ' + (err ? 'disabled' : 'primary') + '" data-diplo="' + a.id + '"' + (err ? ' title="' + err + '"' : '') + '>执行</button>' +
        '</div>';
    }).join('');
    var treaties = state.diplo.treaties.filter(function (t) { return t.until === null || t.until > state.day; }).map(function (t) {
      var names = { trade: '通商协议', guard: '商路护卫', festival: '联合节庆', artisan: '技术工匠', aid: '粮食援助' };
      return '<span class="treaty-chip">' + DL.DATA.cityById(t.cityId).name + '·' + names[t.kind] + (t.until ? '（' + (t.until - state.day) + '天）' : '') + '</span>';
    }).join('') || '暂无生效条约';
    var optHtml = cities.map(function (c) {
      return '<option value="' + c.id + '"' + (c.id === target ? ' selected' : '') + '>' + c.name + '</option>';
    }).join('');
    return '<div class="panel-title">外交对象</div>' +
      '<select id="diplo-target">' + optHtml + '</select>' +
      '<div class="diplo-city">' + tc.name + ' · ' + DL.DATA.nationById(tc.nation).name + '</div>' +
      '<div class="diplo-stats">人口 ' + fmt(tst.pop) + ' · 繁荣 ' + fmt(tst.prosperity) + ' · 信用 ' + fmt(tst.credit) + '</div>' +
      '<div class="rel-bar"><span style="width:' + (rel + 100) / 2 + '%;background:' + relColor + '"></span></div>' +
      '<div class="rel-val">关系值 ' + fmt(rel) + '（每季度自然衰减约2点）</div>' +
      '<div class="panel-title">外交行动</div>' + actionBtns +
      '<div class="panel-title">生效条约</div><div class="treaties">' + treaties + '</div>';
  }

  function tabFinance() {
    var f = state.finance;
    var home = state.cities[state.homeCityId];
    var rateLabel = home.credit >= 80 ? '10%' : (home.credit >= 60 ? '15%' : (home.credit >= 40 ? '20%' : '无法贷款'));
    var canLoan = home.credit >= 40;
    var canBank = DL.City.buildingLevel(state, 'bank') > 0;
    var curRows = Object.keys(DL.DATA.CURRENCIES).map(function (code) {
      var cur = DL.DATA.CURRENCIES[code];
      var rate = f.rates[code];
      var held = f.currency[code] || 0;
      return '<tr><td>' + cur.name + '</td><td>' + DL.DATA.nationById(cur.nation).short + '</td><td>' + fmt1(rate) + '</td><td>' + fmt(held) + '</td>' +
        '<td><button class="btn small ' + (canBank ? 'buy-btn' : 'disabled') + '" data-cur-buy="' + code + '">换入</button><button class="btn small ' + (canBank ? 'sell-btn' : 'disabled') + '" data-cur-sell="' + code + '">换出</button></td></tr>';
    }).join('');
    var bills = f.bills.map(function (b) {
      return '<div class="log-line">汇票 ' + fmtG(b.amount) + ' · ' + (b.dueDay - state.day) + '天后到期</div>';
    }).join('') || '无';
    var loans = f.loans.map(function (l, i) {
      return '<div class="log-line">贷款 ' + fmtG(l.amount) + ' · 年利率 ' + Math.round(l.rate * 100) + '% <button class="btn small" data-loan-repay="' + i + '">偿还</button></div>';
    }).join('') || '无';
    return '<div class="panel-title">金库与债务</div>' +
      '<div class="kv"><span>现金</span><b>' + fmtG(f.treasury) + '</b></div>' +
      '<div class="kv"><span>债务（日息 ' + fmt1(state.player.dailyInterest != null ? state.player.dailyInterest : DL.DATA.DEBT_DAILY_INTEREST) + 'G）</span><b class="red">' + fmtG(state.player.debt) + '</b></div>' +
      '<button class="btn ' + (state.player.debt > 0 ? 'primary' : 'disabled') + '" id="repay">偿还全部债务</button>' +
      '<div class="kv"><span>国际银团贷款利率</span><b>' + rateLabel + '</b></div>' +
      '<button class="btn ' + (canLoan ? '' : 'disabled') + '" id="borrow">借款 2000G</button>' +
      '<button class="btn ' + (canBank ? '' : 'disabled') + '" id="bill">发行汇票 500G（30天期）</button>' +
      '<div class="sub-title">贷款</div>' + loans +
      '<div class="sub-title">汇票</div>' + bills +
      '<div class="panel-title">税率（5%~15%）</div>' +
      '<div class="alloc-head"><span>当前税率</span><b>' + Math.round(f.taxRate * 100) + '%</b></div>' +
      '<input type="range" min="5" max="15" step="1" value="' + Math.round(f.taxRate * 100) + '" id="tax-slider">' +
      '<div class="note">税率高→财政收入多，但人口增速与满意度下降；低税率则相反。</div>' +
      '<div class="panel-title">货币兑换' + (canBank ? '' : '（需建造银行分行）') + '</div>' +
      '<div class="table-wrap"><table class="tbl"><thead><tr><th>货币</th><th>发行国</th><th>1单位兑金币</th><th>持有</th><th>操作</th></tr></thead><tbody>' + curRows + '</tbody></table></div>' +
      '<div class="panel-title">商队牌照</div>' +
      '<div class="kv"><span>主线胜利凭证</span><b>' + (state.player.license ? '已购买' : fmtG(DL.DATA.LICENSE_COST)) + '</b></div>' +
      '<button class="btn ' + (state.player.license ? 'disabled' : (state.player.debt <= 0 && f.treasury >= DL.DATA.LICENSE_COST ? 'primary' : 'disabled')) + '" id="license" title="需还清债务且现金充足">购买牌照</button>';
  }

  function tabStats() {
    if (state.flags && state.flags.noWin) {
      return '<div class="panel-title">统计</div>' +
        '<div class="warn">当前为自由经营模式：未启用胜利条件与十年期限，可以一直经营下去。</div>' +
        rankingTable() +
        '<div class="sub-title">商会业绩</div>' +
        '<div class="kv"><span>累计贸易额</span><b>' + fmtG(state.player.tradeVolume) + '</b></div>' +
        '<div class="kv"><span>商队出发次数</span><b>' + fmt(state.stats.trips) + '</b></div>' +
        '<div class="kv"><span>建成设施</span><b>' + fmt(state.stats.buildingsBuilt) + '</b></div>' +
        '<div class="kv"><span>签署条约</span><b>' + fmt(state.stats.treatiesSigned) + '</b></div>' +
        '<div class="kv"><span>最高繁荣度</span><b>' + fmt(state.stats.maxProsperity) + '</b></div>' +
        '<div class="kv"><span>居民满意度</span><b>' + fmt(state.city.satisfaction || 70) + '</b></div>' +
        '<div class="panel-title">存档</div>' +
        '<div class="row2"><button class="btn" id="btn-export">导出存档</button><button class="btn" id="btn-import">导入存档</button></div>' +
        '<input type="file" id="save-file" accept=".json" class="hidden-input">' +
        '<div class="panel-title">商路日志</div>' +
        '<div class="log-box tall">' + state.log.slice().reverse().map(function (l) {
          return '<div class="log-line"><span class="log-day">D' + l.day + '</span>' + l.text + '</div>';
        }).join('') + '</div>';
    }
    var wins = [
      { id: 'economic', name: '经济胜利', prog: state.player.tradeVolumeYear || 0, target: DL.DATA.WIN_TRADE_VOLUME, unit: 'G', desc: '年度贸易总额突破10万G' },
      { id: 'cultural', name: '文化胜利', prog: Math.min(state.cities[state.homeCityId].prosperity, state.cities[state.homeCityId].tourism), target: 100, unit: '', desc: '繁荣度与旅游吸引力双满' },
      { id: 'diplomatic', name: '外交胜利', prog: 0, target: 100, unit: '', desc: '与所有城市通商且关系≥60' },
      { id: 'hegemony', name: '霸主胜利（隐藏）', prog: state.hegemonicDays, target: 60, unit: '天', desc: '持银行分行且连续60日信用最高' },
      { id: 'main', name: '主线胜利', prog: 0, target: 100, unit: '', desc: '还清贷款 + 存款5000 + 购牌照' }
    ];
    // 外交胜利进度
    var all = DL.DATA.CITIES.filter(function (c) { return c.id !== state.homeCityId; });
    var treatyCount = all.filter(function (c) { return DL.Diplo.hasTreaty(state, c.id, 'trade'); }).length;
    var relOk = all.filter(function (c) { return DL.Diplo.relation(state, c.id) >= 60; }).length;
    wins[2].prog = Math.round((treatyCount + relOk) / (all.length * 2) * 100);
    wins[4].prog = Math.round((state.player.debt <= 0 ? 34 : 0) + (state.finance.treasury >= DL.DATA.WIN_SAVINGS ? 33 : 0) + (state.player.license ? 33 : 0));
    var winRows = wins.map(function (w) {
      var pct = Math.max(0, Math.min(100, w.prog / w.target * 100));
      return '<div class="stat-row"><span class="stat-label">' + w.name + '</span><div class="bar"><div class="bar-fill" style="width:' + pct + '%;background:#3f9d9a"></div></div><span class="stat-val">' + fmt(w.prog) + (w.unit ? w.unit : '') + '/' + fmt(w.target) + w.unit + '</span></div><div class="win-desc">' + w.desc + '</div>';
    }).join('');
    var achieved = state.wins.map(function (w) { return '· ' + w.type + '（第' + w.day + '天达成）'; }).join('<br>') || '暂无';
    var daysLeft = Math.max(0, DL.DATA.GAME_YEARS * DL.DATA.DAYS_PER_YEAR - state.day);
    return rankingTable() +
      '<div class="panel-title">胜利条件</div>' + winRows +
      '<div class="sub-title">已达成</div><div class="note">' + achieved + '</div>' +
      '<div class="panel-title">商会业绩</div>' +
      '<div class="kv"><span>累计贸易额</span><b>' + fmtG(state.player.tradeVolume) + '</b></div>' +
      '<div class="kv"><span>商队出发次数</span><b>' + fmt(state.stats.trips) + '</b></div>' +
      '<div class="kv"><span>建成设施</span><b>' + fmt(state.stats.buildingsBuilt) + '</b></div>' +
      '<div class="kv"><span>签署条约</span><b>' + fmt(state.stats.treatiesSigned) + '</b></div>' +
      '<div class="kv"><span>最高繁荣度</span><b>' + fmt(state.stats.maxProsperity) + '</b></div>' +
      '<div class="kv"><span>剩余时间</span><b>' + daysLeft + ' 天</b></div>' +
      '<div class="panel-title">存档</div>' +
      '<div class="row2">' +
      '<button class="btn" id="btn-export">导出存档</button>' +
      '<button class="btn" id="btn-import">导入存档</button>' +
      '</div>' +
      '<input type="file" id="save-file" accept=".json" class="hidden-input">' +
      '<div class="panel-title">商路日志</div>' +
      '<div class="log-box tall">' + state.log.slice().reverse().map(function (l) {
        return '<div class="log-line"><span class="log-day">D' + l.day + '</span>' + l.text + '</div>';
      }).join('') + '</div>';
  }

  function bindTabActions() {
    // 产业滑块
    document.querySelectorAll('[data-alloc]').forEach(function (inp) {
      inp.onchange = function () {
        var id = inp.getAttribute('data-alloc');
        var val = parseInt(inp.value, 10);
        var others = ['agri', 'craft', 'mining'].filter(function (x) { return x !== id; });
        var otherSum = state.city.alloc[others[0]] + state.city.alloc[others[1]];
        var over = val + otherSum - 100;
        if (over > 0) {
          var a = state.city.alloc[others[0]], b = state.city.alloc[others[1]];
          var scale = (100 - val) / (a + b || 1);
          state.city.alloc[others[0]] = Math.round(a * scale);
          state.city.alloc[others[1]] = 100 - val - state.city.alloc[others[0]];
        }
        state.city.alloc[id] = val;
        render();
      };
    });
    // 税率
    var tax = document.getElementById('tax-slider');
    if (tax) tax.onchange = function () { state.finance.taxRate = parseInt(tax.value, 10) / 100; render(); };
    // 市场数量与买卖
    document.querySelectorAll('[data-step]').forEach(function (b) {
      b.onclick = function () {
        var gid = b.getAttribute('data-good');
        var d = parseInt(b.getAttribute('data-step'), 10);
        qty[gid] = Math.max(1, (qty[gid] || 1) + d);
        render();
      };
    });
    // 流通市场：居民摊位买入
    document.querySelectorAll('[data-rbuy-tier]').forEach(function (b) {
      b.onchange = function () {
        var gid = b.getAttribute('data-rbuy-tier');
        buyTier[gid] = parseInt(b.value, 10);
        render();
      };
    });
    document.querySelectorAll('[data-rbuy]').forEach(function (b) {
      b.onclick = function () {
        var gid = b.getAttribute('data-rbuy');
        var tier = parseInt(b.getAttribute('data-tier') || '0', 10) || undefined;
        var q = qty[gid] || 1;
        var r = DL.Market.buy(state, gid, q, tier);
        toast(r.msg, r.ok);
        render();
      };
    });
    // 流通市场：外地商队现货买入 / 需求出售
    document.querySelectorAll('[data-vbuy]').forEach(function (b) {
      b.onclick = function () {
        var vi = parseInt(b.getAttribute('data-vbuy'), 10);
        var gid = b.getAttribute('data-good');
        var tier = parseInt(b.getAttribute('data-tier'), 10);
        var q = qty[gid] || 1;
        var r = DL.Market.buyFromVisitor(state, vi, gid, q, tier);
        toast(r.msg, r.ok);
        render();
      };
    });
    document.querySelectorAll('[data-vsell]').forEach(function (b) {
      b.onclick = function () {
        var vi = parseInt(b.getAttribute('data-vsell'), 10);
        var gid = b.getAttribute('data-good');
        var tier = parseInt(b.getAttribute('data-tier'), 10);
        var q = qty[gid] || 1;
        var r = DL.Market.sellToVisitor(state, vi, gid, q, tier);
        toast(r.msg, r.ok);
        render();
      };
    });
    // 仓库：卖给居民
    document.querySelectorAll('[data-rsell]').forEach(function (b) {
      b.onclick = function () {
        var gid = b.getAttribute('data-rsell');
        var tier = parseInt(b.getAttribute('data-tier') || '1', 10);
        var q = qty[gid] || 1;
        var r = DL.Market.sell(state, gid, q, tier);
        toast(r.msg, r.ok);
        render();
      };
    });
    // 仓库：装车外销
    document.querySelectorAll('[data-load]').forEach(function (b) {
      b.onclick = function () {
        var gid = b.getAttribute('data-load');
        var tier = parseInt(b.getAttribute('data-tier'), 10);
        var have = DL.Market.warehouseQty(state, gid, tier);
        caravanForm.load[gid] = caravanForm.load[gid] || {};
        caravanForm.load[gid][tier] = have;
        curTab = 'caravan';
        render();
      };
    });
    // 外地需求：快速派商队
    document.querySelectorAll('[data-cv-dest]').forEach(function (b) {
      b.onclick = function () {
        caravanForm.dest = b.getAttribute('data-cv-dest');
        curTab = 'caravan';
        render();
      };
    });
    // 市场子标签
    document.querySelectorAll('[data-subtab]').forEach(function (b) {
      b.onclick = function () {
        marketSub = b.getAttribute('data-subtab');
        forceScrollTop = true;
        render();
      };
    });
    // 自动补货与零售定价
    var retailAuto = document.getElementById('retail-auto');
    if (retailAuto) retailAuto.onchange = function () {
      state.market.autoRetail = retailAuto.checked;
      render();
    };
    var retailPriceAuto = document.getElementById('retail-price-auto');
    if (retailPriceAuto) retailPriceAuto.onchange = function () {
      state.retail.auto = retailPriceAuto.checked;
      render();
    };
    document.querySelectorAll('[data-retail]').forEach(function (b) {
      b.onclick = function () {
        if (state.retail.auto) return;
        var gid = b.getAttribute('data-good');
        var d = parseInt(b.getAttribute('data-retail'), 10);
        DL.Market.setRetailPrice(state, gid, d);
        render();
      };
    });
    // 求购公告
    var suppressSales = document.getElementById('suppress-sales');
    if (suppressSales) suppressSales.onchange = function () {
      state.market.suppressResidentSales = suppressSales.checked;
      render();
    };
    var demandGood = document.getElementById('demand-good');
    if (demandGood) demandGood.onchange = function () {
      demandForm.goodId = demandGood.value;
      demandForm.price = null;
      render();
    };
    var demandTier = document.getElementById('demand-tier');
    if (demandTier) demandTier.onchange = function () {
      demandForm.tier = parseInt(demandTier.value, 10);
      render();
    };
    document.querySelectorAll('[data-demand-price]').forEach(function (b) {
      b.onclick = function () {
        var d = parseInt(b.getAttribute('data-demand-price'), 10);
        var base = demandForm.price || DL.Market.fairPrice(state, demandForm.goodId);
        demandForm.price = Math.max(1, Math.round((base + d) * 100) / 100);
        render();
      };
    });
    var demandPub = document.getElementById('demand-publish');
    if (demandPub) demandPub.onclick = function () {
      var gid = demandForm.goodId;
      var q = qty[gid] || 1;
      var price = demandForm.price || DL.Market.fairPrice(state, gid);
      var r = DL.Market.publishDemand(state, gid, q, price, demandForm.tier || 1);
      toast(r.msg, r.ok);
      render();
    };
    document.querySelectorAll('[data-demand-rm]').forEach(function (b) {
      b.onclick = function () {
        var r = DL.Market.removeDemand(state, parseInt(b.getAttribute('data-demand-rm'), 10));
        toast(r.msg, r.ok);
        render();
      };
    });
    // 出售公告
    var saleGood = document.getElementById('sale-good');
    if (saleGood) saleGood.onchange = function () {
      saleForm.goodId = saleGood.value;
      saleForm.price = null;
      render();
    };
    document.querySelectorAll('[data-sale-price]').forEach(function (b) {
      b.onclick = function () {
        var d = parseInt(b.getAttribute('data-sale-price'), 10);
        var gid = saleForm.goodId || 'flour';
        var base = saleForm.price || DL.Market.fairPrice(state, gid);
        saleForm.price = Math.max(1, Math.round((base + d) * 100) / 100);
        render();
      };
    });
    var salePub = document.getElementById('sale-publish');
    if (salePub) salePub.onclick = function () {
      var gid = saleForm.goodId;
      if (!gid) {
        var sg = document.getElementById('sale-good');
        gid = sg ? sg.value : 'flour';
      }
      var q = qty[gid] || 1;
      var price = saleForm.price || DL.Market.fairPrice(state, gid);
      var r = DL.Market.publishSaleAd(state, gid, q, price);
      toast(r.msg, r.ok);
      render();
    };
    document.querySelectorAll('[data-sale-rm]').forEach(function (b) {
      b.onclick = function () {
        var r = DL.Market.removeSaleAd(state, parseInt(b.getAttribute('data-sale-rm'), 10));
        toast(r.msg, r.ok);
        render();
      };
    });
    // 节日活动
    document.querySelectorAll('[data-fest-act]').forEach(function (b) {
      b.onclick = function () {
        state.festivalForm.qty = qty[state.festivalForm.goodId] || 1;
        var r = DL.Festivals.run(state, b.getAttribute('data-fest-act'));
        toast(r.msg, r.ok);
        render();
      };
    });
    document.querySelectorAll('[data-fest-good]').forEach(function (b) {
      b.onchange = function () { state.festivalForm.goodId = b.value; render(); };
    });
    document.querySelectorAll('[data-fest-tier]').forEach(function (b) {
      b.onchange = function () { state.festivalForm.tier = parseInt(b.value, 10); render(); };
    });
    document.querySelectorAll('[data-fest-city]').forEach(function (b) {
      b.onchange = function () { state.festivalForm.city = b.value; render(); };
    });
    // 生产工坊
    document.querySelectorAll('[data-prod-recipe]').forEach(function (b) {
      b.onchange = function () {
        var r = DL.Production.changeRecipe(state, parseInt(b.getAttribute('data-prod-recipe'), 10), b.value || null);
        toast(r.msg, r.ok);
        render();
      };
    });
    document.querySelectorAll('[data-prod-tier]').forEach(function (b) {
      b.onchange = function () {
        var r = DL.Production.setInputTier(state, parseInt(b.getAttribute('data-prod-tier'), 10), parseInt(b.value, 10));
        toast(r.msg, r.ok);
        render();
      };
    });
    document.querySelectorAll('[data-prod-rate]').forEach(function (b) {
      b.onchange = function () {
        DL.Production.setRate(state, parseInt(b.getAttribute('data-prod-rate'), 10), parseInt(b.value, 10));
        render();
      };
    });
    document.querySelectorAll('[data-prod-pause]').forEach(function (b) {
      b.onclick = function () {
        var r = DL.Production.togglePause(state, parseInt(b.getAttribute('data-prod-pause'), 10));
        toast(r.msg, r.ok);
        render();
      };
    });
    // 商队
    var dest = document.getElementById('cv-dest');
    if (dest) dest.onchange = function () { caravanForm.dest = dest.value; render(); };
    var leader = document.getElementById('cv-leader');
    if (leader) leader.onchange = function () { caravanForm.leader = leader.value; render(); };
    var strat = document.getElementById('cv-strategy');
    if (strat) strat.onchange = function () { caravanForm.strategy = strat.value; render(); };
    document.querySelectorAll('[data-cload]').forEach(function (b) {
      b.onclick = function () {
        var gid = b.getAttribute('data-good');
        var tier = parseInt(b.getAttribute('data-tier') || '1', 10);
        var op = b.getAttribute('data-cload');
        var have = DL.Market.tierStock(state.warehouse[gid])[tier];
        caravanForm.load[gid] = caravanForm.load[gid] || {};
        var cur = caravanForm.load[gid][tier] || 0;
        if (op === 'max') caravanForm.load[gid][tier] = have;
        else caravanForm.load[gid][tier] = Math.max(0, Math.min(have, cur + parseInt(op, 10)));
        render();
      };
    });
    var send = document.getElementById('cv-send');
    if (send) send.onclick = function () {
      var d = caravanForm.dest || (document.getElementById('cv-dest') || {}).value;
      var l = caravanForm.leader || (document.getElementById('cv-leader') || {}).value;
      if (!d || !l) { toast('请选择目的地与负责人', false); return; }
      var load = {};
      Object.keys(caravanForm.load).forEach(function (gid) {
        Object.keys(caravanForm.load[gid]).forEach(function (t) {
          if (caravanForm.load[gid][t] > 0) {
            load[gid] = load[gid] || {};
            load[gid][t] = caravanForm.load[gid][t];
          }
        });
      });
      var guardEl = document.getElementById('cv-guard');
      var guardId = (guardEl && guardEl.checked && state.guild.hired) ? state.guild.hired : null;
      var r = DL.Caravans.send(state, d, l, load, caravanForm.strategy, guardId);
      toast(r.msg, r.ok);
      if (r.ok) {
        caravanForm.load = {};
        caravanForm.leader = null;
        caravanForm.guard = false;
        DL.State.tutorialComplete(state, 1);
      }
      render();
    };
    var cvGuard = document.getElementById('cv-guard');
    if (cvGuard) cvGuard.onchange = function () { caravanForm.guard = cvGuard.checked; render(); };
    var wagon = document.getElementById('wagon-up');
    if (wagon) wagon.onclick = function () {
      var r = DL.Caravans.upgradeWagon(state);
      toast(r.msg, r.ok);
      render();
    };
    var recruitBtn = document.getElementById('recruit-unit');
    if (recruitBtn) recruitBtn.onclick = function () {
      var r = DL.Caravans.recruitUnit(state);
      toast(r.msg, r.ok);
      render();
    };
    var whUp = document.getElementById('warehouse-up');
    if (whUp) whUp.onclick = function () {
      var r = DL.Market.upgradeWarehouse(state);
      toast(r.msg, r.ok);
      render();
    };
    // 公会：聘请护卫 / 剿灭强盗
    document.querySelectorAll('[data-hire]').forEach(function (b) {
      b.onclick = function () {
        state.guild.hired = state.guild.hired === b.getAttribute('data-hire') ? null : b.getAttribute('data-hire');
        render();
      };
    });
    var guildClear = document.getElementById('guild-clear');
    if (guildClear) guildClear.onclick = function () {
      var rid = document.getElementById('guild-route').value;
      var br = state.bandits.routes[rid];
      if (!br || br.danger <= 0) { toast('该路线暂无强盗', false); return; }
      var cost = Math.round(br.danger * 3);
      if (state.finance.treasury < cost) { toast('金币不足', false); return; }
      state.finance.treasury -= cost;
      br.danger = 0;
      br.clearedUntil = state.day + 60;
      state.banditsCleared = (state.banditsCleared || 0) + 1;
      DL.Adventurers.missionClear(state);
      DL.State.log(state, '出资 ' + cost + 'G 剿灭「' + DL.DATA.routeById(rid).name + '」上的强盗，60天内安全。');
      toast('已清剿，60天内安全', true);
      render();
    };
    var pirateClear = document.getElementById('pirate-clear');
    if (pirateClear) pirateClear.onclick = function () {
      var rid = document.getElementById('pirate-route').value;
      var r = DL.Travel.clearPirates(state, rid);
      toast(r.msg, r.ok);
      render();
    };
    // 公司：买卖股份 / 开设新公司
    document.querySelectorAll('[data-cbuy]').forEach(function (b) {
      b.onclick = function () {
        var n = parseInt(b.getAttribute('data-n'), 10);
        var r = DL.Companies.buyShares(state, b.getAttribute('data-cbuy'), n);
        toast(r.msg, r.ok);
        render();
      };
    });
    document.querySelectorAll('[data-csell]').forEach(function (b) {
      b.onclick = function () {
        var n = parseInt(b.getAttribute('data-n'), 10);
        var r = DL.Companies.sellShares(state, b.getAttribute('data-csell'), n);
        toast(r.msg, r.ok);
        render();
      };
    });
    var foundBtn = document.getElementById('found-btn');
    if (foundBtn) foundBtn.onclick = function () {
      var gid = document.getElementById('found-good').value;
      var r = DL.Companies.foundCompany(state, gid);
      toast(r.msg, r.ok);
      render();
    };
    // 公司深化：董事会 / 增发 / 收购
    document.querySelectorAll('[data-cboard]').forEach(function (b) {
      b.onclick = function () { showBoardVote(b.getAttribute('data-cboard')); };
    });
    document.querySelectorAll('[data-cissue]').forEach(function (b) {
      b.onclick = function () {
        var r = DL.Companies.issueShares(state, b.getAttribute('data-cissue'));
        toast(r.msg, r.ok);
        render();
      };
    });
    document.querySelectorAll('[data-ctake]').forEach(function (b) {
      b.onclick = function () {
        var r = DL.Companies.takeover(state, b.getAttribute('data-ctake'));
        toast(r.msg, r.ok);
        render();
      };
    });
    // 价格走势图
    var chartSel = document.getElementById('chart-good');
    if (chartSel) chartSel.onchange = function () {
      chartGoodId = chartSel.value;
      render();
    };
    var priceChart = document.getElementById('price-chart');
    if (priceChart) drawPriceChart(priceChart, DL.Market.priceSeries(state, state.homeCityId, chartGoodId || 'flour'));
    // 名胜：探险队与投资
    var expSend = document.getElementById('expedition-send');
    if (expSend) expSend.onclick = function () {
      var r = DL.Sites.sendExpedition(state);
      toast(r.msg, r.ok);
      render();
    };
    document.querySelectorAll('[data-site-invest]').forEach(function (b) {
      b.onclick = function () {
        var r = DL.Sites.invest(state, b.getAttribute('data-site-invest'));
        toast(r.msg, r.ok);
        render();
      };
    });
    // 建造
    document.querySelectorAll('[data-build]').forEach(function (b) {
      b.onclick = function () {
        var r = DL.City.startBuild(state, b.getAttribute('data-build'));
        toast(r.msg, r.ok);
        render();
      };
    });
    // 外交
    var dt = document.getElementById('diplo-target');
    if (dt) dt.onchange = function () { diploTarget = dt.value; render(); };
    document.querySelectorAll('[data-diplo]').forEach(function (b) {
      b.onclick = function () {
        var r = DL.Diplo.doAction(state, diploTarget, b.getAttribute('data-diplo'));
        toast(r.msg, r.ok);
        if (r.ok && b.getAttribute('data-diplo') === 'trade') state.stats.treatiesSigned++;
        render();
      };
    });
    // 财政
    var repay = document.getElementById('repay');
    if (repay) repay.onclick = function () {
      var loanTotal = state.finance.loans.reduce(function (a, l) { return a + l.amount; }, 0);
      var total = state.player.debt + loanTotal;
      if (total > 0 && state.finance.treasury >= total) {
        state.finance.treasury -= total;
        state.player.debt = 0;
        state.finance.loans = [];
        DL.State.log(state, '还清全部债务与贷款！商会再无负担。');
        toast('债务已还清！', true);
        DL.State.checkEnd(state);
      } else {
        toast(total === 0 ? '没有债务' : '金币不足以偿还全部债务', false);
      }
      render();
    };
    document.querySelectorAll('[data-loan-repay]').forEach(function (b) {
      b.onclick = function () {
        var i = parseInt(b.getAttribute('data-loan-repay'), 10);
        var l = state.finance.loans[i];
        if (!l) return;
        var pay = Math.min(l.amount, state.finance.treasury);
        if (pay <= 0) { toast('金币不足', false); return; }
        state.finance.treasury -= pay;
        l.amount -= pay;
        if (l.amount <= 0) state.finance.loans.splice(i, 1);
        DL.State.log(state, '偿还贷款 ' + fmtG(pay) + '。');
        toast('已偿还 ' + fmtG(pay));
        render();
      };
    });
    var borrow = document.getElementById('borrow');
    if (borrow) borrow.onclick = function () {
      var home = state.cities[state.homeCityId];
      if (home.credit < 40) { toast('信用不足，无法贷款', false); return; }
      var rate = home.credit >= 80 ? 0.10 : (home.credit >= 60 ? 0.15 : 0.20);
      state.finance.loans.push({ amount: 2000, rate: rate });
      state.finance.treasury += 2000;
      DL.State.log(state, '向国际银团借款 2000G，年利率 ' + Math.round(rate * 100) + '%。');
      toast('已借款 2000G');
      render();
    };
    var bill = document.getElementById('bill');
    if (bill) bill.onclick = function () {
      if (!DL.City.buildingLevel(state, 'bank')) { toast('需要银行分行', false); return; }
      state.finance.bills.push({ amount: 500, dueDay: state.day + 30, penalty: 3 });
      state.finance.treasury += 500;
      DL.State.log(state, '发行汇票 500G（30天期），到期计入债务。');
      toast('已发行汇票');
      render();
    };
    document.querySelectorAll('[data-cur-buy]').forEach(function (b) {
      b.onclick = function () {
        var code = b.getAttribute('data-cur-buy');
        var rate = state.finance.rates[code];
        var need = 100;
        if (state.finance.treasury < need) { toast('金币不足', false); return; }
        state.finance.treasury -= need;
        state.finance.currency[code] += need * rate * 0.99;
        toast('已兑换 ' + DL.DATA.currencyName(code));
        render();
      };
    });
    document.querySelectorAll('[data-cur-sell]').forEach(function (b) {
      b.onclick = function () {
        var code = b.getAttribute('data-cur-sell');
        var rate = state.finance.rates[code];
        var have = state.finance.currency[code];
        if (have < 10) { toast('持有量不足', false); return; }
        var amount = 100;
        var use = Math.min(have, amount);
        state.finance.currency[code] -= use;
        state.finance.treasury += use / rate * 0.99;
        toast('已兑回金币');
        render();
      };
    });
    var license = document.getElementById('license');
    if (license) license.onclick = function () {
      if (state.player.debt > 0) { toast('需先还清债务', false); return; }
      if (state.finance.treasury < DL.DATA.LICENSE_COST) { toast('金币不足', false); return; }
      state.finance.treasury -= DL.DATA.LICENSE_COST;
      state.player.license = true;
      DL.State.log(state, '购得商队牌照，主线胜利条件达成其一！');
      toast('商队牌照到手！', true);
      DL.State.checkEnd(state);
      render();
    };
    // 存档导出导入
    var ex = document.getElementById('btn-export');
    if (ex) ex.onclick = function () {
      var blob = new Blob([DL.State.exportSave(state)], { type: 'application/json' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'dawnlands_save_' + state.day + '.json';
      a.click();
      URL.revokeObjectURL(a.href);
    };
    var im = document.getElementById('btn-import');
    if (im) im.onclick = function () { document.getElementById('save-file').click(); };
    var sf = document.getElementById('save-file');
    if (sf) sf.onchange = function () {
      var file = sf.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () {
        try {
          state = DL.State.importSave(reader.result);
          setState(state);
          DL.Map.setGame(state);
          DL.State.save(state);
          render();
          toast('存档已导入', true);
        } catch (e) {
          toast('存档无效', false);
        }
      };
      reader.readAsText(file);
    };
  }

  /* ---------- 弹窗与提示 ---------- */
  function modal(html) {
    var root = document.getElementById('modal-root');
    root.innerHTML = '<div class="modal-mask"><div class="modal">' + html + '</div></div>';
    DL.I18N.localizeDom(root);
  }

  function closeModal() {
    document.getElementById('modal-root').innerHTML = '';
  }

  function confirmModal(text, onYes) {
    modal('<div class="modal-title">确认</div><div class="modal-text">' + text + '</div>' +
      '<div class="modal-btns"><button class="btn primary" id="m-yes">确定</button><button class="btn" id="m-no">取消</button></div>');
    document.getElementById('m-yes').onclick = function () { closeModal(); onYes(); };
    document.getElementById('m-no').onclick = closeModal;
  }

  function showSaveLoadModal(mode) {
    var slots = DL.State.slots();
    var rows = slots.map(function (s) {
      var m = s.meta;
      var info = m ? ('第' + m.year + '年 · 第' + m.day + '天 · ' + m.homeCity + ' · 金库 ' + fmtG(m.treasury) + (m.ended ? ' · ' + m.ended : '')) : '空档';
      var btn = mode === 'save'
        ? '<button class="btn primary" data-slot-save="' + s.slot + '">存入</button>'
        : (m ? '<button class="btn primary" data-slot-load="' + s.slot + '">读取</button>' : '<span class="empty">（空）</span>');
      return '<div class="cv-row"><div class="cv-head"><b>存档 ' + (s.slot + 1) + '</b><span class="cv-state">' + info + '</span></div><div class="modal-btns">' + btn + '</div></div>';
    }).join('');
    modal('<div class="modal-title">' + (mode === 'save' ? '保存进度' : '读取进度') + '</div>' +
      '<div class="modal-text">共 3 个存档位，自动存档写入当前选中的档位。</div>' +
      rows +
      '<div class="modal-btns"><button class="btn" id="m-close">关闭</button></div>');
    document.querySelectorAll('[data-slot-save]').forEach(function (b) {
      b.onclick = function () {
        var slot = parseInt(b.getAttribute('data-slot-save'), 10);
        state.saveSlot = slot;
        DL.State.save(state, slot);
        closeModal();
        toast('已存入存档 ' + (slot + 1), true);
      };
    });
    document.querySelectorAll('[data-slot-load]').forEach(function (b) {
      b.onclick = function () {
        var slot = parseInt(b.getAttribute('data-slot-load'), 10);
        var s = DL.State.load(slot);
        if (!s) { toast('该存档位是空的', false); return; }
        state = s;
        closeModal();
        DL.Map.setGame(state);
        render();
        toast('已读取存档 ' + (slot + 1), true);
      };
    });
    var c = document.getElementById('m-close');
    if (c) c.onclick = closeModal;
  }

  function showRoadStop(d) {
    var g = DL.DATA.goodById(d.goodId);
    var city = DL.DATA.cityById(d.cityId);
    var gain = Math.round(d.qty * d.price);
    modal('<div class="modal-title">🛒 路边交易 · ' + city.name + '</div>' +
      '<div class="modal-text">商队途经' + city.name + '，路边商贩愿以 <b>' + fmt1(d.price) + 'G</b> 收购车上的 ' + d.qty + ' ' + DL.Market.qualityName(d.tier) + g.name + '（约 ' + fmtG(gain) + '，回程结算）。卖不卖？</div>' +
      '<div class="ev-choices">' +
      '<button class="btn ev-btn" id="rs-sell">卖出（+约' + fmtG(gain) + '）</button>' +
      '<button class="btn ev-btn" id="rs-pass">不卖，继续赶路</button>' +
      '</div>');
    document.getElementById('rs-sell').onclick = function () {
      DL.Caravans.resolveRoadStop(state, d.id, 'sell');
      closeModal();
      render();
    };
    document.getElementById('rs-pass').onclick = function () {
      DL.Caravans.resolveRoadStop(state, d.id, 'pass');
      closeModal();
      render();
    };
  }

  function showBoardVote(coId) {
    var name = DL.Companies.companyName(state, coId);
    modal('<div class="modal-title">董事会 · ' + name + '</div>' +
      '<div class="modal-text">选择未来 15 天的经营方针（每 15 天可调整一次）。</div>' +
      '<div class="ev-choices">' +
      '<button class="btn ev-btn" data-cvote="grow">扩张经营<span class="ev-hint">利润 +15%，分红降至 35%</span></button>' +
      '<button class="btn ev-btn" data-cvote="div">提高分红<span class="ev-hint">利润 -10%，分红升至 70%</span></button>' +
      '<button class="btn ev-btn" data-cvote="neutral">稳健经营<span class="ev-hint">维持 50% 分红</span></button>' +
      '</div>');
    document.querySelectorAll('[data-cvote]').forEach(function (b) {
      b.onclick = function () {
        var r = DL.Companies.boardVote(state, coId, b.getAttribute('data-cvote'));
        toast(r.msg, r.ok);
        closeModal();
        render();
      };
    });
  }

  function recapHtml() {
    var s = state;
    var ib = s.stats.incomeBy || {}, eb = s.stats.expenseBy || {};
    var incomeNames = { tax: '税收', tour: '旅游', toll: '过路费', inn: '旅栈', retail: '零售', dividend: '股份分红', shipping: '航运', site: '名胜门票', luxury: '奢侈品' };
    var expenseNames = { buildings: '设施维护', interest: '债务利息', fleet: '商队维护', production: '生产维护', shipping: '船只维护', site: '名胜维护' };
    function rows(map, dict) {
      return Object.keys(map).map(function (k) {
        return '<div class="kv"><span>' + (dict[k] || k) + '</span><b>' + fmtG(map[k]) + '</b></div>';
      }).join('') || '<div class="note">暂无</div>';
    }
    return '<div class="panel-title">经营复盘</div>' +
      '<div class="sub-title">累计收入</div>' + rows(ib, incomeNames) +
      '<div class="sub-title">累计支出</div>' + rows(eb, expenseNames) +
      '<div class="kv"><span>单日最高收入</span><b>' + fmtG(s.stats.bestDayIncome) + '</b></div>' +
      '<div class="kv"><span>经历随机事件</span><b>' + fmt(s.stats.eventsSeen) + ' 次</b></div>' +
      '<div class="kv"><span>累计贸易额</span><b>' + fmtG(s.player.tradeVolume) + '</b></div>' +
      '<div class="kv"><span>商队出发</span><b>' + fmt(s.stats.trips) + ' 次</b></div>' +
      '<div class="kv"><span>建成设施</span><b>' + fmt(s.stats.buildingsBuilt) + ' 座</b></div>' +
      '<div class="kv"><span>签订条约</span><b>' + fmt(s.stats.treatiesSigned) + ' 份</b></div>';
  }

  function showNewGame() {
    var cards = DL.DATA.NATIONS.map(function (n) {
      var list = DL.DATA.CITIES.filter(function (c) { return c.nation === n.id; });
      var group = list.map(function (c) {
        var st = c.init;
        var spec = (c.specialties || []).map(function (gid) {
          var t = (c.quality && c.quality[gid]) ? c.quality[gid] : 2;
          return DL.Market.qualityName(t) + DL.DATA.goodById(gid).name;
        }).join('、') || '—';
        return '<button class="city-card" data-start="' + c.id + '" style="border-left:5px solid ' + n.color + '">' +
          '<div class="cc-name">' + c.name + '</div>' +
          '<div class="cc-nation">' + n.name + '</div>' +
          '<div class="cc-stats">人口 ' + st.pop + ' · 繁荣 ' + st.prosperity + '<br>信用 ' + st.credit + ' · 交通 ' + st.connectivity + '</div>' +
          '<div class="cc-spec">特产：' + spec + '</div>' +
          '</button>';
      }).join('');
      return '<div class="nation-group"><div class="nation-head" style="color:' + n.color + '">' + n.name + '</div><div class="city-grid">' + group + '</div></div>';
    }).join('');
    modal('<div class="modal-title">选择商会大本营</div>' +
      '<div class="modal-text">曦光之地六国二十二城，加上海外新大陆苍澜洲七城，各有禀赋。你将从一座城市起步，经营十年，让它成为大陆最繁荣的商都。</div>' +
      '<div class="opt-row diff-row"><span>语言 / Language：</span>' +
      '<button class="btn small" data-lang-select="zh">中文</button>' +
      '<button class="btn small" data-lang-select="en">English</button></div>' +
      '<div class="opt-row"><label><input type="checkbox" id="opt-win" checked> 启用胜利条件与十年期限（关闭后为自由沙盒经营）</label></div>' +
      '<div class="opt-row"><label><input type="checkbox" id="opt-bandit" checked> 启用强盗（商队可能遭遇劫掠；可在冒险者公会聘请护卫或剿灭强盗）</label></div>' +
      '<div class="opt-row diff-row"><span>开局难度：</span>' +
      '<label class="diff-opt"><input type="radio" name="opt-diff" id="opt-diff-easy" value="easy"> 简单（1500G / 债5000G）</label>' +
      '<label class="diff-opt"><input type="radio" name="opt-diff" id="opt-diff-normal" value="normal" checked> 普通（800G / 债10000G）</label>' +
      '<label class="diff-opt"><input type="radio" name="opt-diff" id="opt-diff-hard" value="hard"> 困难（200G / 债15000G）</label></div>' +
      '<div class="nation-groups">' + cards + '</div>' +
      '<div class="modal-btns"><button class="btn" id="m-cancel">取消</button></div>');
    document.querySelectorAll('[data-start]').forEach(function (b) {
      b.onclick = function () {
        var noWin = !document.getElementById('opt-win').checked;
        var bandits = document.getElementById('opt-bandit').checked;
        var difficulty = 'normal';
        if (document.getElementById('opt-diff-easy') && document.getElementById('opt-diff-easy').checked) difficulty = 'easy';
        else if (document.getElementById('opt-diff-hard') && document.getElementById('opt-diff-hard').checked) difficulty = 'hard';
        state = DL.State.newGame(b.getAttribute('data-start'), { noWin: noWin, bandits: bandits, difficulty: difficulty });
        afterNewGame();
      };
    });
    document.querySelectorAll('[data-lang-select]').forEach(function (b) {
      b.onclick = function () {
        DL.I18N.setLang(b.getAttribute('data-lang-select'));
        showNewGame();
      };
    });
    var cancel = document.getElementById('m-cancel');
    if (cancel) cancel.onclick = closeModal;
  }

  function afterNewGame() {
    closeModal();
    setState(state);
    DL.Map.setGame(state);
    DL.State.save(state);
    caravanForm = { dest: null, leader: null, strategy: 'auto', load: {} };
    curTab = 'overview';
    render();
    toast('商会成立！先从市场行情看起吧。', true);
  }

  function showCityCard(cityId) {
    var c = DL.DATA.cityById(cityId);
    var st = state.cities[cityId];
    var n = DL.DATA.nationById(c.nation);
    var rel = DL.Diplo.relation(state, cityId);
    var spec = (c.specialties || []).map(function (gid) { return DL.DATA.goodById(gid).name; }).join('、') || '—';
    var chartGoodIdForCity = (c.specialties && c.specialties[0]) || 'flour';
    // 该城需求概览
    var bullHtml, orderHtml, demandLabel, orderLabel;
    if (cityId === state.homeCityId) {
      var myDemand = (state.playerDemand || []).filter(function (e) { return e.until > state.day; });
      bullHtml = myDemand.map(function (e) {
        return '<div class="log-line">求购 ' + DL.Market.qualityName(e.tier) + DL.DATA.goodById(e.goodId).name + ' ×' + fmt(e.qty) + ' @ ' + fmt1(e.price) + 'G</div>';
      }).join('') || '<div class="log-line">未发布求购公告</div>';
      orderHtml = '<div class="log-line">到「市场 → 流通市场」可发布求购</div>';
      demandLabel = '我的求购公告';
      orderLabel = '发布求购';
    } else {
      var bull = DL.Market.bulletinItems(state, cityId);
      bullHtml = bull.map(function (b) {
        return '<div class="log-line">' + DL.DATA.goodById(b.goodId).name + ' ×' + fmt1(b.mult) + '（' + (b.until - state.day) + '天）</div>';
      }).join('') || '<div class="log-line">本周暂无公告</div>';
      demandLabel = '本周商路公告';
      orderLabel = '限时采购大单';
    }
    if (cityId !== state.homeCityId && DL.Market.hasIntel(state, cityId)) {
      var orders = state.market.orders[cityId] || [];
      orderHtml = orders.map(function (o) {
        return '<div class="log-line">' + DL.Market.qualityName(o.tier) + DL.DATA.goodById(o.goodId).name + ' ×' + fmt(o.qty) + ' ×' + fmt1(o.mult) + '（' + (o.until - state.day) + '天）</div>';
      }).join('') || '<div class="log-line">暂无限时采购单</div>';
    } else if (cityId !== state.homeCityId) {
      orderHtml = '<div class="log-line">情报不明——派商队前往或建旅馆可打听</div>';
    }
    modal('<div class="modal-title" style="color:' + n.color + '">' + c.name + ' · ' + n.name + '</div>' +
      '<div class="modal-text">' + c.desc + '</div>' +
      '<div class="city-info">' +
      '<div class="kv"><span>人口</span><b>' + fmt(st.pop) + '</b></div>' +
      '<div class="kv"><span>繁荣度</span><b>' + fmt(st.prosperity) + '</b></div>' +
      '<div class="kv"><span>信用评级</span><b>' + fmt(st.credit) + '</b></div>' +
      '<div class="kv"><span>旅游吸引力</span><b>' + fmt(st.tourism) + '</b></div>' +
      '<div class="kv"><span>交通通达度</span><b>' + fmt(st.connectivity) + '</b></div>' +
      '<div class="kv"><span>特产</span><b>' + spec + '</b></div>' +
      '<div class="kv"><span>与商会关系</span><b>' + fmt(rel) + '</b></div>' +
      '</div>' +
      '<div class="sub-title">近30日价格 · ' + DL.DATA.goodById(chartGoodIdForCity).name + '</div>' +
      '<canvas id="city-chart" width="300" height="70" class="spark-mid"></canvas>' +
      '<div class="sub-title">' + demandLabel + '</div>' +
      bullHtml +
      '<div class="sub-title">' + orderLabel + '</div>' +
      orderHtml +
      '<div class="modal-btns">' +
      (cityId !== state.homeCityId ? '<button class="btn" id="m-demand">查看外地需求</button>' : '') +
      (cityId !== state.homeCityId ? '<button class="btn primary" id="m-send">派遣商队</button>' : '') +
      '<button class="btn" id="m-close">关闭</button></div>');
    var demandBtn = document.getElementById('m-demand');
    if (demandBtn) demandBtn.onclick = function () {
      closeModal();
      openForeignDemand(cityId);
    };
    var send = document.getElementById('m-send');
    if (send) send.onclick = function () {
      closeModal();
      caravanForm.dest = cityId;
      curTab = 'caravan';
      render();
    };
    var cc = document.getElementById('city-chart');
    if (cc) drawPriceChart(cc, DL.Market.priceSeries(state, cityId, chartGoodIdForCity));
    document.getElementById('m-close').onclick = closeModal;
  }

  function showEvent(ev) {
    var opts = ev.choices.map(function (ch, i) {
      return '<button class="btn ev-btn" data-ev-choice="' + i + '">' + ch.label + '<span class="ev-hint">' + ch.hint + '</span></button>';
    }).join('');
    modal('<div class="modal-title">' + ev.icon + ' ' + ev.title + '</div>' +
      '<div class="modal-text">' + ev.text + '</div>' +
      '<div class="ev-choices">' + opts + '</div>');
    document.querySelectorAll('[data-ev-choice]').forEach(function (b) {
      b.onclick = function () {
        var ch = ev.choices[parseInt(b.getAttribute('data-ev-choice'), 10)];
        var res = ch.run(state);
        if (res) DL.State.log(state, res);
        closeModal();
        state.pendingEvent = null;
        state.pendingRoadEvent = null;
        render();
      };
    });
  }

  function showEnded() {
    if (!state.ended) return;
    var e = state.ended;
    var isWin = e.type !== 'bankrupt' && e.type !== 'ordinary';
    modal((isWin ? '<div class="victory-burst">🎉</div>' : '') +
      '<div class="modal-title' + (isWin ? ' win-title' : '') + '">' + e.title + '</div>' +
      '<div class="modal-text">' + e.text + '</div>' +
      (isWin ? recapHtml() : '') +
      '<div class="modal-btns">' +
      (e.type !== 'bankrupt' ? '<button class="btn primary" id="m-continue">继续经营</button>' : '') +
      '<button class="btn" id="m-restart">重新开始</button>' +
      '<button class="btn" id="m-close2">返回</button></div>');
    var cont = document.getElementById('m-continue');
    if (cont) cont.onclick = function () {
      state.sandbox = true;
      closeModal();
      render();
    };
    document.getElementById('m-restart').onclick = function () { closeModal(); showNewGame(); };
    document.getElementById('m-close2').onclick = function () { closeModal(); };
  }

  function showHelp() {
    modal('<div class="modal-title">游戏说明</div>' +
      '<div class="modal-text help-text">' +
      '<b>目标：</b>十年内让城市成为曦光之地最繁荣的商都，可达成经济/文化/外交/主线等胜利。<br><br>' +
      '<b>难度：</b>开局可选简单（1500G/债5000G）、普通（800G/债10000G）或困难（200G/债15000G）；难度还影响债务日息、居民卖价与强盗危险度。<br><br>' +
      '<b>每日节奏：</b>看市场行情 → 低买高卖 → 派商队 → 建设施 → 调整税率 → 点「推进一天」。<br><br>' +
      '<b>市场：</b>本地流通市场的货不属于你——从居民摊位或外地商队手里买入进仓库；仓库的货可以卖给居民（你定价）、卖给在镇外地商队（还能增进该国关系）、或装车外销。外地需求分「公布」与「打听」两类，旅馆/豪华饭店能带来更多情报。<br><br>' +
      '<b>苍澜洲：</b>西南海外的第二块大陆，七座新城、四条远洋航线。港口城市可建造「航运公司」：海路商队用得越多，航运收入越高；没人用船或船队闲下来时，只有维护费没有进账。<br><br>' +
      '<b>强盗与护卫：</b>开局可选是否启用强盗。启用的对局中，商队走在危险路线可能遭遇劫掠（损失货物并延误）。到「公会」页聘请冒险者随队护卫，或花更大价钱剿灭某条路线上的强盗（60天内安全）。<br><br>' +
      '<b>公司与股份：</b>各城围绕特产开有公司，港口城市另有航运公司。你可以在「公司」页买入或卖出股份，按持股比例每日分红——内陆城市也能参股港口航运；也可花300G在本城为尚未设公司的可产商品开设新公司。<br><br>' +
      '<b>竞争商会：</b>三支NPC商会在全大陆真实经商——会套利囤货、抢你的采购大单、响应你的出售公告，还会避开你垄断的商路。<br><br>' +
      '<b>新玩法：</b>市场页有近30日价格走势图；商队途经城市会偶遇路边高价收购；多步事件链带来小剧情；公司可开董事会、增发、收购控股；存档支持3个档位。<br><br>' +
      '<b>商路：</b>点击地图上的城镇查看详情并派出商队；商队沿路线图自动寻路，耗时与距离、季节、负责人有关。易腐与易碎货物会有损耗。<br><br>' +
      '<b>品质：</b>商品分普通（★☆☆）/精良（★★☆）/稀有（★★★）三档，稀有货品价格可达普通货的1.8倍。各城出产不同品质的特产——比如琥珀梯田的稀有葡萄酒、金穗领的稀有面粉——贩运好货才是暴利所在。<br><br>' +
      '<b>商队名册：</b>每座城市有自己的商队负责人（2~4人），名字与特长各不相同；选城即选择了你的商队班底。<br><br>' +
      '<b>季节：</b>春播夏长秋收冬藏，丰产季囤货、歉收季高价卖出；隆冬北境封路，高原夏道仅夏季开放。<br><br>' +
      '<b>外交：</b>与各城签署通商协议可获得买卖折扣；关系值会随季度自然衰减。<br><br>' +
      '<b>胜利：</b>经济（年度贸易10万G）/ 文化（繁荣·旅游双100）/ 外交（全城通商+关系60）/ 霸主（隐藏）/ 主线（还债+存款5000+牌照）。<br><br>' +
      '<b>失败：</b>资金归零且负债超过2000G即破产。<br><br>' +
      '<b>操作：</b>地图右键拖拽平移、滚轮缩放、左键点击城镇。全程鼠标操作，无文本输入。<br>' +
      '</div>' +
      '<div class="modal-btns"><button class="btn primary" id="m-close">明白了</button></div>');
    document.getElementById('m-close').onclick = closeModal;
  }

  /* ---------- Toast ---------- */
  var toasts = [];
  function toast(msg, ok) {
    var item = { msg: msg, ok: !!ok };
    toasts.push(item);
    if (toasts.length > 4) toasts.shift();
    renderToasts();
    setTimeout(function () {
      toasts = toasts.filter(function (t) { return t !== item; });
      renderToasts();
    }, 3500);
  }

  function renderToasts() {
    var el = document.getElementById('toasts');
    if (!el) return;
    el.innerHTML = toasts.map(function (t) {
      return '<div class="toast ' + (t.ok ? 'ok' : 'bad') + '">' + t.msg + '</div>';
    }).join('');
    DL.I18N.localizeDom(el);
  }

  function switchTab(id) {
    curTab = id;
    render();
  }

  function openForeignDemand(cityId) {
    curTab = 'market';
    marketSub = 'demand';
    pendingScrollId = 'demand-city-' + cityId;
    render();
  }

  DL.UI = {
    init: init,
    setState: setState,
    render: render,
    switchTab: switchTab,
    modal: modal,
    closeModal: closeModal,
    confirmModal: confirmModal,
    showSaveLoadModal: showSaveLoadModal,
    showNewGame: showNewGame,
    showCityCard: showCityCard,
    openForeignDemand: openForeignDemand,
    showEvent: showEvent,
    showRoadStop: showRoadStop,
    showEnded: showEnded,
    showHelp: showHelp,
    toast: toast,
    fmt: fmt,
    fmtG: fmtG,
    _state: function () { return state; },
    _setMarketSub: function (v) { marketSub = v; },
    reload: function () {
      var s = DL.State.load();
      if (!s) { toast('没有找到存档', false); return; }
      state = s;
      setState(state);
      DL.Map.setGame(state);
      render();
      toast('已读取存档', true);
    },
    setCaravanDest: function (cid) { caravanForm.dest = cid; }
  };
})(typeof window !== 'undefined' ? window : globalThis);
