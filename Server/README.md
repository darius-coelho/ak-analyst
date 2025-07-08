# AK Analyzer Server App #

Code for the python api for the AK Analyzer (runs on python 3). 

### Running for Development ###

To run use the following command:
      
    python api.py

### Building an executable for distribution ###

To build the exe with the dependencies unpacked for the electron app use the following command:
      
    pyinstaller --clean --noconfirm app.spec

The resulting exe will be located in WebApp/Client/background_tasks/app

**Note**: If you encouter missing module or path not found errors, 
they may be solved by adding the missing module names to the *hidden-imports*
in the app.spec file. If this fails try adding the location of the modules to
 the *datas* field in the app.spec file 