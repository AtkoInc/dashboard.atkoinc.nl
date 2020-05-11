const express = require('express');
const router = express.Router();
const axios = require('axios');
var logger = require('../logger')

module.exports = function (_oidc){
    oidc = _oidc;

    router.get('/', async function(req, res, next) {
        if(req.session.prompts == null){
            logger.error("Attempt to progressive profile with no prompts loaded.")
            res.redirect('/')
        }

        res.render('profile',{prompts: req.session.prompts})
        req.session.prompts = null
    });

    router.post('/', async function (req,res,next){
    try {
        const requestingTenant = oidc.getRequestingTenant(req)
        await axios.post(
            requestingTenant.tenant+'/api/v1/users/' + req.userContext.id,
            {profile:req.body},
            {headers:{Authorization: "SSWS "+process.env.API_TOKEN,}})
        
        if(req.session.route && req.session.route.path){
            //TODO handle query params
            logger.verbose("Redirecting user to "+req.session.route.path)
            res.redirect(req.session.route.path)
        }
        else {
            logger.error("No route stored to session for progressive profiling, redirecting to root")
            res.redirect('/')
        }
        
    }
    catch(err) {
        logger.error(err)
        // set locals, only providing error in development
        res.locals.message = err.message;
        res.locals.error = req.app.get('env') === 'development' ? err : {};

        // render the error page
        res.status(err.status || 500);
        res.render('error', { title: 'Error' });
        }  
    });

  return router;
}