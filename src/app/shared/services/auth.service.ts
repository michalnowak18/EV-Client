import {Injectable} from '@angular/core';
import {HttpClient} from "@angular/common/http";
import {Observable, throwError} from "rxjs";
import {catchError} from "rxjs/operators";
import {AlertService} from "../../common/alerts/service/alert.service";
import {User} from "../dtos/User";
import {AuthDto} from "../dtos/AuthDto";
import {Router} from "@angular/router";
import {LoginDto} from "../dtos/LoginDto";
import {AdminService} from "./admin.service";

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  public token: string | null;
  public url: string | null;
  private userId: string | null;
  public userName: string | null = null;

  constructor(
    private http: HttpClient,
    private alertService: AlertService,
    private adminService: AdminService,
  ) {
    this.token = localStorage.getItem('token');
    this.url = localStorage.getItem('token_url');
    this.userId = localStorage.getItem('userId');
  }

  register(user: User): Observable<AuthDto> {
    this.userName = user.name;
    return this.http.post<AuthDto>('http://localhost:8080/auth/register', user)
      .pipe(
        catchError((error: any) => {
          this.alertService.showError('Wystąpił błąd, spróbuj ponownie.');
          return throwError(error);
        })
      )
  }

  login(user: LoginDto): Observable<AuthDto> {
    return this.http.post<AuthDto>('http://localhost:8080/auth/login', user)
      .pipe(
        catchError((error: any) => {
          if (error.status === 403) {
            this.alertService.showError('Błędne dane logowania.');
            return throwError(error);
          }
          this.alertService.showError('Wystąpił błąd, spróbuj ponownie.');
          return throwError(error);
        })
      )
  }

  resetPassword(userId: number): Observable<AuthDto> {
    return this.http.patch<AuthDto>('http://localhost:8080/admin/users/' + userId + '/resetPassword', null)
      .pipe(
        catchError((error: any) => {
          if (error.status === 403) {
            this.alertService.showError('Podany login nie istnieje.');
            return throwError(error);
          }
          this.alertService.showError('Wystąpił błąd, spróbuj ponownie.');
          return throwError(error);
        })
      )
  }

  isLoggedIn(): boolean {
    return !!this.token;
  }

  saveAuthData(token: string, userId: string) {
    this.token = token;
    this.userId = userId;
    localStorage.setItem('token', token);
    localStorage.setItem('userId', userId);
  }

  saveURL(router: Router) {
    if (!this.isLoggedIn()) {
      this.url = router.url;
      localStorage.setItem('token_url', router.url);
      router.navigate(['/login']);
    }
  }

  removeURL() {
    this.url = null;
    localStorage.removeItem('token_url');
  }

  removeToken() {
    this.token = null;
    this.userId = null;
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
  }

  getUserId() {
    return this.userId;
  }

  // getUserName() {
  //   this.adminService.getUser(Number(this.userId)).subscribe(user => {
  //     this.userName = user.name
  //   });
  // }


  isTokenExpired(token: string | null): boolean {
    if (token) {
      const tokenParts = token.split('.');
      if (tokenParts.length !== 3) {
        return true;
      }

      const payload = JSON.parse(atob(tokenParts[1]));

      if (payload.exp === undefined) {
        return false;
      }

      const now = Math.floor(Date.now() / 1000);

      return payload.exp < now;
    }

    return true;
  }
}
