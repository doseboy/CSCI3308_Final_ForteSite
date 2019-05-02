# Forte
## About Forte
Forte is a web application designed to make finding local music teachers and students simple. The primary users for the application will be skilled musicians who are looking to find local students interested in lessons and novice musicians looking for a local teacher. The app allows these users to locate each other and schedule a lesson with ease.

## File Structure
__Project Folders__

_database_: A folder used for passing notes about the Database structure,
however, it is not essential for the app and was used to convey information via text files

_resources_: The _resources_ folder contains the _css_, _img_ and _js_ folders. The _css_ folder contains all styling for the project that was not completed using Bootstrap. The _img_ folder contains all images, banners, and logos for the project. The _js_ folder contains the scripts necessary for database interaction.

_views_: The _views_ folder contains two folders - _pages_ and _partials_. The _pages_ folder contains the EJS views of every page in the project. The _partials_ folder holds a universal header, footer, and message that all of the pages reference.  

_server.js_: Contains all the server information, routing and database interactions that take place in the app. Supported by index.js, package-lock.json, and package.json.

## How to Build and Run
### Database
To connect to the Forte database:
1. Navigate and start postgreSQL
2. Run the command:
```
psql -h fortedb.cfsvavbwa9qq.us-east-2.rds.amazonaws.com -p 5432 -U fortemaster forte
```

### Local
To build and run the application locally:
1.	Open the project folder from the command line.
2. In the command line, run:
```
npm update
```
This will update the resources required to run the application.
3.	In the command line, run:
```
node server
```
The app will begin to run on your local host at port 3000.
4. In your browser, visit http://localhost:3000/

### Heroku
To deploy, build and run the application on Heroku:
1. Create a Heroku account and app
2. Upload the project code to the Heroku application
3. Visit the app url
For an example, visit: http://forte-cu.herokuapp.com/

## How to Test and Navigate
### Application Features to Test
1. Register your own user, student or teacher.
2. Book a lesson as a student. Teacher Sally Wilstone has a large range of availability for testing.
3. Set your schedule as a teacher.
Test users are available:
Student -> bob@gmail.com, password: password
Teacher -> sally@mail.com, password: password
