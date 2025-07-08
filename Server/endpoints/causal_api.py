# -----------------------------------------------------------
# Contains API end-points that deals with 
# causal explorer actions.
# -----------------------------------------------------------

import json
from flask import request, session, Blueprint
from flask_cors import  cross_origin

from store.data_store import DataStore
from actions.action import Action
from actions.results import  ErrorResult, FileResultArray
from actions.sklearn_action import clean_param_val

from causal.causal_model import CausalModel

from ak_logger import logger, log_it

from endpoints.socket_communication import SocketComm

import pandas as pd
import networkx as nx

causal_api = Blueprint("causal_api", __name__)

def create_graph(nodes, edges):
    """ Creates a networkx DiGraph from nodes and edges. 

    Args:
        nodes: List of nodes.
        edges: List of edges.
    
    Returns:
        A networkx DiGraph object.
    """
    G = nx.DiGraph()

    G.add_nodes_from(nodes)
    model_attrs = {n: {
        **nodes[n]['model'],
        'params':  {p['name']: clean_param_val(p['value']) for p in nodes[n]['paramList']}} \
                   for n in G.nodes \
                   if 'model' in nodes[n] and nodes[n]['model']['label'] != 'Auto'}

    for e in edges:
        G.add_edge(e['sourceAttr'], e['targetAttr'])

    nx.set_node_attributes(G, model_attrs, name='model')
    return G
        

@causal_api.route('/InitCausal', methods=['POST'])
@cross_origin(supports_credentials=True)
@log_it
def init_causal_explorer():
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
        data = result.data

        if isinstance(result, FileResultArray) :            
            data = result.data(dependencies['outPort'])
            
        G = create_graph(dependencies['nodes'], dependencies['edges'])
        causal_model = CausalModel(G, data.to_pandas())

        store.store_data(f'cs-{uid}', {'scm': causal_model, 'data': data}) 

        # Send transformer finished status over websocket
        socketApp.send_action_status(dependencies['ID'], dependencies['type'], is_loading=False)

        return 'OK'
        
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


@causal_api.route('/FindLatent', methods=['POST'])
@cross_origin(supports_credentials=True)
@log_it
def find_latent():
    """ Handles calling methods to search for latent """
    try:
        store = DataStore.instance()    
        uid = session['uid']    
        
        graph = request.get_json()

        focus = graph['focus']
              
        G = create_graph(graph['nodes'], graph['edges'])
        scm_data = store.get_data(f'cs-{uid}')
        causal_model = scm_data['scm']
        data = scm_data['data']
        
        if not nx.utils.graphs_equal(causal_model.graph, G):
            causal_model = CausalModel(G, data.to_pandas())

        potential_confounders = []
        nodes = list(causal_model.graph.nodes)

        for i, n1 in enumerate(nodes):
            for n2 in nodes[i+1:]:
                if focus is not None and focus not in [n1, n2]:
                    continue

                
                confounders = causal_model.unobserved_confounders(n1, n2)
                
                potential_confounders.append({
                    'n1': n1,
                    'n2': n2,
                    'confounders': confounders
                })

        return {'result': json.dumps(potential_confounders)}
    
    except Exception as e:
        print(str(e))
        return str(e), 400
    



@causal_api.route('/EstimateEdgeStrength', methods=['POST'])
@cross_origin(supports_credentials=True)
@log_it
def estimate_edge_strength():
    try:
        store = DataStore.instance()    
        uid = session['uid']    
    
        req_data = request.get_json()
        nodes = req_data['nodes']
        edges = req_data['edges']
        
        focus_node = req_data['focus']
        
        scm_data = store.get_data(f'cs-{uid}')
        causal_model = scm_data['scm']
        data = scm_data['data']

        G = create_graph(nodes, edges)
        if not nx.utils.graphs_equal(causal_model.graph, G):
            causal_model = CausalModel(G, data.to_pandas())
            store.store_data(f'cs-{uid}', {'scm': causal_model, 'data': data})

        if focus_node is None:
            return {n: causal_model.target_edge_strength(n) for n in nodes}
        
        return {focus_node: causal_model.target_edge_strength(focus_node)}
            
    except Exception as e:
        print(str(e))
        return str(e), 400

    
@causal_api.route('/EstimateEffect', methods=['POST'])
@cross_origin(supports_credentials=True)
@log_it
def estimate_effect():
    try:
        store = DataStore.instance()    
        uid = session['uid']    
    
        req_data = request.get_json()

        nodes = req_data['nodes']
        edges = req_data['edges']
        treatment = req_data['treatment']
        target = req_data['target']
        alternative = req_data['alternative']
        reference = req_data['reference']
    
        G = create_graph(nodes, edges)    
        scm_data = store.get_data(f'cs-{uid}')
        causal_model = scm_data['scm']
        data = scm_data['data']

        if not nx.utils.graphs_equal(causal_model.graph, G):
            causal_model = CausalModel(G, data.to_pandas())
            store.store_data(f'cs-{uid}', {'scm': causal_model, 'data': data})

        ate, ci = causal_model.causal_effect_estimate(treatment, target, alternative, reference)
        
        return {'ate': ate, 'ci': ci}
    
    except Exception as e:
        print(str(e))
        return str(e), 400

@causal_api.route('/EstimateInfluence', methods=['POST'])
@cross_origin(supports_credentials=True)
@log_it
def estimate_influence():
    try:
        store = DataStore.instance()    
        uid = session['uid']    
        req_data = request.get_json()

        nodes = req_data['nodes']
        edges = req_data['edges']
        target = req_data['focus']
                
        G = create_graph(nodes, edges)
       
        scm_data = store.get_data(f'cs-{uid}')
        causal_model = scm_data['scm']
        data = scm_data['data']

        if not nx.utils.graphs_equal(causal_model.graph, G):
            causal_model = CausalModel(G, data.to_pandas())
            store.store_data(f'cs-{uid}', {'scm': causal_model, 'data': data})

        return causal_model.intrinsic_influence(target)
    
    except Exception as e:
        print(str(e))
        return str(e), 400



@causal_api.route('/EstimateFit', methods=['POST'])
@cross_origin(supports_credentials=True)
@log_it
def estimate_fit():
    try:
        store = DataStore.instance()    
        uid = session['uid']    
        req_data = request.get_json()

        nodes = req_data['nodes']
        edges = req_data['edges']
        target = req_data['focus']
                
        G = create_graph(nodes, edges)
         
        scm_data = store.get_data(f'cs-{uid}')
        causal_model = scm_data['scm']
        data = scm_data['data']

        if not nx.utils.graphs_equal(causal_model.graph, G):
            causal_model = CausalModel(G, data.to_pandas())
            store.store_data(f'cs-{uid}', {'scm': causal_model, 'data': data})
        
        return {'score': causal_model.score(target)}
    
    except Exception as e:
        print(str(e))
        return str(e), 400


@causal_api.route('/EstimateIntervention', methods=['POST'])
@cross_origin(supports_credentials=True)
@log_it
def estimate_intervention():
    try:
        store = DataStore.instance()    
        uid = session['uid']    
        req_data = request.get_json()
        
        nodes = req_data['nodes']
        edges = req_data['edges']
        focus = req_data['focus']
        alternative = req_data['alternative']
        reference = req_data['reference']
        shift = req_data['shift']
        is_atomic = req_data['isAtomic']
    
        G = create_graph(nodes, edges)
        
        scm_data = store.get_data(f'cs-{uid}')
        causal_model = scm_data['scm']
        data = scm_data['data']
        
        if not nx.utils.graphs_equal(causal_model.graph, G):
            causal_model = CausalModel(G, data.to_pandas())
            store.store_data(f'cs-{uid}', {'scm': causal_model, 'data': data})

        if is_atomic:   
            return causal_model.interventional_effect_estimate(focus, alternative, reference)

        return causal_model.interventional_effect_estimate(focus, shift)
        
    except Exception as e:
        print(str(e))
        return str(e), 400
