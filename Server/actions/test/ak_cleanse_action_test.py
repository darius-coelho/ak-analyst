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
from actions.ak_cleanse_action import ak_cleanse_action

from dataframes.data import Data
from ak_logger import logger

# disable logging
logger.setLevel(logging.WARNING)

class TestAKCleanseAction(unittest.TestCase):
    """ Test cleanse action. """

    def setUp(self):
        """ Create random data and store to a file. """
        N, M = 10000, 100
        columns = [f'col-{i}'for i in range(M)]
        X = np.random.normal(size=(N, M))
        X[:, 2] = X[:, 1] + np.random.normal(size=N)

        level_count = int(N/4)        

        df = pd.DataFrame(X, columns=columns)
        df['col-0'] = ['a'] * level_count \
                      + ['b'] * level_count \
                      + ['c'] * level_count \
                      + ['d'] * level_count
        df['col-99'] = ['x'] * int(N / 4) + ['y'] * int(3 * N / 4)
        
        os.mkdir('test_data/')
        df.to_csv('test_data/test_data.csv', index=False)

    def tearDown(self):
        """ Remove the random test data and directory. """
        os.remove('test_data/test_data.csv')
        os.rmdir('test_data/')

        if os.path.isdir('parquet/'):        
            # remove parquet files
            shutil.rmtree('parquet/')
        
    def test_mine_fp(self):
        """ Test mining action. """
        
        filepath = 'test_data/test_data.csv'
        ak_data = Data(filepath)
        
        data_file = FileResult('data', None, data=ak_data)

        config = {
            'transformations': [
                {'tType': 'Norm', 'newmin': 0, 'newmax': 1, 'attr': 'col-1'}
            ],
            'deleted': []
        }

        result = ak_cleanse_action(data_file, config)
        desc = result.data.describe_col("col-1")
        self.assertTrue(isinstance(result, FileResult))
        self.assertTrue(isinstance(result.preview(), pd.DataFrame))
        self.assertGreater(result.preview().shape[0], 0)
        self.assertAlmostEqual(desc["min"], 0)
        self.assertAlmostEqual(desc["max"], 1)        
        
        
        
if __name__ == '__main__':
    unittest.main()


