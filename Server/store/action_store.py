from copy import deepcopy
import networkx as nx

from store.data_store import DataStore
from actions.load_datalake_action import CloudFileResult

def __genkey(pred_ids, pred_ports, atype, config):
    """ Generates a string hashkey. """
    return f"pred_ids={sorted(pred_ids)}, pred_ports={sorted(pred_ports)}, atype={atype}, config={config}"
    
def is_in_cache(uid, pred_ids, pred_ports, atype, config):
    """ Determines if the requested action is cached. 

    Args:
        uid: Unique identifier for the session.
        pred_ids: List of predecessor node ids.
        atype: Action type.
        config: Dictionary of configuration options.
    
    Returns:
        True if the action is cached, False o.w.
    """
    try:
        read_from_cache(uid, pred_ids, pred_ports, atype, config)        
        return True
    except KeyError as e:
        return False
    
def read_from_cache(uid, pred_ids, pred_ports, atype, config):
    """ Retrieves the results of the action from cache. 

    Args:
        uid: Unique identifier for the session.
        pred_ids: List of predecessor node ids.
        atype: Action type.
        config: Dictionary of configuration options.
    
    Returns:
        The cached result of the action.
    """
    store = DataStore.instance()
    action_uid = f"action_{uid}"

    data = store.get_data(action_uid)
    return deepcopy(data[__genkey(pred_ids, pred_ports, atype, config)])
    

def store_to_cache(result, uid, pred_ids, pred_ports, atype, config, to_disk=True):
    """ Stores the result of the action to cache. 

    Args:
        uid: Unique identifier for the session.
        pred_ids: List of predecessor node ids.
        atype: Action type.
        config: Dictionary of configuration options.
        to_disk: If True, stores data to disk.
    """
    store = DataStore.instance()
    action_uid = f"action_{uid}"
    key = __genkey(pred_ids, pred_ports, atype, config)

    data = {key: deepcopy(result)}
    store.store_data(action_uid, data, to_disk=to_disk)

    
def create_action_cache_graph(uid):
    """ Creates a action cache graph and stores it stores it internally. 

    Args: 
        uid: Unique session id.

    Returns:
        An empty networx DiGraph object.
    """
    store = DataStore.instance()
    
    graph_id = f'{uid}-ACG'
    G = nx.DiGraph()
    store.store_data(graph_id, G, to_disk=False)
    return G

def get_action_cache_graph(uid):
    """ Retrieves the action cache graph associated with uid. """
    store = DataStore.instance()
    
    graph_id = f'{uid}-ACG'
    return store.get_data(graph_id)

def does_action_cache_graph_exist(uid):
    """ Returns true if an action cache graph is associated with uid. False o.w. """
    try:
        get_action_cache_graph(uid)
        return True
    except KeyError as e:
        return False
