# AK Analyst Electron App #

This directory contains the code for the front-end 
of the AK Analyst web and electron app.

## Installing Dependencies ##

To setup use the following command from within this folder:
      
    npm install


## Running for Development ##

When in development mode make sure to start the python backend manually.

### Running Web Development ###
To the run web app in developer mode from within this folder:

    npm run react-web-start

### Running Electron Development ###
To the run electron app in developer mode from within this folder:

    npm run start

If you want to run the front end in developer mode but automatically start
the python server code from an exe (i.e. you do not need to run the server code manually) 
in the background_tasks directory:

    npm run start-exe

**Note**: You can use a terminal and confirm that
the process is running on the selected port. 
For example on windows use the command 
*netstat -ano | findstr 5000* 
to see processes running on port 5000

## Building web interface for distributing ##
This will only build the front-end for the web app. You will need to build and deploy a 
the server code independently and set the address it is running on in web/src/Layout.js

To build the react client.min.js for distribution run the following command
from within this folder:

    npm run react-web-build

## Building an installer for distributing the desktop app ##

Before you build the electron app, make sure to build the app.exe 
from within the *Server* folder in the parent directory and 
copy it to the *background_tasks* folder in this directory.

To build use the any of the following commands based on your OS 
from within this folder:

    npm run build-windows
    npm run build-mac
    npm run build-linux
    

