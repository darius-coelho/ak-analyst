
from actions.results import FPResult
from ak_logger import logger, log_it

class FEResult:
    """ Contains necessary info for feature explorer action. """
    def __init__(self, result, data):
        self.result = result
        self.data = data
        
    def response(self):
        return {'scores': self.result.model.feature_scores()}
    

def ak_feature_explorer_action(result, data=None, config=None):
    """ Creates the interface for the feature explorer. 

    Args:
        result: Result of the pattern miner.    
    
    Returns:
        feature explorer results object.
    """
    if not isinstance(result, FPResult): 
        raise TypeError("result must be a FPResult instance.")

    if data is None:
        data = result.train_df
        
    return FEResult(result, data)
    
    
