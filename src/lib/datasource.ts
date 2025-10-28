import { Observable } from 'rxjs';
import { Adapter } from './adapter';
import { ScrollStorage } from './scroll-storage';
import { ItemId, ObjectId } from './types';
import { VirtualScrollAdapter } from './virtual-scroll-adapter';
import { VirtualViewAdapter } from './virtual-view-adapter';

export interface DatasourceSettings<T extends ObjectId> {
  get: (id: ItemId, count: number) => Observable<T[]>;
  initialGet: (count: number) => Observable<T[]>;
  settings?: {
    bufferSize?: number;
    heightToLoadMore?: number;
  }
}

export class Datasource<T extends ObjectId> {
  #adapter = new Adapter<T>(this);
  #storage = new ScrollStorage<T>();
  #virtualScrollAdapter = new VirtualScrollAdapter<T>(this, this.#adapter, this.#storage);
  #settings: DatasourceSettings<T>;
  #virtualViewAdapter = new VirtualViewAdapter<T>(this);

  constructor(settings: DatasourceSettings<T>) {
    if (settings.settings?.bufferSize === undefined) {
      settings.settings = { ...settings.settings, bufferSize: 50 };
    }

    if (settings.settings?.heightToLoadMore === undefined) {
      settings.settings = { ...settings.settings, heightToLoadMore: 300 };
    }

    this.#settings = settings;
    this.#virtualViewAdapter.initial();
  }

  get adapter() {
    return this.#adapter;
  }

  get storage() {
    return this.#storage;
  }

  get settings() {
    return this.#settings;
  }

  get bufferSize() {
    return this.#settings.settings!.bufferSize!;
  }

  get virtualViewAdapter() {
    return this.#virtualViewAdapter;
  }

  get virtualScrollAdapter() {
    return this.#virtualScrollAdapter;
  }
}
