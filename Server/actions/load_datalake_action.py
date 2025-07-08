from io import BytesIO
from werkzeug.datastructures import FileStorage

import pandas as pd
import dask.dataframe as dd

from minio import Minio
from minio.error import S3Error

from dataframes.data import Data
from actions.results import FileResult, ErrorResult, CloudFileResult

from ak_logger import logger, log_it


@log_it
def load_datalake_action(file_info, nodeId):
    """ Loads the file into a dataframe. 
    
    Args:
        file_info: Dict. containing name and file path info.
      
    Returns:
        Dataframe created from the file object.
    """
    if not isinstance(file_info, dict):
        raise TypeError("file_info must be a dictionary.")    

    try:
        ip_addr = file_info['ipAddr']
        uname = file_info['uname']
        bucket = file_info['bucket']
        secret_key = file_info['secretKey']
        filename = file_info['filepath']
        options = file_info['options']

        return CloudFileResult(ip_addr, bucket, filename, uname, 
                               secret_key, options, in_mem=file_info['inMemory'])
    except Exception as e:
        raise ErrorResult(nodeId, 'LOAD_CLOUD', e, file_info)

        
