# -----------------------------------------------------------
# Contains API end-points that deals with 
# file handling
# -----------------------------------------------------------

import os
import shutil
import json

from pathlib import Path
from werkzeug.utils import secure_filename
from inspect import getfile, currentframe

from flask import request, Blueprint
from flask_cors import  cross_origin

from ak_logger import logger, log_it
from endpoints.socket_communication import SocketComm

from store.data_store import DataStore
from dataframes.data_reader import read_raw
from actions.results import  FileResult, ErrorResult
from file.path_handler import process_filepath


file_handling_api = Blueprint("file_handling_api", __name__)
workspace_dir = ''

@file_handling_api.route('/CreateWorkspace', methods=['POST'])
@log_it
def create_workspace():
    """ Creates a workspace to hold the ETL artifacts. """
    global workspace_dir
    
    workspace_dir = request.get_json()['workspace']
    if not workspace_dir:
        workspace_dir = str(Path.home()) + '/AK Analyst/Workspace'

    Path(workspace_dir).mkdir(parents=True, exist_ok=True)

    sample_data_dir = str(Path.home()) + '/AK Analyst/Sample'
    Path(sample_data_dir).mkdir(parents=True, exist_ok=True)

    # reset the store if necessary
    store = DataStore.instance()
    store.reset_store()
    
    cache_dir = f'{workspace_dir}/.ak_cache'
    if os.path.isdir(cache_dir):
        # clear cache
        shutil.rmtree(cache_dir, ignore_errors=True)
        
    Path(cache_dir).mkdir(parents=True, exist_ok=True)

    # copy the sample files to a special directory
    sp500_data = process_filepath(os.path.join('data/sp500_data.csv'))
    patient_demo_data = process_filepath(os.path.join('data/patient_demographics.csv'))
    patient_health_data = process_filepath(os.path.join('data/patient_health.csv'))
    benchmark_data = process_filepath(os.path.join('data/benchmarks-returns.csv'))
    funds_data = process_filepath(os.path.join('data/funds.csv'))
    
    shutil.copyfile(sp500_data, sample_data_dir+'/sp500_data.csv')
    shutil.copyfile(patient_demo_data, sample_data_dir+'/patient_demographics.csv')
    shutil.copyfile(patient_health_data, sample_data_dir+'/patient_health.csv')
    shutil.copyfile(benchmark_data, sample_data_dir+'/benchmarks-returns.csv')
    shutil.copyfile(funds_data, sample_data_dir+'/funds.csv')

    store = DataStore.instance()
    store.set_path(cache_dir)
    
    return 'OK'

@file_handling_api.route('/LocalLoadAction', methods=['POST'])
@log_it
def local_load_action():
    """ Selects an file on the local machine for AK analyst operations.
        Only for use with electron. """
    file_data = request.get_json()
    socketApp = SocketComm.instance()

    if not file_data:
        return "Failed to open file", 400
    
    ID = file_data['ID']
    try:
        socketApp.send_action_status(ID, 'LOAD_FILE', True)
        
        result = FileResult(file_data['name'], file_data['path'],
                        options=file_data['options'], last_modified=file_data['lastModified'])

        resp = result.response()
        socketApp.send_action_status(ID, 'LOAD_FILE', False)
        
        return resp
    except Exception as e:
        # Handle an error
        try: 
            # Try reading raw data only
            data = {'name': file_data['name'], 'path': file_data['path'],
                    'rawPreview': read_raw(file_data['path'], file_data['options']['encoding'],
                                        file_data['options']['lineDelim'])}
            socketApp.send_action_status(ID, 'LOAD_FILE', False)
            return ErrorResult(-1, 'LOAD_FILE', e, data).response(), 400
        except Exception as e:
            # Handle error reading raw data
            data = {'name': file_data['name'], 'path': file_data['path'],
                    'rawPreview': None}
            socketApp.send_action_status(ID, 'LOAD_FILE', False)
            return ErrorResult(-1, 'LOAD_FILE', e, data).response(), 400

@file_handling_api.route('/UploadAction', methods=['POST'])
@log_it
def upload_action():
    """ Saves an uploaded file to the specified folder in the {workspace} directory. """
    global workspace_dir

    f = request.files['file']    
    
    folder = request.form['folder']
   
    if not f:
        return "Failed to open file", 400

    filename = secure_filename(f.filename)
    workspace_data_dir = os.path.join(workspace_dir, folder)
     
    Path(workspace_data_dir).mkdir(parents=True, exist_ok=True)

    upload_path = os.path.join(workspace_data_dir, filename)
    f.save(upload_path)
    
    fileList = []
    workspace_data_dir = os.path.join(workspace_dir, folder)    
    if os.path.isdir(workspace_data_dir):        
        fileList = [f for f in os.listdir(workspace_data_dir) if os.path.isfile(os.path.join(workspace_data_dir, f))]

    return json.dumps(fileList)

@file_handling_api.route('/DeleteFile', methods=['POST'])
@log_it
def delete_file():
    global workspace_dir
    file_data = request.get_json()

    if not file_data:
        return "Bad Request", 400
    
    folder = file_data['folder']
    filename = secure_filename(file_data['filename'])

    directory = os.path.join(workspace_dir, folder)
    
    del_file = os.path.join(directory, filename)
    
    try:
        os.remove(del_file)
    except OSError:
        # old_name doesn't exist
        pass

    return "OK"

@file_handling_api.route('/SaveAction', methods=['POST'])
@log_it
def save_action():
    """ Saves an uploaded string to the specified folder in the {workspace} directory. """
    global workspace_dir

    file_data = request.get_json()

    folder = file_data['folder']
    filename = secure_filename(file_data['fname'])
    content = file_data['content']
    old_name = None if file_data['oldName'] is None else secure_filename(file_data['oldName'])
    
    if not file_data:
        return "Failed to open file", 400

    directory = os.path.join(workspace_dir, folder)

    Path(directory).mkdir(parents=True, exist_ok=True) 

    filepath = os.path.join(directory, filename)
    text_file = open(filepath, "wt", encoding="utf-8")
    n = text_file.write(content)
    text_file.close()

    if old_name is not None:
        old_file = os.path.join(directory, old_name)
        try:
            os.remove(old_file)
        except OSError:
            # old_name doesn't exist
            pass

    return "OK"


def file_details(workspace, folder):
    """ Returns a list of file names and sizes from workspace/folder """
    workspace_data_dir = os.path.join(workspace, folder) 

    if not os.path.isdir(workspace_data_dir):
        return []

    def get_path(f):
        return os.path.join(workspace_data_dir, f)

    def get_latest_access(f):
        """ Gets the most recent of access time or modified time. """
        return max(os.path.getatime(get_path(f)), os.path.getmtime(get_path(f)))
        
    files = [{'name': f, 'size': os.path.getsize(get_path(f)),
              'last_modified': get_latest_access(f)} \
             for f in os.listdir(workspace_data_dir) \
             if os.path.isfile(os.path.join(workspace_data_dir, f))]

    return sorted(files, key=lambda x: x['last_modified'], reverse=True)


    
@file_handling_api.route('/GetFilenames', methods=['POST'])
@log_it
def get_filenames():
    """ Returns a list of file names in the specified folder in the {workspace} directory. """
    global workspace_dir
    
    file_data = request.get_json()   
    folder = file_data["folder"]

    return json.dumps([f['name'] for f in file_details(workspace_dir, folder)])


@file_handling_api.route('/GetFileDetails', methods=['POST'])
@log_it
def get_file_details():
    """ Returns a list of objects containing filename and size in the {workspace} directory. """
    global workspace_dir    
    file_data = request.get_json()   
    folder = file_data["folder"]

    return json.dumps(file_details(workspace_dir, folder))
        


@file_handling_api.route('/IsFilePresent', methods=['POST'])
@log_it
def is_file_present():
    """ Checks if a file is present. """
    file_data = request.get_json() 
    
    if not file_data:
        return "Failed to open file", 400

    filepath = process_filepath(os.path.join(file_data['path']))
    if os.path.isfile(filepath):
        return 'OK'
    
    return 'No file'

@file_handling_api.route('/DeleteServerFile', methods=['POST'])
@log_it
def delete_server_file():
    """ Deletes a file in the specified folder in the {workspace} directory. """
    global workspace_dir

    file_data = request.get_json()  

    folder = file_data["folder"] 

    if not file_data:
        return "Failed to open file", 400
    
    workspace_data_dir = os.path.join(workspace_dir, folder)
    filename = file_data['file']['name']
    filepath = os.path.join(workspace_data_dir, filename)

    if not os.path.isfile(filepath):
        return "Failed to find file", 400
    
    os.remove(filepath)
    
    fileList = []
    if os.path.isdir(workspace_data_dir):        
        fileList = [f for f in os.listdir(workspace_data_dir) if os.path.isfile(os.path.join(workspace_data_dir, f))]

    return json.dumps(fileList)

@file_handling_api.route('/SelectServerDataFile', methods=['POST'])
@log_it
def select_server_data_file():
    """ Selects a file in the specified folder in the {workspace} directory 
        for AK analyst operations. """
    global workspace_dir

    socketApp = SocketComm.instance()
    file_data = request.get_json()  

    folder = file_data["folder"]
    ID = file_data['ID']

    if not file_data:
        return "Failed to open file", 400
    
    filename = secure_filename(file_data['name'])
    filepath = os.path.join(workspace_dir, folder, filename) 

    if not os.path.isfile(filepath):
        return "Failed to find file", 400

    try:
        socketApp.send_action_status(ID, 'LOAD_FILE', True)
        
        last_modified=int(os.path.getmtime(filepath))        
        result = FileResult(filename, filepath, in_mem=file_data['inMemory'],
                            options=file_data['options'], last_modified=last_modified)
        resp = result.response()
        socketApp.send_action_status(ID, 'LOAD_FILE', False)

        return resp 
    except Exception as e:
        # Handle an error
        try:
            # Try reading raw data only
            data = {'name': file_data['name'], 'path': filepath,
                    'rawPreview': read_raw(filepath, file_data['options']['encoding'],
                                        file_data['options']['lineDelim'])}

            socketApp.send_action_status(ID, 'LOAD_FILE', False)                
            return ErrorResult(-1, 'LOAD_FILE', e, data).response(), 400
        except Exception as e:
            # Handle error reading raw data
            data = {'name': file_data['name'], 'path': filepath,
                    'rawPreview': None}

            socketApp.send_action_status(ID, 'LOAD_FILE', False)                
            return ErrorResult(-1, 'LOAD_FILE', e, data).response(), 400
    
@file_handling_api.route('/LoadServerPipeline', methods=['POST'])
@log_it
def load_server_pipeline():
    """ Loads a pipeline file in the {workspace}/Pipelines directory 
        for AK analyst operations. """
    global workspace_dir

    file_data = request.get_json()   

    folder = file_data['folder']

    if not file_data:
        return "Failed to open file", 400

    filepath = os.path.join(workspace_dir, folder, secure_filename(file_data['name']))

    if not os.path.isfile(filepath):
        return "Failed to find file", 400    
    
    text_file = open(filepath, "r", encoding="utf-8")
    data = text_file.read()
    text_file.close()
    
    return data

@file_handling_api.route('/GetDefaultPipelineName/<folder>/<filename>', methods=['GET'])
@log_it
def get_unique_filename(folder, filename):
    """ Returns a uniquely numbered version of filename in the folder directory. """
    
    folder_dir = os.path.join(workspace_dir, folder)

    # get the extension name
    ext = filename[filename.rfind('.'):]

    fname = filename[:filename.rfind('.')]
    rootname = fname
    
    suffix = 1
    while os.path.exists(os.path.join(folder_dir, f'{fname}{ext}')):
        fname = f'{rootname}{suffix}'
        suffix += 1

    return json.dumps({'name': f'{fname}{ext}'})

    
@file_handling_api.route('/DownloadLogFile', methods=['POST'])
@cross_origin(supports_credentials=True)
@log_it
def download_logfile():
    """ Downloads the log file. """
    log_dir = str(Path.home()) + '/AK Analyst/Logs/'
    log_path = log_dir+'/ak_analyst.log'
    logger.info("Log path = %s", log_path)
    
    with open(log_path) as fp:
        result = fp.read()
        
    return result
    
