from actions.results import FileResult, FileResultArray

from ak_logger import logger, log_it

@log_it
def split_data_action(data, config):
    """ Splits a data table into two parts. 

    Args:
        data: FileResult contaning the input AKDataframe
        config: Dict. containing split parameters.           
    
    Returns:
        A transformed/cleaned AkDataFrame.
    """
    if not isinstance(config, dict):
        raise TypeError("config must be a dictionary.")

    data = data.data
    sizeType = config['sizeType']    
    sizeValue = float(config['sizeValue'])
    method = config['method']

    df1, df2 = data.split_data(sizeType, sizeValue, method)

    file_results = FileResultArray("SplitData", [
        FileResult("SplitData1", None, options=None, data=df1),
        FileResult("SplitData2", None, options=None, data=df2)
    ])
    
    return  file_results
