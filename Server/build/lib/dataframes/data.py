import uuid
import numbers
import functools

import dask.dataframe as dd
import dask.array as da
import dask

import numpy as np
import pandas as pd

from dataframes.data_reader import DataReaderPandas
from strutils.parse import split_replace_join
from ak_logger import logger, log_it

from config_parameters.file_config import _validate_options

@log_it
def _read_csv_head_pandas(filepath, nrows=50, options=None):
    """ loads the firsr nrows ascii file with the options set by the user.
        
    Args:
        path: file path to the data file.
        nrows: the number of rows to read
        options: options for reading files (encoding, header row etc).

    Returns:
        A pandas dataframe containing the data loaded from the file.
    """
    if options is None:
        # load with pandas defaults if options are None
        return pd.read_csv(filepath, nrows=nrows)   

    # Skip all rows after the header if the user specifies lines to be skipped
    skip_rows = None
    if options['startLine'] > 0:        
        skip_rows = range(options['headerRow']+1,  options['headerRow']+options['startLine']+1)  
    
    # Generate a list of strings to be identified as NaN values
    na_options = None
    if len(options['naOptions']):
        na_options = []
        for opt in options['naOptions']:
            na_options.append(opt['value'])
    
    return pd.read_csv(
            filepath,
            nrows=nrows,
            encoding=options['encoding'], 
            delimiter=options['delim'],
            header=options['headerRow'],
            skiprows=skip_rows,
            lineterminator=options['lineDelim'],
            escapechar=options['escapechar'],
            comment=options['comment'],
            decimal=options['decimal'],
            thousands=options['thousands'],
            skip_blank_lines=options['skipEmpty'],
            na_values=na_options
        )    

@log_it
def _detect_types(data, filepath=None, nrows=100, options=None, errors='coerce'):
    """ Detects the attribute data types.
        
    Args:
        data: Data to get column types for.
        nrows: Number of rows to base to estimate types.
        errors: Determines how errors should be handled in to_numeric.

    Returns:
        List of numerical columns
    """
    if filepath is None: # If path is none then probably an internally created dataframe
        return  # no need to perform type conversion

    if errors not in ['raise', 'coerce']:
        raise ValueError("errors should be 'raise' or 'coerce'")

    numcols = []
    to_numeric = dd.to_numeric if isinstance(data, dd.DataFrame) else pd.to_numeric        

    head = _read_csv_head_pandas(filepath, options=options)
    
    for c in head.columns:
        try:
            head[c].astype(float)  # will raise an error if not numeric
            numcols.append(c)

            if options['decimal'] != ".":
                data[c] = data[c].str.replace(options['decimal'], ".")                
            if options['thousands'] is not None:
                data[c] = data[c].str.replace(options['thousands'], "")
            
            data[c] = to_numeric(data[c], errors=errors) \
                      .replace([np.inf, -np.inf], np.nan)
        except:
            pass  # keep types as objects
    
    return numcols

@log_it
def _read_csv_to_dask(filepath, options):
    """ loads an ascii file with the options set by the user.
        
    Args:
        path: file path to the data file.
        options: options for reading files (encoding, header row etc).

    Returns:
        A dask dataframe containing the data loaded from the file.
    """

    if options is None:
        # load with dask defaults if options are None
        return dd.read_csv(filepath, blocksize="4MB",
                    assume_missing=True, dtype='object')
    
    # Skip all rows after the header if the user specifies lines to be skipped
    skip_rows = None
    if options['startLine'] > 0:        
        skip_rows = range(options['headerRow']+1,  options['headerRow']+options['startLine']+1)
    
    # Generate a list of strings to be identified as NaN values
    na_options = None
    if len(options['naOptions']):
        na_options = []
        for opt in options['naOptions']:
            na_options.append(opt['value'])

    # Let dtpye be determined by pandas if the user sets 
    # the decimal and thousand options to non-default values
    dtype = 'object'

    return dd.read_csv(
            filepath, 
            blocksize="4MB",
            assume_missing=True, 
            dtype=dtype,
            encoding=options['encoding'], 
            delimiter=options['delim'],
            header=options['headerRow'],
            skiprows=skip_rows,
            lineterminator=options['lineDelim'],
            escapechar=options['escapechar'],
            comment=options['comment'],
            decimal=options['decimal'],
            thousands=options['thousands'],
            skip_blank_lines=options['skipEmpty'],
            na_values=na_options
        )    
    

class Data:
    """ Wrapper for the full dataset stored in a dask dataframe. """

    @log_it
    def __init__(self, filepath=None, options=None, delay_load=True):
        """ Constructor for the Data class. 

        Args:
            filepath: Filepath to the data.
        """
        self.filepath = filepath
        self.is_loaded = False

        # validate options, if None a set of defaults will be generated
        self.options = _validate_options(options)    
        
        # list of operations to execute after the data is loaded
        self.delayed_ops = []

        if filepath is None:
            return  # create empty object        
       
        if not isinstance(filepath, str):
            raise TypeError("Expected filepath to be a string.")        

        if delay_load:
            self.reader = DataReaderPandas(self.filepath, options=self.options)
            self.data_columns = self.reader.columns()
            self.orig_columns = self.data_columns.copy()

        else:
            self.load_to_dask()


        
    @log_it
    def load_to_dask(self):
        """ Load the data into a dask dataframe. """
        # data_obj contains the unmodified data
        # this is useful to have when setting the column type
        # (e.g. setting Nominal to Numerical results in a column of
        # NaNs. Changing back to Nominal would then require re-reading
        # the entire file).
        if self.filepath is None:
            assert hasattr(self, '_data')  # data must be initialized
            self._data_obj = self._data.astype(object).copy()
        else:
            self._data_obj = _read_csv_to_dask(self.filepath, self.options)

        # data_typ contains the typed data. This data gets written to
        # a parquet filetype with a random name. The advantage of this
        # variable is two fold. (1) It improves performance as dask
        # operations are faster with parquet files. (2) It enables us
        # to quickly reset the working data variable (i.e. self._data).
        self._data_typ = self._data_obj.copy()        
        _detect_types(self._data_typ, self.filepath, options=self.options)  # cast columns where possible

        parquet_filename = str(uuid.uuid4())

        # We need to store this in a parquet file to avoid partition
        # misalignment when applying custom operations.
        self.fname_obj = 'parquet/'+parquet_filename+'_obj.parquet'        
        self._data_obj.to_parquet(self.fname_obj)
        self._data_obj = dd.read_parquet(self.fname_obj)

        self.fname_typ = 'parquet/'+parquet_filename+'.parquet'
        self._data_typ.to_parquet(self.fname_typ)
        self._data_typ = dd.read_parquet(self.fname_typ)
        
        self._data = self._data_typ.copy()
        self.create_derived_variables()
        self.is_loaded = True

        # apply all delayed operations
        for op in self.delayed_ops:
            op()
            
    @log_it        
    def create_derived_variables(self):
        """ Creates the derived variables based on the data. """
        # store only the data columns
        self.data_columns = np.array(self._data.columns)
        self.orig_columns = self.data_columns.copy()
        
        self.filter_col = 'filters_applied'
        self._data[self.filter_col] = 0
        self.full_size = len(self._data)  # full dataset size
        self.filter_size = self.full_size        
        
    @log_it
    def sample_from_dask(self, nsamples=1000):
        """ Samples the data from a dask dataframe. 

        Args:
            nsamples: Number of samples
        
        Returns:
            An instance of the DataSample class.
        """
        logger.info("Sampling from dask")
        frac = nsamples / self.full_size
        numcols = [c for c in self._data[self.data_columns] \
                   .select_dtypes(exclude=['object', 'category']).columns \
                   if c != self.filter_col]
        
        if frac >= 1:
            assert self.filter_col not in self.data_columns
            return DataSample(self.filter_data[self.data_columns].compute(),
                              numcols, self)
        
        return DataSample(self.filter_data[self.data_columns].sample(frac=frac).compute(),
                          numcols, self)
    
    @log_it
    def sample_from_file(self, nsamples=1000):
        """ Samples the data directly from the file. 

        Args: 
            nsamples: Number of samples.

        Returns:
            An instance of the DataSample class.
        """
        logger.info("Sampling from file")
        sample = self.reader.sample(nsamples)        
        numcols = _detect_types(sample, self.filepath, options=self.options)        
        return DataSample(sample, numcols, self, should_apply_ops=True)

    @log_it    
    def sample(self, nsamples=1000):
        """ Samples the data. 

        Args: 
            nsamples: Number of samples.

        Returns:
            An instance of the DataSample class.
        """
        if self.is_loaded:
            return self.sample_from_dask(nsamples)

        return self.sample_from_file(nsamples)
    
    @log_it
    def infer_types(self):
        """ Infer the column types as either Index, Nominal or Numerical. """
        if not self.is_loaded:
            self.load_to_dask()  # cannot be delayed
            
        # initialize all types to numerical
        types = pd.DataFrame(data="Numerical", index=self.data_columns, columns=['type'])

        catcols = self._data.select_dtypes(include=['object', 'category']).columns

        # the object / categories default to Nominal
        types.loc[catcols, 'type'] = 'Nominal'

        # Index types are reserved for those with a unique value for each row
        batch = [self._data[c].nunique() for c in catcols]
        index_cols = [col for col, nunique in zip(catcols, dask.compute(*batch)) \
                      if nunique == self.full_size]
        types.loc[index_cols, 'type'] = 'Index'
        return types

    @log_it
    def get_type(self, col):
        """ Infer the type of a single column. 

        Args:
            col: Column to infer the type for.

        Returns:
            The type as either Numerical, Nominal, or Index.
        """
        if not self.is_loaded:
            self.load_to_dask()  # cannot be delayed

        nunique = dask.compute(self._data[col].nunique())[0]
        if self._data[col].dtype.name in ['object', 'category']:
            if nunique == self.full_size:
                return "Index"

            return "Nominal"

        if nunique == 2:
            return "Nominal"

        return "Numerical"

    @log_it
    def set_type(self, attr, coltype, save=False):
        """ Sets the column type. 

        Args:
            attr: Attribute to set the type for.
            coltype: Nominal, Index, or Numerical.
            save: If true, saves the result in a parquet file.
        """
        if coltype not in ['Nominal', 'Numerical', 'Index']:
            raise ValueError("coltype should be Nominal or Numerical")

        if not self.is_loaded:
            self.delayed_ops.append(functools.partial(self.set_type, attr, coltype, save))
            return
        
        self._data[attr] = self._data_obj[attr].copy()
        if coltype == "Numerical":
            self._data[attr] = dd.to_numeric(self._data[attr], errors='coerce')

        if save:
            self.save_parquet()

    @log_it            
    def save_parquet(self):
        """ Saves data into a parquet file. """
        self._data.to_parquet(self.fname_typ)
        self._data_typ = dd.read_parquet(self.fname_typ)
        self._data = self._data_typ.copy()

    @log_it        
    def apply_filter(self, col, lb=-np.inf, ub=np.inf, inc=1):
        """ Applies a filter by incrementing (by inc) all values outside 
        the range lb <= col <= ub. 

        Args:
            col: Column to apply the filter on.
            lb: Lower bound of the filter.
            ub: Upper bound of the filter.
            inc: Increment amount.
        """
        if not isinstance(lb, numbers.Number):
            raise TypeError("lb must be a number")

        if not isinstance(ub, numbers.Number):
            raise TypeError("ub must be a number")

        if lb == -np.inf and ub == np.inf:
            raise ValueError("one of lb or ub must be set")

        if not self.is_loaded:  # delay this function until ready
            self.delayed_ops.append(functools.partial(self.apply_filter, col, lb, ub, inc))
            return
        
        index = (self._data[col] < lb) | (self._data[col] > ub)
        
        # use index as a mask (i.e. true = 1, false = 0) for increment.
        self._data[self.filter_col] = self._data[self.filter_col] + index * inc

        # set the filter size
        self.filter_size = (self._data[self.filter_col] < 1).sum()
        
    @log_it        
    def apply_nominal_filter(self, col, include=[], ftype='Include', inc=1):
        """ Applies a filter to a nominal attribute by incrementing (by inc) 
        all values with a category level in include .

        Args:
            col: Column to apply the filter on.
            include: List of category levels to filter on.
            ftype: Indicates whether filter is inclusion or exclusion.
            inc: Increment amount.
        """
        if not isinstance(include, list):
            raise TypeError("include is expected to be a list.")

        if ftype not in ['Include', 'Exclude']:
            raise ValueError("ftype is expected to be Include or Exclude")
        
        if not self.is_loaded:  # delay this function until ready
            self.delayed_ops.append(functools.partial(self.apply_nominal_filter,
                                                      col, include, ftype, inc))
            return        

        if ftype == "Include":
            index = (~self._data[col].isin(include))
        else:
            index = (self._data[col].isin(include))

        # use index as a mask (i.e. true = 1, false = 0) for increment.
        self._data[self.filter_col] = self._data[self.filter_col] + index * inc

        # set the filter size
        self.filter_size = (self._data[self.filter_col] < 1).sum()

    @log_it        
    def reset_data(self):
        """ Resets the data. """
        if not self.is_loaded:
            self.data_columns = self.reader.columns()
            self.delayed_ops = []  # cancel all delayed ops
            return
            
        self._data = self._data_typ.copy()

        # store only the data columns
        self.data_columns = self.orig_columns.copy()
        
        self._data[self.filter_col] = 0
        # set the filter size to the original size
        self.filter_size = self.full_size

    @log_it        
    def reset_data_w_col(self, colvec):
        """ Resets the data and adds the column vector to the dataframe. 

        Args:
            colvec: List of column vector to add to the dask dataframe.
        """
        if not self.is_loaded:
            self.load_to_dask()
            
        self._data = self._data_typ.copy()        
        for cvec in colvec:
            self._data[cvec.name] = cvec
        
        # store only the data columns
        self.data_columns = np.array(self._data.columns)
        self._data[self.filter_col] = 0

    @log_it
    def apply_rename(self, col, name):
        """ Renames the column 'col' with name. 
        
        Args:
            col: Column to rename.
            name: New name.        
        """        
        if name in self.columns: 
            return  # The column has already been renamed

        if col not in self.columns:
            return  # The column does not exist (nothing to rename)

        if not self.is_loaded:  # delay this function until ready
            self.delayed_ops.append(functools.partial(self.apply_rename, col, name))
            self.data_columns = [c for c in self.data_columns if c != col] + [name]
            return

        self._data = self._data.rename(columns={col: name})
        self.data_columns = np.array([c for c in self._data.columns if c != self.filter_col])

    @log_it        
    def apply_custom(self, col, expr):
        """ Applies a custom transformation based on a pythonic expression. 

        Args:
            col: Column to apply expression on.
            expr: Pythonic expression to evaluate.
        """
        if not self.is_loaded:
            self.delayed_ops.append(functools.partial(self.apply_custom, col, expr))
            return
        
        cols = sorted(list(self.data_columns), key=len, reverse=True)

        expr = split_replace_join(expr, cols, lambda delim: "self._data['"+delim+"']")
        
        try:
            self._data[col] = eval(expr)
            if col not in self.orig_columns:
                self._data_typ[col] = self._data[col].copy()
                self._data_obj[col] = self._data[col].astype(object)            
        except Exception as e:
            print("Expression: ", expr)
            print(e)
            raise

    @log_it        
    def create_derived(self, col, expr):
        """ Creates a derived attribute. """
        if not self.is_loaded:
            self.delayed_ops.append(functools.partial(self.create_derived, col, expr))
            self.data_columns.append(col)
            return
        
        self.apply_custom(col, expr)
        
        if col not in self.data_columns:
            self.data_columns = np.append(self.data_columns, col)

    @log_it        
    def apply_normalize(self, col, newmin, newmax):
        """ Normalize the column between new_min and new_max. 
        
        Args:
            col: Column to normalize.
            newmin: New lower bound.
            newmax: New upper bound.
        """
        if not self.is_loaded:
            self.delayed_ops.append(functools.partial(self.apply_normalize, col, newmin, newmax))
            return

        new_range = newmax - newmin
        colvec = self.filter_data[col]

        # sample_info contains the min and max values
        curmin, curmax = self.filter_data[col].min(), self.filter_data[col].max()

        def apply_norm(vec):
            """ Helper function for applying the norm. """
            return new_range * (vec - curmin) / (curmax - curmin) + newmin
            
        self._data[col] = apply_norm(self._data[col])
       
    @log_it
    def apply_log(self, col, base=10):
        """ Apply log transformation to column. 

        Args:
            col: Column to apply log on.
            base: log base. 
        """        
        if col not in self.columns:
            raise ValueError(f"{col} is not a column in the data")

        if not self.is_loaded:
            self.delayed_ops.append(functools.partial(self.apply_log, col, base))
            return

        self._data[col] = da.log(self._data[col]) / da.log(base)
        self._data[col] = self._data[col].replace(np.inf, np.nan)
        self._data[col] = self._data[col].replace(-np.inf, np.nan)
     
    @log_it
    def apply_clamp(self, col, lb, ub):
        """ Clamp the data to between lb and ub. 
        
        Args:
            col: Column to clamp.
            lb: Lower bound to clamp to.
            ub: Upper bound to clamp to.
        """
        if not self.is_loaded:
            self.delayed_ops.append(functools.partial(self.apply_clamp, col, lb, ub))
            return

        self._data[col] = self._data[col].clip(lb, ub)
     
    @log_it        
    def apply_fill_missing(self, col, method):
        """ Fill missing data based on the 'method'. 
        
        Args:
            col: Column to fill missing data.
            method: Method of filling missing data.
        """
        if not isinstance(method, str):
            raise TypeError("method should be a sting indicating the imputation method.")

        if method not in ['Mean', 'Interpolate', 'Pad', 'Zero']:
            raise ValueError("method must be one of 'Mean', 'Interpolate', 'Pad' or 'Zero'")

        if not self.is_loaded:
            self.delayed_ops.append(functools.partial(self.apply_fill_missing, col, method))
            return

        if method == 'Mean':
            mean = self.filter_data[col].mean()          
            self._data[col] = self._data[col].fillna(mean)

        if method == "Interpolate":
            # NOTE: There does not appear to be an interpolate method for dask
            # TODO: Explore custom method using apply
            mean = self.filter_data[col].mean()            
            self._data[col] = self._data[col].fillna(mean)
            
        if method == "Pad":
            self._data[col] = self._data[col].fillna(method='ffill').fillna(method='bfill')

        if method == "Zero":
            self._data[col] = self._data[col].fillna(0)

    @log_it        
    def apply_drop_na(self, col, inc=1):
        """ Applies a filter on NaN values to an attribute by incrementing (by inc) 
        all values with a category level in include .

        Args:
            col: Column to apply the filter on.
            inc: Increment amount.
        """
        if not self.is_loaded:
            self.delayed_ops.append(functools.partial(self.apply_drop_na, col, inc))
            return

        # determine which indices have na values
        index = self.data[col].isna()          

        # use index as a mask (i.e. true = 1, false = 0) for increment.
        self.data[self.filter_col] = self.data[self.filter_col] + index * inc

        # set the filter size
        self.filter_size = (self.data[self.filter_col] < 1).sum()

    @log_it            
    def apply_replace(self, col, old_vals, new_val):
        """ Wrapper for dataframe replace method. 
        
        Args:
            col: Column to call replace on.
            old_vals: Current values to replace.
            new_val: Value to replace old_vals with.
        """
        if not self.is_loaded:
            self.delayed_ops.append(functools.partial(self.apply_replace, col,
                                                      old_vals, new_val))
            return

        self._data[col] = self._data[col].replace(old_vals, new_val)

    @log_it
    def _valid_column_name(self, col):
        """ Takes a proposed column name and makes it unique. 

        Args:
            col: Proposed column name.

        Returns:
            Column name guaranteed to be unique.
        """
        if col not in self.data_columns:
            return col

        i = 1
        unique_col = col
        while unique_col in self.data_columns:
            unique_col = f"{col}_({i})"
            i += 1

        return unique_col

    @log_it    
    def _valid_column_names(self, cols):
        """ Takes a list of proposed column names and makes them 
        unique if they are not currently. 

        Args:
            cols: List of proposed column names.

        Returns:
            List of column names guaranteed to be unique.
        """
        return [self._valid_column_name(c) for c in cols]

    @log_it    
    def apply_onehot(self, col):
        """ Apply one hot encoding on the values of col. 
        
        Args:
            col: Column to apply one hot encoding on.

        Returns:
            List of category levels
        """
        if not self.is_loaded:
            self.load_to_dask()  # OHE cannot be delayed
            
        levels = self._data[col].unique()
        ohe_cols = [f'{col}_{l}' for l in levels]  # get ohe columns
        ohe_cols = self._valid_column_names(ohe_cols)
        
        for ohe, l in zip(ohe_cols, levels):
            self._data[ohe] = (self._data[col]==l).astype(int)
            
        self.data_columns = np.concatenate((self.data_columns, ohe_cols))
        self._data_typ[ohe_cols] = self._data[ohe_cols].copy()
        self._data_obj[ohe_cols] = self._data[ohe_cols].astype(object)            

        return levels

    @log_it
    def apply_rank(self, col1, col2, nranks):
        """ Apply a rank transformation to the values of col1. 

        Args:
            col1: Column to transform.
            col2: Column to base col1's ranking on.
            nranks: Number of ranks.        
        """
        if not self.is_loaded:
            self.load_to_dask()  # Rank cannot be delayed
            
        ordered_col1 = dask.compute(self._data.groupby(col1)[col2].mean())[0].sort_values()
        
        quants = np.nanquantile(ordered_col1.values, q=[i/nranks for i in range(1, nranks)])
        rank = np.searchsorted(quants, ordered_col1)
        mapper = {l: f'rank_{r}' for l, r in zip(ordered_col1.index, rank)}

        rank_attr = self._valid_column_name(f'{col1}_rank{nranks}_{col2}')
        self._data[rank_attr] = self._data[col1].apply(lambda x: mapper[x],
                                                       meta=(rank_attr, object))
        self._data_typ[rank_attr] = self._data[rank_attr].copy()
        self._data_obj[rank_attr] = self._data[rank_attr].copy()
        
        self.data_columns = np.append(self.data_columns, rank_attr)
        return mapper
    
    @log_it
    def preview_filter(self, col, lb, ub, bins=30):
        """ Preview the filter """
        if not isinstance(lb, numbers.Number):
            raise TypeError("lb must be a number")

        if not isinstance(ub, numbers.Number):
            raise TypeError("ub must be a number")

        count, count_all, division = self.histograms(col, bins, lb, ub)
        return count, division, count_all, division

    @log_it    
    def describe(self, columns=None):
        """ Wrapper for the native describe method. 
        
        Args:
            columns: Columns to include in the description.
        
        Returns:
            Pandas dataframe desribing the columns.
        """
        if columns is None:
            return self.filter_data[self.data_columns].describe(include='all').compute()

        return self.filter_data[columns].describe().compute()

    @log_it    
    def describe_col(self, col):
        """ Wrapper for native describe method on a single column. """
        return self.filter_data[col].describe(include='all').compute()

    @log_it    
    def has_na(self, col=None):
        """ Checks if col has any missing values. 

        Args:
            col: Column to check for missing values.

        Returns:
            Bool indicating if col has NaNs or a pandas series with index
        mapping to column and value as Bool.
        """
        if col is None:            
            return dask.compute(self.filter_data[self.data_columns].isna().any())[0]
        
        return dask.compute(self.filter_data[col].isna().any())[0]

    @log_it
    def count_na(self, col=None):
        """ Checks if col has any missing values. 

        Args:
            col: Column to check for missing values.

        Returns:
            Number indicating the count of NaNs in col or a pandas series with index
            mapping to column and value as the count of NaNs.
        """
        if col is None:            
            return dask.compute(self.filter_data[self.data_columns].isna().sum())[0]
        
        return dask.compute(self.filter_data[col].isna().sum())[0]

    @log_it
    def histogram(self, col, bins, **kwargs):
        """ Computes a histogram (with filters) based on the full data. 
        
        Args:
            col: Column to compute the histogram for.
            bins: Division for histogram.

        Returns:
            counts and bins from numpy histogram method.
        """
        vector = self.filter_data[col].dropna()
        count, bins = da.histogram(vector, bins=bins, range=(vector.min(), vector.max()))
        return dask.compute(count, bins)

    @log_it    
    def histogram_all(self, col, bins):
        """ Computes a histogram (no filters) based on the full data. 
        
        Args:
            col: Column to compute the histogram for.
            bins: Division for histogram.

        Returns:
            counts and bins from numpy histogram method.
        """
        vector = self.data[col].dropna()
        count, bins = da.histogram(vector, bins=bins, range=(vector.min(), vector.max()))
        return dask.compute(count, bins)

    @log_it
    def histogram_batch(self, columns, bins, filtered=True, **kwargs):
        """ Computes the histogram for all columns. 
        
        Args:
            columns: List of columns in the dataframe to compute histogram.
            bins: Division for the histograms. 
            filtered: Computes histogram on filtered data if True, full data o.w.
        """
        if not isinstance(bins, int):
            raise TypeError("bins should be an integer indicating the number of bins")

        if filtered:
            return [self.histogram(c, bins) for c in columns]
        
        return [self.histogram_all(c, bins) for c in columns]

    @log_it    
    def histograms(self, col, nbins=30, lb=-np.inf, ub=np.inf):
        """ Computes both the filtered and unfiltered histogram based 
        on the data. 
    
        Args:
            col: Column to compute the histogram for.
            nbins: Number of bins.
            lb: Include values >= than lower bound
            ub: Include values <= than upper bound

        Returns:
            A tuple containing counts, counts_all, and bins.
        """
        if not isinstance(nbins, int):
            raise TypeError("nbins is expected to be an integer.")

        filt_data = self.filter_data[col]
        filt_data = filt_data[(filt_data >= lb) & (filt_data<=ub)].dropna()

        # intitialize bin range
        r_min = filt_data.min()
        r_max = filt_data.max()

        # Use lb and ub to compute bins values if they are finite
        if np.isfinite(lb):
            r_min = lb
        if np.isfinite(ub):
            r_max = ub
        
        # Filtered histogram data.        
        counts, bins = da.histogram(filt_data, bins=nbins,
                                    range=(r_min, r_max))
        counts_all, _ = da.histogram(self._data[col], bins=bins)
        assert np.all(counts_all >= counts)  # sanity check
        
        return dask.compute(counts, counts_all, bins)

    @log_it
    def histograms_batch(self, columns, nbins, **kwargs):
        """ Computes the both the filtered and unfiltered histogram for all columns. 
        
        Args:
            columns: List of columns in the dataframe to compute histogram.
            bins: Division for the histograms. 
            filtered: Computes histogram on filtered data if True, full data o.w.
        """
        if not isinstance(nbins, int):
            raise TypeError("nbins should be an integer indicating the number of bins")

        return [self.histograms(c, nbins) for c in columns]

    @log_it
    def value_counts(self, col):
        """ Wrapper for the value counts method (filtered data). 
        
        Args:
            col: Column to get the value counts for.

        Returns:
            A tuple containing (counts, levels)
        """
        result = dask.compute(self.filter_data[col].value_counts())[0]
        return result.tolist(), result.index.tolist()

    @log_it
    def value_counts_all(self, col):
        """ Wrapper for the value counts method (no filter). 
        
        Args:
            col: Column to get the value counts for.

        Returns:
            A tuple containing (counts, levels)
        """
        result = dask.compute(self._data[col].value_counts())[0]
        return result.tolist(), result.index.tolist()

    @log_it
    def value_counts_batch(self, columns, filtered=True):
        """ Computes the value counts for all columns. 
        Batching improves performance for dask.

        Args:
            columns: List of columns in the dataframe to compute value counts.
            filtered: Computes value counts on filtered data if True, full data o.w.

        Returns:
            A list containing the counts and levels for each category.
        """
        if filtered:
            batch = [self.filter_data[c].value_counts() for c in columns]
        else:
            batch = [self.data[c].value_counts() for c in columns]
            
        return [(result.tolist(), result.index.tolist()) for result in dask.compute(*batch)]

    @log_it
    def corr(self):
        """ Computes correlation table on sampled data. """       
        return dask.compute(self.data[self.data_columns].corr())[0]

    @log_it
    def get_sampled_data(self, nrows=10):
        """ Get preview rows. """
        return self._data[self.data_columns].head(nrows)

    @log_it
    def mean(self, col):
        """ Returns the mean along column. """
        return dask.compute(self.filter_data[col].mean())[0]

    @log_it
    def std(self, col):
        """ Returns the standard deviation along column. """
        return dask.compute(self.filter_data[col].std())[0]

    @log_it
    def drop_columns(self, drop):
        """ Marks the columns in drop to be deleted. 
        
        Args:
            drop: List of columns to drop.
        """
        if not self.is_loaded:  # data_columns gets reset on load
            self.delayed_ops.append(functools.partial(self.drop_columns, drop))

        self.data_columns = [c for c in self.data_columns if c not in drop]

    @log_it        
    def drop_column(self, col):
        """ Marks a column to be dropped. 
        
        Args:
            col: Column to drop.
        """
        if not self.is_loaded:  # data_columns gets reset on load
            self.delayed_ops.append(functools.partial(self.drop_column, col))
            
        self.data_columns = [c for c in self.data_columns if c != col]

    @log_it        
    def get_counts(self):
        """ Returns a dict. containing the original size and filtered data size. """
        if not self.is_loaded:
            self.load_to_dask()
            
        if not isinstance(self.filter_size, numbers.Number):
            self.filter_size = self.filter_size.compute()
            
        return {
            'original': self.full_size,
            'filtered': int(self.filter_size)
        }

    @log_it
    def get_columns(self):
        """ Wrapper for columns """
        return self.columns

    @log_it
    def to_pandas(self):
        """ Returns the data as a pandas dataframe. """
        return dask.compute(self.filter_data[self.data_columns])[0]
    
    @property
    @log_it
    def columns(self):
        return self.data_columns
   
    @property
    def data(self):
        """ Returns the full dataset. """
        if not self.is_loaded:
            self.load_to_dask()
        return self._data
    
    @property
    @log_it
    def filter_data(self):
        """ Returns the full filtered dataset. """        
        return self.data[self.data[self.filter_col] < 1]
    
    @property
    @log_it
    def shape(self):
        """ Returns the original shape. """
        if not self.is_loaded:
            self.full_size = self.reader.line_count()
            
        return (self.full_size, len(self.data_columns))

    @log_it
    def __getitem__(self, index):
        """ Operator overload for [] """
        return self.filter_data[index]

    @staticmethod
    @log_it
    def apply_merge(left_df, right_df, left_on, right_on, how):
        """ Merges two Data instances on specified axes 
        and returns the result. 

        Args:
            left_df: Left dataframe to join.
            right_df: Right dataframe to join.
            left_on: Axes to join the left on.
            right_on: Axes to join the right on.
            how: can be inner, outer, left or right.
        
        Returns:
            A Data object representing the joined data.
        """
        joined = Data()
        joined._data = dd.merge(left_df.filter_data[left_df.columns],
                                right_df.filter_data[right_df.columns],
                                left_on=left_on, right_on=right_on, how=how)

        joined.load_to_dask()
        return joined

    
class DataSample(Data):
    """ Class representing a sample of a dask dataframe. """

    @log_it
    def __init__(self, sample_obj, numtypes, fulldata, should_apply_ops=False):
        """ Constructor for the DataSample class.

        Args:
            sample_obj: Pandas dataframe representing a data sample (object type).
            numtypes: List of Numerical columns.
            fulldata: Data object representing the dask wrapper.
            should_apply_ops: If True, applies the fulldata delayed ops.
        """
        self.is_loaded = True  
        self._data_obj = sample_obj.astype(object)  # store the unaltered data
        self._data_typ = self._data_obj.copy()
        
        for c in numtypes:  # set the numeric types
            self._data_typ[c] = pd.to_numeric(self._data_typ[c], errors='coerce')
            
        self._data = self._data_typ.copy()
        self.fulldata = fulldata
        self.data_columns = self.fulldata.data_columns
        self.orig_columns = self.fulldata.orig_columns
        
        self.types = {c: 'Numerical' if c in numtypes else 'Nominal' for c in self._data.columns}
        super().create_derived_variables()

        if should_apply_ops:
            self.apply_ops()

    @log_it
    def apply_ops(self):
        """ Applies operations that were passed from the fulldata. 

        Args:
            ops: List of functools.partial functions to apply.
        """
        ops = self.fulldata.delayed_ops.copy()

        # these will get re-populated through the sample
        self.fulldata.delayed_ops = []
        
        for op in ops:
            func_name = op.func.__name__
            if hasattr(self, func_name):
                getattr(self, func_name)(*op.args)
          
    @log_it
    def set_type(self, attr, coltype):
        """ Sets the column type for the sample and updates the type description.

        Args:
            attr: Attribute to set the type for.
            coltype: Nominal, Index, or Numerical.
        """
        self.types[attr] = coltype
        self._data[attr] = self._data_obj[attr].copy()
        if coltype == 'Numerical':
            self._data[attr] = pd.to_numeric(self._data[attr], errors='coerce')
            
        self.fulldata.set_type(attr, coltype, save=False)
        
    @log_it         
    def apply_filter(self, col, lb=-np.inf, ub=np.inf, inc=1):
        """  Applies the filter to both the sample and fulldata.

        Args:
            col: Column to apply the filter on.
            lb: Lower bound of the filter.
            ub: Upper bound of the filter.
            inc: Increment amount.
        """
        super().apply_filter(col, lb, ub, inc)
        self.fulldata.apply_filter(col, lb, ub, inc)

    @log_it
    def apply_nominal_filter(self, col, include=[], ftype='Include', inc=1):
        """ Applies a filter to a nominal attribute to sample and fulldata.

        Args:
            col: Column to apply the filter on.
            include: List of category levels to filter on.
            ftype: Indicates whether filter is inclusion or exclusion.
            inc: Increment amount.
        """
        super().apply_nominal_filter(col, include, ftype, inc)
        self.fulldata.apply_nominal_filter(col, include, ftype, inc)

    @log_it
    def apply_normalize(self, col, newmin, newmax):
        """ Normalize the column between new_min and new_max. 
        
        Args:
            col: Column to normalize.
            newmin: New lower bound.
            newmax: New upper bound.
        """
        super().apply_normalize(col, newmin, newmax)
        self.fulldata.apply_normalize(col, newmin, newmax)

    @log_it
    def apply_log(self, col, base=10):
        """ Apply log transformation to column. 

        Args:
            col: Column to apply log on.
            base: log base. 
        """
        super().apply_log(col, base)
        self.fulldata.apply_log(col, base)

    @log_it
    def apply_clamp(self, col, lb, ub):
        """ Clamp the data to between lb and ub. 
        
        Args:
            col: Column to clamp.
            lb: Lower bound to clamp to.
            ub: Upper bound to clamp to.
        """
        super().apply_clamp(col, lb, ub)
        self.fulldata.apply_clamp(col, lb, ub)

    @log_it
    def apply_replace(self, col, old_vals, new_val):
        """ Wrapper for dataframe replace method. 
        
        Args:
            col: Column to call replace on.
            old_vals: Current values to replace.
            new_val: Value to replace old_vals with.
        """        
        super().apply_replace(col, old_vals, new_val)
        self.fulldata.apply_replace(col, old_vals, new_val)

    @log_it
    def apply_onehot(self, col):
        """ Apply one hot encoding on the values of col. 
        
        Args:
            col: Column to apply one hot encoding on.

        Returns:
            List of ohe columns
        """
        levels = self.fulldata.apply_onehot(col)  # need to get all of the levels.
        ohe_cols = [f'{col}_{l}' for l in levels]  # get ohe columns
        ohe_cols = super()._valid_column_names(ohe_cols)
        
        for ohe, l in zip(ohe_cols, levels):
            self._data[ohe] = (self._data[col]==l).astype(int)

        self._data_typ[ohe_cols] = self._data[ohe_cols].copy()
        self._data_obj[ohe_cols] = self._data[ohe_cols].astype(object)            
        self.data_columns = np.concatenate((self.data_columns, ohe_cols))
        return levels
        
    @log_it
    def apply_rank(self, col1, col2, nranks):
        """ Apply a rank transformation to the values of col1. 

        Args:
            col1: Column to transform.
            col2: Column to base col1's ranking on.
            nranks: Number of ranks.        
        """
        mapper = self.fulldata.apply_rank(col1, col2, nranks)
        
        rank_attr = self._valid_column_name(f'{col1}_rank{nranks}_{col2}')
        self._data[rank_attr] = self._data[col1].apply(lambda x: mapper[x])
        self._data_typ[rank_attr] = self._data[rank_attr].copy()
        self._data_obj[rank_attr] = self._data[rank_attr].astype(object)            
        self.data_columns = np.append(self.data_columns, rank_attr)
        return mapper
   
    @log_it
    def apply_fill_missing(self, col, method):
        """ Fill missing data based on the 'method'. 
        
        Args:
            col: Column to fill missing data.
            method: Method of filling missing data.
        """        
        super().apply_fill_missing(col, method)
        self.fulldata.apply_fill_missing(col, method)

    @log_it
    def apply_drop_na(self, col, inc=1):
        """ Applies a filter on NaN values to an attribute by incrementing (by inc) 
        all values with a category level in include .

        Args:
            col: Column to apply the filter on.
            inc: Increment amount.
        """
        super().apply_drop_na(col, inc)
        self.fulldata.apply_drop_na(col, inc)

    @log_it
    def apply_rename(self, col, name):
        """ Renames the column 'col' with name. 
        
        Args:
            col: Column to rename.
            name: New name.        
        """
        super().apply_rename(col, name)
        self.fulldata.apply_rename(col, name)

    @log_it
    def apply_custom(self, col, expr):
        """ Applies a custom transformation to sample and fulldata. 

        Args:
            col: Column to apply expression on.
            expr: Pythonic expression to evaluate.
        """
        super().apply_custom(col, expr)
        self.fulldata.apply_custom(col, expr)

    @log_it
    def create_derived(self, col, expr):
        """ Creates a derived attribute. """
        super().create_derived(col, expr)
        self.fulldata.create_derived(col, expr)

    @log_it
    def describe(self, columns=None):
        """ Wrapper for the native describe method. 
        
        Args:
            columns: Columns to include in the description.
        
        Returns:
            Pandas dataframe desribing the columns.
        """
        if columns is None:
            return self.filter_data[self.data_columns].describe(include='all')

        return self.filter_data[columns].describe()

    @log_it
    def describe_col(self, col):
        """ Wrapper for native describe method on a single column. """
        return self.filter_data[col].describe(include='all')

    @log_it
    def histogram(self, col, bins, **kwargs):
        """ Computes a histogram (with filters) based on the full data. 
        
        Args:
            col: Column to compute the histogram for.
            bins: Division for histogram.

        Returns:
            counts and bins from numpy histogram method.
        """
        vector = self.filter_data[col].dropna()
        return np.histogram(vector, bins=bins)

    @log_it
    def histogram_all(self, col, bins):
        """ Computes a histogram (no filters) based on the sample data. 
        
        Args:
            col: Column to compute the histogram for.
            bins: Division for histogram.

        Returns:
            counts and bins from numpy histogram method.
        """
        vector = self._data[col].dropna()
        return np.histogram(vector, bins=bins)

    @log_it
    def histograms(self, col, nbins=30, lb=-np.inf, ub=np.inf):
        """ Computes both the filtered and unfiltered histogram based 
        on the data. 
    
        Args:
            col: Column to compute the histogram for.
            nbins: Number of bins.
            lb: Include values >= than lower bound
            ub: Include values <= than upper bound

        Returns:
            A tuple containing counts, counts_all, and bins.
        """
        if not isinstance(nbins, int):
            raise TypeError("nbins is expected to be an integer.")

        filt_data = self.filter_data[col]
        filt_data = filt_data[(filt_data >= lb) & (filt_data<=ub)].dropna()
        
        # Filtered histogram data.        
        counts, bins = np.histogram(filt_data, bins=nbins)
                                    
        counts_all, _ = np.histogram(self._data[col], bins=bins)
        assert np.all(counts_all >= counts)  # sanity check
        
        return counts, counts_all, bins

    @log_it
    def drop_columns(self, drop):
        """ Marks the columns in drop to be deleted. 
        
        Args:
            drop: List of columns to drop.
        """
        super().drop_columns(drop)
        self.fulldata.drop_columns(drop)

    @log_it    
    def drop_column(self, col):
        """ Marks a column to be dropped. 
        
        Args:
            col: Column to drop.
        """
        super().drop_column(col)
        self.fulldata.drop_column(col)

    @log_it
    def reset_data(self):
        """ Resets the data. """
        super().reset_data()
        self.fulldata.reset_data()
        
