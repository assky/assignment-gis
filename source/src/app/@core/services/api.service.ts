import { environment } from '../../../environments/environment';

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

interface Response {
    success: boolean;
    data?: any;
}

@Injectable()
export class ApiService {

    private API_URL: string = '';

    constructor(private http: HttpClient) {
        this.API_URL = environment.host + '/api';
    }

    request(url, data): Observable<any> {
        return new Observable((observer) => {
            this.http.post<Response>(this.API_URL + '/' + url, data, { observe: 'response' }).subscribe(res => {
                observer.next(res.body);
                observer.complete();
            }, 
            err => {
                observer.error(err);
                observer.complete();
            });
        });
    }
}
