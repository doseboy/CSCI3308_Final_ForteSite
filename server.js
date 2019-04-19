const express = require('express');
const pgp = require('pg-promise')();
const passport = require('passport');
const session = require('express-session');
const flash = require('connect-flash');
const bcrypt = require('bcrypt');
const LocalStrategy = require('passport-local').Strategy;
const nodemailer = require('nodemailer');
const async = require('async');
const crypto = require('crypto');

const app = express();

// Passport Config
passport.use(
    new LocalStrategy({ usernameField: 'email' }, (email, password, done) => {
        console.log('Made it to auth!');

        // Match User
        db.tx(t => {
            return t.oneOrNone('SELECT * FROM users WHERE \'' + email + '\' = email;');
        })
        .then((rows) => {
            const user = rows;
            if (!user) {
            console.log('Wrong email!');
            return done(null, false, { message: 'That email is not registered' });
            }

            //Check if user has verified their account via email
            if(!user.verified){
                console.log("Confirm Email to Login"); // User has not verified email
                return done(null, false, { message: 'That email is not verified' });
            }

            // Match Password
            bcrypt.compare(password, user.password, (err, isMatch) => {
                if (err) {
                    throw err;
                }
                if (isMatch) {
                    console.log('Made it past username and password checks!');
                    return done(null, user);
                } else {
                    console.log('Wrong password!');
                    return done(null, false, { message: 'Password incorrect' });
                }
            });
        })
        .catch((error) => {
            console.log(error);
        });
    
}));

// Configure Mail Server Responsible for Sending/Recieving Mail
var smtpTransport = nodemailer.createTransport({
    service: "Gmail",
    auth: {
        user: "forte.music.help@gmail.com",
        pass: "Paradise1!"
    }
});
var rand, mailOptions, host, link;

// Passport Serialize/Deserialize
passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser((id, done) => {
    db.tx(t => {
        return t.one('SELECT * FROM users WHERE \'' + id + '\' = id;');
    })
    .then((res) => {
        done(null, res);
    })
    .catch((err) => {
        console.log(err);
    });
});

// Connect to Database
const dbConfig = {
    host: 'fortedb.cfsvavbwa9qq.us-east-2.rds.amazonaws.com',
    port: 5432,
    database: 'forte',
    user: 'fortemaster',
    password: 'Paradise1!'
};

let db = pgp(dbConfig);

// Express Session
app.use(session({
    secret: 'secret',
    resave: true,
    saveUninitialized: true
}));

// Passport Middleware
app.use(passport.initialize());
app.use(passport.session());

// connect flash
app.use(flash());

// global vars
app.use((req, res, next) => {
    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    res.locals.error = req.flash('error');
    next();
});

// EJS
app.set('view engine', 'ejs');
app.use(express.static('public'));

// Body-parser
app.use(express.urlencoded({ extended: false}));

// Routes //

// Splash Page
app.get('/', (req, res) => {
    res.render('pages/splash', {
        my_title: 'Splash Page'
    });
});

// Login Page
app.get('/login', (req, res) => {
    res.render('pages/login', {
        my_title: 'Login Page'
    });
});

app.post('/login', (req, res, next) => {
    const { email } = req.body;
    db.tx(t => {
        return t.oneOrNone('SELECT type FROM users WHERE \'' + email + '\' = email;');
    })
    .then((data) => {
         if (data == null) {
                errors.push({ msg: 'Email is not registered' });
                res.render('pages/login', {
                    errors,
                    email,
                    password
                });
            } else if (data.type == 'student') {
                passport.authenticate('local', {
                    successRedirect: ('/student-dashboard'),
                    failureRedirect: '/login',
                    failureFlash: true
                })(req, res, next);
            } else {
                passport.authenticate('local', {
                    successRedirect: ('/teacher-dashboard'),
                    failureRedirect: '/login',
                    failureFlash: true
                })(req, res, next);
            }
    })
    .catch(err => {
      console.log(err);
    });
});

// Begin Email Routing
var rand, mailOptions, host, link;

app.get('/send', function(req, res){
    rand=Math.floor((Math.random() * 100) + 54);
	host=req.get('host');
	link="http://"+req.get('host')+"/verify?id="+rand;
	mailOptions={
        from: 'forte.music.help@gmail.com', //sender address
		to : req.query.to, // Reciever
		subject : "Please confirm your Email account",
		html : "Hello,<br> Please Click on the link to verify your email.<br><a href="+link+">Click here to verify</a>"	
	}
	console.log(mailOptions);
	smtpTransport.sendMail(mailOptions, function(error, response){
   	 if(error){
        	console.log(error);
		res.end("error");
	 }else{
        	console.log("Message sent: " + response.message);
		res.end("sent");
         }
    });
});

// Veritfy Email
app.get('/verify',function(req,res){
    console.log(req.protocol+":/"+req.get('host'));

    if((req.protocol+"://"+req.get('host'))==("http://"+host))
    {
        console.log("Domain is matched. Information is from Authentic email");
        if(req.query.id==rand)
        {
            // User's account updated in database to verified
            console.log("email is verified");


            db.tx(v => {
                return v.none('UPDATE users SET verified = $1 WHERE email = $2', [true, mailOptions.to]);
            })
            .then(data => {
                req.flash('success_msg', 'Email was successfully verified!');
                return res.redirect('/login');
            })
            .catch(error =>{
                console.log('ERROR:', error);
            });
        }
        else
        {
            console.log("email is not verified");
            res.end("<h1>Bad Request</h1>");
        }
    }
    else
    {
        res.end("<h1>Request is from unknown source</h1>");
    }
});

// Registration Page
app.get('/registration', (req, res) => {
    res.render('pages/registration', {
        my_title: 'Registration Page'
    });
});

app.post('/registration', (req, res) => {
    const { name,
        instrument,
        email,
        password,
        password2,
        userType
        } = req.body;

    let errors = [];

    // check required fields
    if (!name || !instrument || !email || !password || !password2 || !userType) {
        errors.push({ msg: 'Please fill in all fields' });
    }

    // check passwords match
    if (password !== password2) {
        errors.push({ msg: 'Passwords do not match' });
    }

    // check password length
    if (password.length < 6) {
        errors.push({ msg: 'Password should be at least 6 characters' });
    }

    // if there are errors, stay on page
    if (errors.length > 0) {
        res.render('pages/registration', {
            errors,
            name,
            instrument,
            email
        });
    } else {

        // Check if user exists in database
        db.tx(t => {
            return t.oneOrNone('SELECT * FROM users WHERE \'' + email + '\' = email;');
        })
        .then((rows) => {
            console.log(rows);
            if (rows !== null) {
                errors.push({ msg: 'Email already taken' });
                res.render('pages/registration', {
                    errors,
                    name,
                    instrument,
                    email
                });
            }
        })
        .catch((err) => {
            console.log(err);
        });

        // Store user in database
        console.log('Storing user!');
        db.tx(t => {
            return t.one('SELECT MAX(id) FROM users;');
        })
        .then((data) => {
            let lastUserId = data.max;

            lastUserId++;

            // Hash Password
            bcrypt.genSalt(12, (err, salt) => {
                bcrypt.hash(password, salt, (err, hash) => {
                    if (err) throw err;

                    // Set password to hashed version
                    let hashedPassword = hash;
                    console.log('Generated hashed password: ');
                    console.log(hashedPassword);

                    db.tx(t => {
                        console.log('Storing hashed password: ');
                        console.log(hashedPassword);
                        return t.none('INSERT INTO Users(id, name, email, password, instrument, type, strikes, thumbsup, verified) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9)',
                        [
                            lastUserId,
                            name,
                            email,
                            hashedPassword,
                            instrument,
                            userType,
                            0,
                            0,
                            false
                        ])
                        .then(t => {
                            req.flash(
                                'success_msg',
                                'Please log into your email to verify your account.'
                            );
                            res.redirect('/login');
                        })
                        .catch((err) => {
                            console.log(err);
                        });
                    })
                    .catch((err) => {
                        console.log(err);
                    });
                });
            })  
        })
        .catch((err) => {
            console.log(err);
        });
    }
});

// Forgot Password Email
app.get('/forgot', function(req, res) {
    res.render('pages/forgot', {
      my_title: 'Reset Pasword'
    });
});

app.post('/forgot', function(req, res, next) {
    const { forgot } = req.body;
    async.waterfall([
      function(done) {
        // Generate a unique, random reset token
        crypto.randomBytes(20, function(err, buf) {
          var token = buf.toString('hex');
          return done(err, token);
        });
      },
      function(token, done) {
          db.tx(tkn => {
              return tkn.one('SELECT * FROM users WHERE \'' + forgot + '\' = email;') 
                .then(data =>{
                    if(!data){
                    req.flash('error_msg', 'No account exists with this email');
                    return res.redirect('/forgot');
                    }
                    else{
                    // Email verified --> Send link to reset password
                    data.resetPasswordToken = token;
                    data.resetPasswordExpires = Date.now() + 3600000; // 1 hour

                    var mailOptions2 = {
                        to: data.email,
                        from: 'forte.music.help@gmail.com',
                        subject: 'Password Reset',
                        text: 'You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n' +
                        'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
                        'http://' + req.headers.host + '/reset/' + token + '\n\n' +
                        'If you did not request this, please ignore this email and your password will remain unchanged.\n'
                    };
                    smtpTransport.sendMail(mailOptions2, function(err) {
                        req.flash('success_msg', 'An e-mail has been sent to ' + mailOptions2.to + ' with further instructions.');
                        done(err, 'done');
                    });
    
                    console.log('Setting reset token');
                    console.log(data.resetPasswordToken);
                    console.log('Setting token expiration');
                    console.log(data.resetPasswordExpires);
                    return tkn.batch([
                        tkn.none('UPDATE users SET reset_token = $1 WHERE email = $2', [data.resetPasswordToken, data.email]), 
                        tkn.none('UPDATE users SET token_expires = $1 WHERE email = $2', [data.resetPasswordExpires, data.email])   
                    ]);
                }
            })
        })         
        .catch(error =>{
            console.log('ERROR:', error);
            res.redirect('/forgot');
            })
        }
    ],
        function(err) {
        if (err) return next(err);
        res.redirect('/forgot');
    });
});

// Reset Password Verificaiton

// Verify Reset Link
app.get('/reset/:token', function(req, res){
    db.tx(chk => {
        // Verify reset token
        return chk.oneOrNone('SELECT * FROM users WHERE reset_token = $1 AND CAST(token_expires AS BIGINT)> $2', [req.params.token, Date.now()]);
    })
    .then(data=>{
        // Link invalid if reset_token not verified
        if(!data){
            req.flash('error', 'Password reset token is invalid or has expired.');
            return res.redirect('/forgot');
        }
        else{
            // Reset token verified --> render form to enter new password 
            res.render('pages/reset', {email: data.email});
        }
    })
    .catch(error =>{
        console.log('ERROR', error);
    })
})

// Reset Password After Verification
app.post('/reset/:token', function(req, res) {

    const {newPass1, newPass2, forgot_email}  = req.body;
    let errors = [];

    // check required fields
    if (!newPass1 || !newPass2 || !forgot_email) {
        errors.push({ msg: 'Please fill in all fields' });
    }

    // check passwords match
    if (newPass1 !== newPass2) {
        errors.push({ msg: 'Passwords did not match' });
    }

    // check password length
    if (newPass1.length < 6) {
        errors.push({ msg: 'Password should be at least 6 characters' });
    }

    // if there are errors, stay on page
    if (errors.length > 0) {
        res.render('pages/reset', {
            errors,
            newPass1,
            newPass2,
            forgot_email
        });
    } 
    else {
        async.waterfall([
            function(done) {

                db.tx(reset => { // Verify that email exists in the database
                    return reset.oneOrNone('SELECT * FROM users WHERE email = $1', [forgot_email])
                        .then(data=>{
                            if(!data){
                                req.flash('error', 'Could not find an account associated with that email.');
                                return res.redirect('/forgot');
                            }
                            // Check again if user has a valid reset_token when button gets submitted, in case the token expired while on the 'reset' form
                            else if(data.token_expires < Date.now() || data.reset_token == 0){
                                req.flash('error', 'Invalid reset token.')
                                return res.redirect('/forgot')
                            }

                            // Reset Token validated for the given user
                            bcrypt.genSalt(12, (err, salt)=>{
                                bcrypt.hash(newPass1, salt, (err, hash)=>{
                                if (err) throw err;

                                // Encrypt Password
                                data.hashedPassword = hash;
                                console.log('Generated new hashed password: ');
                                console.log(data.hashedPassword);
                                db.tx(reset=>{
                                    // Store encrypted password, and reset the token & expiration time
                                    return reset.batch([
                                        reset.none('UPDATE users SET password = $1 WHERE email = $2',[data.hashedPassword, data.email]),
                                        reset.none('UPDATE users SET reset_token = $1 WHERE email = $2', [0, data.email]), 
                                        reset.none('UPDATE users SET token_expires = $1 WHERE email = $2', [0, data.email]) 
                                    ])
                                })
                                // Send an email to notify user of changed password
                                .then(d =>{
                                    var mailOptions3 = {
                                        to: data.email,
                                        from: 'forte.music.help@gmail.com',
                                        subject: 'Your password has been changed',
                                        text: 'Hello,\n\n' +
                                        'This is a confirmation that the password for your account ' + data.email + ' has just been changed.\n'
                                    };
                                    smtpTransport.sendMail(mailOptions3, function(err) {
                                        req.flash('success_msg', 'Success! Your password has been changed.');
                                        return res.redirect('/login');
                                        done(err);
                                    });
                                    console.log('"Password Change" Email sent.');
                                    console.log('Stored new password.');
                                    console.log('Reset token and expiration time.');
                                })
                                .catch(error =>{
                                    console.log('ERROR', error);
                                })

                                });
                            });
                        })
                })
                .catch(error =>{
                    console.log('ERROR', error);
                })
            }
        ], function(err) {
            res.redirect('/');
        });
    }
});


// Student Dashboard
app.get('/student-dashboard', (req, res) => {
    // Get Info
    let upcomingLessons = 'select * from meetings where users_usersid = \'' + req.user.id + '\' order by date asc;';

    db.task('get-upcoming-lessons', task => {
        return task.batch([
            task.any(upcomingLessons)
        ]);
    })
    .then(info => {
        // Get all teachers - need to optimize
        let teachers = 'select id,name from users where type = \'teacher\';';

        db.task('get-teachers', task => {
            return task.batch([
                task.any(teachers)
            ]);
        })
        .then(data => {
            res.render('pages/student-dashboard', {
                my_title: 'Student Dashboard',
                name: req.user.name,
                upcoming: info[0],
                teachers: data[0]
            });
        })
        .catch((err) => {
            console.log(err);
        });
    })
    .catch((err) => {
        console.log(err);
    });
});


app.get('/student-lesson_info', (req, res) => {
    // Get Info
    //var id = req.params.id;
    //res.send(req.query);
    //let meeting = 'select * from meetings where meetingid =' + id + ';';

    var check = req.query.name;

    if(!check){
        res.redirect('/student-dashboard');
    }else{

        res.render('pages/student-lesson_info', {
            my_title: 'Student Lesson',
            name: req.query.name,
            date: req.query.date,
            time: req.query.time,
            id: req.query.id,
            teacher: req.query.teacher,
            user: req.user.id
        })
    }
});

//Student-Cancellation
app.get('/student-lesson_cancel/:id', (req, res) => {
    //res.send(req.params.id);
    var id = req.params.id;
    db.tx(t => {
        console.log('Canceling meetings');
        return t.none('DELETE from meetings where meetingid =' + id +';');
    })
    .then(t => {
        req.flash(
            'success on cancelation'
        );
        res.redirect('/student-dashboard');
    })
    .catch((err) => {
        console.log(err);
    });
});


// Search
app.get('/student-teacher_search', (req, res) => {
    let teacher = 'teacher';
    
    let allUsers = "select * from users where type = 'teacher' ORDER by name asc;";

    db.task('get-all-users', task => {
        return task.batch([
            task.any(allUsers)
        ]);
    })
    .then(info => {
        console.log(req.user);
        console.log(req.user.instrument);
        res.render('pages/student-teacher_search', {
            my_title: 'Search',
            users: info[0]
        });
    })
    .catch((err) => {
        console.log(err);
    });
})

// Teacher Dashboard
app.get('/teacher-dashboard', (req, res) => {
    // Get Info
    let upcomingLessons = 'select * from meetings where teachers_teacherid = \'' + req.user.id + '\' order by date asc;';

    db.task('get-upcoming-lessons', task => {
        return task.batch([
            task.any(upcomingLessons)
        ]);
    })
    .then(info => {
        // Get all students - need to optimize
        let students = 'select id,name from users where type = \'student\';';

        db.task('get-students', task => {
            return task.batch([
                task.any(students)
            ]);
        })
        .then(data => {
            res.render('pages/teacher-dashboard', {
                my_title: 'Teacher Dashboard',
                name: req.user.name,
                upcoming: info[0],
                teachers: data[0]
            });
        })
        .catch((err) => {
            console.log(err);
        });
    })
    .catch((err) => {
        console.log(err);
    });
});


//Teacher Lesson Info

app.get('/teacher-lesson_info', (req, res) => {
    // Get Info
    //var id = req.params.id;
    //res.send(req.query);
    //let meeting = 'select * from meetings where meetingid =' + id + ';';
    var check = req.query.name;

    if(!check){
        res.redirect('/teacher-dashboard');
    }
    else{
        res.render('pages/teacher-lesson_info', {
            my_title: 'Teacher Lesson',
            name: req.query.name,
            date: req.query.date,
            time: req.query.time,
            id: req.query.id,
            student: req.query.student,
            user: req.user.id
        })
    }
});

//Teacher Cancellation

app.get('/teacher-lesson_cancel/:id', (req, res) => {
    //res.send(req.params.id);
    var id = req.params.id;
    db.tx(t => {
        console.log('Canceling meetings');
        return t.none('DELETE from meetings where meetingid =' + id +';');
    })
    .then(t => {
        req.flash(
            'success on cancelation'
        );
        res.redirect('/teacher-dashboard');
    })
    .catch((err) => {
        console.log(err);
    });
});

// Logout
app.get('/logout', (req, res) => {
    req.logout();
    req.flash('success_msg', 'You are logged out');
    res.redirect('/login');
});


// Teacher Availability
app.get('/teacher_availability', (req, res) => {
    let currentschedule = 'select * from schedules where teachersid = \'' + req.user.id + '\' ;';
    db.task('get-schedule', task => {
        return task.batch([
            task.any(currentschedule)
        ]);
    })
    .then(info => {
            res.render('pages/teacher_availability', {
                my_title: 'Teacher Scheduling',
                name: req.user.name,
                schedules:info[0]
            });
    })
    .catch((err) => {
        console.log(err);
    });
});

app.post('/scheduleupdate', (req, res) => {
    console.log('posting')
    var { m,t,w,th,f,s,u,
        m1,m2,m3,m4,m5,m6,m7,m8,m9,m10,m11,m12,
        t1,t2,t3,t4,t5,t6,t7,t8,t9,t10,t11,t12,
        w1,w2,w3,w4,w5,w6,w7,w8,w9,w10,w11,w12,
        th1,th2,th3,th4,th5,th6,th7,th8,th9,th10,th11,th12,
        f1,f2,f3,f4,f5,f6,f7,f8,f9,f10,f11,f12,
        s1,s2,s3,s4,s5,s6,s7,s8,s9,s10,s11,s12,
        u1,u2,u3,u4,u5,u6,u7,u8,u9,u10,u11,u12
        } = req.body;

    var days=[m,t,w,th,f,s,u];
    var mday=[m1,m2,m3,m4,m5,m6,m7,m8,m9,m10,m11,m12];
    var tday=[t1,t2,t3,t4,t5,t6,t7,t8,t9,t10,t11,t12];
    var wday=[w1,w2,w3,w4,w5,w6,w7,w8,w9,w10,w11,w12];
    var thday=[th1,th2,th3,th4,th5,th6,th7,th8,th9,th10,th11,th12];
    var fday=[f1,f2,f3,f4,f5,f6,f7,f8,f9,f10,f11,f12];
    var sday=[s1,s2,s3,s4,s5,s6,s7,s8,s9,s10,s11,s12];
    var uday=[u1,u2,u3,u4,u5,u6,u7,u8,u9,u10,u11,u12];

    for (i = 0; i < 7; i++) { 
        if (days[i]==undefined) {
            days[i]=0;
          }
    }
    for (i = 0; i < 12; i++) { 
        if (mday[i]==undefined) {
            mday[i]=0;
          }
        if (tday[i]==undefined) {
            tday[i]=0;
          }
        if (wday[i]==undefined) {
            wday[i]=0;
          }
        if (thday[i]==undefined) {
            thday[i]=0;
          }
        if (fday[i]==undefined) {
            fday[i]=0;
          }
        if (sday[i]==undefined) {
            sday[i]=0;
          }
        if (uday[i]==undefined) {
            uday[i]=0;
          }
    }

    //console.log(m);
    //console.log(days);    
    //console.log(mday);     

    console.log('Code for DB:')
    console.log('select updateSchedule(' +req.user.id + ',\'{'+days+'}\',\'{'+mday+'}\',\'{'+tday+'}\',\'{'+wday+'}\',\'{'+thday+'}\',\'{'+fday+'}\',\'{'+sday+'}\',\'{'+uday+'}\')')

    console.log('Storing Schedule');

        db.tx(t => {
            return t.any('select updateSchedule(' +req.user.id + ',\'{'+days+'}\',\'{'+mday+'}\',\'{'+tday+'}\',\'{'+wday+'}\',\'{'+thday+'}\',\'{'+fday+'}\',\'{'+sday+'}\',\'{'+uday+'}\');')
        })
            .then(t => {
                res.redirect('/teacher_availability');
            })
            .catch((err) => {
                console.log(err);
            });
        
});

app.get('/edit', (req, res) => {
    res.render('pages/edit', {
        my_title: 'Edit Profile Page',
        name: req.user.name,
        instrument: req.user.instrument,
        aboutme: req.user.aboutme,
        type: req.user.type
    });
});

app.post('/edit', function(req, res) {
    const newName = req.body.name;
    const newIns = req.body.instrument;
    const newAboutme = req.body.aboutme;
    db.tx('update-query', t => {
        var yo = 'UPDATE users SET name = \'' + newName + '\', instrument = \'' + newIns + '\', aboutme = \'' + newAboutme + '\' WHERE id = \'' + req.user.id + '\';';
        // var yo2 = 'UPDATE users SET instrument = \'' + newIns + '\' WHERE id = \'' + req.user.id + '\';';
        // var yo3 = 'UPDATE users SET aboutme = \'' + newAboutme + '\' WHERE id = \'' + req.user.id + '\';';
        var yo4 = 'SELECT type FROM users WHERE id = \'' + req.user.id + '\';';
        

        t.none(yo);
        // t.none(yo2);
        // t.none(yo3);
        return t.one(yo4);
    })
    .then(bla => {//if successful update then render page again with name as new name
        res.render('pages/edit', {
            my_title: 'Edits were made',
            name: newName,
            instrument: newIns,
            aboutme: newAboutme,
            type: bla.type
        });
    })
    .catch(err => {
        console.log('update-query catch thew an error');
        console.log(err);
    });
});

app.get('/studentPV', (req, res) => {
    res.render('pages/studentPV', {
        my_title: 'Profile PageError: Could not find matching close tag for "<%".',
        name: req.user.name,
        instrument: req.user.instrument,
        aboutme: req.user.aboutme
    });
});

app.get('/teacherPV', (req, res) => {
    res.render('pages/teacherPV', {
        my_title: 'Profile Page',
        name: req.user.name,
        instrument: req.user.instrument,
        aboutme: req.user.aboutme
    });
});

app.get('/student-teacherPV', (req, res) => {
    var id = req.query.id;
    console.log(req.query);
    db.tx('update-query', t => {
        var oy = 'SELECT * FROM users where id =' + id + ';';
        console.log(oy);
        return t.one(oy);
    })
    .then(bla => {
        res.render('pages/student-teacherPV', {
            my_title: 'Profile Page',
            id: bla.id,
            name: bla.name,
            instrument: bla.instrument,
            aboutme: bla.aboutme
        });
    })
    .catch(err => {
        console.log('update-query catch thew an error');
        console.log(err);
    });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, console.log('Server started on port' + PORT));
