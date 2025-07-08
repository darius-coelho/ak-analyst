# -----------------------------------------------------------
# Contains API end-points that deals with 
# pattern browser actions
# -----------------------------------------------------------

import json
import gc

from flask import request, session, Blueprint
from flask_cors import  cross_origin

from actions.results import  ErrorResult

from store.data_store import DataStore

from plotting.plot import plot_data

from ak_logger import logger, log_it

pattern_browser_api = Blueprint("pattern_browser_api", __name__)


def to_map(data):
    if isinstance(data, list):
        return [to_map(x) for x in data]
    elif isinstance(data, dict):
        return {to_map(key): to_map(val) for key, val in data.items()}
    elif isinstance(data, int) and not isinstance(data, bool):
        return data
    else:
        return str(data)

@pattern_browser_api.route('/GetPlotData', methods=['POST'])
@cross_origin(supports_credentials=True)
@log_it
def get_plot_data():
    """ Gathers information needed to render the group/pattern detail plot. """
    logger.info("get_plot_data")
    try:
        uid = session['uid']
        result = DataStore.instance().get_data(uid)
        
        req_data = request.get_json()
        target = req_data["Y"]
        attribute = req_data["X"]
        targetType = req_data["targetType"]
        filters = req_data["filters"]    
        isSample = req_data["isSample"]
        nSample = req_data["nSample"]
        plot = "Scatterplot" if targetType == 'numeric' else "Bar"

        # Use the Data Sample class to avoid filtering issues while computing plots
        num_samples = nSample if isSample else result.dataset.shape[0]
        data = result.dataset.sample(nsamples=num_samples)
        
        pdata = plot_data(data, target, attribute, filters=filters, plot=plot, targetType=targetType)

        gc.collect()
        return pdata
    except Exception as e:
        print(e)
        if isinstance(e, ErrorResult):
            return result.response(), 400

        return ErrorResult("0", "AK_BROWSE", e).response(), 400

    
@pattern_browser_api.route('/GetPatternData', methods=['POST'])
@cross_origin(supports_credentials=True)
@log_it
def get_pattern_data():
    """ Gets data items for selected pattern by index. """
    logger.info("get_pattern_data")
    
    uid = session['uid']    
    result = DataStore.instance().get_data(uid)
    
    req_data  = request.get_json()    
    pid = req_data["idx"]
    target = req_data["target"]
    result = result.result[target]

    df = result.pandas_by_pid(pid)                
    result = df.to_json(orient='records')
    
    if req_data["type"] == 'csv/Text':
        result = df.to_csv(index=False)
    
    return result

@pattern_browser_api.route('/GetPatternDataByID', methods=['POST'])
@cross_origin(supports_credentials=True)
@log_it
def get_pattern_data_by_id():
    """ Gets data items for selected pattern by index. """
    logger.info("get_pattern_data_by_id")
    
    uid = session['uid']    
    result = DataStore.instance().get_data(uid)
    
    req_data  = request.get_json()    
    pid = req_data["patternID"]

    df = result.pandas_by_pid(pid)                
    result = df.to_json(orient='records')
    
    if req_data["type"] == 'csv/Text':
        result = df.to_csv(index=False)
    
    return result


@pattern_browser_api.route('/GetPatternSummary', methods=['POST'])
@cross_origin(supports_credentials=True)
@log_it
def get_pattern_summary():
    uid = session['uid']
    result = DataStore.instance().get_data(uid)

    req_data  = request.get_json()
    ids = req_data["ids"]
    target = req_data["target"]

    result = result.result[target]
    summary = result.summarize_subgroups(ids[0])      
    summary = to_map(summary)  
    return json.dumps(summary)


@pattern_browser_api.route('/AddPattern', methods=['POST'])
@cross_origin(supports_credentials=True)
@log_it
def add_pattern():
    uid = session['uid']
    analyst = DataStore.instance().get_data(uid)
    
    pattern_data  = request.get_json()
    
    analyst.add_pattern(pattern_data)    
    return analyst.response(-1)
    
    
