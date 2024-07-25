import { AfterViewInit, Component, Inject, OnDestroy } from '@angular/core';
import { DOCUMENT } from '@angular/platform-browser';
import { AngularFire, FirebaseListObservable } from 'angularfire2';
import { Observable, Subscription } from 'rxjs';
import 'rxjs/add/operator/throttleTime';
import 'rxjs/add/operator/filter';


@Component({
  selector: 'app-infinite-scroll',
  templateUrl: './infinite-scroll.component.html',
  styleUrls: ['./infinite-scroll.component.css']
})
export class InfiniteScrollComponent implements AfterViewInit, OnDestroy {
  private scrollSubscription: Subscription;
  private capturedKeys: string[] = [];
  private lastKey: string | null = null;
  private itemsList: FirebaseListObservable<Item[]>; // Replace 'Item' with the appropriate type
  private allItems: Item[] = []; // Replace 'Item' with the appropriate type
  private readonly itemKey = 'value';
  private readonly orderBy = 'itemNumber';
  private readonly batchSize = 10;

  constructor(
    private af: AngularFire,
    @Inject(DOCUMENT) private document: any
  ) {}

  ngAfterViewInit() {
    this.loadData();
    this.scrollSubscription = this.listenToScroll();
  }

  ngOnDestroy() {
    if (this.scrollSubscription) {
      this.scrollSubscription.unsubscribe();
    }
  }

  private listenToScroll(): Subscription {
    const scrollThreshold = 160;
    let lastScrollPosition = 0;

    return Observable.fromEvent(this.document, 'scroll')
      .throttleTime(1000)
      .filter(() => {
        const scrollPosition = this.document.documentElement.scrollTop || this.document.body.scrollTop;
        const nextThreshold = lastScrollPosition + scrollThreshold;

        if (scrollPosition >= nextThreshold) {
          lastScrollPosition = nextThreshold;
          return true;
        }
        return false;
      })
      .subscribe(() => {
        this.loadData();
      });
  }

  private loadData(): void {
    let startAfterKey: string | null = null;

    if (this.capturedKeys.length > 0) {
      startAfterKey = this.capturedKeys.shift()!;
    } else if (this.lastKey) {
      startAfterKey = this.lastKey;
    }

    this.itemsList = this.af.database.list(`/itemlists/${this.itemKey}/items`, {
      query: {
        orderByChild: this.orderBy,
        startAfter: startAfterKey
      }
    });

    this.itemsList.valueChanges().subscribe((items: Item[]) => {
      if (items.length > 0) {
        this.allItems = [...this.allItems, ...items];
        this.lastKey = items[items.length - 1].key;
        this.captureKeys(items.map(item => item.key), this.batchSize);
      }
    });
  }

  private captureKeys(keys: string[], batchSize: number): void {
    for (let i = 0; i < keys.length; i += batchSize) {
      const batch = keys.slice(i, i + batchSize);
      this.capturedKeys.push(...batch);
    }

    if (this.capturedKeys.length > batchSize) {
      this.capturedKeys = this.capturedKeys.slice(0, batchSize);
    }
  }
}
