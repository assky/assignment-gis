import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class MapService {

  private ENDPOINT_URL: string = 'map/'

  constructor(private apiService: ApiService) { }

  public getGeoData(filter?: any): Observable<any> {
    filter = filter || {};
    return this.apiService.request(this.ENDPOINT_URL + 'getGeoData', filter);
  }

  public getLakes(filter?: any): Observable<any> {
    filter = filter || {};
    return this.apiService.request(this.ENDPOINT_URL + 'getLakes', filter);
  }

  public getFeatures(filter?: any): Observable<any> {
    filter = filter || {};
    return this.apiService.request(this.ENDPOINT_URL + 'getFeatures', filter);
  }

  public getSubstancesData(filter?: any): Observable<any> {
    filter = filter || {};
    return this.apiService.request(this.ENDPOINT_URL + 'getSubstancesData', filter);
  }

  public getLakesDensity(): Observable<any> {
    return this.apiService.request(this.ENDPOINT_URL + 'getLakesDensity', {});
  }
}
