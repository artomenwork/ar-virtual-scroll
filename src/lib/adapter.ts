import { Datasource } from './datasource';
import { ItemId, ObjectId } from './types';

export class Adapter<T extends ObjectId> {
  constructor(private datasource: Datasource<T>) {}

  addItem(item: T) {
    this.datasource.storage.items.push({ item, height: 0 });
    this.datasource.virtualScrollAdapter.addItem({ item });
  }

  addFirstItem(item: T) {
    this.datasource.storage.items.unshift({ item, height: 0 });
    this.datasource.virtualScrollAdapter.addItem({ item, isFirst: true });
  }

  update(id: ItemId, data: T) {
    const found = this.datasource.storage.items.find(i => i.item.id === id);

    if (found) {
      found.item = data;
      found.height = 0;
      this.datasource.virtualScrollAdapter.updateItem({ id, data });
      return true;
    }

    return false;
  }

  findAndUpdate(findOptions: {
    find: (item: T) => boolean;
    data: T;
  }) {
    for (let item of this.datasource.storage.items) {
      const result = findOptions.find.call(null, item.item);

      if (result) {
        item.item = findOptions.data;
        item.height = 0;
        this.datasource.virtualScrollAdapter.updateItem({ id: item.item.id, data: findOptions.data });
        return true;
      }
    }

    return false;
  }

  delete(id: ItemId) {
    const itemIndex = this.datasource.storage.items.findIndex(i => i.item.id === id);

    if (itemIndex === -1) {
      return false;
    }

    const deletedItem = this.datasource.storage.items.splice(itemIndex, 1);
    this.datasource.virtualScrollAdapter.deleteItem({ ...deletedItem[0], deletedIndex: itemIndex });
    return true;
  }

  scrollToId(id: ItemId) {
    if (!this.datasource.storage.items.find(i => i.item.id === id)) {
      return false;
    }
    this.datasource.virtualScrollAdapter.scrollToId(id);
    return true;
  }

  scrollToBottomForce() {
    this.datasource.virtualScrollAdapter.scrollToBottomForce();
  }

  get scroll$() {
    return this.datasource.virtualScrollAdapter.currentScroll$;
  }
}
