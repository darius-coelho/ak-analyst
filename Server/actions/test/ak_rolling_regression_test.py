import unittest

import pandas as pd
import numpy as np

import shutil

import os
import sys
import inspect
import logging

currentdir = os.path.dirname(os.path.abspath(inspect.getfile(inspect.currentframe())))
parentdir = os.path.dirname(os.path.dirname(currentdir))
sys.path.insert(0, parentdir) 

from actions.results import FileResult
from actions.ak_rolling_regression_action import ak_rolling_regression_action

from dataframes.data import Data
from ak_logger import logger

# disable logging
logger.setLevel(logging.WARNING)

class TestAKRegressionAction(unittest.TestCase):
    """ Test Rolling Regression action. """

    def tearDown(self):
        if os.path.isdir('parquet/'):        
            # remove parquet files
            shutil.rmtree('parquet/')
        
    def test_rolling_regress(self):
        """ Test rolling regression action. """
        
        filepath = parentdir + "/data/bench.csv"
        ak_data = Data(filepath)
        
        data_file = FileResult('data', None, data=ak_data)

        config = {
            'options': {'is_sample': False},
            'target': "qyld_returns", 
            'predictors': ["return_ixic","return_gspc"],
            'windowSize': 60,
            'confidInterval': 95,
            'featureSel': False
        }

        result = ak_rolling_regression_action(data_file, config)
        self.assertTrue(isinstance(result, FileResult))
        self.assertTrue(isinstance(result.preview(), pd.DataFrame))    
        self.assertEqual(data_file.preview().shape[1], 12)
        # ensure 3 new columns are added for the target, each predictor and the constant
        self.assertEqual(result.preview().shape[1], 12 + 3 + 2*3 + 3) 
        
if __name__ == '__main__':
    unittest.main()
