# -----------------------------------------------------------
# Contains API end-points that deals with 
# transformer actions
# -----------------------------------------------------------
import gc
import json
import sys
import queue

from copy import deepcopy

from flask import request, session, Blueprint, Response, abort, stream_with_context
from flask_cors import cross_origin

from transformer.data_transformer import AKDataTransformer
from ak_threads.thread_with_trace import thread_with_trace

from store.data_store import DataStore

from actions.action import Action
from actions.results import  ErrorResult, FileResultArray

from plotting.plot import plot_box_plot
from ak_logger import log_it, logger

from endpoints.socket_communication import SocketComm


transformer_api = Blueprint("transformer_api", __name__)

@transformer_api.route('/InitTransformer', methods=['POST'])
@cross_origin(supports_credentials=True)
@log_it
def init_transformer():       
    # dependent actions that need to be executed first
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
        result, _ = action.execute(dependencies['pathTo']['ID'],
                                dependencies['pathTo']['type'],
                                dependencies['pathTo']['config'],
                                dependencies['pathTo']['input'],
                                port=None)
    
        if isinstance(result, ErrorResult):
            #raise an error if an ErrorResult is returned from execute
            raise result
                    
        # Initialize transformer
        data_orig = result.data

        if isinstance(result, FileResultArray) :            
            data_orig = result.data(dependencies['outPort'])
        
        if dependencies['options']['is_sample']:
            nsamples = dependencies['options']['nsamples']
            data_orig = data_orig.sample(nsamples)
        
        akdt = AKDataTransformer(data_orig, dependencies['transformations'])
        data = akdt.get_sampled_data()
        
        description = akdt.get_description()
        
        counts = akdt.get_counts()    
        transformations = akdt.get_transformations()

        store.store_data(f'dt-{uid}', akdt)

        # Send transformer finished status over websocket
        socketApp.send_action_status(dependencies['ID'], dependencies['type'], is_loading=False)

        resp = (
            '{ "data" : ' + data.fillna("NaN").to_json(orient='records') + 
            ', "description" : ' + description.to_json(orient='records') + 
            ', "transformations" : ' + json.dumps(transformations) + 
            ', "counts" : ' + json.dumps(counts) +'}'
            )

        del data
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


def transform_operation(oakdt, func_name, arg, bucket):
    """ Applies general transform operations in a cancelable way. """
    try:
        akdt = deepcopy(oakdt)

        err = 0
        getattr(akdt, func_name)(arg)
        description = akdt.get_description()
        
        data = akdt.get_sampled_data()
        counts = akdt.get_counts()
    
        transformations = akdt.get_transformations()    
        
        resp = (
            '{ "data" : ' + data.fillna("NaN").to_json(orient='records') +
            ', "description" : ' + description.to_json(orient='records') + 
            ', "transformations" : ' + json.dumps(transformations) + 
            ', "err" : "' + str(err) + 
            '", "counts" : ' + json.dumps(counts) + '}'
        )
        bucket.put({'akdt': akdt, 'resp': resp})

    except Exception as e:
        logger.error(str(e))
        bucket.put({'error': str(e)})
        raise

def log_cleanup():
    """ Handles releasing logger locks. """
    for h in logger.handlers:
        try:
            h.release()
        except:
            pass
    
def _wait(t1):
    """ Streams empty data to check if the connection is still open while the thread runs. """
    while t1.isAlive():
        try:
            yield " "
            t1.join(0.1)
        except:
            # connection has been closed by the client
            t1.kill()
            t1.join()

            logger.info("Request has been canceled by the client")
            abort(400, "canceled request")
            
            
def generate(req, func_name):
    """ Applies a transformation and streams back the result using a generator

    Args:
        req: Argument needed by the transformation function.
        func_name: Name of the transformation to apply.
    """
    uid = session['uid']
    store = DataStore.instance()
    
    oakdt = store.get_data(f'dt-{uid}')
    
    bucket = queue.Queue()
    t1 =  thread_with_trace(target=transform_operation, cleanup=log_cleanup,
                            args=(oakdt, func_name, req, bucket))
    t1.start()

    yield from _wait(t1)

    t1.join()
    
    assert not bucket.empty()
    result = bucket.get()
    if 'error' in result:
        yield json.dumps({"err":str(result['error'])})
        return

    try:
        yield " "
        yield result['resp']
        # store the changes if the response was successful
        store.store_data(f'dt-{uid}', result['akdt'])
    except BaseException as e:
        abort(400, "canceled request")
    finally:
        gc.collect()
        
@transformer_api.route('/TransformAttribute', methods =['POST'])
@cross_origin(supports_credentials=True)
@log_it
def transformAttribute():
    try:
        return Response(stream_with_context(generate(request.json, 'apply_transform')))
    except Exception as e:
        abort(400, str(e))



@transformer_api.route('/TransformMultiAttribute', methods =['POST'])
@cross_origin(supports_credentials=True)
@log_it
def transformMultiAttribute():
    try:
        return Response(stream_with_context(generate(request.json, 'apply_multi_transform')))
    except Exception as e:
        abort(400, str(e))


@transformer_api.route('/ToggleHideTransform', methods =['POST'])
@cross_origin(supports_credentials=True)
@log_it
def toggleHideTransform():
    try:
        tid = request.json['uid']
        return Response(stream_with_context(generate(tid, 'toggle_transform')))
    except Exception as e:
        abort(400, str(e))


@transformer_api.route('/DeleteTransform', methods =['POST'])
@cross_origin(supports_credentials=True)
@log_it
def deleteTransform():
    try:
        tid = request.json['uid']
        return Response(stream_with_context(generate(tid, 'remove_transform')))
    except Exception as e:
        abort(400, str(e))


@transformer_api.route('/GetBoxPlot', methods =['POST'])
@cross_origin(supports_credentials=True)
def getBoxPlot():
    """ Gather data necessary to render a box plot.
    NOTE: It is assumed that x is nominal and y is numeric.

    request:
        xattr: X-attribute name.
        yattr: y-attribute name.
    """
    try:
        uid = session['uid']

        store = DataStore.instance()
        akdt = store.get_data(f'dt-{uid}')
        
        yattr = request.json['yattr']
        xattr = request.json['xattr']
        
        box_plot_data = akdt.data.to_pandas()[[xattr, yattr]]
        pdata = plot_box_plot(box_plot_data)
    except Exception as e:        
        return str(e), 400

    return pdata.to_json(orient='records')

    
@transformer_api.route('/PreviewFilter', methods =['POST'])
@cross_origin(supports_credentials=True)
@log_it
def previewFilter():
    try:
        uid = session['uid']

        store = DataStore.instance()
        akdt = store.get_data(f'dt-{uid}')
        
        akdt.preview_filter(request.json)
        description = akdt.get_description()    

        resp = '{ "description" : ' + description.to_json(orient='records') + '}'

    except Exception as e:
        return str(e), 400
    
    return resp
