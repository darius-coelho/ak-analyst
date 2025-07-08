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

from analyst.pattern import Pattern
from dataframes.data import Data

class TestPattern(unittest.TestCase):
    """ Test case for Pattern class. """
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

    def test_apply_pattern(self):
        """ Test the apply_pattern method. """
        filepath = 'test_data/test_data.csv'                
        data = Data(filepath)
        
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

        objs = [Pattern(p) for p in patterns]

        objs[0].apply_pattern(data)
        self.assertLessEqual(data.filter_data['col-1'].max().compute(), 0)
        self.assertGreaterEqual(data.filter_data['col-3'].max().compute(), 0)
        self.assertLessEqual(data.filter_data['col-3'].max().compute(), 2)

        data.reset_data()                
        objs[1].apply_pattern(data)
        uni = data.filter_data['col-0'].unique().compute()
        self.assertListEqual(uni.tolist(), ['a', 'c'])

    def test_apply_pattern2(self):
        """ Test the apply_pattern method. """
        filepath = 'test_data/test_data.csv'                
        data = Data(filepath)
        
        patterns = [
            {
                'ID': 0,
                'constraints': {'col-1': {'lb': None, 'ub': 0}, 'col-3': {'lb': 0, 'ub': 2}} 
            },
            {
                'ID': 1,
                'constraints': {'col-0': {'in': ['a', 'c']}}
            }
        ]

        objs = [Pattern(p) for p in patterns]

        objs[0].apply_pattern(data)
        self.assertLessEqual(data.filter_data['col-1'].max().compute(), 0)
        self.assertGreaterEqual(data.filter_data['col-3'].max().compute(), 0)
        self.assertLessEqual(data.filter_data['col-3'].max().compute(), 2)

        data.reset_data()                
        objs[1].apply_pattern(data)
        uni = data.filter_data['col-0'].unique().compute()
        self.assertListEqual(uni.tolist(), ['a', 'c'])
        
    def test_rotate(self):
        """ Test the rotate method. """
        filepath = 'test_data/test_data.csv'                
        data = Data(filepath)

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

        objs = [Pattern(p) for p in patterns]

        self.assertTrue(objs[0].rotate(data, 'col-1'))
        self.assertTrue(objs[0].rotate(data, 'col-3'))

        counts = data.get_counts()
        
        # filtering took place
        self.assertLess(counts['filtered'], counts['original'])
        
        self.assertTrue(objs[0].rotate(data, 'col-10'))
        self.assertTrue('col-10' in objs[0].hyperbox)

        data.reset_data()

        self.assertTrue(objs[0].rotate(data, 'col-0'))
        self.assertTrue('col-0' in objs[0].hyperbox) 
        self.assertFalse('col-10' in objs[0].hyperbox)       

        uni = data.filter_data['col-0'].unique().compute()
        self.assertEqual(set(uni), set(objs[0].hyperbox['col-0']['in']))
        
        data.reset_data()

        self.assertTrue(objs[1].rotate(data, 'col-0'))

        counts = data.get_counts()
        
        # filtering took place
        self.assertLess(counts['filtered'], counts['original'])

        self.assertTrue(objs[1].rotate(data, 'col-10'))
        self.assertTrue('col-10' in objs[1].hyperbox)
        self.assertTrue('col-0' in objs[1].hyperbox)

        self.assertGreaterEqual(data.filter_data['col-10'].min().compute(),
                                objs[1].hyperbox['col-10']['lb'])

        self.assertLessEqual(data.filter_data['col-10'].max().compute(),
                             objs[1].hyperbox['col-10']['ub'])

    def test_shap_values(self):
        """ Test the rotate method. """
        filepath = 'test_data/test_data.csv'                
        data = Data(filepath)

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

        objs = [Pattern(p) for p in patterns]
        shap_vals = objs[0].shap_values(data.sample().to_pandas(), 'col-2')

        # col-1 should be must important
        self.assertEqual(shap_vals[0]['attribute'], 'col-1')
        
        # should be negative effect
        self.assertLess(shap_vals[0]['shap'], 0)

    def test_add_hyperbox_continuous(self):
        """ Test the add hyperbox method. """
        p = Pattern({'ID': 0, 'constraints': {'col-1': {'lb': -np.inf, 'ub': 0}, 'col-3': {'lb': 0, 'ub': 2}}})
        p.add_hyperbox_continuous('col-0', lb=0)
        self.assertEqual(p.hyperbox, {'col-0': {'lb': 0, 'ub': np.inf},
                                      'col-1': {'lb': -np.inf, 'ub': 0},
                                      'col-3': {'lb': 0, 'ub': 2}})
        p.reset_hyperbox()
        self.assertEqual(p.hyperbox, {'col-1': {'lb': -np.inf, 'ub': 0},
                                      'col-3': {'lb': 0, 'ub': 2}})

        p.add_hyperbox_continuous('col-1', ub=0)
        self.assertEqual(p.hyperbox, {'col-1': {'lb': -np.inf, 'ub': 0},
                                      'col-3': {'lb': 0, 'ub': 2}})
        
    def test_add_hyperbox_nominal(self):
        """ Test the add hyperbox method. """
        p = Pattern({'ID': 0, 'constraints': {'col-1': {'lb': -np.inf, 'ub': 0}, 'col-3': {'lb': 0, 'ub': 2}}})
        p.add_hyperbox_nominal('col-0', ['a', 'b', 'c'])
        self.assertEqual(p.hyperbox, {'col-0': {'in': ['a', 'b', 'c']},
                                      'col-1': {'lb': -np.inf, 'ub': 0},
                                      'col-3': {'lb': 0, 'ub': 2}})
        
        p.reset_hyperbox()
        self.assertEqual(p.hyperbox, {'col-1': {'lb': -np.inf, 'ub': 0},
                                      'col-3': {'lb': 0, 'ub': 2}})

        p.add_hyperbox_continuous('col-1', ub=0)
        self.assertEqual(p.hyperbox, {'col-1': {'lb': -np.inf, 'ub': 0},
                                      'col-3': {'lb': 0, 'ub': 2}})

        
if __name__ == '__main__':
    unittest.main()
    
