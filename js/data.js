/* 曦光之地：商会风云 —— 世界数据（源自《Dawnland世界观设定》） */
(function (G) {
  'use strict';
  var DL = G.DL = G.DL || {};

  var NATIONS = [
    { id: 'north',   name: '北境牧原联邦', short: '北境', color: '#7b96a5', tone: '灰白/墨绿/浅蓝', adj: ['sundial', 'east'] },
    { id: 'sundial', name: '日晷王域',     short: '日晷', color: '#d6bd7d', tone: '乳白/浅金/鸽灰', adj: ['north', 'wheat', 'amber', 'jade', 'east'] },
    { id: 'wheat',   name: '金穗公国',     short: '金穗', color: '#d8a838', tone: '金黄/暖绿/天蓝', adj: ['sundial', 'amber', 'east'] },
    { id: 'amber',   name: '琥珀河谷邦',   short: '琥珀', color: '#c9643a', tone: '暖橙/赭红/紫红', adj: ['sundial', 'wheat', 'jade'] },
    { id: 'jade',    name: '青崖沿海自由市', short: '青崖', color: '#3f9d9a', tone: '海蓝/浅绿/沙白', adj: ['sundial', 'amber', 'north'] },
    { id: 'east',    name: '东林兄弟会',   short: '东林', color: '#5d8f4f', tone: '翠绿/棕褐/淡粉', adj: ['north', 'sundial', 'wheat'] },
    { id: 'azure',   name: '苍澜海盟',     short: '苍澜', color: '#2f8f96', tone: '海蓝/雾灰/月白', adj: ['jade'] },
    { id: 'silver',  name: '银沙大岛',     short: '银沙', color: '#c9a45a', tone: '沙金/海盐/晚霞', adj: ['jade', 'azure'] }
  ];

  var GOODS = [
    { id: 'flour',   name: '面粉',     cat: '谷物',   origin: 'wheat',   base: 10,  weight: 10, perish: 0, fragile: false, prod: { type: 'agri',  rate: 0.45 }, seasonal: { 6: 0.70, 10: 1.20 }, note: '丰熟月-30%，霜晨月+20%' },
    { id: 'ale',     name: '麦酒',     cat: '饮品',   origin: 'wheat',   base: 22,  weight: 15, perish: 0, fragile: false, prod: { type: 'craft', rate: 0.25 }, seasonal: { 6: 1.10 }, note: '丰熟月+10%' },
    { id: 'honey',   name: '蜂蜜',     cat: '食品',   origin: 'wheat',   base: 30,  weight: 5,  perish: 0, fragile: false, prod: { type: 'agri',  rate: 0.12 }, seasonal: { 1: 1.20, 2: 1.15, 3: 1.10 }, note: '百花月后新蜜价高' },
    { id: 'wine',    name: '葡萄酒',   cat: '酒类',   origin: 'amber',   base: 45,  weight: 15, perish: 0, fragile: false, prod: { type: 'agri',  rate: 0.16 }, seasonal: { 7: 1.50, 0: 0.90 }, note: '酿造月新品+50%' },
    { id: 'oil',     name: '橄榄油',   cat: '食品',   origin: 'amber',   base: 38,  weight: 10, perish: 0, fragile: false, prod: { type: 'agri',  rate: 0.14 }, seasonal: {}, note: '全年平稳，金秋大集+15%' },
    { id: 'pottery', name: '彩陶',     cat: '工艺品', origin: 'amber',   base: 55,  weight: 8,  perish: 0, fragile: true,  prod: { type: 'craft', rate: 0.14 }, seasonal: {}, note: '易碎，运送破损率15%' },
    { id: 'fish',    name: '咸鱼',     cat: '海产',   origin: 'jade',    base: 18,  weight: 12, perish: 7, fragile: false, prod: { type: 'agri',  rate: 0.20 }, seasonal: { 9: 1.30, 3: 0.85 }, note: '7天保鲜' },
    { id: 'salt',    name: '花香盐',   cat: '调味品', origin: 'jade',    base: 48,  weight: 5,  perish: 0, fragile: false, prod: { type: 'agri',  rate: 0.12 }, seasonal: { 0: 1.80, 1: 1.70, 2: 1.50, 3: 1.30 }, note: '雨季产量减半、价格翻倍' },
    { id: 'carving', name: '木雕',     cat: '工艺品', origin: 'east',    base: 60,  weight: 6,  perish: 0, fragile: false, prod: { type: 'craft', rate: 0.12 }, seasonal: { 8: 1.15 }, note: '金秋月+15%' },
    { id: 'herb',    name: '药草',     cat: '药材',   origin: 'east',    base: 25,  weight: 3,  perish: 14, fragile: false, prod: { type: 'agri',  rate: 0.20 }, seasonal: { 9: 1.10 }, note: '14天保鲜' },
    { id: 'resin',   name: '松脂糖',   cat: '食品',   origin: 'east',    base: 12,  weight: 2,  perish: 0, fragile: false, prod: { type: 'agri',  rate: 0.28 }, seasonal: { 1: 1.30 }, note: '儿童节需求高' },
    { id: 'wool',    name: '羊毛',     cat: '纺织原料', origin: 'north',  base: 35,  weight: 15, perish: 0, fragile: false, prod: { type: 'agri',  rate: 0.15 }, seasonal: { 2: 0.80, 11: 1.40 }, note: '静息月+40%' },
    { id: 'cheese',  name: '奶酪',     cat: '食品',   origin: 'north',   base: 28,  weight: 10, perish: 10, fragile: false, prod: { type: 'agri',  rate: 0.12 }, seasonal: { 11: 1.30 }, note: '10天保鲜' },
    { id: 'pony',    name: '矮脚马',   cat: '活畜',   origin: 'north',   base: 300, weight: 200, perish: 0, fragile: false, prod: { type: 'agri',  rate: 0.03 }, seasonal: {}, special: '仅高原夏道可购', note: '活物，占200kg' },
    { id: 'copper',  name: '铜器',     cat: '金属制品', origin: 'sundial', base: 80, weight: 20, perish: 0, fragile: false, prod: { type: 'craft', rate: 0.10 }, seasonal: {}, note: '金秋大集+20%' },
    { id: 'book',    name: '书籍/手抄本', cat: '文化用品', origin: 'sundial', base: 90, weight: 5, perish: 0, fragile: false, prod: { type: 'craft', rate: 0.08 }, seasonal: { 11: 1.25 }, note: '礼赠节+25%' },
    { id: 'pearl',   name: '珍珠',     cat: '奢侈品',   origin: 'jade',  base: 120, weight: 1,  perish: 0, fragile: true,  prod: { type: 'agri',  rate: 0.03 }, seasonal: {}, note: '青贝港与苍澜珠田的明珠，易碎' },
    { id: 'wax',     name: '鲸蜡',     cat: '日用品',   origin: 'azure', base: 45,  weight: 8,  perish: 0, fragile: false, prod: { type: 'agri',  rate: 0.07 }, seasonal: {}, note: '灯油蜡烛原料，节日紧俏' },
    { id: 'canvas',  name: '帆布',     cat: '纺织原料', origin: 'azure', base: 30,  weight: 12, perish: 0, fragile: false, prod: { type: 'craft', rate: 0.09 }, seasonal: {}, note: '远洋楼船的帆与篷' },
    { id: 'coral',   name: '珊瑚饰',   cat: '工艺品',   origin: 'azure', base: 70,  weight: 3,  perish: 0, fragile: true,  prod: { type: 'craft', rate: 0.05 }, seasonal: {}, note: '礁石城的珊瑚陶与珊瑚首饰，易碎' },
    { id: 'chart',   name: '海图',     cat: '文化用品', origin: 'azure', base: 100, weight: 2,  perish: 0, fragile: false, prod: { type: 'craft', rate: 0.04 }, seasonal: {}, note: '青霭城海图师的墨宝' },
    { id: 'iron',    name: '铁器',     cat: '金属制品', origin: 'amber', base: 60,  weight: 15, perish: 0, fragile: false, prod: { type: 'craft', rate: 0.08 }, seasonal: {}, note: '南部矿区与窑口的铁器' },
    { id: 'linen',   name: '亚麻布',   cat: '纺织原料', origin: 'north', base: 40,  weight: 8,  perish: 0, fragile: false, prod: { type: 'craft', rate: 0.08 }, seasonal: {}, note: '北境夏布的清凉织物' },
    { id: 'fruit',   name: '果干',     cat: '食品',     origin: 'wheat', base: 22,  weight: 6,  perish: 30, fragile: false, prod: { type: 'agri',  rate: 0.10 }, seasonal: {}, note: '杏干枣脯，耐存30天' },
    { id: 'timber',  name: '香木',     cat: '建材原料', origin: 'east',  base: 32,  weight: 20, perish: 0, fragile: false, prod: { type: 'agri',  rate: 0.12 }, seasonal: {}, note: '青橡与风吟柳的良材' },
    { id: 'spice',   name: '香料',     cat: '调味品',   origin: 'jade',  base: 65,  weight: 3,  perish: 0, fragile: false, prod: { type: 'agri',  rate: 0.05 }, seasonal: {}, note: '盐花原与月落屿的辛香' },
    { id: 'rawfruit', name: '水果',     cat: '食品',     origin: 'wheat', base: 14,  weight: 5,  perish: 7, fragile: false, prod: { type: 'agri',  rate: 0.15 }, seasonal: {}, note: '新鲜时令水果，耐存7天' },
    { id: 'craftbeer', name: '精酿啤酒', cat: '饮品',    origin: 'wheat', base: 26,  weight: 15, perish: 0, fragile: false, prod: { type: 'craft', rate: 0.12 }, seasonal: {}, note: '酒馆的招牌饮品' },
    { id: 'clothing', name: '衣服',     cat: '日用品',   origin: 'north', base: 45,  weight: 5,  perish: 0, fragile: false, prod: { type: 'craft', rate: 0.08 }, seasonal: {}, note: '羊毛织成的成衣' },
    { id: 'bread',   name: '面包',     cat: '食品',     origin: 'wheat', base: 14,  weight: 5,  perish: 5, fragile: false, prod: { type: 'craft', rate: 0.15 }, seasonal: {}, note: '刚出炉的软面包，5天保鲜' },
    { id: 'roughbread', name: '粗制面包', cat: '食品',   origin: 'wheat', base: 8,   weight: 8,  perish: 7, fragile: false, prod: { type: 'craft', rate: 0.12 }, seasonal: {}, note: '能管饱的粗粮面包' }
  ];

  var CITIES = [
    { id: 'sunring',       nation: 'sundial', name: '日晷王城',   x: 500, y: 430, desc: '大陆心脏，千窗书塔藏万卷。', landmark: 'sundial', flags: ['lake'], currency: 'dinar', quality: { book: 3, copper: 2 },
      init: { pop: 2400, prosperity: 75, credit: 85, connectivity: 90, tourism: 80, industry: { agri: 40, craft: 70, mining: 30 } }, specialties: ['book', 'copper'] },
    { id: 'threesprings',  nation: 'sundial', name: '三泉镇',     x: 440, y: 370, desc: '三眼泉水冷热各异，夏至泼泉节。', landmark: 'spring', flags: [], currency: 'dinar',
      init: { pop: 700, prosperity: 55, credit: 60, connectivity: 55, tourism: 65, industry: { agri: 45, craft: 35, mining: 20 } }, specialties: [] },
    { id: 'copperabbey',   nation: 'sundial', name: '铜门修道院', x: 565, y: 395, desc: '铸铜钟与日晷闻名，铜叶榆叮当响。', landmark: 'belltower', flags: [], currency: 'dinar',
      init: { pop: 500, prosperity: 50, credit: 65, connectivity: 50, tourism: 45, industry: { agri: 35, craft: 55, mining: 25 } }, specialties: ['copper'], quality: { copper: 3, book: 2 } },
    { id: 'wheatseat',     nation: 'wheat',   name: '金穗领',     x: 655, y: 432, desc: '无边麦田，天蓝风车翼磨坊。', landmark: 'windmill', flags: ['lake'], currency: 'wheatpound', quality: { flour: 3, ale: 2, fruit: 2 },
      init: { pop: 1600, prosperity: 70, credit: 70, connectivity: 70, tourism: 55, industry: { agri: 95, craft: 45, mining: 15 } }, specialties: ['flour', 'fruit'] },
    { id: 'beemarket',     nation: 'wheat',   name: '蜂鸣市集',   x: 615, y: 480, desc: '十字路口集市，黑蜂守护古榆。', landmark: 'hive', flags: [], currency: 'wheatpound', quality: { honey: 3, ale: 2, fruit: 2 },
      init: { pop: 900, prosperity: 65, credit: 62, connectivity: 75, tourism: 60, industry: { agri: 55, craft: 60, mining: 10 } }, specialties: ['honey', 'fruit'] },
    { id: 'twinbridge',    nation: 'wheat',   name: '双河堡',     x: 700, y: 470, desc: '扼两河交汇，水车灌溉百里良田。', landmark: 'waterwheel', flags: ['river'], currency: 'wheatpound', quality: { ale: 3, flour: 2 },
      init: { pop: 800, prosperity: 60, credit: 68, connectivity: 72, tourism: 40, industry: { agri: 70, craft: 40, mining: 20 } }, specialties: ['ale'] },
    { id: 'amberterraces', nation: 'amber',   name: '琥珀梯田',   x: 560, y: 700, desc: '石砌梯田层层叠叠，夕阳如琥珀燃烧。', landmark: 'grape', flags: [], currency: 'sol', quality: { wine: 3, oil: 2, fruit: 2 },
      init: { pop: 1100, prosperity: 68, credit: 72, connectivity: 65, tourism: 70, industry: { agri: 75, craft: 55, mining: 40 } }, specialties: ['wine', 'oil', 'fruit'] },
    { id: 'oldolive',      nation: 'amber',   name: '老橄榄泉',   x: 520, y: 760, desc: '千年橄榄树下免费供腌橄榄。', landmark: 'olivetree', flags: [], currency: 'sol', quality: { oil: 3 },
      init: { pop: 600, prosperity: 55, credit: 58, connectivity: 50, tourism: 60, industry: { agri: 60, craft: 40, mining: 25 } }, specialties: ['oil'] },
    { id: 'brickhill',     nation: 'amber',   name: '砖窑丘',     x: 620, y: 745, desc: '烧制南部金砖，废瓷片拼成碎瓷塔。', landmark: 'kiln', flags: [], currency: 'sol', quality: { pottery: 3, iron: 3 },
      init: { pop: 700, prosperity: 58, credit: 60, connectivity: 55, tourism: 45, industry: { agri: 45, craft: 65, mining: 60 } }, specialties: ['pottery', 'iron'] },
    { id: 'floralbasin',   nation: 'amber',   name: '花盆盆地',   x: 460, y: 810, desc: '琥珀山环抱的圆形花田，四季如春。', landmark: 'flower', flags: [], currency: 'sol', quality: { honey: 2, oil: 2 },
      init: { pop: 850, prosperity: 66, credit: 60, connectivity: 48, tourism: 80, industry: { agri: 80, craft: 45, mining: 10 } }, specialties: ['honey'] },
    { id: 'greenharbor',   nation: 'jade',    name: '青贝港',     x: 120, y: 505, desc: '最大港口与造船中心，柳叶船之家。', landmark: 'ship', flags: ['coastal'], currency: 'jademark', quality: { fish: 3, salt: 2, pearl: 3 },
      init: { pop: 1900, prosperity: 72, credit: 75, connectivity: 95, tourism: 75, industry: { agri: 35, craft: 60, mining: 15 } }, specialties: ['fish', 'pearl'] },
    { id: 'saltflower',    nation: 'jade',    name: '盐花原',     x: 118, y: 588, desc: '浅滩晒盐场，盐粒如钻石。', landmark: 'saltmound', flags: ['coastal'], currency: 'jademark', quality: { salt: 3, spice: 2 },
      init: { pop: 650, prosperity: 55, credit: 62, connectivity: 70, tourism: 40, industry: { agri: 30, craft: 35, mining: 30 } }, specialties: ['salt', 'spice'] },
    { id: 'whitestone',    nation: 'jade',    name: '白石渡',     x: 250, y: 655, desc: '浅河卵石渡口，河水如牛乳。', landmark: 'bridge', flags: ['coastal', 'river'], currency: 'jademark', quality: { fish: 2 },
      init: { pop: 500, prosperity: 50, credit: 58, connectivity: 68, tourism: 45, industry: { agri: 45, craft: 30, mining: 20 } }, specialties: [] },
    { id: 'golddelta',     nation: 'jade',    name: '金河三角洲', x: 235, y: 745, desc: '水稻水网迷宫，平底小船挂铜铃。', landmark: 'rice', flags: ['coastal', 'river'], currency: 'jademark', quality: { fish: 2, flour: 2 },
      init: { pop: 1000, prosperity: 62, credit: 65, connectivity: 80, tourism: 50, industry: { agri: 85, craft: 40, mining: 10 } }, specialties: [] },
    { id: 'spotlight',     nation: 'east',    name: '光斑林镇',   x: 790, y: 370, desc: '阳光斑驳的林间小镇，木语工坊闻名。', landmark: 'house', flags: ['lake'], currency: 'shilling', quality: { carving: 3, herb: 2, timber: 2 },
      init: { pop: 900, prosperity: 64, credit: 66, connectivity: 60, tourism: 65, industry: { agri: 55, craft: 80, mining: 15 } }, specialties: ['carving', 'timber'] },
    { id: 'deerspring',    nation: 'east',    name: '鹿鸣泉',     x: 860, y: 455, desc: '森林深泉，野鹿来饮，皮革作坊闻名。', landmark: 'deer', flags: [], currency: 'shilling', quality: { herb: 2, carving: 2 },
      init: { pop: 650, prosperity: 58, credit: 60, connectivity: 55, tourism: 55, industry: { agri: 50, craft: 70, mining: 10 } }, specialties: [] },
    { id: 'pineresin',     nation: 'east',    name: '松脂市',     x: 820, y: 285, desc: '森林边缘集市，琥珀箭糖棍诱人。', landmark: 'pine', flags: [], currency: 'shilling', quality: { resin: 3, timber: 3 },
      init: { pop: 700, prosperity: 60, credit: 62, connectivity: 62, tourism: 48, industry: { agri: 45, craft: 75, mining: 30 } }, specialties: ['resin', 'timber'] },
    { id: 'willowwind',    nation: 'east',    name: '风吟柳林',   x: 885, y: 540, desc: '柳林湿地，高脚木屋观鸟。', landmark: 'willow', flags: [], currency: 'shilling', quality: { herb: 3, resin: 2 },
      init: { pop: 550, prosperity: 55, credit: 58, connectivity: 50, tourism: 60, industry: { agri: 60, craft: 50, mining: 10 } }, specialties: ['herb'] },
    { id: 'woolcliff',     nation: 'north',   name: '羊毛崖',     x: 500, y: 120, desc: '冬季会盟地，屋顶覆草皮开野花。', landmark: 'sheep', flags: [], currency: 'lira', quality: { wool: 3, cheese: 2, linen: 2 },
      init: { pop: 800, prosperity: 60, credit: 65, connectivity: 58, tourism: 55, industry: { agri: 55, craft: 60, mining: 25 } }, specialties: ['wool', 'linen'] },
    { id: 'dawnstone',     nation: 'north',   name: '晨碑丘陵',   x: 430, y: 190, desc: '三根乳白石柱，春分系布节。', landmark: 'standingstone', flags: [], currency: 'lira', quality: { wool: 2 },
      init: { pop: 500, prosperity: 52, credit: 55, connectivity: 45, tourism: 58, industry: { agri: 60, craft: 45, mining: 20 } }, specialties: [] },
    { id: 'heatherwinery', nation: 'north',   name: '石楠酒庄',   x: 565, y: 195, desc: '老姐妹的深琥珀色石楠蜜酒与窖藏葡萄酒，酒窖成诗窟。', landmark: 'barrel', flags: [], currency: 'lira', quality: { ale: 3, wine: 2, wool: 2 },
      init: { pop: 450, prosperity: 56, credit: 58, connectivity: 42, tourism: 62, industry: { agri: 55, craft: 65, mining: 15 } }, specialties: ['wine'] },
    { id: 'grasshighland', nation: 'north',   name: '青草高原',   x: 470, y: 80,  desc: '夏季白毡帐连绵，矮脚马产地。', landmark: 'tent', flags: [], currency: 'lira', quality: { pony: 3, wool: 2, cheese: 2 },
      init: { pop: 400, prosperity: 50, credit: 52, connectivity: 40, tourism: 50, industry: { agri: 70, craft: 35, mining: 10 } }, specialties: ['pony'] },
    // ===== 苍澜洲（西南海外新大陆）=====
    { id: 'canglang',  nation: 'azure', name: '沧浪港',   x: 190, y: 1020, desc: '苍澜洲第一大港，柳叶船在这里换成远洋楼船。', landmark: 'anchor', flags: ['coastal'], currency: 'azureshell', quality: { fish: 3, salt: 2, carving: 2, canvas: 2, pearl: 2 },
      init: { pop: 1500, prosperity: 68, credit: 72, connectivity: 82, tourism: 70, industry: { agri: 40, craft: 65, mining: 25 } }, specialties: ['fish', 'salt', 'canvas', 'pearl'] },
    { id: 'jingge',    nation: 'azure', name: '鲸歌湾',   x: 305, y: 1105, desc: '月牙海湾常有鲸群歌唱，港湾深处泊着捕鲸船。', landmark: 'whale', flags: ['coastal'], currency: 'azureshell', quality: { fish: 3, oil: 2, wax: 3, pearl: 2 },
      init: { pop: 900, prosperity: 60, credit: 65, connectivity: 72, tourism: 75, industry: { agri: 45, craft: 55, mining: 20 } }, specialties: ['fish', 'wax'] },
    { id: 'wudeng',    nation: 'azure', name: '雾灯屿',   x: 92, y: 1075, desc: '常年海雾缭绕的小岛，灯塔是夜航人唯一的依靠。', landmark: 'lighthouse', flags: ['coastal'], currency: 'azureshell', quality: { herb: 3, resin: 2, spice: 2 },
      init: { pop: 600, prosperity: 55, credit: 60, connectivity: 56, tourism: 66, industry: { agri: 40, craft: 45, mining: 15 } }, specialties: ['herb', 'resin', 'spice'] },
    { id: 'jiaoshi',   nation: 'azure', name: '礁石城',   x: 245, y: 1205, desc: '珊瑚礁环抱的南方渔镇，窑火烧出斑斓珊瑚陶。', landmark: 'coral', flags: ['coastal'], currency: 'azureshell', quality: { pottery: 3, fish: 2, coral: 3, pearl: 2 },
      init: { pop: 700, prosperity: 58, credit: 62, connectivity: 60, tourism: 60, industry: { agri: 35, craft: 70, mining: 30 } }, specialties: ['pottery', 'coral'] },
    { id: 'fengfan',   nation: 'azure', name: '风帆镇',   x: 335, y: 1175, desc: '造船匠人的小镇，船坞里的龙骨比房子还长。', landmark: 'sails', flags: ['coastal'], currency: 'azureshell', quality: { carving: 3, ale: 2, canvas: 3 },
      init: { pop: 800, prosperity: 62, credit: 64, connectivity: 68, tourism: 58, industry: { agri: 40, craft: 75, mining: 15 } }, specialties: ['carving', 'ale', 'canvas'] },
    { id: 'yanmo',     nation: 'azure', name: '盐沫镇',   x: 145, y: 1210, desc: '浅滩晒盐，海风一吹满地盐花，像落了层薄雪。', landmark: 'saltmound', flags: ['coastal'], currency: 'azureshell', quality: { salt: 3 },
      init: { pop: 500, prosperity: 52, credit: 55, connectivity: 45, tourism: 42, industry: { agri: 30, craft: 35, mining: 30 } }, specialties: ['salt'] },
    { id: 'qingai',    nation: 'azure', name: '青霭城',   x: 210, y: 1100, desc: '雨林深处的内陆都会，雾霭缠绕钟楼，海图师云集。', landmark: 'mist', flags: [], currency: 'azureshell', quality: { herb: 3, book: 2, chart: 3, spice: 2 },
      init: { pop: 1000, prosperity: 64, credit: 68, connectivity: 62, tourism: 55, industry: { agri: 70, craft: 60, mining: 20 } }, specialties: ['herb', 'book', 'chart'] },
    // ===== 新增岛屿与城镇 =====
    { id: 'beizhuyu', nation: 'jade',  name: '贝珠屿',   x: 100, y: 440, desc: '星散群岛中的珍珠岛，浅湾里养着成片的珠贝。', landmark: 'pearl', flags: ['coastal'], currency: 'jademark', quality: { pearl: 3, fish: 2 },
      init: { pop: 550, prosperity: 58, credit: 62, connectivity: 66, tourism: 62, industry: { agri: 45, craft: 55, mining: 15 } }, specialties: ['pearl', 'fish'] },
    { id: 'luowan',   nation: 'east',  name: '螺湾',     x: 895, y: 600, desc: '贝壳滩北端的海螺形海湾，木匠们在这里造小渔船。', landmark: 'shell', flags: ['coastal'], currency: 'shilling', quality: { fish: 2, carving: 2 },
      init: { pop: 600, prosperity: 56, credit: 60, connectivity: 62, tourism: 58, industry: { agri: 40, craft: 65, mining: 15 } }, specialties: ['fish', 'carving'] },
    { id: 'gullisle', nation: 'jade',  name: '鸥歌岛',   x: 250, y: 940, desc: '两大陆之间的中途岛，海鸥成群，淡水泉眼甘甜。', landmark: 'gull', flags: ['coastal'], currency: 'jademark', quality: { fish: 2, salt: 2 },
      init: { pop: 700, prosperity: 60, credit: 64, connectivity: 70, tourism: 68, industry: { agri: 45, craft: 50, mining: 15 } }, specialties: ['fish', 'salt'] },
    { id: 'chenzhu',  nation: 'azure', name: '沉珠岛',   x: 370, y: 1045, desc: '苍澜东侧的海田岛，筏架下的珠贝沉在暖流里。', landmark: 'pearl', flags: ['coastal'], currency: 'azureshell', quality: { pearl: 3, fish: 2 },
      init: { pop: 500, prosperity: 56, credit: 60, connectivity: 62, tourism: 60, industry: { agri: 45, craft: 45, mining: 10 } }, specialties: ['pearl', 'fish'] },
    { id: 'yueluo',   nation: 'azure', name: '月落屿',   x: 45, y: 1170, desc: '苍澜西陲的香料之岛，月色落在香料田上像撒了层霜。', landmark: 'moon', flags: ['coastal'], currency: 'azureshell', quality: { spice: 3, herb: 2 },
      init: { pop: 450, prosperity: 54, credit: 58, connectivity: 50, tourism: 64, industry: { agri: 50, craft: 35, mining: 10 } }, specialties: ['spice', 'herb'] },
    // ===== 银沙大岛（东海外新大岛）=====
    { id: 'shaou',    nation: 'silver', name: '沙鸥城',   x: 1060, y: 400, desc: '银沙大岛第一大港，海鸥追着卸货的船队盘旋。', landmark: 'gull', flags: ['coastal'], currency: 'silvermark', quality: { fish: 3, salt: 2 },
      init: { pop: 900, prosperity: 62, credit: 64, connectivity: 75, tourism: 65, industry: { agri: 45, craft: 55, mining: 15 } }, specialties: ['fish', 'salt'] },
    { id: 'jingui',   nation: 'silver', name: '金桂镇',   x: 1150, y: 480, desc: '满镇金桂飘香，果干与香料是这里的骄傲。', landmark: 'flower', flags: [], currency: 'silvermark', quality: { fruit: 3, spice: 2 },
      init: { pop: 650, prosperity: 60, credit: 62, connectivity: 55, tourism: 70, industry: { agri: 70, craft: 40, mining: 10 } }, specialties: ['fruit', 'spice'] },
    { id: 'taosha',   nation: 'silver', name: '陶沙镇',   x: 1210, y: 600, desc: '沙土里烧出的陶器带着落日般的釉色。', landmark: 'kiln', flags: ['coastal'], currency: 'silvermark', quality: { pottery: 3 },
      init: { pop: 600, prosperity: 58, credit: 60, connectivity: 58, tourism: 55, industry: { agri: 40, craft: 70, mining: 25 } }, specialties: ['pottery'] },
    { id: 'wanxia',   nation: 'silver', name: '晚霞港',   x: 1080, y: 640, desc: '东岸渔港，晚霞把盐田染成玫瑰色，港湾泊满珍珠筏。', landmark: 'lighthouse', flags: ['coastal'], currency: 'silvermark', quality: { pearl: 2, salt: 2 },
      init: { pop: 750, prosperity: 61, credit: 63, connectivity: 68, tourism: 62, industry: { agri: 45, craft: 55, mining: 20 } }, specialties: ['pearl', 'salt'] }
  ];

  // 商品质量等级
  var QUALITY = {
    1: { name: '普通', mult: 1.00, stars: '★☆☆' },
    2: { name: '精良', mult: 1.35, stars: '★★☆' },
    3: { name: '稀有', mult: 1.80, stars: '★★★' }
  };

  // 各城商队名册（人数不同：大城市/港口/粮仓更多）
  var CARAVANS_BY_CITY = {
    sunring: [
      { id: 'sunring_1', name: '执印官·赛琳', speed: 0.95, haggle: 1.10, breakageReduce: 0.03, desc: '王城文书出身，精通契约与议价' },
      { id: 'sunring_2', name: '邮驿官·巴顿', speed: 1.10, haggle: 1.00, breakageReduce: 0.02, desc: '日晷大道信使出身，脚程极稳' },
      { id: 'sunring_3', name: '石匠·多恩',   speed: 0.90, haggle: 1.05, breakageReduce: 0.08, desc: '会修车补箱，货物损耗最少' },
      { id: 'sunring_4', name: '学徒·莉娜',   speed: 1.25, haggle: 0.95, breakageReduce: 0.00, desc: '年轻莽撞，但跑得飞快' }
    ],
    threesprings: [
      { id: 'threesprings_1', name: '温泉侍·汤圆', speed: 0.98, haggle: 1.06, breakageReduce: 0.03, desc: '熟客满城，处处卖面子' },
      { id: 'threesprings_2', name: '泼泉客·阿澈', speed: 1.14, haggle: 1.00, breakageReduce: 0.02, desc: '夏至泼泉节冠军' }
    ],
    copperabbey: [
      { id: 'copperabbey_1', name: '铸钟匠·铎',   speed: 0.94, haggle: 1.08, breakageReduce: 0.06, desc: '搬得动铜钟，也搬得动货' },
      { id: 'copperabbey_2', name: '抄经生·素行', speed: 1.06, haggle: 1.05, breakageReduce: 0.02, desc: '一路念着账目赶路' }
    ],
    wheatseat: [
      { id: 'wheatseat_1', name: '麦客·哈维',   speed: 1.00, haggle: 1.05, breakageReduce: 0.03, desc: '种麦出身，最懂粮价' },
      { id: 'wheatseat_2', name: '磨坊主·玛莎', speed: 0.92, haggle: 1.12, breakageReduce: 0.02, desc: '能把麦麸说成金子' },
      { id: 'wheatseat_3', name: '车把式·老提姆', speed: 1.08, haggle: 1.00, breakageReduce: 0.05, desc: '三十年驾龄，稳如磨盘' }
    ],
    beemarket: [
      { id: 'beemarket_1', name: '蜂农·蜜妮',   speed: 1.00, haggle: 1.10, breakageReduce: 0.02, desc: '她认得每一条花路' },
      { id: 'beemarket_2', name: '骡夫·老皮',   speed: 1.10, haggle: 1.00, breakageReduce: 0.04, desc: '他的骡子从不说累' },
      { id: 'beemarket_3', name: '集市掮客·阿洛', speed: 0.92, haggle: 1.15, breakageReduce: 0.00, desc: '嘴皮子就是他的货' }
    ],
    twinbridge: [
      { id: 'twinbridge_1', name: '水车匠·桥生', speed: 0.98, haggle: 1.08, breakageReduce: 0.04, desc: '顺水而来，逆流也稳' },
      { id: 'twinbridge_2', name: '信使·溪客',   speed: 1.15, haggle: 1.00, breakageReduce: 0.02, desc: '沿河送信，从没迟到' }
    ],
    amberterraces: [
      { id: 'amberterraces_1', name: '酿酒师·罗萨',   speed: 0.95, haggle: 1.12, breakageReduce: 0.02, desc: '品一口就知道年份与行情' },
      { id: 'amberterraces_2', name: '驮夫·塞尔吉',   speed: 1.10, haggle: 1.00, breakageReduce: 0.03, desc: '梯田上练出的好腿脚' },
      { id: 'amberterraces_3', name: '葡萄女·维奥拉', speed: 0.88, haggle: 1.15, breakageReduce: 0.00, desc: '砍价如摘葡萄，稳准狠' }
    ],
    oldolive: [
      { id: 'oldolive_1', name: '橄榄翁·尼科', speed: 0.92, haggle: 1.12, breakageReduce: 0.03, desc: '树下听了四十年市声' },
      { id: 'oldolive_2', name: '牧羊女·索菲', speed: 1.05, haggle: 1.04, breakageReduce: 0.04, desc: '敢跟野猪抢道' }
    ],
    brickhill: [
      { id: 'brickhill_1', name: '窑工·红土',   speed: 0.95, haggle: 1.06, breakageReduce: 0.07, desc: '陶器在他手里从不碎' },
      { id: 'brickhill_2', name: '碎瓷客·阿吉', speed: 1.08, haggle: 1.02, breakageReduce: 0.02, desc: '专收碎瓷，也收情报' }
    ],
    floralbasin: [
      { id: 'floralbasin_1', name: '花匠·芙洛', speed: 0.98, haggle: 1.10, breakageReduce: 0.02, desc: '她的货总带着花香' },
      { id: 'floralbasin_2', name: '香贩·露露', speed: 1.10, haggle: 1.04, breakageReduce: 0.02, desc: '沿街叫卖，人缘极好' }
    ],
    greenharbor: [
      { id: 'greenharbor_1', name: '船长·玛拉',   speed: 1.05, haggle: 1.06, breakageReduce: 0.04, desc: '季风、潮汐都听她的' },
      { id: 'greenharbor_2', name: '舵手·扬',     speed: 1.15, haggle: 1.00, breakageReduce: 0.02, desc: '闭着眼也能进港' },
      { id: 'greenharbor_3', name: '报关员·裴洛', speed: 0.92, haggle: 1.12, breakageReduce: 0.02, desc: '他认识每一张税单' },
      { id: 'greenharbor_4', name: '水手·小雀',   speed: 1.20, haggle: 0.95, breakageReduce: 0.00, desc: '桅杆上长大的孩子' }
    ],
    saltflower: [
      { id: 'saltflower_1', name: '盐工·白粒',   speed: 0.96, haggle: 1.08, breakageReduce: 0.03, desc: '尝一口海风就知道天气' },
      { id: 'saltflower_2', name: '驮盐驼·老灰', speed: 1.12, haggle: 1.00, breakageReduce: 0.05, desc: '他的驼队从不失手' }
    ],
    whitestone: [
      { id: 'whitestone_1', name: '渡翁·白石',   speed: 1.00, haggle: 1.05, breakageReduce: 0.04, desc: '摆渡四十年，认得每块卵石' },
      { id: 'whitestone_2', name: '茶摊娘·春芽', speed: 0.94, haggle: 1.12, breakageReduce: 0.02, desc: '情报都在她的茶碗里' }
    ],
    golddelta: [
      { id: 'golddelta_1', name: '舟子·水菱',   speed: 1.10, haggle: 1.02, breakageReduce: 0.02, desc: '水网迷宫里从不迷路' },
      { id: 'golddelta_2', name: '稻农·穗生',   speed: 0.95, haggle: 1.08, breakageReduce: 0.03, desc: '称粮不用秤' },
      { id: 'golddelta_3', name: '纤夫·大壮',   speed: 1.05, haggle: 1.00, breakageReduce: 0.06, desc: '逆流也拉得动满船货' }
    ],
    spotlight: [
      { id: 'spotlight_1', name: '木语匠·奥力', speed: 0.95, haggle: 1.10, breakageReduce: 0.05, desc: '他打的木箱能防潮防震' },
      { id: 'spotlight_2', name: '林道巡者·青须', speed: 1.12, haggle: 1.02, breakageReduce: 0.03, desc: '认得每一条兽径' },
      { id: 'spotlight_3', name: '采蜜人·贝拉', speed: 1.00, haggle: 1.08, breakageReduce: 0.02, desc: '连黑蜂都听她的话' }
    ],
    deerspring: [
      { id: 'deerspring_1', name: '猎皮匠·鹿鸣', speed: 1.00, haggle: 1.06, breakageReduce: 0.04, desc: '从不惊扰饮水之鹿' },
      { id: 'deerspring_2', name: '泉边女·艾达', speed: 0.92, haggle: 1.12, breakageReduce: 0.02, desc: '泉水边长大的议价高手' }
    ],
    pineresin: [
      { id: 'pineresin_1', name: '松脂客·针叶', speed: 1.02, haggle: 1.06, breakageReduce: 0.03, desc: '割了半辈子松脂' },
      { id: 'pineresin_2', name: '糖匠·琥珀',   speed: 0.96, haggle: 1.10, breakageReduce: 0.02, desc: '知道哪家糖棍最甜' }
    ],
    willowwind: [
      { id: 'willowwind_1', name: '柳筏客·青绦', speed: 1.10, haggle: 1.02, breakageReduce: 0.02, desc: '柳枝编筏，水上行舟' },
      { id: 'willowwind_2', name: '观鸟人·鹭白', speed: 0.94, haggle: 1.10, breakageReduce: 0.03, desc: '看得懂候鸟，也看得懂行情' }
    ],
    woolcliff: [
      { id: 'woolcliff_1', name: '牧人·葛雷',   speed: 1.00, haggle: 1.04, breakageReduce: 0.05, desc: '赶着羊群翻过整条白垩岭' },
      { id: 'woolcliff_2', name: '套马手·乌达', speed: 1.18, haggle: 0.96, breakageReduce: 0.01, desc: '套马从来不用第二下' },
      { id: 'woolcliff_3', name: '冬帐长·艾莎', speed: 0.90, haggle: 1.12, breakageReduce: 0.04, desc: '会盟时最受尊敬的长者' }
    ],
    dawnstone: [
      { id: 'dawnstone_1', name: '系布者·祈',   speed: 1.00, haggle: 1.05, breakageReduce: 0.04, desc: '石柱下听过无数心愿' },
      { id: 'dawnstone_2', name: '石柱守·磐',   speed: 0.95, haggle: 1.08, breakageReduce: 0.03, desc: '话少，路稳' }
    ],
    heatherwinery: [
      { id: 'heatherwinery_1', name: '酿酒娘·石楠', speed: 0.94, haggle: 1.12, breakageReduce: 0.02, desc: '石楠蜜酒的守护者' },
      { id: 'heatherwinery_2', name: '曲窖工·蜜语', speed: 1.06, haggle: 1.04, breakageReduce: 0.03, desc: '在诗窟里背得出所有酒歌' }
    ],
    grasshighland: [
      { id: 'grasshighland_1', name: '马倌·青风', speed: 1.12, haggle: 1.02, breakageReduce: 0.02, desc: '矮脚马都认他' },
      { id: 'grasshighland_2', name: '夏帐长·云毡', speed: 0.96, haggle: 1.10, breakageReduce: 0.04, desc: '白毡帐里最会讲价的人' }
    ],
    canglang: [
      { id: 'canglang_1', name: '船长·白浪', speed: 1.05, haggle: 1.08, breakageReduce: 0.04, desc: '远洋楼船的老船长，看天象如看书' },
      { id: 'canglang_2', name: '引航员·灯花', speed: 0.95, haggle: 1.10, breakageReduce: 0.02, desc: '熟悉雾灯海域每一处暗流' },
      { id: 'canglang_3', name: '水手长·铁锚', speed: 1.15, haggle: 0.98, breakageReduce: 0.06, desc: '力气大，扛货稳' }
    ],
    jingge: [
      { id: 'jingge_1', name: '捕鲸手·黑潮', speed: 1.08, haggle: 1.04, breakageReduce: 0.03, desc: '追过最大的鲸，也追得上最好的价' },
      { id: 'jingge_2', name: '海湾歌者·澜', speed: 0.95, haggle: 1.12, breakageReduce: 0.02, desc: '歌声能换来整船人的信任' }
    ],
    wudeng: [
      { id: 'wudeng_1', name: '守灯人·阿雾', speed: 0.96, haggle: 1.08, breakageReduce: 0.03, desc: '灯塔守了二十年，从不在雾里迷路' },
      { id: 'wudeng_2', name: '夜航客·蓑笠', speed: 1.12, haggle: 1.02, breakageReduce: 0.02, desc: '专走夜航，认得每一盏灯' }
    ],
    jiaoshi: [
      { id: 'jiaoshi_1', name: '珊瑚匠·珠', speed: 0.94, haggle: 1.10, breakageReduce: 0.05, desc: '烧陶的巧手，装箱也严实' },
      { id: 'jiaoshi_2', name: '暗流通·卷潮', speed: 1.12, haggle: 1.00, breakageReduce: 0.03, desc: '在珊瑚礁之间穿行如鱼' }
    ],
    fengfan: [
      { id: 'fengfan_1', name: '造船师·龙骨', speed: 0.95, haggle: 1.08, breakageReduce: 0.07, desc: '他钉的船从不漏水，他包的货从不损坏' },
      { id: 'fengfan_2', name: '快帆手·燕子', speed: 1.18, haggle: 0.98, breakageReduce: 0.02, desc: '帆一满，就追着风跑' }
    ],
    yanmo: [
      { id: 'yanmo_1', name: '盐工·白沫', speed: 0.97, haggle: 1.06, breakageReduce: 0.04, desc: '晒了半辈子盐，最懂斤两' },
      { id: 'yanmo_2', name: '驮盐人·老岩', speed: 1.08, haggle: 1.00, breakageReduce: 0.05, desc: '背上的盐袋从没湿过' }
    ],
    qingai: [
      { id: 'qingai_1', name: '海图师·青梧', speed: 0.93, haggle: 1.12, breakageReduce: 0.02, desc: '画海图的人，最会算路程' },
      { id: 'qingai_2', name: '雨林客·苔衣', speed: 1.10, haggle: 1.03, breakageReduce: 0.03, desc: '在雨林里也能找到路' },
      { id: 'qingai_3', name: '信风人·叶笛', speed: 1.16, haggle: 1.00, breakageReduce: 0.01, desc: '吹叶笛能唤来信风' }
    ],
    beizhuyu: [
      { id: 'beizhuyu_1', name: '采珠人·阿珠', speed: 1.05, haggle: 1.07, breakageReduce: 0.03, desc: '潜得最深，也最懂珍珠成色' },
      { id: 'beizhuyu_2', name: '岛民·潮生',   speed: 1.12, haggle: 1.00, breakageReduce: 0.03, desc: '听着潮声就知道天气' }
    ],
    luowan: [
      { id: 'luowan_1', name: '螺号手·海螺', speed: 0.98, haggle: 1.08, breakageReduce: 0.04, desc: '吹一声螺号，船就靠岸' },
      { id: 'luowan_2', name: '木匠·鳍',     speed: 1.06, haggle: 1.04, breakageReduce: 0.05, desc: '打的木箱比船还结实' }
    ],
    gullisle: [
      { id: 'gullisle_1', name: '海鸥客·白羽', speed: 1.10, haggle: 1.03, breakageReduce: 0.03, desc: '认得出每一只海鸥的方向' },
      { id: 'gullisle_2', name: '引航员·小鸥', speed: 0.96, haggle: 1.10, breakageReduce: 0.02, desc: '中途岛的淡水都在他脑子里' }
    ],
    chenzhu: [
      { id: 'chenzhu_1', name: '珠农·潜',   speed: 1.00, haggle: 1.09, breakageReduce: 0.02, desc: '养了二十年珠贝' },
      { id: 'chenzhu_2', name: '筏工·青贝', speed: 1.12, haggle: 1.00, breakageReduce: 0.03, desc: '竹筏在他脚下就像陆地' }
    ],
    yueluo: [
      { id: 'yueluo_1', name: '香客·雾月', speed: 0.95, haggle: 1.12, breakageReduce: 0.02, desc: '闻一闻就知道香料的年份' },
      { id: 'yueluo_2', name: '夜航·芦笛', speed: 1.10, haggle: 1.03, breakageReduce: 0.03, desc: '夜里靠芦笛声互相引路' }
    ],
    shaou: [
      { id: 'shaou_1', name: '沙鸥信使·羽', speed: 1.08, haggle: 1.04, breakageReduce: 0.03, desc: '海鸥都听他的哨音' },
      { id: 'shaou_2', name: '渔夫·银浪',   speed: 0.98, haggle: 1.08, breakageReduce: 0.04, desc: '渔汛与行情他都门儿清' }
    ],
    jingui: [
      { id: 'jingui_1', name: '桂花客·香', speed: 0.95, haggle: 1.12, breakageReduce: 0.02, desc: '担着桂花走遍全岛' },
      { id: 'jingui_2', name: '果贩·甜',   speed: 1.05, haggle: 1.05, breakageReduce: 0.03, desc: '一尝就知道果干成色' }
    ],
    taosha: [
      { id: 'taosha_1', name: '陶工·沙',   speed: 0.97, haggle: 1.06, breakageReduce: 0.06, desc: '他烧的陶，他包的货都不碎' },
      { id: 'taosha_2', name: '驮驴·阿笨', speed: 1.10, haggle: 1.00, breakageReduce: 0.04, desc: '他的驴比谁都认路' }
    ],
    wanxia: [
      { id: 'wanxia_1', name: '晚霞舵手·霞', speed: 1.06, haggle: 1.06, breakageReduce: 0.03, desc: '追着晚霞归港的舵手' },
      { id: 'wanxia_2', name: '盐商·白壳',   speed: 0.94, haggle: 1.10, breakageReduce: 0.03, desc: '贝壳里装的盐最白' }
    ]
  };

  // 冒险者公会人才库（各城名册按城市名确定性抽取3人）
  var ADVENTURERS = [
    { id: 'adv_01', name: '剑士·洛根',   power: 80, cost: 45, desc: '退役骑士团剑士，剑术扎实' },
    { id: 'adv_02', name: '猎手·芙蕾',   power: 70, cost: 35, desc: '林中猎手，箭无虚发' },
    { id: 'adv_03', name: '游侠·凯斯',   power: 60, cost: 28, desc: '腿脚利索，消息灵通' },
    { id: 'adv_04', name: '盾卫·布鲁诺', power: 75, cost: 40, desc: '巨盾如山，稳如磐石' },
    { id: 'adv_05', name: '弓手·薇拉',   power: 65, cost: 30, desc: '百步穿杨的姑娘' },
    { id: 'adv_06', name: '佣兵·加尔',   power: 55, cost: 24, desc: '给钱就干的务实佣兵' },
    { id: 'adv_07', name: '侦察兵·雀',   power: 50, cost: 20, desc: '先一步发现危险' },
    { id: 'adv_08', name: '浪人·一刀',   power: 85, cost: 55, desc: '独行浪人，出刀极快' },
    { id: 'adv_09', name: '弩手·霜',     power: 72, cost: 38, desc: '沉默寡言的弩手' },
    { id: 'adv_10', name: '武僧·磐',     power: 78, cost: 42, desc: '青柠修道院还俗的武僧' },
    { id: 'adv_11', name: '骑手·岚',     power: 68, cost: 32, desc: '马背上的快刀' },
    { id: 'adv_12', name: '新兵·豆子',   power: 40, cost: 15, desc: '刚出道的毛头小子' }
  ];

  // 可招募的商队首领（组建新商队时按序雇佣）
  var RECRUIT_POOL = [
    { id: 'recruit_01', name: '流浪商人·灰袍', speed: 1.00, haggle: 1.06, breakageReduce: 0.03, desc: '走南闯北的杂货贩子' },
    { id: 'recruit_02', name: '独行客·石牙',   speed: 1.12, haggle: 1.00, breakageReduce: 0.02, desc: '从不在一个地方久留' },
    { id: 'recruit_03', name: '老车夫·风尘',   speed: 0.92, haggle: 1.10, breakageReduce: 0.06, desc: '三十年驾龄，稳字当头' },
    { id: 'recruit_04', name: '退役信使·白鹭', speed: 1.16, haggle: 1.02, breakageReduce: 0.02, desc: '赶路是一辈子的事' },
    { id: 'recruit_05', name: '驼队主·沙驼',   speed: 1.05, haggle: 1.05, breakageReduce: 0.04, desc: '驼铃一响，货就上路' },
    { id: 'recruit_06', name: '账房先生·铁算盘', speed: 0.95, haggle: 1.14, breakageReduce: 0.02, desc: '算盘打得比剑快' },
    { id: 'recruit_07', name: '镖师·石敢',     speed: 1.00, haggle: 1.03, breakageReduce: 0.08, desc: '走过镖，见过血，护货稳' },
    { id: 'recruit_08', name: '游商·灯芯',     speed: 1.08, haggle: 1.07, breakageReduce: 0.03, desc: '夜里点灯赶路是常事' },
    { id: 'recruit_09', name: '货郎·铃铛',     speed: 1.02, haggle: 1.09, breakageReduce: 0.03, desc: '铃铛一响，好货登场' },
    { id: 'recruit_10', name: '驿丞·快脚',     speed: 1.14, haggle: 1.01, breakageReduce: 0.02, desc: '驿路就是他家' }
  ];

  var ROUTES = [
    { id: 'sunroad',     name: '日晷大道',     type: 'land',     days: 6, stops: ['woolcliff', 'dawnstone', 'sunring', 'threesprings', 'amberterraces'], seasons: null, note: '全年通行，路况最佳，隔十里绿荫驿站' },
    { id: 'verdantpath', name: '翠脉岭道',     type: 'land',     days: 5, stops: ['pineresin', 'spotlight', 'deerspring'], seasons: null, note: '多弯道缓坡，夏季凉爽' },
    { id: 'westcoast',   name: '西海岸驿道',   type: 'land',     days: 7, stops: ['woolcliff', 'greenharbor', 'saltflower', 'whitestone'], seasons: null, note: '路面碾贝壳沙，海风相伴' },
    { id: 'amberroad',   name: '琥珀古道',     type: 'land',     days: 3, stops: ['floralbasin', 'amberterraces', 'brickhill'], seasons: null, note: '雨后路面暖橙色' },
    { id: 'goldcorridor',name: '金河走廊',     type: 'land',     days: 4, stops: ['golddelta', 'twinbridge', 'beemarket', 'deerspring'], seasons: null, note: '沿河南岸，桑果可摘' },
    { id: 'midway',      name: '中土横贯道',   type: 'land',     days: 5, stops: ['greenharbor', 'threesprings', 'sunring', 'spotlight', 'willowwind'], seasons: null, note: '翻越鹿背垭口' },
    { id: 'southstone',  name: '南境石径',     type: 'land',     days: 3, stops: ['oldolive', 'floralbasin', 'brickhill'], seasons: null, note: '石板路略颠簸，野花盛开' },
    { id: 'goldriver',   name: '金河主航道',   type: 'water',    days: 4, stops: ['golddelta', 'wheatseat', 'twinbridge'], seasons: null, upstream: true, note: '逆流需雇纤夫+50G' },
    { id: 'honeyriver',  name: '蜜色河桨船道', type: 'water',    days: 3, stops: ['willowwind', 'deerspring'], seasons: null, smallBoat: true, note: '仅小桨船，载重限50kg' },
    { id: 'baysea',      name: '翡翠湾近海航线', type: 'water',  days: 2, stops: ['greenharbor', 'saltflower'], seasons: null, note: '偶有海雾' },
    { id: 'silverlake',  name: '银鳞湖渡船线', type: 'water',    days: 2, stops: ['sunring', 'wheatseat', 'spotlight'], seasons: null, note: '雾天靠铃声定位' },
    { id: 'highland',    name: '高原夏道',     type: 'seasonal', days: 2, stops: ['woolcliff', 'grasshighland'], seasons: [4, 5, 6], note: '仅刈草月~丰熟月开放' },
    { id: 'marshpath',   name: '月牙沼泽栈道', type: 'seasonal', days: 1, stops: ['spotlight', 'willowwind'], seasons: [7, 8, 9, 10, 11], note: '仅旱季（秋、冬）开放' },
    { id: 'tidepath',    name: '沙颈潮汐路',   type: 'seasonal', days: 1, stops: ['woolcliff', 'heatherwinery'], seasons: null, note: '每日低潮时段可通行' },
    // ===== 苍澜洲航路与道路 =====
    { id: 'sealine1', name: '远澜航线·北', type: 'water', days: 8, stops: ['greenharbor', 'canglang'], seasons: null, note: '曦光至苍澜的主干航线，需远洋楼船' },
    { id: 'sealine2', name: '远澜航线·西', type: 'water', days: 6, stops: ['saltflower', 'wudeng'], seasons: null, note: '穿雾灯海域，海雾天需灯塔引航' },
    { id: 'sealine3', name: '远澜航线·南', type: 'water', days: 7, stops: ['golddelta', 'jingge'], seasons: null, note: '顺金河出海口南下，鲸群常伴行' },
    { id: 'sealine4', name: '白石远航',    type: 'water', days: 6, stops: ['whitestone', 'fengfan'], seasons: null, note: '浅滩转深海的货运航线' },
    { id: 'sealine5', name: '苍澜环岛线',  type: 'water', days: 3, stops: ['canglang', 'jingge'], seasons: null, note: '环苍澜洲东岸，风帆最顺' },
    { id: 'sealine6', name: '雾灯支线',    type: 'water', days: 2, stops: ['canglang', 'wudeng'], seasons: null, note: '雾灯屿灯塔照亮的短程航线' },
    { id: 'sealine7', name: '礁石航线',    type: 'water', days: 3, stops: ['wudeng', 'jiaoshi'], seasons: null, note: '绕行珊瑚礁群，需熟悉暗流' },
    { id: 'sealine8', name: '帆盐航线',    type: 'water', days: 2, stops: ['fengfan', 'jingge'], seasons: null, note: '风帆镇与鲸歌湾之间的近岸航道' },
    { id: 'azureland1', name: '沧青官道',  type: 'land', days: 3, stops: ['canglang', 'qingai'], seasons: null, note: '港口通往内陆都会的商道' },
    { id: 'azureland2', name: '青盐驿道',  type: 'land', days: 2, stops: ['qingai', 'yanmo'], seasons: null, note: '穿越雨林边缘，注意雨后泥泞' },
    { id: 'azureland3', name: '盐礁小径',  type: 'land', days: 2, stops: ['yanmo', 'jiaoshi'], seasons: null, note: '盐田与礁石之间的海岸小径' },
    { id: 'azureland4', name: '帆盐商道',  type: 'land', days: 2, stops: ['fengfan', 'yanmo'], seasons: null, note: '造船木料与海盐互通的要道' },
    // ===== 新增岛屿航线 =====
    { id: 'isles_line', name: '星散群岛航线', type: 'water', days: 2, stops: ['greenharbor', 'beizhuyu', 'saltflower'], seasons: null, note: '穿行星散群岛的珍珠航线' },
    { id: 'gull_line',  name: '鸥歌岛航线',   type: 'water', days: 3, stops: ['beizhuyu', 'gullisle'], seasons: null, note: '西行前往中途岛的海路' },
    { id: 'gull_azure', name: '鸥歌·苍澜航线', type: 'water', days: 4, stops: ['gullisle', 'canglang'], seasons: null, note: '经鸥歌岛转驳苍澜的远航' },
    { id: 'gull_delta', name: '鸥歌南线',      type: 'water', days: 3, stops: ['gullisle', 'golddelta'], seasons: null, note: '中途岛与金河出海口之间的航线' },
    { id: 'shell_line', name: '贝壳滩近海线', type: 'water', days: 2, stops: ['luowan', 'deerspring'], seasons: null, note: '东岸近海，贝壳滩就在航线下' },
    { id: 'shell_land', name: '螺湾林道',     type: 'land', days: 2, stops: ['luowan', 'pineresin'], seasons: null, note: '穿过松林前往东林内陆' },
    { id: 'pearl_isle', name: '沉珠岛航线',   type: 'water', days: 2, stops: ['jingge', 'chenzhu'], seasons: null, note: '鲸歌湾与沉珠岛之间的海田航线' },
    { id: 'moonfall_line', name: '月落屿航线', type: 'water', days: 3, stops: ['wudeng', 'yueluo'], seasons: null, note: '雾灯海西端的香料航线' },
    { id: 'moonfall2', name: '月落沉珠线',    type: 'water', days: 4, stops: ['yueluo', 'chenzhu'], seasons: null, note: '绕苍澜洲南缘的远岛航线' },
    // ===== 银沙大岛航线 =====
    { id: 'silver_line1', name: '银沙西航线',   type: 'water', days: 5, stops: ['greenharbor', 'shaou'], seasons: null, note: '曦光西海岸直航银沙大岛' },
    { id: 'silver_line2', name: '贝壳滩远航',   type: 'water', days: 4, stops: ['luowan', 'shaou'], seasons: null, note: '东岸贝壳滩横渡东海' },
    { id: 'silver_gull',  name: '鸥歌·银沙航线', type: 'water', days: 3, stops: ['gullisle', 'shaou'], seasons: null, note: '经鸥歌岛转航银沙' },
    { id: 'silver_azure', name: '银沙·苍澜航线', type: 'water', days: 5, stops: ['wanxia', 'jingge'], seasons: null, note: '横跨两海之间的暖流' },
    { id: 'silver_ring',  name: '银沙环岛线',   type: 'water', days: 3, stops: ['shaou', 'wanxia'], seasons: null, note: '绕银沙大岛西岸南行' },
    { id: 'silver_road1', name: '金桂驿道',     type: 'land',  days: 1, stops: ['shaou', 'jingui'], seasons: null, note: '港口通往金桂镇的短途' },
    { id: 'silver_road2', name: '陶沙小道',     type: 'land',  days: 2, stops: ['jingui', 'taosha'], seasons: null, note: '穿过桂花林与沙丘' },
    { id: 'silver_sea1',  name: '陶沙近岸线',   type: 'water', days: 2, stops: ['taosha', 'wanxia'], seasons: null, note: '南部海岸的窑货航线' }
  ];

  var BUILDINGS = [
    { id: 'stage',     name: '驿站',     cost: 300, days: 10, desc: '交通通达度+5，提升过路费收入', effects: { connectivity: 5, toll: 2 } },
    { id: 'guildhall', name: '商会大厅', cost: 500, days: 15, desc: '繁荣度+5，解锁外交使节功能', effects: { prosperity: 5, guildhall: true } },
    { id: 'granary',   name: '公共粮仓', cost: 400, days: 12, desc: '稳定本地粮价，防止饥荒', effects: { granary: true } },
    { id: 'brewery',   name: '精酿啤酒坊', cost: 350, days: 10, desc: '消耗面粉产出精酿啤酒（需维护费）', effects: { brewery: true } },
    { id: 'winery',    name: '葡萄酒坊',   cost: 450, days: 12, desc: '消耗水果产出精良葡萄酒（需维护费）', effects: { winery: true } },
    { id: 'weavery',   name: '织造坊',     cost: 350, days: 10, desc: '消耗羊毛产出衣服（需维护费）', effects: { weavery: true } },
    { id: 'bakery',    name: '烘焙坊',     cost: 400, days: 10, desc: '消耗面粉产出面包（需维护费）', effects: { bakery: true } },
    { id: 'inn',       name: '旅馆',     cost: 250, days: 8,  desc: '旅游吸引力+5，每日住宿收入', effects: { tourism: 5, inn: true } },
    { id: 'tavern',    name: '豪华饭店', cost: 600, days: 15, desc: '旅游吸引力+15，吸引贵族游客', effects: { tourism: 15, luxury: true } },
    { id: 'harbor',    name: '港务局',   cost: 500, days: 12, desc: '水运效率+25%，降低海运破损', effects: { waterSpeed: 0.25, seaBreakage: 0.10 }, requires: 'coastalOrLake' },
    { id: 'market',    name: '集市广场', cost: 400, days: 10, desc: '繁荣度+8，吸引外地商贩', effects: { prosperity: 8, tradeBoost: 0.10 } },
    { id: 'craft',     name: '工匠行会', cost: 450, days: 12, desc: '手工业+15%，解锁高级工艺品', effects: { craftPct: 15, artisan: true } },
    { id: 'bank',      name: '银行分行', cost: 600, days: 15, desc: '信用+10，降低利息，解锁汇兑', effects: { credit: 10, bank: true } },
    { id: 'lighthouse',name: '灯塔',     cost: 300, days: 10, desc: '交通通达度+10，降低海运风险', effects: { connectivity: 10 }, requires: 'coastalOrLake' },
    { id: 'bath',      name: '公共浴场', cost: 200, days: 8,  desc: '繁荣度+3，提高居民满意度', effects: { prosperity: 3, satisfaction: true } },
    { id: 'bridge',    name: '石桥',     cost: 500, days: 15, desc: '交通通达度+15，缩短过河时间', effects: { connectivity: 15 }, requires: 'river' },
    { id: 'shipping',  name: '航运公司', cost: 700, days: 15, desc: '仅港口城市可建：按近期海上商路使用量收取航运费，需支付船只维护费', effects: { shipping: true }, requires: 'coastal' },
    { id: 'escort',    name: '护航船队', cost: 500, days: 12, desc: '仅沿海/湖畔城市可建：降低海盗遭遇率，遭遇时有机会击退海盗；需维护费', effects: { escort: true }, requires: 'coastalOrLake' },
    { id: 'pub',       name: '酒馆',     cost: 550, days: 14, desc: '消耗精酿啤酒与葡萄酒自动赚钱；需先建精酿啤酒坊或葡萄酒坊', effects: { pub: true }, requiresEither: ['brewery', 'winery'] },
    { id: 'clothshop', name: '服装店',   cost: 400, days: 10, desc: '消耗衣服自动赚钱；需先建织造坊', effects: { clothshop: true }, requires: 'weavery' },
    { id: 'pastry',    name: '糕点铺',   cost: 350, days: 10, desc: '消耗面包自动赚钱；需先建烘焙坊', effects: { pastry: true }, requires: 'bakery' },
    { id: 'workshop',  name: '生产工坊', cost: 500, days: 12, desc: '消耗仓库原料按配方生产商品，可调节开工率与暂停；需维护费', effects: { workshop: true } }
  ];

  var FESTIVALS = [
    { id: 'solstice',   name: '夏至光宴',   days: [122],         desc: '灯笼蜡烛灯油需求翻倍', effects: { resin: 2.0, copper: 1.5, wax: 2.0 } },
    { id: 'cornucopia', name: '丰饶角主宴', days: [195, 196, 197], desc: '食物需求翻倍，价格锁定平民价', foodBoost: true },
    { id: 'wineopening',name: '新酒开坛日', days: [218],         desc: '陈年葡萄酒+50%，新酿半价', effects: { wine: 1.5, ale: 0.5 } },
    { id: 'goldenfair', name: '金秋大集',   days: [266, 267, 268, 269, 270, 271, 272, 273, 274], desc: '全品类需求+80%', allMult: 1.2 },
    { id: 'lantern',    name: '灯笼节',     days: [286],         desc: '灯油蜡烛+50%，灯笼材料+30%', effects: { resin: 1.5, carving: 1.3, wax: 1.5 } },
    { id: 'quietnight', name: '静夜思',     days: [365],         desc: '全图停市一天，仅可赶路或休息', marketClosed: true },
    { id: 'giftfest',   name: '礼赠节',     days: [350, 351, 352], desc: '工艺品与书籍+30%', effects: { carving: 1.3, pottery: 1.3, book: 1.3, pearl: 1.4, coral: 1.4, chart: 1.3 } }
  ];

  var CURRENCIES = {
    wheatpound: { nation: 'wheat',   name: '金穗镑',     rate: 1.00 },
    sol:        { nation: 'amber',   name: '琥珀索尔',   rate: 0.95 },
    jademark:   { nation: 'jade',    name: '青崖银马克', rate: 1.05 },
    dinar:      { nation: 'sundial', name: '日晷第纳尔', rate: 1.02 },
    lira:       { nation: 'north',   name: '北境里拉',   rate: 0.90 },
    shilling:   { nation: 'east',    name: '东林先令',   rate: 0.98 },
    azureshell: { nation: 'azure',   name: '苍澜贝币',   rate: 0.97 },
    silvermark: { nation: 'silver',  name: '银沙币',     rate: 0.96 }
  };

  // 开局难度：初始资金 / 债务 / 日息 / 居民卖价 / 强盗危险度
  var DIFFICULTY = {
    easy:   { name: '简单', gold: 1500,  debt: 5000,  interest: 0.3, residentMult: 0.92, banditMult: 0.6 },
    normal: { name: '普通', gold: 800,   debt: 10000, interest: 0.5, residentMult: 0.90, banditMult: 1.0 },
    hard:   { name: '困难', gold: 200,   debt: 15000, interest: 1.0, residentMult: 0.88, banditMult: 1.4 }
  };

  // 生产配方：消耗原料产出商品（批次天数）
  var RECIPES = [
    { id: 'r_brew',    name: '酿造麦酒',   input: { flour: 3 },            output: { ale: 2 },      days: 2, desc: '3面粉 → 2麦酒' },
    { id: 'r_wine',    name: '窖藏葡萄酒', input: { rawfruit: 1, honey: 1 }, output: { wine: 1 },    days: 3, desc: '1水果+1蜂蜜 → 1葡萄酒' },
    { id: 'r_canvas',  name: '织造帆布',   input: { wool: 2 },             output: { canvas: 2 },   days: 2, desc: '2羊毛 → 2帆布' },
    { id: 'r_spice',   name: '调制香料',   input: { herb: 1, salt: 1 },    output: { spice: 2 },    days: 2, desc: '1药草+1盐 → 2香料' },
    { id: 'r_wax',     name: '提炼鲸蜡',   input: { oil: 2 },              output: { wax: 2 },      days: 3, desc: '2橄榄油 → 2鲸蜡' },
    { id: 'r_carving', name: '雕刻木器',   input: { timber: 2 },           output: { carving: 2 },  days: 3, desc: '2香木 → 2木雕' },
    { id: 'r_copper',  name: '打制铜器',   input: { iron: 1, timber: 1 },  output: { copper: 2 },   days: 3, desc: '1铁器+1香木 → 2铜器' },
    { id: 'r_dry',     name: '晾晒果干',   input: { rawfruit: 2 },         output: { fruit: 2 },    days: 2, desc: '2水果 → 2果干' },
    { id: 'r_bread',   name: '烤制粗面包', input: { flour: 1 },            output: { roughbread: 2 }, days: 1, desc: '1面粉 → 2粗制面包' }
  ];

  // 名胜古迹（玩家可投资开发，收门票、付维护费）
  var SITES = [
    { id: 's1', name: '千窗书塔',     cityId: 'sunring',     x: 478, y: 450, cost: 400, desc: '藏万卷书的石塔，学者与游客云集' },
    { id: 's2', name: '三色潭',       cityId: 'dawnstone',   x: 516, y: 162, cost: 250, desc: '响水洞河畔的钙华白池，三色交映' },
    { id: 's3', name: '雾纱瀑布',     cityId: 'spotlight',   x: 738, y: 468, cost: 300, desc: '翠脉岭东坡的阶梯瀑布，常驻彩虹' },
    { id: 's4', name: '回音圆环',     cityId: 'copperabbey', x: 602, y: 558, cost: 350, desc: '夏至音乐会的天然环形剧场' },
    { id: 's5', name: '碎瓷塔',       cityId: 'brickhill',   x: 640, y: 732, cost: 280, desc: '废瓷片砌成的斑斓高塔' },
    { id: 's6', name: '千丘原油菜花田', cityId: 'floralbasin', x: 352, y: 762, cost: 320, desc: '春来千丘尽染金黄' },
    { id: 's7', name: '风琴海蚀洞',   cityId: 'woolcliff',   x: 432, y: 82,  cost: 260, desc: '退潮时海风穿洞如管风琴鸣奏' },
    { id: 's8', name: '珊瑚礁公园',   cityId: 'jiaoshi',     x: 282, y: 1232, cost: 380, desc: '苍澜南缘的珊瑚花园，水下发着光' },
    { id: 's9', name: '迎日台',       cityId: 'woolcliff',   x: 748, y: 110, cost: 300, desc: '鹿角半岛尽头的石盘，冬至祈福之地' }
  ];

  var VERSION = '0.11.0';

  // 本地居民每日需求（每千人口/天）
  var RETAIL_DEMAND = {
    flour: 1.40, ale: 0.31, honey: 0.23, salt: 0.23, cheese: 0.16,
    fish: 0.16, herb: 0.16, resin: 0.16, oil: 0.16, wine: 0.08, wool: 0.08,
    fruit: 0.16, linen: 0.05, wax: 0.07, spice: 0.05,
    bread: 0.23, roughbread: 0.10, rawfruit: 0.20, craftbeer: 0.08, clothing: 0.03
  };

  DL.DATA = {
    NATIONS: NATIONS,
    GOODS: GOODS,
    CITIES: CITIES,
    ROUTES: ROUTES,
    BUILDINGS: BUILDINGS,
    RECIPES: RECIPES,
    QUALITY: QUALITY,
    CARAVANS_BY_CITY: CARAVANS_BY_CITY,
    ADVENTURERS: ADVENTURERS,
    RECRUIT_POOL: RECRUIT_POOL,
    FESTIVALS: FESTIVALS,
    CURRENCIES: CURRENCIES,
    DIFFICULTY: DIFFICULTY,
    RETAIL_DEMAND: RETAIL_DEMAND,
    SITES: SITES,
    VERSION: VERSION,
    START_GOLD: 800,
    START_DEBT: 10000,
    DEBT_DAILY_INTEREST: 0.5,
    GAME_YEARS: 10,
    DAYS_PER_YEAR: 365,
    WIN_TRADE_VOLUME: 100000,
    WIN_SAVINGS: 5000,
    LICENSE_COST: 500
  };

  DL.DATA.nationById = function (id) {
    for (var i = 0; i < NATIONS.length; i++) if (NATIONS[i].id === id) return NATIONS[i];
    return null;
  };
  DL.DATA.cityById = function (id) {
    for (var i = 0; i < CITIES.length; i++) if (CITIES[i].id === id) return CITIES[i];
    return null;
  };
  DL.DATA.goodById = function (id) {
    for (var i = 0; i < GOODS.length; i++) if (GOODS[i].id === id) return GOODS[i];
    return null;
  };
  DL.DATA.routeById = function (id) {
    for (var i = 0; i < ROUTES.length; i++) if (ROUTES[i].id === id) return ROUTES[i];
    return null;
  };
  DL.DATA.buildingById = function (id) {
    for (var i = 0; i < BUILDINGS.length; i++) if (BUILDINGS[i].id === id) return BUILDINGS[i];
    return null;
  };
  DL.DATA.recipeById = function (id) {
    for (var i = 0; i < RECIPES.length; i++) if (RECIPES[i].id === id) return RECIPES[i];
    return null;
  };
  DL.DATA.leaderById = function (id) {
    var cities = Object.keys(CARAVANS_BY_CITY);
    for (var c = 0; c < cities.length; c++) {
      var roster = CARAVANS_BY_CITY[cities[c]];
      for (var i = 0; i < roster.length; i++) if (roster[i].id === id) return roster[i];
    }
    for (var r = 0; r < RECRUIT_POOL.length; r++) if (RECRUIT_POOL[r].id === id) return RECRUIT_POOL[r];
    return null;
  };
  DL.DATA.leadersFor = function (cityId) {
    return CARAVANS_BY_CITY[cityId] || [];
  };
  DL.DATA.adventurerById = function (id) {
    for (var i = 0; i < ADVENTURERS.length; i++) if (ADVENTURERS[i].id === id) return ADVENTURERS[i];
    return null;
  };
  DL.DATA.adventurersFor = function (cityId) {
    var h = 0;
    for (var i = 0; i < cityId.length; i++) h = (h * 31 + cityId.charCodeAt(i)) >>> 0;
    var pool = ADVENTURERS.slice();
    for (var j = pool.length - 1; j > 0; j--) {
      var k = (h + j * 7919) % (j + 1);
      var t = pool[j]; pool[j] = pool[k]; pool[k] = t;
      h = (h * 17 + j) >>> 0;
    }
    return pool.slice(0, 3);
  };
  DL.DATA.festivalById = function (id) {
    for (var i = 0; i < FESTIVALS.length; i++) if (FESTIVALS[i].id === id) return FESTIVALS[i];
    return null;
  };
  DL.DATA.siteById = function (id) {
    for (var i = 0; i < SITES.length; i++) if (SITES[i].id === id) return SITES[i];
    return null;
  };
  DL.DATA.festivalByDay = {};
  FESTIVALS.forEach(function (f) {
    f.days.forEach(function (d) { DL.DATA.festivalByDay[d - 1] = f; });
  });
  DL.DATA.cityCurrency = function (cityId) {
    var c = DL.DATA.cityById(cityId);
    return c ? c.currency : 'dinar';
  };
  DL.DATA.currencyName = function (code) {
    var cur = CURRENCIES[code];
    return cur ? cur.name : code;
  };
  DL.DATA.currencyNation = function (code) {
    var cur = CURRENCIES[code];
    return cur ? cur.nation : null;
  };
  DL.DATA.nationDistance = function (n1, n2) {
    if (n1 === n2) return 0;
    var a = DL.DATA.nationById(n1), b = DL.DATA.nationById(n2);
    if (!a || !b) return 2;
    if (a.adj.indexOf(n2) !== -1 || b.adj.indexOf(n1) !== -1) return 1;
    return 2;
  };
})(typeof window !== 'undefined' ? window : globalThis);
