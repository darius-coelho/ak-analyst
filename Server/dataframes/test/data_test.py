import unittest
import os
import warnings
import sys
import inspect
import shutil
import logging

import pandas as pd
import numpy as np
import dask.dataframe as dd
import dask

currentdir = os.path.dirname(os.path.abspath(inspect.getfile(inspect.currentframe())))
parentdir = os.path.dirname(os.path.dirname(currentdir))
sys.path.insert(0, parentdir)

from dataframes.data import Data, _detect_types
from ak_logger import logger

# disable logging
logger.setLevel(logging.WARNING)

class TestData(unittest.TestCase):
    def setUp(self):
        """ Create random data and store to a file. """        
        N, M = 1000, 100
        columns = [f'col-{i}'for i in range(M)]
        X = np.random.normal(size=(N, M))
        X[:, 2] = X[:, 1] + np.random.normal(size=N)

        level_count = int(N/4)        

        df = pd.DataFrame(X, columns=columns)
        df['col-0'] = ['a'] * level_count \
                      + ['b'] * level_count \
                      + ['c'] * level_count \
                      + ['d'] * level_count
        df['col-96'] = ['e'] * int(N - int(N/3)) + ['f'] * int(N/3)
        df['col-97'] = ['e'] * int(N - int(N/3)) + ['f'] * int(N/3)
        df['col-98'] = ['u'] * int(N / 3) + ['v'] * int(N - int(N/3))
        df['col-99'] = ['x'] * int(N / 4) + ['y'] * int(3 * N / 4)
        df['col-10'] = pd.date_range(start='01/01/1988', periods=N)

        df['col-11'] = ['a'] * level_count \
                       + ['b'] * level_count \
                       + ['c'] * level_count \
                       + [np.nan] * level_count

        df.loc[0, 'col-3'] = np.inf  # set an inf
        
        os.mkdir('test_data/')
        df.to_csv('test_data/test_data.csv', index=False)
        df['col-1'] = np.nan
        df['col-33'] = np.nan
        df.loc[2, 'col-33'] = 0.1
        df['col-25'] = range(N)
        df.loc[:level_count, 'col-25'] = np.nan

        df.to_csv('test_data/test_data_nan.csv', index=False)

        df['bool_type'] = df['col-50'] > df['col-50'].mean()
        df.to_csv('test_data/test_data_bool.csv', index=False)
        
        
    def tearDown(self):
        """ Remove the random test data and directory. """
        # remove test files        
        shutil.rmtree('test_data/')

        if os.path.isdir('parquet/'):
            # remove parquet files
            shutil.rmtree('parquet/')
        
    def test_init(self):
        """ Test constructor setup """
        filepath = 'test_data/test_data.csv'

        data = Data(filepath)

        # filters_applied should be excluded
        self.assertFalse("filters_applied" in data.columns)

        # types should be set
        self.assertTrue('col-0' in data.types)
        self.assertTrue('col-10' in data.types)
        
        # should use dask
        if not data.is_loaded:
            data.load_to_dask()        
            
        self.assertTrue(isinstance(data.data, dd.DataFrame))
        self.assertEqual(data.shape, (1000, 100))

    def test_init_malformed_data(self):
        """ Test loading data that is malformed (i.e. too many commas) """
        filepath = parentdir+"/data/sp500_malformed.csv"

        data = Data(filepath)
        
        # filters_applied should be excluded
        self.assertFalse("filters_applied" in data.columns)

        # types should be set
        self.assertTrue('sector' in data.types)
        self.assertTrue('stddev' in data.types)
                   
        self.assertTrue(isinstance(data.data, dd.DataFrame))
        self.assertEqual(data.shape, (373, 27))

        
    def test_init_with_skiplines(self):
        """ Test constructor setup with skip line options"""
        filepath1 = parentdir + '/data/test_data_txt/sp500_data.csv'
        filepath2 = parentdir + '/data/test_data_txt/sp500_data_file_info.csv'
        
        options = {
            'encoding': 'utf_8',
            'delim': ",",
            'lineDelim': "",    
            'headerRow': 3,        
            'startLine': 0,   
            'escapechar': '',
            'comment': '',
            'decimal': ".", 
            'thousands': "",
            'skipEmpty': False,
            'naOptions': [],
        }       

        data1 = Data(filepath1)
        data2 = Data(filepath2, options=options)

        # filters_applied should be excluded
        self.assertFalse("filters_applied" in data1.columns)
        self.assertFalse("filters_applied" in data2.columns)

        # should use dask
        if not data1.is_loaded:
            data1.load_to_dask()
        
        # should use dask
        if not data2.is_loaded:
            data2.load_to_dask()

        # should use dask
        self.assertTrue(isinstance(data1.data, dd.DataFrame))
        self.assertTrue(isinstance(data2.data, dd.DataFrame))

        # Test if default options read in a text file as one column data
        self.assertEqual(data1.shape, (374, 27))
        self.assertEqual(data2.shape, (374, 27))

    def test_init_with_txt_tab_pipe(self):
        """ Test constructor setup with tab and pipe separated text file"""        
        filepathTab = parentdir + '/data/test_data_txt/sp500_data_file_info_tab.txt'
        filepathPipe = parentdir + '/data/test_data_txt/sp500_data_file_info_pipe.txt'
        
        optionsTab = {
            'encoding': 'utf_8',
            'delim': "\t",
            'lineDelim': "",    
            'headerRow': 3,        
            'startLine': 0,   
            'escapechar': '',
            'comment': '',
            'decimal': ".", 
            'thousands': "",
            'skipEmpty': False,
            'naOptions': [],
        }

        optionsPipe = {
            'encoding': 'utf_8',
            'delim': "|",
            'lineDelim': "",    
            'headerRow': 3,        
            'startLine': 0,   
            'escapechar': '',
            'comment': '',
            'decimal': ".", 
            'thousands': "",
            'skipEmpty': False,
            'naOptions': [],
        }
        
        data1Tab = Data(filepathTab, options=optionsTab)
        data2Tab = Data(filepathTab)
        data1Pipe = Data(filepathPipe, options=optionsPipe)
        data2Pipe = Data(filepathPipe)

        # filters_applied should be excluded
        self.assertFalse("filters_applied" in data1Tab.columns)
        self.assertFalse("filters_applied" in data2Tab.columns)        
        self.assertFalse("filters_applied" in data1Pipe.columns)
        self.assertFalse("filters_applied" in data2Pipe.columns)   

        # should use dask
        if not data1Tab.is_loaded:
            data1Tab.load_to_dask()
        
        # should use dask
        if not data2Tab.is_loaded:
            data2Tab.load_to_dask()

        if not data1Pipe.is_loaded:
            data1Pipe.load_to_dask()
        
        # should use dask
        if not data2Pipe.is_loaded:
            data2Pipe.load_to_dask()

        # should use dask
        self.assertTrue(isinstance(data1Tab.data, dd.DataFrame))
        self.assertTrue(isinstance(data2Tab.data, dd.DataFrame))
        self.assertTrue(isinstance(data1Pipe.data, dd.DataFrame))
        self.assertTrue(isinstance(data2Pipe.data, dd.DataFrame))

        # Test if default options read in a text file as one column data        
        self.assertEqual(data1Tab.shape, (374, 27))
        self.assertEqual(data2Tab.shape, (377, 1)) #should have 1 column when options/delim not specified
        self.assertEqual(data1Pipe.shape, (374, 27))
        self.assertEqual(data2Pipe.shape, (377, 1)) #should have 1 column when options/delim not specified

    def test_init_with_txt_tab_linedelim(self):
        """ Test constructor setup with tab separated columns 
            and ! as a line deliminater instead of \n
        """        
        filepath = parentdir + '/data/test_data_txt/sp500_data_file_info_tab_linedelim.txt'

        options = {
            'encoding': 'utf_8',
            'delim': "\t",
            'lineDelim': "!",    
            'headerRow': 3,        
            'startLine': 0,   
            'escapechar': '',
            'comment': '',
            'decimal': ".", 
            'thousands': "",
            'skipEmpty': False,
            'naOptions': [],
        }

        data = Data(filepath, options=options)

        # filters_applied should be excluded
        self.assertFalse("filters_applied" in data.columns)

        # should use dask
        if not data.is_loaded:
            data.load_to_dask()

        self.assertTrue(isinstance(data.data, dd.DataFrame))

        # Test if default options read in a text file as one column data        
        self.assertEqual(data.shape, (374, 27))

    def test_init_with_txt_tab_thous(self):
        """ Test constructor setup with tab separated with
            , as thousand separator 
            # as comment char
            & as escape char
        """        
        filepathT = parentdir + '/data/test_data_txt/sp500_data_file_info_thous.txt'
        filepathTC = parentdir + '/data/test_data_txt/sp500_data_file_info_thous_comment.txt'
        filepathTCE = parentdir + '/data/test_data_txt/sp500_data_file_info_thous_comment_escape.txt'

        optionsT = {
            'encoding': 'utf_8',
            'delim': "\t",
            'lineDelim': "",    
            'headerRow': 3,        
            'startLine': 0,   
            'escapechar': '',
            'comment': '',
            'decimal': ".", 
            'thousands': ",",
            'skipEmpty': False,
            'naOptions': [],
        }

        optionsTC = {
            'encoding': 'utf_8',
            'delim': "\t",
            'lineDelim': "",    
            'headerRow': 3,        
            'startLine': 0,   
            'escapechar': '',
            'comment': '#',
            'decimal': ".", 
            'thousands': ",",
            'skipEmpty': False,
            'naOptions': [],
        }

        optionsTCE = {
            'encoding': 'utf_8',
            'delim': "\t",
            'lineDelim': "",    
            'headerRow': 3,        
            'startLine': 0,   
            'escapechar': '&',
            'comment': '#',
            'decimal': ".", 
            'thousands': ",",
            'skipEmpty': False,
            'naOptions': [],
        }

        dataT = Data(filepathT, options=optionsT)
        dataTC = Data(filepathTC, options=optionsTC)
        dataTC_err = Data(filepathTC, options=optionsT) # load without removing comments
        dataTCE = Data(filepathTCE, options=optionsTCE)
        dataTCE_err = Data(filepathTCE, options=optionsT) # load without removing comments and escape

        # filters_applied should be excluded
        self.assertFalse("filters_applied" in dataT.columns)
        self.assertFalse("filters_applied" in dataTC.columns)
        self.assertFalse("filters_applied" in dataTC_err.columns)
        self.assertFalse("filters_applied" in dataTCE.columns)
        self.assertFalse("filters_applied" in dataTCE_err.columns)

        # should use dask
        if not dataT.is_loaded:
            dataT.load_to_dask()
        if not dataTC.is_loaded:
            dataTC.load_to_dask()
        if not dataTC_err.is_loaded:
            dataTC_err.load_to_dask()
        if not dataTCE.is_loaded:
            dataTCE.load_to_dask()
        if not dataTCE_err.is_loaded:
            dataTCE_err.load_to_dask()

        self.assertTrue(isinstance(dataT.data, dd.DataFrame))
        self.assertTrue(isinstance(dataTC.data, dd.DataFrame))
        self.assertTrue(isinstance(dataTC_err.data, dd.DataFrame))
        self.assertTrue(isinstance(dataTCE.data, dd.DataFrame))
        self.assertTrue(isinstance(dataTCE_err.data, dd.DataFrame))

        # Test if default options read in a text file as one column data        
        self.assertEqual(dataT.shape, (374, 27))
        self.assertEqual(dataTC.shape, (374, 27))
        self.assertEqual(dataTCE.shape, (374, 27))        
        
        # Confirm comment removed
        self.assertTrue("p/cf" in dataTC.columns )
        self.assertTrue("p/cf#comment" in dataTC_err.columns )
        self.assertTrue("p/cf" in dataTC.columns )
        self.assertTrue("p/cf#comment" in dataTCE_err.columns )
        
        typesTC = dataTC.types
        typesTC_err = dataTC_err.types
        typesTCE = dataTCE.types
        typesTCE_err = dataTCE_err.types

        self.assertTrue(typesTC["p/cf"] ==  'Numerical')
        self.assertTrue(typesTC_err["p/cf#comment"] ==  'Nominal')
        self.assertTrue(typesTCE["p/cf"] ==  'Numerical')
        self.assertTrue(typesTCE_err["p/cf#comment"] ==  'Nominal')


        # Ensure escape removed
        self.assertTrue("asset_turnover" in dataTCE.columns)
        self.assertTrue("asset_turnover" not in dataTCE_err.columns)

    def test_init_with_txt_thous_dec(self):
        """ Test constructor setup with tab separated with
            "," as decimal separator and "." as thousands separator
            "," as decimal separator and " " as thousands separator
        """        
        filepath1 = parentdir + '/data/test_data_txt/sp500_data_file_info_dec_thous.txt' # decimal: "," thousands: "."
        filepath2 = parentdir + '/data/test_data_txt/sp500_data_file_info_dec_thous_space.txt' # decimal: "," thousands: " "
        
        options1 = {
            'encoding': 'utf_8',
            'delim': "\t",
            'lineDelim': "",    
            'headerRow': 3,        
            'startLine': 0,   
            'escapechar': '',
            'comment': '',
            'decimal': ",", 
            'thousands': ".",
            'skipEmpty': False,
            'naOptions': [],
        }

        options2 = {
            'encoding': 'utf_8',
            'delim': "\t",
            'lineDelim': "",    
            'headerRow': 3,        
            'startLine': 0,   
            'escapechar': '',
            'comment': '',
            'decimal': ",", 
            'thousands': " ",
            'skipEmpty': False,
            'naOptions': [],
        }
        
        data1 = Data(filepath1, options=options1)        
        data2 = Data(filepath2, options=options2)
        

        # filters_applied should be excluded
        self.assertFalse("filters_applied" in data1.columns)        
        self.assertFalse("filters_applied" in data1.columns)        

        # should use dask
        if not data1.is_loaded:
            data1.load_to_dask()        
        if not data2.is_loaded:
            data2.load_to_dask()        

        # should use dask
        self.assertTrue(isinstance(data1.data, dd.DataFrame))        
        self.assertTrue(isinstance(data2.data, dd.DataFrame))

        # Test if options read in a text file with correct columns and rows      
        self.assertEqual(data1.shape, (374, 27))        
        self.assertEqual(data2.shape, (374, 27))
        
        # Decimal and thousand separators are working
        self.assertTrue("on,bal,vol" in data1.columns )        
        self.assertTrue("liquidity" in data1.columns )        
        self.assertTrue("on,bal,vol" in data2.columns )
        self.assertTrue("liquidity" in data2.columns )

        types1 = data1.types
        types2 = data2.types

        self.assertTrue(types1["on,bal,vol"] ==  'Numerical')
        self.assertTrue(types1["liquidity"] ==  'Numerical')
        self.assertTrue(types2["on,bal,vol"] ==  'Numerical')
        self.assertTrue(types2["liquidity"] ==  'Numerical')

    def test_init_with_txt_and_multi_options(self):
        """ Test constructor setup with tab separated txt 
            with multiple text formatting options            
        """ 
        filepath = parentdir + '/data/test_data_txt/sp500_data_test_multi.txt'

        options ={
            'encoding': 'utf_8',
            'delim': "\t",
            'lineDelim': "!",    
            'headerRow': 1,        
            'startLine': 2,   
            'escapechar': '&',
            'comment': '#',
            'decimal': "_", 
            'thousands': "-",
            'skipEmpty': False,
            'naOptions': [{'label': 'GS', 'value': 'GS'}],
        }       

        data = Data(filepath, options=options)

        # filters_applied should be excluded
        self.assertFalse("filters_applied" in data.columns)
        
        # should use dask
        if not data.is_loaded:
            data.load_to_dask()
        
        self.assertTrue(isinstance(data.data, dd.DataFrame))

        # Test if user options read in a text file with 4 colums,
        # incudes a blank line, removes comments, and skips the first 2 lines
        
        # Ensure delim, lineDelim, startLine, headerRow, skipEmpty
        self.assertEqual(data.shape, (8, 4)) 
        
        # Confirm Header and escape char skipped
        self.assertTrue("Information Technology" in data.columns )

        # Ensure comments removed
        self.assertTrue("Financials" in data.value_counts("Information Technology")[1] )
        
        # Ensure first line skipped
        self.assertTrue("Consumer Staples" not in data.value_counts("Information Technology")[1] )
        
        types = data.types       
        types_est = data.estimate_types()

        # Ensure _ detected as decimal place
        self.assertTrue(types["1_701507493"] ==  'Numerical')
        self.assertEqual(types_est.loc["1_701507493"],  'Numerical')
        
        desc1 = data.describe_col("1_701507493")        
        self.assertAlmostEqual(desc1['max'], 1.000243, places=3)
        
        # Ensure - detected as thousands separator
        self.assertTrue(types["1-616069343"] ==  'Numerical')
        self.assertEqual(types_est.loc["1-616069343"], 'Numerical')
        desc2 = data.describe_col("1-616069343")
        self.assertAlmostEqual(desc2['max'], 2740663119, places=0)

        # Ensure GS detected as NaN
        self.assertEqual(data.count_na('JBHT'), 2)

    def test_describe_empty(self):
        """ Test calling describe on an empty dataframe """
        filepath = 'test_data/test_data.csv'
        data = Data(filepath)

        col1_min = data['col-1'].min().compute()

        # dataset should be empty
        data.apply_filter('col-1', ub=col1_min-1)
        self.assertEqual(data.get_counts()['filtered'], 0)

        # This should not raise an error
        data.describe()
        
        
    def test_apply_filter(self):
        """ Test applying a filter to the dataset. """
        filepath = 'test_data/test_data.csv'
        data = Data(filepath)
                
        data.apply_filter('col-1', 0, inc=1)
        data.apply_filter('col-2', ub=0, inc=1)
        
        self.assertGreaterEqual(data.filter_data['col-1'].min().compute(), 0)
        self.assertLess(data.data['col-1'].min().compute(), 0)
        
        self.assertLessEqual(data.filter_data['col-2'].max().compute(), 0)
        self.assertGreater(data.data['col-2'].max().compute(), 0)


    def test_where(self):
        """ Test the where function in the data class. """
        filepath = 'test_data/test_data.csv'
        data = Data(filepath)
                
        p = {'col-0': {'in': ['a', 'c']}, 'col-1': {'lb': 0, 'ub': 1}}
        result = data.where(p)
        df = data.data.compute()

        self.assertTrue(df.loc[result, 'col-0'].isin(['a', 'c']).all())
        self.assertGreaterEqual(df.loc[result, 'col-1'].min(), 0)
        self.assertLessEqual(df.loc[result, 'col-1'].max(), 1)

        p = {'col-1': {'lb': -np.inf, 'ub': 0}}
        result = data.where(p)
        indicate = data.where(p, 1, 0)
        self.assertTrue((indicate.nonzero()[0] == result).all())

    def test_chi_square(self):
        """ Test chi square function. """
        filepath = 'test_data/test_data.csv'
        data = Data(filepath)
        
        data.apply_nominal_filter('col-0', ['a', 'c'], inc=1)
        self.assertLess(data.chi_square('col-96'), 0.05)
        
    def test_apply_nominal_filter(self):
        """ Test applying a nominal filter to the dataset. """
        filepath = 'test_data/test_data.csv'
        data = Data(filepath)
                
        data.apply_nominal_filter('col-0', ['a', 'c'], inc=1)
        uni = data.filter_data['col-0'].unique().compute()
        fulluni = data.data['col-0'].unique().compute()
        
        self.assertListEqual(uni.tolist(), ['a', 'c'])
        self.assertListEqual(fulluni.tolist(), ['a', 'b', 'c', 'd'])

        # test exclusion
        data.reset_data()
        
        data.apply_nominal_filter('col-0', ['a', 'c'], ftype='Exclude', inc=1)
        uni = data.filter_data['col-0'].unique().compute()
        fulluni = data.data['col-0'].unique().compute()
        
        self.assertListEqual(uni.tolist(), ['b', 'd'])
        self.assertListEqual(fulluni.tolist(), ['a', 'b', 'c', 'd'])

    def test_apply_merge_single_col(self):
        """ Test applying merge.  """
        np.random.seed(0)
        leftX = np.random.normal(size=(1000,3))
        rightX = np.random.normal(size=(1000,3))

        leftX[:, 0] = range(1000)
        rightX[:, 0] = range(1, 1001)
        
        left_pdf = pd.DataFrame(leftX, columns=['a', 'b', 'c'])
        right_pdf = pd.DataFrame(rightX, columns=['a1', 'b1', 'c1'])      

        left_fname = "test_data/test_left.csv"
        right_fname = "test_data/test_right.csv"
        
        left_pdf.to_csv(left_fname, index=False)
        right_pdf.to_csv(right_fname, index=False)
        
        left_df = Data(left_fname)
        right_df = Data(right_fname)

        how = 'inner'
        left_on ='a'
        right_on ='a1'
        inner_jdf = Data.apply_merge(left_df, right_df,
                                     left_on=left_on,
                                     right_on=right_on,
                                     how=how);

        how = 'outer'
        outer_jdf = Data.apply_merge(left_df, right_df,
                                     left_on=left_on,
                                     right_on=right_on,
                                     how=how);

        how = 'left'
        left_jdf = Data.apply_merge(left_df, right_df,
                                    left_on=left_on,
                                    right_on=right_on,
                                    how=how);

        how = 'right'
        right_jdf = Data.apply_merge(left_df, right_df,
                                     left_on=left_on,
                                     right_on=right_on,
                                     how=how);
        
        self.assertEqual(inner_jdf.shape[0], 999)
        self.assertFalse(inner_jdf['b1'].isnull().any().compute())
        self.assertFalse(inner_jdf['b'].isnull().any().compute())
        
        self.assertEqual(outer_jdf.shape[0], 1001)
        self.assertTrue(outer_jdf['b1'].isnull().any().compute())
        self.assertTrue(outer_jdf['b'].isnull().any().compute())

        self.assertEqual(left_jdf.shape[0], 1000)
        self.assertTrue(left_jdf['b1'].isnull().any().compute())
        self.assertFalse(left_jdf['b'].isnull().any().compute())

        self.assertEqual(right_jdf.shape[0], 1000)
        self.assertFalse(right_jdf['b1'].isnull().any().compute())
        self.assertTrue(right_jdf['b'].isnull().any().compute())

    def test_apply_multi_merge_single_col(self):
        """ Test applying multi merge.  """
        np.random.seed(0)
        AX = np.random.normal(size=(1000,3))
        BX = np.random.normal(size=(1000,3))
        CX = np.random.normal(size=(1000,3))

        AX[:, 0] = range(1000)
        BX[:, 0] = range(1, 1001)
        CX[:, 0] = range(2, 1002)
        
        A_pdf = pd.DataFrame(AX, columns=['a', 'b', 'c'])
        B_pdf = pd.DataFrame(BX, columns=['a1', 'b1', 'c1'])
        C_pdf = pd.DataFrame(CX, columns=['a2', 'b1', 'c2'])      
        
        
        A_fname = "test_data/test_one.csv"
        B_fname = "test_data/test_two.csv"
        C_fname = "test_data/test_three.csv"
        
        A_pdf.to_csv(A_fname, index=False)
        B_pdf.to_csv(B_fname, index=False)
        C_pdf.to_csv(C_fname, index=False)
        
        A_df = Data(A_fname)
        B_df = Data(B_fname)
        C_df = Data(C_fname)
        
        how = 'inner'
        A_on ='a'
        B_on ='a1'
        C_on = 'a2'
        inner_jdf = Data.apply_multi_merge([A_df, B_df, C_df],
                                           on=[[A_on], [B_on], [C_on]],
                                           how=how, suffix=['_x', '_y', '_z']);

        how = 'outer'
        outer_jdf = Data.apply_multi_merge([A_df, B_df, C_df],
                                           on=[[A_on], [B_on], [C_on]],
                                           how=how, suffix=['_x', '_y', '_z']);

        self.assertEqual(inner_jdf.shape[0], 998)
        self.assertFalse(inner_jdf['b1_y'].isnull().any().compute())
        self.assertFalse(inner_jdf['b1_z'].isnull().any().compute())
        self.assertFalse(inner_jdf['b'].isnull().any().compute())
        
        self.assertEqual(outer_jdf.shape[0], 1002)
        self.assertTrue(outer_jdf['b1_y'].isnull().any().compute())
        self.assertTrue(outer_jdf['b1_z'].isnull().any().compute())
        self.assertTrue(outer_jdf['b'].isnull().any().compute())


    def test_apply_multi_merge_multi_col(self):
        """ Test applying multi merge.  """
        np.random.seed(0)
        AX = np.random.normal(size=(1000,4))
        BX = np.random.normal(size=(1000,4))
        CX = np.random.normal(size=(1000,4))

        AX[:, 0] = range(1000)
        BX[:, 0] = range(1, 1001)
        CX[:, 0] = range(2, 1002)

        AX[:, 1] = range(1000)
        BX[:, 1] = range(1, 1001)
        CX[:, 1] = range(2, 1002)
        
        A_pdf = pd.DataFrame(AX, columns=['a', 'b', 'c', 'd'])
        B_pdf = pd.DataFrame(BX, columns=['a1', 'b1', 'c1', 'd'])
        C_pdf = pd.DataFrame(CX, columns=['a2', 'b1', 'c2', 'd'])      
        
        
        A_fname = "test_data/test_one.csv"
        B_fname = "test_data/test_two.csv"
        C_fname = "test_data/test_three.csv"
        
        A_pdf.to_csv(A_fname, index=False)
        B_pdf.to_csv(B_fname, index=False)
        C_pdf.to_csv(C_fname, index=False)
        
        A_df = Data(A_fname)
        B_df = Data(B_fname)
        C_df = Data(C_fname)

        how = 'inner'
        A_on =['a', 'b']
        B_on =['a1', 'b1']
        C_on = ['a2', 'b1']
        inner_jdf = Data.apply_multi_merge([A_df, B_df, C_df],
                                           on=[A_on, B_on, C_on],
                                           how=how, suffix=['_x', '_y', '_z']);

        how = 'outer'
        outer_jdf = Data.apply_multi_merge([A_df, B_df, C_df],
                                           on=[A_on, B_on, C_on],
                                           how=how, suffix=['_x', '_y', '_z']);

        self.assertEqual(inner_jdf.shape[0], 998)
        self.assertFalse(inner_jdf['b1'].isnull().any().compute())
        self.assertFalse(inner_jdf['b'].isnull().any().compute())
        
        self.assertEqual(outer_jdf.shape[0], 1002)
        self.assertTrue(outer_jdf['b1'].isnull().any().compute())
        self.assertTrue(outer_jdf['b'].isnull().any().compute())
        
    
    def test_apply_merge_multi_col(self):
        """ Test applying merge on multiple columns. """
        np.random.seed(0)
        leftX = np.random.normal(size=(1000,3))
        rightX = np.random.normal(size=(1000,3))

        leftX[:, 0] = range(1000)
        rightX[:, 0] = range(1, 1001)

        leftX[:, 1] = range(1000)
        rightX[:, 1] = range(1, 1001)

        leftX[4, 1] = -1
        
        left_pdf = pd.DataFrame(leftX, columns=['a', 'b', 'c'])
        right_pdf = pd.DataFrame(rightX, columns=['a1', 'b1', 'c1'])      

        left_fname = "test_data/test_left.csv"
        right_fname = "test_data/test_right.csv"
        
        left_pdf.to_csv(left_fname, index=False)
        right_pdf.to_csv(right_fname, index=False)
        
        left_df = Data(left_fname)
        right_df = Data(right_fname)

        how = 'inner'
        left_on =['a', 'b']
        right_on =['a1', 'b1']
        inner_jdf = Data.apply_merge(left_df, right_df,
                                     left_on=left_on,
                                     right_on=right_on,
                                     how=how);

        how = 'outer'
        outer_jdf = Data.apply_merge(left_df, right_df,
                                     left_on=left_on,
                                     right_on=right_on,
                                     how=how);

        how = 'left'
        left_jdf = Data.apply_merge(left_df, right_df,
                                    left_on=left_on,
                                    right_on=right_on,
                                    how=how);

        how = 'right'
        right_jdf = Data.apply_merge(left_df, right_df,
                                     left_on=left_on,
                                     right_on=right_on,
                                     how=how);

        self.assertEqual(inner_jdf.shape[0], 998)
        self.assertFalse(inner_jdf['b1'].isnull().any().compute())
        self.assertFalse(inner_jdf['b'].isnull().any().compute())
        
        self.assertEqual(outer_jdf.shape[0], 1002)
        self.assertTrue(outer_jdf['b1'].isnull().any().compute())
        self.assertTrue(outer_jdf['b'].isnull().any().compute())

        self.assertEqual(left_jdf.shape[0], 1000)
        self.assertTrue(left_jdf['b1'].isnull().any().compute())
        self.assertFalse(left_jdf['b'].isnull().any().compute())

        self.assertEqual(right_jdf.shape[0], 1000)
        self.assertFalse(right_jdf['b1'].isnull().any().compute())
        self.assertTrue(right_jdf['b'].isnull().any().compute())


    def test_apply_custom(self):
        """ Test applying a custom transformation. """
        filepath = parentdir+"/data/sp500_data.csv"
        
        data = Data(filepath)

        min_eps = data.data['eps'].min().compute()
        data.apply_custom('eps', 'eps + 100')
        
        self.assertEqual(data.data['eps'].min().compute(), min_eps + 100)

        
    def test_create_derived(self):
        """ Test creating a derived attribute. """
        filepath = parentdir+"/data/sp500_data.csv"

        data = Data(filepath)

        min_eps = data.data['eps'].min().compute()
        data.create_derived('eps_p_100', 'eps + 100')

        self.assertTrue('eps_p_100' in data.types)
        self.assertEqual(data.data['eps_p_100'].min().compute(), min_eps + 100)
        self.assertTrue('eps_p_100' in data.get_columns())

        expr = "(1 / price/book) * price"
        data.create_derived("book", expr)
        self.assertTrue('book' in data.get_columns())

    def test_get_sampled_data(self):
        """ Test get_sampled_data method. """
        filepath = parentdir+"/data/sp500_data.csv"

        data = Data(filepath, delay_load=True)
        data.drop_column('symbol')
        data.apply_filter('eps', lb=0)
        data.apply_rename('eps', 'eps2')
        
        sdf = data.get_sampled_data(nrows=100)
        self.assertGreaterEqual(sdf['eps2'].min(), 0)
        self.assertFalse('symbol' in sdf.columns)

        sdf = data.get_sampled_data(nrows=100)
        self.assertGreaterEqual(sdf['eps2'].min(), 0)
        
    def test_get_sampled_data_no_delay(self):
        """ Test get_sampled_data method. """
        filepath = parentdir+"/data/sp500_data.csv"

        data = Data(filepath, delay_load=False)
        data.drop_column('symbol')
        data.apply_filter('eps', lb=0)
        data.apply_rename('eps', 'eps2')
        
        sdf = data.get_sampled_data(nrows=100)
        self.assertGreaterEqual(sdf['eps2'].min(), 0)
        self.assertFalse('symbol' in sdf.columns)

        sdf = data.get_sampled_data(nrows=100)
        self.assertGreaterEqual(sdf['eps2'].min(), 0)
        
    def test_checkpoint(self):
        """ Test saving and resetting to a checkpoint. """
        filepath = 'test_data/test_data.csv'
        data = Data(filepath, delay_load=False)
        
        data.apply_filter('col-2', lb=0)        
        data.create_checkpoint()
        self.assertGreaterEqual(data.filter_data['col-2'].min().compute(), 0)

        self.assertFalse(data._is_transformed['col-2'])
        data.apply_clamp('col-2', 0.2, ub=np.inf)
        self.assertTrue(data._is_transformed['col-2'])
        
        data.apply_filter('col-2', lb=1)

        data.set_type('col-0', 'Ordinal', ['a', 'b', 'c', 'd'])
        data.set_ordering('col-0', ['d', 'c', 'b', 'a'])
        self.assertListEqual(data.orderings['col-0'], ['d', 'c', 'b', 'a'])        
        
        data.restore_checkpoint();
        self.assertLess(data.filter_data['col-2'].min().compute(), 1)
        self.assertFalse(data._is_transformed['col-2'])

        # ordering should be reset
        self.assertTrue(all(data.orderings[c] is None for c in data.columns))
        
        # test dropping
        data.drop_columns(['col-0', 'col-1'])
        self.assertFalse('col-0' in data.columns)
        self.assertFalse('col-1' in data.columns)

        data.restore_checkpoint()
        self.assertTrue('col-0' in data.columns)
        self.assertTrue('col-1' in data.columns)

    def test_checkpoint_delay_1(self):
        """ Test saving and resetting to a checkpoint. """
        filepath = 'test_data/test_data.csv'
        data = Data(filepath, delay_load=True)
        
        data.apply_filter('col-2', lb=0)
        data.create_checkpoint()

        self.assertFalse(data._is_transformed['col-2'])
        data.apply_clamp('col-2', 0.2, ub=np.inf)
        self.assertTrue(data._is_transformed['col-2'])

        data.apply_filter('col-2', lb=1)
        
        data.set_type('col-0', 'Ordinal', ['a', 'b', 'c', 'd'])
        data.set_ordering('col-0', ['d', 'c', 'b', 'a'])
        self.assertListEqual(data.orderings['col-0'], ['d', 'c', 'b', 'a'])
        
        data.restore_checkpoint();
        self.assertFalse(data._is_transformed['col-2'])

        # ordering should be reset
        self.assertTrue(all(data.orderings[c] is None for c in data.columns))
        
        # test dropping
        data.drop_columns(['col-0', 'col-1'])
        self.assertFalse('col-0' in data.columns)
        self.assertFalse('col-1' in data.columns)

        data.restore_checkpoint()
        self.assertTrue('col-0' in data.columns)
        self.assertTrue('col-1' in data.columns)

        # first filter should've been applied
        self.assertGreaterEqual(data['col-2'].min().compute(), 0)

        # second filter should've been removed
        self.assertLess(data['col-2'].min().compute(), 1)

        
    def test_checkpoint_delay_2(self):
        """ Test saving and resetting to a checkpoint. """
        filepath = 'test_data/test_data.csv'
        data = Data(filepath, delay_load=True)
        
        data.apply_filter('col-2', lb=0)
        self.assertFalse(data.is_loaded)
        data.create_checkpoint()

        self.assertFalse(data._is_transformed['col-2'])
        data.apply_clamp('col-2', 0.2, ub=np.inf)
        self.assertTrue(data._is_transformed['col-2'])
        
        # forces a call to load_to_dask
        self.assertGreaterEqual(data.filter_data['col-2'].min().compute(), 0)
        
        data.apply_filter('col-2', lb=1)
        data.restore_checkpoint();
        
        self.assertLess(data.filter_data['col-2'].min().compute(), 1)
        self.assertFalse(data._is_transformed['col-2'])

        data.set_type('col-0', 'Ordinal', ['a', 'b', 'c', 'd'])
        data.set_ordering('col-0', ['d', 'c', 'b', 'a'])
        self.assertListEqual(data.orderings['col-0'], ['d', 'c', 'b', 'a'])
        
        # test dropping
        data.drop_columns(['col-0', 'col-1'])
        self.assertFalse('col-0' in data.columns)
        self.assertFalse('col-1' in data.columns)

        data.restore_checkpoint()
        self.assertTrue('col-0' in data.columns)
        self.assertTrue('col-1' in data.columns)

        # ordering should be reset
        self.assertTrue(all(data.orderings[c] is None for c in data.columns))
        
        
    def test_reset_data(self):
        """ Test reset_data method """
        filepath = 'test_data/test_data.csv'
        data = Data(filepath, delay_load=False)
        
        data.apply_filter('col-1', 0)
        data.create_derived('derived', 'col-1 * 2')
        self.assertGreaterEqual(data.filter_data['col-1'].min().compute(), 0)
        self.assertTrue('derived' in data.types)        

        
        data.set_type('col-0', 'Ordinal', ['a', 'b', 'c', 'd'])
        data.set_ordering('col-0', ['d', 'c', 'b', 'a'])
        self.assertListEqual(data.orderings['col-0'], ['d', 'c', 'b', 'a'])
        
        data.reset_data()
        self.assertLess(data.filter_data['col-1'].min().compute(), 0)
        self.assertFalse('derived' in data.types)

        # ordering should be reset
        self.assertTrue(all(data.orderings[c] is None for c in data.columns))

        
    def test_reset_data_delay(self):
        """ Test reset_data method """
        filepath = 'test_data/test_data.csv'
        data = Data(filepath, delay_load=True)

        data.apply_filter('col-1', 0)
        data.create_derived('derived', 'col-1 * 2')
        self.assertTrue('derived' in data.types)
        data.reset_data()

        self.assertLess(data.filter_data['col-1'].min().compute(), 0)
        self.assertFalse('derived' in data.types)
        
    def test_reset_data_w_col(self):
        """ Test reset_data_w_col method """
        filepath = 'test_data/test_data.csv'
        data = Data(filepath)

        data.apply_normalize('col-1', 0, 1)
        data.create_derived('derived', 'col-1 * 2')
        data.create_derived('derived2', 'col-1 * 3')

        # col-1 should be between 0 and 1
        self.assertEqual(data.filter_data['col-1'].min().compute(), 0)
        self.assertEqual(data.data['derived'].min().compute(), 0)
        self.assertEqual(data.data['derived'].max().compute(), 2)
        self.assertEqual(data.data['derived2'].min().compute(), 0)
        self.assertEqual(data.data['derived2'].max().compute(), 3)

        data.reset_data_w_col([data['derived'], data['derived2']])

        self.assertLess(data.filter_data['col-1'].min().compute(), 0)
        self.assertEqual(data.data['derived'].min().compute(), 0)
        self.assertEqual(data.data['derived'].max().compute(), 2)
        self.assertEqual(data.data['derived2'].max().compute(), 3)

        self.assertTrue('derived' in data.types)
        self.assertTrue('derived2' in data.types)

        # col-1 should NOT be between 0 and 1
        self.assertLess(data.filter_data['col-1'].min().compute(), 0)

        
    def test_apply_log(self):
        """ Test apply log method. """
        filepath = 'test_data/test_data.csv'
        data = Data(filepath)

        cvec = data.data.partitions[0].compute()['col-1']        
        v1 = cvec[0]

        # Catch warnings related to taking the log of negative values
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            data.apply_log('col-1')

            col1 = data.data['col-1'].sample(frac=0.1).compute()
            # all infs should be replaced with nans
            self.assertFalse(np.isinf(col1).any())
        
            vlog = data.data.partitions[0].compute()['col-1'].iloc[0]
            if v1 <= 0:  # should be nan
                self.assertTrue(np.isnan(vlog))
            else:
                self.assertAlmostEqual(vlog, (np.log(v1) / np.log(10)), 3)


    def test_apply_clamp(self):
        """ Test applying the clamp method. """
        filepath = 'test_data/test_data.csv'
        data = Data(filepath)

        data.apply_clamp('col-1', 0, 1)
        fmin, fmax = dask.compute(data.data['col-1'].min(),
                                  data.data['col-1'].max())
        self.assertEqual(fmin, 0)
        self.assertEqual(fmax, 1)


    def test_apply_fill_missing_mean(self):
        """ Test data imputation method (Mean). """
        filepath = parentdir+"/data/sp500_data.csv"

        df = pd.read_csv(filepath)
        data = Data(filepath)
        data.apply_fill_missing("current_ratio", "Mean", None)

        miss_df = df["current_ratio"].fillna(df["current_ratio"].mean())
        miss_data = data.data['current_ratio'].compute()
        
        # assert list almost equal
        self.assertTrue(np.all((miss_data-miss_df).abs() < 1e-3))

        # all missing values are replaced
        self.assertFalse(data.data['current_ratio'].isna().any().compute())

    def test_apply_fill_missing_pad(self):
        """ Test data imputation method (pad). """
        filepath = parentdir+"/data/sp500_data.csv"

        df = pd.read_csv(filepath)
        data = Data(filepath)
        data.apply_fill_missing("current_ratio", "Pad", None)

        miss_df = df["current_ratio"].fillna(method='ffill').fillna(method='bfill')
        miss_data = data.data['current_ratio'].compute()
        
        # assert list almost equal
        self.assertTrue(np.all((miss_data-miss_df).abs() < 1e-3))

        # all missing values are replaced
        self.assertFalse(data.data['current_ratio'].isna().any().compute())

    def test_apply_fill_missing_zero(self):
        """ Test data imputation method (zero). """
        filepath = parentdir+"/data/sp500_data.csv"

        df = pd.read_csv(filepath)
        data = Data(filepath)
        data.apply_fill_missing("current_ratio", "Zero", None)

        miss_df = df["current_ratio"].fillna(0)
        miss_data = data.data['current_ratio'].compute()
        
        # assert list almost equal
        self.assertTrue(np.all((miss_data-miss_df).abs() < 1e-3))

        # all missing values are replaced
        self.assertFalse(data.data['current_ratio'].isna().any().compute())

    def test_apply_fill_missing_replace(self):
        """ Test data imputation method (Replace). """
        filepath = parentdir+"/data/stroke.csv"

        df = pd.read_csv(filepath)
        data = Data(filepath)        

        # check that col has missing value
        self.assertTrue(data.data['smoking_status'].isna().any().compute())
        
        data.apply_fill_missing("smoking_status", "Replace", "NA")

        miss_df = list(df["smoking_status"].fillna("NA"))
        miss_data = list(data.data['smoking_status'].compute())

        # assert list almost equal
        self.assertTrue(set(miss_df) == set(miss_data))
        
        # all missing values are replaced
        self.assertFalse(data.data['smoking_status'].isna().any().compute())
        self.assertTrue("NA" in list(data.data['smoking_status']))


    
    def test_apply_filter_w_nans(self):
        """ Test data filtering doesn't include nans. """
        filepath = parentdir+"/data/stroke.csv"

        df = pd.read_csv(filepath)
        data = Data(filepath)        

        # bmi contains missing values
        data.apply_filter('bmi', lb=58.4)
        
        data_filt_size = data.get_counts()['filtered']

        # this will exclude missing values
        df_filt_size = (df['bmi'] >= 58.4).sum()

        # check the sizes are the same
        self.assertEqual(data_filt_size, df_filt_size)

    def test_apply_filter_exclude(self):
        """ Test data filtering with the exclude filter  i.e. remove points """
        filepath = parentdir+"/data/stroke.csv"

        df = pd.read_csv(filepath)
        data = Data(filepath)        

        # bmi contains missing values
        data.apply_filter('bmi', lb=58.4, ftype='Exclude')
        
        data_filt_size = data.get_counts()['filtered']

        # count items outside filter and exclude missing values
        df_filt_size = df['bmi'].count() - (df['bmi'] >= 58.4).sum()

        # check the sizes are the same
        self.assertEqual(data_filt_size, df_filt_size)

        
    def test_apply_drop_missing(self):
        """ Test applying a dropping rows with missing values in a column in the dataset. """
        filepath = parentdir+"/data/sp500_data.csv"
        data = Data(filepath)
                
        data.apply_drop_na('current_ratio', inc=1)
        counts = data.get_counts()
        self.assertEqual(counts['filtered'], 317)
        self.assertFalse(data.has_na('current_ratio'))

        # test different column
        data.reset_data()
        
        data.apply_drop_na('operating_leverage', inc=1)
        counts = data.get_counts()
        self.assertEqual(counts['filtered'], 283)
        self.assertFalse(data.has_na('operating_leverage'))

    def test_apply_normalize(self):
        """ Test data imputation method (zero). """
        filepath = parentdir+"/data/sp500_data.csv"
        data = Data(filepath)

        data.apply_normalize("current_ratio", 0, 1)
        self.assertEqual(data.data['current_ratio'].min().compute(), 0)
        self.assertEqual(data.data['current_ratio'].max().compute(), 1)        

        data.reset_data()
    
        data.apply_normalize("current_ratio", -10, 20)
        self.assertEqual(data.data['current_ratio'].min().compute(), -10)
        self.assertEqual(data.data['current_ratio'].max().compute(), 20)        

        data.reset_data()
        
        data.apply_filter("current_ratio", 1)
        data.apply_normalize("current_ratio", 0, 1)

        self.assertEqual(data.filter_data['current_ratio'].min().compute(), 0)
        self.assertEqual(data.filter_data['current_ratio'].max().compute(), 1)        


    def test_apply_replace(self):
        filepath = parentdir+"/data/sp500_data.csv"
        data = Data(filepath)

        df = pd.read_csv(filepath)

        rep_df = list(df['sector'].replace({"Utilities": "OtherCat", "Materials": "OtherCat"}))
        data.apply_replace('sector', ["Utilities", "Materials"], "OtherCat")
        self.assertListEqual(list(data.data['sector'].compute()), rep_df)

        
    def test_apply_replace_str_int(self):
        """ Apply replace when converting to nominal and replacing 
        number vals with strings.
        """
        filepath = parentdir+"/data/stroke.csv"
        data = Data(filepath)

        df = pd.read_csv(filepath)

        rep_df = df['hypertension'].replace({0.0: "No", '1': "Yes"})
        data.set_type('hypertension', 'Nominal')
        data.apply_replace('hypertension', ["0"], "No")
        data.apply_replace('hypertension', ["1"], "Yes")

        # Sample from file
        sample_file_vals = data.sample(100)['hypertension'].unique().tolist()

        data_vals = data['hypertension'].unique().compute().tolist()

        # sample from dask
        sample_dask_vals = data.sample(100)['hypertension'].unique().tolist()

        self.assertListEqual(sorted(sample_file_vals), ['No', 'Yes'])
        self.assertListEqual(sorted(data_vals), ['No', 'Yes'])
        self.assertListEqual(sorted(sample_dask_vals), ['No', 'Yes'])

    def test_apply_cell_split_ordered(self):
        """ Test apply_cell_split method. """
        filepath = parentdir+"/data/final_track_data.csv"
        data = Data(filepath, options={'encoding': 'utf-8'})

        data.apply_cell_split('artist_genre', ',', strip="'", quote="'")
        self.assertTrue('artist_genre_pos_0' in data.data.columns)
        self.assertTrue('artist_genre_pos_1' in data.columns)
        self.assertTrue('artist_genre_pos_2' in data.columns)
        self.assertTrue('artist_genre_pos_3' in data.columns)

        
    def test_apply_cell_split_unordered(self):
        """ Test apply_cell_split method. """
        filepath = parentdir+"/data/final_track_data.csv"
        data = Data(filepath, options={'encoding': 'utf-8'})

        data.apply_cell_split('artist_genre', ',', ordered=False, strip="[]", quote="'")
        
        self.assertTrue('artist_genre_dance pop' in data.data.columns)
        self.assertTrue('artist_genre_pop' in data.columns)
        self.assertTrue('artist_genre_zolo' in data.columns)

        self.assertEqual(data['artist_genre_pop'].min().compute(), 0)
        self.assertEqual(data['artist_genre_pop'].max().compute(), 1)

        self.assertEqual(data['artist_genre_zolo'].min().compute(), 0)
        self.assertEqual(data['artist_genre_zolo'].max().compute(), 1)
        
    def test_apply_onehot(self):
        """ Test apply_onehot method. """
        filepath = 'test_data/test_data.csv'
        data = Data(filepath)

        N, M = data.shape
        data.apply_onehot('col-0')

        self.assertEqual(data.data['col-0_a'].sum().compute(), N/4)
        self.assertEqual(data.data['col-0_b'].sum().compute(), N/4)
        self.assertEqual(data.data['col-0_c'].sum().compute(), N/4)
        self.assertEqual(data.data['col-0_d'].sum().compute(), N/4)

        self.assertEqual(data.shape[1], M+4)
        
        self.assertTrue('col-0_a' in data.columns)
        self.assertTrue('col-0_b' in data.columns)
        self.assertTrue('col-0_c' in data.columns)
        self.assertTrue('col-0_d' in data.columns)

        # test the column names are updated appropriatly
        data.apply_onehot('col-0')  
        self.assertTrue('col-0_a_(1)' in data.columns)
        self.assertTrue('col-0_b_(1)' in data.columns)
        self.assertTrue('col-0_c_(1)' in data.columns)
        self.assertTrue('col-0_d_(1)' in data.columns)

        self.assertTrue('col-0_a' in data.types)
        self.assertTrue('col-0_b' in data.types)
        self.assertTrue('col-0_c' in data.types)
        self.assertTrue('col-0_d' in data.types)

        self.assertTrue('col-0_a' in data._orderings)
        self.assertTrue('col-0_b' in data._orderings)
        self.assertTrue('col-0_c' in data._orderings)
        self.assertTrue('col-0_d' in data._orderings)

        
        
    def test_apply_onehot_bind(self):
        """ Test apply_onehot method with bound column. """
        filepath = 'test_data/test_data.csv'
        data = Data(filepath)

        N, M = data.shape
        data.apply_onehot('col-0', bind='col-1')
        
        c1a = data.data.loc[data['col-0']=='a', 'col-1'].sum().compute()
        c1b = data.data.loc[data['col-0']=='b', 'col-1'].sum().compute()
        c1c = data.data.loc[data['col-0']=='c', 'col-1'].sum().compute()
        c1d = data.data.loc[data['col-0']=='d', 'col-1'].sum().compute()
        
        self.assertAlmostEqual(data.data['col-0_a_col-1'].sum().compute(), c1a)
        self.assertAlmostEqual(data.data['col-0_b_col-1'].sum().compute(), c1b)
        self.assertAlmostEqual(data.data['col-0_c_col-1'].sum().compute(), c1c)
        self.assertAlmostEqual(data.data['col-0_d_col-1'].sum().compute(), c1d)

        self.assertEqual(data.shape[1], M+4)
        self.assertEqual(data.types['col-0_a_col-1'], 'Numerical')
        self.assertEqual(data.types['col-0_b_col-1'], 'Numerical')
        self.assertEqual(data.types['col-0_c_col-1'], 'Numerical')
        self.assertEqual(data.types['col-0_d_col-1'], 'Numerical')
        
        # test the column names are updated appropriatly
        data.apply_onehot('col-0', bind='col-1')  
        self.assertTrue('col-0_a_col-1_(1)' in data.columns)
        self.assertTrue('col-0_b_col-1_(1)' in data.columns)
        self.assertTrue('col-0_c_col-1_(1)' in data.columns)
        self.assertTrue('col-0_d_col-1_(1)' in data.columns)
        
        self.assertTrue('col-0_a_col-1_(1)' in data._orderings)
        self.assertTrue('col-0_b_col-1_(1)' in data._orderings)
        self.assertTrue('col-0_c_col-1_(1)' in data._orderings)
        self.assertTrue('col-0_d_col-1_(1)' in data._orderings)
        

    def test_aggregate_by_index(self):
        """ Test aggregate_by_index method. """
        filepath = 'test_data/test_data.csv'
        data = Data(filepath)
        data.apply_filter('col-1', lb=1)
        
        index_col = 'col-0'
        agg_map = [
            {
                'aggFunc': {'value': "mean", 'label': "Mean", 'type': "Numerical"},
                'attrs': [ {'value': c, 'label': c, 'type': "Numerical"} for c in data.columns
                           if c != index_col and c not in ['col-2',
                                                           'col-96',
                                                           'col-97',
                                                           'col-98',
                                                           'col-99'] ]
            },
            {
                'aggFunc': {'value': "max_count", 'label': "Most Frequent", 'type': "Nominal"},
                'attrs': [{'value': "col-99", 'label': "col-99", 'type': "Nominal"}]
            },
            {
                'aggFunc': {'value': "ohe", 'label': "One-hot encoding", 'type': "Nominal"},
                'attrs': [{'value': "col-96", 'label': "col-96", 'type': "Nominal"}],
                'bind': [
                    {
                        'attr': { 'label': "None", 'value': "None", 'type': "Numerical" },
                        'func': { 'value': "max", 'label': "Max"}
                    },
                    {
                        'attr': { 'label': "col-2", 'value': "col-2", 'type': "Numerical" },
                        'func': { 'value': "mean", 'label': "Mean"}
                    }
                ]
            },
            {
                'aggFunc': {'value': "ohe", 'label': "One-hot encoding", 'type': "Nominal"},
                'attrs': [{'value': "col-97", 'label': "col-97", 'type': "Nominal"}],
                'bind': [
                    {
                        'attr': { 'label': "col-2", 'value': "col-2", 'type': "Numerical" },
                        'func': { 'value': "mean", 'label': "Mean"}
                    },
                    {
                        'attr': { 'label': "col-99", 'value': "col-99", 'type': "Nominal" },
                        'func': { 'value': "max_count", 'label': "Most Frequent"}
                    }
                ]
            }
        ]
        

        result = data.aggregate_by_index(index_col, agg_map)
        self.assertTrue('col-2' in data.columns)
        self.assertFalse('col-2' in result.columns)
        self.assertTrue('col-1_mean' in result.columns)
        
        self.assertTrue(index_col in result.filter_data.columns)
        
        self.assertGreater(result['col-1_mean'].min().compute(), 1)
        
        # ohe columns should be in result
        self.assertTrue('col-96_e_max' in result.columns)
        self.assertTrue('col-96_f_max' in result.columns)
        self.assertTrue('col-96_e_col-2_mean' in result.columns)
        self.assertTrue('col-96_f_col-2_mean' in result.columns)
        self.assertTrue('col-97_e_col-2_mean' in result.columns)
        self.assertTrue('col-97_f_col-2_mean' in result.columns)
        self.assertTrue('col-97_e_col-99_max_count' in result.columns)
        self.assertTrue('col-97_f_col-99_max_count' in result.columns)
        self.assertTrue('col-99_max_count' in result.columns)

        for c in data.columns:
            if c != index_col and c not in ['col-2', 'col-96', 'col-97', 'col-98', 'col-99']:
                self.assertTrue(c+'_mean' in result.columns)

        mode_list = result['col-97_e_col-99_max_count'].compute().tolist()
        self.assertTrue(np.isnan(mode_list[-1]))        
        self.assertListEqual(mode_list[:-1], ['x', 'y', 'y'])
        
        # ohe columns should not be in data
        self.assertFalse('col-96_e_max' in data.columns)
        self.assertFalse('col-96_f_max' in data.columns)
        self.assertFalse('col-96_e_col-2_mean' in data.columns)
        self.assertFalse('col-96_f_col-2_mean' in data.columns)
        self.assertFalse('col-97_e_col-2_mean' in data.columns)
        self.assertFalse('col-97_f_col-2_mean' in data.columns)
        self.assertFalse('col-97_e_col-99_max_count' in data.columns)
        self.assertFalse('col-97_f_col-99_max_count' in data.columns)
        self.assertFalse('col-99_max_count' in data.columns)
        
        for c in data.columns:
            if c != index_col and c not in ['col-2', 'col-96', 'col-97', 'col-98', 'col-99']:
                self.assertFalse(c+'_mean' in data.columns)

        self.assertEqual(data.shape[0], 1000)
        self.assertEqual(result.shape[0], 4)


    def test_split_data(self):
        """ Test split_data method. """
        filepath = parentdir+"/data/sp500_data.csv"
        data = Data(filepath)

        sizeType = "Absolute Count"
        sizeValue = 30
        method = "InOrder"
        
        result1, result2 = data.split_data(sizeType, sizeValue, method)
       
        self.assertEqual(data.shape[1], result1.shape[1])    
        self.assertEqual(data.shape[1], result2.shape[1])
        self.assertEqual(data.shape[0], 374)        
        self.assertEqual(result1.shape[0], 30)
        self.assertEqual(result2.shape[0], 344)

        sizeType = "Percentage"
        sizeValue = 30
        method = "Random"
        
        result3, result4 = data.split_data(sizeType, sizeValue, method)

        self.assertEqual(data.shape[1], result1.shape[1])    
        self.assertEqual(data.shape[1], result2.shape[1])
        self.assertEqual(data.shape[0], 374)   
        self.assertLessEqual(result1.shape[0], 160) # random split gives approximately 112 rows here and the remainder below
        self.assertGreaterEqual(result2.shape[0], 200)

    def test_aggregate_by_index_nom_only(self):
        """ Test aggregate_by_index method. """
        filepath = 'test_data/test_data.csv'
        data = Data(filepath)
        data.apply_filter('col-1', lb=1)

        index_col = 'col-0'
        agg_type = [{
            'aggFunc': {'value': "max_count", 'label': "Most Frequent", 'type': "Nominal"},
            'attrs': [{'value': "col-99", 'label': "col-99", 'type': "Nominal"}]
        }]

        result = data.aggregate_by_index(index_col, agg_type)
        self.assertGreater(result.data.shape[0].compute(), 0)

    def test_aggregate_by_index_num_only(self):
        """ Test aggregate_by_index method. """
        filepath = 'test_data/test_data.csv'
        data = Data(filepath)
        data.apply_filter('col-1', lb=1)

        index_col = 'col-0'
        agg_type = [{
            'aggFunc': {'value': "mean", 'label': "Mean", 'type': "Numerical"},
            'attrs': [
                {'value': c, 'label': c, 'type': "Numerical"} for c in data.columns \
                if c != index_col and data.types[c] == 'Numerical'
            ]
        }]
        
        result = data.aggregate_by_index(index_col, agg_type)
        self.assertGreater(result.data.shape[0].compute(), 0)
        
    def test_apply_rank(self):
        """ Test apply_rank method. """
        filepath = 'test_data/test_data.csv'
        data = Data(filepath)

        N, M = data.shape
        data.apply_rank('col-0', 'col-24', 2)
        
        self.assertEqual(data.shape[1], M+1)
        
        self.assertTrue('col-0_rank2_col-24' in data.columns)
        self.assertEqual((data['col-0_rank2_col-24']=='rank_0').sum().compute(), N/2)
        self.assertEqual((data['col-0_rank2_col-24']=='rank_1').sum().compute(), N/2)

        data.apply_rank('col-0', 'col-24', 2)
        self.assertTrue('col-0_rank2_col-24_(1)' in data.columns)                

        # test supplying a name for the created attribute
        data.apply_rank('col-0', 'col-24', 2, 'asdf')
        self.assertTrue('asdf' in data.columns)                
        self.assertFalse('col-0_rank2_col-24_(2)' in data.columns)                

    def test_apply_rank_rename(self):
        """ Test apply_rank method. """
        filepath = 'test_data/test_data.csv'
        data = Data(filepath)

        N, M = data.shape
        data.apply_rank('col-0', 'col-24', 2)
        
        self.assertEqual(data.shape[1], M+1)
        
        self.assertTrue('col-0_rank2_col-24' in data.columns)
        self.assertEqual((data['col-0_rank2_col-24']=='rank_0').sum().compute(), N/2)
        self.assertEqual((data['col-0_rank2_col-24']=='rank_1').sum().compute(), N/2)

        data.apply_rename('col-0_rank2_col-24', 'newcol')
        self.assertFalse('col-0_rank2_col-24' in data.columns)
        self.assertTrue('newcol' in data.columns)
        
        
    def test_apply_rank_bound_missing(self):
        """ Test apply_rank method. """
        filepath = 'test_data/test_data_nan.csv'
        data = Data(filepath)

        data.set_type('col-25', 'Numerical')
                
        N, M = data.shape
        
        # sanity check that col-25 contains missing values
        self.assertTrue(data['col-25'].isna().any().compute())
        
        data.apply_rank('col-0', 'col-25', 2)
        
        self.assertEqual(data.shape[1], M+1)

        self.assertTrue(data['col-0_rank2_col-25'].isna().any().compute())

        self.assertTrue('col-0_rank2_col-25' in data.columns)
        self.assertEqual((data['col-0_rank2_col-25']=='rank_0').sum().compute(), N/2)
        self.assertEqual((data['col-0_rank2_col-25']=='rank_1').sum().compute(), N/4)

        data.apply_rank('col-0', 'col-25', 2)
        self.assertTrue('col-0_rank2_col-25_(1)' in data.columns)                

        
    def test_apply_rank_missing_bound_missing(self):
        """ Test apply_rank method. """
        filepath = 'test_data/test_data_nan.csv'
        data = Data(filepath)

        data.set_type('col-25', 'Numerical')
                
        N, M = data.shape
        
        # sanity check that col-25 contains missing values
        self.assertTrue(data['col-25'].isna().any().compute())
        
        data.apply_rank('col-11', 'col-25', 2)
        
        self.assertEqual(data.shape[1], M+1)

        self.assertTrue(data['col-11_rank2_col-25'].isna().any().compute())

        self.assertTrue('col-11_rank2_col-25' in data.columns)
        self.assertEqual((data['col-11_rank2_col-25']=='rank_0').sum().compute(), N/4)
        self.assertEqual((data['col-11_rank2_col-25']=='rank_1').sum().compute(), N/4)

        data.apply_rank('col-11', 'col-25', 2)
        self.assertTrue('col-11_rank2_col-25_(1)' in data.columns)
        
    def test_apply_rank_missing(self):
        """ Test apply_rank method with missing values. """
        filepath = 'test_data/test_data.csv'
        data = Data(filepath)

        N, M = data.shape
        data.apply_rank('col-11', 'col-24', 2)
        
        self.assertEqual(data.shape[1], M+1)
        
        self.assertTrue('col-11_rank2_col-24' in data.columns)
        self.assertEqual((data['col-11_rank2_col-24']=='rank_0').sum().compute(), N/2)

        # Last rank excludes missing values
        self.assertEqual((data['col-11_rank2_col-24']=='rank_1').sum().compute(), N/4)

        data.apply_rank('col-11', 'col-24', 2)
        self.assertTrue('col-11_rank2_col-24_(1)' in data.columns)                

    def test_get_type(self):
        """ Test getting an individual column type. """
        filepath = parentdir+"/data/sp500_data.csv"
        
        data = Data(filepath)

        type_eps = data.get_type("eps")
        self.assertEqual(type_eps, "Numerical")

        type_sector = data.get_type("sector")
        self.assertEqual(type_sector, "Nominal")

        type_symbol = data.get_type("symbol")
        self.assertEqual(type_symbol, "Index")

    def test_apply_rename(self):
        filepath = parentdir+"/data/sp500_data.csv"
        data = Data(filepath)
        
        data.apply_rename("eps", "neweps")
        
        self.assertFalse("eps" in data.columns)
        self.assertTrue("neweps" in data.columns)
        self.assertTrue("neweps" in data.types)
        self.assertFalse("eps" in data.types)
        self.assertEqual(data.types["neweps"], 'Numerical')
        
        
    def test_describe(self):
        """ Test describe method on real data. """
        filepath = parentdir+"/data/sp500_data.csv"
        data = Data(filepath)

        df = pd.read_csv(filepath)
        desc_df = df.describe()        
        desc_data = data.describe()
        self.assertEqual(desc_df.shape, desc_data.shape)

        self.assertAlmostEqual(desc_data["eps"]["min"], desc_df["eps"]["min"])
        self.assertAlmostEqual(desc_data["eps"]["max"], desc_df["eps"]["max"])
        self.assertAlmostEqual(desc_data["eps"]["50%"], desc_df["eps"]["50%"])

        desc_eps = data.describe_col('eps')
        self.assertAlmostEqual(desc_eps["min"], desc_df["eps"]["min"])
        self.assertAlmostEqual(desc_eps["max"], desc_df["eps"]["max"])
        self.assertAlmostEqual(desc_eps["50%"], desc_df["eps"]["50%"])        
        
        data.apply_filter('eps', lb=0)
        desc_filt = data.describe(columns=['eps', 'stddev'])
        
        self.assertGreater(desc_filt['eps']['min'], desc_data['eps']['min'])
        self.assertGreater(desc_filt['eps']['min'], 0)
        self.assertListEqual(desc_filt.columns.tolist(), ['eps', 'stddev'])

        
    def test_has_na(self):
        """ Test the has_na function. """
        filepath = parentdir+"/data/sp500_data.csv"
        data = Data(filepath)
        
        data_na_mat = data.has_na()
        self.assertTrue(data_na_mat["current_ratio"])
        self.assertTrue(data_na_mat["operating_leverage"])
        self.assertFalse(data_na_mat["eps"])
        self.assertFalse(data_na_mat["sector"])

        self.assertTrue(data.has_na('current_ratio'))
        self.assertFalse(data.has_na('eps'))
    
    def test_count_na(self):
        """ Test the count_na function. """
        filepath = parentdir+"/data/sp500_data.csv"
        data = Data(filepath)
        
        data_na_mat = data.count_na()
        self.assertEqual(data_na_mat["current_ratio"], 57)
        self.assertEqual(data_na_mat["operating_leverage"], 91)
        self.assertEqual(data_na_mat["eps"], 0)
        self.assertEqual(data_na_mat["sector"], 0)

        self.assertEqual(data.count_na('current_ratio'), 57)
        self.assertEqual(data.count_na('eps'), 0)
        
    def test_histogram(self):
        """ Test the histogram method. """        
        filepath = 'test_data/test_data.csv'
        data = Data(filepath)

        df = pd.read_csv(filepath)

        data.apply_filter('col-3', lb=0)
        col = df.loc[(df['col-3'] > 0) & np.isfinite(df['col-3']), "col-3"]
        count, division = np.histogram(col, 30)
        count_data, division_data = data.histogram("col-3", bins=30)
        count_data_all, division_data_all = data.histogram_all("col-3", bins=division_data)        
        
        self.assertListEqual(list(count_data), list(count))
        self.assertListEqual(list(division_data), list(division))
        self.assertGreater(min(division_data), 0)

        self.assertTrue(np.all(count_data_all>=count_data))
        self.assertGreater(min(division_data_all), 0)

    def test_histogram_by(self):
        """ Test the histogram_by method. """        
        filepath = 'test_data/test_data.csv'
        data = Data(filepath)
        df = pd.read_csv(filepath)
        
        classes = list(data.unique('col-99'))
        desc = data.describe_col('col-3', drop_inf=True)
        step = (desc['max'] - desc['min'])/10
        div = np.arange(desc['min'], desc['max']+step, step).tolist()         
        counts, bins = data.histogram_by("col-3", 'col-99', div)        

        # Check histogram for each class
        for c in classes:
            self.assertTrue(c in counts)
            col = df.loc[(df['col-99'] == c) & np.isfinite(df['col-3']), "col-3"]
            count, division = np.histogram(col, div)            
            self.assertListEqual(list(counts[c]), list(count))                
            self.assertListEqual(list(bins), list(division))

    def test_histogram_all(self):
        """ Test the histogram method. """
        filepath = 'test_data/test_data.csv'
        data = Data(filepath)

        df = pd.read_csv(filepath)

        data.apply_filter('col-3', lb=0)
        
        count, division = np.histogram(df.loc[np.isfinite(df['col-3']), "col-3"], 30)
        count_data, division_data = data.histogram_all("col-3", bins=30)
        self.assertListEqual(list(count_data), list(count))
        self.assertListEqual(list(division_data), list(division))
        self.assertLess(min(division_data), 0)

    def test_histogram_batch(self):
        """ Test the histogram method. """
        filepath = parentdir+"/data/sp500_data.csv"
        data = Data(filepath)

        df = pd.read_csv(filepath)
        
        count_eps, division_eps = np.histogram(df["eps"], 30)
        count_price, division_price = np.histogram(df["price"], 30)

        data.apply_filter('eps', 0)

        # test without filtered
        batch_result = data.histogram_batch(["eps", 'price'], bins=30, filtered=False)
        count_ddf_eps, division_ddf_eps = batch_result[0]
        count_ddf_price, division_ddf_price = batch_result[1]

        self.assertListEqual(list(count_ddf_eps), list(count_eps))
        self.assertListEqual(list(division_ddf_eps), list(division_eps))

        self.assertListEqual(list(count_ddf_price), list(count_price))
        self.assertListEqual(list(division_ddf_price), list(division_price))

        # test with filtered
        count_eps, division_eps = np.histogram(df.loc[df['eps'] >= 0, "eps"], 30)
        count_price, division_price = np.histogram(df.loc[df['eps'] >= 0, "price"], 30)
        
        batch_result = data.histogram_batch(["eps", 'price'], bins=30, filtered=True)
        count_ddf_eps, division_ddf_eps = batch_result[0]
        count_ddf_price, division_ddf_price = batch_result[1]

        self.assertListEqual(list(count_ddf_eps), list(count_eps))
        self.assertListEqual(list(division_ddf_eps), list(division_eps))

        self.assertListEqual(list(count_ddf_price), list(count_price))
        self.assertListEqual(list(division_ddf_price), list(division_price))
        
    def test_histograms(self):
        """ Test histograms method. """
        filepath = parentdir+"/data/sp500_data.csv"
        data = Data(filepath)

        df = pd.read_csv(filepath)

        data.apply_filter('eps', lb=0)
        
        count, division = np.histogram(df.loc[df['eps'] > 0, "eps"], bins=30)        
        count_data, count_data_all, division_data = data.histograms("eps", nbins=30)
        self.assertListEqual(list(count_data), list(count))
        self.assertListEqual(list(division_data), list(division))
        self.assertGreater(min(division_data), 0)

        self.assertTrue(np.all(count_data_all>=count_data))

    def test_histograms_datetime(self):
        """ Test histograms method. """
        filepath = 'test_data/test_data.csv'
        data = Data(filepath)

        data.set_type('col-10', 'DateTime')
        data.apply_datetime_filter('col-10', lb='1989/01/01')
        
        df = pd.read_csv(filepath)
        df = df[pd.to_datetime(df['col-10']) >= '1989/01/01']
        
        count, division = np.histogram(pd.to_datetime(df['col-10']).astype(np.int64), bins=30)
        division = pd.to_datetime(division).astype(str)
       
        count_data, count_data_all, division_data = data.histograms_datetime("col-10", nbins=30)
        self.assertListEqual(list(count_data), list(count))    
        self.assertListEqual(list(division_data), list(division))
        
        
    def test_histograms_batch(self):
        """ Test histograms method for batch data. """
        filepath = parentdir+"/data/sp500_data.csv"
        data = Data(filepath)

        df = pd.read_csv(filepath)

        data.apply_filter('eps', lb=0)
        
        count, division = np.histogram(df.loc[df['eps'] > 0, "eps"], 30)        
        hist_data = data.histograms_batch(["eps", 'rsi'], nbins=30)

        count_data, count_data_all, division_data = hist_data[0]
        self.assertListEqual(list(count_data), list(count))
        self.assertListEqual(list(division_data), list(division))
        self.assertGreater(min(division_data), 0)

        self.assertTrue(np.all(count_data_all>=count_data))

    def test_value_counts(self):
        """ Test the value_counts method. """
        filepath = 'test_data/test_data.csv'
        data = Data(filepath)

        N, M = data.shape
        
        counts, levels = data.value_counts('col-0')
        self.assertListEqual(counts, [N/4, N/4, N/4, N/4])
        self.assertListEqual(levels, ['a', 'b', 'c', 'd'])

        data.apply_filter('col-1', 0)
        
        counts, levels = data.value_counts('col-0')
        self.assertFalse(np.all(counts==[N/4, N/4, N/4, N/4]))

        counts_all, levels_all = data.value_counts_all('col-0')
        self.assertListEqual(counts_all, [N/4, N/4, N/4, N/4])
        self.assertListEqual(levels_all, ['a', 'b', 'c', 'd'])

    def test_group_by(self):
        """ Test the group_by method. """
        filepath = 'test_data/test_data.csv'
        data = Data(filepath)
        
        N, M = data.shape
        
        result = data.group_by(['col-0', 'col-99'])

        counts = list(result['counts'])
        categories = list(result['col-0'])
        classes = list(result['col-99'])
        
        self.assertListEqual(counts, [N/4, N/4, N/4, N/4])
        self.assertListEqual(categories, ['a', 'b', 'c', 'd'])
        self.assertListEqual(classes, ['x', 'y', 'y', 'y'])

        data.apply_filter('col-1', 0)
                
        result = data.group_by(['col-0', 'col-99'])

        counts = list(result['counts'])
        categories = list(result['col-0'])
        classes = list(result['col-99'])

        self.assertFalse(np.all(counts==[N/4, N/4, N/4, N/4]))

        result_all = data.group_by_all(['col-0', 'col-99'])

        counts_all = list(result_all['counts'])
        categories_all = list(result_all['col-0'])
        classes_all = list(result_all['col-99'])
        
        self.assertListEqual(counts_all, [N/4, N/4, N/4, N/4])
        self.assertListEqual(categories_all, ['a', 'b', 'c', 'd'])
        self.assertListEqual(classes_all, ['x', 'y', 'y', 'y'])

        
    def test_value_counts_batch(self):
        """ Test the histogram method. """
        filepath = 'test_data/test_data.csv'
        data = Data(filepath)

        N, M = data.shape

        data.apply_filter('col-1', 0)
        
        batch_result = data.value_counts_batch(['col-0', 'col-99'], filtered=False)
        counts_0, levels_0 = batch_result[0]
        self.assertListEqual(counts_0, [N/4, N/4, N/4, N/4])
        self.assertListEqual(levels_0, ['a', 'b', 'c', 'd'])

        counts_1, levels_1 = batch_result[1]
        self.assertListEqual(counts_1, [3*N/4, N/4])
        self.assertListEqual(levels_1, ['y', 'x'])

        batch_result = data.value_counts_batch(['col-0', 'col-99'], filtered=True)
        counts_0, levels_0 = batch_result[0]
        self.assertFalse(np.all(counts_0==[N/4, N/4, N/4, N/4]))

        counts_1, levels_1 = batch_result[1]
        self.assertFalse(np.all(counts_1==[3*N/4, N/4]))
        
    def test_get_counts(self):
        """ Test getting data set counts. """
        filepath = 'test_data/test_data.csv'
        data = Data(filepath)

        N, M = data.shape
        counts = data.get_counts()
        self.assertEqual(counts['original'], N)
        self.assertEqual(counts['filtered'], N)

        data.apply_filter('col-1', 0)
        fcounts = data.get_counts()
        self.assertEqual(fcounts['original'], N)
        self.assertLess(fcounts['filtered'], N)
        self.assertEqual(fcounts['filtered'], len(data.filter_data))


    def test_corr(self):
        """ Test correlation table """
        filepath = 'test_data/test_data.csv'
        data = Data(filepath)
        table = data.corr()

        # should be correlated
        self.assertGreater(table.loc['col-1', 'col-2'], 0.5)

    def test_drop_columns(self):
        """ Test dropping columns. """
        filepath = 'test_data/test_data.csv'
        data = Data(filepath, delay_load=True)

        self.assertEqual(len(data.columns), 100)
        
        drop = ['col-0', 'col-1', 'col-2']
        data.drop_columns(drop)

        self.assertEqual(len(data.columns), 97)
        self.assertFalse(drop[0] in data.columns)
        self.assertFalse(drop[1] in data.columns)
        self.assertFalse(drop[2] in data.columns)
        
        data.load_to_dask()
        self.assertEqual(len(data.columns), 97)
        self.assertFalse(drop[0] in data.columns)
        self.assertFalse(drop[1] in data.columns)
        self.assertFalse(drop[2] in data.columns)
        

        
    def test_drop_column(self):
        """ Test dropping individual column. """
        filepath = 'test_data/test_data.csv'
        data = Data(filepath, delay_load=True)

        self.assertEqual(len(data.columns), 100)
        
        drop = ['col-0', 'col-1', 'col-2']
        data.drop_column(drop[0])
        data.drop_column(drop[1])
        data.drop_column(drop[2])

        self.assertEqual(len(data.columns), 97)
        self.assertFalse(drop[0] in data.columns)
        self.assertFalse(drop[1] in data.columns)
        self.assertFalse(drop[2] in data.columns)

        data.load_to_dask()
        self.assertEqual(len(data.columns), 97)
        self.assertFalse(drop[0] in data.columns)
        self.assertFalse(drop[1] in data.columns)
        self.assertFalse(drop[2] in data.columns)

        
    def test_detect_types(self):
        """ Test inferring types automatically """
        filepath = 'test_data/test_data.csv'

        # Test infering with file paths
        data = Data(filepath)
        self.assertEqual(data.data.dtypes['col-0'], 'object')
        self.assertEqual(data.data.dtypes['col-99'], 'object')
        self.assertNotEqual(data.data.dtypes['col-1'], 'object')

        # Test infering with another dataframe
        data2 = Data()
        data2._data = data._data.copy()
        data2.load_to_dask()
        self.assertEqual(data2.data.dtypes['col-0'], 'object')
        self.assertEqual(data2.data.dtypes['col-99'], 'object')
        self.assertNotEqual(data2.data.dtypes['col-1'], 'object')
        self.assertNotEqual(data2.data.dtypes['col-2'], 'object')

        # test that column with all NaNs is treated as nominal
        filepath_nan = 'test_data/test_data_nan.csv'
        data_nan = Data(filepath_nan)        
        self.assertEqual(data.data.dtypes['col-1'], 'float')
        self.assertEqual(data_nan.data.dtypes['col-1'], 'object')
        
    def test_consistent_types(self):
        """ Test that dtypes don't change with load_to_dask. """
        filepath_nan = 'test_data/test_data_nan.csv'
        data_nan = Data(filepath_nan)

        pre_load_catcols = data_nan.get_catcols()
        data_nan.load_to_dask()
        post_load_catcols = data_nan.get_catcols()

        # types should not change after loading
        self.assertListEqual(pre_load_catcols, post_load_catcols)

    def test_bool_type(self):
        """ Test that bool types get converted to Nominal. """
        filepath_bool = 'test_data/test_data_bool.csv'
        data_bool = Data(filepath_bool)
        self.assertEqual(data_bool.data['bool_type'].dtype.name, 'object')
        
    def test_set_type(self):
        """ Test setting attr type. """
        filepath = 'test_data/test_data.csv'
        data = Data(filepath)

        data.set_type('col-1', 'Nominal')
        self.assertEqual(data.types['col-1'], 'Nominal')
        self.assertEqual(data.data.dtypes['col-1'], 'object')
        self.assertNotEqual(data.data.dtypes['col-2'], 'object')
        
        data.apply_filter('col-2', 0)
        self.assertGreaterEqual(data.filter_data['col-2'].min().compute(), 0)

        data.set_type('col-1', 'Numerical')
        self.assertEqual(data.types['col-1'], 'Numerical')
        self.assertNotEqual(data.data.dtypes['col-1'], 'object')
        self.assertGreaterEqual(data.filter_data['col-2'].min().compute(), 0)

        data.create_derived('test', 'col-1 + 1')
        self.assertTrue('test' in data.types)
        self.assertEqual(data.types['test'], 'Numerical')
        

    def test_set_type_datetime(self):
        """ Test setting attr type to datetime. """
        filepath = 'test_data/test_data.csv'
        data = Data(filepath)

        data.set_type('col-10', 'DateTime')
        
        self.assertEqual(data.types['col-10'], 'DateTime')
        data.apply_datetime_filter('col-10', lb='01-01-1989')
        self.assertTrue((data['col-10'] >= '01-01-1989').all().compute())
        
        
    def test_set_type_ordinal(self):
        """ Test setting attr type. """
        filepath = parentdir+"/data/stroke.csv"
        data = Data(filepath)              
                
        self.assertEqual(data.types['gender'], 'Nominal')
        self.assertEqual(data.data.dtypes['gender'], 'object')
        self.assertTrue(data.orderings['gender'] is None)

        data.set_type('gender', 'Ordinal', ["Female", "Male"])        
        self.assertEqual(data.types['gender'], 'Ordinal')
        self.assertEqual(data.data.dtypes['gender'], 'object')
        self.assertTrue(type(data.orderings['gender']) is list)     
        self.assertListEqual(data.orderings['gender'], ["Female", "Male", "Other"])  

    def test_set_ordering(self):
        """ Test setting attr type. """
        filepath = parentdir+"/data/stroke.csv"
        data = Data(filepath)         
        
        self.assertEqual(data.types['gender'], 'Nominal')        
        self.assertEqual(data.data.dtypes['gender'], 'object')
        self.assertTrue(data.orderings['gender'] is None)

        data.set_type('gender', 'Ordinal', ["Female", "Male"])
        self.assertEqual(data.types['gender'], 'Ordinal')        
        self.assertEqual(data.data.dtypes['gender'], 'object')
        self.assertTrue(type(data.orderings['gender']) is list)      

        data.set_ordering('gender', ["Other", "Female", "Male"])
        self.assertTrue(type(data.orderings['gender']) is list)
        self.assertEqual(len(data.orderings['gender']), 3)
        self.assertListEqual(data.orderings['gender'], ["Other", "Female", "Male"])

        # test that reseting the data resets the orderings
        data.reset_data()
        self.assertTrue(all(data.orderings[c] is None for c in data.columns))

        
    def test_replace_ordinal(self):
        """ Test setting attr type. """
        filepath = parentdir+"/data/stroke.csv"
        data = Data(filepath)        
        
        self.assertEqual(data.types['gender'], 'Nominal')        
        self.assertEqual(data.data.dtypes['gender'], 'object')
        self.assertTrue(data.orderings['gender'] is None)

        data.set_type('gender', 'Ordinal', ["Female", "Male"])
        self.assertEqual(data.types['gender'], 'Ordinal')        
        self.assertEqual(data.data.dtypes['gender'], 'object')
        self.assertTrue(type(data.orderings['gender']) is list)      

        data.set_ordering('gender', ["Other", "Female", "Male"])
        self.assertTrue(type(data.orderings['gender']) is list)
        self.assertEqual(len(data.orderings['gender']), 3)
        self.assertListEqual(data.orderings['gender'], ["Other", "Female", "Male"])

        data.apply_replace('gender', ["Other", "Male"], "OtherCat")
        self.assertListEqual(list(data.orderings['gender']), ["OtherCat", "Female"])
        

    def test_get_catcols(self):
        """ Test setting getting category attributes.. """
        filepath = 'test_data/test_data.csv'
        data = Data(filepath, delay_load=False)

        catcols = [
            'col-0',
            'col-10',
            'col-11',
            'col-96',
            'col-97',
            'col-98',
            'col-99'            
        ]

        self.assertListEqual(data.get_catcols(), catcols)
        data.drop_column('col-0')

        catcols = [
            'col-10',
            'col-11',
            'col-96',
            'col-97',
            'col-98',
            'col-99'            
        ]

        self.assertListEqual(data.get_catcols(), catcols)

    def test_to_pandas_ordinal(self):
        """ Test setting attr type. """
        filepath = parentdir+"/data/stroke.csv"
        data = Data(filepath)        
        
        self.assertEqual(data.types['gender'], 'Nominal')        
        self.assertEqual(data.data.dtypes['gender'], 'object')
        self.assertTrue(data.orderings['gender'] is None)

        data.set_type('gender', 'Ordinal', ["Female", "Male"])
        self.assertEqual(data.types['gender'], 'Ordinal')        
        self.assertEqual(data.data.dtypes['gender'], 'object')
        self.assertTrue(type(data.orderings['gender']) is list)      

        data.set_ordering('gender', ["Other", "Female", "Male"])
        self.assertTrue(type(data.orderings['gender']) is list)
        self.assertEqual(len(data.orderings['gender']), 3)
        self.assertListEqual(data.orderings['gender'], ["Other", "Female", "Male"])

        df = data.to_pandas(filtered=False, nsamples=None, replaceOrdering=True)
        self.assertEqual(df['gender'].dtype, 'float64')
        self.assertEqual(df['gender'].min(), 1)
        self.assertEqual(df['gender'].max(), 3)

    def test_to_pandas_ordinal_filter(self):
        """ Test setting attr type. """
        filepath = parentdir+"/data/stroke.csv"
        data = Data(filepath)        
        
        self.assertEqual(data.types['gender'], 'Nominal')        
        self.assertEqual(data.data.dtypes['gender'], 'object')
        self.assertTrue(data.orderings['gender'] is None)

        data.set_type('gender', 'Ordinal', ["Female", "Male"])
        self.assertEqual(data.types['gender'], 'Ordinal')        
        self.assertEqual(data.data.dtypes['gender'], 'object')
        self.assertTrue(type(data.orderings['gender']) is list)      

        data.set_ordering('gender', ["Other", "Female", "Male"])
        self.assertTrue(type(data.orderings['gender']) is list)
        self.assertEqual(len(data.orderings['gender']), 3)
        self.assertListEqual(data.orderings['gender'], ["Other", "Female", "Male"])

        data.apply_nominal_filter('gender', ["Female"], inc=1)

        df = data.to_pandas(filtered=True, nsamples=None, replaceOrdering=True)
        self.assertEqual(df['gender'].dtype, 'float64')
        self.assertEqual(df['gender'].min(), 2)
        self.assertEqual(df['gender'].max(), 2)

        
    def test_bayesian_bug(self):
        """ Test bug related to missing nominal values. """
        filepath = parentdir+"/data/stroke.csv"
        data = Data(filepath)

        pattern = {'smoking_status': {'in':['NaN']}}
        data.apply_nominal_filter('smoking_status', ['NaN'])

        # crashes here
        data.describe()

        self.assertTrue(data['smoking_status'].isna().all().compute())

        data.reset_data()
        data.apply_nominal_filter('smoking_status', ['NaN'], 'Exclude')

        # crashes here
        data.describe()        
        self.assertFalse(data['smoking_status'].isna().any().compute())
        
        
if __name__ == '__main__':
    unittest.main()
    
