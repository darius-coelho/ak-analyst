""" This module takes patterns and gathers necessary info. for rendering the pattern browser. """
import json
import math
from os import stat

import numpy as np
import dask

from scipy.stats import entropy

from ai_analyzer.lib.utils import pretty_round
from ai_analyzer.lib.stats import all_pairs_test
from analyst.pattern import Pattern

def _significance_check(target, p):
    ''' Check the statistical significance of pattern stats for a specific target.
    
    Args:
        target (string): the target for which the check is executed 
        p (dict): Pattern object stats.
    
    Returns:
        True if statistically significant, False o.w.
    '''
    if np.isnan(p['stats'][target]['es']):
        return False
    
    return float(p['stats'][target]['pval']) < 0.05 and p['stats'][target]['size'] > 20

def to_map(data):
    if isinstance(data, list):
        return [to_map(x) for x in data]
    elif isinstance(data, dict):
        return {to_map(key): to_map(val) for key, val in data.items()}
    elif isinstance(data, int) and not isinstance(data, bool):
        return data
    else:
        return str(data)

def is_contained_by(child_attr, parent_attr, is_categorical=False):
    """ computes if a child range falls within a parent range.
    
    Args:
        child_attr: a dict containg the attribute stats
        parent_attr: a dict containg the attribute stats
        
        Returns:
            A bool if the child range falls within the parent range
    """

    # for categorical attributes compare categories
    if is_categorical:
        child_cats = set(child_attr['categories'])
        parent_cats = set(parent_attr['categories'])
        return child_cats.issubset(parent_cats)

    # for continuous attributes compare ranges
    child_min = float(child_attr['min'])
    child_max = float(child_attr['max'])
    parent_min = float(parent_attr['min'])
    parent_max = float(parent_attr['max'])
    
    return child_min >= parent_min and child_max <= parent_max

def is_enhance_pattern(enhance, pattern):
    """ Determines if a pattern(enhance) is an enhancement of another pattern(pattern)
        pattern must contain all attributes in enhance
        The ranges of these attributes in enhance must fall within the ranges in pattern
    
    Args:
        enhance: a dict containing all enhance pattern parameters
        pattern: a dict containing all pattern parameters
        
    Returns:
        A boolean value indicating if a pattern is the child of the parent
    """
    enhanceCore = set(enhance['core'])
    patternCore = set(pattern['core'])    
    
    if patternCore.issubset(enhanceCore):
        for attr in pattern['core']:
            overlap = is_contained_by(
                enhance['attributes'][attr],
                pattern['attributes'][attr],
                is_categorical='categories' in pattern['attributes'][attr]
            )
            if not overlap:
                return False
        return True

    return False

class AnalystLite:
    def create_summary(self):
        """ Creates a summary of the dataset. 
        
        Args:
            bins: Bins for the histogram.
        """
        # rename the default values
        rename = {'count': 'size', 'mean': 'mu', '50%': 'med',
                  'std': 'sig', 'min': 'min', 'max': 'max'}
        
        stats = {}
        # Compute the stats for each target
        for target in self.targets:
            desc = self.dataset.describe_col(target)
            stats[target] =  desc.rename(rename).to_dict()  # convert to dictionary
            stats[target]['prob'] = stats[target]['mu']

            if self.mine_type == 'binary':
                stats[target]['med'] = stats[target]['prob']

        summary = {
            'stats' : stats,
            'attributes': {}
        }
        
        # Compute the stats for attribute other than the target
        for column in self.dataset.data_columns:
            if column not in self.targets and column not in self.nan_cols:
                desc = self.dataset.describe_col(column)
                na_count = self.dataset.count_na(column)
                if column in self.dataset.get_catcols():
                    if desc["count"] < 1:
                        summary['attributes'][column] = {
                            "categories": [np.nan],
                            "pval": 0,
                            "mostFrequent": None,
                            "missing": 1
                        }
                    else:
                        counts = self.dataset[column].value_counts(normalize=True)
                        summary['attributes'][column] = {
                            "categories": list(list(counts.index)),
                            "pval": self.dataset.chi_square(column),
                            "mostFrequent": counts.idxmax(),
                            "missing": na_count/(na_count + desc['count'])
                        }
                else:
                    if desc["count"] < 1:
                        summary['attributes'][column] = {
                            "min": np.nan,
                            "max": np.nan,
                            "mean": np.nan,
                            "pval": np.nan,
                            "missing": 1
                        }
                    else:
                        counts, division = self.dataset.histogram(col=column, bins=20, normalize=True)
                        summary['attributes'][column] = {
                            "min": desc["min"],
                            "max": desc["max"],
                            "mean": desc["mean"],
                            "pval": self.dataset.mannwhitneyu(column)[1],
                            "missing": na_count/(na_count + desc['count'])
                        }
                        
        
        return summary
    
    def update_global_summary(self):
        """ Updates the attribute summary of the entire dataset.
            -Ensures that ranges encapsulate pattern ranges.
            -Adds global hitograms/category counts
        """

        # Update attribute ranges 
        for pattern in self.patterns:
            for attr, params in pattern.origin_hyperbox.items():            
                if attr in self.dataset.get_catcols():
                    self.summary['attributes'][attr]['categories'] = list(set(self.summary['attributes'][attr]['categories'] + params['in']))
                else:
                    if not np.isinf(params['lb']):
                        self.summary['attributes'][attr]['min'] = min(params['lb'], self.summary['attributes'][attr]['min'])
                    if not np.isinf(params['ub']):
                        self.summary['attributes'][attr]['max'] = max(params['ub'], self.summary['attributes'][attr]['max'])        
        
        # Compute global 1-D histgrams/category couts for each attribute
        for attr in self.summary['attributes']:
            if attr in self.dataset.get_catcols():
                counts, bins = self.dataset.value_counts(attr, dropna=False)
                self.summary['attributes'][attr]['catCounts'] =  dict(zip(['nan' if x is np.nan else x for x in bins], counts))
            else:
                counts, bins = self.dataset.histogram(attr, 40)
                self.summary['attributes'][attr]['bins'] = list(bins)
                self.summary['attributes'][attr]['counts'] = list(counts)

    def __get_stats(self):
        """ Gets statistsics for the data w/ possible pattern filters applied.
        
        Returns:
            Dictionary containing the relevant statistics.
        """
        # rename the default values
        summary = self.create_summary()

        for target in self.targets:
            es, pval = self.dataset.mannwhitneyu(target) if self.mine_type == 'numeric' \
                    else self.dataset.chi_square_bin(target)
        
            summary['stats'][target]['es'] = float(round(es, 2))
            summary['stats'][target]['pval'] = pretty_round(pval, 2)
        return summary
    
    def __create_numcol_summary(self):
        """ Creates the low, med, high summary for numcols. """
        lt, ut = self.min_thirds_max.loc[0.33], self.min_thirds_max.loc[0.66]
        numcols = lt.index.tolist()
        
        # NOTE: There is a warning related to the comparison of e.g. lt_left < lt_right
        # that requests that it be aligned. The 2 lines below do not seem to remove
        # this warning. The end result does not appear to be affected.
        lt_left, lt_right = self.dataset.filter_data[numcols].align(lt, axis=1)
        ut_left, ut_right = self.dataset.filter_data[numcols].align(ut, axis=1)

        lbin, ubin = dask.compute((lt_left.lt(lt_right)).sum(), (ut_left.lt(ut_right)).sum())
        N = self.dataset.get_counts()['filtered']

        low = lbin
        med = ubin - lbin
        high = N - ubin

        return [{'attribute': attr,'low': low[attr] / N, 'med': med[attr] / N,
                 'high': high[attr] / N} for attr in numcols if attr not in self.targets]
    
    def __create_catcol_summary(self):
        """ Creates the first, second and other summary for catcols. """
        catcols = self.dataset.get_catcols()
        catcol_summ = []
        N = self.dataset.get_counts()['filtered']
        
        val_cts_list = self.dataset.value_counts_batch(catcols)
        
        for (counts, levels), attr in zip(val_cts_list, catcols):
            if attr in self.targets or not counts:
                continue
            
            first = {'level': levels[0], 'perc': counts[0] / N}
            second = {'level': levels[1], 'perc': counts[1] / N} \
                     if len(levels) > 1 else {'level': "", 'perc': 0}

            other = {'level': 'Other', 'perc':  (N - counts[0] - counts[1]) / N} \
                    if len(levels) > 2 else {'level': "", 'perc': 0}
            
            catcol_summ.append({'attribute': attr, 'first': first,
                                'second': second, 'other': other})
            
        return catcol_summ
    
    def create_group_summary(self, pid):
        """ Creates a group summary for pattern pid and stores
        it in the group_summary variable. """

        group_summ = self.__create_numcol_summary() + self.__create_catcol_summary()
        self.group_summary[pid] = group_summ

    def response(self, index=None):
        """ Return response needed for analytics interface. 
        
        Args: 
            index: If None, returns the response for all patterns. Otherwise 
                   returns the response for the specified pattern
        """
        if index is None:
            return json.dumps({
                'patterns': to_map(self.get_patterns()),
                'summary': to_map(self.get_summary()),
                'features': to_map(self.get_features()),
                'catLabels': to_map(self.get_cat_levels())
            })

        return json.dumps(to_map(self.patterns_descr[index]))

    def get_patterns(self):
        """ Returns a list of patterns. """
        return self.patterns_descr
        
    def get_summary(self):
        """ Returns the pattern summary. """
        return self.summary

    def get_features(self):
        """ Returns the global feature score info. """
        return self.global_feature_scores

    def get_categories(self):
        """ Returns the categorical attributes. """
        return self.dataset.get_catcols()
        
    def get_cat_levels(self):
        """ Returns a dictionary containing the list of levels for each category. """
        types = self.dataset.types
        orderings = self.dataset.orderings
        cat_levels = {}
        for c in self.get_categories():
            if types[c] =='Nominal':
                cat_levels[c] = list(self.dataset[c].unique())                
            else:
                cat_levels[c] = orderings[c]
            
            # Find categories in pattern defintions but not in the dataset
            extra_cats = list(set(self.summary['attributes'][c]['categories']) - set(cat_levels[c]))
            # Preserve category ordering in the dataset and append extra categories
            cat_levels[c] = cat_levels[c] + extra_cats
            
        return cat_levels
        
    def compute_global_feature_scores(self):
        """ Computes the global feature scores based on the patterns core attributes. """

        if not hasattr(self, 'patterns_descr'):
            raise AssertionError("The pattern_description method must be run first.")
        global_feature_scores = {}
        for target in self.targets:
            feature_scores_dict = {}
            for p in self.patterns_descr:
                for shaps in p['shaps'][target]: 
                    attr = shaps['attr']
                    if attr not in feature_scores_dict:
                        feature_scores_dict[attr] = 0
                    feature_scores_dict[attr] += abs(shaps['shap']) if _significance_check(target, p) else 0
            
            feature_scores=[]
            for k, v in feature_scores_dict.items():
                feature_scores.append({ 'attribute': k, 'score': v })

            max_feature_score = max(feature_scores, key=lambda x: x['score'])['score']
            if max_feature_score == 0:
                norm_feature_score = [{**fs, 'score': 1, 'raw_score': fs['score']} \
                                    for fs in feature_scores]
            else:
                norm_feature_score = [{**fs, 'score': fs['score'] / max_feature_score,
                                    'raw_score': fs['score']} for fs in feature_scores]
            
            global_feature_scores[target] = sorted(norm_feature_score, key=lambda x: x['score'], reverse=True)

        return global_feature_scores

    def associated_patterns(self, patterns):
        """ Identifies statistically significant associations between patterns.

        Args:
            patterns: list of patterns to associate.
        
        Returns:
            A mapping of pattern ID to associated pattern IDs.
        """
        if len(patterns) == 1:
            return {patterns[0].ID: []}
        
        pwhere = [self.dataset.where(p.hyperbox, 1, 0) for p in patterns]
        indicator = np.array(pwhere).T.astype(np.uint8)
        related = all_pairs_test(indicator)

        relmap = {}
        for cid in related:
            relmap[patterns[cid].ID] = [patterns[c].ID for c in related[cid]]

        return relmap

    def find_related_patterns(self, pattern, patterns):
        """ Computes lists of patterns that are enhancements, generalizations,
            and have significant data overlap with a given pattern.

        Args:
            pattern: Pattern of interest.
            patterns: list of all patterns to be compared.

        Returns:
            A dictionary containing three lists of pattern IDs
        """
        
        enhance = []
        general = []
        related = []
        
        # for each pattern in the list determin if it should be part of the 
        # enhance/general/related list
        for p in patterns:
            if pattern['ID'] == p['ID']:
                continue
            
            # Check if p is an enhancement
            is_enhance = is_enhance_pattern(p, pattern)
            if is_enhance:
                enhance.append(p['ID'])

            # Check if p is a generalization
            is_general = is_enhance_pattern(pattern, p)
            if is_general:
                general.append(p['ID'])


        pid = pattern['ID']
        if pid in self.related_pattern_map:
            related = self.related_pattern_map[pid]
            
        return {'enhance': enhance, 'generalize': general, 'related': related}

    def update_pattern_description(self, patterns):
        """ Updates pattern descriptions to include lists of related patterns

        Args:
            patterns: list of all patterns.

        Returns:
            A list of patterns which contains an updated description
            that includes lists of related patterns
        """
        for i in range(len(patterns)):
            patterns[i] = {
                    **patterns[i],
                    **self.find_related_patterns(patterns[i], patterns)
                }
        
        return patterns

    def pattern_info_static(self, pattern):
        """ Computes description of the pattern based on its core attributes.

        Args:
            pattern: Pattern of interest.

        Returns:
            A dictionary containing stats, descr, and shap values.
        """
        self.dataset.restore_checkpoint()  # reset the datset
        pattern.apply_pattern(self.dataset)  # filter the dataset based on pattern
      
        description = {}

        # get stats for the group
        stats = self.__get_stats()        
        
        # shap values for the core attributes
        shaps = {}
        filt_data = self.dataset.to_pandas(filtered=False)
        for target in self.targets:
            core_shap = pattern.shap_values(filt_data, target)
            shaps[target] = [{'attr': d['attribute'], 'shap': d['shap']} for d in core_shap]

        pattern_attrs = pattern.origin_hyperbox
        core_attrs = []
        for attr, params in pattern_attrs.items():
            core_attrs.append(attr)
            if attr in self.dataset.get_catcols():
                stats['attributes'][attr]['categories'] = params['in']                
            else:
                stats['attributes'][attr]['min'] = params['lb']
                stats['attributes'][attr]['max'] = params['ub']
        
        sorted_attrs = sorted(stats['attributes'].items(), key=lambda x: x[1]['pval'], reverse=False)
        others = [ {'name': d[0], 'pval': d[1]['pval']} for d in sorted_attrs if d[0] not in core_attrs]
        
        # setup the return dict.
        description = { 'ID': pattern.ID, 'shaps': shaps, 'core': core_attrs, 'others': others, **stats }
        
        pattern.reset_hyperbox()
        return description
    
    def pattern_description_fast(self):
        """ Computes the information necessary for the pattern card.
        
        Returns:
            A list of patterns which contains a description of each pattern.
        """

        self.related_pattern_map = self.associated_patterns(self.patterns)
        patterns_descr = [self.pattern_info_static(p) for  p in self.patterns]
        patterns_descr = self.update_pattern_description(patterns_descr)

        self.dataset.restore_checkpoint()  # reset the state
        return patterns_descr

    def pandas_by_pid(self, pid):
        """ Returns the pandas dataframe associated with pattern pid. """

        # Get index of pattern
        idx = next((index for (index, d) in enumerate(self.patterns) if int(d.ID) == int(pid)), None)

        if idx == None or idx < 0 or idx >= len(self.patterns):
            raise ValueError("Invalid pid")

        self.dataset.restore_checkpoint()  # init the state

        # apply pattern filters to the dataset
        self.patterns[idx].apply_pattern(self.dataset)
        result = self.dataset.to_pandas()
        
        self.dataset.restore_checkpoint()  # reset the state
        return result

    def get_nan_cols(self):
        """ Creates a list of attributes that have all missing values
        
        Returns:
            A list of attribute names that have all missing values.
        """
         
        nan_attrs = []
        for attr, stats in self.summary['attributes'].items():
            if stats['missing'] >= 1:
                nan_attrs.append(attr)
        return nan_attrs

    def add_pattern(self, cstr):
        """ Adds a pattern to the list based on a json description.

        Args:
            cstr: Dictionary containing a description of the pattern to add.
        """
        def sanitize_cstr(cstr):
            """ Replace -inf, inf strings with their numpy equivalent. """
            for col, constraint in cstr.items():
                for bound, val in constraint.items():
                    if val == "-inf":
                        cstr[col][bound] = -np.inf

                    elif val == "inf":
                        cstr[col][bound] = np.inf
            return cstr
        
        cstr = sanitize_cstr(cstr)
        
        pid = len(self.patterns)
        pattern = Pattern({'ID': pid, 'constraints': cstr})

        self.patterns.append(pattern)

        pattern_d = self.pattern_info_static(pattern)
        self.patterns_descr.append({
            **pattern_d,
            **self.find_related_patterns(pattern_d, self.patterns_descr)
        })
        
        self.dataset.restore_checkpoint()  # reset the state
        
        

    def __init__(self, dataset, targets, mine_type, patterns, nsamples=None):
        """ Constructor for the AnalystLite class.
        
        Args:
            dataset: Dataset to analyze.
            target: Target attribute of interest.
            mine_type: numeric or binary.
            patterns: List of dictionaries describing mined patterns.
            nsamples: Number of samples to compute stats on.
                      If None then no sampling is done.
        """
        if mine_type not in ['numeric', 'binary']:
            raise ValueError("mine_type should be either 'numeric; or 'binary'")

        if not isinstance(patterns, list):
            raise TypeError("patterns should be a list of dictionaries")
        
        self.dataset = dataset
        self.dataset.create_checkpoint()  # save the original state
        
        self.targets = targets
        self.mine_type = mine_type
        
        self.patterns = [Pattern(p) for p in patterns]

        self.nan_cols = []
        self.summary = self.create_summary()
        self.nan_cols = self.get_nan_cols()
        self.update_global_summary()
        self.group_summary = {}

        # Divide the continuous attributes into 3rds
        self.min_thirds_max = self.dataset.quantile([0, 0.33, 0.66, 1])
        self.patterns_descr = self.pattern_description_fast()
        self.global_feature_scores = self.compute_global_feature_scores()
