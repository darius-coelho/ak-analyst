import unittest

import pandas as pd
import numpy as np

import os
import sys
import inspect
import shutil
import warnings
import logging

currentdir = os.path.dirname(os.path.abspath(inspect.getfile(inspect.currentframe())))
parentdir = os.path.dirname(os.path.dirname(currentdir))
parentparentdir = os.path.dirname(os.path.dirname(parentdir))
sys.path.insert(0, parentdir) 

from actions.results import FileResult
from actions.ak_mine_action import ak_mine_action

from dataframes.data import Data

from ak_logger import logger

# disable logging
logger.setLevel(logging.WARNING)

class TestAKMineAction(unittest.TestCase):
    """ Test pattern miner action. """
    def setUp(self):
        """ Create random data and store to a file. """
        np.random.seed(0)
        Xy = np.random.normal(size=(1000,5))

        data = pd.DataFrame(Xy, columns=['x0', 'x1', 'x2', 'y', 'yes_no'])
        data['x2'] = ['a'] * 500 + ['b'] * 500
        data['yes_no'] = ['YES'] * 500 + ['NO'] * 500

        data['x1'] = data['x1'] + (data['x2'] == 'a').astype(int)
        data['y'] = 1.2 * data['x1'] + 2 * (data['x2'] == 'a').astype(int) \
                    + np.random.normal(1000)

        data_small = pd.DataFrame(np.random.normal(size=(300,2)), columns=['xord', 'ybin'])

        data_small['xord'] = [-1.9] * 10 + \
                             [-1.06] * 25 + \
                             [-1.03] * 35 + \
                             [0.0] * 55 + \
                             [-0.6] * 45 + \
                             [0.7] * 35 + \
                             [1.1] * 30 + \
                             [1.2] * 35 + \
                             [1.6] * 30

        data_small.loc[data_small['xord'] == -1.9, 'ybin'] = np.random.choice(2, 10, p=[0.3, 0.7])

        data_small.loc[data_small['xord'] == -1.06, 'ybin'] = np.random.choice(2, 25, p=[0.4, 0.6])
        
        data_small.loc[data_small['xord'] == -1.03, 'ybin'] = np.random.choice(2, 35, p=[0.45, 0.55])
        
        data_small.loc[data_small['xord'] == 0.0, 'ybin'] = np.random.choice(2, 55, p=[0.6, 0.4])
        
        data_small.loc[data_small['xord'] == -0.6, 'ybin'] = np.random.choice(2, 45, p=[0.6, 0.4])
        
        data_small.loc[data_small['xord'] == 0.7, 'ybin'] = np.random.choice(2, 35, p=[0.7, 0.3])
        
        data_small.loc[data_small['xord'] == 1.1, 'ybin'] = np.random.choice(2, 30, p=[0.8, 0.2])

        data_small.loc[data_small['xord'] == 1.2, 'ybin'] = np.random.choice(2, 35, p=[0.8, 0.2])
        
        data_small.loc[data_small['xord'] == 1.6, 'ybin'] = np.random.choice(2, 30, p=[0.8, 0.2])

        os.mkdir(currentdir+'/test_data/')
        data.to_csv(currentdir+'/test_data/test_data.csv', index=False)
        data_small.to_csv(currentdir+'/test_data/test_data_small.csv', index=False)

    def tearDown(self):
        """ Remove the random test data and directory. """
        # remove test files
        shutil.rmtree(currentdir+'/test_data/')
        
        if os.path.isdir('parquet/'):
            # remove parquet files
            shutil.rmtree('parquet/')

    def test_mine_fp(self):
        """ Test mining action. """
        np.random.seed(0)
        filepath = currentdir + '/test_data/test_data.csv'
        ak_data = Data(filepath)
        data_file = FileResult('data', None, data=ak_data)

        config = {
            'target': ['y'],
            'mineType': 'numeric',
            'method': 'fpminer',
            'options': {'is_sample': False}
        }
        result = ak_mine_action(data_file, config)
        self.assertGreater(len(result.model.patterns), 0)

    def test_mine_fp_bin(self):
        """ Test mining action. """
        np.random.seed(0)
        filepath = currentdir + '/test_data/test_data_small.csv'
        ak_data = Data(filepath)
        data_file = FileResult('data', None, data=ak_data)

        df = ak_data.to_pandas(replaceOrdering=True)
        
        config = {
            'target': ['ybin'],
            'mineType': 'binary',
            'method': 'fpminer',
            'options': {'is_sample': False},
            'holdout': 0,
            'threshold': 1
        }
        result = ak_mine_action(data_file, config)
        self.assertGreater(len(result.model.patterns), 0)

    
    def test_mine_fp_multi(self):
        """ Test mining action. """
        np.random.seed(0)
        filepath = currentdir + '/test_data/test_data.csv'
        ak_data = Data(filepath)
        
        data_file = FileResult('data', None, data=ak_data)

        config = {
            'target': ['y','x1'],
            'mineType': 'numeric',
            'method': 'fpminer',
            'options': {'is_sample': False}
        }
        result = ak_mine_action(data_file, config)

        for p in result.model.patterns:
            self.assertTrue('y' not in p.hyperbox)
            self.assertTrue('x1' not in p.hyperbox)
            
        self.assertGreater(len(result.model.patterns), 0)

        
    def test_mine_barl(self):
        """ Test mining and feature scores. """
        np.random.seed(0)
        filepath = currentdir + '/test_data/test_data.csv'
        ak_data = Data(filepath)
        
        data_file = FileResult('data', None, data=ak_data)

        config = {
            'target': ['y'],
            'mineType': 'numeric',
            'method': 'bayesian',
            'options': {'is_sample': False}
        }

        # catch ray error associated with opening log files
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            result = ak_mine_action(data_file, config)
        
        # test feature scores are in termes of the attribute names
        for score in result.model.feature_scores():
            self.assertTrue(any(x in score[0] for x in ['x1', 'x2', 'yes_no']))


    def test_mine_barl_multi(self):
        """ Test mining and feature scores. """
        np.random.seed(0)
        filepath = currentdir + '/test_data/test_data.csv'
        ak_data = Data(filepath)
        
        data_file = FileResult('data', None, data=ak_data)

        config = {
            'target': ['y', 'x1'],
            'mineType': 'numeric',
            'method': 'bayesian',
            'options': {'is_sample': False}
        }
        result = ak_mine_action(data_file, config)

        result.model.sample_patterns()
        patterns = result.get_patterns()

        for p in patterns:
            self.assertTrue('y' not in p)
            self.assertTrue('x1' not in p)
        
        self.assertGreater(len(patterns), 0)

        
        # test feature scores are in termes of the attribute names
        for score in result.model.feature_scores():
            self.assertTrue(any(x in score[0] for x in ['x0', 'x1', 'x2', 'yes_no']))

        
if __name__ == '__main__':
    unittest.main()


