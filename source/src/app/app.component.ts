import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {

  public mapRadius: number = 1000;
  public filter: any = { sports: false, fishing: false, quality: false };
  public mapFeatureRadius: number = 500;
  public features: string[] = [];
  public substances: string[] = [];
  public showDensity: boolean;
  public showParkingsByDensity: boolean;

  public onRadiusChange(event) {
    this.mapRadius = event.value * 1000;
  }

  public onOptionSelect(event) {
    let checked = event.checked;
    let value = event.source.value;
   
    this.filter[value] = checked;

    this.filter = Object.assign({}, this.filter);
  }
  
  public onFeatureSelect(event) {
    let checked = event.checked;
    let value = event.source.value;
    let index = this.features.indexOf(value);

    if (!checked && index > -1)
      this.features.splice(index, 1);

    if (checked && index == -1)
      this.features.push(value);

    this.features = [].concat(this.features);
  }

  public onFeatureRadiusChange(event) {
    this.mapFeatureRadius = event.value * 1000;
  }

  public onSubstanceSelect(event) {
    let checked = event.checked;
    let value = event.source.value;
    let index = this.substances.indexOf(value);

    if (!checked && index > -1)
      this.substances.splice(index, 1);

    if (checked && index == -1)
      this.substances.push(value);

    this.substances = [].concat(this.substances);
  }

  public onDensitySelect(event) {
    this.showDensity = event.checked;
  }

  public onParkingsByDensitySelect(event) {
    this.showParkingsByDensity = event.checked;
  }

}
