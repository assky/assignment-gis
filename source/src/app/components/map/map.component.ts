import { Component, OnInit, ViewChild, ElementRef, AfterViewInit, Input, OnChanges, SimpleChanges } from '@angular/core';
import { MapService } from 'src/app/@core/services/map.service';
declare let L;

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss']
})
export class MapComponent implements OnInit, OnChanges, AfterViewInit {

  @ViewChild('map') map: ElementRef;

  @Input('radius') radius: number = 1000;
  @Input('filter') filter: any = {};
  @Input('features') features: any[];
  @Input('featuresRadius') featuresRadius: number = 500;
  @Input('substances') substances: any[];
  @Input('showDensity') showDensity: boolean = false;
  @Input('showParkingsByDensity') showParkingsByDensity: boolean = false;
  
  private MAP: any;
  private mapMarker: any;
  private mapRadius: any;
  private mapPolygonLayer: any;
  private mapMarkerLayer: any;
  private mapHeatmapLayer: any;
  private mapTemperatureLayer: any;
  private mapDensityLayer: any;
  private mapParkingsByDensityLayer: any;

  private zoom: number;
  private position: any;
  private lakes: number[];

  private marker: any;

  constructor(private mapService: MapService) { }

  ngOnInit() {
    this.marker = {
      bar: L.icon.mapkey({ icon:"bar", color:'#725139',background:'#f2c357', size:30 }),
      cafe: L.icon.mapkey({ icon:"bar", color:'#725139',background:'#f2c357', size:30 }),
      fast_food: L.icon.mapkey({ icon:"burger", color:'#725139',background:'#f2c357', size:30 }),
      hotel: L.icon.mapkey({ icon:"hotel", color:'#725139',background:'#f2c357', size:30 }),
      restaurant: L.icon.mapkey({ icon:"restaurant", color:'#725139',background:'#f2c357', size:30 }),
      nightclub: L.icon.mapkey({ icon:"music", color:'#725139',background:'red', size:30 }),
      parking: L.icon.mapkey({ icon:"parking", color:'#7c5436',background:'#f7d588', size:30 }),
      pub: L.icon.mapkey({ icon:"pub", color:'#7c5436',background:'#f7d588', size:30 }),
      beach: L.icon.mapkey({ icon:"beach", color:'#7c5436',background:'#f7d588', size:30 }),
    };

    this.mapMarkerLayer = [];
    this.mapTemperatureLayer = [];
    this.mapParkingsByDensityLayer = [];
  }

  ngOnChanges(changes: SimpleChanges) {
    if (this.position)
      this.renderMarker(this.position);

    if (changes.substances)
      this.reloadSubstances();

    if (changes.features || changes.featuresRadius)
      return this.reloadFeatures();

    if (changes.radius || changes.filter)
      this.reloadLakes();

    if (changes.showDensity)
      this.reloadLakesDensity();

    if (changes.showParkingsByDensity)
      this.reloadParkingsByDensity();
  }

  ngAfterViewInit() {
    this.MAP = L.map(this.map.nativeElement).setView([48.681, 19.699], 8);
    this.zoom = this.MAP.getZoom();

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(this.MAP);

    this.MAP.on('click', this.onMapClick.bind(this));
    this.MAP.on('zoom', this.onMapZoom.bind(this));

    this.reloadLakes();
  }

  private reloadLakes() {
    let filter = {};

    if (this.radius)
      filter['radius'] = this.radius;

    if (this.position)
      filter['coordinates'] = this.position;

    Object.assign(filter, this.filter);

    this.mapService.getLakes({ filter: filter }).subscribe((res) => {
      if (!res.success) 
        return;

      this.lakes = res.data.map(l => l.id);
      this.renderPolygons(res.data);

      this.reloadFeatures();
    });
  }

  private reloadFeatures() {
    this.mapService.getFeatures({ filter: { lakes: this.lakes, features: this.features, radius: this.featuresRadius } }).subscribe((res) => {
      if (res.success)
        this.renderMarkers(res.data);
    });
  }

  private reloadSubstances() {
    this.mapService.getSubstancesData({ filter: { substances: this.substances } }).subscribe((res) => {
      if (res.success)
        this.renderHeatmap(res.data);
    });
  }

  private reloadLakesDensity() {
    if (!this.showDensity)
      return this.renderLakesDensity([]);

    this.mapService.getLakesDensity().subscribe((res) => {
      if (res.success)
        this.renderLakesDensity(res.data);
    });
  }

  private reloadParkingsByDensity() {
    if (!this.showParkingsByDensity)
      return this.renderParkingsByDensity([]);

    this.mapService.getFeaturesByWaterDensity().subscribe((res) => {
      if (res.success)
        this.renderParkingsByDensity(res.data);
    });
  }

  private renderPolygons(data): void {
    let polygons = [];

    if (this.mapPolygonLayer)
      this.MAP.removeLayer(this.mapPolygonLayer);

    for (let i = 0; i < data.length; i++) {
      let lake = data[i];

      polygons.push({
        "type": "Feature",
        "properties": { "party": "Democrat" },
        "geometry": lake.geo
      });
    }

    this.mapPolygonLayer = L.geoJSON(polygons, {
      style: function (feature) {
        return { color: "blue" };
      }
    }).addTo(this.MAP);
  }

  private renderMarkers(data) {
    for (let i = 0; i < this.mapMarkerLayer.length; i++) {
      this.MAP.removeLayer(this.mapMarkerLayer[i]);
    }

    this.mapMarkerLayer = [];

    for (let j = 0; j < data.length; j++) {
      let feature = data[j];
      let coordinates = feature.geo.coordinates;
      let marker;

      if (feature.type in this.marker)
        marker = L.marker([coordinates[1], coordinates[0]], { icon: this.marker[feature.type] }).bindTooltip(feature.name).addTo(this.MAP);
      else
        marker = L.marker([coordinates[1], coordinates[0]]).bindTooltip(feature.name).addTo(this.MAP);

      this.mapMarkerLayer.push(marker);
    }
  }

  private renderHeatmap(data) {
    if (this.mapHeatmapLayer)
      this.MAP.removeLayer(this.mapHeatmapLayer);

    for (let i = 0; i < this.mapTemperatureLayer.length; i++) {
      this.MAP.removeLayer(this.mapTemperatureLayer[i]);
    }

    let heatData = [];

    for (let i = 0; i < data.length; i++) {
      let measurement = data[i];
      let coordinates = measurement.coordinates;

      if (measurement.measurement == 'Temperature') {
        let marker = L.marker([coordinates[1], coordinates[0]], { icon: this.marker.beach }).bindTooltip(parseFloat(measurement.value).toFixed(1) + '°C').addTo(this.MAP);
        this.mapTemperatureLayer.push(marker);

        continue;
      }

      for (let j = 0; j < measurement.value; j+= 0.1) {
        heatData.push([coordinates[1], coordinates[0], 1.0]);
      }
    }

    this.mapHeatmapLayer = L.heatLayer(heatData, { radius: 25 }).addTo(this.MAP);
  }

  private renderLakesDensity(data) {
    if (this.mapDensityLayer)
      this.MAP.removeLayer(this.mapDensityLayer);

    let heatData = [];

    for (let i = 0; i < data.length; i++) {
      let lake = data[i];
      let coordinates = lake.geo.coordinates;
    
      heatData.push([coordinates[1], coordinates[0]]);
    }

    this.mapDensityLayer = L.heatLayer(heatData, { radius: 100 }).addTo(this.MAP);
  }

  private renderParkingsByDensity(data) {
    for (let i = 0; i < this.mapParkingsByDensityLayer.length; i++) {
      this.MAP.removeLayer(this.mapParkingsByDensityLayer[i]);
    }

    this.mapParkingsByDensityLayer = [];

    for (let j = 0; j < data.length; j++) {
      let feature = data[j];
      let coordinates = feature.geo.coordinates;
      let marker = L.marker([coordinates[1], coordinates[0]], { icon: this.marker.parking }).bindTooltip(feature.name).addTo(this.MAP);

      this.mapParkingsByDensityLayer.push(marker);
    }
  }

  private onMapClick(event): void {
    this.position = event.latlng;
    this.renderMarker(this.position);

    this.reloadLakes();
  }

  private onMapZoom(event): void {
    this.zoom = this.MAP.getZoom();
  }

  private renderMarker(coordinates) {
    if (this.mapMarker) {
      this.MAP.removeLayer(this.mapMarker);
      this.MAP.removeLayer(this.mapRadius);
    }

    this.mapMarker = new L.Marker(coordinates);
    this.mapRadius = new L.Circle(coordinates, this.radius);
    this.mapMarker.addTo(this.MAP);
    this.mapRadius.addTo(this.MAP);
  }
}

