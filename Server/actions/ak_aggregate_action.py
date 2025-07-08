from actions.results import FileResult

from ak_logger import logger, log_it

@log_it
def ak_aggregate_action(data, config):
    """ Runs the aggregation function on a dataset. 

    Args:
        data: FileResult contaning the input AKDataframe
        config: Dict. the aggregation parameters 
                - key attribute and agg functions for other attributes.           
    
    Returns:
        An aggregated AkDataFrame.
    """
    if not isinstance(config, dict):
        raise TypeError("config must be a dictionary.")

    data = data.data
    key_attr = config['aggKey'] 
    agg_map = config['aggMap'].copy()
    
    df = data.aggregate_by_index(key_attr, agg_map)

    return  FileResult("AggregatedData", None, options=None, data=df)
