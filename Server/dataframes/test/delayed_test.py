import unittest
import os
import warnings
import sys
import inspect
import shutil
import logging

import pandas as pd
import numpy as np
import dask.dataframe as dd
import dask

currentdir = os.path.dirname(os.path.abspath(inspect.getfile(inspect.currentframe())))
parentdir = os.path.dirname(os.path.dirname(currentdir))
sys.path.insert(0, parentdir)

from dataframes.delayed import DelayedOp, DelayDataFrame
from ak_logger import logger

# disable logging
logger.setLevel(logging.WARNING)

class TestDelayedOp(unittest.TestCase):
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
        df.loc[0, 'col-3'] = np.inf  # set an inf

        os.mkdir('test_data/')
        df.to_csv('test_data/test_data.csv', index=False)
        df['col-1'] = np.nan
        df['col-33'] = np.nan
        df.loc[2, 'col-33'] = 0.1
        
        df.to_csv('test_data/test_data_nan.csv', index=False)

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
        df = pd.read_csv(filepath)
        ddf = dd.read_csv(filepath)

        
        data_pd = DelayDataFrame(df)        
        data_dd = DelayDataFrame(ddf)   
        self.assertTrue(isinstance(data_pd['col-1'].execute(), pd.Series))
        self.assertTrue(isinstance(data_pd.execute(), pd.DataFrame))

        self.assertTrue(isinstance(data_dd['col-1'].execute(), dd.Series))
        self.assertTrue(isinstance(data_dd.execute(), dd.DataFrame))

    def test_set_item(self):
        """ Test assigment in the delayed dataframe. """
        filepath = 'test_data/test_data.csv'
        df = pd.read_csv(filepath)
        
        data = DelayDataFrame(df)        
        data['col-1'] = 2

        data.execute()
        self.assertTrue((data['col-1']==2).all().execute())

        data['col-1'] = 3

        data.execute()
        self.assertTrue((data['col-1']==3).all().execute())

        data['col-2'] = data['col-1'] + data['col-2']
        data.execute()

        self.assertTrue((data['col-2'].execute() > df['col-2']).all())

        data['col-1'] = -4
        data['col-2'] = data['col-1'] + data['col-2']
        data.execute()
        
        self.assertTrue((data['col-2'].execute() < df['col-2']).all())

    def test_set_item_dask(self):
        """ Test assigment in the delayed dataframe. """
        filepath = 'test_data/test_data.csv'
        df = dd.read_csv(filepath)
        
        data = DelayDataFrame(df)        
        data['col-1'] = 2

        self.assertTrue((data['col-1']==2).all().execute().compute())

        data['col-1'] = 3

        data.execute()
        self.assertTrue((data['col-1']==3).all().execute().compute())

        data['col-2'] = data['col-1'] + data['col-2']
        data.execute()

        self.assertTrue((data['col-2'].execute() > df['col-2']).all().compute())

        data['col-1'] = -4
        data['col-2'] = data['col-1'] + data['col-2']
        data.execute()
        
        self.assertTrue((data['col-2'].execute() < df['col-2']).all().compute())

    def test_method_chain(self):
        """ Test method chaining """
        filepath = 'test_data/test_data.csv'
        df = pd.read_csv(filepath)

        data = DelayDataFrame(df)        

        data = data.drop(['col-1'], axis=1)
        self.assertFalse('col-1' in data.columns.execute())

        grouped = data.groupby("col-0").mean()
        self.assertEqual(grouped.shape[0].execute(), 4)

        grouped['col-3'] = grouped['col-3'].replace(np.inf, np.nan)
        grouped.execute()
        
        self.assertTrue(grouped['col-3'].isna().any().execute())
    
    def test_method_chain_dask(self):
        """ Test method chaining """
        filepath = 'test_data/test_data.csv'
        df = dd.read_csv(filepath)

        data = DelayDataFrame(df)        

        data = data.drop(['col-1'], axis=1)
        self.assertFalse('col-1' in data.columns.execute())

        grouped = data.groupby("col-0").mean()
        self.assertEqual(grouped.shape[0].execute().compute(), 4)

        grouped['col-3'] = grouped['col-3'].replace(np.inf, np.nan)
        grouped.execute()
        
        self.assertTrue(grouped['col-3'].isna().any().execute().compute())

    def test_filter(self):
        """ Test method chaining """
        filepath = 'test_data/test_data.csv'
        df = pd.read_csv(filepath)

        data = DelayDataFrame(df)        
        data = data[data['col-0'] == 'a']
        
        self.assertTrue((data['col-0'] == 'a').all().execute())

        data = data[data['col-1'] > 0]        
        self.assertGreater(data['col-1'].min().execute(), 0)

        data = data[data['col-2'] < 0]
        self.assertLess(data['col-2'].max().execute(), 0)

        data = data[data['col-3'] >= 0]        
        self.assertGreaterEqual(data['col-3'].min().execute(), 0)

        data = data[data['col-4'] <= 0]        
        self.assertLessEqual(data['col-4'].max().execute(), 0)

        data = DelayDataFrame(df)        
        data_na = data[data['col-0'] != 'a']
        self.assertTrue((data_na['col-0'] != 'a').all().execute())

        data_a = data[~data.index.isin(data_na.index)]
        
        self.assertTrue((data_a['col-0']=='a').all().execute())

    def test_filter_dask(self):
        """ Test method chaining """
        filepath = 'test_data/test_data.csv'
        df = dd.read_csv(filepath)

        data = DelayDataFrame(df)        
        data = data[data['col-0'] == 'a']
        
        self.assertTrue((data['col-0'] == 'a').all().execute().compute())

        data = data[data['col-1'] > 0]        
        self.assertGreater(data['col-1'].min().execute().compute(), 0)

        data = data[data['col-2'] < 0]
        self.assertLess(data['col-2'].max().execute().compute(), 0)

        data = data[data['col-3'] >= 0]        
        self.assertGreaterEqual(data['col-3'].min().execute().compute(), 0)

        data = data[data['col-4'] <= 0]        
        self.assertLessEqual(data['col-4'].max().execute().compute(), 0)

        data = DelayDataFrame(df)        
        data_na = data[data['col-0'] != 'a']
        self.assertTrue((data_na['col-0'] != 'a').all().execute().compute())
        
        
    def test_filter_multi(self):
        """ Test method chaining """
        filepath = 'test_data/test_data.csv'
        df = pd.read_csv(filepath)

        data = DelayDataFrame(df)        
        data = data[(data['col-0'] == 'a') & (data['col-1'] > 0)]
        self.assertTrue((data['col-0'] == 'a').all().execute())
        self.assertGreater(data['col-1'].min().execute(), 0)
        
        data = data[(data['col-2'] < 0) | (data['col-3'] > 0)]
        self.assertGreater(data.query("`col-2` >= 0")['col-3'].min().execute(), 0)
        self.assertLess(data.query("`col-3` <= 0")['col-2'].max().execute(), 0)
        
        data = data[~(data['col-2'] < 0)]
        self.assertGreaterEqual(data['col-2'].min().execute(), 0)

        data = data.loc[:, data.dtypes != object]
        self.assertFalse('symbol' in data.columns.execute())
        self.assertFalse('sector' in data.columns.execute())

    def test_filter_multi_dask(self):
        """ Test method chaining """
        filepath = 'test_data/test_data.csv'
        df = dd.read_csv(filepath)

        data = DelayDataFrame(df)        
        data = data[(data['col-0'] == 'a') & (data['col-1'] > 0)]
        self.assertTrue((data['col-0'] == 'a').all().execute().compute())
        self.assertGreater(data['col-1'].min().execute().compute(), 0)
        
        data = data[(data['col-2'] < 0) | (data['col-3'] > 0)]
        self.assertGreater(data.query("`col-2` >= 0")['col-3'].min().execute().compute(), 0)
        self.assertLess(data.query("`col-3` <= 0")['col-2'].max().execute().compute(), 0)
        
        data = data[~(data['col-2'] < 0)]
        self.assertGreaterEqual(data['col-2'].min().execute().compute(), 0)

        data = data.loc[:, data.dtypes != object]
        self.assertFalse('symbol' in data.columns.execute())
        self.assertFalse('sector' in data.columns.execute())

        
    def test_getattr(self):
        """ Test accessor works properly """
        filepath = parentdir + '/data/test_data_txt/sp500_data.csv'

        df = pd.read_csv(filepath)
        data = DelayDataFrame(df)

        data['eps'] = data['eps'] + 1        
        self.assertTrue((data.eps > df.eps).all().execute())

        data['newcol'] = 1
        data = data.drop(['symbol'], axis=1)

        data = data[data.eps > 1]
        self.assertGreater(data.eps.min().execute(), 0)
        
        self.assertLess(data.shape[0].execute(), df.shape[0])
        self.assertTrue('newcol' in data.execute().columns)

    def test_getattr_dask(self):
        """ Test accessor works properly """
        filepath = parentdir + '/data/test_data_txt/sp500_data.csv'

        df = dd.read_csv(filepath)
        data = DelayDataFrame(df)

        data['eps'] = data['eps'] + 1        
        self.assertTrue((data.eps > df.eps).all().execute().compute())

        data['newcol'] = 1
        data = data.drop(['symbol'], axis=1)

        data = data[data.eps > 1]
        self.assertGreater(data.eps.min().execute().compute(), 0)
        
        self.assertLess(data.shape[0].execute().compute(), df.shape[0].compute())
        self.assertTrue('newcol' in data.execute().columns)

        
    def test_standardize(self):
        """ Test standardizing works, as it is somewhat complicated. """
        filepath = parentdir + '/data/test_data_txt/sp500_data.csv'

        df = pd.read_csv(filepath)
        ddf = DelayDataFrame(df)

        numcols = ddf.columns[ddf.dtypes != object]
        ddf[numcols] = (ddf[numcols] - ddf[numcols].mean()) / ddf[numcols].std()


        # gold standard
        numcols = df.columns[df.dtypes != object]
        df[numcols] = (df[numcols] - df[numcols].mean()) / df[numcols].std()
        self.assertTrue((ddf.dropna()==df.dropna()).all().all().execute())


    def test_arith(self):
        """ Test arithmetic methods. """
        filepath = parentdir + '/data/test_data_txt/sp500_data.csv'

        df = pd.read_csv(filepath)
        ddf = DelayDataFrame(df)

        ddf = ddf.fillna(value=ddf.mean())
        df = df.fillna(value=df.mean())

        numcols = ddf.columns[ddf.dtypes!=object].execute()
        
        self.assertTrue(((ddf * 2) == (ddf+ddf)).all().all().execute())
        self.assertTrue(((2 * ddf) == (ddf+ddf)).all().all().execute())

        self.assertTrue(((ddf[numcols] / 2) == (df[numcols] / 2)).all().all().execute())
        self.assertTrue(((1/ddf[numcols]) == (1/df[numcols])).all().all().execute())

        self.assertTrue(((ddf[numcols] - 2) == (df[numcols] - 2)).all().all().execute())
        self.assertTrue(((2-ddf[numcols]) == (2-df[numcols])).all().all().execute())

    def test_arith_dask(self):
        """ Test arithmetic methods. """
        filepath = parentdir + '/data/test_data_txt/sp500_data.csv'

        df = dd.read_csv(filepath)
        ddf = DelayDataFrame(df)

        ddf = ddf.fillna(value=ddf.mean())
        df = df.fillna(value=df.mean())

        numcols = ddf.columns[ddf.dtypes!=object].execute()
        
        self.assertTrue(((ddf * 2) == (ddf+ddf)).all().all().execute().compute())
        self.assertTrue(((2 * ddf) == (ddf+ddf)).all().all().execute().compute())

        self.assertTrue(((ddf[numcols] / 2) == (df[numcols] / 2)).all().all().execute().compute())
        self.assertTrue(((1/ddf[numcols]) == (1/df[numcols])).all().all().execute().compute())

        self.assertTrue(((ddf[numcols] - 2) == (df[numcols] - 2)).all().all().execute().compute())
        self.assertTrue(((2-ddf[numcols]) == (2-df[numcols])).all().all().execute().compute())

        
    def test_preview(self):
        """ Test previewing a sequence of delayed ops. """ 
        filepath = parentdir + '/data/test_data_txt/sp500_data.csv'

        df = pd.read_csv(filepath)
        ddf = DelayDataFrame(df)

        ddf = ddf.fillna(value=ddf.mean())
        df = df.fillna(value=df.mean())

        ddf['eps'] = ddf.eps.clip(0)
        prev = ddf.preview(n=100)

        self.assertEqual(prev.shape[0], 100)
        self.assertGreaterEqual(prev.eps.min(), 0)
    
        self.assertEqual(ddf.eps.execute().shape[0], df.shape[0])
        self.assertGreaterEqual(ddf.eps.min().execute(), 0)
        
        ddf.execute()
        gdf = ddf.query("dividend > 0").groupby("sector").agg(["mean", "min", "size"])        
        gprev = gdf.preview(n=100)

        self.assertGreater(gprev.dividend['min'].min(), 0)
        self.assertGreater(gdf.dividend['min'].min().execute(), 0)
        self.assertEqual(gdf.eps['size'].sum().execute(), df.query("dividend > 0").shape[0])

    def test_preview_dask(self):
        """ Test previewing a sequence of delayed ops. """ 
        filepath = parentdir + '/data/test_data_txt/sp500_data.csv'

        df = dd.read_csv(filepath)
        ddf = DelayDataFrame(df)
        
        ddf = ddf.fillna(value=ddf.mean())
        df = df.fillna(value=df.mean())

        ddf['eps'] = ddf.eps.clip(0)
        prev = ddf.preview(frac=0.3)

        self.assertEqual(prev.shape[0].compute(), (df.shape[0].compute() * 0.3) // 1)
        self.assertGreaterEqual(prev.eps.min().compute(), 0)
    
        self.assertEqual(ddf.eps.execute().shape[0].compute(), df.shape[0].compute())
        self.assertGreaterEqual(ddf.eps.min().execute().compute(), 0)
        
        ddf.execute()

        numcols = ddf.columns[ddf.dtypes != object].tolist()        
        gdf = ddf[numcols+['sector']].query("dividend > 0").groupby("sector").agg(["min", "size"]) 
        gprev = gdf.preview(frac=0.3)

        self.assertGreater(gprev.dividend['min'].min().compute(), 0)
        self.assertGreater(gdf.dividend['min'].min().execute().compute(), 0)
        self.assertEqual(gdf.eps['size'].sum().execute().compute(),
                         df.query("dividend > 0").shape[0].compute())

        
if __name__ == '__main__':
    unittest.main()
    
