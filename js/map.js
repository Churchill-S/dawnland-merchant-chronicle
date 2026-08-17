/* 地图：曦光之地 + 苍澜洲（左键拖拽平移、海路、农田、地标、罗盘） */
(function (G) {
  'use strict';
  var DL = G.DL = G.DL || {};

  var canvas, ctx, W, H, dpr;
  var view = { ox: 460, oy: 640, scale: 0.5 };
var hoverCity = null, hoverRoute = null, hoverCaravan = null;
var animState = {};
  var dragging = false, dragButton = 0, lastX = 0, lastY = 0;
  var onSelect = null;
  var tooltipEl, hintEl;
  var pulse = 0;
  var state = null;

  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  var LEAF = [
    { x: 500, y: 22 }, { x: 610, y: 70 }, { x: 685, y: 115 }, { x: 760, y: 108 }, { x: 835, y: 235 },
    { x: 920, y: 410 }, { x: 890, y: 570 }, { x: 830, y: 690 }, { x: 700, y: 830 },
    { x: 560, y: 955 }, { x: 440, y: 955 }, { x: 300, y: 830 }, { x: 170, y: 690 },
    { x: 110, y: 570 }, { x: 80, y: 410 }, { x: 160, y: 260 }, { x: 260, y: 150 }, { x: 390, y: 70 }
  ];

  // 苍澜洲主岛轮廓（西南海外）
  var AZURE_PTS = [
    [150, 985], [230, 975], [300, 1005], [350, 1070], [345, 1135], [305, 1200],
    [255, 1245], [185, 1268], [120, 1240], [75, 1175], [55, 1105], [60, 1045], [95, 1005]
  ];

  // 银沙大岛（东海外大岛）
  var SILVER_PTS = [
    [1010, 360], [1080, 340], [1160, 360], [1230, 420], [1250, 500],
    [1220, 600], [1130, 660], [1040, 660], [990, 580], [985, 470]
  ];

  function jitterPoly(points, seed, amp) {
    var segLen = 36;
    var out = [];
    for (var i = 0; i < points.length; i++) {
      var a = points[i], b = points[(i + 1) % points.length];
      var dx = b[0] - a[0], dy = b[1] - a[1];
      var len = Math.hypot(dx, dy);
      var steps = Math.max(3, Math.round(len / segLen));
      var nx = -dy / len, ny = dx / len;
      var rnd = mulberry32(seed + i * 97);
      for (var s = 0; s < steps; s++) {
        var t = s / steps;
        var j = (rnd() - 0.5) * amp * Math.sin(Math.PI * t);
        out.push({ x: a[0] + dx * t + nx * j, y: a[1] + dy * t + ny * j });
      }
    }
    out.push({ x: out[0].x, y: out[0].y });
    return out;
  }

  var COAST = jitterPoly(LEAF.map(function (p) { return [p.x, p.y]; }), 13, 18);
  var AZURE_COAST = jitterPoly(AZURE_PTS, 57, 14);
  var SILVER_COAST = jitterPoly(SILVER_PTS, 89, 14);

  var NATION_POLY = {
    north: [[330, 60], [600, 60], [650, 250], [560, 310], [420, 300], [320, 220]],
    sundial: [[390, 320], [590, 320], [610, 500], [420, 520]],
    wheat: [[600, 330], [750, 330], [720, 570], [560, 550], [540, 420]],
    east: [[720, 240], [940, 280], [930, 640], [820, 700], [690, 570], [680, 330]],
    amber: [[390, 640], [680, 640], [700, 850], [560, 960], [360, 840]],
    jade: [[120, 300], [330, 380], [360, 780], [230, 830], [70, 700], [50, 430]]
  };

  var FORESTS = [
    { x: 705, y: 250, w: 95, h: 320, n: 46, seed: 11 },
    { x: 760, y: 300, w: 160, h: 290, n: 54, seed: 23 },
    { x: 815, y: 235, w: 100, h: 100, n: 18, seed: 37 },
    { x: 335, y: 130, w: 280, h: 130, n: 24, seed: 41 },
    { x: 95, y: 200, w: 150, h: 150, n: 18, seed: 53 },
    { x: 560, y: 830, w: 130, h: 90, n: 14, seed: 67 }
  ];

  var AZURE_FORESTS = [
    { x: 165, y: 1030, w: 95, h: 95, n: 20, seed: 71 },
    { x: 215, y: 1120, w: 95, h: 95, n: 20, seed: 83 },
    { x: 90, y: 1050, w: 60, h: 55, n: 10, seed: 97 }
  ];

  function init(cv, tooltip, hint) {
    canvas = cv;
    tooltipEl = tooltip;
    hintEl = hint;
    ctx = canvas.getContext('2d');
    resize();
    canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    canvas.addEventListener('mousedown', function (e) {
      dragging = true;
      dragButton = e.button;
      lastX = e.clientX; lastY = e.clientY;
    });
    window.addEventListener('mousemove', function (e) {
      if (dragging) {
        var dx = e.clientX - lastX, dy = e.clientY - lastY;
        view.ox -= dx / view.scale;
        view.oy -= dy / view.scale;
        lastX = e.clientX; lastY = e.clientY;
        hoverCity = null; hoverRoute = null; hoverCaravan = null;
        hideTooltip();
      } else {
        updateHover(e);
      }
    });
    window.addEventListener('mouseup', function (e) {
      if (dragging && dragButton === 0) {
        var moved = Math.abs(e.clientX - lastX) + Math.abs(e.clientY - lastY);
        if (moved < 5) handleClick(e);
      }
      dragging = false;
    });
    canvas.addEventListener('wheel', function (e) {
      e.preventDefault();
      var rect = canvas.getBoundingClientRect();
      var mx = e.clientX - rect.left, my = e.clientY - rect.top;
      var factor = e.deltaY < 0 ? 1.12 : 0.89;
      var ns = Math.max(0.3, Math.min(3.0, view.scale * factor));
      var wx = view.ox + (mx - W / 2) / view.scale;
      var wy = view.oy + (my - H / 2) / view.scale;
      view.scale = ns;
      view.ox = wx - (mx - W / 2) / ns;
      view.oy = wy - (my - H / 2) / ns;
    }, { passive: false });
    window.addEventListener('resize', resize);
    setInterval(function () { draw(state); }, 80);
  }

  function setGame(s) { state = s; animState = {}; if (s) centerOn(s.homeCityId); }

  function resize() {
    dpr = window.devicePixelRatio || 1;
    W = canvas.clientWidth;
    H = canvas.clientHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
  }

  function centerOn(cityId) {
    var c = DL.DATA.cityById(cityId);
    if (!c) return;
    view.ox = c.x;
    view.oy = c.y;
    view.scale = 0.85;
  }

  function worldToScreen(x, y) {
    return { x: (x - view.ox) * view.scale + W / 2, y: (y - view.oy) * view.scale + H / 2 };
  }

  function withWorld(fn) {
    ctx.save();
    ctx.scale(view.scale, view.scale);
    ctx.translate(W / 2 / view.scale - view.ox, H / 2 / view.scale - view.oy);
    fn();
    ctx.restore();
  }

  function polyPath(pts) {
    var p = new Path2D();
    p.moveTo(pts[0].x, pts[0].y);
    for (var i = 1; i < pts.length; i++) p.lineTo(pts[i].x, pts[i].y);
    p.closePath();
    return p;
  }

  function smoothPath(points) {
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (var i = 1; i < points.length - 1; i++) {
      var mx = (points[i].x + points[i + 1].x) / 2;
      var my = (points[i].y + points[i + 1].y) / 2;
      ctx.quadraticCurveTo(points[i].x, points[i].y, mx, my);
    }
    ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
  }

  function curvedLeg(ax, ay, bx, by) {
    var dx = bx - ax, dy = by - ay;
    var len = Math.hypot(dx, dy) || 1;
    var nx = -dy / len, ny = dx / len;
    var off = len * 0.16;
    var c1x = ax + dx * 0.33 + nx * off, c1y = ay + dy * 0.33 + ny * off;
    var c2x = ax + dx * 0.66 - nx * off, c2y = ay + dy * 0.66 - ny * off;
    ctx.bezierCurveTo(c1x, c1y, c2x, c2y, bx, by);
  }

  function cubicPoint(ax, ay, c1x, c1y, c2x, c2y, bx, by, t) {
    var u = 1 - t;
    return {
      x: u * u * u * ax + 3 * u * u * t * c1x + 3 * u * t * t * c2x + t * t * t * bx,
      y: u * u * u * ay + 3 * u * u * t * c1y + 3 * u * t * t * c2y + t * t * t * by
    };
  }

  function curvePoint(ax, ay, bx, by, t) {
    var dx = bx - ax, dy = by - ay;
    var len = Math.hypot(dx, dy) || 1;
    var nx = -dy / len, ny = dx / len;
    var off = len * 0.16;
    var c1x = ax + dx * 0.33 + nx * off, c1y = ay + dy * 0.33 + ny * off;
    var c2x = ax + dx * 0.66 - nx * off, c2y = ay + dy * 0.66 - ny * off;
    if (t <= 0.5) return cubicPoint(ax, ay, c1x, c1y, c2x, c2y, bx, by, t * 2);
    return cubicPoint(ax, ay, c1x, c1y, c2x, c2y, bx, by, 1 - (1 - t) * 2);
  }

  function curveLegSamples(ax, ay, bx, by, n) {
    var pts = [];
    for (var i = 0; i <= n; i++) pts.push(curvePoint(ax, ay, bx, by, i / n));
    return pts;
  }

  function draw(s) {
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    pulse += 0.08;

    var bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#dcefdc');
    bg.addColorStop(0.5, '#cfe6d4');
    bg.addColorStop(1, '#bfe0d6');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
    // 季节色调
    if (state) {
      var info = DL.Calendar.info(state.day);
      var season = info.season || '';
      var tint = null;
      if (season.indexOf('春') !== -1) tint = 'rgba(170,215,120,0.12)';
      else if (season.indexOf('夏') !== -1) tint = 'rgba(255,215,110,0.08)';
      else if (season.indexOf('秋') !== -1) tint = 'rgba(215,150,60,0.14)';
      else tint = 'rgba(185,210,235,0.22)';
      if (tint) { ctx.fillStyle = tint; ctx.fillRect(0, 0, W, H); }
    }
    drawWaves();

    withWorld(function () { drawMainLand(s); });
    withWorld(function () { drawAzureLand(s); });
    withWorld(function () { drawSilverLand(s); });
    withWorld(function () { drawIslets(); });
    withWorld(function () {
      drawRoutes();
      drawSeaShips();
      drawPirates(s);
      drawCities(s);
      drawCaravans(s);
      drawRivalCaravans(s);
    });
    drawCityNames();
    drawSiteMarkers();
    drawSeaNotes();
    drawFrame();
  }

  function drawWaves() {
    ctx.strokeStyle = 'rgba(90,150,160,0.20)';
    ctx.lineWidth = 1;
    for (var y = 18; y < H; y += 32) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }
    // 细碎浪花
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 1;
    var rnd = mulberry32(7);
    for (var i = 0; i < 26; i++) {
      var x = rnd() * W, y = rnd() * H;
      ctx.beginPath();
      ctx.arc(x, y, 1.5 + rnd() * 2.5, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  function drawMainLand(s) {
    var coast = polyPath(COAST);
    ctx.fillStyle = '#dfcf9e';
    ctx.fill(coast);
    ctx.strokeStyle = 'rgba(240,226,178,0.9)';
    ctx.lineWidth = 13 / view.scale;
    ctx.lineJoin = 'round';
    ctx.stroke(coast);
    ctx.strokeStyle = '#6f5a34';
    ctx.lineWidth = 3 / view.scale;
    ctx.stroke(coast);
    ctx.clip(coast);

    DL.DATA.NATIONS.forEach(function (n) {
      if (n.id === 'azure') return;
      var pts = NATION_POLY[n.id];
      if (!pts) return;
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
      ctx.closePath();
      ctx.fillStyle = hexToRgba(n.color, 0.18);
      ctx.fill();
      ctx.strokeStyle = hexToRgba(n.color, 0.45);
      ctx.lineWidth = 1.2 / view.scale;
      ctx.setLineDash([8 / view.scale, 6 / view.scale]);
      ctx.stroke();
      ctx.setLineDash([]);
      var cx = 0, cy = 0;
      pts.forEach(function (p) { cx += p[0]; cy += p[1]; });
      cx /= pts.length; cy /= pts.length;
      ctx.font = Math.max(11, 17 / view.scale) + 'px "Microsoft YaHei", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = hexToRgba(n.color, 0.95);
      ctx.fillText(n.name, cx, cy - 6 / view.scale);
      ctx.fillStyle = 'rgba(90,70,40,0.55)';
      ctx.font = Math.max(9, 12 / view.scale) + 'px "Microsoft YaHei", sans-serif';
      ctx.fillText(n.tone, cx, cy + 8 / view.scale);
    });

    drawForests(FORESTS, ['#7ba35a', '#6d9450', '#88aa62', '#5f8a4a']);

    // 金穗公国农田
    drawFields();
    // 琥珀河谷葡萄园
    drawVineyards();

    drawMountains(560, 60, 90, 3, '#a9b8a2');
    drawMountains(700, 250, 60, 4, '#8fa785');
    drawMountains(700, 420, 70, 4, '#8fa785');
    drawMountains(560, 880, 110, 3, '#c08a5f');

    ctx.fillStyle = 'rgba(84,152,178,0.8)';
    ctx.strokeStyle = 'rgba(50,110,140,0.8)';
    ellipse(465, 408, 20, 14);
    ellipse(665, 398, 32, 23);
    ellipse(500, 225, 14, 10);
    ctx.fillStyle = 'rgba(230,140,160,0.8)';
    ellipse(430, 850, 18, 12);
    ctx.fillStyle = 'rgba(96,172,190,0.75)';
    ctx.strokeStyle = 'rgba(60,130,150,0.8)';
    ellipseRot(692, 118, 40, 15, 0.45);
    drawMarsh(795, 560, 34, 14);

    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(70,140,170,0.9)';
    ctx.lineWidth = 6 / view.scale;
    smoothPath([
      { x: 735, y: 420 }, { x: 665, y: 438 }, { x: 700, y: 478 },
      { x: 615, y: 515 }, { x: 500, y: 585 }, { x: 390, y: 655 },
      { x: 300, y: 668 }, { x: 250, y: 660 }, { x: 235, y: 745 }
    ]);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(70,140,170,0.75)';
    ctx.lineWidth = 3.5 / view.scale;
    smoothPath([{ x: 738, y: 365 }, { x: 712, y: 420 }, { x: 700, y: 468 }]);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(70,140,170,0.7)';
    ctx.lineWidth = 3.5 / view.scale;
    smoothPath([{ x: 885, y: 548 }, { x: 872, y: 505 }, { x: 860, y: 455 }]);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(70,140,170,0.65)';
    ctx.lineWidth = 2.6 / view.scale;
    smoothPath([{ x: 555, y: 72 }, { x: 540, y: 135 }, { x: 522, y: 175 }, { x: 505, y: 215 }]);
    ctx.stroke();
    ctx.fillStyle = 'rgba(230,240,225,0.95)';
    ctx.strokeStyle = 'rgba(120,150,130,0.8)';
    ellipse(516, 162, 6, 4.5);
    ellipse(526, 172, 5, 4);
    ellipse(508, 172, 4.5, 3.5);
    drawWaterfall(738, 468);

    drawLandmark('lighthouse', 128, 625, 13);
    drawLandmark('standingstone', 748, 110, 12);
    ctx.fillStyle = 'rgba(140,170,120,0.9)';
    ctx.strokeStyle = 'rgba(90,110,80,0.8)';
    ellipse(72, 452, 5, 3.5);
    ellipse(88, 470, 6, 4);
    ellipse(68, 486, 4, 3);

    // 中立区地标（图案层）
    drawLandmark('stonecircle', 680, 545, 8);
    drawLandmark('chapel', 480, 690, 8);
    drawLandmark('belltower', 600, 570, 8);
  }

  function drawFields() {
    ctx.fillStyle = 'rgba(216,168,72,0.30)';
    ctx.strokeStyle = 'rgba(160,120,40,0.35)';
    ctx.lineWidth = 0.8 / view.scale;
    for (var r = 0; r < 5; r++) {
      for (var c = 0; c < 6; c++) {
        var x = 585 + c * 19, y = 388 + r * 17;
        ctx.beginPath();
        ctx.rect(x, y, 16, 12);
        ctx.fill();
        ctx.stroke();
      }
    }
  }

  function drawVineyards() {
    ctx.fillStyle = 'rgba(150,70,110,0.55)';
    for (var r = 0; r < 4; r++) {
      for (var c = 0; c < 5; c++) {
        var x = 540 + c * 10, y = 660 + r * 9;
        ctx.beginPath();
        ctx.arc(x, y, 1.8 / Math.max(0.8, view.scale), 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function drawAzureLand(s) {
    // 主岛
    var coast = polyPath(AZURE_COAST);
    ctx.fillStyle = '#cfd6a8';
    ctx.fill(coast);
    ctx.strokeStyle = 'rgba(235,240,205,0.9)';
    ctx.lineWidth = 12 / view.scale;
    ctx.lineJoin = 'round';
    ctx.stroke(coast);
    ctx.strokeStyle = '#5d6f52';
    ctx.lineWidth = 3 / view.scale;
    ctx.stroke(coast);
    ctx.clip(coast);

    var az = DL.DATA.nationById('azure');
    ctx.fillStyle = hexToRgba(az.color, 0.20);
    ctx.fillRect(0, 960, 400, 330);
    ctx.fillStyle = 'rgba(70,90,90,0.5)';
    ctx.font = Math.max(11, 16 / view.scale) + 'px "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(az.name, 200, 990);
    ctx.font = Math.max(9, 11 / view.scale) + 'px "Microsoft YaHei", sans-serif';
    ctx.fillStyle = 'rgba(70,90,90,0.45)';
    ctx.fillText(az.tone, 200, 1005);

    drawForests(AZURE_FORESTS, ['#5d8f6f', '#4f8062', '#6aa07a', '#4a7458']);

    // 青霭河
    ctx.strokeStyle = 'rgba(80,150,165,0.8)';
    ctx.lineWidth = 3 / view.scale;
    ctx.lineCap = 'round';
    smoothPath([{ x: 205, y: 1050 }, { x: 215, y: 1110 }, { x: 240, y: 1160 }, { x: 245, y: 1195 }]);
    ctx.stroke();

    // 盐田（盐沫镇附近）
    ctx.fillStyle = 'rgba(235,240,230,0.75)';
    ctx.strokeStyle = 'rgba(180,190,175,0.6)';
    ellipseRot(140, 1185, 22, 10, 0.2);
    ellipseRot(170, 1200, 16, 8, -0.15);

    // 珊瑚礁（礁石城与风帆镇海岸外）
    ctx.fillStyle = 'rgba(230,120,130,0.7)';
    var rnd = mulberry32(31);
    for (var i = 0; i < 26; i++) {
      var x = 250 + rnd() * 90, y = 1180 + rnd() * 70;
      if (x > 330 || y > 1235) continue;
      ctx.beginPath();
      ctx.arc(x, y, 1.6 + rnd() * 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawSilverLand(s) {
    var coast = polyPath(SILVER_COAST);
    ctx.fillStyle = '#e6d9a8';
    ctx.fill(coast);
    ctx.strokeStyle = 'rgba(245,238,205,0.9)';
    ctx.lineWidth = 11 / view.scale;
    ctx.lineJoin = 'round';
    ctx.stroke(coast);
    ctx.strokeStyle = '#7a6a42';
    ctx.lineWidth = 2.5 / view.scale;
    ctx.stroke(coast);
    ctx.clip(coast);
    var sil = DL.DATA.nationById('silver');
    ctx.fillStyle = hexToRgba(sil.color, 0.18);
    ctx.fillRect(960, 300, 320, 400);
    ctx.fillStyle = 'rgba(122,106,66,0.6)';
    ctx.font = Math.max(10, 14 / view.scale) + 'px "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(sil.name, 1120, 380);
    // 沙丘
    ctx.fillStyle = 'rgba(235,222,180,0.7)';
    ellipseRot(1160, 620, 26, 10, 0.3);
    ellipseRot(1040, 600, 20, 8, -0.2);
    // 金桂树林
    ctx.fillStyle = 'rgba(190,150,70,0.8)';
    for (var i = 0; i < 14; i++) {
      var rnd = mulberry32(130 + i);
      var x = 1080 + rnd() * 130, y = 430 + rnd() * 150;
      ctx.beginPath(); ctx.arc(x, y, 2.5, 0, Math.PI * 2); ctx.fill();
    }
  }

  // 已发现的名胜：尖塔图标 + 名称（最上层绘制，不受海岸裁剪）
  function drawSiteMarkers() {
    if (!state || !state.sitesDiscovered) return;
    ctx.save();
    DL.DATA.SITES.forEach(function (s) {
      if (!state.sitesDiscovered[s.id]) return;
      var sp = worldToScreen(s.x, s.y);
      var lv = state.sites[s.id] || 0;
      ctx.strokeStyle = '#5d4a28';
      ctx.fillStyle = lv > 0 ? '#b8860b' : 'rgba(184,134,11,0.45)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(sp.x, sp.y - 9);
      ctx.lineTo(sp.x + 7, sp.y + 3);
      ctx.lineTo(sp.x - 7, sp.y + 3);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,250,235,0.9)';
      ctx.beginPath(); ctx.arc(sp.x, sp.y - 10, 1.6, 0, Math.PI * 2); ctx.fill();
      ctx.font = '10px "Microsoft YaHei", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(255,250,235,0.85)';
      ctx.fillText(s.name, sp.x + 1, sp.y + 16);
      ctx.fillStyle = lv > 0 ? 'rgba(120,80,10,0.95)' : 'rgba(90,70,40,0.8)';
      ctx.fillText(s.name, sp.x, sp.y + 15);
      if (lv > 0) {
        ctx.font = '9px "Microsoft YaHei", sans-serif';
        ctx.fillStyle = '#b8860b';
        ctx.fillText('Lv' + lv, sp.x, sp.y + 27);
      }
    });
    ctx.restore();
  }

  function drawIslets() {
    var islets = [
      [100, 440, 22, 14],   // 贝珠屿（星散群岛）
      [250, 940, 26, 16],   // 鸥歌岛（两大陆之间的中途岛）
      [370, 1045, 24, 15],  // 沉珠岛（苍澜东侧）
      [45, 1170, 22, 14]    // 月落屿（苍澜西陲）
    ];
    islets.forEach(function (it) {
      ctx.fillStyle = '#cfd6a8';
      ctx.beginPath();
      ctx.ellipse(it[0], it[1], it[2], it[3], 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(235,240,205,0.9)';
      ctx.lineWidth = 7 / view.scale;
      ctx.stroke();
      ctx.strokeStyle = '#5d6f52';
      ctx.lineWidth = 2 / view.scale;
      ctx.stroke();
    });
  }

  function drawRoutes() {
    DL.DATA.ROUTES.forEach(function (r) {
      var color = r.type === 'water' ? '#3b7fa3' : (r.type === 'seasonal' ? '#5f8f4f' : '#9a6b3a');
      ctx.beginPath();
      var prev = null;
      r.stops.forEach(function (sid, i) {
        var c = DL.DATA.cityById(sid);
        if (i === 0) ctx.moveTo(c.x, c.y);
        else curvedLeg(prev.x, prev.y, c.x, c.y);
        prev = c;
      });
      ctx.strokeStyle = hexToRgba(color, hoverRoute === r.id ? 0.95 : 0.6);
      ctx.lineWidth = (hoverRoute === r.id ? 3.2 : 2.2) / view.scale;
      ctx.setLineDash([7 / view.scale, 7 / view.scale]);
      ctx.stroke();
      ctx.setLineDash([]);
    });
  }

  function drawSeaShips() {
    var rnd = mulberry32(101);
    DL.DATA.ROUTES.forEach(function (r) {
      if (r.type !== 'water') return;
      var a = DL.DATA.cityById(r.stops[0]), b = DL.DATA.cityById(r.stops[r.stops.length - 1]);
      var dist = Math.hypot(b.x - a.x, b.y - a.y);
      if (dist < 220) return;
      var p = curvePoint(a.x, a.y, b.x, b.y, 0.5);
      drawSailShip(p.x, p.y, 5 + Math.sin(pulse * 1.5 + r.stops.length) * 0.5);
    });
  }

  function drawPirates(s) {
    if (!s || !s.pirates) return;
    DL.DATA.ROUTES.forEach(function (r) {
      if (r.type !== 'water') return;
      var pr = s.pirates.routes[r.id];
      if (!pr || pr.danger < 30) return;
      var a = DL.DATA.cityById(r.stops[0]), b = DL.DATA.cityById(r.stops[r.stops.length - 1]);
      var p = curvePoint(a.x, a.y, b.x, b.y, 0.5);
      ctx.save();
      ctx.translate(p.x, p.y);
      var sz = 5 + Math.sin(pulse * 2 + r.stops.length) * 0.5;
      ctx.strokeStyle = '#2b2b2b';
      ctx.lineWidth = 1 / view.scale;
      ctx.beginPath(); ctx.moveTo(0, sz); ctx.lineTo(0, -sz * 1.6); ctx.stroke();
      ctx.fillStyle = '#2b2b2b';
      ctx.beginPath(); ctx.moveTo(0, -sz * 1.6); ctx.lineTo(sz * 1.1, -sz * 1.15); ctx.lineTo(0, -sz * 0.7); ctx.closePath(); ctx.fill();
      ctx.restore();
    });
  }

  function drawSailShip(x, y, s) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = '#7a4a20';
    ctx.beginPath();
    ctx.moveTo(-s, s * 0.5);
    ctx.quadraticCurveTo(0, s * 1.0, s, s * 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#5d3a18';
    ctx.lineWidth = 1 / view.scale;
    ctx.beginPath();
    ctx.moveTo(0, s * 0.3);
    ctx.lineTo(0, -s * 1.1);
    ctx.stroke();
    ctx.fillStyle = '#f2ecd8';
    ctx.beginPath();
    ctx.moveTo(0, -s * 1.1);
    ctx.lineTo(s * 0.9, -s * 0.25);
    ctx.lineTo(0, -s * 0.1);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  function drawCities(s) {
    DL.DATA.CITIES.forEach(function (c) {
      var st = s ? s.cities[c.id] : null;
      var isHome = s && c.id === s.homeCityId;
      if (c.nation === 'azure') {
        drawLandmark(c.landmark, c.x, c.y - 26, 9);
      } else {
        drawLandmark(c.landmark, c.x, c.y - 27, 9);
      }
      drawShield(c, isHome, hoverCity === c.id, st);
    });
  }

  function drawCaravans(s) {
    if (!s) return;
    s.caravans.forEach(function (cv) {
      if (cv.done) return;
      var p = caravanCurvedPos(cv);
      if (!p) return;
      var leg0 = cv.legs[cv.legIdx];
      var a0 = leg0 ? DL.DATA.cityById(leg0.from) : null;
      var as = animState[cv.id];
      if (!as || as.legIdx !== cv.legIdx) {
        as = animState[cv.id] = { legIdx: cv.legIdx, x: a0 ? a0.x : p.x, y: a0 ? a0.y : p.y };
      }
      as.x += (p.x - as.x) * 0.22;
      as.y += (p.y - as.y) * 0.22;
      var sp = worldToScreen(as.x, as.y);
      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var r = 7 + Math.sin(pulse * 2) * 2;
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.beginPath(); ctx.arc(sp.x, sp.y, r + 2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#b8860b';
      ctx.beginPath(); ctx.arc(sp.x, sp.y, r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#7a5a10';
      ctx.lineWidth = 1;
      ctx.stroke();
      if (hoverCaravan === cv.id) {
        ctx.strokeStyle = 'rgba(255,255,255,0.95)';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(sp.x, sp.y, r + 5, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.restore();
    });
  }

  function drawRivalCaravans(s) {
    if (!s || !s.rivals) return;
    s.rivals.houses.forEach(function (h) {
      h.caravans.forEach(function (cv) {
        var leg = cv.legs[cv.legIdx];
        if (!leg) return;
        var a = DL.DATA.cityById(leg.from), b = DL.DATA.cityById(leg.to);
        var t = Math.min(1, cv.progress / leg.days);
        var p = curvePoint(a.x, a.y, b.x, b.y, t);
        var as = animState['r' + cv.id];
        if (!as || as.legIdx !== cv.legIdx) as = animState['r' + cv.id] = { legIdx: cv.legIdx, x: a.x, y: a.y };
        as.x += (p.x - as.x) * 0.22;
        as.y += (p.y - as.y) * 0.22;
        var sp = worldToScreen(as.x, as.y);
        ctx.save();
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.beginPath(); ctx.arc(sp.x, sp.y, 6, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = h.color;
        ctx.beginPath(); ctx.arc(sp.x, sp.y, 4, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      });
    });
  }

  function drawLandmark(type, x, y, size) {
    var s = size / view.scale * Math.min(1.5, Math.max(0.7, view.scale));
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = '#5d4a28';
    ctx.fillStyle = '#5d4a28';
    ctx.lineWidth = 1.4 / view.scale;
    ctx.lineCap = 'round';
    switch (type) {
      case 'sundial':
        ctx.beginPath(); ctx.arc(0, 0, s, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(s * 0.75, -s * 0.75); ctx.stroke();
        break;
      case 'spring':
        for (var i = 0; i < 3; i++) {
          ctx.beginPath(); ctx.arc(-s + i * s, s * 0.2, s * 0.4, Math.PI * 1.2, Math.PI * 1.8); ctx.stroke();
        }
        break;
      case 'belltower':
        ctx.fillRect(-s * 0.5, -s, s, s * 1.6);
        ctx.beginPath(); ctx.moveTo(-s * 0.7, -s); ctx.lineTo(0, -s * 1.5); ctx.lineTo(s * 0.7, -s); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.arc(0, -s * 0.65, s * 0.28, 0, Math.PI * 2); ctx.stroke();
        break;
      case 'windmill':
        ctx.beginPath(); ctx.moveTo(0, -s * 1.2); ctx.lineTo(-s * 0.5, s * 0.8); ctx.lineTo(s * 0.5, s * 0.8); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(0, -s * 1.2); ctx.lineTo(0, s); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-s * 0.9, -s * 0.2); ctx.lineTo(s * 0.9, -s * 0.2); ctx.moveTo(-s * 0.9, -s * 0.7); ctx.lineTo(s * 0.9, -s * 0.7); ctx.stroke();
        break;
      case 'hive':
        hexagon(0, 0, s * 0.75);
        ctx.beginPath(); ctx.moveTo(-s * 0.7, -s * 0.25); ctx.lineTo(s * 0.7, -s * 0.25); ctx.stroke();
        break;
      case 'waterwheel':
        ctx.beginPath(); ctx.arc(0, 0, s * 0.8, 0, Math.PI * 2); ctx.stroke();
        for (var i2 = 0; i2 < 4; i2++) {
          var a = i2 * Math.PI / 4;
          ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * s * 0.8, Math.sin(a) * s * 0.8); ctx.stroke();
        }
        break;
      case 'grape':
        ctx.beginPath(); ctx.arc(-s * 0.35, s * 0.2, s * 0.3, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(s * 0.35, s * 0.2, s * 0.3, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(0, s * 0.65, s * 0.32, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.moveTo(-s * 0.5, -s); ctx.lineTo(s * 0.5, -s); ctx.stroke();
        break;
      case 'olivetree':
        ctx.beginPath(); ctx.moveTo(0, s); ctx.lineTo(0, -s * 0.3); ctx.stroke();
        ctx.beginPath(); ctx.arc(0, -s * 0.5, s * 0.8, 0, Math.PI * 2); ctx.stroke();
        break;
      case 'kiln':
        ctx.beginPath(); ctx.arc(0, 0, s * 0.8, Math.PI, 0); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-s * 0.8, 0); ctx.lineTo(-s * 0.8, s * 0.3); ctx.lineTo(s * 0.8, s * 0.3); ctx.lineTo(s * 0.8, 0); ctx.stroke();
        break;
      case 'flower':
        for (var i3 = 0; i3 < 5; i3++) {
          var a3 = i3 * Math.PI * 2 / 5;
          ctx.beginPath(); ctx.arc(Math.cos(a3) * s * 0.65, Math.sin(a3) * s * 0.65, s * 0.42, 0, Math.PI * 2); ctx.fill();
        }
        ctx.beginPath(); ctx.arc(0, 0, s * 0.35, 0, Math.PI * 2); ctx.fillStyle = '#c9a227'; ctx.fill();
        break;
      case 'ship':
        ctx.beginPath(); ctx.moveTo(-s, s * 0.35); ctx.quadraticCurveTo(0, s * 0.85, s, s * 0.35); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(0, s * 0.25); ctx.lineTo(0, -s); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, -s); ctx.lineTo(s * 0.7, -s * 0.15); ctx.lineTo(0, -s * 0.1); ctx.closePath(); ctx.fill();
        break;
      case 'saltmound':
        ctx.beginPath(); ctx.moveTo(-s * 0.8, s * 0.3); ctx.lineTo(0, -s * 0.6); ctx.lineTo(s * 0.8, s * 0.3); ctx.closePath(); ctx.fill();
        break;
      case 'bridge':
        ctx.beginPath(); ctx.arc(0, s * 0.4, s * 0.8, Math.PI, 0); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-s * 0.8, s * 0.4); ctx.lineTo(-s * 0.8, s); ctx.moveTo(s * 0.8, s * 0.4); ctx.lineTo(s * 0.8, s); ctx.stroke();
        break;
      case 'rice':
        for (var i4 = 0; i4 < 3; i4++) {
          var x4 = (i4 - 1) * s * 0.55;
          ctx.beginPath(); ctx.moveTo(x4, s); ctx.lineTo(x4, -s * 0.8); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(x4, -s * 0.8); ctx.lineTo(x4 - s * 0.35, -s * 0.3); ctx.lineTo(x4 + s * 0.35, -s * 0.3); ctx.closePath(); ctx.fill();
        }
        break;
      case 'house':
        ctx.fillRect(-s * 0.8, -s * 0.2, s * 1.6, s * 1.0);
        ctx.beginPath(); ctx.moveTo(-s * 0.95, -s * 0.2); ctx.lineTo(0, -s * 1.0); ctx.lineTo(s * 0.95, -s * 0.2); ctx.closePath(); ctx.fill();
        break;
      case 'deer':
        ctx.beginPath(); ctx.moveTo(-s * 0.8, -s * 0.3); ctx.lineTo(-s * 0.3, -s * 0.7); ctx.moveTo(-s * 0.2, -s * 0.35); ctx.lineTo(-s * 0.1, -s * 0.85); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(s * 0.8, -s * 0.3); ctx.lineTo(s * 0.3, -s * 0.7); ctx.moveTo(s * 0.2, -s * 0.35); ctx.lineTo(s * 0.1, -s * 0.85); ctx.stroke();
        ctx.beginPath(); ctx.arc(0, s * 0.25, s * 0.6, 0, Math.PI * 2); ctx.stroke();
        break;
      case 'pine':
        ctx.beginPath(); ctx.moveTo(0, -s * 1.4); ctx.lineTo(s * 0.8, s * 0.2); ctx.lineTo(-s * 0.8, s * 0.2); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(0, -s * 0.9); ctx.lineTo(s * 0.95, s * 0.55); ctx.lineTo(-s * 0.95, s * 0.55); ctx.closePath(); ctx.fill();
        break;
      case 'willow':
        ctx.beginPath(); ctx.moveTo(0, s); ctx.lineTo(0, -s * 0.4); ctx.stroke();
        for (var i5 = 0; i5 < 5; i5++) {
          var x5 = -s * 0.8 + i5 * s * 0.4;
          ctx.beginPath(); ctx.moveTo(x5, -s * 0.45); ctx.quadraticCurveTo(x5 + s * 0.15, s * 0.2, x5 - s * 0.1, s * 0.8); ctx.stroke();
        }
        break;
      case 'sheep':
        ctx.beginPath(); ctx.arc(0, -s * 0.2, s * 0.7, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(-s * 0.75, -s * 0.1, s * 0.35, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(s * 0.75, -s * 0.1, s * 0.35, 0, Math.PI * 2); ctx.fill();
        break;
      case 'standingstone':
        ctx.fillRect(-s * 0.65, -s * 0.9, s * 0.35, s * 1.3);
        ctx.fillRect(-s * 0.15, -s * 1.2, s * 0.3, s * 1.6);
        ctx.fillRect(s * 0.35, -s * 0.75, s * 0.3, s * 1.15);
        break;
      case 'barrel':
        ctx.beginPath(); ctx.moveTo(-s * 0.7, -s * 0.8); ctx.quadraticCurveTo(0, -s * 1.1, s * 0.7, -s * 0.8);
        ctx.lineTo(s * 0.7, s * 0.8); ctx.quadraticCurveTo(0, s * 1.1, -s * 0.7, s * 0.8); ctx.closePath(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-s * 0.7, -s * 0.25); ctx.lineTo(s * 0.7, -s * 0.25); ctx.moveTo(-s * 0.7, s * 0.25); ctx.lineTo(s * 0.7, s * 0.25); ctx.stroke();
        break;
      case 'tent':
        ctx.beginPath(); ctx.moveTo(-s, s * 0.4); ctx.lineTo(0, -s * 0.9); ctx.lineTo(s, s * 0.4); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(0, -s * 0.9); ctx.lineTo(0, s * 0.4); ctx.stroke();
        break;
      case 'lighthouse':
        ctx.fillStyle = '#e8e0c8';
        ctx.strokeStyle = '#5d4a28';
        ctx.fillRect(-s * 0.35, -s * 0.9, s * 0.7, s * 1.5);
        ctx.strokeRect(-s * 0.35, -s * 0.9, s * 0.7, s * 1.5);
        ctx.beginPath(); ctx.moveTo(-s * 0.45, -s * 0.9); ctx.lineTo(0, -s * 1.35); ctx.lineTo(s * 0.45, -s * 0.9); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = 'rgba(255,220,80,0.95)';
        ctx.beginPath(); ctx.arc(0, -s * 1.25, s * 0.22, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(255,220,80,0.45)';
        ctx.beginPath(); ctx.moveTo(0, -s * 1.25); ctx.lineTo(-s * 1.6, -s * 2.2); ctx.moveTo(0, -s * 1.25); ctx.lineTo(s * 1.6, -s * 2.2); ctx.stroke();
        break;
      case 'anchor':
        ctx.beginPath(); ctx.arc(0, -s * 0.5, s * 0.45, Math.PI, 0); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, -s * 0.95); ctx.lineTo(0, s * 0.8); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-s * 0.55, s * 0.35); ctx.lineTo(s * 0.55, s * 0.35); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-s * 0.35, s * 0.55); ctx.lineTo(0, s * 0.8); ctx.lineTo(s * 0.35, s * 0.55); ctx.stroke();
        break;
      case 'whale':
        ctx.beginPath();
        ctx.moveTo(-s * 1.0, 0);
        ctx.quadraticCurveTo(-s * 0.4, -s * 0.9, s * 0.4, -s * 0.3);
        ctx.quadraticCurveTo(s * 0.9, -s * 0.9, s * 1.0, -s * 0.25);
        ctx.quadraticCurveTo(s * 0.5, s * 0.1, -s * 0.3, s * 0.35);
        ctx.quadraticCurveTo(-s * 0.8, s * 0.5, -s * 1.0, 0);
        ctx.closePath();
        ctx.stroke();
        break;
      case 'sails':
        ctx.beginPath(); ctx.moveTo(0, s); ctx.lineTo(0, -s * 1.1); ctx.stroke();
        ctx.fillStyle = '#f2ecd8';
        ctx.beginPath(); ctx.moveTo(0, -s * 1.1); ctx.lineTo(s * 1.0, -s * 0.1); ctx.lineTo(0, s * 0.05); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#e3d9b8';
        ctx.beginPath(); ctx.moveTo(0, -s * 0.9); ctx.lineTo(-s * 0.85, -s * 0.05); ctx.lineTo(0, s * 0.1); ctx.closePath(); ctx.fill(); ctx.stroke();
        break;
      case 'coral':
        for (var i6 = 0; i6 < 4; i6++) {
          var a6 = -Math.PI / 2 + i6 * 0.5;
          ctx.beginPath();
          ctx.moveTo(0, s * 0.2);
          ctx.quadraticCurveTo(Math.cos(a6) * s * 0.7, Math.sin(a6) * s * 0.7 - s * 0.2, Math.cos(a6) * s * 0.9, Math.sin(a6) * s * 0.9 - s * 0.2);
          ctx.stroke();
        }
        break;
      case 'mist':
        ctx.strokeStyle = 'rgba(120,140,150,0.9)';
        for (var i7 = 0; i7 < 3; i7++) {
          var y7 = -s * 0.4 + i7 * s * 0.5;
          ctx.beginPath();
          ctx.moveTo(-s * 0.9, y7);
          ctx.quadraticCurveTo(0, y7 - s * 0.2, s * 0.9, y7);
          ctx.stroke();
        }
        break;
      case 'pearl':
        ctx.fillStyle = '#f3ecdd';
        ctx.beginPath(); ctx.arc(0, 0, s * 0.7, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.95)';
        ctx.beginPath(); ctx.arc(-s * 0.2, -s * 0.25, s * 0.2, 0, Math.PI * 2); ctx.fill();
        break;
      case 'shell':
        ctx.beginPath();
        ctx.moveTo(0, s * 0.8);
        ctx.quadraticCurveTo(-s * 0.9, s * 0.1, -s * 0.6, -s * 0.7);
        ctx.quadraticCurveTo(0, -s * 0.35, s * 0.6, -s * 0.7);
        ctx.quadraticCurveTo(s * 0.9, s * 0.1, 0, s * 0.8);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-s * 0.45, -s * 0.28);
        ctx.quadraticCurveTo(0, s * 0.05, s * 0.45, -s * 0.28);
        ctx.stroke();
        break;
      case 'gull':
        ctx.beginPath();
        ctx.moveTo(-s * 1.0, 0);
        ctx.quadraticCurveTo(-s * 0.35, -s * 0.7, 0, -s * 0.25);
        ctx.quadraticCurveTo(s * 0.35, -s * 0.7, s * 1.0, 0);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, -s * 0.25);
        ctx.lineTo(0, s * 0.5);
        ctx.stroke();
        break;
      case 'moon':
        ctx.beginPath();
        ctx.arc(0, 0, s * 0.8, 0, Math.PI * 2);
        ctx.fillStyle = '#f0e6c8';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(s * 0.3, -s * 0.15, s * 0.7, 0, Math.PI * 2);
        ctx.fillStyle = '#cfd6a8';
        ctx.fill();
        ctx.strokeStyle = '#5d4a28';
        ctx.beginPath();
        ctx.arc(0, 0, s * 0.8, Math.PI * 0.7, Math.PI * 1.3);
        ctx.stroke();
        break;
      case 'stonecircle':
        ctx.beginPath(); ctx.arc(0, 0, s * 0.8, 0, Math.PI * 2); ctx.stroke();
        for (var i8 = 0; i8 < 5; i8++) {
          var a8 = i8 * Math.PI * 2 / 5;
          ctx.beginPath(); ctx.arc(Math.cos(a8) * s * 0.8, Math.sin(a8) * s * 0.8, s * 0.16, 0, Math.PI * 2); ctx.stroke();
        }
        break;
      case 'chapel':
        ctx.fillRect(-s * 0.7, -s * 0.25, s * 1.4, s * 0.9);
        ctx.beginPath(); ctx.moveTo(-s * 0.85, -s * 0.25); ctx.lineTo(0, -s * 1.0); ctx.lineTo(s * 0.85, -s * 0.25); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(0, -s * 1.0); ctx.lineTo(0, -s * 1.45); ctx.stroke();
        break;
      default:
        ctx.beginPath(); ctx.arc(0, 0, s * 0.6, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
  }

  function drawForests(forests, palette) {
    forests.forEach(function (f) {
      var rnd = mulberry32(f.seed);
      for (var i = 0; i < f.n; i++) {
        var x = f.x + rnd() * f.w;
        var y = f.y + rnd() * f.h;
        var size = 4 + rnd() * 4;
        var green = palette[Math.floor(rnd() * palette.length)];
        ctx.fillStyle = green;
        ctx.strokeStyle = 'rgba(80,90,50,0.6)';
        ctx.lineWidth = 1 / view.scale;
        ctx.beginPath();
        ctx.moveTo(x, y - size * 2.2);
        ctx.lineTo(x + size * 0.9, y);
        ctx.lineTo(x - size * 0.9, y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = 'rgba(100,70,40,0.8)';
        ctx.fillRect(x - 1 / view.scale, y, 2 / view.scale, 3 / view.scale);
      }
    });
  }

  function drawMountains(x, y, w, n, color) {
    ctx.fillStyle = hexToRgba(color, 0.75);
    for (var i = 0; i < n; i++) {
      var mx = x + (i - (n - 1) / 2) * w / n;
      var h = w / n * 1.5;
      ctx.beginPath();
      ctx.moveTo(mx - w / n / 2, y);
      ctx.lineTo(mx, y - h);
      ctx.lineTo(mx + w / n / 2, y);
      ctx.closePath();
      ctx.fill();
    }
  }

  function ellipse(x, y, rx, ry) {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  function ellipseRot(x, y, rx, ry, rot) {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  function drawMarsh(x, y, rx, ry) {
    ctx.fillStyle = 'rgba(120,175,155,0.6)';
    ctx.strokeStyle = 'rgba(80,130,110,0.7)';
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0.35, Math.PI * 0.12, Math.PI * 0.88, false);
    ctx.ellipse(x, y + ry * 0.5, rx * 0.82, ry * 0.72, 0.35, Math.PI * 0.88, Math.PI * 0.12, true);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = 'rgba(70,110,90,0.75)';
    ctx.lineWidth = 1.2 / view.scale;
    for (var i = 0; i < 4; i++) {
      var px = x - rx * 0.6 + i * rx * 0.42;
      var py = y + ry * 0.15;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px, py - 7 / view.scale);
      ctx.stroke();
    }
  }

  function drawWaterfall(x, y) {
    ctx.strokeStyle = 'rgba(150,190,215,0.95)';
    ctx.lineWidth = 1.5 / view.scale;
    for (var i = 0; i < 3; i++) {
      var px = x + (i - 1) * 5;
      ctx.beginPath();
      ctx.moveTo(px, y);
      ctx.quadraticCurveTo(px + 3, y + 8, px, y + 16);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(150,190,215,0.7)';
    ctx.beginPath();
    ctx.ellipse(x, y + 17, 10, 4, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function caravanCurvedPos(cv) {
    var leg = cv.legs[cv.legIdx];
    if (!leg) return null;
    var a = DL.DATA.cityById(leg.from), b = DL.DATA.cityById(leg.to);
    var t = Math.min(1, cv.progress / leg.days);
    return curvePoint(a.x, a.y, b.x, b.y, t);
  }

  function drawShield(c, isHome, hover, st) {
    var sp = worldToScreen(c.x, c.y);
    var size = Math.max(9, 14 * Math.min(1.6, view.scale));
    var nation = DL.DATA.nationById(c.nation);
    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var y = sp.y, x = sp.x;
    ctx.beginPath();
    ctx.moveTo(x - size, y - size * 0.9);
    ctx.lineTo(x + size, y - size * 0.9);
    ctx.lineTo(x + size, y - size * 0.1);
    ctx.quadraticCurveTo(x + size, y + size * 0.75, x, y + size * 1.15);
    ctx.quadraticCurveTo(x - size, y + size * 0.75, x - size, y - size * 0.1);
    ctx.closePath();
    ctx.fillStyle = nation.color;
    ctx.fill();
    ctx.strokeStyle = isHome ? '#c9a227' : '#5d4a28';
    ctx.lineWidth = isHome ? 2.5 : 1.4;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x - size * 0.45, y - size * 0.65);
    ctx.lineTo(x + size * 0.45, y - size * 0.65);
    ctx.lineTo(x + size * 0.45, y - size * 0.15);
    ctx.quadraticCurveTo(x + size * 0.45, y + size * 0.45, x, y + size * 0.75);
    ctx.quadraticCurveTo(x - size * 0.45, y + size * 0.45, x - size * 0.45, y - size * 0.15);
    ctx.closePath();
    ctx.fillStyle = hexToRgba(nation.color, 0.45);
    ctx.fill();
    if (hover || isHome) {
      ctx.beginPath();
      ctx.arc(x, y, size * 1.25 + (hover ? 1 : Math.sin(pulse) * 1.5), 0, Math.PI * 2);
      ctx.strokeStyle = isHome ? 'rgba(201,162,39,' + (0.7 + Math.sin(pulse) * 0.2) + ')' : 'rgba(255,255,255,0.85)';
      ctx.lineWidth = 1.6;
      ctx.stroke();
    }
    if (st) {
      ctx.fillStyle = st.prosperity >= 70 ? '#3f9d4a' : (st.prosperity >= 45 ? '#c9a227' : '#c05a3a');
      ctx.beginPath();
      ctx.arc(x, y - size * 0.9 - 3, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawCityNames() {
    ctx.save();
    ctx.textAlign = 'center';
    DL.DATA.CITIES.forEach(function (c) {
      var sp = worldToScreen(c.x, c.y);
      var size = Math.max(9, 14 * Math.min(1.6, view.scale));
      var isHome = state && c.id === state.homeCityId;
      ctx.font = (isHome ? 'bold ' : '') + '11px "Microsoft YaHei", sans-serif';
      var labelY = sp.y + size * 1.45 + 3;
      ctx.fillStyle = 'rgba(255,250,235,0.85)';
      ctx.fillText(c.name, sp.x + 1, labelY + 1);
      ctx.fillStyle = isHome ? 'rgba(120,80,10,0.95)' : 'rgba(62,44,20,0.9)';
      ctx.fillText(c.name, sp.x, labelY);
    });
    // 中立区与著名地标注记
    var pois = [
      ['古环域', 680, 553], ['青柠修道院', 480, 698], ['银冠堡', 600, 578]
    ];
    pois.forEach(function (p) {
      var sp = worldToScreen(p[1], p[2]);
      ctx.font = '10px "Microsoft YaHei", sans-serif';
      ctx.fillStyle = 'rgba(255,250,235,0.85)';
      ctx.fillText(p[0], sp.x + 1, sp.y + 1);
      ctx.fillStyle = 'rgba(90,70,40,0.9)';
      ctx.fillText(p[0], sp.x, sp.y);
    });
    ctx.restore();
  }

  function drawSeaNotes() {
    var labels = [
      ['翡翠湾', 78, 500], ['鹬鸟潟湖', 700, 74], ['贝壳滩', 905, 612],
      ['鹿角半岛', 792, 72], ['日光岬', 96, 662],
      ['苍澜海', 300, 880], ['雾灯海', 60, 1110], ['鲸歌湾', 370, 1095],
      ['远澜航路', 150, 780], ['东海', 1000, 320], ['银沙海', 1140, 730]
    ];
    ctx.save();
    ctx.font = '12px "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(55,110,135,0.9)';
    labels.forEach(function (l) {
      var sp = worldToScreen(l[1], l[2]);
      ctx.fillText(l[0], sp.x, sp.y);
    });
    ctx.restore();
  }

  function hexagon(x, y, r) {
    ctx.beginPath();
    for (var i = 0; i < 6; i++) {
      var a = Math.PI / 6 + i * Math.PI / 3;
      var px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();
  }

  function drawFrame() {
    var cx = W - 58, cy = H - 58, r = 30;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.strokeStyle = 'rgba(74,53,32,0.7)';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = 'rgba(74,53,32,0.85)';
    for (var i = 0; i < 4; i++) {
      var a = i * Math.PI / 2;
      ctx.save();
      ctx.rotate(a);
      ctx.beginPath();
      ctx.moveTo(0, -r + 6);
      ctx.lineTo(5, 0);
      ctx.lineTo(-5, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = '#8a5a20';
    ctx.font = 'bold 15px serif';
    ctx.textAlign = 'center';
    ctx.fillText('N', 0, -r + 20);
    ctx.restore();

    ctx.save();
    ctx.fillStyle = 'rgba(74,53,32,0.9)';
    ctx.font = 'bold 22px "Microsoft YaHei", serif';
    ctx.textAlign = 'left';
    ctx.shadowColor = 'rgba(255,255,255,0.7)';
    ctx.shadowBlur = 6;
    ctx.fillText('曦光之地', 18, 34);
    ctx.restore();
    ctx.fillStyle = 'rgba(74,53,32,0.6)';
    ctx.font = '12px "Microsoft YaHei", sans-serif';
    ctx.fillText('橡树叶形的温暖大陆 · 百花纪 · 西南海外苍澜洲', 20, 52);
  }

  function hexToRgba(hex, a) {
    var r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
  }

  function updateHover(e) {
    if (!state) return;
    var rect = canvas.getBoundingClientRect();
    var mx = e.clientX - rect.left, my = e.clientY - rect.top;
    var hitCity = null, hitRoute = null, hitCaravan = null;
    DL.DATA.CITIES.forEach(function (c) {
      var sp = worldToScreen(c.x, c.y);
      if (Math.abs(sp.x - mx) < 14 && Math.abs(sp.y - my) < 14) hitCity = c.id;
    });
    DL.DATA.ROUTES.forEach(function (r) {
      var minD = 1e9;
      for (var i = 0; i < r.stops.length - 1; i++) {
        var a = DL.DATA.cityById(r.stops[i]), b = DL.DATA.cityById(r.stops[i + 1]);
        var samples = curveLegSamples(a.x, a.y, b.x, b.y, 8);
        for (var k = 0; k < samples.length - 1; k++) {
          var sa = worldToScreen(samples[k].x, samples[k].y);
          var sb = worldToScreen(samples[k + 1].x, samples[k + 1].y);
          var d = pointSegDist(mx, my, sa.x, sa.y, sb.x, sb.y);
          if (d < minD) minD = d;
        }
      }
      if (minD < 7) hitRoute = r.id;
    });
    if (state.caravans) {
      state.caravans.forEach(function (cv) {
        if (cv.done) return;
        var p = caravanCurvedPos(cv);
        if (!p) return;
        var sp = worldToScreen(p.x, p.y);
        if (Math.hypot(sp.x - mx, sp.y - my) < 14) hitCaravan = cv.id;
      });
    }
    if (hitCity !== hoverCity || hitRoute !== hoverRoute || hitCaravan !== hoverCaravan) {
      hoverCity = hitCity;
      hoverRoute = hitRoute;
      hoverCaravan = hitCaravan;
      if (hitCaravan) {
        var cv = null;
        state.caravans.forEach(function (c) { if (c.id === hitCaravan) cv = c; });
        if (cv) {
          var leader = DL.DATA.leaderById(cv.leaderId);
          var leg = cv.legs[cv.legIdx];
          var eta = Math.max(0, Math.ceil((cv.legs.length - cv.legIdx - 1) + (leg.days - cv.progress)));
          var guardName = cv.guard ? DL.DATA.adventurerById(cv.guard.id).name : '无护卫';
          var cargoTxt = DL.Caravans.cargoSummary(cv.cargo);
          showTooltip('商队 · ' + leader.name + '<br>' + (cv.state === 'outbound' ? '去程 → ' + DL.DATA.cityById(cv.destCityId).name : '回程 ← ' + DL.DATA.cityById(cv.destCityId).name) + ' · 约 ' + eta + ' 天<br>载货：' + cargoTxt + '<br>护卫：' + guardName, e.clientX - rect.left, e.clientY - rect.top);
        }
      } else if (hitCity) {
        var c = DL.DATA.cityById(hitCity);
        var st = state.cities[hitCity];
        showTooltip(c.name + '（' + DL.DATA.nationById(c.nation).short + '）<br>人口 ' + Math.round(st.pop) + ' · 繁荣 ' + Math.round(st.prosperity) + ' · 信用 ' + Math.round(st.credit) + '<br>点击查看详情并派出商队', e.clientX - rect.left, e.clientY - rect.top);
      } else if (hitRoute) {
        var r = DL.DATA.routeById(hitRoute);
        showTooltip('「' + r.name + '」· ' + r.days + '天<br>' + r.note, e.clientX - rect.left, e.clientY - rect.top);
      } else {
        hideTooltip();
      }
    }
  }

  function pointSegDist(px, py, ax, ay, bx, by) {
    var dx = bx - ax, dy = by - ay;
    if (dx === 0 && dy === 0) return Math.hypot(px - ax, py - ay);
    var t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
    return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
  }

  function handleClick(e) {
    if (!state || !onSelect) return;
    var rect = canvas.getBoundingClientRect();
    var mx = e.clientX - rect.left, my = e.clientY - rect.top;
    var best = null, bestD = 18;
    DL.DATA.CITIES.forEach(function (c) {
      var sp = worldToScreen(c.x, c.y);
      var d = Math.hypot(sp.x - mx, sp.y - my);
      if (d < bestD) { bestD = d; best = c.id; }
    });
    if (best) onSelect(best);
  }

  function showTooltip(html, x, y) {
    if (!tooltipEl) return;
    tooltipEl.innerHTML = html;
    tooltipEl.classList.remove('hidden');
    var left = Math.min(x + 14, W - 190);
    var top = Math.max(6, y - 10);
    tooltipEl.style.left = left + 'px';
    tooltipEl.style.top = top + 'px';
  }

  function hideTooltip() {
    if (tooltipEl) tooltipEl.classList.add('hidden');
  }

  function setSelectHandler(fn) { onSelect = fn; }

  DL.Map = {
    init: init,
    setGame: setGame,
    setSelectHandler: setSelectHandler,
    centerOn: centerOn,
    draw: draw
  };
})(typeof window !== 'undefined' ? window : globalThis);
