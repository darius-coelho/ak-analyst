from os import supports_dir_fd
import pandas as pd

from actions.results import FileResult
from dataframes.data import Data, DataInMem

from ak_logger import logger, log_it

@log_it
def join_action(results, config):
    """ Joins to dataframes on specified columns 
    and returns the result. 
    
    Args:
        left: Left dataframe to join.
        right: Right dataframe to join.
        config: Config object containing details of join.
    """
    if not isinstance(config, dict):
        raise TypeError("config must be a dictionary.")
    
    if 'how' not in config or 'join' not in config or 'suffix' not in config:
        raise ValueError("config must have 'how', 'join', and 'suffix' keys.")
    
    if not isinstance(config['join'], list):
        raise TypeError("join must be a list of columns to join on.")

    on = list(map(list, zip(*config['join'])))
    how = config['how']

    suffix = config['suffix']
    
    # change to default suffix if invalid values provided
    if suffix == None or (suffix[0] == None and suffix[1] == None) or (suffix[0] == suffix[1]):
        raise ValueError("Invalid Suffix.")

    if all(isinstance(res.data, DataInMem) for res in results):
        merge_df = DataInMem.apply_multi_merge([res.data for res in results],
                                               on=on, how=how, suffix=suffix)
    else:
        merge_df = Data.apply_multi_merge([res.data for res in results],
                                          on=on, how=how, suffix=suffix)
    
    
    return FileResult('join_result', None, options=None, data=merge_df)

