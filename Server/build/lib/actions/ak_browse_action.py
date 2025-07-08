import pandas as pd

from analyst.pattern_analyst import AKMiner

from actions.results import FPResult#, BARLResult

from ak_logger import logger, log_it

@log_it
def ak_browse_action(result, config=None):
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
    df = result.train_df

    X = df.drop([target], axis=1)
    columns = X.columns

    patterns = result.model.get_patterns()    
    return AKMiner(df, target, mine_type=mine_type, pattern_json=patterns)
    
