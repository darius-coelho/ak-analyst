import sys
import os
import logging
from ak_logger import logger, log_it
import atexit
import shutil

from pathlib import Path

from flask import Flask, send_from_directory, make_response, request
from flask_cors import CORS

from engineio.async_drivers import threading # Needed for packaging for pyinstaller

from endpoints.file_handling_api import file_handling_api
from endpoints.action_api import action_api
from endpoints.causal_api import causal_api
from endpoints.sklearn_api import sklearn_api
from endpoints.transformer_api import transformer_api
from endpoints.pattern_browser_api import pattern_browser_api
from endpoints.socket_communication import SocketComm

from store.data_store import DataStore

# disable logging
#logger.setLevel(logging.WARNING)

UPLOAD_FOLDER = str(Path.home()) + '/AK Analyst/Workspace'


app = Flask(__name__, static_folder='../Client/web/public/', static_url_path='/')

app.config["DEBUG"] = False
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER
app.config["SECRET_KEY"] = 'b816427c1397d9d6ab4eebd834ccc7ef'
# Cookie settings for using cookes on pages and subpages in chromium browsers
app.config["SESSION_COOKIE_SAMESITE"] = "None" 
app.config["SESSION_COOKIE_SECURE"] = True

# Register all the api endpoints with the flask app
app.register_blueprint(file_handling_api)
app.register_blueprint(action_api)
app.register_blueprint(causal_api)
app.register_blueprint(sklearn_api)
app.register_blueprint(transformer_api)
app.register_blueprint(pattern_browser_api)

CORS(app)

socketApp = SocketComm.instance()
socketApp.init_app(app)

@app.errorhandler(Exception)
def handle_bad_request(e):
    logger.error(e)
    response = make_response({'err': 'Server Error'}, 500)
    response.headers['Access-Control-Allow-Credentials'] = 'true'
    return response

@app.route('/', methods=['GET'])
def home():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/srv_status', methods=['GET'])
def srvStatus():
    return 'OK', 200

@app.route('/error-logger', methods=['POST'])
def error_logger():
    """ Write a javascript error to the log file. """
    message = request.json['message']
    stacktrace = request.json['stacktrace']
    logger.error(message + stacktrace)
    
    return 'OK', 200
    
@app.route('/ClearCache', methods=['GET'])
def shutdown_handler():
    """ Method which performs cleanup when the server is shutdown. """
    
    DataStore.instance().reset_store()

    file_path = 'parquet/'
    
    try:
        if os.path.isdir(file_path):
            # remove parquet files
            shutil.rmtree(file_path)
            
    except Exception as e:
        logger.error('Failed to delete %s. Reason: %s' % (file_path, e))
        return 'Failed to delete %s. Reason: %s' % (file_path, e), 500

    return 'OK', 200


# catch a shutdown
atexit.register(shutdown_handler)


if __name__ == "__main__":    
    port = 5000 
    # check if port is provided as an argument
    if len(sys.argv) > 1:
        port = sys.argv[1]        
    socketApp.run(app, port)




