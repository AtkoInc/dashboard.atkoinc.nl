const express = require('express');
const router = express.Router();
const axios = require('axios');
const UserProfile = require('../models/userprofile')
var logger = require('../logger')

module.exports = function (_oidc){
    oidc = _oidc

  router.get('/'), function (req,res){
      res.render('error', {msg: 'Sorry no activation token was provided, please follow the link in you registration email.'})
  }

  router.get('/:token', async function(req, res, next) {
    var token = req.params.token;
    req.url = '/activate'
    logger.verbose("user activating")
    try{
    var response = await axios.post(oidc.getRequestingTenant(req).tenant+'/api/v1/authn',
        {
            token: token
        });
        var status = response.data.status
        switch(status){
            case "SUCCESS":
                logger.verbose("no password set required")
                res.render('activate');
            case "PASSWORD_RESET":
                logger.verbose("displaying password reset to user")
                res.render('activate', { state: response.data.stateToken, pwdReset: true, user: new UserProfile(response.data._embedded.user)});
        }        
    }
    catch (err){
        if(err.response.status == 401){
            logger.warn("invalid activation code provided.")
            res.render('error', {msg: 'Incorrect activation token provided, please follow the link in your registration email.'})
        }
        else {
            logger.error(err)
            // set locals, only providing error in development
            res.locals.message = err.message;
            res.locals.error = req.app.get('env') === 'development' ? err : {};

            // render the error page
            res.status(err.status || 500);
            res.render('error', { title: 'Error' });
        }
    }
  });

  router.post('/', async function (req,res,next){
    try {
        var tenant = oidc.getRequestingTenant(req)
        var response = await axios.post(
            tenant.tenant+'/api/v1/authn/credentials/reset_password',
            {
                stateToken: req.body.state,
                newPassword: req.body.password
            },
            {headers:{Authorization: "SSWS "+process.env.API_TOKEN,}})

        logger.verbose("Set user password")
        if(req.body.username != response.data._embedded.user.profile.login){
            logger.verbose("User proivded new value for username")
            await axios.post(
                tenant.tenant+'/api/v1/users/'+response.data._embedded.user.id,
                {
                    profile:{
                        login: req.body.username
                    }
                },
                {headers:{Authorization: "SSWS "+process.env.API_TOKEN,}})
            logger.verbose("Set username")
        }
        
        if(response.data.status === "SUCCESS" || response.data.status === "MFA_ENROLL"){
                res.render('activate', {redirect: tenant.tenant+'/login/sessionCookieRedirect?token='+response.data.sessionToken+'&redirectUrl='+req.headers.origin});
        } else {
                res.render('activate', { title: 'Activate Your Account', msg: "Failed: status was "+response.data.status});
        }
    }
    catch(err) {
        if(err.response){
            if(err.response.status == 403 && err.response.data.errorCode == 'E0000080'){
                //todo handle user profile
                res.render('activate', { state: req.body.state, pwdReset: true, user:new UserProfile()});
            }
        }
        else{
            logger.error(err)
            // set locals, only providing error in development
            res.locals.message = err.message;
            res.locals.error = req.app.get('env') === 'development' ? err : {};

            // render the error page
            res.status(err.status || 500);
            res.render('error', { title: 'Error' });
            }  
        }
    });

  return router;
}
