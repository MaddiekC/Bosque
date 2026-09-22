import { Directive, Input, OnInit, OnDestroy, TemplateRef, ViewContainerRef, NgZone, ChangeDetectorRef } from '@angular/core';
import { Subscription } from 'rxjs';
import { PermissionService } from './permission.service';

@Directive({
  selector: '[hasPermission]',
  standalone: true
})
export class HasPermissionDirective implements OnInit, OnDestroy {
  @Input('hasPermission') code!: number | string;
  private sub = new Subscription();

  constructor(
    private tpl: TemplateRef<any>,
    private vc: ViewContainerRef,
    private permService: PermissionService,
    private cd: ChangeDetectorRef,
    private ngZone: NgZone
  ) {
    //console.log('HasPermissionDirective ctor');
  }

  ngOnInit() {
    const codeNum = +this.code;
    //console.log('HasPermissionDirective ngOnInit for code', codeNum);
    this.sub.add(
      this.permService.permissions$.subscribe(perms => {
        this.ngZone.run(() => {
          //console.log('HasPermissionDirective received perms', perms, 'for code', codeNum);
          this.vc.clear();
          if (Array.isArray(perms) && perms.includes(codeNum)) {
            //console.log(' ▶ Creating view for code', codeNum);
            this.vc.createEmbeddedView(this.tpl);
          } else {
            //console.log(' ▶ Not allowed for code', codeNum);
          }
          this.cd.detectChanges();
        });
      })
    );
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
    console.log('HasPermissionDirective destroyed');
  }
}
