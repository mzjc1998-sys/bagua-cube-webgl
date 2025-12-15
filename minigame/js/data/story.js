/**
 * 示例剧情数据
 *
 * 剧情结构说明：
 * - startNode: 游戏开始的节点ID
 * - nodes: 所有剧情节点
 *
 * 节点属性：
 * - scene: 场景配置（背景、角色、氛围等）
 * - bgm: 背景音乐路径
 * - sfx: 音效路径
 * - dialogues: 对话列表
 * - choices: 选项列表
 * - next: 下一个节点ID
 * - setVariables: 设置游戏变量
 */

const storyData = {
  // 游戏开始节点
  startNode: 'prologue_1',

  // 所有节点
  nodes: {
    // ========== 序章 ==========
    'prologue_1': {
      scene: {
        // 背景图片（留空使用默认渐变背景）
        background: null,
        // 氛围效果: 'snow', 'rain', 'dust', 'firefly'
        atmosphere: 'dust',
        // 叠加渐变（模拟黄昏）
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
      // bgm: 'audio/bgm_prologue.mp3',
      dialogues: [
        { text: '......' },
        { text: '天色渐渐暗了下来。' },
        { text: '我站在这座陌生城市的街头，看着远方逐渐染红的天际线。' },
        { text: '距离黎明，还有二十分钟。' }
      ],
      next: 'prologue_2'
    },

    'prologue_2': {
      dialogues: [
        { text: '手机屏幕亮起，显示着一条未读消息。' },
        { name: '???', text: '「你来了吗？我在老地方等你。」' },
        { text: '老地方......是哪里？' },
        { text: '我努力回想，却发现记忆一片模糊。' }
      ],
      next: 'prologue_choice_1'
    },

    'prologue_choice_1': {
      dialogues: [
        { text: '我决定......' }
      ],
      choices: [
        {
          text: '回复消息，询问具体位置',
          next: 'route_a_1',
          setVariables: { route: 'honest' }
        },
        {
          text: '假装知道，直接出发',
          next: 'route_b_1',
          setVariables: { route: 'pretend' }
        },
        {
          text: '忽略消息，继续观察周围',
          next: 'route_c_1',
          setVariables: { route: 'cautious' }
        }
      ]
    },

    // ========== 路线A：诚实路线 ==========
    'route_a_1': {
      scene: {
        atmosphere: 'firefly'
      },
      dialogues: [
        { text: '我决定坦诚一些。' },
        { name: '我', text: '「抱歉，我好像忘记老地方是哪了。能告诉我吗？」' },
        { text: '发送完消息后，我等待着回复。' },
        { text: '一分钟过去了。' },
        { text: '两分钟过去了。' }
      ],
      next: 'route_a_2'
    },

    'route_a_2': {
      dialogues: [
        { text: '手机再次亮起。' },
        { name: '???', text: '「......你真的忘了吗？」' },
        { name: '???', text: '「算了，没关系。往城北走，穿过那条种满银杏树的街道。」' },
        { name: '???', text: '「你会想起来的。」' },
        { text: '银杏树......' },
        { text: '这个词在我脑海中泛起一丝涟漪，但仍然无法想起什么具体的事。' }
      ],
      next: 'chapter1_start'
    },

    // ========== 路线B：假装路线 ==========
    'route_b_1': {
      scene: {
        atmosphere: 'dust'
      },
      dialogues: [
        { text: '我决定假装自己还记得。' },
        { name: '我', text: '「好，我这就过去。」' },
        { text: '发送完消息后，我开始在这座陌生的城市里漫无目的地走着。' },
        { text: '街道两旁的建筑看起来很眼熟，却又完全陌生。' }
      ],
      next: 'route_b_2'
    },

    'route_b_2': {
      dialogues: [
        { text: '走了一会儿，我停在了一个十字路口。' },
        { text: '左边是一条繁华的商业街，右边是一条安静的小巷。' },
        { text: '直觉告诉我，应该往右边走。' },
        { text: '但我不确定这个直觉是否可靠。' }
      ],
      choices: [
        {
          text: '相信直觉，走右边的小巷',
          next: 'chapter1_start',
          setVariables: { trusted_instinct: true }
        },
        {
          text: '理性选择，走左边的商业街',
          next: 'route_b_3',
          setVariables: { trusted_instinct: false }
        }
      ]
    },

    'route_b_3': {
      dialogues: [
        { text: '我选择了看起来更安全的商业街。' },
        { text: '然而走了没多远，手机又响了。' },
        { name: '???', text: '「你走错了。」' },
        { text: '我惊讶地停下脚步。' },
        { text: '对方怎么会知道？' }
      ],
      next: 'chapter1_start'
    },

    // ========== 路线C：谨慎路线 ==========
    'route_c_1': {
      scene: {
        atmosphere: 'rain'
      },
      dialogues: [
        { text: '我决定先观察一下周围的环境。' },
        { text: '这个城市给我一种奇怪的感觉。' },
        { text: '街上几乎没有行人，商店都紧闭着门窗。' },
        { text: '天空中的云层很低，仿佛随时会下雨。' }
      ],
      next: 'route_c_2'
    },

    'route_c_2': {
      dialogues: [
        { text: '我环顾四周，注意到街角有一面破旧的镜子。' },
        { text: '走近一看，镜子里的倒影......' },
        { text: '不是我。' },
        { text: '镜子里站着的，是另一个完全不同的人。' }
      ],
      next: 'route_c_3'
    },

    'route_c_3': {
      dialogues: [
        { text: '我惊恐地后退了几步。' },
        { text: '再次看向镜子时，里面的倒影已经恢复正常了。' },
        { text: '是我眼花了吗？' },
        { text: '手机再次响起，打断了我的思绪。' },
        { name: '???', text: '「别在意那些。快来吧，时间不多了。」' }
      ],
      next: 'chapter1_start'
    },

    // ========== 第一章开始 ==========
    'chapter1_start': {
      scene: {
        atmosphere: 'firefly',
        overlay: {
          gradient: {
            x1: 0, y1: 0, x2: 0, y2: 1,
            stops: [
              { offset: 0, color: 'rgba(50, 50, 100, 0.3)' },
              { offset: 1, color: 'rgba(20, 20, 40, 0.5)' }
            ]
          },
          alpha: 0.5
        }
      },
      dialogues: [
        { text: '不知不觉间，我已经走到了一条两旁种满银杏树的街道上。' },
        { text: '金黄色的落叶铺满了整条街道。' },
        { text: '尽管天色已经很暗，这些落叶却仿佛在发着微弱的光芒。' },
        { text: '远处，我看到了一个人影正站在街道的尽头。' }
      ],
      next: 'chapter1_2'
    },

    'chapter1_2': {
      dialogues: [
        { text: '随着我的接近，那个身影逐渐清晰起来。' },
        { text: '那是一个与我年龄相仿的年轻人。' },
        { text: '奇怪的是，我明明不认识这个人，却感到一种莫名的熟悉感。' },
        { name: '???', text: '「你终于来了。」' },
        { text: '那人转过身，露出了一个复杂的微笑。' },
        { name: '???', text: '「距离黎明......还有十五分钟。」' }
      ],
      next: 'chapter1_choice'
    },

    'chapter1_choice': {
      dialogues: [
        { name: '???', text: '「你还记得我是谁吗？」' }
      ],
      choices: [
        {
          text: '「我......记得。」（说谎）',
          next: 'chapter1_lie',
          setVariables: { lied_about_memory: true }
        },
        {
          text: '「对不起，我不记得了。」',
          next: 'chapter1_truth',
          setVariables: { lied_about_memory: false }
        },
        {
          text: '「你是谁？为什么约我来这里？」',
          next: 'chapter1_question',
          setVariables: { questioned_stranger: true }
        }
      ]
    },

    // 示例结束节点
    'chapter1_lie': {
      dialogues: [
        { text: '那人看着我，眼神中闪过一丝失望。' },
        { name: '???', text: '「你在说谎。」' },
        { name: '???', text: '「没关系......这很正常。」' },
        { text: '（第一章 · 未完待续......）' }
      ],
      next: 'demo_end'
    },

    'chapter1_truth': {
      dialogues: [
        { text: '那人轻轻叹了口气。' },
        { name: '???', text: '「至少你还愿意诚实。」' },
        { name: '???', text: '「那我重新介绍一下自己吧。」' },
        { text: '（第一章 · 未完待续......）' }
      ],
      next: 'demo_end'
    },

    'chapter1_question': {
      dialogues: [
        { text: '那人露出了意味深长的表情。' },
        { name: '???', text: '「问得好。但现在还不是解释的时候。」' },
        { name: '???', text: '「等黎明到来，你自然就会明白一切。」' },
        { text: '（第一章 · 未完待续......）' }
      ],
      next: 'demo_end'
    },

    // 演示结束
    'demo_end': {
      scene: {
        atmosphere: null,
        overlay: {
          gradient: {
            x1: 0, y1: 0, x2: 0, y2: 1,
            stops: [
              { offset: 0, color: 'rgba(0, 0, 0, 0.8)' },
              { offset: 1, color: 'rgba(0, 0, 0, 0.9)' }
            ]
          },
          alpha: 0.8
        }
      },
      dialogues: [
        { text: '——————————' },
        { text: '感谢试玩！' },
        { text: '这是「黎明前20分钟」风格游戏的基础框架演示。' },
        { text: '你可以在此基础上添加更多的剧情、角色、场景和分支。' },
        { text: '点击屏幕返回标题画面。' }
      ],
      // 无 next，对话结束后需要手动处理
    }
  }
};

export default storyData;
