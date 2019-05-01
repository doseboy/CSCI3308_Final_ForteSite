For Starters, here is how you can run the app. 
From the app folder:
1.	After first opening the folder run: ‘npm update’ (this will update the needed resources to run on your computer, set up because between our group we had many platforms, so a single universal set could not be used).
2.	Run: ‘node server’ and the app will begin to run on your local host at port 3000.
From Heroku Deployment:
Simply head to http://forte.band or http://forte-cu.herokuapp.com/ to view the online version of the app.
Notes on App usage: 
•	It is possible to register your own user, teacher or student for testing.
•	Booking will not work if the teacher you have selected hasn’t set a schedule. If you are testing booking lessons, use the teacher Sally Wilstone (who has a set schedule) and so will any teacher account you have created and set the schedule of.
•	Test users easy to access if you don’t want to use your email are: 
Student-> email: bob@gmail.com, password:password 
Teacher-> email: sally@mail.com, password:password
Want to connect to the database? From your postgreSQL bin run the command: 
psql -h fortedb.cfsvavbwa9qq.us-east-2.rds.amazonaws.com -p 5432 -U fortemaster forte

Repo Structure:
DB Code: A folder used for passing notes about the Database structure, 
however, it is not essential for the app and was used to convey information via text files
Css: Contains style.css file
Public: Contains images and the style.css file, these images are used by the views to create tables.
Resources: Contains default files for resources and is updated after running npm update when the folder is first downloaded. This allows for the master to work on a variety of platforms. 
Views: The EJS views of every page in the project in the pages folder. The partials folder holds a universal header, footer, and message that all of the pages reference.  
Index.js, package-lock.json, and package.json: Support server.js.
Server.js: Contains all the server files, routing, and database interactions that take place in the app. This and the pages make up the bulk of the non-setup code for 
