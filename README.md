# Virtual Scroll (Angular)

Lightweight Angular library for virtual scrolling of large lists.  
Works using two directives:

- `appVirtualScrollContainer` — manages top/bottom placeholders and scroll events.  
- `*appVirtualScroll` — renders only visible elements from a `Datasource`.

Supports **dynamic item heights**. Heights are measured and cached automatically for smooth scrolling and accurate placeholder sizes.

## Quick Start

### 1) Template

The container must include the `appVirtualScrollContainer` directive and proper scrollable styles.

```html
<div class="viewport" appVirtualScrollContainer>
  <div class="messages" *appVirtualScroll="let item in datasource;">
    <div>
      <span>{{ item.id }} - {{ item.text }}</span>
    </div>
  </div>
  <!-- Elements above/below are replaced by placeholders -->
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

## Recommendations

- Wrap each rendered element inside a `<div>` for consistent margin and padding rendering.  
- Ensure that items have stable DOM structures — the library automatically measures and caches their heights.  
- Works well for chat UIs, message feeds, and infinite lists.
