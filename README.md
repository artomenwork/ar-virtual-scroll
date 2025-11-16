[![npm version](https://img.shields.io/npm/v/ar-virtual-scroll.svg)](https://www.npmjs.com/package/ar-virtual-scroll)
[![npm downloads](https://img.shields.io/npm/dm/ar-virtual-scroll.svg)](https://www.npmjs.com/package/ar-virtual-scroll)

# Virtual Scroll (Angular)

[GitHub](https://github.com/artomenwork/ar-virtual-scroll) · [NPM](https://www.npmjs.com/package/ar-virtual-scroll)

## 🚀 Installation

```bash
npm i ar-virtual-scroll
```


## ✨ Features

- Ultra-fast rendering for huge lists (10,000+ items)
- Dynamic item heights (no fixed height required)
- Minimal memory usage — only visible items are rendered
- Simple API, easy integration
- Adapter for programmatic list control (add, update, delete, scroll)
- Works with any Angular project, no dependencies on Angular CDK


Lightweight Angular library for virtual scrolling of large lists.  
Works using two directives:

- `appVirtualScrollContainer` — manages top/bottom placeholders and scroll events.  
- `*appVirtualScroll` — renders only visible elements from a `Datasource`.

Supports **dynamic item heights**. Heights are measured and cached automatically for smooth scrolling and accurate placeholder sizes.

> **Important limitation:**
> Do not use animations that change the size of elements, or elements that can change their size over time. 
> For correct virtual scroll behavior, all item heights must remain stable after initial rendering. 
> Animations or dynamic resizing will break scroll calculations and may cause incorrect rendering.

## 🧪 Demo

Try the live demo here: [StackBlitz Demo](https://stackblitz.com/edit/stackblitz-starters-fvyrz2cl?file=src%2Fmain.html)

## ❓ Why not Angular CDK Virtual Scroll?

- Supports **dynamic item heights** out of the box (CDK requires fixed height)
- No need to calculate or hardcode item sizes
- Adapter API for programmatic control (add, update, delete, scroll)
- Simpler integration, less boilerplate
- Designed for chat, feeds, and any list with variable content

## Quick Start

### 1) Template

The container must include the `appVirtualScrollContainer` directive and proper scrollable styles.

```html
<div class="viewport" arVirtualScrollContainer>
  <div class="messages" *arVirtualScroll="let item in datasource;">
    <div>
      <span>{{ item.id }} - {{ item.text }}</span>
    </div>
  </div>
  <!-- Top and bottom placeholders are managed automatically -->
</div>
```

Recommended styles for the container:

```css
.viewport {
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  overflow-anchor: none;
}

.messages span {
  display: block;
}
```

### 2) Initializing the Datasource

`Datasource<T>` accepts data loading functions and configuration options.  
Use **Observables** instead of `async/await`.

```ts
import { Component } from '@angular/core';
import { Datasource } from 'virtual-scroll';
import { Observable } from 'rxjs';

type Message = { id: number; text: string };

@Component({
  selector: 'app-root',
  standalone: true,
  template: `
    <div class="viewport" appVirtualScrollContainer>
      <div class="messages" *appVirtualScroll="let item in datasource;">
        <div>
          <span>{{ item.id }} - {{ item.text }}</span>
        </div>
      </div>
    </div>
  `
})
export class AppComponent {
  // Example data store
  private data = Array.from({ length: 10000 }, (_, i) => ({
    id: i + 1,
    text: `Item #${i + 1}`
  }));

  // Initialize the datasource
  datasource = new Datasource<Message>({
    // Loads a batch of data AFTER the given id (scrolling down)
    get: (id, count) => {
      const startIndex = this.data.findIndex(x => x.id === id);
      const slice = startIndex >= 0 ? this.data.slice(startIndex + 1, startIndex + 1 + count) : [];
      return new Observable(sub => { sub.next(slice); sub.complete(); });
    },
    // Initial load (usually the last items to start from the bottom)
    initialGet: (count) => {
      const slice = this.data.slice(-count);
      return new Observable(sub => { sub.next(slice); sub.complete(); });
    },
    settings: {
      bufferSize: 50,          // number of items per batch
      heightToLoadMore: 300    // threshold (px) to trigger loading
    }
  });
}
```

### Minimum item requirements

- `id` — unique identifier  
- Any other fields (e.g., `text`)  

> Height is **automatically calculated and cached** for accurate scrolling behavior.

## API (Summary)

- `appVirtualScrollContainer` — applied to the scrollable container.  
- `*appVirtualScroll="let item in datasource;"` — renders visible items dynamically.  
- `Datasource<T>`  
  - `initialGet(count: number): Observable<T[]>` — initial data load.  
  - `get(id: ItemId, count: number): Observable<T[]>` — load items relative to a specific id.  
  - `settings.bufferSize` — page size.  
  - `settings.heightToLoadMore` — distance (in px) from the edge to trigger loading.
  - `settings.addMethod` — defines how items are added to the view. Defaults to `fallback`.
- `datasource.adapter` — provides methods for programmatic list control:
  - `addItem(item: T): boolean` — Adds an item to the list. If the scroll is at the bottom, the item is immediately visible. Otherwise, it will appear when the user scrolls to the bottom.
  - `updateItem(id: string, changes: Partial<T>): boolean` — Updates an item by its ID with the provided changes.
  - `deleteItem(id: string): boolean` — Deletes an item by its ID.
  - `scrollToId(id: string): boolean` — Scrolls to the item with the specified ID.
  - `scrollToBottomForce(): boolean` — Forces the scroll to the bottom of the list.

## 📖 Adapter API

You can access the adapter via `datasource.adapter`. The adapter provides convenient methods to manage the list items programmatically. Each method returns a boolean indicating whether the operation was successful.

### Methods

- **addItem(item: T): boolean**
  - Adds an item to the end of the list. If the scroll is at the very bottom, the new item will appear immediately in the view. If the scroll is not at the bottom, the item will be shown only when the user scrolls to the bottom.
  
  **Parameters:**
  - `item: T` — the item to add (must have a unique id)
  
  **Returns:**
  - `boolean` — true if the item was added, false otherwise

- **addFirstItem(item: T): boolean**
  - Adds an item to the beginning of the list.
  
  **Parameters:**
  - `item: T` — the item to add (must have a unique id)
  
  **Returns:**
  - `boolean` — true if the item was added, false otherwise

- **update(id: ItemId, data: T): boolean**
  - Updates an existing item by its id.
  
  **Parameters:**
  - `id: ItemId` — the id of the item to update
  - `data: T` — the new data for the item
  
  **Returns:**
  - `boolean` — true if the item was found and updated, false otherwise

- **findAndUpdate(findOptions: { find: (item: T) => boolean; data: T }): boolean**
  - Finds an item by a custom predicate and updates it.
  
  **Parameters:**
  - `find: (item: T) => boolean` — function to find the item
  - `data: T` — the new data for the item
  
  **Returns:**
  - `boolean` — true if an item was found and updated, false otherwise

- **delete(id: ItemId): boolean**
  - Deletes an item by its id.
  
  **Parameters:**
  - `id: ItemId` — the id of the item to delete
  
  **Returns:**
  - `boolean` — true if the item was found and deleted, false otherwise

- **scrollToId(id: ItemId): boolean**
  - Scrolls the container to the item with the given id.
  
  **Parameters:**
  - `id: ItemId` — the id of the item to scroll to
  
  **Returns:**
  - `boolean` — true if the item was found and scrolled to, false otherwise

- **scrollToBottomForce(): boolean**
  - Forces the scroll to the bottom of the list.
  
  **Returns:**
  - `boolean` — true if the operation was successful, false otherwise

- **scroll$: Observable<ScrollInfo>**
  - Emits scroll events with detailed information about the current scroll state.
  
  **Returns:**
  - `Observable<ScrollInfo>` — an observable stream of scroll events.

## ⚙️ New Property: `addMethod`

The `addMethod` property controls how items are added to the view. It has two modes:

- **`onlyVisible` (legacy behavior):**
  - Items are added only if they are immediately visible to the user after rendering.
  - If the scroll is not at the bottom, the item will not appear until the user scrolls to the bottom.

- **`fallback` (default):**
  - Items are added regardless of visibility if there is no space to load more items below.
  - If there is space, the `onlyVisible` logic is applied.

### Default Values

If not explicitly set, the following default values are used:

- `bufferSize`: 50
- `heightToLoadMore`: 300
- `addMethod`: `fallback`

These defaults ensure smooth scrolling and efficient rendering.

> **Important:**
> - Avoid animations or dynamic resizing of elements, as they can disrupt virtual scroll calculations.
> - Ensure item heights remain stable after initial rendering.

## Recommendations

- Wrap each rendered element inside a `<div>` for consistent margin and padding rendering.  
- Ensure that items have stable DOM structures — the library automatically measures and caches their heights.  
- **Do not use animations or dynamic content that changes item size after rendering.**  
- Works well for chat UIs, message feeds, and infinite lists.

## 📄 License

MIT
