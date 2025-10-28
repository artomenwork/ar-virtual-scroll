export type VirtualScrollItem<T> = T & ObjectId;

export type ObjectId = {
  id: ItemId;
}

export type ItemId = number | string;

export type ScrollInfo = {
  current: number;
  lastPosition: number;
  direction: 'up' | 'down';
  viewportHeight: number;
  scrollHeight: number;
  scrollPercentage: number;
  topPlaceholderHeight: number;
  bottomPlaceholderHeight: number;
}

export type ItemWithHeight<T> = {
  item: T;
  height: number;
}
