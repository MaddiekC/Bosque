import { Directive, Input, OnChanges, TemplateRef, ViewContainerRef } from '@angular/core';
import { PermissionService } from './permission.service'; // Ajusta la ruta según tu estructura

@Directive({
  selector: '[hasPermission]',
  standalone: true
})
export class HasPermissionDirective implements OnChanges {
  @Input('hasPermission') code!: number;

  constructor(
    private tpl: TemplateRef<any>,
    private vc: ViewContainerRef,
    private permService: PermissionService
  ) {}

  ngOnChanges() {
    this.vc.clear();
    if (this.permService.has(this.code)) {
      this.vc.createEmbeddedView(this.tpl);
    }
  }
}
