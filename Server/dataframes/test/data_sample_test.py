from typing import List
import unittest

import os
import warnings
import sys
import inspect
import shutil
import logging

import dask
import pandas as pd
import numpy as np

currentdir = os.path.dirname(os.path.abspath(inspect.getfile(inspect.currentframe())))
parentdir = os.path.dirname(os.path.dirname(currentdir))
sys.path.insert(0, parentdir)

from dataframes.data import Data, DataSample, DataInMem
from ak_logger import logger

# disable logging
logger.setLevel(logging.WARNING)


class TestDataSample(unittest.TestCase):
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
        df['col-96'] = ['e'] * int(N - int(N/3)) + ['f'] * int(N/3)
        df['col-97'] = ['e'] * int(N - int(N/3)) + ['f'] * int(N/3)
        df['col-98'] = ['u'] * int(N / 3) + ['v'] * int(N - int(N/3))
        df['col-99'] = ['x'] * int(N / 4) + ['y'] * int(3 * N / 4)
        df['col-10'] = pd.date_range(start='01/01/1988', periods=N)
                
        df.loc[0, 'col-3'] = np.inf  # set an inf

        df['col-11'] = ['a'] * level_count \
                       + ['b'] * level_count \
                       + ['c'] * level_count \
                       + [np.nan] * level_count

        df['col-25'] = range(N)
        df.loc[:level_count, 'col-25'] = np.nan
        
        os.mkdir('test_data/')
        df.to_csv('test_data/test_data.csv', index=False)

        df['bool_type'] = df['col-50'] > df['col-50'].mean()
        df.to_csv('test_data/test_data_bool.csv', index=False)
        
    def tearDown(self):
        """ Remove the random test data and directory. """
        # remove test files
        shutil.rmtree('test_data/')

        if os.path.isdir('parquet/'):
            # remove parquet files
            shutil.rmtree('parquet/')

        
    def test_init(self):
        """ Test constructor setup """
        filepath = 'test_data/test_data.csv'        
        data = Data(filepath)
        sample = data.sample(nsamples=200)

        # filters_applied should be excluded
        self.assertFalse("filters_applied" in sample.columns)

        # types should be set
        self.assertTrue('col-0' in data.types)
        self.assertTrue('col-10' in data.types)
        self.assertTrue('col-0' in sample.types)
        self.assertTrue('col-10' in sample.types)

        
        # should use pandas
        self.assertTrue(isinstance(sample.data, pd.DataFrame))

        # NOTE: Dask only samples by fraction (i.e. not # of points)
        # This can lead to the # of samples being slightly off.
        N, M = sample.shape
        expected_frac = data.shape[0] / 200
        sample_frac = data.shape[0] / N
        self.assertAlmostEqual(sample_frac, expected_frac)
        self.assertEqual(M, 100)

    def test_init_malformed_data(self):
        """ Test loading data that is malformed (i.e. too many commas) """
        filepath = parentdir+"/data/sp500_malformed.csv"

        data = Data(filepath)
        sample = data.sample(nsamples=373)
        
        # filters_applied should be excluded
        self.assertFalse("filters_applied" in sample.columns)

        # types should be set
        self.assertTrue('sector' in sample.types)
        self.assertTrue('stddev' in sample.types)
        self.assertTrue('sector' in data.types)
        self.assertTrue('stddev' in data.types)
                   
        self.assertTrue(isinstance(sample.data, pd.DataFrame))
        self.assertEqual(sample.shape, (373, 27))

    def test_apply_filter(self):
        """ Test applying a filter to the dataset. """
        filepath = 'test_data/test_data.csv'
        data = Data(filepath)
        sample = data.sample(nsamples=200)
        
        sample.apply_filter('col-1', 0, inc=1)
        self.assertGreaterEqual(sample.filter_data['col-1'].min(), 0)
        self.assertLess(sample.data['col-1'].min(), 0)
        
        sample.apply_filter('col-2', ub=0, inc=1)
        self.assertLessEqual(sample.filter_data['col-2'].max(), 0)
        self.assertGreater(sample.data['col-2'].max(), 0)

        # data should also be filtered
        self.assertGreaterEqual(data.filter_data['col-1'].min().compute(), 0)
        self.assertLess(data.data['col-1'].min().compute(), 0)
        
        data.apply_filter('col-2', ub=0, inc=1)
        self.assertLessEqual(data.filter_data['col-2'].max().compute(), 0)
        self.assertGreater(data.data['col-2'].max().compute(), 0)

    def test_sample_post_apply_filter(self):
        """ Test sampling after applying a filter to the dataset. """
        filepath = 'test_data/test_data.csv'
        data = Data(filepath)
        
        data.apply_filter('col-1', 0, inc=1)
        self.assertGreaterEqual(data.filter_data['col-1'].min().compute(), 0)
        self.assertLess(data.data['col-1'].min().compute(), 0)
        
        sample = data.sample(nsamples=200)
        self.assertGreaterEqual(sample['col-1'].min(), 0)        
        
        sample.apply_filter('col-2', ub=0, inc=1)
        self.assertLessEqual(sample.filter_data['col-2'].max(), 0)
        self.assertGreater(sample.data['col-2'].max(), 0)

        # data should also be filtered
        self.assertGreaterEqual(data.filter_data['col-1'].min().compute(), 0)
        self.assertLess(data.data['col-1'].min().compute(), 0)
        
        data.apply_filter('col-2', ub=0, inc=1)
        self.assertLessEqual(data.filter_data['col-2'].max().compute(), 0)
        self.assertGreater(data.data['col-2'].max().compute(), 0)

    def test_sample_post_apply_filter_delay(self):
        """ Test sampling after applying a filter to the dataset (delayed). """
        filepath = 'test_data/test_data.csv'
        data = Data(filepath, delay_load=True)

        data.apply_filter('col-1', 0, inc=1)
        
        sample = data.sample(nsamples=200)
        self.assertGreaterEqual(data.filter_data['col-1'].min().compute(), 0)
        self.assertLess(data.data['col-1'].min().compute(), 0)

        self.assertGreaterEqual(sample['col-1'].min(), 0)        
        
        sample.apply_filter('col-2', ub=0, inc=1)
        self.assertLessEqual(sample.filter_data['col-2'].max(), 0)
        self.assertGreater(sample.data['col-2'].max(), 0)

        # data should also be filtered
        self.assertGreaterEqual(data.filter_data['col-1'].min().compute(), 0)
        self.assertLess(data.data['col-1'].min().compute(), 0)
        
        data.apply_filter('col-2', ub=0, inc=1)
        self.assertLessEqual(data.filter_data['col-2'].max().compute(), 0)
        self.assertGreater(data.data['col-2'].max().compute(), 0)

    def test_where(self):
        """ Test the where function in the data class. """
        filepath = 'test_data/test_data.csv'
        data = Data(filepath)
        sample = data.sample(nsamples=200)
        
        p = {'col-0': {'in': ['a', 'c']}, 'col-1': {'lb': 0, 'ub': 1}}
        result = sample.where(p)
        df = sample.data

        self.assertTrue(df.loc[result, 'col-0'].isin(['a', 'c']).all())
        self.assertGreaterEqual(df.loc[result, 'col-1'].min(), 0)
        self.assertLessEqual(df.loc[result, 'col-1'].max(), 1)

        p = {'col-1': {'lb': -np.inf, 'ub': 0}}
        result = sample.where(p)
        indicate = sample.where(p, 1, 0)
        self.assertTrue((indicate.nonzero()[0] == result).all())

    def test_chi_square(self):
        """ Test chi square function. """
        filepath = 'test_data/test_data.csv'
        data = Data(filepath)
        sample = data.sample()
        
        sample.apply_nominal_filter('col-0', ['a', 'c'], inc=1)
        self.assertLess(sample.chi_square('col-96'), 0.05)
        
    def test_apply_nominal_filter(self):
        """ Test applying a nominal filter to the dataset. """
        filepath = 'test_data/test_data.csv'
        data = Data(filepath)
        sample = data.sample(nsamples=200)
                        
        sample.apply_nominal_filter('col-0', ['a', 'c'], inc=1)
        uni = sample.filter_data['col-0'].unique()
        fulluni = sample.data['col-0'].unique()
        
        self.assertListEqual(sorted(uni.tolist()), ['a', 'c'])
        self.assertListEqual(sorted(fulluni.tolist()), ['a', 'b', 'c', 'd'])

        # Test applied to fulldata
        uni = data.filter_data['col-0'].unique().compute()
        fulluni = data.data['col-0'].unique().compute()
        
        self.assertListEqual(sorted(uni.tolist()), ['a', 'c'])
        self.assertListEqual(sorted(fulluni.tolist()), ['a', 'b', 'c', 'd'])
        
        # test exclusion
        sample.reset_data()
        
        sample.apply_nominal_filter('col-0', ['a', 'c'], ftype='Exclude', inc=1)
        uni = sample.filter_data['col-0'].unique()
        fulluni = sample.data['col-0'].unique()
        
        self.assertListEqual(sorted(uni.tolist()), ['b', 'd'])
        self.assertListEqual(sorted(fulluni.tolist()), ['a', 'b', 'c', 'd'])

        # Test applied to fulldata
        data.apply_nominal_filter('col-0', ['a', 'c'], ftype='Exclude', inc=1)
        uni = data.filter_data['col-0'].unique().compute()
        fulluni = data.data['col-0'].unique().compute()
        
        self.assertListEqual(uni.tolist(), ['b', 'd'])
        self.assertListEqual(fulluni.tolist(), ['a', 'b', 'c', 'd'])

        
    def test_apply_custom(self):
        """ Test applying a custom transformation. """
        filepath = parentdir+"/data/sp500_data.csv"
        data = Data(filepath)
        sample = data.sample(nsamples=200)

        min_eps = data.data['eps'].min().compute()        
        sample_min_eps = sample['eps'].min()
        
        sample.apply_custom('eps', 'eps + 100')

        self.assertEqual(sample['eps'].min(), sample_min_eps + 100)
        self.assertEqual(data.data['eps'].min().compute(), min_eps + 100)

        
    def test_create_derived(self):
        """ Test creating a derived attribute. """
        filepath = parentdir+"/data/sp500_data.csv"
        data = Data(filepath)
        sample = data.sample(nsamples=200)


        min_eps = data.data['eps'].min().compute()
        sample_min_eps = sample['eps'].min()
        sample.create_derived('eps_p_100', 'eps + 100')
        
        self.assertEqual(sample['eps_p_100'].min(), sample_min_eps + 100)
        self.assertEqual(data.data['eps_p_100'].min().compute(), min_eps + 100)
        self.assertTrue('eps_p_100' in sample.get_columns())

        expr = "(1 / price/book) * price"
        sample.create_derived("book", expr)
        self.assertTrue('book' in sample.get_columns())

    
    def test_get_sampled_data(self):
        """ Test get_sampled_data method. """
        filepath = parentdir+"/data/sp500_data.csv"

        data = Data(filepath, delay_load=True)
        samp = data.sample(nsamples=200)
        
        samp.drop_column('symbol')
        samp.apply_filter('eps', lb=0)
        samp.apply_rename('eps', 'eps2')
        
        sdf = samp.get_sampled_data(nrows=10)
        self.assertGreaterEqual(sdf['eps2'].min(), 0)
        self.assertFalse('symbol' in sdf.columns)

        sdf = samp.get_sampled_data(nrows=10)
        self.assertGreaterEqual(sdf['eps2'].min(), 0)
        
    def test_get_sampled_data_no_delay(self):
        """ Test get_sampled_data method. """
        filepath = parentdir+"/data/sp500_data.csv"

        data = Data(filepath, delay_load=False)
        samp = data.sample(nsamples=200)
        
        samp.drop_column('symbol')
        samp.apply_filter('eps', lb=0)
        samp.apply_rename('eps', 'eps2')
        
        sdf = samp.get_sampled_data(nrows=100)
        self.assertGreaterEqual(sdf['eps2'].min(), 0)
        self.assertFalse('symbol' in sdf.columns)

        sdf = samp.get_sampled_data(nrows=100)
        self.assertGreaterEqual(sdf['eps2'].min(), 0)
        
    def test_checkpoint(self):
        """ Test saving and resetting to a checkpoint. """
        filepath = 'test_data/test_data.csv'
        data = Data(filepath, delay_load=False)
        sample = data.sample(nsamples=200)
        
        sample.apply_filter('col-2', lb=0)
        sample.create_checkpoint()
        self.assertGreaterEqual(sample['col-2'].min(), 0)
        self.assertGreaterEqual(data['col-2'].min().compute(), 0)

        self.assertFalse(sample._is_transformed['col-2'])
        sample.apply_clamp('col-2', 0.2, ub=np.inf)
        self.assertTrue(sample._is_transformed['col-2'])
        
        sample.apply_filter('col-2', lb=1)

        sample.set_type('col-0', 'Ordinal', ['a', 'b', 'c', 'd'])
        sample.set_ordering('col-0', ['d', 'c', 'b', 'a'])
        self.assertListEqual(sample.orderings['col-0'], ['d', 'c', 'b', 'a'])
        self.assertListEqual(data.orderings['col-0'], ['d', 'c', 'b', 'a'])
        
        sample.restore_checkpoint();
        self.assertLess(sample['col-2'].min(), 1)
        self.assertLess(data['col-2'].min().compute(), 1)
        self.assertFalse(sample._is_transformed['col-2'])

        # ordering should be reset
        self.assertTrue(all(sample.orderings[c] is None for c in sample.columns))
        self.assertTrue(all(data.orderings[c] is None for c in data.columns))

        
        # test dropping
        sample.drop_columns(['col-0', 'col-1'])
        self.assertFalse('col-0' in sample.columns)
        self.assertFalse('col-1' in sample.columns)
        self.assertFalse('col-0' in data.columns)
        self.assertFalse('col-1' in data.columns)

        sample.restore_checkpoint()
        self.assertTrue('col-0' in sample.columns)
        self.assertTrue('col-1' in sample.columns)
        self.assertTrue('col-0' in data.columns)
        self.assertTrue('col-1' in data.columns)

    def test_checkpoint_inmem(self):
        """ Test saving and resetting to a checkpoint. """
        filepath = 'test_data/test_data.csv'
        data = DataInMem(filepath, delay_load=False)
        sample = data.sample(nsamples=200)

        
        sample.apply_filter('col-2', lb=0)
        sample.create_checkpoint()
        
        self.assertGreaterEqual(sample['col-2'].min(), 0)
        self.assertGreaterEqual(data['col-2'].min(), 0)

        self.assertFalse(sample._is_transformed['col-2'])
        sample.apply_clamp('col-2', 0.2, ub=np.inf)
        self.assertTrue(sample._is_transformed['col-2'])
        
        sample.apply_filter('col-2', lb=1)

        sample.set_type('col-0', 'Ordinal', ['a', 'b', 'c', 'd'])
        sample.set_ordering('col-0', ['d', 'c', 'b', 'a'])
        self.assertListEqual(sample.orderings['col-0'], ['d', 'c', 'b', 'a'])
        self.assertListEqual(data.orderings['col-0'], ['d', 'c', 'b', 'a'])
        sample.restore_checkpoint()
        
        self.assertLess(sample['col-2'].min(), 1)
        self.assertLess(data['col-2'].min(), 1)
        self.assertFalse(sample._is_transformed['col-2'])
        
        # ordering should be reset
        self.assertTrue(all(sample.orderings[c] is None for c in sample.columns))
        self.assertTrue(all(data.orderings[c] is None for c in data.columns))

        
        # test dropping
        sample.drop_columns(['col-0', 'col-1'])
        self.assertFalse('col-0' in sample.columns)
        self.assertFalse('col-1' in sample.columns)
        self.assertFalse('col-0' in data.columns)
        self.assertFalse('col-1' in data.columns)

        sample.restore_checkpoint()
        self.assertTrue('col-0' in sample.columns)
        self.assertTrue('col-1' in sample.columns)
        self.assertTrue('col-0' in data.columns)
        self.assertTrue('col-1' in data.columns)
        

    def test_checkpoint_delay_1(self):
        """ Test saving and resetting to a checkpoint. """
        filepath = 'test_data/test_data.csv'
        data = Data(filepath, delay_load=True)
        sample = data.sample(nsamples=200)
        
        sample.apply_filter('col-2', lb=0)
        sample.create_checkpoint()

        self.assertFalse(sample._is_transformed['col-2'])
        sample.apply_clamp('col-2', 0.2, ub=np.inf)
        self.assertTrue(sample._is_transformed['col-2'])
        
        sample.apply_filter('col-2', lb=1)

        sample.set_type('col-0', 'Ordinal', ['a', 'b', 'c', 'd'])
        sample.set_ordering('col-0', ['d', 'c', 'b', 'a'])
        self.assertListEqual(sample.orderings['col-0'], ['d', 'c', 'b', 'a'])
        self.assertListEqual(data.orderings['col-0'], ['d', 'c', 'b', 'a'])

        sample.restore_checkpoint();

        self.assertFalse(sample._is_transformed['col-2'])

        # ordering should be reset
        self.assertTrue(all(sample.orderings[c] is None for c in sample.columns))
        self.assertTrue(all(data.orderings[c] is None for c in data.columns))
        
        # test dropping
        sample.drop_columns(['col-0', 'col-1'])
        self.assertFalse('col-0' in sample.columns)
        self.assertFalse('col-1' in sample.columns)
        self.assertFalse('col-0' in data.columns)
        self.assertFalse('col-1' in data.columns)

        sample.restore_checkpoint()
        self.assertTrue('col-0' in sample.columns)
        self.assertTrue('col-1' in sample.columns)
        self.assertTrue('col-0' in data.columns)
        self.assertTrue('col-1' in data.columns)

        # first filter should've been applied
        self.assertGreaterEqual(sample['col-2'].min(), 0)
        self.assertGreaterEqual(data['col-2'].min().compute(), 0)

        # second filter should've been removed
        self.assertLess(sample['col-2'].min(), 1)
        self.assertLess(data['col-2'].min().compute(), 1)


    def test_checkpoint_delay_2(self):
        """ Test saving and resetting to a checkpoint. """
        filepath = 'test_data/test_data.csv'
        data = Data(filepath, delay_load=True)
        sample = data.sample(nsamples=200)
        
        sample.apply_filter('col-2', lb=0)
        sample.create_checkpoint()

        self.assertFalse(data._is_transformed['col-2'])
        self.assertFalse(sample._is_transformed['col-2'])
        sample.apply_clamp('col-2', 0.2, ub=np.inf)
        self.assertTrue(data._is_transformed['col-2'])
        self.assertTrue(sample._is_transformed['col-2'])
        
        # forces a call to load_to_dask
        self.assertGreaterEqual(sample['col-2'].min(), 0)
        self.assertGreaterEqual(sample.fulldata['col-2'].min().compute(), 0)
        
        sample.apply_filter('col-2', lb=1)
        sample.restore_checkpoint();
        self.assertLess(sample['col-2'].min(), 1)
        self.assertLess(data['col-2'].min().compute(), 1)
        self.assertFalse(data._is_transformed['col-2'])
        self.assertFalse(sample._is_transformed['col-2'])

        # test ordering
        sample.set_type('col-0', 'Ordinal', ['a', 'b', 'c', 'd'])
        sample.set_ordering('col-0', ['d', 'c', 'b', 'a'])
        self.assertListEqual(sample.orderings['col-0'], ['d', 'c', 'b', 'a'])
        self.assertListEqual(data.orderings['col-0'], ['d', 'c', 'b', 'a'])

        
        # test dropping
        sample.drop_columns(['col-0', 'col-1'])
        self.assertFalse('col-0' in sample.columns)
        self.assertFalse('col-1' in sample.columns)
        self.assertFalse('col-0' in data.columns)
        self.assertFalse('col-1' in data.columns)

        sample.restore_checkpoint()
        self.assertTrue('col-0' in sample.columns)
        self.assertTrue('col-1' in sample.columns)
        self.assertTrue('col-0' in data.columns)
        self.assertTrue('col-1' in data.columns)

        # ordering should be reset
        self.assertTrue(all(sample.orderings[c] is None for c in sample.columns))
        self.assertTrue(all(data.orderings[c] is None for c in data.columns))

        
    def test_reset_data(self):
        """ Test reset_data method """
        filepath = 'test_data/test_data.csv'
        data = Data(filepath)
        sample = data.sample()
        
        sample.apply_filter('col-1', 0)
        sample.create_derived('derived', 'col-1 * 2')
        self.assertGreaterEqual(sample['col-1'].min(), 0)
        self.assertGreaterEqual(data.filter_data['col-1'].min().compute(), 0)
        self.assertTrue('derived' in data.types)
        self.assertTrue('derived' in sample.types)

        sample.set_type('col-0', 'Ordinal', ['a', 'b', 'c', 'd'])
        sample.set_ordering('col-0', ['d', 'c', 'b', 'a'])
        self.assertListEqual(sample.orderings['col-0'], ['d', 'c', 'b', 'a'])
        self.assertListEqual(data.orderings['col-0'], ['d', 'c', 'b', 'a'])
        
        sample.reset_data()
        self.assertLess(sample['col-1'].min(), 0)        
        self.assertLess(data.filter_data['col-1'].min().compute(), 0)        
        self.assertFalse('derived' in data.types)
        self.assertFalse('derived' in sample.types)

        # ordering should be reset
        self.assertTrue(all(sample.orderings[c] is None for c in sample.columns))
        self.assertTrue(all(data.orderings[c] is None for c in data.columns))

        
    def test_apply_normalize(self):
        """ Test normalizing transformation. """
        filepath = parentdir+"/data/sp500_data.csv"
        data = Data(filepath)
        sample = data.sample(nsamples=200)

        sample.apply_normalize("current_ratio", 0, 1)
        self.assertEqual(sample['current_ratio'].min(), 0)
        self.assertEqual(sample['current_ratio'].max(), 1)        
        self.assertEqual(data.data['current_ratio'].min().compute(), 0)
        self.assertEqual(data.data['current_ratio'].max().compute(), 1)        

        sample.reset_data()
    
        sample.apply_normalize("current_ratio", -10, 20)
        self.assertEqual(sample['current_ratio'].min(), -10)
        self.assertAlmostEqual(sample['current_ratio'].max(), 20, 2)        
        self.assertEqual(data.data['current_ratio'].min().compute(), -10)
        self.assertEqual(data.data['current_ratio'].max().compute(), 20)        

        sample.reset_data()
        
        sample.apply_filter("current_ratio", 1)
        sample.apply_normalize("current_ratio", 0, 1)

        self.assertEqual(sample['current_ratio'].min(), 0)
        self.assertEqual(sample['current_ratio'].max(), 1)        
        self.assertEqual(data.filter_data['current_ratio'].min().compute(), 0)
        self.assertEqual(data.filter_data['current_ratio'].max().compute(), 1)        


    def test_apply_log(self):
        """ Test apply log method. """
        filepath = 'test_data/test_data.csv'
        data = Data(filepath)
        sample = data.sample(nsamples=200)

        cvec = data.data.partitions[0].compute()['col-1']        
        v1 = cvec[0]
        sample_v1 = sample['col-1'].iloc[0]
        
        # Catch warnings related to taking the log of negative values
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            sample.apply_log('col-1')

            col1 = data.data['col-1'].sample(frac=0.1).compute()
            sample_col1 = sample['col-1']
            
            # all infs should be replaced with nans
            self.assertFalse(np.isinf(col1).any())
            self.assertFalse(np.isinf(sample_col1).any())
        
            vlog = data.data.partitions[0].compute()['col-1'].iloc[0]
            sample_vlog = sample['col-1'].iloc[0]

            if sample_v1 <= 0:  # should be nan
                self.assertTrue(np.isnan(sample_vlog))
            else:
                self.assertAlmostEqual(sample_vlog, (np.log(sample_v1) / np.log(10)), 3)

            if v1 <= 0:  # should be nan
                self.assertTrue(np.isnan(vlog))
            else:
                self.assertAlmostEqual(vlog, (np.log(v1) / np.log(10)), 3)

    def test_apply_clamp(self):
        """ Test applying the clamp method. """
        filepath = 'test_data/test_data.csv'
        data = Data(filepath)
        sample = data.sample()

        sample.apply_clamp('col-1', 0, 1)
        fmin, fmax = dask.compute(data.data['col-1'].min(),
                                  data.data['col-1'].max())
        smin, smax = sample['col-1'].min(), sample['col-1'].max()
        
        self.assertEqual(fmin, 0)
        self.assertEqual(fmax, 1)
        
        self.assertEqual(smin, 0)
        self.assertEqual(smax, 1)
                
    def test_apply_fill_missing_pad(self):
        """ Test data imputation method (Pad). """
        filepath = parentdir+"/data/sp500_data.csv"

        df = pd.read_csv(filepath)
        data = Data(filepath)
        sample = data.sample()
        
        sample.apply_fill_missing("current_ratio", "Pad", None)

        miss_df = df["current_ratio"].fillna(method='ffill').fillna(method='bfill')
        miss_data = sample['current_ratio']
        
        # assert list almost equal
        self.assertTrue(np.all((miss_data-miss_df).abs() < 1e-3))

        # all missing values are replaced
        self.assertFalse(sample['current_ratio'].isna().any())                
        self.assertFalse(data.data['current_ratio'].isna().any().compute())

    def test_apply_fill_missing_zero(self):
        """ Test data imputation method (Zero). """
        filepath = parentdir+"/data/sp500_data.csv"

        df = pd.read_csv(filepath)
        data = Data(filepath)
        sample = data.sample()
        
        sample.apply_fill_missing("current_ratio", "Zero", None)

        miss_df = df["current_ratio"].fillna(0)
        miss_data = sample['current_ratio']
        
        # assert list almost equal
        self.assertTrue(np.all((miss_data-miss_df).abs() < 1e-3))

        # all missing values are replaced
        self.assertFalse(sample['current_ratio'].isna().any())                
        self.assertFalse(data.data['current_ratio'].isna().any().compute())

    def test_apply_fill_missing_replace(self):
        """ Test data imputation method (Replace). """
        filepath = parentdir+"/data/stroke.csv"

        df = pd.read_csv(filepath)
        data = Data(filepath)
        sample = data.sample()

        # check that col has missing value
        self.assertTrue(data.data['smoking_status'].isna().any().compute())
        
        sample.apply_fill_missing("smoking_status", "Replace", "NA")
        
        # all missing values are replaced
        self.assertFalse(sample['smoking_status'].isna().any())              
        self.assertTrue("NA" in list(sample['smoking_status']))
        self.assertFalse(data.data['smoking_status'].isna().any().compute())
        self.assertTrue("NA" in list(data.data['smoking_status']))

    def test_apply_filter_w_nans(self):
        """ Test data filtering doesn't include nans. """
        filepath = parentdir+"/data/stroke.csv"

        df = pd.read_csv(filepath)
        data = Data(filepath)        
        sample = data.sample(100_000)
        
        # bmi contains missing values
        sample.apply_filter('bmi', lb=58.4)
        
        data_filt_size = sample.get_counts()['filtered']

        # this will exclude missing values
        df_filt_size = (df['bmi'] >= 58.4).sum()

        # check the sizes are the same
        self.assertEqual(data_filt_size, df_filt_size)

    def test_apply_filter_exclude(self):
        """ Test data filtering doesn't include nans. """
        filepath = parentdir+"/data/stroke.csv"

        df = pd.read_csv(filepath)
        data = Data(filepath)        
        sample = data.sample(100_000)
        
        # bmi contains missing values
        sample.apply_filter('bmi', lb=58.4, ftype='Exclude')
        
        data_filt_size = sample.get_counts()['filtered']

        # count items outside filter and exclude missing values
        df_filt_size = df['bmi'].count() - (df['bmi'] >= 58.4).sum()

        # check the sizes are the same
        self.assertEqual(data_filt_size, df_filt_size)

    def test_apply_drop_missing(self):
        """ Test applying a dropping rows with missing values in a column in the dataset. """
        filepath = parentdir+"/data/sp500_data.csv"
        data = Data(filepath)
        sample = data.sample()
                
        sample.apply_drop_na('current_ratio', inc=1)
        counts = sample.get_counts()
        self.assertEqual(counts['filtered'], 317)
        self.assertFalse(sample.has_na('current_ratio'))

        # test different column
        sample.reset_data()
        
        sample.apply_drop_na('operating_leverage', inc=1)
        counts = sample.get_counts()
        self.assertEqual(counts['filtered'], 283)
        self.assertFalse(sample.has_na('operating_leverage'))

        
    def test_apply_replace(self):
        filepath = parentdir+"/data/sp500_data.csv"
        data = Data(filepath)
        sample = data.sample()
        
        df = pd.read_csv(filepath)

        rep_df = list(df['sector'].replace({"Utilities": "OtherCat", "Materials": "OtherCat"}))
        sample.apply_replace('sector', ["Utilities", "Materials"], "OtherCat")
        self.assertListEqual(list(sample['sector']), rep_df)
        self.assertListEqual(list(data.data['sector'].compute()), rep_df)

    def test_apply_cell_split_ordered(self):
        """ Test apply_cell_split method. """
        filepath = parentdir+"/data/final_track_data.csv"
        data = Data(filepath, options={'encoding': 'utf-8'})
        sample = data.sample()
        
        sample.apply_cell_split('artist_genre', ',', strip="'", quote="\'\"")
        self.assertTrue('artist_genre_pos_0' in sample.columns)
        self.assertTrue('artist_genre_pos_1' in sample.columns)
        self.assertTrue('artist_genre_pos_2' in sample.columns)
        self.assertTrue('artist_genre_pos_3' in sample.columns)

    def test_apply_cell_split_unordered(self):
        """ Test apply_cell_split method. """
        filepath = parentdir+"/data/final_track_data.csv"
        data = Data(filepath, options={'encoding': 'utf-8'})
        sample = data.sample()
        
        sample.apply_cell_split('artist_genre', ',', ordered=False, strip="[]", quote="\'\"")
        
        self.assertTrue('artist_genre_dance pop' in sample.columns)
        self.assertTrue('artist_genre_pop' in sample.columns)
        self.assertTrue('artist_genre_zolo' in sample.columns)
        self.assertTrue("artist_genre_children's music" in sample.columns)
        
        self.assertEqual(sample['artist_genre_pop'].min(), 0)
        self.assertEqual(sample['artist_genre_pop'].max(), 1)

        self.assertEqual(sample['artist_genre_zolo'].min(), 0)
        self.assertEqual(sample['artist_genre_zolo'].max(), 1)
        
        self.assertEqual(data['artist_genre_pop'].min().compute(), 0)
        self.assertEqual(data['artist_genre_pop'].max().compute(), 1)

        self.assertEqual(data['artist_genre_zolo'].min().compute(), 0)
        self.assertEqual(data['artist_genre_zolo'].max().compute(), 1)

        self.assertTrue("artist_genre_children's music" in data.columns)
        
    def test_apply_onehot(self):
        """ Test apply_onehot method. """
        filepath = 'test_data/test_data.csv'
        data = Data(filepath)
        sample = data.sample()
        
        N, M = data.shape
        sample.apply_onehot('col-0')

        self.assertEqual(sample.shape[1], M+4)
        self.assertEqual(data.shape[1], M+4)

        self.assertEqual(data.data['col-0_a'].sum().compute(), N/4)
        self.assertEqual(data.data['col-0_b'].sum().compute(), N/4)
        self.assertEqual(data.data['col-0_c'].sum().compute(), N/4)
        self.assertEqual(data.data['col-0_d'].sum().compute(), N/4)

        self.assertTrue('col-0_a' in data.columns)
        self.assertTrue('col-0_b' in data.columns)
        self.assertTrue('col-0_c' in data.columns)
        self.assertTrue('col-0_d' in data.columns)        

        self.assertTrue('col-0_a' in sample.columns)
        self.assertTrue('col-0_b' in sample.columns)
        self.assertTrue('col-0_c' in sample.columns)
        self.assertTrue('col-0_d' in sample.columns)        

        # test the column names are updated appropriatly
        sample.apply_onehot('col-0')  
        self.assertTrue('col-0_a_(1)' in data.columns)
        self.assertTrue('col-0_b_(1)' in data.columns)
        self.assertTrue('col-0_c_(1)' in data.columns)
        self.assertTrue('col-0_d_(1)' in data.columns)

        self.assertTrue('col-0_a_(1)' in sample.columns)
        self.assertTrue('col-0_b_(1)' in sample.columns)
        self.assertTrue('col-0_c_(1)' in sample.columns)
        self.assertTrue('col-0_d_(1)' in sample.columns)

        self.assertTrue('col-0_a' in data.types)
        self.assertTrue('col-0_b' in data.types)
        self.assertTrue('col-0_c' in data.types)
        self.assertTrue('col-0_d' in data.types)

        self.assertTrue('col-0_a' in sample.types)
        self.assertTrue('col-0_b' in sample.types)
        self.assertTrue('col-0_c' in sample.types)
        self.assertTrue('col-0_d' in sample.types)

        self.assertTrue('col-0_a' in data._orderings)
        self.assertTrue('col-0_b' in data._orderings)
        self.assertTrue('col-0_c' in data._orderings)
        self.assertTrue('col-0_d' in data._orderings)

        self.assertTrue('col-0_a' in sample._orderings)
        self.assertTrue('col-0_b' in sample._orderings)
        self.assertTrue('col-0_c' in sample._orderings)
        self.assertTrue('col-0_d' in sample._orderings)


    def test_apply_onehot_bind(self):
        """ Test apply_onehot method with bound column. """
        filepath = 'test_data/test_data.csv'
        data = Data(filepath)
        sample = data.sample()
        
        N, M = data.shape
        sample.apply_onehot('col-0', bind='col-1')
        
        c1a = data.data.loc[data['col-0']=='a', 'col-1'].sum().compute()
        c1b = data.data.loc[data['col-0']=='b', 'col-1'].sum().compute()
        c1c = data.data.loc[data['col-0']=='c', 'col-1'].sum().compute()
        c1d = data.data.loc[data['col-0']=='d', 'col-1'].sum().compute()

        self.assertAlmostEqual(data.data['col-0_a_col-1'].sum().compute(), c1a)
        self.assertAlmostEqual(data.data['col-0_b_col-1'].sum().compute(), c1b)
        self.assertAlmostEqual(data.data['col-0_c_col-1'].sum().compute(), c1c)
        self.assertAlmostEqual(data.data['col-0_d_col-1'].sum().compute(), c1d)

        s1a = sample.data.loc[sample['col-0']=='a', 'col-1'].sum()
        s1b = sample.data.loc[sample['col-0']=='b', 'col-1'].sum()
        s1c = sample.data.loc[sample['col-0']=='c', 'col-1'].sum()
        s1d = sample.data.loc[sample['col-0']=='d', 'col-1'].sum()
        
        self.assertAlmostEqual(sample['col-0_a_col-1'].sum(), s1a)
        self.assertAlmostEqual(sample['col-0_b_col-1'].sum(), s1b)
        self.assertAlmostEqual(sample['col-0_c_col-1'].sum(), s1c)
        self.assertAlmostEqual(sample['col-0_d_col-1'].sum(), s1d)

        self.assertEqual(data.shape[1], M+4)

        self.assertTrue('col-0_a_col-1' in sample.columns)
        self.assertTrue('col-0_b_col-1' in sample.columns)
        self.assertTrue('col-0_c_col-1' in sample.columns)
        self.assertTrue('col-0_d_col-1' in sample.columns)

        self.assertEqual(sample.types['col-0_a_col-1'], 'Numerical')
        self.assertEqual(sample.types['col-0_b_col-1'], 'Numerical')
        self.assertEqual(sample.types['col-0_c_col-1'], 'Numerical')
        self.assertEqual(sample.types['col-0_d_col-1'], 'Numerical')

        # test the column names are updated appropriatly
        sample.apply_onehot('col-0', bind='col-1')  
        self.assertTrue('col-0_a_col-1_(1)' in sample.columns)
        self.assertTrue('col-0_b_col-1_(1)' in sample.columns)
        self.assertTrue('col-0_c_col-1_(1)' in sample.columns)
        self.assertTrue('col-0_d_col-1_(1)' in sample.columns)

        self.assertTrue('col-0_a_col-1_(1)' in sample._orderings)
        self.assertTrue('col-0_b_col-1_(1)' in sample._orderings)
        self.assertTrue('col-0_c_col-1_(1)' in sample._orderings)
        self.assertTrue('col-0_d_col-1_(1)' in sample._orderings)

        
    def test_aggregate_by_index(self):
        """ Test aggregate_by_index method. """
        filepath = 'test_data/test_data.csv'
        data = Data(filepath)
        sample = data.sample(nsamples=500)
        
        index_col = 'col-0'
        agg_map = [
            {
                'aggFunc': {'value': "mean", 'label': "Mean", 'type': "Numerical"},
                'attrs': [ {'value': c, 'label': c, 'type': "Numerical"} for c in data.columns if c != index_col and c not in ['col-2', 'col-96', 'col-97', 'col-98', 'col-99'] ]
            },
            {
                'aggFunc': {'value': "max_count", 'label': "Most Frequent", 'type': "Nominal"},
                'attrs': [{'value': "col-99", 'label': "col-99", 'type': "Nominal"}]
            },
            {
                'aggFunc': {'value': "ohe", 'label': "One-hot encoding", 'type': "Nominal"},
                'attrs': [{'value': "col-96", 'label': "col-96", 'type': "Nominal"}],
                'bind': [
                    {
                        'attr': { 'label': "None", 'value': "None", 'type': "Numerical" },
                        'func': { 'value': "max", 'label': "Max"}
                    },
                    {
                        'attr': { 'label': "col-2", 'value': "col-2", 'type': "Numerical" },
                        'func': { 'value': "mean", 'label': "Mean"}
                    }
                ]
            },
            {
                'aggFunc': {'value': "ohe", 'label': "One-hot encoding", 'type': "Nominal"},
                'attrs': [{'value': "col-97", 'label': "col-97", 'type': "Nominal"}],
                'bind': [
                    {
                        'attr': { 'label': "col-2", 'value': "col-2", 'type': "Numerical" },
                        'func': { 'value': "mean", 'label': "Mean"}
                    },
                    {
                        'attr': { 'label': "col-99", 'value': "col-99", 'type': "Nominal" },
                        'func': { 'value': "max_count", 'label': "Most Frequent"}
                    }
                ]
            }
        ]       
        
        
        result = data.aggregate_by_index(index_col, agg_map)
        self.assertTrue('col-2' in data.columns)
        self.assertFalse('col-2' in result.columns)

        # ohe columns should be in result
        self.assertTrue('col-96_e_max' in result.columns)
        self.assertTrue('col-96_f_max' in result.columns)
        self.assertTrue('col-96_e_col-2_mean' in result.columns)
        self.assertTrue('col-96_f_col-2_mean' in result.columns)
        self.assertTrue('col-97_e_col-2_mean' in result.columns)
        self.assertTrue('col-97_f_col-2_mean' in result.columns)
        self.assertTrue('col-97_e_col-99_max_count' in result.columns)
        self.assertTrue('col-97_f_col-99_max_count' in result.columns)
        self.assertTrue('col-99_max_count' in result.columns)

        for c in data.columns:
            if c != index_col and c not in ['col-2', 'col-96', 'col-97', 'col-98', 'col-99']:
                self.assertTrue(c+'_mean' in result.columns)

        self.assertListEqual(result['col-97_e_col-99_max_count'].compute().tolist(),
                             ['x', 'y', 'y', np.nan])
        
        # ohe columns should not be in data
        self.assertFalse('col-96_e_max' in data.columns)
        self.assertFalse('col-96_f_max' in data.columns)
        self.assertFalse('col-96_e_col-2_mean' in data.columns)
        self.assertFalse('col-96_f_col-2_mean' in data.columns)
        self.assertFalse('col-97_e_col-2_mean' in data.columns)
        self.assertFalse('col-97_f_col-2_mean' in data.columns)
        self.assertFalse('col-97_e_col-99_max_count' in data.columns)
        self.assertFalse('col-97_f_col-99_max_count' in data.columns)
        self.assertFalse('col-99_max_count' in data.columns)
        
        for c in data.columns:
            if c != index_col and c not in ['col-2', 'col-96', 'col-97', 'col-98', 'col-99']:
                self.assertFalse(c+'_mean' in data.columns)
        
        self.assertEqual(sample.shape[0], 500)
        self.assertEqual(result.shape[0], 4)
        
        
    def test_apply_rank(self):
        """ Test apply_rank method. """
        filepath = 'test_data/test_data.csv'
        data = Data(filepath)
        sample = data.sample()
        
        N, M = data.shape
        sample.apply_rank('col-0', 'col-24', 2)
        
        self.assertEqual(data.shape[1], M+1)

        self.assertTrue('col-0_rank2_col-24' in data.columns)
        self.assertTrue('col-0_rank2_col-24' in sample.columns)
        self.assertEqual((data['col-0_rank2_col-24']=='rank_0').sum().compute(), N/2)
        self.assertEqual((data['col-0_rank2_col-24']=='rank_1').sum().compute(), N/2)

        sample.apply_rank('col-0', 'col-24', 2)
        self.assertTrue('col-0_rank2_col-24_(1)' in sample.columns)

        # test supplying a name for the created attribute
        sample.apply_rank('col-0', 'col-24', 2, 'asdf')
        self.assertTrue('asdf' in sample.columns)                
        self.assertFalse('col-0_rank2_col-24_(2)' in sample.columns)                

    def test_apply_rank_rename(self):
        """ Test apply_rank method. """
        filepath = 'test_data/test_data.csv'
        data = Data(filepath)
        sample = data.sample()
        
        N, M = sample.shape
        sample.apply_rank('col-0', 'col-24', 2)
        
        self.assertEqual(sample.shape[1], M+1)
        
        self.assertTrue('col-0_rank2_col-24' in sample.columns)
        self.assertEqual((data['col-0_rank2_col-24']=='rank_0').sum().compute(), N/2)
        self.assertEqual((data['col-0_rank2_col-24']=='rank_1').sum().compute(), N/2)

        sample.apply_rename('col-0_rank2_col-24', 'newcol')
        self.assertFalse('col-0_rank2_col-24' in data.columns)
        self.assertTrue('newcol' in data.columns)

        self.assertFalse('col-0_rank2_col-24' in sample.columns)
        self.assertTrue('newcol' in sample.columns)

    def test_apply_rank_bound_missing(self):
        """ Test apply_rank method. """
        filepath = 'test_data/test_data.csv'
        data = Data(filepath)
        sample = data.sample()
        
        sample.set_type('col-25', 'Numerical')
                
        N, M = sample.shape
        
        # sanity check that col-25 contains missing values
        self.assertTrue(sample['col-25'].isna().any())
        
        sample.apply_rank('col-0', 'col-25', 2)
        
        self.assertEqual(sample.shape[1], M+1)

        self.assertTrue(data['col-0_rank2_col-25'].isna().any().compute())
        self.assertTrue(sample['col-0_rank2_col-25'].isna().any())

        self.assertTrue('col-0_rank2_col-25' in data.columns)
        self.assertTrue('col-0_rank2_col-25' in sample.columns)
        
        self.assertEqual((data['col-0_rank2_col-25']=='rank_0').sum().compute(), N/2)
        self.assertEqual((data['col-0_rank2_col-25']=='rank_1').sum().compute(), N/4)

        sample.apply_rank('col-0', 'col-25', 2)
        self.assertTrue('col-0_rank2_col-25_(1)' in sample.columns)                

        
    def test_apply_rank_missing_bound_missing(self):
        """ Test apply_rank method. """
        filepath = 'test_data/test_data.csv'
        data = Data(filepath)
        sample = data.sample()
        
        sample.set_type('col-25', 'Numerical')
                
        N, M = sample.shape
        
        # sanity check that col-25 contains missing values
        self.assertTrue(sample['col-25'].isna().any())
        
        sample.apply_rank('col-11', 'col-25', 2)
        
        self.assertEqual(data.shape[1], M+1)
        self.assertEqual(sample.shape[1], M+1)

        self.assertTrue('col-11_rank2_col-25' in data.columns)
        self.assertTrue('col-11_rank2_col-25' in sample.columns)

        self.assertTrue(data['col-11_rank2_col-25'].isna().any().compute())
        self.assertTrue(sample['col-11_rank2_col-25'].isna().any())

        self.assertEqual((data['col-11_rank2_col-25']=='rank_0').sum().compute(), N/4)
        self.assertEqual((data['col-11_rank2_col-25']=='rank_1').sum().compute(), N/4)

        sample.apply_rank('col-11', 'col-25', 2)
        self.assertTrue('col-11_rank2_col-25_(1)' in sample.columns)

    def test_apply_rank_missing(self):
        """ Test apply_rank method with missing values. """
        filepath = 'test_data/test_data.csv'
        data = Data(filepath)
        sample = data.sample()
        
        N, M = data.shape
        sample.apply_rank('col-11', 'col-24', 2)
        
        self.assertEqual(data.shape[1], M+1)
        
        self.assertTrue('col-11_rank2_col-24' in data.columns)
        self.assertTrue('col-11_rank2_col-24' in sample.columns)
        self.assertEqual((data['col-11_rank2_col-24']=='rank_0').sum().compute(), N/2)

        # Last rank excludes missing values
        self.assertEqual((data['col-11_rank2_col-24']=='rank_1').sum().compute(), N/4)

        sample.apply_rank('col-11', 'col-24', 2)
        self.assertTrue('col-11_rank2_col-24_(1)' in sample.columns)
        
    def test_get_type(self):
        """ Test getting an individual column type. """
        filepath = parentdir+"/data/sp500_data.csv"
        
        data = Data(filepath)
        sample = data.sample(nsamples=200)
        
        type_eps = sample.get_type("eps")
        self.assertEqual(type_eps, "Numerical")

        type_sector = sample.get_type("sector")
        self.assertEqual(type_sector, "Nominal")


    def test_apply_rename(self):
        filepath = parentdir+"/data/sp500_data.csv"
        
        data = Data(filepath)
        sample = data.sample(nsamples=200)
        
        sample.apply_rename("eps", "neweps")

        self.assertFalse("eps" in sample.columns)
        self.assertTrue("neweps" in sample.columns)
        self.assertTrue("neweps" in sample.columns)
        self.assertTrue("neweps" in sample.types)
        self.assertFalse("eps" in sample.types)
        self.assertEqual(sample.types["neweps"], 'Numerical')
         
        self.assertFalse("eps" in data.columns)
        self.assertTrue("neweps" in data.columns)
        self.assertTrue("neweps" in data.columns)
        self.assertTrue("neweps" in data.types)
        self.assertFalse("eps" in data.types)
        self.assertEqual(data.types["neweps"], 'Numerical')
        

    def test_describe(self):
        """ Test describe method on real data. """
        filepath = parentdir+"/data/sp500_data.csv"
        
        data = Data(filepath)
        sample = data.sample()
        
        df = pd.read_csv(filepath)
        desc_df = df.describe(include='all')

        desc_data = sample.describe()
        self.assertEqual(desc_df.shape, desc_data.shape)

        self.assertAlmostEqual(desc_data["eps"]["min"], desc_df["eps"]["min"])
        self.assertAlmostEqual(desc_data["eps"]["max"], desc_df["eps"]["max"])
        self.assertAlmostEqual(desc_data["eps"]["50%"], desc_df["eps"]["50%"])

        desc_eps = sample.describe_col('eps')
        self.assertAlmostEqual(desc_eps["min"], desc_df["eps"]["min"])
        self.assertAlmostEqual(desc_eps["max"], desc_df["eps"]["max"])
        self.assertAlmostEqual(desc_eps["50%"], desc_df["eps"]["50%"])        
        
        sample.apply_filter('eps', lb=0)
        desc_filt = sample.describe(columns=['eps', 'stddev'])
        
        self.assertGreater(desc_filt['eps']['min'], desc_data['eps']['min'])
        self.assertGreater(desc_filt['eps']['min'], 0)
        self.assertListEqual(desc_filt.columns.tolist(), ['eps', 'stddev'])

    def test_describe_col_drop_inf(self):
        """ Test the decribe_col method with the drop_inf flag set to true. """
        filepath = 'test_data/test_data.csv'
        data = Data(filepath)
        sample = data.sample()

        desc_data = sample.describe_col('col-3')
        desc_data_no_inf = sample.describe_col('col-3', drop_inf=True)
        self.assertTrue(np.isinf(desc_data['max']))
        self.assertFalse(np.isinf(desc_data_no_inf['max']))

    def test_has_na(self):
        """ Test the has_na function. """
        filepath = parentdir+"/data/sp500_data.csv"
        
        data = Data(filepath)
        sample = data.sample()
        
        data_na_mat = sample.has_na()
        self.assertTrue(data_na_mat["current_ratio"])
        self.assertTrue(data_na_mat["operating_leverage"])
        self.assertFalse(data_na_mat["eps"])
        self.assertFalse(data_na_mat["sector"])

        self.assertTrue(sample.has_na('current_ratio'))
        self.assertFalse(sample.has_na('eps'))
    
    def test_count_na(self):
        """ Test the count_na function. """
        filepath = parentdir+"/data/sp500_data.csv"

        data = Data(filepath)
        sample = data.sample()

        data_na_mat = sample.count_na()
        self.assertEqual(data_na_mat["current_ratio"], 57)
        self.assertEqual(data_na_mat["operating_leverage"], 91)
        self.assertEqual(data_na_mat["eps"], 0)
        self.assertEqual(data_na_mat["sector"], 0)

        self.assertEqual(sample.count_na('current_ratio'), 57)
        self.assertEqual(sample.count_na('eps'), 0)

    def test_histogram(self):
        """ Test the histogram method. """
        filepath = 'test_data/test_data.csv'
        
        data = Data(filepath)
        sample = data.sample()
        df = pd.read_csv(filepath)

        sample.apply_filter('col-3', lb=0)
        
        col = df.loc[(df['col-3'] > 0) & np.isfinite(df['col-3']), "col-3"]
        count, division = np.histogram(col, 30)
        count_data, division_data = sample.histogram("col-3", bins=30)

        count_data_all, division_data_all = sample.histogram_all("col-3", bins=division_data)        
        
        self.assertListEqual(list(count_data), list(count))
        self.assertListEqual(list(division_data), list(division))
        self.assertGreater(min(division_data), 0)

        self.assertTrue(np.all(count_data_all>=count_data))
        self.assertGreater(min(division_data_all), 0)      

    def test_histogram_by(self):
        """ Test the histogram_by method. """        
        filepath = 'test_data/test_data.csv'
        data = Data(filepath)
        sample = data.sample()
        df = pd.read_csv(filepath)
        
        classes = list(sample.unique('col-99'))
        desc = sample.describe_col('col-3', drop_inf=True)        
        step = (desc['max'] - desc['min'])/10
        div = np.arange(desc['min'], desc['max']+step, step).tolist()         
        counts, bins = sample.histogram_by("col-3", 'col-99', div)        

        # Check histogram for each class
        for c in classes:
            self.assertTrue(c in counts)
            col = df.loc[(df['col-99'] == c) & np.isfinite(df['col-3']), "col-3"]
            count, division = np.histogram(col, div)            
            self.assertListEqual(list(counts[c]), list(count))                
            self.assertListEqual(list(bins), list(division))  

    def test_histogram_all(self):
        """ Test the histogram method. """
        filepath = 'test_data/test_data.csv'
        
        data = Data(filepath)
        sample = data.sample()
        df = pd.read_csv(filepath)

        sample.apply_filter('col-3', lb=0)
        
        count, division = np.histogram(df.loc[np.isfinite(df['col-3']), "col-3"], 30)
        count_data, division_data = data.histogram_all("col-3", bins=30)

        self.assertListEqual(list(count_data), list(count))
        self.assertListEqual(list(division_data), list(division))
        self.assertLess(min(division_data), 0)

        
    def test_histogram_batch(self):
        """ Test the histogram method. """
        filepath = parentdir+"/data/sp500_data.csv"
        
        data = Data(filepath)
        sample = data.sample()
        
        df = pd.read_csv(filepath)
        
        count_eps, division_eps = np.histogram(df["eps"], 30)
        count_price, division_price = np.histogram(df["price"], 30)

        sample.apply_filter('eps', 0)

        # test without filtered
        batch_result = sample.histogram_batch(["eps", 'price'], bins=30, filtered=False)
        count_ddf_eps, division_ddf_eps = batch_result[0]
        count_ddf_price, division_ddf_price = batch_result[1]

        self.assertListEqual(list(count_ddf_eps), list(count_eps))
        self.assertListEqual(list(division_ddf_eps), list(division_eps))

        self.assertListEqual(list(count_ddf_price), list(count_price))
        self.assertListEqual(list(division_ddf_price), list(division_price))

        # test with filtered
        count_eps, division_eps = np.histogram(df.loc[df['eps'] >= 0, "eps"], 30)
        count_price, division_price = np.histogram(df.loc[df['eps'] >= 0, "price"], 30)
        
        batch_result = sample.histogram_batch(["eps", 'price'], bins=30, filtered=True)
        count_ddf_eps, division_ddf_eps = batch_result[0]
        count_ddf_price, division_ddf_price = batch_result[1]

        self.assertListEqual(list(count_ddf_eps), list(count_eps))
        self.assertListEqual(list(division_ddf_eps), list(division_eps))

        self.assertListEqual(list(count_ddf_price), list(count_price))
        self.assertListEqual(list(division_ddf_price), list(division_price))
        
    def test_histograms(self):
        """ Test histograms method. """
        filepath = parentdir+"/data/sp500_data.csv"
        
        data = Data(filepath)
        sample = data.sample()
        
        df = pd.read_csv(filepath)

        sample.apply_filter('eps', lb=0)
        
        count, division = np.histogram(df.loc[df['eps'] > 0, "eps"], bins=30)        
        count_data, count_data_all, division_data = sample.histograms("eps", nbins=30)
        self.assertListEqual(list(count_data), list(count))
        self.assertListEqual(list(division_data), list(division))
        self.assertGreater(min(division_data), 0)

        self.assertTrue(np.all(count_data_all>=count_data))

        
    def test_histograms_datetime(self):
        """ Test histograms method. """
        filepath = 'test_data/test_data.csv'
        data = Data(filepath)
        sample = data.sample()
        
        sample.set_type('col-10', 'DateTime')
        sample.apply_datetime_filter('col-10', lb='1989/01/01')
        
        df = pd.read_csv(filepath)
        df = df[pd.to_datetime(df['col-10']) >= '1989/01/01']
        
        count, division = np.histogram(pd.to_datetime(df['col-10']).astype(np.int64), bins=30)
        division = pd.to_datetime(division).astype(str)
       
        count_data, count_data_all, division_data = sample.histograms_datetime("col-10", nbins=30)
        self.assertListEqual(list(count_data), list(count))    
        self.assertListEqual(list(division_data), list(division))

        
    def test_histograms_batch(self):
        """ Test histograms method for batch data. """
        filepath = parentdir+"/data/sp500_data.csv"
        
        data = Data(filepath)
        sample = data.sample()
        
        df = pd.read_csv(filepath)

        sample.apply_filter('eps', lb=0)
        
        count, division = np.histogram(df.loc[df['eps'] > 0, "eps"], 30)        
        hist_data = sample.histograms_batch(["eps", 'rsi'], nbins=30)

        count_data, count_data_all, division_data = hist_data[0]
        self.assertListEqual(list(count_data), list(count))
        self.assertListEqual(list(division_data), list(division))
        self.assertGreater(min(division_data), 0)

        self.assertTrue(np.all(count_data_all>=count_data))

    def test_value_counts(self):
        """ Test the value_counts method. """
        filepath = 'test_data/test_data.csv'
        data = Data(filepath)
        sample = data.sample()
        
        N, M = sample.shape
        
        counts, levels = sample.value_counts('col-0')
        self.assertTrue(np.all((np.array(counts)-np.array([N/4]*4)) < 50))
        self.assertTrue(set(levels)==set(['a', 'b', 'c', 'd']))

        sample.apply_filter('col-1', 0)
        
        counts, levels = sample.value_counts('col-0')
        self.assertFalse(np.all(counts==[N/4, N/4, N/4, N/4]))

        counts_all, levels_all = sample.value_counts_all('col-0')
        self.assertTrue(np.all((np.array(counts_all)-np.array([N/4]*4)) < 50))
        self.assertTrue(set(levels_all)==set(['a', 'b', 'c', 'd']))

    def test_group_by(self):
        """ Test the group_by method. """
        filepath = 'test_data/test_data.csv'
        data = Data(filepath)
        sample = data.sample()
        
        N, M = sample.shape

        result = sample.group_by(['col-0', 'col-99'])

        counts = list(result['counts'])
        categories = list(result['col-0'])
        classes = list(result['col-99'])
        
        self.assertTrue(np.all((np.array(counts)-np.array([N/4]*4)) < 50))
        self.assertTrue(set(categories)==set(['a', 'b', 'c', 'd']))
        self.assertTrue(set(classes)==set(['x', 'y', 'y', 'y']))

        sample.apply_filter('col-1', 0)
                
        result = sample.group_by(['col-0', 'col-99'])

        counts = list(result['counts'])
        categories = list(result['col-0'])
        classes = list(result['col-99'])

        self.assertFalse(np.all(counts==[N/4, N/4, N/4, N/4]))

        result_all = sample.group_by_all(['col-0', 'col-99'])

        counts_all = list(result_all['counts'])
        categories_all = list(result_all['col-0'])
        classes_all = list(result_all['col-99'])
        
        self.assertTrue(np.all((np.array(counts_all)-np.array([N/4]*4)) < 50))
        self.assertTrue(set(categories_all)==set(['a', 'b', 'c', 'd']))
        self.assertTrue(set(classes_all)==set(['x', 'y', 'y', 'y']))

    def test_value_counts_batch(self):
        """ Test the histogram method. """
        filepath = 'test_data/test_data.csv'
        data = Data(filepath)
        sample = data.sample()
        
        N, M = sample.shape

        sample.apply_filter('col-1', 0)
        
        batch_result = sample.value_counts_batch(['col-0', 'col-99'], filtered=False)
        counts_0, levels_0 = batch_result[0]
        self.assertTrue(np.all((np.array(counts_0)-np.array([N/4]*4)) < 50))
        self.assertTrue(set(levels_0)==set(['a', 'b', 'c', 'd']))

        counts_1, levels_1 = batch_result[1]
        self.assertTrue(np.all((np.array(counts_1)-np.array([3*N/4, N/4])) < 50))
        self.assertTrue(set(levels_1)==set(['y', 'x']))
        
        batch_result = sample.value_counts_batch(['col-0', 'col-99'], filtered=True)
        counts_0, levels_0 = batch_result[0]
        self.assertFalse(np.all(counts_0==[N/4, N/4, N/4, N/4]))

        counts_1, levels_1 = batch_result[1]
        self.assertFalse(np.all(counts_1==[3*N/4, N/4]))

    def test_get_counts(self):
        """ Test getting data set counts. """
        filepath = 'test_data/test_data.csv'
        data = Data(filepath)
        sample = data.sample()
        
        N, M = sample.shape
        counts = sample.get_counts()
        self.assertEqual(counts['original'], N)
        self.assertEqual(counts['filtered'], N)

        sample.apply_filter('col-1', 0)
        fcounts = sample.get_counts()
        self.assertEqual(fcounts['original'], N)
        self.assertLess(fcounts['filtered'], N)
        self.assertEqual(fcounts['filtered'], len(sample.filter_data))        

    def test_corr(self):
        """ Test correlation table """
        filepath = 'test_data/test_data.csv'
        data = Data(filepath)
        sample = data.sample()
        table = sample.corr()

        # should be correlated
        self.assertGreater(table.loc['col-1', 'col-2'], 0.5)


    def test_drop_columns(self):
        """ Test dropping columns. """
        filepath = 'test_data/test_data.csv'
        data = Data(filepath)
        sample = data.sample()
        self.assertEqual(len(sample.columns), 100)
        
        drop = ['col-0', 'col-1', 'col-2']
        sample.drop_columns(drop)

        self.assertEqual(len(sample.columns), 97)
        self.assertFalse(drop[0] in sample.columns)
        self.assertFalse(drop[1] in sample.columns)
        self.assertFalse(drop[2] in sample.columns)

        self.assertEqual(len(data.columns), 97)
        self.assertFalse(drop[0] in data.columns)
        self.assertFalse(drop[1] in data.columns)
        self.assertFalse(drop[2] in data.columns)

    def test_drop_column(self):
        """ Test dropping individual column. """
        filepath = 'test_data/test_data.csv'
        data = Data(filepath)
        sample = data.sample()
        
        self.assertEqual(len(sample.columns), 100)
        
        drop = ['col-0', 'col-1', 'col-2']
        sample.drop_column(drop[0])
        sample.drop_column(drop[1])
        sample.drop_column(drop[2])

        self.assertEqual(len(sample.columns), 97)
        self.assertFalse(drop[0] in sample.columns)
        self.assertFalse(drop[1] in sample.columns)
        self.assertFalse(drop[2] in sample.columns)

        self.assertEqual(len(data.columns), 97)
        self.assertFalse(drop[0] in data.columns)
        self.assertFalse(drop[1] in data.columns)
        self.assertFalse(drop[2] in data.columns)

    def test_detect_types(self):
        """ Test inferring types automatically """
        filepath = 'test_data/test_data.csv'
        data = Data(filepath)
        sample = data.sample()
        
        self.assertEqual(sample.data.dtypes['col-0'], 'object')
        self.assertEqual(sample.data.dtypes['col-99'], 'object')
        self.assertNotEqual(sample.data.dtypes['col-1'], 'object')

    def test_bool_type(self):
        """ Test that bool types get converted to Nominal. """
        filepath_bool = 'test_data/test_data_bool.csv'
        data_bool = Data(filepath_bool)
        sample_bool = data_bool.sample()

        self.assertEqual(data_bool.data['bool_type'].dtype.name, 'object')
        self.assertEqual(sample_bool.data['bool_type'].dtype.name, 'object')

    def test_set_type(self):
        """ Test setting attr type. """
        filepath = 'test_data/test_data.csv'
        data = Data(filepath)
        sample = data.sample()
        
        sample.set_type('col-1', 'Nominal')
        self.assertEqual(sample.types['col-1'], 'Nominal')
        self.assertEqual(data.types['col-1'], 'Nominal')
        self.assertEqual(sample.data.dtypes['col-1'], 'object')
        self.assertNotEqual(sample.data.dtypes['col-2'], 'object')
        
        sample.apply_filter('col-2', 0)
        self.assertGreaterEqual(sample['col-2'].min(), 0)

        sample.set_type('col-1', 'Numerical')
        self.assertEqual(sample.types['col-1'], 'Numerical')
        self.assertEqual(data.types['col-1'], 'Numerical')
        self.assertNotEqual(sample.data.dtypes['col-1'], 'object')
        self.assertGreaterEqual(sample['col-2'].min(), 0)        

        sample.create_derived('test', 'col-1 + 1')
        self.assertTrue('test' in sample.types)
        self.assertEqual(sample.types['test'], 'Numerical')
        self.assertTrue('test' in data.types)
        self.assertEqual(data.types['test'], 'Numerical')



    def test_set_type_datetime(self):
        """ Test setting attr type to datetime. """
        filepath = 'test_data/test_data.csv'
        data = Data(filepath)
        sample = data.sample()
        
        sample.set_type('col-10', 'DateTime')
        
        self.assertEqual(sample.types['col-10'], 'DateTime')
        sample.apply_datetime_filter('col-10', lb='01-01-1989')
        self.assertTrue((sample['col-10'] >= '01-01-1989').all())

        self.assertEqual(data.types['col-10'], 'DateTime')
        self.assertTrue((data['col-10'] >= '01-01-1989').all().compute())

        
    def test_set_type_ordinal(self):
        """ Test setting attr type. """
        filepath = parentdir+"/data/stroke.csv"
        data = Data(filepath)
        sample = data.sample()        
        
        self.assertEqual(sample.types['gender'], 'Nominal')
        self.assertEqual(data.types['gender'], 'Nominal')
        self.assertEqual(sample.data.dtypes['gender'], 'object')
        self.assertTrue(sample.orderings['gender'] is None)

        sample.set_type('gender', 'Ordinal', ["Female", "Male"])
        self.assertEqual(sample.types['gender'], 'Ordinal')
        self.assertEqual(data.types['gender'], 'Ordinal')
        self.assertEqual(sample.data.dtypes['gender'], 'object')
        self.assertTrue(type(sample.orderings['gender']) is list)
        self.assertTrue(sample.orderings['gender'] == ["Female", "Male"] 
                        or sample.orderings['gender'] == ["Female", "Male", "Other"])

    def test_set_ordering(self):
        """ Test setting attr type. """
        filepath = parentdir+"/data/stroke.csv"
        data = Data(filepath)
        sample = data.sample()        
        
        self.assertEqual(sample.types['gender'], 'Nominal')
        self.assertEqual(data.types['gender'], 'Nominal')
        self.assertEqual(sample.data.dtypes['gender'], 'object')
        self.assertTrue(sample.orderings['gender'] is None)

        sample.set_type('gender', 'Ordinal', ["Female", "Male"])
        self.assertEqual(sample.types['gender'], 'Ordinal')
        self.assertEqual(data.types['gender'], 'Ordinal')
        self.assertEqual(sample.data.dtypes['gender'], 'object')
        self.assertTrue(type(sample.orderings['gender']) is list)      

        sample.set_ordering('gender', ["Other", "Female", "Male"])
        self.assertTrue(type(sample.orderings['gender']) is list)
        self.assertEqual(len(sample.orderings['gender']), 3)
        self.assertListEqual(sample.orderings['gender'], ["Other", "Female", "Male"])

        # Change in order is stored as a delayed_op, call load to dask for it to be applied to full data
        self.assertListEqual(data.orderings['gender'], ["Other", "Female", "Male"])

    def test_replace_ordinal(self):
        """ Test setting attr type. """
        filepath = parentdir+"/data/stroke.csv"
        data = Data(filepath)
        sample = data.sample()        
        
        self.assertEqual(sample.types['gender'], 'Nominal')
        self.assertEqual(data.types['gender'], 'Nominal')
        self.assertEqual(sample.data.dtypes['gender'], 'object')
        self.assertTrue(sample.orderings['gender'] is None)

        sample.set_type('gender', 'Ordinal', ["Female", "Male"])
        self.assertEqual(sample.types['gender'], 'Ordinal')
        self.assertEqual(data.types['gender'], 'Ordinal')
        self.assertEqual(sample.data.dtypes['gender'], 'object')
        self.assertTrue(type(sample.orderings['gender']) is list)      

        sample.set_ordering('gender', ["Other", "Female", "Male"])
        self.assertTrue(type(sample.orderings['gender']) is list)
        self.assertEqual(len(sample.orderings['gender']), 3)
        self.assertListEqual(sample.orderings['gender'], ["Other", "Female", "Male"])

        sample.apply_replace('gender', ["Other", "Male"], "OtherCat")
        self.assertListEqual(list(sample.orderings['gender']), ["OtherCat", "Female"])        

    def test_get_catcols(self):
        """ Test setting getting category attributes.. """
        filepath = 'test_data/test_data.csv'
        data = Data(filepath, delay_load=True)
        sample = data.sample()
        
        sample.set_type('col-25', 'Numerical')
        sample.set_type('col-10', 'DateTime')
        
        catcols = [
            'col-0',
            'col-11',
            'col-96',
            'col-97',
            'col-98',
            'col-99'            
        ]

        self.assertListEqual(data.get_catcols(), catcols)
        self.assertListEqual(sample.get_catcols(), catcols)

        sample.drop_column('col-0')
        catcols = [
            'col-11',
            'col-96',
            'col-97',
            'col-98',
            'col-99'            
        ]
        self.assertListEqual(data.get_catcols(), catcols)
        self.assertListEqual(sample.get_catcols(), catcols)

        
    def test_get_catcols_no_delay(self):
        """ Test setting getting category attributes.. """
        filepath = 'test_data/test_data.csv'
        data = Data(filepath, delay_load=False)
        sample = data.sample()
        sample.set_type('col-25', 'Numerical')
        sample.set_type('col-10', 'DateTime')
        
        catcols = [
            'col-0',
            'col-11',
            'col-96',
            'col-97',
            'col-98',
            'col-99'            
        ]

        self.assertListEqual(data.get_catcols(), catcols)
        self.assertListEqual(sample.get_catcols(), catcols)
        
        sample.drop_column('col-0')
        catcols = [
            'col-11',
            'col-96',
            'col-97',
            'col-98',
            'col-99'            
        ]
        self.assertListEqual(data.get_catcols(), catcols)
        self.assertListEqual(sample.get_catcols(), catcols)

        
    def test_apply_ops(self):
        """ Test apply ops. """       

        filepath = 'test_data/test_data.csv'
        data = Data(filepath)
        sample = data.sample()
        
        sample.set_type('col-1', 'Nominal')
        self.assertEqual(sample.data.dtypes['col-1'], 'object')
        self.assertNotEqual(sample.data.dtypes['col-2'], 'object')
        
        sample.apply_filter('col-2', 0)
        self.assertGreaterEqual(sample['col-2'].min(), 0)

        sample.set_type('col-1', 'Numerical')
        self.assertNotEqual(sample.data.dtypes['col-1'], 'object')
        self.assertGreaterEqual(sample['col-2'].min(), 0)        

        # Tests if the operations above are reapplied        
        sample.apply_ops()
        self.assertNotEqual(sample.data.dtypes['col-1'], 'object')
        self.assertGreaterEqual(sample['col-2'].min(), 0)        

        
    def test_bayesian_bug(self):
        """ Test bug related to missing nominal values. """
        filepath = parentdir+"/data/stroke.csv"
        data = Data(filepath)
        sample = data.sample()
        
        pattern = {'smoking_status': {'in':['NaN']}}
        sample.apply_nominal_filter('smoking_status', ['NaN'])

        # crashes here
        sample.describe()
        data.describe()

        self.assertTrue(sample['smoking_status'].isna().all())
        self.assertTrue(data['smoking_status'].isna().all().compute())

        sample.reset_data()

        sample.apply_nominal_filter('smoking_status', ['NaN'], 'Exclude')

        # crashes here
        sample.describe()
        data.describe()

        self.assertFalse(sample['smoking_status'].isna().any())
        self.assertFalse(data['smoking_status'].isna().any().compute())

        
if __name__ == '__main__':
    unittest.main()
    
