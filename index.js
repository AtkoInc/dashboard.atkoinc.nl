require('dotenv').config()
require('https').globalAgent.options.rejectUnauthorized = false;
const express = require('express')
const hbs  = require('express-handlebars')
const session = require('express-session')
const axios = require('axios')
const bodyParser = require('body-parser')

var passport = require('passport');
var logger = require('./logger')

const tenantResolver = require('./tenantResolver')
const ProgressiveProfiler = require ('./progressiveProfiler')
const userProfile = require('./models/userprofile')
const appLink = require('./models/applink')

const PORT = process.env.PORT || 3000;

app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.engine('hbs',  hbs( { 
    extname: 'hbs', 
    defaultLayout: 'main_with_menu', 
    layoutsDir: __dirname + '/views/layouts/',
    partialsDir: __dirname + '/views/partials/',
    helpers: {
        ifEquals: (arg1, arg2, options) => {
            return (arg1 == arg2) ? options.fn(this) : options.inverse(this);
        },
        jwt: function (token){
            var atob = require('atob');
            if (token != null) {
                var base64Url = token.split('.')[1];
                var base64 = base64Url.replace('-', '+').replace('_', '/');
                return JSON.stringify(JSON.parse(atob(base64)), undefined, '\t');
            } else {
                return "Invalid or empty token was parsed"
            }
        }
    }
  } ) );

app.set('view engine', 'hbs');

app.use('/assets', express.static('assets'));
app.use('/scripts', express.static(__dirname + '/node_modules/clipboard/dist/'));

app.use(session({
  cookie: { httpOnly: true },
  secret: process.env.SESSION_SECRET,
  saveUninitialized: false,
  resave: true
}));

app.use(passport.initialize({ userProperty: 'userContext' }));
app.use(passport.session());

passport.serializeUser((user, next) => {
    next(null, user);
  });
  
  passport.deserializeUser((obj, next) => {
    next(null, obj);
  });

const tr = new tenantResolver();
const pp = new ProgressiveProfiler(tr);

function parseJWT (token){
    var atob = require('atob');
    if (token != null) {
        var base64Url = token.split('.')[1];
        var base64 = base64Url.replace('-', '+').replace('_', '/');
        return JSON.parse(atob(base64))
    } else {
        return "Invalid or empty token was parsed"
    }
}

function parseError(error){
    try{
        if(error.response.status === 403 && error.response.headers['www-authenticate']){
            var error_description_pattern = /.*error_description=\"([^\"]+)\",.*/
            var scope_pattern = /.*scope=\"([^\"]+)\".+/
            var des = error.response.headers['www-authenticate'].match(error_description_pattern)[1]
            var scopeRequired = error.response.headers['www-authenticate'].match(scope_pattern)[1]
            return des+ " Required Scope: "+scopeRequired
        } 

        if(error.response.data.errorSummary){
            return error.response.data.errorSummary
        }
        if (error.response.data.error_description){
        return error.response.data.error_description
        }
        else {
            logger.error(error)
            return "Unable to parse error cause. Check console."
        }
    } catch(error){
        return "Unable to parse error cause. Check console."
    }
}

const router = express.Router();

router.get("/",[tr.ensureAuthenticated(),pp.ensureProfiled()], async (req, res, next) => {
    logger.verbose("/ requested")
    const requestingTenant = tr.getRequestingTenant(req);

    const tokenSet = req.userContext.tokens;
    axios.defaults.headers.common['Authorization'] = `Bearer `+tokenSet.access_token
    try {
        const response = await axios.get(tr.getRequestingTenant(req).tenant+'/api/v1/users/me/appLinks')
        var apps = [];

        const response2 = await axios.get(tr.getRequestingTenant(req).tenant+'/api/v1/users/me')
        var profile = new userProfile(response2.data)


        for(var idx in response.data){
            var app = new appLink(response.data[idx]);
            apps.push(app);
        }
        console.log(apps);
        res.render("index",{
            tenant: tr.getRequestingTenant(req).tenant,
            tokenSet: req.userContext.tokens,
            apps: apps,
            user: profile
        });
    }
    catch(error) {
        console.log(error);
         res.render("index",{
             tenant: tr.getRequestingTenant(req).tenant,
             tokenSet: req.userContext.tokens,
             user: new userProfile(),
             error: parseError(error)
         });
    }

});

router.get("/tokens",tr.ensureAuthenticated(), async (req, res, next) => {
    logger.verbose("/tokens requested")
    const tokenSet = req.userContext.tokens;
    axios.defaults.headers.common['Authorization'] = `Bearer `+tokenSet.access_token
    try {
        const response = await axios.get(tr.getRequestingTenant(req).tenant+'/api/v1/users/me')
        var profile = new userProfile(response.data)
        res.render("tokens",{
            tenant: tr.getRequestingTenant(req).tenant,
            tokenSet: req.userContext.tokens,
            user: profile,
        });
    }
    catch(error) {
        res.render("tokens",{
            tenant: tr.getRequestingTenant(req).tenant,
            tokenSet: req.userContext.tokens,
            user: new userProfile(),
            error: parseError(error)
        });
    }
});

router.get("/logout", tr.ensureAuthenticated(), (req, res) => {
    logger.verbose("/logout requsted")
    let protocol = "http"
    if(req.secure){
        logger.verbose("Request was secure")
        protocol = "https"
    }
    else if(req.get('x-forwarded-proto')){
        protocol = req.get('x-forwarded-proto').split(",")[0]
        logger.verbose("Request had forwarded protocol "+protocol)
    }
    const tenant = tr.getRequestingTenant(req).tenant
    const tokenSet = req.userContext.tokens;
    const id_token_hint = tokenSet.id_token
    req.logout();
    req.session.destroy();
    res.redirect(tenant+'/oauth2/v1/logout?id_token_hint='
        + id_token_hint
        + '&post_logout_redirect_uri='
        + encodeURI(protocol+"://"+req.headers.host)
        );
});

var activateRouter = require('./routes/activate')(tr)
var profileRouter = require('./routes/profile')(tr)
app.use('/activate',activateRouter)
app.use('/profile',profileRouter)


router.get("/error",async (req, res, next) => {
    res.render("error",{
        msg: "An error occured, unable to process your request."
       });
});

app.use(router)  

app.listen(PORT, () => logger.info('app started'));