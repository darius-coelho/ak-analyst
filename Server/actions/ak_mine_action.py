import pandas as pd
import numpy as np

from ai_analyzer.lib.dataset import DataSet
from ai_analyzer.lib.miner import mine
from ai_analyzer.lib.config import Config
import ai_analyzer.lib.utils as utils

from ai_analyzer.lib.bayesian.barl import BARLRegressor, BARLClassifier
from actions.results import FPResult

from ak_logger import logger, log_it

class FPMiner:
    """ Class with reduced functionality of the AKMiner. It 
    performs pattern mining but not everything else required for 
    vizualization.
    """

    @log_it
    def __init__(self, df, dependent, mine_type='numeric', minsup=0.01,
                 es_thresh='auto', alpha=0.05, max_pattern=100, max_depth=None,
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
            alpha (float): P-value significance level.
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

        self.target = dependent
        self.config = Config(dependent, mine_type=mine_type,
                             minsup=minsup, es_thresh=es_thresh, alpha=alpha,
                             opt_bound=opt_bound,
                             max_pattern=max_pattern, max_depth=max_depth,
                             create_missing_attr=create_missing_attr,
                             libpath=lib_path,fdr=fdr,
                             holdout=holdout)        

        self.dataset = DataSet(df, self.config)        
        self.config.labels = self.dataset.labels
        self.config.missing_cols = self.dataset.missing_cols
        self.patterns = mine(self.dataset, self.config)
        if len(self.patterns) > max_pattern:
            self.patterns = self.patterns[:max_pattern]
        

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


class BARLMiner:
    def __init__(self, data, dependent, mine_type, m=10, niter=1000,
                 nburn=250, npatterns=50, types=None):
        """ Constructor for the BARLMiner class. 

        Args:
            df (dataframe): The dataset to mine.
            dependent (str): The dependent attribute.
            mine_type (str): Data type of the dependent attribute.
            m (int): Number of rules.
            niter (int): Number of iterations.
            nburn (int): Number of burn-in iterations.
            npatterns (int): Number of patterns to sample.            
            types: Dict. mapping columns to data types.
        """
        BARL = BARLRegressor if mine_type == 'numeric' else BARLClassifier
        self.model = BARL(m=m, niter=niter, nburn=nburn, n_jobs=-1)
        self.X = data.drop([dependent], axis=1)
        self.y = data[dependent]

        self.target = dependent
        self.model.fit(self.X, self.y, types=types)

        self.npatterns = npatterns
        self.sample_patterns()
        
        self.model.shutdown()  # shutdown the ray instance
        
    def sample_patterns(self, interactions=None):
        """ Samples a number of patterns from the model's trace.
        
        Args:
            interactions (list): List of feature interactions to sample.
        """
        if interactions is not None:
            # convert interactions from string to col index
            interactions = [[self.X.columns.get_loc(c) for c in inter] for inter in interactions]
        
        self.rule_sample = self.model.sample_trace(self.npatterns, interactions)
        
        
    def feature_scores(self):
        """ Returns the feature scores as a dictionary. """
        scores = self.model.feature_scores_total(normalize=True)
        return [[[self.X.columns[c] for c in s[0]], s[1]] for s in scores]
        
    def get_patterns(self):
        """ Returns a s list of pattern hyperboxes. """
        return [{self.X.columns[k]: v for k, v in r.rule.items()} for r in self.rule_sample]
        
    
    def get_summary(self):
        """ Returns a summary of the mined patterns. """
        shape = self.X.shape
        patternSizes = [int(sum(r.data_index(self.X.values))) for r in self.rule_sample]
        patternAttr = [len(r.rule) for r in self.rule_sample]
        return {           
            'itemCount': shape[0], 
            'featureCount': shape[1],
            'patternCount': len(self.rule_sample),
            'maxItems': max(patternSizes),
            'minItems': min(patternSizes),
            'maxAttr': max(patternAttr),
            'minAttr': min(patternAttr)
        }

def __combine_targets(mdata, targets):
    """ Combines the target attributes into a single derived attribute. 

    Args:
        mdata: Pandas dataframe containing predictors and targets.
        targets: List of target attribute names.

    Returns:
        A tuple with (Updated dataframe, the new 1-D mine target name).
    """
    # get the derived target
    derived = ((mdata[targets] - mdata[targets].mean()) / mdata[targets].std()).sum(axis=1)
        
    new_target = '_'+'_'.join(targets)+'_'
    mdata[new_target] = derived
    return mdata.drop(targets, axis=1), new_target

    
@log_it
def ak_mine_action_barl(data, config):
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

    sample_options = config['options']
    mine_data = data.data

    if sample_options['is_sample']:
        mine_data = mine_data.sample(sample_options['nsamples'])

    m = int(config['nmodels']) if 'nmodels' in config else 15
    niter = int(config['niter']) if 'niter' in config else 500
    nburn = int(config['nburn']) if 'nburn' in config else 100
    npatterns = int(config['maxPattern']) if 'maxPattern' in config else 50

    target = config['target']

    mdata = mine_data.to_pandas(replaceOrdering=True)

    if len(target) > 1:  # multi target mining
        mdata, target = __combine_targets(mdata, target)
    else:
        target = target[0]

    model = BARLMiner(mdata, target, config['mineType'],
                      m, niter, nburn, npatterns, types=mine_data.types)
    
    return FPResult(model, mine_data, config)

@log_it
def ak_mine_action_fp(data, config):
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
    alpha = 0.05
    minsup = 0.01
    fdr = 'fast'
    
    sample_options = config['options']
    mine_data = data.data
    if sample_options['is_sample']:
        mine_data = mine_data.sample(sample_options['nsamples'])
    
    if 'maxPattern' in config:
        maxPattern = int(config['maxPattern'])
        
    if 'threshold' in config:
        threshold = float(config['threshold'])

    if 'alpha' in config:
        alpha = float(config['alpha'])
        
    if 'holdout' in config:
        holdout = int(config['holdout'])
        
    if 'minsup' in config:
        minsup = float(config['minsup'])

    if 'fdr' in config:
        fdr = config['fdr']
        
    mdata = mine_data.to_pandas(replaceOrdering=True)

    if len(target) > 1:  # multi target mining        
        mdata, target = __combine_targets(mdata, target)
    else:
        target = target[0]

    model = FPMiner(mdata, target,
                    mine_type=mineType,
                    max_pattern=maxPattern,
                    minsup=minsup,
                    es_thresh=threshold,
                    alpha=alpha,
                    fdr=fdr,
                    holdout=holdout)
    
    return FPResult(model, mine_data, config)
    
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

    if not isinstance(config['target'], list):
        raise TypeError("target must be a list.")

    if len(config['target']) < 1:
        raise TypeError("target jhave at least 1 attribute.")    

    if config['method'] == "fpminer":
        return ak_mine_action_fp(data, config)

    assert config['method'] == "bayesian", "Method must be fpminer or bayesian"  # sanity check
    return ak_mine_action_barl(data, config)
