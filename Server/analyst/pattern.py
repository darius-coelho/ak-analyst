import math
import itertools
from itertools import combinations

import numpy as np
import pandas as pd

class Pattern:
    """ Class representing a pattern with useful methods for 
    computing various statistics.
    """

    def __init__(self, pattern_dict):
        """ Constructor for the pattern class. 
        
        Args:
            pattern_dict: Dictionary description of pattern bounds.
        """
        if not isinstance(pattern_dict, dict):
            raise TypeError("pattern_dict must be a dictionary.")

        self.ID = pattern_dict['ID']
        constraints = pattern_dict['constraints']

        for key, value in constraints.items():
            if 'lb' in value and value['lb'] is None:
                value['lb'] = -np.inf
            if 'ub' in value and value['ub'] is None:
                value['ub'] = np.inf

            constraints[key] = value
        
        self.hyperbox = constraints
        self.origin_hyperbox = {**constraints}

    def is_core_attr(self, attr):
        """ Returns True if attr is a core attribute. False o.w.  """
        return attr in self.origin_hyperbox
    
    def reset_hyperbox(self):
        """ Resets to the original hyperbox. """
        self.hyperbox = {**self.origin_hyperbox}
        
    def apply_pattern(self, data):
        """ Applies the constraints associated with this pattern on data. 

        Args:
            data: Dataframe to apply the filter on.
        """
        for attr, desc in self.hyperbox.items():
            if 'in' in desc:  # nominal attribute
                data.apply_nominal_filter(attr, desc['in'])
            else:  # continuous attribute
                data.apply_filter(attr, desc['lb'], desc['ub'])
                
    def add_hyperbox_continuous(self, key, lb=-np.inf, ub=np.inf):
        """ Adds a hyperbox constraint for continuous attribute. 

        Args:
            key: Attribute the constraint is on.
            lb: Lower bound.
            ub: Upper bound.
        """
        self.hyperbox = {key: {'lb': lb, 'ub': ub}, **self.hyperbox}

    def add_hyperbox_nominal(self, key, include):
        """ Adds a hyperbox constraint for nominal attribute.
        
        Args:
            key: Attribute the constraint is on.
            include: List of values to include.

        """
        self.hyperbox = {key: {'in': include}, **self.hyperbox}
        
    def rotate_continuous(self, data, attr):
        """ Rotate the pattern along a continuous attribute.

        Args:
            data: Dataset to apply pattern on.
            attr: Attribute to rotate pattern to.
        
        Returns:
            True if rotate was success, False o.w.
        """
        amin, Q1, Q3, amax = data[attr].replace([np.inf, -np.inf], np.nan)\
                                       .quantile([0, 0.25, 0.75, 1])

        # get the attribute bounds (excluding outliers)
        IQR = Q3 - Q1
        lb = max(amin, Q1 - 1.75 * IQR)
        ub = min(amax, Q3 + 1.75 * IQR)

        nbegin = data.get_counts()['filtered']  # original size of pattern
        data.apply_filter(attr, lb, ub)
        nend = data.get_counts()['filtered']  # size of pattern post rotate

        if nend == 0:
            return False
        
        if nend / nbegin < 0.9:  # support reduce by more than 10%
            lb, ub = amin, amax  # fallback to min/max bounds

        self.hyperbox = {attr: {'lb': lb, 'ub': ub}, **self.hyperbox}
        return True

    def rotate_nominal(self, data, attr, thresh=0.9):
        """ Rotate the pattern along a nominal attribute.

        Args:
            data: Dataset to apply pattern on.
            attr: Attribute to rotate pattern to.
            thresh: Include categories up to 90% of support.
        Returns:
            True if rotate was success, False o.w.
        """
        percent, levels = data.value_counts(attr, normalize=True)

        perc = 0.
        include = []
        for pct, lvl in zip(percent, levels):
            include.append(lvl)
            perc += pct
            if perc >= thresh:
                break
            
        data.apply_nominal_filter(attr, include)
        if not include:
            return False

        self.hyperbox = {attr: {'in': include}, **self.hyperbox}
        return True
    
        
    def rotate(self, data, attr, apply_pattern=True):
        """ Rotate the pattern by adding a constraint on attr and apply 
        the rotated pattern filters on the data.
        
        Args:
            data: Dataset to apply pattern on.
            attr: Attribute to rotate pattern to.
            apply_pattern: If true, applies filter from scratch.

        Returns:
            True if rotate was success, False o.w.
        """
        self.reset_hyperbox()
        
        if apply_pattern:
            self.apply_pattern(data)
        
        if attr in self.hyperbox:
            return True  # no need to rotate

        if data[attr].dtype == 'object':
            return self.rotate_nominal(data, attr)

        return self.rotate_continuous(data, attr)

    
    def __shap(self, attr_loc, coalition, dagg):    
        n = len(coalition) + 1

        def get_agg(coal, atype):
            ''' Get sum/count using coalition (coal) as the key '''
            key = tuple(i in coal for i in range(n))
            if len(key)==1:  # 
                key = key[0]
                
            marginal = set(range(n)) - set(coal)
            try:  # catch if key does not exist (i.e. value is 0)
                vsum = dagg[atype][key]                
            except KeyError:
                vsum = 0

            for l in range(1, len(marginal)+1):
                for M in combinations(marginal, l):
                    mkey = tuple(i in coal or i in M for i in range(n))
                    if len(mkey)==1:
                        mkey = mkey[0]

                    try:  # catch if key does not exist (i.e. value is 0)
                        vsum += dagg[atype][mkey]
                    except KeyError:
                        continue
            return vsum
    
    
        vals = 0
        for l in range(n):
            for S in combinations(coalition, l):
                # get v0 (Set to every value in coalitin to True (sum over everything else))
                v0sum = get_agg(S, 'sum')
                v0ct = get_agg(S, 'count')

                if v0ct == 0:
                    continue
                
                v0 = v0sum / v0ct
                #v0 = get_agg(S, 'sum') / get_agg(S, 'count')
                v1S = tuple([s for s in S] + [attr_loc])
                v1sum = get_agg(v1S, 'sum')
                v1ct = get_agg(v1S, 'count')

                if v1ct == 0:
                    continue  # the margin is effectively 0
                
                v1 = v1sum / v1ct
                
                wt = math.factorial(len(S)) * math.factorial(n - len(S) - 1) / math.factorial(n)
                margin = v1 - v0
            
                if not np.isnan(margin):
                    vals += margin * wt
        return vals

    
    def shap_values(self, sample, dependent):
        ''' Compute a list of attribute shap values for attribute ranges in this pattern.
        
        Args:
            sample: The dataset to compute the shap values for.
            dependent: The dependent attribute.
        
        Returns:
            A sorted list of dicts mapping attributes to aggregate shap values
        and to the attribute range.
        '''

        # NOTE: Since rotation might have occured, we cannot use self.attributes.
        attributes = list(self.hyperbox.keys())        
        
        def get_group():
            ''' Get status of each query 
            (i.e. True or False for each data point and attribute range) 
            '''
            rawdf = sample.dropna(subset=attributes)
    
            data = {dependent: rawdf[dependent].values}
            # ignore warnings about nans, they eval to false anyway
            with np.errstate(invalid='ignore'):
                for attr in self.hyperbox:
                    if 'lb' in self.hyperbox[attr] and 'ub' in self.hyperbox[attr]:            
                        f = (rawdf[attr].values >= self.hyperbox[attr]['lb']) & \
                            (rawdf[attr].values <= self.hyperbox[attr]['ub'])
                    elif 'lb' in self.hyperbox[attr]:
                        f = (rawdf[attr].values >= self.hyperbox[attr]['lb'])
                    elif 'ub' in self.hyperbox[attr]:
                        f = (rawdf[attr].values <= self.hyperbox[attr]['ub'])
                    elif 'in' in self.hyperbox[attr]:  # nominal attribute
                        f = (rawdf[attr].isin(self.hyperbox[attr]['in']))
                    data[attr] = f 
        
            return pd.DataFrame(data)
        
        group_data = get_group()
        
        agg = group_data.groupby(attributes).agg(['sum', 'count'])
        shap_list = []    
        dagg = agg[dependent].to_dict()    
        for attr_loc, attr in enumerate(attributes):
            if 'in' in self.hyperbox[attr]:  # attr is nominal
                r = self.hyperbox[attr]['in']
            else:
                r = [self.hyperbox[attr]['lb'] if 'lb' in self.hyperbox[attr] else -np.inf,
                     self.hyperbox[attr]['ub'] if 'ub' in self.hyperbox[attr] else np.inf]

            coalition = [attributes.index(a) for a in attributes if a != attr]
            shap = self.__shap(attr_loc, coalition, dagg)

            shap_list.append({'attribute': attr, 'shap': shap, 'range': r})

        shap_list.sort(key=lambda x: abs(x['shap']), reverse=True)                       
        return shap_list
    
    # rotate, shap_values
