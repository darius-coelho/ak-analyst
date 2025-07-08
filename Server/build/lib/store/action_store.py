from copy import deepcopy

from store.data_store import DataStore

def __genkey(pred_ids, atype, config):
    """ Generates a string hashkey. """
    return f"pred_ids={sorted(pred_ids)}, atype={atype}, config={config}"
    
def is_in_cache(uid, pred_ids, atype, config):
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
        read_from_cache(uid, pred_ids, atype, config)
        return True
    except KeyError as e:
        return False
    
def read_from_cache(uid, pred_ids, atype, config):
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
    return data[__genkey(pred_ids, atype, config)]


def store_to_cache(result, uid, pred_ids, atype, config):
    """ Stores the result of the action to cache. 

    Args:
        uid: Unique identifier for the session.
        pred_ids: List of predecessor node ids.
        atype: Action type.
        config: Dictionary of configuration options.
    
    """
    store = DataStore.instance()
    action_uid = f"action_{uid}"
    key = __genkey(pred_ids, atype, config)

    data = {}
    if store.store_contains(action_uid):
        data = store.get_data(action_uid)
        
    data = {**data, key: deepcopy(result)}
    store.store_data(action_uid, data)
