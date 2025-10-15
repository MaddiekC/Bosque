
export const MENU_CONFIG = [
  {
    title: 'Inicio',
    icon: 'bi bi-house',
    route: '/',
  },
  {
    title: 'Inventario',
    icon: 'bi bi-box-seam',
    submenus: [
      { title: 'Bosque', route: '/bosque', img: '/assets/images/bosque.png', permission: 3 },
      { title: 'SiembraRebrote', route: '/siembra-rebrote', img: '/assets/images/siembraReb.png', permission: 4 },
    ],
  },
  {
    title: 'Contrato',
    icon: '	bi bi-file-earmark-text ',
    route: '/contrato',
    permission: 5,
  },
  {
    title: 'Corte',
    img: '/assets/images/corteWhite.png',
    route: '/corte',
    permission: 6,
  },
  {
    title: 'Raleo',
    img: '/assets/images/rama.png',
    route: '/raleo',
    permission: 6,
  },
  {
    title: 'Reporte',
    icon: 'bi bi-bar-chart-line',
    route: '/reporte',
    permission: 7,
  },
  {
    title: 'Gestión de Usuarios',
    icon: 'bi bi-people',
    submenus: [
      { title: 'Ver usuarios', route: '/usuarios', permission: 8 },
    ]
  },
];
