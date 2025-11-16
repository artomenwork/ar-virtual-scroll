import {
  AfterViewInit,
  ChangeDetectorRef,
  Directive,
  ElementRef,
  HostListener,
  inject, OnDestroy,
  Renderer2,
} from '@angular/core';
import { Subject } from 'rxjs';
import { ScrollInfo } from './types';

@Directive({
  selector: '[arVirtualScrollContainer]'
})
export class VirtualScrollContainer implements AfterViewInit, OnDestroy {
  #elementRef = inject(ElementRef<any>);
  #renderer2 = inject(Renderer2);
  #lastScroll = 0;
  #cdr = inject(ChangeDetectorRef);

  #scroll$ = new Subject<ScrollInfo>();

  bottomScroller: any;
  topScroller: any;

  topHeight = 0;
  bottomHeight = 0;

  #viewportHeight = 0;

  constructor() { }

  @HostListener('scroll', ['$event'] )
  onScroll(event: any) {
    const element = this.#elementRef.nativeElement;
    if (this.#lastScroll > element.scrollTop) {
      this.#scroll$.next({
        direction: 'up',
        scrollPercentage: element.scrollTop / (element.scrollHeight - element.clientHeight),
        scrollHeight: (element.scrollHeight - element.clientHeight),
        current: element.scrollTop,
        lastPosition: this.#lastScroll,
        viewportHeight: element.clientHeight,
        topPlaceholderHeight: this.topHeight,
        bottomPlaceholderHeight: this.bottomHeight
      });
    } else {
      this.#scroll$.next({
        direction: 'down',
        scrollPercentage: element.scrollTop / (element.scrollHeight - element.clientHeight),
        scrollHeight: (element.scrollHeight - element.clientHeight),
        current: element.scrollTop,
        lastPosition: this.#lastScroll,
        viewportHeight: element.clientHeight,
        topPlaceholderHeight: this.topHeight,
        bottomPlaceholderHeight: this.bottomHeight
      });
    }
    this.#lastScroll = element.scrollTop;
  }

  #resizeObserver = new ResizeObserver(() => {
    const difference = this.#viewportHeight - this.getViewportHeight();
    this.setScrollPosition(this.#lastScroll + (difference > 0 ? difference : difference + 1));
    this.#viewportHeight = this.getViewportHeight();
  });

  ngAfterViewInit() {
    const topScroller = this.#renderer2.createElement('div');
    this.#renderer2.insertBefore(this.#elementRef.nativeElement, topScroller, this.#elementRef.nativeElement.firstChild);
    const bottomScroller = this.#renderer2.createElement('div');
    this.#renderer2.appendChild(this.#elementRef.nativeElement, bottomScroller);
    this.topScroller = topScroller;
    this.bottomScroller = bottomScroller;

    this.#viewportHeight = this.getViewportHeight();
    this.#resizeObserver.observe(this.#elementRef.nativeElement);
  }

  get scroll$() {
    return this.#scroll$.asObservable();
  }

  get cdr() {
    return this.#cdr;
  }

  get elementRef() {
    return this.#elementRef;
  }

  addHeightToTop(height: number) {
    this.topHeight += height;
    this.#renderer2.setStyle(this.topScroller, 'min-height', `${this.topHeight}px`);
  }

  addHeightToBottom(height: number) {
    this.bottomHeight += height;
    this.bottomScroller.style.minHeight = `${this.bottomHeight}px`;
  }

  minusHeightToTop(height: number) {
    if (this.topHeight - height < 0) {
      this.topHeight = 0;
    } else {
      this.topHeight -= height;
    }
    this.topScroller.style.minHeight = `${this.topHeight}px`;
  }

  minusHeightToBottom(height: number) {
    if (this.bottomHeight - height < 0) {
      this.bottomHeight = 0;
    } else {
      this.bottomHeight -= height;
    }
    this.#renderer2.setStyle(this.bottomScroller, 'min-height', `${this.bottomHeight}px`);
  }

  setScrollPosition(position: number) {
    this.#elementRef.nativeElement.scrollTop = position;
  }

  getScrollPosition() {
    return this.#elementRef.nativeElement.scrollTop as number;
  }

  getScrollHeight() {
    return (this.#elementRef.nativeElement.scrollHeight - this.#elementRef.nativeElement.clientHeight) as number;
  }

  getViewportHeight() {
    return this.#elementRef.nativeElement.clientHeight as number;
  }

  scrollElementToCenter(el: HTMLElement) {
    const containerEl = this.#elementRef.nativeElement as HTMLElement;
    const containerRect = containerEl.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    const currentScrollTop = this.getScrollPosition();
    const elCenter = (elRect.top - containerRect.top) + currentScrollTop + (elRect.height / 2);
    const target = elCenter - (this.getViewportHeight() / 2);
    const maxScroll = this.getScrollHeight();
    const clamped = Math.max(0, Math.min(target, maxScroll));
    this.setScrollPosition(clamped);
  }

  ngOnDestroy() {
    this.#resizeObserver.disconnect();
    this.#scroll$.complete();
  }
}
