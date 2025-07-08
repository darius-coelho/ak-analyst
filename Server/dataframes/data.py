from random import Random
import gc
import uuid
import numbers
import functools
import sys

from scipy.stats import mannwhitneyu, chi2_contingency

import dask.dataframe as dd
import dask.array as da
import dask

import pyarrow as pa

import numpy as np
import pandas as pd


from dataframes.data_reader import DataReader, DataReaderCloud
from strutils.parse import split_replace_join
from ak_logger import logger, log_it

from config_parameters.file_config import _validate_options
from collections import defaultdict

class summabledict(defaultdict):
    """ Extension of the defaultdict class to enable addition of dicts. """
    def __add__(self, b):
        """ Adds this dict to another. """
        keys = set(self.keys()) | set(b.keys())
        r = summabledict(int)
        for k in keys:
            r[k] = self[k] + b[k]

        return r
    
    def __radd__(self, b):
        return self + b
    
def _key_of_max(d):
    """ Returns the key corresponding to the max value
    (excluding nan keys) or nan if empty. """
    try:
        return max([(k,v) for k, v in d.items() if k==k], key=lambda x: x[1])[0] 
    except:
        return np.nan
    
def _groupby_mode(df, key, columns, reduce=True):
    """ Computes groupby and mode operation. 

    Args:
        df: Dataframe to analyze.
        key: Key to group on.
        columns: List of columns to get the mode.
        reduce: If true, selects the mode o.w. keeps the count dict.

    Returns:
        A dataframe containing the mode or count dict for each key.
    """
    group = summabledict(lambda: summabledict(lambda: summabledict(int)))
    
    gid = df.columns.get_loc(key)
    col_ids = [df.columns.get_loc(c) for c in columns]
    
    for row in df.values:
        for cid in col_ids:            
            group[row[gid]][cid][row[cid]] += 1
        
    if reduce:
        result = {g: [_key_of_max(counts[cid]) for cid in col_ids] for g, counts in group.items()}
    else:        
        result = {g: [summabledict(int, vc) for cid, vc in counts.items()] for g, counts in group.items()}
        
    agg_df = pd.DataFrame.from_dict(result, orient='index', columns=columns)
    agg_df.index.name = key
    return agg_df

#@log_it
def _read_csv_head_pandas(filepath, nrows=50, usecols=None, options=None):
    """ loads the firsr nrows ascii file with the options set by the user.
        
    Args:
        path: file path to the data file.
        nrows: the number of rows to read
        options: options for reading files (encoding, header row etc).
        usecols: List of columns to read from filepath or None for all columns.

    Returns:
        A pandas dataframe containing the data loaded from the file.
    """
    if options is None:
        # load with pandas defaults if options are None
        return pd.read_csv(filepath, nrows=nrows, error_bad_lines=False, warn_bad_lines=False)   

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
            usecols=usecols,
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
            na_values=na_options,
            error_bad_lines=False,
            warn_bad_lines=False
        )    

        
def _validate_join_column_suffix(df_columns, on, suffix):
    """ Check that column suffixes don't lead to any collisions 

    Args: 
        df_columns: List of dataframe columns.
        on: Axes to each dataframe on.
        suffix: dataframe suffixes to avoid name collisions.

    Raises assertion error if a collision exists.
    """
    # check for any potential name collisions in the suffix
    all_columns = [el for col in df_columns for el in col]

    for columns, df_on, suff in zip(df_columns, on, suffix):
        for c in columns:
            if c not in df_on and f'{c}{suff}' in all_columns:
                raise AssertionError(f'{c}{suff} already exists. '+
                                     'Fix this by changing the overlapping column suffix')

        
#@log_it
def _detect_types(data, filepath=None, nrows=100, options=None, types={},
                  errors='coerce', return_data=True):
    """ Detects the attribute data types.
        
    Args:
        data: Data to get column types for.
        nrows: Number of rows to base to estimate types.
        types: Mapping from column to data types.
        errors: Determines how errors should be handled in to_numeric.
        return_data: If true, performs type conversion on the data.

    Returns:
        List of numerical columns
    """
    
    if errors not in ['raise', 'coerce']:
        raise ValueError("errors should be 'raise' or 'coerce'")

    
    def process_column(col):
        """ Helper function for processing based on options. """
        if options['decimal'] != ".":
            col = col.str.replace(options['decimal'], ".", regex=False)

        if options['thousands'] is not None:
            col = col.str.replace(options['thousands'], "", regex=False)
            
        return col

    
    # Get the list of numcols
    numcols = []

    if types == {}:        
        head = None
        if filepath is None: 
            # If path is none then probably an internally created dataframe
            # Use its first 50 rows to determine data types
            head = data.head(nrows)
        else:
            # Use first 50 rows of file content to determine data types
            head = _read_csv_head_pandas(filepath, nrows=nrows, options=options)

        for c in head.columns:
            try:
                vec = process_column(head[c].astype(str)).astype(float)  # will raise an error if not numeric
            
                # if all values are NaN then treat column as Nominal
                if all(np.isnan(v) for v in vec):
                    continue

                numcols.append(c)

            except:
                pass  # keep types as objects
    else:
        # is numcol if existing type is numerical and is not a derived column
        numcols = [k for k, v in types.items() if v == "Numerical" and k in data.columns]

    if not return_data:
        return numcols
    
    def convert_to_numeric(df):
        """ Helper function for converting the list of numerical column types. """
        for c in numcols:                    
            df[c] = pd.to_numeric(process_column(df[c]), errors='coerce') \
                      .replace([np.inf, -np.inf], np.nan)
        return df
    

    if isinstance(data, dd.DataFrame):
        # This turns out to be much more effecient than calling
        # dd.to_numeric for each column
        data = data.map_partitions(convert_to_numeric).persist()
    else:
        assert isinstance(data, pd.DataFrame)  # sanity check
        data = data.transform(
            lambda x: pd.to_numeric(x, errors='coerce').replace([np.inf, -np.inf], np.nan) \
            if x.name in numcols else x
        )
        
    return data, numcols


#@log_it
def _read_csv_to_dask(filepath, options, storage_options, types={}):
    """ loads an ascii file with the options set by the user.
        
    Args:
        path: file path to the data file.
        options: options for reading files (encoding, header row etc).

    Returns:
        A dask dataframe containing the data loaded from the file.
    """

    if options is None:
        # load with dask defaults if options are None
        return dd.read_csv(filepath, blocksize="4MB", assume_missing=True,
                           dtype='object', error_bad_lines=False, warn_bad_lines=False)
    
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
    if types:
        dtype = {k: 'float' if v == 'Numerical' else 'object' for k, v in types.items()}

        
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
        na_values=na_options,
        error_bad_lines=False,
        warn_bad_lines=False,
        storage_options=storage_options
    ) 
    

def _max_count_agg():
    def chunk(s):
        # for the comments, assume only a single grouping column, the 
        # implementation can handle multiple group columns.
        #
        # s is a grouped series. value_counts creates a multi-series like 
        # (group, value): count
        return s.value_counts()
    

    def agg(s):
        # s is a grouped multi-index series. In .apply the full sub-df will passed
        # multi-index and all. Group on the value level and sum the counts. The
        # result of the lambda function is a series. Therefore, the result of the 
        # apply is a multi-index series like (group, value): count
        # return s.apply(lambda s: s.groupby(level=-1).sum())
        
        # faster version using pandas internals
        s = s._selected_obj
        return s.groupby(level=list(range(s.index.nlevels))).sum()


    def finalize(s):
        # s is a multi-index series of the form (group, value): count. First
        # manually group on the group part of the index. The lambda will receive a
        # sub-series with multi index. Next, drop the group part from the index.
        # Finally, determine the index with the maximum value, i.e., the mode.
        level = list(range(s.index.nlevels - 1))

        def _get_mode_val(s0):
            s1 = s0.reset_index(level=level, drop=True)

            if s1.max() == 0:
                # if count is zero than return nan
                return np.nan
            
            return s1.idxmax()
        
        return (
            s.groupby(level=level).apply(_get_mode_val)
        )

    return dd.Aggregation('max_count', chunk, agg, finalize)


class Data:
    """ Wrapper for the full dataset stored in a dask dataframe. """

    #@log_it
    def __init__(self, filepath=None, options=None,
                 is_cloud=False, storage_options=None, 
                 delay_load=True, **kwargs):
        """ Constructor for the Data class. 

        Args:
            filepath: Filepath to the data.
        """
        self.filepath = filepath
        self.is_loaded = False
        self.is_cloud = is_cloud
        self.storage_options = storage_options

        # validate options, if None a set of defaults will be generated
        self.options = _validate_options(options)    

        # list of operations to execute after the data is loaded
        self.delayed_ops = []

        # initialize the sizes
        self._full_size = None
        self.filter_size = None
        
        # init checkpoint variables
        self.checkpoint = self.CheckPoint(self)
        
        self._types = {}  # mapping from attribute to data type
        self.orig_types = {}  # Original mapping from attribute to data type
        if filepath is None:
            return  # create empty object        
       
        if not isinstance(filepath, str):
            raise TypeError("Expected filepath to be a string.")        

        if delay_load:
            if is_cloud:
                self.reader = DataReaderCloud(**kwargs, options=self.options)
            else:
                self.reader = DataReader(self.filepath, options=self.options)

            sample = self.reader.head(nrows=100)
            numcols = _detect_types(sample, options=self.options, return_data=False)

            self._types = {c: 'Numerical' if c in numcols else 'Nominal' \
                          for c in sample.columns}

            self.orig_types = self._types.copy()
            self._orderings = {c: None for c in sample.columns}            
        else:
            self.load_to_dask()


        # Keeps track of whether each attribute was transformed.
        self._is_transformed = {c: False for c in self.data_columns}

        
    def load_to_dask_from_file(self):
        """ Load data into a dask dataframe from a file. """

        # data_obj contains the unmodified data
        # this is useful to have when setting the column type
        # (e.g. setting Nominal to Numerical results in a column of
        # NaNs. Changing back to Nominal would then require re-reading
        # the entire file).
        self._data_obj = _read_csv_to_dask(self.filepath, self.options,
                                           self.storage_options)

        # data_typ contains the typed data. This data gets written to
        # a parquet filetype with a random name. The advantage of this
        # variable is two fold. (1) It improves performance as dask
        # operations are faster with parquet files. (2) It enables us
        # to quickly reset the working data variable (i.e. self._data).
        self._data_typ = self._data_obj.copy()
        
        # cast columns where possible
        self._data_typ, numcols = _detect_types(self._data_typ,
                                                options=self.options,
                                                types=self.orig_types)  
        
        self._types = {c: 'Numerical' if c in numcols else 'Nominal' \
                       for c in self._data_typ.columns}
        self.orig_types = self._types.copy()

        self._data = self._data_typ.copy()
        

    def load_to_dask_from_data(self):
        """ Load data into a dask dataframe from a dask dataframe. """
        assert hasattr(self, '_data')  # data must be initialized
            
        self._data_obj = self._data.astype(object).copy()

        if self.types:
            self._data_typ = self._data.copy()
            if self.orig_types:
                self.orig_types = self.types.copy()
                
        else:  # need to infer the types
            self._data_typ = self._data.copy()
            self._data_typ, numcols = _detect_types(self._data_typ,
                                                    options=self.options)
        
            self._types = {c: 'Numerical' if c in numcols else 'Nominal' \
                           for c in self._data_typ.columns}
            
            self.orig_types = self._types.copy()
        
    #@log_it
    def load_to_dask(self):
        """ Load the data into a dask dataframe. """
        if self.is_loaded:
            return  # data was already loaded
            
        
        if self.filepath is None:
            self.load_to_dask_from_data()
        else:
            self.load_to_dask_from_file()            
      
        self._orderings = {c: None for c in self._data_typ.columns}
        
        # Keeps track of whether each attribute was transformed.
        self._is_transformed = {c: False for c in self.data_columns}
        
        self.create_derived_variables()
        self.is_loaded = True

        # apply all delayed operations
        for op in self.delayed_ops:
            op()
            
    #@log_it        
    def create_derived_variables(self):
        """ Creates the derived variables based on the data. """
        self.filter_col = 'filters_applied'
        self._data[self.filter_col] = 0

        #self.full_size = dd.compute(self._data.shape[0])[0]  # full dataset size
        self._full_size = self._data.shape[0]  # full dataset size
        self.filter_size = self._full_size
        
    #@log_it
    def sample_from_dask(self, nsamples=1000):
        """ Samples the data from a dask dataframe. 

        Args:
            nsamples: Number of samples
        
        Returns:
            An instance of the DataSample class.
        """
        logger.info("Sampling from dask")
        frac = nsamples / self.full_size

        if frac >= 1:
            assert self.filter_col not in self.data_columns
            return DataSample(self.filter_data[self.data_columns].compute(), self)

        return DataSample(self.filter_data[self.data_columns].sample(frac=frac).compute(),
                          self)
    
    #@log_it
    def sample_from_file(self, nsamples=1000):
        """ Samples the data directly from the file. 

        Args: 
            nsamples: Number of samples.

        Returns:
            An instance of the DataSample class.
        """
        logger.info("Sampling from file")
        sample = self.reader.sample(nsamples)
        return DataSample(sample, self, should_apply_ops=True)

    #@log_it    
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

    #@log_it
    def estimate_types(self):
        """ Estimate the column types as either Nominal or Numerical without 
        loading the full dataset.
        
        Returns:
            A pandas series mapping the column to the type.
        """
        return pd.Series(index=self.data_columns,
                         data=['Numerical' if c in self.numcols else 'Nominal' \
                               for c in self.data_columns])
    
    #@log_it
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

    #@log_it
    def set_type(self, attr, coltype, ordering=None, save=False):
        """ Sets the column type. 

        Args:
            attr: Attribute to set the type for.
            coltype: Nominal, Index, or Numerical.
            save: If true, saves the result in a parquet file.
        """
        if coltype not in ['Nominal', 'Numerical', 'Ordinal', 'Index', 'DateTime']:
            raise ValueError("coltype should be Numerical, Nominal, Ordinal, DateTime, or Index")

        self._types[attr] = coltype
        if not self.is_loaded:
            self.delayed_ops.append(functools.partial(self.set_type, attr,
                                                      coltype, ordering, save))
            return

        if not self._is_transformed[attr]:
            self._data[attr] = self._data_obj[attr].copy()            
            
        if coltype == "Numerical":
            self._data[attr] = dd.to_numeric(self._data[attr], errors='coerce')
        elif coltype == "DateTime":
            self._data[attr] = dd.to_datetime(self._data[attr])
        else:
            self._data[attr] = self._data[attr].astype(str)

        if coltype == 'Ordinal':
            all_cats = list(dask.compute(self._data[attr].dropna().unique())[0])
            self._orderings[attr] = sorted(list(set(ordering + all_cats)))
            
        if save:
            self.save_parquet()

    #@log_it
    def set_ordering(self, attr, ordering):
        """ Sets the ordering for an ordinal column.
        
        Args:
            attr: Attribute to set the ordering for.
            ordering: An list of categories in ascending order.           
        """

        self._orderings[attr] = ordering
       
        if not isinstance(ordering, list) and ordering is not None:
            raise ValueError("Ordering should be list or null")
            
        if isinstance(ordering, list) and self._types[attr] != 'Ordinal':
            raise ValueError(attr + " should be ordinal")
            
        if not self.is_loaded:
            self.delayed_ops.append(functools.partial(self.set_ordering, attr, ordering))
            return

        new_cats = list(dask.compute(self._data[attr].dropna().unique())[0])
        new_cats = sorted(new_cats)
        unseen_cats = list(set(new_cats) - set(ordering))
        self._orderings[attr] = ordering + unseen_cats

    #@log_it            
    def save_parquet(self):
        """ Saves data into a parquet file. """
        # Generate pyarrow schema for saving to parquet
        # Only set a schema for numerical attributes, let dask infer the remainder
        schema = {}
        for index, value in self._data.dtypes.items():            
            if value != "object":
                schema[index] = pa.float64()
        self._data.to_parquet(self.fname_typ, schema=schema)
        self._data_typ = dd.read_parquet(self.fname_typ)
        self._data = self._data_typ.copy()

    def __aggregate(self, method, index_col, cols, cols_new_name):
        """ Runs groupby and aggregate on the data using the specified method. 
        
        Args:
            method: Method of aggregation.
            index_col: Column to group over.
            cols: List of columns to aggregate.
            cols_new_name: Map of column names to new column names for the aggregation.
        
        Returns:
            Aggregated dask dataframe.
        """
        if method == "mean":            
            return self.filter_data.groupby(index_col)[cols].mean().rename(columns=cols_new_name)

        if method == "min":
            return self.filter_data.groupby(index_col)[cols].min().rename(columns=cols_new_name)

        if method == "max":
            return self.filter_data.groupby(index_col)[cols].max().rename(columns=cols_new_name)

        if method == "std":
            return self.filter_data.groupby(index_col)[cols].std().rename(columns=cols_new_name)

        if method == "var":
            return self.filter_data.groupby(index_col)[cols].agg('var').rename(columns=cols_new_name)

        if method == "sum":
            return self.filter_data.groupby(index_col)[cols].sum().rename(columns=cols_new_name)

        if method == "first":
            return self.filter_data.groupby(index_col)[cols].first().rename(columns=cols_new_name)

        if method == "last":
            return self.filter_data.groupby(index_col)[cols].last().rename(columns=cols_new_name)

        if method == "size":
            return self.filter_data.groupby(index_col)[cols].size().rename(columns=cols_new_name)

        if method == "count":
            return self.filter_data.groupby(index_col)[cols].count().rename(columns=cols_new_name)

        if method == "max_count":
            return self.filter_data.reduction(
                _groupby_mode,
                aggregate=lambda par: par.groupby(par.index).sum().applymap(_key_of_max),
                chunk_kwargs={'key': index_col, 'columns': cols, 'reduce': False}
            ).rename(columns=cols_new_name)
        

        raise ValueError(f'{method} is an unrecognized aggregation method.')

    def __apply_cell_split_ordered(self, col, delimiter, strip, quote):
        """ Applies the cell split where each column corresponds 
        to the order in the delimited list. 
        
        Args:
            col: Column to split
            delimiter: Delimiter to split on.
            strip: Characters to strip from the start / end of list.
            quote: Quotation character to remove.        
        """
        # get the number of splits
        nsplits = self._data[col].apply(lambda x: x.count(delimiter),
                                        meta=(col, 'int64')).max().compute()
        
        encoded = self._data[col].str.strip(strip) \
                                 .str.split(delimiter, n=nsplits, expand=True) \
                                 .apply(lambda x: x.str.strip().str.strip(quote),
                                        meta={i: 'object' for i in range(nsplits+1)}, axis=1)
                
        encoded.columns = [f'{col}_pos_{pos}' for pos in encoded.columns]
        self._data = dd.concat([self._data, encoded], axis=1, ignore_unknown_divisions=True)

        for col in encoded.columns:
            self._types[col] = 'Nominal'
            self._orderings[col] = None
            
    def __apply_cell_split_unordered(self, col, delimiter, strip, quote):
        """ Applies the cell split where each column corresponds 
        to a unique value in the delimited list. 
        
        Args:
            col: Column to split
            delimiter: Delimiter to split on.
            strip: Characters to strip from the start / end of list.
            quote: Quotation character to remove.        
        """
        encoded = self._data[col].str.strip(strip) \
                                 .str.split(delimiter) \
                                 .apply(lambda x: np.array([s.strip().strip(quote) for s in x]),
                                        meta=(col, 'object'))
        
        cols = da.unique(da.concatenate(encoded)).compute()
        encoded = dd.from_array(da.stack(encoded.apply(lambda x: np.isin(cols, x).astype(int),
                                                       meta=(col, 'int'))), columns=cols)
        encoded.columns = [f'{col}_{name}' for name in encoded.columns]
        encoded = encoded.repartition(self._data.npartitions)
        self._data = self._data.join(encoded)
        
        for col in encoded.columns:
            self._types[col] = 'Nominal'
            self._orderings[col] = None
            
    def apply_cell_split(self, col, delimiter, ordered=True, strip='', quote=''):
        """ Applies a cell splitting operation """
        if not self.is_loaded:
            self.delayed_ops.append(functools.partial(self.apply_cell_split, col,
                                                      delimiter, ordered, strip, quote))
            return

        if ordered:
            return self.__apply_cell_split_ordered(col, delimiter, strip, quote)

        return self.__apply_cell_split_unordered(col, delimiter, strip, quote)

    #@log_it
    def aggregate_by_index(self, index_col, agg_map):
        """ Aggregates records so that each record is associated 
        with a unique value on the index_col. 

        Args:
            index_col: Column specifying unique records.
            agg_map: Dict. mapping aggregation function to attributes to which it is applied.

        Returns:
            A new Data instance with aggregated rows.
        """
        if not isinstance(agg_map, list):
            raise TypeError("agg_map should be a list type.")

        self.create_checkpoint()

        if not self.is_loaded:
            self.load_to_dask()

        # Organize the columns to which the ohe transform is applied to 
        # along with attributes bound to them and 
        # the aggregation methods to be applied to the new columns
        # e.g. {
        #       d: {
        #              attrs: [a,b,c]
        #              mean: [a,b]
        #              max: [b,c]
        #              }
        #       }
        # here ohe will be applied to a,b,c while binding d to them. 
        # Then the the mean aggregation will be applied to the resulting columns from a & b and max to those from b & c
        oheTrans = {}
        for agg in agg_map:
            func = agg["aggFunc"]["value"]
            if func == "ohe" and len(agg["attrs"]) > 0:
                for b in agg['bind']:
                    bind_attr = b['attr']["value"]
                    bind_func = b['func']["value"]
                    if bind_attr not in oheTrans:
                        oheTrans[bind_attr] = {
                            "attrs": []
                        }
                    # Create a list of all attributes to which ohe is applied and bound to bind_attr
                    oheTrans[bind_attr]["attrs"] += [d['value'] for d in agg["attrs"]]
                    
                    if bind_func not in oheTrans[bind_attr]:
                        oheTrans[bind_attr][bind_func] = []
                    
                    # Create a list of all attributes whose reuslting columns will be aggregated with the bind_func
                    oheTrans[bind_attr][bind_func] += [d['value'] for d in agg["attrs"]]

        # Intialize a mapping from aggregation functions to column names
        agg_func_cols_name_map = {"mean": [], "min": [], "max": [], "std": [],
                                "var": [], "sum": [], "first": [], "last": [],
                                "size": [], "count": [], "max_count": []}

        # Apply the ohe transforms                    
        for bind_attr, bind_obj in oheTrans.items():
            # Remove any duplictes 
            for k, v in bind_obj.items():
                bind_obj[k] = list(set(v))
            
            # Set up the bind and type parameters
            bind = None if bind_attr == "None" else bind_attr
            newType = float if bind_attr == "None" else object

            # Apply ohe
            for ohe in bind_obj["attrs"]:
                levels, cols = self.apply_onehot(ohe, bind=bind,
                                    return_columns=True, newType=newType)

                # Add the resulting columns to the appropriate aggregation function
                for k, v in bind_obj.items():
                    if k != 'attrs' and ohe in v:
                        agg_func_cols_name_map[k] += cols
            
        
        # Update the mapping of aggregation functions and the columns they are applied to
        for agg in agg_map:
            func = agg["aggFunc"]["value"]
            if func != "ohe" and len(agg["attrs"]) > 0:
                agg_func_cols_name_map[func] += [d['value'] for d in agg["attrs"]]
                agg_func_cols_name_map[func] = list(set(agg_func_cols_name_map[func]))
            
        # Initalize a dict that will store lists of new column names for each aggregation method
        agg_type_cols_name_map = {"mean": [], "min": [], "max": [], "std": [],
                                "var": [], "sum": [], "first": [], "last": [],
                                "size": [], "count": [], "max_count": []}

        # Append for every aggregation method append the method name to the column name to create new column names
        for method, cols in agg_func_cols_name_map.items():
            if cols:
                agg_type_cols_name_map[method] = dict(zip(cols, [c + "_" + method for c in cols]))

        # Apply the aggregations
        agg_results = [self.__aggregate(method, index_col, cols, agg_type_cols_name_map[method]) \
                       for method, cols in agg_func_cols_name_map.items() if cols]      

        agged = Data()
        agged._data = dd.concat(agg_results, axis=1, ignore_unknown_divisions=True) \
                        .reset_index().persist()       

        # Set up column types for aggregated dataframe
        agg_types = {}
        agg_types[index_col] = self.types[index_col]
        for method, cols in agg_func_cols_name_map.items():
            if cols:
                for c in cols: 
                    agg_types[c + "_" + method] = self.types[c]

        agged._types = agg_types
        
        agged.load_to_dask()
        
        self.restore_checkpoint()
        return agged
    
    #@log_it
    def split_data(self, sizeType="Percentage", sizeValue=30, method="Random"):
        """ Splits an AK dataframe into two distict data frames

        Args:
            sizeType: The method for selecting the size of the split - absolute or percentage.
            sizeValue: The value for the first split size.
            method: The method to select data items - random, in order, or linear steps

        Returns:
            Two new Data instances which are subsets of the current Data.
        """       
        
        if not (sizeType == "Percentage" or sizeType == "Absolute Count"):
            raise TypeError("Size Type must be Percentage or Absolute Count")

        if not (method == "Random" or method == "InOrder"):
            raise TypeError("Method must be Random or InOrder")

        if sizeType == "Percentage" and  (sizeValue <= 0 or sizeValue >=100):
                raise TypeError("Split percentage should be more than 0 and less than 100.")   

        if not self.is_loaded:
            self.load_to_dask()
         
        self.create_checkpoint()
        
        df1 = Data()
        df2 = Data()
        if method == "Random":
            # In random split the sizeValue is always a percentage
            percentage1 = sizeValue/100
            percentage2 = 1 - percentage1

            filtered = self.filter_data[self.columns]

            # Split the data
            df1._data, df2._data = filtered.random_split([percentage1, percentage2])

        if method == "InOrder":
            # Based on the sizeType compute the indices for the split            
            split_idx = 2
            shape = self.shape
            
            if sizeType == "Percentage":
                split_idx = np.floor(sizeValue/100 * shape[0])
            if sizeType == "Absolute Count":
                split_idx = int(sizeValue)
            
            if split_idx >= shape[0]:
                raise TypeError("Split count larger than available data")    
      
            # Split the data
            df1._data = self.filter_data[self.columns].loc[:split_idx-1]
            df2._data = self.filter_data[self.columns].loc[split_idx:]
        
        # Reset the indexes of the resulting dataframes
        df1._data = df1._data.reset_index(drop=True)
        df2._data = df2._data.reset_index(drop=True)
        
        df1.load_to_dask()
        df2.load_to_dask()

        self.restore_checkpoint()

        return df1, df2

    #@log_it        
    def apply_filter(self, col, lb=-np.inf, ub=np.inf, inc=1, ftype='Include'):
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
            self.delayed_ops.append(functools.partial(self.apply_filter, col, lb, ub, inc, ftype=ftype))
            return

        index = (self._data[col] < lb) | (self._data[col] > ub) | (self._data[col].isna())
        
        if ftype != "Include":
            index = ((self._data[col] >= lb) & (self._data[col] <= ub)) | (self._data[col].isna())
        
        # use index as a mask (i.e. true = 1, false = 0) for increment.
        self._data[self.filter_col] = self._data[self.filter_col] + index * inc

        # set the filter size
        self.filter_size = (self._data[self.filter_col] < 1).sum()

    #@log_it            
    def apply_datetime_filter(self, col, lb=pd.Timestamp.min, ub=pd.Timestamp.max, inc=1):
        """ Applies a filter by incrementing (by inc) all values outside 
        the datetime range lb <= col <= ub. 

        Args:
            col: Column to apply the filter on.
            lb: Lower bound of the filter.
            ub: Upper bound of the filter.
            inc: Increment amount.
        """
        if not self.is_loaded:  # delay this function until ready
            self.delayed_ops.append(functools.partial(self.apply_datetime_filter,
                                                      col, lb, ub, inc))
            return
        
        if lb == pd.Timestamp.min and ub == pd.Timestamp.max:
            raise ValueError("one of lb or ub must be set")

        lb = pd.Timestamp(lb).to_datetime64()
        ub = pd.Timestamp(ub).to_datetime64()
        index = (self._data[col] < lb) | (self._data[col] > ub) | (self._data[col].isna())
        
        # use index as a mask (i.e. true = 1, false = 0) for increment.
        self._data[self.filter_col] = self._data[self.filter_col] + index * inc

        # set the filter size
        self.filter_size = (self._data[self.filter_col] < 1).sum()

    #@log_it        
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
            if 'NaN' in include:
                index = index & (~self._data[col].isna())
        else:
            index = (self._data[col].isin(include))
            if 'NaN' in include:
                index = index | (self._data[col].isna())

        # use index as a mask (i.e. true = 1, false = 0) for increment.
        self._data[self.filter_col] = self._data[self.filter_col] + index * inc

        # set the filter size
        self.filter_size = (self._data[self.filter_col] < 1).sum()

    #@log_it
    def create_checkpoint(self):
        """ Mark the current state of the data point as a checkpoint. """
        self.checkpoint.create_checkpoint()

    #@log_it
    def restore_checkpoint(self):
        """ Reset the state of the data to the previous checkpoint. """
        self.checkpoint.restore_checkpoint()

    #@log_it        
    def reset_data(self):
        """ Resets the data. """
        self._types = self.orig_types.copy()
        self._orderings = {c: None for c in self.data_columns}
        self._is_transformed = {c: False for c in self.data_columns}

        if not self.is_loaded:
            self.delayed_ops = []  # cancel all delayed ops
            return
            
        self._data = self._data_typ.copy()
        
        self._data[self.filter_col] = 0

        # set the filter size to the original size
        self.filter_size = self.full_size

    #@log_it        
    def reset_data_w_col(self, colvec):
        """ Resets the data and adds the column vector to the dataframe. 

        Args:
            colvec: List of column vector to add to the dask dataframe.
        """
        
        if not self.is_loaded:
            self.load_to_dask()

        # get the types where available
        colvec_types = {cvec.name: self._types[cvec.name] if cvec.name in self._types else None \
                        for cvec in colvec}

        self._types = self.orig_types.copy()
        self._is_transformed = {c: False for c in self.data_columns}
        
        self._data = self._data_typ.copy()  # resets the data
        for cvec in colvec:
            self._data[cvec.name] = cvec
            self._is_transformed[cvec.name] = True
            
            if colvec_types[cvec.name] is not None:
                self._types[cvec.name] = colvec_types[cvec.name]
            else:
                self._types[cvec.name] = self.get_type(cvec.name)
                
        self._data[self.filter_col] = 0

    #@log_it
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

        self._types[name] = self._types[col]
        self._is_transformed[name] = True
        
        del self._types[col]
        
        if not self.is_loaded:  # delay this function until ready
            self.delayed_ops.append(functools.partial(self.apply_rename, col, name))
            return

        self._data = self._data.rename(columns={col: name})

        # Update ordering dict key to reflect the new name
        self._orderings[name] = self._orderings.pop(col)

    #@log_it        
    def apply_custom(self, col, expr):
        """ Applies a custom transformation based on a pythonic expression. 

        Args:
            col: Column to apply expression on.
            expr: Pythonic expression to evaluate.
        """
        self._is_transformed[col] = True
        
        if not self.is_loaded:
            self.delayed_ops.append(functools.partial(self.apply_custom, col, expr))
            return

        columns = set(self.data_columns) | set(self.orig_columns)
        cols = sorted(list(columns), key=len, reverse=True)

        expr = split_replace_join(expr, cols, lambda delim: "self._data['"+delim+"']")
        
        try:
            self._data[col] = eval(expr).replace([np.inf, -np.inf], np.nan)
            if col not in self.orig_columns:
                self._data_typ[col] = self._data[col].copy()
                self._data_obj[col] = self._data[col].astype(object)            
        except Exception as e:
            print("Expression: ", expr)
            print(e)
            raise

    #@log_it        
    def create_derived(self, col, expr, expected_type="Numerical"):
        """ Creates a derived attribute. """
        self._is_transformed[col] = True
        if not self.is_loaded:
            self.delayed_ops.append(functools.partial(self.create_derived, col, expr))
            self.data_columns.append(col)
            self._types[col] = expected_type
            return
        
        self.apply_custom(col, expr)        
        self._types[col] = self.get_type(col)
        self.set_type(col, self._types[col])
        self._orderings[col] = None
        
    #@log_it        
    def apply_normalize(self, col, newmin, newmax):
        """ Normalize the column between new_min and new_max. 
        
        Args:
            col: Column to normalize.
            newmin: New lower bound.
            newmax: New upper bound.
        """
        self._is_transformed[col] = True
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
       
    #@log_it
    def apply_log(self, col, base=10):
        """ Apply log transformation to column. 

        Args:
            col: Column to apply log on.
            base: log base. 
        """        

        if col not in self.columns:
            raise ValueError(f"{col} is not a column in the data")

        self._is_transformed[col] = True
        if not self.is_loaded:
            self.delayed_ops.append(functools.partial(self.apply_log, col, base))
            return

        self._data[col] = da.log(self._data[col]) / da.log(base)
        self._data[col] = self._data[col].replace(np.inf, np.nan)
        self._data[col] = self._data[col].replace(-np.inf, np.nan)
     
    #@log_it
    def apply_clamp(self, col, lb, ub):
        """ Clamp the data to between lb and ub. 
        
        Args:
            col: Column to clamp.
            lb: Lower bound to clamp to.
            ub: Upper bound to clamp to.
        """
        self._is_transformed[col] = True
        if not self.is_loaded:
            self.delayed_ops.append(functools.partial(self.apply_clamp, col, lb, ub))
            return

        self._data[col] = self._data[col].clip(lb, ub)
     
    #@log_it        
    def apply_fill_missing(self, col, method, replaceVal):
        """ Fill missing data based on the 'method'. 
        
        Args:
            col: Column to fill missing data.
            method: Method of filling missing data.
        """
        if not isinstance(method, str):
            raise TypeError("method should be a sting indicating the imputation method.")

        if method not in ['Mean', 'Interpolate', 'Pad', 'Zero', 'Replace']:
            raise ValueError("method must be one of 'Mean', 'Interpolate', 'Pad', 'Replace' or 'Zero'")

        self._is_transformed[col] = True
        if not self.is_loaded:
            self.delayed_ops.append(functools.partial(self.apply_fill_missing, col, method, replaceVal))
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
        
        if method == "Replace":
            self._data[col] = self._data[col].fillna(replaceVal)

            # If attribute is ordinal and replaceVal is not present in the ordering dict
            # update the ordering
            if self._types[col] == 'Ordinal' and replaceVal not in self._orderings[col]:
                self._orderings[col].append(replaceVal)
                
    #@log_it        
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

    #@log_it            
    def apply_replace(self, col, old_vals, new_val):
        """ Wrapper for dataframe replace method. 
        
        Args:
            col: Column to call replace on.
            old_vals: Current values to replace.
            new_val: Value to replace old_vals with.
        """
        def is_num(v):
            """ True if v is number, False o.w. """
            try:
                float(v)
                return True
            except:
                return False

        self._is_transformed[col] = True
        if not self.is_loaded:
            self.delayed_ops.append(functools.partial(self.apply_replace, col,
                                                      old_vals, new_val))
            return

        # handle possible conversion to numbers
        old_vals = old_vals + [float(v) for v in old_vals if is_num(v)]
        self._data[col] = self._data[col].replace(old_vals, new_val)

        # If attribute is ordinal updated ordering
        if self._types[col] == 'Ordinal':
            ordering = []             
            update = new_val not in self._orderings[col]
            for cat in self._orderings[col]:
                if cat in old_vals:
                    if update: # add new_val if it is not present in ordering
                        ordering.append(new_val)
                        update = False
                    continue
                ordering.append(cat)
            self._orderings[col] = ordering

    #@log_it
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

    #@log_it    
    def _valid_column_names(self, cols):
        """ Takes a list of proposed column names and makes them 
        unique if they are not currently. 

        Args:
            cols: List of proposed column names.

        Returns:
            List of column names guaranteed to be unique.
        """
        return [self._valid_column_name(c) for c in cols]

    #@log_it    
    def apply_onehot(self, col, bind=None, ext=None, return_columns=False, newType=object):
        """ Apply one hot encoding on the values of col. 
        
        Args:
            col: Column to apply one hot encoding on.
            bind: Optional column to bind to. This will make the 1's
            the bound column values and 0's nans.
            ext: An extenstion to the name of the column
            return_columns: If true, returns the ohe columns.
            newType: The default type of the new columns. Gets overridden if bind is specified

        Returns:
            List of ohe levels and possibly columns
        """
        if not self.is_loaded:
            self.load_to_dask()  # OHE cannot be delayed
        
        levels = self._data[col].unique()

        # get ohe columns
        if bind is None:
            ohe_cols = [f'{col}_{l}' for l in levels]
        else:
            ohe_cols = [f'{col}_{l}_{bind}' for l in levels]

        # add the extenstion
        if ext is not None:
            ohe_cols = [f'{l}_{ext}' for l in ohe_cols]
            
        ohe_cols = self._valid_column_names(ohe_cols)
        
        for ohe, l in zip(ohe_cols, levels):
            if bind is None:
                self._data[ohe] = (self._data[col]==l).astype(int)
            else:  # bind column to the dataframe
                self._data[ohe] = self._data[bind].mask(self._data[col]!=l)
                
        # Set type to float if a column is bound and is numerical
        if bind is not None:            
            newType = float if self._types[bind]== 'Numerical' else object
            
        for ohe in ohe_cols:
            self._types[ohe] = 'Nominal' if bind is None else self._types[bind]
            self._orderings[ohe] = None
            self._is_transformed[ohe] = True
            
        # Set new column type to that of bound column
        self._data[ohe_cols] = self._data[ohe_cols].astype(newType) 
        self._data_typ[ohe_cols] = self._data[ohe_cols].copy()
        self._data_obj[ohe_cols] = self._data[ohe_cols].astype(object)

        if return_columns:
            return levels, ohe_cols
        
        return levels
        
    #@log_it
    def apply_rank(self, col1, col2, nranks, rank_attr_name=None):
        """ Apply a rank transformation to the values of col1. 

        Args:
            col1: Column to transform.
            col2: Column to base col1's ranking on.
            nranks: Number of ranks.        
            rank_attr_name: Name of the newly created attribute.
        """
        if not self.is_loaded:
            self.load_to_dask()  # Rank cannot be delayed

        ordered_col1 = dask.compute(self._data.groupby(col1)[col2].mean())[0].sort_values()
        quants = np.nanquantile(ordered_col1.values, q=[i/nranks for i in range(1, nranks)])
        rank = np.searchsorted(quants, ordered_col1)

        mapper = {l: np.nan if np.isnan(v) else f'rank_{r}' \
                  for l, v, r in zip(ordered_col1.index, ordered_col1.values, rank)}
        mapper[np.nan] = np.nan

        rank_attr = self._valid_column_name(f'{col1}_rank{nranks}_{col2}')
        self._data[rank_attr] = self._data[col1].apply(lambda x: mapper[x],
                                                       meta=(rank_attr, object))
        self._data_typ[rank_attr] = self._data[rank_attr].copy()
        self._data_obj[rank_attr] = self._data[rank_attr].copy()
        
        self._types[rank_attr] = 'Nominal'
        self._orderings[rank_attr] = None
        self._is_transformed[rank_attr] = True

        if rank_attr_name is not None:
            # call apply_rename to handle the checks against
            # duplicate column names
            self.apply_rename(rank_attr, rank_attr_name)
        
        return mapper
    
    #@log_it
    def preview_filter(self, col, lb, ub, bins=30):
        """ Preview the filter """
        if not isinstance(lb, numbers.Number):
            raise TypeError("lb must be a number")

        if not isinstance(ub, numbers.Number):
            raise TypeError("ub must be a number")

        count, count_all, division = self.histograms(col, bins, lb, ub)
        return count, division, count_all, division

    def preview_filter_datetime(self, col, lb, ub, bins=30):
        """ Preview the filter """
        if not isinstance(lb, np.datetime64):
            lb = pd.Timestamp(lb).to_datetime64()
        
        if not isinstance(ub, pd.Timestamp):
            ub = pd.Timestamp(ub).to_datetime64()

        count, count_all, division = self.histograms_datetime(col, bins, lb, ub)
        return count, division, count_all, division

    #@log_it    
    def describe(self, columns=None):
        """ Wrapper for the native describe method. 
        
        Args:
            columns: Columns to include in the description.
        
        Returns:
            Pandas dataframe desribing the columns.
        """
        if columns is None:
            try: 
                return self.filter_data[self.data_columns].describe().compute()
            except ValueError:
                # Triggered when the filtered data is empty
                return self.filter_data[self.data_columns].compute().describe()

        return self.filter_data[columns].describe().compute()

    #@log_it    
    def describe_col(self, col, drop_inf=False):
        """ Wrapper for native describe method on a single column. """
        if drop_inf:
            return self.filter_data[col].replace([np.inf, -np.inf], np.nan).describe(include='all').compute()
        return self.filter_data[col].describe(include='all').compute()

    def where(self, conditions, *args):
        """ Wrapper for dask where function.

        Args:
            conditions: Dictionary mapping columns to inclusion criteria.
            args: 2-tuple containing (in, out) values (e.g. 1, 0)
        
        Returns:
            Result of applying where.
        """
        if len(args) not in [0, 2]:
            raise ValueError("either both or neither of x and y should be given")
        
        def filter_condition(key, criteria):
            """ Filters based on the criteria. """
            if 'in' in criteria:
                return self.filter_data[key].isin(criteria['in'])

            return (self.filter_data[key] >= criteria['lb']) \
                & (self.filter_data[key] <= criteria['ub'])

        isin = None
        if len(conditions) == 1:
            key = next(iter(conditions))
            isin = filter_condition(key, conditions[key])
        else:
            isin = da.all(da.asarray([filter_condition(k,v) for k, v in conditions.items()]),
                          axis=0)

        if args:
            return da.where(isin, args[0], args[1]).compute()

        return da.where(da.asarray([isin]))[1].compute()
            
    #@log_it
    def unique(self, col):
        """ Wrapper for getting the unique values of a column. """
        return dask.compute(self.filter_data[col].unique())[0]
    
    #@log_it
    def quantile(self, quantiles):
        """ Returns the quantiles for the dataset. """
        if isinstance(self.data, pd.DataFrame):
            return self.filter_data[self.data_columns].quantile(quantiles)

        # NOTE: dask only computes correct quantiles with 'tdigest' method.
        return dask.compute(self.filter_data[self.data_columns].quantile(quantiles,
                                                                         method='tdigest'))[0]
    
    #@log_it    
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

    #@log_it
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

    #@log_it
    def histogram(self, col, bins, normalize=False, **kwargs):
        """ Computes a histogram (with filters) based on the full data. 
        
        Args:
            col: Column to compute the histogram for.
            bins: Division for histogram.
            normalize: If true, returns  counts as a percentage.

        Returns:
            counts and bins from numpy histogram method.
        """
        vector = self.filter_data[col].replace([np.inf, -np.inf], np.nan).dropna()
        count, bins = da.histogram(vector, bins=bins, range=(vector.min(), vector.max()))
        if normalize:
            return dask.compute(count/vector.shape[0], bins)
        
        return dask.compute(count, bins)
    
    #@log_it
    def histogram_by(self, col, by, bins, **kwargs):
        """ Computes a histogram (with filters) based on the full data. 
        
        Args:
            col: Column to compute the histogram for.
            bins: Division for histogram.
            normalize: If true, returns  counts as a percentage.

        Returns:
            counts and bins from numpy histogram method.
        """

        if not isinstance(bins, list):
            raise TypeError("Bins must be a list")
        
        classes = self.unique(by)
        counts = {}
                
        for c in classes:
            vector = self.filter_data[self.filter_data[by]==c][col].replace([np.inf, -np.inf], np.nan).dropna()
            count, div = da.histogram(vector, bins=bins, range=(bins[0], bins[-1]))
            count, div = dask.compute(count, div)
            counts[c] = count
        
        return counts, bins 

    #@log_it    
    def histogram_all(self, col, bins):
        """ Computes a histogram (no filters) based on the full data. 
        
        Args:
            col: Column to compute the histogram for.
            bins: Division for histogram.

        Returns:
            counts and bins from numpy histogram method.
        """
        vector = self.data[col].replace([np.inf, -np.inf], np.nan).dropna()
        count, bins = da.histogram(vector, bins=bins, range=(vector.min(), vector.max()))
        return dask.compute(count, bins)

    #@log_it
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

    #@log_it    
    def histograms(self, col, nbins=30, lb=-np.inf, ub=np.inf, transform=None):
        """ Computes both the filtered and unfiltered histogram based 
        on the data. 
    
        Args:
            col: Column to compute the histogram for.
            nbins: Number of bins.
            lb: Include values >= than lower bound
            ub: Include values <= than upper bound
            transform: Function for pre-processsing the data.

        Returns:
            A tuple containing counts, counts_all, and bins.
        """
        if not isinstance(nbins, int):
            raise TypeError("nbins is expected to be an integer.")

        filt_data = self.filter_data[col]
        filt_data = filt_data[(filt_data >= lb) & (filt_data<=ub)].dropna()

        full_data = self._data[col]

        if transform is not None:
            filt_data = transform(filt_data)
            full_data = transform(full_data)
            lb = transform(lb)
            ub = transform(ub)
            
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
        counts_all, _ = da.histogram(full_data, bins=bins)
        assert np.all(counts_all >= counts)  # sanity check
        
        return dask.compute(counts, counts_all, bins)

    def histograms_datetime(self, col, nbins=30, lb=pd.Timestamp.min, ub=pd.Timestamp.max):
        """ Computes both the filtered and unfiltered histogram based 
        on a datetime column. 
    
        Args:
            col: Column to compute the histogram for.
            nbins: Number of bins.
            lb: Include values >= than lower bound
            ub: Include values <= than upper bound

        Returns:
            A tuple containing counts, counts_all, and bins.
        """
        if self.types[col] != 'DateTime':
            raise TypeError(f"{col} must be a DateTime type")

        # convert to nanoseconds from epoch
        def tform(x):
            if isinstance(x, pd.Timestamp) or isinstance(x, np.datetime64):
                # x is a scalar
                if x == pd.Timestamp.min:
                    return -np.inf

                if x == pd.Timestamp.max:
                    return np.inf
                
            return x.astype(np.int64)
        
        count_filt, count_all, bins = self.histograms(col, nbins, lb, ub, tform)
        return count_filt, count_all, pd.to_datetime(bins).astype(str)
        
    #@log_it
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

    #@log_it
    def value_counts(self, col, normalize=False, dropna=True):
        """ Wrapper for the value counts method (filtered data). 
        
        Args:
            col: Column to get the value counts for.
            normalize: Normalize counts if True.

        Returns:
            A tuple containing (counts, levels)
        """
        result = dask.compute(self.filter_data[col].value_counts(normalize=normalize, dropna=dropna))[0]
        return result.tolist(), result.index.tolist()

    #@log_it
    def value_counts_all(self, col):
        """ Wrapper for the value counts method (no filter). 
        
        Args:
            col: Column to get the value counts for.

        Returns:
            A tuple containing (counts, levels)
        """
        result = dask.compute(self._data[col].value_counts())[0]
        return result.tolist(), result.index.tolist()

    #@log_it
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

    #@log_it
    def group_by(self, cols):
        """ Wrapper for the groupby method (filtered data). 
        
        Args:
            cols: List of column to get the value counts for combinations of their values.            

        Returns:
            A dataframe containing the unique combinations of attributwe values and their counts
        """        
        result = dask.compute(self.filter_data.groupby(cols, dropna=False).size())[0].reset_index(name='counts')
        return result
    
    #@log_it
    def group_by_all(self, cols):
        """ Wrapper for the groupby method (no filter). 
        
        Args:
            cols: List of column to get the value counts for combinations of their values.            

        Returns:
            A dataframe containing the unique combinations of attributwe values and their counts
        """
        result = dask.compute(self._data.groupby(cols, dropna=False).size())[0].reset_index(name='counts')
        return result

    #@log_it
    def corr(self):
        """ Computes correlation table on sampled data. """
        mappings = {}
        dtypes = {}
        for col, ctype in self._types.items():
            if ctype == 'Ordinal':
                # set up mapping from category to rank for ordinal columns
                ordering = self._orderings[col]
                mappings[col] = { val: idx+1 for idx, val in enumerate(ordering) }
                # change ordinal column data types
                dtypes[col] = float        
        
        corrcols = [col for col, typ in self.types.items() if typ == 'Numerical' or typ == 'Ordinal']     
        return dask.compute(self.filter_data[corrcols].replace(mappings).astype(dtypes).corr())[0]        

    #@log_it
    def get_sampled_data(self, nrows=10):
        """ Get preview rows. """
        if self.is_loaded:
            return self.filter_data[self.data_columns].head(nrows)

        return self.sample(nrows).to_pandas()

    #@log_it
    def mean(self, col):
        """ Returns the mean along column. """
        return dask.compute(self.filter_data[col].mean())[0]

    #@log_it
    def std(self, col):
        """ Returns the standard deviation along column. """
        return dask.compute(self.filter_data[col].std())[0]

    #@log_it
    def drop_columns(self, drop):
        """ Marks the columns in drop to be deleted. 
        
        Args:
            drop: List of columns to drop.
        """
        if not self.is_loaded:  # data_columns gets reset on load
            self.delayed_ops.append(functools.partial(self.drop_columns, drop))

        self._types = {k: v for k, v in self._types.items() if k not in drop}

    #@log_it        
    def drop_column(self, col):
        """ Marks a column to be dropped. 
        
        Args:
            col: Column to drop.
        """
        if not self.is_loaded:  # data_columns gets reset on load
            self.delayed_ops.append(functools.partial(self.drop_column, col))
            
        if col in self._types:
            del self._types[col]
            

    #@log_it
    def mannwhitneyu(self, target):
        """ Computes the mann-whitney U statistics on the sampled data. 
        
        Args:
            target: Target attribute to compute stats on.
        
        Returns:
            common language effect size and p-value
        """
        
        x = dask.compute(self.data.loc[self.data[self.filter_col] < 1, target].dropna())[0]
        y = dask.compute(self.data.loc[self.data[self.filter_col] >= 1, target].dropna())[0]
        if x.shape[0] == 0 or y.shape[0] == 0:
            return 0.0, 1.0
        
        U, pval = mannwhitneyu(x, y, alternative='two-sided', method="asymptotic")

        # according to the documentation, U should be the U for y
        es = (U / (x.shape[0] * y.shape[0]))
        if es < 0.5:
            es = -(1.0 - es)

        return es, pval

    #@log_it
    def chi_square_bin(self, target):
        """ Computes chi-square test on sampled data with binary target. 
        
        Args:
            target: Target attribute to compute stats on.
        
        Returns:
            common language effect size and p-value
        """
        x = dask.compute(self.data.loc[self.data[self.filter_col] < 1, target])[0]
        y = dask.compute(self.data.loc[self.data[self.filter_col] >= 1, target])[0]

        if x.shape[0] == 0 or y.shape[0] == 0:
            return 0.0, 1.0

        ycounts = y.value_counts()
        xcounts = x.value_counts()
         
        inin = xcounts[1] if 1 in xcounts else 0
        inout = xcounts[0] if 0 in xcounts else 0
        outin = ycounts[1] if 1 in ycounts else 0
        outout = ycounts[0] if 0 in ycounts else 0

        inin = max(inin, 1)
        inout = max(inout, 1)
        outin = max(outin, 1)
        outout = max(outout, 1)

        obs = np.array([[inin, inout],[outin, outout]])
        es = (obs[0,0]*obs[1,1]) / (obs[1,0]*obs[0,1])
        
        pval = chi2_contingency(obs)[1]
        return es, pval

    #@log_it
    def chi_square(self, target):
        """ Computes chi-square test on sampled data. 
        
        Args:
            target: Target attribute to compute stats on.
        
        Returns:
            p-value
        """
        x = dask.compute(self.data.loc[self.data[self.filter_col] < 1, target])[0]
        y = dask.compute(self.data.loc[self.data[self.filter_col] >= 1, target])[0]

        if x.shape[0] == 0 or y.shape[0] == 0:
            return 1.0

        yvc = y.value_counts()
        xvc = x.value_counts()
        d = {i: 0 for i in set(xvc.index) | set(yvc.index)}
        xct = {**d, **xvc.to_dict()}
        yct = {**d, **yvc.to_dict()}

        table=[
            [xct[k] for k in d.keys()],
            [yct[k] for k in d.keys()]    
        ]

        return chi2_contingency(table)[1]
    
    #@log_it        
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

    #@log_it
    def get_columns(self):
        """ Wrapper for columns """
        return self.columns

    #@log_it
    def get_catcols(self):
        """ Gets the categorical columns. """
        assert self._types, "Types have not been specified."
        return [c for c in self.data_columns \
                if self._types[c] == 'Nominal' or self._types[c] == 'Ordinal' ]    
                
    #@log_it
    def to_pandas(self, filtered=True, nsamples=None, replaceOrdering=False, inverse_filter=False, data_columns=None):
        """ Returns the data as a pandas dataframe. 
        Args:
            filtered: If True, returns the filtered data. o.w. full data.
            nsamples: Number of samples to include. Includes all if None.
        """

        if data_columns == None:
            data_columns = self.data_columns
        mappings = {}
        dtypes = {}
        if replaceOrdering: 
            for col, ctype in self._types.items():
                if ctype == 'Ordinal':

                    # add unseen categories to ordering in alphabetical ordering.
                    all_cats = list(dask.compute(self.data[col].unique())[0])
                    unseen_cats = sorted(list(set(all_cats) - set(self._orderings[col])))                    
                    self._orderings[col] = self._orderings[col] + unseen_cats

                    # set up mapping from category to rank for ordinal columns
                    mappings[col] = { val: idx+1 for idx, val in enumerate(self._orderings[col]) }

                    # change ordinal column data types
                    dtypes[col] = float        
 
        if filtered:
            if inverse_filter:
                if nsamples:
                    frac = nsamples / (self.full_size - dask.compute(self.filter_size)[0])
                    if frac < 1:
                        return dask.compute(self.inverse_filter_data[data_columns].replace(mappings).astype(dtypes).sample(frac=frac))[0]

                return dask.compute(self.inverse_filter_data[data_columns].replace(mappings).astype(dtypes))[0]

            if nsamples:
                frac = nsamples / dask.compute(self.filter_size)[0]
                if frac < 1:
                    return dask.compute(self.filter_data[data_columns].replace(mappings).astype(dtypes).sample(frac=frac))[0]

            return dask.compute(self.filter_data[data_columns].replace(mappings).astype(dtypes))[0]

        if nsamples:
            frac = nsamples / self.full_size
            if frac < 1:
                return dask.compute(self.data[data_columns].sample(frac=frac).replace(mappings).astype(dtypes))[0]
            
        return dask.compute(self.data[data_columns].replace(mappings).astype(dtypes))[0]

    @property
    def data_columns(self):
        """ Returns a list of columns """
        return list(self._types.keys())

    @property
    def orig_columns(self):
        """ Returns a list of the original columns. """
        return list(self.orig_types.keys())

    @property
    #@log_it
    def columns(self):
        return self.data_columns

    @property
    def data(self):
        """ Returns the full dataset. """
        if not self.is_loaded:
            self.load_to_dask()
        return self._data

    @property
    #@log_it
    def filter_data(self):
        """ Returns the full filtered dataset. """        
        return self.data[self.data[self.filter_col] < 1]
    
    @property
    #@log_it
    def inverse_filter_data(self):
        """ Returns the full filtered dataset. """        
        return self.data[self.data[self.filter_col] >= 1]
    
    @property
    #@log_it
    def shape(self):
        """ Returns the original shape. """
        if not self.is_loaded:
            self._full_size = self.reader.line_count()
            
        return (self.full_size, len(self.data_columns))

    @property
    def full_size(self):
        """ Returns the number of rows in the data. """
        if not isinstance(self._full_size, numbers.Number):
            self._full_size = self._full_size.compute()

        return self._full_size
        
    #@log_it
    @property
    def numcols(self):
        """ Returns the numerical columns. """
        return [c for c, t in self._types.items() if t == 'Numerical']
    
    @property
    def types(self):
        """ Returns the data type of all columns. """
        return self._types
    
    @property
    def orderings(self):
        """ Returns the orderings of all columns. """        
        return self._orderings
    
    #@log_it
    def __getitem__(self, index):
        """ Operator overload for [] """
        return self.filter_data[index]

    @staticmethod
    @log_it
    def apply_multi_merge(dfs, on, how, suffix):
        """ Merges N Data instances on specified axes 
        and returns the result. 
        
        Args:
            dfs: List of dataframes to join.
            on: List of columns to join on for each df.
            how: Can be inner or outer.
            suffix: List of suffixex (1 for each df) for overlapping columns.

        Returns:
            A Data object representing the joined data.
        """
        _validate_join_column_suffix([df.columns for df in dfs], on, suffix)

        pdfs = [df.filter_data[df.columns] for df in dfs]
        assert len(dfs) == len(on), '"dfs" and "on" have different lengths'

        joined = Data()
        joined._data = functools.reduce(
            lambda left, right: (dd.merge(
                left[0], right[0],
                left_on=left[1], right_on=right[1], how=how, 
                suffixes=[left[2], right[2]]), right[1], right[2]),
            zip(pdfs, on, suffix))[0]

        joined.load_to_dask()
        return joined
        
    @staticmethod
    @log_it
    def apply_merge(left_df, right_df, left_on, right_on, how, suffix=["_x", "_y"]):
        """ Merges two Data instances on specified axes 
        and returns the result. 

        Args:
            left_df: Left dataframe to join.
            right_df: Right dataframe to join.
            left_on: Axes to join the left on.
            right_on: Axes to join the right on.
            how: can be inner, outer, left or right.
            suffix: two-element list for suffixes for overlapping columns.

        Returns:
            A Data object representing the joined data.
        """

        _validate_join_column_suffix([left_df.columns, right_df.columns],
                                     [left_on, right_on], suffix)
        
        joined = Data()
        joined._data = dd.merge(left_df.filter_data[left_df.columns],
                                right_df.filter_data[right_df.columns],
                                left_on=left_on, right_on=right_on, how=how, 
                                suffixes=suffix)
        joined.load_to_dask()
        return joined

    """ Inner-class for assisting in the creation of checkpoints for the Data class """
    class CheckPoint:
        """ Object which holds relevant state data for the checkpoint. """
        def __init__(self, data_inst):
            """ Constructor for the CheckPoint class

            Args:
                data_inst: Instance of the outer, data class.
            """
            self.data_inst = data_inst
            self.reset_variables()            
            
        def reset_variables(self):
            """ Set the initial variables"""
            # relevant variables for the data state
            self._checkpoint = None
            self._chkpt_types = None
            self._chkpt_is_transformed = None
            self._chkpt_load_status = None
            self._chkpt_ops = []
            self._chkpt_filter_size = None
            self._chkpt_orderings = {}

        def delete_checkpoint(self):
            """ Free data and clean-up """
            self.reset_variables()
            
        def create_checkpoint(self):
            """ Saves the relevant info for restoring to a checkpoint. """
            self.delete_checkpoint()  # delete previous checkpoint
            
            if not self.data_inst.is_loaded:
                self._chkpt_ops = self.data_inst.delayed_ops.copy()
            else:
                self._checkpoint = self.data_inst._data.copy()

            self._chkpt_types = self.data_inst._types.copy()
            self._chkpt_orderings = self.data_inst._orderings.copy()
            self._chkpt_load_status = self.data_inst.is_loaded

            self._chkpt_is_transformed = self.data_inst._is_transformed.copy()
            self._checkpt_filter_size = self.data_inst.filter_size
            
        def restore_checkpoint(self):
            """ Reset the state of the data to the previous checkpoint. """
            self.data_inst.is_loaded = self._chkpt_load_status
            if not self.data_inst.is_loaded:
                self.data_inst.delayed_ops = self._chkpt_ops.copy()
            else:
                self.data_inst._data = self._checkpoint.copy()
                

            self.data_inst._types = self._chkpt_types.copy()
            self.data_inst._orderings = self._chkpt_orderings.copy()
            self.data_inst._is_transformed = self._chkpt_is_transformed.copy()
            self.data_inst.filter_size = self._checkpt_filter_size

            
class DataSample(Data):
    """ Class representing a sample of a dask dataframe. """

    #@log_it
    def __init__(self, sample_obj, fulldata, should_apply_ops=False):
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

        self.checkpoint = self.CheckPoint(self)
        self.orig_types = fulldata.orig_types.copy()

        # should_apply_ops is true if the transformations need to be reapplied
        self._types = self.orig_types.copy() if should_apply_ops else fulldata.types.copy()
        self._is_transformed = {c: False for c in self.data_columns} \
                               if should_apply_ops else fulldata._is_transformed

        self._orderings = fulldata.orderings.copy()
        numtypes = [col for col, typ in self.types.items() if typ == 'Numerical']

        self._data_typ = self._data_typ.transform(
            lambda x: pd.to_numeric(x, errors='coerce') if x.name in numtypes else x
        )
        
        self._data = self._data_typ.copy()        
        self.fulldata = fulldata

        super().create_derived_variables()
        
        if should_apply_ops:
            self.apply_ops()
        
    #@log_it
    def apply_ops(self):
        """ Applies operations that were passed from the fulldata. 

        Args:
            ops: List of functools.partial functions to apply.
        """
        ops = self.fulldata.delayed_ops.copy()
        
        for op in ops:
            func_name = op.func.__name__
            if hasattr(self, func_name):
                getattr(self, func_name)(*op.args, apply_on_full=False)

    #@log_it
    def set_type(self, attr, coltype, ordering=None, save=False, apply_on_full=True):
        """ Sets the column type for the sample and updates the type description.

        Args:
            attr: Attribute to set the type for.
            coltype: Nominal, Index, or Numerical.
            save: If true, saves the result in a parquet file.
        """

        self._types[attr] = coltype
        if not self._is_transformed[attr]:
            self._data[attr] = self._data_obj[attr].copy()
            
        if coltype == 'Numerical':
            self._data[attr] = pd.to_numeric(self._data[attr], errors='coerce')
        elif coltype == 'DateTime':
            self._data[attr] = pd.to_datetime(self._data[attr])
        else:
            self._data[attr] = self._data[attr].astype(str)
            
        if coltype == 'Ordinal':
            all_cats = list(self._data[attr].dropna().unique())
            self._orderings[attr] = sorted(list(set(ordering + all_cats)))
        
        if apply_on_full:
            self.fulldata.set_type(attr, coltype, ordering, save=save)
            

    def set_ordering(self, attr, ordering, apply_on_full=True):
        """ Sets the ordering for an ordinal column.

        Args:
            attr: Attribute to set the ordering for.
            ordering: An list of categories in ascending order.           
        """
        if not isinstance(ordering, list) and ordering is not None:
            raise ValueError("Ordering should be list or null")
        
        if isinstance(ordering, list) and self._types[attr] != 'Ordinal':
            raise ValueError(attr + " should be ordinal")

        new_cats = list(self._data[attr].dropna().unique())
        new_cats = sorted(new_cats)
        unseen_cats = list(set(new_cats) - set(ordering))
        self._orderings[attr] = ordering + unseen_cats        

        if apply_on_full:
            self.fulldata.set_ordering(attr, ordering)

    #@log_it
    def aggregate_by_index(self, index_col, agg_type):
        """ Aggregates records so that each record is associated 
        with a unique value on the index_col. 

        Args:
            index_col: Column specifying unique records.
            agg_type: Dict. mapping column name to aggregation type.

        Returns:
            A new DataSample instance with aggregated rows.
        """
        return self.fulldata.aggregate_by_index(index_col, agg_type) \
                      .sample(nsamples=self._data.shape[0])
        
    #@log_it
    def split_data(self, sizeType="Percentage", sizeValue=30, method="Random"):
        """ Splits an AK dataframe into two distict data frames

        Args:
            sizeType: The method for selecting the size of the split - absolute or percentage.
            sizeValue: The value for the first split size.
            method: The method to select data items - random, in order, or linear steps

        Returns:
            Two new Data instances which are subsets of the current Data.
        """   
        return self.fulldata.split_data(sizeType, sizeValue, method) \
                      .sample(nsamples=self._data.shape[0])   
                       
    #@log_it         
    def apply_filter(self, col, lb=-np.inf, ub=np.inf, inc=1, ftype='Include', apply_on_full=True):
        """  Applies the filter to both the sample and fulldata.

        Args:
            col: Column to apply the filter on.
            lb: Lower bound of the filter.
            ub: Upper bound of the filter.
            inc: Increment amount.
        """
        super().apply_filter(col, lb, ub, inc, ftype=ftype)
        if apply_on_full:
            self.fulldata.apply_filter(col, lb, ub, inc, ftype=ftype)

    def apply_datetime_filter(self, col, lb=pd.Timestamp.min, ub=pd.Timestamp.max,
                              inc=1, apply_on_full=True):
        """ Applies a filter by incrementing (by inc) all values outside 
        the datetime range lb <= col <= ub. 

        Args:
            col: Column to apply the filter on.
            lb: Lower bound of the filter.
            ub: Upper bound of the filter.
            inc: Increment amount.
        """
        super().apply_datetime_filter(col, lb, ub, inc)
        if apply_on_full:
            self.fulldata.apply_datetime_filter(col, lb, ub, inc)

            
    #@log_it
    def apply_nominal_filter(self, col, include=[], ftype='Include', inc=1, apply_on_full=True):
        """ Applies a filter to a nominal attribute to sample and fulldata.

        Args:
            col: Column to apply the filter on.
            include: List of category levels to filter on.
            ftype: Indicates whether filter is inclusion or exclusion.
            inc: Increment amount.
        """
        super().apply_nominal_filter(col, include, ftype, inc)
        if apply_on_full:
            self.fulldata.apply_nominal_filter(col, include, ftype, inc)

    #@log_it
    def apply_normalize(self, col, newmin, newmax, apply_on_full=True):
        """ Normalize the column between new_min and new_max. 
        
        Args:
            col: Column to normalize.
            newmin: New lower bound.
            newmax: New upper bound.
        """
        super().apply_normalize(col, newmin, newmax)
        if apply_on_full:
            self.fulldata.apply_normalize(col, newmin, newmax)

    #@log_it
    def apply_log(self, col, base=10, apply_on_full=True):
        """ Apply log transformation to column. 

        Args:
            col: Column to apply log on.
            base: log base. 
        """
        super().apply_log(col, base)
        if apply_on_full:
            self.fulldata.apply_log(col, base)

    #@log_it
    def apply_clamp(self, col, lb, ub, apply_on_full=True):
        """ Clamp the data to between lb and ub. 
        
        Args:
            col: Column to clamp.
            lb: Lower bound to clamp to.
            ub: Upper bound to clamp to.
        """
        super().apply_clamp(col, lb, ub)
        if apply_on_full:
            self.fulldata.apply_clamp(col, lb, ub)

    #@log_it
    def apply_replace(self, col, old_vals, new_val, apply_on_full=True):
        """ Wrapper for dataframe replace method. 
        
        Args:
            col: Column to call replace on.
            old_vals: Current values to replace.
            new_val: Value to replace old_vals with.
        """        
        super().apply_replace(col, old_vals, new_val)
        if apply_on_full:
            self.fulldata.apply_replace(col, old_vals, new_val)

    def __apply_cell_split_ordered(self, col, delimiter, strip, quote):
        """ Applies the cell split where each column corresponds 
            to the order in the delimited list. 
            
        Args:
            col: Column to split
            delimiter: Delimiter to split on.
            strip: Characters to strip from the start / end of list.
            quote: Quotation character to remove.        
        """
        encoded = self._data[col].str.strip(strip) \
                                 .str.split(delimiter, expand=True) \
                                 .apply(lambda x: x.str.strip().str.strip(quote))
        encoded.columns = [f'{col}_pos_{pos}' for pos in encoded.columns]
        self._data = pd.concat([self._data, encoded], axis=1)
        
        for col in encoded.columns:
            self._types[col] = 'Nominal'
            self._orderings[col] = None
            

    def __apply_cell_split_unordered(self, col, delimiter, strip, quote):
        """ Applies the cell split where each column corresponds 
            to a unique value in the delimited list. 
            
        Args:
            col: Column to split
            delimiter: Delimiter to split on.
            strip: Characters to strip from the start / end of list.
            quote: Quotation character to remove.        
        """
        encoded = self._data[col].str.strip(strip) \
                                 .str.split(delimiter) \
                                 .apply(lambda x: np.array([s.strip().strip(quote) for s in x]))

        cols = np.unique(np.concatenate(encoded.values))
        encoded = pd.DataFrame(np.stack(encoded.apply(lambda x: np.isin(cols, x).astype(int))),
                               columns=cols)
        encoded.columns = [f'{col}_{name}' for name in encoded.columns]
        self._data = pd.concat([self._data, encoded], axis=1)
        
        for col in encoded.columns:
            self._types[col] = 'Nominal'
            self._orderings[col] = None
            
        
    def apply_cell_split(self, col, delimiter, ordered=True, strip='', quote='',
                         apply_on_full=True):
        """ Applies a cell splitting operation """

        if ordered:
            self.__apply_cell_split_ordered(col, delimiter, strip, quote)
        else:
            self.__apply_cell_split_unordered(col, delimiter, strip, quote)
            
        if apply_on_full:
            self.fulldata.apply_cell_split(col, delimiter, ordered, strip, quote)

    def sample(self, nsamples=1000):
        """ Samples the data. 

        Args: 
            nsamples: Number of samples.

        Returns:
            An instance of the DataSample class.
        """
        nsamples = min(nsamples, self.filter_data.shape[0])
        return DataSample(self.filter_data[self.data_columns].sample(nsamples), self.fulldata)        
        
    #@log_it
    def apply_onehot(self, col, bind=None, ext=None, return_columns=False, newType=object):
        """ Apply one hot encoding on the values of col. 
        
        Args:
            col: Column to apply one hot encoding on.
            bind: Optional column to bind to. This will make the 1's
            the bound column values and 0's nans.
            ext: An extenstion to the name of the column
            return_columns: If true, returns the ohe columns.
            newType: The default type of the new columns. Gets overridden if bind is specified

        Returns:
            List of ohe levels and possibly columns
        """
        levels = self.fulldata.apply_onehot(col, bind)  # need to get all of the levels.

        # get ohe columns
        if bind is None:
            ohe_cols = [f'{col}_{l}' for l in levels]
        else:
            ohe_cols = [f'{col}_{l}_{bind}' for l in levels]

        # add the extenstion
        if ext is not None:
            ohe_cols = [f'{l}_{ext}' for l in ohe_cols]

        ohe_cols = super()._valid_column_names(ohe_cols)
        
        for ohe, l in zip(ohe_cols, levels):
            if bind is None:
                self._data[ohe] = (self._data[col]==l).astype(int)
            else:  # bind column to the dataframe         
                self._data[ohe] = self._data[bind].mask(self._data[col]!=l)

        
        # Set type to float if a column is bound and is numerical
        if bind is not None:            
            newType = float if self._types[bind]== 'Numerical' else object
            
        for ohe in ohe_cols:
            self._types[ohe] = 'Nominal' if bind is None else self._types[bind]
            self._orderings[ohe] = None
        
        # Set new column type to that of bound column
        self._data[ohe_cols] = self._data[ohe_cols].astype(newType)
        self._data_typ[ohe_cols] = self._data[ohe_cols].copy()
        self._data_obj[ohe_cols] = self._data[ohe_cols].astype(object)            

        for ohe in ohe_cols:
            self._is_transformed[ohe] = True

        if return_columns:
            return levels, ohe_cols
        
        return levels
        
    #@log_it
    def apply_rank(self, col1, col2, nranks, rank_attr_name=None):
        """ Apply a rank transformation to the values of col1. 

        Args:
            col1: Column to transform.
            col2: Column to base col1's ranking on.
            nranks: Number of ranks.        
            rank_attr_name: Name of the newly created attribute.
        """
        mapper = self.fulldata.apply_rank(col1, col2, nranks)
        
        rank_attr = self._valid_column_name(f'{col1}_rank{nranks}_{col2}')
        self._data[rank_attr] = self._data[col1].apply(lambda x: mapper[x])
        self._data_typ[rank_attr] = self._data[rank_attr].copy()
        self._data_obj[rank_attr] = self._data[rank_attr].astype(object)            

        self._types[rank_attr] = 'Nominal'
        self._orderings[rank_attr] = None
        self._is_transformed[rank_attr] = True

        if rank_attr_name is not None:
            # call apply_rename to handle the checks against
            # duplicate column names
            self.apply_rename(rank_attr, rank_attr_name)
        
        return mapper
   
    #@log_it
    def apply_fill_missing(self, col, method, replaceVal, apply_on_full=True):
        """ Fill missing data based on the 'method'. 
        
        Args:
            col: Column to fill missing data.
            method: Method of filling missing data.
        """        
        super().apply_fill_missing(col, method, replaceVal)
        if apply_on_full:
            self.fulldata.apply_fill_missing(col, method, replaceVal)

    #@log_it
    def apply_drop_na(self, col, inc=1, apply_on_full=True):
        """ Applies a filter on NaN values to an attribute by incrementing (by inc) 
        all values with a category level in include .

        Args:
            col: Column to apply the filter on.
            inc: Increment amount.
        """
        super().apply_drop_na(col, inc)
        if apply_on_full:
            self.fulldata.apply_drop_na(col, inc)

    #@log_it
    def apply_rename(self, col, name, apply_on_full=True):
        """ Renames the column 'col' with name. 
        
        Args:
            col: Column to rename.
            name: New name.        
        """
        super().apply_rename(col, name)
        if apply_on_full:
            self.fulldata.apply_rename(col, name)

    #@log_it
    def apply_custom(self, col, expr, apply_on_full=True):
        """ Applies a custom transformation to sample and fulldata. 

        Args:
            col: Column to apply expression on.
            expr: Pythonic expression to evaluate.
        """
        super().apply_custom(col, expr)
        if apply_on_full:
            self.fulldata.apply_custom(col, expr)

    #@log_it
    def create_derived(self, col, expr, apply_on_full=True):
        """ Creates a derived attribute. """
        super().create_derived(col, expr)
        if apply_on_full:
            self.fulldata.create_derived(col, expr, expected_type=self._types[col])

    #@log_it
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

    #@log_it
    def describe_col(self, col, drop_inf=False):
        """ Wrapper for native describe method on a single column. """
        if drop_inf:
            return self.filter_data[col].replace([np.inf, -np.inf], np.nan).describe(include='all')
        return self.filter_data[col].describe(include='all')

    #@log_it
    def histogram(self, col, bins, normalize=False, **kwargs):
        """ Computes a histogram (with filters) based on the full data. 
        
        Args:
            col: Column to compute the histogram for.
            bins: Division for histogram.
            normalize: If true, returns counts as a percentage.

        Returns:
            counts and bins from numpy histogram method.
        """
        vector = self.filter_data[col].replace([np.inf, -np.inf], np.nan).dropna()
        count, bins = np.histogram(vector, bins=bins)
        if normalize:
            return count/vector.shape[0], bins

        return count, bins
    
    #@log_it
    def histogram_by(self, col, by, bins, **kwargs):
        """ Computes a histogram (with filters) based on the full data. 
        
        Args:
            col: Column to compute the histogram for.
            bins: Division for histogram.
            normalize: If true, returns  counts as a percentage.

        Returns:
            counts and bins from numpy histogram method.
        """
        classes = self.unique(by)
        counts = {}
        for c in classes:
            vector = self.filter_data[self.filter_data[by]==c][col].replace([np.inf, -np.inf], np.nan).dropna()    
            count, div = np.histogram(vector, bins=bins)            
            counts[c] = count
        
        return counts, bins 

    #@log_it
    def histogram_all(self, col, bins):
        """ Computes a histogram (no filters) based on the sample data. 
        
        Args:
            col: Column to compute the histogram for.
            bins: Division for histogram.

        Returns:
            counts and bins from numpy histogram method.
        """
        vector = self._data[col].replace([np.inf, -np.inf], np.nan).dropna()
        return np.histogram(vector, bins=bins)

    #@log_it
    def histograms(self, col, nbins=30, lb=-np.inf, ub=np.inf, transform=None):
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

        full_data = self._data[col]

        if transform is not None:
            filt_data = transform(filt_data)
            full_data = transform(full_data)
            lb = transform(lb)
            ub = transform(ub)

            
        # intitialize bin range
        r_min = filt_data.min()
        r_max = filt_data.max()

        # Use lb and ub to compute bins values if they are finite
        if np.isfinite(lb):
            r_min = lb
        if np.isfinite(ub):
            r_max = ub
        
        # Filtered histogram data.        
        counts, bins = np.histogram(filt_data, bins=nbins,
                                    range=(r_min, r_max))

        counts_all, _ = np.histogram(full_data, bins=bins)
        assert np.all(counts_all >= counts)  # sanity check
        
        return counts, counts_all, bins


    #@log_it
    def drop_columns(self, drop, apply_on_full=True):
        """ Marks the columns in drop to be deleted. 
        
        Args:
            drop: List of columns to drop.
        """
        super().drop_columns(drop)
        if apply_on_full:
            self.fulldata.drop_columns(drop)

    #@log_it    
    def drop_column(self, col, apply_on_full=True):
        """ Marks a column to be dropped. 
        
        Args:
            col: Column to drop.
        """
        super().drop_column(col)
        if apply_on_full:
            self.fulldata.drop_column(col)

    #@log_it
    def create_checkpoint(self):
        """ Marks the current state of the data point as a checkpoint. """
        super().create_checkpoint()
        self.fulldata.create_checkpoint()

    #@log_it
    def restore_checkpoint(self):
        """ Reset the state of the data to the previous checkpoint. """
        super().restore_checkpoint()
        self.fulldata.restore_checkpoint()

    #@log_it
    def reset_data(self):
        """ Resets the data. """
        super().reset_data()
        self.fulldata.reset_data()
        
class DataInMem(Data):
    """ Class representing a pandas dataframe stored in memory. """

    def __init__(self, filepath=None, options=None, data=None, **kwargs):
        """ Constructor for DataInMem class. 

        Args: 
            filepath: Filepath to the data.
            options: Options for reading the data.        
        """
        self.filepath = filepath
        if filepath is None:
            self._data_orig = data.copy()
            
        self.is_loaded = True
        
        # validate options, if None a set of defaults will be generated
        self.options = _validate_options(options)
        self.reset_data()

    def reset_data(self):
        """ Reads the data from the file. """
        if self.filepath:
            # read in the full dataset as a pandas dataframe
            self._data = _read_csv_head_pandas(self.filepath, nrows=None, options=self.options)
        else:
            self._data = self._data_orig.copy()
        
        self._data, numcols = _detect_types(self._data, filepath=self.filepath, options=self.options)
        self._types = {c: 'Numerical' if c in numcols else 'Nominal' \
                          for c in self._data.columns}
                
        self.orig_types = self._types.copy()

        self._orderings = {c: None for c in self.data_columns}
        self._is_transformed = {c: False for c in self.data_columns}

        # init checkpoint variables
        self.checkpoint = self.CheckPoint(self)        

        self.create_derived_variables()

        nancols = self._data.columns[self._data.isna().all()]
        self._data[nancols] = self._data[nancols].astype(object)

        # update types if necessary
        for c in self.columns:
            if self._types[c] == 'Nominal':
                if self._data[c].dtype.name not in ['object', 'category', 'str']:
                    self.set_type(c, 'Nominal')
                    
        
    def describe_col(self, col, drop_inf=False):
        """ Wrapper for native describe method on a single column. """
        if drop_inf:
            return self.filter_data[col].replace([np.inf, -np.inf], np.nan).describe(include='all')
        return self.filter_data[col].describe(include='all')

    def describe(self, columns=None):
        """ Wrapper for the native describe method. 
        
        Args:
            columns: Columns to include in the description.
        
        Returns:
            Pandas dataframe desribing the columns.
        """
        if columns is None:
            try: 
                return self.filter_data[self.data_columns].describe()
            except ValueError:
                # Triggered when the filtered data is empty
                return self.filter_data[self.data_columns].compute()
            
        return self.filter_data[columns].describe()
    
    def apply_custom(self, col, expr):
        """ Applies a custom transformation based on a pythonic expression. 

        Args:
            col: Column to apply expression on.
            expr: Pythonic expression to evaluate.
        """
        self._is_transformed[col] = True
        
        columns = set(self.data_columns) | set(self.orig_columns)
        cols = sorted(list(columns), key=len, reverse=True)

        expr = split_replace_join(expr, cols, lambda delim: "self._data['"+delim+"']")
        
        try:
            self._data[col] = eval(expr).replace([np.inf, -np.inf], np.nan)
        except Exception as e:
            print("Expression: ", expr)
            print(e)
            raise

    def set_type(self, attr, coltype, ordering=None, save=False, apply_on_full=True):
        """ Sets the column type for the sample and updates the type description.

        Args:
            attr: Attribute to set the type for.
            coltype: Nominal, Index, or Numerical.
            save: If true, saves the result in a parquet file.
        """

        self._types[attr] = coltype
        if not self._is_transformed[attr]:
            if self.filepath:
                self._data[attr] = _read_csv_head_pandas(self.filepath, nrows=None,
                                                         usecols=[attr], options=self.options)[attr]
            else:
                self._data[attr] = self._data_orig[attr].copy()
            
        if coltype == 'Numerical':
            self._data[attr] = pd.to_numeric(self._data[attr], errors='coerce')
        elif coltype == 'DateTime':
            self._data[attr] = pd.to_datetime(self._data[attr])
        else:
            self._data[attr] = self._data[attr].astype(str)
            
        if coltype == 'Ordinal':
            all_cats = list(self._data[attr].dropna().unique())
            self._orderings[attr] = sorted(list(set(ordering + all_cats)))

            
    def sample(self, nsamples=1000):
        """ Samples the data. 

        Args: 
            nsamples: Number of samples.

        Returns:
            An instance of the DataSample class.
        """
        nsamples = min(nsamples, self.filter_data.shape[0])
        return DataSample(self.filter_data[self.data_columns].sample(nsamples), self)

    def apply_onehot(self, col, bind=None, ext=None, return_columns=False, newType=object):
        """ Apply one hot encoding on the values of col. 
        
        Args:
            col: Column to apply one hot encoding on.
            bind: Optional column to bind to. This will make the 1's
            the bound column values and 0's nans.
            ext: An extenstion to the name of the column
            return_columns: If true, returns the ohe columns.
            newType: The default type of the new columns. Gets overridden if bind is specified

        Returns:
            List of ohe levels and possibly columns
        """
        dummies = pd.get_dummies(self._data[col])
        levels = dummies.columns.tolist()
        if bind is None:            
            
            # add the prefix column name
            # NOTE: we could use the get_dummies prefix param for this
            # but then we would need to strip the prefix to get the
            # levels param. This way seems slightly easier.
            ohe_cols = [f'{col}_{c}' for c in dummies.columns]
        else:
            ohe_cols = [f'{col}_{c}_{bind}' for c in dummies.columns]            
            dummies = dummies.replace({0: np.nan}).multiply(self._data[bind], axis=0)
            
        # add the extenstion
        if ext is not None:
            ohe_cols = [f'{l}_{ext}' for l in ohe_cols]
            
        ohe_cols = self._valid_column_names(ohe_cols)
        dummies.rename(columns={old: new for old, new in zip(dummies.columns, ohe_cols)},
                                inplace=True)
                       
        self._data = pd.concat([self._data, dummies], axis=1)
        for ohe in ohe_cols:
            self._types[ohe] = 'Nominal' if bind is None else self._types[bind]
            self._orderings[ohe] = None
            self._is_transformed[ohe] = True

        if return_columns:
            return levels, ohe_cols

        return levels


    def __apply_cell_split_ordered(self, col, delimiter, strip, quote):
        """ Applies the cell split where each column corresponds 
        to the order in the delimited list. 
        
        Args:
            col: Column to split
            delimiter: Delimiter to split on.
            strip: Characters to strip from the start / end of list.
            quote: Quotation character to remove.        
        """
        encoded = self._data[col].str.strip(strip) \
                                 .str.split(delimiter, expand=True) \
                                 .apply(lambda x: x.str.strip().str.strip(quote))
        encoded.columns = [f'{col}_pos_{pos}' for pos in encoded.columns]
        self._data = pd.concat([self._data, encoded], axis=1)
        
        for col in encoded.columns:
            self._types[col] = 'Nominal'
            self._orderings[col] = None

    def __apply_cell_split_unordered(self, col, delimiter, strip, quote):
        """ Applies the cell split where each column corresponds 
        to a unique value in the delimited list. 
        
        Args:
            col: Column to split
            delimiter: Delimiter to split on.
            strip: Characters to strip from the start / end of list.
            quote: Quotation character to remove.        
        """
        encoded = self._data[col].str.strip(strip) \
                                 .str.split(delimiter) \
                                 .apply(lambda x: np.array([s.strip().strip(quote) for s in x]))

        cols = np.unique(np.concatenate(encoded))
        encoded = pd.DataFrame(np.stack(encoded.apply(lambda x: np.isin(cols, x).astype(int))),
                               columns=cols)
        encoded.columns = [f'{col}_{name}' for name in encoded.columns]
        self._data = pd.concat([self._data, encoded], axis=1)
        
        for col in encoded.columns:
            self._types[col] = 'Nominal'
            self._orderings[col] = None
            
            
    def apply_cell_split(self, col, delimiter, ordered=True, strip='', quote=''):
        """ Applies a cell splitting operation """
        if ordered:
            return self.__apply_cell_split_ordered(col, delimiter, strip, quote)

        return self.__apply_cell_split_unordered(col, delimiter, strip, quote)
        
    def aggregate_by_index(self, index_col, agg_map):
        """ Aggregates records so that each record is associated 
        with a unique value on the index_col. 

        Args:
            index_col: Column specifying unique records.
            agg_map: Dict. mapping aggregation function to attributes to which it is applied.

        Returns:
            A new Data instance with aggregated rows.
        """
        if not isinstance(agg_map, list):
            raise TypeError("agg_map should be a list type.")
        
        data = self.filter_data.copy();

        # Organize the columns to which the ohe transform is applied to 
        # along with attributes bound to them and 
        # the aggregation methods to be applied to the new columns
        # e.g. {
        #       d: {
        #              attrs: [a,b,c]
        #              mean: [a,b]
        #              max: [b,c]
        #              }
        #       }
        # here ohe will be applied to a,b,c while binding d to them. 
        # Then the the mean aggregation will be applied to the resulting
        # columns from a & b and max to those from b & c
        oheTrans = {}
        for agg in agg_map:
            func = agg["aggFunc"]["value"]
            if func == "ohe" and len(agg["attrs"]) > 0:
                for b in agg['bind']:
                    bind_attr = b['attr']["value"]
                    bind_func = b['func']["value"]
                    if bind_attr not in oheTrans:
                        oheTrans[bind_attr] = {
                            "attrs": []
                        }
                    # Create a list of all attributes to which ohe is
                    # applied and bound to bind_attr
                    oheTrans[bind_attr]["attrs"] += [d['value'] for d in agg["attrs"]]
                    
                    if bind_func not in oheTrans[bind_attr]:
                        oheTrans[bind_attr][bind_func] = []
                    
                    # Create a list of all attributes whose reuslting columns will
                    # be aggregated with the bind_func
                    oheTrans[bind_attr][bind_func] += [d['value'] for d in agg["attrs"]]

        # Intialize a mapping from aggregation functions to column names
        agg_func_cols_name_map = {"mean": [], "min": [], "max": [], "std": [],
                                  "var": [], "sum": [], "first": [], "last": [],
                                  "size": [], "count": [], "max_count": []}

        # catcols will be automatically ohe unless the agg_type is 'max_count'
        to_ohe = []
        for k, v in oheTrans.items():
            to_ohe += v["attrs"] 
        to_ohe = list(set(to_ohe))
        
        # one-hot-encode columns (note: column name will be added as prefix)
        dummies = pd.get_dummies(data[to_ohe], columns=to_ohe) if to_ohe else None
        
        # Apply the ohe transforms                    
        for bind_attr, bind_obj in oheTrans.items():
            # Remove any duplictes 
            for k, v in bind_obj.items():
                bind_obj[k] = list(set(v))           
            
            # Apply ohe
            for ohe in bind_obj["attrs"]:
                # ohe column names for the encoded column
                oc_levels = [f'{ohe}_{l}' for l in data[ohe].unique()]

                oc_levels_name = []
                if bind_attr == "None":
                    # rename columns if necessary                    
                    oc_levels_name = self._valid_column_names(oc_levels)
                    data = pd.concat([data, dummies[oc_levels]], axis=1)                    
                else:
                    # perform the binding
                    if self.types[bind_attr] == 'Numerical': 
                        bind_result = dummies[oc_levels]\
                                      .replace({0: np.nan}) \
                                      .multiply(data[bind_attr], axis=0)
                    else:
                        bind_result = dummies[oc_levels] \
                                      .multiply(data[bind_attr], axis=0) \
                                      .replace('', np.nan)                   
                    
                    # updated column names to include the binded attribute
                    oc_levels_name = self._valid_column_names([f'{c}_{bind_attr}' \
                                                               for c in oc_levels])

                    # replace the column name
                    data = pd.concat([data, bind_result.rename(columns={
                        old: new for old, new in zip(oc_levels, oc_levels_name)
                    })], axis=1)
                

                # Add the resulting columns to the appropriate aggregation function
                for k, v in bind_obj.items():
                    if k != 'attrs' and ohe in v:
                        agg_func_cols_name_map[k] += oc_levels_name

        # Update the mapping of aggregation functions and the columns they are applied to
        for agg in agg_map:
            func = agg["aggFunc"]["value"]
            if func != "ohe" and len(agg["attrs"]) > 0:
                agg_func_cols_name_map[func] += [d['value'] for d in agg["attrs"]]
                agg_func_cols_name_map[func] = list(set(agg_func_cols_name_map[func]))        

                
        mode_cols = agg_func_cols_name_map['max_count']
        del agg_func_cols_name_map['max_count']

        num_agg_types = defaultdict(list)
        for k, v in agg_func_cols_name_map.items():
            for col in v:
                num_agg_types[col].append(k)


        if num_agg_types:
            num_df = data \
                     .groupby(index_col) \
                     .aggregate(num_agg_types) 
        else:
            num_df = None
            
        mode_df = _groupby_mode(data, index_col, mode_cols) if mode_cols else None

        if mode_df is not None:
            mode_df.columns = pd.MultiIndex.from_tuples([(c, 'max_count') \
                                                         for c in mode_df.columns])

        if (num_df is None or num_df.empty) and mode_df is not None:
            agg_result = mode_df
        else:
            agg_result = num_df if mode_df is None else num_df.join(mode_df)

        # Setup types for aggregated data columns
        agg_types = {}
        if num_df is not None:
            num_cols = num_df.columns.map('{0[0]}_{0[1]}'.format)
            num_types = {c: "Numerical" for c in num_cols}
            agg_types.update(num_types)
        
        if mode_df is not None:
            nom_cols = mode_df.columns.map('{0[0]}_{0[1]}'.format)
            nom_types = {c: "Nominal" for c in nom_cols}
            agg_types.update(nom_types)

        # flatten the multi-index
        agg_result.columns = agg_result.columns.map('{0[0]}_{0[1]}'.format)       
        agged = DataInMem(data=agg_result.reset_index())
        
        # Reset types for aggregated data columns that may have been changed by DataInMem initialization
        for k, v in agged._types.items():
            if k in agg_types and agg_types[k] != v:
                agged.set_type(k, agg_types[k])

        return agged        

    
    def apply_rank(self, col1, col2, nranks, rank_attr_name=None):
        """ Apply a rank transformation to the values of col1. 

        Args:
            col1: Column to transform.
            col2: Column to base col1's ranking on.
            nranks: Number of ranks.        
            rank_attr_name: Name of the newly created attribute.
        """            
        ordered_col1 = self._data.groupby(col1)[col2].mean().sort_values()
        
        quants = np.nanquantile(ordered_col1.values, q=[i/nranks for i in range(1, nranks)])
        rank = np.searchsorted(quants, ordered_col1)
        mapper = {l: np.nan if np.isnan(v) else f'rank_{r}' \
                  for l, v, r in zip(ordered_col1.index, ordered_col1.values, rank)}
        mapper[np.nan] = np.nan
        
        rank_attr = self._valid_column_name(f'{col1}_rank{nranks}_{col2}')
        self._data[rank_attr] = self._data[col1].apply(lambda x: mapper[x])
                                                       
        self._types[rank_attr] = 'Nominal'
        self._orderings[rank_attr] = None
        self._is_transformed[rank_attr] = True
        
        if rank_attr_name is not None:
            # call apply_rename to handle the checks against
            # duplicate column names
            self.apply_rename(rank_attr, rank_attr_name)
            
        return mapper

    def histogram(self, col, bins, normalize=False, **kwargs):
        """ Computes a histogram (with filters) based on the full data. 
        
        Args:
            col: Column to compute the histogram for.
            bins: Division for histogram.
            normalize: If true, returns counts as a percentage.

        Returns:
            counts and bins from numpy histogram method.
        """
        vector = self.filter_data[col].replace([np.inf, -np.inf], np.nan).dropna()
        count, bins = np.histogram(vector, bins=bins)
        if normalize:
            return count/vector.shape[0], bins

        return count, bins
    
    #@log_it
    def histogram_by(self, col, by, bins, **kwargs):
        """ Computes a histogram (with filters) based on the full data. 
        
        Args:
            col: Column to compute the histogram for.
            bins: Division for histogram.
            normalize: If true, returns  counts as a percentage.

        Returns:
            counts and bins from numpy histogram method.
        """
        classes = self.unique(by)
        counts = {}
        for c in classes:
            vector = self.filter_data[self.filter_data[by]==c][col].replace([np.inf, -np.inf], np.nan).dropna()
            count, div = np.histogram(vector, bins=bins)
            counts[c] = count
        
        return counts, bins 

    def histogram_all(self, col, bins):
        """ Computes a histogram (no filters) based on the sample data. 
        
        Args:
            col: Column to compute the histogram for.
            bins: Division for histogram.

        Returns:
            counts and bins from numpy histogram method.
        """
        vector = self._data[col].replace([np.inf, -np.inf], np.nan).dropna()
        return np.histogram(vector, bins=bins)

    
    def histograms(self, col, nbins=30, lb=-np.inf, ub=np.inf, transform=None):
        """ Computes both the filtered and unfiltered histogram based 
        on the data. 
    
        Args:
            col: Column to compute the histogram for.
            nbins: Number of bins.
            lb: Include values >= than lower bound
            ub: Include values <= than upper bound
            transform: Function for pre-precesssing the data.

        Returns:
            A tuple containing counts, counts_all, and bins.
        """
        if not isinstance(nbins, int):
            raise TypeError("nbins is expected to be an integer.")

        filt_data = self.filter_data[col]
        filt_data = filt_data[(filt_data >= lb) & (filt_data<=ub)].dropna()

        full_data = self._data[col]

        if transform is not None:
            filt_data = transform(filt_data)
            full_data = transform(full_data)
            lb = transform(lb)
            ub = transform(ub)
        
        # Filtered histogram data.        
        counts, bins = np.histogram(filt_data, bins=nbins)
        
        counts_all, _ = np.histogram(full_data, bins=bins)
        assert np.all(counts_all >= counts)  # sanity check
        
        return counts, counts_all, bins

    
    def split_data(self, sizeType="Percentage", sizeValue=30, method="Random"):
        """ Splits an AK dataframe into two distict data frames

        Args:
            sizeType: The method for selecting the size of the split - absolute or percentage.
            sizeValue: The value for the first split size.
            method: The method to select data items - random, in order, or linear steps

        Returns:
            Two new Data instances which are subsets of the current Data.
        """       
        
        if not (sizeType == "Percentage" or sizeType == "Absolute Count"):
            raise TypeError("Size Type must be Percentage or Absolute Count")

        if not (method == "Random" or method == "InOrder"):
            raise TypeError("Method must be Random or InOrder")

        if sizeType == "Percentage" and  (sizeValue <= 0 or sizeValue >=100):
                raise TypeError("Split percentage should be more than 0 and less than 100.")   
        
        self.create_checkpoint()
        
        if method == "Random":
            # In random split the sizeValue is always a percentage
            percentage1 = sizeValue/100
            percentage2 = 1 - percentage1

            filtered = self.filter_data[self.columns]
            
            # Split the data            
            df1 = filtered.sample(frac=percentage1)
            df2 = filtered.loc[~filtered.index.isin(df1.index)]

        if method == "InOrder":
            # Based on the sizeType compute the indices for the split            
            split_idx = 2
            shape = self.shape
            
            if sizeType == "Percentage":
                split_idx = np.floor(sizeValue/100 * shape[0])
            if sizeType == "Absolute Count":
                split_idx = int(sizeValue)
            
            if split_idx >= shape[0]:
                raise TypeError("Split count larger than available data")    
      
            # Split the data
            df1 = self.filter_data[self.columns].loc[:split_idx-1]
            df2 = self.filter_data[self.columns].loc[split_idx:]
        
        # Reset the indexes of the resulting dataframes
        df1 = df1.reset_index(drop=True)
        df2 = df2.reset_index(drop=True)

        self.restore_checkpoint()

        return DataInMem(data=df1), DataInMem(data=df2)


    @staticmethod
    @log_it
    def apply_multi_merge(dfs, on, how, suffix):
        """ Merges N Data instances on specified axes 
        and returns the result. 
        
        Args:
            dfs: List of dataframes to join.
            on: List of columns to join on for each df.
            how: Can be left, right, inner, outer.
            suffix: List of suffixex (1 for each df) for overlapping columns.

        Returns:
            A Data object representing the joined data.
        """
        _validate_join_column_suffix([df.columns for df in dfs], on, suffix)
        
        pdfs = [df.filter_data[df.columns] for df in dfs]
        assert len(dfs) == len(on), '"dfs" and "on" have different lengths'

        joined = DataInMem(data=functools.reduce(
            lambda left, right: (dd.merge(
                left[0], right[0],
                left_on=left[1], right_on=right[1], how=how, 
                suffixes=[left[2], right[2]]), right[1], right[2]),
            zip(pdfs, on, suffix))[0])

        return joined

    
    @staticmethod
    @log_it
    def apply_merge(left_df, right_df, left_on, right_on, how, suffix=["_x", "_y"]):
        """ Merges two Data instances on specified axes 
        and returns the result. 

        Args:
            left_df: Left dataframe to join.
            right_df: Right dataframe to join.
            left_on: Axes to join the left on.
            right_on: Axes to join the right on.
            how: can be inner, outer, left or right.
            suffix: two-element list for suffixes for overlapping columns.

        Returns:
            A Data object representing the joined data.
        """
        _validate_join_column_suffix([left_df.columns, right_df.columns],
                                     [left_on, right_on], suffix)
        
        joined = DataInMem(data=pd.merge(left_df.filter_data[left_df.columns],
                                         right_df.filter_data[right_df.columns],
                                         left_on=left_on, right_on=right_on, how=how, 
                                         suffixes=suffix))
        return joined
