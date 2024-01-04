import {Component} from '@angular/core';
import {FormControl, FormGroup, Validators} from "@angular/forms";
import {AuthService} from "../../shared/services/auth.service";
import {TitleService} from "../../shared/services/title.service";
import {faEye, faEyeSlash} from "@fortawesome/free-solid-svg-icons";
import {AlertService} from "../alerts/service/alert.service";
import {Router} from "@angular/router";
import {LoginDto} from "../../shared/dtos/LoginDto";
import {PreloaderService} from "../../shared/services/preloader.service";

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  public formGroup!: FormGroup;
  public eye = faEye;
  public eyeSlash = faEyeSlash;
  public passwdShown: boolean = false;
  public buttonTitle: string = "Odkryj hasło";
  private token: string | null = '';

  constructor(
    private authService: AuthService,
    private titleService: TitleService,
    private alertService: AlertService,
    private router: Router,
    private preloader: PreloaderService,
  ) {
    this.token = this.authService.token;
  }

  ngOnInit() {
    this.token = this.authService.token;
    if (this.authService.isTokenExpired(this.token)) {
      this.authService.removeToken();
    } else {
      if (this.authService.getUserId()) {
        this.router.navigate(['users/' + this.authService.getUserId() + '/appointments']);
      }
    }

    document.getElementById('focusReset')?.focus();
    this.titleService.setTitle('Panel logowania');
    this.initFormGroup();
  }

  private initFormGroup() {
    this.formGroup = new FormGroup({
      login: new FormControl('', [Validators.required]),
      password: new FormControl('', [Validators.required]),
    })
  }

  public validateForm() {
    let noErrors: boolean = true;

    Object.keys(this.formGroup.controls).forEach(key => {
      if (this.formGroup.get(key)?.invalid) {
        this.formGroup.get(key)?.markAsTouched();
        noErrors = false;
      }
    })

    return noErrors;
  }

  public loginSubmit() {
    if (this.validateForm()) {
      let formGroupValue = this.formGroup.value;
      let user = new LoginDto(formGroupValue.login, formGroupValue.password, '');

      this.preloader.show();
      this.authService.login(user).subscribe(result => {
        if (result.token) {
          this.preloader.hide();
          this.authService.saveAuthData(result.token, result.userId, result.name, btoa(result.role));

          if (this.authService.url) {
            this.preloader.hide();
            this.router.navigate([this.authService.url]);
            this.authService.removeURL();

          } else {
            this.preloader.hide();
            this.router.navigate(['/users/'+ result.userId +'/appointments']);
          }

        } else {
          this.preloader.hide();
          this.alertService.showError('Wystąpił błąd, spróbuj ponownie.');
        }
      })

    } else {
      this.alertService.showError('Uzupełnij wymagane pola.');
    }
  }

  public passwordShowToggler() {
    this.passwdShown = !this.passwdShown;
    if (!this.passwdShown) {
      this.buttonTitle = 'Odkryj hasło';
    } else {
      this.buttonTitle = 'Ukryj hasło';
    }
  }

  get login() {
    return this.formGroup.get('login')!;
  }

  get password() {
    return this.formGroup.get('password')!;
  }
}
