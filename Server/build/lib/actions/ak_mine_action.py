import pandas as pd
import numpy as np

from ai_analyzer.lib.dataset import DataSet
from ai_analyzer.lib.miner import mine
from ai_analyzer.lib.config import Config
import ai_analyzer.lib.utils as utils

from actions.results import FPResult

from ak_logger import logger, log_it

class FPMiner:
    """ Class with reduced functionality of the AKMiner. It 
    performs pattern mining but not everything else required for 
    vizualization.
    """

    @log_it
    def __init__(self, df, dependent, mine_type='numeric', minsup=0.01,
                 es_thresh='auto', max_pattern=100, max_depth=None,
                 create_missing_attr=True,
                 license_path=None, lib_path=None, opt_bound=False,
                 fdr='fast', holdout=1):
        
        ''' Constructor for FPMiner class.
        
        Performs pattern mining.
        
        Args:
            df (dataframe): The dataset to mine.
            dependent (str): The dependent attribute.
            labels (dict): Mapping from numeric values back to category names.
            temporal (str): The attribute to be treated as a time variable.
            pattern_json (list): List of patterns to be shown instead of mining df.
            mine_type (str): The data type of the dependent attribute. 
                             Valid mine types are 'numeric' and 'binary'.
            minsup (float): The minimum size of a pattern as a percentage of the dataset size. 
            es_thresh (float): The minimum effect size for a pattern to 
                               be considered 'interesting'. The effect size is the common 
                               language effect size for numeric mine_type (default is 0.6)
                               and the odds ratio for binary mine_types (default is 2).
            max_pattern (int): Approx. max number of patterns to mine for.
            max_depth (int): Max depth of a pattern.
            create_missing_attr (bool): If true, creates is_missing attributes.
            min_stable (int): The number of consecutive time steps for which a pattern 
                              must be 'interesting' (i.e. effect size above es_thresh) to
                              be considered temporally consistent.
            ts_width (int): Width of the timestep. If ts_width = 1, then each unique value of
                            the temporal attribute is a timestep. If ts_width > 1, then 
                            each time step is a range.
            delay_attr (str): Attribute to delay on. If None, defaults to temporal.
            delay (list): List of integer offsets for delayed features.
            smooth (str): None or 'sma' for simple moving average smoothing.
            train_range (list): List of temporal ranges to be considered for training.
            show_causal (bool): If true, then causal analysis is performed and shown as 
                                directed green adn red edges in the graph view.
            causes_only (list): List of attributes that have no cause (e.g. ['sector']).
            license_path (str): Filepath to the license.txt library.
            lib_path (str): Filepath to the libdcm.so (libdcm.dll) shared library.
            fdr (str): False discovery rate method (fast or exhaustive)
            holdout (int): Number of holdout sets to test patterns against.            
            show_help (bool): If true, shows tutorial help prompts.
            causal_rule (str): Causal rule2 method (None, iptw, match).
            verbose (bool): If true, then verbose output is printed.                              
        '''

        if mine_type not in ['numeric', 'binary']:
            raise ValueError("Only regression and binary classification are supported.")
        
        self.config = Config(dependent, mine_type=mine_type,
                             minsup=minsup, es_thresh=es_thresh, opt_bound=opt_bound,
                             max_pattern=max_pattern, max_depth=max_depth,
                             create_missing_attr=create_missing_attr,
                             libpath=lib_path,fdr=fdr,
                             holdout=holdout)        

        self.dataset = DataSet(df, self.config)        
        self.config.labels = self.dataset.labels
        self.config.missing_cols = self.dataset.missing_cols
        self.patterns = mine(self.dataset, self.config)
        

        if not self.patterns:  # No patterns were found
            print("No groups were found")
            print("You can try modifying the following parameters:")
            print("1. Reducing the holdout parameter (e.g. holdout=1)")
            if mine_type == 'numeric':
                print("2. Reducing the effect size threshold (e.g. es_thresh=0.5)")
            else:
                print("2. Reducing the effect size threshold (e.g. es_thresh=1.0)")
                
            print("3. Lowering the minimum support for a group (e.g. minsup=0.005)")
            return None


    @log_it        
    def get_patterns(self):
        ''' Returns a list of pattern hyperboxes. '''
        return [p.hyperbox.copy() for p in self.patterns]

    @log_it
    def get_summary(self):
        ''' Returns a list of pattern hyperboxes. '''
        shape = self.dataset.shape
        patternSizes = [p.stats(self.dataset, self.config)['size_t'] for p in self.patterns]
        patternAttr = [len(p.hyperbox.copy().keys()) for p in self.patterns]
        return {           
            'itemCount': shape[0], 
            'featureCount': shape[1],
            'patternCount': len(self.patterns),
            'maxItems': 0 if len(patternSizes) == 0 else max(patternSizes),
            'minItems': 0 if len(patternSizes) == 0 else min(patternSizes),
            'maxAttr': 0 if len(patternAttr) == 0 else max(patternAttr),
            'minAttr': 0 if len(patternAttr) == 0 else min(patternAttr)
        }

    
@log_it
def ak_mine_action(data, config):
    """ Performs Akai Kaeru pattern miner and returns the result. 

    Args:
        config: Dict. containing name and file path info.
      
    Returns:
        Dataframe created from the file object.
    """
    if not isinstance(config, dict):
        raise TypeError("config must be a dictionary.")

    if 'target' not in config or 'mineType' not in config:
        raise ValueError("config must have 'target' and 'mineType' keys.")    

    target = config['target']
    mineType = config['mineType']
    maxPattern = 100
    threshold = 'auto'
    holdout = 1
    minsup = 0.01

    sample_options = config['options']
    mine_data = data.data()
    if sample_options['is_sample']:
        mine_data = mine_data.sample(sample_options['nsamples'])
    
    if 'maxPattern' in config:
        maxPattern = int(config['maxPattern'])
        
    if 'threshold' in config:
        threshold = float(config['threshold'])

    if 'holdout' in config:
        holdout = int(config['holdout'])
        
    if 'minsup' in config:
        minsup = float(config['minsup'])

    model = FPMiner(mine_data.to_pandas(), target,
                    mine_type=mineType,
                    max_pattern=maxPattern,
                    minsup=minsup,
                    es_thresh=threshold,
                    holdout=holdout)
    
    return FPResult(model, mine_data.to_pandas(), config)
    
