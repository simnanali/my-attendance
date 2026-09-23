import { Injectable } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';

@Injectable({
    providedIn: 'root'
})
export class PageTitleService {

    constructor(
        private router: Router,
        private titleService: Title
    ) {
        this.router.events
            .pipe(
                filter(event => event instanceof NavigationEnd)
            )
            .subscribe(() => {
                const route = this.router.routerState.root;

                let currentRoute = route;

                while (currentRoute.firstChild) {
                    currentRoute = currentRoute.firstChild;
                }

                const title = currentRoute.snapshot.data['title'];

                if (title) {
                    this.titleService.setTitle(title);
                }
            });
    }
}
