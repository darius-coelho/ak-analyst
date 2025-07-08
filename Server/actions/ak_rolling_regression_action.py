import pandas as pd
import numpy as np

from actions.results import FileResult
from predictive.rolling_ols import AKRollingOLS

from ak_logger import logger, log_it

    
@log_it
def ak_rolling_regression_action(data, config):
    """ Performs rolling linear regression and returns the result. 

    Args:
        config: Dict. containing the target, predictor, window size, 
                confidence interval, feature selection flag.
      
    Returns:
        Dataframe created from the file object.
    """
    if not isinstance(config, dict):
        raise TypeError("config must be a dictionary.")

    if 'target' not in config:
        raise ValueError("config must have 'target' key.")    

    target = config['target']
    predictors = config['predictors']
    windowSize = config['windowSize']
    ci = config['confidInterval']
    featureSel = config['featureSel']
    

    sample_options = config['options']
    regress_data = data.data
    if sample_options['is_sample']:
        regress_data = regress_data.sample(sample_options['nsamples'])
        

    model = AKRollingOLS(regress_data, target, predictors=predictors, window=windowSize, ci=ci, featureSel=featureSel)
    model.fit_rolling_model()
    result = model.get_results()

    return FileResult("RegressedData", None, options=None, data=result)
    
