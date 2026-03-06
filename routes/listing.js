const express=require("express");
const router=express.Router();
const  wrapAsync=require("../utils/wrapAsync.js");
const ExpressError=require("../utils/ExpressError.js");
const {listingSchema}=require("../schema.js")
const Listing = require("../models/listing.js");
const multer = require('multer');
const {storage}=require("../cloudConfig..js")
const upload = multer({ storage });
const validateListing=(req,res,next)=>{ 
    const error=listingSchema.validate(req.body);
   
    if(error && error.details){
      const errorMessage = error.details.map((e) => e.message).join(", "); 
      throw new ExpressError(400, errorMessage);
    }else{
      next();
    }
     
  };
  const savaRedirectUrl = (req, res, next) => {
    if (req.session.redirectUrl) {
      res.locals.redirectUrl = req.session.redirectUrl;
    }
    next(); 
  };
 
//Index Route
router.get("/", wrapAsync (async (req, res) => {
  const allListings = await Listing.find({});
  res.render("index.ejs", { allListings });
}));

//New Route
router.get("/new", (req, res) => { 
  if (!req.isAuthenticated()) {
    req.session.redirectUrl=req.originalUrl;
    req.flash("error", "You must be logged in to create a listing!");
    return res.redirect("/login");
  }
  res.render("new.ejs");
});

  
  // Create Route
  router.post("/",upload.single("listing[image]"),
     validateListing,
     wrapAsync (async (  req, res ,next) => {
      if (!req.isAuthenticated()) {
        req.session.redirectUrl=req.originalUrl;
        req.flash("error", "You must be logged in to create a listing!");
        return res.redirect("/login");
      }
      
      const newListing = new Listing(req.body.listing);
      newListing.owner=req.user._id;
    await newListing.save();
     // Flash success message and redirect
    req.flash("success","New listing created !")
    res.redirect("/listings");
  }));



  //Edit Route
  router.get("/:id/edit",wrapAsync ( async (req, res) => {
    if (!req.isAuthenticated()) {
      req.session.redirectUrl=req.originalUrl;
      req.flash("error", "You must be logged in to create a listing!");
      return res.redirect("/login");
    }
    let { id } = req.params;
    let listing=await Listing.findById(id);


  if (!listing.owner.equals(req.user._id)) {
    req.flash("error", "You don't have permission to edit");
    return res.redirect(`/listings/${listing._id}`);
    
  }
    res.render("edit.ejs", { listing });
  }));
  
  //Update Route
  router.put("/:id",
    validateListing, wrapAsync (async (req, res) => {
      if (!req.isAuthenticated()) {
        req.session.redirectUrl=req.originalUrl;
        req.flash("error", "You must be logged in to create a listing!");
        return res.redirect("/login");
      }
    let { id } = req.params;
    let listing=await Listing.findById(id);
 
  if (!listing.owner.equals(req.user._id)) {
    req.flash("error", "You don't have permission to edit");
    return res.redirect(`/listings/${listing._id}`);
  }
    await Listing.findByIdAndUpdate(id, { ...req.body.listing });
    req.flash("success","Listing Updated")
    res.redirect(`/listings/${id}`);
  }));
  
  //Delete Route
  router.delete("/:id", wrapAsync (async (req, res) => {
    if (!req.isAuthenticated()) {
      req.session.redirectUrl=req.originalUrl;
      req.flash("error", "You must be logged in to create a listing!");
      return res.redirect("/login");
    }
    let { id } = req.params;
    let listing=await Listing.findById(id);
  if (!listing.owner.equals(req.user._id)) {
    req.flash("error", "You don't have permission to edit");
    return res.redirect(`/listings/${id}`);
  }
    let deletedListing = await Listing.findByIdAndDelete(id);
    console.log(deletedListing);
    req.flash("success"," Listing deleted!")
    res.redirect("/listings");
  }));
  
  module.exports=router;