// src/assets/js/menu-init.ts

export function initSidebarMenu() {
  // Lógica para que funcionen los submenús
  const sidebarDropdowns = document.querySelectorAll('.sidebar-dropdown > a');
  sidebarDropdowns.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();

      // Cierra todos los submenús
      const allDropdowns = document.querySelectorAll('.sidebar-dropdown');
      allDropdowns.forEach(item => item.classList.remove('active'));

      const parent = (e.currentTarget as HTMLElement).parentElement!;
      parent.classList.toggle('active');
    });
  });

}
