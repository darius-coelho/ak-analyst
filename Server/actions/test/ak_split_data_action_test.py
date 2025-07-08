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

from actions.results import FileResult, FileResultArray
from actions.split_data_action import split_data_action

from dataframes.data import Data
from ak_logger import logger

# disable logging
logger.setLevel(logging.WARNING)

class TestAKSplitDataAction(unittest.TestCase):
    """ Test aggregate action. """

    def tearDown(self):
        if os.path.isdir('parquet/'):
            # remove parquet files
            shutil.rmtree('parquet/')
        
    def test_aggregate(self):
        """ Test mining action. """
        
        filepath = parentdir + "/data/sp500_data.csv"
        ak_data = Data(filepath)
        
        data_file = FileResult('data', None, data=ak_data)

        config = {
            'sizeType': "Absolute Count",
            'sizeValue': 10,
            'method': "InOrder"
        }

        result = split_data_action(data_file, config)
        self.assertTrue(isinstance(result, FileResultArray))
        self.assertTrue(isinstance(result.get_file_result(0), FileResult))
        self.assertTrue(isinstance(result.get_file_result(1), FileResult))
        self.assertTrue(isinstance(result.preview(0), pd.DataFrame))
        self.assertTrue(isinstance(result.preview(1), pd.DataFrame))
        self.assertEqual(data_file.preview().shape[1], 27)
        # Check same number of columns returned
        self.assertEqual(result.preview(0).shape[1], 27)
        self.assertEqual(result.preview(1).shape[1], 27)
        # Check number of rows for each split
        self.assertEqual(result.preview(0).shape[0], 10)
        self.assertEqual(result.preview(1, 500).shape[0], 364)
        
        
if __name__ == '__main__':
    unittest.main()