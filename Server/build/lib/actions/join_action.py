import pandas as pd

from actions.results import FileResult
from dataframes.data import Data

from ak_logger import logger, log_it

@log_it
def join_action(left, right, config):
    """ Joins to dataframes on specified columns 
    and returns the result. 
    
    Args:
        left: Left dataframe to join.
        right: Right dataframe to join.
        config: Config object containing details of join.
    """
    if not isinstance(config, dict):
        raise TypeError("config must be a dictionary.")
    
    if 'how' not in config or 'join' not in config:
        raise ValueError("config must have 'how' and 'join' keys.")
    
    if not isinstance(config['join'], list):
        raise TypeError("join must be a list of columns to join on.")

    left_on, right_on = [list(e) for e in zip(*config['join'])]
    how = config['how']
    merge_df = Data.apply_merge(left.data(), right.data(),
                                left_on=left_on, right_on=right_on,
                                how=how)
    
    return FileResult('join_result', None, options=None, data=merge_df)

