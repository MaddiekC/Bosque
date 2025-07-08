
export const MENU_CONFIG = [
  {
    title: 'Inicio',
    icon: 'bi bi-house',
    route: '/',
    roles: [1],
    grupos: [1, 20],
  },
  {
    title: 'Inventario',
    icon: 'bi bi-box-seam',
    roles: [1],
    submenus: [
      { title: 'Bosque', route: '/bosque', roles: [1], grupos: [1, 20] ,img: '/assets/images/bosque.png'},
      { title: 'SiembraRebrote', route: '/siembra-rebrote', roles: [1], grupos: [1, 20], img: '/assets/images/siembraReb.png'},
    ],
  },
  {
    title: 'Contrato',
    icon: '	bi bi-file-earmark-text ',
    route: '/contrato',
    roles: [1]
  },
  {
    title: 'Corte',
    img: '/assets/images/corteWhite.png',
    route: '/corte',
    roles: [1],
    grupos: [1, 20],
  },
  {
    title: 'Reporte',
    icon: 'bi bi-bar-chart-line',
    route: '/reporte',
    roles: [1],
    grupos: [1, 20],
  },
  {
    title: 'Gestión de Usuarios',
    icon: 'bi bi-people',
    roles: [1],
    submenus: [
      { title: 'Ver usuarios', route: '/usuarios', roles: [1], grupos: [1, 20] },
      //{ title: 'Crear usuario', route: '/usuarios/create', roles: [1], grupos: [1, 20] }
    ]
  }
];
