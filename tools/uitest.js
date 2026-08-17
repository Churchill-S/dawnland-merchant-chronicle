/* 浏览器接线冒烟测试：用最小 DOM 桩验证 推进一天/三天 主循环不报错 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ctx2d = new Proxy({}, {
  get(t, prop) {
    if (prop === 'createLinearGradient') return () => ({ addColorStop() {} });
    if (!(prop in t)) t[prop] = function () {};
    return t[prop];
  },
  set(t, prop, v) { t[prop] = v; return true; }
});

function makeEl() {
  return {
    innerHTML: '', textContent: '', value: '', checked: false, files: [],
    style: {}, dataset: {}, width: 0, height: 0, clientWidth: 800, clientHeight: 600,
    classList: { add() {}, remove() {}, contains() { return false; } },
    addEventListener() {}, removeEventListener() {}, setAttribute() {}, appendChild() {}, click() {},
    getBoundingClientRect() { return { left: 0, top: 0, width: 800, height: 600 }; },
    querySelectorAll() { return []; },
    getContext() { return ctx2d; }
  };
}

const elements = {};
const listeners = {};
let domReady = null;

const doc = {
  getElementById(id) {
    if (!elements[id]) elements[id] = makeEl();
    return elements[id];
  },
  querySelectorAll() { return []; },
  createElement() { return makeEl(); },
  addEventListener(type, fn) {
    if (type === 'DOMContentLoaded') domReady = fn;
    else (listeners[type] = listeners[type] || []).push(fn);
  }
};

const storage = {};
const winListeners = {};

const sandbox = {
  console, Math, JSON, Date, Object, Array, parseInt, parseFloat, isNaN, isFinite,
  String, Number, RegExp,
  document: doc,
  Path2D: function () {
    this.moveTo = function () {};
    this.lineTo = function () {};
    this.closePath = function () {};
  },
  localStorage: {
    getItem(k) { return storage[k] || null; },
    setItem(k, v) { storage[k] = String(v); },
    removeItem(k) { delete storage[k]; }
  },
  setInterval() { return 1; },
  clearInterval() {},
  setTimeout() { return 1; },
  clearTimeout() {},
  devicePixelRatio: 1,
  innerWidth: 1200,
  addEventListener(type, fn) { (winListeners[type] = winListeners[type] || []).push(fn); },
  removeEventListener() {},
  URL: { createObjectURL() { return 'blob:x'; }, revokeObjectURL() {} },
  FileReader: function () { return { readAsText() {}, onload: null }; },
  Blob: function () {}
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
vm.createContext(sandbox);

const ORDER = [
  'data.js', 'i18n.js', 'calendar.js', 'market.js', 'caravans.js', 'city.js',
  'diplomacy.js', 'events.js', 'state.js', 'companies.js', 'sites.js', 'rivals.js', 'achievements.js', 'festivals.js', 'travel.js', 'adventurers.js', 'production.js', 'map.js', 'ui.js', 'main.js'
];
for (const f of ORDER) {
  const code = fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8');
  vm.runInContext(code, sandbox, { filename: f });
}

const DL = sandbox.DL;
// i18n 中英切换校验
DL.I18N.setLang('en');
if (DL.I18N.tr('新芽月') !== 'Sproutmonth' || DL.I18N.tr('金库') !== 'Treasury' || DL.I18N.tr('日晷王城') !== 'Sunring' ||
    DL.I18N.tr('船长·玛拉') !== 'Captain Mara' || DL.I18N.tr('领主采购大单') !== "Lord's Purchase Order" ||
    DL.I18N.tr('商队抵达') !== 'Caravan arrived at' || DL.I18N.tr('成就达成：') !== 'Achievement unlocked: ') {
  console.error('FAIL: i18n 翻译校验');
  process.exit(1);
}
DL.I18N.setLang('zh');
console.log('[i18n] 中英切换校验 OK');

// 触发 boot
if (typeof domReady === 'function') domReady();

// 模拟玩家开局（直接注入状态，绕过选城弹窗）
const s = DL.State.newGame('sunring', { noWin: false });
DL.UI.setState(s);
DL.Map.setGame(s);
DL.UI.render();
DL.Map.draw(s); // 渲染地图（含锯齿海岸/森林/地标/罗盘）
console.log('[地图渲染] 一次绘制无异常');
DL.UI.switchTab('market');
DL.UI._setMarketSub('warehouse'); DL.UI.render();
DL.UI._setMarketSub('demand'); DL.UI.render();
DL.UI._setMarketSub('flow'); DL.UI.render();
console.log('[市场页] 流通/仓库/外地需求三个子栏目渲染无异常');
DL.UI.switchTab('guild'); DL.UI.render();
DL.UI.switchTab('company'); DL.UI.render();
console.log('[公会/公司页] 渲染无异常');
DL.UI.switchTab('sites'); DL.UI.render();
console.log('[名胜页] 渲染无异常');
DL.UI.switchTab('achieve'); DL.UI.render();
console.log('[成就页] 渲染无异常');
DL.UI.switchTab('caravan'); DL.UI.render();
console.log('[商队页] 舰队管理渲染无异常');
DL.UI.switchTab('production'); DL.UI.render();
console.log('[生产页] 渲染无异常');
// 公会页状态验证：启用强盗显示名册，关闭显示未启用提示
DL.UI.switchTab('guild'); DL.UI.render();
if (elements['tab-body'].innerHTML.indexOf('冒险者名册') === -1) {
  console.error('FAIL: 启用强盗时公会页未显示名册');
  process.exit(1);
}
const noBanditState = DL.State.newGame('sunring', { bandits: false });
DL.UI.setState(noBanditState);
DL.Map.setGame(noBanditState);
DL.UI.render();
DL.UI.switchTab('guild'); DL.UI.render();
if (elements['tab-body'].innerHTML.indexOf('未启用') === -1) {
  console.error('FAIL: 关闭强盗时公会页未显示未启用提示');
  process.exit(1);
}
DL.UI.setState(s);
DL.Map.setGame(s);
DL.UI.render();
console.log('[公会页] 强盗开关两种状态显示正确');
// 节日活动概览渲染
const fest = DL.State.newGame('sunring');
fest.day = 122;
DL.UI.setState(fest);
DL.Map.setGame(fest);
DL.UI.render();
DL.UI.switchTab('overview'); DL.UI.render();
if (elements['tab-body'].innerHTML.indexOf('放河灯') === -1) {
  console.error('FAIL: 节日活动未在概览页显示');
  process.exit(1);
}
DL.UI.setState(s);
DL.Map.setGame(s);
DL.UI.render();
console.log('[节日活动] 概览页渲染 OK');

const day0 = DL.currentState().day;
console.log('[开始] 日期:', DL.currentState().day, '金库:', Math.round(DL.currentState().finance.treasury));

// 点击“推进一天”
elements['btn-day'].onclick();
const day1 = DL.currentState().day;
if (day1 !== day0 + 1) {
  console.error('FAIL: 推进一天后日期未变化', day0, '->', day1);
  process.exit(1);
}
console.log('[推进一天]', day0, '->', day1, 'OK，日期:', DL.State.dateLabel(s));

// 点击“推进三天”
elements['btn-day3'].onclick();
const day4 = DL.currentState().day;
if (day4 !== day1 + 3) {
  console.error('FAIL: 推进三天后日期未变化', day1, '->', day4);
  process.exit(1);
}
console.log('[推进三天]', day1, '->', day4, 'OK');

// 连续跑 100 天（含随机事件弹窗与结算）
for (let i = 0; i < 100; i++) {
  elements['btn-day'].onclick();
  if (DL.currentState().ended) break;
}
console.log('[连续推进] 当前第', DL.currentState().day, '天，金库:', Math.round(DL.currentState().finance.treasury),
  'G，满意度:', DL.currentState().city.satisfaction, '，存档:', storage['dawnlands_save_v1_s0'] ? '已写入' : '缺失');

// 自由经营模式：确认无结束判定
const s2 = DL.State.newGame('greenharbor', { noWin: true });
DL.UI.setState(s2);
DL.Map.setGame(s2);
DL.UI.render();
DL.Map.draw(s2);
for (let i = 0; i < 60; i++) elements['btn-day'].onclick();
if (DL.currentState().ended) {
  console.error('FAIL: 自由经营模式不应触发结局');
  process.exit(1);
}
console.log('[自由经营] 运行 60 天后无结局，OK');

console.log('\n浏览器接线测试通过：推进按钮与渲染链路无异常。');
