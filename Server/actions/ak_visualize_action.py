from actions.results import FileResult

from ak_logger import logger, log_it

@log_it
def ak_visualize_action(data, config=None):
    """ Forwards a dataset to the visualization action. 

    Args:
        config: Dict. containing sampling options for the data.

    Returns:
        file results object.
    """

    if 'options' not in config:
        raise ValueError("config must have 'options' key.")        

    if not isinstance(data, FileResult): 
        raise TypeError("result must be a FileResult.")

    return data

    
