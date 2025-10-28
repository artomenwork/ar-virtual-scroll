import { ItemWithHeight, ObjectId } from './types';
import { Datasource } from './datasource';
import { BehaviorSubject } from 'rxjs';

export class VirtualViewAdapter<T extends ObjectId> {
  #initialItems$= new BehaviorSubject<ItemWithHeight<T>[]>([]);

  constructor(private datasource: Datasource<T>) {}

  initial() {
    this.datasource.settings.initialGet(this.datasource.bufferSize * 3).subscribe({
      next: items => {
        this.datasource.storage.addItems(items.reverse());
        this.#initialItems$.next(this.datasource.storage.items.slice(0, this.datasource.bufferSize * 3));
      },
      error: err => console.error(err),
    });
  }

  get initialItems$() {
    return this.#initialItems$.asObservable();
  }
}
