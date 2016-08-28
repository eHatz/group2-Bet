//Dependencies
var express = require('express');
var methodO = require('method-override');
var bodyParse = require('body-parser');
var router = express.Router();

var app = express();
var passport = require("passport");
var LocalStrategy = require('passport-local').Strategy;
var session = require('express-session');
var SequelizeStore = require('connect-session-sequelize')(session.Store);
var server = require("../server.js");
var models = require('../models');

//==================LOGIN GET============================
router.get('/', function (req, res) {
	if (req.isAuthenticated()) {
		req.session.error = 'Please sign in!';
		res.redirect('/home');
		return false;
	};

	res.render('login');
});
//==================SIGNUP GET=============================
router.get('/signup', function(req, res) {

	res.render('signup'); // uses signup.handlebars
});

//====================HOME GET=============================

router.get('/home', function(req, res) {
	if (!req.isAuthenticated()) {
		req.session.error = 'Please sign in!';
		res.redirect('/');
		return false;
	};

	models.User.findOne({ where: {id: req.user.id} }).then(function(user) {
		user.getFriends().then(function(allFriends) {
			user.getBets().then(function(userBets) {
				var betReferee = [];
				var betParticipant = [];
				var allBetParticipants = [];
				for (var i = 0; i < userBets.length; i++) {
					if (userBets[i].referee === user.UserName) {
						betReferee.push(userBets[i]);
					} else {
						betParticipant.push(userBets[i]);
					};
				}
				for (var i = 0; i < userBets.length; i++) {
					userBets[0].getUsers().then(function(allUsers) {
						console.log('=================================================================')
						console.log(allUsers);
						console.log('=================================================================')
					})
				}
				//since user can see the bet that mean they are either a participant or a ref 
				res.render('home', {
					bet: betParticipant,
					ref: betReferee,
					friends: allFriends,
					user:user
				})
			})	
		})
	}).catch(function(err){
		if(err){
			throw err;
		}
	})
});

//====================SEARCH USERS TO GET SOME FRIENDS===========================
// router.get('/search-users', function(req, res) {
// 	if (!req.isAuthenticated()) {
// 		req.session.error = 'Please sign in!';
// 		res.redirect('/');
// 		return false;
// 	};
// 	var friends = []
// 	res.render('search_users', friends);
// })
router.post('/search-users', function (req, res) {
	res.redirect('/search-users/' + req.body.userName)
});

//===========================================================
router.get('/search-users/:userName', function (req, res) {
	if (!req.isAuthenticated()) {
		req.session.error = 'Please sign in!';
		res.redirect('/');
		return false;
	};
	models.User.findAll({ where: {UserName: req.params.userName}}).then(function(results) {
		var searchResult = {
			UserName: []
		};
		for (var i = 0; i < results.length; i++) {
			var users = {
				FirstName: results[i].FirstName,
				LastName: results[i].LastName,
				UserName: results[i].UserName,
				ImageLink: results[i].ImageLink,
				id: results[i].id
			};
			searchResult.UserName.push(users)
		};
		res.render('search_users', searchResult)

	}).catch(function(err){

		if(err){
			throw err;
		}
	})

});
//=====================GET FRIENDS==========================
router.post('/add-friend/:id', function(req,res) {

	models.User.findOne({where: {id: req.user.id} }).then(function(user) {
		
		models.User.findOne({where: {id: req.params.id} }).then(function(friend) {
			return user.addFriend(friend);
		})
	}).then(function() {
		res.redirect('/home');
	}).catch(function(err) {
		throw err;
	})

});

//=====================GET PROFILE==========================
router.get('/profile', function(req, res) {
    if (!req.isAuthenticated()) {
        req.session.error = 'Please sign in!';
        res.redirect('/');
        return false;
    };
    models.User.findOne({where: {id: req.user.id}}).then(function(user_info) {
    res.render('profile', {
        user: user_info
        })
    console.log(user_info);
    }).catch(function(err){
        if(err){
            throw err;
        }
    }) 
});



//=====================SIGNUP POST=========================
router.post('/signUp', function(req, res) {
	models.User.create({
		FirstName: req.body.firstName,
		LastName: req.body.lastName,
		Email: req.body.email,
		UserName: req.body.userName,
		Password: req.body.password,
		ImageLink: req.body.image
	}).then(function() {
		res.redirect('/');
	}).catch(function(err) {
		throw err;
	});
});

//=====================HOME POST========================
router.post('/create-bet', function(req, res){
	models.Bet.create({
		admin:req.user.UserName,
		adminImageLink: req.user.ImageLink,
		prediction: req.body.prediction,
		referee: req.body.referee,
		price:req.body.wager,
		judgmentDay: req.body.judgementDay

	}).then(function(group) {
		var playersSelected = req.body.participant;
		//checkbox allows more than one user but if only one is selcted the data type is number not array
		console.log(playersSelected)
		if (typeof playersSelected === 'string') {
			playersSelected = [req.body.participant];
		} else {
			playersSelected = req.body.participant;
		};

		playersSelected.push((req.user.id).toString()); //adds owner to array in order to add to associaion
		return group.addUsers(playersSelected);

	}).then(function() {
		res.redirect('/home');
	}).catch(function(err) {
		throw err;
	})

	
});	

//=====================PASSPORT========================

//Login 
router.post('/login',
	passport.authenticate('loginStrategy',{ 
		successRedirect: '/home',
		failureRedirect: '/' 
	})
);

//Logout
router.get('/logout', function(req, res){
	console.log("logged out!");
	req.logout();
	res.redirect('/');
});

module.exports = router;