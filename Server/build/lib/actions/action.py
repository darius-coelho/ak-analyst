from operator import itemgetter
import pandas as pd
from copy import deepcopy

from store.action_store import is_in_cache, read_from_cache, store_to_cache
from actions.results import ErrorResult
from actions.load_action import load_action
from actions.join_action import join_action
from actions.ak_mine_action import ak_mine_action
from actions.ak_browse_action import ak_browse_action
from actions.ak_cleanse_action import ak_cleanse_action

from ak_logger import logger, log_it

class Action:
    """ Class which helps with action execution. """
    
    def __init__(self, uid, send_action_status):
        """ Constructor for the Action class. 
        
        Args:
            uid: Session user id.
            send_action_status: Function for sending messages to the front end.
        """
        self.uid = uid
        self.send_action_status = send_action_status
        
    @log_it
    def execute(self, nodeId, action_type, config, inputs):
        """ Executes the specified action and its dependences. 
            
        Args:
            action_type: Action type to execute.
            nodeId: ID of the current node
            action_type: The type of node
            config: configuration object.
            inputs: Dependencies to execute.

        Returns: 
            The result of the action, and a flag indicating if the 
            result was from cache.
        """    
        try:
            # Send action running status over websocket
            self.send_action_status(nodeId, action_type, is_loading=True)

            # indicates if result is from cache
            is_from_cache = False
            
            # Run the appropriate action
            result = None
            if action_type == 'JOIN':
                if len(inputs) != 2:
                    raise ValueError("Expected 2 inputs to join")

                nid0, atype0, config0, input0 = itemgetter('ID','type','config','input')(inputs[0])
                nid1, atype1, config1, input1 = itemgetter('ID','type','config','input')(inputs[1]) 
                left, left_cached = self.execute(nid0, atype0, config0, input0)
                right, right_cached = self.execute(nid1, atype1, config1, input1)

                if isinstance(left, ErrorResult):
                    return left, False

                if isinstance(right, ErrorResult):
                    return right, False

                pred_ids = [nid0, nid1]
                is_from_cache = left_cached \
                                and right_cached \
                                and is_in_cache(self.uid, pred_ids, action_type, config)
                
                if is_from_cache:
                    logger.info("Loading Join from cache")
                    result = read_from_cache(self.uid, pred_ids, action_type, config)
                else:
                    result = join_action(left, right, config)
                    store_to_cache(result, self.uid, pred_ids, action_type, config)
                    
            if action_type == 'LOAD_FILE':
                is_from_cache = is_in_cache(self.uid, [], action_type, config)
                                
                if is_from_cache:
                    logger.info("Loading File from cache")
                    result = read_from_cache(self.uid, [], action_type, config)                    
                    result.data().reset_data()
                else:
                    result = load_action(deepcopy(config))
                    store_to_cache(result, self.uid, [], action_type, config)
                    
            if action_type == 'CLEANSE':
                nid0, atype0, config0, input0 = itemgetter('ID','type','config','input')(inputs[0])
                depend, is_cached = self.execute(nid0, atype0, config0, input0)

                if isinstance(depend, ErrorResult):
                    return depend, False

                is_from_cache = is_cached and is_in_cache(self.uid, [nid0], action_type, config)
                if is_from_cache:                
                    logger.info("Loading Cleanse result from cache")
                    result = read_from_cache(self.uid, [nid0], action_type, config)
                else:
                    result = ak_cleanse_action(depend, config)
                    store_to_cache(result, self.uid, [nid0], action_type, config)
        
            if action_type == 'AK_MINE':
                nid0, atype0, config0, input0 = itemgetter('ID','type','config','input')(inputs[0])
                depend, is_cached = self.execute(nid0, atype0, config0, input0)

                if isinstance(depend, ErrorResult):
                    return depend, False
                
                is_from_cache = is_cached and is_in_cache(self.uid, [nid0], action_type, config)
                if is_from_cache:
                    logger.info("Loading AK Mine result from cache")
                    result = read_from_cache(self.uid, [nid0], action_type, config)
                else:
                    result = ak_mine_action(depend, config)
                    store_to_cache(result, self.uid, [nid0], action_type, config)

            if action_type == 'AK_BROWSE':
                nid0, atype0, config0, input0 = itemgetter('ID','type','config','input')(inputs[0])
                depend, is_cached = self.execute(nid0, atype0, config0, input0)

                if isinstance(depend, ErrorResult):
                    return depend, False
                
                is_from_cache = is_cached and is_in_cache(self.uid, [nid0], action_type, config)
                if is_from_cache:
                    logger.info("Loading AK Browse result from cache")
                    result = read_from_cache(self.uid, [nid0], action_type, config)
                else:
                    result = ak_browse_action(depend, config)
                    store_to_cache(result, self.uid, [nid0], action_type, config)
        
            # Send action finished status over websocket
            self.send_action_status(nodeId, action_type, is_loading=False)

            if result == None:
                raise TypeError(action_type + " is not a recognized action.")           

            return result, is_from_cache
        except Exception as e:
            return ErrorResult(nodeId, action_type, e), False

    @log_it
    def terminate_loading(self, nodeId, action_type, inputs):
        """ Sets the isLoading status of a node and its parents as false
            
        Args:
            action_type: Action type to execute.
            nodeId: ID of the current node
            action_type: The type of node            
            inputs: Dependencies to of the current node.        
        """    

        # Send action running status over websocket
        self.send_action_status(nodeId, action_type, is_loading=False)

        # Run the appropriate action        
        if action_type == 'JOIN':
            if len(inputs) != 2:
                raise ValueError("Expected 2 inputs to join")

            nid0, atype0, config0, input0 = itemgetter('ID','type','config','input')(inputs[0])
            nid1, atype1, config1, input1 = itemgetter('ID','type','config','input')(inputs[1]) 
            self.terminate_loading(nid0, atype0, input0)
            self.terminate_loading(nid1, atype1, input1)            
            return None
                
        if action_type == 'LOAD_FILE':
            return None
                
        if action_type == 'CLEANSE':
            nid0, atype0, config0, input0 = itemgetter('ID','type','config','input')(inputs[0])
            self.terminate_loading(nid0, atype0, input0)
            return None
    
        if action_type == 'AK_MINE':
            nid0, atype0, config0, input0 = itemgetter('ID','type','config','input')(inputs[0])
            self.terminate_loading(nid0, atype0, input0)
            return None            

        if action_type == 'AK_BROWSE':
            nid0, atype0, config0, input0 = itemgetter('ID','type','config','input')(inputs[0])
            self.terminate_loading(nid0, atype0, input0)
            return None

        raise TypeError(action_type + " is not a recognized action.")

