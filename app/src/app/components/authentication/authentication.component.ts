import {
  Component,
  OnInit,
  Signal,
  WritableSignal,
  computed,
  inject,
  signal,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { AuthenticationService } from '../../services/authentication.service';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCardModule } from '@angular/material/card';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import nls from '../../framework/resources/nls/authentication';
import { FormFields } from '../../framework/form/form.interfaces';
import { FormComponent } from '../../framework/form/form.component';
import { authFormFields } from './auth.resources';
import { ModalWindowComponent } from "../../framework/modal-window/modal-window.component";

declare var window: any;

@Component({
  selector: 'app-authentication',
  standalone: true,
  imports: [
    MatButtonModule,
    MatFormFieldModule,
    MatCardModule,
    MatInputModule,
    FormsModule,
    CommonModule,
    FormComponent,
    ModalWindowComponent
  ],
  templateUrl: './authentication.component.html',
  styleUrl: './authentication.component.scss',
})
export class AuthenticationComponent {
  authService: AuthenticationService = inject(AuthenticationService);
  nls = nls;

  authType: WritableSignal<string> = signal('login');
  authFields: Signal<FormFields[]> = computed(() => {
    return authFormFields[this.authType()];
  });

  changeAuthType(): void {
    this.authType.update((val) => {
      return val === 'login' ? 'signup' : 'login';
    });
  }

  loginWithUserPass(data: any) {
    this.authService.loginWithUserPass(data);
  }

  signupWithUserPass(data: any) {
    // console.warn(data);
    this.authService.signupWithUserPass(data);
  }

  submit(data: any) {
    if (this.authType() === 'login') {
      this.loginWithUserPass(data);
    } else {
      this.signupWithUserPass(data);
    }
  }
  biometricEnabled(): boolean {
    let isBiometricEnabled = window.localStorage.getItem('isBiometricEnabled');
    if (isBiometricEnabled === 'enabled') {
      return true;
    }
    return false;
  }
}