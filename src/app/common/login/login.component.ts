import {Component} from '@angular/core';
import {FormControl, FormGroup, Validators} from "@angular/forms";
import {AuthService} from "../../shared/services/auth.service";
import {TitleService} from "../../shared/services/title.service";
import {faEye, faEyeSlash} from "@fortawesome/free-solid-svg-icons";

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
  public buttonTitle: string = "Pokaż hasło";

  constructor(
    private authService: AuthService,
    private titleService: TitleService,
  ) {
  }

  ngOnInit() {
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

  public save() {
    if (this.validateForm()) {
      this.authService.login(this.formGroup.value).subscribe(result => {
        if (result.success) {
          console.log('success')
          console.log(result.message)
        } else {
          console.log('fail')
          console.log(result.message)
        }
      })
    }
  }

  public passwordShowToggler() {
    this.passwdShown = !this.passwdShown;
    if (!this.passwdShown) {
      this.buttonTitle = 'Pokaż hasło';
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
