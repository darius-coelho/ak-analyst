import imp
from operator import itemgetter

import networkx as nx
from copy import deepcopy

from store.action_store import (is_in_cache, read_from_cache, store_to_cache,
                                does_action_cache_graph_exist, get_action_cache_graph,
                                create_action_cache_graph)

from actions.results import ErrorResult, FileResult, ModelResult, FileResultArray, EmptyResult
from actions.load_action import load_action
from actions.load_datalake_action import load_datalake_action
from actions.ak_cleanse_action import ak_cleanse_action
from actions.ak_aggregate_action import ak_aggregate_action
from actions.split_data_action import split_data_action
from actions.join_action import join_action
from actions.ak_mine_action import ak_mine_action, ak_mine_action_barl
from actions.sklearn_action import sklearn_fit_action, predict_action
from actions.ak_rolling_regression_action import ak_rolling_regression_action
from actions.ak_browse_action import ak_browse_action
from actions.ak_visualize_action import ak_visualize_action
from actions.ak_feature_explorer_action import ak_feature_explorer_action

from ak_logger import logger, log_it

class Action:
    """ Class which helps with action execution. """

    def __init__(self, uid, send_action_status, send_action_results):
        """ Constructor for the Action class. 
        
        Args:
            uid: Session user id.
            send_action_status: Function for sending messages to the front end.
        """

        # Dict mapping the action label to the execute function.
        self.execute_function = {
            'LOAD_FILE': self.execute_load_file,
            'LOAD_CLOUD': self.execute_load_cloud,
            'CLEANSE': self.execute_cleanse,
            'JOIN': self.execute_join,
            'AGGREGATE': self.execute_aggregate,
            'SPLITDATA': self.execute_split_data,
            'SKLEARN': self.execute_sklearn,
            'REGRESSION': self.execute_rolling_regression,
            'PREDICT': self.execute_predict,
            'AK_MINE': self.execute_ak_mine,
            'AK_BROWSE': self.execute_ak_browse,
            'AK_FEATURE_EXP': self.execute_ak_browse,
            'AK_CAUSAL': self.execute_ak_causal,
            'VISUALIZER': self.execute_visualizer,   
        }

        self.uid = uid
        self.send_action_status = send_action_status
        self.send_action_results = send_action_results

        # Graph mimicking the pipeline and its cache readiness status
        self.action_cache_graph = get_action_cache_graph(uid) \
                                  if does_action_cache_graph_exist(uid) \
                                  else create_action_cache_graph(uid) 

    @log_it
    def add_to_cache_graph(self, target, *args):
        """ Adds nodes / edges to the cache graph if they don't exist.

        Args:
            target: Target node to add
            args: Variable number of source nodes to add.
        """
        self.action_cache_graph.add_node(target, stale=False)
        
        for source in args:
            self.action_cache_graph.add_edge(source, target)

        for desc in nx.dfs_preorder_nodes(self.action_cache_graph, source=target):
            if desc == target:
                continue

            # invalidate the descendant caches
            self.action_cache_graph.nodes[desc]['stale'] = True

    @log_it
    def is_cache_fresh(self, nodeId):
        """ Returns true if nodeId is fresh and false o.w. """
        return self.action_cache_graph.has_node(nodeId) \
            and not self.action_cache_graph.nodes[nodeId]['stale']

    @log_it
    def execute_load_file(self, nodeId, action_type, config, inputs, port, cache_id):
        """ executes a LOAD_FILE node. """
        is_from_cache = self.is_cache_fresh(nodeId) \
                                and is_in_cache(cache_id, [], ["NA"], action_type, config)

        result = None
        
        if is_from_cache:
            logger.info("Loading File from cache")
            result = read_from_cache(cache_id, [], ["NA"], action_type, config)
        else:
            result = load_action(deepcopy(config))
            store_to_cache(result, cache_id, [], ["NA"], action_type, config)
            self.add_to_cache_graph(nodeId)
        
        return result, is_from_cache 

    @log_it
    def execute_load_cloud(self, nodeId, action_type, config, inputs, port, cache_id):
        """ executes a LOAD_CLOUD node. """
        is_from_cache = self.is_cache_fresh(nodeId) \
                                and is_in_cache(cache_id, [], ["NA"], action_type, config)

        result = None

        if is_from_cache:
            logger.info("Loading File from cache")
            result = read_from_cache(cache_id, [], ["NA"], action_type, config)
        else:
            result = load_datalake_action(deepcopy(config), nodeId)
            store_to_cache(result, cache_id, [], ["NA"], action_type, config)
            self.add_to_cache_graph(nodeId)
        
        return result, is_from_cache 

    @log_it
    def execute_cleanse(self, nodeId, action_type, config, inputs, port, cache_id):
        """ executes a CLEANSE node. """
        nid0, atype0, config0, input0, port0 = itemgetter('ID','type','config','input', 'outPort')(inputs[0])
        depend, is_cached = self.execute(nid0, atype0, config0, input0, port0)
        
        if isinstance(depend, ErrorResult):
            return depend, False

        result = None
        is_from_cache = is_cached and self.is_cache_fresh(nodeId) \
                        and is_in_cache(cache_id, [nid0], [port0], action_type, config)

        if is_from_cache:
            logger.info("Loading Cleanse result from cache")
            result = read_from_cache(cache_id, [nid0], [port0], action_type, config)
        else:
            result = ak_cleanse_action(depend, config)
            store_to_cache(result, cache_id, [nid0], [port0], action_type, config)
            self.add_to_cache_graph(nodeId, nid0)

            
        return result, is_from_cache 

    @log_it
    def execute_aggregate(self, nodeId, action_type, config, inputs, port, cache_id):
        """ executes a AGGREGATE node. """
        nid0, atype0, config0, input0, port0 = itemgetter('ID','type','config','input', 'outPort')(inputs[0])
        depend, is_cached = self.execute(nid0, atype0, config0, input0, port0)

        if isinstance(depend, ErrorResult):
            return depend, False

        is_from_cache = is_cached and self.is_cache_fresh(nodeId) \
                        and is_in_cache(cache_id, [nid0], [port0], action_type, config)

        result = None

        if is_from_cache:                
            logger.info("Loading Aggregate result from cache")
            result = read_from_cache(cache_id, [nid0], [port0], action_type, config)
        else:
            result = ak_aggregate_action(depend, config)
            store_to_cache(result, cache_id, [nid0], [port0], action_type, config)
            self.add_to_cache_graph(nodeId, nid0)

        return result, is_from_cache 

    @log_it
    def execute_join(self, nodeId, action_type, config, inputs, port, cache_id):
        """ executes a JOIN node. """
        if len(inputs) < 2:
            raise ValueError("Expected 2 inputs to join")

        pred_results = []
        pred_ids = []
        pred_ports = []
        is_from_cache = True
        
        for iput in inputs:
            nid0, atype0, config0, input0, port0 = itemgetter('ID','type','config','input', 'outPort')(iput)
            data, is_cached = self.execute(nid0, atype0, config0, input0, port0)
            if isinstance(data, ErrorResult):
                return data, False
            
            pred_results.append(data)
            pred_ids.append(nid0)
            pred_ports.append(port0)
            
            is_from_cache = is_from_cache and is_cached
            
        result = None

        is_from_cache = is_from_cache \
                        and self.is_cache_fresh(nodeId) \
                        and is_in_cache(cache_id, pred_ids, pred_ports, action_type, config)
        
        if is_from_cache:
            logger.info("Loading Join from cache")
            result = read_from_cache(cache_id, pred_ids, pred_ports, action_type, config)
        else:
            result = join_action(pred_results, config)
            store_to_cache(result, cache_id, pred_ids, pred_ports, action_type, config)
            self.add_to_cache_graph(nodeId, *pred_ids)

        return result, is_from_cache 

    @log_it
    def execute_split_data(self, nodeId, action_type, config, inputs, port, cache_id):
        """ executes a SPLIT_DATA node. """
        nid0, atype0, config0, input0, port0 = itemgetter('ID','type','config','input', 'outPort')(inputs[0])
        depend, is_cached = self.execute(nid0, atype0, config0, input0, port0)        

        if isinstance(depend, ErrorResult):
            return depend, False

        is_from_cache = is_cached and self.is_cache_fresh(nodeId) \
                        and is_in_cache(cache_id, [nid0], [port0], action_type, config)
                    
        result = None

        if is_from_cache:                
            logger.info("Loading Split Data result from cache")
            result = read_from_cache(cache_id, [nid0], [port0], action_type, config)
        else:
            result = split_data_action(depend, config)
            store_to_cache(result, cache_id, [nid0], [port0], action_type, config)
            self.add_to_cache_graph(nodeId, nid0)
        
        return result, is_from_cache
    
    @log_it
    def execute_sklearn(self, nodeId, action_type, config, inputs, port, cache_id):
        """ executes a SKLEARN node. """
        nid0, atype0, config0, input0, port0 = itemgetter('ID','type','config','input', 'outPort')(inputs[0])
        depend, is_cached = self.execute(nid0, atype0, config0, input0, port0)

        if isinstance(depend, ErrorResult):
            return depend, False

        result = None

        is_from_cache = is_cached and self.is_cache_fresh(nodeId) \
                        and is_in_cache(cache_id, [nid0], [port0], action_type, config)
        if is_from_cache:
            logger.info("Loading sklearn result from cache")
            result = read_from_cache(cache_id, [nid0], [port0], action_type, config)
        else:
            result = sklearn_fit_action(depend, config)

            # Need to store this in RAM because of difficulties in picling lambda functions
            # that may occur in the statsmodels api.
            store_to_cache(result, cache_id, [nid0], [port0], action_type, config, to_disk=False)
            self.add_to_cache_graph(nodeId, nid0)

        return result, is_from_cache 

    @log_it
    def execute_predict(self, nodeId, action_type, config, inputs, port, cache_id):
        """ executes a predict action node. """
        nid0, atype0, config0, input0, port0 = itemgetter('ID','type','config','input', 'outPort')(inputs[0])
        nid1, atype1, config1, input1, port1 = itemgetter('ID','type','config','input', 'outPort')(inputs[1])
        
        file_result, is_file_cached = self.execute(nid0, atype0, config0, input0, port0)
        
        if isinstance(file_result, ErrorResult):
            return file_result, False

        
        model_result, is_model_cached = self.execute(nid1, atype1, config1, input1, port1)

        if isinstance(model_result, ErrorResult):
            return model_result, False

        if atype0 == 'SKLEARN':  # swap the results
            file_result, model_result = model_result, file_result
            is_file_cached, is_model_cached = is_model_cached, is_file_cached

        # sanity checks
        assert isinstance(model_result, ModelResult)
        assert isinstance(file_result, FileResult)

        result = None

        is_from_cache = is_model_cached and is_file_cached and self.is_cache_fresh(nodeId) \
                        and is_in_cache(cache_id, [nid0, nid1], [port0, port1],
                                        action_type, config)
        
        if is_from_cache:
            logger.info("Loading sklearn result from cache")
            result = read_from_cache(cache_id, [nid0, nid1], [port0, port1], action_type, config)
        else:
            result = predict_action(model_result, file_result, config)
            store_to_cache(result, cache_id, [nid0, nid1], [port0, port1], action_type, config)
            self.add_to_cache_graph(nodeId, nid0, nid1)

        return result, is_from_cache 

    @log_it
    def execute_rolling_regression(self, nodeId, action_type, config, inputs, port, cache_id):
        """ executes a REGRESSION node. """
        nid0, atype0, config0, input0, port0 = itemgetter('ID','type','config','input', 'outPort')(inputs[0])
        depend, is_cached = self.execute(nid0, atype0, config0, input0, port0)

        if isinstance(depend, ErrorResult):
            return depend, False

        result = None

        is_from_cache = is_cached and self.is_cache_fresh(nodeId) \
                        and is_in_cache(cache_id, [nid0], [port0], action_type, config)
        if is_from_cache:
            logger.info("Loading AK Mine result from cache")
            result = read_from_cache(cache_id, [nid0], [port0], action_type, config)
        else:
            result = ak_rolling_regression_action(depend, config)
            store_to_cache(result, cache_id, [nid0], [port0], action_type, config)
            self.add_to_cache_graph(nodeId, nid0)

        return result, is_from_cache 
    
    @log_it
    def execute_ak_mine(self, nodeId, action_type, config, inputs, port, cache_id):
        """ executes a AK_MINE node. """
        nid0, atype0, config0, input0, port0 = itemgetter('ID','type','config','input', 'outPort')(inputs[0])
        depend, is_cached = self.execute(nid0, atype0, config0, input0, port0)        

        if isinstance(depend, ErrorResult):
            return depend, False

        is_from_cache = is_cached and self.is_cache_fresh(nodeId) \
                        and is_in_cache(cache_id, [nid0], [port0], action_type, config)
        result = None
        if is_from_cache:
            logger.info("Loading AK Mine result from cache")
            result = read_from_cache(cache_id, [nid0], [port0], action_type, config)
        else:
            result = ak_mine_action(depend, config)
            store_to_cache(result, cache_id, [nid0], [port0], action_type, config)
            self.add_to_cache_graph(nodeId, nid0)
        
        return result, is_from_cache 

    @log_it
    def execute_ak_causal(self, nodeId, action_type, config, inputs, port, cache_id):
        """ executes a AK_CAUSAL node. """
        return EmptyResult(), False
        

    @log_it
    def execute_ak_browse(self, nodeId, action_type, config, inputs, port, cache_id):
        """ executes a AK_BROWSE node. """
        
        nid0, atype0, config0, input0, port0 = itemgetter('ID','type','config','input', 'outPort')(inputs[0])
        
        mine_result, is_mine_cached = self.execute(nid0, atype0, config0, input0, port0)

        if isinstance(mine_result, ErrorResult):
            return mine_result, False

        
        result = None
        data = None

        nid1 = -1
        port1 = -1
        is_cached = is_mine_cached
        if len(inputs) == 2:
            nid1, atype1, config1, input1, port1 = itemgetter('ID','type','config',
                                                              'input', 'outPort')(inputs[1])

            file_result, is_file_cached = self.execute(nid1, atype1, config1, input1, port1)
            if isinstance(file_result, ErrorResult):
                return file_result, False

            if atype1 == 'AK_MINE':  # swap the results
                mine_result, file_result = file_result, mine_result
                is_mine_cached, is_file_cached = is_file_cached, is_mine_cached

            is_cached = is_mine_cached and is_file_cached
            data = file_result.data
            
        
        is_from_cache = is_cached and self.is_cache_fresh(nodeId) \
                        and is_in_cache(cache_id, [nid0, nid1], [port0, port1], action_type, config)
        if is_from_cache:
            logger.info(f"Loading {action_type} result from cache")
            result = read_from_cache(cache_id, [nid0, nid1], [port0, port1], action_type, config)
        else:
            result = ak_browse_action(mine_result, data, config) if action_type == 'AK_BROWSE' \
                     else ak_feature_explorer_action(mine_result, data, config)
            
            store_to_cache(result, cache_id, [nid0, nid1], [port0, port1], action_type, config)
            self.add_to_cache_graph(nodeId, nid0, nid1)

        return result, is_from_cache 

    @log_it
    def execute_visualizer(self, nodeId, action_type, config, inputs, port, cache_id):
        """ executes a VISUALIZER node. """
        nid0, atype0, config0, input0, port0 = itemgetter('ID','type','config','input', 'outPort')(inputs[0])
        depend, is_cached = self.execute(nid0, atype0, config0, input0, port0)
        
        if isinstance(depend, ErrorResult):
            return depend, False

        result = None
                
        is_from_cache = is_cached and self.is_cache_fresh(nodeId) \
                        and is_in_cache(cache_id, [nid0], [port0], action_type, config)
        if is_from_cache:
            logger.info("Loading AK Visualize result from cache")
            result = read_from_cache(cache_id, [nid0], [port0], action_type, config)
        else:
            result = ak_visualize_action(depend, config)
            store_to_cache(result, cache_id, [nid0], [port0], action_type, config)
            self.add_to_cache_graph(nodeId, nid0)

        return result, is_from_cache   


    @log_it
    def execute(self, nodeId, action_type, config, inputs, port=None):
        """ Executes the specified action and its dependences.
            
        Args:
            action_type: Action type to execute.
            nodeId: ID of the current node
            action_type: The type of node
            config: configuration object.
            inputs: Dependencies to execute.
            port: The output port for the current node.

        Returns: 
            The result of the action, and a flag indicating if the
            result was from cache.
        """
        try:
            # Send action running status over websocket
            self.send_action_status(nodeId, action_type, is_loading=True)
            cache_id = f'{self.uid}-{nodeId}'
            
            # indicates if result is from cache
            is_from_cache = False
            
            # Run the appropriate action
            result, is_from_cache = self.execute_function[action_type](nodeId, action_type, config, inputs, port, cache_id)
                
            # Send action finished status over websocket
            self.send_action_status(nodeId, action_type, is_loading=False)
            
            if result == None:
                raise TypeError(action_type + " is not a recognized action.")

            # Send action finished status over websocket
            self.send_action_results(nodeId, action_type, result.response())
            
            # if the result is a FileArray and the port is set  
            # then it is being run as an intermediate node  
            # hence the port output has to be forwared to the next node
            if port is not None and isinstance(result, FileResultArray):
                return result.get_file_result(port), is_from_cache
            
            return result, is_from_cache
        
        except Exception as e:
            if isinstance(e, ErrorResult):
                return e, False
            
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
        if action_type in ['PREDICT']:
            if len(inputs) != 2:
                raise ValueError("Expected 2 inputs")

            nid0, atype0, config0, input0, port0 = itemgetter('ID','type','config','input', 'outPort')(inputs[0])
            nid1, atype1, config1, input1 = itemgetter('ID','type','config','input')(inputs[1]) 
            self.terminate_loading(nid0, atype0, input0)
            self.terminate_loading(nid1, atype1, input1)
            return None
                
        if action_type == 'LOAD_FILE' or action_type == 'LOAD_CLOUD':
            return None
                
        if action_type in ['CLEANSE', 'AGGREGATE', 'SPLITDATA', 'AK_MINE', 'SKLEARN', 'REGRESSION', 'AK_BROWSE', 'VISUALIZER', 'JOIN']:
            nid0, atype0, config0, input0, port0 = itemgetter('ID','type','config','input', 'outPort')(inputs[0])
            self.terminate_loading(nid0, atype0, input0)
            return None

        raise TypeError(action_type + " is not a recognized action.")

