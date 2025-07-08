import pandas as pd

from analyst.analyst_lite import AnalystLite
from actions.results import FPResult
from actions.results import MultiTargetAnalystResult

from ak_logger import logger, log_it


@log_it
def ak_browse_action(result, data=None, config=None):
    """ Runs the AKMiner with precomputed model. 

    Args:
        result: Result of the pattern miner.    
    
    Returns:
        browser results object.
    """
    
    if not isinstance(result, FPResult): 
        raise TypeError("result must be a BARLResult or FPResult instance.")

    mine_type = result.config['mineType']
    target = result.config['target']    
    browse_type = config['browseType']
    
    if data is None:  # default to training data
        data = result.train_df 

    if not isinstance(target, list):
        raise TypeError("target must be a list.")

    if len(target) < 1:
        raise TypeError("target have at least 1 attribute.")    

    if data is None:  # default to training data
        data = result.train_df
    
    patterns = result.process_patterns()

    if browse_type == 'card':
        return AnalystLite(data, target, mine_type=mine_type, patterns=patterns)    
        
    return MultiTargetAnalystResult(data, target, mine_type=mine_type, patterns=patterns)

