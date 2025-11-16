import { ItemId, ItemWithHeight, ObjectId } from './types';

export class ScrollStorage<T extends ObjectId> {
  items: ItemWithHeight<T>[] = [];

  addItems(item: T[]) {
    const existing = new Set(this.items.map(i => i.item.id));
    item.forEach(i => {
      if (!existing.has(i.id)) {
        this.items.push({ item: i, height: 0 });
        existing.add(i.id);
      }
    });
  }

  private findIndex(id: ItemId): number {
    return this.items.findIndex(item => item.item.id === id);
  }

  hasItemsCount(id: ItemId, count: number, direction: 'forward' | 'backward'): boolean {
    const index = this.findIndex(id);
    if (index === -1) return false;
    if (direction === 'forward') {
      return index + 1 + count <= this.items.length;
    } else {
      return index >= count;
    }
  }

  getAvailableCount(id: ItemId, direction: 'forward' | 'backward'): number {
    const index = this.findIndex(id);
    if (index === -1) return 0;
    if (direction === 'forward') {
      return this.items.length - index - 1;
    } else {
      return index;
    }
  }

  getFromStorage(id: ItemId, count: number, direction: 'forward' | 'backward'): ItemWithHeight<T>[] {
    const index = this.findIndex(id);
    if (index === -1) return [];
    if (direction === 'forward') {
      return this.items.slice(index + 1, index + 1 + count);
    } else {
      return this.items.slice(Math.max(0, index - count), index);
    }
  }

  setItemHeight(id: ItemId, height: number) {
    const found = this.items.find(item => item.item.id === id);
    if (found) {
      found.height = height;
    }
  }

  hasItem(id: ItemId): boolean {
    return this.findIndex(id) !== -1;
  }

  getItemsAround(id: ItemId, count: number): ItemWithHeight<T>[] {
    const index = this.findIndex(id);
    if (index === -1) return [];

    const halfCount = Math.floor(count / 2);
    const start = Math.max(0, index - halfCount);
    const end = Math.min(this.items.length, index + halfCount + 1);

    return this.items.slice(start, end);
  }

  getItemsBefore(id: ItemId): ItemWithHeight<T>[] {
    const index = this.findIndex(id);
    if (index === -1) return [];
    return this.items.slice(0, index);
  }

  getItemsAfter(id: ItemId): ItemWithHeight<T>[] {
    const index = this.findIndex(id);
    if (index === -1) return [];
    return this.items.slice(index + 1);
  }

  checkItemsHeightBefore(id: ItemId): boolean {
    const index = this.findIndex(id);
    if (index === -1) return false;
    return this.getItemsBefore(id).every(item => item.height > 0);
  }

  checkItemsHeightAfter(id: ItemId): boolean {
    const index = this.findIndex(id);
    if (index === -1) return false;
    return this.getItemsAfter(id).every(item => item.height > 0);
  }

  getItemsInRange(startId: ItemId, endId: ItemId): ItemWithHeight<T>[] {
    const startIndex = this.findIndex(startId);
    const endIndex = this.findIndex(endId);
    if (startIndex === -1 || endIndex === -1 || startIndex > endIndex) return [];
    return this.items.slice(startIndex, endIndex + 1);
  }

  getLastItems(count: number) {
    return this.items.slice(0, count);
  }
}
