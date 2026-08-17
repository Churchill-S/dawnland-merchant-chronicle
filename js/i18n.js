/* 国际化：中/英切换（界面与主要数据的短语词典 + DOM 文本翻译） */
(function (G) {
  'use strict';
  var DL = G.DL = G.DL || {};

  var LANG_KEY = 'dawnlands_lang';
  var lang = 'zh';
  try {
    var saved = G.localStorage ? G.localStorage.getItem(LANG_KEY) : null;
    if (saved === 'en' || saved === 'zh') lang = saved;
  } catch (e) { /* ignore */ }

  var DICT = {
    // 顶栏与主按钮
    '曦光之地 · 商会风云': 'Dawnlands · Merchant Chronicle',
    '存档': 'Save', '读档': 'Load', '新游戏': 'New Game', '帮助': 'Help',
    '金库': 'Treasury', '负债': 'Debt', '日息': 'Daily Interest',
    '推进一天': 'Advance Day', '推进三天': 'Advance 3 Days', '自动经营': 'Auto Play', '停止自动': 'Stop Auto',
    // 标签页
    '概览': 'Overview', '产业': 'Industry', '市场': 'Market', '商队': 'Caravan',
    '公会': 'Guild', '公司': 'Companies', '名胜': 'Sights', '建造': 'Build',
    '外交': 'Diplomacy', '财政': 'Finance', '统计': 'Stats',
    // 市场
    '流通市场': 'Local Market', '我的仓库': 'My Warehouse', '外地需求': 'Foreign Demand',
    '本地市场流通': 'Local Market', '居民摊位': 'Resident Stalls', '外地商队在镇': 'Visiting Caravans',
    '居民需求': 'Resident Demand', '零售': 'Retail', '买入': 'Buy', '卖出': 'Sell',
    '买入价': 'Buy Price', '卖出价': 'Sell Price', '库存': 'Stock', '数量': 'Qty', '操作': 'Action',
    '合理价': 'Fair Price', '零售价': 'Retail Price', '调价': 'Adjust', '自动补货': 'Auto Restock',
    '零售定价': 'Retail Pricing', '缺口': 'Shortage', '需求/天': 'Demand/Day', '品质': 'Quality',
    '特产': 'Specialty', '装车外销': 'Load & Export', '卖给居民': 'Sell to Residents',
    '收购需求': 'Purchase Orders', '现货': 'Stock', '停留': 'Stay', '关系': 'Relation',
    '商会仓库': 'Merchant Warehouse', '买入来源': 'Buy Sources', '每周商路公告': 'Weekly Bulletin',
    '打听情报': 'Intel', '限时采购大单': 'Limited-Time Orders', '加价': 'Markup', '剩余': 'Left',
    '未发现': 'Undiscovered', '已发现': 'Discovered', '待开发': 'Unbuilt', '已开发': 'Developed',
    '居民需求与零售': 'Resident Demand & Retail', '本地市场': 'Local Market', '卖给外地商队': 'Sell to Caravan',
    '自动跟随合理价': 'Auto-follow Fair Price', '商店': 'Shop', '需要': 'Needs', '单价': 'Price', '数量': 'Qty',
    // 商队
    '目的地': 'Destination', '负责人': 'Leader', '回程策略': 'Return Strategy',
    '自动采购最佳回货': 'Auto-buy Best Return Cargo', '空载返回': 'Return Empty',
    '装载货物': 'Cargo', '出发': 'Depart', '在途商队': 'Active Caravans', '车队管理': 'Fleet',
    '在编商队': 'Fleet Size', '每日维护费': 'Daily Upkeep', '当前载重': 'Capacity',
    '（仅在途，每队 ': '(in transit only, ', 'G）': 'G)',
    '商队速度加成': 'Speed Bonus', '招募新商队': 'Recruit Caravan', '升级车队': 'Upgrade Fleet',
    '雇佣护卫': 'Hire Guard', '护卫': 'Guard', '无护卫': 'No Guard', '下一位可招募': 'Next Hireable',
    '当前护卫': 'Current Guard', '载重': 'Capacity', '速度': 'Speed', '去程': 'Outbound', '回程': 'Returning',
    // 公会
    '冒险者名册': 'Adventurer Roster', '聘请为护卫': 'Hire as Guard', '剿灭强盗': 'Eliminate Bandits',
    '路线': 'Route', '危险度': 'Danger', '剿灭所选路线': 'Eliminate Route', '战力': 'Power', '护卫一趟': 'Per Trip',
    '本局未启用强盗': 'Bandits are disabled in this game', '公会暂时歇业': 'Guild is closed',
    // 公司
    '我的持股': 'My Holdings', '投资机会': 'Investments', '股价': 'Share Price', '日分红': 'Daily Dividend',
    '买1': 'Buy 1', '卖1': 'Sell 1', '买10': 'Buy 10', '卖10': 'Sell 10', '开设新公司': 'Found Company',
    '航运公司': 'Shipping Co.', '特产公司': 'Specialty Co.', '航运': 'Shipping', '公司': 'Company', '股': 'sh',
    // 名胜
    '名胜古迹': 'Landmarks', '探险队': 'Expedition', '派出探险队': 'Send Expedition',
    '投资开发': 'Invest', '门票': 'Tickets', '维护': 'Upkeep', '名胜清单': 'Landmarks List',
    '在外的探险队': 'Active Expeditions', '天': ' days',
    // 建造
    '施工中': 'Under Construction', '可建造设施': 'Buildable Facilities', '建造': 'Build', '升级': 'Upgrade',
    '已建': 'Built', '仅港口城市可建': 'Port cities only', '近期海路使用': 'Sea trips (30d)',
    // 外交
    '外交对象': 'Diplomatic Target', '外交行动': 'Actions', '生效条约': 'Active Treaties',
    '关系值': 'Relations', '赠送礼物': 'Send Gift', '签署互惠通商协议': 'Trade Treaty',
    '派遣商路护卫': 'Escort', '联合举办节庆': 'Joint Festival', '派遣技术工匠': 'Artisan',
    '紧急粮食援助': 'Food Aid', '执行': 'Do', '每季度自然衰减': 'Decays each season',
    // 财政
    '金库与债务': 'Treasury & Debt', '偿还全部债务': 'Repay All Debt', '国际银团贷款利率': 'Loan Rate',
    '借款': 'Borrow', '发行汇票': 'Issue Bill', '税率': 'Tax Rate', '货币兑换': 'Currency Exchange',
    '换入': 'Buy', '换出': 'Sell', '持有': 'Held', '商队牌照': 'Caravan License', '购买牌照': 'Buy License',
    '贷款': 'Loans', '汇票': 'Bills', '现金': 'Cash', '债务': 'Debt', '当前税率': 'Current Tax',
    // 统计与概览
    '胜利条件': 'Victory Conditions', '商会业绩': 'Performance', '累计贸易额': 'Total Trade',
    '商队出发次数': 'Caravan Trips', '建成设施': 'Buildings', '签署条约': 'Treaties',
    '最高繁荣度': 'Peak Prosperity', '剩余时间': 'Time Left', '导出存档': 'Export Save',
    '导入存档': 'Import Save', '商路日志': 'Journal', '已达成': 'Achieved', '平凡结局': 'Ordinary Ending',
    '经济胜利': 'Economic Victory', '文化胜利': 'Cultural Victory', '外交胜利': 'Diplomatic Victory',
    '霸主胜利': 'Hegemony Victory', '主线胜利': 'Main Victory', '自由经营模式': 'Sandbox Mode',
    '人口': 'Population', '繁荣度': 'Prosperity', '信用评级': 'Credit', '交通通达度': 'Connectivity',
    '旅游吸引力': 'Tourism', '居民满意度': 'Satisfaction', '商会资产': 'Assets', '车队': 'Fleet',
    '设施': 'Facilities', '年度贸易额': 'Annual Trade', '近期日志': 'Recent Log', '难度': 'Difficulty',
    '简单': 'Easy', '普通': 'Normal', '困难': 'Hard', '任务': 'Task', '今日收入': 'Income Today',
    '今日支出': 'Expenses Today', '今日净额': 'Net Today', '今日贸易额': 'Trade Today', '今日零售收入': 'Retail Today',
    '税收': 'Tax', '旅游': 'Tourism', '过路费': 'Tolls', '旅馆': 'Inns', '贵族消费': 'Luxury',
    '股份分红': 'Dividends', '名胜门票': 'Site Tickets', '债务利息': 'Debt Interest', '设施维护': 'Building Upkeep',
    '商队维护': 'Fleet Upkeep', '船只维护': 'Ship Upkeep', '名胜维护': 'Site Upkeep',
    // 开局
    '选择商会大本营': 'Choose Your Headquarters', '开局难度': 'Starting Difficulty',
    '启用胜利条件与十年期限': 'Enable victory conditions & 10-year limit',
    '启用强盗': 'Enable bandits', '语言': 'Language', '中文': 'Chinese', '英语': 'English',
    '关闭后为自由沙盒经营': 'Off = free sandbox play', '自由沙盒经营': 'Free sandbox play',
    '开局可选': 'Choose at start', '特产': 'Specialty',
    // 质量与通用
    '普通': 'Common', '精良': 'Fine', '稀有': 'Rare', '普': 'C', '良': 'F', '稀': 'R',
    '商品': 'Goods', '仓库': 'Warehouse', '卖出价': 'Sell Price', '买入价': 'Buy Price',
    '金币不足': 'Not enough gold', '已存档': 'Saved', '确认': 'Confirm', '确定': 'OK', '取消': 'Cancel',
    '返回': 'Back', '继续经营': 'Continue Playing', '重新开始': 'Restart', '明白了': 'Got it', '关闭': 'Close',
    // 月份与空日（日历按语言另行生成，这里供兜底）
    '新芽月': 'Sproutmonth', '百花月': 'Blossommonth', '牧草月': 'Pasturemonth', '阳曦月': 'Sunbrightmonth',
    '刈草月': 'Haymonth', '初穗月': 'Earingmonth', '丰熟月': 'Harvestmonth', '酿造月': 'Vintagemonth',
    '金秋月': 'Goldentidemonth', '雾霭月': 'Mistfallmonth', '霜晨月': 'Frostmornmonth', '静息月': 'Stillnessmonth',
    '春分': 'Spring Equinox', '夏至': 'Summer Solstice', '秋分': 'Autumn Equinox', '合欢跋日': 'Acacia Fair Day', '冬至': 'Winter Solstice',
    '空日': 'Hollow Day', '第': 'Year ', '年': '', '日': '',
    '春': 'Spring', '初夏': 'Early Summer', '仲夏': 'Midsummer', '盛夏': 'High Summer',
    '初秋': 'Early Autumn', '仲秋': 'Mid Autumn', '晚秋': 'Late Autumn', '初冬': 'Early Winter',
    '仲冬': 'Midwinter', '深冬': 'Deep Winter', '冬末': 'Late Winter',
    // 节日
    '夏至光宴': 'Solstice Lantern Feast', '丰饶角主宴': 'Cornucopia Feast', '新酒开坛日': 'New Wine Day',
    '金秋大集': 'Golden Fair', '灯笼节': 'Lantern Festival', '静夜思': 'Quiet Night', '礼赠节': 'Gift Festival',
    // 国家
    '北境牧原联邦': 'Northern Pastoral Federation', '北境': 'North',
    '日晷王域': 'Sundial Realm', '日晷': 'Sundial',
    '金穗公国': 'Duchy of Goldenwheat', '金穗': 'Goldenwheat',
    '琥珀河谷邦': 'Amber Valley Confederation', '琥珀': 'Amber',
    '青崖沿海自由市': 'Jade Cliffs Free Cities', '青崖': 'Jade Cliffs',
    '东林兄弟会': 'Eastwood Brotherhood', '东林': 'Eastwood',
    '苍澜海盟': 'Azuremarch League', '苍澜': 'Azuremarch',
    '银沙自治领': 'Silver Sands Dominion', '银沙大岛': 'Silver Sands Isle', '银沙': 'Silver Sands',
    // 货币
    '金穗镑': 'Wheat Pound', '琥珀索尔': 'Amber Sol', '青崖银马克': 'Jade Mark',
    '日晷第纳尔': 'Sundial Dinar', '北境里拉': 'Northern Lira', '东林先令': 'Eastwood Shilling',
    '苍澜贝币': 'Azure Shell', '银沙币': 'Silver Mark',
    // 城市（39）
    '日晷王城': 'Sunring', '三泉镇': 'Threesprings', '铜门修道院': 'Copper Abbey',
    '金穗领': 'Wheatseat', '蜂鸣市集': 'Bee Market', '双河堡': 'Twinbridge',
    '琥珀梯田': 'Amber Terraces', '老橄榄泉': 'Old Olive Well', '砖窑丘': 'Brick Hill',
    '花盆盆地': 'Floral Basin', '青贝港': 'Green Harbor', '盐花原': 'Saltflower',
    '白石渡': 'Whitestone', '金河三角洲': 'Golden Delta', '光斑林镇': 'Spotlit Wood',
    '鹿鸣泉': 'Deerspring', '松脂市': 'Resin Pine', '风吟柳林': 'Willowwind',
    '羊毛崖': 'Woolcliff', '晨碑丘陵': 'Dawnstone', '石楠酒庄': 'Heather Winery', '青草高原': 'Grass Highland',
    '沧浪港': 'Canglang Port', '鲸歌湾': 'Whale Song Bay', '雾灯屿': 'Foglight Isle',
    '礁石城': 'Reefstone', '风帆镇': 'Windsail Town', '盐沫镇': 'Saltfoam', '青霭城': 'Bluemist',
    '贝珠屿': 'Pearl Isle', '螺湾': 'Spiral Cove', '鸥歌岛': 'Gull Song Isle',
    '沉珠岛': 'Sunken Pearl Isle', '月落屿': 'Moonfall Isle',
    '沙鸥城': 'Gull City', '金桂镇': 'Golden Osmanthus', '陶沙镇': 'Sunset Clay', '晚霞港': 'Sunset Harbor',
    // 商品（26）
    '面粉': 'Flour', '麦酒': 'Ale', '蜂蜜': 'Honey', '葡萄酒': 'Wine', '橄榄油': 'Olive Oil',
    '彩陶': 'Pottery', '咸鱼': 'Salted Fish', '花香盐': 'Flower Salt', '木雕': 'Wood Carving',
    '药草': 'Herbs', '松脂糖': 'Resin Candy', '羊毛': 'Wool', '奶酪': 'Cheese', '矮脚马': 'Pony',
    '铜器': 'Copperware', '书籍/手抄本': 'Books', '珍珠': 'Pearls', '鲸蜡': 'Whale Wax',
    '帆布': 'Canvas', '珊瑚饰': 'Coral Ornaments', '海图': 'Sea Charts', '铁器': 'Ironware',
    '亚麻布': 'Linen', '果干': 'Dried Fruit', '香木': 'Aromatic Timber', '香料': 'Spices',
    // 建筑（15）
    '驿站': 'Stage Post', '商会大厅': 'Guild Hall', '公共粮仓': 'Granary', '酿酒坊': 'Brewery',
    '织造坊': 'Weavery', '旅馆': 'Inn', '豪华饭店': 'Grand Tavern', '港务局': 'Harbor Office',
    '集市广场': 'Market Square', '工匠行会': 'Craft Guild', '银行分行': 'Bank Branch',
    '灯塔': 'Lighthouse', '公共浴场': 'Public Bath', '石桥': 'Stone Bridge', '航运公司': 'Shipping Co.',
    // 名胜（9）
    '千窗书塔': 'Thousand-Window Library', '三色潭': 'Three-Color Pools', '雾纱瀑布': 'Veiled Falls',
    '回音圆环': 'Echo Ring', '碎瓷塔': 'Shard Tower', '千丘原油菜花田': 'Thousand Knolls Canola',
    '风琴海蚀洞': 'Organ Sea Cave', '珊瑚礁公园': 'Coral Reef Park', '迎日台': 'Sun Greeting Terrace',
    // 成就 / 图鉴 / 排行榜
    '成就': 'Achievements', '商路图鉴': 'Trade Codex', '商会排行榜': 'House Ranking',
    '商会排名': 'Rank', '你的商会': 'Your House', '分数': 'Score', '奖励': 'Reward',
    '到访城市': 'Visited Cities', '经手商品': 'Goods Traded', '排名': 'Rank',
    '金穗联合行': 'Goldenwheat United', '青崖远帆商社': 'Jade Cliffs Sailfarers', '苍澜明珠商会': 'Azuremarch Pearl Guild',
    '初出茅庐': 'First Steps', '派出第一支商队': 'Send your first caravan',
    '商路初通': 'Road Opened', '累计贸易额达到 1,000G': 'Reach 1,000G total trade',
    '万金在手': 'Ten Thousand', '金库达到 10,000G': 'Reach 10,000G treasury',
    '无债一身轻': 'Debt-Free', '还清全部债务': 'Pay off all debt',
    '财源广进': 'Flourishing', '累计贸易额达到 50,000G': 'Reach 50,000G total trade',
    '十万大商': 'Grand Merchant', '达成经济胜利': 'Win an Economic Victory',
    '誉满大陆': 'Renowned', '达成外交胜利': 'Win a Diplomatic Victory',
    '文化之都': 'Cultural Capital', '达成文化胜利': 'Win a Cultural Victory',
    '铸币权柄': 'Mint Master', '达成霸主胜利': 'Win the Hegemony Victory',
    '富可敌国': 'Staggering Wealth', '金库达到 100,000G': 'Reach 100,000G treasury',
    '名满天下': 'Top of the World', '商会排行榜登顶第一名': 'Reach #1 in the House Ranking',
    '探险先锋': 'Pathfinder', '发现第一处名胜': 'Discover your first landmark',
    '收藏家': 'Collector', '发现全部名胜': 'Discover all landmarks',
    '商队之主': 'Fleet Master', '在编商队达到 8 支': 'Field 8 caravans',
    '股份大亨': 'Share Tycoon', '持有股份合计达到 100 股': 'Hold 100 shares total',
    '广而告之': 'Word Spreads', '发布第一条求购公告': 'Post your first buy request',
    '剿匪英雄': 'Bandit Slayer', '剿灭第一处强盗据点': 'Eliminate your first bandit lair',
    '人脉广布': 'Well Connected', '与 10 座城市关系达到 40 以上': 'Reach 40+ relations with 10 cities',
    '十年经营': 'Decade of Trade', '经营满十年': 'Operate for ten years',
    // 节日活动
    '节日活动': 'Festival Events', '放河灯': 'Release Lanterns', '放一盏河灯（20G）': 'Release a lantern (20G)',
    '举办丰饶宴席': 'Hold a Feast', '举办宴席': 'Hold the feast',
    '开坛品酒': 'Wine Tasting', '品酒（15G）': 'Taste wine (15G)',
    '金秋大集摆摊': 'Open a Fair Stall', '摆摊（摊位费30G）': 'Open a stall (30G fee)',
    '全城亮灯': 'Light the City', '点亮全城（50G）': 'Light up the city (50G)',
    '备礼相赠': 'Give Gifts', '送礼（30G）': 'Send gifts (30G)',
    '摊位费': 'Stall Fee', '大集结算': 'Fair Settlement',
    // 旅途事件 / 海盗 / 冒险者
    '护航船队': 'Escort Fleet', '海防（海盗）': 'Naval Defense', '海盗': 'Pirates',
    '雇佣海军清剿（60天安全）': 'Hire Navy to Clear (60 days)', '海盗活跃度': 'Pirate Activity',
    '公会委托（每周）': 'Guild Contracts (weekly)', '护卫商队': 'Guard Caravans',
    '刷新倒计时': 'Renewal Countdown', '完成委托：全员冒险者 +3XP，商会 +80G。': 'Complete: all adventurers +3XP, +80G for the guild.',
    '路遇流浪工匠': 'Roadside Artisan', '顺路捎货': 'Parcel Delivery', '古骡驿站遗址': 'Old Mule Depot Ruins',
    '商人结伴': 'Merchant Companion', '暴雨改道': 'Storm Detour', '好心村民': 'Kind Villagers',
    // 生产系统
    '生产': 'Production', '生产工坊': 'Production Workshop', '配方': 'Recipe', '开工率': 'Output Rate',
    '暂停': 'Pause', '恢复': 'Resume', '原料': 'Materials', '缺原料': 'Missing Materials',
    '每日维护': 'Daily Upkeep', '配方与行情': 'Recipes & Prices', '最高外销': 'Best Export',
    '本城卖': 'Home Sell', '工坊': 'Workshop', '未设置配方': 'No Recipe', '天/批': ' days/batch',
    '原料品质': 'Input Quality', '产出：': 'Output: ',
    '酿造麦酒': 'Brew Ale', '窖藏葡萄酒': 'Age Wine', '织造帆布': 'Weave Canvas',
    '调制香料': 'Blend Spices', '提炼鲸蜡': 'Render Wax', '雕刻木器': 'Carve Wood', '打制铜器': 'Forge Copperware',
    // 产业链：新商品与新建筑
    '水果': 'Fresh Fruit', '精酿啤酒': 'Craft Beer', '衣服': 'Clothing', '面包': 'Bread', '粗制面包': 'Rough Bread',
    '精酿啤酒坊': 'Craft Brewery', '葡萄酒坊': 'Winery', '烘焙坊': 'Bakery',
    '酒馆': 'Tavern', '服装店': 'Clothing Shop', '糕点铺': 'Pastry Shop',
    '晾晒果干': 'Dry Fruit', '烤制粗面包': 'Bake Rough Bread',
    '酒馆收入': 'Tavern', '生产维护': 'Production Upkeep',
    // ===== 人物名（商队首领 / 冒险者 / 可招募）=====
    '执印官·赛琳': 'Scribe Selene', '邮驿官·巴顿': 'Postmaster Barton', '石匠·多恩': 'Stonemason Dorn', '学徒·莉娜': 'Apprentice Lena',
    '温泉侍·汤圆': 'Spring Attendant Tang', '泼泉客·阿澈': 'Splash Diver Ache', '铸钟匠·铎': 'Bellfounder Duo', '抄经生·素行': 'Scribe Su',
    '麦客·哈维': 'Wheatman Harvey', '磨坊主·玛莎': 'Miller Martha', '车把式·老提姆': 'Old Tim the Carter',
    '蜂农·蜜妮': 'Beekeeper Mini', '骡夫·老皮': 'Old Piers the Muleteer', '集市掮客·阿洛': 'Market Broker Alo',
    '水车匠·桥生': 'Millwright Qiao', '信使·溪客': 'Courier Creek', '酿酒师·罗萨': 'Vintner Rosa',
    '驮夫·塞尔吉': 'Porter Sergio', '葡萄女·维奥拉': 'Grape Girl Viola', '橄榄翁·尼科': 'Olive Elder Nico',
    '牧羊女·索菲': 'Shepherdess Sophie', '窑工·红土': 'Kilnman Redd', '碎瓷客·阿吉': 'Shard Dealer Aji',
    '花匠·芙洛': 'Florist Fulo', '香贩·露露': 'Scent Vendor Lulu', '船长·玛拉': 'Captain Mara',
    '舵手·扬': 'Helmsman Yan', '报关员·裴洛': 'Customs Clerk Perro', '水手·小雀': 'Sailor Sparrow',
    '盐工·白粒': 'Saltworker Grain', '驮盐驼·老灰': 'Old Gray the Salt Hauler', '渡翁·白石': 'Ferryman Whitestone',
    '茶摊娘·春芽': 'Tea Girl Springbud', '舟子·水菱': 'Boatman Ling', '稻农·穗生': 'Rice Farmer Sui',
    '纤夫·大壮': 'Towman Strong', '木语匠·奥力': 'Woodwright Orly', '林道巡者·青须': 'Forester Greenbeard',
    '采蜜人·贝拉': 'Honey Gatherer Bella', '猎皮匠·鹿鸣': 'Tanner Deerbell', '泉边女·艾达': 'Spring Maiden Ada',
    '松脂客·针叶': 'Resin Tapper Needle', '糖匠·琥珀': 'Candy Maker Amber', '柳筏客·青绦': 'Willow Rafter Willow',
    '观鸟人·鹭白': 'Birdwatcher Egret', '牧人·葛雷': 'Herdsman Grey', '套马手·乌达': 'Horse Catcher Uda',
    '冬帐长·艾莎': 'Winter Chief Aisha', '系布者·祈': 'Ribbon Tyer Qi', '石柱守·磐': 'Stone Pillar Keeper Pan',
    '酿酒娘·石楠': 'Brewmaid Heather', '曲窖工·蜜语': 'Cellar Hand Honeytalk', '马倌·青风': 'Pony Herder Greenwind',
    '夏帐长·云毡': 'Summer Chief Cloudfelt', '船长·白浪': 'Captain Whitewave', '引航员·灯花': 'Pilot Lantern',
    '水手长·铁锚': 'Boatswain Anchor', '捕鲸手·黑潮': 'Whaler Blacktide', '海湾歌者·澜': 'Bay Singer Lan',
    '守灯人·阿雾': 'Lamp Keeper Foggy', '夜航客·蓑笠': 'Night Sailor Raincoat', '珊瑚匠·珠': 'Coral Smith Pearl',
    '暗流通·卷潮': 'Reef Pilot Curl', '造船师·龙骨': 'Shipwright Keel', '快帆手·燕子': 'Fast Sail Swift',
    '盐工·白沫': 'Saltworker Foam', '驮盐人·老岩': 'Salt Hauler Oldrock', '海图师·青梧': 'Cartographer Bluewood',
    '雨林客·苔衣': 'Rainforest Walker Moss', '信风人·叶笛': 'Tradewind Piper Leaf', '采珠人·阿珠': 'Pearl Diver Zhu',
    '岛民·潮生': 'Islander Tidal', '螺号手·海螺': 'Conch Blower Conch', '木匠·鳍': 'Carpenter Fin',
    '海鸥客·白羽': 'Gull Rider Whitefeather', '引航员·小鸥': 'Pilot Little Gull', '珠农·潜': 'Pearl Farmer Dive',
    '筏工·青贝': 'Rafter Green Shell', '香客·雾月': 'Scent Seeker Mistmoon', '夜航·芦笛': 'Night Pilot Reed',
    '沙鸥信使·羽': 'Gull Courier Feather', '渔夫·银浪': 'Fisher Silverwave', '桂花客·香': 'Osmanthus Guest Fragrance',
    '果贩·甜': 'Fruit Vendor Sweet', '陶工·沙': 'Potter Sand', '驮驴·阿笨': 'Donkey Boy Dull',
    '晚霞舵手·霞': 'Sunset Helmsman Haze', '盐商·白壳': 'Salt Trader White Shell',
    '剑士·洛根': 'Swordsman Logan', '猎手·芙蕾': 'Huntress Freya', '游侠·凯斯': 'Ranger Keith',
    '盾卫·布鲁诺': 'Shieldbearer Bruno', '弓手·薇拉': 'Archer Vera', '佣兵·加尔': 'Mercenary Gar',
    '侦察兵·雀': 'Scout Sparrow', '浪人·一刀': 'Ronin Ichito', '弩手·霜': 'Crossbow Frost',
    '武僧·磐': 'Monk Stone', '骑手·岚': 'Rider Storm', '新兵·豆子': 'Rookie Bean',
    '流浪商人·灰袍': 'Wandering Merchant Robe', '独行客·石牙': 'Loner Flint', '老车夫·风尘': 'Old Carter Dust',
    '退役信使·白鹭': 'Retired Courier Egret', '驼队主·沙驼': 'Caravan Master Camel', '账房先生·铁算盘': 'Bookkeeper Abacus',
    '镖师·石敢': 'Guard Stonebold', '游商·灯芯': 'Peddler Wick', '货郎·铃铛': 'Hawker Bell', '驿丞·快脚': 'Courier Chief Swiftfoot',
    // ===== 随机事件 =====
    '暴雨减产': 'Storm Damage', '拨款赈灾（80G）': 'Fund relief (80G)', '稳住民心，避免繁荣度下滑': 'Calms citizens, avoids prosperity loss',
    '坐视不理': 'Do nothing', '繁荣度-4': 'Prosperity -4',
    '连日的暴雨冲毁了城外农田，本地特产将减产数日，价格上扬。市民们眼巴巴地看着商会。': 'Days of rain ruined the fields; local specialties will drop and prices rise. Citizens look to your guild.',
    '商队竞争': 'Rival Caravan', '静观其变': 'Wait and see', '无直接代价': 'No direct cost',
    '有情报说，另一支商队正抢先把你打算运往的某城货物押低价格。市场行情会临时波动。': 'A rival caravan is undercutting prices in a city you planned to ship to. Market prices will shift.',
    '流浪工匠': 'Wandering Artisan', '升级马车 +50kg（200G）': 'Upgrade wagon +50kg (200G)', '永久提升载重': 'Permanently +50kg capacity',
    '修补破损货物（100G）': 'Repair damaged cargo (100G)', '仓库中货物恢复': 'Restores some cargo', '婉拒': 'Decline', '什么也不发生': 'Nothing happens',
    '领主采购大单': "Lord's Purchase Order", '接下订单': 'Accept',
    '邻城领主发布悬赏：5天内运来 30 袋面粉，赏金 300G 与好感。商队抵达时若载有足量面粉即可领取。': 'A neighboring lord posts a bounty: deliver 30 sacks of flour within 5 days for 300G and favor. Caravans carrying enough flour can claim it.',
    '派商队运送30面粉至金穗领': 'Send 30 flour to Wheatseat', '无损失': 'No loss',
    '丰收喜讯': 'Bountiful Harvest', '太好了': 'Wonderful', '本地特产-20%，持续5天': 'Local specialties -20% for 5 days',
    '南边传来风调雨顺的好消息，未来5天本地特产价格将下降，适合囤货。': 'Good news from the south: local specialty prices drop for 5 days. Time to stock up.',
    '节日突袭': 'Festival Rush', '留意行情': 'Watch the market', '节日相关商品将涨价': 'Festival goods will rise',
    '邻近节日将近，商人们已经开始抢购相关货品。若你也想分一杯羹，现在正是备货的时候。': 'A festival approaches and merchants are already hoarding. Stock up now to profit.',
    '贵族游客到访': 'Noble Visitor', '好生招待': 'Welcome warmly', '旅游收入×2，持续3天': 'Tourism income x2 for 3 days',
    '一位出手阔绰的贵族携随从到访本城，旅游收入未来3天翻倍。': 'A generous noble visits your city; tourism income doubles for 3 days.',
    '技术突破': 'Breakthrough', '奖励匠人': 'Reward the artisans', '随机产业+5': '+5 to a random industry',
    '本地匠人琢磨出了新的工艺诀窍，某类产业得到永久提升。': 'Local artisans found a new technique; one industry improves permanently.',
    '道路塌方': 'Landslide', '出资抢修（100G）': 'Fund repairs (100G)', '3天后恢复通车': 'Reopens in 3 days',
    '等官府处理': 'Let officials handle it', '某条路中断5天': 'One route closed for 5 days',
    '山道塌方，一条商路暂时中断。市政官来询问商会是否出资抢修。': 'A landslide blocks a trade route. The bailiff asks if your guild will fund repairs.',
    '信用质疑': 'Credit Doubts', '公开账目（60G）': 'Open the books (60G)', '信用仅-1': 'Credit -1 only',
    '不予理会': 'Ignore it', '信用-4': 'Credit -4',
    '坊间传闻商会资金链吃紧，合作伙伴们投来怀疑的目光。': 'Rumors say your guild is short on funds; partners eye you with doubt.',
    '旱涝歉收': 'Poor Harvest', '开仓稳市（公共粮仓）': 'Open the granary', '有粮仓时可稳定粮价': 'Steadies grain prices with a granary',
    '听天由命': 'Leave it to fate', '农业产出-50%，5天': 'Farm output -50% for 5 days',
    '天公不作美，本地农业未来5天减产一半。粮价眼看要涨。': 'Bad weather halves local farm output for 5 days. Grain prices will climb.',
    '外国商人涌入': 'Foreign Merchants', '趁机扫货': 'Stock up', '外国商品-10%，3天': 'Foreign goods -10% for 3 days',
    '一群操着异国口音的商人涌入本城，带来的外国商品价格实惠。': 'Foreign-accented merchants flood the city with cheap imports.',
    '流浪商队投奔': 'Wandering Caravan Joins', '收编（若未达上限）': 'Take them in (if under cap)', '在编商队+1': 'Fleet +1',
    '一支走投无路的流浪商队来到城门口，领头人愿意带着车马并入你的商会。': 'A desperate wandering caravan offers to merge into your guild.',
    '车队失踪': 'Missing Caravan', '派队搜寻（150G）': 'Send a search party (150G)', '有机会找回，也可能人货两空': 'May recover all, or lose everything',
    '放弃搜寻': 'Abandon the search', '损失一支在编商队': 'Lose one caravan unit',
    '一场大雨后，你的一支商队迟迟未归，营地只留下翻倒的车辙。': 'After heavy rain, one of your caravans never returned; the camp shows only overturned tracks.',
    '无事发生': 'Nothing happens',
    // ===== 日志与常用片段 =====
    '率商队出发': 'departed with', '商队抵达': 'Caravan arrived at', '，售出货物得': ' and sold goods for',
    '率商队凯旋': 'returned triumphantly', '已卸入仓库': 'unloaded into the warehouse', '空载而归': 'returned empty',
    '在「': ' on "', '」遭遇强盗！损失 ': '" met bandits! Lost ', '行程延误1天': 'Delayed 1 day',
    '将其击退，货物无恙': 'repelled them; goods intact', '护卫 ': 'guard ', '为金河逆流雇佣纤夫，支付 ': 'hired towmen for the upstream river, paid ',
    '聘请冒险者 ': 'Hired adventurer ', '随队护卫，支付 ': ' as escort, paid ', '向居民购入 ': 'Bought from residents: ',
    '花费 ': 'for ', '从': 'From ', '商队购入 ': 'caravan, bought ', '关系+': 'relation +', '售予居民 ': 'Sold to residents: ',
    '收入 ': 'for ', '售予': 'Sold to ', '发布求购公告：': 'Posted buy request: ', '出价 ': 'offer ',
    '（7天，定金10G）': ' (7 days, 10G deposit)', '商队看到你的求购公告，按出价带来了 ': 'Caravans saw your request and brought ',
    '商队嫌部分出价太低，讨价还价后带来：': 'Caravans haggled over low offers and brought: ',
    '的商队抵达本镇，停留 ': "'s caravan arrived, staying ", '带来现货并发布收购需求': 'with goods and purchase orders',
    '的商队离开了本镇': "'s caravan left town", '投资开发「': 'Invested in "', '」至 ': '" to ', '级，花费 ': ' level, spent ',
    '在本城开设 ': 'Founded in your city: ', '公司，持有 ': ' company, holding ', '股': ' sh',
    '商会于 ': 'Your guild was founded at ', '成立。身负 ': '. You carry ', '债务，怀揣 ': ' debt and ',
    '启动金，十年之约，自此而始。': ' starting gold; the ten-year pact begins now.',
    '大陆上有强盗出没，商队出行可到冒险者公会聘请护卫或剿灭匪巢。': 'Bandits roam the land; hire guards or clear lairs at the Adventurers Guild.',
    '今日节日「': 'Today: festival "', '」：': '" - ', '汇票到期，计入债务 ': 'Bill due, added to debt ',
    '信用-': 'credit -', '领主采购大单已过期，对方好感-1。': "The lord's order expired; relations -1.",
    '还清全部债务与贷款！商会再无负担。': 'All debts repaid! Your guild is free.',
    '成就达成：': 'Achievement unlocked: ', '（奖励 ': ' (reward ', 'G）': 'G)',
    '部分求购公告已到期撤下。': 'Some buy requests expired.', '工坊产出：': 'Workshop output: ',
    '」抢走了你的采购大单！': '" stole your purchase order!', '（含定金与品质）': '',
    // ===== 界面剩余 =====
    '行情': 'Market data', '未启用': 'Not enabled', '需要': 'Needs', '需求': 'Demand', '邀请': 'Invite',
    '我的求购公告': 'My Buy Requests', '发布求购（7天）': 'Post Buy Request (7d)',
    '本地市场流通': 'Local Market', '买入来源': 'Buy Sources', '居民摊位': 'Resident Stalls', '外地商队在镇': 'Visiting Caravans',
    '现货（购买可增进关系 +0.8）': 'Stock (buying gains +0.8 relations)', '收购需求（出售可增进关系 +0.5）': 'Orders (selling gains +0.5 relations)',
    '居民需求 · 零售': 'Resident Demand & Retail', '自动从仓库补货': 'Auto restock from warehouse',
    '零售价自动跟随合理价': 'Retail auto-follows fair price', '发布求购后，到访的外地商队会按你的出价带货': 'After posting, visiting caravans bring goods at your offer price',
    '出价低于合理价 85% 时他们会讨价还价': 'Offers below 85% of fair price trigger haggling',
    '发布需付 10G 定金（防乱挂公告）': 'Posting costs a 10G deposit (anti-spam)',
    '暂无求购公告': 'No buy requests yet', '到「市场 → 流通市场」可发布求购': 'Post requests in Market > Local Market',
    '派商队': 'Send Caravan', '查看外地需求': 'View Foreign Demand', '派遣商队': 'Send Caravan',
    '本周暂无公告': 'No bulletin this week', '暂无限时采购单': 'No limited-time orders',
    '情报不明——派商队前往或建旅馆可打听': 'No intel - send a caravan or build inns to learn',
    '到访城市': 'Visited Cities', '经手商品': 'Goods Traded', '商路': 'Routes', '名胜': 'Sights',
    '奖励': 'Reward', '已达成': 'Unlocked', '未达成': 'Locked', '成就': 'Achievements', '图鉴': 'Codex',
    '商会排行榜': 'House Ranking', '分数': 'Score', '你的商会': 'Your House', '排名': 'Rank', '商会排名': 'Rank',
    '已完成': 'Done', '进行中': 'In progress', '剩余': 'Left', '天': ' days', '刷新倒计时': 'Renewal Countdown',
    '公会委托（每周）': 'Guild Contracts (weekly)', '护卫商队': 'Guard Caravans', '剿灭强盗': 'Eliminate Bandits',
    '完成委托：全员冒险者 +3XP，商会 +80G。': 'Complete: all adventurers +3XP, +80G for the guild.',
    '雇佣海军清剿（60天安全）': 'Hire Navy to Clear (60 days)', '海盗活跃度': 'Pirate Activity', '航线': 'Sea Route',
    '海防（海盗）': 'Naval Defense', '非沿海城市无法雇佣海军——到港口城市发展后回来看看吧。': 'Inland cities cannot hire a navy - develop a port city first.',
    '海路商队可能遭遇海盗；建造「护航船队」可降低遭遇率，并在遭遇时击退海盗。': 'Sea caravans may meet pirates; build an Escort Fleet to repel them.',
    '原料从仓库消耗': 'Materials are taken from the warehouse', '成品进仓库后自行贩卖': 'Products go to your warehouse to sell',
    '根据行情切换配方、调节开工率或暂停。': 'Switch recipes, adjust output, or pause based on the market.',
    '产出：': 'Output: ', '原料品质': 'Input Quality', '进度 ': 'Progress ', '开工率 ': 'Output Rate ', '已暂停': 'Paused',
    '缺原料：': 'Missing materials: ', '配方与行情': 'Recipes & Prices', '最高外销': 'Best Export', '本城卖': 'Home Sell',
    '酒馆': 'Tavern', '服装店': 'Clothing Shop', '糕点铺': 'Pastry Shop', '酒馆收入': 'Tavern',
    '生产维护': 'Production Upkeep', '需维护费': 'Has upkeep', '生产工坊': 'Production Workshop',
    '仅港口城市可建': 'Port cities only', '仅沿海/湖畔城市可建': 'Coastal/Lakeside only', '需先建': 'Requires ',
    '或': ' or ', '消耗': 'Consumes ', '自动赚钱': 'earns automatically', '缺货即停业': 'closes when out of stock',
    '本局未启用强盗，公会暂时歇业——强盗只在开局勾选的对局中出现。': 'Bandits are disabled this game; the guild is closed.',
    '公会未聘请冒险者（先到「公会」页聘请）': 'No adventurer hired (hire one at the Guild page)',
    '招募新商队': 'Recruit Caravan', '升级车队': 'Upgrade Fleet', '升级仓库 +500kg（': 'Upgrade Warehouse +500kg (',
    '仓库等级': 'Warehouse Level', '车队管理': 'Fleet', '在编商队': 'Fleet Size', '每日维护费': 'Daily Upkeep',
    '当前载重': 'Capacity', '商队速度加成': 'Speed Bonus', '下一位可招募': 'Next Hireable', '当前护卫': 'Current Guard',
    '雇佣护卫': 'Hire Guard', '护卫': 'Guard', '无护卫': 'No Guard', '去程': 'Outbound', '回程': 'Returning',
    '载货：': 'Cargo: ', '目的地': 'Destination', '负责人': 'Leader', '回程策略': 'Return Strategy',
    '自动采购最佳回货': 'Auto-buy Best Return Cargo', '空载返回': 'Return Empty', '装载货物': 'Cargo',
    '出发': 'Depart', '在途商队': 'Active Caravans', '城市图鉴': 'City Codex', '商品图鉴': 'Goods Codex',
    '商会资产': 'Assets', '年度贸易额': 'Annual Trade', '近期日志': 'Recent Log', '难度': 'Difficulty',
    '简单': 'Easy', '普通': 'Normal', '困难': 'Hard', '胜利条件': 'Victory Conditions', '商会业绩': 'Performance',
    '累计贸易额': 'Total Trade', '商队出发次数': 'Caravan Trips', '建成设施': 'Buildings', '签署条约': 'Treaties',
    '最高繁荣度': 'Peak Prosperity', '剩余时间': 'Time Left', '导出存档': 'Export Save', '导入存档': 'Import Save',
    '商路日志': 'Journal', '已达成': 'Unlocked', '自由经营模式': 'Sandbox Mode',
    '未启用胜利条件与十年期限': 'Victory conditions & 10-year limit disabled', '可以一直经营下去': 'Play forever',
    '人口': 'Population', '繁荣度': 'Prosperity', '信用评级': 'Credit', '交通通达度': 'Connectivity',
    '旅游吸引力': 'Tourism', '居民满意度': 'Satisfaction', '设施': 'Facilities', '车队': 'Fleet',
    '生产建筑与商店（今日状态）': 'Production Buildings & Shops (today)', '待产': 'Idle',
    '缺货停业': 'Closed (out of stock)', '消耗 ': 'Consumed ', ' · 收入 ': ' · income ', '今日': 'Today',
    '生产建筑': 'Production Buildings',
    '邻城领主发布悬赏，急购一批货物，报酬丰厚。接单后需在5天内送达。': 'A neighboring lord posts a bounty for a cargo delivery with generous pay. Deliver within 5 days.',
    '按指定城市与货物运送': 'Deliver to the named city', '没有可通的外城，订单无人可送。': 'No reachable foreign city; no one can deliver.',
    '接下采购大单：': 'Accepted order: ', ' 送至 ': ' to ', '，赏金 ': '; reward ', 'G（5天）。': 'G (5 days).',
    '订单接下，5天内送达 ': 'Order accepted; deliver to ', ' 即可领赏。': ' within 5 days for the reward.',
    '压制居民自主外销': 'Suppress resident sales',
    '居民不满：满意度每日-0.6；可让本地货更便宜': 'Residents unhappy (-0.6 satisfaction/day); keeps local goods cheap',
    '我的出售公告': 'My Sale Ads', '发布出售（7天 · 广告费20G）': 'Post Sale Ad (7d · 20G fee)',
    '付 20G 广告费挂出售公告；需要这些货的外地商队会按你的报价专程采购。报价高于合理卖价1.4倍时无人问津。': 'Pay 20G to post a sale ad; caravans that need the goods come to buy at your price. Asking over 1.4x fair price attracts no buyers.',
    '报价': 'Asking', '暂无出售公告——发布后，需要这些货的外地商队会专程前来采购': 'No sale ads yet - post one and caravans in need will come to buy',
    '外地商队看到你的出售公告，前来采购 ': 'Caravans saw your sale ad and came to buy: ',
    '发布出售公告：': 'Posted sale ad: ', ' @ ': ' @ ', '（7天，广告费20G）。': ' (7 days, 20G fee).',
    '部分出售公告已到期撤下。': 'Some sale ads expired.',
    '暂无': 'None', '奢侈品': 'Luxury Goods', '扩张': 'Expansion', '高分红': 'High Dividend', '稳健': 'Steady',
    '途中': 'En route', '待命': 'Standby', '农业': 'Farming', '手工业': 'Crafting', '矿业': 'Mining', '商业': 'Commerce',
    '谷物': 'Grain', '饮品': 'Drinks', '酒类': 'Alcohol', '食品': 'Food', '海产': 'Seafood', '调味品': 'Seasoning',
    '药材': 'Herbs', '金属制品': 'Metalware', '工艺品': 'Handicrafts', '文化用品': 'Cultural Goods',
    '城市': 'City', '通商协议': 'Trade Pact', '联合节庆': 'Joint Festival', '技术工匠': 'Master Artisans', '粮食援助': 'Grain Aid',
    '已购买': 'Purchased', '未购买': 'Not purchased', '已偿还': 'Repaid', '已兑换': 'Exchanged', '已兑回金币': 'Redeemed to gold',
    '空档': 'Empty slot', '保存进度': 'Save Progress', '读取进度': 'Load Progress', '旅栈': 'Inn',
    '雇佣': 'Hire', '剿灭': 'Eliminate', '清剿': 'Sweep', '出资': 'Fund', '董事会': 'Board', '增发': 'Issuance', '收购': 'Takeover',
    '经营复盘': 'Game Recap', '累计收入': 'Total Income', '累计支出': 'Total Expenses',
    '经历随机事件': 'Random events', '签订条约': 'Treaties signed', '单日最高收入': 'Best single-day income',
    '累计贸易额': 'Total trade volume', '商队出发': 'Caravans sent', '建成设施': 'Buildings built',
    '次': ' times', '座': '', '份': '', '股': ' shares', '·日': '/day', '·天': '/day', '每股盈利': 'EPS',
    '总股本': 'Total shares', '持股': 'Holding', '日分红': 'Daily dividend', '方针': 'Policy',
    '路边交易': 'Roadside Deal', '卖出（+约': 'Sell (+~', '不卖，继续赶路': 'Keep moving',
    '价格走势': 'Price Trend', '近30日价格': 'Price Trend (30d)', '最新买入': 'Latest buy', '绿=买入 红=卖出': 'Green=buy Red=sell',
    '共 3 个存档位，自动存档写入当前选中的档位。': '3 save slots; autosave writes to the active slot.',
    '该存档位是空的': 'This slot is empty', '已读取存档 ': 'Loaded slot ', '已存入存档 ': 'Saved to slot ',
    '读取': 'Load', '存入': 'Save', '（空）': ' (empty)',
    '选择未来 15 天的经营方针（每 15 天可调整一次）。': 'Choose the strategy for the next 15 days (adjustable every 15 days).',
    '扩张经营': 'Expansion', '提高分红': 'Higher dividends', '稳健经营': 'Steady management',
    '利润 +15%，分红降至 35%': 'Profit +15%, payout 35%', '利润 -10%，分红升至 70%': 'Profit -10%, payout 70%',
    '维持 50% 分红': 'Keep 50% payout', '决议生效：': 'Policy set: ',
    '需持有至少 51% 才能发起收购': 'Need 51%+ to launch a takeover',
    '需持有至少 30% 才能提议增发': 'Need 30%+ to propose an issuance',
    '需持有至少 10% 才能参与董事会': 'Need 10%+ to join the board',
    '股价随公司真实经营浮动（每股盈利驱动）；持股 ≥10% 可召开董事会定方针，≥30% 可提议增发，≥51% 可溢价收购控股（利润 +30%）。': 'Prices follow real performance (EPS-driven). 10%+ stake: call a board meeting; 30%+: propose an issuance; 51%+: buy out and control (+30% profit).',
    '投资机会（全大陆）': 'Investment Opportunities', '我的持股 · ': 'My Holdings · ', '每股盈利/天': 'EPS/day',
    '商队途经': 'A caravan passing through', '，路边商贩愿以 <b>': ', a roadside trader offers <b>',
    'G</b> 收购车上的 ': 'G</b> for ', '（约 ': ' (~', '，回程结算）。卖不卖？': '; paid on return). Sell?',
    '，有商贩愿高价收购车上的 ': ', a trader offers a premium for ', '路边交易：': 'Roadside deal: ',
    ' 售予 ': ' sold to ', '商贩，得 ': ' trader for ', '（回程结算）。': ' (paid on return).',
    '护卫商队': 'Escort Caravan', '金穗领饥荒': 'Wheatseat Famine', '商会暗斗': 'House Intrigue',
    '抢走了你的采购大单': 'snatched your lord order', '响应你的出售公告': 'responded to your sale ad',
    '抢先完成了领主采购大单': 'completed the lord order first'
    ,
    '竞争商会：': 'Rival Houses: ',
    '三支NPC商会在全大陆真实经商——会套利囤货、抢你的采购大单、响应你的出售公告，还会避开你垄断的商路。': 'Three NPC houses trade for real across the continent - they arbitrage, hoard, race your lord orders, answer your sale ads, and avoid routes you dominate.',
    '新玩法：': 'New features: ',
    '市场页有近30日价格走势图；商队途经城市会偶遇路边高价收购；多步事件链带来小剧情；公司可开董事会、增发、收购控股；存档支持3个档位。': 'Market tab shows 30-day price trends; caravans meet roadside premium buyers; multi-step event chains add stories; companies support board votes, issuance and takeovers; 3 save slots.'
  };

  var KEYS = Object.keys(DICT).sort(function (a, b) { return b.length - a.length; });

  function langNow() { return lang; }

  function setLang(l) {
    lang = (l === 'en') ? 'en' : 'zh';
    try { G.localStorage.setItem(LANG_KEY, lang); } catch (e) { /* ignore */ }
  }

  function tr(text) {
    if (lang === 'zh' || text == null) return text;
    var out = String(text);
    for (var i = 0; i < KEYS.length; i++) {
      var k = KEYS[i];
      if (out.indexOf(k) !== -1) out = out.split(k).join(DICT[k]);
    }
    return out;
  }

  // 遍历 DOM 文本节点与 title 属性进行翻译（真实浏览器可用）
  function localizeDom(root) {
    if (lang === 'zh' || !root || !root.nodeType) return;
    function walk(node) {
      if (!node || !node.nodeType) return;
      if (node.nodeType === 3) {
        node.nodeValue = tr(node.nodeValue);
        return;
      }
      if (node.nodeType === 1) {
        if (node.getAttribute && node.getAttribute('title')) {
          node.setAttribute('title', tr(node.getAttribute('title')));
        }
        if (node.childNodes) {
          for (var i = 0; i < node.childNodes.length; i++) walk(node.childNodes[i]);
        }
      }
    }
    walk(root);
  }

  DL.I18N = {
    lang: langNow,
    setLang: setLang,
    tr: tr,
    localizeDom: localizeDom
  };
})(typeof window !== 'undefined' ? window : globalThis);
