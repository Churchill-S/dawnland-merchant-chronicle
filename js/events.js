/* 随机事件池 */
(function (G) {
  'use strict';
  var DL = G.DL = G.DL || {};

  var POOL = [
    {
      id: 'rainstorm', title: '暴雨减产', icon: '⛈',
      text: '连日的暴雨冲毁了城外农田，本地特产将减产数日，价格上扬。市民们眼巴巴地看着商会。',
      choices: [
        { label: '拨款赈灾（80G）', hint: '稳住民心，避免繁荣度下滑', run: function (state) {
            state.finance.treasury -= 80;
            DL.State.log(state, '拨款赈灾80G，市民感激，繁荣度未受影响。');
            return '赈灾后，市民在酒馆传颂商会之名。';
          } },
        { label: '坐视不理', hint: '繁荣度-4', run: function (state) {
            state.cities[state.homeCityId].prosperity = Math.max(0, state.cities[state.homeCityId].prosperity - 4);
            DL.State.log(state, '未响应赈灾呼吁，繁荣度-4。');
            return '街头有人嘀咕：“商会的马车从不回头看田里的水。”';
          } }
      ]
    },
    {
      id: 'npc_rival', title: '商队竞争', icon: '🐫',
      text: '有情报说，另一支商队正抢先把你打算运往的某城货物押低价格。市场行情会临时波动。',
      choices: [
        { label: '静观其变', hint: '无直接代价', run: function (state) {
            DL.State.log(state, '竞争者商队出现，部分商品价格将临时波动。');
            return '你吩咐伙计盯紧行情，别贸然跟价。';
          } }
      ]
    },
    {
      id: 'wanderer', title: '流浪工匠', icon: '⚒',
      text: '一位背着工具的流浪工匠路过。他声称能给你的马车加装托架，或修补破损货物。',
      choices: [
        { label: '升级马车 +50kg（200G）', hint: '永久提升载重', run: function (state) {
            if (state.finance.treasury < 200) return '金币不足，工匠耸耸肩离开了。';
            state.finance.treasury -= 200;
            state.player.wagonKg += 50;
            DL.State.log(state, '流浪工匠为马车加装托架，载重+50kg。');
            return '工匠拍着车架：“结实得很，够你跑十年的！”';
          } },
        { label: '修补破损货物（100G）', hint: '仓库中货物恢复', run: function (state) {
            if (state.finance.treasury < 100) return '金币不足，工匠耸耸肩离开了。';
            state.finance.treasury -= 100;
            DL.State.log(state, '工匠修补了仓库货物，减少了后续损耗。');
            return '工匠用树脂和麻绳把货箱扎得严严实实。';
          } },
        { label: '婉拒', hint: '什么也不发生', run: function () {
            return '工匠喝了一碗水，继续赶路。';
          } }
      ]
    },
    {
      id: 'lord_order', title: '领主采购大单', icon: '📜',
      text: '邻城领主发布悬赏，急购一批货物，报酬丰厚。接单后需在5天内送达。',
      choices: [
        { label: '接下订单', hint: '按指定城市与货物运送', run: function (state) {
            var others = DL.DATA.CITIES.filter(function (c) {
              return c.id !== state.homeCityId && DL.Caravans.findPath(state, state.homeCityId, c.id);
            });
            if (!others.length) return '没有可通的外城，订单无人可送。';
            var dest = others[Math.floor(Math.random() * others.length)];
            var pool = DL.DATA.GOODS.filter(function (g) {
              return g.origin !== dest.nation && g.id !== 'pony' && g.weight <= 30;
            });
            var good = pool.length ? pool[Math.floor(Math.random() * pool.length)] : DL.DATA.GOODS[0];
            var qty = Math.max(10, Math.min(40, Math.floor(120 / good.weight)));
            var reward = 150 + qty * 2;
            state.quest = { goodId: good.id, qty: qty, destCityId: dest.id, daysLeft: 5, reward: reward };
            DL.State.log(state, '接下采购大单：' + qty + ' ' + good.name + ' 送至 ' + dest.name + '，赏金 ' + reward + 'G（5天）。');
            return '订单接下，5天内送达 ' + dest.name + ' 即可领赏。';
          } },
        { label: '婉拒', hint: '无损失', run: function () {
            return '你让信使回话说商会眼下腾不开手。';
          } }
      ]
    },
    {
      id: 'harvest_news', title: '丰收喜讯', icon: '🌾',
      text: '南边传来风调雨顺的好消息，未来5天本地特产价格将下降，适合囤货。',
      choices: [
        { label: '太好了', hint: '本地特产-20%，持续5天', run: function (state) {
            state.weather.priceCut = { nation: DL.DATA.cityById(state.homeCityId).nation, until: state.day + 5 };
            DL.State.log(state, '丰收喜讯：本地特产价格-20%（5天）。');
            return '粮贩们笑容满面，说今年仓库要装不下了。';
          } }
      ]
    },
    {
      id: 'festival_rush', title: '节日突袭', icon: '🎉',
      text: '邻近节日将近，商人们已经开始抢购相关货品。若你也想分一杯羹，现在正是备货的时候。',
      choices: [
        { label: '留意行情', hint: '节日相关商品将涨价', run: function (state) {
            DL.State.log(state, '节日筹备潮临近，相关商品价格即将上涨。');
            return '集市上飘着彩带，孩子们已经唱起节日歌谣。';
          } }
      ]
    },
    {
      id: 'noble_visit', title: '贵族游客到访', icon: '👑',
      text: '一位出手阔绰的贵族携随从到访本城，旅游收入未来3天翻倍。',
      choices: [
        { label: '好生招待', hint: '旅游收入×2，持续3天', run: function (state) {
            state.weather.nobleUntil = state.day + 3;
            DL.State.log(state, '贵族游客到访，旅游收入翻倍（3天）。');
            return '贵族订下了城里最好的房间，并夸赞市集繁华。';
          } }
      ]
    },
    {
      id: 'tech_breakthrough', title: '技术突破', icon: '💡',
      text: '本地匠人琢磨出了新的工艺诀窍，某类产业得到永久提升。',
      choices: [
        { label: '奖励匠人', hint: '随机产业+5', run: function (state) {
            var types = ['agri', 'craft', 'mining'];
            var t = types[Math.floor(Math.random() * 3)];
            state.city.tech = state.city.tech || {};
            state.city.tech[t] = (state.city.tech[t] || 0) + 5;
            var names = { agri: '农业', craft: '手工业', mining: '矿业' };
            DL.State.log(state, '技术突破：' + names[t] + '产能+5。');
            return '匠人们把新诀窍记进了工坊的羊皮卷里。';
          } }
      ]
    },
    {
      id: 'landslide', title: '道路塌方', icon: '🪨',
      text: '山道塌方，一条商路暂时中断。市政官来询问商会是否出资抢修。',
      choices: [
        { label: '出资抢修（100G）', hint: '3天后恢复通车', run: function (state) {
            if (state.finance.treasury < 100) return '金币不足，只能等自然恢复。';
            state.finance.treasury -= 100;
            var r = DL.DATA.ROUTES[Math.floor(Math.random() * DL.DATA.ROUTES.length)];
            state.routeClosed[r.id] = state.day + 3;
            DL.State.log(state, '出资抢修「' + r.name + '」，预计3天后通车。');
            return '工人们连夜清石，市政官连声道谢。';
          } },
        { label: '等官府处理', hint: '某条路中断5天', run: function (state) {
            var r = DL.DATA.ROUTES[Math.floor(Math.random() * DL.DATA.ROUTES.length)];
            state.routeClosed[r.id] = state.day + 5;
            DL.State.log(state, '「' + r.name + '」因塌方中断5天。');
            return '官府的人手来得有些慢。';
          } }
      ]
    },
    {
      id: 'credit_doubt', title: '信用质疑', icon: '❓',
      text: '坊间传闻商会资金链吃紧，合作伙伴们投来怀疑的目光。',
      choices: [
        { label: '公开账目（60G）', hint: '信用仅-1', run: function (state) {
            if (state.finance.treasury < 60) return '拿不出审计费，传闻继续发酵。';
            state.finance.treasury -= 60;
            state.cities[state.homeCityId].credit = Math.max(0, state.cities[state.homeCityId].credit - 1);
            DL.State.log(state, '公开账目以正视听，信用仅微降。');
            return '账房先生把账簿摊开，围观者渐渐散去。';
          } },
        { label: '不予理会', hint: '信用-4', run: function (state) {
            state.cities[state.homeCityId].credit = Math.max(0, state.cities[state.homeCityId].credit - 4);
            DL.State.log(state, '未澄清传闻，信用-4。');
            return '流言如藤蔓，越传越远。';
          } }
      ]
    },
    {
      id: 'famine', title: '旱涝歉收', icon: '🌧',
      text: '天公不作美，本地农业未来5天减产一半。粮价眼看要涨。',
      choices: [
        { label: '开仓稳市（公共粮仓）', hint: '有粮仓时可稳定粮价', run: function (state) {
            if (DL.City.buildingLevel(state, 'granary') > 0) {
              state.weather.famine = { until: state.day + 5 };
              DL.State.log(state, '旱涝歉收5天，公共粮仓稳定了粮价。');
              return '粮仓的闸门打开，市价纹丝不动，百姓安心。';
            }
            state.weather.famine = { until: state.day + 5 };
            DL.State.log(state, '旱涝歉收5天，农业产出减半。');
            return '没有粮仓可依仗，粮贩子们开始囤积居奇。';
          } },
        { label: '听天由命', hint: '农业产出-50%，5天', run: function (state) {
            state.weather.famine = { until: state.day + 5 };
            DL.State.log(state, '旱涝歉收5天，农业产出减半。');
            return '农人们望着天，希望它早日放晴。';
          } }
      ]
    },
    {
      id: 'trader_wave', title: '外国商人涌入', icon: '⚓',
      text: '一群操着异国口音的商人涌入本城，带来的外国商品价格实惠。',
      choices: [
        { label: '趁机扫货', hint: '外国商品-10%，3天', run: function (state) {
            state.weather.importWave = { until: state.day + 3 };
            DL.State.log(state, '外国商人涌入，外国商品价格-10%（3天）。');
            return '你与其中一位商人谈成了长期供货的口头约定。';
          } }
      ]
    },
    {
      id: 'wandering_caravan', title: '流浪商队投奔', icon: '🏳',
      text: '一支走投无路的流浪商队来到城门口，领头人愿意带着车马并入你的商会。',
      choices: [
        { label: '收编（若未达上限）', hint: '在编商队+1', run: function (state) {
            if (state.fleet.units.length >= DL.Caravans.fleetMax(state)) return '商会商队已满编，只能婉拒。';
            var leader = DL.Caravans.nextRecruit(state);
            if (!leader) return '人手已满，婉拒了。';
            state.fleet.units.push({ id: state.fleet.seq++, leaderId: leader.id, hiredDay: state.day });
            state.fleet.usedRecruits.push(leader.id);
            DL.State.log(state, '收编流浪商队，' + leader.name + ' 加入商会。');
            return leader.name + ' 带着他的车马加入了商会！';
          } },
        { label: '婉拒', hint: '无事发生', run: function () { return '你送给领头人一袋干粮，祝他一路平安。'; } }
      ]
    },
    {
      id: 'caravan_lost', title: '车队失踪', icon: '🧭',
      text: '一场大雨后，你的一支商队迟迟未归，营地只留下翻倒的车辙。',
      choices: [
        { label: '派队搜寻（150G）', hint: '有机会找回，也可能人货两空', run: function (state) {
            var idle = DL.Caravans.idleUnits(state);
            if (!idle.length) return '商会眼下没有空闲人手，只能干着急。';
            if (state.finance.treasury < 150) return '拿不出搜寻费用，只能放弃。';
            state.finance.treasury -= 150;
            if (Math.random() < 0.7) {
              DL.State.log(state, '搜寻队在大河湾找到了迷路的商队，人货无恙。');
              return '人货都找回来了，虚惊一场。';
            }
            var u = idle[0];
            DL.Caravans.destroyUnitById(state, u.id);
            DL.State.log(state, DL.DATA.leaderById(u.leaderId).name + ' 的商队确认遇难，全军覆没。');
            return '噩耗传来，商队再也没有回来。';
          } },
        { label: '放弃搜寻', hint: '损失一支在编商队', run: function (state) {
            var idle = DL.Caravans.idleUnits(state);
            if (idle.length) {
              var u = idle[0];
              DL.Caravans.destroyUnitById(state, u.id);
              DL.State.log(state, DL.DATA.leaderById(u.leaderId).name + ' 的商队失踪，确认损失。');
              return '你注销了这支商队的名册。';
            }
            return '所有商队都在路上，暂时无人可失。';
          } }
      ]
    }
  ];

  // 多步事件链：接单 → 数日后发展 → 结局（世界观剧情）
  var CHAINS = [
    {
      id: 'escort',
      title: '护卫商队',
      icon: '🛡️',
      delay: 4,
      stages: [
        {
          text: '一位神色匆匆的货主拦住你：他想请你的商队顺路护送一车古董到邻城，愿付 300G 酬劳，事成另有重谢。',
          choices: [
            { label: '接下委托', hint: '开启护送任务', effect: 'accept' },
            { label: '婉拒', hint: '无事发生', effect: 'decline' }
          ]
        },
        {
          text: '护送途中一切顺利。货主在目的地等你，除了约定的 300G，他还多塞了一个钱袋：听说你最近常跑商路，这批货款按行价七折让给你。',
          choices: [
            { label: '收下酬劳与货款（+300G）', hint: '300G 入账', effect: 'reward_cash' },
            { label: '只收约定酬劳', hint: '信用 +2', effect: 'reward_rep' }
          ]
        }
      ]
    },
    {
      id: 'famine',
      title: '金穗领饥荒',
      icon: '🌾',
      delay: 8,
      stages: [
        {
          text: '金穗领传来急讯：连月大旱，粮仓见底。领主开出高价——7 天内把 20 单位面粉运到金穗领，赏金 600G。',
          choices: [
            { label: '接下赈粮订单', hint: '接受向金穗领运粮的任务', effect: 'accept' },
            { label: '婉拒', hint: '无事发生', effect: 'decline' }
          ]
        },
        {
          text: '粮队抵达金穗领时，灾民在城门口排成长队。领主如约付清赏金，还递来一封盖着火漆印的信——他愿意与你签订长期粮贸协议。',
          choices: [
            { label: '收下赏金（+600G）', hint: '600G 入账', effect: 'reward_cash' },
            { label: '接受长期协议', hint: '与金穗领签订通商条约（若尚未签订）', effect: 'reward_treaty' }
          ]
        }
      ]
    },
    {
      id: 'rival_plot',
      title: '商会暗斗',
      icon: '⚔️',
      delay: 6,
      stages: [
        {
          text: '酒馆里的醉汉压低声音告诉你：有竞争商会在四处散布你资金链断裂的谣言，明天就会传遍同业圈子。',
          choices: [
            { label: '公开账目澄清（-150G）', hint: '谣言平息，信用无损', effect: 'clear' },
            { label: '反将一军', hint: '把对手的走私传闻捅给官府，对方信用受损，你也有风险', effect: 'retaliate' }
          ]
        },
        {
          text: '风波渐渐平息。你在商会听到议论：这次暗斗让大家都学了一课——「在曦光之地，名声和金币一样重要」。',
          choices: [
            { label: '把教训记在心里', hint: '事件结束', effect: 'end' }
          ]
        }
      ]
    }
  ];

  function chainById(id) {
    for (var i = 0; i < CHAINS.length; i++) if (CHAINS[i].id === id) return CHAINS[i];
    return null;
  }

  function stageEvent(state, chain, stageIdx) {
    var stage = chain.stages[stageIdx];
    return {
      id: 'chain_' + chain.id + '_' + stageIdx,
      chainId: chain.id,
      stageIdx: stageIdx,
      title: chain.title,
      icon: chain.icon,
      text: stage.text,
      choices: stage.choices.map(function (c) {
        return {
          label: c.label,
          hint: c.hint,
          run: function (s) { return applyChainChoice(s, chain.id, c.effect); }
        };
      })
    };
  }

  function chainTick(state) {
    if (!state.eventChains) state.eventChains = {};
    Object.keys(state.eventChains).forEach(function (id) {
      var ch = state.eventChains[id];
      if (!ch || ch.pending || ch.done) return;
      if (state.day < ch.nextDay) return;
      if (state.pendingEvent) return;
      var chain = chainById(id);
      if (!chain) { delete state.eventChains[id]; return; }
      var stage = chain.stages[ch.stage];
      if (!stage) { delete state.eventChains[id]; return; }
      ch.pending = true;
      state.pendingEvent = stageEvent(state, chain, ch.stage);
    });
  }

  function pickOtherCity(state) {
    var others = DL.DATA.CITIES.filter(function (c) {
      return c.id !== state.homeCityId && DL.Caravans.findPath(state, state.homeCityId, c.id);
    });
    if (!others.length) return DL.DATA.CITIES[0];
    return others[Math.floor(Math.random() * others.length)];
  }

  function applyChainChoice(state, chainId, effect) {
    var chain = chainById(chainId);
    if (!chain) return '';
    var ch = state.eventChains[chainId];
    if (!ch) return '';
    ch.data = ch.data || {};
    var res = '';

    if (effect === 'decline') {
      delete state.eventChains[chainId];
      return '你婉拒了这桩生意，对方点点头，转身消失在人群里。';
    }
    if (effect === 'accept') {
      if (chainId === 'escort') {
        var dest = pickOtherCity(state);
        ch.data.destCityId = dest.id;
        ch.data.reward = 300;
        res = '你接下了护送委托，目的地：' + DL.DATA.cityById(dest.id).name + '。';
      } else if (chainId === 'famine') {
        ch.data.goodId = 'flour';
        ch.data.qty = 20;
        ch.data.destCityId = 'wheatseat';
        ch.data.reward = 600;
        if (!state.quest) {
          state.quest = { goodId: 'flour', qty: 20, destCityId: 'wheatseat', daysLeft: 7, reward: 600 };
          res = '接下赈粮订单：7 天内送 20 面粉到金穗领，赏金 600G。';
        } else {
          res = '你已有一笔大单在身，只能口头应下，回头再议。';
        }
      } else if (chainId === 'rival_plot') {
        res = '你决定出手应对这场暗斗。';
      }
    } else if (effect === 'reward_cash') {
      var cash = ch.data.reward || 200;
      state.finance.treasury += cash;
      res = '收到酬劳 ' + cash + 'G。';
    } else if (effect === 'reward_rep') {
      state.cities[state.homeCityId].credit = Math.min(100, state.cities[state.homeCityId].credit + 2);
      res = '货主在商界为你美言，信用 +2。';
    } else if (effect === 'reward_treaty') {
      var targetId = ch.data.destCityId || 'wheatseat';
      if (!DL.Diplo.hasTreaty(state, targetId, 'trade')) {
        DL.Diplo.signTreaty(state, targetId, 'trade');
        res = '与' + DL.DATA.cityById(targetId).name + '签订了通商条约！';
      } else {
        DL.Diplo.changeRelation(state, targetId, 2);
        res = '你们已有通商条约，对方好感 +2。';
      }
    } else if (effect === 'clear') {
      if (state.finance.treasury >= 150) {
        state.finance.treasury -= 150;
        res = '账目公开后谣言平息（-150G）。';
      } else {
        res = '你拿不出足够的公账费用，只能硬着头皮辟谣。';
      }
    } else if (effect === 'retaliate') {
      var houses = state.rivals && state.rivals.houses ? state.rivals.houses : [];
      if (houses.length) {
        var target = houses[Math.floor(Math.random() * houses.length)];
        target.credit = Math.max(0, (target.credit || 50) - 5);
        if (Math.random() < 0.35) {
          state.cities[state.homeCityId].credit = Math.max(0, state.cities[state.homeCityId].credit - 2);
          res = '你捅出了对手的走私旧闻，但官府也注意到了你（本方信用 -2，对手信用 -5）。';
        } else {
          res = '对手的走私传闻传遍商会（' + target.name + ' 信用 -5）。';
        }
      } else {
        res = '谣言自行散去，什么也没发生。';
      }
    } else if (effect === 'end') {
      res = '事件结束。';
    }

    ch.stage = (ch.stage || 0) + 1;
    ch.pending = false;
    if (ch.stage >= chain.stages.length) {
      delete state.eventChains[chainId];
    } else {
      ch.nextDay = state.day + chain.delay;
    }
    if (res) DL.State.log(state, '【' + chain.title + '】' + res);
    return res || '……';
  }

  function roll(state) {
    if (state.pendingEvent) return null;
    if (state.day < state.eventCooldown) return null;
    if (state.ended && !state.sandbox) return null;
    if (Math.random() > 0.12) return null;
    var e = POOL[Math.floor(Math.random() * POOL.length)];
    state.eventCooldown = state.day + 4;
    // 多步事件链：约 1/3 概率启动一条未经历过的链
    state.eventChains = state.eventChains || {};
    state.chainHistory = state.chainHistory || {};
    var inactive = CHAINS.filter(function (c) { return !state.eventChains[c.id] && !state.chainHistory[c.id]; });
    if (inactive.length && Math.random() < 0.35) {
      var chain = inactive[Math.floor(Math.random() * inactive.length)];
      state.eventChains[chain.id] = { stage: 0, nextDay: state.day, pending: true, data: {} };
      state.chainHistory[chain.id] = true;
      return stageEvent(state, chain, 0);
    }
    return e;
  }

  DL.Events = {
    roll: roll,
    chainTick: chainTick,
    applyChainChoice: applyChainChoice,
    POOL: POOL,
    CHAINS: CHAINS
  };
})(typeof window !== 'undefined' ? window : globalThis);
