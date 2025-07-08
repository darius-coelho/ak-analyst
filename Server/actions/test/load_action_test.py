import unittest

import pandas as pd
import numpy as np

import os
import sys
import inspect
import logging

currentdir = os.path.dirname(os.path.abspath(inspect.getfile(inspect.currentframe())))
parentdir = os.path.dirname(os.path.dirname(currentdir))
sys.path.insert(0, parentdir) 

from actions.results import FileResult
from actions.load_action import load_action

from ak_logger import logger

# disable logging
logger.setLevel(logging.CRITICAL)

class TestLoadAction(unittest.TestCase):
    """ Test load action. """

    def test_load(self):
        """ Test loading works. """

        filepath = parentdir + "/data/stroke.csv"
        file_info = {
            'name': 'stroke.csv',
            'path': filepath,
            'inMemory': False,
            'options': None,
            'type': 'text/csv'
        }
        result = load_action(file_info)

        self.assertTrue(isinstance(result, FileResult))
        self.assertTrue(isinstance(result.preview(), pd.DataFrame))
        self.assertGreater(result.preview().shape[0], 0)
        
        self.assertRaises(TypeError, load_action, 'asdf')
        

if __name__ == '__main__':
    unittest.main()

