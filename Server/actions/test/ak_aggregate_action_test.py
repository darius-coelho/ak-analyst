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
from actions.ak_aggregate_action import ak_aggregate_action

from dataframes.data import Data
from ak_logger import logger

# disable logging
logger.setLevel(logging.WARNING)

class TestAKAggregateAction(unittest.TestCase):
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
            'aggKey': "sector",
            'aggMap': [
                {
                    "aggFunc":  {"value": "mean", "label": "Mean", "type": "Numerical"},
                    "attrs": [
                        { "label": "asset_turnover", "value": "asset_turnover", "type": "Numerical" },
                        { "label": "current_ratio", "value": "current_ratio", "type": "Numerical" },
                        { "label": "dividend_yield", "value": "dividend_yield", "type": "Numerical" },
                        { "label": "eps", "value": "eps", "type": "Numerical" },
                        { "label": "fut_return", "value": "fut_return", "type": "Numerical" },
                        { "label": "asset_turnover", "value": "asset_turnover", "type": "Numerical" },
                        { "label": "on_bal_vol", "value": "on_bal_vol", "type": "Numerical" },
                        { "label": "operating_leverage", "value": "operating_leverage", "type": "Numerical" },
                        { "label": "payout_ratio", "value": "payout_ratio", "type": "Numerical" },
                        { "label": "price", "value": "price", "type": "Numerical" },
                        { "label": "price/book", "value": "price/book", "type": "Numerical" },
                        { "label": "price/cashflow", "value": "price/cashflow", "type": "Numerical" },
                        { "label": "price/earnings", "value": "price/earnings", "type": "Numerical" },
                        { "label": "price/earnings/growth", "value": "price/earnings/growth", "type": "Numerical" }
                    ]
                }
            ]
        }

        result = ak_aggregate_action(data_file, config)
        self.assertTrue(isinstance(result, FileResult))
        self.assertTrue(isinstance(result.preview(), pd.DataFrame))        
        self.assertEqual(data_file.preview().shape[1], 27)
        self.assertEqual(result.preview().shape[1], 14) #Test that 13 columnS were dropped
        self.assertEqual(result.preview().shape[0], 8)
        
if __name__ == '__main__':
    unittest.main()
