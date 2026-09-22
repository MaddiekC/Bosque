export interface MenuItem {
  title: string;
  icon?: string;
  route?: string;
  submenus?: MenuItem[];
  permission?: number | number[];
}
