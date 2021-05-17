const { body, validationResult, check } = require('express-validator');
const nodemailer = require("nodemailer");
const smtptransport = require("nodemailer-smtp-transport");
const async = require("async");
const crypto = require("crypto");
const User = require("../models/user");

module.exports= (app, passport, secret)=>{

    app.get('/', (req, res, next) => {
        res.render('index', {title: "Index || Rate me"});
    })

    app.get('/signup', (req, res) => {
        const errors =  req.flash('error');
        res.render('user/signup', {title: "Sign up || Rate me", messages: errors, hasErrors: errors.length > 0});
    })

    app.post('/signup', validate(), getErrorMessages, passport.authenticate('local-signup', {
        successRedirect: '/home',
        failureRedirect: '/signup',
        failureFlash: true
    }))

    app.get('/login', (req, res) => {
        const errors =  req.flash('error');
        res.render('user/login', {title: "Login || Rate me" , messages: errors, hasErrors: errors.length > 0});
    })

    app.post('/login', passport.authenticate('local-login', {
        successRedirect: '/home',
        failureRedirect: '/login',
        failureFlash: true
    }))

    app.get('/home', (req, res)=>{
        res.render('home', {title: "Home || Rate me"});
    })

    app.get('/forgot', (req, res)=>{
        const errors =  req.flash('error');
        const info =  req.flash('info');
        res.render('user/forgot', {title: "Reset password || Rate me", messages: errors,
            hasErrors: errors.length > 0, info: info, noErrors: info.length > 0});
    })

    app.post('/forgot', (req, res, next) =>{
        async.waterfall([
            // generate token
            function (callback){
                crypto.randomBytes(20, (err, buf) =>{
                    var rand = buf.toString('hex');
                    callback(err, rand);
                });
            },
            // find user in db and save token
            function (rand, callback){
                User.findOne({ email: req.body.email }, (err, user) => {
                    if (!user) {
                        req.flash('error', 'Email is not registered');
                        return res.redirect('/forgot')
                    }
                    // we set token and 2 hours for expiration
                    user.passwordResetToken = rand;
                    user.passwordResetExpires = Date.now() + 60 * 120 * 1000;

                    user.save((err) =>{
                        callback(err, rand, user)
                    });
                })
            },
            // send reset password mail to user
            function(rand, user, callback){
                let transporter = nodemailer.createTransport({
                    service : 'Gmail',
                    auth: {
                        user: secret.auth.user, // generated ethereal user
                        pass: secret.auth.pass, // generated ethereal password
                    },
                });
                let mailOptions = {
                    to: user.email,
                    from: 'RateMe' + '<' + secret.auth.user + '>',
                    //from: 'RateMe <ismail.bouazizi@gmail.com>',
                    subject: 'RateMe Password Reset',
                    text: 'You have requested a password reset. \n \n' +
                        'Please click on the link below to reset your password: \n\n' +
                        'http://localhost:3000/reset/' + rand + '\n\n'
                };

                transporter.sendMail(mailOptions, (err, res) => {
                    req.flash('info', 'if the email is valid, a link will be sent to your account to reset the password');
                    return callback(err, user);
                });
            }
        ], (err) => {
            if(err){
                return next(err);
            }
            res.redirect('/forgot');
        })
    })

    app.get('/reset/:token', (req, res)=>{
        const errors = req.flash('error');
        const success = req.flash('success');

            User.findOne({ passwordResetToken: req.params.token, passwordResetExpires : {$gt: Date.now()}},
                (err, user) => {

                if (!user) {
                    req.flash('error', 'Your reset password token has expired or is invalid. Enter your email to get a new token');
                    return res.redirect('/forgot');
                }

                res.render('user/resetPassword', {title: "Reset password || Rate me", messages: errors,
                        hasErrors: errors.length > 0 , success: success, noErrors: success.length > 0});

            })
    })

    app.post('/reset/:token', (req, res, next) => {
        async.waterfall([
            function(callback){
                User.findOne({ passwordResetToken: req.params.token, passwordResetExpires : {$gt: Date.now()}},
                    (err, user) => {

                        if (!user) {
                            req.flash('error', 'Your reset password token has expired or is invalid. Enter your email to get a new token');
                            return res.redirect('/forgot');
                        }

                        // CHECK NEW PASSWORD IS STRONG AND NOT EMPTY
                        const validationArray = [];
                        let checkpwLength = body("password").not().isEmpty().withMessage("Password is required !");
                        let checkpwSize = body("password").isLength({ min: 5 }).withMessage("Password too short !");
                        let checkpwValid = check("password").matches("^(((?=.*[a-z])(?=.*[A-Z]))|((?=.*[a-z])(?=.*[0-9]))|((?=.*[A-Z])(?=.*[0-9])))(?=.{6,})").withMessage('Password should contain at least one uppercase letter, one lowercase letter, and one special character');

                        validationArray.push(checkpwLength);
                        validationArray.push(checkpwSize);
                        validationArray.push(checkpwValid);

                        var errors = validationResult(req);
                        let result = errors.array();


                        // CHECK PASSWORD and CONFIRM PASSWORD ARE THE SAME
                        if(req.body.password == req.body.cpassword){
                            if (!errors.isEmpty()){
                                let messages = [];
                                result.forEach((error) =>{
                                    messages.push(error.msg);
                                })
                                var errors = req.flash('error', messages);
                                res.redirect('/reset/'+ req.params.token);

                            } else {
                                user.password = user.encryptPassword(req.body.password);
                                user.passwordResetToken= undefined;
                                user.passwordResetExpires= undefined;
                                user.save((err) => {
                                    req.flash('success', 'Your password has been successfully updated');
                                    callback(err, user);
                                });
                            }
                        } else {
                            req.flash('error', 'Password and confirm password do not match');
                            res.redirect('/reset/'+ req.params.token);

                        }

                    })
            }, function(user, callback){
            //TODO CREATE FUNCTION TO SEND MAIL AND REMOVE DUPLICATION
                let transporter = nodemailer.createTransport({
                    service : 'Gmail',
                    auth: {
                        user: secret.auth.user, // generated ethereal user
                        pass: secret.auth.pass, // generated ethereal password
                    },
                });
                let mailOptions = {
                    to: user.email,
                    from: 'RateMe' + '<' + secret.auth.user + '>',
                    //from: 'RateMe <ismail.bouazizi@gmail.com>',
                    subject: 'Password successfully updated',
                    text: 'This is a confirmation that you updated your password for the account ' +user.email +'\n \n'

                };

                transporter.sendMail(mailOptions, (err, res) => {
                    callback(err, user);
                    let error = req.flash('error');
                    let success= req.flash('success');
                    res.render('user/resetPassword', {title: "Reset password || Rate me", messages: error,
                        hasErrors: error.length > 0, success: success, noErrors: success.length > 0});
                });
            }

        ], (err) => {
            if(err){
                return next(err);
            }
            res.redirect('/forgot');
        })
    })

    // app.post('/reset/:token', (req, res)=>{
    //     User.findOne({passwordResetToken: req.params.token}, (err, user) =>{
    //         if (!user){
    //             req.flash('error', 'Your reset password token has expired or is invalid. Enter your email to get a new token');
    //             return res.redirect('/forgot');
    //         }
    //         user.password = user.encryptPassword(req.body.password);
    //
    //         user.save();
    //     })
    //
    //     res.render('user/resetPassword', {title: "Reset password || Rate me"});
    // })

}



function validate(){
    const validationArray = [];
    let checkNamenotEmpty = body("fullname").not().isEmpty().withMessage("Fullname is required !");
    let checkFullnameSize = body("fullname").isLength({ min: 5 }).withMessage("Fullname too short !");
    let checkMailnotEmpty = body("email").not().isEmpty().withMessage("Email is required !");
    let checkMailValid = body("email").isEmail().withMessage("Email is invalid !");
    let checkpwLength = body("password").not().isEmpty().withMessage("Password is required !");
    let checkpwSize = body("password").isLength({ min: 5 }).withMessage("Password too short !");
    let checkpwValid = check("password").matches("^(((?=.*[a-z])(?=.*[A-Z]))|((?=.*[a-z])(?=.*[0-9]))|((?=.*[A-Z])(?=.*[0-9])))(?=.{6,})").withMessage('Password should contain at least one uppercase letter, one lowercase letter, and one special character');

    validationArray.push(checkNamenotEmpty);
    validationArray.push(checkFullnameSize);
    validationArray.push(checkMailnotEmpty);
    validationArray.push(checkMailValid);
    validationArray.push(checkpwLength);
    validationArray.push(checkpwSize);
    validationArray.push(checkpwValid);
    return validationArray;
}

function getErrorMessages(req, res, next){

    const errors = validationResult(req);
    if (!errors.isEmpty()) {

        let result = errors.array();
        let messages = [];
        result.forEach((error) =>{
            messages.push(error.msg);
        })

        req.flash('error', messages);
        res.redirect('/signup');

    } else {
        console.log('inside next ()');
        return next();
    }

}




