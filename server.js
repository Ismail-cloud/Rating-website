const express = require('express');
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const validator = require('express-validator');
const ejs = require("ejs");
const engine = require("ejs-mate");
const session = require("express-session");
const mongoose = require("mongoose");
const MongoStore = require('connect-mongo')(session);
const passport = require('passport');
const flash = require('connect-flash');

const app = express();
const port = 3000;

mongoose.Promise = global.Promise;
mongoose.connect('mongodb://localhost/rateme', { useNewUrlParser: true,  useUnifiedTopology: true });
require('./config/passport');
const secret = require('./secret/secret');

app.use(express.static('public'));
app.engine('ejs', engine);
app.set('view engine', 'ejs');
app.use(cookieParser());
app.use(bodyParser.urlencoded({extended : true}));
app.use(bodyParser.json());

app.use(session({
    secret: 'Thisismysecretkey',
    resave: false,
    saveUninitialized: false,
    store: new MongoStore({mongooseConnection: mongoose.connection})
}));

app.use(flash());
app.use(passport.initialize(undefined));
app.use(passport.session(undefined));  //TODO Check if this works as it is different from original

require("./routes/user")(app, passport, secret);

app.listen(port, () => {
    console.log(`Rating app listening at http://localhost:${port}`)
})
