import {Injectable} from "@angular/core";
import {User} from "../dtos/User";
import {map, Observable, throwError} from "rxjs";
import {HttpClient} from "@angular/common/http";
import {environment} from "../../../environments/environment";
import {catchError} from "rxjs/operators";

@Injectable({
  providedIn: 'root',
})
export class AdminService {

  apiUrl: string = environment.apiUrl

  constructor(private http: HttpClient) {
  }

  public getAllUsers(): Observable<User[]> {

    return this.http.get<User[]>(this.apiUrl + '/admin/users')
      .pipe(
        map(users => users.map(user => new User(
          user.email,
          user.name,
          user.role,
          user.blocked,
          user.id
        ))),
        catchError((error: any) => {
          return throwError(error);
        })
      )
  }

  public getUser(id: number): Observable<User> {

    return this.http.get<User>(this.apiUrl + '/admin/users/' + id)
      .pipe(
        map(user => new User(
          user.email,
          user.name,
          user.role,
          user.blocked,
          user.id
        )),
        catchError((error: any) => {
          return throwError(error);
        })
      )
  }
}