import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MapComponent } from './map/map.component';
import { MapBoxComponent } from './mapbox/mapbox.component';

@NgModule({
  declarations: [
    MapComponent,
    MapBoxComponent
  ],
  imports: [
    CommonModule
  ],
  exports: [
    MapComponent,
    MapBoxComponent
  ],
})
export class ComponentsModule { }
