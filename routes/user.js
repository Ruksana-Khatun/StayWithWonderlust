const express = require("express");
const router = express.Router();
const User = require("../models/user");
const passport = require("passport"); 
router.get("/signup", (req, res) => {
  res.render("user/signup");
});


router.post("/signup",
     async (req, res, next) => {
  try{
    let { username, email, password } = req.body;
  const newUser = new User({ email, username });
  const registerdUser = await User.register(newUser, password);
  console.log(registerdUser);
  req.login(registerdUser,(err)=>{
    if(err){
      return next(err);
    }
    req.flash("success","welcom to wonderlust!");
    res.redirect("/listings");
  });
  }catch(e){
    req.flash("error", e.message);
    res.redirect("/signup");
  }
});
const savaRedirectUrl = (req, res, next) => {
  if (req.session.redirectUrl) {
    res.locals.redirectUrl = req.session.redirectUrl;
  }
  next(); 
};
router.get("/login", (req, res) => {
    res.render("user/login");
  });
  router.post("/login", savaRedirectUrl,
    passport.authenticate('local', { failureRedirect: '/login', failureFlash: true }),
    async (req, res) => {
      req.flash("success", "Welcome back to Wonderlust!");
      let redirectUrl = req.session.redirectUrl || "/listings";  
      // res.redirect(res.locals.redirectUrl);
      res.redirect(redirectUrl);
    }
  );
  
  
  router.get("/logout",(req,res ,next)=>{
    req.logout((err)=>{
      if(err){
         return next(err);
      }
      req.flash("success","you are logged out now!");
      res.redirect("/listings")
    })
  })

module.exports = router;
