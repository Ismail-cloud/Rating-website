var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var User = require('../models/user');

passport.serializeUser(function(user, done) {
    done(null, user.id);
});

passport.deserializeUser(function(id, done) {
    User.findById(id, function (err, user) {
        done(err, user);
    });
});


/*
Sign-up strategy
 */
passport.use('local-signup', new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password',
    passReqToCallback:true
}, (req, email, password, done)=> {
    User.findOne({ email: email }, function (err, user) {
        if (err) { return done(err); }
        if (user) {
            return done(null, false, req.flash('error', "Email already registered"));
        }

        const newUser = new User();
        newUser.fullname = req.body.fullname;
        newUser.email = req.body.email;
        newUser.password = newUser.encryptPassword(req.body.password);

        newUser.save((err)=>{
            return done(null, newUser);
        })
    });
}));

/*
    login strategy
 */
passport.use('local-login', new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password',
    passReqToCallback:true
}, (req, email, password, done)=> {
    console.log("inside local-login streategy ");
    User.findOne({ email: email }, function (err, user) {
        if (err) { return done(err); }
        let messages = [];
        if (!user || !user.validPassword(password)) {
            messages.push('Your email and password combination does not match an existing account. Please retry or click "Forgot password" to reinitialize it.');
            return done(null, false, req.flash('error', messages));
        }

        return done(null, user);
    });
}));

//TODO Remove unused code

// passport.use('local-reset', new LocalStrategy({
//     passwordField: 'password',
//     passReqToCallback:true
// }, (req, password, done)=> {
//     console.log('inside local-reset strategy');
//
//     User.findOne({ passwordResetToken: req.params.token }, function (err, user) {
//         console.log('inside findOne');
//
//         if (err) { return done(err); }
//         let messages = [];
//         if (!user) {
//             console.log('inside user not found case');
//
//             messages.push('Your reset password token has expired or is invalid. Please retry');
//             return done(null, false, req.flash('error', messages));
//         }
//         if (user) {
//             console.log('inside user is found');
//
//             user.password = user.encryptPassword(req.body.password);
//             user.save();
//             return done(null, user);
//
//         }
//         console.log('reached the end');
//
//     });
// }));
