import {
  ChangeDetectorRef,
  Directive,
  EmbeddedViewRef,
  inject,
  Input,
  Renderer2,
  TemplateRef,
  ViewContainerRef
} from '@angular/core';
import { Datasource } from './datasource';
import { ItemId, ObjectId, ScrollInfo } from './types';
import { VirtualScrollContainer } from './virtual-scroll-container';
import { filter, map, of, Subject, switchMap } from 'rxjs';
import { AddItemEvent, DeleteEvent, UpdateEvent } from './virtual-scroll-adapter';

@Directive({
  selector: '[arVirtualScroll]'
})
export class VirtualScroll<T extends ObjectId> {
  #templateRef = inject(TemplateRef<any>);
  #vcr = inject(ViewContainerRef);
  #renderer2 = inject(Renderer2)
  #virtualScrollContainer = inject(VirtualScrollContainer, { host: true });
  #cdr = inject(ChangeDetectorRef);

  #datasource!: Datasource<T>;

  itemsInView: EmbeddedViewRef<any>[] = [];
  loading = false;
  #loadingComplete$ = new Subject<void>();
  #canLoadMoreDown = false;
  #canLoadMoreUp = true;
  #lastRealItemId: ItemId | null = null;
  #firstRealItemId: ItemId | null = null;

  programScroll = false;

  prevCurrentScrollPosition = 0;

  @Input({ required: true }) set appVirtualScrollIn(datasource: Datasource<T>) {
    this.#datasource = datasource;
    this.initial();
  }

  initial() {
    this.initialScrollData();

    this.#virtualScrollContainer.scroll$.pipe(
      filter(() => !this.loading && !this.programScroll && this.itemsInView.length >= this.#datasource.settings.settings!.bufferSize! * 3 - 1),
    ).subscribe(scrollInfo => {
      if (scrollInfo.direction === 'up') {
        this.scrollUp(scrollInfo);
      } else {
        this.scrollDown(scrollInfo);
      }

      this.prevCurrentScrollPosition = scrollInfo.current;
    });

    this.#datasource.virtualScrollAdapter.addItem$.subscribe(event => this.#addItem(event));
    this.#datasource.virtualScrollAdapter.updateItem$.subscribe(event => this.#updateItem(event));
    this.#datasource.virtualScrollAdapter.deleteItem$.subscribe(event => this.#deleteItem(event));
    this.#datasource.virtualScrollAdapter.scrollToId$.subscribe(event => this.#scrollToId(event));
  }

  initialScrollData() {
    this.loading = true;
    this.#canLoadMoreDown = false;

    this.#datasource.virtualViewAdapter.initialItems$.subscribe((items) => {
      this.#vcr.clear();
      items.reverse().forEach(item => {
        this.itemsInView.push(this.#vcr.createEmbeddedView(this.#templateRef, { $implicit: item.item, rawItem: item }));
      });
      this.#cdr.detectChanges();
      this.saveElementsHeight();
      this.setScrollPosition(99999999);

      if (this.itemsInView.length > 0) {
        this.#lastRealItemId = this.itemsInView[this.itemsInView.length - 1].context.$implicit.id;
      }

      this.loading = false;
    });
  }

  scrollUp(scrollInfo: ScrollInfo, addedPrevHeight = 0) {
    if (this.loading && !addedPrevHeight) {
      return;
    }

    const distanceToTop = scrollInfo.current - scrollInfo.topPlaceholderHeight;

    if (distanceToTop < this.#datasource.settings.settings!.heightToLoadMore! + scrollInfo.viewportHeight && this.#canLoadMoreUp) {
      this.loading = true;

      const firstId: ItemId = this.itemsInView[0].context.$implicit.id;
      this.#datasource.virtualScrollAdapter.getData(firstId, this.#datasource.settings.settings!.bufferSize!, 'forward').subscribe((items) => {
        this.#canLoadMoreDown = true;

        if (items.length === 0) {
          this.#canLoadMoreUp = false;
          this.#firstRealItemId = this.itemsInView[0].context.$implicit.id;
          this.loading = false;
          return;
        }

        if (items.length != this.#datasource.settings.settings!.bufferSize) {
          this.#canLoadMoreUp = false;
        }

        const oldPosition = this.#virtualScrollContainer.getScrollPosition();

        items.forEach(item => {
          const itemView = this.#vcr.createEmbeddedView(this.#templateRef, { $implicit: item.item, rawItem: item }, 0);
          this.itemsInView.unshift(itemView);
          itemView.detectChanges();
        });
        this.saveElementsHeight();

        const addHeight = this.itemsInView.slice(0, items.length).reduce((acc, item) => (acc + item.rootNodes[0].offsetHeight), 0);
        const removeHeight = this.removeItems(this.itemsInView.length - items.length, items.length);
        this.#virtualScrollContainer.addHeightToBottom(removeHeight);
        this.#virtualScrollContainer.minusHeightToTop(addHeight);

        if (!scrollInfo.topPlaceholderHeight) {
          this.setScrollPosition(oldPosition + addHeight);
        }

        if (scrollInfo.current < scrollInfo.topPlaceholderHeight - addHeight - addedPrevHeight) {
          this.scrollUp(scrollInfo, addHeight + addedPrevHeight);
        }

        this.loading = false;
      });
    }
  }

  scrollDown(scrollInfo: ScrollInfo, addedPrevHeight = 0) {
    if (this.loading && !addedPrevHeight) {
      return;
    }

    const distanceToBottom = scrollInfo.scrollHeight - scrollInfo.current - scrollInfo.bottomPlaceholderHeight;

    if (distanceToBottom < scrollInfo.viewportHeight + this.#datasource.settings.settings!.heightToLoadMore! && this.#canLoadMoreDown) {
      this.loading = true;

      const lastId: ItemId = this.itemsInView[this.itemsInView.length - 1].context.$implicit.id;
      this.#datasource.virtualScrollAdapter.getData(lastId, this.#datasource.settings.settings!.bufferSize!, 'backward').subscribe((items) => {
        this.#canLoadMoreUp = true;

        if (items.length === 0) {
          this.#canLoadMoreDown = false;
          this.#lastRealItemId = this.itemsInView[this.itemsInView.length - 1].context.$implicit.id;
          this.loading = false;
          return;
        }

        if (items.length != this.#datasource.settings.settings!.bufferSize) {
          this.#canLoadMoreDown = false;
          this.#lastRealItemId = items[items.length - 1].item.id;
        }

        const oldPosition = this.#virtualScrollContainer.getScrollPosition();

        items.reverse().forEach(item => {
          const itemView = this.#vcr.createEmbeddedView(this.#templateRef, { $implicit: item.item, rawItem: item });
          this.itemsInView.push(itemView);
          itemView.detectChanges();
        });
        this.saveElementsHeight();

        const addHeight = this.itemsInView.slice(-items.length).reduce((acc, item) => (acc + item.rootNodes[0].offsetHeight), 0);
        const removeHeight = this.removeItems(0, items.length);
        this.#virtualScrollContainer.minusHeightToBottom(addHeight);
        this.#virtualScrollContainer.addHeightToTop(removeHeight);
        this.setScrollPosition(oldPosition);

        if (scrollInfo.scrollHeight - scrollInfo.current < scrollInfo.bottomPlaceholderHeight - addHeight - addedPrevHeight) {
          this.scrollDown(scrollInfo, addHeight + addedPrevHeight);
        }

        this.loading = false;
      });
    }
  }

  saveElementsHeight() {
    this.itemsInView.forEach(item => {
      this.#datasource.storage.setItemHeight(item.context.$implicit.id, item.rootNodes[0].offsetHeight);
    });
  }

  removeItems(indexStart: number, count = 0) {
    count = count || this.#datasource.settings.settings!.bufferSize!;
    const removedItems = this.itemsInView.splice(indexStart, count);
    const height = removedItems.reduce((acc, item) => acc + item.rootNodes[0].offsetHeight, 0);
    removedItems.forEach(item => item.destroy());
    return height;
  }

  #addItem(event: AddItemEvent<T>) {
    const oldScrollPosition = this.#virtualScrollContainer.getScrollPosition();
    const scrollHeight = this.#virtualScrollContainer.getScrollHeight();

    if (event.isFirst && !this.#canLoadMoreDown) {
      if (scrollHeight - oldScrollPosition === 0 || scrollHeight === 0 || this.itemsInView.length < this.#datasource.settings.settings!.bufferSize! * 3 - 1) {
        const itemView = this.#vcr.createEmbeddedView(this.#templateRef, {
          $implicit: event.item,
          rawItem: {item: event.item, height: 0}
        });
        this.itemsInView.push(itemView);
        itemView.detectChanges();
        this.saveElementsHeight();

        if (this.itemsInView.length > this.#datasource.settings.settings!.bufferSize! * 3) {
          const removeHeight = this.removeItems(0, 1);
          this.#virtualScrollContainer.addHeightToTop(removeHeight);
        }

        if (this.itemsInView.length < this.#datasource.settings.settings!.bufferSize! * 3 && scrollHeight - oldScrollPosition > 10) {
          this.setScrollPosition(oldScrollPosition);
        } else {
          this.setScrollPosition(oldScrollPosition + itemView.rootNodes[0].offsetHeight);
        }

      } else {
        this.#canLoadMoreDown = true;
      }
    } else if (!event.isFirst && !this.#canLoadMoreUp) {
      if (oldScrollPosition === 0) {
        const itemView = this.#vcr.createEmbeddedView(this.#templateRef, {
          $implicit: event.item,
          rawItem: {item: event.item, height: 0}
        }, 0);
        this.itemsInView.unshift(itemView);
        itemView.detectChanges();
        this.saveElementsHeight();
        const removeHeight = this.removeItems(this.itemsInView.length - 1, 1);
        this.#virtualScrollContainer.addHeightToBottom(removeHeight);
        this.setScrollPosition(oldScrollPosition - itemView.rootNodes[0].offsetHeight);
      } else {
        this.#canLoadMoreUp = true;
      }
    }
  }

  #updateItem(event: UpdateEvent<T>) {
    const oldScrollPosition = this.#virtualScrollContainer.getScrollPosition();
    const scrollHeight = this.#virtualScrollContainer.getScrollHeight();

    const item = this.itemsInView.find(i => i.context.$implicit.id === event.id);
    if (item) {
      item.context.$implicit = event.data;
      item.detectChanges();
      this.saveElementsHeight();

      if (scrollHeight - oldScrollPosition === 0) {
        this.setScrollPosition(oldScrollPosition + item.rootNodes[0].offsetHeight);
      }
    }
  }

  #deleteItem(event: DeleteEvent<T>) {
    const item = this.itemsInView.find(i => i.context.$implicit.id === event.id);
    if (item) {
      const itemIndex = this.itemsInView.indexOf(item);

      this.loading = true;

      const firstId: ItemId = this.itemsInView[0].context.$implicit.id;
      this.#datasource.virtualScrollAdapter.getData(firstId, 1, 'forward').pipe(
        switchMap(([item]) => {
          if (item) {
            return of({ item, direction: 'forward' });
          } else {
            const lastId: ItemId = this.itemsInView[this.itemsInView.length - 1].context.$implicit.id;
            return this.#datasource.virtualScrollAdapter.getData(lastId, 1, 'backward').pipe(
              map(([item]) => ({ item, direction: 'backward' }))
            );
          }
        })
      ).subscribe((info) => {
        const oldPosition = this.#virtualScrollContainer.getScrollPosition();

        if (!info.item) {
          this.loading = false;
          return;
        }

        if (info.direction === 'forward') {
          const itemView = this.#vcr.createEmbeddedView(this.#templateRef, { $implicit: info.item.item, rawItem: item }, 0);
          this.itemsInView.unshift(itemView);
          itemView.detectChanges();
          this.saveElementsHeight();

          const addHeight = itemView.rootNodes[0].offsetHeight;
          this.removeItems(itemIndex + 1, 1);
          this.#virtualScrollContainer.minusHeightToTop(addHeight);
          this.setScrollPosition(oldPosition);
        } else {
          const itemView = this.#vcr.createEmbeddedView(this.#templateRef, { $implicit: info.item.item, rawItem: item });
          this.itemsInView.push(itemView);
          itemView.detectChanges();
          this.saveElementsHeight();

          const addHeight = itemView.rootNodes[0].offsetHeight;
          this.removeItems(itemIndex + 1, 1);
          this.#virtualScrollContainer.minusHeightToBottom(addHeight);
          this.setScrollPosition(oldPosition);
        }

        this.loading = false;
      });
    }
  }

  setScrollPosition(position: number) {
    this.programScroll = true;
    this.#virtualScrollContainer.setScrollPosition(position);

    requestAnimationFrame(() => {
      this.programScroll = false;
    });
  }

  #scrollToId(id: ItemId) {
    const index = this.itemsInView.findIndex(i => i.context.$implicit.id === id);
    if (index >= 0) {
      const el = this.itemsInView[index].rootNodes[0] as HTMLElement;
      this.#virtualScrollContainer.scrollElementToCenter(el);
    } else if (this.#datasource.storage.hasItem(id)) {
      const firstVisibleId = this.itemsInView[0]?.context.$implicit.id;
      const lastVisibleId = this.itemsInView[this.itemsInView.length - 1]?.context.$implicit.id;

      if (!firstVisibleId || !lastVisibleId) return;

      const allItems = this.#datasource.storage.items;
      const targetIndex = allItems.findIndex(item => item.item.id === id);
      const firstVisibleIndex = allItems.findIndex(item => item.item.id === firstVisibleId);
      const lastVisibleIndex = allItems.findIndex(item => item.item.id === lastVisibleId);

      if (targetIndex === -1) return;

      let itemsInRange: typeof allItems;

      if (targetIndex < firstVisibleIndex) {
        itemsInRange = allItems.slice(targetIndex, firstVisibleIndex);
      } else if (targetIndex > lastVisibleIndex) {
        itemsInRange = allItems.slice(lastVisibleIndex + 1, targetIndex + 1);
      } else {
        return;
      }

      const allHaveHeight = itemsInRange.every(item => item.height > 0);

      if (!allHaveHeight) {
        return;
      }

      const itemsToLoad = this.#datasource.storage.getItemsAround(id, this.#datasource.settings.settings!.bufferSize! * 3);

      this.#vcr.clear();
      this.itemsInView = [];

      itemsToLoad.forEach(item => {
        this.itemsInView.push(
          this.#vcr.createEmbeddedView(this.#templateRef, {
            $implicit: item.item,
            rawItem: item
          })
        );
      });

      this.#cdr.detectChanges();

      this.saveElementsHeight();

      let itemsBeforeVisible = this.#datasource.storage.getItemsBefore(itemsToLoad[0].item.id);
      let itemsAfterVisible = this.#datasource.storage.getItemsAfter(itemsToLoad[itemsToLoad.length - 1].item.id);

      if (this.#firstRealItemId !== null) {
        const firstRealIndex = this.#datasource.storage.items.findIndex(item => item.item.id === this.#firstRealItemId);
        if (firstRealIndex !== -1) {
          itemsBeforeVisible = itemsBeforeVisible.filter((_, index) => {
            const itemIndex = this.#datasource.storage.items.findIndex(i => i.item.id === _.item.id);
            return itemIndex >= firstRealIndex;
          });
        }
      }

      if (this.#lastRealItemId !== null) {
        const lastRealIndex = this.#datasource.storage.items.findIndex(item => item.item.id === this.#lastRealItemId);
        const lastVisibleIndex = this.#datasource.storage.items.findIndex(item => item.item.id === itemsToLoad[itemsToLoad.length - 1].item.id);

        if (lastRealIndex !== -1 && lastVisibleIndex !== -1) {
          if (lastVisibleIndex >= lastRealIndex) {
            itemsAfterVisible = [];
          } else {
            itemsAfterVisible = itemsAfterVisible.filter(item => {
              const itemIndex = this.#datasource.storage.items.findIndex(i => i.item.id === item.item.id);
              return itemIndex <= lastRealIndex;
            });
          }
        }
      }

      const heightBeforeVisible = itemsBeforeVisible.reduce((sum, item) => sum + item.height, 0);
      const heightAfterVisible = itemsAfterVisible.reduce((sum, item) => sum + item.height, 0);

      const lastItemInStorage = this.#datasource.storage.items[this.#datasource.storage.items.length - 1];
      const firstItemInStorage = this.#datasource.storage.items[0];

      const isLastVisible = lastItemInStorage && itemsToLoad[itemsToLoad.length - 1].item.id === lastItemInStorage.item.id;
      const isFirstVisible = firstItemInStorage && itemsToLoad[0].item.id === firstItemInStorage.item.id;

      const newCanLoadMoreDown = !isLastVisible || (isLastVisible && this.#canLoadMoreDown);
      const newCanLoadMoreUp = !isFirstVisible || (isFirstVisible && this.#canLoadMoreUp);

      const finalBottomHeight = newCanLoadMoreDown ? heightAfterVisible : 0;
      const finalTopHeight = newCanLoadMoreUp ? heightBeforeVisible : 0;

      this.#virtualScrollContainer.topHeight = finalTopHeight;
      this.#virtualScrollContainer.bottomHeight = finalBottomHeight;
      this.#renderer2.setStyle(this.#virtualScrollContainer.topScroller, 'min-height', `${finalTopHeight}px`);
      this.#renderer2.setStyle(this.#virtualScrollContainer.bottomScroller, 'min-height', `${finalBottomHeight}px`);

      this.#canLoadMoreDown = newCanLoadMoreDown;
      this.#canLoadMoreUp = newCanLoadMoreUp;

      this.#cdr.detectChanges();

      const targetViewIndex = this.itemsInView.findIndex(i => i.context.$implicit.id === id);
      if (targetViewIndex >= 0) {
        this.programScroll = true;
        const el = this.itemsInView[targetViewIndex].rootNodes[0] as HTMLElement;
        this.#virtualScrollContainer.scrollElementToCenter(el);

        requestAnimationFrame(() => {
          this.programScroll = false;
        });
      }
    }
  }
}
