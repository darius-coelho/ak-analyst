import unittest

import os
import sys
import inspect
import shutil
import logging

import numpy as np
import pandas as pd

currentdir = os.path.dirname(os.path.abspath(inspect.getfile(inspect.currentframe())))
parentdir = os.path.dirname(os.path.dirname(currentdir))
sys.path.insert(0, parentdir)

from ak_logger import logger

# disable logging
logger.setLevel(logging.WARNING)

from dataframes.data import Data
from analyst.analyst import Analyst

class TestAnalyst(unittest.TestCase):
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
        df['col-99'] = ['x'] * int(N / 4) + ['y'] * int(3 * N / 4)
        df.loc[0, 'col-3'] = np.inf  # set an inf
        
        os.mkdir('test_data/')
        df.to_csv('test_data/test_data.csv', index=False)

    def tearDown(self):
        """ Remove the random test data and directory. """
        os.remove('test_data/test_data.csv')
        os.rmdir('test_data/')

        if os.path.isdir('parquet/'):
            # remove parquet files
            shutil.rmtree('parquet/')

            
    def test_init(self):
        """ Test constructor """
        filepath = 'test_data/test_data.csv'                
        data = Data(filepath)
        target = 'col-2'

        patterns = [
            {
                'ID': 0,
                'constraints': {'col-1': {'lb': -np.inf, 'ub': 0}, 'col-3': {'lb': 0, 'ub': 2}} 
            },
            {
                'ID': 1,
                'constraints': {'col-0': {'in': ['a', 'c']}}
            }
        ]

        analyst = Analyst(data.sample(), target, mine_type='numeric', patterns=patterns)
        self.assertTrue('size' in analyst.summary)
        self.assertTrue('mu' in analyst.summary)
        self.assertTrue('min' in analyst.summary)
        self.assertTrue('max' in analyst.summary)
        self.assertTrue('med' in analyst.summary)
        self.assertTrue('sig' in analyst.summary)
        self.assertTrue('hist' in analyst.summary)

        feature_scores = analyst.get_features()

        # col-1 should be most important
        self.assertEqual(feature_scores[0]['attribute'], 'col-1')
        self.assertGreater(abs(feature_scores[0]['raw_score']), 0)
        
        # histogram should sum to 1
        self.assertAlmostEqual(sum(analyst.summary['hist']['freq']), 1.0)
        self.assertEqual(len(analyst.get_features()), 99)
        
        patternIDs = list(analyst.group_summary.keys())
        col0 = next((s for s in analyst.group_summary[patternIDs[-1]] if s['attribute'] == 'col-0'), None)
        self.assertFalse(col0 is None)
        self.assertEqual(col0['first']['perc'], 0.5)
        self.assertEqual(col0['second']['perc'], 0.5)

        summary = analyst.summarize_subgroups(patternIDs[0])
        self.assertGreaterEqual(abs(summary['list'][0]['shap']),
                                abs(summary['list'][1]['shap']))
        
        self.assertGreaterEqual(abs(summary['root'][0]['shap']),
                                abs(summary['root'][1]['shap']))

        cat_levels = analyst.get_cat_levels()
        self.assertEqual(len(cat_levels), 2)

    def test_pandas_by_pid(self):
        """ Test pandas_by_pid method. """
        filepath = 'test_data/test_data.csv'                
        data = Data(filepath)
        target = 'col-2'

        patterns = [
            {
                'ID': 0,
                'constraints': {'col-1': {'lb': -np.inf, 'ub': 0}, 'col-3': {'lb': 0, 'ub': 2}} 
            },
            {
                'ID': 1,
                'constraints': {'col-0': {'in': ['a', 'c']}}
            }
        ]

        analyst = Analyst(data.sample(), target, mine_type='numeric', patterns=patterns)
        df_0 = analyst.pandas_by_pid(0)
        self.assertLessEqual(df_0['col-1'].max(), 0)
        self.assertLessEqual(df_0['col-3'].max(), 2)
        self.assertGreaterEqual(df_0['col-3'].min(), 0)

        # dataset should be restored
        self.assertGreater(data.to_pandas()['col-1'].max(), 0)
        
        df_1 = analyst.pandas_by_pid(1)
        self.assertListEqual(df_1['col-0'].unique().tolist(), ['a', 'c'])
        
        
if __name__ == '__main__':
    unittest.main()
    
