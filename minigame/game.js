/**
 * 游戏入口文件
 * Minecraft Dungeons 风格地牢探险游戏
 *
 * 特性：
 * - 等轴测2.5D视角
 * - 程序化地牢生成
 * - 动作战斗系统
 * - 多种敌人类型与AI
 * - 物品掉落与装备系统
 */

import DungeonGame from './js/engine/DungeonGame.js';

// 创建并初始化游戏
const game = new DungeonGame();
game.init();

console.log('地牢游戏启动成功！');
