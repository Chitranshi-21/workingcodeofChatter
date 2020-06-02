var express = require('express');
var router = express.Router();
const pool = require('../db/dbConfig');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const nodemailer = require('nodemailer');
const log = console.log;

/* GET users listing. */
router.get('/', function(req, res, next) {
  res.send('respond with a resource');
});
router.get('/JoinQuery',(request, response) => {

  pool
    .query('SELECT acc.name as accname, con.email as conemail FROM salesforce.Contact as con INNER JOIN salesforce.Account as acc ON con.AccountId = acc.sfid')
    .then((contactQueryResult) => {
      console.log('contactQueryResult   : '+JSON.stringify(contactQueryResult.rows));
      //response.send(contactQueryResult.rows);
      response.render('JoinQuery',{lstContact:contactQueryResult.rows});
})
.catch((contactQueryError) => {
      console.log('contactQueryError  : '+contactQueryError);
      response.send(contactQueryError);
})

  });
  router.get('/welcome',(request, response) => {
    response.render('welcome.ejs');
  })  

//Login Page
        router.get('/login',(request, response) => {
        response.render('login.ejs');
             })


             router.post('/loginPost',async (request, response) => {
  
              const {email, password} = request.body;
              console.log('email : '+email+' passoword '+password);
            
              let errors = [], userId, objUser, isUserExist = false;
            
                if (!email || !password) {
                 errors.push({ msg: 'Please enter all fields' });
                 response.render('login',{errors});
                  }
            
                 await
                 pool
                .query('SELECT Id, sfid,name, email FROM salesforce.Contact WHERE email = $1 AND password__c = $2',[email,password])
                .then((loginResult) => {
                 console.log('loginResult.rows[0]  '+JSON.stringify(loginResult.rows[0]));
                  if(loginResult.rowCount > 0 )
                   {
                      userId = loginResult.rows[0].sfid;
                      objUser = loginResult.rows[0];
                     // isUserExist = true;
                      if(errors.length == 0){
                        const token = jwt.sign({ user : objUser }, process.env.TOKEN_SECRET, {
                          expiresIn: 8640000 // expires in 24 hours
                        });
                          response.cookie('jwt',token, { httpOnly: false, secure: false, maxAge: 3600000 });
                          response.header('auth-token', token).render('dashboard.ejs',{objUser}); 
  //Contact Info Page

             router.get('/ContactInfo',async (request, response) => {
                await
                pool
            .query('SELECT sfid, name, Email, Phone, MailingPostalCode FROM salesforce.Contact WHERE email = $1 ',[email])
            .then((contactQueryResult) => {
             console.log('contactQueryResult.rows[0]  '+JSON.stringify(contactQueryResult.rows[0]));
                if(contactQueryResult.rowCount > 0 )
                {
                  userId = contactQueryResult.rows[0].sfid;
                  objUser2 = contactQueryResult.rows[0];
                   response.render('contactInfoForm.ejs',{objUser2});
                  }})
                  .catch((InfoError) =>{
                   console.log('InfoError   :  '+InfoError.stack);
                    isUserExist = false;
                    }); 
                  });

 //Contact Update

             router.post('/postUpdate',async (request, response) => {
               
              let body = request.body;
              userId = body.sfid;
              console.log('body  '+JSON.stringify(body));
          const { name, email, phone, pincode, user} = request.body;
          console.log('name inside ' +name);
          let contactUpdateQuery = 'UPDATE salesforce.Contact SET '+
          'name = \''+name+'\', '+
          'email = \''+email+'\' , '+
          'phone = \''+phone+'\' , '+
          'MailingPostalCode = \''+pincode+'\' '+
          'WHERE sfid = $1';
         console.log('contactUpdateQuery  '+contactUpdateQuery);       
         await
                   pool
                   .query(contactUpdateQuery,[userId])
                   .then((contactUpdateQueryResult)=>{
                     console.log('contactUpdateQueryResult.rows : '+JSON.stringify(contactUpdateQueryResult));
                       /******* Successfully  Updated*/
                       response.redirect('/users/dashboard.ejs');
                   })
                   .catch((contactUpdateQueryError)=> {
                     console.log('contactUpdateQueryError '+contactUpdateQueryError);
                     response.render('contactInfoForm.ejs');
                   })  

                  })
         
             
          }
     //login Page Else     
     else
         {
           console.log('inside else');
           errors.push({msg: 'You are not registered'});
           response.render('login',{errors});
        }
       
       }})
        .catch((loginError) =>{
         console.log('loginError   :  '+loginError.stack);
          isUserExist = false;
          });
  
        });
     
//Forgot Passowrd

router.get('/forgotpassword',(req,res)=>{
  res.render('forgotPassword');
})


router.post('/EmailVerification',(request,response)=>{
  const {emailPass }= request.body;
  let errors =[];
  console.log('emailAddress' +emailPass);
  let queryContact = 'SELECT sfid,email,name FROM salesforce.contact where email=$1' ;
  console.log('querry Contact '+queryContact);
  pool
  .query(queryContact,[emailPass])
  .then((querryResult)=>{
        console.log('queryResult: '+JSON.stringify(querryResult.rows));
        if(querryResult.rowCount==1)
        {
          response.send(querryResult.rows);
        }
        if(querryResult.rowCount == 0)
        {
          errors.push({ msg: 'This email does not exists'});
          response.render('register',{errors}); 
        }
        else
        {
          response.send('This Email does not exist');
        }
  })
  .catch((QueryError)=>{
    console.log('Erros '+ QueryError.stack);
    response.send('QueryError');
  })
})


//sendEmail

router.post('/send',(request, response) => {

  let bodysent= request.body;
  const {email,sfid ,name} = request.body;
  console.log('emailId' +email);
  console.log('sfid' +sfid);
  console.log('name' +name);
  let errors = [], userId, objUser, isUserExist = false;

        if (!email ) {
        errors.push({ msg: 'Please enter Email ' });
        response.render('form',{errors});
        }
     // Step 1
     let transporter = nodemailer.createTransport({
     service: 'gmail',
     auth: {
      user: process.env.EMAIL || 'ckloudrac@gmail.com', // TODO: your gmail account
      pass: process.env.Password || 'Kloudrac@123' // TODO: your gmail password
           }
      });

      // Step 2
      let mailOptions = {
      from: 'ckloudrac@gmail.com', // TODO: email sender
       to: email, // TODO: email receiver
       subject: 'Chat App: Forgot Password',
      text: 'Please click the below link to generate new password',
      html: '<p><a href="http://localhost:8000/users/regeneratePassword/'+sfid +'">click to resest your password</a></p>' 
         };

       // Step 3
       transporter.sendMail(mailOptions, (err, data) => {
         if (err) {
          console.log('Error occurred. ' + err.message);
          return process.exit(1);
                 }
         console.log('Message sent: %s', info.messageId);
        response.send('Email sent!!!');
                 });
     })

  router.get('/regeneratePassword/:userId',(request,response)=>{
  let userId = request.params.userId;
  console.log('userId  : '+userId);
  response.render('regeneratePassword.ejs',{userId});
      })
  router.post('/updatePass',(request,response)=>{
  console.log('BODy'+JSON.stringify(request.body));
  let errors = [];
  const { pass ,pass2, user}=request.body;

        if(!pass || !pass2) {
                               errors.push({ msg: 'Please Fill all fields'});
                             }

         if(pass !== pass2) {
                               errors.push({ msg: 'Passwords do not match'});
                             }

          if(pass.length <6) {
                               errors.push({ msg: 'Passwords should be atleast 6 character'});
                             }
 
       if(errors.length > 0)
         {
             response.render('regeneratePassword',{errors});
        }
        else {

              let updateQuerryPass='UPDATE salesforce.contact SET '+
              'password__c = \''+pass+'\' '+
              'WHERE sfid = $1';
               console.log('update query'+updateQuerryPass);
                pool
                  .query(updateQuerryPass,[user])
                   .then((querryResult)=>{
                   console.log('querryResult'+JSON.stringify(querryResult));
                   response.send('New Password Generated Successfully');
                                         })
               .catch((queryyError)=>{
                console.log('queryyError'+queryyError.stack);
                response.send('queryyError');
                                     })

              }
  
           })

//chatter.ejs

        router.get('/chatter',(request, response) => {
          response.render('chatter.ejs');
        }) 
      router.post('/postchatter',async (request,response) => {
          let body = request.body;
          console.log('body  '+JSON.stringify(body));
          let { name, content} = request.body;
          
          let errors =[];
          await
          pool
            .query('INSERT into salesforce.post__c (name, description__c ) values ($1, $2) returning *',[name,content])
            .then((postQueryResult) => {
            console.log('postQueryResult : '+JSON.stringify(postQueryResult));
            })
            .catch((postQueryResult)=>{
            console.log('postQueryResult  : '+postQueryResult);  
            });

            await
           pool
           .query('SELECT Id, sfid,name, Description__c FROM salesforce.post__c')
           .then((postResult) => {
        
           if(postResult.rowCount > 0 )
           {
             userId = postResult.rows[0].sfid;
             objPost = postResult.rows[0];
             console.log('postResult : '+JSON.stringify(postResult.rows));
                 response.render('chatter2.ejs',{objPost}); 
             }
             else
             {
              response.render('chatter',{errors});
             }
           })
           .catch((postResult)=>{
           response.send(postResult);
           })
                
                })
                 
           

//dashboard
router.get('/dash', function(req, res) {
  res.render('dashboard.ejs');
})
//Register Page
router.get('/register', function(req, res) {
  res.render('register.ejs');
});

// Registration
router.post('/register',(request, response) => {
      let body = request.body;
      let {firstName, lastName, email, password, password2} = request.body;
      let errors =[];
      //Check Required Fields

      if(!firstName || !lastName || !email || !password || !password2) {
        errors.push({ msg: 'Please fill all the fields'});
      }

      //Check Password 

      if(password !== password2) {
        errors.push({ msg: 'Passwords do not match'});
      }

      if(password.length <6) {
        errors.push({ msg: 'Passwords should be atleast 6 character'});
      }
     

      if(errors.length > 0)
      {
        response.render('register',{errors});
      }
      else
      {

        pool
        .query('SELECT id, sfid, Name, Email FROM salesforce.Contact WHERE email = $1 ',[email])
        .then((contactQueryResult)=>{
          console.log('contactQueryResult.rows : '+JSON.stringify(contactQueryResult.rows));
          if(contactQueryResult.rowCount > 0)
          {
            errors.push({ msg: 'This email already exists'});
            response.render('register',{errors}); 
          }
          else
          {
                  pool
                  .query('INSERT into salesforce.Contact(firstname, lastname ,email, password__c) values ($1, $2, $3, $4)',[firstName,lastName,email,password])
                  .then((contactInsertQueryResult)=>{
                    console.log('contactQueryResult.rows : '+JSON.stringify(contactInsertQueryResult));
                      /******* Successfully  Inserted*/
                      response.redirect('/users/login');
                  })
                  .catch((contactInsertQueryError)=> {
                    console.log('contactInsertQueryError '+contactInsertQueryError);
                    response.render('register.ejs');
                  })
          }
        })
        .catch((contactQueryError)=> {
          console.log('contactQueryError '+contactQueryError);
          response.render('register.ejs');
        })

       
      }
          

/*      pool
      .query('INSERT into salesforce.Contact(firstname, lastname ,email, password__c) values ($1, $2, $3, $4)',[firstName,lastName,email,password])
      .then((contactQueryResult) => {
      console.log('contactQueryResult : '+JSON.stringify(contactQueryResult));
      response.send(contactQueryResult);
      })
      .catch((contactQueryError)=>{
      console.log('contactQueryError  : '+contactQueryError);  
      response.render(login.ejs);
      });
      */
      
})


router.get('/imageUploadForm',(request, response) => {
  response.render('imageUpload');
})


var storage = multer.diskStorage({
  filename: function(req, file, callback) {
    callback(null, Date.now() + file.originalname);
  }
});

var imageFilter = function (req, file, cb) {
  // accept image files only
  if (!file.originalname.match(/\.(jpg|jpeg|png|gif|PNG|JPG|GIF)$/i)) {
      return cb(new Error('Only image files are allowed!'), false);
  }
  cb(null, true);
};


console.log('process.env.CLOUD_NAME  : '+process.env.CLOUD_NAME);
console.log('process.env.CLOUDINARY_API_KEY  : '+process.env.CLOUDINARY_API_KEY);
console.log('process.env.API_SECRET  : '+process.env.CLOUDINARY_API_SECRET);

var upload = multer({ storage: storage, fileFilter: imageFilter})
cloudinary = require('cloudinary').v2;
cloudinary.config({ 
  cloud_name: process.env.CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET
}); 


router.post('/uploadImage',upload.any(),async (request, response) => {

  console.log('uploadImage  Called !');
  console.log('request.files[0].path   '+request.files[0].path);
  try{
  cloudinary.uploader.upload(request.files[0].path, function(error, result) {

      if(error){
        console.log('cloudinary  error' + error);
      }
      console.log('cloudinary result '+JSON.stringify(result));
      response.send(result);
    });
 }
 catch(Ex)
 {
      console.log('Exception '+ex);
      console.log('Exception '+JSON.stringify(ex));
 }
});
  

module.exports = router;
