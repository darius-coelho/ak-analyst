""" This module takes patterns and gathers necessary info. for rendering the pattern browser. """
import json

import numpy as np
import dask
from sklearn import datasets

from ai_analyzer.lib.utils import pretty_round
from analyst.pattern import Pattern

def _significance_check(p):
    ''' Check the statistical significance of pattern stats. 
    
    Args:
        p (dict): Pattern object stats.
    
    Returns:
        True if statistically significant, False o.w.
    '''
    if np.isnan(p['es']):
        return False
            
    return float(p['pval']) < 0.05 and p['size'] > 20   


def to_map(data):
    if isinstance(data, list):
        return [to_map(x) for x in data]
    elif isinstance(data, dict):
        return {to_map(key): to_map(val) for key, val in data.items()}
    elif isinstance(data, int) and not isinstance(data, bool):
        return data
    else:
        return str(data)

class Analyst:
    def create_summary(self, bins=None):
        """ Creates a summarizes the dataset. 
        
        Args:
            bins: Bins for the histogram.
        """
        # rename the default values
        rename = {'count': 'size', 'mean': 'mu', '50%': 'med',
                  'std': 'sig', 'min': 'min', 'max': 'max'}
        desc = self.dataset.describe_col(self.target)
        
        summary = desc.rename(rename).to_dict()  # convert to dictionary
        summary['prob'] = summary['mu']

        if self.mine_type == 'binary':
            summary['med'] = summary['prob']
            
        if bins is None:
            bins = 11 if self.mine_type == "numeric" else 2
            
        summary['hist'] = self.__histogram(self.target, bins)        
        return summary
    
    def __histogram(self, attribute, bins, normalize=True):
        """ Gets the histogram for the attribute.
        
        Args:
            attribute: Attribute to compute histogram for.
            bins: Bin edges for the histogram.
            normalize: If true, returns counts as a percentage.
        
        Returns:
            Dict. containing 'freq' and 'bin_edges' fields.
        """
        hist, bin_edges = self.dataset.histogram(attribute, bins=bins, normalize=normalize)
        return {'freq': hist.tolist(), 'bin_edges': bin_edges.tolist()}
        
    def __get_group_position(self, attribute):
        """ Gets the x-position of the group in the bubble chart. 
        NOTE: self.dataset is assumed to have pattern filters applied.

        Args:
            attribute: Attribute to get the x-position on.
        
        Returns:
            The x-position of the group.
        """
        if self.dataset[attribute].dtype == 'object':  # nominal attribute
            # get the counts/values in descending order of frequency
            counts, values = self.dataset.value_counts(attribute)
            if not values:
                return np.nan
            
            return values[0]  # first value is most frequent

        # attribute is continuous
        return self.dataset.median(attribute)  # x-pos is median

    
    def __get_stats(self):
        """ Gets statistsics for the data w/ possible pattern filters applied. 
        
        Returns:
            Dictionary containing the relevant statistics.
        """
        # rename the default values
        stats = self.create_summary(bins=self.summary['hist']['bin_edges'])

        es, pval = self.dataset.mannwhitneyu(self.target) if self.mine_type == 'numeric' \
                   else self.dataset.chi_square_bin(self.target)
        
        stats['es'] = float(round(es, 2))
        stats['pval'] = pretty_round(pval, 2)
        return stats
    
    def __get_spread(self, shap_list, attribute, pattern_size):
        """ Gets the normalized shapley scores and contribution 
        toward the attribute's feature score.

        Args:
            shap_list: List of shapley values for the pattern.
            attribute: Attibute to describe.
            pattern_size: Number of items in the pattern
        """
        max_shap = shap_list[0]['shap']  # first value has max shap value
        attr_shap = next((e for e in shap_list if e['attribute'] == attribute), None)
        shap_score = attr_shap['shap']

        wt = pattern_size / self.dataset.full_size
        return {attribute: abs(shap_score) / abs(max_shap) if max_shap != 0 else 0,
                'raw_score': wt * shap_score}

    def __constraint_range(self, lb, ub, attr):
        """ Determines whether the lb-ub range along attr is mostly high, low. or mid. 

        Args:
            lb: Lower bound of range.
            ub: Upper bound of range.
            attr: Attribute to determine range for.

        Returns:
            The text 'low', 'mid', or 'high'
        """
        amin, lbin, ubin, amax  = self.min_thirds_max[attr]  # get 1/3 and 2/3 bin boundary

        if np.isinf(lb):
            lb = amin
            
        if np.isinf(ub):
            ub = amax
            
        # determine how much of the lb-ub range is in each bin
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

        
    def __get_description(self, shap_list, pattern):
        """ Creates a partial text description of each attribute in the pattern. 
        
        Args:
            shap_list: List of shapley values dictionary.
            pattern: Pattern of interest.

        Returns:
            List of dictionaries containing the attribute and partial text description.
        """
        descr = []
        for shap in shap_list:
            attr = shap['attribute']
            assert attr in pattern.hyperbox  # sanity check
            
            if 'in' in pattern.hyperbox[attr]:  # nominal attribute
                text = len(pattern.hyperbox[attr]['in'])
            else:
                lb = pattern.hyperbox[attr]['lb']
                ub = pattern.hyperbox[attr]['ub']                
                text = self.__constraint_range(lb, ub, attr)

            descr.append({'attribute': attr, 'text': text})
            
        return descr

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
                 'high': high[attr] / N} for attr in numcols if attr != self.target]

    
    def __create_catcol_summary(self):
        """ Creates the first, second and other summary for catcols. """
        catcols = self.dataset.get_catcols()
        catcol_summ = []
        N = self.dataset.get_counts()['filtered']
        
        val_cts_list = self.dataset.value_counts_batch(catcols)
        
        for (counts, levels), attr in zip(val_cts_list, catcols):
            if attr == self.target or not counts:
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
        
    def __get_hover_histogram(self, attribute):
        """ Gets the histogram that appears on hovering over a bubble. 

        Returns:
            Dictionary mapping attribute to histogram at different zoom levels.
        """
        if self.is_category(attribute):
            # NOTE WE DISABLE THE HOVER HISTOGRAM FOR PERFORMANCE
            #freq, bin_edges = self.dataset.value_counts(attribute, normalize=True)
            freq=[]
            bin_edges = []
            return {'1': {'freq': freq, 'bin_edges': bin_edges}}  # only one level
        
        hover_hist = {}
        bin_levels = [21,31,41,51]
        for lvl, bins in enumerate(bin_levels):            
            #freq, bin_edges = self.dataset.histogram(attribute, bins=bins, normalize=True)
            freq=[]
            bin_edges = []
            hover_hist[f'{lvl+1}'] = {'freq': freq, 'bin_edges': bin_edges}
            # NOTE WE DISABLE THE HOVER HISTOGRAM FOR PERFORMANCE
            #hover_hist[f'{lvl+1}'] = {'freq': freq.tolist(), 'bin_edges': bin_edges.tolist()}

        return hover_hist

    
    def pattern_attribute_description(self, pattern, attribute):
        """ Creates a description for pattern w.r.t attribute.

        Args:
            pattern: Pattern to describe.
            attribute: Attribute to describe.
        
        Returns:
            Dictionary description.
        """
        counts = self.dataset.get_counts()

        if not pattern.rotate(self.dataset, attribute) or counts['filtered'] == 0:
            # no stats can be computed (i.e. rotation results in an empty pattern)
            return {'position': "N/A", 'stats': "N/A", 'descr': "N/A", 'spread': "N/A"}

        # at this point self.dataset has the pattern filters applied.
        if pattern.is_core_attr(attribute) and pattern.ID not in self.group_summary:
            # create the group summary for pattern
            self.create_group_summary(pattern.ID)
            
        position = self.__get_group_position(attribute)
        hover_hist = self.__get_hover_histogram(attribute)
        
        # get the sampled shap_values
        shap = pattern.shap_values(self.dataset.to_pandas(filtered=False), self.target)
        stats = {"ID": pattern.ID, "shap": shap, 'hoverHist': {attribute: hover_hist},
                 **self.__get_stats()}


        spread = self.__get_spread(shap, attribute, stats['size'])
        descr = self.__get_description(shap, pattern)
        return {"position": position, "stats": stats, "descr": descr, "spread": spread}
        
        
    def pattern_description(self):
        """ Computes the information necessary for the group bubble, 
        detail and summary plots. 
        
        Returns:
            A dictionary which contains render info for each attribute/pattern combo.
        """

        attribute_descr = {}
        for attribute in self.dataset.columns:
            if attribute == self.target:
                continue  # no need to describe the target

            description = {'position': [], 'stats': [], 'descr': [], 'spread': []}
            for p in self.patterns:
                self.dataset.restore_checkpoint()  # reset the dataset
                result = self.pattern_attribute_description(p, attribute)
                assert 'hoverHist' in result['stats']
                
                description['position'].append(result['position'])
                description['stats'].append(result['stats'])
                description['descr'].append(result['descr'])
                description['spread'].append(result['spread'])

            attribute_descr[attribute] = description

        self.dataset.restore_checkpoint()  # reset dataset
        return attribute_descr

    def response(self):
        """ Return response needed for analytics interface. """
        return ({
            'patterns': to_map(self.get_patterns()),
            'summary': to_map(self.get_summary()),
            'features': to_map(self.get_features()),
            'catLabels': to_map(self.get_cat_levels())
        })

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

    def is_category(self, attribute):
        """ Returns true if attribute is a category. False o.w. """
        return attribute in self.get_categories()
        
    def get_cat_levels(self):
        """ Returns a dictionary containing the list of levels for each category. """
        types = self.dataset.types
        orderings = self.dataset.orderings
        return {c: list(self.dataset[c].unique()) if types[c] =='Nominal' else orderings[c] for c in self.get_categories()}
        
    def compute_global_feature_scores(self):
        """ Computes the global feature scores based on the patterns.. """

        if not hasattr(self, 'patterns_descr'):
            raise AssertionError("The pattern_description method must be run first.")
        
        feature_scores = []
        for attr, descr in self.patterns_descr.items():
            score = sum(abs(spread['raw_score']) if _significance_check(stats) else 0 \
                        for spread, stats in zip(descr['spread'], descr['stats']))
            
            feature_scores.append({'attribute': attr, 'score': score})

            
        max_feature_score = max(feature_scores, key=lambda x: x['score'])['score']
        if max_feature_score == 0:
            norm_feature_score = [{**fs, 'score': 1, 'raw_score': fs['score']} \
                                  for fs in feature_scores]
        else:
            norm_feature_score = [{**fs, 'score': fs['score'] / max_feature_score,
                                   'raw_score': fs['score']} for fs in feature_scores]        
            
        return sorted(norm_feature_score, key=lambda x: x['score'], reverse=True)

    def summarize_subgroups(self, selected_ID):
        """ Summarizes the groups w/respect to all attributes. 

        Args:
            selected_IDs: Selected pattern ID(s).
            selected_attr: Selected attribute.
        """
        pattern = next((p for p in self.patterns if p.ID == selected_ID), None)
        assert pattern is not None  # pattern must exist

        shap_scores = {}
        for attr, descr in self.patterns_descr.items():
            stats = next((s for s in descr['stats'] if s['ID'] == selected_ID), None)
            assert stats is not None  # pattern must exists

            shap_attr = next((el for el in stats['shap'] \
                              if el['attribute'] == attr), None)

            assert shap_attr is not None  # shap value must exist
            shap_scores[attr] = shap_attr['shap']

            
        # construct the root summary list
        root_summ = [summ for summ in self.group_summary[selected_ID] \
                     if pattern.is_core_attr(summ['attribute'])]

        other_summ = [summ for summ in self.group_summary[selected_ID] \
                     if not pattern.is_core_attr(summ['attribute'])]

        root_summary_list = [{**summ, 'shap': shap_scores[summ['attribute']] } \
                             for summ in root_summ]

        other_summary_list = [{**summ, 'shap': shap_scores[summ['attribute']] } \
                              for summ in other_summ]
        
        root_summary_list.sort(key=lambda x: abs(x['shap']), reverse=True)
        other_summary_list.sort(key=lambda x: abs(x['shap']), reverse=True)
        return {'list': other_summary_list, 'root': root_summary_list}

    def pattern_info_static(self, pattern):
        """ Computes description of the pattern for all attributes. 
        Assumes the stats don't change for each pattern rotation. 

        Args:
            pattern: Pattern of interest.

        Returns:
            A dictionary containing position, stats, descr, and spread 
        for each attribute.
        """
        self.dataset.restore_checkpoint()  # reset the datset
        pattern.apply_pattern(self.dataset)  # filter the dataset based on pattern

        # summary statistics for pattern
        summary_describe = self.dataset.describe()

        # setup the return dict.
        description = {c: {} for c in self.dataset.columns if c != self.target}

        # group summary for the pattern
        self.create_group_summary(pattern.ID)
        stats = self.__get_stats()        

        # target histogram at different zoom levels
        target_hist = self.__get_hover_histogram(self.target)
        
        # shap values for the core attributes
        core_shap = pattern.shap_values(self.dataset.to_pandas(filtered=False), self.target)

        
        # group positions for each attr
        for attr in description:
            pattern.reset_hyperbox()  # reset the hyperbox

            if self.dataset[attr].dtype == 'object':  # nominal attribute
                include = self.dataset.unique(attr).tolist()
                pattern.add_hyperbox_nominal(attr, include)
                pos = self.__get_group_position(attr)
                
            else:  # continuous attribute
                lb, ub = summary_describe[attr]['min'], summary_describe[attr]['max']
                pos = summary_describe[attr]['50%']                
                pattern.add_hyperbox_continuous(attr, lb, ub)
                
            # NOTE: shap values can just be computed once for core attributes.
            shap = core_shap if pattern.is_core_attr(attr) else \
                   pattern.shap_values(self.dataset.to_pandas(filtered=False), self.target)
            
            
            spread = self.__get_spread(shap, attr, stats['size'])
            hover_hist = self.__get_hover_histogram(attr)

            descr = self.__get_description(shap, pattern)
            description[attr] = {'position': pos,
                                 'stats': {'ID': pattern.ID, 'shap': shap,
                                           'hoverHist': hover_hist,
                                           'histZoom': target_hist, **stats},
                                 'descr': descr, 'spread': spread}
        pattern.reset_hyperbox()        
        return description
    
    def pattern_description_fast(self):
        """ Computes the information necessary for the group bubble, 
        detail and summary plots. 
        
        Returns:
            A dictionary which contains render info for each attribute/pattern combo.
        """
        patterns_descr = {c: {'position': [], 'stats': [], 'descr': [], 'spread': []} \
                          for c in self.dataset.columns if c != self.target}
        for p in self.patterns:
            # pattern description for all attributes
            descr = self.pattern_info_static(p)
            for attr, info in descr.items():
                patterns_descr[attr]['position'].append(info['position'])
                patterns_descr[attr]['stats'].append(info['stats'])
                patterns_descr[attr]['descr'].append(info['descr'])
                patterns_descr[attr]['spread'].append(info['spread'])

        self.dataset.restore_checkpoint()  # reset the state
        return patterns_descr

    def pandas_by_pid(self, pid):
        """ Returns the pandas dataframe associated with pattern pid. """
        if pid < 0 or pid >= len(self.patterns):
            raise ValueError("Invalid pid")

        self.dataset.restore_checkpoint()  # init the state

        # apply pattern filters to the dataset
        self.patterns[pid].apply_pattern(self.dataset)
        result = self.dataset.to_pandas()
        
        self.dataset.restore_checkpoint()  # reset the state
        return result
        
    def __init__(self, dataset, target, mine_type, patterns, nsamples=None):
        """ Constructor for the Analyst class. 
        
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
        
        self.target = target
        self.mine_type = mine_type                
        self.patterns = [Pattern(p) for p in patterns]

        self.summary = self.create_summary()
        self.group_summary = {}

        # Divide the continuous attributes into 3rds
        self.min_thirds_max = self.dataset.quantile([0, 0.33, 0.66, 1])        
        self.patterns_descr = self.pattern_description_fast()

        self.global_feature_scores = self.compute_global_feature_scores()
        
