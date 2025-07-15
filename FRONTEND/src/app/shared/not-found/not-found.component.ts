
import { Component, AfterViewInit } from '@angular/core';
import { RouterModule } from '@angular/router';

declare var particlesJS: any;

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterModule],
  templateUrl: './not-found.component.html',
  styleUrl: './not-found.component.css'
})

export class NotFoundComponent implements AfterViewInit {

  ngAfterViewInit(): void {
    particlesJS.load('particles-js', 'assets/vendor/particles/particles-custom.json');
  }

}
