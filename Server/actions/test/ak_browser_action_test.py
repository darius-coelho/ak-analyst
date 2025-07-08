import unittest

import pandas as pd
import numpy as np

import os
import sys
import inspect
import shutil
import logging

currentdir = os.path.dirname(os.path.abspath(inspect.getfile(inspect.currentframe())))
parentdir = os.path.dirname(os.path.dirname(currentdir))
sys.path.insert(0, parentdir) 

from actions.results import FileResult
from actions.ak_mine_action import ak_mine_action
from actions.ak_browse_action import ak_browse_action

from dataframes.data import Data

from ak_logger import logger

# disable logging
logger.setLevel(logging.WARNING)


class TestAKBrowseAction(unittest.TestCase):
    """ Test pattern miner action. """
    def setUp(self):
        """ Create random data and store to a file. """
        np.random.seed(0)
        Xy = np.random.normal(size=(1000,3))

        data = pd.DataFrame(Xy, columns=['x1', 'x2', 'y'])
        data['x2'] = ['a'] * 500 + ['b'] * 500
        
        data['y'] = 1.2 * data['x1'] + np.random.normal(1000)                
        os.mkdir(currentdir+'/test_data/')

        data.to_csv(currentdir+'/test_data/test_data.csv', index=False)

    def tearDown(self):
        """ Remove the random test data and directory. """
        # remove test files
        shutil.rmtree(currentdir+'/test_data/')

        if os.path.isdir('parquet/'):
            # remove parquet files
            shutil.rmtree('parquet/')

            
    def test_mine_and_browse(self):
        """ Test pattern browser action. """
        filepath = currentdir+'/test_data/test_data.csv'
        ak_data = Data(filepath)

        data_file = FileResult('data', None, data=ak_data)

        config = {
            'target': ['y'],
            'mineType': 'numeric',
            'method': 'fpminer',
            'options': {'is_sample': True, 'nsamples': 500}
        }
        mine_result = ak_mine_action(data_file, config)        
        
        self.assertGreater(len(mine_result.model.patterns), 0)   
        browse_config = {
            'browseType': 'bubble',
        }     
        ak_result = ak_browse_action(mine_result, config=browse_config).result['y']

        for p in ak_result.patterns:
            ak_result.dataset.create_checkpoint()
            p.apply_pattern(ak_result.dataset)
            
            self.assertGreater(ak_result.dataset.get_counts()['filtered'], 0)
            ak_result.dataset.restore_checkpoint()
            
            
        self.assertFalse(ak_result.get_patterns() is None)
        self.assertFalse(ak_result.get_summary() is None)
        self.assertFalse(ak_result.get_features() is None)
        

        
    def test_mine_and_browse_real(self):
        """ Test on a real dataset. """
        filepath = parentdir + "/data/sp500_data.csv"
        dataset = Data(filepath)        
        dependent = 'fut_return'

        data_file = FileResult('data', None, data=dataset)

        config = {
            'target': [dependent],
            'mineType': 'numeric',
            'method': 'fpminer',
            'options': {'is_sample': False}
        }
        mine_result = ak_mine_action(data_file, config)

        self.assertGreater(len(mine_result.model.patterns), 0)
        browse_config = {
            'browseType': 'bubble',
        }     
        ak_result = ak_browse_action(mine_result, config=browse_config).result[dependent]
        
        for p in ak_result.patterns:
            ak_result.dataset.create_checkpoint()
            p.apply_pattern(ak_result.dataset)
            
            self.assertGreater(ak_result.dataset.get_counts()['filtered'], 0)            
            ak_result.dataset.restore_checkpoint()
        
        self.assertFalse(ak_result.get_patterns() is None)
        self.assertFalse(ak_result.get_summary() is None)
        self.assertFalse(ak_result.get_features() is None)

        
if __name__ == '__main__':
    unittest.main()


