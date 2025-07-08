import os
import sys
import json

import logging
import logging.config
import pathlib
import threading
import numbers
import time

import pandas as pd
import numpy as np
import networkx as nx



from ai_analyzer.lib.dataset import DataSet
from ai_analyzer.lib.plot import trie_encoding
from ai_analyzer.lib import utils
from ai_analyzer.lib.config import Config 
from ai_analyzer.lib.miner import mine, calculate_migrations
from ai_analyzer.lib.pattern import Pattern

from ai_analyzer.lib.sanitize import sanitize_pattern_json

from ak_logger import logger, log_it


@log_it
def _membership_status(dataset, patterns):
    ''' Computes the membership status of dataset in patterns.
        
    Args: 
        dataset (DataSet): Dataset.
        patterns (list): List of pattern objects.

    Returns:
        binary matrix (1=in, 0=out) with columns representing patterns.
    '''
    npatterns = len(patterns)

    group_status = np.zeros((dataset.shape[0], npatterns), dtype=np.uint8)
    index = dataset.index
    
    for pid, p in enumerate(patterns):
        rows = [index.get_loc(idx) for idx in p.pattern_df(dataset).index]
        group_status[rows, pid] = 1

    return group_status

@log_it
def _scatterplot(dataset, attributes, samples=None):
    rdf = dataset.raw_dataframe()
    if samples is None:
        return {attr: rdf[attr].tolist() for attr in attributes}
    
    return {attr: rdf[attr].values[samples].tolist() for attr in attributes}

@log_it
def _attribute_equivalence(df, seed_attr, thresh=0.5):
    ''' Uses correlation to determine attributes equivalent to 
    the list of seed_attr.

    Args:
        df (dataframe): Dataframe used to determine equivalance.
        seed_attr (list): List of attributes to find equivalences for. 
        thresh (float): Correlation threshold for determining equivalence.

    Returns:
        List of attributes.
    '''
    cmat = df.corr(method='spearman')
    row_idx, _ = np.where(cmat[seed_attr].abs()>thresh)
    return set(list(cmat.iloc[row_idx].index) + list(seed_attr))
    
        
@log_it
def layout(dataset, config, patterns_cnf_list):
    ''' Layout nodes and attributes together.

    Returns:
        Dictionary containing nodes, attributes, and links and
        detail info for patterns.
    '''
    dependent = config.dependent
    attributes = list(set([cnf['attribute'] for p in patterns_cnf_list for cnf in p]))
    
    nattr = len(attributes)
    nnodes = len(patterns_cnf_list)
    
    spring_edges = [(i, nnodes+attributes.index(cnf['attribute']),
                     {'weight': 2.0 / float(rnk+1)}) \
                    for i, p in enumerate(patterns_cnf_list) \
                    for rnk, cnf in enumerate(p)]
        
    G = nx.Graph()
    G.add_nodes_from(range(nnodes+nattr))
    G.add_edges_from(spring_edges)
    
    pos = nx.spring_layout(G, weight='weight')
    pos = np.array([pos[k] for k in range(nnodes+nattr)])
    
    # normalize to between 0 and 1
    pos = (pos - pos.min(axis=0)) / (pos.max(axis=0) - pos.min(axis=0))
    
    # pattern nodes
    pnodes = [{'coord': pos[pid].tolist(),
               'attr': [attributes.index(c['attribute']) for c in p]} \
              for pid, p in enumerate(patterns_cnf_list)]
        
    corr = dataset.raw_dataframe().corr()[dependent]
    
    # attribute nodes
    anodes = [{'coord': pos[aid+nnodes].tolist(), 'name': attr, 'rho': corr[attr]} \
              for aid, attr in enumerate(attributes)]
    
    return {'nodes': pnodes, 'attr': anodes}

@log_it
def _select_base(dataset, attribute):
    ''' Select a good base to round to for histogram bins. '''
    vec = dataset.raw_dataframe()[attribute]
    extent = vec.max() - vec.min()

    return extent / 11

    
@log_it
def _pattern_stats(dataset, config, patterns, ts):
    ''' Gets the pattern stats for specific timestep. 
    
    Args: 
        dataset (DataSet): Dataset.
        config (Config): Config object.
        patterns (List): List of selected patterns.
        ts (int): Timestep to get stats for.

    Returns:
        List of dicts. containing json serializable stats.
    '''    
    # apply timestep context
    context = config.ith_temporal_context(ts)
    dataset.apply_context(context)

    pattern_stats = [{'ID': p.ID,
                      **p.stats(dataset, config),                    
                      **{'conf_list': p.confidence_list(dataset, config)},
                      **trie_encoding(p, dataset, config)} \
                     for p in patterns]
    
    dataset.clear_context()  # reset context
    return pattern_stats

@log_it
def _odds_ratios(dataset, config, patterns):
    # apply timestep context
    i = 0
    context = config.ith_temporal_context(i)
    dataset.apply_context(context)
    
    while dataset.is_feasible():
        

        i = i + 1
        context = config.ith_temporal_context(i)
        dataset.apply_context(context)
        
    dataset.clear_context()


@log_it
def _summarize(dataset, config, include_kde=True):
    ''' Summarize the target attribute of the dataset. 

    Args:
        dataset (DataSet): Class containing dataset.
        config (Config): Config object.
        include_kde (Bool): Includes density estimate if true.

    Return:
        List of summary for each timestep. 
        (singleton list if not a temporal dataset).
        List of averages for each timestep.
    '''
    def get_value(t):
        ''' Compute standard error from statistics. '''
        if config.mine_type == 'numeric':
            return {'val': t['mu'], 'stderr': t['sig'] / np.sqrt(t['size'])}

        if config.mine_type == 'multiclass':
            return {c: {'val': p, 'stderr': np.sqrt((p * (1.0 - p)) / t['size'])}\
                    for c, p in enumerate(t['prob'])}
            
        assert config.mine_type == 'binary'
        p = t['prob']        
        return {'val': p, 'stderr': np.sqrt((p * (1.0 - p)) / t['size'])}

    
    dependent = config.dependent
    
    summary = []

    base = _select_base(dataset, dependent)
    bins = 11 if config.mine_type == "numeric" else 2
    
    i = 0
    context = config.ith_temporal_context(i)
    dataset.apply_context(context)

    timeseries = []
    while dataset.is_feasible():
        if config.mine_type == 'numeric':
            summary_t = dataset.summary_num(dependent)
            if include_kde:
                summary_t['kde'] = dataset.density_estimate(dependent)
            else:
                summary_t['hist'] = dataset.histogram(dependent, base=base, bins=bins)
                bins = summary_t['hist']['bin_edges']
                
        elif config.mine_type == 'multiclass':
            assert hasattr(config, 'nclass')  # sanity check
            summary_t = dataset.summary_multiclass(dependent, config.nclass)            
        else:
            assert config.mine_type == 'binary'
            summary_t = dataset.summary_bin(dependent)
            summary_t['hist'] = dataset.histogram(dependent, bins=bins)
            bins = summary_t['hist']['bin_edges']
            
        timeseries.append(get_value(summary_t))
        summary.append(summary_t)

        
        i = i + 1
        context = config.ith_temporal_context(i)
        dataset.apply_context(context)
    
    dataset.clear_context()
    return summary, timeseries


def _constraint_description(lb, ub, vec):
    """ Produce a rough text description based on lb and ub range. 

    Args:
        lb: Lower bound of the constraint range.
        ub: Upper bound of the constraint range.
        vec: Vector of values the lb and ub refer to.

    Returns:
        A high, low, or mid depending on lb and ub.
    """
        
    if not (isinstance(vec, pd.Series) \
            or isinstance(vec, np.ndarray) \
            or isinstance(vec, list)):
        raise TypeError("vec must be a pandas series, a numpy array, or a list type.")

    if not isinstance(vec, list) and len(vec.shape) != 1:
        raise TypeError("vec must be 1-D")

    
    # Convert string infs to min max values
    mn, mx = np.nanmin(vec), np.nanmax(vec)

    # replace infinities
    if lb == "-inf":
        lb = mn

    if ub == "inf":
        ub = mx        

    if not isinstance(lb, numbers.Number): 
        raise TypeError("lb must be a number.")

    if not isinstance(ub, numbers.Number): 
        raise TypeError("ub must be a number.")

    
    # clamp values
    ub = min(ub, mx) + 1  # inclusive ub
    lb = max(lb, mn)

    if np.isnan(lb):
        raise ValueError("lb is nan")

    if np.isnan(ub):
        raise ValueError("ub is nan")
    
    if lb > ub:
        raise ValueError("lb must be <= ub.")

    # bin into thirds
    lbin = mn + (mx-mn) * 1/3
    ubin = mn + (mx-mn) * 2/3

    amt_in_lbin = max((min(lbin, ub) - lb) , 0)
    amt_in_mbin = max((min(ubin, ub) - lb) - amt_in_lbin, 0)
    amt_in_ubin = max(ub - max(ubin,lb), 0)

    descr_id = np.argmax([amt_in_lbin, amt_in_mbin, amt_in_ubin])

    # add bias toward low or high bins if there is a tie        
    if descr_id == 1 and amt_in_ubin == amt_in_mbin:
        return 'high'
    
    if descr_id == 1 and amt_in_lbin == amt_in_mbin:
        return 'low'
    
    return ['low', 'mid', 'high'][descr_id]

def _significance_check(p):
    ''' Check the statistical significance of pattern stats. 
    
    Args:
        p (dict): Pattern object stats.
    
    Returns:
        True if statistically significant, False o.w.
    '''
    if np.isnan(p['es_t']):
        return False
            
    return float(p['pval']) < 0.05 and p['size_t'] > 20   

@log_it
def _pattern_timeseries(pattern_stats_list, config, pid=None):
    ''' Formats the mean target attribute into a dictionary containing
    the mean target over time for each pattern.

    Args:
       pattern_stats_list (dict): List of pattern statistics.
       config (Config): Configuration object.
       pid (int): ID of pattern to get timeseries for (None for all patterns)

    Returns:
       Dictionary mapping pattern IDs to mean targets over time.
    '''
    def get_value(t):
        ''' Compute standard error from statistics. '''
        if config.mine_type == 'numeric':
            return {'val': t['mu_t'], 'stderr': t['sig_t'] / np.sqrt(t['size_t'])}

        if config.mine_type == 'multiclass':
            if t['size_t'] == 0:
                return {'val': 0, 'stderr': 0}
            
            p = t['target_prob_t']
            return {'val': p, 'stderr': np.sqrt((p * (1.0 - p)) / t['size_t'])}
            
        assert config.mine_type == 'binary'
        p = t['prob_t']
        return {'val': p, 'stderr': np.sqrt((p * (1.0 - p)) / t['size_t'])}
            
    pattern_per_time = {}
    pattern_per_time = [{p[0]['ID']: [get_value(t) for t in p]} \
                        for p in map(list, zip(*pattern_stats_list)) \
                        if pid is None or p[0]['ID'] == pid]

    # convert pattern timeseries stats to dictionary maped by pattern ID
    return {k: v for e in pattern_per_time for k, v in e.items()}


def to_map(data):
    if isinstance(data, list):
        return [to_map(x) for x in data]
    elif isinstance(data, dict):
        return {to_map(key): to_map(val) for key, val in data.items()}
    elif isinstance(data, int) and not isinstance(data, bool):
        return data
    else:
        return str(data)
    
class AKMiner:

    @log_it
    def response(self):
        """ Return response needed for analytics interface. """
        if not self.patterns:  # No patterns were found
            return {
                'patterns': {},
                'summary': {},
                'features': [],
                'catLabels': {}
                }

        return json.dumps({
            'patterns': to_map(self.get_patterns())[0],
            'summary': to_map(self.get_summary())[0],
            'features': to_map(self.get_features())[0],
            'catLabels': to_map(self.config.labels)
        })

    @log_it
    def get_patterns_hyperbox(self):
        ''' Returns a list of pattern hyperboxes. '''
        return [p.hyperbox.copy() for p in self.patterns]

    @log_it
    def get_pattern_data(self, idx):
        return self.patterns[idx].pattern_df(self.dataset)

    @log_it
    def get_pattern_json(self):
        ''' Format the found patterns as a convenient json structure. '''
        pattern_json = []
        for pattern in self.patterns:
            bounds = pattern.hyperbox
            pjson = {}

            for attr in bounds.keys():
                if attr in self.config.labels:  # categorical value
                    if utils.is_date(next(iter(self.config.labels[attr]))):  # its a date
                        pjson[attr] = {'lb': self.config.labels[attr][bounds[attr]['lb']], 
                                       'ub': self.config.labels[attr][bounds[attr]['ub']]}
                    else:  # its not a date
                        levels = self.config.labels[attr]
                        lb, ub = bounds[attr]['lb'], bounds[attr]['ub']
                        lb = 0 if lb == -np.inf else int(lb)
                        ub = len(self.config.labels[attr]) if ub==np.inf else int(ub)
                         
                        categories = self.config.labels[attr][lb:ub+1]                        
                        pjson[attr] = categories
                else:
                    pjson[attr] = bounds[attr]

            pattern_json.append(pjson)
        
        return pattern_json

    @log_it
    def get_patterns(self):
        ''' Returns a list of patterns. '''
        if not self.patterns:  # No patterns were found
            return []
        return self.patterns_descr

    @log_it
    def get_summary(self):
        ''' Returns pattern summary. '''
        if not self.patterns:  # No patterns were found
            return []
        return self.summary

    @log_it
    def get_features(self):
        ''' Returns a list of features. '''
        if not self.patterns:  # No patterns were found
            return []
        return self.total_feature_scores

    @log_it
    def get_config(self):
        ''' Returns a list of features. '''
        return self.config

    @log_it
    def __pattern_description(self, timestep):
        ''' Get a list of json serializable pattern descriptions. '''
        
        dependent = self.config.dependent        
        rdf = self.dataset.raw_dataframe()

        mined_attr = set([attr for p in self.patterns for attr in p.attributes])
        mined_attr.add(dependent)  # keep dependent variable
        useful_attr = _attribute_equivalence(rdf, mined_attr)
               
        
        # first save the hyperboxes
        for p in self.patterns:
            p.save_hyperbox()            
        
        attribute_descr = {}
        # Rotate patterns along each 
        for attribute in useful_attr: #rdf.columns:
            if attribute == dependent:
                continue

            # Flag indicating that at least one pattern can be shown
            contains_pattern = False

            description = {'position': [], 'stats': [], 'descr': [], 'spread': []}
            for p in self.patterns:
                rotate_success = p.rotate(self.dataset, self.config, attribute)
                if p.hyperbox is None or not rotate_success:
                    description['position'].append(np.nan)
                    description['stats'].append({"ID": p.ID, **p.stats(self.dataset,
                                                                       self.config)})
                    description['descr'].append(np.nan)
                    description['spread'].append({attribute: 0, 'raw_score': 0})

                    p.restore_hyperbox()                    
                    continue

                
                pdf = p.pattern_df(self.dataset)
                if pdf.shape[0] == 0:   # empty dataframe
                    logger.info("Empty pattern")
                    continue
                    
                assert pdf.shape[0] > 0
                contains_pattern = True

                if attribute in self.config.labels:
                    description['position'].append(pdf[attribute].value_counts().idxmax())
                else:
                    description['position'].append(pdf[attribute].median())                
                
                # get the histogram for the pattern data
                bins = self.summary[timestep]['hist']['bin_edges']
                freq = np.histogram(pdf[dependent], bins=bins)[0] / pdf.shape[0]

                stats = {"ID": p.ID, **p.stats(self.dataset, self.config),
                         "shap": p.shap_values(self.dataset, self.config)} #,

                stats['hist'] = {'freq': freq.tolist(), 'bin_edges': bins}
                
                stats['histZoom'] = {
                    "1": {}, "2": {}, "3": {},  "4": {}
                }
                minD = bins[0]
                maxD = bins[-1]
                freq, bin_edges = np.histogram(pdf[dependent], range=(minD, maxD), bins=21)
                stats['histZoom']['1']['freq'] = (freq / pdf.shape[0]).tolist()
                stats['histZoom']['1']['bin_edges'] = bin_edges.tolist()
                freq, bin_edges = np.histogram(pdf[dependent], range=(minD, maxD), bins=31)
                stats['histZoom']['2']['freq'] = (freq / pdf.shape[0]).tolist()
                stats['histZoom']['2']['bin_edges'] = bin_edges.tolist()
                freq, bin_edges = np.histogram(pdf[dependent], range=(minD, maxD), bins=41)
                stats['histZoom']['3']['freq'] = (freq / pdf.shape[0]).tolist()
                stats['histZoom']['3']['bin_edges'] = bin_edges.tolist()
                freq, bin_edges = np.histogram(pdf[dependent], range=(minD, maxD), bins=51)
                stats['histZoom']['4']['freq'] = (freq / pdf.shape[0]).tolist()
                stats['histZoom']['4']['bin_edges'] = bin_edges.tolist()

                if self.config.mine_type == 'numeric':
                    stats['med_t'] = pdf[dependent].median()
                else:
                    assert self.config.mine_type == 'binary'
                    stats['med_t'] = pdf[dependent].mean()
                
                
                for i in range(len(stats['shap'])):
                    attr = stats['shap'][i]['attribute']      
                    stats['shap'][i]['hist'] = {
                        "1": {}, "2": {}, "3": {},  "4": {}
                    }
                    min = self.dataset_desc[attr]["min"]
                    max = self.dataset_desc[attr]["max"]             
                    stats['shap'][i]['min'] = min
                    stats['shap'][i]['max'] = max       
                    
                    if attr in self.config.labels:
                        # if categorical compute counts for each category
                        counts = pdf[attr].value_counts()
                        stats['shap'][i]['hist']['1']['bin_edges'] = list(counts.index)
                        stats['shap'][i]['hist']['1']['freq'] = list(counts / pdf.shape[0])
                    else:
                        # otherwise it is numerica; 
                        # histograms with multiple bin counts computed
                        # for 4 different zoom levels on numerical data                     
                        freq, bin_edges = np.histogram(pdf[attr], range=(min, max), bins=21)
                        stats['shap'][i]['hist']['1']['freq'] = (freq / pdf.shape[0]).tolist()
                        stats['shap'][i]['hist']['1']['bin_edges'] = bin_edges.tolist()
                        freq, bin_edges = np.histogram(pdf[attr], range=(min, max), bins=31)
                        stats['shap'][i]['hist']['2']['freq'] = (freq / pdf.shape[0]).tolist()
                        stats['shap'][i]['hist']['2']['bin_edges'] = bin_edges.tolist()
                        freq, bin_edges = np.histogram(pdf[attr], range=(min, max), bins=41)
                        stats['shap'][i]['hist']['3']['freq'] = (freq / pdf.shape[0]).tolist()
                        stats['shap'][i]['hist']['3']['bin_edges'] = bin_edges.tolist()
                        freq, bin_edges = np.histogram(pdf[attr], range=(min, max), bins=51)
                        stats['shap'][i]['hist']['4']['freq'] = (freq / pdf.shape[0]).tolist()
                        stats['shap'][i]['hist']['4']['bin_edges'] = bin_edges.tolist()
                        
                    
                description['stats'].append(stats)
                
                max_shap = stats['shap'][0]['shap']
                attr_shap = next(iter([e for e in stats['shap'] \
                                       if e['attribute'] == attribute]), None)
                shap_score = attr_shap['shap'] if _significance_check(stats) else 0
                assert attr_shap is not None

                wt = stats['size_t'] / self.dataset.shape[0]                
                description['spread'].append({attribute: abs(shap_score) / abs(max_shap) \
                                              if max_shap != 0 else 0,
                                              'raw_score': wt * shap_score})

                
                # get the text descriptions of each attribute range
                descr = []
                for clist in stats['shap']:
                    attr = clist['attribute']
                    lb, ub = clist['range']
                    
                    text = _constraint_description(lb, ub, rdf[attr])
                    descr.append({"attribute": attr, "text": text})

                description['descr'].append(descr)         
                p.restore_hyperbox()

            if contains_pattern:
                attribute_descr[attribute] = description
            
        return attribute_descr, useful_attr    
              

    @log_it
    def __init__(self, df, dependent, temporal=None, key=None, pattern_json=None,
                 mine_type='numeric', minsup=0.01, es_thresh='auto',
                 max_pattern=100, max_depth=None,
                 create_missing_attr=True,
                 min_stable=1, ts_width=1, delay_attr=None, delay=None,
                 smooth=None,
                 train_range=None,  causes_only=[], 
                 license_path=None, lib_path=None, opt_bound=False,
                 fdr='fast', holdout=1, show_help=False,
                 causal_rule=None, profile=False, verbose=False):

        ''' Constructor for AKMiner class.
        
        Performs pattern mining if necessary and forward data to the 
        front end for vizualization.
        
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
        np.random.seed(0)

        if train_range and type(train_range) not in [list, tuple]:
            raise TypeError(("train_range should be either a tuple or list indicating "
                             "the start and end of the training range."))
        
        if train_range and len(train_range) != 2:
            raise ValueError(("Training range must contain a start and end range"
                              "(e.g. [start,end]."))
        
        if train_range and not temporal:
            raise ValueError(("Training range is only valid for time varying datasets. "
                              "Please set the 'temporal' attribute."))

        if isinstance(es_thresh, dict):
            # check that all classes are accounted for
            if set(es_thresh.keys()) != set(df[dependent].unique()):
                raise ValueError(("es_thresh is undefined for some classes."))

        if mine_type == 'multiclass':
            if set(list(range(int(df[dependent].max()+1)))) != set(df[dependent].unique()):
                raise ValueError(("Class values must be consecutive integers."))

        if delay and not key:
            raise TypeError(("key must be defined if delay is defined."))

        if not delay_attr:
            delay_attr = temporal  # default to temporal
            
        if delay and not delay_attr:
            raise ValueError(("One of 'delay_attr' or 'temporal' must be specified "
                              "if 'delay' is defined"))

        if smooth and smooth not in ['sma']:
            raise ValueError(("Only 'sma' is supported for smooth type."))        
        
        try:
            self.config = Config(dependent, temporal, mine_type=mine_type,
                                 minsup=minsup, es_thresh=es_thresh, opt_bound=opt_bound,
                                 max_pattern=max_pattern, max_depth=max_depth,
                                 create_missing_attr=create_missing_attr,
                                 min_stable=min_stable, ts_width=ts_width,
                                 delay_var=delay_attr,
                                 show_causal=False, causes_only=[],
                                 license=license_path, libpath=lib_path,fdr=fdr,
                                 holdout=holdout, show_help=show_help,
                                 causal_rule=causal_rule, verbose=verbose)        
        except Exception as e:        
            print(e)            
            return None

        
        if mine_type == 'multiclass':
            self.config.nclass = int(df[dependent].max()) + 1
        
        logger.info("Starting Pattern Analyst...")
        logger.info("Target: " + str(dependent))
        logger.info("Mine Type: " + str(mine_type))        

        logger.info("Creating Dataset Object...")
        self.dataset = DataSet(df, self.config, key=key)
        self.dataset_desc = self.dataset.data().describe(include='all')  
        logger.info("Dataset created")
        
        self.config.labels = self.dataset.labels
        self.config.missing_cols = self.dataset.missing_cols
        
        logger.info("Mining Patterns...")
        if pattern_json:
            pattern_json_san = sanitize_pattern_json(pattern_json, self.config.labels)            
            self.patterns = [Pattern(hb) for hb in pattern_json_san]
                
            logger.info("Prettyfying patterns...")

            # TEMP:
            if mine_type == 'multiclass':
                for p in self.patterns:
                    p.target = 0
            # END TEMP
    
            for p in self.patterns:
                p.prettyfy(self.dataset, self.config)        

            logger.info("Prettyfying patterns complete")
    
        else:
            self.patterns = mine(self.dataset, self.config)
            
        logger.info("Mining Complete")

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
        
        logger.info("Creating Summary...")        
        self.summary, _ = _summarize(self.dataset, self.config,
                                     include_kde=False)
        
        logger.info("Summary complete")

        # patterns stats for each time periods
        ntimesteps = len(self.summary)

        self.timestep = 0

        ts = 0
        context = self.config.ith_temporal_context(ts)

        logger.info("setting context #%d", ts)
        self.dataset.apply_context(context)

        self.patterns_descr = []
        self.useful_attr = set([])

        # trie encoding lookup
        self.trie_lookup = {}

        logger.info("Getting Pattern Descriptions...")
        while self.dataset.is_feasible():            
            patterns_descr, useful_attr = self.__pattern_description(ts)
            self.patterns_descr.append(patterns_descr)
            self.useful_attr |= set(useful_attr)
            ts = ts + 1
        
            logger.info("setting context #%d", ts)
            context = self.config.ith_temporal_context(ts)
            self.dataset.apply_context(context)
            
        self.dataset.clear_context()
        logger.info("Pattern Description complete")

        assert len(self.patterns_descr) == ntimesteps  # sanity check

        logger.info("Computing feature scores...")
        npatterns = len(self.patterns)
        self.scatter = []
        pt_membership = []
        self.total_feature_scores = []        
        for ts in range(ntimesteps):
            logger.info("setting context #%d", ts)
            context = self.config.ith_temporal_context(ts)
            self.dataset.apply_context(context)

            feature_scores = []
            for col in self.useful_attr: 
                if col == dependent:
                    continue

                if col not in self.patterns_descr[ts]:
                    continue
            
                score = sum(abs(spread['raw_score']) if _significance_check(stats) else 0 \
                            for spread, stats in zip(self.patterns_descr[ts][col]['spread'],
                                                     self.patterns_descr[ts][col]['stats']))
            
                feature_scores.append({'attribute': col,
                                       'score': score, 
                                       'raw_score': score})
            
            max_feature_score = max(feature_scores, key=lambda x: x['score'])['score']
            self.total_feature_scores.append([{'attribute': fs['attribute'],
                                          'score': fs['score'] / max_feature_score \
                                          if max_feature_score > 0 else 1, \
                                          'raw_score': fs['raw_score']} \
                                         for fs in feature_scores])

            # sort by score
            self.total_feature_scores[-1].sort(key=lambda x: x['score'], reverse=True)

            # sample scatter
            nsamp = 200
            size = self.summary[ts]['size']
            
            if self.config.mine_type == 'binary':
                raw_df = self.dataset.raw_dataframe()
                N = raw_df.shape[0]

                # stratified sampling
                samples = raw_df.reset_index() \
                                .groupby(dependent, group_keys=False) \
                                .apply(lambda x: x.sample(int(nsamp*x.shape[0]/N))) \
                                .index.values
            else:
                samples = np.random.choice(range(self.dataset.shape[0]), size=nsamp);            
            
            
            scatter_attr = [fs['attribute'] for fs in self.total_feature_scores[-1]] + [dependent]
            self.scatter.append(_scatterplot(self.dataset, scatter_attr, samples))

            # get pattern memberships for every point
            pattern_membership = _membership_status(self.dataset, self.patterns)[samples]

            # assign points to one of its member patterns
            pt_membership.append([np.random.choice(a.nonzero()[0]) \
                                  if a.nonzero()[0].any() else -1 \
                                  for a in pattern_membership])
            
                
        self.dataset.clear_context()
        

        raw_df = self.dataset.raw_dataframe()[self.useful_attr].copy()
        lt = raw_df.quantile(1/3)
        ht = raw_df.quantile(2/3)
        
        # Address imbalanced attributes where lt == ut
        imbalanced = lt[lt==ht].index
        lt[imbalanced] = raw_df[imbalanced].min()
        ht[imbalanced] = raw_df[imbalanced].max()
               
    @log_it
    def summarize_subgroups(self, ids, selectedAttr, dependent):
        ''' Handler for summarizing subgroups '''
        logger.info("summarize subgroups for timestep %d", self.timestep)

        raw_df = self.dataset.raw_dataframe()[self.useful_attr].copy()
        lt = raw_df.quantile(1/3)
        ht = raw_df.quantile(2/3)
        
        # Address imbalanced attributes where lt == ut
        imbalanced = lt[lt==ht].index
        lt[imbalanced] = raw_df[imbalanced].min()
        ht[imbalanced] = raw_df[imbalanced].max()
            
        selected_IDs = ids  #pattern ID
        if not selected_IDs:
            return
            
        logger.info("selected_IDs")
        logger.info(selected_IDs)
        
        if selected_IDs == -1:
            return  # early exit reset

        current_attribute = selectedAttr
                                 
        selected_patterns = [p for p in self.patterns if p.ID in selected_IDs]
        
        assert len(selected_IDs) == len(selected_patterns)
        
        context = self.config.ith_temporal_context(self.timestep)
        self.dataset.apply_context(context)
        
        index = set({})
        for p in selected_patterns:
            p.rotate(self.dataset, self.config, current_attribute)
            index = index | set(p.pattern_df(self.dataset).index)
            p.restore_hyperbox()

        self.dataset.clear_context()
        
        # subgroup collection dataframe (i.e. union of points)
        group_df = raw_df.loc[index]
        logger.info("group count = %d", group_df.shape[0])
        
        size = len(index)
        low = (raw_df.loc[index] <= lt).sum()
        med = ((raw_df.loc[index] > lt) & (raw_df.loc[index] < ht)).sum()
        high = (raw_df.loc[index] >= ht).sum()
        
        shap_scores = {}
        for attr, des in self.patterns_descr[self.timestep].items():
            shap_effect = 0
            for stats in des['stats']:
                if stats['ID'] not in selected_IDs:
                    continue
                if not _significance_check(stats):
                    continue
                        
                shap_dict = next(iter(el for el in stats['shap'] if el['attribute'] == attr))
                shap_effect = shap_effect + shap_dict['shap']
                    
            shap_scores[attr] = shap_effect / len(selected_IDs)

            
        catcols = [c for c in raw_df.columns if c in self.config.labels]
        numcols = [c for c in raw_df.columns if c not in catcols]
     
        # Get the summary for categories
        cat_summary = {}
        for c in catcols:
            vc = raw_df.loc[index, c].value_counts()
            labels = self.config.labels[c]
            
            first = {'level': labels[int(vc.index[0])], 'perc': vc.iloc[0] / size}

            second = {'level': labels[int(vc.index[1])], 'perc': vc.iloc[1] / size} \
                     if len(vc) > 1 else {'level': "", 'perc': 0}
            
            other = {'level': 'Other', 'perc': (len(index) - vc.iloc[0] - vc.iloc[1]) / size} \
                    if len(vc) > 1 else {'level': "", 'perc': 0}            
            
            info = {
                'attribute': c,
                'first': first,
                'second': second,
                'other': other,
                'shap': shap_scores[c]
            }
            cat_summary[c] = info

            
        # get the root pattern list
        root_summary_list = []
        root_attrs = []
        if len(selected_patterns) == 1:
            p = selected_patterns[0]  # get the pattern
            root_attrs = list(p.origin_hyperbox)
            root_summary_list = [{'attribute': k,
                                  'low': low[k] / size,
                                  'med': med[k] / size,
                                  'high': high[k] / size,                                 
                                  'shap': shap_scores[k]} \
                                 if k in numcols else cat_summary[k]
                                 for k in root_attrs]
            
            root_summary_list.sort(key=lambda x: abs(x['shap']), reverse=True)
            
        subgroup_summary_list = [{'attribute': k,
                                  'low': low[k] / size,
                                  'med': med[k] / size,
                                  'high': high[k] / size,                                 
                                  'shap': shap_scores[k]}
                                 if k in numcols else cat_summary[k]
                                 for k in low.index if k != dependent and k not in root_attrs]
        
        subgroup_summary_list.sort(key=lambda x: abs(x['shap']), reverse=True)

        # get the histogram for the pattern data
        bins = self.summary[self.timestep]['hist']['bin_edges']
        freq = np.histogram(group_df[dependent], bins=bins)[0] / group_df.shape[0]
        
        subgroup_summary = {'list': subgroup_summary_list,
                            'root': root_summary_list,
                            'stats': {'size_t': group_df.shape[0],
                                      'mu_t': group_df[dependent].mean(),
                                      'sig_t': group_df[dependent].std(),
                                      'min_t': group_df[dependent].min(),
                                      'med_t': group_df[dependent].median(),
                                      'max_t': group_df[dependent].max(),
                                      'prob_t': group_df[dependent].mean(),
                                      'hist': {'freq': freq.tolist(), 'bin_edges': bins}}}
        return(subgroup_summary)       
        
