import { Datasource } from './datasource';
import { ScrollStorage } from './scroll-storage';
import { Adapter } from './adapter';
import { Observable, Subject } from 'rxjs';
import { ItemId, ItemWithHeight, ObjectId, VirtualScrollItem } from './types';

export type AddItemEvent<T> = { item: T; isFirst?: boolean };
export type UpdateEvent<T> = { id: ItemId; data: T };
export type DeleteEvent<T> = { id: ItemId };

export class VirtualScrollAdapter<T extends ObjectId> {
  constructor(
    private datasource: Datasource<T>,
    private adapter: Adapter<T>,
    private storage: ScrollStorage<T>
  ) {}

  #addItem = new Subject<AddItemEvent<T>>();
  #updateItem = new Subject<UpdateEvent<T>>();
  #deleteItem = new Subject<DeleteEvent<T>>();
  #scrollToId = new Subject<ItemId>();

  getData(
    id: ItemId,
    count: number,
    direction: 'forward' | 'backward' = 'forward'
  ): Observable<ItemWithHeight<VirtualScrollItem<T>>[]> {
    return new Observable<ItemWithHeight<VirtualScrollItem<T>>[]>(subscriber => {
      if (this.storage.hasItemsCount(id, count, direction)) {
        const items = this.storage.getFromStorage(id, count, direction);
        subscriber.next(items);
        subscriber.complete();
      } else {
        if (direction === 'forward') {
          this.datasource.settings.get(id, this.datasource.bufferSize).subscribe({
            next: items => {
              this.storage.addItems(items);
              const toReturn = this.storage.getFromStorage(id, count, 'forward');
              subscriber.next(toReturn);
              subscriber.complete();
            },
            error: err => subscriber.error(err)
          });
        } else {
          const availableCount = this.storage.getAvailableCount(id, direction);
          if (availableCount > 0) {
            const items = this.storage.getFromStorage(id, availableCount, direction);
            subscriber.next(items);
            subscriber.complete();
          } else {
            subscriber.next([]);
            subscriber.complete();
          }
        }
      }
    });
  }

  updateItem(event: UpdateEvent<T>) {
    this.#updateItem.next(event);
  }

  addItem(event: AddItemEvent<T>) {
    this.#addItem.next(event);
  }

  deleteItem(event: DeleteEvent<T>) {
    this.#deleteItem.next(event);
  }

  scrollToId(id: ItemId) {
    this.#scrollToId.next(id);
  }

  get addItem$() {
    return this.#addItem.asObservable();
  }

  get updateItem$() {
    return this.#updateItem.asObservable();
  }

  get deleteItem$() {
    return this.#deleteItem.asObservable();
  }

  get scrollToId$() {
    return this.#scrollToId.asObservable();
  }
}
