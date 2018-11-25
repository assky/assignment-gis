const postgres = global.postgres;

module.exports.getGeoData = function (req, res) {
    var request = req.body;
    var coordinates = null;
    var radius = 1000;
    var features = null;

    if (request.filter) {
        var reqFilter = request.filter;

        if ('coordinates' in reqFilter)
            coordinates = reqFilter.coordinates;

        if ('radius' in reqFilter)
            radius = reqFilter.radius;

        if ('features' in reqFilter)
            features = reqFilter.features;
    }
    
    var query = `SELECT pol.osm_id as id, pol.name, ST_AsGeoJSON(st_transform(pol.way, 4326)) as json FROM planet_osm_polygon as pol WHERE (pol.natural='water' AND pol.water='lake' and pol.name IS NOT NULL)`;

    if (coordinates) 
        query = `SELECT pol.osm_id as id, pol.name, ST_AsGeoJSON(st_transform(pol.way, 4326)) as json FROM planet_osm_polygon as pol WHERE (pol.natural='water' AND pol.water='lake' and pol.name IS NOT NULL) AND ST_DWithin(ST_Transform(way, 4326), ST_SetSRID(ST_MakePoint(` + coordinates.lng + `, ` + coordinates.lat + `),4326)::geography, ` + radius + `)`;

    if (coordinates && features && features.length > 0) {
        query = `
            SELECT tar.osm_id as id, tar.name, ST_AsGeoJSON(st_transform(tar.way, 4326)) as json, com.amenity as feature_type, com.name as feature_name, ST_AsGeoJSON(ST_Transform(ST_Centroid(com.way), 4326)) as feature_json FROM
                (SELECT * FROM planet_osm_polygon as pol WHERE (pol.natural='water' AND pol.water='lake' and pol.name IS NOT NULL) AND ST_DWithin(ST_Transform(way, 4326), ST_SetSRID(ST_MakePoint(` + coordinates.lng + `, ` + coordinates.lat + `),4326)::geography, ` + radius + `)) as tar
            CROSS JOIN
                (
                    SELECT amenity, name, way FROM planet_osm_polygon WHERE amenity IN (` + features.map(f => "'" + f + "'").join(',') + `)
                    UNION
                    SELECT amenity, name, way FROM planet_osm_point WHERE amenity IN (` + features.map(f => "'" + f + "'").join(',') + `)
                ) as com
            WHERE ST_DWithin(ST_SetSRID(tar.way, 4326), ST_SetSRID(com.way, 4326), 500)`;
    }

    // var query = 'SELECT DISTINCT tar.name, ST_AsGeoJSON(st_transform(tar.way, 4326)) as json FROM';

    // if (coordinates && radius)
    //     query += " (SELECT * FROM planet_osm_polygon as pol WHERE (pol.natural='water' AND pol.water='lake' AND pol.name IS NOT NULL) AND ST_DWithin(ST_Transform(way, 4326), ST_SetSRID(ST_MakePoint(" + coordinates.lng + ", " + coordinates.lat + "),4326)::geography, " + radius + ")) as tar";
    // else
    //     query += " (SELECT * FROM planet_osm_polygon as pol WHERE (pol.natural='water' AND pol.water='lake' AND pol.name IS NOT NULL)) as tar";

    // if (features && features.length > 0)
    //     query += ` CROSS JOIN
    //                     (SELECT * FROM planet_osm_point WHERE amenity IN (` + features.map(f => "'" + f + "'").join(',') + `)) as com
    //                 WHERE ST_Intersects(ST_Buffer(tar.way, 1000)::geometry, com.way::geometry)`;

    postgres.query(query, (err, result) => {
        if (err)
            return res.status(500).json({ success: false, data: err });
        
        var rows = result.rows;
        var response = { lakes: [] };

        if (coordinates && features && features.length > 0) { 
            var lakes = {};
            
            for (var i = 0; i < rows.length; i++) {
                var row = rows[i];
                var name = row['name'];

                if (!(name in lakes))
                    lakes[name] = { id: row['id'], name: row['name'], geo: JSON.parse(row['json']), features: [] };

                lakes[name].features.push({ name: row['feature_name'], type: row['feature_type'], geo: JSON.parse(row['feature_json']) });
            }

            response.lakes = Object.values(lakes);
        }
        else {
            for (var i = 0; i < rows.length; i++) {
                var row = rows[i];
                var name = row['name'];

                response.lakes.push({ id: row['id'], name: row['name'], geo: JSON.parse(row['json']), features: [] });
            }
        }

        // for (var i = 0; i < rows.length; i++) {
        //     var row = rows[i];
        //     data.push({ name: row['name'], json: JSON.parse(row['json']) });
        // }

        res.json({ success: true, data: response });
    });
}

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
            query += " AND pol.water IS NOT NULL AND pol.water IN ('lake', 'reservoir', 'pool', 'pond')";

        if (!filter.sports && !filter.fishing && !filter.quality)
            query += " AND pol.water IS NOT NULL AND pol.water IN ('lake', 'pool', 'pond')";
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
    postgres.query("SELECT ST_AsGeoJSON(st_transform(ST_Centroid(pol.way), 4326)) as geo, ST_Area(st_transform(pol.way, 4326)) as area FROM planet_osm_polygon as pol WHERE pol.natural='water' AND pol.water IS NOT NULL AND pol.water IN ('lake', 'reservoir', 'pool', 'pond')", (err, result) => {
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