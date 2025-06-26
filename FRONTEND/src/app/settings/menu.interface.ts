export interface MenuItem {
  title: string;
  icon?: string;
  route?: string;
  roles: number[];
  grupos?: number[];         // 👈 Importante que esté como opcional
  submenus?: MenuItem[];     // 👈 Recursive y tipado correctamente
}
