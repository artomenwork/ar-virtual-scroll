import { Datasource } from './datasource';
import { ScrollStorage } from './scroll-storage';
import { Adapter } from './adapter';
import { Observable, Subject } from 'rxjs';
import { ItemId, ItemWithHeight, ObjectId, ScrollInfo, VirtualScrollItem } from './types';

export type AddItemEvent<T> = { item: T; isFirst?: boolean };
export type UpdateEvent<T> = { id: ItemId; data: T };
export type DeleteEvent<T> = ItemWithHeight<T> & { deletedIndex: number };

export class VirtualScrollAdapter<T extends ObjectId> {
  constructor(
    private datasource: Datasource<T>,
    private adapter: Adapter<T>,
    private storage: ScrollStorage<T>
  ) {}

  #addItem$ = new Subject<AddItemEvent<T>>();
  #updateItem$ = new Subject<UpdateEvent<T>>();
  #deleteItem$ = new Subject<DeleteEvent<T>>();
  #scrollToId$ = new Subject<ItemId>();
  #scrollToBottomForce$ = new Subject<void>();
  #currentScroll$ = new Subject<ScrollInfo>();

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

  getLastItems(count: number) {
    return this.storage.getLastItems(count);
  }

  updateItem(event: UpdateEvent<T>) {
    this.#updateItem$.next(event);
  }

  addItem(event: AddItemEvent<T>) {
    this.#addItem$.next(event);
  }

  deleteItem(event: DeleteEvent<T>) {
    this.#deleteItem$.next(event);
  }

  scrollToId(id: ItemId) {
    this.#scrollToId$.next(id);
  }

  scrollToBottomForce() {
    this.#scrollToBottomForce$.next();
  }

  sendScrollInfo(info: ScrollInfo) {
    this.#currentScroll$.next(info);
  }

  get addItem$() {
    return this.#addItem$.asObservable();
  }

  get updateItem$() {
    return this.#updateItem$.asObservable();
  }

  get deleteItem$() {
    return this.#deleteItem$.asObservable();
  }

  get scrollToId$() {
    return this.#scrollToId$.asObservable();
  }

  get scrollToBottomForce$() {
    return this.#scrollToBottomForce$.asObservable();
  }

  get currentScroll$() {
    return this.#currentScroll$.asObservable();
  }

  destroy() {
    this.#addItem$.complete();
    this.#updateItem$.complete();
    this.#deleteItem$.complete();
    this.#scrollToId$.complete();
    this.#scrollToBottomForce$.complete();
    this.#currentScroll$.complete();
  }
}
