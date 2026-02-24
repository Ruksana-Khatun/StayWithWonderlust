require('dotenv').config();
  if(process.env.NODE_ENV != "production") {
}
const express = require("express");
const MongoStore = require('connect-mongo');
const app = express();
const PORT = process.env.PORT || 10000;
const mongoose = require("mongoose");
const Listing = require("./models/listing.js");
const path = require("path");
const methodOverride = require("method-override");
const ejsMate=require("ejs-mate");
const  wrapAsync=require("./utils/wrapAsync.js");
const ExpressError=require("./utils/ExpressError.js");
const { reviewSchema}=require("./schema.js")
const Review=require("./models/review.js");
const User=require("./models/user.js");
const passport=require("passport");
const LocalStrategy=require("passport-local").Strategy;
const session = require("express-session");
const router = express.Router();
const listingsRouter=require("./routes/listing.js");
const userRouter=require("./routes/user.js");
const flash = require('connect-flash');
const { error } = require('console');

const dburl = process.env.ATLASDB_URL || "mongodb://127.0.0.1:27017/wanderlust";
const secret = process.env.SECRET || "fallbackSecret";

main()
  .then(() => {
    console.log("connected to DB");
  })
  .catch((err) => {
    console.log(err);
  });

async function main() {
  await mongoose.connect(dburl);
}


app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride("_method"));
app.engine('ejs',ejsMate);

const store = MongoStore.create({
  mongoUrl: dburl,
  touchAfter: 24 * 3600,
});
store.on("error",(err)=>{
  console.log("EROR IN MONGOO SESSION IN",err);
  
})
const sessionOptions={
  store,
  secret: secret,
  resave:false,
  saveUninitialized:true,
  cookie:{
    expires:Date.now() + 7 * 24 * 60 * 60 * 1000,
    max: 7 * 24 * 60 * 60 * 1000,
    httpOnly:true,
    secure: process.env.NODE_ENV === 'production',  
    

  },
  
};

app.use(session(sessionOptions));
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req,res,next)=>{
  res.locals.success=req.flash("success") || [];
  res.locals.error=req.flash("error") || [];
  res.locals.CurrUser=req.user || null;
  next();
});

app.use("/listings",listingsRouter)
app.use("/",userRouter);  



//Show Route
app.get("/listings/:id", wrapAsync (async (req, res) => {
  let { id } = req.params;
  const listing = await Listing.findById( new mongoose.Types.ObjectId(id)).populate({path:"reviews",
    populate:{
      path:"author",
    }
  }).populate("owner");
  if (!listing) {
    req.flash("error","Listing you trying to access does not exit!");
    return res.redirect("/listings")

  }
  console.log(listing);

  res.render("show.ejs", { listing });
  
}));
const validateReview=(req,res,next)=>{
  const error=reviewSchema.validate(req.body);
  if(error && error.details){
    const errorMessage = error.details.map((e) => e.message).join(", "); 
    throw new ExpressError(400, errorMessage);
  }else{
    next();
  }
   
};
app.post("/listings/:id/reviews",validateReview, wrapAsync(async(req,res)=>{
  if (!req.isAuthenticated()) {
    req.session.redirectUrl=req.originalUrl;
    req.flash("error", "You must be logged in to create a listing!");
    return res.redirect("/login");
  }
    let listing=await Listing.findById(req.params.id);
    let newReview=new Review(req.body.review);
    listing.reviews.push(newReview._id); 
    newReview.author=req.user._id;
    console.log(newReview);
    
    await newReview.save();
    await listing.save();
    req.flash("success","New Review created")
    res.redirect(`/listings/${listing._id}`);
   }));
   app.delete("/listings/:id/reviews/:reviewId", async (req, res) => {
     console.log(`Delete request for reviewId: ${req.params.reviewId} in listingId: ${req.params.id}`);
     let { id, reviewId } = req.params;
     let review = await Review.findById(reviewId);
     if (!review.author.equals(req.user._id)) {
      req.flash("error", "You are not the author of this review!");
      return res.redirect(`/listings/${id}`);
  }

       await Listing.findByIdAndUpdate(req.params.id, { $pull: { reviews: req.params.reviewId } });
       await Review.findByIdAndDelete(req.params.reviewId);
     
       req.flash("success","Review deleted!")
       res.redirect(`/listings/${req.params.id}`);
   });
app.all("/*",(req,res,next)=>{
  next(new ExpressError(404,"page not found"));
});
app.use((err, req, res,next)=>{
  const { statusCode=500, message="something went wrong" } = err;
  res. status(statusCode).render("error.ejs",{message});
  next(err);
});

console.log("Using port:", PORT);
app.listen(PORT, () => {
  console.log("server is listening to port 10000");
});
