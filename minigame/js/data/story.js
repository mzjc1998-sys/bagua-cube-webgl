/**
 * 冒险剧情数据（无对话模式）
 *
 * 节点属性：
 * - scene: 场景配置（背景、氛围等）
 * - bgm: 背景音乐路径
 * - sfx: 音效路径
 * - choices: 选项列表（核心玩法）
 * - next: 下一个节点ID（无选项时自动跳转）
 * - setVariables: 设置游戏变量
 */

const storyData = {
  // 游戏开始节点
  startNode: 'start',

  // 所有节点
  nodes: {
    // ========== 开始 ==========
    'start': {
      scene: {
        atmosphere: 'dust',
        overlay: {
          gradient: {
            x1: 0, y1: 0, x2: 0, y2: 1,
            stops: [
              { offset: 0, color: 'rgba(255, 100, 50, 0.2)' },
              { offset: 0.5, color: 'rgba(100, 50, 100, 0.15)' },
              { offset: 1, color: 'rgba(20, 20, 50, 0.3)' }
            ]
          },
          alpha: 0.4
        }
      },
      choices: [
        { text: '向北走', next: 'north_path', setVariables: { direction: 'north' } },
        { text: '向南走', next: 'south_path', setVariables: { direction: 'south' } },
        { text: '原地等待', next: 'wait_here', setVariables: { direction: 'wait' } }
      ]
    },

    // ========== 北方路线 ==========
    'north_path': {
      scene: {
        atmosphere: 'firefly',
        overlay: {
          gradient: {
            x1: 0, y1: 0, x2: 0, y2: 1,
            stops: [
              { offset: 0, color: 'rgba(50, 80, 120, 0.3)' },
              { offset: 1, color: 'rgba(20, 40, 60, 0.4)' }
            ]
          },
          alpha: 0.5
        }
      },
      choices: [
        { text: '进入森林', next: 'forest', setVariables: { location: 'forest' } },
        { text: '沿着小路走', next: 'trail', setVariables: { location: 'trail' } },
        { text: '返回', next: 'start' }
      ]
    },

    'forest': {
      scene: { atmosphere: 'firefly' },
      choices: [
        { text: '深入探索', next: 'forest_deep' },
        { text: '采集资源', next: 'forest_gather' },
        { text: '离开森林', next: 'north_path' }
      ]
    },

    'forest_deep': {
      scene: { atmosphere: 'dust' },
      choices: [
        { text: '继续前进', next: 'forest_secret' },
        { text: '返回', next: 'forest' }
      ]
    },

    'forest_secret': {
      scene: { atmosphere: 'firefly' },
      setVariables: { found_secret: true },
      choices: [
        { text: '获取宝藏', next: 'treasure_found' },
        { text: '离开此地', next: 'forest' }
      ]
    },

    'treasure_found': {
      setVariables: { has_treasure: true },
      next: 'ending_good'
    },

    'forest_gather': {
      setVariables: { has_resources: true },
      choices: [
        { text: '继续采集', next: 'forest_gather_more' },
        { text: '返回', next: 'forest' }
      ]
    },

    'forest_gather_more': {
      setVariables: { resources_count: 2 },
      choices: [
        { text: '满载而归', next: 'ending_normal' },
        { text: '深入森林', next: 'forest_deep' }
      ]
    },

    'trail': {
      scene: { atmosphere: 'dust' },
      choices: [
        { text: '跟随足迹', next: 'trail_follow' },
        { text: '离开小路', next: 'north_path' }
      ]
    },

    'trail_follow': {
      choices: [
        { text: '继续追踪', next: 'trail_end' },
        { text: '放弃', next: 'trail' }
      ]
    },

    'trail_end': {
      choices: [
        { text: '查看发现', next: 'ending_mystery' },
        { text: '返回', next: 'start' }
      ]
    },

    // ========== 南方路线 ==========
    'south_path': {
      scene: {
        atmosphere: 'rain',
        overlay: {
          gradient: {
            x1: 0, y1: 0, x2: 0, y2: 1,
            stops: [
              { offset: 0, color: 'rgba(80, 80, 100, 0.3)' },
              { offset: 1, color: 'rgba(40, 40, 60, 0.5)' }
            ]
          },
          alpha: 0.4
        }
      },
      choices: [
        { text: '前往村庄', next: 'village' },
        { text: '探索废墟', next: 'ruins' },
        { text: '返回', next: 'start' }
      ]
    },

    'village': {
      scene: { atmosphere: 'dust' },
      choices: [
        { text: '与村民交谈', next: 'village_talk' },
        { text: '进入商店', next: 'village_shop' },
        { text: '离开村庄', next: 'south_path' }
      ]
    },

    'village_talk': {
      setVariables: { talked_villager: true },
      choices: [
        { text: '询问传说', next: 'village_legend' },
        { text: '告别', next: 'village' }
      ]
    },

    'village_legend': {
      setVariables: { knows_legend: true },
      choices: [
        { text: '前往传说之地', next: 'legend_place' },
        { text: '返回村庄', next: 'village' }
      ]
    },

    'legend_place': {
      scene: { atmosphere: 'firefly' },
      choices: [
        { text: '触碰神器', next: 'ending_legend' },
        { text: '离开', next: 'village' }
      ]
    },

    'village_shop': {
      choices: [
        { text: '购买装备', next: 'shop_buy', setVariables: { has_equipment: true } },
        { text: '离开', next: 'village' }
      ]
    },

    'shop_buy': {
      next: 'village'
    },

    'ruins': {
      scene: { atmosphere: 'dust' },
      choices: [
        { text: '进入地下', next: 'ruins_underground' },
        { text: '搜索地面', next: 'ruins_surface' },
        { text: '离开废墟', next: 'south_path' }
      ]
    },

    'ruins_underground': {
      choices: [
        { text: '继续深入', next: 'ruins_deep' },
        { text: '返回地面', next: 'ruins' }
      ]
    },

    'ruins_deep': {
      choices: [
        { text: '打开石门', next: 'ending_ancient' },
        { text: '撤退', next: 'ruins' }
      ]
    },

    'ruins_surface': {
      setVariables: { found_clue: true },
      choices: [
        { text: '根据线索行动', next: 'ruins_underground' },
        { text: '离开', next: 'ruins' }
      ]
    },

    // ========== 等待路线 ==========
    'wait_here': {
      scene: { atmosphere: 'snow' },
      choices: [
        { text: '继续等待', next: 'wait_longer' },
        { text: '开始行动', next: 'start' }
      ]
    },

    'wait_longer': {
      choices: [
        { text: '接受命运', next: 'ending_fate' },
        { text: '改变主意', next: 'start' }
      ]
    },

    // ========== 结局 ==========
    'ending_good': {
      scene: {
        atmosphere: 'firefly',
        overlay: {
          gradient: {
            x1: 0, y1: 0, x2: 0, y2: 1,
            stops: [
              { offset: 0, color: 'rgba(255, 200, 100, 0.3)' },
              { offset: 1, color: 'rgba(255, 150, 50, 0.2)' }
            ]
          },
          alpha: 0.5
        }
      },
      choices: [
        { text: '【好结局】重新开始', next: 'start' }
      ]
    },

    'ending_normal': {
      scene: { atmosphere: 'dust' },
      choices: [
        { text: '【普通结局】重新开始', next: 'start' }
      ]
    },

    'ending_mystery': {
      scene: { atmosphere: 'firefly' },
      choices: [
        { text: '【神秘结局】重新开始', next: 'start' }
      ]
    },

    'ending_legend': {
      scene: { atmosphere: 'firefly' },
      choices: [
        { text: '【传说结局】重新开始', next: 'start' }
      ]
    },

    'ending_ancient': {
      scene: { atmosphere: 'dust' },
      choices: [
        { text: '【远古结局】重新开始', next: 'start' }
      ]
    },

    'ending_fate': {
      scene: { atmosphere: 'snow' },
      choices: [
        { text: '【命运结局】重新开始', next: 'start' }
      ]
    }
  }
};

export default storyData;
