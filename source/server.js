global.config = require('./config/config');

const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const pg = require('pg');

const app = express();
const config = global.config;

const postgres = new pg.Client({ connectionString: config.postgres.uri });
postgres.connect();
global.postgres = postgres;

// API Routes
const mapRoutes = require('./api/map/map.routes');

// Parsers
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.all('*', function (req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'PUT, GET, POST, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, AccessToken, Target');
    res.header('Access-Control-Expose-Headers', 'Content-Type, AccessToken, Target');
    next();
});

// Register API routes
app.use('/api/map', mapRoutes);

// Express public directories
app.use('/', express.static(path.join(__dirname, 'public')));

//Set Port
app.listen(config.api.port);
console.log('Running on localhost: ' + config.api.port);
