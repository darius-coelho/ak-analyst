import itertools

import pandas as pd
import numpy as np

from strutils.parse import split_replace_join
from ak_logger import logger, log_it

class Transform:
    """ Base Transform class representing a single transformation. """

    # generator for unique ids.
    id_gen = itertools.count()

    @log_it
    def __init__(self):
        """ Constructor for the abstract Transform class. It initializes 
        the common state variables.
        """
        self.is_visible = True
        self.enabled = True
        self.is_global = False
        self.attr = None

        # list of columns the transformation depends on
        self.dependency_list = []
        
        self.uid = next(Transform.id_gen)

    @log_it
    def rename(self, oldattr, newattr):
        """ Replace the attr value if necessary. """
        if oldattr == self.attr:
            self.attr = newattr

    @log_it            
    def enable(self):
        """ Enables the transform. """
        self.enabled = True

    @log_it        
    def disable(self):
        """ Disables the transform. """
        self.enabled = False

    @log_it        
    def to_dict(self):
        """ Convert the relevant variables to a dictionary. """
        tx = {}
        for k, v in vars(self).items():
            if k not in ['dependent_transforms']:
                tx[k] = v
            else: 
                tx[k] = [t.to_dict() for t in v]
        
        return tx
    
class TypeTransform(Transform):
    """ Class representing a data type transform. """

    @log_it
    def __init__(self, attr, new_type, ordering=None, **kwargs):
        """ Constructor for the TypeTransform class.

        Args:
            attr: Attribute name to apply transform on.
            new_type: New data type.
            ordering: a default ordering for new ordinal attributes.
        """
        super().__init__()

        self.attr = attr
        self.new_type = new_type
        self.ordering = ordering

    @log_it
    def apply(self, data):
        """ Applies the type transform on data. 
        
        Args:
            data: The dataframe to apply the transform on.
        """
        if self.enabled:
            data.set_type(self.attr, self.new_type, self.ordering)

        self.dependency_list = [self.attr]

    @log_it        
    def to_dict(self):
        """ Convert the relevant variables to a dictionary. """
        return {'tType': "Dtype", **super().to_dict()}

class OrderingTransform(Transform):
    """ Class representing an ordering transform. """

    @log_it
    def __init__(self, attr, ordering, **kwargs):
        """ Constructor for the OrderingTransform class.

        Args:
            attr: Attribute name to apply transform on.
            ordering: New ordering of categories for an ordinal attribute.
        """
        super().__init__()

        self.attr = attr
        self.ordering = ordering

    @log_it
    def apply(self, data):
        """ Applies the type transform on data. 
        
        Args:
            data: The dataframe to apply the transform on.
        """
        if self.enabled:
            data.set_ordering(self.attr, self.ordering)

        self.dependency_list = [self.attr]

    @log_it        
    def to_dict(self):
        """ Convert the relevant variables to a dictionary. """
        return {'tType': "OrdinalOrder", **super().to_dict()}

class LogTransform(Transform):
    """ Class representing a log transform. """

    @log_it
    def __init__(self, attr, base, **kwargs):
        """ Constructor for the LogTransform class.

        Args:
            attr: Attribute name to apply transform on.
            base: Base of the log.
        """
        super().__init__()

        self.attr = attr
        self.base = base

    @log_it        
    def apply(self, data):
        """ Applies the log transform on data. 
        
        Args:
            data: The dataframe to apply the transform on.
        """
        if self.enabled:
            data.apply_log(self.attr, self.base)

        self.dependency_list = [self.attr]

    @log_it        
    def to_dict(self):
        """ Convert the relevant variables to a dictionary. """
        return {'tType': "Log", **super().to_dict()}
        
class RenameTransform(Transform):
    """ Class representing a column renaming transform. """

    @log_it
    def __init__(self, attr, name, **kwargs):
        """ Constructor for the RenameTransform class.

        Args:
            attr: Attribute name to apply transform on.
            name: New attribute name
        """
        super().__init__()

        self.attr = attr
        self.name = name

        self.is_visible = False

    @log_it        
    def disable(self):
        """ Overwrite the base class disable function because rename attributes 
        should not be disabled because of dependent attribute changes.
        """
        pass

    @log_it
    def apply(self, data):
        """ Applies the rename transform on data. 
        
        Args:
            data: The dataframe to apply the transform on.
        """
        if self.enabled:
            data.apply_rename(self.attr, self.name)

    @log_it            
    def to_dict(self):
        """ Convert the relevant variables to a dictionary. """
        return {'tType': "ColNameChange", **super().to_dict()}

    
class NormTransform(Transform):
    """ Class representing a column normalizing transform. """

    @log_it
    def __init__(self, attr, newmin, newmax, **kwargs):
        """ Constructor for the NormTransform class.

        Args:
            attr: Attribute name to apply transform on.
            newmin: Lower bound of normalization.
            newmax: Upper bound of normalization.
        """
        super().__init__()

        self.attr = attr
        self.newmin = newmin
        self.newmax = newmax

    @log_it        
    def apply(self, data):
        """ Applies the normalize transform on data. 
        
        Args:
            data: The dataframe to apply the transform on.
        """
        if self.enabled:
            data.apply_normalize(self.attr, self.newmin, self.newmax)

        self.dependency_list = [self.attr]

    @log_it
    def to_dict(self):
        """ Convert the relevant variables to a dictionary. """
        return {'tType': "Norm", **super().to_dict()}
    
    
class ClampTransform(Transform):
    """ Class representing a column clamping transform. """

    @log_it
    def __init__(self, attr, lb, ub, **kwargs):
        """ Constructor for the ClampTransform class.

        Args:
            attr: Attribute name to apply transform on.
            lb: Lower bound to clamp to.
            ub: Upper bound to clamp to..
        """
        super().__init__()

        self.attr = attr
        self.lb = lb
        self.ub = ub
        
    @log_it        
    def apply(self, data):
        """ Applies the normalize transform on data. 
        
        Args:
            data: The dataframe to apply the transform on.
        """
        if self.enabled:
            data.apply_clamp(self.attr, self.lb, self.ub)
    
        self.dependency_list = [self.attr]

    @log_it        
    def to_dict(self):
        """ Convert the relevant variables to a dictionary. """
        return {'tType': "Clamp", **super().to_dict()}
    

class ReplaceTransform(Transform):
    """ Class representing replacing values transform. """

    @log_it    
    def __init__(self, attr, old_vals, new_val, **kwargs):
        """ Constructor for the ReplaceTransform class.

        Args:
            attr: Attribute name to apply transform on.
            old_vals: List of values to replace.
            new_val: New value to replace old values with.
        """
        super().__init__()

        self.attr = attr
        self.old_vals = old_vals
        self.new_val = new_val
        
    @log_it        
    def apply(self, data):
        """ Applies the replace transform on data. 
        
        Args:
            data: The dataframe to apply the transform on.
        """
        if self.enabled:
            data.apply_replace(self.attr, self.old_vals, self.new_val)
        
        self.dependency_list = [self.attr]
        
    @log_it
    def to_dict(self):
        """ Convert the relevant variables to a dictionary. """
        return {'tType': "Repl", **super().to_dict()}
    

class ImputeTransform(Transform):
    """ Class representing replacing missing values transform. """

    @log_it    
    def __init__(self, attr, method, replaceVal=None, **kwargs):
        """ Constructor for the ImputeTransform class.

        Args:
            attr: Attribute name to apply transform on.
            method: Name of the imputation method.
            replaceVal: Value to replace NaN with when method is "Replace"
        """
        super().__init__()

        self.attr = attr
        self.method = method
        self.replaceVal = replaceVal

    @log_it        
    def apply(self, data):
        """ Applies the imputation transform on data. 
        
        Args:
            data: The dataframe to apply the transform on.
        """
        if self.enabled:
            data.apply_fill_missing(self.attr, self.method, self.replaceVal)

        self.dependency_list = [self.attr]

    @log_it        
    def to_dict(self):
        """ Convert the relevant variables to a dictionary. """
        return {'tType': "Missing", **super().to_dict()}

class DropMissing(Transform):
    """ Class representing transform for dropping rows with NaN values in a column. """

    @log_it    
    def __init__(self, attr, lb=-np.inf, ub=np.inf, inc=1, **kwargs):
        """ Constructor for the FilterTransform class.

        Args:
            attr: Attribute name to apply transform on.
            inc: Increment amount.
        """
        super().__init__()

        self.attr = attr
        self.inc = inc
                
    @log_it
    def apply(self, data):
        """ Applies the drop NaN rows transform on data. 
        
        Args:
            data: The dataframe to apply the transform on.
        """
        if self.enabled:
            data.apply_drop_na(self.attr, self.inc)

        self.dependency_list = [self.attr]

    @log_it
    def to_dict(self):
        """ Convert the relevant variables to a dictionary. """
        return {'tType': "Missing-Drop", **super().to_dict()}    

class FilterTransform(Transform):
    """ Class representing filtering on a column transform. """

    @log_it    
    def __init__(self, attr, lb=-np.inf, ub=np.inf, inc=1, **kwargs):
        """ Constructor for the FilterTransform class.

        Args:
            attr: Attribute name to apply transform on.
            lb: Lower bound of the filter.
            ub: Upper bound of the filter.
            inc: Increment amount.
        """
        super().__init__()

        self.attr = attr
        self.lb = lb
        self.ub = ub
        self.inc = inc
                
    @log_it
    def apply(self, data):
        """ Applies the filter transform on data. 
        
        Args:
            data: The dataframe to apply the transform on.
        """
        if self.enabled:
            data.apply_filter(self.attr, self.lb, self.ub, self.inc)

        self.dependency_list = [self.attr]

    @log_it
    def to_dict(self):
        """ Convert the relevant variables to a dictionary. """
        return {'tType': "Filter", **super().to_dict()}


class FilterDateTransform(Transform):
    """ Class representing filtering on a datetime column transform. """

    @log_it    
    def __init__(self, attr, lb=pd.Timestamp.min, ub=pd.Timestamp.max, inc=1, **kwargs):
        """ Constructor for the FilterTransform class.

        Args:
            attr: Attribute name to apply transform on.
            lb: Lower bound of the filter.
            ub: Upper bound of the filter.
            inc: Increment amount.
        """
        super().__init__()

        self.attr = attr
        self.lb = lb
        self.ub = ub
        self.inc = inc
                
    @log_it
    def apply(self, data):
        """ Applies the filter transform on data. 
        
        Args:
            data: The dataframe to apply the transform on.
        """
        if self.enabled:
            data.apply_datetime_filter(self.attr, self.lb, self.ub, self.inc)

        self.dependency_list = [self.attr]

    @log_it
    def to_dict(self):
        """ Convert the relevant variables to a dictionary. """
        return {'tType': "FilterDate", **super().to_dict()}


class NominalFilterTransform(Transform):
    """ Class representing filtering on a nominal column. """

    @log_it    
    def __init__(self, attr, filter_cats, filter_type="Include", inc=1, **kwargs):
        """ Constructor for the FilterTransform class.

        Args:
            attr: Attribute name to apply transform on.
            filter_cats: List of categories to filter on.
            filter_type: Include or Exclude.
            inc: Increment amount.
        """
        super().__init__()

        self.attr = attr
        self.filter_cats = filter_cats
        self.filter_type = filter_type
        self.inc = inc        

    @log_it        
    def apply(self, data):
        """ Applies the filter transform on data. 
        
        Args:
            data: The dataframe to apply the transform on.
        """
        if self.enabled:
            data.apply_nominal_filter(self.attr, self.filter_cats,
                                      self.filter_type, self.inc)

        self.dependency_list = [self.attr]

    @log_it
    def to_dict(self):
        """ Convert the relevant variables to a dictionary. """
        return {'tType': "FilterNom", **super().to_dict()}


class CellSplitTransform(Transform):
    """ Class representing a cell splitting transform. """

    @log_it
    def __init__(self, attr, delimiter, ordered=True, strip='', quote='', **kwargs):
        """ Constructor for the CellSplitTransform class.

        Args:
            attr: Attribute name to apply transform on.
            delimiter: Delimiter to split on.
            ordered: True if ordered split, encoded o.w.
            strip: Characters to strip from the start / end of list.
            quote: Quotation character to remove.        
        """
        super().__init__()
        self.is_global = True        
        self.attr = attr
        self.delimiter = delimiter
        self.ordered = ordered
        self.strip = strip
        self.quote = quote
        
        self.new_cols = [] # new column names for frontend use
        
    @log_it        
    def apply(self, data):
        """ Applies the cell splitting transform on data. 
        
        Args:
            data: The dataframe to apply the transform on.
        """
        
        orig_cols = data.columns
        
        if self.enabled:
            data.apply_cell_split(self.attr, self.delimiter,
                                  self.ordered, self.strip, self.quote)
        
            # store new column names for use on the frontend
            self.new_cols = list(set(data.columns) - set(orig_cols))
        
        self.dependency_list = [self.attr] 

    @log_it        
    def to_dict(self):
        """ Convert the relevant variables to a dictionary. """
        return {'tType': "CellSplit", **super().to_dict()}

    
class OHETransform(Transform):
    """ Class representing a one-hot-encoding transform. """

    @log_it
    def __init__(self, attr, bind=None, **kwargs):
        """ Constructor for the OHETransform class.

        Args:
            attr: Attribute name to apply transform on.
            bind: Optional column to bind OHE to.
        """
        super().__init__()
        self.is_global = True        
        self.attr = attr
        self.bind = bind
        self.new_cols = [] # new column names for frontend use
        
    @log_it        
    def apply(self, data):
        """ Applies the one-hot-encoding transform on data. 
        
        Args:
            data: The dataframe to apply the transform on.
        """
        
        orig_cols = data.columns
        
        if self.enabled:
            data.apply_onehot(self.attr, self.bind)
        
            # store new column names for use on the frontend
            self.new_cols = list(set(data.columns) - set(orig_cols))
        
        self.dependency_list = [self.attr] if self.bind is None \
                               else [self.attr, self.bind]            


    @log_it        
    def to_dict(self):
        """ Convert the relevant variables to a dictionary. """
        return {'tType': "OHE", **super().to_dict()}


class RankTransform(Transform):
    """ Class representing a transform which maps category levels to ranks. """

    def __init__(self, attr, rankattr, ranktiers, derived_attr=None, **kwargs):
        """ Constructor for the RankTransform class.

        Args:
            attr: Attribute name to apply transform on.
            rankattr: Attribute to rank on.
            ranktiers: Number of tiers/ranks.
        """
        super().__init__()
        self.is_global = True        
        self.attr = attr
        self.rankattr = rankattr
        self.ranktiers = ranktiers
        self.derived_attr = derived_attr
        self.new_cols = [] # new column names for frontend use
        
    def apply(self, data):
        """ Applies the rank transform on data. 
        
        Args:
            data: The dataframe to apply the transform on.
        """

        orig_cols = data.columns

        if self.enabled:
            data.apply_rank(self.attr, self.rankattr, self.ranktiers, self.derived_attr)

            # store new column names for use on the frontend
            self.new_cols = list(set(data.columns) - set(orig_cols))
        
        self.dependency_list = [self.attr, self.rankattr]

    def rename(self, oldattr, newattr):
        """ Rename either the nominal or derived rank transform attribute. 

        Args:
            oldattr: Attribute to replace.
            newattr: New attribute name.
        """
        super().rename(oldattr, newattr)

        if oldattr == self.rankattr:
            self.rankattr = newattr

        if oldattr in self.new_cols:
            self.derived_attr = newattr            
            self.new_cols = [newattr if oldattr == c else c for c in self.new_cols]

        
    def to_dict(self):
        """ Convert the relevant variables to a dictionary. """
        return {'tType': "Rank", **super().to_dict()}

        
class CustomTransform(Transform):
    """ Class representing a custom column transform. """

    @log_it    
    def __init__(self, attr, expr, **kwargs):
        """ Constructor for the CustomTransform class.

        Args:
            attr: Attribute name to apply transform on.
            expr: Pythonic expression to evaluate.
        """
        super().__init__()
        
        self.attr = attr
        self.expr = expr

    @log_it        
    def set_dependencies(self, columns):
        """ Sets the dependencies for a custom transformation. 

        Args:
            columns: List of columns in the dataset.
        """
        cols = sorted(columns, key=len, reverse=True)
        self.dependency_list = []
        expr = self.expr

        for c in cols:
            if c in expr:
                self.dependency_list.append(c)
                expr = expr.replace(c, '')


    @log_it                
    def apply(self, data):
        """ Applies the custom transform on data. 
        
        Args:
            data: The dataframe to apply the transform on.
        """
        if self.enabled:
            data.apply_custom(self.attr, self.expr)

        self.set_dependencies(data.columns)

    @log_it        
    def rename(self, oldattr, newattr):
        """ Replace any references to oldattr with newattr. 
        
        Args:
            oldattr: Attribute to replace.
            newattr: New attribute name.
        """
        super().rename(oldattr, newattr)
        
        # replace any references in the expression
        cols = sorted(self.dependency_list, key=len, reverse=True)
        rename = lambda delim: newattr if delim == oldattr else delim

        # update the expression
        self.expr = split_replace_join(self.expr, cols, rename)

        # update the dependency list
        self.dependency_list = [rename(attr) for attr in self.dependency_list]


    @log_it        
    def to_dict(self):
        """ Convert the relevant variables to a dictionary. """
        return {'tType': "Custom", **super().to_dict()}

    
class CreateDerivedTransform(CustomTransform):
    """ Class representing a transform which creates a derived attribute.. """

    @log_it    
    def __init__(self, attr, expr, **kwargs):
        """ Constructor for the CreateDerivedTransform class.

        Args:
            attr: New attribute name to create.
            expr: Pythonic expression to evaluate.
        """
        super().__init__(attr, expr)
        self.is_global = True
        self.is_visible = False
        
        self.attr = attr
        self.expr = expr

    @log_it        
    def rename(self, oldattr, newattr):
        """ Replace any references (including in dependencies) of oldattr with newattr. 

        Args:
            oldattr: Attribute to replace.
            newattr: New attribute name.
        """
        super().rename(oldattr, newattr)

        
    @log_it            
    def apply(self, data):
        """ Applies the create derived transform on data. 
        
        Args:
            data: The dataframe to apply the transform on.
        """
        if self.enabled:                
            data.create_derived(self.attr, self.expr)
        
        self.set_dependencies(data.columns)
        
    @log_it
    def to_dict(self):
        """ Convert the relevant variables to a dictionary. """
        return {**super().to_dict(), 'tType': "Derived"}
