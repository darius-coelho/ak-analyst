import unittest

import pandas as pd

import os
import sys
import inspect
import logging

currentdir = os.path.dirname(os.path.abspath(inspect.getfile(inspect.currentframe())))
parentdir = os.path.dirname(os.path.dirname(currentdir))
sys.path.insert(0, parentdir) 

from actions.results import FileResult
from actions.ak_visualize_action import ak_visualize_action

from dataframes.data import Data
from ak_logger import logger

# disable logging
logger.setLevel(logging.WARNING)

class TestAKVisualizeAction(unittest.TestCase):
    """ Test visualize action. """

    def test_visualize_action(self):
        """ Test visualize action. """
        
        filepath = parentdir + "/data/stroke.csv"
        ak_data = Data(filepath)
        
        data_file = FileResult('data', None, data=ak_data)

        config = {
            'options': {'is_sample': False, 'nsamples': 500}
        }

        result = ak_visualize_action(data_file, config)
        self.assertTrue(isinstance(result, FileResult))
        self.assertTrue(isinstance(result.preview(), pd.DataFrame))    
        self.assertEqual(data_file.preview().shape[0], result.preview().shape[0])
        self.assertEqual(data_file.preview().shape[1], result.preview().shape[1])
        
if __name__ == '__main__':
    unittest.main()