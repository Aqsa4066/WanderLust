const Listing = require("../models/listing.js");
const mbxGeoCoding = require('@mapbox/mapbox-sdk/services/geocoding');
const mapToken = process.env.MAP_TOKEN;
const geocodingClient = mbxGeoCoding({ accessToken: mapToken });

module.exports.index = async (req,res)=>{
    const listings =  await Listing.find({});
    res.render("listings/index.ejs",{listings});
};


module.exports.renderNewForm = async (req,res)=>{
    res.render("listings/new.ejs");
};


module.exports.showListing = async (req,res)=>{
    let {id} = req.params;
    const listing = await Listing.findById(id)
    .populate("owner")
    .populate({path:"reviews",populate:{
        path: "author",
    }});
    if(!listing){
         req.flash("error","Listing you requested for does not exist!");
          return res.redirect("/listings");
    }
    res.render("listings/show.ejs",{listing});

};


module.exports.createListing = async(req,res,next)=>{
    let coordinate = await geocodingClient.forwardGeocode({
        query: req.body.listing.location,
        limit: 1,
    })
    .send()

    let url = req.file.path;
    let filename = req.file.filename;

    const listing = req.body.listing; //JS object
    const newListing = new Listing(listing);

    newListing.owner = req.user._id;
    newListing.image = {url,filename};
    newListing.geometry = coordinate.body.features[0].geometry;

    let savedListing = await newListing.save();
    console.log(savedListing);
    req.flash("Success","New Listing Created!");
    res.redirect("/listings");
};


module.exports.renderEditForm = async (req,res)=>{
    let {id} = req.params;
    const listing = await Listing.findById(id);
    if(!listing){
         req.flash("error","Listing you requested for does not exist!");
         res.redirect("/listings");
    }
    let originalImageUrl = listing.image.url;
    originalImageUrl = originalImageUrl.replace("/upload","/upload/w_250");
    res.render("listings/edit.ejs",{listing,  originalImageUrl});
};

module.exports.updateListing = async(req,res)=>{
    let {id} = req.params;
    let listing = await Listing.findByIdAndUpdate(id,{...req.body.listing});
    if(typeof req.file != "undefined"){
        let url = req.file.path;
    let filename = req.file.filename;

    listing.image = {url,filename};
    await listing.save();
    }
    req.flash("Success","Listing Updated!");
    res.redirect(`/listings/${id}`);
};


module.exports.deleteListing = async (req,res)=>{
    let {id} = req.params;
    await Listing.findByIdAndDelete(id);
    req.flash("Success","Listing Deleted!")
    res.redirect("/listings");
};
