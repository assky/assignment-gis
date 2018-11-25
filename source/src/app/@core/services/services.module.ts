import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from './api.service';
import { MapService } from './map.service';
import { HttpClient, HttpClientModule } from '@angular/common/http';

const serices = [

]

@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    HttpClientModule
  ],
  providers: [
    ApiService,
    MapService
  ]
})
export class ServicesModule { 
  public forRoot(): any[] {
    return 
  }
}
