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
from analyst.analyst_lite import AnalystLite, to_map

class TestAnalystLite(unittest.TestCase):
    def setUp(self):
        """ Create random data and store to a file. """
        np.random.seed(0)
        
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

        df.loc[df['col-0'] == 'a', 'col-97'] = np.nan
        df.loc[df['col-0'] == 'c', 'col-97'] = np.nan
        
        os.mkdir('test_data/')
        df.to_csv('test_data/test_data.csv', index=False, na_rep='')

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
        targets = ['col-2']

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

        analyst = AnalystLite(data.sample(), targets, mine_type='numeric', patterns=patterns)

        # Summary should have attributes and stats for each target
        self.assertTrue('attributes' in analyst.summary)
        self.assertTrue('stats' in analyst.summary)
        for target in targets:
            self.assertTrue(target in analyst.summary['stats'])
            self.assertTrue('size' in analyst.summary['stats'][target])
            self.assertTrue('mu' in analyst.summary['stats'][target])
            self.assertTrue('min' in analyst.summary['stats'][target])
            self.assertTrue('max' in analyst.summary['stats'][target])
            self.assertTrue('med' in analyst.summary['stats'][target])
            self.assertTrue('sig' in analyst.summary['stats'][target])
            

        feature_scores = analyst.get_features()
        
        # Feature scores should be generated for each target
        for target in targets:
            self.assertTrue(target in analyst.summary['stats'])
        
        # There should be only 3 core features for the first target
        self.assertEqual(len(feature_scores[targets[0]]), 3)

        # col-1 should be most important
        self.assertEqual(feature_scores[targets[0]][0]['attribute'], 'col-1')
        self.assertGreater(abs(feature_scores[targets[0]][0]['raw_score']), 0)

        # Test pattern descriptions generated
        for pattern in analyst.patterns_descr:            
            self.assertTrue('ID' in pattern)
            self.assertTrue('core' in pattern)
            self.assertTrue('others' in pattern)
            self.assertTrue('shaps' in pattern)            
            self.assertTrue('stats' in pattern)
            for target in targets:
                self.assertTrue(target in pattern['shaps'])
                self.assertTrue(target in pattern['stats'])
            self.assertTrue('attributes' in pattern)
            
        # Test labels for categorical attributes generated
        cat_levels = analyst.get_cat_levels()
        self.assertEqual(len(cat_levels), 3)

    def test_update_summary(self):
        """ Test constructor """
        filepath = 'test_data/test_data.csv'                
        data = Data(filepath)
        targets = ['col-2']

        patterns = [
            {
                'ID': 0,
                'constraints': {'col-1': {'lb': -np.inf, 'ub': 0}, 'col-3': {'lb': -10, 'ub': 2}} 
            },
            {
                'ID': 1,
                'constraints': {'col-0': {'in': ['a', 'c', 'z']}}
            }
        ]

        analyst = AnalystLite(data.sample(), targets, mine_type='numeric', patterns=patterns)

        # Summary should have attributes and stats for each target
        self.assertTrue('attributes' in analyst.summary)
        self.assertTrue('stats' in analyst.summary)
        
        # Ensure that values not in data but in pattern constraints are part of the dataset summary
        # -10 for col-3 in pattern 1 and z for col-0 in pattern 2
        self.assertTrue(analyst.summary['attributes']['col-3']['min'] == -10)
        self.assertTrue('z' in analyst.summary['attributes']['col-0']['categories'])
        
        # Ensure that additional category in pattern definition is return by get_cat_levels
        cat_levels = analyst.get_cat_levels()
        self.assertTrue('z' in cat_levels['col-0'])

    def test_pandas_by_pid(self):
        """ Test pandas_by_pid method. """
        filepath = 'test_data/test_data.csv'                
        data = Data(filepath)
        targets = ['col-2']

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

        analyst = AnalystLite(data.sample(), targets, mine_type='numeric', patterns=patterns)
        pid = analyst.patterns[0].ID
        df_0 = analyst.pandas_by_pid(pid)
        self.assertLessEqual(df_0['col-1'].max(), 0)
        self.assertLessEqual(df_0['col-3'].max(), 2)
        self.assertGreaterEqual(df_0['col-3'].min(), 0)

        # dataset should be restored
        self.assertGreater(data.to_pandas()['col-1'].max(), 0)
        
        pid = analyst.patterns[1].ID
        df_1 = analyst.pandas_by_pid(pid)
        self.assertListEqual(df_1['col-0'].unique().tolist(), ['a', 'c'])

    def test_associated_patterns(self):
        """ Test associated patterns. """
        filepath = 'test_data/test_data.csv'                
        data = Data(filepath)
        targets = ['col-2']

        patterns = [
            {
                'ID': 0,
                'constraints': {'col-1': {'lb': -np.inf, 'ub': 0}, 'col-3': {'lb': 0, 'ub': 2}} 
            },
            {
                'ID': 1,
                'constraints': {'col-0': {'in': ['a', 'c']}}
            }
            ,
            {
                'ID': 2,
                'constraints': {'col-1': {'lb': -np.inf, 'ub': 0.1}}
            }
        ]

        analyst = AnalystLite(data.sample(), targets, mine_type='numeric', patterns=patterns)
        result = analyst.associated_patterns(analyst.patterns)

        self.assertEqual(result[0][0], 2)
        self.assertEqual(result[2][0], 0)
        self.assertEqual(len(result[1]), 0)

    def test_all_nan_column(self):
        """ Test that columns with all NaN values are not part of the patterns attributes. """
        filepath = 'test_data/test_data.csv'                
        data = Data(filepath)
        
        # Create column with all nans
        data.apply_custom("col-98", "col-98/0")        
        
        targets = ['col-2']

        patterns = [
            {
                'ID': 0,
                'constraints': {'col-1': {'lb': -np.inf, 'ub': 0}, 'col-3': {'lb': 0, 'ub': 2}} 
            },
            {
                'ID': 1,
                'constraints': {'col-0': {'in': ['a', 'c']}}
            }
            ,
            {
                'ID': 2,
                'constraints': {'col-1': {'lb': -np.inf, 'ub': 0.1}}
            }
        ]

        analyst = AnalystLite(data.sample(), targets, mine_type='numeric', patterns=patterns)
        pattern_desc = analyst.get_patterns()
        #Ensure that all NaN column is not part of pattern attributes
        for pattern in pattern_desc:
            self.assertFalse('col-98' in pattern['attributes'])

    def test_empty_column(self):
        """ Test that an empty columns have [nan] as their categories and are not part of the patterns attributes. """
        filepath = parentdir + "/data/sp500_data_empty_col.csv"
        data = Data(filepath)
                
        targets = ['fut_return']

        patterns = [
            {
                'ID': 0,
                'constraints': {"vol_roc": { "lb": -np.inf, "ub":-42.0 },"stddev": { "lb": 1.8879927396774292,"ub": np.inf}} 
            },
            {
                'ID': 1,
                'constraints': {"sector": {"in": ["Financials"]}}
            }
            ,
            {
                'ID': 2,
                'constraints': {"dividend_yield": { "lb": 2.8975062370300293, "ub": np.inf }}
            }
        ]

        analyst = AnalystLite(data.sample(), targets, mine_type='numeric', patterns=patterns)
        pattern_desc = analyst.get_patterns()

        #Check that empty columns have [nan] as cat_levels
        cat_levels = analyst.get_cat_levels()
        self.assertListEqual(cat_levels['empty'], [np.nan])

        #Ensure that all NaN column is not part of pattern attributes
        for pattern in pattern_desc:
            self.assertFalse('empty' in pattern['attributes'])

    def test_pattern_other_column(self):
        """ Test that pattern details setup for a non-core attribute with all NaN values within pattern. """
        filepath = 'test_data/test_data.csv'                
        data = Data(filepath)
        
        targets = ['col-2']

        patterns = [
            {
                'ID': 0,
                'constraints': {'col-1': {'lb': -np.inf, 'ub': 0}, 'col-3': {'lb': 0, 'ub': 2}} 
            },
            {
                'ID': 1,
                'constraints': {'col-0': {'in': ['a', 'c']}}
            }
            ,
            {
                'ID': 2,
                'constraints': {'col-1': {'lb': -np.inf, 'ub': 0.1}}
            }
        ]

        analyst = AnalystLite(data.sample(), targets, mine_type='numeric', patterns=patterns)
        pattern_desc = analyst.get_patterns()
        #Ensure that col-97 has 100% missing values for pattern 2 only
        self.assertTrue(pattern_desc[0]['attributes']['col-97']['missing'] < 1)
        self.assertTrue(pattern_desc[1]['attributes']['col-97']['missing'] >= 1)
        self.assertTrue(pattern_desc[2]['attributes']['col-97']['missing'] < 1)

    def test_add_pattern(self):
        """ Test adding a pattern. """

        filepath = 'test_data/test_data.csv'                
        data = Data(filepath)
        targets = ['col-2']

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

        analyst = AnalystLite(data.sample(), targets, mine_type='numeric', patterns=patterns)
        analyst.add_pattern({'col-1': {'lb': "-inf", 'ub': 0.1}})

        self.assertEqual(len(analyst.patterns), 3)
        pattern_desc = analyst.get_patterns()

        self.assertEqual(len(pattern_desc), 3)
        pid = analyst.patterns[2].ID
        df_0 = analyst.pandas_by_pid(pid)

        self.assertLessEqual(df_0['col-1'].max(), 0.1)

        # dataset should be restored
        self.assertGreater(data.to_pandas()['col-1'].max(), 0)
        
        pid = analyst.patterns[1].ID
        df_1 = analyst.pandas_by_pid(pid)
        self.assertListEqual(df_1['col-0'].unique().tolist(), ['a', 'c'])

if __name__ == '__main__':
    unittest.main()
    
