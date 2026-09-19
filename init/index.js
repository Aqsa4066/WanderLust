const dns = require("dns");
dns.setServers(["8.8.8.8", "1.1.1.1"]);

const mongoose = require("mongoose");
const initData = require("./data.js");
const Listing = require("../models/listing.js");
const User = require("../models/user.js");

require("dotenv").config();

const mbxGeocoding = require("@mapbox/mapbox-sdk/services/geocoding");
const mapToken = process.env.MAP_TOKEN;

const geocodingClient = mbxGeocoding({ accessToken: mapToken });
const MONGO_URL = process.env.ATLASDB_URL;

async function main() {
    await mongoose.connect(MONGO_URL);
    console.log("Connection Successful");

    await initDB();

    console.log("Data was initialized successfully!");
    await mongoose.connection.close();
}
 
const initDB = async () => {
    await Listing.deleteMany({});

    // 1. Get or create a default user
    let defaultUser = await User.findOne({});
    if (!defaultUser) {
        console.log("No user found. Creating a default admin user...");
        const newUser = new User({
            email: "admin@gmail.com",
            username: "aqsa",
        });
        defaultUser = await User.register(newUser, "admin123");
    }

    // 2. Map geometry and owner to each sample listing
    for (let obj of initData.data) {
        obj.owner = defaultUser._id;

        // Fetch coordinates from Mapbox
        let response = await geocodingClient.forwardGeocode({
            query: `${obj.location}, ${obj.country}`,
            limit: 1
        }).send();

        // Assign GeoJSON geometry object
        if (response.body.features.length) {
            obj.geometry = response.body.features[0].geometry;
        } else {
            // Fallback coordinates if Geocoding API returns empty
            obj.geometry = { type: "Point", coordinates: [77.2090, 28.6139] };
        }
    }

    // 3. Save listings to database
    await Listing.insertMany(initData.data);
};

main().catch((err) => {
    console.log(err);
});