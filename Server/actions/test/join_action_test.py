import unittest
import os
import sys
import inspect
import shutil
import logging

import pandas as pd
import dask.dataframe as dd
import numpy as np

currentdir = os.path.dirname(os.path.abspath(inspect.getfile(inspect.currentframe())))
parentdir = os.path.dirname(os.path.dirname(currentdir))
sys.path.insert(0, parentdir) 

from actions.results import FileResult
from actions.join_action import join_action

from dataframes.data import Data

from ak_logger import logger

# disable logging
logger.setLevel(logging.WARNING)


class TestJoinAction(unittest.TestCase):
    """ Test join action. """
    def setUp(self):
        """ Create the test_data directory. """
        os.mkdir('test_data/')

    def tearDown(self):
        """ Remove the test data and test directory. """
        # remove test data
        shutil.rmtree('test_data/')

        if os.path.isdir('parquet/'):        
            # remove parquet files
            shutil.rmtree('parquet/')

        
    def test_join_single_col(self):
        """ Test join action works. """
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
        
        left_file = FileResult('left', None, data=left_df)
        right_file = FileResult('right', None, data=right_df)
        
        config = {'how': 'inner', 'join': [['a', 'a1']], 'suffix': ['_x', '_y']}
        inner_result = join_action([left_file, right_file], config)
        inner = inner_result.data

        config['how'] = 'outer'
        outer_result = join_action([left_file, right_file], config)
        outer = outer_result.data
        
        config['how'] = 'left'
        left_result = join_action([left_file, right_file], config)
        left = left_result.data
        
        config['how'] = 'right'
        right_result = join_action([left_file, right_file], config)
        right = right_result.data
        
        self.assertEqual(inner.shape[0], 999)
        self.assertFalse(inner['b1'].isnull().any().compute())
        self.assertFalse(inner['b'].isnull().any().compute())
        
        self.assertEqual(outer.shape[0], 1001)
        self.assertTrue(outer['b1'].isnull().any().compute())
        self.assertTrue(outer['b'].isnull().any().compute())

        self.assertEqual(left.shape[0], 1000)
        self.assertTrue(left['b1'].isnull().any().compute())
        self.assertFalse(left['b'].isnull().any().compute())

        self.assertEqual(right.shape[0], 1000)
        self.assertFalse(right['b1'].isnull().any().compute())
        self.assertTrue(right['b'].isnull().any().compute())

        
    def test_join_multi_col(self):
        """ Test join action works. """
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

        left_file = FileResult('left', None, data=left_df)
        right_file = FileResult('right', None, data=right_df)
        
        config = {'how': 'inner', 'join': [['a', 'a1'], ['b', 'b1']], 'suffix': ['_x', '_y']}
        inner_result = join_action([left_file, right_file], config)
        inner = inner_result.data
        
        config['how'] = 'outer'
        outer_result = join_action([left_file, right_file], config)
        outer = outer_result.data
        
        config['how'] = 'left'
        left_result = join_action([left_file, right_file], config)
        left = left_result.data
        
        config['how'] = 'right'
        right_result = join_action([left_file, right_file], config)
        right = right_result.data
        
        self.assertEqual(inner.shape[0], 998)
        self.assertFalse(inner['b1'].isnull().any().compute())
        self.assertFalse(inner['b'].isnull().any().compute())

        self.assertEqual(outer.shape[0], 1002)
        self.assertTrue(outer['b1'].isnull().any().compute())
        self.assertTrue(outer['b'].isnull().any().compute())

        self.assertEqual(left.shape[0], 1000)
        self.assertTrue(left['b1'].isnull().any().compute())
        self.assertFalse(left['b'].isnull().any().compute())

        self.assertEqual(right.shape[0], 1000)
        self.assertFalse(right['b1'].isnull().any().compute())
        self.assertTrue(right['b'].isnull().any().compute())

    def test_join_multi_col_suffix(self):
        """ Test join action works. """
        np.random.seed(0)
        leftX = np.random.normal(size=(1000,3))
        rightX = np.random.normal(size=(1000,3))

        leftX[:, 0] = range(1000)
        rightX[:, 0] = range(1, 1001)

        leftX[:, 1] = range(1000)
        rightX[:, 1] = range(1, 1001)

        leftX[4, 1] = -1
        
        left_pdf = pd.DataFrame(leftX, columns=['a', 'b', 'c'])
        right_pdf = pd.DataFrame(rightX, columns=['a', 'b', 'c'])

        left_fname = "test_data/test_left.csv"
        right_fname = "test_data/test_right.csv"
        
        left_pdf.to_csv(left_fname, index=False)
        right_pdf.to_csv(right_fname, index=False)

        left_df = Data(left_fname)
        right_df = Data(right_fname)

        left_file = FileResult('left', None, data=left_df)
        right_file = FileResult('right', None, data=right_df)
        
        config = {'how': 'inner', 'join': [['a', 'a']], 'suffix': ['_left', '_right']}
        inner_result = join_action([left_file, right_file], config)
        inner = inner_result.data        
                
        self.assertEqual(inner.shape[0], 999)
        self.assertFalse(inner['b_left'].isnull().any().compute())
        self.assertFalse(inner['b_right'].isnull().any().compute())

    
if __name__ == '__main__':
    unittest.main()
