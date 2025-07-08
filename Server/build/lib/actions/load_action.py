from io import BytesIO
from werkzeug.datastructures import FileStorage

import pandas as pd

from actions.results import FileResult

from ak_logger import logger, log_it

@log_it
def load_action(file_info):
    """ Loads the file into a dataframe. 
    
    Args:
        file_info: Dict. containing name and file path info.
      
    Returns:
        Dataframe created from the file object.
    """
    if not isinstance(file_info, dict):
        raise TypeError("file_info must be a dictionary.")

    last_modified = file_info['lastModified'] if 'lastModified' in file_info else None    
    return FileResult(file_info['name'], file_info['path'],
                      file_info['options'], last_modified=last_modified)
        
