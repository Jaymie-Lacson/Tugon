const fs = require("node:fs");
const path = require("node:path");
const shapefile = require("shapefile");
const proj4 = require("proj4");

const srcPrj = 'PROJCS["WGS_1984_UTM_Zone_51N",GEOGCS["GCS_WGS_1984",DATUM["D_WGS_1984",SPHEROID["WGS_1984",6378137.0,298.257223563]],PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433]],PROJECTION["Transverse_Mercator"],PARAMETER["False_Easting",500000.0],PARAMETER["False_Northing",0.0],PARAMETER["Central_Meridian",123.0],PARAMETER["Scale_Factor",0.9996],PARAMETER["Latitude_Of_Origin",0.0],UNIT["Meter",1.0]]';
const dstPrj = "EPSG:4326";

const targetNames = new Set(["Barangay 251", "Barangay 252", "Barangay 256"]);

function transformCoordinates(coordinates) {
  if (!Array.isArray(coordinates)) {
    return coordinates;
  }

  if (coordinates.length >= 2 && typeof coordinates[0] === "number" && typeof coordinates[1] === "number") {
    const [x, y] = coordinates;
    const [lon, lat] = proj4(srcPrj, dstPrj, [x, y]);
    return [Number(lon.toFixed(7)), Number(lat.toFixed(7))];
  }

  return coordinates.map(transformCoordinates);
}

function geometryToWgs84(geometry) {
  return {
    type: geometry.type,
    coordinates: transformCoordinates(geometry.coordinates),
  };
}

function sqlEscape(value) {
  return value.replace(/'/g, "''");
}

async function main() {
  const shpPath = path.resolve(__dirname, "../../barangay-source/PH_Adm4_BgySubMuns.shp.shp");
  const dbfPath = path.resolve(__dirname, "../../barangay-source/PH_Adm4_BgySubMuns.shp.dbf");

  const source = await shapefile.open(shpPath, dbfPath);
  const features = [];

  let row = await source.read();
  while (!row.done) {
    const props = row.value.properties;
    if (targetNames.has(props.adm4_en)) {
      features.push({
        type: "Feature",
        properties: {
          code: props.adm4_en.match(/\d+/)?.[0] ?? "",
          name: props.adm4_en,
          adm4_psgc: String(props.adm4_psgc),
          adm3_psgc: String(props.adm3_psgc),
        },
        geometry: geometryToWgs84(row.value.geometry),
      });
    }

    row = await source.read();
  }

  features.sort((a, b) => a.properties.code.localeCompare(b.properties.code));

  if (features.length !== 3) {
    throw new Error(`Expected 3 barangay features, found ${features.length}.`);
  }

  const outDir = path.resolve(__dirname, "../../barangay-source/output");
  fs.mkdirSync(outDir, { recursive: true });

  const geojson = {
    type: "FeatureCollection",
    name: "Tondo_Barangays_251_252_256",
    features,
  };

  const geojsonPath = path.join(outDir, "tondo-barangays-251-252-256.geojson");
  fs.writeFileSync(geojsonPath, JSON.stringify(geojson, null, 2), "utf8");

  const sqlLines = [
    "-- Generated from NAMRIA/PSA Level 4 shapefile (UTM 51N reprojected to WGS84)",
    "-- Updates official boundaries for Barangays 251, 252, and 256 in Manila",
    "",
  ];

  for (const feature of features) {
    const code = feature.properties.code;
    const name = feature.properties.name;
    const boundaryGeojson = JSON.stringify({
      type: feature.geometry.type,
      coordinates: feature.geometry.coordinates,
    });

    sqlLines.push(
      `UPDATE \"Barangay\"`,
      `SET \"name\"='${sqlEscape(name)}', \"boundaryGeojson\"='${sqlEscape(boundaryGeojson)}', \"updatedAt\"=NOW()`,
      `WHERE \"code\"='${sqlEscape(code)}';`,
      "",
    );
  }

  sqlLines.push(
    "SELECT \"code\", \"name\", (\"boundaryGeojson\" IS NOT NULL) AS has_boundary",
    "FROM \"Barangay\"",
    "WHERE \"code\" IN ('251','252','256')",
    "ORDER BY \"code\";",
    "",
  );

  const sqlPath = path.join(outDir, "update-boundaries-251-252-256.sql");
  fs.writeFileSync(sqlPath, sqlLines.join("\n"), "utf8");

  console.log(`Generated: ${geojsonPath}`);
  console.log(`Generated: ${sqlPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
