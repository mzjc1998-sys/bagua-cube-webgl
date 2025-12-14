/**
 * 牌组类
 * 管理玩家的卡牌收藏
 */

import { Card, CardData } from './Card';
import { CARDS_DATA } from '../data/CardsData';

/**
 * 牌组类
 */
export class Deck {
  private cards: Card[] = [];

  constructor() {}

  /**
   * 获取所有卡牌
   */
  getCards(): Card[] {
    return [...this.cards];
  }

  /**
   * 获取卡牌数量
   */
  get size(): number {
    return this.cards.length;
  }

  /**
   * 通过ID添加卡牌
   */
  addCard(cardId: string, upgraded: boolean = false): Card | null {
    const cardData = CARDS_DATA[cardId];
    if (!cardData) {
      console.warn(`Unknown card: ${cardId}`);
      return null;
    }

    const card = new Card(cardData);
    if (upgraded) {
      card.upgrade();
    }

    this.cards.push(card);
    return card;
  }

  /**
   * 添加卡牌实例
   */
  addCardInstance(card: Card): void {
    this.cards.push(card);
  }

  /**
   * 移除卡牌（通过UUID）
   */
  removeCard(cardUuid: string): boolean {
    const index = this.cards.findIndex(c => c.uuid === cardUuid);
    if (index > -1) {
      this.cards.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * 获取卡牌（通过UUID）
   */
  getCard(cardUuid: string): Card | undefined {
    return this.cards.find(c => c.uuid === cardUuid);
  }

  /**
   * 升级卡牌
   */
  upgradeCard(cardUuid: string): boolean {
    const card = this.getCard(cardUuid);
    if (card && !card.upgraded) {
      return card.upgrade();
    }
    return false;
  }

  /**
   * 洗牌
   */
  shuffle(): Card[] {
    const shuffled = [...this.cards];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * 按类型统计
   */
  countByType(): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const card of this.cards) {
      counts[card.type] = (counts[card.type] || 0) + 1;
    }
    return counts;
  }

  /**
   * 按稀有度统计
   */
  countByRarity(): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const card of this.cards) {
      counts[card.rarity] = (counts[card.rarity] || 0) + 1;
    }
    return counts;
  }

  /**
   * 清空牌组
   */
  clear(): void {
    this.cards = [];
  }

  /**
   * 复制牌组
   */
  clone(): Deck {
    const newDeck = new Deck();
    for (const card of this.cards) {
      newDeck.addCardInstance(card.clone());
    }
    return newDeck;
  }

  /**
   * 序列化
   */
  serialize(): object {
    return {
      cards: this.cards.map(c => c.serialize())
    };
  }

  /**
   * 反序列化
   */
  static deserialize(data: any): Deck {
    const deck = new Deck();
    if (data.cards) {
      for (const cardData of data.cards) {
        deck.addCard(cardData.id, cardData.upgraded);
      }
    }
    return deck;
  }
}

export default Deck;
