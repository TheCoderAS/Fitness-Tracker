import { ChangeDetectorRef, Component, HostListener, inject, OnInit, signal, WritableSignal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { NavbarComponent } from '../../framework/navbar/navbar.component';
import { AuthenticationService } from '../../services/authentication.service';
import { LoaderComponent } from '../../framework/loader/loader.component';
import { LoaderService } from '../../services/loader.service';
import { MessagesComponent } from '../../framework/messages/messages.component';
import { CommonModule, NgClass } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { ModalWindowComponent } from "../../framework/modal-window/modal-window.component";
import { AppService } from '../../services/app.service';
import { MessagesService } from '../../services/messages.service';
import nls from '../../framework/resources/nls/generic';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, MatButtonModule, NavbarComponent, LoaderComponent, MessagesComponent, NgClass, HttpClientModule, ModalWindowComponent, CommonModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  _authService: AuthenticationService = inject(AuthenticationService);
  _loader: LoaderService = inject(LoaderService);
  _appService: AppService = inject(AppService);
  private _message: MessagesService = inject(MessagesService);
  private cdr: ChangeDetectorRef = inject(ChangeDetectorRef);

  isModalOpen: WritableSignal<boolean> = signal(false);
  modalInfo: WritableSignal<string[]> = signal(['', '', '']);
  window: any;
  nls = nls;

  ngOnInit(): void {
    this.window = this._appService.getWindow();
    this.window.document.addEventListener('backbutton', this.onBackButtonPressed.bind(this), false);
  }
  @HostListener('backbutton')
  onBackButtonPressed(event: Event): void {
    event.preventDefault();
    event.stopPropagation();

    const isHomePage = this.window.location.pathname === '/';

    if (isHomePage) {
      this.toggleModal(true);
    } else {
      this._message.warning("Back button is not allowed.")
    }
    this.cdr.detectChanges();
    setTimeout(() => {
      this.cdr.detectChanges();
    }, 3001);
  }
  toggleModal(state: any) {
    this.isModalOpen.set(state);
    if (state) {
      this.modalInfo.set(['close-app', nls.exitApp, 'confirm'])
    }
    this.cdr.detectChanges();
  }
  submitModal(data: any) {
    (navigator as any).app.exitApp();
  }
}
