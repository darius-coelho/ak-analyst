from io import BytesIO
from werkzeug.datastructures import FileStorage

import pandas as pd

from actions.results import FileResult

from transformer.data_transformer import AKDataTransformer
from ak_logger import logger, log_it

@log_it
def ak_cleanse_action(data, config):
    """ Runs the AKTransformer and applies transfroms if any. 

    Args:
        data: FileResult contaning the input AKDataframe
        config: Dict. containing transfroms.           
    
    Returns:
        A transformed/cleaned AkDataFrame.
    """
    if not isinstance(config, dict):
        raise TypeError("config must be a dictionary.")

    data = data.data
    transforms = config['transformations']    
    deleted = config['deleted']

    df = AKDataTransformer.get_transformed_data(data, transforms, deleted)    
    return  FileResult("CleansedData", None, options=None, data=df)
