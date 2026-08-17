/* 主控：启动、推进时间、事件弹窗、结束判定 */
(function (G) {
  'use strict';
  var DL = G.DL = G.DL || {};

  var autoTimer = null;

  function boot() {
    var canvas = document.getElementById('worldmap');
    var tooltip = document.getElementById('city-tooltip');
    var hint = document.getElementById('map-hint');
    DL.Map.init(canvas, tooltip, hint);
    DL.Map.setSelectHandler(function (cityId) { DL.UI.showCityCard(cityId); });

    var saved = DL.State.load();
    if (saved) {
      DL.UI.setState(saved);
      DL.Map.setGame(saved);
      DL.UI.render();
      DL.UI.modal('<div class="modal-title">欢迎回来</div>' +
        '<div class="modal-text">检测到第 ' + saved.day + ' 天的商会存档，是否继续？</div>' +
        '<div class="modal-btns"><button class="btn primary" id="m-resume">继续经营</button><button class="btn" id="m-fresh">重新开始</button></div>');
      document.getElementById('m-resume').onclick = function () { DL.UI.closeModal(); };
      document.getElementById('m-fresh').onclick = function () { DL.UI.closeModal(); DL.UI.showNewGame(); };
    } else {
      DL.UI.showNewGame();
    }

    document.getElementById('btn-day').onclick = function () { advance(1); };
    document.getElementById('btn-day3').onclick = function () { advance(3); };
    document.getElementById('btn-auto').onclick = toggleAuto;
  }

  function advance(n) {
    for (var i = 0; i < n; i++) {
      DL.State.tick(DL.currentState());
      if (DL.currentState().ended) break;
    }
    DL.UI.render();
    if (DL.currentState().ended) {
      DL.UI.showEnded();
      stopAuto();
      return;
    }
    if (DL.currentState().pendingEvent) DL.UI.showEvent(DL.currentState().pendingEvent);
    else if (DL.currentState().pendingRoadEvent) DL.UI.showEvent(DL.currentState().pendingRoadEvent.ev);
    else if (DL.currentState().pendingStop) DL.UI.showRoadStop(DL.currentState().pendingStop);
    if (DL.currentState().pendingEvent && autoTimer) stopAuto();
    var notices = DL.currentState().notices;
    if (notices && notices.length) {
      notices.forEach(function (t) { DL.UI.toast(t); });
      DL.currentState().notices = [];
    }
  }

  function toggleAuto() {
    if (autoTimer) { stopAuto(); return; }
    var btn = document.getElementById('btn-auto');
    btn.textContent = '停止自动';
    btn.classList.add('active');
    autoTimer = setInterval(function () {
      if (DL.currentState().ended) { stopAuto(); return; }
      advance(1);
    }, 650);
  }

  function stopAuto() {
    if (!autoTimer) return;
    clearInterval(autoTimer);
    autoTimer = null;
    var btn = document.getElementById('btn-auto');
    if (btn) { btn.textContent = '自动经营'; btn.classList.remove('active'); }
  }

  // 通过 DL 暴露当前状态访问器（状态由 UI 模块持有）
  DL.currentState = function () { return DL.UI._state(); };

  document.addEventListener('DOMContentLoaded', boot);

  // 截图/调试：访问 index.html?shot=1 时自动开局并进入概览页
  if (typeof location !== 'undefined' && location.search.indexOf('shot=1') !== -1) {
    document.addEventListener('DOMContentLoaded', function () {
      DL.UI.closeModal();
      var s0 = DL.State.newGame('sunring');
      DL.UI.setState(s0);
      DL.Map.setGame(s0);
      DL.UI.render();
    });
  }
})(typeof window !== 'undefined' ? window : globalThis);
