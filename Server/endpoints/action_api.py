# -----------------------------------------------------------
# Contains API end-points that deals with 
# pipeline actions
# -----------------------------------------------------------
import gc
from flask import request, session, Blueprint
from flask_cors import  cross_origin
import json

from store.data_store import DataStore

from actions.action import Action
from actions.results import  ErrorResult
from actions.ak_browse_action import ak_browse_action
from analyst.pattern import Pattern

from ak_logger import logger, log_it

from endpoints.socket_communication import SocketComm

import pandas as pd

action_api = Blueprint("action_api", __name__)

def does_persist(action_type):
    """ Returns true if data is needed across multiple 
    POST/GET calls. False o.w.

    Args:
        action_type: str indicating action type.    
    """
    return action_type in ['AK_BROWSE']

def execute_pipeline(execute_data, should_download=False, return_result=False):
    store = DataStore.instance()        
    socketApp = SocketComm.instance()
    
    if 'uid' not in session:
        session['uid'] = store.get_uid()
        
    uid = session['uid']    

    action = Action(uid, socketApp.send_action_status, socketApp.send_action_results)

    try:
        result, _ = action.execute(execute_data['ID'],
                                execute_data['type'],
                                execute_data['config'],
                                execute_data['input'],
                                port=None)

        if isinstance(result, ErrorResult):
            # raise an error if an ErrorResult is returned from execute
            raise result
        
        if does_persist(execute_data['type']):           
            store.store_data(uid, result)

        if execute_data['type'] == 'AK_FEATURE_EXP':
            store.store_data(f'fe-{uid}', result)
            
        resp = result.response()
        
        # for visualizer return with custom sample size
        if execute_data['type'] == "VISUALIZER":
            nsamples = 1000
            if execute_data['config']['options']['is_sample']:
                nsamples = execute_data['config']['options']['nsamples']                
            resp = result.response(nsamples)  

        if should_download:
            resp = result.download_file(execute_data['outPort'])

        if return_result:
            return result
            
        return resp
    except Exception as e:
        # Handle an error
        # terminate loading status of all actions
        action.terminate_loading(execute_data['ID'],
                                execute_data['type'],
                                execute_data['input'])
        
        if isinstance(e, ErrorResult):
            return result.response(), 400

        return ErrorResult(execute_data['ID'], execute_data['type'], e).response(), 400


@action_api.route('/LaunchBrowserFE', methods=['POST'])
@cross_origin(supports_credentials=True)
@log_it
def launch_browser_from_explorer():
    """ Launches the pattern browser from the feature explorer. """
    uid = session['uid']
    store = DataStore.instance()

    fe_result = store.get_data(f'fe-{uid}')
    data = request.get_json()
    
    fe_result.result.model.sample_patterns(data['interactions'])

    browser_result = ak_browse_action(fe_result.result, fe_result.data)
    store.store_data(uid, browser_result)
    return browser_result.response()
    
    
@action_api.route('/Execute', methods=['POST'])
@cross_origin(supports_credentials=True)
@log_it
def execute():
    """ Executes an action dependency graph and 
    returns the terminal result. """
    
    execute_data = request.get_json()
    result =  execute_pipeline(execute_data)

    gc.collect()
    
    return result
    

@action_api.route('/Aggregate', methods=['POST'])
@cross_origin(supports_credentials=True)
@log_it
def execute_aggregate():
    """ Executes the aggregate action. """
    
    dependencies = request.get_json()    
    store = DataStore.instance()    
    if 'uid' not in session:
        session['uid'] = store.get_uid()

    uid = session['uid']    
    socketApp = SocketComm.instance()
    # Send transformer running status over websocket
    socketApp.send_action_status(dependencies['ID'], dependencies['type'], is_loading=True)

    # Execute any prior actions
    action = Action(uid, socketApp.send_action_status, socketApp.send_action_results)    

    try: 
        config = {
            'aggKey': dependencies['aggKey'],
            'aggMap': dependencies['aggMap'] 
        }

         # Run aggregation and predecessors
        result, _ = action.execute(dependencies['pathTo']['ID'],
                                dependencies['pathTo']['type'],
                                config,
                                dependencies['pathTo']['input'],
                                port=None)

        if isinstance(result, ErrorResult):
            #raise an error if an ErrorResult is returned from execute
            raise result       
        
        resp = result.response()

        gc.collect()
        return resp

    except Exception as e:
        # Handle an error
        # terminate loading status of all actions
        action.terminate_loading(dependencies['pathTo']['ID'],
                                dependencies['pathTo']['type'],
                                dependencies['pathTo']['input'])
        socketApp.send_action_status(dependencies['ID'], dependencies['type'], is_loading=False)

        if isinstance(e, ErrorResult):
            return result.response(), 400
        
        return ErrorResult(dependencies['ID'], dependencies['type'], e).response(), 400


@action_api.route('/DownloadFileResult', methods=['POST'])
@cross_origin(supports_credentials=True)
@log_it
def download_result():
    """ Executes an action dependency graph and 
    returns the terminal result. """
    
    execute_data = request.get_json()  
    return execute_pipeline(execute_data, should_download=True)  

@action_api.route('/ExportModel', methods=['POST'])
@cross_origin(supports_credentials=True)
@log_it
def export_model():
    """ Export the sklearn or statsmodel model as a pickle file """
    
    execute_data = request.get_json()
    return execute_pipeline(execute_data, should_download=True)  


@action_api.route('/ExportPatterns', methods=['POST'])
@cross_origin(supports_credentials=True)
@log_it
def export_patterns():
    """ Exports the patterns as a csv file. """
    execute_data = request.get_json()  
    pm_result = execute_pipeline(execute_data, return_result=True)

    assert execute_data['type'] == 'AK_MINE'  # sanity check

    mine_type = execute_data['config']['mineType']
    
    assert mine_type in ['numeric', 'binary']  # sanity check    
    
    patterns = pm_result.process_patterns()
    target = pm_result.model.target

    if mine_type == 'numeric': 
        pdata = {
            'keys': [','.join(p.keys()) for p in patterns],
            'description': [str(p) for p in patterns],
            'count': [],
            'mean': [],
            'std': [],
            'min': [],
            'max': [],
            '25%': [],
            '50%': [],
            '75%': [],
        }         
    else:
        pdata = {
            'keys': [','.join(p.keys()) for p in patterns],
            'description': [str(p) for p in patterns],
            'count': [],
            'count 1': [],
            'count 0': [],
            f'probability({target}=1)': [],
            f'probability({target}=0)': [],
        }        

    data = pm_result.train_df
    
    data.create_checkpoint()
    
    # create Pattern object to get size + mean for each pattern
    for pat in [Pattern(p) for p in patterns]:
        pat.apply_pattern(data)

        if mine_type == 'numeric':
            summary = data.describe(columns=target)

            pdata['count'].append(int(summary['count']))
            pdata['mean'].append(summary['mean'])
            pdata['std'].append(summary['std'])
            pdata['min'].append(summary['min'])
            pdata['max'].append(summary['max'])
            pdata['25%'].append(summary['25%'])
            pdata['50%'].append(summary['50%'])
            pdata['75%'].append(summary['75%'])
        else:
            counts, levels = data.value_counts(target)
            if len(levels) == 1:
                # handle case where there is only one unique value
                count_0, count_1 = (counts[0], 0) if levels[0] == 0 else (0, counts[0])
            else:
                count_0, count_1 = counts if levels[0] == 0 else counts[::-1]
                
            pr_1 = count_1 / (count_0 + count_1)

            pdata['count'].append(count_0 + count_1)
            pdata['count 1'].append(count_1)
            pdata['count 0'].append(count_0)
            pdata[f'probability({target}=1)'].append(pr_1)
            pdata[f'probability({target}=0)'].append(1.0 - pr_1)
            
        data.restore_checkpoint()
        
        
    pattern_data = pd.DataFrame(pdata)
    return pattern_data.to_csv(index=False)


@action_api.route('/FreeMemory', methods=['PUT'])
@cross_origin(supports_credentials=True)
@log_it
def free_memory():
    """ Frees temporary memory from storage """
    store = DataStore.instance()
    uid = session['uid']
    
    store.delete_data(uid)
    store.delete_data(f'dt-{uid}')
    gc.collect()
    
    return 'OK'
    
