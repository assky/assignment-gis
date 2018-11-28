const postgres = global.postgres;

module.exports.getLakes = function (req, res) { 
    var request = req.body;

    var query = "SELECT pol.osm_id as id, pol.name, ST_AsGeoJSON(st_transform(pol.way, 4326)) as geo FROM planet_osm_polygon as pol WHERE pol.natural='water'";

    if (request.filter) {
        var filter = request.filter;

        if ('coordinates' in filter && 'radius' in filter)
            query += ' AND ST_DWithin(ST_Transform(pol.way, 4326), ST_SetSRID(ST_MakePoint(' + filter.coordinates.lng + ', ' + filter.coordinates.lat + '),4326)::geography, ' + filter.radius + ')';

        if ('sports' in filter && filter.sports)
            query += ' AND pol.sport IS NOT NULL';

        if ('fishing' in filter && filter.fishing)
            query += " AND pol.leisure = 'fishing'";

        if ('quality' in filter && filter.quality)
            query += " AND pol.water IS NOT NULL AND pol.water IN ('lake', 'reservoir', 'pool')";

        if (!filter.sports && !filter.fishing && !filter.quality)
            query += " AND pol.water IS NOT NULL AND pol.water IN ('lake', 'reservoir', 'pool')";
    }

    postgres.query(query, (err, result) => {
        if (err)
            return res.status(500).json({ success: false, data: err });
        
        var rows = result.rows;
        var response = [];

        for (var i = 0; i < rows.length; i++) {
            var row = rows[i];
            response.push({ id: row['id'], name: row['name'], geo: JSON.parse(row['geo']) });
        }

        res.json({ success: true, data: response });
    });
}

module.exports.getFeatures = function (req, res) { 
    var request = req.body;
    var ids = [];
    var radius = 500;
    var features = [];

    if (request.filter) {
        var filter = request.filter;

        if ('lakes' in filter)
            ids = filter.lakes;

        if ('features' in filter)
            features = filter.features;

        if ('radius' in filter)
            radius = filter.radius;
    } 

    if (ids.length == 0 || features.length == 0)
        return res.json({ success: true, data: [] });

    var query = `
        SELECT com.osm_id as id, com.amenity as type, com.name as name, ST_AsGeoJSON(ST_Transform(ST_Centroid(com.way), 4326)) as geo FROM 
            (SELECT * FROM planet_osm_polygon as pol WHERE pol.osm_id IN (` + ids.map(f => "'" + f + "'").join(',') + `)) as tar
            CROSS JOIN
            (
                SELECT osm_id, tourism as amenity, name, way FROM planet_osm_polygon WHERE tourism IS NOT NULL AND tourism IN (` + features.map(f => "'" + f + "'").join(',') + `)
                UNION
                SELECT osm_id, amenity, name, way FROM planet_osm_point WHERE amenity IN (` + features.map(f => "'" + f + "'").join(',') + `)
            ) as com
        WHERE ST_DWithin(ST_SetSRID(tar.way, 4326), ST_SetSRID(com.way, 4326), ` + radius + `)`;
    
    postgres.query(query, (err, result) => {
        if (err)
            return res.status(500).json({ success: false, data: err });
        
        var rows = result.rows;
        var response = [];

        for (var i = 0; i < rows.length; i++) {
            var row = rows[i];
            response.push({ id: row['id'], type: row['type'], name: row['name'], geo: JSON.parse(row['geo']) });
        }

        res.json({ success: true, data: response });
    });
}

module.exports.getSubstancesData = function (req, res) {
    var request = req.body;
    var substances = [];

    if (request.filter) {
        var filter = request.filter;

        if ('substances' in filter)
            substances = filter.substances;
    } 

    if (substances.length == 0)
        return res.json({ success: true, data: [] });

    var query = `SELECT sta.lakename, sta.longitude, sta.latitude, sub.determinand_supportive as substance, sub.mean as value FROM stations as sta 
        JOIN substances as sub ON (sta.nationalstationid = sub.nationalstationid)
        WHERE sta.countrycode = 'SK' AND sub.determinand_supportive IN (` + substances.map(f => "'" + f + "'").join(',') + `)`;

    postgres.query(query, (err, result) => {
        if (err)
            return res.status(500).json({ success: false, data: err });
        
        var rows = result.rows;
        var response = [];

        for (var i = 0; i < rows.length; i++) {
            var row = rows[i];

            response.push({ lake: row['lake'], measurement: row['substance'], coordinates: [row['longitude'], row['latitude']], value: row['value'] });
        }

        res.json({ success: true, data: response });
    });
}

module.exports.getLakesDensity = function (req, res) { 
    postgres.query("SELECT ST_AsGeoJSON(st_transform(ST_Centroid(pol.way), 4326)) as geo, ST_Area(st_transform(pol.way, 4326)) as area FROM planet_osm_polygon as pol WHERE pol.natural='water'", (err, result) => {
        if (err)
            return res.status(500).json({ success: false, data: err });
        
        var rows = result.rows;
        var response = [];

        for (var i = 0; i < rows.length; i++) {
            var row = rows[i];
            response.push({ area: row['area'], geo: JSON.parse(row['geo']) });
        }

        res.json({ success: true, data: response });
    });
}

module.exports.getFeaturesByWaterDensity = function (req, res) { 
    var query = `
    SELECT par.osm_id as id, par.name, ST_AsGeoJSON(ST_Transform(par.way, 4326)) as geo FROM
        (SELECT * FROM planet_osm_point as poi WHERE poi.amenity='parking') as par
        CROSS JOIN
        (SELECT * FROM 
	        (SELECT ST_MinimumBoundingCircle(unnest(ST_ClusterWithin(pol.way, 10000))) as bounding FROM planet_osm_polygon as pol WHERE pol.natural='water' AND pol.water IN ('lake', 'reservoir', 'pond')) as bou
         ORDER BY ST_Area(bou.bounding) DESC LIMIT 2
         ) as reg		
    WHERE ST_Contains(reg.bounding, par.way)`;

    postgres.query(query, (err, result) => {
        if (err)
            return res.status(500).json({ success: false, data: err });
        
        var rows = result.rows;
        var response = [];

        for (var i = 0; i < rows.length; i++) {
            var row = rows[i];
            response.push({ area: row['area'], geo: JSON.parse(row['geo']) });
        }

        res.json({ success: true, data: response });
    });
}