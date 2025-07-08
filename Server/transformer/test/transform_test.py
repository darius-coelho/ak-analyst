import unittest
import os
import shutil
import sys
import inspect
import logging

import numpy as np
import pandas as pd

import dask.dataframe as dd
import dask

currentdir = os.path.dirname(os.path.abspath(inspect.getfile(inspect.currentframe())))
parentdir = os.path.dirname(os.path.dirname(currentdir))
sys.path.insert(0, parentdir)

from dataframes.data import Data, DataSample
import transformer.transform as tr

from ak_logger import logger

# disable logging
logger.setLevel(logging.WARNING)


class TestTransform(unittest.TestCase):
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
        df['col-2'] = 10  # set to constant
        df['col-10'] = pd.date_range(start='01/01/1988', periods=N)
        
        os.mkdir(currentdir+'/test_data/')
        df.to_csv(currentdir+'/test_data/test_data.csv', index=False)

        
    def tearDown(self):
        """ Remove the random test data and directory. """
        # remove test files
        shutil.rmtree(currentdir+'/test_data/')

        if os.path.isdir('parquet/'):
            # remove parquet files
            shutil.rmtree('parquet/')
            
    
    def test_log_transform(self):
        """ Test LogTransform class. """
        filepath = currentdir + '/test_data/test_data.csv'

        data = Data(filepath)
        transform = tr.LogTransform('col-2', 10)
        
        transform.apply(data)
        self.assertTrue(np.all(data['col-2'].sample(frac=0.1).compute() == 1.0))

        transform.disable()
        transform.apply(data)
        self.assertTrue(np.all(data['col-2'].sample(frac=0.1).compute() == 1.0))

        transform.enable()
        transform.apply(data)
        self.assertTrue(np.all(data['col-2'].sample(frac=0.1).compute() == 0.0))

        self.assertEqual(transform.dependency_list, ['col-2'])

        expected_dict =  {
            'is_visible': True,
            'enabled': True,
            'is_global': False,
            'uid': transform.uid,
            'tType': 'Log',
            'attr': 'col-2',
            'base': 10,
            'dependency_list': ['col-2']
        }

        self.assertEqual(transform.to_dict(), expected_dict)
        
    def test_rename_transform(self):
        """ Test RenameTransform class. """
        filepath = currentdir + '/test_data/test_data.csv'

        data = Data(filepath)
        transform = tr.RenameTransform('col-1', 'column-one')
        
        transform.apply(data)
        self.assertTrue('column-one' in data.columns)
        self.assertFalse('col-1' in data.columns)        

        self.assertEqual(transform.dependency_list, [])
        
        expected_dict =  {
            'is_visible': False,
            'enabled': True,
            'is_global': False,
            'uid': transform.uid,
            'tType': 'ColNameChange',
            'attr': 'col-1',
            'name': 'column-one',
            'dependency_list': []
        }

        self.assertEqual(transform.to_dict(), expected_dict)        

        
    def test_normalize_transform(self):
        """ Test NormTransform class. """
        filepath = currentdir + '/test_data/test_data.csv'

        data = Data(filepath)
        transform = tr.NormTransform('col-1', newmin=1, newmax=2)
        
        transform.apply(data)
        self.assertEqual(data.filter_data['col-1'].min().compute(), 1)
        self.assertEqual(data.filter_data['col-1'].max().compute(), 2)
        self.assertEqual(transform.dependency_list, ['col-1'])
        
        expected_dict =  {
            'is_visible': True,
            'enabled': True,
            'is_global': False,
            'uid': transform.uid,
            'tType': 'Norm',
            'attr': 'col-1',
            'newmin': 1,
            'newmax': 2,
            'dependency_list': ['col-1']
        }

        self.assertEqual(transform.to_dict(), expected_dict)

        
    def test_normalize_transform_disabled(self):
        """ Test NormTransform class. """
        filepath = currentdir + '/test_data/test_data.csv'

        data = Data(filepath)
        transform = tr.NormTransform('col-1', newmin=1, newmax=2)

        transform.disable()
        transform.apply(data)
        self.assertNotEqual(data.filter_data['col-1'].min().compute(), 1)
        self.assertNotEqual(data.filter_data['col-1'].max().compute(), 2)


    def test_clamp_transform(self):
        """ Test ClampTransform class. """
        filepath = currentdir + '/test_data/test_data.csv'

        data = Data(filepath)
        transform = tr.ClampTransform('col-1', lb=0, ub=1)
        
        transform.apply(data)
        self.assertEqual(data.filter_data['col-1'].min().compute(), 0)
        self.assertEqual(data.filter_data['col-1'].max().compute(), 1)

        self.assertEqual(transform.dependency_list, ['col-1'])

        expected_dict =  {
            'is_visible': True,
            'enabled': True,
            'is_global': False,
            'uid': transform.uid,
            'dependency_list': ['col-1'],
            'tType': 'Clamp',
            'attr': 'col-1',
            'lb': 0,
            'ub': 1
        }

        self.assertEqual(transform.to_dict(), expected_dict)

        
    def test_clamp_transform_disabled(self):
        """ Test ClampTransform class. """
        filepath = currentdir + '/test_data/test_data.csv'

        data = Data(filepath)
        transform = tr.ClampTransform('col-1', lb=0, ub=1)

        transform.disable()
        transform.apply(data)
        self.assertLess(data.filter_data['col-1'].min().compute(), 0)
        self.assertGreater(data.filter_data['col-1'].max().compute(), 1)

        
    def test_replace_transform(self):
        """ Test ReplaceTransform class. """
        filepath = parentdir+"/data/sp500_data_rn.csv"
        data = Data(filepath)
        
        transform = tr.ReplaceTransform('sector', ["Utilities", "Materials"], "OtherCat")        
        transform.apply(data)

        uni = data.filter_data['sector'].unique().compute().tolist()
        
        self.assertTrue("OtherCat" in uni)
        self.assertFalse("Utilities" in uni)
        self.assertFalse("Materials" in uni)        
        self.assertEqual(transform.dependency_list, ['sector'])

        expected_dict =  {
            'is_visible': True,
            'enabled': True,
            'is_global': False,
            'uid': transform.uid,
            'tType': 'Repl',
            'attr': 'sector',
            'old_vals':  ["Utilities", "Materials"],
            'new_val': "OtherCat",
            'dependency_list': ['sector']
        }

        self.assertEqual(transform.to_dict(), expected_dict)

        
    def test_replace_transform_disabled(self):
        """ Test ReplaceTransform class. """
        filepath = parentdir+"/data/sp500_data_rn.csv"
        data = Data(filepath)
        
        transform = tr.ReplaceTransform('sector', ["Utilities", "Materials"], "OtherCat")        
        transform.disable()
        transform.apply(data)

        uni = data.filter_data['sector'].unique().compute().tolist()
        
        self.assertFalse("OtherCat" in uni)
        self.assertTrue("Utilities" in uni)
        self.assertTrue("Materials" in uni)        
        
        
    def test_impute_transform(self):
        """ Test ImputeTransform class. """
        filepath = parentdir+"/data/sp500_data_rn.csv"
        data = Data(filepath)

        # some missing values
        self.assertTrue(data.filter_data["liquidity"].isna().any().compute())
                
        transform = tr.ImputeTransform('liquidity', 'Mean', None)
        transform.apply(data)

        # no missing values
        self.assertFalse(data.filter_data["liquidity"].isna().any().compute())
        self.assertEqual(transform.dependency_list, ['liquidity'])

        
        expected_dict =  {
            'is_visible': True,
            'enabled': True,
            'is_global': False,
            'uid': transform.uid,
            'tType': 'Missing',
            'attr': 'liquidity',
            'method': "Mean"
        }

        self.assertEqual(transform.to_dict(), expected_dict)
        

    def test_impute_transform_disabled(self):
        """ Test ImputeTransform class. """
        filepath = parentdir+"/data/sp500_data_rn.csv"
        data = Data(filepath)

        # some missing values
        self.assertTrue(data.filter_data["liquidity"].isna().any().compute())
                
        transform = tr.ImputeTransform('liquidity', 'Mean', None)
        transform.disable()
        transform.apply(data)

        # no missing values
        self.assertTrue(data.filter_data["liquidity"].isna().any().compute())
        
    def test_impute_transform(self):
        """ Test ImputeTransform class. """
        filepath = parentdir+"/data/sp500_data_rn.csv"
        data = Data(filepath)

        # some missing values
        self.assertTrue(data.filter_data["liquidity"].isna().any().compute())
                
        transform = tr.DropMissing('liquidity')
        transform.apply(data)

        # no missing values
        self.assertFalse(data.filter_data["liquidity"].isna().any().compute())
        self.assertEqual(transform.dependency_list, ['liquidity'])

        
        expected_dict =  {
            'is_visible': True,
            'enabled': True,
            'inc': 1,
            'is_global': False,
            'uid': transform.uid,
            'tType': 'Missing-Drop',
            'attr': 'liquidity',
            'dependency_list': ['liquidity']
        }

        self.assertEqual(transform.to_dict(), expected_dict)
        

    def test_filter_transform(self):
        """ Test FilterTransform class. """
        filepath = currentdir + '/test_data/test_data.csv'

        data = Data(filepath)
        transform = tr.FilterTransform('col-1', lb=0, ub=1)
        
        transform.apply(data)
        self.assertGreaterEqual(data.filter_data['col-1'].min().compute(), 0)
        self.assertLessEqual(data.filter_data['col-1'].max().compute(), 1)
        self.assertEqual(transform.dependency_list, ['col-1'])

        
        expected_dict =  {
            'is_visible': True,
            'enabled': True,
            'is_global': False,
            'uid': transform.uid,
            'tType': 'Filter',
            'attr': 'col-1',
            'lb': 0,
            'ub': 1,
            'inc': 1,
            'dependency_list': ['col-1']
        }

        self.assertEqual(transform.to_dict(), expected_dict)
        
    def test_filter_datetime_transform(self):
        """ Test FilterDateTransform class. """
        filepath = currentdir + '/test_data/test_data.csv'

        data = Data(filepath)
        data.set_type('col-10', 'DateTime')
        transform = tr.FilterDateTransform('col-10', lb='1989-01-01', ub='1990-01-01')
        
        transform.apply(data)
        self.assertGreaterEqual(data.filter_data['col-10'].min().compute(),
                                pd.Timestamp('1989-01-01'))

        self.assertLessEqual(data.filter_data['col-10'].max().compute(),
                             pd.Timestamp('1990-01-01'))
        
        self.assertEqual(transform.dependency_list, ['col-10'])


        expected_dict =  {
            'is_visible': True,
            'enabled': True,
            'is_global': False,
            'uid': transform.uid,
            'tType': 'FilterDate',
            'attr': 'col-10',
            'lb': '1989-01-01',
            'ub': '1990-01-01',
            'inc': 1,
            'dependency_list': ['col-10']
        }

        self.assertEqual(transform.to_dict(), expected_dict)

        
    def test_filter_transform_disabled(self):
        """ Test FilterTransform class. """
        filepath = currentdir + '/test_data/test_data.csv'

        data = Data(filepath)
        transform = tr.FilterTransform('col-1', lb=0, ub=1)

        transform.disable()
        transform.apply(data)
        self.assertLess(data.filter_data['col-1'].min().compute(), 0)
        self.assertGreater(data.filter_data['col-1'].max().compute(), 1)

        
    def test_nominal_filter_transform(self):
        """ Test NominalFilterTransform class. """
        filepath = currentdir + '/test_data/test_data.csv'

        data = Data(filepath)
        transform = tr.NominalFilterTransform('col-0', filter_cats=['b', 'd'])
        
        transform.apply(data)

        uni = data.filter_data['col-0'].unique().compute()
        
        self.assertListEqual(uni.tolist(), ['b', 'd'])        
        self.assertEqual(transform.dependency_list, ['col-0'])
        
        expected_dict =  {
            'is_visible': True,
            'enabled': True,
            'is_global': False,
            'uid': transform.uid,
            'tType': 'FilterNom',
            'attr': 'col-0',
            'filter_cats': ['b', 'd'],
            'filter_type': 'Include',
            'inc': 1,
            'dependency_list': ['col-0']
        }

        self.assertEqual(transform.to_dict(), expected_dict)

    def test_nominal_filter_transform_exclude(self):
        """ Test NominalFilterTransform class (exclusion filter). """
        filepath = currentdir + '/test_data/test_data.csv'

        data = Data(filepath)
        transform = tr.NominalFilterTransform('col-0', filter_cats=['b', 'd'],
                                              filter_type="Exclude")
        
        transform.apply(data)

        uni = data.filter_data['col-0'].unique().compute()
        
        self.assertListEqual(uni.tolist(), ['a', 'c'])        
        self.assertEqual(transform.dependency_list, ['col-0'])
        
        expected_dict =  {
            'is_visible': True,
            'enabled': True,
            'is_global': False,
            'uid': transform.uid,
            'tType': 'FilterNom',
            'attr': 'col-0',
            'filter_cats': ['b', 'd'],
            'filter_type': 'Exclude',
            'inc': 1,
            'dependency_list': ['col-0']
        }
        
        self.assertEqual(transform.to_dict(), expected_dict)

        
    def test_nominal_filter_transform_disabled(self):
        """ Test NominalFilterTransform class. """
        filepath = currentdir + '/test_data/test_data.csv'

        data = Data(filepath)
        transform = tr.NominalFilterTransform('col-0', filter_cats=['b', 'd'])

        transform.disable()
        transform.apply(data)

        uni = data.filter_data['col-0'].unique().compute()
        self.assertListEqual(uni.tolist(), ['a', 'b', 'c', 'd'])

    def test_cell_split_transform(self):
        """ Test the CellSplitTransform class """
        filepath = parentdir+"/data/final_track_data.csv"
        
        data = Data(filepath, options={'encoding': 'utf-8'})
        sample = data.sample()

        transform = tr.CellSplitTransform('artist_genre', ',', strip='[]', quote="'")
        transform.disable()
        transform.enable()
        transform.apply(sample)

        self.assertTrue('artist_genre_pos_0' in sample.columns)
        self.assertTrue('artist_genre_pos_1' in sample.columns)
        self.assertTrue('artist_genre_pos_2' in sample.columns)
        self.assertTrue('artist_genre_pos_3' in sample.columns)

        
    def test_ohe_transform(self):
        """ Test OHETransform class. """
        filepath = currentdir + '/test_data/test_data.csv'

        data = Data(filepath)

        transform = tr.OHETransform('col-0')
        transform.disable()
        transform.enable()
        transform.apply(data)

        self.assertTrue("col-0_a" in data.columns)
        self.assertTrue("col-0_b" in data.columns)
        self.assertTrue("col-0_c" in data.columns)
        self.assertTrue("col-0_d" in data.columns)
        self.assertTrue(transform.is_global)
        self.assertEqual(transform.dependency_list, ['col-0'])

        
        expected_dict =  {
            'is_visible': True,
            'enabled': True,
            'is_global': True,
            'uid': transform.uid,
            'tType': 'OHE',
            'attr': 'col-0',
            'bind': None,
            'dependency_list': ['col-0'],
            'new_cols': ['col-0_a', 'col-0_b', 'col-0_c', 'col-0_d']
        }

        result = transform.to_dict()
        result['new_cols'] = sorted(result['new_cols'])

        self.assertEqual(result, expected_dict)

    def test_ohe_transform_bind(self):
        """ Test OHETransform class. """
        filepath = currentdir + '/test_data/test_data.csv'

        data = Data(filepath)

        transform = tr.OHETransform('col-0', bind='col-1')
        transform.disable()
        transform.enable()
        transform.apply(data)

        self.assertTrue("col-0_a_col-1" in data.columns)
        self.assertTrue("col-0_b_col-1" in data.columns)
        self.assertTrue("col-0_c_col-1" in data.columns)
        self.assertTrue("col-0_d_col-1" in data.columns)
        
        self.assertTrue(transform.is_global)
        self.assertEqual(transform.dependency_list, ['col-0', 'col-1'])

        
        expected_dict =  {
            'is_visible': True,
            'enabled': True,
            'is_global': True,
            'uid': transform.uid,
            'tType': 'OHE',
            'attr': 'col-0',
            'bind': 'col-1',
            'dependency_list': ['col-0', 'col-1'],
            'new_cols': ['col-0_a_col-1', 'col-0_b_col-1', 'col-0_c_col-1', 'col-0_d_col-1'],
        }

        result = transform.to_dict()
        result['new_cols'] = sorted(result['new_cols'])

        self.assertEqual(result, expected_dict)
        
        
    def test_ohe_transform_disabled(self):
        """ Test OHETransform class. """
        filepath = currentdir + '/test_data/test_data.csv'

        data = Data(filepath)

        transform = tr.OHETransform('col-0')
        transform.disable()
        transform.apply(data)

        self.assertFalse("col-0_a" in data.columns)
        self.assertFalse("col-0_b" in data.columns)
        self.assertFalse("col-0_c" in data.columns)
        self.assertFalse("col-0_d" in data.columns)

        self.assertTrue(transform.is_global)


    def test_rank_transform(self):
        """ Test RankTransform class. """
        filepath = currentdir + '/test_data/test_data.csv'

        data = Data(filepath)
        sample = data.sample()
        
        transform = tr.RankTransform('col-0', 'col-11', 4)
        transform.disable()
        transform.enable()
        transform.apply(sample)

        self.assertTrue("col-0_rank4_col-11" in data.columns)
        self.assertTrue("col-0_rank4_col-11" in sample.columns)
        self.assertTrue("col-0_rank4_col-11" in sample.to_pandas().columns)
        
        self.assertTrue(transform.is_global)
        self.assertEqual(transform.dependency_list, ['col-0', 'col-11'])
        
        expected_dict =  {
            'is_visible': True,
            'enabled': True,
            'is_global': True,
            'uid': transform.uid,
            'tType': 'Rank',
            'attr': 'col-0',
            'rankattr': 'col-11',
            'ranktiers': 4,
            'derived_attr': None,
            'dependency_list': ['col-0', 'col-11'],
            'new_cols': ['col-0_rank4_col-11']
        }
        
        self.assertEqual(transform.to_dict(), expected_dict)
        
        
    def test_rank_transform_disabled(self):
        """ Test RankTransform class. """
        filepath = currentdir + '/test_data/test_data.csv'

        data = Data(filepath)

        transform = tr.RankTransform('col-0', 'col-11', 4)
        transform.disable()
        transform.apply(data)
        
        self.assertFalse("col-0_rank4_col-11" in data.columns)        
        self.assertTrue(transform.is_global)
        
        
    def test_custom_transform(self):
        """ Test CustomTransform class. """
        filepath = currentdir + '/test_data/test_data.csv'

        data = Data(filepath)
        transform = tr.CustomTransform('col-1', 'col-1 ** 3')
        cmin = data.describe('col-1')['min']
        
        transform.apply(data)

        tmin = data.describe('col-1')['min']
        self.assertEqual(tmin, cmin**3)

        
        expected_dict =  {
            'is_visible': True,
            'enabled': True,
            'is_global': False,
            'uid': transform.uid,
            'tType': 'Custom',
            'attr': 'col-1',
            'expr': 'col-1 ** 3',
            'dependency_list': ['col-1']
        }

        self.assertEqual(transform.to_dict(), expected_dict)

        
    def test_custom_transform_disabled(self):
        """ Test CustomTransform class. """
        filepath = currentdir + '/test_data/test_data.csv'

        data = Data(filepath)
        transform = tr.CustomTransform('col-1', 'col-1 ** 3 + col-2 * col-3')
        cmin = data.describe('col-1')['min']

        transform.disable()
        transform.apply(data)

        tmin = data.describe('col-1')['min']
        self.assertEqual(tmin, cmin)
        self.assertEqual(transform.dependency_list, ['col-1', 'col-2', 'col-3'])        

    def test_type_transform(self):
        """ Test TypeTransform to change types. """
        filepath = currentdir + '/test_data/test_data.csv'

        data = Data(filepath)
        transform = tr.TypeTransform('col-1', 'Nominal')                
        transform.apply(data)
        
        self.assertTrue('col-1' in data.columns)        
        self.assertEqual(data.filter_data.dtypes['col-1'], 'object')

    def test_type_transform_datetime(self):
        """ Test TypeTransform to change types to datetime. """
        filepath = currentdir + '/test_data/test_data.csv'

        data = Data(filepath)
        transform = tr.TypeTransform('col-10', 'DateTime')                
        transform.apply(data)
        
        self.assertTrue('col-10' in data.columns)        
        self.assertEqual(data.types['col-10'], 'DateTime')

    def test_ordering_transform(self):
        """ Test OrderingTransform to change ordinal order. """
        filepath = parentdir+"/data/stroke.csv"

        data = Data(filepath)
        transform = tr.TypeTransform('gender', 'Ordinal', ["Female", "Male", "Other"])                
        transform.apply(data)
        
        self.assertTrue('gender' in data.columns)        
        self.assertEqual(data.filter_data.dtypes['gender'], 'object')
        self.assertTrue(type(data.orderings['gender']) is list)
        self.assertListEqual(data.orderings['gender'], ["Female", "Male", "Other"])

        transform2 = tr.OrderingTransform('gender', ["Other", "Male", "Female"])
        transform2.apply(data)
        self.assertListEqual(data.orderings['gender'], ["Other", "Male", "Female"])

        
    def test_create_derived_transform(self):
        """ Test CreateDerivedTransform class. """
        filepath = currentdir + '/test_data/test_data.csv'

        data = Data(filepath)
        transform = tr.CreateDerivedTransform('derived_attr', 'col-1 + 3 * col-3')
        transform.apply(data)
        self.assertTrue('derived_attr' in data.columns)
        self.assertTrue(transform.is_global)
        self.assertEqual(transform.dependency_list, ['col-1', 'col-3'])

        transform.rename('col-1', 'column-one')
        self.assertEqual(transform.expr, 'column-one + 3 * col-3')

        expected_dict =  {
            'is_visible': False,
            'enabled': True,
            'is_global': True,
            'uid': transform.uid,
            'tType': 'Derived',
            'attr': 'derived_attr',
            'expr': 'column-one + 3 * col-3',
            'dependency_list': ['column-one', 'col-3'],
        }

        self.assertEqual(transform.to_dict(), expected_dict)

    def test_create_derived_transform_w_dependencies(self):
        """ Test CreateDerivedTransform when there are dependent transforms.. """
        filepath = currentdir + '/test_data/test_data.csv'
        
        data = Data(filepath)
        norm = tr.NormTransform('col-1', 0, 1)
        
        transform = tr.CreateDerivedTransform('derived_attr', 'col-1 * 2')        
        norm.apply(data)
        transform.apply(data)
        
        self.assertTrue('derived_attr' in data.columns)
        self.assertTrue(transform.is_global)
        
        self.assertEqual(transform.dependency_list, ['col-1'])

        self.assertEqual(data['derived_attr'].min().compute(), 0)
        self.assertEqual(data['derived_attr'].max().compute(), 2)

        expected_dict = {
            'tType': 'Derived',
            'is_visible': False,
            'enabled': True,
            'is_global': True,
            'attr': 'derived_attr',
            'uid': transform.uid,
            'expr': 'col-1 * 2',
            'dependency_list': ['col-1'],
        }
        self.assertEqual(transform.to_dict(), expected_dict)
        
        
if __name__ == '__main__':
    unittest.main()
    
